import { resolveUidFromKey } from "@/lib/mcp-key-server";
import { fetchExportData } from "@/lib/export-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_PROTOCOL = "2025-06-18";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Mcp-Session-Id, Mcp-Protocol-Version",
};

type JsonRpc = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

const RANGES = ["7d", "30d", "90d", "1y", "all"] as const;

const TOOLS = [
  {
    name: "search",
    description:
      "List the documents available in this personal health tracker (daily entries for various ranges, target ranges, water containers). Returns document ids to pass to fetch.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "fetch",
    description:
      "Fetch one document by id: entries-7d, entries-30d, entries-90d, entries-1y, entries-all, ideals, or presets.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "get_entries",
    description:
      "Daily health entries: weight (kg) and the boolean habits bath/brushTeeth/steps (steps = hit the 10,000-step goal). Each day also carries that day's mean blood pressure (systolic/diastolic mmHg, bpTime, bpReadingCount), total water (ml, waterLogCount), and food/drink summary — junkFood/junkDrink booleans, total calories (kcal), total sodium (mg), intakeCount — all computed from the individual readings/logs. The response also includes bpReadings, waterLogs, and intake — every individual entry in range. Any field may be null.",
    inputSchema: {
      type: "object",
      properties: {
        range: {
          type: "string",
          enum: ["7d", "30d", "90d", "1y", "all"],
          description: "Last N days, counted in UTC. Default all.",
        },
        from: {
          type: "string",
          description: "YYYY-MM-DD inclusive lower bound. Overrides range.",
        },
        to: { type: "string", description: "YYYY-MM-DD inclusive upper bound." },
        limit: {
          type: "number",
          description: "Max number of days, newest first (1-2000).",
        },
      },
    },
  },
  {
    name: "get_bp",
    description:
      "Every individual blood-pressure reading: date, systolic, diastolic (mmHg), time (HH:mm), posture (sitting/standing), arm (left/right). Multiple readings per day are kept separate; get_entries returns the daily mean.",
    inputSchema: {
      type: "object",
      properties: {
        range: {
          type: "string",
          enum: ["7d", "30d", "90d", "1y", "all"],
          description: "Last N days, counted in UTC. Default all.",
        },
        from: {
          type: "string",
          description: "YYYY-MM-DD inclusive lower bound. Overrides range.",
        },
        to: { type: "string", description: "YYYY-MM-DD inclusive upper bound." },
        limit: {
          type: "number",
          description: "Max number of days, newest first (1-2000).",
        },
      },
    },
  },
  {
    name: "get_water",
    description:
      "Every individual water log: date, ml, time (HH:mm), and label (the container name, if logged from a preset). Multiple logs per day are kept separate; get_entries returns the daily total.",
    inputSchema: {
      type: "object",
      properties: {
        range: {
          type: "string",
          enum: ["7d", "30d", "90d", "1y", "all"],
          description: "Last N days, counted in UTC. Default all.",
        },
        from: {
          type: "string",
          description: "YYYY-MM-DD inclusive lower bound. Overrides range.",
        },
        to: { type: "string", description: "YYYY-MM-DD inclusive upper bound." },
        limit: {
          type: "number",
          description: "Max number of days, newest first (1-2000).",
        },
      },
    },
  },
  {
    name: "get_intake",
    description:
      "Every individual food/drink log: date, time (HH:mm), kind (food/drink), name (the item, e.g. \"Chicken adobo\"), category, junk (boolean), calories (kcal), sodium (mg), amount, note, nutritionSource (\"claude\" when calories/sodium were estimated by AI, otherwise null). calories/sodium/amount/note may be null; name may be empty on older entries. get_entries returns the per-day roll-up.",
    inputSchema: {
      type: "object",
      properties: {
        range: {
          type: "string",
          enum: ["7d", "30d", "90d", "1y", "all"],
          description: "Last N days, counted in UTC. Default all.",
        },
        from: {
          type: "string",
          description: "YYYY-MM-DD inclusive lower bound. Overrides range.",
        },
        to: { type: "string", description: "YYYY-MM-DD inclusive upper bound." },
        limit: {
          type: "number",
          description: "Max number of days, newest first (1-2000).",
        },
      },
    },
  },
  {
    name: "get_notes",
    description:
      "Every free-text note the user wrote: date, time (HH:mm), text. Notes are personal journal entries, not tied to any metric.",
    inputSchema: {
      type: "object",
      properties: {
        range: {
          type: "string",
          enum: ["7d", "30d", "90d", "1y", "all"],
          description: "Last N days, counted in UTC. Default all.",
        },
        from: {
          type: "string",
          description: "YYYY-MM-DD inclusive lower bound. Overrides range.",
        },
        to: { type: "string", description: "YYYY-MM-DD inclusive upper bound." },
        limit: {
          type: "number",
          description: "Max number of days, newest first (1-2000).",
        },
      },
    },
  },
  {
    name: "get_ideals",
    description:
      "The user's target { min, max } ranges for weight, blood-pressure systolic, blood-pressure diastolic, and water. A metric is null when no target is set.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_presets",
    description:
      "The user's labelled water containers, each { name, ml }.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_profile",
    description:
      "The user's personal profile: name, birthday, height (feet/inches), biological sex, timezone, their display-unit preferences (weightUnit kg/lb, volumeUnit ml/l/floz, heightUnit ftin/cm), plus derived ageYears and heightTotalInches. Numeric data elsewhere is always canonical (weight kg, water ml, height inches). Any field may be null if not set.",
    inputSchema: { type: "object", properties: {} },
  },
];

