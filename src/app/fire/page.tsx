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
  Flame,
  Camera,
  TrendingUp,
  Target,
  Zap,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Landmark,
  Compass,
  Wallet,
  LineChart as LineChartIcon,
  Globe,
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────
const INFLATION_RATE = 0.06;
const SWR_OPTIONS = [3, 3.5, 4, 4.5, 5];
const DEFAULT_SWR = 4;
const DEFAULT_RETURN = 9.5;
const PROJECTION_YEARS = 30;

// ─── Types ────────────────────────────────────────────────────────────────────
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

type ProjectionPoint = {
  year: number;
  label: string;
  capital: number;
  fiNumber: number;
  monthlyIncome: number;
  gap: number;
  achieved: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatLKR(n: number) {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

function formatCompact(n: number) {
  if (!Number.isFinite(n)) return "0";
  const a = Math.abs(n);
  if (a >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(Math.round(n));
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

// Compound future value with periodic contributions
// FV = PV * (1+r)^n + PMT * [((1+r)^n - 1) / r]
function futureValue(pv: number, rAnnual: number, pmt: number, years: number): number {
  if (rAnnual === 0) return pv + pmt * 12 * years;
  const rMonthly = rAnnual / 12;
  const n = years * 12;
  const growth = Math.pow(1 + rMonthly, n);
  return pv * growth + pmt * ((growth - 1) / rMonthly);
}

// ─── Tooltip components ───────────────────────────────────────────────────────
const tooltipStyle = {
  background: "rgba(13,18,31,0.97)",
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
    <div style={tooltipStyle}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: "#fff" }}>{label}</div>
      {payload.map((p, i) => (
        <div
          key={i}
          style={{
            color: p.color || "#9ca3af",
            marginBottom: 3,
            display: "flex",
            justifyContent: "space-between",
            gap: 20,
          }}
        >
          <span>{p.name}</span>
          <span style={{ fontWeight: 700 }}>{formatLKR(Number(p.value) || 0)}</span>
        </div>
      ))}
    </div>
  );
}

const CATEGORY_META = [
  { key: "fds" as const, label: "Fixed Deposits", icon: Landmark, color: "#00f2fe" },
  { key: "uts" as const, label: "Unit Trusts", icon: Compass, color: "#10b981" },
  { key: "treasury" as const, label: "Treasury", icon: Wallet, color: "#818cf8" },
  { key: "dividends" as const, label: "Dividends", icon: LineChartIcon, color: "#6366f1" },
  { key: "pfcaFds" as const, label: "PFCA FDs", icon: Globe, color: "#f43f5e" },
];

// ─── Progress Arc SVG ─────────────────────────────────────────────────────────
function ProgressArc({ pct, color }: { pct: number; color: string }) {
  const r = 80;
  const cx = 100;
  const cy = 100;
  const startAngle = -210;
  const totalArc = 240;
  const filled = clamp(pct, 0, 100);
  const filledAngle = (filled / 100) * totalArc;

  function polarToCartesian(deg: number) {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function arcPath(fromDeg: number, toDeg: number) {
    const s = polarToCartesian(fromDeg);
    const e = polarToCartesian(toDeg);
    const largeArc = toDeg - fromDeg > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  }

  const trackPath = arcPath(startAngle, startAngle + totalArc);
  const fillPath = filledAngle > 0 ? arcPath(startAngle, startAngle + filledAngle) : "";

  return (
    <svg viewBox="0 0 200 200" className="fire-arc-svg">
      {/* Track */}
      <path
        d={trackPath}
        fill="none"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth={14}
        strokeLinecap="round"
      />
      {/* Fill */}
      {fillPath && (
        <path
          d={fillPath}
          fill="none"
          stroke={color}
          strokeWidth={14}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${color}66)` }}
        />
      )}
      {/* Center text */}
      <text x={cx} y={cy - 10} textAnchor="middle" fill="#f3f4f6" fontSize={28} fontWeight={800} fontFamily="Outfit, sans-serif">
        {filled >= 100 ? "🔥" : `${filled.toFixed(1)}%`}
      </text>
      <text x={cx} y={cy + 18} textAnchor="middle" fill="#6b7280" fontSize={11} fontWeight={600}>
        to FIRE
      </text>
      <text x={cx} y={cy + 34} textAnchor="middle" fill="#9ca3af" fontSize={10}>
        {pct >= 100 ? "You are FI!" : `${(100 - filled).toFixed(1)}% remaining`}
      </text>
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FirePage() {
  const [loading, setLoading] = useState(true);
  const [latest, setLatest] = useState<SnapshotRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Inputs
  const [monthlyTarget, setMonthlyTarget] = useState("500000");
  const [swr, setSwr] = useState(DEFAULT_SWR);
  const [expectedReturn, setExpectedReturn] = useState(DEFAULT_RETURN);
  const [inflationRate] = useState(INFLATION_RATE * 100);
  const [monthlySavings, setMonthlySavings] = useState("200000");
  const [yearsToFire, setYearsToFire] = useState("4");

  // Load latest snapshot
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/snapshots");
        if (!res.ok) throw new Error("Failed to load snapshots");
        const data: SnapshotRow[] = await res.json();
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          const sorted = [...data].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          const snap = sorted[0];
          setLatest(snap);
          // snapshot is used for context/progress display only — inputs use hardcoded defaults
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Derived raw numbers
  const targetNum = parseFloat(monthlyTarget) || 0;
  const savingsNum = parseFloat(monthlySavings) || 0;
  const returnRate = expectedReturn / 100;
  const swrRate = swr / 100;
  const inflRate = inflationRate / 100;
  const yearsNum = Math.max(0, Math.round(parseFloat(yearsToFire) || 0));

  // Inflation-adjusted target at the planned FIRE year
  const inflatedTarget = yearsNum > 0
    ? targetNum * Math.pow(1 + inflRate, yearsNum)
    : targetNum;

  const currentCapital = latest?.totals?.invested || 0;
  const catTotals = latest?.totals?.investedByCategory || {};
  const latestNetIit = (latest?.totals?.netIit || 0) / 12;
  const latestPhysical = (latest?.totals?.physicalCash || 0) / 12;
  const latestGross = (latest?.totals?.gross || 0) / 12;
  const latestNetWht = (latest?.totals?.netWht || 0) / 12;
  const latestTs = latest ? new Date(latest.timestamp) : null;

  // ─── Core FIRE math ───────────────────────────────────────────────────────
  const fire = useMemo(() => {
    // Today's FI Number (in today's money)
    const fiNumberToday = targetNum > 0 ? (targetNum * 12) / swrRate : 0;
    // Inflation-adjusted FI Number (what you actually need at FIRE year)
    const fiNumber = inflatedTarget > 0 ? (inflatedTarget * 12) / swrRate : 0;
    const gap = Math.max(0, fiNumber - currentCapital);
    const progressPct = fiNumber > 0 ? clamp((currentCapital / fiNumber) * 100, 0, 150) : 0;
    const monthlyIncomeFromCapital = (currentCapital * swrRate) / 12;
    const coveragePct = inflatedTarget > 0 ? (monthlyIncomeFromCapital / inflatedTarget) * 100 : 0;
    const alreadyFI = currentCapital >= fiNumber && fiNumber > 0;

    // Category contributions to FI Number
    const categories = CATEGORY_META.map((c) => {
      const held = Number(catTotals[c.key]) || 0;
      const contribution = fiNumber > 0 ? (held / fiNumber) * 100 : 0;
      const fiShare = (held * swrRate) / 12;
      return { ...c, held, contribution, fiShare };
    });

    return {
      fiNumber,
      fiNumberToday,
      inflatedTarget,
      gap,
      progressPct,
      monthlyIncomeFromCapital,
      coveragePct,
      alreadyFI,
      categories,
    };
  }, [targetNum, inflatedTarget, swrRate, currentCapital, catTotals]);

  // ─── Projection: years to FIRE ────────────────────────────────────────────
  const projection = useMemo(() => {
    const points: ProjectionPoint[] = [];
    let fireYear: number | null = null;

    for (let y = 0; y <= PROJECTION_YEARS; y++) {
      const capital = futureValue(currentCapital, returnRate, savingsNum, y);
      const fiNumber = fire.fiNumber;
      const achieved = fiNumber > 0 && capital >= fiNumber;
      const monthlyIncome = (capital * swrRate) / 12;
      const gap = Math.max(0, fiNumber - capital);

      if (achieved && fireYear === null) fireYear = y;

      points.push({
        year: y,
        label: y === 0 ? "Now" : `Y${y}`,
        capital,
        fiNumber,
        monthlyIncome,
        gap,
        achieved,
      });
    }

    // Milestones: 5, 10, 15, 20, 25, 30
    const milestones = [5, 10, 15, 20, 25, 30]
      .filter((y) => y <= PROJECTION_YEARS)
      .map((y) => {
        const capital = futureValue(currentCapital, returnRate, savingsNum, y);
        const monthlyIncome = (capital * swrRate) / 12;
        const coveragePct = targetNum > 0 ? (monthlyIncome / targetNum) * 100 : 0;
        // Real (inflation-adjusted) monthly income
        const realMonthly = monthlyIncome / Math.pow(1 + inflRate, y);
        return { year: y, capital, monthlyIncome, coveragePct, realMonthly };
      });

    return { points, fireYear, milestones };
  }, [currentCapital, returnRate, savingsNum, fire.fiNumber, swrRate, targetNum, inflRate]);

  // ─── Withdrawal sustainability ────────────────────────────────────────────
  const sustainability = useMemo(() => {
    // At FIRE point capital
    const fireCapital =
      projection.fireYear !== null
        ? futureValue(currentCapital, returnRate, savingsNum, projection.fireYear)
        : fire.fiNumber; // use FI number as target if no FIRE achieved in 30Y

    return SWR_OPTIONS.map((rate) => {
      const swrFrac = rate / 100;
      const monthlyNominal = (fireCapital * swrFrac) / 12;
      const coversTarget = targetNum > 0 && monthlyNominal >= targetNum;
      // Real income after 10 / 20 / 30 years at 6% inflation
      const real10 = monthlyNominal / Math.pow(1 + inflRate, 10);
      const real20 = monthlyNominal / Math.pow(1 + inflRate, 20);
      const real30 = monthlyNominal / Math.pow(1 + inflRate, 30);
      return { rate, monthlyNominal, coversTarget, real10, real20, real30 };
    });
  }, [projection.fireYear, currentCapital, returnRate, savingsNum, fire.fiNumber, swrRate, targetNum, inflRate]);

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return <div className="animate-fade-in text-sans-layout fire-loading">Loading FIRE data…</div>;
  }

  const fireColor =
    fire.progressPct >= 100
      ? "#10b981"
      : fire.progressPct >= 66
      ? "#fbbf24"
      : "#f87171";

  return (
    <div className="animate-fade-in text-sans-layout">
      {/* ── Header ── */}
      <div className="page-header-container">
        <span className="badge badge-fire">FIRE</span>
        <h1 className="page-title fire-title">Financial Independence</h1>
        <p className="page-subtitle">
          Set your monthly income target and see how far your portfolio has taken you toward
          financial independence — and exactly how long it will take to get there.
        </p>
      </div>

      {error && <div className="glass-card fire-error">{error}</div>}

      {!latest && !error && !loading && (
        <div className="glass-card fire-empty">
          <Camera size={22} />
          <div>
            <h3>No snapshot data</h3>
            <p>
              Save a portfolio snapshot on{" "}
              <Link href="/portfolio">My Portfolio</Link> first.
            </p>
          </div>
        </div>
      )}

      {latest && (
        <>
          {/* ══════════════════════════════════════════════════════
              SECTION 1 — Inputs
          ══════════════════════════════════════════════════════ */}
          <div className="glass-card fire-inputs-card">
            <div className="fire-inputs-hdr">
              <Flame size={18} style={{ color: "#f97316" }} />
              <h3>Your FIRE parameters</h3>
            </div>
            <div className="fire-inputs-grid">
              {/* Monthly income target */}
              <div className="fire-input-group">
                <label htmlFor="fire-monthly-target">
                  Monthly income target <span>(LKR, today&apos;s money)</span>
                </label>
                <input
                  id="fire-monthly-target"
                  type="number"
                  min={0}
                  step={1000}
                  className="glass-input fire-number-input"
                  value={monthlyTarget}
                  onChange={(e) => setMonthlyTarget(e.target.value)}
                  placeholder="e.g. 150000"
                />
                <span className="fire-input-hint">
                  Annual: {formatLKR(targetNum * 12)}
                </span>
              </div>

              {/* Years until FIRE */}
              <div className="fire-input-group">
                <label htmlFor="fire-years">
                  Years until FIRE <span>(for inflation adj.)</span>
                </label>
                <input
                  id="fire-years"
                  type="number"
                  min={0}
                  max={50}
                  step={1}
                  className="glass-input fire-number-input"
                  value={yearsToFire}
                  onChange={(e) => setYearsToFire(e.target.value)}
                  placeholder="e.g. 10"
                />
                <span className="fire-input-hint fire-hint-inflated">
                  {yearsNum > 0 && targetNum > 0
                    ? <>Inflated target: <strong>{formatLKR(inflatedTarget)}/mo</strong> at {yearsNum}Y</>
                    : "Set to 0 to use today\'s target"}
                </span>
              </div>

              {/* Monthly savings / reinvestment */}
              <div className="fire-input-group">
                <label htmlFor="fire-monthly-savings">
                  Monthly reinvestment <span>(LKR)</span>
                </label>
                <input
                  id="fire-monthly-savings"
                  type="number"
                  min={0}
                  step={1000}
                  className="glass-input fire-number-input"
                  value={monthlySavings}
                  onChange={(e) => setMonthlySavings(e.target.value)}
                  placeholder="e.g. 50000"
                />
                <span className="fire-input-hint">Added to portfolio each month</span>
              </div>

              {/* Safe Withdrawal Rate */}
              <div className="fire-input-group">
                <label>Safe withdrawal rate</label>
                <div className="fire-toggle">
                  {SWR_OPTIONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={swr === r ? "active" : ""}
                      onClick={() => setSwr(r)}
                    >
                      {r}%
                    </button>
                  ))}
                </div>
                <span className="fire-input-hint">FI Number = inflated target × 12 / SWR</span>
              </div>

              {/* Expected portfolio return */}
              <div className="fire-input-group">
                <label htmlFor="fire-return">
                  Expected portfolio return <span>(%/yr)</span>
                </label>
                <input
                  id="fire-return"
                  type="number"
                  min={0}
                  max={50}
                  step={0.5}
                  className="glass-input fire-number-input"
                  value={expectedReturn}
                  onChange={(e) => setExpectedReturn(parseFloat(e.target.value) || 0)}
                />
                <span className="fire-input-hint">
                  Used for the projection chart
                </span>
              </div>
            </div>

            {/* Snapshot context */}
            <div className="fire-snapshot-context">
              <span>Latest snapshot</span>
              <strong>
                {latestTs?.toLocaleDateString("en-LK", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
                {latest.label ? ` — ${latest.label}` : ""}
              </strong>
              <span className="fire-snap-pill">Physical Cash /mo: {formatLKR(latestPhysical)}</span>
              <span className="fire-snap-pill">Net IIT /mo: {formatLKR(latestNetIit)}</span>
              <span className="fire-snap-pill">Capital: {formatLKR(currentCapital)}</span>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════
              SECTION 2 — FIRE Progress
          ══════════════════════════════════════════════════════ */}
          <div className={`glass-card fire-progress-card ${fire.alreadyFI ? "fi-achieved" : ""}`}>
            <div className="fire-section-hdr">
              <Target size={18} className="fire-section-icon" />
              <div>
                <h3>FIRE progress — latest snapshot</h3>
                <p>
                  Based on {formatLKR(currentCapital)} invested capital at a{" "}
                  {swr}% safe withdrawal rate.
                </p>
              </div>
            </div>

            {fire.alreadyFI && (
              <div className="fire-fi-banner">
                <CheckCircle2 size={20} />
                <strong>You&apos;ve reached Financial Independence!</strong> Your portfolio
                already generates {formatLKR(fire.monthlyIncomeFromCapital)}/mo at {swr}% SWR —
                above your target of {formatLKR(targetNum)}/mo.
              </div>
            )}

            <div className="fire-progress-layout">
              {/* Arc */}
              <div className="fire-arc-wrap">
                <ProgressArc pct={fire.progressPct} color={fireColor} />
              </div>

              {/* KPI grid */}
              <div className="fire-kpi-grid">
                <div className="fire-kpi fire-kpi-highlight">
                  <span>Inflation-adj. FI Number</span>
                  <strong style={{ color: fireColor }}>{formatLKR(fire.fiNumber)}</strong>
                  <em>
                    {yearsNum > 0
                      ? `At ${yearsNum}Y, ${inflationRate.toFixed(0)}% inflation — this is your real target`
                      : "Capital needed for FIRE (today's money)"}
                  </em>
                </div>
                {yearsNum > 0 && (
                  <div className="fire-kpi">
                    <span>FI Number (today)</span>
                    <strong style={{ color: "#9ca3af" }}>{formatLKR(fire.fiNumberToday)}</strong>
                    <em>Without inflation adjustment</em>
                  </div>
                )}
                <div className="fire-kpi">
                  <span>Current capital</span>
                  <strong style={{ color: "#00f2fe" }}>{formatLKR(currentCapital)}</strong>
                  <em>Latest snapshot invested</em>
                </div>
                <div className="fire-kpi">
                  <span>Gap to FIRE</span>
                  <strong className={fire.alreadyFI ? "fire-green" : "fire-coral"}>
                    {fire.alreadyFI ? "🔥 FI!" : formatLKR(fire.gap)}
                  </strong>
                  <em>Capital still needed</em>
                </div>
                <div className="fire-kpi">
                  <span>Portfolio income /mo</span>
                  <strong style={{ color: "#10b981" }}>
                    {formatLKR(fire.monthlyIncomeFromCapital)}
                  </strong>
                  <em>At {swr}% SWR from current capital</em>
                </div>
                <div className="fire-kpi">
                  <span>Income coverage</span>
                  <strong
                    style={{
                      color:
                        fire.coveragePct >= 100
                          ? "#10b981"
                          : fire.coveragePct >= 66
                          ? "#fbbf24"
                          : "#f87171",
                    }}
                  >
                    {fire.coveragePct.toFixed(1)}%
                  </strong>
                  <em>
                    {yearsNum > 0
                      ? `of inflation-adj. target (${formatLKR(fire.inflatedTarget)}/mo)`
                      : "of your target covered"}
                  </em>
                </div>
                <div className="fire-kpi">
                  <span>Actual cash /mo</span>
                  <strong style={{ color: "#fbbf24" }}>
                    {formatLKR(latestPhysical)}
                  </strong>
                  <em>Physical cash from snapshot</em>
                </div>
                <div className="fire-kpi">
                  <span>Net IIT /mo</span>
                  <strong style={{ color: "#d8b4fe" }}>
                    {formatLKR(latestNetIit)}
                  </strong>
                  <em>After progressive IIT</em>
                </div>
                <div className="fire-kpi">
                  <span>Progress</span>
                  <strong style={{ color: fireColor }}>
                    {Math.min(fire.progressPct, 100).toFixed(1)}%
                  </strong>
                  <em>Toward inflation-adj. FI Number</em>
                </div>
              </div>
            </div>

            {/* Category breakdown */}
            <div className="fire-cat-section">
              <h4>Capital contribution by category</h4>
              <p>How each investment category contributes toward your FI Number.</p>
              <div className="fire-cat-list">
                {fire.categories.map((c) => {
                  const Icon = c.icon;
                  const barW = clamp(c.contribution, 0, 100);
                  return (
                    <div key={c.key} className="fire-cat-item">
                      <div className="fire-cat-meta">
                        <Icon size={13} style={{ color: c.color, flexShrink: 0 }} />
                        <span className="fire-cat-name">{c.label}</span>
                        <span className="fire-cat-held">{formatLKR(c.held)}</span>
                        <span className="fire-cat-share">{formatLKR(c.fiShare)}/mo</span>
                        <span className="fire-cat-pct" style={{ color: c.color }}>
                          {c.contribution.toFixed(1)}%
                        </span>
                      </div>
                      <div className="fire-cat-bar-track">
                        <div
                          className="fire-cat-bar-fill"
                          style={{ width: `${barW}%`, background: c.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Progress bar against snapshot income metrics */}
            <div className="fire-snap-compare">
              <h4>Snapshot income vs target</h4>
              <p>How your latest snapshot&apos;s income metrics compare to your FIRE target.</p>
              {[
                { label: "Gross /mo", value: latestGross, color: "#00f2fe" },
                { label: "Net WHT /mo", value: latestNetWht, color: "#10b981" },
                { label: "Net IIT /mo", value: latestNetIit, color: "#d8b4fe" },
                { label: "Physical Cash /mo", value: latestPhysical, color: "#fbbf24" },
              ].map((m) => {
                const pctVal = targetNum > 0 ? clamp((m.value / targetNum) * 100, 0, 110) : 0;
                return (
                  <div key={m.label} className="fire-snap-row">
                    <span className="fire-snap-label">{m.label}</span>
                    <div className="fire-snap-bar-track">
                      <div
                        className="fire-snap-bar-fill"
                        style={{ width: `${pctVal}%`, background: m.color }}
                      />
                    </div>
                    <span className="fire-snap-val" style={{ color: m.color }}>
                      {formatLKR(m.value)}
                    </span>
                    <span className="fire-snap-pct">{pctVal.toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════
              SECTION 3 — Projection Chart
          ══════════════════════════════════════════════════════ */}
          <div className="glass-card fire-chart-card">
            <div className="fire-section-hdr">
              <TrendingUp size={18} className="fire-section-icon" />
              <div>
                <h3>
                  {projection.fireYear !== null
                    ? `FIRE in ${projection.fireYear} year${projection.fireYear !== 1 ? "s" : ""}`
                    : "FIRE projection — 30 years"}
                </h3>
                <p>
                  Portfolio growth at {expectedReturn}% p.a. with{" "}
                  {formatLKR(savingsNum)}/mo reinvestment vs your FI Number of{" "}
                  {formatLKR(fire.fiNumber)}.
                  {projection.fireYear !== null
                    ? ` Capital crosses the FI Number at Year ${projection.fireYear}.`
                    : " Increase your monthly reinvestment or return to reach FIRE within 30 years."}
                </p>
              </div>
            </div>

            {fire.fiNumber > 0 ? (
              <div className="fire-chart-wrap">
                <ResponsiveContainer width="100%" height={380}>
                  <ComposedChart
                    data={projection.points}
                    margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#9ca3af", fontSize: 11 }}
                      interval={4}
                    />
                    <YAxis
                      tick={{ fill: "#9ca3af", fontSize: 11 }}
                      tickFormatter={formatCompact}
                    />
                    <Tooltip content={<LkrTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />

                    {/* FI Number reference line */}
                    <ReferenceLine
                      y={fire.fiNumber}
                      stroke="#f97316"
                      strokeDasharray="8 4"
                      strokeWidth={2}
                      label={{
                        value: `FI: ${formatCompact(fire.fiNumber)}`,
                        position: "insideTopRight",
                        fill: "#f97316",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    />

                    {/* FIRE year reference */}
                    {projection.fireYear !== null && projection.fireYear > 0 && (
                      <ReferenceLine
                        x={`Y${projection.fireYear}`}
                        stroke="#10b981"
                        strokeDasharray="6 3"
                        label={{
                          value: `🔥 Y${projection.fireYear}`,
                          position: "top",
                          fill: "#10b981",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      />
                    )}

                    <Area
                      type="monotone"
                      dataKey="capital"
                      name="Projected capital"
                      stroke="#00f2fe"
                      fill="rgba(0,242,254,0.1)"
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="monthlyIncome"
                      name="Monthly income at SWR"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      strokeDasharray="6 3"
                      yAxisId={0}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="fire-no-target">
                Enter a monthly income target above to see your FIRE projection.
              </div>
            )}

            {/* Milestones table */}
            {fire.fiNumber > 0 && (
              <div className="fire-milestones">
                <h4>Milestone projections</h4>
                <div className="fire-milestone-table">
                  <div className="fire-milestone-row fire-milestone-header">
                    <div>Year</div>
                    <div>Projected Capital</div>
                    <div>Monthly Income ({swr}% SWR)</div>
                    <div>Coverage</div>
                    <div>Real Income (after inflation)</div>
                  </div>
                  {projection.milestones.map((m) => (
                    <div
                      key={m.year}
                      className={`fire-milestone-row ${m.coveragePct >= 100 ? "fire-milestone-achieved" : ""}`}
                    >
                      <div className="fire-milestone-year">
                        Year {m.year}
                        {m.coveragePct >= 100 && (
                          <span className="fire-achieved-badge">🔥 FIRE</span>
                        )}
                      </div>
                      <div style={{ color: "#00f2fe" }}>{formatLKR(m.capital)}</div>
                      <div style={{ color: "#10b981" }}>{formatLKR(m.monthlyIncome)}/mo</div>
                      <div
                        style={{
                          color:
                            m.coveragePct >= 100
                              ? "#10b981"
                              : m.coveragePct >= 66
                              ? "#fbbf24"
                              : "#f87171",
                          fontWeight: 700,
                        }}
                      >
                        {m.coveragePct.toFixed(0)}%
                      </div>
                      <div style={{ color: "#9ca3af" }}>
                        {formatLKR(m.realMonthly)}/mo
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════
              SECTION 4 — Withdrawal Sustainability
          ══════════════════════════════════════════════════════ */}
          <div className="glass-card fire-chart-card">
            <div className="fire-section-hdr">
              <ShieldCheck size={18} className="fire-section-icon" />
              <div>
                <h3>Withdrawal sustainability at FIRE</h3>
                <p>
                  At your{" "}
                  {projection.fireYear !== null ? `Year ${projection.fireYear}` : "30-year"} FIRE
                  capital, how does each safe withdrawal rate hold up against inflation over time?
                </p>
              </div>
            </div>

            <div className="fire-sustain-table">
              <div className="fire-sustain-row fire-sustain-header">
                <div>SWR</div>
                <div>Nominal /mo</div>
                <div>Covers target?</div>
                <div>Real income — 10Y</div>
                <div>Real income — 20Y</div>
                <div>Real income — 30Y</div>
              </div>
              {sustainability.map((s) => (
                <div
                  key={s.rate}
                  className={`fire-sustain-row ${s.rate === swr ? "fire-sustain-active" : ""}`}
                >
                  <div className="fire-sustain-rate">
                    {s.rate}%
                    {s.rate === swr && <span className="fire-sustain-badge">selected</span>}
                  </div>
                  <div style={{ color: "#00f2fe", fontWeight: 700 }}>
                    {formatLKR(s.monthlyNominal)}/mo
                  </div>
                  <div>
                    {s.coversTarget ? (
                      <span style={{ color: "#10b981", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                        <CheckCircle2 size={13} /> Yes
                      </span>
                    ) : (
                      <span style={{ color: "#f87171", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                        <AlertTriangle size={13} /> No
                      </span>
                    )}
                  </div>
                  <div style={{ color: "#9ca3af" }}>{formatLKR(s.real10)}/mo</div>
                  <div style={{ color: "#9ca3af" }}>{formatLKR(s.real20)}/mo</div>
                  <div style={{ color: "#9ca3af" }}>{formatLKR(s.real30)}/mo</div>
                </div>
              ))}
            </div>

            {/* Sustainability chart — real income decay at selected SWR */}
            <div className="fire-sustain-sub">
              <h4>Purchasing power decay at {swr}% SWR</h4>
              <p>
                Nominal income stays flat but real purchasing power erodes at{" "}
                {inflationRate.toFixed(0)}% p.a.
              </p>
            </div>
            {fire.fiNumber > 0 && (
              <div className="fire-chart-wrap" style={{ minHeight: 260 }}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={[
                      { label: "Now", nominal: fire.monthlyIncomeFromCapital, real: fire.monthlyIncomeFromCapital },
                      ...sustainability.map((_, idx) => {
                        // pick the FIRE capital point for the selected SWR
                        const fireCapital =
                          projection.fireYear !== null
                            ? futureValue(currentCapital, returnRate, savingsNum, projection.fireYear)
                            : fire.fiNumber;
                        const nominal = (fireCapital * swrRate) / 12;
                        const years = [0, 10, 20, 30][idx + 1] ?? 30;
                        const real = nominal / Math.pow(1 + inflRate, years);
                        return { label: `${years}Y`, nominal, real };
                      }).filter((_, i) => i < 3),
                    ]}
                    margin={{ top: 8, right: 12, left: 4, bottom: 0 }}
                    barGap={4}
                  >
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={formatCompact} />
                    <Tooltip content={<LkrTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
                    <Bar dataKey="nominal" name="Nominal income /mo" fill="rgba(0,242,254,0.55)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="real" name="Real income /mo (inflation-adj.)" fill="rgba(248,113,113,0.55)" radius={[4, 4, 0, 0]} />
                    {targetNum > 0 && (
                      <ReferenceLine
                        y={targetNum}
                        stroke="#fbbf24"
                        strokeDasharray="6 3"
                        label={{ value: "Target", position: "insideTopRight", fill: "#fbbf24", fontSize: 10 }}
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════
              Quick-fire tips
          ══════════════════════════════════════════════════════ */}
          <div className="glass-card fire-tips-card">
            <div className="fire-section-hdr">
              <Zap size={16} style={{ color: "#fbbf24" }} />
              <h3>FIRE rules of thumb</h3>
            </div>
            <div className="fire-tips-grid">
              <div className="fire-tip">
                <strong>25× Rule</strong>
                <p>At 4% SWR you need 25× your annual expenses in invested capital. Current: {(currentCapital / (targetNum * 12)).toFixed(1)}× of {(25).toFixed(0)}×.</p>
              </div>
              <div className="fire-tip">
                <strong>4% Rule</strong>
                <p>Withdraw 4% of your portfolio per year — historically sustainable for 30+ years (Trinity Study, 1998).</p>
              </div>
              <div className="fire-tip">
                <strong>Inflation hedge</strong>
                <p>At 6% annual inflation your {formatLKR(targetNum)}/mo target becomes {formatLKR(targetNum * Math.pow(1.06, 10))}/mo in 10 years. Plan accordingly.</p>
              </div>
              <div className="fire-tip">
                <strong>Lean vs Fat FIRE</strong>
                <p>Lean FIRE = bare minimum. Fat FIRE = 2–3× expenses for comfort. Your target of {formatLKR(targetNum)}/mo = {formatLKR(targetNum * 12)}/yr.</p>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .fire-loading {
          padding: 3rem 0;
          color: var(--text-muted);
        }

        .fire-error {
          padding: 1rem 1.25rem;
          margin-bottom: 1.25rem;
          color: #f87171;
          font-weight: 700;
          font-size: 0.85rem;
        }

        .fire-empty {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1.5rem;
          color: #f97316;
          margin-bottom: 1.25rem;
        }

        .fire-empty h3 {
          margin: 0 0 4px;
          color: var(--text-primary);
          font-size: 1rem;
        }

        .fire-empty p {
          margin: 0;
          color: var(--text-muted);
          font-size: 0.85rem;
          font-weight: 600;
        }

        .fire-empty :global(a) {
          color: #f97316;
          font-weight: 700;
        }

        /* Badge */
        :global(.badge-fire) {
          background: rgba(249, 115, 22, 0.12);
          color: #f97316;
          border: 1px solid rgba(249, 115, 22, 0.25);
        }

        .fire-title {
          background: linear-gradient(135deg, #ffffff 20%, #f97316 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* ── Inputs card ── */
        .fire-inputs-card {
          padding: 1.25rem 1.4rem;
          margin-bottom: 1.25rem;
          border-color: rgba(249, 115, 22, 0.2);
          background: linear-gradient(135deg, rgba(249, 115, 22, 0.04) 0%, rgba(9, 14, 26, 0.5) 100%);
        }

        .fire-inputs-hdr {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 1rem;
        }

        .fire-inputs-hdr h3 {
          margin: 0;
          font-size: 1rem;
          color: var(--text-primary);
        }

        .fire-inputs-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        @media (max-width: 1200px) {
          .fire-inputs-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 1100px) {
          .fire-inputs-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 620px) {
          .fire-inputs-grid {
            grid-template-columns: 1fr;
          }
        }

        .fire-input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .fire-input-group label {
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-muted);
        }

        .fire-input-group label span {
          text-transform: none;
          font-weight: 500;
          opacity: 0.7;
        }

        .fire-number-input {
          font-family: var(--font-display);
          font-size: 1rem;
          font-weight: 700;
          padding: 0.65rem 0.9rem;
        }

        .fire-input-hint {
          font-size: 0.68rem;
          color: var(--text-muted);
          font-weight: 600;
        }

        .fire-hint-inflated {
          color: #f97316 !important;
        }

        .fire-hint-inflated strong {
          color: #fb923c;
          font-weight: 800;
        }

        /* SWR toggle */
        .fire-toggle {
          display: inline-flex;
          gap: 2px;
          padding: 2px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: rgba(255, 255, 255, 0.02);
          align-self: flex-start;
        }

        .fire-toggle button {
          border: none;
          background: none;
          padding: 0.42rem 0.7rem;
          border-radius: 6px;
          color: var(--text-secondary);
          font-family: var(--font-body);
          font-size: 0.72rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .fire-toggle button:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.05);
        }

        .fire-toggle button.active {
          color: #04060c;
          background: linear-gradient(135deg, #f97316 0%, #dc2626 100%);
        }

        /* Snapshot context strip */
        .fire-snapshot-context {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.6rem;
          padding: 0.6rem 0.9rem;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          font-size: 0.72rem;
          color: var(--text-muted);
          font-weight: 600;
        }

        .fire-snapshot-context strong {
          color: var(--text-primary);
          font-size: 0.75rem;
        }

        .fire-snap-pill {
          padding: 2px 8px;
          border-radius: 6px;
          border: 1px solid var(--border-color);
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-secondary);
          white-space: nowrap;
        }

        /* ── Progress card ── */
        .fire-progress-card {
          padding: 1.25rem 1.4rem;
          margin-bottom: 1.25rem;
        }

        .fi-achieved {
          border-color: rgba(16, 185, 129, 0.3) !important;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(9, 14, 26, 0.5) 100%) !important;
        }

        .fire-section-hdr {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .fire-section-icon {
          color: #f97316;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .fire-section-hdr h3 {
          margin: 0;
          font-size: 1rem;
          color: var(--text-primary);
        }

        .fire-section-hdr p {
          margin: 4px 0 0;
          font-size: 0.78rem;
          color: var(--text-muted);
          font-weight: 600;
          line-height: 1.45;
        }

        /* FI achieved banner */
        .fire-fi-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.85rem 1rem;
          border-radius: 8px;
          background: rgba(16, 185, 129, 0.09);
          border: 1px solid rgba(16, 185, 129, 0.28);
          color: #d1fae5;
          font-size: 0.82rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .fire-fi-banner :global(svg) {
          color: #10b981;
          flex-shrink: 0;
        }

        /* Progress arc + KPI layout */
        .fire-progress-layout {
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: 1.5rem;
          align-items: start;
          margin-bottom: 1.25rem;
        }

        @media (max-width: 900px) {
          .fire-progress-layout {
            grid-template-columns: 1fr;
          }
        }

        :global(.fire-arc-svg) {
          width: 100%;
          max-width: 200px;
          margin: 0 auto;
          display: block;
        }

        .fire-arc-wrap {
          display: flex;
          justify-content: center;
        }

        /* KPI grid */
        .fire-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.75rem;
        }

        @media (max-width: 1100px) {
          .fire-kpi-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        .fire-kpi {
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding: 0.75rem 0.9rem;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          transition: border-color 0.2s;
        }

        .fire-kpi:hover {
          border-color: var(--border-color-hover);
        }

        .fire-kpi.fire-kpi-highlight {
          border-color: rgba(249, 115, 22, 0.4);
          background: linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(255,255,255,0.02) 100%);
        }

        .fire-kpi span {
          font-size: 0.63rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-muted);
        }

        .fire-kpi strong {
          font-size: 0.95rem;
          font-family: var(--font-display);
          font-weight: 800;
        }

        .fire-kpi em {
          font-style: normal;
          font-size: 0.63rem;
          color: var(--text-muted);
          line-height: 1.3;
        }

        .fire-green { color: #10b981; }
        .fire-coral { color: #f87171; }
        .fire-gold  { color: #fbbf24; }

        /* Category list */
        .fire-cat-section {
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
          margin-bottom: 1rem;
        }

        .fire-cat-section h4 {
          margin: 0 0 2px;
          font-size: 0.9rem;
          color: var(--text-primary);
        }

        .fire-cat-section p {
          margin: 0 0 0.75rem;
          font-size: 0.72rem;
          color: var(--text-muted);
          font-weight: 600;
        }

        .fire-cat-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .fire-cat-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .fire-cat-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .fire-cat-name {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-primary);
          min-width: 110px;
        }

        .fire-cat-held {
          font-size: 0.72rem;
          color: var(--text-secondary);
          min-width: 110px;
        }

        .fire-cat-share {
          font-size: 0.72rem;
          color: var(--text-muted);
          min-width: 90px;
        }

        .fire-cat-pct {
          font-size: 0.72rem;
          font-weight: 800;
          margin-left: auto;
        }

        .fire-cat-bar-track {
          height: 5px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.06);
          overflow: hidden;
        }

        .fire-cat-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Snapshot income comparison */
        .fire-snap-compare {
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
        }

        .fire-snap-compare h4 {
          margin: 0 0 2px;
          font-size: 0.9rem;
          color: var(--text-primary);
        }

        .fire-snap-compare p {
          margin: 0 0 0.75rem;
          font-size: 0.72rem;
          color: var(--text-muted);
          font-weight: 600;
        }

        .fire-snap-row {
          display: grid;
          grid-template-columns: 130px 1fr 110px 48px;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 6px;
        }

        .fire-snap-label {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--text-secondary);
          white-space: nowrap;
        }

        .fire-snap-bar-track {
          height: 7px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.06);
          overflow: hidden;
        }

        .fire-snap-bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          opacity: 0.8;
        }

        .fire-snap-val {
          font-size: 0.72rem;
          font-weight: 700;
          text-align: right;
          white-space: nowrap;
        }

        .fire-snap-pct {
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--text-muted);
          text-align: right;
        }

        /* ── Chart cards ── */
        .fire-chart-card {
          padding: 1.25rem 1.4rem 1rem;
          margin-bottom: 1.25rem;
        }

        .fire-chart-wrap {
          width: 100%;
          min-height: 280px;
          margin-top: 0.75rem;
        }

        .fire-no-target {
          padding: 2rem;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.85rem;
          font-weight: 600;
        }

        /* Milestones */
        .fire-milestones {
          margin-top: 1.25rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
        }

        .fire-milestones h4 {
          margin: 0 0 0.75rem;
          font-size: 0.9rem;
          color: var(--text-primary);
        }

        .fire-milestone-table {
          display: flex;
          flex-direction: column;
          border-radius: 10px;
          border: 1px solid var(--border-color);
          overflow: hidden;
        }

        .fire-milestone-row {
          display: grid;
          grid-template-columns: 160px 1fr 1fr 80px 1fr;
          gap: 0;
          padding: 0.55rem 0.9rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          transition: background 0.15s;
        }

        .fire-milestone-row:last-child {
          border-bottom: none;
        }

        .fire-milestone-row:hover:not(.fire-milestone-header) {
          background: rgba(255, 255, 255, 0.02);
        }

        .fire-milestone-header {
          font-size: 0.63rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.03);
          font-weight: 700;
        }

        .fire-milestone-achieved {
          background: rgba(16, 185, 129, 0.05);
        }

        .fire-milestone-year {
          color: var(--text-primary);
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .fire-achieved-badge {
          font-size: 0.62rem;
          padding: 1px 5px;
          border-radius: 4px;
          background: rgba(16, 185, 129, 0.18);
          color: #10b981;
          font-weight: 800;
        }

        /* ── Sustainability table ── */
        .fire-sustain-table {
          display: flex;
          flex-direction: column;
          border-radius: 10px;
          border: 1px solid var(--border-color);
          overflow: hidden;
          margin-top: 0.5rem;
        }

        .fire-sustain-row {
          display: grid;
          grid-template-columns: 100px 1fr 120px 1fr 1fr 1fr;
          gap: 0;
          padding: 0.6rem 1rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          transition: background 0.15s;
        }

        .fire-sustain-row:last-child {
          border-bottom: none;
        }

        .fire-sustain-header {
          font-size: 0.62rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.03);
          font-weight: 700;
        }

        .fire-sustain-active {
          background: rgba(249, 115, 22, 0.05);
          border-left: 2px solid #f97316;
        }

        .fire-sustain-rate {
          font-weight: 800;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .fire-sustain-badge {
          font-size: 0.58rem;
          padding: 1px 5px;
          border-radius: 4px;
          background: rgba(249, 115, 22, 0.18);
          color: #f97316;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .fire-sustain-sub {
          margin-top: 1.25rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
        }

        .fire-sustain-sub h4 {
          margin: 0 0 2px;
          font-size: 0.9rem;
          color: var(--text-primary);
        }

        .fire-sustain-sub p {
          margin: 0;
          font-size: 0.72rem;
          color: var(--text-muted);
          font-weight: 600;
        }

        /* ── Tips card ── */
        .fire-tips-card {
          padding: 1.25rem 1.4rem;
          margin-bottom: 1.25rem;
          border-color: rgba(251, 191, 36, 0.15);
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.03) 0%, rgba(9, 14, 26, 0.5) 100%);
        }

        .fire-tips-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.9rem;
          margin-top: 0.75rem;
        }

        @media (max-width: 1000px) {
          .fire-tips-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 600px) {
          .fire-tips-grid {
            grid-template-columns: 1fr;
          }
        }

        .fire-tip {
          padding: 0.85rem;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
        }

        .fire-tip strong {
          display: block;
          font-size: 0.8rem;
          font-weight: 800;
          color: #fbbf24;
          margin-bottom: 4px;
        }

        .fire-tip p {
          margin: 0;
          font-size: 0.72rem;
          color: var(--text-muted);
          font-weight: 600;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}
