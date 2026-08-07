"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Save,
  RefreshCw,
  Camera,
  Landmark,
  Compass,
  Wallet,
  LineChart,
  Globe,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import type { CategoryCapitalPlan, TargetData, TargetPlan } from "@/lib/db";

type SnapshotTotals = {
  invested?: number;
  investedByCategory?: Partial<CategoryCapitalPlan>;
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

type ProgressMetric = {
  key: string;
  label: string;
  color: string;
  current: number;
  target: number;
};

const CATEGORY_META: {
  key: keyof CategoryCapitalPlan;
  label: string;
  icon: React.ElementType;
  color: string;
}[] = [
  { key: "fds", label: "Fixed Deposits", icon: Landmark, color: "#00f2fe" },
  { key: "uts", label: "Unit Trusts", icon: Compass, color: "#10b981" },
  { key: "treasury", label: "Treasury", icon: Wallet, color: "#818cf8" },
  { key: "dividends", label: "Dividends", icon: LineChart, color: "#6366f1" },
  { key: "pfcaFds", label: "PFCA FDs", icon: Globe, color: "#f43f5e" },
];

function formatLKR(num: number) {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(num) ? num : 0);
}

function pct(current: number, target: number) {
  if (target <= 0) return current > 0 ? 100 : 0;
  return Math.min(100, Math.max(0, (current / target) * 100));
}

function emptyInvested(): CategoryCapitalPlan {
  return { fds: 0, uts: 0, treasury: 0, dividends: 0, pfcaFds: 0 };
}

