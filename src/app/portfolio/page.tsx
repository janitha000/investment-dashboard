"use client";

import React, { useState, useEffect } from "react";
import { useRates } from "@/context/RatesContext";
import { Landmark, Compass, Wallet, Plus, Trash2, Info, Briefcase, Percent, ShieldCheck, LineChart, Globe } from "lucide-react";

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
  amount: number; // Current Balance
  rate: number;
  units?: number;
  purchasePrice?: number; // Unit Cost
  currentPrice?: number;  // Current Unit Price
  earnings?: number;
}

interface TreasuryInvestment {
  id: string;
  type: "tbill" | "tbond";
  amount: number;            // Face Value (T-Bill) / INV Value (T-Bond)
  rate: number;              // Yield (%)
  tenureDaysOrYears: number; // Days for T-Bill, Years for T-Bond
  // T-Bond specific fields
  isin?: string;
  dealSlip?: string;
  faceValue?: number;        // Face Value (LKR)
  couponRate?: number;       // Coupon Rate (%)
  couponValue?: number;      // Bi-annual coupon payment (LKR)
  couponMonth?: number;      // Month of first coupon (1–12)
  maturityDate?: string;     // ISO date string e.g. "2029-06-15"
}

interface DividendInvestment {
  id: string;
  company: string;
  amount: number;            // Capital invested (LKR)
  yearlyDividend: number;    // Estimated yearly dividend (LKR) — tax-free
}

interface PfcaFdInvestment {
  id: string;
  institution: string;
  amount: number;            // Investment amount (USD)
  rate: number;              // Interest rate (% p.a.)
  maturityType: "monthly" | "quarterly" | "maturity";
  exchangeRate: number;      // LKR per USD — for portfolio LKR totals
}

interface PortfolioState {
  fds: FdInvestment[];
  uts: UtInvestment[];
  treasury: TreasuryInvestment[];
  dividends: DividendInvestment[];
  pfcaFds: PfcaFdInvestment[];
}

const INITIAL_STATE: PortfolioState = {
  fds: [],
  uts: [],
  treasury: [],
  dividends: [],
  pfcaFds: []
};

