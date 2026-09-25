"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  History as HistoryIcon,
  TrendingUp,
  Calendar,
  Pencil,
  Clock,
  Check,
  RotateCcw,
  Landmark,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Layers,
  ChevronRight,
} from "lucide-react";

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
  startDate?: string;
  endDate?: string;
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
  startDate?: string;
  endDate?: string;
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
};

type SnapshotDelta = {
  snapshotId: string;
  from: string;
  to: string;
  periodLabel: string;
  startDate?: string;
  endDate?: string;
  grossDelta: number;
  netIitDelta: number;
  physicalDelta: number;
  investedDelta: number;
  totalWealth: number;
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

export default function InvestmentCommitmentPage() {
  const [loading, setLoading] = useState(true);
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Edit modal state
  const [editingSnapshot, setEditingSnapshot] = useState<SnapshotRow | null>(null);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [savingDate, setSavingDate] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchSnapshots = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/snapshots");
      if (!res.ok) throw new Error("Failed to load snapshots");
      const data = await res.json();
      if (Array.isArray(data)) setSnapshots(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnapshots();
  }, []);

  const chronological = useMemo(() => {
    return [...snapshots].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [snapshots]);

  const chartData: ChartPoint[] = useMemo(() => {
    if (!chronological.length) return [];
    return chronological.map((snap) => {
      const t = snap.totals || {};
      const cat = t.investedByCategory || {};
      const ts = new Date(snap.timestamp).getTime();
      const d = new Date(snap.timestamp);

      // Default start date = 1st of month, end date = snapshot date or end of month
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const defaultStart = `${y}-${m}-01`;
      const defaultEnd = d.toISOString().slice(0, 10);

      return {
        id: snap.id,
        label: snap.label || d.toLocaleDateString("en-LK", { month: "short", day: "numeric", year: "2-digit" }),
        fullDate: d.toLocaleString("en-LK"),
        startDate: (t as any).startDate || defaultStart,
        endDate: (t as any).endDate || defaultEnd,
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
      };
    });
  }, [chronological]);

  /** Delta between consecutive snapshots */
  const snapshotDeltas: SnapshotDelta[] = useMemo(() => {
    if (chartData.length < 2) return [];
    return chartData.slice(1).map((cur, i) => {
      const prev = chartData[i];
      return {
        snapshotId: cur.id,
        from: prev.label,
        to: cur.label,
        periodLabel: `${prev.label} → ${cur.label}`,
        startDate: cur.startDate || prev.endDate,
        endDate: cur.endDate,
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

  /** Monthly Net New Capital Investments */
  const monthlyInvestments = useMemo(() => {
    if (chartData.length < 2) return [];

    const grouped = new Map<string, {
      monthLabel: string;
      ts: number;
      totalDelta: number;
      fdsDelta: number;
      utsDelta: number;
      treasuryDelta: number;
      dividendsDelta: number;
      pfcaFdsDelta: number;
    }>();

    chartData.slice(1).forEach((cur, i) => {
      const prev = chartData[i];
      const d = new Date(cur.ts);
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const monthLabel = d.toLocaleDateString("en-LK", { month: "short", year: "numeric" });

      if (!grouped.has(yearMonth)) {
        grouped.set(yearMonth, {
          monthLabel,
          ts: d.getTime(),
          totalDelta: 0,
          fdsDelta: 0,
          utsDelta: 0,
          treasuryDelta: 0,
          dividendsDelta: 0,
          pfcaFdsDelta: 0,
        });
      }

      const g = grouped.get(yearMonth)!;
      g.totalDelta += (cur.invested - prev.invested);
      g.fdsDelta += (cur.fds - prev.fds);
      g.utsDelta += (cur.uts - prev.uts);
      g.treasuryDelta += (cur.treasury - prev.treasury);
      g.dividendsDelta += (cur.dividends - prev.dividends);
      g.pfcaFdsDelta += (cur.pfcaFds - prev.pfcaFds);
    });

    return Array.from(grouped.values()).sort((a, b) => a.ts - b.ts);
  }, [chartData]);

  // Open edit modal for a snapshot
  const handleOpenEdit = (snapId: string) => {
    const snap = snapshots.find((s) => s.id === snapId);
    if (!snap) return;
    const d = new Date(snap.timestamp);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const defaultStart = `${y}-${m}-01`;
    const defaultEnd = d.toISOString().slice(0, 10);

    setEditingSnapshot(snap);
    setEditLabel(snap.label || "");
    setEditStartDate((snap.totals as any)?.startDate || defaultStart);
    setEditEndDate((snap.totals as any)?.endDate || defaultEnd);
    setSaveSuccess(false);
  };

  const handleSaveDates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSnapshot) return;
    setSavingDate(true);
    try {
      const res = await fetch(`/api/snapshots/${editingSnapshot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: editLabel || null,
          totals: {
            ...editingSnapshot.totals,
            startDate: editStartDate,
            endDate: editEndDate,
          },
        }),
      });

      if (!res.ok) throw new Error("Failed to update snapshot dates");
      setSaveSuccess(true);
      await fetchSnapshots();
      setTimeout(() => {
        setEditingSnapshot(null);
        setSaveSuccess(false);
      }, 500);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingDate(false);
    }
  };

  const latestWealth = chartData.length > 0 ? chartData[chartData.length - 1].invested : 0;
  const latestDelta = snapshotDeltas.length > 0 ? snapshotDeltas[snapshotDeltas.length - 1].investedDelta : 0;
  const totalMonths = monthlyInvestments.length;
  const avgMonthlyAddition = totalMonths > 0
    ? monthlyInvestments.reduce((sum, m) => sum + m.totalDelta, 0) / totalMonths
    : 0;

  return (
    <div className="history-page">
      {/* ── Page Header ── */}
      <div className="hist-header">
        <div>
          <div className="hist-badge">
            <Landmark size={13} />
            <span>Capital Commitment & Allocation</span>
          </div>
          <h1>Investment Commitment</h1>
          <p className="hist-sub">
            Track consecutive snapshot deltas, monthly net new capital deployment across categories, and customize snapshot period dates.
          </p>
        </div>

        <div className="hist-header-actions">
          <Link href="/history" className="hist-btn-secondary">
            <HistoryIcon size={15} />
            <span>Full History</span>
          </Link>
          <Link href="/portfolio" className="hist-btn-secondary">
            <Layers size={15} />
            <span>My Portfolio</span>
          </Link>
        </div>
      </div>

      {error && <div className="glass-card hist-error">{error}</div>}

      {loading ? (
        <div className="glass-card hist-loading">
          <div className="hist-spinner" />
          <p>Loading investment commitment data...</p>
        </div>
      ) : snapshots.length < 2 ? (
        <div className="glass-card hist-empty">
          <Landmark size={48} className="hist-empty-icon" />
          <h3>Need At Least 2 Snapshots</h3>
          <p>
            You have {snapshots.length} snapshot saved. Take another snapshot from the My Portfolio page to begin tracking capital commitments and monthly additions.
          </p>
          <Link href="/portfolio" className="btn-primary">
            Go to Portfolio &amp; Take Snapshot
          </Link>
        </div>
      ) : (
        <div className="hist-body">
          {/* ── Top Summary KPI Cards ── */}
          <div className="grid-summary">
            <div className="glass-card kpi-card">
              <span className="kpi-label">Current Total Capital</span>
              <div className="kpi-value text-glow">{formatLKR(latestWealth)}</div>
              <span className="kpi-sub">Across all asset classes</span>
            </div>

            <div className="glass-card kpi-card">
              <span className="kpi-label">Latest Period Addition</span>
              <div className={`kpi-value ${latestDelta >= 0 ? "text-emerald" : "text-coral"}`}>
                {latestDelta >= 0 ? "+" : ""}{formatLKR(latestDelta)}
              </div>
              <span className="kpi-sub">
                {snapshotDeltas[snapshotDeltas.length - 1]?.periodLabel || "Last snapshot"}
              </span>
            </div>

            <div className="glass-card kpi-card">
              <span className="kpi-label">Avg. Monthly Inflow</span>
              <div className={`kpi-value ${avgMonthlyAddition >= 0 ? "text-cyan" : "text-coral"}`}>
                {avgMonthlyAddition >= 0 ? "+" : ""}{formatLKR(avgMonthlyAddition)}/mo
              </div>
              <span className="kpi-sub">Over {totalMonths} recorded months</span>
            </div>

            <div className="glass-card kpi-card">
              <span className="kpi-label">Snapshots Tracked</span>
              <div className="kpi-value text-indigo">{snapshots.length}</div>
              <span className="kpi-sub">With configurable period dates</span>
            </div>
          </div>

          {/* ── Section 1: Snapshot-to-snapshot progress table ── */}
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
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="hist-badge-pill">
                  <Calendar size={13} style={{ marginRight: 4 }} />
                  Editable Dates
                </span>
              </div>
            </div>

            <div className="hist-delta-scroll">
              <table className="hist-delta-tbl">
                <colgroup>
                  <col className="hdt-col-period" />
                  <col style={{ width: "130px" }} />
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
                  <col style={{ width: "80px" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className="hdt-left">Snapshot</th>
                    <th className="hdt-left" style={{ color: "#9ca3af" }}>Period Dates</th>
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
                    <th style={{ textAlign: "center" }}>Edit Dates</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshotDeltas.map((d, i) => (
                    <tr key={i}>
                      <td className="hdt-left hdt-period">
                        <strong>{d.to}</strong>
                      </td>
                      <td className="hdt-left" style={{ fontSize: "0.74rem", color: "#94a3b8" }}>
                        <span style={{ fontFamily: "monospace" }}>
                          {d.startDate || "—"} → {d.endDate || "—"}
                        </span>
                      </td>
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
                      <td style={{ textAlign: "center" }}>
                        <button
                          className="hist-edit-btn"
                          onClick={() => handleOpenEdit(d.snapshotId)}
                          title="Edit snapshot start & end dates"
                        >
                          <Pencil size={13} />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Section 2: Monthly Investment Additions Chart ── */}
          {monthlyInvestments.length > 0 && (
            <div className="glass-card hist-chart-card">
              <div className="hist-chart-hdr">
                <div>
                  <h3>Monthly Investment Additions</h3>
                  <p>
                    Net new capital added (or withdrawn) per month, broken down by asset category.
                  </p>
                </div>
                <TrendingUp size={18} className="hist-chart-icon" />
              </div>
              <div className="hist-chart-wrap">
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={monthlyInvestments} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                    <XAxis dataKey="monthLabel" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={formatCompact} />
                    <Tooltip content={<LkrTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
                    <ReferenceLine y={1000000} stroke="#f87171" strokeDasharray="3 3" label={{ value: "1M Target", fill: "#f87171", fontSize: 10, position: "insideTopRight" }} />
                    <Bar dataKey="fdsDelta" name="Fixed Deposits" stackId="a" fill="#00f2fe" />
                    <Bar dataKey="utsDelta" name="Unit Trusts" stackId="a" fill="#10b981" />
                    <Bar dataKey="treasuryDelta" name="Treasury" stackId="a" fill="#818cf8" />
                    <Bar dataKey="dividendsDelta" name="Dividends" stackId="a" fill="#6366f1" />
                    <Bar dataKey="pfcaFdsDelta" name="PFCA FDs" stackId="a" fill="#f43f5e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Section 3: All Snapshots Date Management ── */}
          <div className="glass-card hist-chart-card">
            <div className="hist-chart-hdr">
              <div>
                <h3>Manage All Snapshot Statement Periods</h3>
                <p>
                  View and update exact start and end dates for every recorded portfolio snapshot.
                </p>
              </div>
              <Calendar size={18} className="hist-chart-icon" />
            </div>

            <div className="hist-delta-scroll">
              <table className="hist-delta-tbl">
                <thead>
                  <tr>
                    <th className="hdt-left">Snapshot Label</th>
                    <th className="hdt-left">Timestamp</th>
                    <th className="hdt-left" style={{ color: "#38bdf8" }}>Start Date</th>
                    <th className="hdt-left" style={{ color: "#10b981" }}>End Date (As Of)</th>
                    <th style={{ textAlign: "right" }}>Total Capital</th>
                    <th style={{ textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {chronological.map((s) => {
                    const t = s.totals || {};
                    const d = new Date(s.timestamp);
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, "0");
                    const defaultStart = `${y}-${m}-01`;
                    const defaultEnd = d.toISOString().slice(0, 10);
                    const startDate = (t as any).startDate || defaultStart;
                    const endDate = (t as any).endDate || defaultEnd;

                    return (
                      <tr key={s.id}>
                        <td className="hdt-left">
                          <strong>{s.label || d.toLocaleDateString("en-LK", { month: "short", day: "numeric", year: "numeric" })}</strong>
                        </td>
                        <td className="hdt-left" style={{ color: "#9ca3af", fontSize: "0.75rem" }}>
                          {d.toLocaleDateString("en-LK", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="hdt-left font-mono" style={{ color: "#38bdf8", fontSize: "0.78rem" }}>
                          {startDate}
                        </td>
                        <td className="hdt-left font-mono" style={{ color: "#10b981", fontSize: "0.78rem" }}>
                          {endDate}
                        </td>
                        <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                          {formatLKR(t.invested || 0)}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            className="hist-edit-btn"
                            onClick={() => handleOpenEdit(s.id)}
                          >
                            <Pencil size={13} />
                            <span>Edit Dates</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Snapshot Dates Modal Dialog ── */}
      {editingSnapshot && (
        <div className="modal-overlay" onClick={() => !savingDate && setEditingSnapshot(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="modal-icon-wrap">
                  <Calendar size={18} color="#00f2fe" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#fff" }}>Edit Snapshot Period</h3>
                  <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#9ca3af" }}>
                    Configure start date, end date, and display label
                  </p>
                </div>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setEditingSnapshot(null)}
                disabled={savingDate}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDates} className="modal-form">
              <div className="form-group">
                <label>Snapshot Display Label</label>
                <input
                  type="text"
                  placeholder="e.g. End July 2026 or Snapshot #4"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="modal-input"
                />
              </div>

              <div className="form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group">
                  <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock size={12} color="#00f2fe" />
                    <span>Start Date</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="modal-input"
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock size={12} color="#10b981" />
                    <span>End Date (As Of)</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="modal-input"
                  />
                </div>
              </div>

              <div className="modal-hint">
                <span>The date range will be used to compute period intervals and monthly additions.</span>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setEditingSnapshot(null)}
                  disabled={savingDate}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDate}
                  className="btn-primary"
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  {saveSuccess ? (
                    <>
                      <Check size={16} color="#10b981" />
                      <span>Saved!</span>
                    </>
                  ) : savingDate ? (
                    <span>Saving...</span>
                  ) : (
                    <span>Save Period Dates</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Page Styles ── */}
      <style jsx>{`
        .history-page {
          max-width: 1280px;
          margin: 0 auto;
          padding: 1.5rem;
          color: var(--text-primary);
        }

        .hist-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }

        .hist-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(0, 242, 254, 0.1);
          border: 1px solid rgba(0, 242, 254, 0.25);
          color: #00f2fe;
          font-size: 0.75rem;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .hist-badge-pill {
          display: inline-flex;
          align-items: center;
          padding: 3px 8px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #9ca3af;
          font-size: 0.72rem;
          font-weight: 600;
        }

        .hist-sub {
          color: var(--text-muted);
          font-size: 0.88rem;
          margin-top: 4px;
          max-width: 700px;
        }

        .hist-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .hist-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: var(--text-primary);
          font-size: 0.82rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
        }

        .hist-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.25);
        }

        .grid-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1rem;
          margin-bottom: 1.75rem;
        }

        .kpi-card {
          padding: 1.2rem;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .kpi-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-muted);
          font-weight: 700;
        }

        .kpi-value {
          font-size: 1.45rem;
          font-weight: 800;
          font-family: var(--font-display);
        }

        .kpi-sub {
          font-size: 0.72rem;
          color: var(--text-muted);
        }

        .text-glow {
          color: #fff;
          text-shadow: 0 0 16px rgba(0, 242, 254, 0.3);
        }

        .text-emerald {
          color: #10b981;
        }

        .text-cyan {
          color: #00f2fe;
        }

        .text-coral {
          color: #f87171;
        }

        .text-indigo {
          color: #818cf8;
        }

        .hist-chart-card {
          padding: 1.4rem;
          margin-bottom: 1.75rem;
        }

        .hist-chart-hdr {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.25rem;
        }

        .hist-chart-hdr h3 {
          margin: 0;
          font-size: 1.05rem;
          color: #fff;
        }

        .hist-chart-hdr p {
          margin: 4px 0 0;
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        .hist-chart-icon {
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .hist-chart-wrap {
          width: 100%;
          padding-top: 8px;
        }

        .hist-delta-scroll {
          overflow-x: auto;
        }

        .hist-delta-tbl {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.78rem;
        }

        .hist-delta-tbl th {
          padding: 8px 10px;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-muted);
          border-bottom: 1px solid var(--border-color);
          text-align: right;
          white-space: nowrap;
        }

        .hist-delta-tbl th.hdt-left,
        .hist-delta-tbl td.hdt-left {
          text-align: left;
        }

        .hist-delta-tbl td {
          padding: 9px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          text-align: right;
          white-space: nowrap;
          font-family: var(--font-mono);
        }

        .hist-delta-tbl tr:hover td {
          background: rgba(255, 255, 255, 0.02);
        }

        .hdt-divider {
          border-right: 1px solid rgba(255, 255, 255, 0.08);
        }

        .hdt-wealth-th {
          color: #fff !important;
        }

        .hdt-wealth-cell {
          font-weight: 800;
          color: #fff;
        }

        .hdt-pos {
          color: #10b981;
          font-weight: 600;
        }

        .hdt-neg {
          color: #f87171;
          font-weight: 600;
        }

        .hdt-zero {
          color: #4b5563;
        }

        .hist-edit-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 6px;
          background: rgba(0, 242, 254, 0.08);
          border: 1px solid rgba(0, 242, 254, 0.2);
          color: #00f2fe;
          font-size: 0.72rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }

        .hist-edit-btn:hover {
          background: rgba(0, 242, 254, 0.18);
          border-color: rgba(0, 242, 254, 0.4);
        }

        /* ── Modal Overlay ── */
        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 999;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .modal-card {
          width: 100%;
          max-width: 480px;
          background: #0d121f;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 14px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
          overflow: hidden;
          animation: modalPop 0.2s ease-out;
        }

        @keyframes modalPop {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.2rem 1.4rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .modal-icon-wrap {
          padding: 8px;
          border-radius: 8px;
          background: rgba(0, 242, 254, 0.1);
          border: 1px solid rgba(0, 242, 254, 0.2);
          display: flex;
        }

        .modal-close-btn {
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
        }

        .modal-close-btn:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.08);
        }

        .modal-form {
          padding: 1.4rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #9ca3af;
        }

        .modal-input {
          padding: 9px 12px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #fff;
          font-size: 0.85rem;
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s;
        }

        .modal-input:focus {
          border-color: #00f2fe;
          background: rgba(0, 242, 254, 0.03);
        }

        .modal-hint {
          font-size: 0.72rem;
          color: #6b7280;
          padding: 6px 10px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.02);
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 0.5rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .btn-secondary {
          padding: 8px 14px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #fff;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .btn-primary {
          padding: 8px 16px;
          border-radius: 8px;
          background: linear-gradient(135deg, #00f2fe, #4facfe);
          border: none;
          color: #000;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .btn-primary:hover {
          opacity: 0.9;
        }

        .hist-loading,
        .hist-empty,
        .hist-error {
          padding: 3rem 2rem;
          text-align: center;
          margin: 2rem 0;
        }

        .hist-empty-icon {
          color: #00f2fe;
          opacity: 0.4;
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  );
}
