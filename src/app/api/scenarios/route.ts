import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getScenarios, saveScenarios } from "@/lib/db";

export async function GET() {
  const denied = await requireAuth();
  if (denied) return denied;
  try {
    const data = await getScenarios();
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load scenarios";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;
  try {
    const body = await req.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Expected scenarios array" }, { status: 400 });
    }
    await saveScenarios(body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to save scenarios";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
