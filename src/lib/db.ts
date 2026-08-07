import { neon } from "@neondatabase/serverless";

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return neon(url);
}

let schemaReady: Promise<void> | null = null;

/** Idempotent schema bootstrap — runs once per serverless cold start. */
export async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = getSql();
      await sql`
        CREATE TABLE IF NOT EXISTS portfolio_state (
          id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
          data JSONB NOT NULL DEFAULT '{}'::jsonb,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        INSERT INTO portfolio_state (id, data)
        VALUES (1, '{"fds":[],"uts":[],"treasury":[],"dividends":[],"pfcaFds":[]}'::jsonb)
        ON CONFLICT (id) DO NOTHING
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS portfolio_snapshots (
          id TEXT PRIMARY KEY,
          timestamp TIMESTAMPTZ NOT NULL,
          label TEXT,
          portfolio JSONB NOT NULL,
          totals JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS portfolio_snapshots_timestamp_idx
        ON portfolio_snapshots (timestamp DESC)
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS scenarios (
          id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
          data JSONB NOT NULL DEFAULT '[]'::jsonb,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        INSERT INTO scenarios (id, data)
        VALUES (1, '[]'::jsonb)
        ON CONFLICT (id) DO NOTHING
      `;
    })().catch((err) => {
      schemaReady = null; // allow retry on next request
      throw err;
    });
  }
  await schemaReady;
}

async function sqlReady() {
  await ensureSchema();
  return getSql();
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
  const sql = await sqlReady();
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
  const sql = await sqlReady();
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
  const sql = await sqlReady();
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
  const sql = await sqlReady();
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
  const sql = await sqlReady();
  const rows = await sql`
    DELETE FROM portfolio_snapshots WHERE id = ${id} RETURNING id
  `;
  return rows.length > 0;
}

export async function getScenarios(): Promise<unknown[]> {
  const sql = await sqlReady();
  const rows = await sql`SELECT data FROM scenarios WHERE id = 1`;
  if (!rows.length) return [];
  const data = rows[0].data;
  return Array.isArray(data) ? data : [];
}

export async function saveScenarios(data: unknown[]): Promise<void> {
  const sql = await sqlReady();
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
  const sql = await sqlReady();
  const rows = await sql`SELECT COUNT(*)::int AS c FROM portfolio_snapshots`;
  return Number(rows[0]?.c ?? 0);
}
