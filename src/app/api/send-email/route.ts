import { NextResponse } from "next/server";
import { sendEmailBodySchema, HTML_MAX_SIZE } from "@/lib/validation";
import { sendEmail } from "@/lib/mailer";
import { checkRateLimit } from "@/lib/rate-limit";

const BODY_LIMIT = HTML_MAX_SIZE + 1024 * 10; // body чуть больше лимита HTML

export const runtime = "nodejs";

export async function POST(req: Request) {
  const rate = checkRateLimit(req);
  if (!rate.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Слишком много запросов. Попробуйте позже.",
        code: "RATE_LIMIT",
      },
      {
        status: 429,
        headers: rate.retryAfter ? { "Retry-After": String(rate.retryAfter) } : undefined,
      }
    );
  }

  let raw: unknown;
  try {
    const text = await req.text();
    if (new TextEncoder().encode(text).length > BODY_LIMIT) {
      return NextResponse.json(
        { ok: false, error: "Тело запроса слишком большое", code: "PAYLOAD_TOO_LARGE" },
        { status: 413 }
      );
    }
    raw = JSON.parse(text) as unknown;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Невалидный JSON", code: "INVALID_JSON" },
      { status: 400 }
    );
  }

  const parsed = sendEmailBodySchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const message = first?.message ?? "Ошибка валидации";
    return NextResponse.json(
      { ok: false, error: message, code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  try {
    await sendEmail(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ошибка отправки";
    const code = mapErrorCode(err);
    if (process.env.NODE_ENV === "development" && err instanceof Error) {
      console.error("[send-email]", code, err.message);
    } else {
      console.error("[send-email]", code);
    }
    return NextResponse.json(
      { ok: false, error: message, code },
      { status: 500 }
    );
  }
}

function mapErrorCode(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("invalid login") || msg.includes("authentication")) return "AUTH_FAILED";
    if (msg.includes("invalid_grant")) return "INVALID_GRANT";
    if (msg.includes("rate") || msg.includes("quota")) return "RATE_LIMIT_GMAIL";
    if (msg.includes("connection") || msg.includes("econnrefused")) return "CONNECTION_ERROR";
  }
  return "SEND_FAILED";
}
