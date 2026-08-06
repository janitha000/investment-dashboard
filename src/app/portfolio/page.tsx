"use client";

import React, { useState, useEffect } from "react";
import { useRates } from "@/context/RatesContext";
import { Landmark, Compass, Wallet, Plus, Trash2, Info, Briefcase, Percent, ShieldCheck } from "lucide-react";

interface FdInvestment {
  id: string;
  institution: string;
  amount: number;
  rate: number;
  tenureMonths: number;
  payout: "monthly" | "quarterly" | "maturity";
}

interface UtInvestment {
  id: string;
  fund: string;
  amount: number;
  rate: number;
}

interface TreasuryInvestment {
  id: string;
  type: "tbill" | "tbond";
  amount: number;
  rate: number;
  tenureDaysOrYears: number; // Days for bill, Years for bond
}

interface PortfolioState {
  fds: FdInvestment[];
  uts: UtInvestment[];
  treasury: TreasuryInvestment[];
}

const INITIAL_STATE: PortfolioState = {
  fds: [],
  uts: [],
  treasury: []
};

export default function PortfolioPage() {
  const { rates } = useRates();
  const [portfolio, setPortfolio] = useState<PortfolioState>(INITIAL_STATE);
  const [activeTab, setActiveTab] = useState<"fds" | "uts" | "treasury">("fds");
  const [incomePeriod, setIncomePeriod] = useState<"monthly" | "annual">("monthly");

  // Input states for FD Form
  const [fdInst, setFdInst] = useState<string>("Commercial Bank of Ceylon");
  const [fdAmount, setFdAmount] = useState<string>("");
  const [fdRate, setFdRate] = useState<string>("");
  const [fdTenure, setFdTenure] = useState<number>(12);
  const [fdPayout, setFdPayout] = useState<"monthly" | "quarterly" | "maturity">("maturity");

  // Input states for UT Form
  const [utFund, setUtFund] = useState<string>("CAL Money Market Fund");
  const [utAmount, setUtAmount] = useState<string>("");
  const [utRate, setUtRate] = useState<string>("");

  // Input states for Treasury Form
  const [trType, setTrType] = useState<"tbill" | "tbond">("tbill");
  const [trAmount, setTrAmount] = useState<string>("");
  const [trRate, setTrRate] = useState<string>("");
  const [trTenure, setTrTenure] = useState<number>(364);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem("lankawealth_portfolio");
    if (saved) {
      try {
        setPortfolio(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse portfolio", e);
      }
    }
  }, []);

  // Save to local storage
  const savePortfolio = (updated: PortfolioState) => {
    setPortfolio(updated);
    localStorage.setItem("lankawealth_portfolio", JSON.stringify(updated));
  };

  const handleAddFd = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(fdAmount);
    const rateNum = parseFloat(fdRate);
    if (!amountNum || !rateNum) return;

    const newItem: FdInvestment = {
      id: Date.now().toString(),
      institution: fdInst,
      amount: amountNum,
      rate: rateNum,
      tenureMonths: fdTenure,
      payout: fdPayout
    };

    const updated = {
      ...portfolio,
      fds: [...portfolio.fds, newItem]
    };
    savePortfolio(updated);
    setFdAmount("");
    setFdRate("");
  };

  const handleAddUt = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(utAmount);
    const rateNum = parseFloat(utRate);
    if (!amountNum || !rateNum) return;

    const newItem: UtInvestment = {
      id: Date.now().toString(),
      fund: utFund,
      amount: amountNum,
      rate: rateNum
    };

    const updated = {
      ...portfolio,
      uts: [...portfolio.uts, newItem]
    };
    savePortfolio(updated);
    setUtAmount("");
    setUtRate("");
  };

  const handleAddTreasury = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(trAmount);
    const rateNum = parseFloat(trRate);
    if (!amountNum || !rateNum) return;

    const newItem: TreasuryInvestment = {
      id: Date.now().toString(),
      type: trType,
      amount: amountNum,
      rate: rateNum,
      tenureDaysOrYears: trTenure
    };

    const updated = {
      ...portfolio,
      treasury: [...portfolio.treasury, newItem]
    };
    savePortfolio(updated);
    setTrAmount("");
    setTrRate("");
  };

  const handleDeleteItem = (category: "fds" | "uts" | "treasury", id: string) => {
    const updated = {
      ...portfolio,
      [category]: portfolio[category].filter((item) => item.id !== id)
    };
    savePortfolio(updated);
  };

  const formatLKR = (num: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Calculations per category
  const calculateFdReturns = (item: FdInvestment) => {
    const annualGross = item.amount * (item.rate / 100);
    const wht = annualGross * 0.10;
    const netWht = annualGross - wht;
    const iit36 = annualGross * 0.36;
    const netIit = annualGross - iit36;
    return { annualGross, wht, netWht, iit36, netIit };
  };

  const calculateUtReturns = (item: UtInvestment) => {
    const annualGross = item.amount * (item.rate / 100);
    const wht = 0; // WHT free!
    const netWht = annualGross;
    const iit36 = 0; // Dividends / capital gains are tax free!
    const netIit = annualGross;
    return { annualGross, wht, netWht, iit36, netIit };
  };

  const calculateTreasuryReturns = (item: TreasuryInvestment) => {
    const annualGross = item.amount * (item.rate / 100);
    const wht = annualGross * 0.10;
    const netWht = annualGross - wht;
    const iit36 = annualGross * 0.36;
    const netIit = annualGross - iit36;
    return { annualGross, wht, netWht, iit36, netIit };
  };

  // Totals for summary panel
  const fdTotals = portfolio.fds.reduce((acc, item) => {
    const res = calculateFdReturns(item);
    acc.invested += item.amount;
    acc.gross += res.annualGross;
    acc.netWht += res.netWht;
    acc.whtDeducted += res.wht;
    acc.netIit += res.netIit;
    return acc;
  }, { invested: 0, gross: 0, netWht: 0, whtDeducted: 0, netIit: 0 });

  const utTotals = portfolio.uts.reduce((acc, item) => {
    const res = calculateUtReturns(item);
    acc.invested += item.amount;
    acc.gross += res.annualGross;
    acc.netWht += res.netWht;
    acc.whtDeducted += res.wht;
    acc.netIit += res.netIit;
    return acc;
  }, { invested: 0, gross: 0, netWht: 0, whtDeducted: 0, netIit: 0 });

  const treasuryTotals = portfolio.treasury.reduce((acc, item) => {
    const res = calculateTreasuryReturns(item);
    acc.invested += item.amount;
    acc.gross += res.annualGross;
    acc.netWht += res.netWht;
    acc.whtDeducted += res.wht;
    acc.netIit += res.netIit;
    return acc;
  }, { invested: 0, gross: 0, netWht: 0, whtDeducted: 0, netIit: 0 });

  const grandTotalInvested = fdTotals.invested + utTotals.invested + treasuryTotals.invested;
  const grandTotalGross = fdTotals.gross + utTotals.gross + treasuryTotals.gross;
  const grandTotalNetWht = fdTotals.netWht + utTotals.netWht + treasuryTotals.netWht;
  const grandTotalWht = fdTotals.whtDeducted + utTotals.whtDeducted + treasuryTotals.whtDeducted;
  const grandTotalNetIit = fdTotals.netIit + utTotals.netIit + treasuryTotals.netIit;

  // Preset rates autocomplete when forms load
  useEffect(() => {
    if (activeTab === "fds" && rates?.fixedDeposit?.bankAverage12m) {
      setFdRate(rates.fixedDeposit.bankAverage12m.toString());
    } else if (activeTab === "uts" && rates?.unitTrust?.moneyMarketYield) {
      setUtRate(rates.unitTrust.moneyMarketYield.toString());
    } else if (activeTab === "treasury" && rates?.treasury?.tb12m) {
      setTrRate(rates.treasury.tb12m.toString());
    }
  }, [activeTab, rates]);

  return (
    <div className="animate-fade-in text-sans-layout">
      <div className="page-header-container">
        <span className="badge badge-teal">My Capital</span>
        <h1 className="page-title">Current Investment Portfolio</h1>
        <p className="page-subtitle">
          Manage your active investments, track annual interest flows, and compare income yields under standard WHT vs. 36% personal tax brackets.
        </p>
      </div>

      {/* Grand Portfolio Overview Stats with Monthly/Annual Period Tabs */}
      <div className="portfolio-overview-card glass-card">
        <div className="portfolio-overview-header">
          <div className="overview-title-info">
            <span className="summary-lbl">Total Capital Invested</span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
              <span className="summary-val text-teal" style={{ fontSize: "1.7rem", marginTop: "4px" }}>
                {formatLKR(grandTotalInvested)}
              </span>
              {grandTotalInvested > 0 && (
                <span className="badge badge-teal" style={{ fontSize: "0.75rem", padding: "2px 6px" }}>
                  {((grandTotalGross / grandTotalInvested) * 100).toFixed(2)}% Weighted Yield
                </span>
              )}
            </div>
          </div>

          <div className="income-period-tabs">
            <button 
              className={`period-tab-btn ${incomePeriod === "monthly" ? "active" : ""}`}
              onClick={() => setIncomePeriod("monthly")}
            >
              Monthly Income
            </button>
            <button 
              className={`period-tab-btn ${incomePeriod === "annual" ? "active" : ""}`}
              onClick={() => setIncomePeriod("annual")}
            >
              Annual Income
            </button>
          </div>
        </div>

        <div className="divider-h" style={{ margin: "1.25rem 0" }} />

        <div className="portfolio-summary-bar">
          <div className="summary-col">
            <span className="summary-lbl">
              {incomePeriod === "monthly" ? "Gross Monthly Income" : "Gross Annual Income"}
            </span>
            <span className="summary-val text-teal">
              {formatLKR(incomePeriod === "monthly" ? grandTotalGross / 12 : grandTotalGross)}
            </span>
          </div>
          <div className="summary-col">
            <span className="summary-lbl">
              {incomePeriod === "monthly" ? "Net Monthly (After WHT)" : "Net Annual (After WHT)"}
            </span>
            <span className="summary-val text-emerald">
              {formatLKR(incomePeriod === "monthly" ? grandTotalNetWht / 12 : grandTotalNetWht)}
            </span>
          </div>
          <div className="summary-col">
            <span className="summary-lbl">
              {incomePeriod === "monthly" ? "Net Monthly (After 36% IIT)" : "Net Annual (After 36% IIT)"}
            </span>
            <span className="summary-val" style={{ color: "#d8b4fe" }}>
              {formatLKR(incomePeriod === "monthly" ? grandTotalNetIit / 12 : grandTotalNetIit)}
            </span>
          </div>
        </div>
      </div>

      {/* Category Wise Totals Cards */}
      <div className="category-totals-row">
        {/* FD Totals Card */}
        <div className="glass-card category-total-card animate-fade-in">
          <div className="card-header">
            <div className="title-box">
              <Landmark size={18} className="icon-fd" />
              <h5>Fixed Deposits (FD)</h5>
            </div>
            <span className="badge badge-teal">FD Total</span>
          </div>
          <div className="total-capital-row">
            <span className="lbl">Total Invested:</span>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <span className="val text-teal">{formatLKR(fdTotals.invested)}</span>
              {fdTotals.invested > 0 && (
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "600", marginTop: "2px" }}>
                  Avg. Rate: {((fdTotals.gross / fdTotals.invested) * 100).toFixed(2)}% p.a.
                </span>
              )}
            </div>
          </div>
          <div className="divider-h" style={{ margin: "8px 0" }} />
          <div className="category-metrics-list">
            <div className="metric-item">
              <span>Gross {incomePeriod === "monthly" ? "Monthly" : "Annual"} Income:</span>
              <span className="val-text">{formatLKR(incomePeriod === "monthly" ? fdTotals.gross / 12 : fdTotals.gross)}</span>
            </div>
            <div className="metric-item">
              <span>Net {incomePeriod === "monthly" ? "Monthly" : "Annual"} (WHT):</span>
              <span className="val-text text-emerald">{formatLKR(incomePeriod === "monthly" ? fdTotals.netWht / 12 : fdTotals.netWht)}</span>
            </div>
            <div className="metric-item">
              <span>Net {incomePeriod === "monthly" ? "Monthly" : "Annual"} (36% IIT):</span>
              <span className="val-text" style={{ color: "#d8b4fe" }}>{formatLKR(incomePeriod === "monthly" ? fdTotals.netIit / 12 : fdTotals.netIit)}</span>
            </div>
          </div>
        </div>

        {/* UT Totals Card */}
        <div className="glass-card category-total-card animate-fade-in">
          <div className="card-header">
            <div className="title-box">
              <Compass size={18} className="icon-ut" />
              <h5>Unit Trusts (UT)</h5>
            </div>
            <span className="badge badge-emerald">UT Total</span>
          </div>
          <div className="total-capital-row">
            <span className="lbl">Total Invested:</span>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <span className="val text-emerald">{formatLKR(utTotals.invested)}</span>
              {utTotals.invested > 0 && (
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "600", marginTop: "2px" }}>
                  Avg. Yield: {((utTotals.gross / utTotals.invested) * 100).toFixed(2)}% p.a.
                </span>
              )}
            </div>
          </div>
          <div className="divider-h" style={{ margin: "8px 0" }} />
          <div className="category-metrics-list">
            <div className="metric-item">
              <span>Gross {incomePeriod === "monthly" ? "Monthly" : "Annual"} Income:</span>
              <span className="val-text">{formatLKR(incomePeriod === "monthly" ? utTotals.gross / 12 : utTotals.gross)}</span>
            </div>
            <div className="metric-item">
              <span>Net {incomePeriod === "monthly" ? "Monthly" : "Annual"} (WHT):</span>
              <span className="val-text text-emerald">{formatLKR(incomePeriod === "monthly" ? utTotals.netWht / 12 : utTotals.netWht)}</span>
            </div>
            <div className="metric-item">
              <span>Net {incomePeriod === "monthly" ? "Monthly" : "Annual"} (36% IIT):</span>
              <span className="val-text" style={{ color: "#d8b4fe" }}>{formatLKR(incomePeriod === "monthly" ? utTotals.netIit / 12 : utTotals.netIit)}</span>
            </div>
          </div>
        </div>

        {/* Treasury Totals Card */}
        <div className="glass-card category-total-card animate-fade-in">
          <div className="card-header">
            <div className="title-box">
              <Wallet size={18} className="icon-tr" />
              <h5>Treasury Securities</h5>
            </div>
            <span className="badge badge-indigo">Treasury Total</span>
          </div>
          <div className="total-capital-row">
            <span className="lbl">Total Invested:</span>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <span className="val text-indigo">{formatLKR(treasuryTotals.invested)}</span>
              {treasuryTotals.invested > 0 && (
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "600", marginTop: "2px" }}>
                  Avg. Rate: {((treasuryTotals.gross / treasuryTotals.invested) * 100).toFixed(2)}% p.a.
                </span>
              )}
            </div>
          </div>
          <div className="divider-h" style={{ margin: "8px 0" }} />
          <div className="category-metrics-list">
            <div className="metric-item">
              <span>Gross {incomePeriod === "monthly" ? "Monthly" : "Annual"} Income:</span>
              <span className="val-text">{formatLKR(incomePeriod === "monthly" ? treasuryTotals.gross / 12 : treasuryTotals.gross)}</span>
            </div>
            <div className="metric-item">
              <span>Net {incomePeriod === "monthly" ? "Monthly" : "Annual"} (WHT):</span>
              <span className="val-text text-emerald">{formatLKR(incomePeriod === "monthly" ? treasuryTotals.netWht / 12 : treasuryTotals.netWht)}</span>
            </div>
            <div className="metric-item">
              <span>Net {incomePeriod === "monthly" ? "Monthly" : "Annual"} (36% IIT):</span>
              <span className="val-text" style={{ color: "#d8b4fe" }}>{formatLKR(incomePeriod === "monthly" ? treasuryTotals.netIit / 12 : treasuryTotals.netIit)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Container */}
      <div className="portfolio-tabs-container">
        <div className="tabs-header-row">
          <button 
            className={`tab-link ${activeTab === "fds" ? "active" : ""}`}
            onClick={() => setActiveTab("fds")}
          >
            <Landmark size={16} className="tab-icon" />
            Fixed Deposits ({portfolio.fds.length})
          </button>
          <button 
            className={`tab-link ${activeTab === "uts" ? "active" : ""}`}
            onClick={() => setActiveTab("uts")}
          >
            <Compass size={16} className="tab-icon" />
            Unit Trusts ({portfolio.uts.length})
          </button>
          <button 
            className={`tab-link ${activeTab === "treasury" ? "active" : ""}`}
            onClick={() => setActiveTab("treasury")}
          >
            <Wallet size={16} className="tab-icon" />
            Treasury ({portfolio.treasury.length})
          </button>
        </div>

        <div className="tab-content-panel">
          {/* FDs TAB */}
          {activeTab === "fds" && (
            <div className="tab-layout-grid">
              {/* Form card */}
              <div className="glass-card form-card">
                <h4><Plus size={18} style={{ color: "var(--color-teal)", marginRight: "6px" }} /> Add FD Investment</h4>
                <form onSubmit={handleAddFd} className="form-inputs-group">
                  <div className="input-group">
                    <label>Institution Name</label>
                    <input 
                      type="text" 
                      value={fdInst} 
                      onChange={(e) => setFdInst(e.target.value)} 
                      placeholder="e.g. Commercial Bank"
                      className="glass-input"
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label>Invested Amount (LKR)</label>
                    <input 
                      type="number" 
                      value={fdAmount} 
                      onChange={(e) => setFdAmount(e.target.value)} 
                      placeholder="e.g. 1000000"
                      className="glass-input"
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label>Interest Rate (% p.a.)</label>
                    <input 
                      type="number" 
                      step="0.05"
                      value={fdRate} 
                      onChange={(e) => setFdRate(e.target.value)} 
                      placeholder="e.g. 9.75"
                      className="glass-input"
                      required
                    />
                  </div>
                  <div className="input-row-double">
                    <div className="input-group">
                      <label>Tenure</label>
                      <select 
                        value={fdTenure}
                        onChange={(e) => setFdTenure(parseInt(e.target.value))}
                        className="glass-input"
                        style={{ background: "#0d1323" }}
                      >
                        <option value={12}>12 Months (1Y)</option>
                        <option value={24}>24 Months (2Y)</option>
                        <option value={36}>36 Months (3Y)</option>
                        <option value={48}>48 Months (4Y)</option>
                        <option value={60}>60 Months (5Y)</option>
                        <option value={72}>72 Months (6Y)</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Payout Frequency</label>
                      <select 
                        value={fdPayout}
                        onChange={(e) => setFdPayout(e.target.value as any)}
                        className="glass-input"
                        style={{ background: "#0d1323" }}
                      >
                        <option value="maturity">At Maturity</option>
                        <option value="monthly">Monthly Payout</option>
                        <option value="quarterly">Quarterly Payout</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="add-btn fds-btn">
                    Add FD to Portfolio
                  </button>
                </form>
              </div>

              {/* Items list */}
              <div className="items-list-box">
                <div className="category-summary-strip">
                  <span>Total Active FDs: <strong>{portfolio.fds.length}</strong></span>
                  <span>Invested: <strong>{formatLKR(fdTotals.invested)}</strong></span>
                </div>

                {portfolio.fds.length === 0 ? (
                  <div className="empty-portfolio-state glass-card">
                    <Landmark size={36} className="empty-icon" />
                    <p>No active Fixed Deposits added yet.</p>
                  </div>
                ) : (
                  <div className="investments-scroll-grid">
                    {portfolio.fds.map((item) => {
                      const res = calculateFdReturns(item);
                      return (
                        <div key={item.id} className="glass-card investment-item-card animate-fade-in">
                          <div className="item-header">
                            <div>
                              <h5>{item.institution}</h5>
                              <span className="item-tag-details">{item.tenureMonths / 12}Y • {item.payout}</span>
                            </div>
                            <button 
                              className="delete-btn"
                              onClick={() => handleDeleteItem("fds", item.id)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>

                          <div className="card-top-info-row">
                            <div className="info-badge-val">
                              <span className="lbl">Principal:</span>
                              <span className="val text-teal">{formatLKR(item.amount)}</span>
                            </div>
                            <div className="info-badge-val">
                              <span className="lbl">Interest Rate:</span>
                              <span className="val text-white">{item.rate.toFixed(2)}%</span>
                            </div>
                          </div>

                          <div className="item-mini-table-wrapper">
                            <table className="item-mini-table">
                              <thead>
                                <tr>
                                  <th>Period</th>
                                  <th>Gross Income</th>
                                  <th>Net (After WHT)</th>
                                  <th>Net (After 36% IIT)</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="period-col">Monthly</td>
                                  <td>{formatLKR(res.annualGross / 12)}</td>
                                  <td className="text-emerald">{formatLKR(res.netWht / 12)}</td>
                                  <td style={{ color: "#d8b4fe" }}>{formatLKR(res.netIit / 12)}</td>
                                </tr>
                                <tr>
                                  <td className="period-col">Annually</td>
                                  <td>{formatLKR(res.annualGross)}</td>
                                  <td className="text-emerald">{formatLKR(res.netWht)}</td>
                                  <td style={{ color: "#d8b4fe" }}>{formatLKR(res.netIit)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* UNIT TRUSTS TAB */}
          {activeTab === "uts" && (
            <div className="tab-layout-grid">
              {/* Form card */}
              <div className="glass-card form-card">
                <h4><Plus size={18} style={{ color: "var(--color-emerald)", marginRight: "6px" }} /> Add Unit Trust</h4>
                <form onSubmit={handleAddUt} className="form-inputs-group">
                  <div className="input-group">
                    <label>Fund Manager & Scheme</label>
                    <input 
                      type="text" 
                      value={utFund} 
                      onChange={(e) => setUtFund(e.target.value)} 
                      placeholder="e.g. CAL Money Market Fund"
                      className="glass-input"
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label>Capital Invested (LKR)</label>
                    <input 
                      type="number" 
                      value={utAmount} 
                      onChange={(e) => setUtAmount(e.target.value)} 
                      placeholder="e.g. 500000"
                      className="glass-input"
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label>Annualized Dividend Yield (% p.a.)</label>
                    <input 
                      type="number" 
                      step="0.05"
                      value={utRate} 
                      onChange={(e) => setUtRate(e.target.value)} 
                      placeholder="e.g. 10.85"
                      className="glass-input"
                      required
                    />
                  </div>
                  <button type="submit" className="add-btn uts-btn">
                    Add Fund to Portfolio
                  </button>
                </form>
              </div>

              {/* Items list */}
              <div className="items-list-box">
                <div className="category-summary-strip">
                  <span>Total Funds: <strong>{portfolio.uts.length}</strong></span>
                  <span>Invested: <strong>{formatLKR(utTotals.invested)}</strong></span>
                </div>

                {portfolio.uts.length === 0 ? (
                  <div className="empty-portfolio-state glass-card">
                    <Compass size={36} className="empty-icon" />
                    <p>No active Unit Trust holdings added yet.</p>
                  </div>
                ) : (
                  <div className="investments-scroll-grid">
                    {portfolio.uts.map((item) => {
                      const res = calculateUtReturns(item);
                      return (
                        <div key={item.id} className="glass-card investment-item-card animate-fade-in">
                          <div className="item-header">
                            <div>
                              <h5>{item.fund}</h5>
                              <span className="item-tag-details">SEC Regulated Mutual Fund</span>
                            </div>
                            <button 
                              className="delete-btn"
                              onClick={() => handleDeleteItem("uts", item.id)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>

                          <div className="item-values-grid">
                            <div className="val-block">
                              <span className="val-lbl">Principal</span>
                              <span className="val-num text-teal">{formatLKR(item.amount)}</span>
                            </div>
                            <div className="val-block">
                              <span className="val-lbl">Yield</span>
                              <span className="val-num">{item.rate.toFixed(2)}%</span>
                            </div>
                            <div className="val-block">
                              <span className="val-lbl">Net Monthly</span>
                              <span className="val-num text-emerald">{formatLKR(res.netWht / 12)}</span>
                            </div>
                            <div className="val-block">
                              <span className="val-lbl">Net Annual</span>
                              <span className="val-num text-emerald">{formatLKR(res.netWht)}</span>
                            </div>
                          </div>

                          <div className="tax-comparisons-strip green-tax-strip">
                            <div className="tax-sub-item">
                              <ShieldCheck size={12} style={{ color: "var(--color-emerald)", marginRight: "4px" }} />
                              <span>WHT Deducted: <strong>Tax-Free (0%)</strong></span>
                            </div>
                            <div className="tax-sub-item">
                              <ShieldCheck size={12} style={{ color: "var(--color-emerald)", marginRight: "4px" }} />
                              <span>Individual Income Tax (IIT): <strong>Tax-Free (0%)</strong></span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TREASURY TAB */}
          {activeTab === "treasury" && (
            <div className="tab-layout-grid">
              {/* Form card */}
              <div className="glass-card form-card">
                <h4><Plus size={18} style={{ color: "var(--color-indigo)", marginRight: "6px" }} /> Add Treasury Security</h4>
                <form onSubmit={handleAddTreasury} className="form-inputs-group">
                  <div className="input-group">
                    <label>Security Type</label>
                    <div className="form-radio-row">
                      <button 
                        type="button"
                        className={`radio-btn ${trType === "tbill" ? "active" : ""}`}
                        onClick={() => {
                          setTrType("tbill");
                          setTrTenure(364);
                        }}
                      >
                        T-Bill (Discount)
                      </button>
                      <button 
                        type="button"
                        className={`radio-btn ${trType === "tbond" ? "active" : ""}`}
                        onClick={() => {
                          setTrType("tbond");
                          setTrTenure(5);
                        }}
                      >
                        T-Bond (Coupon)
                      </button>
                    </div>
                  </div>
                  <div className="input-group">
                    <label>{trType === "tbill" ? "Maturity Face Value (LKR)" : "Invested Capital (LKR)"}</label>
                    <input 
                      type="number" 
                      value={trAmount} 
                      onChange={(e) => setTrAmount(e.target.value)} 
                      placeholder="e.g. 1000000"
                      className="glass-input"
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label>Yield Rate (% p.a.)</label>
                    <input 
                      type="number" 
                      step="0.05"
                      value={trRate} 
                      onChange={(e) => setTrRate(e.target.value)} 
                      placeholder="e.g. 10.20"
                      className="glass-input"
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label>Tenure</label>
                    {trType === "tbill" ? (
                      <select 
                        value={trTenure}
                        onChange={(e) => setTrTenure(parseInt(e.target.value))}
                        className="glass-input"
                        style={{ background: "#0d1323" }}
                      >
                        <option value={91}>91-Day (3 Months)</option>
                        <option value={182}>182-Day (6 Months)</option>
                        <option value={364}>364-Day (1 Year)</option>
                      </select>
                    ) : (
                      <select 
                        value={trTenure}
                        onChange={(e) => setTrTenure(parseInt(e.target.value))}
                        className="glass-input"
                        style={{ background: "#0d1323" }}
                      >
                        <option value={2}>2 Years</option>
                        <option value={3}>3 Years</option>
                        <option value={5}>5 Years</option>
                        <option value={10}>10 Years</option>
                        <option value={15}>15 Years</option>
                        <option value={20}>20 Years</option>
                      </select>
                    )}
                  </div>
                  <button type="submit" className="add-btn treasury-btn">
                    Add Treasury to Portfolio
                  </button>
                </form>
              </div>

              {/* Items list */}
              <div className="items-list-box">
                <div className="category-summary-strip">
                  <span>Total Securities: <strong>{portfolio.treasury.length}</strong></span>
                  <span>Invested: <strong>{formatLKR(treasuryTotals.invested)}</strong></span>
                </div>

                {portfolio.treasury.length === 0 ? (
                  <div className="empty-portfolio-state glass-card">
                    <Wallet size={36} className="empty-icon" />
                    <p>No Treasury securities added yet.</p>
                  </div>
                ) : (
                  <div className="investments-scroll-grid">
                    {portfolio.treasury.map((item) => {
                      const res = calculateTreasuryReturns(item);
                      return (
                        <div key={item.id} className="glass-card investment-item-card animate-fade-in">
                          <div className="item-header">
                            <div>
                              <h5>{item.type === "tbill" ? "Treasury Bill (T-Bill)" : "Treasury Bond (T-Bond)"}</h5>
                              <span className="item-tag-details">
                                {item.type === "tbill" ? `${item.tenureDaysOrYears} Days Maturity` : `${item.tenureDaysOrYears} Years maturity`}
                              </span>
                            </div>
                            <button 
                              className="delete-btn"
                              onClick={() => handleDeleteItem("treasury", item.id)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>

                          <div className="item-values-grid">
                            <div className="val-block">
                              <span className="val-lbl">{item.type === "tbill" ? "Face Value" : "Capital"}</span>
                              <span className="val-num text-teal">{formatLKR(item.amount)}</span>
                            </div>
                            <div className="val-block">
                              <span className="val-lbl">Yield</span>
                              <span className="val-num">{item.rate.toFixed(2)}%</span>
                            </div>
                            <div className="val-block">
                              <span className="val-lbl">Net Monthly</span>
                              <span className="val-num text-emerald">{formatLKR(res.netWht / 12)}</span>
                            </div>
                            <div className="val-block">
                              <span className="val-lbl">Net Annual</span>
                              <span className="val-num text-emerald">{formatLKR(res.netWht)}</span>
                            </div>
                          </div>

                          <div className="tax-comparisons-strip">
                            <div className="tax-sub-item">
                              <span>WHT Withheld (10%):</span>
                              <span className="text-coral">-{formatLKR(res.wht)}</span>
                            </div>
                            <div className="tax-sub-item highlight-purple">
                              <span>Net 36% IIT Income:</span>
                              <span>{formatLKR(res.netIit)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .portfolio-overview-card {
          padding: 1.5rem;
          margin-bottom: 2rem;
          background: linear-gradient(135deg, rgba(0, 242, 254, 0.03) 0%, rgba(9, 14, 26, 0.4) 100%);
          border-color: rgba(0, 242, 254, 0.15);
        }

        .portfolio-overview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .overview-title-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .income-period-tabs {
          display: flex;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 2px;
          gap: 2px;
        }

        .period-tab-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          font-family: var(--font-body);
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .period-tab-btn:hover {
          color: var(--text-primary);
        }

        .period-tab-btn.active {
          background: var(--bg-secondary);
          color: var(--color-teal);
          box-shadow: 0 2px 4px rgba(0,0,0,0.15);
        }

        .portfolio-summary-bar {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }

        @media (max-width: 768px) {
          .portfolio-summary-bar {
            grid-template-columns: 1fr;
            gap: 1.25rem;
          }
        }

        @media (max-width: 480px) {
          .portfolio-summary-bar {
            grid-template-columns: 1fr;
          }
        }

        .summary-col {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .summary-lbl {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .summary-val {
          font-family: var(--font-display);
          font-size: 1.3rem;
          font-weight: 800;
        }

        .text-teal { color: var(--color-teal); }
        .text-emerald { color: var(--color-emerald); }
        .text-coral { color: var(--color-coral); }

        /* Tabs Styles */
        .portfolio-tabs-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .tabs-header-row {
          display: flex;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border-color);
          padding: 4px;
          border-radius: 12px;
          gap: 4px;
          width: fit-content;
        }

        @media (max-width: 600px) {
          .tabs-header-row {
            width: 100%;
          }
        }

        .tab-link {
          background: none;
          border: none;
          color: var(--text-secondary);
          font-family: var(--font-body);
          font-size: 0.85rem;
          font-weight: 600;
          padding: 0.75rem 1.25rem;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
        }

        @media (max-width: 600px) {
          .tab-link {
            flex: 1;
            padding: 0.65rem 0.5rem;
            font-size: 0.75rem;
            justify-content: center;
          }
        }

        .tab-link:hover {
          color: var(--text-primary);
          background: rgba(255,255,255,0.01);
        }

        .tab-link.active {
          background: var(--bg-secondary);
          color: var(--color-teal);
          box-shadow: 0 4px 10px rgba(0,0,0,0.15);
        }

        /* Forms Grid Layout */
        .tab-layout-grid {
          display: grid;
          grid-template-columns: 0.8fr 1.2fr;
          gap: 1.5rem;
          align-items: start;
        }

        @media (max-width: 900px) {
          .tab-layout-grid {
            grid-template-columns: 1fr;
          }
        }

        .form-card {
          padding: 1.5rem;
          border-color: rgba(255, 255, 255, 0.05);
        }

        .form-card h4 {
          font-family: var(--font-display);
          font-size: 1rem;
          font-weight: 700;
          margin-bottom: 1.25rem;
          display: flex;
          align-items: center;
        }

        .form-inputs-group {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .input-group label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .input-row-double {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .add-btn {
          border: none;
          padding: 0.75rem;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .fds-btn {
          background: linear-gradient(135deg, var(--color-teal) 0%, var(--color-indigo) 100%);
          color: #04060c;
        }
        .uts-btn {
          background: linear-gradient(135deg, var(--color-emerald) 0%, var(--color-teal) 100%);
          color: #04060c;
        }
        .treasury-btn {
          background: linear-gradient(135deg, var(--color-indigo) 0%, var(--color-purple) 100%);
          color: #04060c;
        }

        .add-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 242, 254, 0.2);
        }

        .form-radio-row {
          display: flex;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 2px;
          gap: 2px;
        }

        .form-radio-row .radio-btn {
          flex: 1;
          background: none;
          border: none;
          color: var(--text-secondary);
          font-family: var(--font-body);
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.5rem;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .form-radio-row .radio-btn.active {
          background: var(--bg-primary);
          color: var(--color-indigo);
        }

        /* Items List View */
        .items-list-box {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .category-summary-strip {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          color: var(--text-secondary);
          padding: 10px 14px;
          background: rgba(255,255,255,0.01);
          border: 1px solid var(--border-color);
          border-radius: 8px;
        }

        .empty-portfolio-state {
          padding: 4rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          text-align: center;
          border-color: rgba(255,255,255,0.02);
        }

        .empty-icon {
          color: var(--text-muted);
          opacity: 0.4;
        }

        .empty-portfolio-state p {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .investments-scroll-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 520px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .investment-item-card {
          padding: 1.25rem;
          border-color: rgba(255,255,255,0.04);
          transition: all 0.2s ease;
        }

        .investment-item-card:hover {
          border-color: rgba(255, 255, 255, 0.08);
          background: rgba(255,255,255,0.02);
        }

        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 1rem;
        }

        .item-header h5 {
          font-family: var(--font-display);
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .item-tag-details {
          font-size: 0.725rem;
          color: var(--text-muted);
          text-transform: capitalize;
          margin-top: 2px;
          display: inline-block;
        }

        .delete-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .delete-btn:hover {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.08);
        }

        .item-values-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .val-block {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .val-lbl {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .val-num {
          font-family: var(--font-display);
          font-size: 1.05rem;
          font-weight: 700;
        }

        .tax-comparisons-strip {
          display: flex;
          justify-content: space-between;
          border-top: 1px dashed var(--border-color);
          padding-top: 8px;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .green-tax-strip {
          background: rgba(16, 185, 129, 0.03);
          border: 1px solid rgba(16, 185, 129, 0.1);
          padding: 8px 12px;
          border-radius: 6px;
          border-top: none;
          margin-top: 4px;
        }

        .tax-sub-item {
          display: flex;
          align-items: center;
        }

        .highlight-purple {
          color: #d8b4fe;
          font-weight: 600;
        }

        .card-top-info-row {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 0.85rem;
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-color);
          padding: 8px 12px;
          border-radius: 6px;
        }

        .info-badge-val {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
        }

        .info-badge-val .lbl {
          color: var(--text-muted);
          font-weight: 500;
        }

        .info-badge-val .val {
          font-weight: 700;
          font-family: var(--font-display);
        }

        .item-mini-table-wrapper {
          overflow-x: auto;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: rgba(4, 6, 12, 0.2);
        }

        .item-mini-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.775rem;
          text-align: left;
        }

        .item-mini-table th {
          background: rgba(255,255,255,0.01);
          color: var(--text-muted);
          padding: 6px 10px;
          font-weight: 600;
          border-bottom: 1px solid var(--border-color);
        }

        .item-mini-table td {
          padding: 6px 10px;
          border-bottom: 1px solid rgba(255,255,255,0.02);
          color: var(--text-secondary);
        }

        .item-mini-table tr:last-child td {
          border-bottom: none;
        }

        .item-mini-table .period-col {
          font-weight: 700;
          color: var(--text-primary);
        }

        .category-totals-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        @media (max-width: 900px) {
          .category-totals-row {
            grid-template-columns: 1fr;
            gap: 1.25rem;
          }
        }

        .category-total-card {
          padding: 1.25rem;
          background: rgba(9, 14, 26, 0.4);
          border-color: rgba(255,255,255,0.04);
        }

        .category-total-card:hover {
          border-color: rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.01);
        }

        .category-total-card .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .category-total-card .title-box {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .category-total-card h5 {
          font-family: var(--font-display);
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .icon-fd { color: var(--color-teal); }
        .icon-ut { color: var(--color-emerald); }
        .icon-tr { color: var(--color-indigo); }

        .total-capital-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .total-capital-row .val {
          font-family: var(--font-display);
          font-size: 1.1rem;
          font-weight: 800;
        }

        .category-metrics-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .metric-item {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .metric-item .val-text {
          font-weight: 600;
        }

        .tax-banner {
          display: flex;
          gap: 1.25rem;
          padding: 1.5rem;
          margin-bottom: 2rem;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(9, 14, 26, 0.4) 100%);
          border-color: rgba(16, 185, 129, 0.15);
        }

        .banner-icon-box {
          color: var(--color-emerald);
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(16, 185, 129, 0.08);
          padding: 12px;
          border-radius: 12px;
          height: fit-content;
        }

        .banner-content h4 {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 1.05rem;
          margin-bottom: 4px;
          color: var(--text-primary);
        }

        .banner-content p {
          font-size: 0.825rem;
          color: var(--text-secondary);
          line-height: 1.45;
        }

        .status-error-banner {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 12px;
          padding: 0.85rem 1.25rem;
          margin-bottom: 1.5rem;
          color: var(--text-primary);
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .error-icon-dot {
          color: #ef4444;
          animation: pulseGlow 1.5s infinite;
          font-size: 1.2rem;
          line-height: 1;
        }

        .status-warning-banner {
          background: rgba(249, 115, 22, 0.08);
          border: 1px solid rgba(249, 115, 22, 0.2);
          border-radius: 12px;
          padding: 0.85rem 1.25rem;
          margin-bottom: 1.5rem;
          color: var(--text-primary);
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .warning-icon-dot {
          color: #f97316;
          animation: pulseGlow 1.5s infinite;
          font-size: 1.2rem;
          line-height: 1;
        }

        .status-success-banner {
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 12px;
          padding: 0.85rem 1.25rem;
          margin-bottom: 1.5rem;
          color: var(--text-primary);
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .success-icon-dot {
          color: var(--color-emerald);
          animation: pulseGlow 1.5s infinite;
          font-size: 1.2rem;
          line-height: 1;
        }
      `}</style>
    </div>
  );
}
