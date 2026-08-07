import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";

export async function GET() {
  try {
    const ok = await isAuthenticated();
    return NextResponse.json({ authenticated: ok });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Auth check failed";
    // Misconfigured env should not look like "logged out" silently in prod debug
    return NextResponse.json({ authenticated: false, error: msg }, { status: 500 });
  }
}
