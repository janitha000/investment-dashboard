"use client";

import React, { useState, useEffect } from "react";
import { useRates } from "@/context/RatesContext";
import { Landmark, Info, Calculator, ShieldAlert, Award, Calendar, Sparkles } from "lucide-react";

export default function FixedDeposits() {
  const { rates, dataSource, fetchRatesViaGemini, lastUpdated } = useRates();
  
  // Calculator states
  const [principal, setPrincipal] = useState<number>(1000000); // 1 Million LKR default
  const [interestRate, setInterestRate] = useState<number>(9.25);
  const [tenureMonths, setTenureMonths] = useState<number>(12);
  const [payoutFrequency, setPayoutFrequency] = useState<"monthly" | "quarterly" | "maturity">("maturity");
  const [applyWht, setApplyWht] = useState<boolean>(true); // 10% Withholding Tax (WHT) in SL

  // Table states
  const [selectedTableTenure, setSelectedTableTenure] = useState<number>(1); // 1 to 6 Years

  // Gemini AI Sync Modal states
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [geminiKey, setGeminiKey] = useState<string>("");
  const [aiSyncLoading, setAiSyncLoading] = useState<boolean>(false);
  const [aiSyncStatus, setAiSyncStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Sync rate from context on initial load
  useEffect(() => {
    if (rates?.fixedDeposit?.bankAverage12m) {
      setInterestRate(rates.fixedDeposit.bankAverage12m);
    }
  }, [rates]);

  // Load Gemini key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem("lankawealth_gemini_key");
    if (savedKey) {
      setGeminiKey(savedKey);
    }
  }, []);

  // Derived base rates mapping for major Sri Lankan institutions
  const baseBank = rates?.fixedDeposit?.bankAverage12m || 9.25;
  const baseFinance = rates?.fixedDeposit?.financeAverage12m || 11.50;

  const fdInstitutions = [
    { name: "Commercial Bank of Ceylon", type: "Bank (LCB)", rating: "AA(lka)", baseRate: baseBank },
    { name: "Sampath Bank PLC", type: "Bank (LCB)", rating: "A+(lka)", baseRate: parseFloat((baseBank - 0.15).toFixed(2)) },
    { name: "Hatton National Bank (HNB)", type: "Bank (LCB)", rating: "A+(lka)", baseRate: parseFloat((baseBank - 0.10).toFixed(2)) },
    { name: "Bank of Ceylon (BOC)", type: "State Bank", rating: "AA-(lka)", baseRate: parseFloat((baseBank - 0.35).toFixed(2)) },
    { name: "People's Bank", type: "State Bank", rating: "AA-(lka)", baseRate: parseFloat((baseBank - 0.30).toFixed(2)) },
    { name: "Seylan Bank PLC", type: "Bank (LCB)", rating: "A-(lka)", baseRate: parseFloat((baseBank - 0.20).toFixed(2)) },
    { name: "Nations Trust Bank (NTB)", type: "Bank (LCB)", rating: "A-(lka)", baseRate: parseFloat((baseBank - 0.05).toFixed(2)) },
    { name: "NDB Bank PLC", type: "Bank (LCB)", rating: "A(lka)", baseRate: parseFloat((baseBank - 0.15).toFixed(2)) },
    { name: "DFCC Bank PLC", type: "Bank (LCB)", rating: "A+(lka)", baseRate: parseFloat((baseBank - 0.25).toFixed(2)) },
    { name: "LB Finance PLC", type: "Finance Co (LFC)", rating: "A-(lka)", baseRate: baseFinance },
    { name: "LOLC Finance PLC", type: "Finance Co (LFC)", rating: "BBB+(lka)", baseRate: parseFloat((baseFinance + 0.25).toFixed(2)) },
    { name: "Singer Finance PLC", type: "Finance Co (LFC)", rating: "BBB(lka)", baseRate: parseFloat((baseFinance - 0.10).toFixed(2)) },
    { name: "Mercantile Investments PLC", type: "Finance Co (LFC)", rating: "BBB-(lka)", baseRate: parseFloat((baseFinance + 0.15).toFixed(2)) }
  ];

  // Tenure Yield Premiums for Sri Lanka
  const getTenureRateAdjustment = (years: number) => {
    switch (years) {
      case 1: return 0.00;
      case 2: return 0.50;  // 2 Years gets +0.50%
      case 3: return 0.85;  // 3 Years gets +0.85%
      case 4: return 1.10;  // 4 Years gets +1.10%
      case 5: return 1.35;  // 5 Years gets +1.35%
      case 6: return 1.50;  // 6 Years gets +1.50%
      default: return 0.00;
    }
  };

  // Helper to color code rates based on value
  const getRateColorClass = (rate: number) => {
    if (rate < 8.0) return "rate-red";
    if (rate >= 8.0 && rate < 10.0) return "rate-orange";
    if (rate >= 10.0 && rate <= 12.0) return "rate-yellow";
    return "rate-green";
  };

  // Calculations
  const rawInterest = (principal * (interestRate / 100) * (tenureMonths / 12));
  const whtAmount = applyWht ? rawInterest * 0.10 : 0;
  const netInterest = rawInterest - whtAmount;
  const totalMaturityValue = principal + netInterest;
  
  const rawMonthlyPayout = (principal * (interestRate / 100)) / 12;
  const monthlyWht = applyWht ? rawMonthlyPayout * 0.10 : 0;
  const netMonthlyPayout = rawMonthlyPayout - monthlyWht;

  const rawQuarterlyPayout = (principal * (interestRate / 100)) / 4;
  const quarterlyWht = applyWht ? rawQuarterlyPayout * 0.10 : 0;
  const netQuarterlyPayout = rawQuarterlyPayout - quarterlyWht;

  const formatLKR = (num: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      maximumFractionDigits: 2,
    }).format(num);
  };

  const handleApplyRate = (rate: number, frequency: "monthly" | "quarterly" | "maturity", tableYears: number) => {
    setInterestRate(rate);
    setPayoutFrequency(frequency);
    setTenureMonths(tableYears * 12);
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
      {/* Dynamic Connection Warning Banners */}
      {dataSource === "failed" && (
        <div className="status-error-banner animate-fade-in">
          <span className="error-icon-dot">●</span>
          <span><strong>Connection Failed:</strong> Unable to connect to the rates server. Showing offline default rates (August 2026).</span>
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
          <span><strong>Gemini AI Synced:</strong> Rates successfully parsed and synced from live bank pages using Gemini AI (Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleDateString() : "Today"}).</span>
        </div>
      )}

      <div className="page-header-container">
        <span className="badge badge-teal">Traditional Savings</span>
        <h1 className="page-title">Fixed Deposits (FD)</h1>
        <p className="page-subtitle">
          Secure and predictable interest payouts. Select from Licensed Commercial Banks (LCBs) or Licensed Finance Companies (LFCs) regulated by the CBSL.
        </p>
      </div>

      {/* Top Split Layout (Calculator + Educational context) */}
      <div className="fd-top-grid">
        {/* FD Calculator Card */}
        <div className="glass-card calculator-card">
          <div className="card-header-icon">
            <Calculator size={20} className="header-icon" />
            <h3>FD Yield Calculator</h3>
          </div>

          <div className="calculator-inputs">
            <div className="input-row-double">
              <div className="input-group">
                <label>Deposit Capital (LKR)</label>
                <input
                  type="number"
                  step="50000"
                  value={principal}
                  onChange={(e) => setPrincipal(Math.max(0, parseInt(e.target.value) || 0))}
                  className="glass-input"
                />
                <span className="input-hint">{formatLKR(principal)}</span>
              </div>
              <div className="input-group">
                <label>Interest Rate (% p.a.)</label>
                <input
                  type="number"
                  step="0.05"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="glass-input"
                />
              </div>
            </div>

            <div className="input-row-double">
              <div className="input-group">
                <label>Tenure</label>
                <select
                  value={tenureMonths}
                  onChange={(e) => setTenureMonths(parseInt(e.target.value))}
                  className="glass-input"
                  style={{ background: "#0d1323" }}
                >
                  <option value={12}>12 Months (1 Year)</option>
                  <option value={24}>24 Months (2 Years)</option>
                  <option value={36}>36 Months (3 Years)</option>
                  <option value={48}>48 Months (4 Years)</option>
                  <option value={60}>60 Months (5 Years)</option>
                  <option value={72}>72 Months (6 Years)</option>
                </select>
              </div>

              <div className="input-group">
                <label>Payout Cycle</label>
                <div className="radio-group">
                  <button
                    className={`radio-btn ${payoutFrequency === "monthly" ? "active" : ""}`}
                    onClick={() => setPayoutFrequency("monthly")}
                  >
                    Monthly
                  </button>
                  <button
                    className={`radio-btn ${payoutFrequency === "quarterly" ? "active" : ""}`}
                    onClick={() => setPayoutFrequency("quarterly")}
                  >
                    Quarterly
                  </button>
                  <button
                    className={`radio-btn ${payoutFrequency === "maturity" ? "active" : ""}`}
                    onClick={() => setPayoutFrequency("maturity")}
                  >
                    Maturity
                  </button>
                </div>
              </div>
            </div>

            <div className="input-checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={applyWht}
                  onChange={(e) => setApplyWht(e.target.checked)}
                />
                <span className="custom-checkbox"></span>
                Deduct 10% Withholding Tax (WHT)
              </label>
            </div>
          </div>

          <div className="divider-h" />

          {/* Results Output */}
          <div className="calculator-results">
            {payoutFrequency === "monthly" ? (
              <div className="results-row-grid">
                <div className="result-block">
                  <span className="result-label">Net Monthly Payout</span>
                  <span className="result-val text-teal">{formatLKR(netMonthlyPayout)}</span>
                </div>
                <div className="result-block">
                  <span className="result-label">Monthly WHT Deducted</span>
                  <span className="result-val text-coral">{formatLKR(monthlyWht)}</span>
                </div>
                <div className="result-block">
                  <span className="result-label">Total Net Interest (Tenure)</span>
                  <span className="result-val">{formatLKR(netInterest)}</span>
                </div>
              </div>
            ) : payoutFrequency === "quarterly" ? (
              <div className="results-row-grid">
                <div className="result-block">
                  <span className="result-label">Net Quarterly Payout</span>
                  <span className="result-val text-teal">{formatLKR(netQuarterlyPayout)}</span>
                </div>
                <div className="result-block">
                  <span className="result-label">Quarterly WHT Deducted</span>
                  <span className="result-val text-coral">{formatLKR(quarterlyWht)}</span>
                </div>
                <div className="result-block">
                  <span className="result-label">Total Net Interest (Tenure)</span>
                  <span className="result-val">{formatLKR(netInterest)}</span>
                </div>
              </div>
            ) : (
              <div className="results-row-grid">
                <div className="result-block">
                  <span className="result-label">Net Interest at Maturity</span>
                  <span className="result-val text-emerald">{formatLKR(netInterest)}</span>
                </div>
                <div className="result-block">
                  <span className="result-label">Total WHT Deducted</span>
                  <span className="result-val text-coral">{formatLKR(whtAmount)}</span>
                </div>
                <div className="result-block">
                  <span className="result-label">Total Maturity Value</span>
                  <span className="result-val text-teal">{formatLKR(totalMaturityValue)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Regulatory Info Card (Right Column) */}
        <div className="glass-card info-display-card">
          <div className="card-header-icon">
            <Award size={20} className="header-icon" />
            <h3>Deposit Security Guidelines</h3>
          </div>

          <div className="guide-box-sldis">
            <h5>Sri Lanka Deposit Insurance Scheme (SLDIS)</h5>
            <p>
              To protect retail investors, the Central Bank of Sri Lanka (CBSL) guarantees deposit accounts up to **LKR 1,100,000** per depositor per institution. 
            </p>
            <div className="tip-box">
              <Award size={14} className="tip-icon" />
              <span><strong>Strategy:</strong> Spread capital above LKR 1.1M across distinct bank groups.</span>
            </div>
          </div>

          <div className="guide-box-sldis">
            <h5>Fitch Credit Ratings Key</h5>
            <p>
              Before opening an FD, check the credit rating:
            </p>
            <ul className="rating-list-guide">
              <li><strong>AAA to AA:</strong> Maximum security, lowest risk (e.g. State Banks & large LCBs).</li>
              <li><strong>A+ to A-:</strong> High security, low default probability.</li>
              <li><strong>BBB+ to BBB-:</strong> Moderate security (typically LFC finance companies). Higher rates but higher default exposure.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Comprehensive Rates Table Section */}
      <section className="comprehensive-table-section">
        <div className="glass-card table-card-container">
          <div className="table-header-box">
            <div className="header-title-wrapper">
              <Landmark size={22} className="header-icon-table" />
              <div>
                <h3>Comprehensive FD Rates Index</h3>
                <p className="table-subtitle-text">Compare annual interest rates paid monthly, quarterly, and at maturity across major Sri Lankan institutions.</p>
              </div>
            </div>

            {/* Sync Button & Color Legend container */}
            <div className="table-controls-wrapper">
              <button className="gemini-sync-btn" onClick={() => setShowAiModal(true)}>
                <Sparkles size={14} style={{ marginRight: "6px" }} />
                Sync via Gemini AI
              </button>
              
              <div className="legend-box">
                <span className="legend-title">Rates Color Index:</span>
                <div className="legend-pills">
                  <span className="legend-pill label-red">Below 8%</span>
                  <span className="legend-pill label-orange">8% - 10%</span>
                  <span className="legend-pill label-yellow">10% - 12%</span>
                  <span className="legend-pill label-green">Above 12%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Tenure Selector tabs */}
          <div className="tenure-tabs-container">
            <span className="tabs-label">
              <Calendar size={14} style={{ marginRight: "6px", color: "var(--text-muted)" }} />
              Select Maturity Tenure:
            </span>
            <div className="tenure-tabs">
              {[1, 2, 3, 4, 5, 6].map((years) => (
                <button
                  key={years}
                  className={`tenure-tab-btn ${selectedTableTenure === years ? "active" : ""}`}
                  onClick={() => setSelectedTableTenure(years)}
                >
                  {years} {years === 1 ? "Year" : "Years"}
                </button>
              ))}
            </div>
            <span className="tenure-premium-note">
              * Includes tenure adjustment of <strong>+{getTenureRateAdjustment(selectedTableTenure).toFixed(2)}%</strong>
            </span>
          </div>

          <div className="table-wrapper-responsive">
            <table className="fd-rates-table">
              <thead>
                <tr>
                  <th>Financial Institution</th>
                  <th>Category</th>
                  <th>Fitch Credit</th>
                  <th>Monthly Yield (% p.a.)</th>
                  <th>Quarterly Yield (% p.a.)</th>
                  <th>Maturity Yield (% p.a.)</th>
                </tr>
              </thead>
              <tbody>
                {fdInstitutions.map((inst) => {
                  let monthly = 0;
                  let quarterly: number | null = null;
                  let maturity = 0;

                  const termKey = selectedTableTenure.toString();
                  const cachedInst = rates?.fixedDeposit?.institutions?.[inst.name];

                  if (cachedInst && cachedInst[termKey]) {
                    monthly = cachedInst[termKey].monthly;
                    quarterly = cachedInst[termKey].quarterly;
                    maturity = cachedInst[termKey].maturity;
                  } else {
                    const adjustedBase = inst.baseRate + getTenureRateAdjustment(selectedTableTenure);
                    monthly = parseFloat((adjustedBase - 0.40).toFixed(2));
                    quarterly = inst.name === "Commercial Bank of Ceylon" ? null : parseFloat((adjustedBase - 0.20).toFixed(2));
                    maturity = parseFloat(adjustedBase.toFixed(2));
                  }

                  return (
                    <tr key={inst.name}>
                      <td className="inst-name-cell">
                        <strong>{inst.name}</strong>
                      </td>
                      <td>
                        <span className={`inst-pill-tag ${inst.type.includes("Bank") || inst.type.includes("State") ? "bank-tag" : "finance-tag"}`}>
                          {inst.type}
                        </span>
                      </td>
                      <td>
                        <span className="rating-tag">{inst.rating}</span>
                      </td>
                      {/* Monthly Yield */}
                      <td className="rate-cell">
                        <div className="rate-apply-row">
                          <span className={`rate-val-cell ${getRateColorClass(monthly)}`}>{monthly.toFixed(2)}%</span>
                          <button className="apply-table-btn" onClick={() => handleApplyRate(monthly, "monthly", selectedTableTenure)}>
                            Apply
                          </button>
                        </div>
                      </td>
                      {/* Quarterly Yield */}
                      <td className="rate-cell">
                        {quarterly !== null && quarterly !== undefined ? (
                          <div className="rate-apply-row">
                            <span className={`rate-val-cell ${getRateColorClass(quarterly)}`}>{quarterly.toFixed(2)}%</span>
                            <button className="apply-table-btn" onClick={() => handleApplyRate(quarterly, "quarterly", selectedTableTenure)}>
                              Apply
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontWeight: "500", paddingLeft: "8px" }}>—</span>
                        )}
                      </td>
                      {/* Maturity Yield */}
                      <td className="rate-cell">
                        <div className="rate-apply-row">
                          <span className={`rate-val-cell ${getRateColorClass(maturity)}`}>{maturity.toFixed(2)}%</span>
                          <button className="apply-table-btn" onClick={() => handleApplyRate(maturity, "maturity", selectedTableTenure)}>
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
              * All listed rates are indicative annual yields. Payout rates on Monthly and Quarterly accounts are mathematically adjusted below the Maturity rate to reflect time value of money payouts. A 10% Withholding Tax is deducted at source by all financial institutions from interest earned.
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
              Connect directly to Google Gemini API to parse interest rates from the official bank websites in real-time. This fetches the pages dynamically and extracts current LKR Fixed Deposit yields.
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
        .fd-top-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        @media (max-width: 1024px) {
          .fd-top-grid {
            grid-template-columns: 1fr;
          }
        }

        .card-header-icon {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 1.25rem;
        }

        .header-icon {
          color: var(--color-teal);
        }

        .card-header-icon h3 {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 1.25rem;
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
          color: var(--color-teal);
          font-weight: 500;
          margin-top: 2px;
        }

        /* Radio Payout Buttons */
        .radio-group {
          display: flex;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          overflow: hidden;
          background: rgba(255,255,255,0.02);
          padding: 2px;
          gap: 2px;
        }

        .radio-btn {
          flex: 1;
          background: none;
          border: none;
          color: var(--text-secondary);
          font-family: var(--font-body);
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.65rem 0.25rem;
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .radio-btn.active {
          background: var(--bg-primary);
          color: var(--color-teal);
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }

        /* Custom Checkbox */
        .input-checkbox-group {
          margin-top: 0.25rem;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .checkbox-label input {
          position: absolute;
          opacity: 0;
          cursor: pointer;
          height: 0;
          width: 0;
        }

        .custom-checkbox {
          height: 18px;
          width: 18px;
          background-color: rgba(255,255,255,0.04);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          display: inline-block;
          position: relative;
          transition: all 0.2s ease;
        }

        .checkbox-label:hover input ~ .custom-checkbox {
          border-color: var(--color-teal);
        }

        .checkbox-label input:checked ~ .custom-checkbox {
          background-color: var(--color-teal);
          border-color: var(--color-teal);
        }

        .custom-checkbox:after {
          content: "";
          position: absolute;
          display: none;
          left: 5px;
          top: 2px;
          width: 4px;
          height: 8px;
          border: solid #04060c;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }

        .checkbox-label input:checked ~ .custom-checkbox:after {
          display: block;
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
        .text-coral { color: var(--color-coral); }

        /* Right Column Info Cards */
        .info-display-card {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .guide-box-sldis h5 {
          font-family: var(--font-display);
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 6px;
        }

        .guide-box-sldis p {
          font-size: 0.8rem;
          color: var(--text-secondary);
          line-height: 1.45;
        }

        .tip-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(16, 185, 129, 0.06);
          border: 1px solid rgba(16, 185, 129, 0.15);
          padding: 8px 12px;
          border-radius: 8px;
          margin-top: 10px;
          font-size: 0.75rem;
        }

        .tip-icon {
          color: var(--color-emerald);
          flex-shrink: 0;
        }

        .rating-list-guide {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 8px;
        }

        .rating-list-guide li {
          font-size: 0.75rem;
          color: var(--text-secondary);
          position: relative;
          padding-left: 14px;
        }

        .rating-list-guide li:before {
          content: "•";
          position: absolute;
          left: 4px;
          color: var(--color-teal);
        }

        /* Comprehensive Rates Table styles */
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
          color: var(--color-teal);
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

        /* Tenure Selector Tabs */
        .tenure-tabs-container {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          padding: 10px 14px;
          background: rgba(255,255,255,0.01);
          border: 1px solid var(--border-color);
          border-radius: 12px;
        }

        .tabs-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
        }

        .tenure-tabs {
          display: flex;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 2px;
          gap: 2px;
        }

        .tenure-tab-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          font-family: var(--font-body);
          font-size: 0.75rem;
          font-weight: 600;
          padding: 6px 12px;
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .tenure-tab-btn:hover {
          color: var(--text-primary);
        }

        .tenure-tab-btn.active {
          background: var(--bg-secondary);
          color: var(--color-teal);
          box-shadow: 0 2px 4px rgba(0,0,0,0.15);
        }

        .tenure-premium-note {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-left: auto;
        }

        @media (max-width: 768px) {
          .tenure-premium-note {
            margin-left: 0;
            width: 100%;
          }
        }

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
          background: rgba(0, 242, 254, 0.08);
          color: var(--color-teal);
          border: 1px solid rgba(0, 242, 254, 0.15);
        }

        .finance-tag {
          background: rgba(251, 191, 36, 0.08);
          color: var(--color-gold);
          border: 1px solid rgba(251, 191, 36, 0.15);
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

        /* Color coded rates styles */
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
          opacity: 0; /* Hidden by default, show on row hover */
        }

        .fd-rates-table tr:hover .apply-table-btn {
          opacity: 1;
        }

        .apply-table-btn:hover {
          background: rgba(0, 242, 254, 0.08);
          border-color: rgba(0, 242, 254, 0.3);
          color: var(--color-teal);
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
          border-color: rgba(0, 242, 254, 0.2);
          box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 242, 254, 0.05);
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
          color: var(--color-teal);
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
          background: linear-gradient(135deg, var(--color-teal) 0%, var(--color-indigo) 100%);
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

        .ai-submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .gemini-sync-btn {
          background: rgba(0, 242, 254, 0.08);
          border: 1px solid rgba(0, 242, 254, 0.2);
          color: var(--color-teal);
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0, 242, 254, 0.05);
        }

        .gemini-sync-btn:hover {
          background: rgba(0, 242, 254, 0.15);
          border-color: rgba(0, 242, 254, 0.4);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 242, 254, 0.1);
        }
      `}</style>
    </div>
  );
}
