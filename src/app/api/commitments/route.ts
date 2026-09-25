import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getMonthlyCommitments, saveMonthlyCommitment, saveBatchMonthlyCommitments } from "@/lib/db";

export async function GET() {
  const denied = await requireAuth();
  if (denied) return denied;
  try {
    const commitments = await getMonthlyCommitments();
    return NextResponse.json(commitments);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load monthly commitments";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;
  try {
    const body = await req.json();

    // Batch save
    if (Array.isArray(body)) {
      const saved = await saveBatchMonthlyCommitments(body);
      return NextResponse.json({ ok: true, commitments: saved });
    }
    if (Array.isArray(body?.commitments)) {
      const saved = await saveBatchMonthlyCommitments(body.commitments);
      return NextResponse.json({ ok: true, commitments: saved });
    }

    // Single save
    if (!body?.month) {
      return NextResponse.json({ error: "Month is required (YYYY-MM)" }, { status: 400 });
    }
    const saved = await saveMonthlyCommitment(
      String(body.month),
      Number(body.plannedAmount) || 0,
      body.notes ?? null
    );
    return NextResponse.json({ ok: true, commitment: saved });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to save commitment";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  return POST(req);
}