export default function TargetPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [planWarning, setPlanWarning] = useState<string | null>(null);
  const [latest, setLatest] = useState<SnapshotRow | null>(null);

  const [netMonthlyWht, setNetMonthlyWht] = useState("");
  const [netMonthlyIit, setNetMonthlyIit] = useState("");
  const [physicalCashMonthly, setPhysicalCashMonthly] = useState("");
  const [monthsToTarget, setMonthsToTarget] = useState("12");
  const [plan, setPlan] = useState<TargetPlan | null>(null);
  const [setAt, setSetAt] = useState<string | null>(null);

  const showFlash = (msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 4000);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tRes, sRes] = await Promise.all([
          fetch("/api/target"),
          fetch("/api/snapshots"),
        ]);
        if (tRes.ok) {
          const t = (await tRes.json()) as TargetData;
          if (!cancelled) {
            setNetMonthlyWht(t.netMonthlyWht ? String(t.netMonthlyWht) : "");
            setNetMonthlyIit(t.netMonthlyIit ? String(t.netMonthlyIit) : "");
            setPhysicalCashMonthly(t.physicalCashMonthly ? String(t.physicalCashMonthly) : "");
            setMonthsToTarget(String(t.monthsToTarget || 12));
            setPlan(t.plan || null);
            setSetAt(t.setAt || null);
          }
        }
        if (sRes.ok) {
          const snaps = (await sRes.json()) as SnapshotRow[];
          if (!cancelled && Array.isArray(snaps) && snaps.length > 0) {
            setLatest(snaps[0]);
          }
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) showFlash("Could not load target data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const targets = {
    netMonthlyWht: Math.max(0, Number(netMonthlyWht) || 0),
    netMonthlyIit: Math.max(0, Number(netMonthlyIit) || 0),
    physicalCashMonthly: Math.max(0, Number(physicalCashMonthly) || 0),
    monthsToTarget: Math.max(1, Math.round(Number(monthsToTarget) || 12)),
  };

  const current = {
    netMonthlyWht: (latest?.totals?.netWht || 0) / 12,
    netMonthlyIit: (latest?.totals?.netIit || 0) / 12,
    physicalCashMonthly: (latest?.totals?.physicalCash || 0) / 12,
    invested: latest?.totals?.invested || 0,
    investedByCategory: {
      ...emptyInvested(),
      ...(latest?.totals?.investedByCategory || {}),
    } as CategoryCapitalPlan,
  };

  const metrics: ProgressMetric[] = [
    {
      key: "wht",
      label: "Net Monthly (After WHT)",
      color: "#10b981",
      current: current.netMonthlyWht,
      target: targets.netMonthlyWht,
    },
    {
      key: "iit",
      label: "Net Monthly (After Progressive IIT)",
      color: "#d8b4fe",
      current: current.netMonthlyIit,
      target: targets.netMonthlyIit,
    },
    {
      key: "cash",
      label: "Physical Cash Available (Monthly)",
      color: "#fbbf24",
      current: current.physicalCashMonthly,
      target: targets.physicalCashMonthly,
    },
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/target", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...targets,
          plan, // keep existing plan
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSetAt(data.target?.setAt || new Date().toISOString());
      showFlash("Targets saved");
    } catch (e) {
      showFlash(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleReevaluate = async () => {
    if (!latest) {
      showFlash("Save a portfolio snapshot first");
      return;
    }
    if (
      targets.netMonthlyWht <= 0 &&
      targets.netMonthlyIit <= 0 &&
      targets.physicalCashMonthly <= 0
    ) {
      showFlash("Set at least one monthly target first");
      return;
    }

    setPlanning(true);
    setPlanWarning(null);
    try {
      // Persist targets first so plan matches the form
      await fetch("/api/target", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...targets, plan }),
      });

      const geminiKey =
        typeof window !== "undefined"
          ? localStorage.getItem("lankawealth_gemini_key") || ""
          : "";

      const res = await fetch("/api/target/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(geminiKey ? { "x-gemini-key": geminiKey } : {}),
        },
        body: JSON.stringify({
          current,
          target: targets,
          persist: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Plan failed");
      setPlan(data.plan as TargetPlan);
      setPlanWarning(data.warning || null);
      setSetAt(new Date().toISOString());
      showFlash(
        data.plan?.source === "gemini"
          ? "Plan re-evaluated with Gemini"
          : "Plan built with local heuristic"
      );
    } catch (e) {
      showFlash(e instanceof Error ? e.message : "Plan failed");
    } finally {
      setPlanning(false);
    }
  };

  const maxCategoryCapital = plan
    ? Math.max(
        1,
        ...CATEGORY_META.map((c) => plan.additionalCapitalByCategory[c.key] || 0),
        ...CATEGORY_META.map((c) => current.investedByCategory[c.key] || 0)
      )
    : 1;

  if (loading) {
    return (
      <div className="animate-fade-in text-sans-layout target-loading">
        Loading targets…
      </div>
    );
  }

  return (
    <div className="animate-fade-in text-sans-layout">
      <div className="page-header-container">
        <span className="badge badge-teal">Goals</span>
        <h1 className="page-title">Income Target</h1>
        <p className="page-subtitle">
          Set monthly income targets, track progress against your latest portfolio snapshot, and
          re-evaluate a practical capital deployment plan when you are ready.
        </p>
      </div>

      {/* Target inputs */}
      <div className="glass-card target-form-card">
        <div className="target-form-hdr">
          <div>
            <h2>Monthly targets</h2>
            <p>
              Horizon: how many months until you expect to reach these levels.
              {setAt && (
                <span className="target-set-at">
                  {" "}
                  · Last saved {new Date(setAt).toLocaleString("en-LK")}
                </span>
              )}
            </p>
          </div>
          <button type="button" className="target-save-btn" onClick={handleSave} disabled={saving}>
            <Save size={14} />
            {saving ? "Saving…" : "Save Targets"}
          </button>
        </div>

        <div className="target-form-grid">
          <label className="target-field">
            <span>Net Monthly (After WHT)</span>
            <input
              className="glass-input"
              type="number"
              min={0}
              step={1000}
              placeholder="e.g. 500000"
              value={netMonthlyWht}
              onChange={(e) => setNetMonthlyWht(e.target.value)}
            />
          </label>
          <label className="target-field">
            <span>Net Monthly (After Progressive IIT)</span>
            <input
              className="glass-input"
              type="number"
              min={0}
              step={1000}
              placeholder="e.g. 450000"
              value={netMonthlyIit}
              onChange={(e) => setNetMonthlyIit(e.target.value)}
            />
          </label>
          <label className="target-field">
            <span>Physical Cash Available (Monthly)</span>
            <input
              className="glass-input"
              type="number"
              min={0}
              step={1000}
              placeholder="e.g. 400000"
              value={physicalCashMonthly}
              onChange={(e) => setPhysicalCashMonthly(e.target.value)}
            />
          </label>
          <label className="target-field">
            <span>Months to reach target</span>
            <input
              className="glass-input"
              type="number"
              min={1}
              step={1}
              value={monthsToTarget}
              onChange={(e) => setMonthsToTarget(e.target.value)}
            />
          </label>
        </div>
        {flash && <div className="target-flash">{flash}</div>}
      </div>

      {/* Snapshot baseline */}
      <div className="glass-card target-baseline-card">
        <div className="target-baseline-hdr">
          <div className="target-baseline-title">
            <Camera size={16} />
            <h3>Latest snapshot baseline</h3>
          </div>
          {latest ? (
            <span className="target-baseline-meta">
              {new Date(latest.timestamp).toLocaleString("en-LK")}
              {latest.label ? ` · ${latest.label}` : ""}
            </span>
          ) : (
            <Link href="/portfolio" className="target-snapshot-link">
              Save a snapshot on My Portfolio →
            </Link>
          )}
        </div>
        {latest ? (
          <div className="target-baseline-grid">
            <div>
              <span className="lbl">Net /mo (WHT)</span>
              <strong className="text-emerald">{formatLKR(current.netMonthlyWht)}</strong>
            </div>
            <div>
              <span className="lbl">Net /mo (IIT)</span>
              <strong style={{ color: "#d8b4fe" }}>{formatLKR(current.netMonthlyIit)}</strong>
            </div>
            <div>
              <span className="lbl">Physical cash /mo</span>
              <strong style={{ color: "#fbbf24" }}>{formatLKR(current.physicalCashMonthly)}</strong>
            </div>
            <div>
              <span className="lbl">Total invested</span>
              <strong className="text-teal">{formatLKR(current.invested)}</strong>
            </div>
          </div>
        ) : (
          <p className="target-empty-hint">
            Progress bars need a portfolio snapshot. Open My Portfolio and click Save Snapshot.
          </p>
        )}
      </div>

      {/* Progress bars */}
      <div className="glass-card target-progress-card">
        <h3>Progress vs target</h3>
        <p className="target-section-sub">
          Achieved (from latest snapshot) vs remaining to your saved targets.
        </p>
        <div className="target-progress-list">
          {metrics.map((m) => {
            const achievedPct = pct(m.current, m.target);
            const remaining = Math.max(0, m.target - m.current);
            const remainingPct = m.target > 0 ? Math.max(0, 100 - achievedPct) : 0;
            return (
              <div key={m.key} className="target-progress-row">
                <div className="target-progress-labels">
                  <span className="name">{m.label}</span>
                  <span className="nums">
                    <strong style={{ color: m.color }}>{formatLKR(m.current)}</strong>
                    <span className="sep">/</span>
                    <span>{formatLKR(m.target)}</span>
                    <span className="pct-pill">{achievedPct.toFixed(0)}%</span>
                  </span>
                </div>
                <div className="target-bar-track" title={`Remaining ${formatLKR(remaining)}`}>
                  <div
                    className="target-bar-achieved"
                    style={{ width: `${achievedPct}%`, background: m.color }}
                  />
                  <div
                    className="target-bar-remaining"
                    style={{ width: `${remainingPct}%` }}
                  />
                </div>
                <div className="target-bar-legend">
                  <span>
                    <i style={{ background: m.color }} /> Achieved {formatLKR(Math.min(m.current, m.target || m.current))}
                  </span>
                  <span>
                    <i className="rem" /> Remaining {formatLKR(remaining)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Plan */}
      <div className="glass-card target-plan-card">
        <div className="target-plan-hdr">
          <div>
            <h3>Practical guide to reach the target</h3>
            <p className="target-section-sub">
              Not run automatically — click Re-evaluate when you want a fresh plan (Gemini if a key
              is configured, otherwise a local heuristic).
            </p>
          </div>
          <button
            type="button"
            className="target-plan-btn"
            onClick={handleReevaluate}
            disabled={planning}
          >
            {planning ? <RefreshCw size={14} className="spin" /> : <Sparkles size={14} />}
            {planning ? "Re-evaluating…" : "Re-evaluate Plan"}
          </button>
        </div>

        {planWarning && (
          <div className="target-plan-warn">
            <AlertCircle size={14} />
            {planWarning}
          </div>
        )}

        {!plan ? (
          <p className="target-empty-hint">
            Save your targets, ensure a snapshot exists, then click Re-evaluate Plan.
          </p>
        ) : (
          <>
            <div className="target-plan-summary">
              <div className="target-plan-badge">
                {plan.source === "gemini" ? "Gemini" : "Heuristic"} ·{" "}
                {new Date(plan.generatedAt).toLocaleString("en-LK")}
              </div>
              <p>{plan.summary}</p>
              <div className="target-plan-kpis">
                <div>
                  <span>Monthly capital to add</span>
                  <strong>{formatLKR(plan.monthlyContributionNeeded)}</strong>
                </div>
                <div>
                  <span>Expected lift · WHT</span>
                  <strong className="text-emerald">
                    +{formatLKR(plan.expectedMonthlyLift.netWht)}/mo
                  </strong>
                </div>
                <div>
                  <span>Expected lift · IIT</span>
                  <strong style={{ color: "#d8b4fe" }}>
                    +{formatLKR(plan.expectedMonthlyLift.netIit)}/mo
                  </strong>
                </div>
                <div>
                  <span>Expected lift · Cash</span>
                  <strong style={{ color: "#fbbf24" }}>
                    +{formatLKR(plan.expectedMonthlyLift.physicalCash)}/mo
                  </strong>
                </div>
              </div>
            </div>

            <ol className="target-plan-steps">
              {plan.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>

            {plan.assumptions?.length > 0 && (
              <ul className="target-plan-assumptions">
                {plan.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            )}

            <div className="target-capital-section">
              <h4>Remaining capital by category</h4>
              <p className="target-section-sub">
                Extra capital suggested for each bucket (not current holdings). Bars scale to the
                largest category need.
              </p>
              <div className="target-capital-list">
                {CATEGORY_META.map((c) => {
                  const need = plan.additionalCapitalByCategory[c.key] || 0;
                  const held = current.investedByCategory[c.key] || 0;
                  const needPct = (need / maxCategoryCapital) * 100;
                  const heldPct = (held / maxCategoryCapital) * 100;
                  const Icon = c.icon;
                  return (
                    <div key={c.key} className="target-capital-row">
                      <div className="target-capital-label">
                        <Icon size={14} style={{ color: c.color }} />
                        <span>{c.label}</span>
                        <strong>{formatLKR(need)}</strong>
                      </div>
                      <div className="target-capital-bars">
                        <div className="target-cap-track" title={`Need ${formatLKR(need)}`}>
                          <div
                            className="target-cap-need"
                            style={{ width: `${needPct}%`, background: c.color }}
                          />
                        </div>
                        <div className="target-cap-track muted" title={`Held ${formatLKR(held)}`}>
                          <div
                            className="target-cap-held"
                            style={{ width: `${heldPct}%`, background: c.color }}
                          />
                        </div>
                      </div>
                      <div className="target-cap-legend">
                        <span>Need {formatLKR(need)}</span>
                        <span>Held {formatLKR(held)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .target-loading {
          color: var(--text-muted);
          padding: 3rem 0;
        }

        .target-form-card,
        .target-baseline-card,
        .target-progress-card,
        .target-plan-card {
          padding: 1.35rem 1.5rem;
          margin-bottom: 1.25rem;
          width: 100%;
          box-sizing: border-box;
        }

        .target-form-hdr,
        .target-plan-hdr,
        .target-baseline-hdr {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }

        .target-form-hdr h2,
        .target-progress-card h3,
        .target-plan-hdr h3,
        .target-baseline-title h3,
        .target-capital-section h4 {
          margin: 0;
          font-size: 1rem;
          color: var(--text-primary);
        }

        .target-form-hdr p,
        .target-section-sub {
          margin: 4px 0 0;
          font-size: 0.78rem;
          color: var(--text-muted);
          font-weight: 600;
        }

        .target-set-at {
          color: var(--text-secondary);
        }

        .target-form-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1rem;
        }

        @media (max-width: 900px) {
          .target-form-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 520px) {
          .target-form-grid {
            grid-template-columns: 1fr;
          }
        }

        .target-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .target-save-btn,
        .target-plan-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid rgba(0, 242, 254, 0.35);
          background: rgba(0, 242, 254, 0.12);
          color: var(--color-teal);
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
        }

        .target-plan-btn {
          border-color: rgba(216, 180, 254, 0.4);
          background: rgba(216, 180, 254, 0.12);
          color: #d8b4fe;
        }

        .target-save-btn:disabled,
        .target-plan-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .target-flash {
          margin-top: 0.9rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--color-emerald);
        }

        .target-baseline-title {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-primary);
        }

        .target-baseline-meta {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-muted);
        }

        .target-snapshot-link {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--color-teal);
          text-decoration: none;
        }

        .target-baseline-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1rem;
        }

        @media (max-width: 720px) {
          .target-baseline-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        .target-baseline-grid .lbl {
          display: block;
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .target-baseline-grid strong {
          font-size: 1.05rem;
        }

        .target-empty-hint {
          margin: 0;
          font-size: 0.82rem;
          color: var(--text-muted);
          font-weight: 600;
        }

        .target-progress-list {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-top: 1rem;
        }

        .target-progress-labels {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }

        .target-progress-labels .name {
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .target-progress-labels .nums {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.78rem;
          color: var(--text-secondary);
          font-weight: 700;
        }

        .target-progress-labels .sep {
          opacity: 0.4;
        }

        .pct-pill {
          padding: 2px 7px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          font-size: 0.68rem;
        }

        .target-bar-track {
          display: flex;
          width: 100%;
          height: 14px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-color);
        }

        .target-bar-achieved,
        .target-bar-remaining {
          height: 100%;
          transition: width 0.35s ease;
        }

        .target-bar-remaining {
          background: rgba(255, 255, 255, 0.08);
        }

        .target-bar-legend {
          display: flex;
          gap: 1rem;
          margin-top: 6px;
          font-size: 0.68rem;
          font-weight: 600;
          color: var(--text-muted);
        }

        .target-bar-legend i {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 2px;
          margin-right: 5px;
        }

        .target-bar-legend i.rem {
          background: rgba(255, 255, 255, 0.2);
        }

        .target-plan-warn {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 1rem;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid rgba(251, 191, 36, 0.35);
          background: rgba(251, 191, 36, 0.08);
          color: #fbbf24;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .target-plan-summary {
          padding: 1rem;
          border-radius: 10px;
          border: 1px solid rgba(216, 180, 254, 0.2);
          background: rgba(216, 180, 254, 0.05);
          margin-bottom: 1rem;
        }

        .target-plan-badge {
          display: inline-block;
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #d8b4fe;
          margin-bottom: 8px;
        }

        .target-plan-summary p {
          margin: 0 0 1rem;
          font-size: 0.88rem;
          line-height: 1.5;
          color: var(--text-primary);
        }

        .target-plan-kpis {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.75rem;
        }

        @media (max-width: 800px) {
          .target-plan-kpis {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        .target-plan-kpis span {
          display: block;
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 3px;
        }

        .target-plan-kpis strong {
          font-size: 0.95rem;
        }

        .target-plan-steps {
          margin: 0 0 1rem;
          padding-left: 1.2rem;
          color: var(--text-secondary);
          font-size: 0.84rem;
          line-height: 1.55;
        }

        .target-plan-steps li {
          margin-bottom: 0.45rem;
        }

        .target-plan-assumptions {
          margin: 0 0 1.25rem;
          padding-left: 1.2rem;
          font-size: 0.72rem;
          color: var(--text-muted);
          font-weight: 600;
        }

        .target-capital-section {
          margin-top: 0.5rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
        }

        .target-capital-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 1rem;
        }

        .target-capital-label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .target-capital-label strong {
          margin-left: auto;
          font-size: 0.85rem;
        }

        .target-capital-bars {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .target-cap-track {
          width: 100%;
          height: 10px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-color);
        }

        .target-cap-track.muted {
          opacity: 0.55;
          height: 6px;
        }

        .target-cap-need,
        .target-cap-held {
          height: 100%;
          border-radius: 999px;
          transition: width 0.35s ease;
        }

        .target-cap-held {
          opacity: 0.55;
        }

        .target-cap-legend {
          display: flex;
          justify-content: space-between;
          margin-top: 4px;
          font-size: 0.65rem;
          font-weight: 600;
          color: var(--text-muted);
        }

        :global(.spin) {
          animation: target-spin 0.8s linear infinite;
        }

        @keyframes target-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