export default function PortfolioPage() {
  const { rates } = useRates();
  const [portfolio, setPortfolio] = useState<PortfolioState>(INITIAL_STATE);
  const [activeTab, setActiveTab] = useState<"fds" | "uts" | "treasury" | "dividends" | "pfcaFds">("fds");
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
  const [utInputMode, setUtInputMode] = useState<"simple" | "units">("simple");
  const [utUnits, setUtUnits] = useState<string>("");
  const [utUnitPrice, setUtUnitPrice] = useState<string>(""); // Used as Purchase Price / Unit Cost
  const [utCurrentPriceInput, setUtCurrentPriceInput] = useState<string>(""); // Used as Current Unit Price
  const [utEarnings, setUtEarnings] = useState<string>("");

  // Edit UT Modal states
  const [editingUt, setEditingUt] = useState<UtInvestment | null>(null);
  const [editUtFund, setEditUtFund] = useState<string>("");
  const [editUtUnits, setEditUtUnits] = useState<string>("");
  const [editUtCost, setEditUtCost] = useState<string>("");
  const [editUtCurrentPrice, setEditUtCurrentPrice] = useState<string>("");
  const [editUtRate, setEditUtRate] = useState<string>("");

  // Input states for Treasury Form
  const [trType, setTrType] = useState<"tbill" | "tbond">("tbill");
  const [trAmount, setTrAmount] = useState<string>("");  // INV Value for bond
  const [trRate, setTrRate] = useState<string>("");
  const [trTenure, setTrTenure] = useState<number>(364);
  // T-Bond extra fields
  const [trIsin, setTrIsin] = useState<string>("");
  const [trDealSlip, setTrDealSlip] = useState<string>("");
  const [trFaceValue, setTrFaceValue] = useState<string>("");
  const [trCouponRate, setTrCouponRate] = useState<string>("");
  const [trCouponValue, setTrCouponValue] = useState<string>("");
  const [trCouponMonth, setTrCouponMonth] = useState<number>(6); // default June
  const [trMaturityDate, setTrMaturityDate] = useState<string>("");

  // Input states for Dividend Form
  const [divCompany, setDivCompany] = useState<string>("");
  const [divAmount, setDivAmount] = useState<string>("");
  const [divYearly, setDivYearly] = useState<string>("");

  // Input states for PFCA FD Form
  const [pfcaInst, setPfcaInst] = useState<string>("Commercial Bank of Ceylon");
  const [pfcaAmount, setPfcaAmount] = useState<string>("");
  const [pfcaRate, setPfcaRate] = useState<string>("");
  const [pfcaMaturity, setPfcaMaturity] = useState<"monthly" | "quarterly" | "maturity">("maturity");
  const [pfcaFx, setPfcaFx] = useState<string>("310");

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem("lankawealth_portfolio");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPortfolio({
          fds: parsed.fds || [],
          uts: parsed.uts || [],
          treasury: parsed.treasury || [],
          dividends: parsed.dividends || [],
          pfcaFds: parsed.pfcaFds || [],
        });
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
    let amountNum = parseFloat(utAmount);
    const rateNum = parseFloat(utRate);
    if (!rateNum) return;

    let unitsNum: number | undefined;
    let purchasePriceNum: number | undefined;
    let currentPriceNum: number | undefined;
    let earningsNum: number | undefined;

    if (utInputMode === "units") {
      unitsNum = parseFloat(utUnits);
      purchasePriceNum = parseFloat(utUnitPrice); // Purchase Price
      currentPriceNum = parseFloat(utCurrentPriceInput); // Current Price
      if (unitsNum && currentPriceNum) {
        amountNum = unitsNum * currentPriceNum;
      }
      if (unitsNum && currentPriceNum && purchasePriceNum) {
        earningsNum = (unitsNum * currentPriceNum) - (unitsNum * purchasePriceNum);
      }
    }

    if (!amountNum) return;

    if (utInputMode === "simple" && utEarnings.trim()) {
      earningsNum = parseFloat(utEarnings);
    }

    const newItem: UtInvestment = {
      id: Date.now().toString(),
      fund: utFund,
      amount: amountNum,
      rate: rateNum,
      units: unitsNum,
      purchasePrice: purchasePriceNum,
      currentPrice: currentPriceNum,
      earnings: earningsNum
    };

    const updated = {
      ...portfolio,
      uts: [...portfolio.uts, newItem]
    };
    savePortfolio(updated);
    setUtAmount("");
    setUtRate("");
    setUtUnits("");
    setUtUnitPrice("");
    setUtCurrentPriceInput("");
    setUtEarnings("");
  };

  const handleStartEditUt = (item: UtInvestment) => {
    setEditingUt(item);
    setEditUtFund(item.fund);
    setEditUtUnits(item.units?.toString() || item.amount.toString());
    setEditUtCost(item.purchasePrice?.toString() || "");
    setEditUtCurrentPrice(item.currentPrice?.toString() || "");
    setEditUtRate(item.rate.toString());
  };

  const handleSaveEditUt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUt) return;

    const rateNum = parseFloat(editUtRate);
    if (!rateNum) return;

    let updatedAmount = parseFloat(editUtUnits);
    let unitsNum = parseFloat(editUtUnits);
    let costNum = parseFloat(editUtCost);
    let curPriceNum = parseFloat(editUtCurrentPrice);

    if (editingUt.units && unitsNum && curPriceNum) {
      updatedAmount = unitsNum * curPriceNum;
    }

    const updatedUts = portfolio.uts.map((item) => {
      if (item.id === editingUt.id) {
        return {
          ...item,
          fund: editUtFund,
          amount: updatedAmount,
          rate: rateNum,
          units: editingUt.units ? unitsNum : undefined,
          purchasePrice: editingUt.units ? costNum : undefined,
          currentPrice: editingUt.units ? curPriceNum : undefined,
          earnings: (editingUt.units && unitsNum && curPriceNum && costNum) ? (unitsNum * curPriceNum) - (unitsNum * costNum) : undefined
        };
      }
      return item;
    });

    const updatedPortfolio = {
      ...portfolio,
      uts: updatedUts
    };
    savePortfolio(updatedPortfolio);
    setEditingUt(null);
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
      tenureDaysOrYears: trTenure,
      ...(trType === "tbond" && {
        isin: trIsin || undefined,
        dealSlip: trDealSlip || undefined,
        faceValue: trFaceValue ? parseFloat(trFaceValue) : undefined,
        couponRate: trCouponRate ? parseFloat(trCouponRate) : undefined,
        couponValue: trCouponValue ? parseFloat(trCouponValue) : undefined,
        couponMonth: trCouponMonth,
        maturityDate: trMaturityDate || undefined,
      })
    };

    const updated = {
      ...portfolio,
      treasury: [...portfolio.treasury, newItem]
    };
    savePortfolio(updated);
    setTrAmount("");
    setTrRate("");
    setTrIsin("");
    setTrDealSlip("");
    setTrFaceValue("");
    setTrCouponRate("");
    setTrCouponValue("");
    setTrMaturityDate("");
  };

  const handleAddDividend = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(divAmount);
    const yearlyNum = parseFloat(divYearly);
    if (!divCompany.trim() || !amountNum || !yearlyNum) return;

    const newItem: DividendInvestment = {
      id: Date.now().toString(),
      company: divCompany.trim(),
      amount: amountNum,
      yearlyDividend: yearlyNum,
    };

    const updated = {
      ...portfolio,
      dividends: [...(portfolio.dividends || []), newItem],
    };
    savePortfolio(updated);
    setDivCompany("");
    setDivAmount("");
    setDivYearly("");
  };

  const handleAddPfcaFd = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(pfcaAmount);
    const rateNum = parseFloat(pfcaRate);
    const fxNum = parseFloat(pfcaFx) || 310;
    if (!pfcaInst.trim() || !amountNum || !rateNum) return;

    const newItem: PfcaFdInvestment = {
      id: Date.now().toString(),
      institution: pfcaInst.trim(),
      amount: amountNum,
      rate: rateNum,
      maturityType: pfcaMaturity,
      exchangeRate: fxNum,
    };

    const updated = {
      ...portfolio,
      pfcaFds: [...(portfolio.pfcaFds || []), newItem],
    };
    savePortfolio(updated);
    setPfcaAmount("");
    setPfcaRate("");
  };

  const handleDeleteItem = (category: "fds" | "uts" | "treasury" | "dividends" | "pfcaFds", id: string) => {
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
    
    // Check if the fund is FIOF
    const isFiof = item.fund.toUpperCase().includes("FIOF") || 
                   item.fund.toLowerCase().includes("first income opportunities");
    
    const iit36 = isFiof ? annualGross * 0.36 : 0;
    const netIit = annualGross - iit36;
    
    return { annualGross, wht, netWht, iit36, netIit };
  };

  const calculateTreasuryReturns = (item: TreasuryInvestment) => {
    // For T-Bonds with known coupon value, use annualised coupon (bi-annual × 2)
    const annualGross = item.couponValue
      ? item.couponValue * 2
      : item.amount * (item.rate / 100);
    const wht = annualGross * 0.10;
    const netWht = annualGross - wht;
    const iit36 = annualGross * 0.36;
    const netIit = annualGross - iit36;
    // Next two coupon dates based on couponMonth
    const nextCouponDates: string[] = [];
    if (item.couponMonth) {
      const now = new Date();
      const m = item.couponMonth;
      for (let yr = now.getFullYear(); nextCouponDates.length < 2; yr++) {
        const d1 = new Date(yr, m - 1, 15);
        const d2 = new Date(yr, m + 5, 15); // 6 months later
        if (d1 > now) nextCouponDates.push(d1.toLocaleDateString("en-LK", { year: "numeric", month: "short", day: "numeric" }));
        if (nextCouponDates.length < 2 && d2 > now) nextCouponDates.push(d2.toLocaleDateString("en-LK", { year: "numeric", month: "short", day: "numeric" }));
        if (yr > now.getFullYear() + 2) break;
      }
    }
    return { annualGross, wht, netWht, iit36, netIit, nextCouponDates };
  };

  // Dividends are tax-free — gross equals net under both WHT and IIT views
  const calculateDividendReturns = (item: DividendInvestment) => {
    const annualGross = item.yearlyDividend;
    return { annualGross, wht: 0, netWht: annualGross, iit36: 0, netIit: annualGross };
  };

  // PFCA FDs are tax-free; interest in USD, LKR equivalent via exchange rate
  const calculatePfcaReturns = (item: PfcaFdInvestment) => {
    const annualInterestUsd = item.amount * (item.rate / 100);
    const fx = item.exchangeRate || 310;
    const investedLkr = item.amount * fx;
    const annualGross = annualInterestUsd * fx; // LKR for portfolio totals
    return {
      annualInterestUsd,
      investedLkr,
      annualGross,
      wht: 0,
      netWht: annualGross,
      iit36: 0,
      netIit: annualGross,
    };
  };

  const formatUSD = (num: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(num);
  };

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

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

  const dividendTotals = (portfolio.dividends || []).reduce((acc, item) => {
    const res = calculateDividendReturns(item);
    acc.invested += item.amount;
    acc.gross += res.annualGross;
    acc.netWht += res.netWht;
    acc.whtDeducted += res.wht;
    acc.netIit += res.netIit;
    return acc;
  }, { invested: 0, gross: 0, netWht: 0, whtDeducted: 0, netIit: 0 });

  const pfcaTotals = (portfolio.pfcaFds || []).reduce((acc, item) => {
    const res = calculatePfcaReturns(item);
    acc.invested += res.investedLkr;
    acc.investedUsd += item.amount;
    acc.gross += res.annualGross;
    acc.grossUsd += res.annualInterestUsd;
    acc.netWht += res.netWht;
    acc.whtDeducted += res.wht;
    acc.netIit += res.netIit;
    return acc;
  }, { invested: 0, investedUsd: 0, gross: 0, grossUsd: 0, netWht: 0, whtDeducted: 0, netIit: 0 });

  const grandTotalInvested = fdTotals.invested + utTotals.invested + treasuryTotals.invested + dividendTotals.invested + pfcaTotals.invested;
  const grandTotalGross = fdTotals.gross + utTotals.gross + treasuryTotals.gross + dividendTotals.gross + pfcaTotals.gross;
  const grandTotalNetWht = fdTotals.netWht + utTotals.netWht + treasuryTotals.netWht + dividendTotals.netWht + pfcaTotals.netWht;
  const grandTotalWht = fdTotals.whtDeducted + utTotals.whtDeducted + treasuryTotals.whtDeducted + dividendTotals.whtDeducted + pfcaTotals.whtDeducted;
  const grandTotalNetIit = fdTotals.netIit + utTotals.netIit + treasuryTotals.netIit + dividendTotals.netIit + pfcaTotals.netIit;

  // Split yields: core (FD/UT/Treasury) vs tax-free (Dividend/PFCA)
  const coreInvested = fdTotals.invested + utTotals.invested + treasuryTotals.invested;
  const coreGross = fdTotals.gross + utTotals.gross + treasuryTotals.gross;
  const coreYield = coreInvested > 0 ? (coreGross / coreInvested) * 100 : 0;

  const taxFreeInvested = dividendTotals.invested + pfcaTotals.invested;
  const taxFreeGross = dividendTotals.gross + pfcaTotals.gross;
  const taxFreeYield = taxFreeInvested > 0 ? (taxFreeGross / taxFreeInvested) * 100 : 0;

  // Preset rates autocomplete when forms load
  useEffect(() => {
    if (activeTab === "fds" && rates?.fixedDeposit?.bankAverage12m) {
      setFdRate(rates.fixedDeposit.bankAverage12m.toString());
    } else if (activeTab === "uts" && rates?.unitTrust?.moneyMarketYield) {
      setUtRate(rates.unitTrust.moneyMarketYield.toString());
    } else if (activeTab === "treasury" && rates?.treasury?.tb12m) {
      setTrRate(rates.treasury.tb12m.toString());
    } else if (activeTab === "pfcaFds" && rates?.pfcaFd?.usdYield12m) {
      setPfcaRate(rates.pfcaFd.usdYield12m.toString());
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
            </div>
            {(coreInvested > 0 || taxFreeInvested > 0) && (
              <div className="split-yield-row">
                {coreInvested > 0 && (
                  <div className="split-yield-badge core">
                    <span className="split-yield-lbl">FD + UT + Treasury</span>
                    <span className="split-yield-val">{coreYield.toFixed(2)}%</span>
                    <span className="split-yield-cap">{formatLKR(coreInvested)}</span>
                  </div>
                )}
                {taxFreeInvested > 0 && (
                  <div className="split-yield-badge taxfree">
                    <span className="split-yield-lbl">Dividend + PFCA</span>
                    <span className="split-yield-val">{taxFreeYield.toFixed(2)}%</span>
                    <span className="split-yield-cap">{formatLKR(taxFreeInvested)}</span>
                  </div>
                )}
              </div>
            )}
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

        {/* Dividends Totals Card */}
        <div className="glass-card category-total-card animate-fade-in dividend-total-card">
          <div className="card-header">
            <div className="title-box">
              <LineChart size={18} className="icon-div" />
              <h5>Dividends (CSE)</h5>
            </div>
            <span className="badge" style={{ background: "rgba(99, 102, 241, 0.12)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.2)" }}>Tax-Free</span>
          </div>
          <div className="total-capital-row">
            <span className="lbl">Total Invested:</span>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <span className="val" style={{ color: "#6366f1" }}>{formatLKR(dividendTotals.invested)}</span>
              {dividendTotals.invested > 0 && (
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "600", marginTop: "2px" }}>
                  Avg. Yield: {((dividendTotals.gross / dividendTotals.invested) * 100).toFixed(2)}% p.a.
                </span>
              )}
            </div>
          </div>
          <div className="divider-h" style={{ margin: "8px 0" }} />
          <div className="category-metrics-list">
            <div className="metric-item">
              <span>Est. {incomePeriod === "monthly" ? "Monthly" : "Yearly"} Dividend:</span>
              <span className="val-text" style={{ color: "#6366f1" }}>{formatLKR(incomePeriod === "monthly" ? dividendTotals.gross / 12 : dividendTotals.gross)}</span>
            </div>
            <div className="metric-item">
              <span>Tax Deduction:</span>
              <span className="val-text text-emerald">None (Tax-Free)</span>
            </div>
            <div className="metric-item">
              <span>Net {incomePeriod === "monthly" ? "Monthly" : "Annual"} Income:</span>
              <span className="val-text text-emerald">{formatLKR(incomePeriod === "monthly" ? dividendTotals.netWht / 12 : dividendTotals.netWht)}</span>
            </div>
          </div>
        </div>

        {/* PFCA FD Totals Card */}
        <div className="glass-card category-total-card animate-fade-in">
          <div className="card-header">
            <div className="title-box">
              <Globe size={18} className="icon-pfca" />
              <h5>PFCA Fixed Deposits</h5>
            </div>
            <span className="badge" style={{ background: "rgba(244, 63, 94, 0.12)", color: "#f43f5e", border: "1px solid rgba(244,63,94,0.2)" }}>Tax-Free</span>
          </div>
          <div className="total-capital-row">
            <span className="lbl">Total Invested:</span>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <span className="val" style={{ color: "#f43f5e" }}>{formatLKR(pfcaTotals.invested)}</span>
              {pfcaTotals.investedUsd > 0 && (
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "600", marginTop: "2px" }}>
                  {formatUSD(pfcaTotals.investedUsd)} • Avg. {pfcaTotals.invested > 0 ? ((pfcaTotals.gross / pfcaTotals.invested) * 100).toFixed(2) : "0.00"}% p.a.
                </span>
              )}
            </div>
          </div>
          <div className="divider-h" style={{ margin: "8px 0" }} />
          <div className="category-metrics-list">
            <div className="metric-item">
              <span>Est. {incomePeriod === "monthly" ? "Monthly" : "Yearly"} Interest:</span>
              <span className="val-text" style={{ color: "#f43f5e" }}>{formatLKR(incomePeriod === "monthly" ? pfcaTotals.gross / 12 : pfcaTotals.gross)}</span>
            </div>
            <div className="metric-item">
              <span>Interest (USD):</span>
              <span className="val-text text-emerald">{formatUSD(incomePeriod === "monthly" ? pfcaTotals.grossUsd / 12 : pfcaTotals.grossUsd)}</span>
            </div>
            <div className="metric-item">
              <span>Tax Deduction:</span>
              <span className="val-text text-emerald">None (Tax-Free)</span>
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
          <button 
            className={`tab-link ${activeTab === "dividends" ? "active" : ""}`}
            onClick={() => setActiveTab("dividends")}
          >
            <LineChart size={16} className="tab-icon" />
            Dividends ({(portfolio.dividends || []).length})
          </button>
          <button 
            className={`tab-link ${activeTab === "pfcaFds" ? "active" : ""}`}
            onClick={() => setActiveTab("pfcaFds")}
          >
            <Globe size={16} className="tab-icon" />
            PFCA FD ({(portfolio.pfcaFds || []).length})
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

                  {/* Input Mode Toggle */}
                  <div className="input-group">
                    <label>Investment Input Method</label>
                    <div className="form-radio-row">
                      <button 
                        type="button"
                        className={`radio-btn ${utInputMode === "simple" ? "active" : ""}`}
                        onClick={() => setUtInputMode("simple")}
                      >
                        Capital Amount
                      </button>
                      <button 
                        type="button"
                        className={`radio-btn ${utInputMode === "units" ? "active" : ""}`}
                        onClick={() => setUtInputMode("units")}
                      >
                        Units & Price
                      </button>
                    </div>
                  </div>

                  {utInputMode === "simple" ? (
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
                  ) : (
                    <>
                      <div className="input-group">
                        <label>Units Held</label>
                        <input 
                          type="number" 
                          step="0.01"
                          value={utUnits} 
                          onChange={(e) => setUtUnits(e.target.value)} 
                          placeholder="e.g. 248116.05"
                          className="glass-input"
                          required
                        />
                      </div>
                      <div className="input-row-double">
                        <div className="input-group">
                          <label>Purchase Unit Price (Unit Cost)</label>
                          <input 
                            type="number" 
                            step="0.0001"
                            value={utUnitPrice} 
                            onChange={(e) => setUtUnitPrice(e.target.value)} 
                            placeholder="e.g. 36.2758"
                            className="glass-input"
                            required
                          />
                        </div>
                        <div className="input-group">
                          <label>Current Unit Price</label>
                          <input 
                            type="number" 
                            step="0.0001"
                            value={utCurrentPriceInput} 
                            onChange={(e) => setUtCurrentPriceInput(e.target.value)} 
                            placeholder="e.g. 43.4257"
                            className="glass-input"
                            required
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Optional Earnings (details) */}
                  <div className="input-group">
                    <label>Cumulative Earnings (LKR) - Optional</label>
                    <input 
                      type="number" 
                      value={utEarnings} 
                      onChange={(e) => setUtEarnings(e.target.value)} 
                      placeholder="e.g. 1774612"
                      className="glass-input"
                    />
                    <span className="input-hint">Used to calculate your historical growth yield.</span>
                  </div>

                  {utInputMode === "units" && parseFloat(utUnits) && parseFloat(utCurrentPriceInput) ? (
                    <div className="ai-sync-status-box success" style={{ fontSize: "0.75rem", marginTop: "-4px" }}>
                      Calculated Current Balance: <strong>{formatLKR(parseFloat(utUnits) * parseFloat(utCurrentPriceInput))}</strong>
                    </div>
                  ) : null}

                  <div className="input-group">
                    <label>Annualized Yield / Rate (% p.a.)</label>
                    <input 
                      type="number" 
                      step="0.05"
                      value={utRate} 
                      onChange={(e) => setUtRate(e.target.value)} 
                      placeholder="e.g. 11.20"
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
                      
                      // Calculate initial investment capital if earnings are specified
                      const initialCapital = item.earnings ? item.amount - item.earnings : item.amount;
                      const growthPercent = item.earnings ? (item.earnings / initialCapital) * 100 : 0;
                      const isFiof = item.fund.toUpperCase().includes("FIOF") || 
                                     item.fund.toLowerCase().includes("first income opportunities");

                      return (
                        <div key={item.id} className="glass-card investment-item-card animate-fade-in">
                          <div className="item-header">
                            <div>
                              <h5>{item.fund}</h5>
                              <span className="item-tag-details">SEC Regulated Mutual Fund</span>
                            </div>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              <button 
                                className="edit-btn-inline"
                                onClick={() => handleStartEditUt(item)}
                              >
                                Edit
                              </button>
                              <button 
                                className="delete-btn"
                                onClick={() => handleDeleteItem("uts", item.id)}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>

                          <div className="card-top-info-row" style={{ flexWrap: "wrap", gap: "1rem" }}>
                            <div className="info-badge-val">
                              <span className="lbl">Current Balance:</span>
                              <span className="val text-teal">{formatLKR(item.amount)}</span>
                            </div>
                            <div className="info-badge-val">
                              <span className="lbl">Yield:</span>
                              <span className="val text-white">{item.rate.toFixed(2)}%</span>
                            </div>
                            {item.units && item.currentPrice && (
                              <>
                                <div className="info-badge-val">
                                  <span className="lbl">Units Held:</span>
                                  <span className="val text-white">{item.units.toLocaleString("en-LK", { maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="info-badge-val">
                                  <span className="lbl">Unit Cost:</span>
                                  <span className="val text-white">{item.purchasePrice ? item.purchasePrice.toFixed(4) : "—"}</span>
                                </div>
                                <div className="info-badge-val">
                                  <span className="lbl">Current Price:</span>
                                  <span className="val text-white">{item.currentPrice.toFixed(4)}</span>
                                </div>
                              </>
                            )}
                            {item.earnings && (
                              <div className="info-badge-val" style={{ marginLeft: "auto" }}>
                                <span className="lbl">Gain:</span>
                                <span className="val text-emerald">+{growthPercent.toFixed(2)}% ({formatLKR(item.earnings)})</span>
                              </div>
                            )}
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
                                  <td className="text-emerald">{formatLKR(res.netIit / 12)}</td>
                                </tr>
                                <tr>
                                  <td className="period-col">Annually</td>
                                  <td>{formatLKR(res.annualGross)}</td>
                                  <td className="text-emerald">{formatLKR(res.netWht)}</td>
                                  <td className="text-emerald">{formatLKR(res.netIit)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* Dynamic tax treatment strip based on FIOF status */}
                          <div className={`tax-comparisons-strip ${isFiof ? "red-tax-strip" : "green-tax-strip"}`} style={{ marginTop: "8px" }}>
                            <div className="tax-sub-item">
                              <ShieldCheck size={12} style={{ color: "var(--color-emerald)", marginRight: "4px" }} />
                              <span>WHT: <strong>Tax-Free (0%)</strong></span>
                            </div>
                            <div className="tax-sub-item">
                              {isFiof ? (
                                <>
                                  <Info size={12} style={{ color: "#ef4444", marginRight: "4px" }} />
                                  <span>Individual Income Tax (IIT): <strong style={{ color: "#ef4444" }}>Subject to Tax (36% IIT applies)</strong></span>
                                </>
                              ) : (
                                <>
                                  <ShieldCheck size={12} style={{ color: "var(--color-emerald)", marginRight: "4px" }} />
                                  <span>Individual Income Tax (IIT): <strong>Tax-Free (0% SEC Exemption)</strong></span>
                                </>
                              )}
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
                        onClick={() => { setTrType("tbill"); setTrTenure(364); }}
                      >
                        T-Bill (Discount)
                      </button>
                      <button 
                        type="button"
                        className={`radio-btn ${trType === "tbond" ? "active" : ""}`}
                        onClick={() => { setTrType("tbond"); setTrTenure(5); }}
                      >
                        T-Bond (Coupon)
                      </button>
                    </div>
                  </div>

                  {/* ── T-BILL fields ── */}
                  {trType === "tbill" && (
                    <>
                      <div className="input-group">
                        <label>Maturity Face Value (LKR)</label>
                        <input type="number" value={trAmount} onChange={(e) => setTrAmount(e.target.value)}
                          placeholder="e.g. 1000000" className="glass-input" required />
                      </div>
                      <div className="input-group">
                        <label>Yield Rate (% p.a.)</label>
                        <input type="number" step="0.05" value={trRate} onChange={(e) => setTrRate(e.target.value)}
                          placeholder="e.g. 10.20" className="glass-input" required />
                      </div>
                      <div className="input-group">
                        <label>Tenure</label>
                        <select value={trTenure} onChange={(e) => setTrTenure(parseInt(e.target.value))}
                          className="glass-input" style={{ background: "#0d1323" }}>
                          <option value={91}>91-Day (3 Months)</option>
                          <option value={182}>182-Day (6 Months)</option>
                          <option value={364}>364-Day (1 Year)</option>
                        </select>
                      </div>
                    </>
                  )}

                  {/* ── T-BOND fields ── */}
                  {trType === "tbond" && (
                    <>
                      <div className="input-row-double">
                        <div className="input-group">
                          <label>ISIN (Optional)</label>
                          <input type="text" value={trIsin} onChange={(e) => setTrIsin(e.target.value)}
                            placeholder="e.g. LKB00529F152" className="glass-input" />
                        </div>
                        <div className="input-group">
                          <label>Deal Slip No (Optional)</label>
                          <input type="text" value={trDealSlip} onChange={(e) => setTrDealSlip(e.target.value)}
                            placeholder="e.g. F94295" className="glass-input" />
                        </div>
                      </div>

                      <div className="input-row-double">
                        <div className="input-group">
                          <label>Face Value (LKR)</label>
                          <input type="number" value={trFaceValue} onChange={(e) => setTrFaceValue(e.target.value)}
                            placeholder="e.g. 1900328" className="glass-input" />
                        </div>
                        <div className="input-group">
                          <label>INV Value / Invested (LKR)</label>
                          <input type="number" value={trAmount} onChange={(e) => setTrAmount(e.target.value)}
                            placeholder="e.g. 2000000" className="glass-input" required />
                        </div>
                      </div>

                      <div className="input-row-double">
                        <div className="input-group">
                          <label>Yield (% p.a.)</label>
                          <input type="number" step="0.01" value={trRate} onChange={(e) => setTrRate(e.target.value)}
                            placeholder="e.g. 11.5" className="glass-input" required />
                        </div>
                        <div className="input-group">
                          <label>Coupon Rate (% p.a.)</label>
                          <input type="number" step="0.01" value={trCouponRate} onChange={(e) => setTrCouponRate(e.target.value)}
                            placeholder="e.g. 11.75" className="glass-input" />
                        </div>
                      </div>

                      <div className="input-group">
                        <label>Bi-Annual Coupon Value (LKR per payment)</label>
                        <input type="number" value={trCouponValue} onChange={(e) => setTrCouponValue(e.target.value)}
                          placeholder="e.g. 111644" className="glass-input" />
                        <span className="input-hint">Coupon is paid twice a year — enter the per-payment amount.</span>
                      </div>

                      <div className="input-row-double">
                        <div className="input-group">
                          <label>Coupon Month (first payment month)</label>
                          <select value={trCouponMonth} onChange={(e) => setTrCouponMonth(parseInt(e.target.value))}
                            className="glass-input" style={{ background: "#0d1323" }}>
                            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                          </select>
                          <span className="input-hint">Second payment is 6 months later automatically.</span>
                        </div>
                        <div className="input-group">
                          <label>Maturity Date</label>
                          <input type="date" value={trMaturityDate} onChange={(e) => setTrMaturityDate(e.target.value)}
                            className="glass-input" style={{ colorScheme: "dark" }} />
                        </div>
                      </div>

                      <div className="input-group">
                        <label>Tenor</label>
                        <select value={trTenure} onChange={(e) => setTrTenure(parseInt(e.target.value))}
                          className="glass-input" style={{ background: "#0d1323" }}>
                          <option value={2}>2 Years</option>
                          <option value={3}>3 Years</option>
                          <option value={5}>5 Years</option>
                          <option value={10}>10 Years</option>
                          <option value={15}>15 Years</option>
                          <option value={20}>20 Years</option>
                        </select>
                      </div>

                      {trCouponValue && parseFloat(trCouponValue) > 0 && (
                        <div className="ai-sync-status-box success" style={{ fontSize: "0.75rem" }}>
                          Annual Coupon Income: <strong>{formatLKR(parseFloat(trCouponValue) * 2)}</strong>
                          &nbsp;|&nbsp; Next payments in: <strong>{MONTHS[(trCouponMonth - 1) % 12]}</strong> &amp; <strong>{MONTHS[(trCouponMonth + 5) % 12]}</strong>
                        </div>
                      )}
                    </>
                  )}

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
                      const couponMonth2 = item.couponMonth ? MONTHS[(item.couponMonth + 5) % 12] : null;
                      const couponMonth1 = item.couponMonth ? MONTHS[(item.couponMonth - 1) % 12] : null;
                      return (
                        <div key={item.id} className="glass-card investment-item-card animate-fade-in">
                          <div className="item-header">
                            <div>
                              <h5>
                                {item.type === "tbill" ? "Treasury Bill (T-Bill)" : "Treasury Bond (T-Bond)"}
                                {item.isin && <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginLeft: "8px", fontWeight: 400 }}>{item.isin}</span>}
                              </h5>
                              <span className="item-tag-details">
                                {item.type === "tbill"
                                  ? `${item.tenureDaysOrYears}-Day T-Bill`
                                  : `${item.tenureDaysOrYears}Y T-Bond${item.maturityDate ? ` · Matures ${new Date(item.maturityDate).toLocaleDateString("en-LK", { year: "numeric", month: "short", day: "numeric" })}` : ""}`}
                              </span>
                            </div>
                            <button className="delete-btn" onClick={() => handleDeleteItem("treasury", item.id)}>
                              <Trash2 size={15} />
                            </button>
                          </div>

                          {/* Metrics row */}
                          <div className="card-top-info-row" style={{ flexWrap: "wrap", gap: "1rem" }}>
                            {item.faceValue && (
                              <div className="info-badge-val">
                                <span className="lbl">Face Value:</span>
                                <span className="val text-white">{formatLKR(item.faceValue)}</span>
                              </div>
                            )}
                            <div className="info-badge-val">
                              <span className="lbl">{item.type === "tbill" ? "Face Value:" : "INV Value:"}:</span>
                              <span className="val text-teal">{formatLKR(item.amount)}</span>
                            </div>
                            <div className="info-badge-val">
                              <span className="lbl">Yield:</span>
                              <span className="val text-white">{item.rate.toFixed(2)}%</span>
                            </div>
                            {item.couponRate && (
                              <div className="info-badge-val">
                                <span className="lbl">Coupon Rate:</span>
                                <span className="val text-white">{item.couponRate.toFixed(2)}%</span>
                              </div>
                            )}
                            {item.couponValue && (
                              <div className="info-badge-val">
                                <span className="lbl">Per Coupon:</span>
                                <span className="val text-emerald">{formatLKR(item.couponValue)}</span>
                              </div>
                            )}
                            {item.dealSlip && (
                              <div className="info-badge-val">
                                <span className="lbl">Deal Slip:</span>
                                <span className="val text-white">{item.dealSlip}</span>
                              </div>
                            )}
                          </div>

                          {/* Coupon schedule strip for T-Bonds */}
                          {item.type === "tbond" && item.couponMonth && (
                            <div className="bond-coupon-strip">
                              <div className="coupon-strip-label">📅 Bi-Annual Coupon Schedule</div>
                              <div className="coupon-dates-row">
                                <div className="coupon-date-pill">
                                  <span className="cpn-month">{couponMonth1}</span>
                                  <span className="cpn-val">{item.couponValue ? formatLKR(item.couponValue) : "—"}</span>
                                </div>
                                <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", alignSelf: "center" }}>+6 months</div>
                                <div className="coupon-date-pill">
                                  <span className="cpn-month">{couponMonth2}</span>
                                  <span className="cpn-val">{item.couponValue ? formatLKR(item.couponValue) : "—"}</span>
                                </div>
                                {res.nextCouponDates[0] && (
                                  <div className="next-coupon-badge">
                                    Next: {res.nextCouponDates[0]}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Income table */}
                          <div className="item-mini-table-wrapper">
                            <table className="item-mini-table">
                              <thead>
                                <tr>
                                  <th>Period</th>
                                  <th>Gross Coupon</th>
                                  <th>Net (After 10% WHT)</th>
                                  <th>Net (After 36% IIT)</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="period-col">Per Coupon</td>
                                  <td>{item.couponValue ? formatLKR(item.couponValue) : "—"}</td>
                                  <td className="text-emerald">{item.couponValue ? formatLKR(item.couponValue * 0.9) : "—"}</td>
                                  <td style={{ color: "#d8b4fe" }}>{item.couponValue ? formatLKR(item.couponValue * 0.64) : "—"}</td>
                                </tr>
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

          {/* DIVIDENDS TAB */}
          {activeTab === "dividends" && (
            <div className="tab-layout-grid">
              <div className="glass-card form-card">
                <h4><Plus size={18} style={{ color: "#6366f1", marginRight: "6px" }} /> Add Dividend Holding</h4>
                <form onSubmit={handleAddDividend} className="form-inputs-group">
                  <div className="input-group">
                    <label>Company</label>
                    <input
                      type="text"
                      value={divCompany}
                      onChange={(e) => setDivCompany(e.target.value)}
                      placeholder="e.g. Commercial Bank of Ceylon"
                      className="glass-input"
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label>Investment (LKR)</label>
                    <input
                      type="number"
                      value={divAmount}
                      onChange={(e) => setDivAmount(e.target.value)}
                      placeholder="e.g. 500000"
                      className="glass-input"
                      required
                      min="1"
                      step="0.01"
                    />
                  </div>
                  <div className="input-group">
                    <label>Estimated Yearly Dividend (LKR)</label>
                    <input
                      type="number"
                      value={divYearly}
                      onChange={(e) => setDivYearly(e.target.value)}
                      placeholder="e.g. 25000"
                      className="glass-input"
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="div-tax-note">
                    <ShieldCheck size={16} style={{ color: "var(--color-emerald)", flexShrink: 0 }} />
                    <span>Dividend income is recorded as tax-free — no WHT or IIT applied.</span>
                  </div>
                  <button type="submit" className="add-btn dividends-btn">
                    Add Dividend to Portfolio
                  </button>
                </form>
              </div>

              <div className="items-list-box">
                <div className="category-summary-strip">
                  <span>Total Holdings: <strong>{(portfolio.dividends || []).length}</strong></span>
                  <span>Invested: <strong>{formatLKR(dividendTotals.invested)}</strong></span>
                </div>

                {(portfolio.dividends || []).length === 0 ? (
                  <div className="empty-portfolio-state glass-card">
                    <LineChart size={36} className="empty-icon" />
                    <p>No dividend holdings added yet.</p>
                  </div>
                ) : (
                  <div className="investments-scroll-grid">
                    {(portfolio.dividends || []).map((item) => {
                      const yieldPct = item.amount > 0 ? (item.yearlyDividend / item.amount) * 100 : 0;
                      return (
                        <div key={item.id} className="glass-card investment-item-card dividend-item-card animate-fade-in">
                          <div className="item-header">
                            <div>
                              <h5>{item.company}</h5>
                              <span className="item-tag-details">Dividend • Tax-Free</span>
                            </div>
                            <button
                              className="delete-btn"
                              onClick={() => handleDeleteItem("dividends", item.id)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>

                          <div className="card-top-info-row">
                            <div className="info-badge-val">
                              <span className="lbl">Investment:</span>
                              <span className="val" style={{ color: "#6366f1" }}>{formatLKR(item.amount)}</span>
                            </div>
                            <div className="info-badge-val">
                              <span className="lbl">Implied Yield:</span>
                              <span className="val text-white">{yieldPct.toFixed(2)}%</span>
                            </div>
                          </div>

                          <div className="dividend-income-block">
                            <div className="div-income-row">
                              <span className="div-income-lbl">Estimated Yearly Dividend</span>
                              <span className="div-income-val">{formatLKR(item.yearlyDividend)}</span>
                            </div>
                            <div className="div-income-row">
                              <span className="div-income-lbl">Estimated Monthly</span>
                              <span className="div-income-val text-emerald">{formatLKR(item.yearlyDividend / 12)}</span>
                            </div>
                            <div className="div-tax-free-note">
                              <ShieldCheck size={13} />
                              No tax deducted — full dividend retained
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

          {/* PFCA FD TAB */}
          {activeTab === "pfcaFds" && (
            <div className="tab-layout-grid">
              <div className="glass-card form-card">
                <h4><Plus size={18} style={{ color: "#f43f5e", marginRight: "6px" }} /> Add PFCA Fixed Deposit</h4>
                <form onSubmit={handleAddPfcaFd} className="form-inputs-group">
                  <div className="input-group">
                    <label>Institution / Bank</label>
                    <input
                      type="text"
                      value={pfcaInst}
                      onChange={(e) => setPfcaInst(e.target.value)}
                      placeholder="e.g. Commercial Bank of Ceylon"
                      className="glass-input"
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label>Investment Amount (USD)</label>
                    <input
                      type="number"
                      value={pfcaAmount}
                      onChange={(e) => setPfcaAmount(e.target.value)}
                      placeholder="e.g. 10000"
                      className="glass-input"
                      required
                      min="1"
                      step="0.01"
                    />
                  </div>
                  <div className="input-group">
                    <label>Interest Rate (% p.a.)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={pfcaRate}
                      onChange={(e) => setPfcaRate(e.target.value)}
                      placeholder="e.g. 4.25"
                      className="glass-input"
                      required
                      min="0"
                    />
                  </div>
                  <div className="input-row-double">
                    <div className="input-group">
                      <label>Maturity Type</label>
                      <select
                        value={pfcaMaturity}
                        onChange={(e) => setPfcaMaturity(e.target.value as "monthly" | "quarterly" | "maturity")}
                        className="glass-input"
                        style={{ background: "#0d1323" }}
                      >
                        <option value="maturity">At Maturity</option>
                        <option value="monthly">Monthly Interest</option>
                        <option value="quarterly">Quarterly Interest</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label>USD/LKR Rate</label>
                      <input
                        type="number"
                        step="0.5"
                        value={pfcaFx}
                        onChange={(e) => setPfcaFx(e.target.value)}
                        placeholder="310"
                        className="glass-input"
                        required
                        min="1"
                      />
                    </div>
                  </div>
                  <div className="div-tax-note">
                    <ShieldCheck size={16} style={{ color: "var(--color-emerald)", flexShrink: 0 }} />
                    <span>PFCA interest is tax-free — no WHT or IIT applied.</span>
                  </div>
                  <button type="submit" className="add-btn pfca-btn">
                    Add PFCA FD to Portfolio
                  </button>
                </form>
              </div>

              <div className="items-list-box">
                <div className="category-summary-strip">
                  <span>Total PFCA FDs: <strong>{(portfolio.pfcaFds || []).length}</strong></span>
                  <span>Invested: <strong>{formatUSD(pfcaTotals.investedUsd)}</strong></span>
                </div>

                {(portfolio.pfcaFds || []).length === 0 ? (
                  <div className="empty-portfolio-state glass-card">
                    <Globe size={36} className="empty-icon" />
                    <p>No PFCA Fixed Deposits added yet.</p>
                  </div>
                ) : (
                  <div className="investments-scroll-grid">
                    {(portfolio.pfcaFds || []).map((item) => {
                      const res = calculatePfcaReturns(item);
                      const maturityLabel =
                        item.maturityType === "monthly" ? "Monthly Interest"
                        : item.maturityType === "quarterly" ? "Quarterly Interest"
                        : "At Maturity";
                      const periodInterestUsd =
                        item.maturityType === "monthly" ? res.annualInterestUsd / 12
                        : item.maturityType === "quarterly" ? res.annualInterestUsd / 4
                        : res.annualInterestUsd;
                      return (
                        <div key={item.id} className="glass-card investment-item-card pfca-item-card animate-fade-in">
                          <div className="item-header">
                            <div>
                              <h5>{item.institution}</h5>
                              <span className="item-tag-details">PFCA FD • {maturityLabel} • Tax-Free</span>
                            </div>
                            <button
                              className="delete-btn"
                              onClick={() => handleDeleteItem("pfcaFds", item.id)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>

                          <div className="card-top-info-row">
                            <div className="info-badge-val">
                              <span className="lbl">Investment:</span>
                              <span className="val" style={{ color: "#f43f5e" }}>{formatUSD(item.amount)}</span>
                            </div>
                            <div className="info-badge-val">
                              <span className="lbl">Interest Rate:</span>
                              <span className="val text-white">{item.rate.toFixed(2)}%</span>
                            </div>
                          </div>

                          <div className="pfca-income-block">
                            <div className="div-income-row">
                              <span className="div-income-lbl">Yearly Interest</span>
                              <span className="pfca-income-val">{formatUSD(res.annualInterestUsd)}</span>
                            </div>
                            <div className="div-income-row">
                              <span className="div-income-lbl">
                                {item.maturityType === "monthly" ? "Monthly Interest"
                                  : item.maturityType === "quarterly" ? "Quarterly Interest"
                                  : "Interest at Maturity (1Y)"}
                              </span>
                              <span className="pfca-income-val text-emerald">{formatUSD(periodInterestUsd)}</span>
                            </div>
                            <div className="div-income-row">
                              <span className="div-income-lbl">LKR Equivalent (Yearly)</span>
                              <span className="pfca-income-val" style={{ color: "#fb7185" }}>{formatLKR(res.annualGross)}</span>
                            </div>
                            <div className="div-tax-free-note">
                              <ShieldCheck size={13} />
                              Tax-free — @ {item.exchangeRate.toFixed(2)} LKR/USD
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

      {/* Edit Unit Trust Modal */}
      {editingUt && (
        <div className="ai-modal-backdrop" onClick={() => setEditingUt(null)}>
          <div className="glass-card ai-modal-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="ai-modal-header">
              <Compass size={20} style={{ color: "var(--color-emerald)" }} />
              <h3>Edit Unit Trust Holding</h3>
            </div>
            
            <form onSubmit={handleSaveEditUt} className="form-inputs-group" style={{ marginTop: "1rem" }}>
              <div className="input-group">
                <label>Fund Manager & Scheme</label>
                <input
                  type="text"
                  value={editUtFund}
                  onChange={(e) => setEditUtFund(e.target.value)}
                  className="glass-input"
                  required
                />
              </div>

              {editingUt.units && editingUt.currentPrice ? (
                <>
                  <div className="input-row-double">
                    <div className="input-group">
                      <label>Units Held</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editUtUnits}
                        onChange={(e) => setEditUtUnits(e.target.value)}
                        className="glass-input"
                        required
                      />
                    </div>
                    <div className="input-group">
                      <label>Yield Rate (% p.a.)</label>
                      <input
                        type="number"
                        step="0.05"
                        value={editUtRate}
                        onChange={(e) => setEditUtRate(e.target.value)}
                        className="glass-input"
                        required
                      />
                    </div>
                  </div>

                  <div className="input-row-double">
                    <div className="input-group">
                      <label>Purchase Unit Price (Unit Cost)</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={editUtCost}
                        onChange={(e) => setEditUtCost(e.target.value)}
                        className="glass-input"
                        required
                      />
                    </div>
                    <div className="input-group">
                      <label>Current Unit Price</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={editUtCurrentPrice}
                        onChange={(e) => setEditUtCurrentPrice(e.target.value)}
                        className="glass-input"
                        required
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="input-row-double">
                  <div className="input-group">
                    <label>Capital Invested (LKR)</label>
                    <input
                      type="number"
                      value={editUtUnits}
                      onChange={(e) => setEditUtUnits(e.target.value)}
                      className="glass-input"
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label>Yield Rate (% p.a.)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={editUtRate}
                      onChange={(e) => setEditUtRate(e.target.value)}
                      className="glass-input"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Live Preview Calcs */}
              {editingUt.units && parseFloat(editUtUnits) && parseFloat(editUtCurrentPrice) && parseFloat(editUtCost) ? (
                <div className="ai-sync-status-box success" style={{ fontSize: "0.75rem", marginTop: "-4px" }}>
                  Projected Current Balance: <strong>{formatLKR(parseFloat(editUtUnits) * parseFloat(editUtCurrentPrice))}</strong><br/>
                  Projected Gain: <strong>{formatLKR((parseFloat(editUtUnits) * parseFloat(editUtCurrentPrice)) - (parseFloat(editUtUnits) * parseFloat(editUtCost)))}</strong>
                </div>
              ) : null}

              <div className="ai-modal-actions">
                <button 
                  type="button" 
                  className="ai-cancel-btn" 
                  onClick={() => setEditingUt(null)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="ai-submit-btn"
                  style={{ background: "linear-gradient(135deg, var(--color-emerald) 0%, var(--color-teal) 100%)" }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

        .split-yield-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }

        .split-yield-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid;
          font-size: 0.72rem;
        }

        .split-yield-badge.core {
          background: rgba(0, 242, 254, 0.06);
          border-color: rgba(0, 242, 254, 0.2);
        }

        .split-yield-badge.taxfree {
          background: rgba(99, 102, 241, 0.08);
          border-color: rgba(99, 102, 241, 0.22);
        }

        .split-yield-lbl {
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .split-yield-val {
          font-family: var(--font-display);
          font-weight: 800;
          font-size: 0.9rem;
        }

        .split-yield-badge.core .split-yield-val {
          color: var(--color-teal);
        }

        .split-yield-badge.taxfree .split-yield-val {
          color: #818cf8;
        }

        .split-yield-cap {
          color: var(--text-secondary);
          font-weight: 600;
          padding-left: 6px;
          border-left: 1px solid var(--border-color);
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
          flex-wrap: wrap;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border-color);
          padding: 4px;
          border-radius: 12px;
          gap: 4px;
          width: fit-content;
          max-width: 100%;
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
        .dividends-btn {
          background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
          color: #ffffff;
        }
        .pfca-btn {
          background: linear-gradient(135deg, #f43f5e 0%, #fb7185 100%);
          color: #ffffff;
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

        .red-tax-strip {
          background: rgba(239, 68, 68, 0.03);
          border: 1px solid rgba(239, 68, 68, 0.1);
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
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        @media (max-width: 640px) {
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
        .icon-div { color: #6366f1; }
        .icon-pfca { color: #f43f5e; }

        .dividend-item-card {
          border-color: rgba(99, 102, 241, 0.18);
        }

        .pfca-item-card {
          border-color: rgba(244, 63, 94, 0.2);
        }

        .dividend-income-block {
          margin-top: 0.75rem;
          padding: 0.85rem 1rem;
          background: rgba(99, 102, 241, 0.06);
          border: 1px solid rgba(99, 102, 241, 0.15);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .pfca-income-block {
          margin-top: 0.75rem;
          padding: 0.85rem 1rem;
          background: rgba(244, 63, 94, 0.06);
          border: 1px solid rgba(244, 63, 94, 0.18);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .div-income-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 8px;
        }

        .div-income-lbl {
          font-size: 0.75rem;
          color: var(--text-secondary);
          font-weight: 600;
        }

        .div-income-val {
          font-family: var(--font-display);
          font-size: 1.05rem;
          font-weight: 800;
          color: #818cf8;
        }

        .pfca-income-val {
          font-family: var(--font-display);
          font-size: 1.05rem;
          font-weight: 800;
          color: #fb7185;
        }

        .div-tax-free-note {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--color-emerald);
          padding-top: 4px;
          border-top: 1px dashed rgba(99, 102, 241, 0.2);
        }

        .pfca-income-block .div-tax-free-note {
          border-top-color: rgba(244, 63, 94, 0.25);
        }

        .div-tax-note {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0.65rem 0.9rem;
          background: rgba(16, 185, 129, 0.06);
          border: 1px solid rgba(16, 185, 129, 0.18);
          border-radius: 8px;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

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

        /* Inline Edit Button */
        .edit-btn-inline {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .edit-btn-inline:hover {
          background: rgba(0, 242, 254, 0.08);
          border-color: rgba(0, 242, 254, 0.3);
          color: var(--color-teal);
        }

        /* Modal Backdrop and Styling */
        .ai-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
        }

        .ai-modal-card {
          max-width: 480px;
          width: 100%;
          border-color: rgba(0, 242, 254, 0.2);
          box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 242, 254, 0.05);
          animation: fadeIn 0.3s ease;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          background: #090e1a;
          padding: 1.5rem;
        }

        .ai-modal-header {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .ai-modal-header h3 {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0;
        }

        .ai-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 0.5rem;
        }

        .ai-cancel-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          padding: 0.6rem 1.2rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .ai-cancel-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .ai-submit-btn {
          border: none;
          color: #04060c;
          padding: 0.6rem 1.2rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 10px rgba(0, 242, 254, 0.2);
        }

        .ai-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 15px rgba(0, 242, 254, 0.3);
        }

        /* T-Bond Coupon Schedule Strip */
        .bond-coupon-strip {
          background: rgba(99, 102, 241, 0.04);
          border: 1px solid rgba(99, 102, 241, 0.15);
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 0.75rem;
        }

        .coupon-strip-label {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 8px;
        }

        .coupon-dates-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .coupon-date-pill {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 8px;
          padding: 6px 14px;
          gap: 2px;
          min-width: 90px;
        }

        .cpn-month {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--color-indigo);
        }

        .cpn-val {
          font-size: 0.8rem;
          font-weight: 700;
          font-family: var(--font-display);
          color: var(--text-primary);
        }

        .next-coupon-badge {
          margin-left: auto;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 20px;
          padding: 4px 12px;
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--color-emerald);
        }

        .input-hint {
          font-size: 0.7rem;
          color: var(--text-muted);
          margin-top: 3px;
          display: block;
        }
      `}</style>
    </div>
  );
}
