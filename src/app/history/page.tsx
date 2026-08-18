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
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  History as HistoryIcon,
  Camera,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

const INFLATION_RATE = 0.06;
const NOW_MS = new Date("2026-08-18").getTime();

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
  // Cumulative inflation from first snapshot
  inflationGross: number;
  inflationNetWht: number;
  inflationNetIit: number;
  inflationPhysical: number;
  inflationInvested: number;
  // Period-on-period inflation target (reset each snapshot)
  popInflationNetIit: number;
  popInflationPhysical: number;
};

/** Delta between two consecutive snapshots */
type SnapshotDelta = {
  from: string;
  to: string;
  periodLabel: string;
  grossDelta: number;
  netIitDelta: number;
  physicalDelta: number;
  investedDelta: number;
  totalWealth: number;   // absolute capital at the end snapshot
  fdsDelta: number;
  utsDelta: number;
  treasuryDelta: number;
  dividendsDelta: number;
  pfcaFdsDelta: number;
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

function formatDelta(num: number) {
  const sign = num >= 0 ? "+" : "";
  return `${sign}${formatLKR(num)}`;
}

/** Compound `base` from `startMs` to `atMs` at `rate` p.a. */
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
  background: "rgba(13, 18, 31, 0.97)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10,
  fontSize: 12,
  color: "#f3f4f6",
  padding: "10px 14px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
};

function LkrTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipStyle} className="hist-tooltip">
      <div style={{ fontWeight: 700, marginBottom: 6, color: "#fff" }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || "#9ca3af", marginBottom: 3, display: "flex", justifyContent: "space-between", gap: 20 }}>
          <span>{p.name}</span>
          <span style={{ fontWeight: 700 }}>{formatLKR(Number(p.value) || 0)}</span>
        </div>
      ))}
    </div>
  );
}

function PctTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipStyle}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: "#fff" }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || "#9ca3af", marginBottom: 3, display: "flex", justifyContent: "space-between", gap: 20 }}>
          <span>{p.name}</span>
          <span style={{ fontWeight: 700 }}>{(Number(p.value) || 0).toFixed(2)}%</span>
        </div>
      ))}
    </div>
  );
}

const INCOME_METRICS = [
  { id: "physicalCash", label: "Physical Cash", field: "physicalCashMonthly" as const, color: "#fbbf24" },
  { id: "netIit", label: "Net after IIT", field: "netIitMonthly" as const, color: "#d8b4fe" },
  { id: "netWht", label: "Net after WHT", field: "netWhtMonthly" as const, color: "#10b981" },
  { id: "gross", label: "Gross", field: "grossMonthly" as const, color: "#00f2fe" },
] as const;

type MetricId = (typeof INCOME_METRICS)[number]["id"];

const CAPITAL_CATEGORIES = [
  { key: "fds" as const, label: "Fixed Deposits", color: "#00f2fe" },
  { key: "uts" as const, label: "Unit Trusts", color: "#10b981" },
  { key: "treasury" as const, label: "Treasury", color: "#818cf8" },
  { key: "dividends" as const, label: "Dividends", color: "#6366f1" },
  { key: "pfcaFds" as const, label: "PFCA FDs", color: "#f43f5e" },
];

const HORIZON_OPTIONS = [1, 2, 3, 5, 10];

