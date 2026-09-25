import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { deleteSnapshot, updateSnapshot, type SnapshotRow } from "@/lib/db";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const denied = await requireAuth();
  if (denied) return denied;
  try {
    const { id } = await ctx.params;
    const ok = await deleteSnapshot(id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete snapshot";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const denied = await requireAuth();
  if (denied) return denied;
  try {
    const { id } = await ctx.params;
    const body = (await req.json()) as Partial<SnapshotRow>;
    const ok = await updateSnapshot(id, body);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update snapshot";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  return PATCH(req, ctx);
}
