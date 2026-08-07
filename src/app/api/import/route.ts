import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getPortfolio,
  getScenarios,
  insertSnapshot,
  isPortfolioEmpty,
  isScenariosEmpty,
  savePortfolio,
  saveScenarios,
  snapshotCount,
  type PortfolioData,
  type SnapshotRow,
} from "@/lib/db";

type ImportBody = {
  version?: number;
  portfolio?: PortfolioData;
  snapshots?: SnapshotRow[];
  scenarios?: unknown[];
  mode?: "fill-empty" | "replace";
};

export async function POST(req: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;
  try {
    const body = (await req.json()) as ImportBody;
    const mode = body.mode === "replace" ? "replace" : "fill-empty";

    const result = {
      portfolio: false,
      snapshots: 0,
      scenarios: false,
      skipped: [] as string[],
    };

    if (body.portfolio) {
      const empty = await isPortfolioEmpty();
      if (mode === "replace" || empty) {
        await savePortfolio(body.portfolio);
        result.portfolio = true;
      } else {
        result.skipped.push("portfolio");
      }
    }

    if (Array.isArray(body.snapshots) && body.snapshots.length > 0) {
      const count = await snapshotCount();
      if (mode === "replace" || count === 0) {
        if (mode === "replace" && count > 0) {
          // replace: insert/upsert each; we don't wipe orphans for simplicity
        }
        for (const snap of body.snapshots) {
          if (!snap?.id || !snap?.timestamp || !snap?.portfolio || !snap?.totals) continue;
          await insertSnapshot({
            id: String(snap.id),
            timestamp: snap.timestamp,
            label: snap.label ?? null,
            portfolio: snap.portfolio,
            totals: snap.totals,
          });
          result.snapshots += 1;
        }
      } else {
        result.skipped.push("snapshots");
      }
    }

    if (Array.isArray(body.scenarios)) {
      const empty = await isScenariosEmpty();
      if (mode === "replace" || empty) {
        await saveScenarios(body.scenarios);
        result.scenarios = true;
      } else {
        result.skipped.push("scenarios");
      }
    }

    // Return current state summary
    const portfolio = await getPortfolio();
    const scenarios = await getScenarios();
    return NextResponse.json({
      ok: true,
      imported: result,
      portfolio,
      scenarios,
      snapshotCount: await snapshotCount(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Import failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
