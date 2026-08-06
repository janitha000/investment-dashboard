"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRates } from "@/context/RatesContext";
import PortfolioSimulator from "@/components/PortfolioSimulator";
import {
  TrendingUp,
  Landmark,
  Compass,
  Wallet,
  LineChart,
  Home,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Info,
  Coins,
  Globe,
  Briefcase
} from "lucide-react";

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
  tenureDaysOrYears: number;
}

interface DividendInvestment {
  id: string;
  company: string;
  amount: number;
  yearlyDividend: number;
}

interface PfcaFdInvestment {
  id: string;
  institution: string;
  amount: number;
  rate: number;
  maturityType: "monthly" | "quarterly" | "maturity";
  exchangeRate: number;
  depreciationRate?: number;
}

interface PortfolioState {
  fds: FdInvestment[];
  uts: UtInvestment[];
  treasury: TreasuryInvestment[];
  dividends?: DividendInvestment[];
  pfcaFds?: PfcaFdInvestment[];
}

export default function Dashboard() {
  const { rates } = useRates();
  const [portfolio, setPortfolio] = useState<PortfolioState | null>(null);
  const [incomePeriod, setIncomePeriod] = useState<"monthly" | "annual">("monthly");

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

  const assetSummaries = [
    {
      name: "Treasury Securities",
      path: "/treasury",
      icon: Wallet,
      yield: `${rates.treasury.tb12m.toFixed(2)}%`,
      risk: "Sovereign (Risk-Free)",
      liquidity: "High (Secondary Market)",
      color: "var(--color-indigo)",
      tag: "Sovereign Guarantee",
      desc: "Debt instruments backed by the Central Bank of Sri Lanka.",
    },
    {
      name: "Unit Trusts",
      path: "/unit-trusts",
      icon: Compass,
      yield: `${rates.unitTrust.moneyMarketYield.toFixed(2)}%`,
      risk: "Low - Moderate",
      liquidity: "High (1-2 days withdrawal)",
      color: "var(--color-emerald)",
      tag: "Liquid MM Funds",
      desc: "Professionally managed pools investing in short-term corporate & state debt.",
    },
    {
      name: "Fixed Deposits",
      path: "/fixed-deposits",
      icon: Landmark,
      yield: `${rates.fixedDeposit.bankAverage12m.toFixed(2)}%`,
      risk: "Low (Bank Guaranteed)",
      liquidity: "Moderate (Tenure locked)",
      color: "var(--color-teal)",
      tag: "Stable Payouts",
      desc: "Fixed term deposits across licensed banks and finance institutions.",
    },
    {
      name: "Corporate Debentures",
      path: "/corporate-debentures",
      icon: Coins,
      yield: `${rates.corporateDebenture.averageYield.toFixed(2)}%`,
      risk: "Moderate (Corporate Credit)",
      liquidity: "Moderate (CSE Traded)",
      color: "#a855f7",
      tag: "Regular Fixed Coupon",
      desc: "CSE-listed corporate debt issues offering premium fixed coupon rates.",
    },
    {
      name: "Stock Market (CSE)",
      path: "/stock-market",
      icon: LineChart,
      yield: `${rates.cse.averageDividendYield.toFixed(2)}%`,
      risk: "High Market Risk",
      liquidity: "High (T+2 Settlement)",
      color: "#6366f1",
      tag: "Dividends + Capital Gains",
      desc: "Regular dividend payouts from listed blue-chip companies.",
    },
    {
      name: "Real Estate (Rental)",
      path: "/real-estate",
      icon: Home,
      yield: `${rates.realEstate.commercialYield.toFixed(2)}%`,
      risk: "Moderate - High",
      liquidity: "Low (Asset illiquidity)",
      color: "var(--color-gold)",
      tag: "Rent & Appreciation",
      desc: "Physical property rental yields and commercial warehouse leases.",
    },
    {
      name: "PFCA FD (USD)",
      path: "/pfca-fds",
      icon: Globe,
      yield: `${rates.pfcaFd.usdYield12m.toFixed(2)}%`,
      risk: "Low (LKR Currency Hedged)",
      liquidity: "Moderate (Tenure locked)",
      color: "#f43f5e",
      tag: "USD Capital Protection",
      desc: "Foreign currency term deposits shielding capital against domestic LKR devaluation.",
    },
  ];

  // Helper calculations for portfolio totals
  const getPortfolioTotals = () => {
    if (!portfolio) return { invested: 0, fds: 0, uts: 0, treasury: 0, dividends: 0, pfcaFds: 0, gross: 0, netWht: 0, wht: 0, netIit: 0 };

    let fdInvested = 0;
    let fdGross = 0;
    let fdNetWht = 0;
    let fdWht = 0;
    let fdNetIit = 0;

    (portfolio.fds || []).forEach(item => {
      const gross = item.amount * (item.rate / 100);
      const tax = gross * 0.10;
      const iit = gross * 0.36;
      fdInvested += item.amount;
      fdGross += gross;
      fdNetWht += (gross - tax);
      fdWht += tax;
      fdNetIit += (gross - iit);
    });

    let utInvested = 0;
    let utGross = 0;
    let utNetWht = 0;
    let utWht = 0;
    let utNetIit = 0;

    (portfolio.uts || []).forEach(item => {
      const gross = item.amount * (item.rate / 100);
      const iit = gross * 0.36;
      utInvested += item.amount;
      utGross += gross;
      utNetWht += gross; // Yield already quoted net of WHT
      utNetIit += (gross - iit);
    });

    let trInvested = 0;
    let trGross = 0;
    let trNetWht = 0;
    let trWht = 0;
    let trNetIit = 0;

    (portfolio.treasury || []).forEach(item => {
      const gross = item.amount * (item.rate / 100);
      const tax = gross * 0.10;
      const iit = gross * 0.36;
      trInvested += item.amount;
      trGross += gross;
      trNetWht += (gross - tax);
      trWht += tax;
      trNetIit += (gross - iit);
    });

    let divInvested = 0;
    let divGross = 0;

    (portfolio.dividends || []).forEach(item => {
      divInvested += item.amount;
      divGross += item.yearlyDividend; // Tax-free
    });

    let pfcaInvested = 0;
    let pfcaGross = 0;

    (portfolio.pfcaFds || []).forEach(item => {
      const fx = item.exchangeRate || 310;
      const dep = (item.depreciationRate ?? 5) / 100;
      const r = item.rate / 100;
      pfcaInvested += item.amount * fx;
      // Interest at year-end FX + USD capital gain both count as income
      pfcaGross += item.amount * fx * ((1 + r) * (1 + dep) - 1);
    });

    const grandInvested = fdInvested + utInvested + trInvested + divInvested + pfcaInvested;
    const grandGross = fdGross + utGross + trGross + divGross + pfcaGross;
    const grandNetWht = fdNetWht + utNetWht + trNetWht + divGross + pfcaGross;
    const grandWht = fdWht + utWht + trWht;
    const grandNetIit = fdNetIit + utNetIit + trNetIit + divGross + pfcaGross;

    return {
      invested: grandInvested,
      fds: fdInvested,
      uts: utInvested,
      treasury: trInvested,
      dividends: divInvested,
      pfcaFds: pfcaInvested,
      gross: grandGross,
      netWht: grandNetWht,
      wht: grandWht,
      netIit: grandNetIit
    };
  };

  const totals = getPortfolioTotals();
  const hasActiveInvestments = totals.invested > 0;

  const formatLKR = (num: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="animate-fade-in text-sans-layout">
      {/* Header Banner */}
      <section className="welcome-banner glass-card">
        <div className="banner-text">
          <span className="badge badge-teal">Sri Lankan Context</span>
          <h1 className="page-title" style={{ marginTop: "8px" }}>
            Investment Dashboard
          </h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Identify, compare, and simulate local wealth utilization opportunities. Monitor daily central bank rates and construct your optimal passive allocation.
          </p>
        </div>
        <div className="banner-decor">
          <ShieldCheck className="decor-icon" size={80} />
        </div>
      </section>

      {/* Active Portfolio Summary Panel (Home Screen) */}
      {hasActiveInvestments ? (
        <section className="active-portfolio-section animate-fade-in" style={{ marginBottom: "2.5rem" }}>
          <h2 className="section-title">My Active Portfolio Overview</h2>
          <div className="glass-card active-portfolio-home-card">
            <div className="portfolio-home-top">
              <div className="portfolio-icon-title">
                <Briefcase size={22} style={{ color: "var(--color-teal)" }} />
                <div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                    <h3>{formatLKR(totals.invested)}</h3>
                    {totals.invested > 0 && (
                      <span className="badge badge-teal" style={{ fontSize: "0.75rem", padding: "2px 6px" }}>
                        {((totals.gross / totals.invested) * 100).toFixed(2)}% Weighted Yield
                      </span>
                    )}
                  </div>
                  <p>Total Capital Invested across Asset Classes</p>
                </div>
              </div>

              {/* Income period switcher tabs */}
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

              <Link href="/portfolio" className="manage-portfolio-link-btn">
                Manage Portfolio <ArrowUpRight size={15} style={{ marginLeft: "4px" }} />
              </Link>
            </div>

            <div className="divider-h" style={{ margin: "1.25rem 0" }} />

            <div className="portfolio-home-grid">
              <div className="home-portfolio-col">
                <span className="col-lbl">Fixed Deposits (FD)</span>
                <span className="col-val text-teal">{formatLKR(totals.fds)}</span>
              </div>
              <div className="home-portfolio-col">
                <span className="col-lbl">Unit Trusts (Mutual Funds)</span>
                <span className="col-val text-emerald">{formatLKR(totals.uts)}</span>
              </div>
              <div className="home-portfolio-col">
                <span className="col-lbl">Treasury Securities</span>
                <span className="col-val text-indigo">{formatLKR(totals.treasury)}</span>
              </div>
              <div className="home-portfolio-col">
                <span className="col-lbl">Dividends (Tax-Free)</span>
                <span className="col-val" style={{ color: "#6366f1" }}>{formatLKR(totals.dividends)}</span>
              </div>
              <div className="home-portfolio-col">
                <span className="col-lbl">PFCA FDs (Tax-Free)</span>
                <span className="col-val" style={{ color: "#f43f5e" }}>{formatLKR(totals.pfcaFds)}</span>
              </div>
              <div className="home-portfolio-col">
                <span className="col-lbl">
                  {incomePeriod === "monthly" ? "Gross Monthly Income" : "Gross Annual Income"}
                </span>
                <span className="col-val text-teal">
                  {formatLKR(incomePeriod === "monthly" ? totals.gross / 12 : totals.gross)}
                </span>
              </div>
              <div className="home-portfolio-col">
                <span className="col-lbl">
                  {incomePeriod === "monthly" ? "Net Income (After WHT)" : "Net Income (After WHT)"}
                </span>
                <span className="col-val text-emerald">
                  {formatLKR(incomePeriod === "monthly" ? totals.netWht / 12 : totals.netWht)}
                </span>
              </div>
            </div>

            {/* Asset Allocation segmented progress bar */}
            <div className="allocation-progress-bar-container">
              {totals.fds > 0 && (
                <div 
                  className="bar-segment fd-segment" 
                  style={{ width: `${(totals.fds / totals.invested) * 100}%` }}
                >
                  FD ({Math.round((totals.fds / totals.invested) * 100)}%)
                </div>
              )}
              {totals.uts > 0 && (
                <div 
                  className="bar-segment ut-segment" 
                  style={{ width: `${(totals.uts / totals.invested) * 100}%` }}
                >
                  UT ({Math.round((totals.uts / totals.invested) * 100)}%)
                </div>
              )}
              {totals.treasury > 0 && (
                <div 
                  className="bar-segment tr-segment" 
                  style={{ width: `${(totals.treasury / totals.invested) * 100}%` }}
                >
                  Treasury ({Math.round((totals.treasury / totals.invested) * 100)}%)
                </div>
              )}
              {totals.dividends > 0 && (
                <div 
                  className="bar-segment div-segment" 
                  style={{ width: `${(totals.dividends / totals.invested) * 100}%` }}
                >
                  Div ({Math.round((totals.dividends / totals.invested) * 100)}%)
                </div>
              )}
              {totals.pfcaFds > 0 && (
                <div 
                  className="bar-segment pfca-segment" 
                  style={{ width: `${(totals.pfcaFds / totals.invested) * 100}%` }}
                >
                  PFCA ({Math.round((totals.pfcaFds / totals.invested) * 100)}%)
                </div>
              )}
            </div>

            {/* Tax brackets display */}
            <div className="portfolio-home-tax-box">
              <div className="tax-summary-row">
                <span style={{ color: "#d8b4fe" }}>
                  {incomePeriod === "monthly" ? "Net Monthly after 36% Individual Income Tax (IIT): " : "Net Annual after 36% Individual Income Tax (IIT): "}
                  <strong>{formatLKR(incomePeriod === "monthly" ? totals.netIit / 12 : totals.netIit)}</strong>
                </span>
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* Empty Portfolio State Prompt Card */
        <section className="active-portfolio-section" style={{ marginBottom: "2.5rem" }}>
          <h2 className="section-title">My Active Portfolio Overview</h2>
          <div className="glass-card welcome-portfolio-pitch-card">
            <div className="pitch-text-box">
              <h4>Build and Simulate Your Current Portfolio</h4>
              <p>Add your active Fixed Deposits, Unit Trusts, Treasury Holdings, Dividends, and PFCA FDs to track cumulative yield generation, visualize asset allocation, and calculate WHT vs. 36% personal tax bracket impacts.</p>
            </div>
            <Link href="/portfolio" className="pitch-portfolio-btn">
              Configure My Portfolio
            </Link>
          </div>
        </section>
      )}

      {/* Asset Quick Overview Cards */}
      <section className="assets-grid-section">
        <h2 className="section-title">Passive Income Opportunities</h2>
        <div className="grid-cols-3" style={{ marginBottom: "2.5rem" }}>
          {assetSummaries.map((asset) => {
            const Icon = asset.icon;
            return (
              <Link href={asset.path} key={asset.name} style={{ textDecoration: "none" }}>
                <div className="glass-card asset-summary-card">
                  <div className="card-top">
                    <div className="icon-wrapper" style={{ backgroundColor: `${asset.color}15`, color: asset.color }}>
                      <Icon size={20} />
                    </div>
                    <span className="summary-badge" style={{ borderColor: `${asset.color}30`, color: asset.color, background: `${asset.color}05` }}>
                      {asset.tag}
                    </span>
                  </div>
                  <div className="card-middle">
                    <h4>{asset.name}</h4>
                    <p className="card-desc-text">{asset.desc}</p>
                  </div>
                  <div className="card-bottom">
                    <div className="stat-row">
                      <span className="label">Current Yield:</span>
                      <span className="val yield-val" style={{ color: asset.color }}>{asset.yield}</span>
                    </div>
                    <div className="stat-row">
                      <span className="label">Risk Level:</span>
                      <span className="val text-white">{asset.risk}</span>
                    </div>
                    <div className="card-link-action" style={{ color: asset.color }}>
                      <span>View Details</span>
                      <ArrowUpRight size={14} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Interactive Portfolio Simulator */}
      <section className="simulator-section">
        <h2 className="section-title">Portfolio Allocation Simulator</h2>
        <PortfolioSimulator />
      </section>

      {/* Comparison Grid Matrix */}
      <section className="matrix-section">
        <h2 className="section-title">Comparative Investment Matrix</h2>
        <div className="glass-card matrix-card">
          <div className="table-responsive">
            <table className="matrix-table">
              <thead>
                <tr>
                  <th>Asset Opportunity</th>
                  <th>Yield Range (Current)</th>
                  <th>Risk Profile</th>
                  <th>Capital Security</th>
                  <th>Payout Cycle</th>
                  <th>Sri Lankan Tax Treatment</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Treasury Bills (T-Bills)</strong></td>
                  <td className="text-teal">{rates.treasury.tb3m.toFixed(2)}% - {rates.treasury.tb12m.toFixed(2)}%</td>
                  <td>Sovereign</td>
                  <td>100% Backed by CBSL</td>
                  <td>At Maturity (Discounted bond)</td>
                  <td>10% WHT deducted at source</td>
                </tr>
                <tr>
                  <td><strong>Unit Trust (Money Market)</strong></td>
                  <td className="text-emerald">{rates.unitTrust.moneyMarketYield.toFixed(2)}%</td>
                  <td>Low</td>
                  <td>No Guarantee (highly diversified)</td>
                  <td>Daily compounding / monthly payout</td>
                  <td>Quoted yield is net of WHT; 36% IIT applies</td>
                </tr>
                <tr>
                  <td><strong>Fixed Deposits (FD)</strong></td>
                  <td className="text-teal">{rates.fixedDeposit.bankAverage1m.toFixed(2)}% - {rates.fixedDeposit.financeAverage12m.toFixed(2)}%</td>
                  <td>Low</td>
                  <td>Regulated (insured up to LKR 1.1M)</td>
                  <td>Monthly, Quarterly, or Maturity payouts</td>
                  <td>10% WHT deducted at source</td>
                </tr>
                <tr>
                  <td><strong>Corporate Debentures</strong></td>
                  <td className="text-teal">{(rates.corporateDebenture.averageYield - 1).toFixed(2)}% - {(rates.corporateDebenture.averageYield + 1.5).toFixed(2)}%</td>
                  <td>Moderate</td>
                  <td>Unsecured corporate credit profile</td>
                  <td>Monthly, Quarterly, or Annual coupon payments</td>
                  <td>10% WHT deducted at source</td>
                </tr>
                <tr>
                  <td><strong>Stock Market (CSE)</strong></td>
                  <td className="text-teal">5.0% - 15.0%+</td>
                  <td>High</td>
                  <td>No Protection (capital variance exposure)</td>
                  <td>Bi-annual / annual dividend cycles</td>
                  <td>Dividends tax-free or WHT-deducted; Capital Gains tax-free</td>
                </tr>
                <tr>
                  <td><strong>Real Estate (Rental)</strong></td>
                  <td className="text-teal">4.0% - 8.0%</td>
                  <td>Moderate</td>
                  <td>Physical real asset backing</td>
                  <td>Monthly rental collection yields</td>
                  <td>Income taxed at personal brackets</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <style jsx>{`
        /* Portfolio Pitch Welcome Card */
        .welcome-portfolio-pitch-card {
          padding: 1.5rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 2rem;
          background: linear-gradient(135deg, rgba(0, 242, 254, 0.02) 0%, rgba(9, 14, 26, 0.4) 100%);
          border-color: rgba(0, 242, 254, 0.1);
        }

        @media (max-width: 768px) {
          .welcome-portfolio-pitch-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 1.25rem;
          }
        }

        .pitch-text-box h4 {
          font-family: var(--font-display);
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .pitch-text-box p {
          font-size: 0.8rem;
          color: var(--text-secondary);
          line-height: 1.45;
        }

        .pitch-portfolio-btn {
          background: rgba(0, 242, 254, 0.08);
          border: 1px solid rgba(0, 242, 254, 0.2);
          color: var(--color-teal);
          padding: 0.65rem 1.25rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .pitch-portfolio-btn:hover {
          background: rgba(0, 242, 254, 0.15);
          transform: translateY(-1px);
        }

        /* Active Portfolio Home Card */
        .active-portfolio-home-card {
          padding: 1.5rem;
          border-color: rgba(0, 242, 254, 0.15);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
          background: linear-gradient(135deg, rgba(9, 14, 26, 0.6) 0%, rgba(13, 20, 35, 0.4) 100%);
        }

        .portfolio-home-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .portfolio-icon-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .portfolio-icon-title h3 {
          font-family: var(--font-display);
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .portfolio-icon-title p {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .manage-portfolio-link-btn {
          background: linear-gradient(135deg, var(--color-teal) 0%, var(--color-indigo) 100%);
          color: #04060c;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          text-decoration: none;
          display: flex;
          align-items: center;
          transition: all 0.2s ease;
          box-shadow: 0 4px 10px rgba(0, 242, 254, 0.15);
        }

        .manage-portfolio-link-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 15px rgba(0, 242, 254, 0.25);
        }

        .portfolio-home-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 1.5rem;
          margin-bottom: 1.25rem;
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

        @media (max-width: 800px) {
          .portfolio-home-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
          }
        }

        @media (max-width: 480px) {
          .portfolio-home-grid {
            grid-template-columns: 1fr;
          }
        }

        .home-portfolio-col {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .col-lbl {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .col-val {
          font-family: var(--font-display);
          font-size: 1.1rem;
          font-weight: 700;
        }

        .text-teal { color: var(--color-teal); }
        .text-emerald { color: var(--color-emerald); }
        .text-indigo { color: var(--color-indigo); }
        .text-coral { color: #ef4444; }

        /* Segmented Progress Bar */
        .allocation-progress-bar-container {
          display: flex;
          height: 28px;
          border-radius: 6px;
          overflow: hidden;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border-color);
          margin-bottom: 1.25rem;
        }

        .bar-segment {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 700;
          color: #04060c;
          transition: width 0.3s ease;
        }

        .fd-segment {
          background: var(--color-teal);
        }

        .ut-segment {
          background: var(--color-emerald);
        }

        .tr-segment {
          background: var(--color-indigo);
          color: #ffffff;
        }

        .div-segment {
          background: #6366f1;
          color: #ffffff;
        }

        .pfca-segment {
          background: #f43f5e;
          color: #ffffff;
        }

        .portfolio-home-tax-box {
          border-top: 1px dashed var(--border-color);
          padding-top: 10px;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .tax-summary-row {
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
        }

        .divider-h {
          height: 1px;
          background: var(--border-color);
        }
      `}</style>
    </div>
  );
}
