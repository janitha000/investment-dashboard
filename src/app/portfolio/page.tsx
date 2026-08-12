"use client";

import React, { useState, useEffect } from "react";
import { useRates } from "@/context/RatesContext";
import { calcProgressiveIit, PERSONAL_RELIEF } from "@/lib/tax";
import { Landmark, Compass, Wallet, Plus, Trash2, Info, Briefcase, Percent, ShieldCheck, LineChart, Globe, Camera, Clock, Download, Upload, UploadCloud } from "lucide-react";
import { downloadBackup, type BackupFile } from "@/lib/backup";
import { localDataSummary, migrateLocalStorageToNeon } from "@/lib/migrateLocalToNeon";

interface FdInvestment {
  id: string;
  institution: string;
  amount: number;
  rate: number;
  tenureMonths: number;
  payout: "monthly" | "quarterly" | "annually" | "maturity";
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
  depreciationRate: number;  // Est. annual LKR depreciation vs USD (% p.a.)
}

interface PortfolioState {
  fds: FdInvestment[];
  uts: UtInvestment[];
  treasury: TreasuryInvestment[];
  dividends: DividendInvestment[];
  pfcaFds: PfcaFdInvestment[];
}

/** Point-in-time capture of the full portfolio for history / charting */
interface PortfolioSnapshot {
  id: string;
  timestamp: string; // ISO
  label?: string;
  portfolio: PortfolioState;
  totals: {
    invested: number;
    investedByCategory: {
      fds: number;
      uts: number;
      treasury: number;
      dividends: number;
      pfcaFds: number;
    };
    gross: number;
    netWht: number;
    netIit: number;
    iitPayable: number;
    physicalCash: number;
    usdCapitalGain: number;
    coreYield: number;
    taxFreeYield: number;
    combinedYield: number;
  };
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
  console.log("[FD] payout options ready");
  const [fdPayout, setFdPayout] = useState<"monthly" | "quarterly" | "annually" | "maturity">("maturity");

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
  const [pfcaDepreciation, setPfcaDepreciation] = useState<string>("5");
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [snapshotFlash, setSnapshotFlash] = useState<string | null>(null);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [replaceOnImport, setReplaceOnImport] = useState(false);
  const [localData, setLocalData] = useState({ holdings: 0, snapshots: 0, scenarios: 0, any: false });
  const [migrating, setMigrating] = useState(false);
  const importInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalData(localDataSummary());
  }, []);

  // Load portfolio + snapshots from Neon APIs
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pRes, sRes] = await Promise.all([
          fetch("/api/portfolio"),
          fetch("/api/snapshots"),
        ]);
        if (pRes.ok) {
          const parsed = await pRes.json();
          if (!cancelled) {
            setPortfolio({
              fds: parsed.fds || [],
              uts: parsed.uts || [],
              treasury: parsed.treasury || [],
              dividends: parsed.dividends || [],
              pfcaFds: parsed.pfcaFds || [],
            });
          }
        }
        if (sRes.ok) {
          const snaps = await sRes.json();
          if (!cancelled && Array.isArray(snaps)) setSnapshots(snaps);
        }
      } catch (e) {
        console.error("Failed to load portfolio from API", e);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Save portfolio to Neon
  const savePortfolio = (updated: PortfolioState) => {
    setPortfolio(updated);
    fetch("/api/portfolio", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    }).catch((e) => console.error("Failed to save portfolio", e));
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
    const depNum = parseFloat(pfcaDepreciation);
    if (!pfcaInst.trim() || !amountNum || !rateNum) return;
    if (Number.isNaN(depNum) || depNum < 0) return;

    const newItem: PfcaFdInvestment = {
      id: Date.now().toString(),
      institution: pfcaInst.trim(),
      amount: amountNum,
      rate: rateNum,
      maturityType: pfcaMaturity,
      exchangeRate: fxNum,
      depreciationRate: depNum,
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
    // Declared UT yields are already net of WHT, so no further WHT is deducted.
    const annualGross = item.amount * (item.rate / 100);
    const wht = 0;
    const netWht = annualGross;
    const iit36 = annualGross * 0.36;
    const netIit = annualGross - iit36;

    return { annualGross, wht, netWht, iit36, netIit };
  };

  const calculateTreasuryReturns = (item: TreasuryInvestment) => {
    // For T-Bonds with known coupon value, use annualised coupon (bi-annual × 2).
    // No WHT at Treasury level — only FDs withhold 10% at source.
    const annualGross = item.couponValue
      ? item.couponValue * 2
      : item.amount * (item.rate / 100);
    const wht = 0;
    const netWht = annualGross;
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

  // PFCA FDs are tax-free. Interest and USD/LKR capital gain both count as income
  // but are shown on separate pills (Dividend + PFCA vs USD Capital Gain).
  const calculatePfcaReturns = (item: PfcaFdInvestment) => {
    const fx = item.exchangeRate || 310;
    const dep = item.depreciationRate ?? 5; // historical long-run default
    const investedLkr = item.amount * fx;
    const annualInterestUsd = item.amount * (item.rate / 100);
    const endFx = fx * (1 + dep / 100);
    const interestLkr = annualInterestUsd * endFx; // interest at year-end FX
    const fxValuationLkr = item.amount * (endFx - fx); // USD capital gain in LKR
    const annualGross = interestLkr + fxValuationLkr;
    const interestYield = investedLkr > 0 ? (interestLkr / investedLkr) * 100 : 0;
    const fxYield = investedLkr > 0 ? (fxValuationLkr / investedLkr) * 100 : 0;
    const totalReturnYield = investedLkr > 0 ? (annualGross / investedLkr) * 100 : 0;
    return {
      annualInterestUsd,
      investedLkr,
      interestLkr,
      fxValuationLkr,
      totalReturnLkr: annualGross,
      endFx,
      depreciationRate: dep,
      annualGross,
      interestYield,
      fxYield,
      totalReturnYield,
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
    acc.interestLkr += res.interestLkr;
    acc.fxValuationLkr += res.fxValuationLkr;
    acc.totalReturnLkr += res.totalReturnLkr;
    acc.netWht += res.netWht;
    acc.whtDeducted += res.wht;
    acc.netIit += res.netIit;
    return acc;
  }, { invested: 0, investedUsd: 0, gross: 0, grossUsd: 0, interestLkr: 0, fxValuationLkr: 0, totalReturnLkr: 0, netWht: 0, whtDeducted: 0, netIit: 0 });

  const grandTotalInvested = fdTotals.invested + utTotals.invested + treasuryTotals.invested + dividendTotals.invested + pfcaTotals.invested;
  const grandTotalGross = fdTotals.gross + utTotals.gross + treasuryTotals.gross + dividendTotals.gross + pfcaTotals.gross;
  const grandTotalNetWht = fdTotals.netWht + utTotals.netWht + treasuryTotals.netWht + dividendTotals.netWht + pfcaTotals.netWht;
  const grandTotalWht = fdTotals.whtDeducted + utTotals.whtDeducted + treasuryTotals.whtDeducted + dividendTotals.whtDeducted + pfcaTotals.whtDeducted;

  // Progressive IIT on the pooled annual income of all IIT-liable sources (FD + UT + Treasury).
  // Dividends and PFCA are exempt. Only FD withholds 10% WHT at source — that credit offsets the slab tax.
  const iitAssessableIncome = fdTotals.gross + utTotals.gross + treasuryTotals.gross;
  const iitWhtCredit = fdTotals.whtDeducted;
  const iit = calcProgressiveIit(iitAssessableIncome, iitWhtCredit);
  const grandTotalNetIit = grandTotalNetWht - iit.balancePayable;

  // Split yields: core (FD/UT/Treasury) vs tax-free interest (Dividend/PFCA) vs USD capital gain
  const coreInvested = fdTotals.invested + utTotals.invested + treasuryTotals.invested;
  const coreGross = fdTotals.gross + utTotals.gross + treasuryTotals.gross;
  const coreYield = coreInvested > 0 ? (coreGross / coreInvested) * 100 : 0;

  const taxFreeInvested = dividendTotals.invested + pfcaTotals.invested;
  const taxFreeGross = dividendTotals.gross + pfcaTotals.interestLkr; // interest only
  const taxFreeYield = taxFreeInvested > 0 ? (taxFreeGross / taxFreeInvested) * 100 : 0;

  const usdCapitalGain = pfcaTotals.fxValuationLkr;
  const usdCapitalGainYield = pfcaTotals.invested > 0 ? (usdCapitalGain / pfcaTotals.invested) * 100 : 0;
  const combinedYield = grandTotalInvested > 0 ? (grandTotalGross / grandTotalInvested) * 100 : 0;

  // Spendable cash income: net after WHT from FD + UT + Treasury + Dividends + PFCA interest (excludes FX valuation)
  const physicalCashAvailable =
    fdTotals.netWht + utTotals.netWht + treasuryTotals.netWht + dividendTotals.netWht + pfcaTotals.interestLkr;

  // Net annual take-home after IIT balance is paid from physical cash
  // (physical cash already has WHT deducted; we further deduct the outstanding IIT balance payable)
  const netAfterIitAndCash = physicalCashAvailable - iit.balancePayable;
  const netMonthlyAfterIitAndCash = netAfterIitAndCash / 12;

  // ── Equivalent employee gross salary (LKR) ──────────────────────────────────
  // An employee's net = Gross − EPF(8% employee) − income tax (same slabs, no WHT credit).
  // We binary-search for the gross that produces the same annual net.
  const calcEmployeeNet = (grossAnnual: number) => {
    const epf = grossAnnual * 0.08;          // 8% employee EPF contribution
    const taxableBase = grossAnnual - epf;   // EPF is deductible for income tax
    const empTax = calcProgressiveIit(taxableBase, 0);
    return grossAnnual - epf - empTax.slabTax;
  };
  const targetAnnualNet = netAfterIitAndCash;
  let lo = 0, hi = 200_000_000;
  for (let i = 0; i < 64; i++) {
    const mid = (lo + hi) / 2;
    calcEmployeeNet(mid) < targetAnnualNet ? (lo = mid) : (hi = mid);
  }
  const equivGrossSalaryLkr = (lo + hi) / 2;
  const equivMonthlySalaryLkr = equivGrossSalaryLkr / 12;

  // ── Equivalent USD gross salary (15% flat tax on foreign employment income) ─
  // Net = Gross × (1 − 0.15). Solve for Gross.
  // Use the average exchange rate from PFCA holdings, defaulting to 310.
  const avgFx = portfolio.pfcaFds.length > 0
    ? portfolio.pfcaFds.reduce((s, f) => s + (f.exchangeRate || 310), 0) / portfolio.pfcaFds.length
    : 310;
  const equivGrossSalaryUsd = netAfterIitAndCash / (avgFx * (1 - 0.15));
  const equivMonthlySalaryUsd = equivGrossSalaryUsd / 12;

  // Each category's share of the portfolio-wide IIT balance, pro-rated by its contribution to the pool
  const iitShare = (categoryGross: number) =>
    iitAssessableIncome > 0 ? iit.balancePayable * (categoryGross / iitAssessableIncome) : 0;

  const persistSnapshots = (next: PortfolioSnapshot[]) => {
    setSnapshots(next);
  };

  const handleSaveSnapshot = async () => {
    if (grandTotalInvested <= 0) {
      setSnapshotFlash("Add holdings before saving a snapshot");
      setTimeout(() => setSnapshotFlash(null), 2500);
      return;
    }
    const snap: PortfolioSnapshot = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      portfolio: JSON.parse(JSON.stringify(portfolio)) as PortfolioState,
      totals: {
        invested: grandTotalInvested,
        investedByCategory: {
          fds: fdTotals.invested,
          uts: utTotals.invested,
          treasury: treasuryTotals.invested,
          dividends: dividendTotals.invested,
          pfcaFds: pfcaTotals.invested,
        },
        gross: grandTotalGross,
        netWht: grandTotalNetWht,
        netIit: grandTotalNetIit,
        iitPayable: iit.balancePayable,
        physicalCash: physicalCashAvailable,
        usdCapitalGain,
        coreYield,
        taxFreeYield,
        combinedYield,
      },
    };
    try {
      const res = await fetch("/api/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snap),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save snapshot");
      }
      persistSnapshots([snap, ...snapshots]);
      setShowSnapshots(true);
      setSnapshotFlash("Snapshot saved to cloud");
    } catch (e) {
      setSnapshotFlash(e instanceof Error ? e.message : "Snapshot failed");
    }
    setTimeout(() => setSnapshotFlash(null), 2500);
  };

  const handleDeleteSnapshot = async (id: string) => {
    try {
      const res = await fetch(`/api/snapshots/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      persistSnapshots(snapshots.filter(s => s.id !== id));
    } catch (e) {
      console.error(e);
      setSnapshotFlash("Could not delete snapshot");
      setTimeout(() => setSnapshotFlash(null), 2500);
    }
  };

  const handleExportBackup = async () => {
    let scenarios: unknown[] = [];
    try {
      const scRes = await fetch("/api/scenarios");
      if (scRes.ok) {
        const sc = await scRes.json();
        if (Array.isArray(sc)) scenarios = sc;
      }
    } catch { /* ignore */ }
    if (scenarios.length === 0) {
      try {
        const raw = localStorage.getItem("lankawealth_scenarios");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) scenarios = parsed;
        }
      } catch { /* ignore */ }
    }
    const backup: BackupFile = {
      version: 1,
      exportedAt: new Date().toISOString(),
      portfolio,
      snapshots,
      scenarios,
    };
    downloadBackup(backup);
    setSnapshotFlash("Backup JSON downloaded");
    setTimeout(() => setSnapshotFlash(null), 2500);
  };

  const reloadFromCloud = async () => {
    const [pRes, sRes] = await Promise.all([fetch("/api/portfolio"), fetch("/api/snapshots")]);
    if (pRes.ok) {
      const p = await pRes.json();
      setPortfolio({
        fds: p.fds || [],
        uts: p.uts || [],
        treasury: p.treasury || [],
        dividends: p.dividends || [],
        pfcaFds: p.pfcaFds || [],
      });
    }
    if (sRes.ok) {
      const snaps = await sRes.json();
      if (Array.isArray(snaps)) setSnapshots(snaps);
    }
  };

  const handleMigrateLocalData = async () => {
    setMigrating(true);
    try {
      const result = await migrateLocalStorageToNeon({ replace: replaceOnImport });
      if (result.imported && (result.imported.portfolio || result.imported.snapshots > 0)) {
        await reloadFromCloud();
        setShowSnapshots(true);
      }
      setLocalData(localDataSummary());
      setSnapshotFlash(result.message || "Migration finished");
    } catch (e) {
      setSnapshotFlash(e instanceof Error ? e.message : "Migration failed");
    } finally {
      setMigrating(false);
      setTimeout(() => setSnapshotFlash(null), 5000);
    }
  };

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as BackupFile;
      if (!parsed || typeof parsed !== "object") throw new Error("Invalid backup file");
      const { importBackupToCloud } = await import("@/lib/backup");
      const result = await importBackupToCloud(parsed, replaceOnImport ? "replace" : "fill-empty");
      if (result.portfolio) {
        setPortfolio({
          fds: result.portfolio.fds || [],
          uts: result.portfolio.uts || [],
          treasury: result.portfolio.treasury || [],
          dividends: result.portfolio.dividends || [],
          pfcaFds: result.portfolio.pfcaFds || [],
        });
      }
      const sRes = await fetch("/api/snapshots");
      if (sRes.ok) {
        const snaps = await sRes.json();
        if (Array.isArray(snaps)) setSnapshots(snaps);
      }
      const skipped = result.imported?.skipped?.length
        ? ` (skipped: ${result.imported.skipped.join(", ")})`
        : "";
      const failed = result.imported?.errors?.length
        ? ` — ${result.imported.errors.length} row(s) failed`
        : "";
      setSnapshotFlash(`Imported to Neon${skipped}${failed}`);
      if (result.imported?.errors?.length) console.warn("Import row errors:", result.imported.errors);
      setShowSnapshots(true);
    } catch (e) {
      setSnapshotFlash(e instanceof Error ? e.message : "Import failed");
    }
    setTimeout(() => setSnapshotFlash(null), 4000);
  };

  const formatSnapTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("en-LK", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

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
          Manage your active investments, track annual interest flows, and compare income under WHT vs. progressive personal income tax (YoA 2025/26).
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
            {(coreInvested > 0 || taxFreeInvested > 0 || usdCapitalGain > 0) && (
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
                {usdCapitalGain > 0 && (
                  <div className="split-yield-badge usd-gain">
                    <span className="split-yield-lbl">USD Capital Gain</span>
                    <span className="split-yield-val">{usdCapitalGainYield.toFixed(2)}%</span>
                    <span className="split-yield-cap">
                      {formatLKR(incomePeriod === "monthly" ? usdCapitalGain / 12 : usdCapitalGain)}
                      <span style={{ opacity: 0.7, marginLeft: 4 }}>{incomePeriod === "monthly" ? "/mo" : "/yr"}</span>
                    </span>
                  </div>
                )}
                {grandTotalInvested > 0 && (
                  <div className="split-yield-badge combined">
                    <span className="split-yield-lbl">All Combined</span>
                    <span className="split-yield-val">{combinedYield.toFixed(2)}%</span>
                    <span className="split-yield-cap">{formatLKR(grandTotalInvested)}</span>
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

        <div className="overview-toolbar">
          <button
            type="button"
            className="snapshot-btn"
            onClick={handleSaveSnapshot}
            title="Save a timestamped copy of the full portfolio for history and charts"
          >
            <Camera size={14} />
            Save Snapshot
          </button>
          <button
            type="button"
            className="snapshot-history-btn"
            onClick={handleExportBackup}
            title="Download portfolio + snapshots (+ local scenarios if present) as JSON"
          >
            <Download size={14} />
            Export
          </button>
          <button
            type="button"
            className="snapshot-history-btn"
            onClick={() => importInputRef.current?.click()}
            title="Import a previously exported JSON backup into Neon"
          >
            <Upload size={14} />
            Import
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImportFile(f);
              e.target.value = "";
            }}
          />
          {localData.any && (
            <button
              type="button"
              className="snapshot-btn migrate"
              onClick={handleMigrateLocalData}
              disabled={migrating}
              title="Read this browser's saved data and upload it to Neon"
            >
              <UploadCloud size={14} />
              {migrating ? "Migrating…" : "Migrate Local Data"}
              {!migrating && (
                <span className="migrate-count">
                  {[
                    localData.holdings ? `${localData.holdings} holdings` : null,
                    localData.snapshots ? `${localData.snapshots} snaps` : null,
                    localData.scenarios ? `${localData.scenarios} scenarios` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              )}
            </button>
          )}
          {snapshots.length > 0 && (
            <button
              type="button"
              className="snapshot-history-btn"
              onClick={() => setShowSnapshots(v => !v)}
            >
              <Clock size={14} />
              {snapshots.length} saved
            </button>
          )}

          <div className="overview-toolbar-end">
            {snapshotFlash && <span className="snapshot-flash">{snapshotFlash}</span>}
            <label className="import-replace-lbl">
              <input
                type="checkbox"
                checked={replaceOnImport}
                onChange={(e) => setReplaceOnImport(e.target.checked)}
              />
              Replace cloud data on migrate / import
            </label>
          </div>
        </div>

        <div className="divider-h" style={{ margin: "1.1rem 0" }} />

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
              {incomePeriod === "monthly" ? "Net Monthly (After Progressive IIT)" : "Net Annual (After Progressive IIT)"}
            </span>
            <span className="summary-val" style={{ color: "#d8b4fe" }}>
              {formatLKR(incomePeriod === "monthly" ? grandTotalNetIit / 12 : grandTotalNetIit)}
            </span>
            <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 600, marginTop: "2px" }}>
              Progressive slabs on pooled income
            </span>
          </div>
          <div className="summary-col">
            <span className="summary-lbl">
              {incomePeriod === "monthly" ? "Physical Cash Available (Monthly)" : "Physical Cash Available (Annual)"}
            </span>
            <span className="summary-val" style={{ color: "#fbbf24" }}>
              {formatLKR(incomePeriod === "monthly" ? physicalCashAvailable / 12 : physicalCashAvailable)}
            </span>
            <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 600, marginTop: "2px" }}>
              FD + UT + Treasury + Div + PFCA interest (after WHT)
            </span>
          </div>
          <div className="summary-col equiv-salary-col">
            <span className="summary-lbl">Net {incomePeriod === "monthly" ? "Monthly" : "Annual"} (After IIT + Cash)</span>
            <span className="summary-val" style={{ color: "#fb923c" }}>
              {formatLKR(incomePeriod === "monthly" ? netMonthlyAfterIitAndCash : netAfterIitAndCash)}
            </span>
            <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 600, marginTop: "6px" }}>Equiv. Employee Salary</span>
            <div className="equiv-salary-rows">
              <div className="equiv-row">
                <span className="equiv-flag">🇱🇰</span>
                <div className="equiv-details">
                  <span className="equiv-label">LKR Gross (Prog. tax + EPF 8%)</span>
                  <span className="equiv-amount">
                    {formatLKR(incomePeriod === "monthly" ? equivMonthlySalaryLkr : equivGrossSalaryLkr)}
                    <span className="equiv-period">/{incomePeriod === "monthly" ? "mo" : "yr"}</span>
                  </span>
                </div>
              </div>
              <div className="equiv-row">
                <span className="equiv-flag">🇺🇸</span>
                <div className="equiv-details">
                  <span className="equiv-label">USD Gross (15% flat tax · FX {avgFx.toFixed(0)})</span>
                  <span className="equiv-amount equiv-usd">
                    {formatUSD(incomePeriod === "monthly" ? equivMonthlySalaryUsd : equivGrossSalaryUsd)}
                    <span className="equiv-period">/{incomePeriod === "monthly" ? "mo" : "yr"}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {iitAssessableIncome > 0 && (
          <div className="iit-breakdown">
            <div className="iit-bd-title">
              <Percent size={14} /> Progressive IIT — Year of Assessment 2025/26
            </div>
            <div className="iit-bd-grid">
              <div className="iit-bd-row">
                <span>Pooled annual income (FD + UT + Treasury)</span>
                <strong>{formatLKR(iitAssessableIncome)}</strong>
              </div>
              <div className="iit-bd-row">
                <span>Less: personal relief</span>
                <strong className="text-emerald">−{formatLKR(iit.relief)}</strong>
              </div>
              <div className="iit-bd-row">
                <span>Taxable income</span>
                <strong>{formatLKR(iit.taxableIncome)}</strong>
              </div>
              {iit.slabs.map((slab, i) => (
                <div className="iit-bd-row slab" key={i}>
                  <span>{formatLKR(slab.incomeInSlab)} @ {(slab.rate * 100).toFixed(0)}%</span>
                  <strong>{formatLKR(slab.tax)}</strong>
                </div>
              ))}
              <div className="iit-bd-row">
                <span>Total slab tax</span>
                <strong>{formatLKR(iit.slabTax)}</strong>
              </div>
              <div className="iit-bd-row">
                <span>Less: WHT already paid (FD only)</span>
                <strong className="text-emerald">−{formatLKR(iit.whtCredit)}</strong>
              </div>
              <div className="iit-bd-row total">
                <span>Balance IIT payable</span>
                <strong style={{ color: "#f87171" }}>
                  {formatLKR(iit.balancePayable)} /yr · {formatLKR(iit.balancePayable / 12)} /mo
                </strong>
              </div>
              <div className="iit-bd-row">
                <span>Effective rate on pooled income</span>
                <strong style={{ color: "#d8b4fe" }}>{iit.effectiveRate.toFixed(2)}%</strong>
              </div>
            </div>
            <p className="iit-bd-note">
              Relief of {formatLKR(PERSONAL_RELIEF)} then 6% / 18% / 24% / 30% / 36% slabs, applied once to total
              income — not per category. Only FD withholds 10% WHT at source (credited here). Dividends and PFCA are exempt and excluded from the pool.
            </p>
          </div>
        )}
      </div>

      {showSnapshots && snapshots.length > 0 && (
        <div className="glass-card snapshots-panel animate-fade-in">
          <div className="snapshots-hdr">
            <div>
              <h4 className="snapshots-title"><Camera size={16} /> Portfolio Snapshots</h4>
              <p className="snapshots-sub">Timestamped captures of holdings and totals — ready for charts and history.</p>
            </div>
            <button type="button" className="snapshot-history-btn" onClick={() => setShowSnapshots(false)}>Hide</button>
          </div>
          <div className="snapshots-list">
            {snapshots.map(snap => (
              <div key={snap.id} className="snapshot-row">
                <div className="snapshot-meta">
                  <span className="snapshot-time">{formatSnapTime(snap.timestamp)}</span>
                  <span className="snapshot-invested">{formatLKR(snap.totals.invested)}</span>
                </div>
                <div className="snapshot-metrics">
                  <span>Gross {formatLKR(snap.totals.gross / 12)}/mo</span>
                  <span>Net WHT {formatLKR(snap.totals.netWht / 12)}/mo</span>
                  <span>Net IIT {formatLKR(snap.totals.netIit / 12)}/mo</span>
                  <span>Yield {snap.totals.combinedYield.toFixed(2)}%</span>
                </div>
                <div className="snapshot-cats">
                  <span>FD {formatLKR(snap.totals.investedByCategory.fds)}</span>
                  <span>UT {formatLKR(snap.totals.investedByCategory.uts)}</span>
                  <span>TR {formatLKR(snap.totals.investedByCategory.treasury)}</span>
                  <span>Div {formatLKR(snap.totals.investedByCategory.dividends)}</span>
                  <span>PFCA {formatLKR(snap.totals.investedByCategory.pfcaFds)}</span>
                </div>
                <button
                  type="button"
                  className="snapshot-del"
                  onClick={() => handleDeleteSnapshot(snap.id)}
                  title="Delete snapshot"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
              <span>Net {incomePeriod === "monthly" ? "Monthly" : "Annual"} (Prog. IIT share):</span>
              <span className="val-text" style={{ color: "#d8b4fe" }}>{formatLKR(incomePeriod === "monthly" ? (fdTotals.netWht - iitShare(fdTotals.gross)) / 12 : fdTotals.netWht - iitShare(fdTotals.gross))}</span>
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
              <span>Net {incomePeriod === "monthly" ? "Monthly" : "Annual"} (Prog. IIT share):</span>
              <span className="val-text" style={{ color: "#d8b4fe" }}>{formatLKR(incomePeriod === "monthly" ? (utTotals.netWht - iitShare(utTotals.gross)) / 12 : utTotals.netWht - iitShare(utTotals.gross))}</span>
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
              <span>Net {incomePeriod === "monthly" ? "Monthly" : "Annual"} (No WHT):</span>
              <span className="val-text text-emerald">{formatLKR(incomePeriod === "monthly" ? treasuryTotals.netWht / 12 : treasuryTotals.netWht)}</span>
            </div>
            <div className="metric-item">
              <span>Net {incomePeriod === "monthly" ? "Monthly" : "Annual"} (Prog. IIT share):</span>
              <span className="val-text" style={{ color: "#d8b4fe" }}>{formatLKR(incomePeriod === "monthly" ? (treasuryTotals.netWht - iitShare(treasuryTotals.gross)) / 12 : treasuryTotals.netWht - iitShare(treasuryTotals.gross))}</span>
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
                  {formatUSD(pfcaTotals.investedUsd)} • Interest {pfcaTotals.invested > 0 ? ((pfcaTotals.interestLkr / pfcaTotals.invested) * 100).toFixed(2) : "0.00"}% p.a.
                </span>
              )}
            </div>
          </div>
          <div className="divider-h" style={{ margin: "8px 0" }} />
          <div className="category-metrics-list">
            <div className="metric-item">
              <span>FD Interest {incomePeriod === "monthly" ? "Monthly" : "Yearly"} (LKR):</span>
              <span className="val-text" style={{ color: "#f43f5e" }}>{formatLKR(incomePeriod === "monthly" ? pfcaTotals.interestLkr / 12 : pfcaTotals.interestLkr)}</span>
            </div>
            <div className="metric-item">
              <span>USD Capital Gain {incomePeriod === "monthly" ? "Monthly" : "Yearly"}:</span>
              <span className="val-text text-emerald">+{formatLKR(incomePeriod === "monthly" ? pfcaTotals.fxValuationLkr / 12 : pfcaTotals.fxValuationLkr)}</span>
            </div>
            <div className="metric-item">
              <span>Total {incomePeriod === "monthly" ? "Monthly" : "Yearly"} Income:</span>
              <span className="val-text" style={{ color: "#fb7185" }}>
                {formatLKR(incomePeriod === "monthly" ? pfcaTotals.totalReturnLkr / 12 : pfcaTotals.totalReturnLkr)}
                {pfcaTotals.invested > 0 && ` · ${((pfcaTotals.totalReturnLkr / pfcaTotals.invested) * 100).toFixed(2)}% p.a.`}
              </span>
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
                        <option value="annually">Annually</option>
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
                                  <th>Net (Prog. IIT share)</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="period-col">Monthly</td>
                                  <td>{formatLKR(res.annualGross / 12)}</td>
                                  <td className="text-emerald">{formatLKR(res.netWht / 12)}</td>
                                  <td style={{ color: "#d8b4fe" }}>{formatLKR((res.netWht - iitShare(res.annualGross)) / 12)}</td>
                                </tr>
                                <tr>
                                  <td className="period-col">Annually</td>
                                  <td>{formatLKR(res.annualGross)}</td>
                                  <td className="text-emerald">{formatLKR(res.netWht)}</td>
                                  <td style={{ color: "#d8b4fe" }}>{formatLKR(res.netWht - iitShare(res.annualGross))}</td>
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
                                  <th>Net (Prog. IIT share)</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="period-col">Monthly</td>
                                  <td>{formatLKR(res.annualGross / 12)}</td>
                                  <td className="text-emerald">{formatLKR(res.netWht / 12)}</td>
                                  <td style={{ color: "#d8b4fe" }}>{formatLKR((res.netWht - iitShare(res.annualGross)) / 12)}</td>
                                </tr>
                                <tr>
                                  <td className="period-col">Annually</td>
                                  <td>{formatLKR(res.annualGross)}</td>
                                  <td className="text-emerald">{formatLKR(res.netWht)}</td>
                                  <td style={{ color: "#d8b4fe" }}>{formatLKR(res.netWht - iitShare(res.annualGross))}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          <div className="tax-comparisons-strip red-tax-strip" style={{ marginTop: "8px" }}>
                            <div className="tax-sub-item">
                              <ShieldCheck size={12} style={{ color: "var(--color-emerald)", marginRight: "4px" }} />
                              <span>WHT: <strong>Already deducted at source (yield is net)</strong></span>
                            </div>
                            <div className="tax-sub-item">
                              <Info size={12} style={{ color: "#ef4444", marginRight: "4px" }} />
                              <span>Individual Income Tax (IIT): <strong style={{ color: "#d8b4fe" }}>Included in portfolio progressive IIT pool</strong></span>
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
                                  <th>Net (No WHT)</th>
                                  <th>Net (Prog. IIT share)</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="period-col">Per Coupon</td>
                                  <td>{item.couponValue ? formatLKR(item.couponValue) : "—"}</td>
                                  <td className="text-emerald">{item.couponValue ? formatLKR(item.couponValue) : "—"}</td>
                                  <td style={{ color: "#d8b4fe" }}>{item.couponValue ? formatLKR((res.netWht - iitShare(res.annualGross)) / 2) : "—"}</td>
                                </tr>
                                <tr>
                                  <td className="period-col">Monthly</td>
                                  <td>{formatLKR(res.annualGross / 12)}</td>
                                  <td className="text-emerald">{formatLKR(res.netWht / 12)}</td>
                                  <td style={{ color: "#d8b4fe" }}>{formatLKR((res.netWht - iitShare(res.annualGross)) / 12)}</td>
                                </tr>
                                <tr>
                                  <td className="period-col">Annually</td>
                                  <td>{formatLKR(res.annualGross)}</td>
                                  <td className="text-emerald">{formatLKR(res.netWht)}</td>
                                  <td style={{ color: "#d8b4fe" }}>{formatLKR(res.netWht - iitShare(res.annualGross))}</td>
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
                  <div className="input-group">
                    <label>Est. LKR Depreciation vs USD (% p.a.)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={pfcaDepreciation}
                      onChange={(e) => setPfcaDepreciation(e.target.value)}
                      placeholder="5.0"
                      className="glass-input"
                      required
                      min="0"
                    />
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "4px" }}>
                      Default 5% — long-run historical average LKR depreciation vs USD
                    </span>
                  </div>
                  <div className="div-tax-note">
                    <ShieldCheck size={16} style={{ color: "var(--color-emerald)", flexShrink: 0 }} />
                    <span>PFCA interest is tax-free. Total LKR return = USD interest + currency valuation.</span>
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
                              <span className="div-income-lbl">Yearly FD Interest</span>
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
                              <span className="div-income-lbl">Interest Income (LKR)</span>
                              <span className="pfca-income-val" style={{ color: "#fb7185" }}>
                                {formatLKR(res.interestLkr)} · {res.interestYield.toFixed(2)}%
                              </span>
                            </div>
                            <div className="div-income-row">
                              <span className="div-income-lbl">USD Capital Gain ({res.depreciationRate.toFixed(1)}% dep.)</span>
                              <span className="pfca-income-val text-emerald">
                                +{formatLKR(res.fxValuationLkr)} · {res.fxYield.toFixed(2)}%
                              </span>
                            </div>
                            <div className="div-income-row">
                              <span className="div-income-lbl">Total Income (Interest + FX)</span>
                              <span className="pfca-income-val" style={{ color: "#fb7185" }}>
                                {formatLKR(res.totalReturnLkr)} · {res.totalReturnYield.toFixed(2)}%
                              </span>
                            </div>
                            <div className="div-tax-free-note">
                              <ShieldCheck size={13} />
                              Tax-free • FX {item.exchangeRate.toFixed(2)} → ~{res.endFx.toFixed(2)} LKR/USD
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
          width: 100%;
          box-sizing: border-box;
          padding: 1.5rem;
          margin-bottom: 2rem;
          background: linear-gradient(135deg, rgba(0, 242, 254, 0.03) 0%, rgba(9, 14, 26, 0.4) 100%);
          border-color: rgba(0, 242, 254, 0.15);
        }

        .portfolio-overview-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .overview-title-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1 1 260px;
          min-width: 0;
        }

        .overview-toolbar {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 1.1rem;
        }

        .overview-toolbar-end {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          margin-left: auto;
        }

        @media (max-width: 720px) {
          .overview-toolbar-end {
            margin-left: 0;
            width: 100%;
          }
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

        .split-yield-badge.usd-gain {
          background: rgba(244, 63, 94, 0.08);
          border-color: rgba(244, 63, 94, 0.22);
        }

        .split-yield-badge.combined {
          background: rgba(16, 185, 129, 0.08);
          border-color: rgba(16, 185, 129, 0.22);
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

        .split-yield-badge.usd-gain .split-yield-val {
          color: #fb7185;
        }

        .split-yield-badge.combined .split-yield-val {
          color: var(--color-emerald);
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
          flex: 0 0 auto;
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

        .snapshot-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          border-radius: 8px;
          border: 1px solid rgba(0, 242, 254, 0.28);
          background: rgba(0, 242, 254, 0.08);
          color: var(--color-teal);
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .snapshot-btn:hover {
          background: rgba(0, 242, 254, 0.16);
          transform: translateY(-1px);
        }

        .snapshot-btn.migrate {
          border-color: rgba(251, 191, 36, 0.45);
          background: rgba(251, 191, 36, 0.12);
          color: #fbbf24;
        }

        .snapshot-btn.migrate:hover {
          background: rgba(251, 191, 36, 0.2);
        }

        .migrate-count {
          padding: 2px 6px;
          border-radius: 5px;
          background: rgba(251, 191, 36, 0.18);
          font-size: 0.65rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .snapshot-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .snapshot-history-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-secondary);
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
        }

        .snapshot-history-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.06);
        }

        .snapshot-flash {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--color-emerald);
        }

        .import-replace-lbl {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.65rem;
          font-weight: 600;
          color: var(--text-muted);
          cursor: pointer;
          user-select: none;
        }

        .snapshots-panel {
          padding: 1.1rem 1.25rem;
          margin-bottom: 1.25rem;
        }

        .snapshots-hdr {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 0.9rem;
        }

        .snapshots-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .snapshots-sub {
          margin: 4px 0 0;
          font-size: 0.72rem;
          color: var(--text-muted);
        }

        .snapshots-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .snapshot-row {
          display: grid;
          grid-template-columns: minmax(140px, 1.1fr) minmax(180px, 1.4fr) minmax(160px, 1.6fr) auto;
          gap: 10px 14px;
          align-items: center;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid var(--border-color);
          background: rgba(255, 255, 255, 0.02);
        }

        @media (max-width: 900px) {
          .snapshot-row {
            grid-template-columns: 1fr auto;
          }
          .snapshot-metrics,
          .snapshot-cats {
            grid-column: 1 / -1;
          }
        }

        .snapshot-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .snapshot-time {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .snapshot-invested {
          font-family: var(--font-display);
          font-size: 0.92rem;
          font-weight: 800;
          color: var(--color-teal);
        }

        .snapshot-metrics,
        .snapshot-cats {
          display: flex;
          flex-wrap: wrap;
          gap: 6px 10px;
          font-size: 0.68rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .snapshot-cats span {
          padding: 2px 7px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-color);
        }

        .snapshot-del {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
        }

        .snapshot-del:hover {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
        }

        .portfolio-summary-bar {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 1.5rem;
          width: 100%;
        }

        @media (max-width: 1400px) {
          .portfolio-summary-bar {
            grid-template-columns: repeat(3, 1fr);
            gap: 1.25rem;
          }
        }

        @media (max-width: 900px) {
          .portfolio-summary-bar {
            grid-template-columns: repeat(2, 1fr);
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

        .equiv-salary-col {
          padding: 10px 12px;
          background: rgba(251, 146, 60, 0.06);
          border: 1px solid rgba(251, 146, 60, 0.2);
          border-radius: 12px;
        }

        .equiv-salary-rows {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 4px;
        }

        .equiv-row {
          display: flex;
          align-items: flex-start;
          gap: 6px;
        }

        .equiv-flag {
          font-size: 1rem;
          line-height: 1.4;
          flex-shrink: 0;
        }

        .equiv-details {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .equiv-label {
          font-size: 0.62rem;
          color: var(--text-muted);
          font-weight: 600;
        }

        .equiv-amount {
          font-family: var(--font-display);
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .equiv-usd {
          color: #34d399;
        }

        .equiv-period {
          font-size: 0.65rem;
          color: var(--text-muted);
          font-weight: 500;
          margin-left: 2px;
        }

        .iit-breakdown {
          margin-top: 1.25rem;
          padding: 14px 16px;
          border: 1px solid rgba(216, 180, 254, 0.2);
          border-radius: 10px;
          background: rgba(216, 180, 254, 0.05);
        }

        .iit-bd-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #d8b4fe;
          margin-bottom: 10px;
        }

        .iit-bd-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 4px 2rem;
        }

        @media (max-width: 768px) {
          .iit-bd-grid {
            grid-template-columns: 1fr;
          }
        }

        .iit-bd-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          font-size: 0.76rem;
          color: var(--text-secondary);
          padding: 3px 0;
        }

        .iit-bd-row strong {
          font-family: var(--font-display);
          font-weight: 700;
          color: var(--text-primary);
          white-space: nowrap;
        }

        .iit-bd-row.slab {
          color: var(--text-muted);
          padding-left: 10px;
          border-left: 2px solid rgba(216, 180, 254, 0.25);
        }

        .iit-bd-row.total {
          border-top: 1px solid var(--border-color);
          margin-top: 4px;
          padding-top: 7px;
        }

        .iit-bd-note {
          margin: 10px 0 0;
          font-size: 0.68rem;
          line-height: 1.5;
          color: var(--text-muted);
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
