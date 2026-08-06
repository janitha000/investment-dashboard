"use client";

import React, { useState, useEffect } from "react";
import { useRates } from "@/context/RatesContext";
import { Wallet, Info, Calculator, FileText, Landmark, ShieldCheck, Sparkles, Calendar } from "lucide-react";

export default function TreasurySecurities() {
  const { rates, dataSource, fetchRatesViaGemini, lastUpdated } = useRates();
  
  // Calculator states
  const [secType, setSecType] = useState<"tbill" | "tbond">("tbill");
  const [faceValue, setFaceValue] = useState<number>(1000000); // 1 Million LKR face value
  const [yieldRate, setYieldRate] = useState<number>(10.20);
  
  // T-Bill specific states
  const [days, setDays] = useState<number>(364);

  // T-Bond specific states
  const [bondYears, setBondYears] = useState<number>(5);
  const [couponFrequency, setCouponFrequency] = useState<"annual" | "semiannual">("semiannual");

  // Tax
  const [applyWht, setApplyWht] = useState<boolean>(true); // 10% WHT in SL

  // Gemini AI Sync Modal states
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [geminiKey, setGeminiKey] = useState<string>("");
  const [aiSyncLoading, setAiSyncLoading] = useState<boolean>(false);
  const [aiSyncStatus, setAiSyncStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Sync default yield on load based on default 364-day term
  useEffect(() => {
    if (rates?.treasury?.tb12m) {
      setYieldRate(rates.treasury.tb12m);
    }
  }, [rates]);

  // Load Gemini key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem("lankawealth_gemini_key");
    if (savedKey) {
      setGeminiKey(savedKey);
    }
  }, []);

  // Fetch lists of active T-Bill and T-Bond maturities
  const tbillsCache = (rates?.treasury?.tbills || {}) as any;
  const tbondsCache = (rates?.treasury?.tbonds || {}) as any;

  const tbillsList = [
    { maturity: "91 Days (3 Months)", days: 91, rate: parseFloat(Number(tbillsCache["91-day"] || rates?.treasury?.tb3m || 9.86).toFixed(2)) },
    { maturity: "182 Days (6 Months)", days: 182, rate: parseFloat(Number(tbillsCache["182-day"] || rates?.treasury?.tb6m || 10.21).toFixed(2)) },
    { maturity: "364 Days (1 Year)", days: 364, rate: parseFloat(Number(tbillsCache["364-day"] || rates?.treasury?.tb12m || 10.20).toFixed(2)) }
  ];

  const tbondsList = [
    { maturity: "2 Years", years: 2, rate: parseFloat(Number(tbondsCache["2-year"] || 10.50).toFixed(2)) },
    { maturity: "3 Years", years: 3, rate: parseFloat(Number(tbondsCache["3-year"] || 11.20).toFixed(2)) },
    { maturity: "5 Years", years: 5, rate: parseFloat(Number(tbondsCache["5-year"] || 11.80).toFixed(2)) },
    { maturity: "10 Years", years: 10, rate: parseFloat(Number(tbondsCache["10-year"] || 12.25).toFixed(2)) },
    { maturity: "15 Years", years: 15, rate: parseFloat(Number(tbondsCache["15-year"] || 12.50).toFixed(2)) },
    { maturity: "20 Years", years: 20, rate: parseFloat(Number(tbondsCache["20-year"] || 12.80).toFixed(2)) }
  ];

  // Adjust yield when days change to match standard CBSL rates
  const handleDaysChange = (d: number) => {
    setDays(d);
    const cacheVal = d === 91 ? tbillsCache["91-day"] : d === 182 ? tbillsCache["182-day"] : tbillsCache["364-day"];
    if (cacheVal) {
      setYieldRate(cacheVal);
    } else if (rates) {
      if (d === 91) setYieldRate(rates.treasury.tb3m);
      else if (d === 182) setYieldRate(rates.treasury.tb6m);
      else setYieldRate(rates.treasury.tb12m);
    }
  };

  // Helper to color code rates based on value
  const getRateColorClass = (rate: number) => {
    if (rate < 8.0) return "rate-red";
    if (rate >= 8.0 && rate < 10.0) return "rate-orange";
    if (rate >= 10.0 && rate <= 12.0) return "rate-yellow";
    return "rate-green";
  };

  // Calculations for T-Bills (discount formula)
  const tbillPurchasePrice = faceValue / (1 + (yieldRate * days) / 36500);
  const tbillGrossReturn = faceValue - tbillPurchasePrice;
  const tbillWht = applyWht ? tbillGrossReturn * 0.10 : 0;
  const tbillNetReturn = tbillGrossReturn - tbillWht;

  // Calculations for T-Bonds (coupon bond)
  const annualCouponAmount = faceValue * (yieldRate / 100);
  const couponPayoutVal = couponFrequency === "semiannual" ? annualCouponAmount / 2 : annualCouponAmount;
  const totalCouponsCount = couponFrequency === "semiannual" ? bondYears * 2 : bondYears;
  
  const rawBondTotalCoupons = annualCouponAmount * bondYears;
  const bondWht = applyWht ? rawBondTotalCoupons * 0.10 : 0;
  const bondNetCoupons = rawBondTotalCoupons - bondWht;
  const bondTotalMaturityPayout = faceValue + bondNetCoupons;

  const formatLKR = (num: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const handleApplyTBill = (rate: number, tbillDays: number) => {
    setSecType("tbill");
    setYieldRate(rate);
    setDays(tbillDays);
  };

  const handleApplyTBond = (rate: number, tbondYears: number) => {
    setSecType("tbond");
    setYieldRate(rate);
    setBondYears(tbondYears);
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

  const primaryDealers = [
    { name: "Capital Alliance PLC (CAL)", type: "Stand-alone Primary Dealer" },
    { name: "First Capital Treasuries PLC", type: "Stand-alone Primary Dealer" },
    { name: "WealthTrust Securities Ltd", type: "Stand-alone Primary Dealer" },
    { name: "Bank of Ceylon Treasury", type: "Bank Primary Dealer" },
    { name: "Commercial Bank Treasury", type: "Bank Primary Dealer" },
    { name: "Sampath Bank Treasury", type: "Bank Primary Dealer" },
  ];

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
          <span><strong>Gemini AI Synced:</strong> Rates successfully parsed and synced from live CBSL and bank pages using Gemini AI (Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleDateString() : "Today"}).</span>
        </div>
      )}

      <div className="page-header-container">
        <span className="badge badge-indigo">Sovereign Debt</span>
        <h1 className="page-title">Treasury Bills & Bonds</h1>
        <p className="page-subtitle">
          The safest investment opportunity in Sri Lanka. Debt instruments issued by the Central Bank of Sri Lanka (CBSL) on behalf of the Government, carrying a sovereign guarantee.
        </p>
      </div>

      {/* Security Banner */}
      <section className="safety-banner glass-card">
        <div className="banner-icon-box">
          <ShieldCheck size={32} className="shield-icon" />
        </div>
        <div className="banner-content">
          <h4>Sovereign Backing (Zero Default Risk)</h4>
          <p>
            Treasury securities represent the absolute benchmark of safety in the local financial market. Because they are backed by the taxing power and currency-printing authority of the Government of Sri Lanka, there is zero credit/default risk on your principal.
          </p>
        </div>
      </section>

      {/* Grid of Calculator + Buying Guides */}
      <div className="treasury-grid">
        {/* Treasury Calculator Card */}
        <div className="glass-card calculator-card">
          <div className="card-header-icon">
            <Calculator size={20} className="header-icon" />
            <h3>Treasury Yield Calculator</h3>
          </div>

          {/* Security Type Toggle */}
          <div className="sec-toggle-row">
            <button 
              className={`sec-toggle-btn ${secType === "tbill" ? "active" : ""}`}
              onClick={() => {
                setSecType("tbill");
                setYieldRate(rates?.treasury?.tb12m || 10.20);
              }}
            >
              T-Bill (Discounted)
            </button>
            <button 
              className={`sec-toggle-btn ${secType === "tbond" ? "active" : ""}`}
              onClick={() => {
                setSecType("tbond");
                setYieldRate(11.80);
              }}
            >
              T-Bond (Coupon Paying)
            </button>
          </div>

          <div className="calculator-inputs" style={{ marginTop: "1rem" }}>
            <div className="input-row-double">
              <div className="input-group">
                <label>{secType === "tbill" ? "Desired Maturity Face Value (LKR)" : "Investment Capital (LKR)"}</label>
                <input
                  type="number"
                  step="100000"
                  value={faceValue}
                  onChange={(e) => setFaceValue(Math.max(0, parseInt(e.target.value) || 0))}
                  className="glass-input"
                />
                <span className="input-hint">
                  {secType === "tbill" ? `${formatLKR(faceValue)} received at maturity` : `Principal invested: ${formatLKR(faceValue)}`}
                </span>
              </div>
              <div className="input-group">
                <label>{secType === "tbill" ? "Treasury Yield (% p.a.)" : "Annual Coupon Rate (% p.a.)"}</label>
                <input
                  type="number"
                  step="0.05"
                  value={yieldRate}
                  onChange={(e) => setYieldRate(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="glass-input"
                />
              </div>
            </div>

            {secType === "tbill" ? (
              /* T-Bill Fields */
              <div className="input-group">
                <label>Maturity Tenure (Days)</label>
                <div className="days-toggle-group">
                  <button
                    className={`days-btn ${days === 91 ? "active" : ""}`}
                    onClick={() => handleDaysChange(91)}
                  >
                    91-Day (3M)
                  </button>
                  <button
                    className={`days-btn ${days === 182 ? "active" : ""}`}
                    onClick={() => handleDaysChange(182)}
                  >
                    182-Day (6M)
                  </button>
                  <button
                    className={`days-btn ${days === 364 ? "active" : ""}`}
                    onClick={() => handleDaysChange(364)}
                  >
                    364-Day (1Y)
                  </button>
                </div>
              </div>
            ) : (
              /* T-Bond Fields */
              <div className="input-row-double">
                <div className="input-group">
                  <label>Bond Maturity Tenure</label>
                  <select
                    value={bondYears}
                    onChange={(e) => setBondYears(parseInt(e.target.value))}
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
                </div>
                <div className="input-group">
                  <label>Coupon Payout Cycle</label>
                  <div className="radio-group-horizontal">
                    <button
                      className={`radio-btn ${couponFrequency === "semiannual" ? "active" : ""}`}
                      onClick={() => setCouponFrequency("semiannual")}
                    >
                      Semi-Annual (6M)
                    </button>
                    <button
                      className={`radio-btn ${couponFrequency === "annual" ? "active" : ""}`}
                      onClick={() => setCouponFrequency("annual")}
                    >
                      Annual (1Y)
                    </button>
                  </div>
                </div>
              </div>
            )}

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

          {/* Results Display */}
          <div className="calculator-results">
            {secType === "tbill" ? (
              <>
                <div className="results-row-grid">
                  <div className="result-block">
                    <span className="result-label">Purchase Price (Discounted)</span>
                    <span className="result-val text-teal">{formatLKR(tbillPurchasePrice)}</span>
                  </div>
                  <div className="result-block">
                    <span className="result-label">Gross Return Earned</span>
                    <span className="result-val text-emerald">+{formatLKR(tbillGrossReturn)}</span>
                  </div>
                  <div className="result-block">
                    <span className="result-label">Maturity Payout</span>
                    <span className="result-val">{formatLKR(faceValue)}</span>
                  </div>
                </div>
                <div className="tax-breakdown-row">
                  <div className="tax-block">
                    <span>10% WHT Withheld at Source:</span>
                    <span className="text-coral">-{formatLKR(tbillWht)}</span>
                  </div>
                  <div className="tax-block highlight-net">
                    <span>Net Return After Tax:</span>
                    <span className="text-emerald">+{formatLKR(tbillNetReturn)}</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="results-row-grid">
                  <div className="result-block">
                    <span className="result-label">Coupon Payout ({couponFrequency === "semiannual" ? "Semi-Annual" : "Annual"})</span>
                    <span className="result-val text-teal">{formatLKR(couponPayoutVal - (applyWht ? couponPayoutVal * 0.10 : 0))}</span>
                  </div>
                  <div className="result-block">
                    <span className="result-label">Total Net Coupons ({totalCouponsCount} pmts)</span>
                    <span className="result-val text-emerald">+{formatLKR(bondNetCoupons)}</span>
                  </div>
                  <div className="result-block">
                    <span className="result-label">Total Net Portfolio Value</span>
                    <span className="result-val">{formatLKR(bondTotalMaturityPayout)}</span>
                  </div>
                </div>
                <div className="tax-breakdown-row">
                  <div className="tax-block">
                    <span>Total Gross Coupon Interest:</span>
                    <span>{formatLKR(rawBondTotalCoupons)}</span>
                  </div>
                  <div className="tax-block">
                    <span>Total WHT Deducted (10%):</span>
                    <span className="text-coral">-{formatLKR(bondWht)}</span>
                  </div>
                  <div className="tax-block highlight-net">
                    <span>Principal Capital returned at Maturity:</span>
                    <span>{formatLKR(faceValue)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Buying Guide Step Display */}
        <div className="glass-card guide-card">
          <div className="card-header-icon">
            <FileText size={20} className="header-icon" />
            <h3>How to Invest in Treasury</h3>
          </div>

          <div className="steps-container">
            <div className="step-item">
              <div className="step-num">1</div>
              <div className="step-body">
                <h6>Choose a Licensed Primary Dealer</h6>
                <p>You cannot buy directly from CBSL. Register with a commercial bank treasury desk or a licensed standalone primary dealer.</p>
              </div>
            </div>
            <div className="step-item">
              <div className="step-num">2</div>
              <div className="step-body">
                <h6>Open a LankaSecure Account</h6>
                <p>Register and open a LankaSecure CDS account, which holds government securities electronically on behalf of the Central Bank.</p>
              </div>
            </div>
            <div className="step-item">
              <div className="step-num">3</div>
              <div className="step-body">
                <h6>Bidding & Allocation</h6>
                <p>Primary dealers participate in weekly auctions on your behalf. You transfer the discounted price, and secure the yields.</p>
              </div>
            </div>
          </div>

          <div className="divider-h" />

          <h4>Registered Primary Dealers</h4>
          <div className="dealers-grid-list">
            {primaryDealers.map((d) => (
              <div className="dealer-chip" key={d.name}>
                <span className="dealer-name">{d.name}</span>
                <span className="dealer-type">{d.type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two Column Table: T-Bills & T-Bonds Index */}
      <section className="comprehensive-table-section">
        <div className="glass-card table-card-container">
          <div className="table-header-box">
            <div className="header-title-wrapper">
              <Landmark size={22} className="header-icon-table" />
              <div>
                <h3>Sovereign Yield Curves Index</h3>
                <p className="table-subtitle-text">Compare short-term Treasury Bills (T-Bills) and long-term Treasury Bonds (T-Bonds) issued by the CBSL.</p>
              </div>
            </div>

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

          {/* Split Grid for Bills and Bonds Tables */}
          <div className="treasury-tables-grid">
            {/* Column 1: Treasury Bills Table */}
            <div className="table-col-box">
              <div className="col-header-box">
                <span className="badge badge-teal">T-Bills</span>
                <h4>Treasury Bills (T-Bills)</h4>
              </div>
              <div className="table-wrapper-responsive">
                <table className="fd-rates-table">
                  <thead>
                    <tr>
                      <th>Maturity Time</th>
                      <th>Days</th>
                      <th>Yield Rate (% p.a.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tbillsList.map((bill) => (
                      <tr key={bill.days}>
                        <td style={{ color: "var(--text-primary)", fontWeight: "600" }}>{bill.maturity}</td>
                        <td>{bill.days} Days</td>
                        <td className="rate-cell">
                          <div className="rate-apply-row">
                            <span className={`rate-val-cell ${getRateColorClass(bill.rate)}`}>{bill.rate.toFixed(2)}%</span>
                            <button className="apply-table-btn" onClick={() => handleApplyTBill(bill.rate, bill.days)}>
                              Apply
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Column 2: Treasury Bonds Table */}
            <div className="table-col-box">
              <div className="col-header-box">
                <span className="badge badge-indigo">T-Bonds</span>
                <h4>Treasury Bonds (T-Bonds)</h4>
              </div>
              <div className="table-wrapper-responsive">
                <table className="fd-rates-table">
                  <thead>
                    <tr>
                      <th>Maturity Time</th>
                      <th>Years</th>
                      <th>Yield/Coupon Rate (% p.a.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tbondsList.map((bond) => (
                      <tr key={bond.years}>
                        <td style={{ color: "var(--text-primary)", fontWeight: "600" }}>{bond.maturity}</td>
                        <td>{bond.years} Years</td>
                        <td className="rate-cell">
                          <div className="rate-apply-row">
                            <span className={`rate-val-cell ${getRateColorClass(bond.rate)}`}>{bond.rate.toFixed(2)}%</span>
                            <button className="apply-table-btn" onClick={() => handleApplyTBond(bond.rate, bond.years)}>
                              Apply
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="wht-footer-disclaimer">
            <Info size={14} className="info-icon" />
            <p>
              * T-Bill rates represent the weighted average yields from the most recent weekly auction held by the Central Bank of Sri Lanka (CBSL). T-Bond rates reflect market yields from the secondary market and primary auctions. A 10% Withholding Tax (WHT) is deducted at source from yields earned on both instruments.
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
              Connect directly to Google Gemini API to parse interest rates from the official Central Bank of Sri Lanka (CBSL) portal in real-time. This extracts T-Bill and T-Bond yields.
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
                Don't have a key? Get a free API Key from the <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" style={{ color: "var(--color-indigo)", textDecoration: "underline" }}>Google AI Studio Portal</a>.
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
        .treasury-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        @media (max-width: 1024px) {
          .treasury-grid {
            grid-template-columns: 1fr;
          }
        }

        .sec-toggle-row {
          display: flex;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 2px;
          gap: 2px;
        }

        .sec-toggle-btn {
          flex: 1;
          background: none;
          border: none;
          color: var(--text-secondary);
          font-family: var(--font-body);
          font-size: 0.8rem;
          font-weight: 700;
          padding: 0.6rem 0.5rem;
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .sec-toggle-btn.active {
          background: var(--bg-primary);
          color: var(--color-indigo);
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }

        .safety-banner {
          display: flex;
          gap: 1.25rem;
          padding: 1.5rem;
          margin-bottom: 2rem;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(9, 14, 26, 0.4) 100%);
          border-color: rgba(99, 102, 241, 0.15);
        }

        .banner-icon-box {
          color: var(--color-indigo);
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(99, 102, 241, 0.08);
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
          color: var(--color-indigo);
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
          color: var(--color-indigo);
          font-weight: 500;
          margin-top: 2px;
        }

        /* Days Toggle */
        .days-toggle-group {
          display: flex;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          overflow: hidden;
          background: rgba(255,255,255,0.02);
          padding: 2px;
          gap: 2px;
        }

        .days-btn {
          flex: 1;
          background: none;
          border: none;
          color: var(--text-secondary);
          font-family: var(--font-body);
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.65rem 0.5rem;
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .days-btn.active {
          background: var(--bg-primary);
          color: var(--color-indigo);
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }

        /* Radio Toggle */
        .radio-group-horizontal {
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
          padding: 0.6rem 0.5rem;
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .radio-btn.active {
          background: var(--bg-primary);
          color: var(--color-indigo);
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
          border-color: var(--color-indigo);
        }

        .checkbox-label input:checked ~ .custom-checkbox {
          background-color: var(--color-indigo);
          border-color: var(--color-indigo);
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
          margin-bottom: 1.25rem;
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
          font-size: 1.25rem;
          font-weight: 800;
        }

        .text-teal { color: var(--color-teal); }
        .text-emerald { color: var(--color-emerald); }
        .text-coral { color: var(--color-coral); }

        .tax-breakdown-row {
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: rgba(255,255,255,0.01);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 0.75rem 1rem;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .tax-block {
          display: flex;
          justify-content: space-between;
        }

        .highlight-net {
          border-top: 1px solid var(--border-color);
          padding-top: 6px;
          font-weight: 700;
          color: var(--text-primary);
        }

        /* Steps list */
        .steps-container {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-top: 0.5rem;
        }

        .step-item {
          display: flex;
          gap: 12px;
        }

        .step-num {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(99, 102, 241, 0.15);
          color: var(--color-indigo);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.8rem;
          flex-shrink: 0;
          border: 1px solid rgba(99, 102, 241, 0.25);
        }

        .step-body h6 {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 2px;
        }

        .step-body p {
          font-size: 0.75rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .guide-card h4 {
          font-family: var(--font-display);
          font-size: 0.95rem;
          font-weight: 700;
          margin-bottom: 0.85rem;
        }

        .dealers-grid-list {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        @media (max-width: 500px) {
          .dealers-grid-list {
            grid-template-columns: 1fr;
          }
        }

        .dealer-chip {
          padding: 8px 12px;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .dealer-name {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .dealer-type {
          font-size: 0.65rem;
          color: var(--text-muted);
        }

        /* Two-Column tables styles */
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
          margin-bottom: 2rem;
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
          color: var(--color-indigo);
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

        .treasury-tables-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 2rem;
        }

        @media (max-width: 900px) {
          .treasury-tables-grid {
            grid-template-columns: 1fr;
            gap: 2rem;
          }
        }

        .table-col-box {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .col-header-box {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .col-header-box h4 {
          font-family: var(--font-display);
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-primary);
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
          background: rgba(99, 102, 241, 0.08);
          border-color: rgba(99, 102, 241, 0.3);
          color: var(--color-indigo);
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
          border-color: rgba(99, 102, 241, 0.2);
          box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.8), 0 0 30px rgba(99, 102, 241, 0.05);
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
          color: var(--color-indigo);
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
          background: linear-gradient(135deg, var(--color-indigo) 0%, var(--color-purple) 100%);
          border: none;
          color: #04060c;
          padding: 0.6rem 1.2rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 10px rgba(99, 102, 241, 0.2);
        }

        .ai-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 15px rgba(99, 102, 241, 0.3);
        }

        .ai-submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .gemini-sync-btn {
          background: rgba(99, 102, 241, 0.08);
          border: 1px solid rgba(99, 102, 241, 0.2);
          color: var(--color-indigo);
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.05);
        }

        .gemini-sync-btn:hover {
          background: rgba(99, 102, 241, 0.15);
          border-color: rgba(99, 102, 241, 0.4);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
        }
      `}</style>
    </div>
  );
}
