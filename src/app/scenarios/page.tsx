"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FlaskConical, Plus, Trash2, ChevronDown, ChevronUp,
  Wallet, Copy, BarChart3, TrendingUp,
  Pencil, Check, X
} from "lucide-react";

interface FdItem { id: string; institution: string; amount: number; rate: number; }
interface UtItem { id: string; fund: string; amount: number; rate: number; }
interface TrItem { id: string; type: string; amount: number; rate: number; tenureDaysOrYears: number; couponValue?: number; }
interface DivItem { id: string; company: string; amount: number; yearlyDividend: number; }
interface PfcaItem { id: string; institution: string; amount: number; rate: number; maturityType: "monthly" | "quarterly" | "maturity"; exchangeRate: number; depreciationRate?: number; }
interface PortfolioState { fds: FdItem[]; uts: UtItem[]; treasury: TrItem[]; dividends?: DivItem[]; pfcaFds?: PfcaItem[]; }

interface ScenarioItem {
  id: string;
  category: "fd" | "ut" | "treasury" | "dividend" | "pfca";
  label: string;
  amount: number;
  rate: number;
  couponValue?: number;
  yearlyDividend?: number;
  maturityType?: "monthly" | "quarterly" | "maturity";
  depreciationRate?: number;
}

interface Scenario {
  id: string;
  name: string;
  color: string;
  expanded: boolean;
  items: ScenarioItem[];
}

function calcGross(item: ScenarioItem): number {
  if (item.category === "dividend") return item.yearlyDividend ?? (item.amount * (item.rate / 100));
  if (item.category === "treasury" && item.couponValue) return item.couponValue * 2;
  if (item.category === "pfca") {
    // Interest only — USD capital gain is tracked separately
    const dep = (item.depreciationRate ?? 5) / 100;
    const r = item.rate / 100;
    return item.amount * r * (1 + dep);
  }
  return item.amount * (item.rate / 100);
}

function calcPfcaFxGain(item: ScenarioItem): number {
  if (item.category !== "pfca") return 0;
  const dep = (item.depreciationRate ?? 5) / 100;
  return item.amount * dep;
}

function calcReturns(item: ScenarioItem) {
  const interest = calcGross(item);
  const fxGain = calcPfcaFxGain(item);
  const gross = interest + fxGain;
  // UT yields are quoted net of WHT; dividends and PFCA carry no WHT.
  const noWht = item.category === "ut" || item.category === "dividend" || item.category === "pfca";
  const wht = noWht ? 0 : interest * 0.10;
  const netWht = gross - wht;
  const iitLiable = item.category !== "dividend" && item.category !== "pfca";
  return { gross, interest, fxGain, netWht, iitLiable };
}

/** YoA 2025/2026 Sri Lanka resident IIT — personal relief then progressive slabs */
const PERSONAL_RELIEF = 1_800_000;
const IIT_SLABS: { upTo: number; rate: number }[] = [
  { upTo: 1_000_000, rate: 0.06 },
  { upTo: 500_000, rate: 0.18 },
  { upTo: 500_000, rate: 0.24 },
  { upTo: 500_000, rate: 0.30 },
  { upTo: Infinity, rate: 0.36 },
];

function calcProgressiveIit(taxableIncome: number): { relief: number; taxableAfterRelief: number; tax: number } {
  const relief = Math.min(PERSONAL_RELIEF, Math.max(0, taxableIncome));
  let remaining = Math.max(0, taxableIncome - PERSONAL_RELIEF);
  let tax = 0;
  for (const slab of IIT_SLABS) {
    if (remaining <= 0) break;
    const slice = Math.min(remaining, slab.upTo);
    tax += slice * slab.rate;
    remaining -= slice;
  }
  return { relief, taxableAfterRelief: Math.max(0, taxableIncome - PERSONAL_RELIEF), tax };
}

function portfolioToItems(p: PortfolioState): ScenarioItem[] {
  const items: ScenarioItem[] = [];
  (p.fds || []).forEach(fd => items.push({ id: fd.id, category: "fd", label: fd.institution, amount: fd.amount, rate: fd.rate }));
  (p.uts || []).forEach(ut => items.push({ id: ut.id, category: "ut", label: ut.fund, amount: ut.amount, rate: ut.rate }));
  (p.treasury || []).forEach(tr => items.push({
    id: tr.id, category: "treasury",
    label: tr.type === "tbond" ? ("T-Bond " + tr.tenureDaysOrYears + "Y") : ("T-Bill " + tr.tenureDaysOrYears + "D"),
    amount: tr.amount, rate: tr.rate, couponValue: tr.couponValue
  }));
  (p.dividends || []).forEach(d => {
    const rate = d.amount > 0 ? (d.yearlyDividend / d.amount) * 100 : 0;
    items.push({
      id: d.id, category: "dividend", label: d.company,
      amount: d.amount, rate, yearlyDividend: d.yearlyDividend
    });
  });
  (p.pfcaFds || []).forEach(pf => {
    const fx = pf.exchangeRate || 310;
    items.push({
      id: pf.id, category: "pfca", label: pf.institution,
      amount: pf.amount * fx, rate: pf.rate, maturityType: pf.maturityType,
      depreciationRate: pf.depreciationRate ?? 5
    });
  });
  return items;
}

