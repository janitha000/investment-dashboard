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

const INCOME_METRICS = [
  { id: "physicalCash", label: "Physical Cash", field: "physicalCashMonthly", color: "#fbbf24" },
  { id: "netIit", label: "Net after IIT", field: "netIitMonthly", color: "#d8b4fe" },
  { id: "netWht", label: "Net after WHT", field: "netWhtMonthly", color: "#10b981" },
  { id: "gross", label: "Gross", field: "grossMonthly", color: "#00f2fe" },
] as const;

type MetricId = (typeof INCOME_METRICS)[number]["id"];

const CAPITAL_CATEGORIES = [
  { key: "fds" as const, label: "Fixed Deposits", color: "#00f2fe" },
  { key: "uts" as const, label: "Unit Trusts", color: "#10b981" },
  { key: "treasury" as const, label: "Treasury", color: "#818cf8" },
  { key: "dividends" as const, label: "Dividends", color: "#6366f1" },
  { key: "pfcaFds" as const, label: "PFCA FDs", color: "#f43f5e" },
];

export default function HistoryPage() {
  const [loading, setLoading] = useState(true);
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [horizon, setHorizon] = useState(2);
  const [metric, setMetric] = useState<MetricId>("physicalCash");

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

  const metricMeta = INCOME_METRICS.find((m) => m.id === metric) || INCOME_METRICS[0];

  /**
   * Forward-looking purchasing-power plan.
   * Required capital to keep real income flat grows at exactly the inflation rate,
   * so the minimum annual reinvestment is inflation × current capital.
   */
  const projection = useMemo(() => {
    const baseMonthly = latest ? Number(latest[metricMeta.field]) || 0 : 0;
    const capital = latest?.invested || 0;
    const annualIncome = baseMonthly * 12;
    const netYield = capital > 0 ? annualIncome / capital : 0;
    const reinvestFraction = netYield > 0 ? INFLATION_RATE / netYield : 0;
    const minMonthlyReinvest = (capital * INFLATION_RATE) / 12;
    const spendableAfter = baseMonthly - minMonthlyReinvest;
    const factor = Math.pow(1 + INFLATION_RATE, horizon);

    const points = Array.from({ length: horizon + 1 }, (_, t) => {
      const infl = Math.pow(1 + INFLATION_RATE, t);
      return {
        name: t === 0 ? "Now" : `Year ${t}`,
        target: baseMonthly * infl,
        flatNominal: baseMonthly,
        realIfFlat: baseMonthly / infl,
        shortfall: baseMonthly * infl - baseMonthly,
        requiredCapital: capital * infl,
        additionalCapital: capital * (infl - 1),
      };
    });

    const categories = CAPITAL_CATEGORIES.map((c) => {
      const held = latest ? Number(latest[c.key]) || 0 : 0;
      return {
        name: c.label,
        color: c.color,
        current: held,
        additional: held * (factor - 1),
        required: held * factor,
        monthlyTopUp: (held * (factor - 1)) / (horizon * 12),
      };
    });

    return {
      baseMonthly,
      capital,
      netYield: netYield * 100,
      reinvestFraction: reinvestFraction * 100,
      minMonthlyReinvest,
      spendableAfter,
      canBeatInflation: netYield > INFLATION_RATE,
      requiredCapitalAtHorizon: capital * factor,
      additionalCapitalAtHorizon: capital * (factor - 1),
      targetAtHorizon: baseMonthly * factor,
      erodedAtHorizon: baseMonthly / factor,
      points,
      categories,
    };
  }, [latest, metricMeta.field, horizon]);

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

          {/* Forward-looking inflation planner */}
          <div className="glass-card hist-chart-card hist-plan-card">
            <div className="hist-chart-hdr">
              <div>
                <h3>Beat inflation — {horizon}-year plan</h3>
                <p>
                  FD and UT income is fixed in nominal terms, so purchasing power erodes at{" "}
                  {(INFLATION_RATE * 100).toFixed(0)}% a year. This shows the income you must reach
                  and the minimum you need to reinvest to stay level in real terms.
                </p>
              </div>
            </div>

            <div className="hist-plan-controls">
              <div className="hist-toggle-group">
                <span className="hist-toggle-lbl">Horizon</span>
                <div className="hist-toggle">
                  {[1, 2, 3, 4, 5].map((y) => (
                    <button
                      key={y}
                      type="button"
                      className={horizon === y ? "active" : ""}
                      onClick={() => setHorizon(y)}
                    >
                      {y}Y
                    </button>
                  ))}
                </div>
              </div>
              <div className="hist-toggle-group">
                <span className="hist-toggle-lbl">Income basis</span>
                <div className="hist-toggle">
                  {INCOME_METRICS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={metric === m.id ? "active" : ""}
                      onClick={() => setMetric(m.id)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="hist-plan-kpis">
              <div>
                <span>Today ({metricMeta.label})</span>
                <strong style={{ color: metricMeta.color }}>
                  {formatLKR(projection.baseMonthly)}/mo
                </strong>
              </div>
              <div>
                <span>Needed in {horizon}Y to stay level</span>
                <strong className="text-coral">{formatLKR(projection.targetAtHorizon)}/mo</strong>
              </div>
              <div>
                <span>Min. reinvestment</span>
                <strong className="text-gold">
                  {formatLKR(projection.minMonthlyReinvest)}/mo
                </strong>
              </div>
              <div>
                <span>Reinvest share of income</span>
                <strong className="text-gold">
                  {projection.reinvestFraction > 0
                    ? `${projection.reinvestFraction.toFixed(0)}%`
                    : "—"}
                </strong>
              </div>
              <div>
                <span>Truly spendable now</span>
                <strong className={projection.spendableAfter >= 0 ? "text-emerald" : "text-coral"}>
                  {formatLKR(projection.spendableAfter)}/mo
                </strong>
              </div>
              <div>
                <span>Extra capital by {horizon}Y</span>
                <strong className="text-teal">
                  {formatLKR(projection.additionalCapitalAtHorizon)}
                </strong>
              </div>
            </div>

            {projection.capital > 0 && (
              <div
                className={`hist-plan-verdict ${projection.canBeatInflation ? "ok" : "warn"}`}
              >
                {projection.canBeatInflation ? (
                  <>
                    Net yield on capital is {projection.netYield.toFixed(2)}% vs{" "}
                    {(INFLATION_RATE * 100).toFixed(0)}% inflation. Reinvest about{" "}
                    {formatLKR(projection.minMonthlyReinvest)}/mo (
                    {projection.reinvestFraction.toFixed(0)}% of this income) and keep{" "}
                    {formatLKR(projection.spendableAfter)}/mo to spend — that holds your purchasing
                    power flat. Anything reinvested above this grows it.
                  </>
                ) : (
                  <>
                    Net yield on capital is only {projection.netYield.toFixed(2)}%, below{" "}
                    {(INFLATION_RATE * 100).toFixed(0)}% inflation. Reinvesting income alone cannot
                    keep pace — you need fresh capital from outside the portfolio or a
                    higher-yielding mix.
                  </>
                )}
              </div>
            )}

            <div className="hist-chart-wrap">
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart
                  data={projection.points}
                  margin={{ top: 8, right: 12, left: 4, bottom: 0 }}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={formatCompact} />
                  <Tooltip content={<LkrTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
                  <Bar
                    dataKey="shortfall"
                    name="Extra income needed"
                    fill="rgba(248, 113, 113, 0.35)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    type="monotone"
                    dataKey="target"
                    name={`Target (${(INFLATION_RATE * 100).toFixed(0)}% inflation)`}
                    stroke="#f87171"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="flatNominal"
                    name="If you never reinvest (nominal)"
                    stroke={metricMeta.color}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="realIfFlat"
                    name="Purchasing power if you never reinvest"
                    stroke="#9ca3af"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="hist-plan-sub">
              <h4>Minimum top-up by category over {horizon} year{horizon > 1 ? "s" : ""}</h4>
              <p>
                Each bucket must also grow {(INFLATION_RATE * 100).toFixed(0)}% a year. Held capital
                plus the extra needed equals the {horizon}-year requirement.
              </p>
            </div>
            <div className="hist-chart-wrap">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={projection.categories}
                  margin={{ top: 8, right: 12, left: 4, bottom: 24 }}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 10 }} interval={0} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={formatCompact} />
                  <Tooltip content={<LkrTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
                  <Bar
                    dataKey="current"
                    name="Held today"
                    stackId="cap"
                    fill="rgba(0, 242, 254, 0.5)"
                  />
                  <Bar
                    dataKey="additional"
                    name={`Extra needed by ${horizon}Y`}
                    stackId="cap"
                    fill="rgba(248, 113, 113, 0.6)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="hist-cat-table">
              {projection.categories.map((c) => (
                <div key={c.name} className="hist-cat-row">
                  <span className="dot" style={{ background: c.color }} />
                  <span className="nm">{c.name}</span>
                  <span className="v">Held {formatLKR(c.current)}</span>
                  <span className="v need">Add {formatLKR(c.additional)}</span>
                  <span className="v">{formatLKR(c.monthlyTopUp)}/mo</span>
                </div>
              ))}
            </div>
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

        .hist-plan-card {
          border-color: rgba(248, 113, 113, 0.22);
          background: linear-gradient(
            135deg,
            rgba(248, 113, 113, 0.04) 0%,
            rgba(9, 14, 26, 0.4) 100%
          );
        }

        .hist-plan-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 1.25rem;
          margin-bottom: 1rem;
        }

        .hist-toggle-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .hist-toggle-lbl {
          font-size: 0.66rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-muted);
        }

        .hist-toggle {
          display: inline-flex;
          gap: 2px;
          padding: 2px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: rgba(255, 255, 255, 0.02);
        }

        .hist-toggle button {
          border: none;
          background: none;
          padding: 0.4rem 0.75rem;
          border-radius: 6px;
          color: var(--text-secondary);
          font-family: var(--font-body);
          font-size: 0.72rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .hist-toggle button:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.05);
        }

        .hist-toggle button.active {
          color: #04060c;
          background: linear-gradient(135deg, var(--color-teal) 0%, var(--color-indigo) 100%);
        }

        .hist-plan-kpis {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 0.9rem;
          padding: 0.9rem 0;
          border-top: 1px solid var(--border-color);
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 1rem;
        }

        @media (max-width: 1100px) {
          .hist-plan-kpis {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 620px) {
          .hist-plan-kpis {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        .hist-plan-kpis span {
          display: block;
          font-size: 0.63rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: var(--text-muted);
          margin-bottom: 4px;
        }

        .hist-plan-kpis strong {
          font-size: 0.92rem;
          font-family: var(--font-display);
        }

        .hist-plan-verdict {
          padding: 0.8rem 1rem;
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 600;
          line-height: 1.5;
          margin-bottom: 1rem;
        }

        .hist-plan-verdict.ok {
          border: 1px solid rgba(16, 185, 129, 0.28);
          background: rgba(16, 185, 129, 0.07);
          color: var(--text-secondary);
        }

        .hist-plan-verdict.warn {
          border: 1px solid rgba(248, 113, 113, 0.32);
          background: rgba(248, 113, 113, 0.08);
          color: #fca5a5;
        }

        .hist-plan-sub {
          margin-top: 1.25rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
        }

        .hist-plan-sub h4 {
          margin: 0;
          font-size: 0.9rem;
          color: var(--text-primary);
        }

        .hist-plan-sub p {
          margin: 4px 0 0;
          font-size: 0.75rem;
          color: var(--text-muted);
          font-weight: 600;
        }

        .hist-cat-table {
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin-top: 0.5rem;
        }

        .hist-cat-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 7px 10px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.02);
          font-size: 0.73rem;
          font-weight: 600;
          color: var(--text-secondary);
          flex-wrap: wrap;
        }

        .hist-cat-row .dot {
          width: 8px;
          height: 8px;
          border-radius: 2px;
          flex-shrink: 0;
        }

        .hist-cat-row .nm {
          min-width: 120px;
          color: var(--text-primary);
          font-weight: 700;
        }

        .hist-cat-row .v {
          min-width: 130px;
        }

        .hist-cat-row .v.need {
          color: #fca5a5;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}