export default function HistoryPage() {
  const [loading, setLoading] = useState(true);
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [horizon, setHorizon] = useState(5);
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

    return chronological.map((snap, i) => {
      const t = snap.totals || {};
      const cat = t.investedByCategory || {};
      const ts = new Date(snap.timestamp).getTime();
      const d = new Date(snap.timestamp);

      // Period-on-period: inflate from the PREVIOUS snapshot's values
      const prev = i > 0 ? chronological[i - 1] : null;
      const prevTs = prev ? new Date(prev.timestamp).getTime() : ts;
      const prevNetIit = prev ? (prev.totals?.netIit || 0) / 12 : baseNetIit;
      const prevPhysical = prev ? (prev.totals?.physicalCash || 0) / 12 : basePhysical;

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
        // Cumulative from first snapshot
        inflationGross: inflate(baseGross, startMs, ts),
        inflationNetWht: inflate(baseNetWht, startMs, ts),
        inflationNetIit: inflate(baseNetIit, startMs, ts),
        inflationPhysical: inflate(basePhysical, startMs, ts),
        inflationInvested: inflate(baseInvested, startMs, ts),
        // Period-on-period (each snapshot to the next)
        popInflationNetIit: i === 0 ? baseNetIit : inflate(prevNetIit, prevTs, ts),
        popInflationPhysical: i === 0 ? basePhysical : inflate(prevPhysical, prevTs, ts),
      };
    });
  }, [chronological]);

  /** Delta between consecutive snapshots */
  const snapshotDeltas: SnapshotDelta[] = useMemo(() => {
    if (chartData.length < 2) return [];
    return chartData.slice(1).map((cur, i) => {
      const prev = chartData[i];
      return {
        from: prev.label,
        to: cur.label,
        periodLabel: `${prev.label} → ${cur.label}`,
        grossDelta: cur.grossMonthly - prev.grossMonthly,
        netIitDelta: cur.netIitMonthly - prev.netIitMonthly,
        physicalDelta: cur.physicalCashMonthly - prev.physicalCashMonthly,
        investedDelta: cur.invested - prev.invested,
        totalWealth: cur.invested,
        fdsDelta: cur.fds - prev.fds,
        utsDelta: cur.uts - prev.uts,
        treasuryDelta: cur.treasury - prev.treasury,
        dividendsDelta: cur.dividends - prev.dividends,
        pfcaFdsDelta: cur.pfcaFds - prev.pfcaFds,
      };
    });
  }, [chartData]);

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

  /**
   * Inflation erosion data for the two erosion charts.
   * Both charts show actual net-IIT and physical cash.
   * Chart A: inflation target compounded from the very FIRST snapshot (cumulative erosion view).
   * Chart B: inflation target compounded period-on-period (momentum view).
   * An extra "today" point is appended showing where you need to be right now.
   */
  const erosionData = useMemo(() => {
    if (!chartData.length) return { points: [], todayTargetCumulative: 0, todayTargetPop: 0 };
    const firstTs = chartData[0].ts;
    const baseNetIit = chartData[0].netIitMonthly;
    const basePhysical = chartData[0].physicalCashMonthly;

    const points = chartData.map((pt) => ({
      label: pt.label,
      ts: pt.ts,
      actual: pt.netIitMonthly,
      actualPhysical: pt.physicalCashMonthly,
      // Chart A: cumulative target from first snapshot
      cumulativeTarget: inflate(baseNetIit, firstTs, pt.ts),
      cumulativeTargetPhysical: inflate(basePhysical, firstTs, pt.ts),
      // Chart B: period-on-period target
      popTarget: pt.popInflationNetIit,
      popTargetPhysical: pt.popInflationPhysical,
    }));

    // Append "Today" if not already the last point
    const lastTs = chartData[chartData.length - 1].ts;
    const lastActual = chartData[chartData.length - 1].netIitMonthly;
    const lastPhysical = chartData[chartData.length - 1].physicalCashMonthly;
    const todayCumulTarget = inflate(baseNetIit, firstTs, NOW_MS);
    const todayPopTarget = inflate(lastActual, lastTs, NOW_MS);
    const todayCumulTargetPhys = inflate(basePhysical, firstTs, NOW_MS);
    const todayPopTargetPhys = inflate(lastPhysical, lastTs, NOW_MS);

    if (NOW_MS > lastTs + 1000 * 60 * 60 * 24) {
      points.push({
        label: "Today",
        ts: NOW_MS,
        actual: lastActual, // carry-forward actual since no new snapshot
        actualPhysical: lastPhysical,
        cumulativeTarget: todayCumulTarget,
        cumulativeTargetPhysical: todayCumulTargetPhys,
        popTarget: todayPopTarget,
        popTargetPhysical: todayPopTargetPhys,
      });
    }

    return {
      points,
      todayTargetCumulative: todayCumulTarget,
      todayTargetPop: todayPopTarget,
    };
  }, [chartData]);

  const latest = chartData[chartData.length - 1];
  const first = chartData[0];

  /** Erosion verdict based on the latest snapshot vs cumulative inflation target */
  const erosionVerdict = useMemo(() => {
    if (!latest || !first) return null;
    const target = inflate(first.netIitMonthly, first.ts, NOW_MS);
    const actual = latest.netIitMonthly;
    const gapAbs = actual - target;
    const gapPct = target > 0 ? (gapAbs / target) * 100 : 0;
    return { target, actual, gapAbs, gapPct, beating: actual >= target };
  }, [latest, first]);

  const metricMeta = INCOME_METRICS.find((m) => m.id === metric) || INCOME_METRICS[0];

  /**
   * Forward-looking purchasing-power plan.
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

    // Year-by-year points up to horizon
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

    // 5Y and 10Y milestones always shown in the KPI row
    const at5 = baseMonthly * Math.pow(1 + INFLATION_RATE, 5);
    const at10 = baseMonthly * Math.pow(1 + INFLATION_RATE, 10);

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
      at5,
      at10,
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
          inflation erosion analysis, and a {(INFLATION_RATE * 100).toFixed(0)}% inflation baseline.
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
          {/* ── KPI row ── */}
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

          {/* ── Part 1: Monthly income & physical cash ── */}
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

          {/* ── Part 1: Category capital ── */}
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

          {/* ── Part 1: Snapshot-to-snapshot delta table ── */}
          {snapshotDeltas.length > 0 && (
            <div className="glass-card hist-chart-card">
              <div className="hist-chart-hdr">
                <div>
                  <h3>Snapshot-to-snapshot progress</h3>
                  <p>
                    Income and capital changes between consecutive snapshots —
                    <span style={{ color: "#10b981", marginLeft: 6 }}>▲ growth</span>
                    <span style={{ color: "#f87171", marginLeft: 8 }}>▼ decline</span>
                    <span style={{ color: "#6b7280", marginLeft: 8 }}>— no change</span>
                  </p>
                </div>
                <HistoryIcon size={18} className="hist-chart-icon" />
              </div>

              <div className="hist-delta-scroll">
                <table className="hist-delta-tbl">
                  <colgroup>
                    <col className="hdt-col-period" />
                    <col className="hdt-col-num" />
                    <col className="hdt-col-num" />
                    <col className="hdt-col-num" />
                    <col className="hdt-col-num hdt-col-divider" />
                    <col className="hdt-col-num" />
                    <col className="hdt-col-num" />
                    <col className="hdt-col-num" />
                    <col className="hdt-col-num" />
                    <col className="hdt-col-num" />
                    <col className="hdt-col-wealth" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="hdt-left">Period</th>
                      <th>Gross /mo</th>
                      <th>Net IIT /mo</th>
                      <th>Cash /mo</th>
                      <th className="hdt-divider">Capital Δ</th>
                      <th style={{ color: "#00f2fe" }}>FDs Δ</th>
                      <th style={{ color: "#10b981" }}>UTs Δ</th>
                      <th style={{ color: "#818cf8" }}>Treasury Δ</th>
                      <th style={{ color: "#6366f1" }}>Dividends Δ</th>
                      <th style={{ color: "#f43f5e" }}>PFCA Δ</th>
                      <th className="hdt-wealth-th">Total Wealth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshotDeltas.map((d, i) => (
                      <tr key={i}>
                        <td className="hdt-left hdt-period">{d.to}</td>
                        <DeltaTd value={d.grossDelta} />
                        <DeltaTd value={d.netIitDelta} />
                        <DeltaTd value={d.physicalDelta} />
                        <DeltaTd value={d.investedDelta} divider />
                        <DeltaTd value={d.fdsDelta} accent="#00f2fe" />
                        <DeltaTd value={d.utsDelta} accent="#10b981" />
                        <DeltaTd value={d.treasuryDelta} accent="#818cf8" />
                        <DeltaTd value={d.dividendsDelta} accent="#6366f1" />
                        <DeltaTd value={d.pfcaFdsDelta} accent="#f43f5e" />
                        <td className="hdt-wealth-cell">{formatCompact(d.totalWealth)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Part 2: Inflation Erosion ── */}
          <div className="glass-card hist-chart-card hist-erosion-card">
            <div className="hist-chart-hdr">
              <div>
                <h3>Inflation erosion analysis</h3>
                <p>
                  Two lenses on purchasing-power erosion: cumulative drift from your first snapshot
                  and period-on-period momentum. Dashed red = what your net-IIT income must be to
                  stay level against {(INFLATION_RATE * 100).toFixed(0)}% annual inflation.
                </p>
              </div>
              <AlertTriangle size={18} style={{ color: "#f87171", flexShrink: 0 }} />
            </div>

            {/* Erosion verdict */}
            {erosionVerdict && (
              <div className={`hist-erosion-verdict ${erosionVerdict.beating ? "ok" : "warn"}`}>
                <div className="hist-erosion-verdict-icon">
                  {erosionVerdict.beating ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <TrendingDown size={18} />
                  )}
                </div>
                <div>
                  <strong>
                    {erosionVerdict.beating ? "Beating inflation" : "Below inflation target"}
                  </strong>{" "}
                  — Your current net-IIT income is{" "}
                  <span style={{ fontWeight: 700, color: erosionVerdict.beating ? "#10b981" : "#f87171" }}>
                    {formatLKR(Math.abs(erosionVerdict.gapAbs))}/mo{" "}
                    {erosionVerdict.beating ? "above" : "below"}
                  </span>{" "}
                  the cumulative inflation target of{" "}
                  <span style={{ fontWeight: 700 }}>{formatLKR(erosionVerdict.target)}/mo</span>{" "}
                  ({Math.abs(erosionVerdict.gapPct).toFixed(1)}%{" "}
                  {erosionVerdict.beating ? "ahead" : "behind"}).
                </div>
              </div>
            )}

            {/* Erosion KPI strip */}
            <div className="hist-erosion-kpis">
              <div>
                <span>First snapshot net-IIT</span>
                <strong style={{ color: "#d8b4fe" }}>
                  {formatLKR(first?.netIitMonthly || 0)}/mo
                </strong>
              </div>
              <div>
                <span>Latest actual net-IIT</span>
                <strong style={{ color: "#d8b4fe" }}>
                  {formatLKR(latest?.netIitMonthly || 0)}/mo
                </strong>
              </div>
              <div>
                <span>Cumulative inflation target (today)</span>
                <strong className="text-coral">
                  {formatLKR(erosionData.todayTargetCumulative)}/mo
                </strong>
              </div>
              <div>
                <span>Period-on-period target (today)</span>
                <strong className="text-coral">
                  {formatLKR(erosionData.todayTargetPop)}/mo
                </strong>
              </div>
              <div>
                <span>Gap (cumulative)</span>
                <strong
                  style={{
                    color:
                      (latest?.netIitMonthly || 0) >= erosionData.todayTargetCumulative
                        ? "#10b981"
                        : "#f87171",
                  }}
                >
                  {formatDelta((latest?.netIitMonthly || 0) - erosionData.todayTargetCumulative)}/mo
                </strong>
              </div>
              <div>
                <span>Gap (period-on-period)</span>
                <strong
                  style={{
                    color:
                      (latest?.netIitMonthly || 0) >= erosionData.todayTargetPop
                        ? "#10b981"
                        : "#f87171",
                  }}
                >
                  {formatDelta((latest?.netIitMonthly || 0) - erosionData.todayTargetPop)}/mo
                </strong>
              </div>
            </div>

            {/* Chart A: Cumulative erosion from first snapshot */}
            <div className="hist-erosion-sub">
              <h4>Chart A — Cumulative erosion (from first snapshot)</h4>
              <p>
                The red dashed line compounds your first snapshot&apos;s net-IIT income at 6% p.a. to each
                subsequent date. This is the income you must reach to preserve the same real
                purchasing power you had on day one.
              </p>
            </div>
            <div className="hist-chart-wrap">
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart
                  data={erosionData.points}
                  margin={{ top: 8, right: 12, left: 4, bottom: 0 }}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={formatCompact} />
                  <Tooltip content={<LkrTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    name="Actual Net IIT /mo"
                    stroke="#d8b4fe"
                    fill="rgba(216, 180, 254, 0.12)"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="actualPhysical"
                    name="Actual Physical Cash /mo"
                    stroke="#fbbf24"
                    fill="rgba(251, 191, 36, 0.08)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulativeTarget"
                    name="Required Net IIT (6% cumulative)"
                    stroke="#f87171"
                    strokeWidth={2}
                    strokeDasharray="7 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulativeTargetPhysical"
                    name="Required Cash (6% cumulative)"
                    stroke="#fb923c"
                    strokeWidth={1.5}
                    strokeDasharray="5 4"
                    dot={false}
                    opacity={0.75}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Chart B: Period-on-period erosion */}
            <div className="hist-erosion-sub" style={{ marginTop: "1.5rem" }}>
              <h4>Chart B — Period-on-period erosion (momentum view)</h4>
              <p>
                The red dashed line compounds the <em>previous</em> snapshot&apos;s income at 6% p.a.
                to the current snapshot date. This shows whether each individual period kept pace
                with inflation — measuring recent momentum rather than cumulative drift.
              </p>
            </div>
            <div className="hist-chart-wrap">
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart
                  data={erosionData.points}
                  margin={{ top: 8, right: 12, left: 4, bottom: 0 }}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={formatCompact} />
                  <Tooltip content={<LkrTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    name="Actual Net IIT /mo"
                    stroke="#d8b4fe"
                    fill="rgba(216, 180, 254, 0.12)"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="actualPhysical"
                    name="Actual Physical Cash /mo"
                    stroke="#fbbf24"
                    fill="rgba(251, 191, 36, 0.08)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="popTarget"
                    name="Required Net IIT (6% per period)"
                    stroke="#f87171"
                    strokeWidth={2}
                    strokeDasharray="7 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="popTargetPhysical"
                    name="Required Cash (6% per period)"
                    stroke="#fb923c"
                    strokeWidth={1.5}
                    strokeDasharray="5 4"
                    dot={false}
                    opacity={0.75}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Part 1: Growth vs inflation bars ── */}
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
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
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

          {/* ── Part 3: Forward-looking inflation planner ── */}
          <div className="glass-card hist-chart-card hist-plan-card">
            <div className="hist-chart-hdr">
              <div>
                <h3>Beat inflation — {horizon}-year projection</h3>
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
                  {HORIZON_OPTIONS.map((y) => (
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

            {/* KPI row — now includes 5Y and 10Y milestones */}
            <div className="hist-plan-kpis hist-plan-kpis-wide">
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
                <span>Required at 5Y</span>
                <strong className="text-coral">{formatLKR(projection.at5)}/mo</strong>
              </div>
              <div>
                <span>Required at 10Y</span>
                <strong className="text-coral">{formatLKR(projection.at10)}/mo</strong>
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

            {/* Projection chart — income target over years */}
            <div className="hist-chart-wrap">
              <ResponsiveContainer width="100%" height={340}>
                <ComposedChart
                  data={projection.points}
                  margin={{ top: 8, right: 12, left: 4, bottom: 0 }}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={formatCompact} />
                  <Tooltip content={<LkrTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
                  {/* 5Y reference line */}
                  {horizon >= 5 && (
                    <ReferenceLine
                      x="Year 5"
                      stroke="rgba(251,191,36,0.5)"
                      strokeDasharray="4 3"
                      label={{ value: "5Y", position: "top", fill: "#fbbf24", fontSize: 10 }}
                    />
                  )}
                  {/* 10Y reference line */}
                  {horizon >= 10 && (
                    <ReferenceLine
                      x="Year 10"
                      stroke="rgba(248,113,113,0.5)"
                      strokeDasharray="4 3"
                      label={{ value: "10Y", position: "top", fill: "#f87171", fontSize: 10 }}
                    />
                  )}
                  <Bar
                    dataKey="shortfall"
                    name="Extra income needed"
                    fill="rgba(248, 113, 113, 0.3)"
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

            {/* Category breakdown */}
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

        .text-emerald {
          color: #10b981;
        }

        .text-teal {
          color: var(--color-teal);
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
          min-height: 280px;
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

        /* ── Snapshot delta table ── */
        .hist-delta-scroll {
          overflow-x: auto;
          margin-top: 0.6rem;
          border-radius: 10px;
          border: 1px solid var(--border-color);
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.12) transparent;
        }

        .hist-delta-scroll::-webkit-scrollbar {
          height: 5px;
        }

        .hist-delta-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .hist-delta-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.12);
          border-radius: 3px;
        }

        .hist-delta-tbl {
          width: 100%;
          min-width: 980px;
          border-collapse: collapse;
          font-size: 0.68rem;
          font-weight: 600;
          table-layout: fixed;
        }

        /* column widths — must match the colgroup order */
        .hdt-col-period  { width: 100px; }
        .hdt-col-num     { width: 80px; }
        .hdt-col-wealth  { width: 100px; }
        .hdt-col-divider { border-left: 1px solid var(--border-color); }

        .hist-delta-tbl thead tr {
          background: rgba(255,255,255,0.03);
          border-bottom: 1px solid var(--border-color);
        }

        .hist-delta-tbl th {
          padding: 0.48rem 0.65rem;
          font-size: 0.59rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          text-align: right;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .hist-delta-tbl th.hdt-left,
        .hist-delta-tbl td.hdt-left {
          text-align: left;
        }

        .hist-delta-tbl th.hdt-divider,
        .hist-delta-tbl td.hdt-divider {
          border-left: 1px solid var(--border-color);
        }

        .hist-delta-tbl tbody tr {
          border-bottom: 1px solid rgba(255,255,255,0.04);
          transition: background 0.15s;
        }

        .hist-delta-tbl tbody tr:last-child {
          border-bottom: none;
        }

        .hist-delta-tbl tbody tr:hover {
          background: rgba(255,255,255,0.025);
        }

        .hist-delta-tbl td {
          padding: 0.42rem 0.65rem;
          text-align: right;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          vertical-align: middle;
          font-size: 0.68rem;
        }

        .hdt-period {
          font-size: 0.67rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .hdt-pos { color: #10b981; }
        .hdt-neg { color: #f87171; }
        .hdt-zero { color: var(--text-muted); }

        /* Total Wealth column — styled to stand out as absolute value */
        .hdt-wealth-th {
          color: #fbbf24 !important;
          border-left: 1px solid var(--border-color);
        }

        .hdt-wealth-cell {
          color: #fbbf24;
          font-weight: 800;
          font-family: var(--font-display);
          border-left: 1px solid var(--border-color);
          text-align: right;
        }


        /* ── Inflation erosion ── */
        .hist-erosion-card {
          border-color: rgba(248, 113, 113, 0.2);
          background: linear-gradient(
            135deg,
            rgba(248, 113, 113, 0.04) 0%,
            rgba(9, 14, 26, 0.5) 100%
          );
        }

        .hist-erosion-verdict {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.85rem 1rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          line-height: 1.5;
          margin-bottom: 1rem;
        }

        .hist-erosion-verdict.ok {
          border: 1px solid rgba(16, 185, 129, 0.3);
          background: rgba(16, 185, 129, 0.07);
          color: var(--text-secondary);
        }

        .hist-erosion-verdict.warn {
          border: 1px solid rgba(248, 113, 113, 0.35);
          background: rgba(248, 113, 113, 0.08);
          color: #fca5a5;
        }

        .hist-erosion-verdict-icon {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .hist-erosion-verdict.ok .hist-erosion-verdict-icon {
          color: #10b981;
        }

        .hist-erosion-verdict.warn .hist-erosion-verdict-icon {
          color: #f87171;
        }

        .hist-erosion-kpis {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 0.85rem;
          padding: 0.85rem 0;
          border-top: 1px solid var(--border-color);
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 1.25rem;
        }

        @media (max-width: 1100px) {
          .hist-erosion-kpis {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 620px) {
          .hist-erosion-kpis {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        .hist-erosion-kpis span {
          display: block;
          font-size: 0.63rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: var(--text-muted);
          margin-bottom: 4px;
        }

        .hist-erosion-kpis strong {
          font-size: 0.9rem;
          font-family: var(--font-display);
        }

        .hist-erosion-sub {
          margin-top: 1.25rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
        }

        .hist-erosion-sub h4 {
          margin: 0;
          font-size: 0.9rem;
          color: var(--text-primary);
        }

        .hist-erosion-sub p {
          margin: 4px 0 0;
          font-size: 0.75rem;
          color: var(--text-muted);
          font-weight: 600;
          line-height: 1.5;
        }

        /* ── Inflation planner ── */
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

        .hist-plan-kpis-wide {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        @media (max-width: 1100px) {
          .hist-plan-kpis {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          .hist-plan-kpis-wide {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 620px) {
          .hist-plan-kpis,
          .hist-plan-kpis-wide {
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

/** Compact chip showing a labelled delta value — hides zero changes */
/**
 * A single <td> cell for the delta table.
 * Shows a compact +K / −K value with colour; renders — for zero.
 */
function DeltaTd({
  value,
  accent,
  divider,
}: {
  value: number;
  accent?: string;
  divider?: boolean;
}) {
  const isPos = value > 0;
  const isNeg = value < 0;

  if (value === 0) {
    return (
      <td className={`hdt-zero${divider ? " hdt-divider" : ""}`}>
        —
      </td>
    );
  }

  const baseColor = isPos ? "#10b981" : "#f87171";
  const color = accent ? accent : baseColor;
  const sign = isPos ? "+" : "−";
  const display = `${sign}${formatCompact(Math.abs(value))}`;

  return (
    <td
      className={`${isPos ? "hdt-pos" : "hdt-neg"}${divider ? " hdt-divider" : ""}`}
      style={accent ? { color } : undefined}
    >
      {display}
    </td>
  );
}
