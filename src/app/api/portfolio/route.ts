import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getPortfolio, savePortfolio, type PortfolioData } from "@/lib/db";

export async function GET() {
  const denied = await requireAuth();
  if (denied) return denied;
  try {
    const data = await getPortfolio();
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load portfolio";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;
  try {
    const body = (await req.json()) as PortfolioData;
    await savePortfolio(body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to save portfolio";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
