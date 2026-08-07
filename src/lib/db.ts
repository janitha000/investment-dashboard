import { neon } from "@neondatabase/serverless";

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return neon(url);
}

export type PortfolioData = {
  fds: unknown[];
  uts: unknown[];
  treasury: unknown[];
  dividends?: unknown[];
  pfcaFds?: unknown[];
};

export type SnapshotRow = {
  id: string;
  timestamp: string;
  label?: string | null;
  portfolio: PortfolioData;
  totals: Record<string, unknown>;
};

export async function getPortfolio(): Promise<PortfolioData> {
  const sql = getSql();
  const rows = await sql`SELECT data FROM portfolio_state WHERE id = 1`;
  if (!rows.length) {
    return { fds: [], uts: [], treasury: [], dividends: [], pfcaFds: [] };
  }
  const data = rows[0].data as PortfolioData;
  return {
    fds: data.fds || [],
    uts: data.uts || [],
    treasury: data.treasury || [],
    dividends: data.dividends || [],
    pfcaFds: data.pfcaFds || [],
  };
}

export async function savePortfolio(data: PortfolioData): Promise<void> {
  const sql = getSql();
  const payload = {
    fds: data.fds || [],
    uts: data.uts || [],
    treasury: data.treasury || [],
    dividends: data.dividends || [],
    pfcaFds: data.pfcaFds || [],
  };
  await sql`
    INSERT INTO portfolio_state (id, data, updated_at)
    VALUES (1, ${payload}, NOW())
    ON CONFLICT (id) DO UPDATE
    SET data = EXCLUDED.data, updated_at = NOW()
  `;
}

export async function listSnapshots(): Promise<SnapshotRow[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, timestamp, label, portfolio, totals
    FROM portfolio_snapshots
    ORDER BY timestamp DESC
  `;
  return rows.map((r) => ({
    id: String(r.id),
    timestamp: new Date(r.timestamp as string).toISOString(),
    label: (r.label as string | null) ?? null,
    portfolio: r.portfolio as PortfolioData,
    totals: r.totals as Record<string, unknown>,
  }));
}

export async function insertSnapshot(snap: SnapshotRow): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO portfolio_snapshots (id, timestamp, label, portfolio, totals)
    VALUES (
      ${snap.id},
      ${snap.timestamp},
      ${snap.label ?? null},
      ${snap.portfolio},
      ${snap.totals}
    )
    ON CONFLICT (id) DO UPDATE SET
      timestamp = EXCLUDED.timestamp,
      label = EXCLUDED.label,
      portfolio = EXCLUDED.portfolio,
      totals = EXCLUDED.totals
  `;
}

export async function deleteSnapshot(id: string): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`
    DELETE FROM portfolio_snapshots WHERE id = ${id} RETURNING id
  `;
  return rows.length > 0;
}

export async function getScenarios(): Promise<unknown[]> {
  const sql = getSql();
  const rows = await sql`SELECT data FROM scenarios WHERE id = 1`;
  if (!rows.length) return [];
  const data = rows[0].data;
  return Array.isArray(data) ? data : [];
}

export async function saveScenarios(data: unknown[]): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO scenarios (id, data, updated_at)
    VALUES (1, ${data}, NOW())
    ON CONFLICT (id) DO UPDATE
    SET data = EXCLUDED.data, updated_at = NOW()
  `;
}

export async function isPortfolioEmpty(): Promise<boolean> {
  const p = await getPortfolio();
  return (
    (p.fds?.length || 0) === 0 &&
    (p.uts?.length || 0) === 0 &&
    (p.treasury?.length || 0) === 0 &&
    (p.dividends?.length || 0) === 0 &&
    (p.pfcaFds?.length || 0) === 0
  );
}

export async function isScenariosEmpty(): Promise<boolean> {
  const s = await getScenarios();
  return s.length === 0;
}

export async function snapshotCount(): Promise<number> {
  const sql = getSql();
  const rows = await sql`SELECT COUNT(*)::int AS c FROM portfolio_snapshots`;
  return Number(rows[0]?.c ?? 0);
}