function calcTotals(items: ScenarioItem[]) {
  let invested = 0, gross = 0, netWht = 0;
  let coreInvested = 0, coreGross = 0;
  let taxFreeInvested = 0, taxFreeGross = 0;
  let pfcaInvested = 0, usdCapitalGain = 0;
  let iitAssessable = 0; // FD + UT + Treasury annual income (IIT-liable)
  items.forEach(it => {
    const r = calcReturns(it);
    invested += it.amount;
    gross += r.gross;
    netWht += r.netWht;
    if (r.iitLiable) iitAssessable += r.interest;
    if (it.category === "dividend" || it.category === "pfca") {
      taxFreeInvested += it.amount;
      taxFreeGross += r.interest; // interest / dividend only
      if (it.category === "pfca") {
        pfcaInvested += it.amount;
        usdCapitalGain += r.fxGain;
      }
    } else {
      coreInvested += it.amount;
      coreGross += r.gross;
    }
  });
  const progressive = calcProgressiveIit(iitAssessable);
  const netIit = gross - progressive.tax; // annual; divide by 12 for monthly display
  const coreYield = coreInvested > 0 ? (coreGross / coreInvested) * 100 : 0;
  const taxFreeYield = taxFreeInvested > 0 ? (taxFreeGross / taxFreeInvested) * 100 : 0;
  const usdCapitalGainYield = pfcaInvested > 0 ? (usdCapitalGain / pfcaInvested) * 100 : 0;
  const combinedYield = invested > 0 ? (gross / invested) * 100 : 0;
  const effectiveIitRate = iitAssessable > 0 ? (progressive.tax / iitAssessable) * 100 : 0;
  return {
    invested, gross, netWht, netIit,
    iitAssessable,
    iitRelief: progressive.relief,
    iitTaxable: progressive.taxableAfterRelief,
    iitTax: progressive.tax,
    effectiveIitRate,
    coreInvested, coreGross, coreYield,
    taxFreeInvested, taxFreeGross, taxFreeYield,
    usdCapitalGain, usdCapitalGainYield,
    combinedYield,
  };
}

const SC_COLORS = ["#00f2fe","#10b981","#a78bfa","#f59e0b","#ef4444","#06b6d4","#ec4899","#84cc16"];
const fmt = (n: number) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 0 }).format(n);
const pct = (n: number) => n.toFixed(2) + "%";
const catCol = (c: string) =>
  c === "fd" ? "var(--color-teal)"
  : c === "ut" ? "var(--color-emerald)"
  : c === "dividend" ? "#6366f1"
  : c === "pfca" ? "#f43f5e"
  : "var(--color-indigo)";
const catLabel = (c: string) =>
  c === "dividend" ? "DIV" : c === "pfca" ? "PFCA" : c.toUpperCase();

