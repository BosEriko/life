const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

export const HAIKU_MODEL = "claude-haiku-4-5-20251001";

export function isCreditExhaustedError(message: string): boolean {
  return (
    /credit balance (is )?too low/i.test(message) ||
    /purchase credits/i.test(message)
  );
}

function headers(apiKey: string): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": ANTHROPIC_VERSION,
  };
}

export async function anthropicPing(
  apiKey: string,
  model: string,
): Promise<void> {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: headers(apiKey),
    body: JSON.stringify({
      model,
      max_tokens: 1,
      messages: [{ role: "user", content: "ping" }],
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Anthropic ${res.status}: ${text.slice(0, 200)}`);
  }
}

type Tool = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

export async function anthropicToolCall<T = Record<string, unknown>>(opts: {
  apiKey: string;
  model: string;
  system?: string;
  prompt: string;
  tool: Tool;
  maxTokens?: number;
}): Promise<T> {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: headers(opts.apiKey),
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 512,
      ...(opts.system ? { system: opts.system } : {}),
      tools: [opts.tool],
      tool_choice: { type: "tool", name: opts.tool.name },
      messages: [{ role: "user", content: opts.prompt }],
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Anthropic ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    content?: Array<{ type: string; name?: string; input?: unknown }>;
  };
  const block = data.content?.find(
    (part) => part.type === "tool_use" && part.name === opts.tool.name,
  );
  if (!block || typeof block.input !== "object" || block.input == null) {
    throw new Error("Anthropic returned no tool output.");
  }
  return block.input as T;
}
