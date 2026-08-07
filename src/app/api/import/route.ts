import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated, requireAuth } from "@/lib/auth";
import {
  ensureSchema,
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

/**
 * Diagnostics: opening /api/import in a browser is a GET, which is why a bare
 * visit used to look like a failure. Import itself is POST-only.
 */
export async function GET() {
  const authed = await isAuthenticated();
  const envOk = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    APP_PIN: Boolean(process.env.APP_PIN),
    SESSION_SECRET: Boolean(process.env.SESSION_SECRET),
  };
  let db: { ok: boolean; error?: string } = { ok: false };
  if (authed && envOk.DATABASE_URL) {
    try {
      await ensureSchema();
      db = { ok: true };
    } catch (e) {
      db = { ok: false, error: e instanceof Error ? e.message : "DB error" };
    }
  }
  return NextResponse.json({
    endpoint: "/api/import",
    method: "POST only",
    authenticated: authed,
    env: envOk,
    db,
    hint: "Use the Migrate Local Data or Import buttons on My Portfolio.",
  });
}

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
      errors: [] as string[],
    };

    if (body.portfolio) {
      const empty = await isPortfolioEmpty();
      if (mode === "replace" || empty) {
        const p = body.portfolio;
        await savePortfolio({
          fds: Array.isArray(p.fds) ? p.fds : [],
          uts: Array.isArray(p.uts) ? p.uts : [],
          treasury: Array.isArray(p.treasury) ? p.treasury : [],
          dividends: Array.isArray(p.dividends) ? p.dividends : [],
          pfcaFds: Array.isArray(p.pfcaFds) ? p.pfcaFds : [],
        });
        result.portfolio = true;
      } else {
        result.skipped.push("portfolio");
      }
    }

    if (Array.isArray(body.snapshots) && body.snapshots.length > 0) {
      const count = await snapshotCount();
      if (mode === "replace" || count === 0) {
        for (const snap of body.snapshots) {
          if (!snap?.id || !snap?.timestamp || !snap?.portfolio || !snap?.totals) {
            result.errors.push(`Snapshot ${snap?.id ?? "(no id)"}: missing fields`);
            continue;
          }
          const ts = new Date(snap.timestamp as unknown as string | number);
          if (Number.isNaN(ts.getTime())) {
            result.errors.push(`Snapshot ${snap.id}: invalid timestamp`);
            continue;
          }
          try {
            await insertSnapshot({
              id: String(snap.id),
              timestamp: ts.toISOString(),
              label: snap.label ?? null,
              portfolio: snap.portfolio,
              totals: snap.totals,
            });
            result.snapshots += 1;
          } catch (e) {
            result.errors.push(
              `Snapshot ${snap.id}: ${e instanceof Error ? e.message : "insert failed"}`
            );
          }
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
    console.error("[/api/import] failed:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
