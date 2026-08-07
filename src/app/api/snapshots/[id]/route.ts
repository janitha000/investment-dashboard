import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { deleteSnapshot } from "@/lib/db";

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
