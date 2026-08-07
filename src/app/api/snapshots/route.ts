import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { insertSnapshot, listSnapshots, type SnapshotRow } from "@/lib/db";

export async function GET() {
  const denied = await requireAuth();
  if (denied) return denied;
  try {
    const snaps = await listSnapshots();
    return NextResponse.json(snaps);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to list snapshots";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;
  try {
    const body = (await req.json()) as SnapshotRow;
    if (!body?.id || !body?.timestamp || !body?.portfolio || !body?.totals) {
      return NextResponse.json({ error: "Invalid snapshot" }, { status: 400 });
    }
    await insertSnapshot({
      id: String(body.id),
      timestamp: body.timestamp,
      label: body.label ?? null,
      portfolio: body.portfolio,
      totals: body.totals,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to save snapshot";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