export default function ScenariosPage() {
  const [baseline, setBaseline] = useState<ScenarioItem[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [showCmp, setShowCmp] = useState(true);
  const [addCat, setAddCat] = useState<Record<string,"fd"|"ut"|"treasury"|"dividend"|"pfca">>({});
  const [addLabel, setAddLabel] = useState<Record<string,string>>({});
  const [addAmount, setAddAmount] = useState<Record<string,string>>({});
  const [addRate, setAddRate] = useState<Record<string,string>>({});
  const [addCoupon, setAddCoupon] = useState<Record<string,string>>({});
  const [addYearlyDiv, setAddYearlyDiv] = useState<Record<string,string>>({});
  const [addMaturity, setAddMaturity] = useState<Record<string,"monthly"|"quarterly"|"maturity">>({});
  const [addFx, setAddFx] = useState<Record<string,string>>({});
  const [addDepreciation, setAddDepreciation] = useState<Record<string,string>>({});

  useEffect(() => {
    try { const s = localStorage.getItem("lankawealth_portfolio"); if (s) setBaseline(portfolioToItems(JSON.parse(s))); } catch {}
    try { const s = localStorage.getItem("lankawealth_scenarios"); if (s) setScenarios(JSON.parse(s)); } catch {}
  }, []);

  const save = useCallback((sc: Scenario[]) => {
    setScenarios(sc);
    localStorage.setItem("lankawealth_scenarios", JSON.stringify(sc));
  }, []);

  const addScenario = (fromBaseline = false) => {
    const idx = scenarios.length;
    save([...scenarios, {
      id: Date.now().toString(),
      name: "Strategy " + (idx + 1),
      color: SC_COLORS[idx % SC_COLORS.length],
      expanded: true,
      items: fromBaseline ? baseline.map(b => ({ ...b, id: b.id + "_c" })) : [],
    }]);
  };

  const deleteSc = (id: string) => save(scenarios.filter(s => s.id !== id));
  const toggleExp = (id: string) => save(scenarios.map(s => s.id === id ? { ...s, expanded: !s.expanded } : s));
  const startRen = (s: Scenario) => { setEditingId(s.id); setEditName(s.name); };
  const commitRen = () => { save(scenarios.map(s => s.id === editingId ? { ...s, name: editName } : s)); setEditingId(null); };
  const removeItem = (sid: string, iid: string) => save(scenarios.map(s => s.id === sid ? { ...s, items: s.items.filter(i => i.id !== iid) } : s));

  const handleAdd = (sid: string) => {
    const cat = addCat[sid] || "fd";
    const amountRaw = parseFloat(addAmount[sid] || "0");
    if (!amountRaw) return;

    let rate = parseFloat(addRate[sid] || "0");
    let yearlyDividend: number | undefined;
    let amount = amountRaw;
    let maturityType: "monthly" | "quarterly" | "maturity" | undefined;

    if (cat === "dividend") {
      yearlyDividend = parseFloat(addYearlyDiv[sid] || "0");
      if (!yearlyDividend) return;
      rate = amount > 0 ? (yearlyDividend / amount) * 100 : 0;
    } else if (cat === "pfca") {
      if (!rate) return;
      const fx = parseFloat(addFx[sid] || "310") || 310;
      amount = amountRaw * fx; // USD → LKR for scenario totals
      maturityType = addMaturity[sid] || "maturity";
    } else if (!rate) {
      return;
    }

    const defaultLabel =
      cat === "fd" ? "FD"
      : cat === "ut" ? "UT"
      : cat === "dividend" ? "Dividend"
      : cat === "pfca" ? "PFCA FD"
      : "Treasury";

    const depRate = cat === "pfca"
      ? (parseFloat(addDepreciation[sid] || "5") || 5)
      : undefined;

    const ni: ScenarioItem = {
      id: Date.now().toString(), category: cat,
      label: addLabel[sid] || defaultLabel,
      amount, rate,
      couponValue: cat === "treasury" && addCoupon[sid] ? parseFloat(addCoupon[sid]) : undefined,
      yearlyDividend: cat === "dividend" ? yearlyDividend : undefined,
      maturityType: cat === "pfca" ? maturityType : undefined,
      depreciationRate: depRate,
    };
    save(scenarios.map(s => s.id === sid ? { ...s, items: [...s.items, ni] } : s));
    setAddLabel(p => ({ ...p, [sid]: "" }));
    setAddAmount(p => ({ ...p, [sid]: "" }));
    setAddRate(p => ({ ...p, [sid]: "" }));
    setAddCoupon(p => ({ ...p, [sid]: "" }));
    setAddYearlyDiv(p => ({ ...p, [sid]: "" }));
    setAddFx(p => ({ ...p, [sid]: "" }));
    setAddDepreciation(p => ({ ...p, [sid]: "" }));
  };

  const div = period === "monthly" ? 12 : 1;
  const baseTot = calcTotals(baseline);
  const allRows = [
    { name: "Current Portfolio", color: "#64748b", totals: baseTot },
    ...scenarios.map(s => ({ name: s.name, color: s.color, totals: calcTotals(s.items) }))
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"6px"}}>
          <FlaskConical size={28} style={{color:"var(--color-teal)"}} />
          <h1 className="page-title" style={{margin:0}}>What-If Scenario Planner</h1>
        </div>
        <p className="page-subtitle">Model different investment strategies and compare income after WHT and progressive IIT (YoA 2025/26: Rs. 1.8M relief, then 6% → 18% → 24% → 30% → 36%).</p>
      </div>

      <div className="sc-toolbar">
        <div style={{display:"flex",background:"rgba(255,255,255,0.02)",border:"1px solid var(--border-color)",borderRadius:"8px",padding:"2px",gap:"2px"}}>
          <button className={"sc-pb"+(period==="monthly"?" act":"")} onClick={()=>setPeriod("monthly")}>Monthly</button>
          <button className={"sc-pb"+(period==="annual"?" act":"")} onClick={()=>setPeriod("annual")}>Annual</button>
        </div>
        <div style={{display:"flex",gap:"10px",flexWrap:"wrap"}}>
          <button className="sc-btn sec" onClick={()=>addScenario(true)}>
            <Copy size={14} style={{marginRight:"4px"}} /> Clone from Portfolio
          </button>
          <button className="sc-btn pri" onClick={()=>addScenario(false)}>
            <Plus size={14} style={{marginRight:"4px"}} /> New Strategy
          </button>
        </div>
      </div>

      <div className="sc-base-card">
        <div className="sc-base-hdr">
          <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
            <div className="sc-dot" style={{background:"#64748b",boxShadow:"0 0 10px #64748b55"}} />
            <div>
              <div className="sc-sname">Current Portfolio &mdash; Baseline</div>
              <div className="sc-ssub">{baseline.length} investments &bull; {fmt(baseTot.invested)} total capital</div>
            </div>
          </div>
          <div className="sc-base-inv">{fmt(baseTot.invested)}<span>Total Invested</span></div>
        </div>
        {(baseTot.coreInvested > 0 || baseTot.taxFreeInvested > 0 || baseTot.usdCapitalGain > 0) && (
          <div className="sc-split-yields">
            {baseTot.coreInvested > 0 && (
              <div className="sc-sy core">
                <span className="sc-sy-lbl">FD + UT + Treasury</span>
                <span className="sc-sy-val">{pct(baseTot.coreYield)}</span>
                <span className="sc-sy-cap">{fmt(baseTot.coreInvested)}</span>
              </div>
            )}
            {baseTot.taxFreeInvested > 0 && (
              <div className="sc-sy taxfree">
                <span className="sc-sy-lbl">Dividend + PFCA</span>
                <span className="sc-sy-val">{pct(baseTot.taxFreeYield)}</span>
                <span className="sc-sy-cap">{fmt(baseTot.taxFreeInvested)}</span>
              </div>
            )}
            {baseTot.usdCapitalGain > 0 && (
              <div className="sc-sy usd-gain">
                <span className="sc-sy-lbl">USD Capital Gain</span>
                <span className="sc-sy-val">{pct(baseTot.usdCapitalGainYield)}</span>
                <span className="sc-sy-cap">{fmt(baseTot.usdCapitalGain/div)}/{period==="monthly"?"mo":"yr"}</span>
              </div>
            )}
            {baseTot.invested > 0 && (
              <div className="sc-sy combined">
                <span className="sc-sy-lbl">All Combined</span>
                <span className="sc-sy-val">{pct(baseTot.combinedYield)}</span>
                <span className="sc-sy-cap">{fmt(baseTot.invested)}</span>
              </div>
            )}
          </div>
        )}
        <div className="sc-inc-row">
          <div className="sc-inc-col"><span className="sc-clbl">Gross {period==="monthly"?"Monthly":"Annual"}</span><span className="sc-cval">{fmt(baseTot.gross/div)}</span></div>
          <div className="sc-inc-col"><span className="sc-clbl">Net (After WHT)</span><span className="sc-cval sc-em">{fmt(baseTot.netWht/div)}</span></div>
          <div className="sc-inc-col">
            <span className="sc-clbl">Net (After Progressive IIT)</span>
            <span className="sc-cval sc-pu">{fmt(baseTot.netIit/div)}</span>
            <span className="sc-iit-hint">
              Tax {fmt(baseTot.iitTax/div)} · Relief {fmt(PERSONAL_RELIEF)} · Eff. {pct(baseTot.effectiveIitRate)}
            </span>
          </div>
        </div>
        {baseline.length > 0 && (
          <div className="sc-base-pills">
            {baseline.map(item => {
              const r = calcReturns(item);
              return (
                <div key={item.id} className="sc-bpill" style={{borderColor:catCol(item.category)+"44"}}>
                  <span style={{color:catCol(item.category),fontSize:"0.67rem",fontWeight:800,textTransform:"uppercase"}}>{catLabel(item.category)}</span>
                  <span className="sc-bpl">{item.label}</span>
                  <span style={{color:"var(--text-muted)",fontSize:"0.7rem"}}>{pct(item.rate)}</span>
                  <span style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:"0.78rem"}}>{fmt(r.gross/div)}</span>
                </div>
              );
            })}
          </div>
        )}
        {baseline.length === 0 && <p style={{color:"var(--text-muted)",fontSize:"0.8rem",marginTop:"0.75rem"}}>No portfolio data found. Add investments in <strong>My Portfolio</strong> first.</p>}
      </div>

      {scenarios.length === 0 ? (
        <div className="sc-empty">
          <FlaskConical size={44} style={{color:"var(--text-muted)",opacity:0.2}} />
          <p>No strategies yet.</p>
          <p style={{fontSize:"0.82rem"}}>Click <strong>New Strategy</strong> or <strong>Clone from Portfolio</strong> to get started.</p>
        </div>
      ) : (
        <div className="sc-list">
          {scenarios.map(s => {
            const tot = calcTotals(s.items);
            const cat = addCat[s.id] || "fd";
            const diff = tot.netWht - baseTot.netWht;
            return (
              <div key={s.id} className="sc-card glass-card animate-fade-in" style={{borderColor:s.color+"33"}}>
                <div className="sc-shdr">
                  <div style={{display:"flex",alignItems:"center",gap:"12px",flex:1,minWidth:0}}>
                    <div className="sc-dot" style={{background:s.color,boxShadow:"0 0 10px "+s.color+"55"}} />
                    {editingId === s.id ? (
                      <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
                        <input value={editName} onChange={e=>setEditName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&commitRen()} className="sc-reninp glass-input" autoFocus />
                        <button className="sc-ibtn" onClick={commitRen}><Check size={14}/></button>
                        <button className="sc-ibtn" onClick={()=>setEditingId(null)}><X size={14}/></button>
                      </div>
                    ) : (
                      <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                        <span className="sc-sname">{s.name}</span>
                        <button className="sc-ibtn" onClick={()=>startRen(s)}><Pencil size={12}/></button>
                      </div>
                    )}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                    {diff !== 0 && <span className={"sc-dbdg"+(diff>0?" pos":" neg")}>{diff>0?"+":""}{fmt(Math.abs(diff)/div)}/{period==="monthly"?"mo":"yr"}</span>}
                    <button className="sc-ibtn" onClick={()=>toggleExp(s.id)}>{s.expanded?<ChevronUp size={16}/>:<ChevronDown size={16}/>}</button>
                    <button className="sc-ibtn dng" onClick={()=>deleteSc(s.id)}><Trash2 size={14}/></button>
                  </div>
                </div>
                <div className="sc-srow">
                  <div className="sc-spill"><span className="sc-plbl">Invested</span><span className="sc-pval">{fmt(tot.invested)}</span></div>
                  {tot.coreInvested > 0 && (
                    <div className="sc-spill">
                      <span className="sc-plbl">FD+UT+Treasury</span>
                      <span className="sc-pval" style={{color:"var(--color-teal)"}}>{pct(tot.coreYield)}</span>
                    </div>
                  )}
                  {tot.taxFreeInvested > 0 && (
                    <div className="sc-spill">
                      <span className="sc-plbl">Div+PFCA</span>
                      <span className="sc-pval" style={{color:"#818cf8"}}>{pct(tot.taxFreeYield)}</span>
                    </div>
                  )}
                  {tot.usdCapitalGain > 0 && (
                    <div className="sc-spill">
                      <span className="sc-plbl">USD Cap. Gain</span>
                      <span className="sc-pval" style={{color:"#fb7185"}}>{fmt(tot.usdCapitalGain/div)}/{period==="monthly"?"mo":"yr"}</span>
                    </div>
                  )}
                  {tot.invested > 0 && (
                    <div className="sc-spill">
                      <span className="sc-plbl">All Combined</span>
                      <span className="sc-pval sc-em">{pct(tot.combinedYield)}</span>
                    </div>
                  )}
                  <div className="sc-spill"><span className="sc-plbl">Gross {period==="monthly"?"Monthly":"Annual"}</span><span className="sc-pval">{fmt(tot.gross/div)}</span></div>
                  <div className="sc-spill"><span className="sc-plbl">Net (WHT)</span><span className="sc-pval sc-em">{fmt(tot.netWht/div)}</span></div>
                  <div className="sc-spill">
                    <span className="sc-plbl">Net (Prog. IIT)</span>
                    <span className="sc-pval sc-pu">{fmt(tot.netIit/div)}</span>
                  </div>
                  <div className="sc-spill">
                    <span className="sc-plbl">IIT Payable</span>
                    <span className="sc-pval" style={{color:"#f87171"}}>{fmt(tot.iitTax/div)}</span>
                  </div>
                  <div className="sc-spill"><span className="sc-plbl">Items</span><span className="sc-pval">{s.items.length}</span></div>
                </div>
                {s.expanded && (
                  <>
                    {s.items.length > 0 && (
                      <div className="sc-tblwrap">
                        <table className="sc-tbl">
                          <thead><tr>
                            <th>Investment</th><th>Invested</th><th>Rate</th>
                            <th>Gross {period==="monthly"?"Monthly":"Annual"}</th>
                            <th>Net (WHT)</th><th>IIT Status</th><th></th>
                          </tr></thead>
                          <tbody>
                            {s.items.map(item => {
                              const r = calcReturns(item);
                              return (
                                <tr key={item.id}>
                                  <td>
                                    <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                                      <span className="sc-cbdg" style={{color:catCol(item.category),borderColor:catCol(item.category)+"40",background:catCol(item.category)+"15"}}>{catLabel(item.category)}</span>
                                      <span style={{fontWeight:600,color:"var(--text-primary)"}}>{item.label}</span>
                                    </div>
                                  </td>
                                  <td style={{fontFamily:"var(--font-display)",fontWeight:700}}>{fmt(item.amount)}</td>
                                  <td style={{color:s.color,fontWeight:700}}>{pct(item.rate)}</td>
                                  <td style={{fontFamily:"var(--font-display)"}}>{fmt(r.gross/div)}</td>
                                  <td className="sc-em" style={{fontFamily:"var(--font-display)",fontWeight:700}}>{fmt(r.netWht/div)}</td>
                                  <td style={{fontSize:"0.72rem",fontWeight:700,color:r.iitLiable?"#d8b4fe":"var(--color-emerald)"}}>
                                    {r.iitLiable ? "In progressive pool" : "Tax-free"}
                                  </td>
                                  <td><button className="sc-ibtn dng" onClick={()=>removeItem(s.id,item.id)}><Trash2 size={12}/></button></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {tot.iitAssessable > 0 && (
                      <div className="sc-iit-box">
                        <div className="sc-iit-title">Progressive IIT (YoA 2025/26)</div>
                        <div className="sc-iit-grid">
                          <span>IIT-liable income (FD+UT+Treasury)</span><strong>{fmt(tot.iitAssessable)}</strong>
                          <span>Personal relief</span><strong>−{fmt(tot.iitRelief)}</strong>
                          <span>Taxable after relief</span><strong>{fmt(tot.iitTaxable)}</strong>
                          <span>IIT payable</span><strong style={{color:"#f87171"}}>{fmt(tot.iitTax)}</strong>
                          <span>Effective rate on liable income</span><strong className="sc-pu">{pct(tot.effectiveIitRate)}</strong>
                          <span>Net after progressive IIT</span><strong className="sc-pu">{fmt(tot.netIit)} /yr · {fmt(tot.netIit/12)} /mo</strong>
                        </div>
                        <div className="sc-iit-slabs">Slabs after relief: first 1M @ 6% · next 0.5M @ 18% · next 0.5M @ 24% · next 0.5M @ 30% · balance @ 36%. Dividends &amp; PFCA excluded.</div>
                      </div>
                    )}
                    <div className="sc-addform">
                      <div className="sc-ftitle"><Plus size={13}/> Add Investment to {s.name}</div>
                      <div className="sc-frow">
                        <div className="sc-fg">
                          <label>Category</label>
                          <select value={cat} onChange={e=>setAddCat(p=>({...p,[s.id]:e.target.value as "fd"|"ut"|"treasury"|"dividend"|"pfca"}))} className="glass-input" style={{background:"#0d1323"}}>
                            <option value="fd">Fixed Deposit</option>
                            <option value="ut">Unit Trust</option>
                            <option value="treasury">Treasury</option>
                            <option value="dividend">Dividend</option>
                            <option value="pfca">PFCA FD</option>
                          </select>
                        </div>
                        <div className="sc-fg" style={{flex:2}}>
                          <label>{cat==="dividend"?"Company":cat==="pfca"?"Bank / Institution":"Label / Name"}</label>
                          <input className="glass-input" value={addLabel[s.id]||""} onChange={e=>setAddLabel(p=>({...p,[s.id]:e.target.value}))} placeholder={cat==="fd"?"e.g. Sampath FD":cat==="ut"?"e.g. CAL MMF":cat==="dividend"?"e.g. Commercial Bank":cat==="pfca"?"e.g. HNB PFCA":"e.g. T-Bond 5Y"} />
                        </div>
                        <div className="sc-fg">
                          <label>{cat==="dividend"?"Investment (LKR)":cat==="pfca"?"Investment (USD)":"Amount (LKR)"}</label>
                          <input className="glass-input" type="number" value={addAmount[s.id]||""} onChange={e=>setAddAmount(p=>({...p,[s.id]:e.target.value}))} placeholder={cat==="pfca"?"10000":"1000000"} />
                        </div>
                        {cat==="dividend" ? (
                          <div className="sc-fg">
                            <label>Est. Yearly Dividend</label>
                            <input className="glass-input" type="number" value={addYearlyDiv[s.id]||""} onChange={e=>setAddYearlyDiv(p=>({...p,[s.id]:e.target.value}))} placeholder="25000" />
                          </div>
                        ) : (
                          <div className="sc-fg">
                            <label>Rate % p.a.</label>
                            <input className="glass-input" type="number" step="0.05" value={addRate[s.id]||""} onChange={e=>setAddRate(p=>({...p,[s.id]:e.target.value}))} placeholder={cat==="pfca"?"4.25":"11.5"} />
                          </div>
                        )}
                        {cat==="pfca" && (
                          <>
                            <div className="sc-fg">
                              <label>Maturity Type</label>
                              <select value={addMaturity[s.id]||"maturity"} onChange={e=>setAddMaturity(p=>({...p,[s.id]:e.target.value as "monthly"|"quarterly"|"maturity"}))} className="glass-input" style={{background:"#0d1323"}}>
                                <option value="maturity">At Maturity</option>
                                <option value="monthly">Monthly Interest</option>
                                <option value="quarterly">Quarterly Interest</option>
                              </select>
                            </div>
                            <div className="sc-fg">
                              <label>USD/LKR Rate</label>
                              <input className="glass-input" type="number" step="0.5" value={addFx[s.id]||"310"} onChange={e=>setAddFx(p=>({...p,[s.id]:e.target.value}))} placeholder="310" />
                            </div>
                            <div className="sc-fg">
                              <label>LKR Dep. % p.a.</label>
                              <input className="glass-input" type="number" step="0.1" value={addDepreciation[s.id]||"5"} onChange={e=>setAddDepreciation(p=>({...p,[s.id]:e.target.value}))} placeholder="5.0" />
                            </div>
                          </>
                        )}
                        {cat==="treasury" && (
                          <div className="sc-fg">
                            <label>Bi-Annual Coupon</label>
                            <input className="glass-input" type="number" value={addCoupon[s.id]||""} onChange={e=>setAddCoupon(p=>({...p,[s.id]:e.target.value}))} placeholder="Optional" />
                          </div>
                        )}
                        {cat==="ut" && (
                          <div className="sc-fg" style={{justifyContent:"center",paddingTop:"22px"}}>
                            <span style={{fontSize:"0.72rem",fontWeight:700,color:"#d8b4fe"}}>In progressive IIT pool</span>
                          </div>
                        )}
                        {(cat==="dividend" || cat==="pfca") && (
                          <div className="sc-fg" style={{justifyContent:"center",paddingTop:"22px"}}>
                            <span style={{fontSize:"0.72rem",fontWeight:700,color:"var(--color-emerald)"}}>Tax-Free</span>
                          </div>
                        )}
                        <div className="sc-fg" style={{justifyContent:"flex-end"}}>
                          <button className="sc-addbtn" onClick={()=>handleAdd(s.id)}>
                            <Plus size={14} style={{marginRight:"3px"}}/> Add
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {allRows.length > 1 && (
        <div className="sc-cmpsec glass-card">
          <div className="sc-cmphdr" onClick={()=>setShowCmp(v=>!v)}>
            <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
              <BarChart3 size={18} style={{color:"var(--color-teal)"}}/>
              <span className="sc-sttl">Side-by-Side Comparison</span>
            </div>
            {showCmp?<ChevronUp size={16}/>:<ChevronDown size={16}/>}
          </div>
          {showCmp && (
            <div>
              <div className="sc-cmpwrap">
                <table className="sc-cmptbl">
                  <thead><tr>
                    <th>Strategy</th><th>Total Invested</th>
                    <th>FD+UT+Treasury</th><th>Div+PFCA</th><th>USD Cap. Gain</th><th>All Combined</th>
                    <th>Gross {period==="monthly"?"Monthly":"Annual"}</th>
                    <th>Net (After WHT)</th><th>IIT Payable</th><th>Net (Prog. IIT)</th><th>vs Baseline</th>
                  </tr></thead>
                  <tbody>
                    {allRows.map((row, idx) => {
                      const dv = idx === 0 ? null : row.totals.netIit - baseTot.netIit;
                      return (
                        <tr key={idx} style={idx===0?{background:"rgba(255,255,255,0.006)"}:{}}>
                          <td><div style={{display:"flex",alignItems:"center",gap:"8px"}}><div style={{width:"9px",height:"9px",borderRadius:"50%",background:row.color,flexShrink:0}}/><span style={{fontWeight:700,color:row.color}}>{row.name}</span></div></td>
                          <td style={{fontFamily:"var(--font-display)",fontWeight:700}}>{fmt(row.totals.invested)}</td>
                          <td style={{color:"var(--color-teal)",fontWeight:700}}>{row.totals.coreInvested > 0 ? pct(row.totals.coreYield) : "—"}</td>
                          <td style={{color:"#818cf8",fontWeight:700}}>{row.totals.taxFreeInvested > 0 ? pct(row.totals.taxFreeYield) : "—"}</td>
                          <td style={{color:"#fb7185",fontWeight:700}}>{row.totals.usdCapitalGain > 0 ? fmt(row.totals.usdCapitalGain/div) : "—"}</td>
                          <td className="sc-em" style={{fontWeight:700}}>{row.totals.invested > 0 ? pct(row.totals.combinedYield) : "—"}</td>
                          <td style={{fontFamily:"var(--font-display)"}}>{fmt(row.totals.gross/div)}</td>
                          <td className="sc-em" style={{fontFamily:"var(--font-display)",fontWeight:700}}>{fmt(row.totals.netWht/div)}</td>
                          <td style={{fontFamily:"var(--font-display)",fontWeight:700,color:"#f87171"}}>{fmt(row.totals.iitTax/div)}</td>
                          <td className="sc-pu" style={{fontFamily:"var(--font-display)",fontWeight:700}}>{fmt(row.totals.netIit/div)}</td>
                          <td>
                            {dv!==null&&<span className={"sc-dbdg"+(dv>=0?" pos":" neg")}>{dv>=0?"+":""}{fmt(Math.abs(dv)/div)}/{period==="monthly"?"mo":"yr"}</span>}
                            {idx===0&&<span style={{color:"var(--text-muted)",fontSize:"0.72rem"}}>Reference</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {scenarios.length > 0 && (() => {
                const best = allRows.slice(1).reduce((a,b)=>a.totals.netIit>b.totals.netIit?a:b);
                return (
                  <div className="sc-bestbdg">
                    <TrendingUp size={16} style={{color:best.color}}/>
                    <span><strong style={{color:best.color}}>{best.name}</strong> yields the highest net income after progressive IIT &mdash; <strong>{fmt(best.totals.netIit/div)}/{period==="monthly"?"mo":"yr"}</strong></span>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .page-container{padding:2rem;max-width:1400px}
        .sc-toolbar{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;margin-bottom:1.5rem}
        .sc-pb{background:none;border:none;color:var(--text-secondary);font-family:var(--font-body);font-size:.75rem;font-weight:700;padding:.5rem 1rem;border-radius:6px;cursor:pointer;transition:all .2s}
        .sc-pb.act{background:var(--bg-secondary);color:var(--color-teal)}
        .sc-btn{display:inline-flex;align-items:center;border:none;border-radius:8px;font-size:.8rem;font-weight:700;padding:.55rem 1.1rem;cursor:pointer;transition:all .2s}
        .sc-btn.pri{background:linear-gradient(135deg,var(--color-teal) 0%,var(--color-indigo) 100%);color:#04060c}
        .sc-btn.sec{background:rgba(255,255,255,.04);border:1px solid var(--border-color);color:var(--text-primary)}
        .sc-btn.pri:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,242,254,.25)}
        .sc-btn.sec:hover{background:rgba(255,255,255,.09)}
        .sc-base-card{background:linear-gradient(135deg,rgba(100,116,139,.07) 0%,rgba(9,14,26,.4) 100%);border:1px solid rgba(100,116,139,.22);border-radius:12px;padding:1.25rem 1.5rem;margin-bottom:1.5rem}
        .sc-base-hdr{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;margin-bottom:1rem}
        .sc-base-inv{display:flex;flex-direction:column;align-items:flex-end;font-family:var(--font-display);font-size:1.4rem;font-weight:800;color:var(--text-primary)}
        .sc-base-inv span{font-size:.7rem;font-weight:500;color:var(--text-muted);font-family:var(--font-body);margin-top:2px}
        .sc-split-yields{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:1rem}
        .sc-sy{display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:8px;border:1px solid;font-size:.72rem}
        .sc-sy.core{background:rgba(0,242,254,.06);border-color:rgba(0,242,254,.2)}
        .sc-sy.taxfree{background:rgba(99,102,241,.08);border-color:rgba(99,102,241,.22)}
        .sc-sy.usd-gain{background:rgba(244,63,94,.08);border-color:rgba(244,63,94,.22)}
        .sc-sy.combined{background:rgba(16,185,129,.08);border-color:rgba(16,185,129,.22)}
        .sc-sy-lbl{font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.03em}
        .sc-sy-val{font-family:var(--font-display);font-weight:800;font-size:.9rem}
        .sc-sy.core .sc-sy-val{color:var(--color-teal)}
        .sc-sy.taxfree .sc-sy-val{color:#818cf8}
        .sc-sy.usd-gain .sc-sy-val{color:#fb7185}
        .sc-sy.combined .sc-sy-val{color:var(--color-emerald)}
        .sc-sy-cap{color:var(--text-secondary);font-weight:600;padding-left:6px;border-left:1px solid var(--border-color)}
        .sc-inc-row{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1rem}
        .sc-inc-col{display:flex;flex-direction:column;gap:4px}
        .sc-clbl{font-size:.7rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em}
        .sc-cval{font-family:var(--font-display);font-size:1.15rem;font-weight:800}
        .sc-iit-hint{font-size:.65rem;color:var(--text-muted);font-weight:600;margin-top:2px;line-height:1.3}
        .sc-iit-box{margin:0 0 1rem;padding:12px 14px;border-radius:10px;border:1px solid rgba(216,180,254,.2);background:rgba(216,180,254,.05)}
        .sc-iit-title{font-size:.72rem;font-weight:800;color:#d8b4fe;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px}
        .sc-iit-grid{display:grid;grid-template-columns:1fr auto;gap:4px 16px;font-size:.75rem;color:var(--text-secondary)}
        .sc-iit-grid strong{font-family:var(--font-display);font-weight:700;color:var(--text-primary);text-align:right}
        .sc-iit-slabs{margin-top:8px;font-size:.65rem;color:var(--text-muted);line-height:1.4}
        .sc-base-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:.5rem;padding-top:.75rem;border-top:1px solid var(--border-color)}
        .sc-bpill{display:flex;align-items:center;gap:8px;padding:4px 10px;border:1px solid;border-radius:20px;background:rgba(255,255,255,.02)}
        .sc-bpl{font-size:.72rem;font-weight:700;white-space:nowrap;max-width:130px;overflow:hidden;text-overflow:ellipsis;color:var(--text-primary)}
        .sc-empty{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;padding:3rem 2rem;color:var(--text-secondary);font-size:.875rem}
        .sc-list{display:flex;flex-direction:column;gap:1.25rem;margin-bottom:2rem}
        .sc-card{padding:1.25rem 1.5rem;transition:all .2s}
        .sc-shdr{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:.9rem}
        .sc-dot{width:14px;height:14px;border-radius:50%;flex-shrink:0}
        .sc-sname{font-family:var(--font-display);font-size:1rem;font-weight:700;color:var(--text-primary)}
        .sc-ssub{font-size:.72rem;color:var(--text-muted);margin-top:2px}
        .sc-reninp{padding:4px 8px;font-size:.9rem;width:180px}
        .sc-ibtn{background:none;border:none;color:var(--text-muted);cursor:pointer;padding:4px;border-radius:4px;transition:all .2s;display:flex;align-items:center}
        .sc-ibtn:hover{color:var(--text-primary);background:rgba(255,255,255,.06)}
        .sc-ibtn.dng:hover{color:#ef4444;background:rgba(239,68,68,.08)}
        .sc-dbdg{font-size:.72rem;font-weight:700;padding:3px 9px;border-radius:20px;white-space:nowrap}
        .sc-dbdg.pos{background:rgba(16,185,129,.12);color:var(--color-emerald);border:1px solid rgba(16,185,129,.2)}
        .sc-dbdg.neg{background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.18)}
        .sc-srow{display:flex;gap:1rem;flex-wrap:wrap;padding:.75rem 1rem;background:rgba(255,255,255,.02);border:1px solid var(--border-color);border-radius:8px;margin-bottom:1rem}
        .sc-spill{display:flex;flex-direction:column;gap:2px;min-width:80px}
        .sc-plbl{font-size:.67rem;font-weight:600;color:var(--text-muted);text-transform:uppercase}
        .sc-pval{font-family:var(--font-display);font-size:.95rem;font-weight:700}
        .sc-cbdg{font-size:.62rem;font-weight:800;padding:1px 5px;border-radius:4px;border:1px solid;letter-spacing:.04em}
        .sc-tblwrap{overflow-x:auto;border:1px solid var(--border-color);border-radius:8px;margin-bottom:1rem;background:rgba(4,6,12,.2)}
        .sc-tbl{width:100%;border-collapse:collapse;font-size:.775rem}
        .sc-tbl th{background:rgba(255,255,255,.01);color:var(--text-muted);padding:7px 10px;font-weight:600;border-bottom:1px solid var(--border-color);text-align:left;white-space:nowrap}
        .sc-tbl td{padding:7px 10px;border-bottom:1px solid rgba(255,255,255,.025);color:var(--text-secondary)}
        .sc-tbl tr:last-child td{border-bottom:none}
        .sc-addform{background:rgba(255,255,255,.015);border:1px dashed var(--border-color);border-radius:8px;padding:1rem}
        .sc-ftitle{display:flex;align-items:center;gap:6px;font-size:.76rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.75rem}
        .sc-frow{display:flex;flex-wrap:wrap;gap:.75rem;align-items:flex-start}
        .sc-fg{display:flex;flex-direction:column;gap:4px;min-width:110px}
        .sc-fg label{font-size:.72rem;font-weight:600;color:var(--text-secondary)}
        .sc-addbtn{display:inline-flex;align-items:center;background:linear-gradient(135deg,var(--color-teal) 0%,var(--color-indigo) 100%);border:none;color:#04060c;padding:.5rem 1rem;border-radius:7px;font-size:.8rem;font-weight:700;cursor:pointer;transition:all .2s;margin-top:20px}
        .sc-addbtn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,242,254,.2)}
        .sc-cmpsec{padding:1.25rem 1.5rem;margin-top:0}
        .sc-cmphdr{display:flex;justify-content:space-between;align-items:center;cursor:pointer;user-select:none;padding-bottom:1rem;border-bottom:1px solid var(--border-color);margin-bottom:1rem}
        .sc-sttl{font-family:var(--font-display);font-size:1rem;font-weight:700}
        .sc-cmpwrap{overflow-x:auto;border:1px solid var(--border-color);border-radius:8px;margin-bottom:1rem}
        .sc-cmptbl{width:100%;border-collapse:collapse;font-size:.8rem}
        .sc-cmptbl th{background:rgba(255,255,255,.01);color:var(--text-muted);padding:8px 12px;font-weight:600;border-bottom:1px solid var(--border-color);text-align:left;white-space:nowrap}
        .sc-cmptbl td{padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.025);color:var(--text-secondary);white-space:nowrap}
        .sc-cmptbl tr:last-child td{border-bottom:none}
        .sc-bestbdg{display:flex;align-items:center;gap:10px;background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.15);border-radius:8px;padding:10px 14px;font-size:.82rem;color:var(--text-secondary)}
        .sc-em{color:var(--color-emerald)}
        .sc-pu{color:#d8b4fe}
        @media(max-width:768px){.sc-inc-row{grid-template-columns:1fr}}
      `}</style>
    </div>
  );
}
