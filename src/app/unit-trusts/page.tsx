"use client";

import React, { useState, useEffect } from "react";
import { useRates } from "@/context/RatesContext";
import { Compass, Info, Calculator, Landmark, ShieldCheck, Sparkles, HelpCircle } from "lucide-react";

export default function UnitTrusts() {
  const { rates, dataSource, fetchRatesViaGemini, lastUpdated } = useRates();
  
  // Calculator states
  const [initialInvestment, setInitialInvestment] = useState<number>(500000); // 500k default
  const [monthlySip, setMonthlySip] = useState<number>(25000); // 25k monthly default
  const [annualYield, setAnnualYield] = useState<number>(10.85);
  const [years, setYears] = useState<number>(5);

  // Gemini AI Sync Modal states
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [geminiKey, setGeminiKey] = useState<string>("");
  const [aiSyncLoading, setAiSyncLoading] = useState<boolean>(false);
  const [aiSyncStatus, setAiSyncStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Sync rates on load
  useEffect(() => {
    if (rates?.unitTrust?.moneyMarketYield) {
      setAnnualYield(rates.unitTrust.moneyMarketYield);
    }
  }, [rates]);

  // Load Gemini key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem("lankawealth_gemini_key");
    if (savedKey) {
      setGeminiKey(savedKey);
    }
  }, []);

  // Derived yields from context/benchmarks
  const mmYield = rates?.unitTrust?.moneyMarketYield || 10.85;
  const giltYield = rates?.unitTrust?.giltEdgedYield || 9.90;
  const fundsCache = rates?.unitTrust?.funds || {};

  const fundsList = [
    {
      manager: "CAL Investments",
      name: "CAL Money Market Fund",
      type: "Money Market Fund",
      risk: "Low Risk",
      rating: "Fitch AAAf",
      rate: parseFloat(Number(fundsCache["CAL Money Market Fund"] || mmYield).toFixed(2))
    },
    {
      manager: "CAL Investments",
      name: "CAL Income Fund",
      type: "Income Fund",
      risk: "Low-Moderate Risk",
      rating: "Fitch AAf",
      rate: parseFloat(Number(fundsCache["CAL Income Fund"] || (mmYield + 0.40)).toFixed(2))
    },
    {
      manager: "CAL Investments",
      name: "CAL First Income Opportunities Fund (FIOF)",
      type: "Income Fund",
      risk: "Moderate Risk",
      rating: "Fitch BBB+f",
      rate: parseFloat(Number(fundsCache["CAL First Income Opportunities Fund (FIOF)"] || (mmYield + 0.90)).toFixed(2))
    },
    {
      manager: "CAL Investments",
      name: "CAL Gilt Edged Fund",
      type: "Gilt Edged Fund",
      risk: "Very Low Risk",
      rating: "Govt Guaranteed",
      rate: parseFloat(Number(fundsCache["CAL Gilt Edged Fund"] || giltYield).toFixed(2))
    },
    {
      manager: "NDB Wealth Management",
      name: "NDB Wealth Money Market Fund",
      type: "Money Market Fund",
      risk: "Low Risk",
      rating: "Fitch AAf",
      rate: parseFloat(Number(fundsCache["NDB Wealth Money Market Fund"] || (mmYield - 0.25)).toFixed(2))
    },
    {
      manager: "NDB Wealth Management",
      name: "NDB Wealth Income Fund",
      type: "Income Fund",
      risk: "Low-Moderate Risk",
      rating: "Fitch A+f",
      rate: parseFloat(Number(fundsCache["NDB Wealth Income Fund"] || (mmYield + 0.15)).toFixed(2))
    },
    {
      manager: "NDB Wealth Management",
      name: "NDB Wealth Gilt Edged Fund",
      type: "Gilt Edged Fund",
      risk: "Very Low Risk",
      rating: "Govt Guaranteed",
      rate: parseFloat(Number(fundsCache["NDB Wealth Gilt Edged Fund"] || (giltYield - 0.10)).toFixed(2))
    },
    {
      manager: "First Capital Asset Management",
      name: "First Capital Money Market Fund",
      type: "Money Market Fund",
      risk: "Low Risk",
      rating: "Fitch A+f",
      rate: parseFloat(Number(fundsCache["First Capital Money Market Fund"] || (mmYield + 0.15)).toFixed(2))
    },
    {
      manager: "First Capital Asset Management",
      name: "First Capital Gilt Edged Fund",
      type: "Gilt Edged Fund",
      risk: "Very Low Risk",
      rating: "Govt Guaranteed",
      rate: parseFloat(Number(fundsCache["First Capital Gilt Edged Fund"] || (giltYield + 0.15)).toFixed(2))
    },
    {
      manager: "JB Vantage (JB Securities)",
      name: "JB Vantage Money Market Fund",
      type: "Money Market Fund",
      risk: "Low Risk",
      rating: "Fitch AAf",
      rate: parseFloat(Number(fundsCache["JB Vantage Money Market Fund"] || (mmYield - 0.10)).toFixed(2))
    },
    {
      manager: "JB Vantage (JB Securities)",
      name: "JB Vantage Short Term Gilt Fund",
      type: "Gilt Edged Fund",
      risk: "Very Low Risk",
      rating: "Govt Guaranteed",
      rate: parseFloat(Number(fundsCache["JB Vantage Short Term Gilt Fund"] || (giltYield - 0.05)).toFixed(2))
    }
  ];

  // Helper to color code rates based on value
  const getRateColorClass = (rate: number) => {
    if (rate < 8.0) return "rate-red";
    if (rate >= 8.0 && rate < 10.0) return "rate-orange";
    if (rate >= 10.0 && rate <= 12.0) return "rate-yellow";
    return "rate-green";
  };

  // Compound Interest Calculation (Monthly compounding for MMFs)
  const monthlyRate = annualYield / 100 / 12;
  const totalMonths = years * 12;

  // Calculate future value of initial investment
  const fvInitial = initialInvestment * Math.pow(1 + monthlyRate, totalMonths);

  // Calculate future value of monthly annuity (SIP)
  const fvSip = monthlySip > 0 
    ? monthlySip * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate) * (1 + monthlyRate)
    : 0;

  const totalPortfolioValue = fvInitial + fvSip;
  const totalInvested = initialInvestment + (monthlySip * totalMonths);
  const compoundInterestEarned = totalPortfolioValue - totalInvested;

  const formatLKR = (num: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const handleAiSync = async () => {
    if (!geminiKey.trim()) {
      setAiSyncStatus({ success: false, message: "Please enter a valid Gemini API Key." });
      return;
    }
    setAiSyncLoading(true);
    setAiSyncStatus(null);
    const result = await fetchRatesViaGemini(geminiKey);
    setAiSyncLoading(false);
    setAiSyncStatus(result);
    if (result.success) {
      setTimeout(() => setShowAiModal(false), 1500); // Close modal on success after delay
    }
  };

  return (
    <div className="animate-fade-in text-sans-layout">
      {/* Connection status banners */}
      {dataSource === "failed" && (
        <div className="status-error-banner animate-fade-in">
          <span className="error-icon-dot">●</span>
          <span><strong>Connection Failed:</strong> Unable to connect to the rates server. Showing offline default yields.</span>
        </div>
      )}
      {dataSource === "fallback" && (
        <div className="status-warning-banner animate-fade-in">
          <span className="warning-icon-dot">●</span>
          <span><strong>Scraping Offline:</strong> Central Bank of Sri Lanka (CBSL) portal is currently unreachable. Showing system default yields.</span>
        </div>
      )}
      {dataSource === "gemini_ai" && (
        <div className="status-success-banner animate-fade-in">
          <span className="success-icon-dot">●</span>
          <span><strong>Gemini AI Synced:</strong> Rates successfully parsed and synced from live unit trust/bank pages using Gemini AI (Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleDateString() : "Today"}).</span>
        </div>
      )}

      <div className="page-header-container">
        <span className="badge badge-emerald">Liquid Growth</span>
        <h1 className="page-title">Unit Trusts (Mutual Funds)</h1>
        <p className="page-subtitle">
          Enjoy institutional yields with retail liquidity. Unit trusts pool investor funds to purchase high-grade commercial paper and government debt.
        </p>
      </div>

      {/* Tax Alert */}
      <section className="tax-banner glass-card">
        <div className="banner-icon-box">
          <ShieldCheck size={32} className="shield-icon" />
        </div>
        <div className="banner-content">
          <h4>Yields Are Quoted Net of Withholding Tax</h4>
          <p>
            Fixed Deposits attract a mandatory 10% Withholding Tax (WHT) on interest, whereas **Unit Trust yields are already declared net of WHT at fund level — no further WHT is deducted from your returns**. However, distributions still form part of your assessable income, so **36% Individual Income Tax (IIT) applies** for individuals in the top bracket.
          </p>
        </div>
      </section>

      {/* Top Grid - Calculator + Information Guides */}
      <div className="ut-content-grid">
        {/* SIP Calculator */}
        <div className="glass-card calculator-card">
          <div className="card-header-icon">
            <Calculator size={20} className="header-icon" />
            <h3>SIP & Compound Growth Calculator</h3>
          </div>
          <p className="card-desc">Simulate a lump sum investment combined with monthly Systematic Investment Plans (SIP).</p>

          <div className="calculator-inputs">
            <div className="input-row-double">
              <div className="input-group">
                <label>Lump Sum Investment (LKR)</label>
                <input
                  type="number"
                  step="50000"
                  value={initialInvestment}
                  onChange={(e) => setInitialInvestment(Math.max(0, parseInt(e.target.value) || 0))}
                  className="glass-input"
                />
                <span className="input-hint">{formatLKR(initialInvestment)}</span>
              </div>
              <div className="input-group">
                <label>Monthly Contribution (LKR)</label>
                <input
                  type="number"
                  step="5000"
                  value={monthlySip}
                  onChange={(e) => setMonthlySip(Math.max(0, parseInt(e.target.value) || 0))}
                  className="glass-input"
                />
                <span className="input-hint">{formatLKR(monthlySip)} / month</span>
              </div>
            </div>

            <div className="input-row-double">
              <div className="input-group">
                <label>Annual Fund Yield (% p.a.)</label>
                <input
                  type="number"
                  step="0.05"
                  value={annualYield}
                  onChange={(e) => setAnnualYield(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="glass-input"
                />
              </div>
              <div className="input-group">
                <label>Investment Horizon (Years)</label>
                <select
                  value={years}
                  onChange={(e) => setYears(parseInt(e.target.value))}
                  className="glass-input"
                  style={{ background: "#0d1323" }}
                >
                  <option value={1}>1 Year</option>
                  <option value={2}>2 Years</option>
                  <option value={3}>3 Years</option>
                  <option value={5}>5 Years</option>
                  <option value={10}>10 Years</option>
                  <option value={15}>15 Years</option>
                  <option value={20}>20 Years</option>
                </select>
              </div>
            </div>
          </div>

          <div className="divider-h" />

          {/* Results Output */}
          <div className="calculator-results">
            <div className="results-row-grid">
              <div className="result-block">
                <span className="result-label">Total Principal Invested</span>
                <span className="result-val">{formatLKR(totalInvested)}</span>
              </div>
              <div className="result-block">
                <span className="result-label">Compound Returns Earned</span>
                <span className="result-val text-emerald">+{formatLKR(compoundInterestEarned)}</span>
              </div>
              <div className="result-block">
                <span className="result-label">Projected Portfolio Value</span>
                <span className="result-val text-teal">{formatLKR(totalPortfolioValue)}</span>
              </div>
            </div>
            
            {/* Visual growth indicator */}
            <div className="growth-bar-container">
              <div className="growth-bar-fill" style={{ width: `${(totalInvested / totalPortfolioValue) * 100}%`, backgroundColor: "rgba(255,255,255,0.15)" }}>
                <span className="bar-label">Principal ({Math.round((totalInvested / totalPortfolioValue) * 100)}%)</span>
              </div>
              <div className="growth-bar-fill" style={{ width: `${(compoundInterestEarned / totalPortfolioValue) * 100}%`, backgroundColor: "var(--color-emerald)" }}>
                <span className="bar-label">Returns ({Math.round((compoundInterestEarned / totalPortfolioValue) * 100)}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Fund Types Guide card */}
        <div className="glass-card info-display-card">
          <div className="card-header-icon">
            <Compass size={20} className="header-icon" />
            <h3>Sri Lankan Fund Categories</h3>
          </div>

          <div className="guide-box-ut">
            <h5>Money Market Funds (MMF)</h5>
            <p>
              Invests in high-grade bank deposits and commercial paper under 1 year. Provides high yields, flat growth curves, and T+1 liquidity.
            </p>
          </div>

          <div className="guide-box-ut">
            <h5>Gilt Edged Funds (Treasury)</h5>
            <p>
              Invests exclusively in Government Treasury Bills and Bonds. Zero credit default risk. Yields track sovereign T-bill trends.
            </p>
          </div>

          <div className="guide-box-ut">
            <h5>Income Funds</h5>
            <p>
              Invests in medium-term corporate bonds and debentures. Offers higher yield potential than MMFs but carries slightly longer lockups and credit exposure.
            </p>
          </div>
        </div>
      </div>

      {/* Comprehensive Funds Table Section */}
      <section className="comprehensive-table-section">
        <div className="glass-card table-card-container">
          <div className="table-header-box">
            <div className="header-title-wrapper">
              <Landmark size={22} className="header-icon-table" />
              <div>
                <h3>Comprehensive Unit Trust Index</h3>
                <p className="table-subtitle-text">Compare yield rates, credit profiles, risk bands, and application details for regulated Sri Lankan funds.</p>
              </div>
            </div>

            {/* Sync Button & Color Legend container */}
            <div className="table-controls-wrapper">
              <button className="gemini-sync-btn" onClick={() => setShowAiModal(true)}>
                <Sparkles size={14} style={{ marginRight: "6px" }} />
                Sync via Gemini AI
              </button>
              
              <div className="legend-box">
                <span className="legend-title">Yield Color Index:</span>
                <div className="legend-pills">
                  <span className="legend-pill label-red">Below 8%</span>
                  <span className="legend-pill label-orange">8% - 10%</span>
                  <span className="legend-pill label-yellow">10% - 12%</span>
                  <span className="legend-pill label-green">Above 12%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="table-wrapper-responsive">
            <table className="fd-rates-table">
              <thead>
                <tr>
                  <th>Fund Manager</th>
                  <th>Fund Name</th>
                  <th>Fund Type</th>
                  <th>Risk Profile</th>
                  <th>Security / Credit Rating</th>
                  <th>Current Annual Yield</th>
                </tr>
              </thead>
              <tbody>
                {fundsList.map((fund) => {
                  return (
                    <tr key={fund.name}>
                      <td className="inst-name-cell">
                        <strong>{fund.manager}</strong>
                      </td>
                      <td>{fund.name}</td>
                      <td>
                        <span className="inst-pill-tag bank-tag">{fund.type}</span>
                      </td>
                      <td>
                        <span className={`risk-tag-badge ${fund.risk.includes("Very Low") ? "risk-very-low" : fund.risk.includes("Low-Moderate") ? "risk-moderate" : "risk-low"}`}>
                          {fund.risk}
                        </span>
                      </td>
                      <td>
                        <span className="rating-tag">{fund.rating}</span>
                      </td>
                      {/* Current Yield */}
                      <td className="rate-cell">
                        <div className="rate-apply-row">
                          <span className={`rate-val-cell ${getRateColorClass(fund.rate)}`}>{fund.rate.toFixed(2)}%</span>
                          <button className="apply-table-btn" onClick={() => setAnnualYield(fund.rate)}>
                            Apply
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="wht-footer-disclaimer">
            <Info size={14} className="info-icon" />
            <p>
              * Fund yields are published net of all management fees by licensed fund managers, regulated by the Securities and Exchange Commission (SEC) of Sri Lanka. Money Market and Gilt Edged funds offer T+1 liquidity (withdrawal processing within 24-48 business hours) with no entry, exit, or early redemption fees.
            </p>
          </div>
        </div>
      </section>

      {/* Gemini AI Sync Modal */}
      {showAiModal && (
        <div className="ai-modal-backdrop" onClick={() => !aiSyncLoading && setShowAiModal(false)}>
          <div className="glass-card ai-modal-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="ai-modal-header">
              <Sparkles size={20} className="ai-sparkle-icon" />
              <h3>Sync Rates via Gemini AI</h3>
            </div>
            
            <p className="ai-modal-desc">
              Connect directly to Google Gemini API to parse interest rates from the official bank and fund websites in real-time. This fetches the pages dynamically and extracts current LKR yields.
            </p>

            <div className="ai-input-group">
              <label>Gemini API Key</label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="glass-input"
              />
              <span className="ai-input-tip">
                Don't have a key? Get a free API Key from the <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" style={{ color: "var(--color-teal)", textDecoration: "underline" }}>Google AI Studio Portal</a>.
              </span>
            </div>

            {aiSyncStatus && (
              <div className={`ai-sync-status-box ${aiSyncStatus.success ? "success" : "error"}`}>
                {aiSyncStatus.message}
              </div>
            )}

            <div className="ai-modal-actions">
              <button 
                className="ai-cancel-btn" 
                onClick={() => setShowAiModal(false)}
                disabled={aiSyncLoading}
              >
                Cancel
              </button>
              <button 
                className="ai-submit-btn" 
                onClick={handleAiSync}
                disabled={aiSyncLoading}
              >
                {aiSyncLoading ? "Syncing Rates..." : "Start AI Sync"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .ut-content-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        @media (max-width: 1024px) {
          .ut-content-grid {
            grid-template-columns: 1fr;
          }
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

        .card-header-icon {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 1.25rem;
        }

        .header-icon {
          color: var(--color-emerald);
        }

        .card-header-icon h3 {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 1.25rem;
        }

        .card-desc {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-bottom: 1.25rem;
          margin-top: -6px;
        }

        .calculator-inputs {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .input-row-double {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        @media (max-width: 500px) {
          .input-row-double {
            grid-template-columns: 1fr;
          }
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .input-group label {
          font-size: 0.8rem;
          color: var(--text-secondary);
          font-weight: 600;
        }

        .input-hint {
          font-size: 0.75rem;
          color: var(--color-emerald);
          font-weight: 500;
          margin-top: 2px;
        }

        .divider-h {
          height: 1px;
          background: var(--border-color);
          margin: 1.5rem 0;
        }

        /* Results section */
        .results-row-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        @media (max-width: 500px) {
          .results-row-grid {
            grid-template-columns: 1fr;
            gap: 1.25rem;
          }
        }

        .result-block {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .result-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
        }

        .result-val {
          font-family: var(--font-display);
          font-size: 1.3rem;
          font-weight: 800;
        }

        .text-teal { color: var(--color-teal); }
        .text-emerald { color: var(--color-emerald); }

        /* Growth visual bar */
        .growth-bar-container {
          display: flex;
          height: 36px;
          border-radius: 8px;
          overflow: hidden;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border-color);
        }

        .growth-bar-fill {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
          color: #04060c;
          transition: width 0.3s ease;
        }

        .growth-bar-fill:first-child {
          color: var(--text-primary);
        }

        /* Right Column Info Cards */
        .info-display-card {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .guide-box-ut h5 {
          font-family: var(--font-display);
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 6px;
        }

        .guide-box-ut p {
          font-size: 0.8rem;
          color: var(--text-secondary);
          line-height: 1.45;
        }

        /* Comprehensive Table Section */
        .comprehensive-table-section {
          margin-bottom: 3rem;
        }

        .table-card-container {
          padding: 2rem;
        }

        .table-header-box {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1.5rem;
        }

        .header-title-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .header-icon-table {
          color: var(--color-emerald);
        }

        .header-title-wrapper h3 {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 1.35rem;
        }

        .table-subtitle-text {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-top: 2px;
        }

        .table-controls-wrapper {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .legend-box {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 6px 12px;
        }

        .legend-title {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
        }

        .legend-pills {
          display: flex;
          gap: 8px;
        }

        .legend-pill {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .label-red { background: rgba(239, 68, 68, 0.12); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
        .label-orange { background: rgba(249, 115, 22, 0.12); color: #f97316; border: 1px solid rgba(249, 115, 22, 0.2); }
        .label-yellow { background: rgba(234, 179, 8, 0.12); color: #eab308; border: 1px solid rgba(234, 179, 8, 0.2); }
        .label-green { background: rgba(34, 197, 94, 0.12); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.2); }

        .table-wrapper-responsive {
          width: 100%;
          overflow-x: auto;
        }

        .fd-rates-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.85rem;
        }

        .fd-rates-table th {
          background: rgba(255,255,255,0.01);
          color: var(--text-secondary);
          font-weight: 600;
          padding: 0.85rem 1rem;
          border-bottom: 1px solid var(--border-color);
        }

        .fd-rates-table td {
          padding: 0.85rem 1rem;
          border-bottom: 1px solid var(--border-color);
          color: var(--text-secondary);
        }

        .fd-rates-table tr:hover td {
          background: rgba(255,255,255,0.01);
          color: var(--text-primary);
        }

        .inst-name-cell {
          font-size: 0.9rem;
          color: var(--text-primary);
        }

        .inst-pill-tag {
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .bank-tag {
          background: rgba(16, 185, 129, 0.08);
          color: var(--color-emerald);
          border: 1px solid rgba(16, 185, 129, 0.15);
        }

        /* Risk level badges */
        .risk-tag-badge {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
          text-transform: capitalize;
        }

        .risk-very-low {
          background: rgba(59, 130, 246, 0.08);
          color: #3b82f6;
          border: 1px solid rgba(59, 130, 246, 0.15);
        }

        .risk-low {
          background: rgba(16, 185, 129, 0.08);
          color: var(--color-emerald);
          border: 1px solid rgba(16, 185, 129, 0.15);
        }

        .risk-moderate {
          background: rgba(249, 115, 22, 0.08);
          color: #f97316;
          border: 1px solid rgba(249, 115, 22, 0.15);
        }

        .rating-tag {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-primary);
          background: rgba(255,255,255,0.04);
          padding: 2px 6px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
        }

        .rate-cell {
          vertical-align: middle;
        }

        .rate-apply-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 140px;
          gap: 12px;
        }

        .rate-val-cell {
          font-family: var(--font-display);
          font-size: 1rem;
          font-weight: 700;
        }

        .rate-red { color: #ef4444; }
        .rate-orange { color: #f97316; }
        .rate-yellow { color: #eab308; }
        .rate-green { color: #22c55e; }

        .apply-table-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          opacity: 0;
        }

        .fd-rates-table tr:hover .apply-table-btn {
          opacity: 1;
        }

        .apply-table-btn:hover {
          background: rgba(16, 185, 129, 0.08);
          border-color: rgba(16, 185, 129, 0.3);
          color: var(--color-emerald);
        }

        .wht-footer-disclaimer {
          display: flex;
          gap: 8px;
          border-top: 1px dashed var(--border-color);
          padding-top: 1rem;
          margin-top: 1.5rem;
        }

        .info-icon {
          color: var(--text-muted);
          flex-shrink: 0;
          margin-top: 2px;
        }

        .wht-footer-disclaimer p {
          font-size: 0.725rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        /* Banner styles */
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

        /* Gemini AI Sync Modal Styles */
        .ai-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
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
          border-color: rgba(16, 185, 129, 0.2);
          box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.8), 0 0 30px rgba(16, 185, 129, 0.05);
          animation: fadeIn 0.3s ease;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .ai-modal-header {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .ai-sparkle-icon {
          color: var(--color-emerald);
        }

        .ai-modal-header h3 {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 700;
        }

        .ai-modal-desc {
          font-size: 0.8rem;
          color: var(--text-secondary);
          line-height: 1.45;
        }

        .ai-input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .ai-input-group label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .ai-input-tip {
          font-size: 0.75rem;
          color: var(--text-muted);
          line-height: 1.35;
        }

        .ai-sync-status-box {
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 500;
          word-break: break-word;
        }

        .ai-sync-status-box.success {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: var(--color-emerald);
        }

        .ai-sync-status-box.error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #ef4444;
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
          background: linear-gradient(135deg, var(--color-emerald) 0%, var(--color-teal) 100%);
          border: none;
          color: #04060c;
          padding: 0.6rem 1.2rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2);
        }

        .ai-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 15px rgba(16, 185, 129, 0.3);
        }

        .ai-submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .gemini-sync-btn {
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: var(--color-emerald);
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.05);
        }

        .gemini-sync-btn:hover {
          background: rgba(16, 185, 129, 0.15);
          border-color: rgba(16, 185, 129, 0.4);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1);
        }
      `}</style>
    </div>
  );
}
