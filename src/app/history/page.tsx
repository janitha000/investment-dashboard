"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { History as HistoryIcon, Camera, TrendingUp } from "lucide-react";

const INFLATION_RATE = 0.06;

type CategoryTotals = {
  fds?: number;
  uts?: number;
  treasury?: number;
  dividends?: number;
  pfcaFds?: number;
};

type SnapshotTotals = {
  invested?: number;
  investedByCategory?: CategoryTotals;
  gross?: number;
  netWht?: number;
  netIit?: number;
  physicalCash?: number;
};

type SnapshotRow = {
  id: string;
  timestamp: string;
  label?: string | null;
  totals: SnapshotTotals;
};

type ChartPoint = {
  id: string;
  label: string;
  fullDate: string;
  ts: number;
  fds: number;
  uts: number;
  treasury: number;
  dividends: number;
  pfcaFds: number;
  invested: number;
  grossMonthly: number;
  netWhtMonthly: number;
  netIitMonthly: number;
  physicalCashMonthly: number;
  inflationGross: number;
  inflationNetWht: number;
  inflationNetIit: number;
  inflationPhysical: number;
  inflationInvested: number;
};

function formatLKR(num: number) {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(num) ? num : 0);
}

function formatCompact(num: number) {
  if (!Number.isFinite(num)) return "0";
  const abs = Math.abs(num);
  if (abs >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return String(Math.round(num));
}

function inflate(base: number, startMs: number, atMs: number, rate = INFLATION_RATE) {
  if (!base || atMs <= startMs) return base;
  const years = (atMs - startMs) / (365.25 * 24 * 3600 * 1000);
  return base * Math.pow(1 + rate, years);
}

function annualizedGrowth(start: number, end: number, startMs: number, endMs: number) {
  if (start <= 0 || endMs <= startMs) return 0;
  const years = (endMs - startMs) / (365.25 * 24 * 3600 * 1000);
  if (years <= 0) return 0;
  return (Math.pow(end / start, 1 / years) - 1) * 100;
}

const tooltipStyle = {
  background: "rgba(13, 18, 31, 0.95)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  fontSize: 12,
  color: "#f3f4f6",
};

function LkrTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipStyle} className="hist-tooltip">
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || "#9ca3af", marginBottom: 2 }}>
          {p.name}: {formatLKR(Number(p.value) || 0)}
        </div>
      ))}
    </div>
  );
}

function PctTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipStyle}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || "#9ca3af", marginBottom: 2 }}>
          {p.name}: {(Number(p.value) || 0).toFixed(2)}%
        </div>
      ))}
    </div>
  );
}