function rpc(
  id: JsonRpc["id"],
  body: Record<string, unknown>,
  status = 200,
): Response {
  return Response.json(
    { jsonrpc: "2.0", id: id ?? null, ...body },
    { status, headers: CORS },
  );
}

function result(id: JsonRpc["id"], value: unknown): Response {
  return rpc(id, { result: value });
}

function error(
  id: JsonRpc["id"],
  code: number,
  message: string,
  status = 200,
): Response {
  return rpc(id, { error: { code, message } }, status);
}

function textResult(id: JsonRpc["id"], value: unknown, isError = false): Response {
  return result(id, {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
    ...(isError ? { isError: true } : {}),
  });
}

async function runTool(
  uid: string,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  if (name === "search") {
    const results = [
      ...RANGES.map((r) => ({
        id: `entries-${r}`,
        title: `Health entries — ${r === "all" ? "all time" : `last ${r}`}`,
        url: `mcp://life-tracker/entries-${r}`,
      })),
      {
        id: "bp",
        title: "Blood pressure readings (all)",
        url: "mcp://life-tracker/bp",
      },
      {
        id: "water",
        title: "Water logs (all)",
        url: "mcp://life-tracker/water",
      },
      {
        id: "intake",
        title: "Food & drink logs (all)",
        url: "mcp://life-tracker/intake",
      },
      {
        id: "notes",
        title: "Notes (all)",
        url: "mcp://life-tracker/notes",
      },
      {
        id: "ideals",
        title: "Target ranges (ideals)",
        url: "mcp://life-tracker/ideals",
      },
      {
        id: "presets",
        title: "Water containers (presets)",
        url: "mcp://life-tracker/presets",
      },
      {
        id: "profile",
        title: "Personal profile",
        url: "mcp://life-tracker/profile",
      },
    ];
    return { results };
  }

  if (name === "fetch") {
    const id = String(args.id ?? "");
    if (id === "bp") {
      const data = await fetchExportData(uid, { range: "all" });
      return {
        id,
        title: "Blood pressure readings",
        text: JSON.stringify({
          count: data.bpReadings.length,
          bpReadings: data.bpReadings,
        }),
        url: "mcp://life-tracker/bp",
      };
    }
    if (id === "water") {
      const data = await fetchExportData(uid, { range: "all" });
      return {
        id,
        title: "Water logs",
        text: JSON.stringify({
          count: data.waterLogs.length,
          waterLogs: data.waterLogs,
        }),
        url: "mcp://life-tracker/water",
      };
    }
    if (id === "intake") {
      const data = await fetchExportData(uid, { range: "all" });
      return {
        id,
        title: "Food & drink logs",
        text: JSON.stringify({
          count: data.intake.length,
          intake: data.intake,
        }),
        url: "mcp://life-tracker/intake",
      };
    }
    if (id === "notes") {
      const data = await fetchExportData(uid, { range: "all" });
      return {
        id,
        title: "Notes",
        text: JSON.stringify({
          count: data.notes.length,
          notes: data.notes,
        }),
        url: "mcp://life-tracker/notes",
      };
    }
    if (id === "ideals" || id === "presets" || id === "profile") {
      const data = await fetchExportData(uid, { limit: 1 });
      const byId = { ideals: data.ideals, presets: data.presets, profile: data.profile };
      const titleById = {
        ideals: "Target ranges",
        presets: "Water containers",
        profile: "Personal profile",
      };
      return {
        id,
        title: titleById[id],
        text: JSON.stringify(byId[id]),
        url: `mcp://life-tracker/${id}`,
      };
    }
    const match = /^entries-(7d|30d|90d|1y|all)$/.exec(id);
    if (match) {
      const data = await fetchExportData(uid, { range: match[1] });
      return {
        id,
        title: `Health entries — ${match[1]}`,
        text: JSON.stringify({
          range: data.range,
          count: data.count,
          dailies: data.dailies,
          bpReadings: data.bpReadings,
          waterLogs: data.waterLogs,
          intake: data.intake,
          notes: data.notes,
        }),
        url: `mcp://life-tracker/${id}`,
      };
    }
    throw new Error(`Unknown document id: ${id}`);
  }

  if (name === "get_entries") {
    const data = await fetchExportData(uid, {
      range: typeof args.range === "string" ? args.range : null,
      from: typeof args.from === "string" ? args.from : null,
      to: typeof args.to === "string" ? args.to : null,
      limit: typeof args.limit === "number" ? args.limit : null,
    });
    return {
      range: data.range,
      count: data.count,
      dailies: data.dailies,
      bpReadings: data.bpReadings,
      waterLogs: data.waterLogs,
      intake: data.intake,
      notes: data.notes,
    };
  }

  if (name === "get_bp") {
    const data = await fetchExportData(uid, {
      range: typeof args.range === "string" ? args.range : null,
      from: typeof args.from === "string" ? args.from : null,
      to: typeof args.to === "string" ? args.to : null,
      limit: typeof args.limit === "number" ? args.limit : null,
    });
    return {
      range: data.range,
      count: data.bpReadings.length,
      bpReadings: data.bpReadings,
    };
  }

  if (name === "get_water") {
    const data = await fetchExportData(uid, {
      range: typeof args.range === "string" ? args.range : null,
      from: typeof args.from === "string" ? args.from : null,
      to: typeof args.to === "string" ? args.to : null,
      limit: typeof args.limit === "number" ? args.limit : null,
    });
    return {
      range: data.range,
      count: data.waterLogs.length,
      waterLogs: data.waterLogs,
    };
  }

  if (name === "get_intake") {
    const data = await fetchExportData(uid, {
      range: typeof args.range === "string" ? args.range : null,
      from: typeof args.from === "string" ? args.from : null,
      to: typeof args.to === "string" ? args.to : null,
      limit: typeof args.limit === "number" ? args.limit : null,
    });
    return {
      range: data.range,
      count: data.intake.length,
      intake: data.intake,
    };
  }

  if (name === "get_notes") {
    const data = await fetchExportData(uid, {
      range: typeof args.range === "string" ? args.range : null,
      from: typeof args.from === "string" ? args.from : null,
      to: typeof args.to === "string" ? args.to : null,
      limit: typeof args.limit === "number" ? args.limit : null,
    });
    return {
      range: data.range,
      count: data.notes.length,
      notes: data.notes,
    };
  }

  if (name === "get_ideals") {
    return (await fetchExportData(uid, { limit: 1 })).ideals;
  }

  if (name === "get_presets") {
    return (await fetchExportData(uid, { limit: 1 })).presets;
  }

  if (name === "get_profile") {
    return (await fetchExportData(uid, { limit: 1 })).profile;
  }

  throw new Error(`Unknown tool: ${name}`);
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ key: string }> },
) {
  const { key } = await ctx.params;
  const uid = await resolveUidFromKey(key);
  if (!uid) return error(null, -32001, "Invalid MCP key", 401);

  let msg: JsonRpc;
  try {
    msg = (await request.json()) as JsonRpc;
  } catch {
    return error(null, -32700, "Parse error");
  }

  const { id, method, params } = msg;

  if (method === "initialize") {
    const requested = params?.protocolVersion;
    return result(id, {
      protocolVersion:
        typeof requested === "string" ? requested : DEFAULT_PROTOCOL,
      capabilities: { tools: {} },
      serverInfo: { name: "life-tracker", version: "1.0.0" },
      instructions:
        "Read the user's personal health tracker. Use get_entries for daily weight / hygiene data with each day's mean blood pressure, total water, and food/drink roll-up (junk flags, calories, sodium); get_bp for every individual blood-pressure reading; get_water for every individual water log; get_intake for every individual food/drink log; get_notes for the user's free-text notes; get_ideals for their target ranges; get_presets for their water containers; and get_profile for their name/birthday/height/sex/timezone (with derived ageYears and heightTotalInches). search + fetch expose the same data as documents.",
    });
  }

  if (method === "ping") return result(id, {});

  if (typeof method === "string" && method.startsWith("notifications/")) {
    return new Response(null, { status: 202, headers: CORS });
  }

  if (method === "tools/list") return result(id, { tools: TOOLS });

  if (method === "tools/call") {
    const name = String(params?.name ?? "");
    const args = (params?.arguments as Record<string, unknown>) ?? {};
    try {
      return textResult(id, await runTool(uid, name, args));
    } catch (err) {
      return textResult(
        id,
        { error: err instanceof Error ? err.message : "Tool call failed" },
        true,
      );
    }
  }

  return error(id, -32601, `Method not found: ${method ?? "(none)"}`);
}

export async function GET() {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { ...CORS, Allow: "POST, OPTIONS" },
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
