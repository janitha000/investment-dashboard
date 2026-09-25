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
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  History as HistoryIcon,
  TrendingUp,
  TrendingDown,
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
  Target,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  PieChart as PieIcon,
  BarChart3,
  CheckCircle2,
  AlertCircle,
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
  isBaseline?: boolean;
};

type MonthlyAggregatedData = {
  monthKey: string;
  monthLabel: string;
  ts: number;
  startDate: string;
  endDate: string;
  startWealth: number;
  endWealth: number;
  totalDelta: number;
  fdsDelta: number;
  utsDelta: number;
  treasuryDelta: number;
  dividendsDelta: number;
  pfcaFdsDelta: number;
  grossDelta: number;
  netIitDelta: number;
  physicalCashDelta: number;
  snapshotsInMonth: number;
};

type MonthlyCommitment = {
  month: string; // "YYYY-MM"
  plannedAmount: number;
  notes?: string | null;
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

function getMonthInfoFromEndDate(endDate?: string, fallbackTs?: number) {
  if (endDate && /^\d{4}-\d{2}/.test(endDate)) {
    const parts = endDate.split("-");
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10); // 1-12
    const day = parts[2] ? parseInt(parts[2], 10) : 1;
    const yearMonth = `${year}-${String(month).padStart(2, "0")}`;
    const dateObj = new Date(year, month - 1, day || 1);
    const monthLabel = dateObj.toLocaleDateString("en-LK", { month: "short", year: "numeric" });
    const ts = new Date(year, month - 1, 1).getTime();
    return { yearMonth, monthLabel, ts };
  }
  const d = new Date(fallbackTs || Date.now());
  const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const monthLabel = d.toLocaleDateString("en-LK", { month: "short", year: "numeric" });
  return { yearMonth, monthLabel, ts: new Date(d.getFullYear(), d.getMonth(), 1).getTime() };
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

const CATEGORY_COLORS = {
  fds: "#00f2fe",
  uts: "#10b981",
  treasury: "#818cf8",
  dividends: "#6366f1",
  pfcaFds: "#f43f5e",
};

export default function InvestmentCommitmentPage() {
  const [loading, setLoading] = useState(true);
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [commitments, setCommitments] = useState<Record<string, MonthlyCommitment>>({});
  const [error, setError] = useState<string | null>(null);

  // Tab View
  const [activeTab, setActiveTab] = useState<"snapshots" | "monthly">("snapshots");

  // Monthly View State
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>("");
  const [plannedInput, setPlannedInput] = useState<string>("");
  const [savingCommitment, setSavingCommitment] = useState(false);
  const [commitmentSavedSuccess, setCommitmentSavedSuccess] = useState(false);

  // Edit Snapshot Dates Modal State
  const [editingSnapshot, setEditingSnapshot] = useState<SnapshotRow | null>(null);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [savingDate, setSavingDate] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchSnapshotsAndCommitments = async () => {
    try {
      setLoading(true);
      const [snapRes, commRes] = await Promise.all([
        fetch("/api/snapshots"),
        fetch("/api/commitments"),
      ]);

      if (!snapRes.ok) throw new Error("Failed to load snapshots");
      const snapData = await snapRes.json();
      if (Array.isArray(snapData)) setSnapshots(snapData);

      if (commRes.ok) {
        const commData = await commRes.json();
        if (commData && typeof commData === "object") {
          setCommitments(commData);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnapshotsAndCommitments();
  }, []);

  const chronological = useMemo(() => {
    return [...snapshots].sort((a, b) => {
      const aEnd = (a.totals as any)?.endDate || a.timestamp;
      const bEnd = (b.totals as any)?.endDate || b.timestamp;
      return new Date(aEnd).getTime() - new Date(bEnd).getTime();
    });
  }, [snapshots]);

  const chartData: ChartPoint[] = useMemo(() => {
    if (!chronological.length) return [];
    return chronological.map((snap) => {
      const t = snap.totals || {};
      const cat = t.investedByCategory || {};
      const d = new Date(snap.timestamp);

      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const defaultStart = `${y}-${m}-01`;
      const defaultEnd = d.toISOString().slice(0, 10);
      const endDate = (t as any).endDate || defaultEnd;
      const startDate = (t as any).startDate || defaultStart;
      const ts = new Date(endDate).getTime() || d.getTime();

      return {
        id: snap.id,
        label: snap.label || d.toLocaleDateString("en-LK", { month: "short", day: "numeric", year: "2-digit" }),
        fullDate: d.toLocaleString("en-LK"),
        startDate,
        endDate,
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

  /** All snapshots with progress deltas (including first snapshot as initial addition) */
  const allSnapshotRows: SnapshotDelta[] = useMemo(() => {
    if (!chartData.length) return [];
    return chartData.map((cur, i) => {
      if (i === 0) {
        return {
          snapshotId: cur.id,
          from: "Start",
          to: cur.label,
          periodLabel: cur.label,
          startDate: cur.startDate,
          endDate: cur.endDate,
          grossDelta: cur.grossMonthly,
          netIitDelta: cur.netIitMonthly,
          physicalDelta: cur.physicalCashMonthly,
          investedDelta: cur.invested,
          totalWealth: cur.invested,
          fdsDelta: cur.fds,
          utsDelta: cur.uts,
          treasuryDelta: cur.treasury,
          dividendsDelta: cur.dividends,
          pfcaFdsDelta: cur.pfcaFds,
          isBaseline: false,
        };
      }
      const prev = chartData[i - 1];
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
        isBaseline: false,
      };
    });
  }, [chartData]);

  /** All snapshot deltas */
  const snapshotDeltas: SnapshotDelta[] = useMemo(() => {
    return allSnapshotRows;
  }, [allSnapshotRows]);

  /** Monthly aggregated additions and progress across categories */
  const monthlyDataMap = useMemo(() => {
    if (chartData.length === 0) return new Map<string, MonthlyAggregatedData>();

    const grouped = new Map<string, MonthlyAggregatedData>();

    chartData.forEach((cur, i) => {
      const { yearMonth, monthLabel, ts } = getMonthInfoFromEndDate(cur.endDate, cur.ts);

      if (i === 0) {
        if (!grouped.has(yearMonth)) {
          grouped.set(yearMonth, {
            monthKey: yearMonth,
            monthLabel,
            ts,
            startDate: cur.startDate || cur.endDate || "",
            endDate: cur.endDate || "",
            startWealth: 0,
            endWealth: cur.invested,
            totalDelta: cur.invested,
            fdsDelta: cur.fds,
            utsDelta: cur.uts,
            treasuryDelta: cur.treasury,
            dividendsDelta: cur.dividends,
            pfcaFdsDelta: cur.pfcaFds,
            grossDelta: cur.grossMonthly,
            netIitDelta: cur.netIitMonthly,
            physicalCashDelta: cur.physicalCashMonthly,
            snapshotsInMonth: 1,
          });
        } else {
          const g = grouped.get(yearMonth)!;
          g.totalDelta += cur.invested;
          g.fdsDelta += cur.fds;
          g.utsDelta += cur.uts;
          g.treasuryDelta += cur.treasury;
          g.dividendsDelta += cur.dividends;
          g.pfcaFdsDelta += cur.pfcaFds;
          g.grossDelta += cur.grossMonthly;
          g.netIitDelta += cur.netIitMonthly;
          g.physicalCashDelta += cur.physicalCashMonthly;
          g.snapshotsInMonth += 1;
          g.endWealth = cur.invested;
        }
        return;
      }

      const prev = chartData[i - 1];
      if (!grouped.has(yearMonth)) {
        grouped.set(yearMonth, {
          monthKey: yearMonth,
          monthLabel,
          ts,
          startDate: cur.startDate || prev.endDate || "",
          endDate: cur.endDate || "",
          startWealth: prev.invested,
          endWealth: cur.invested,
          totalDelta: 0,
          fdsDelta: 0,
          utsDelta: 0,
          treasuryDelta: 0,
          dividendsDelta: 0,
          pfcaFdsDelta: 0,
          grossDelta: 0,
          netIitDelta: 0,
          physicalCashDelta: 0,
          snapshotsInMonth: 0,
        });
      }

      const g = grouped.get(yearMonth)!;
      g.totalDelta += (cur.invested - prev.invested);
      g.fdsDelta += (cur.fds - prev.fds);
      g.utsDelta += (cur.uts - prev.uts);
      g.treasuryDelta += (cur.treasury - prev.treasury);
      g.dividendsDelta += (cur.dividends - prev.dividends);
      g.pfcaFdsDelta += (cur.pfcaFds - prev.pfcaFds);
      g.grossDelta += (cur.grossMonthly - prev.grossMonthly);
      g.netIitDelta += (cur.netIitMonthly - prev.netIitMonthly);
      g.physicalCashDelta += (cur.physicalCashMonthly - prev.physicalCashMonthly);
      g.snapshotsInMonth += 1;
      g.endWealth = cur.invested;
      if (cur.endDate) g.endDate = cur.endDate;
      if (cur.startDate && (!g.startDate || cur.startDate < g.startDate)) {
        g.startDate = cur.startDate;
      }
    });

    return grouped;
  }, [chartData]);

  const monthlyInvestments = useMemo(() => {
    return Array.from(monthlyDataMap.values()).sort((a, b) => a.ts - b.ts);
  }, [monthlyDataMap]);

  // Set default selected month for monthly view
  useEffect(() => {
    if (!selectedMonthKey && monthlyInvestments.length > 0) {
      const latestMonth = monthlyInvestments[monthlyInvestments.length - 1].monthKey;
      setSelectedMonthKey(latestMonth);
    }
  }, [monthlyInvestments, selectedMonthKey]);

  // Sync planned input when month changes
  useEffect(() => {
    if (selectedMonthKey) {
      const existing = commitments[selectedMonthKey]?.plannedAmount;
      if (existing !== undefined && existing !== null) {
        setPlannedInput(String(existing));
      } else {
        setPlannedInput("1000000"); // default 1,000,000 LKR
      }
      setCommitmentSavedSuccess(false);
    }
  }, [selectedMonthKey, commitments]);

  // Current selected month calculations
  const currentMonthData = useMemo(() => {
    if (!selectedMonthKey) return null;
    const stats = monthlyDataMap.get(selectedMonthKey) || {
      monthKey: selectedMonthKey,
      monthLabel: selectedMonthKey,
      ts: 0,
      totalDelta: 0,
      fdsDelta: 0,
      utsDelta: 0,
      treasuryDelta: 0,
      dividendsDelta: 0,
      pfcaFdsDelta: 0,
      snapshotsInMonth: 0,
    };

    const plannedVal = Number(plannedInput) >= 0 ? Number(plannedInput) : (commitments[selectedMonthKey]?.plannedAmount || 1000000);
    const actualVal = stats.totalDelta;
    const variance = actualVal - plannedVal;
    const pctAchieved = plannedVal > 0 ? (actualVal / plannedVal) * 100 : 0;

    const categoryBreakdown = [
      { name: "Fixed Deposits", value: Math.max(0, stats.fdsDelta), raw: stats.fdsDelta, color: CATEGORY_COLORS.fds },
      { name: "Unit Trusts", value: Math.max(0, stats.utsDelta), raw: stats.utsDelta, color: CATEGORY_COLORS.uts },
      { name: "Treasury Bills", value: Math.max(0, stats.treasuryDelta), raw: stats.treasuryDelta, color: CATEGORY_COLORS.treasury },
      { name: "Dividends", value: Math.max(0, stats.dividendsDelta), raw: stats.dividendsDelta, color: CATEGORY_COLORS.dividends },
      { name: "PFCA FDs", value: Math.max(0, stats.pfcaFdsDelta), raw: stats.pfcaFdsDelta, color: CATEGORY_COLORS.pfcaFds },
    ];

    return {
      ...stats,
      plannedVal,
      actualVal,
      variance,
      pctAchieved,
      categoryBreakdown,
    };
  }, [selectedMonthKey, monthlyDataMap, plannedInput, commitments]);

  // Save Planned Commitment for selected month
  const handleSaveCommitment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedMonthKey) return;
    setSavingCommitment(true);
    try {
      const num = parseFloat(plannedInput) || 0;
      const res = await fetch("/api/commitments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: selectedMonthKey,
          plannedAmount: num,
        }),
      });
      if (!res.ok) throw new Error("Failed to save planned commitment");
      const data = await res.json();
      setCommitments((prev) => ({
        ...prev,
        [selectedMonthKey]: data.commitment,
      }));
      setCommitmentSavedSuccess(true);
      setTimeout(() => setCommitmentSavedSuccess(false), 2000);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to save commitment");
    } finally {
      setSavingCommitment(false);
    }
  };

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
      await fetchSnapshotsAndCommitments();
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
            Track planned vs actual monthly capital commitments, analyze snapshot deltas, and edit snapshot period dates.
          </p>
        </div>

        <div className="hist-header-actions">
          <div className="hist-tab-switcher">
            <button
              className={`hist-tab-btn ${activeTab === "snapshots" ? "active" : ""}`}
              onClick={() => setActiveTab("snapshots")}
            >
              <HistoryIcon size={14} />
              <span>Snapshot Progress</span>
            </button>
            <button
              className={`hist-tab-btn ${activeTab === "monthly" ? "active" : ""}`}
              onClick={() => setActiveTab("monthly")}
            >
              <Calendar size={14} />
              <span>Monthly View</span>
            </button>
          </div>

          <Link href="/history" className="hist-btn-secondary">
            <HistoryIcon size={15} />
            <span>Full History</span>
          </Link>
        </div>
      </div>

      {error && <div className="glass-card hist-error">{error}</div>}

      {loading ? (
        <div className="glass-card hist-loading">
          <div className="hist-spinner" />
          <p>Loading investment commitment data...</p>
        </div>
      ) : snapshots.length === 0 ? (
        <div className="glass-card hist-empty">
          <Landmark size={48} className="hist-empty-icon" />
          <h3>No Snapshots Recorded</h3>
          <p>
            You have no portfolio snapshots saved. Take a snapshot from the My Portfolio page to begin tracking capital commitments and monthly additions.
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
              <span className="kpi-sub">Across all portfolio assets</span>
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
              <span className="kpi-label">Avg. Monthly Addition</span>
              <div className={`kpi-value ${avgMonthlyAddition >= 0 ? "text-cyan" : "text-coral"}`}>
                {avgMonthlyAddition >= 0 ? "+" : ""}{formatLKR(avgMonthlyAddition)}/mo
              </div>
              <span className="kpi-sub">Over {totalMonths} recorded months</span>
            </div>

            <div className="glass-card kpi-card">
              <span className="kpi-label">Active Snapshots</span>
              <div className="kpi-value text-indigo">{snapshots.length}</div>
              <span className="kpi-sub">With custom start &amp; end dates</span>
            </div>
          </div>

          {/* ════════════════════ TAB 1: SNAPSHOT PROGRESS ════════════════════ */}
          {activeTab === "snapshots" && (
            <>
              {/* Snapshot-to-snapshot progress table (All Snapshots) */}
              <div className="glass-card hist-chart-card">
                <div className="hist-chart-hdr">
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <h3>Snapshot-to-snapshot progress</h3>
                      <span className="hist-badge-pill" style={{ color: "#38bdf8", borderColor: "rgba(56, 189, 248, 0.3)" }}>
                        {allSnapshotRows.length} Snapshots
                      </span>
                    </div>
                    <p>
                      Income and capital changes between consecutive snapshots with editable statement period dates —
                      <span style={{ color: "#10b981", marginLeft: 6 }}>▲ growth</span>
                      <span style={{ color: "#f87171", marginLeft: 8 }}>▼ decline</span>
                      <span style={{ color: "#6b7280", marginLeft: 8 }}>— no change</span>
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="hist-badge-pill">
                      <Clock size={12} style={{ marginRight: 4, color: "#00f2fe" }} />
                      Click Edit on any snapshot to adjust dates
                    </span>
                  </div>
                </div>

                <div className="hist-delta-scroll">
                  <table className="hist-delta-tbl">
                    <colgroup>
                      <col className="hdt-col-period" />
                      <col style={{ width: "140px" }} />
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
                      <col style={{ width: "85px" }} />
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
                      {allSnapshotRows.map((d, i) => (
                        <tr key={d.snapshotId || i}>
                          <td className="hdt-left hdt-period">
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <strong>{d.to}</strong>
                            </div>
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
                              title="Edit snapshot start and end dates"
                            >
                              <Pencil size={12} />
                              <span>Edit</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Aggregated Monthly Investment Progress Table */}
              <div className="glass-card hist-chart-card">
                <div className="hist-chart-hdr">
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <h3>Aggregated Monthly Investment Progress</h3>
                      <span className="hist-badge-pill" style={{ color: "#10b981", borderColor: "rgba(16, 185, 129, 0.3)" }}>
                        Whole Month View
                      </span>
                    </div>
                    <p>
                      Consolidated net capital additions, asset category deployment, and month-end portfolio wealth for each full month.
                    </p>
                  </div>
                  <Landmark size={18} className="hist-chart-icon" />
                </div>

                <div className="hist-delta-scroll">
                  <table className="hist-delta-tbl">
                    <colgroup>
                      <col className="hdt-col-period" style={{ width: "160px" }} />
                      <col style={{ width: "140px" }} />
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
                      <col style={{ width: "120px" }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="hdt-left">Month</th>
                        <th className="hdt-left" style={{ color: "#9ca3af" }}>Statement Period</th>
                        <th>Gross /mo Δ</th>
                        <th>Net IIT /mo Δ</th>
                        <th>Cash /mo Δ</th>
                        <th className="hdt-divider">Total Added Δ</th>
                        <th style={{ color: "#00f2fe" }}>FDs Δ</th>
                        <th style={{ color: "#10b981" }}>UTs Δ</th>
                        <th style={{ color: "#818cf8" }}>Treasury Δ</th>
                        <th style={{ color: "#6366f1" }}>Dividends Δ</th>
                        <th style={{ color: "#f43f5e" }}>PFCA Δ</th>
                        <th className="hdt-wealth-th">Month-End Wealth</th>
                        <th style={{ textAlign: "center" }}>Planned Target</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyInvestments.map((m) => {
                        const planned = commitments[m.monthKey]?.plannedAmount;
                        const isMet = planned !== undefined && planned !== null && m.totalDelta >= planned;
                        return (
                          <tr key={m.monthKey}>
                            <td className="hdt-left hdt-period">
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <strong>{m.monthLabel}</strong>
                                <span style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: "10px", background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}>
                                  {m.snapshotsInMonth} {m.snapshotsInMonth === 1 ? "snap" : "snaps"}
                                </span>
                              </div>
                            </td>
                            <td className="hdt-left" style={{ fontSize: "0.74rem", color: "#94a3b8" }}>
                              <span style={{ fontFamily: "monospace" }}>
                                {m.startDate || "—"} → {m.endDate || "—"}
                              </span>
                            </td>
                            <DeltaTd value={m.grossDelta} />
                            <DeltaTd value={m.netIitDelta} />
                            <DeltaTd value={m.physicalCashDelta} />
                            <DeltaTd value={m.totalDelta} divider />
                            <DeltaTd value={m.fdsDelta} accent="#00f2fe" />
                            <DeltaTd value={m.utsDelta} accent="#10b981" />
                            <DeltaTd value={m.treasuryDelta} accent="#818cf8" />
                            <DeltaTd value={m.dividendsDelta} accent="#6366f1" />
                            <DeltaTd value={m.pfcaFdsDelta} accent="#f43f5e" />
                            <td className="hdt-wealth-cell">{formatCompact(m.endWealth)}</td>
                            <td style={{ textAlign: "center" }}>
                              {planned !== undefined && planned !== null ? (
                                <span
                                  style={{
                                    fontSize: "0.72rem",
                                    fontWeight: 600,
                                    padding: "3px 8px",
                                    borderRadius: "12px",
                                    background: isMet ? "rgba(16, 185, 129, 0.15)" : "rgba(248, 113, 113, 0.15)",
                                    color: isMet ? "#34d399" : "#f87171",
                                    border: `1px solid ${isMet ? "rgba(16, 185, 129, 0.3)" : "rgba(248, 113, 113, 0.3)"}`,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {formatCompact(planned)} {isMet ? "✓" : `(${planned > 0 ? ((m.totalDelta / planned) * 100).toFixed(0) : "0"}%)`}
                                </span>
                              ) : (
                                <span style={{ fontSize: "0.72rem", color: "#6b7280" }}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Monthly Investment Additions Chart */}
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
                        <ReferenceLine y={1000000} stroke="#f87171" strokeDasharray="3 3" label={{ value: "1M Baseline", fill: "#f87171", fontSize: 10, position: "insideTopRight" }} />
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
            </>
          )}

          {/* ════════════════════ TAB 2: MONTHLY VIEW (PLANNED VS ACTUAL) ════════════════════ */}
          {activeTab === "monthly" && (
            <div className="monthly-commitment-view">
              {/* Month Selector & Planned Input Bar */}
              <div className="glass-card month-control-card">
                <div className="month-control-top">
                  <div className="month-selector-group">
                    <label className="ctrl-label">
                      <Calendar size={14} color="#00f2fe" />
                      <span>Select Month to Review:</span>
                    </label>
                    <div className="month-buttons-scroll">
                      {monthlyInvestments.map((m) => (
                        <button
                          key={m.monthKey}
                          className={`month-pill ${selectedMonthKey === m.monthKey ? "active" : ""}`}
                          onClick={() => setSelectedMonthKey(m.monthKey)}
                        >
                          {m.monthLabel}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Planned Commitment Input Form */}
                  <form onSubmit={handleSaveCommitment} className="planned-input-form">
                    <div className="planned-input-wrap">
                      <label className="ctrl-label">
                        <Target size={14} color="#38bdf8" />
                        <span>Planned Commitment Value (LKR):</span>
                      </label>
                      <div className="input-with-btn">
                        <span className="currency-prefix">Rs.</span>
                        <input
                          type="number"
                          step="50000"
                          min="0"
                          value={plannedInput}
                          onChange={(e) => setPlannedInput(e.target.value)}
                          placeholder="e.g. 1000000"
                          className="planned-num-input"
                        />
                        <button
                          type="submit"
                          disabled={savingCommitment}
                          className="btn-save-commitment"
                        >
                          {commitmentSavedSuccess ? (
                            <>
                              <Check size={14} color="#10b981" />
                              <span>Saved</span>
                            </>
                          ) : savingCommitment ? (
                            <span>Saving...</span>
                          ) : (
                            <span>Set Target</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>

                {/* Quick Presets */}
                <div className="quick-presets">
                  <span className="preset-label">Quick Presets:</span>
                  {[500000, 750000, 1000000, 1250000, 1500000, 2000000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className="preset-chip"
                      onClick={() => {
                        setPlannedInput(String(amt));
                      }}
                    >
                      {formatCompact(amt)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Monthly Comparison Dashboard */}
              {currentMonthData && (
                <>
                  {/* Progress Comparison Hero Card */}
                  <div className="glass-card comparison-hero-card">
                    <div className="hero-header">
                      <div>
                        <h2>{currentMonthData.monthLabel} Commitment Performance</h2>
                        <p className="hero-sub">
                          Comparing planned allocation against actual net capital deployed in {currentMonthData.monthLabel}.
                        </p>
                      </div>
                      <div className={`status-badge-lg ${currentMonthData.variance >= 0 ? "surplus" : "shortfall"}`}>
                        {currentMonthData.variance >= 0 ? (
                          <>
                            <CheckCircle2 size={18} />
                            <span>Commitment Achieved ({currentMonthData.pctAchieved.toFixed(1)}%)</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle size={18} />
                            <span>Commitment Gap ({currentMonthData.pctAchieved.toFixed(1)}%)</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="progress-section">
                      <div className="progress-label-row">
                        <span className="prog-title">Commitment Fulfillment Rate</span>
                        <span className="prog-pct">{currentMonthData.pctAchieved.toFixed(1)}%</span>
                      </div>
                      <div className="prog-bar-track">
                        <div
                          className={`prog-bar-fill ${currentMonthData.variance >= 0 ? "fill-surplus" : "fill-progress"}`}
                          style={{ width: `${Math.min(100, Math.max(0, currentMonthData.pctAchieved))}%` }}
                        />
                      </div>
                      <div className="prog-markers">
                        <span>0%</span>
                        <span>50%</span>
                        <span style={{ color: "#38bdf8", fontWeight: 700 }}>100% Target ({formatCompact(currentMonthData.plannedVal)})</span>
                        <span>150%+</span>
                      </div>
                    </div>

                    {/* 3 Key Comparison Cards */}
                    <div className="grid-comparison-kpis">
                      <div className="cmp-card planned-card">
                        <div className="cmp-card-top">
                          <span className="cmp-tag">Planned Commitment</span>
                          <Target size={16} className="cmp-icon" />
                        </div>
                        <div className="cmp-val">{formatLKR(currentMonthData.plannedVal)}</div>
                        <span className="cmp-note">Target investment for the month</span>
                      </div>

                      <div className="cmp-card actual-card">
                        <div className="cmp-card-top">
                          <span className="cmp-tag">Actual Commitment Done</span>
                          <Landmark size={16} className="cmp-icon" />
                        </div>
                        <div className="cmp-val text-cyan">{formatLKR(currentMonthData.actualVal)}</div>
                        <span className="cmp-note">Net new capital deployed</span>
                      </div>

                      <div className={`cmp-card ${currentMonthData.variance >= 0 ? "variance-card-pos" : "variance-card-neg"}`}>
                        <div className="cmp-card-top">
                          <span className="cmp-tag">
                            {currentMonthData.variance >= 0 ? "Net Surplus Added" : "Commitment Shortfall"}
                          </span>
                          {currentMonthData.variance >= 0 ? (
                            <ArrowUpRight size={16} className="cmp-icon text-emerald" />
                          ) : (
                            <ArrowDownRight size={16} className="cmp-icon text-coral" />
                          )}
                        </div>
                        <div className={`cmp-val ${currentMonthData.variance >= 0 ? "text-emerald" : "text-coral"}`}>
                          {currentMonthData.variance >= 0 ? "+" : ""}{formatLKR(currentMonthData.variance)}
                        </div>
                        <span className="cmp-note">
                          {currentMonthData.variance >= 0
                            ? `Exceeded planned target by ${formatLKR(currentMonthData.variance)}`
                            : `Need ${formatLKR(Math.abs(currentMonthData.variance))} to reach monthly goal`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Category Deployment Breakdown in Current Month */}
                  <div className="glass-card hist-chart-card">
                    <div className="hist-chart-hdr">
                      <div>
                        <h3>{currentMonthData.monthLabel} Asset Class Deployment Breakdown</h3>
                        <p>Where the actual {formatLKR(currentMonthData.actualVal)} was invested during this month.</p>
                      </div>
                      <PieIcon size={18} className="hist-chart-icon" />
                    </div>

                    <div className="grid-category-breakdown">
                      {currentMonthData.categoryBreakdown.map((cat) => {
                        const pctOfActual = currentMonthData.actualVal > 0 ? (cat.raw / currentMonthData.actualVal) * 100 : 0;
                        return (
                          <div key={cat.name} className="cat-kpi-card" style={{ borderLeft: `3px solid ${cat.color}` }}>
                            <div className="cat-kpi-hdr">
                              <span className="cat-name">{cat.name}</span>
                              <span className="cat-pct">{pctOfActual > 0 ? `${pctOfActual.toFixed(1)}%` : "0%"}</span>
                            </div>
                            <div className="cat-amount" style={{ color: cat.raw >= 0 ? cat.color : "#f87171" }}>
                              {cat.raw >= 0 ? "+" : ""}{formatLKR(cat.raw)}
                            </div>
                            <div className="cat-bar-track">
                              <div
                                className="cat-bar-fill"
                                style={{
                                  width: `${Math.min(100, Math.max(0, pctOfActual))}%`,
                                  backgroundColor: cat.color,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Multi-Month Planned vs Actual History Table */}
                  <div className="glass-card hist-chart-card">
                    <div className="hist-chart-hdr">
                      <div>
                        <h3>All Months Planned vs Actual Ledger</h3>
                        <p>Historical comparison of planned commitments against actual additions.</p>
                      </div>
                      <BarChart3 size={18} className="hist-chart-icon" />
                    </div>

                    <div className="hist-delta-scroll">
                      <table className="hist-delta-tbl">
                        <thead>
                          <tr>
                            <th className="hdt-left">Month</th>
                            <th style={{ textAlign: "right", color: "#38bdf8" }}>Planned Commitment</th>
                            <th style={{ textAlign: "right", color: "#00f2fe" }}>Actual Deployed</th>
                            <th style={{ textAlign: "right" }}>Variance (LKR)</th>
                            <th style={{ textAlign: "right" }}>Fulfillment %</th>
                            <th style={{ textAlign: "center" }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyInvestments.map((m) => {
                            const pAmt = commitments[m.monthKey]?.plannedAmount ?? 1000000;
                            const aAmt = m.totalDelta;
                            const diff = aAmt - pAmt;
                            const pct = pAmt > 0 ? (aAmt / pAmt) * 100 : 0;
                            const isMet = diff >= 0;

                            return (
                              <tr
                                key={m.monthKey}
                                className={selectedMonthKey === m.monthKey ? "selected-row" : ""}
                                onClick={() => setSelectedMonthKey(m.monthKey)}
                                style={{ cursor: "pointer" }}
                              >
                                <td className="hdt-left">
                                  <strong>{m.monthLabel}</strong>
                                  {selectedMonthKey === m.monthKey && (
                                    <span className="active-row-tag">Active</span>
                                  )}
                                </td>
                                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", color: "#38bdf8" }}>
                                  {formatLKR(pAmt)}
                                </td>
                                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", color: "#00f2fe", fontWeight: 700 }}>
                                  {formatLKR(aAmt)}
                                </td>
                                <td
                                  style={{
                                    textAlign: "right",
                                    fontFamily: "var(--font-mono)",
                                    fontWeight: 700,
                                    color: isMet ? "#10b981" : "#f87171",
                                  }}
                                >
                                  {diff >= 0 ? "+" : ""}{formatLKR(diff)}
                                </td>
                                <td
                                  style={{
                                    textAlign: "right",
                                    fontFamily: "var(--font-mono)",
                                    fontWeight: 700,
                                    color: isMet ? "#10b981" : "#f87171",
                                  }}
                                >
                                  {pct.toFixed(1)}%
                                </td>
                                <td style={{ textAlign: "center" }}>
                                  <span className={`table-status-pill ${isMet ? "met" : "unmet"}`}>
                                    {isMet ? "Target Met" : "Shortfall"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
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
                  <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#fff" }}>Edit Snapshot Period Dates</h3>
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
          padding: 4px 10px;
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
          gap: 10px;
          flex-wrap: wrap;
        }

        /* ── Tab Switcher ── */
        .hist-tab-switcher {
          display: flex;
          background: rgba(0, 0, 0, 0.4);
          padding: 3px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .hist-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 7px;
          background: transparent;
          border: none;
          color: #9ca3af;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .hist-tab-btn:hover {
          color: #fff;
        }

        .hist-tab-btn.active {
          background: #00f2fe;
          color: #000;
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(0, 242, 254, 0.3);
        }

        .hist-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
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

        /* ── Monthly View Components ── */
        .monthly-commitment-view {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .month-control-card {
          padding: 1.4rem;
        }

        .month-control-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .ctrl-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.76rem;
          font-weight: 700;
          color: #cbd5e1;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .month-buttons-scroll {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow-x: auto;
          padding-bottom: 4px;
        }

        .month-pill {
          padding: 6px 14px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #9ca3af;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s;
        }

        .month-pill:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
        }

        .month-pill.active {
          background: rgba(0, 242, 254, 0.15);
          border-color: #00f2fe;
          color: #00f2fe;
          font-weight: 700;
        }

        .planned-input-form {
          min-width: 320px;
        }

        .input-with-btn {
          display: flex;
          align-items: center;
          position: relative;
        }

        .currency-prefix {
          position: absolute;
          left: 12px;
          color: #9ca3af;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .planned-num-input {
          flex: 1;
          padding: 9px 12px 9px 40px;
          border-radius: 8px 0 0 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-right: none;
          color: #fff;
          font-size: 0.9rem;
          font-family: var(--font-mono);
          font-weight: 700;
          outline: none;
        }

        .planned-num-input:focus {
          border-color: #00f2fe;
          background: rgba(0, 242, 254, 0.03);
        }

        .btn-save-commitment {
          padding: 9px 16px;
          border-radius: 0 8px 8px 0;
          background: #00f2fe;
          border: 1px solid #00f2fe;
          color: #000;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: opacity 0.15s;
        }

        .btn-save-commitment:hover {
          opacity: 0.9;
        }

        .quick-presets {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 1rem;
          padding-top: 0.75rem;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          flex-wrap: wrap;
        }

        .preset-label {
          font-size: 0.72rem;
          color: #6b7280;
          font-weight: 600;
        }

        .preset-chip {
          padding: 3px 8px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #9ca3af;
          font-size: 0.72rem;
          font-weight: 600;
          cursor: pointer;
        }

        .preset-chip:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
        }

        /* ── Comparison Hero Card ── */
        .comparison-hero-card {
          padding: 1.6rem;
        }

        .hero-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 1.5rem;
        }

        .hero-header h2 {
          margin: 0;
          font-size: 1.25rem;
          color: #fff;
        }

        .hero-sub {
          margin: 4px 0 0;
          font-size: 0.8rem;
          color: #94a3b8;
        }

        .status-badge-lg {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 0.82rem;
          font-weight: 700;
        }

        .status-badge-lg.surplus {
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #10b981;
        }

        .status-badge-lg.shortfall {
          background: rgba(248, 113, 113, 0.12);
          border: 1px solid rgba(248, 113, 113, 0.3);
          color: #f87171;
        }

        /* ── Progress Section ── */
        .progress-section {
          margin-bottom: 1.75rem;
          padding: 1rem 1.2rem;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .progress-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .prog-title {
          font-size: 0.76rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #94a3b8;
        }

        .prog-pct {
          font-size: 1.1rem;
          font-weight: 800;
          font-family: var(--font-display);
          color: #00f2fe;
        }

        .prog-bar-track {
          height: 12px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 999px;
          overflow: hidden;
          position: relative;
        }

        .prog-bar-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.4s ease;
        }

        .fill-progress {
          background: linear-gradient(90deg, #38bdf8, #00f2fe);
        }

        .fill-surplus {
          background: linear-gradient(90deg, #00f2fe, #10b981);
        }

        .prog-markers {
          display: flex;
          justify-content: space-between;
          font-size: 0.7rem;
          color: #64748b;
          margin-top: 6px;
        }

        /* ── 3 Key Comparison Cards ── */
        .grid-comparison-kpis {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1rem;
        }

        .cmp-card {
          padding: 1.2rem;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .cmp-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .cmp-tag {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #94a3b8;
          font-weight: 700;
        }

        .cmp-icon {
          color: #64748b;
        }

        .cmp-val {
          font-size: 1.35rem;
          font-weight: 800;
          font-family: var(--font-display);
          color: #fff;
          margin-top: 2px;
        }

        .cmp-note {
          font-size: 0.72rem;
          color: #64748b;
        }

        .variance-card-pos {
          border-color: rgba(16, 185, 129, 0.25);
          background: rgba(16, 185, 129, 0.03);
        }

        .variance-card-neg {
          border-color: rgba(248, 113, 113, 0.25);
          background: rgba(248, 113, 113, 0.03);
        }

        /* ── Category Breakdown Cards ── */
        .grid-category-breakdown {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .cat-kpi-card {
          padding: 1rem;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .cat-kpi-hdr {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .cat-name {
          font-size: 0.78rem;
          font-weight: 700;
          color: #fff;
        }

        .cat-pct {
          font-size: 0.72rem;
          font-weight: 700;
          color: #94a3b8;
        }

        .cat-amount {
          font-size: 1.1rem;
          font-weight: 800;
          font-family: var(--font-mono);
        }

        .cat-bar-track {
          height: 4px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 999px;
          overflow: hidden;
          margin-top: 2px;
        }

        .cat-bar-fill {
          height: 100%;
          border-radius: 999px;
        }

        /* ── Table enhancements ── */
        .selected-row td {
          background: rgba(0, 242, 254, 0.08) !important;
        }

        .active-row-tag {
          display: inline-block;
          margin-left: 8px;
          padding: 2px 6px;
          border-radius: 4px;
          background: #00f2fe;
          color: #000;
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
        }

        .table-status-pill {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 700;
        }

        .table-status-pill.met {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .table-status-pill.unmet {
          background: rgba(248, 113, 113, 0.15);
          color: #f87171;
          border: 1px solid rgba(248, 113, 113, 0.3);
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
