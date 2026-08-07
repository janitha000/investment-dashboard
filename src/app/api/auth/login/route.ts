import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie, verifyPin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pin = String(body?.pin ?? "");
    if (!pin || !verifyPin(pin)) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true });
    setSessionCookie(res);
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Login failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
