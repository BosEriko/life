import { adminFromRequest } from "@/lib/api-auth";
import {
  anthropicPing,
  HAIKU_MODEL,
  isCreditExhaustedError,
} from "@/lib/anthropic";
import { setAnthropicCreditAlert } from "@/lib/anthropic-alert";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await adminFromRequest(request);
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({
      ok: false,
      error: "The server has no ANTHROPIC_API_KEY configured.",
    });
  }

  try {
    await anthropicPing(apiKey, HAIKU_MODEL);
  } catch (error) {
    const detail =
      error instanceof Error
        ? error.message
        : "Anthropic did not accept the server key.";
    if (isCreditExhaustedError(detail)) {
      await setAnthropicCreditAlert(true, detail);
    }
    return Response.json({ ok: false, error: detail });
  }

  await setAnthropicCreditAlert(false, null);
  return Response.json({ ok: true });
}
