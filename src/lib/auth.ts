import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "lw_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days

function getSecrets() {
  const pin = process.env.APP_PIN;
  const secret = process.env.SESSION_SECRET;
  if (!pin || !secret) {
    throw new Error("APP_PIN and SESSION_SECRET must be set");
  }
  return { pin, secret };
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function encodeSession(secret: string): string {
  const exp = Date.now() + MAX_AGE_SEC * 1000;
  const body = Buffer.from(JSON.stringify({ ok: true, exp }), "utf8").toString("base64url");
  const sig = sign(body, secret);
  return `${body}.${sig}`;
}

function verifySessionToken(token: string | undefined, secret: string): boolean {
  if (!token) return false;
  const [body, sig] = token.split(".");
  if (!body || !sig) return false;
  const expected = sign(body, secret);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      ok?: boolean;
      exp?: number;
    };
    if (!parsed.ok || typeof parsed.exp !== "number") return false;
    if (Date.now() > parsed.exp) return false;
    return true;
  } catch {
    return false;
  }
}

export function verifyPin(input: string): boolean {
  const { pin } = getSecrets();
  const a = Buffer.from(String(input));
  const b = Buffer.from(String(pin));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function setSessionCookie(res: NextResponse): void {
  const { secret } = getSecrets();
  const token = encodeSession(secret);
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function isAuthenticated(): Promise<boolean> {
  try {
    const { secret } = getSecrets();
    const jar = await cookies();
    return verifySessionToken(jar.get(COOKIE_NAME)?.value, secret);
  } catch {
    return false;
  }
}

export function isAuthenticatedFromRequest(req: NextRequest): boolean {
  try {
    const { secret } = getSecrets();
    return verifySessionToken(req.cookies.get(COOKIE_NAME)?.value, secret);
  } catch {
    return false;
  }
}

export async function requireAuth(): Promise<NextResponse | null> {
  if (await isAuthenticated()) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
