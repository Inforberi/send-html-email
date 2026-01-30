import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SEND_ACCESS_TOKEN = process.env.SEND_ACCESS_TOKEN;
const AUTH_COOKIE = "send_token";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token.trim() : "";

  if (!SEND_ACCESS_TOKEN) {
    return NextResponse.json({ ok: true });
  }
  if (token !== SEND_ACCESS_TOKEN) {
    return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 дней
  });
  return res;
}
