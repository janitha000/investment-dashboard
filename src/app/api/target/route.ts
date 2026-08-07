import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getTarget, saveTarget, type TargetData } from "@/lib/db";

export async function GET() {
  const denied = await requireAuth();
  if (denied) return denied;
  try {
    const data = await getTarget();
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load target";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;
  try {
    const body = (await req.json()) as Partial<TargetData>;
    const existing = await getTarget();
    const next: TargetData = {
      netMonthlyWht: Number(body.netMonthlyWht ?? existing.netMonthlyWht) || 0,
      netMonthlyIit: Number(body.netMonthlyIit ?? existing.netMonthlyIit) || 0,
      physicalCashMonthly: Number(body.physicalCashMonthly ?? existing.physicalCashMonthly) || 0,
      monthsToTarget: Math.max(1, Math.round(Number(body.monthsToTarget ?? existing.monthsToTarget) || 12)),
      setAt: new Date().toISOString(),
      // Keep existing plan unless the client explicitly sends one (including null to clear)
      plan: body.plan !== undefined ? body.plan : existing.plan,
    };
    await saveTarget(next);
    return NextResponse.json({ ok: true, target: next });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to save target";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