export default function HistoryPage() {
  const [loading, setLoading] = useState(true);
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/snapshots");
        if (!res.ok) throw new Error("Failed to load snapshots");
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) setSnapshots(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const chronological = useMemo(() => {
    return [...snapshots].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [snapshots]);

  const chartData: ChartPoint[] = useMemo(() => {
    if (!chronological.length) return [];
    const startMs = new Date(chronological[0].timestamp).getTime();
    const first = chronological[0].totals || {};
    const baseGross = (first.gross || 0) / 12;
    const baseNetWht = (first.netWht || 0) / 12;
    const baseNetIit = (first.netIit || 0) / 12;
    const basePhysical = (first.physicalCash || 0) / 12;
    const baseInvested = first.invested || 0;

    return chronological.map((snap) => {
      const t = snap.totals || {};
      const cat = t.investedByCategory || {};
      const ts = new Date(snap.timestamp).getTime();
      const d = new Date(snap.timestamp);
      return {
        id: snap.id,
        label: d.toLocaleDateString("en-LK", { month: "short", day: "numeric", year: "2-digit" }),
        fullDate: d.toLocaleString("en-LK"),
        ts,
        fds: cat.fds || 0,
        uts: cat.uts || 0,
        treasury: cat.treasury || 0,
        dividends: cat.dividends || 0,
        pfcaFds: cat.pfcaFds || 0,
        invested: t.invested || 0,
        grossMonthly: (t.gross || 0) / 12,
        netWhtMonthly: (t.netWht || 0) / 12,
        netIitMonthly: (t.netIit || 0) / 12,
        physicalCashMonthly: (t.physicalCash || 0) / 12,
        inflationGross: inflate(baseGross, startMs, ts),
        inflationNetWht: inflate(baseNetWht, startMs, ts),
        inflationNetIit: inflate(baseNetIit, startMs, ts),
        inflationPhysical: inflate(basePhysical, startMs, ts),
        inflationInvested: inflate(baseInvested, startMs, ts),
      };
    });
  }, [chronological]);

  const growthBars = useMemo(() => {
    if (chartData.length < 2) {
      return [
        { name: "Gross /mo", growth: 0, inflation: INFLATION_RATE * 100 },
        { name: "Net WHT /mo", growth: 0, inflation: INFLATION_RATE * 100 },
        { name: "Net IIT /mo", growth: 0, inflation: INFLATION_RATE * 100 },
        { name: "Physical cash /mo", growth: 0, inflation: INFLATION_RATE * 100 },
        { name: "Total capital", growth: 0, inflation: INFLATION_RATE * 100 },
      ];
    }
    const first = chartData[0];
    const last = chartData[chartData.length - 1];
    const mk = (label: string, a: number, b: number) => ({
      name: label,
      growth: annualizedGrowth(a, b, first.ts, last.ts),
      inflation: INFLATION_RATE * 100,
    });
    return [
      mk("Gross /mo", first.grossMonthly, last.grossMonthly),
      mk("Net WHT /mo", first.netWhtMonthly, last.netWhtMonthly),
      mk("Net IIT /mo", first.netIitMonthly, last.netIitMonthly),
      mk("Physical cash /mo", first.physicalCashMonthly, last.physicalCashMonthly),
      mk("Total capital", first.invested, last.invested),
      mk("FD capital", first.fds, last.fds),
      mk("UT capital", first.uts, last.uts),
      mk("Treasury capital", first.treasury, last.treasury),
      mk("Dividends capital", first.dividends, last.dividends),
      mk("PFCA capital", first.pfcaFds, last.pfcaFds),
    ];
  }, [chartData]);

  const latest = chartData[chartData.length - 1];
  const first = chartData[0];

  if (loading) {
    return (
      <div className="animate-fade-in text-sans-layout hist-loading">Loading history…</div>
    );
  }

  return (
    <div className="animate-fade-in text-sans-layout">
      <div className="page-header-container">
        <span className="badge badge-teal">Trends</span>
        <h1 className="page-title">Portfolio History</h1>
        <p className="page-subtitle">
          Growth across saved snapshots — category capital, monthly gross/net income, physical cash,
          and a {(INFLATION_RATE * 100).toFixed(0)}% inflation baseline.
        </p>
      </div>

      {error && <div className="glass-card hist-error">{error}</div>}

      {!error && chronological.length === 0 && (
        <div className="glass-card hist-empty">
          <Camera size={22} />
          <div>
            <h3>No snapshots yet</h3>
            <p>
              Save a snapshot on{" "}
              <Link href="/portfolio">My Portfolio</Link> to start building history charts.
            </p>
          </div>
        </div>
      )}

      {chronological.length > 0 && (
        <>
          <div className="hist-kpi-row">
            <div className="glass-card hist-kpi">
              <span>Snapshots</span>
              <strong>{chronological.length}</strong>
            </div>
            <div className="glass-card hist-kpi">
              <span>First → Latest</span>
              <strong>
                {first?.label} → {latest?.label}
              </strong>
            </div>
            <div className="glass-card hist-kpi">
              <span>Latest physical cash /mo</span>
              <strong className="text-gold">{formatLKR(latest?.physicalCashMonthly || 0)}</strong>
            </div>
            <div className="glass-card hist-kpi">
              <span>Inflation baseline</span>
              <strong className="text-coral">{(INFLATION_RATE * 100).toFixed(0)}% p.a.</strong>
            </div>
          </div>

          {/* Monthly income + physical cash */}
          <div className="glass-card hist-chart-card">
            <div className="hist-chart-hdr">
              <div>
                <h3>Monthly income &amp; physical cash</h3>
                <p>
                  Gross, Net after WHT, Net after Progressive IIT, and Physical Cash Available —
                  dashed lines are the {(INFLATION_RATE * 100).toFixed(0)}% inflation path from the
                  first snapshot.
                </p>
              </div>
              <TrendingUp size={18} className="hist-chart-icon" />
            </div>
            <div className="hist-chart-wrap">
              <ResponsiveContainer width="100%" height={340}>
                <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={formatCompact} />
                  <Tooltip content={<LkrTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
                  <Line
                    type="monotone"
                    dataKey="grossMonthly"
                    name="Gross /mo"
                    stroke="#00f2fe"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="netWhtMonthly"
                    name="Net WHT /mo"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="netIitMonthly"
                    name="Net IIT /mo"
                    stroke="#d8b4fe"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="physicalCashMonthly"
                    name="Physical cash /mo"
                    stroke="#fbbf24"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="inflationPhysical"
                    name={`Inflation ${(INFLATION_RATE * 100).toFixed(0)}% (cash)`}
                    stroke="#f87171"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="inflationGross"
                    name={`Inflation ${(INFLATION_RATE * 100).toFixed(0)}% (gross)`}
                    stroke="#fb7185"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    opacity={0.7}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category capital */}
          <div className="glass-card hist-chart-card">
            <div className="hist-chart-hdr">
              <div>
                <h3>Category capital growth</h3>
                <p>
                  Invested amount by category over time, with total capital vs a{" "}
                  {(INFLATION_RATE * 100).toFixed(0)}% inflation-adjusted baseline.
                </p>
              </div>
            </div>
            <div className="hist-chart-wrap">
              <ResponsiveContainer width="100%" height={340}>
                <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={formatCompact} />
                  <Tooltip content={<LkrTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
                  <Area
                    type="monotone"
                    dataKey="fds"
                    name="Fixed Deposits"
                    stackId="1"
                    stroke="#00f2fe"
                    fill="rgba(0, 242, 254, 0.25)"
                  />
                  <Area
                    type="monotone"
                    dataKey="uts"
                    name="Unit Trusts"
                    stackId="1"
                    stroke="#10b981"
                    fill="rgba(16, 185, 129, 0.25)"
                  />
                  <Area
                    type="monotone"
                    dataKey="treasury"
                    name="Treasury"
                    stackId="1"
                    stroke="#818cf8"
                    fill="rgba(129, 140, 248, 0.25)"
                  />
                  <Area
                    type="monotone"
                    dataKey="dividends"
                    name="Dividends"
                    stackId="1"
                    stroke="#6366f1"
                    fill="rgba(99, 102, 241, 0.25)"
                  />
                  <Area
                    type="monotone"
                    dataKey="pfcaFds"
                    name="PFCA FDs"
                    stackId="1"
                    stroke="#f43f5e"
                    fill="rgba(244, 63, 94, 0.25)"
                  />
                  <Line
                    type="monotone"
                    dataKey="inflationInvested"
                    name={`Inflation ${(INFLATION_RATE * 100).toFixed(0)}% (capital)`}
                    stroke="#f87171"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Growth vs inflation bars */}
          <div className="glass-card hist-chart-card">
            <div className="hist-chart-hdr">
              <div>
                <h3>Annualized growth vs {(INFLATION_RATE * 100).toFixed(0)}% inflation</h3>
                <p>
                  Bars compare realized annualized growth from first → latest snapshot against a
                  fixed {(INFLATION_RATE * 100).toFixed(0)}% inflation bar. Needs at least two
                  snapshots for meaningful rates.
                </p>
              </div>
              <HistoryIcon size={18} className="hist-chart-icon" />
            </div>
            <div className="hist-chart-wrap hist-bar-wrap">
              <ResponsiveContainer width="100%" height={380}>
                <BarChart
                  data={growthBars}
                  margin={{ top: 8, right: 12, left: 4, bottom: 48 }}
                  barGap={4}
                  barCategoryGap="18%"
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#9ca3af", fontSize: 10 }}
                    interval={0}
                    angle={-28}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                    unit="%"
                  />
                  <Tooltip content={<PctTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
                  <Bar
                    dataKey="growth"
                    name="Actual growth (ann.)"
                    fill="#00f2fe"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="inflation"
                    name={`Inflation ${(INFLATION_RATE * 100).toFixed(0)}%`}
                    fill="#f87171"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {chronological.length < 2 && (
              <p className="hist-note">
                Save another snapshot later to unlock growth-rate comparisons.
              </p>
            )}
          </div>
        </>
      )}

      <style jsx>{`
        .hist-loading {
          padding: 3rem 0;
          color: var(--text-muted);
        }

        .hist-error {
          padding: 1rem 1.25rem;
          margin-bottom: 1.25rem;
          color: #f87171;
          font-weight: 700;
          font-size: 0.85rem;
        }

        .hist-empty {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1.5rem;
          color: var(--color-teal);
        }

        .hist-empty h3 {
          margin: 0 0 4px;
          color: var(--text-primary);
          font-size: 1rem;
        }

        .hist-empty p {
          margin: 0;
          color: var(--text-muted);
          font-size: 0.85rem;
          font-weight: 600;
        }

        .hist-empty :global(a) {
          color: var(--color-teal);
          font-weight: 700;
        }

        .hist-kpi-row {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1rem;
          margin-bottom: 1.25rem;
        }

        @media (max-width: 900px) {
          .hist-kpi-row {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        .hist-kpi {
          padding: 1rem 1.1rem;
        }

        .hist-kpi span {
          display: block;
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: var(--text-muted);
          margin-bottom: 6px;
        }

        .hist-kpi strong {
          font-size: 1.05rem;
          color: var(--text-primary);
        }

        .text-gold {
          color: #fbbf24;
        }

        .text-coral {
          color: #f87171;
        }

        .hist-chart-card {
          padding: 1.25rem 1.4rem 1rem;
          margin-bottom: 1.25rem;
          width: 100%;
        }

        .hist-chart-hdr {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 0.75rem;
        }

        .hist-chart-hdr h3 {
          margin: 0;
          font-size: 1rem;
          color: var(--text-primary);
        }

        .hist-chart-hdr p {
          margin: 4px 0 0;
          font-size: 0.78rem;
          color: var(--text-muted);
          font-weight: 600;
          line-height: 1.45;
          max-width: 720px;
        }

        .hist-chart-icon {
          color: var(--color-teal);
          flex-shrink: 0;
        }

        .hist-chart-wrap {
          width: 100%;
          min-height: 320px;
        }

        .hist-bar-wrap {
          min-height: 360px;
        }

        .hist-note {
          margin: 0.5rem 0 0;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
