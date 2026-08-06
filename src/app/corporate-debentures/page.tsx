"use client";

import React, { useState, useEffect } from "react";
import { useRates } from "@/context/RatesContext";
import { Coins, Info, Calculator, ShieldAlert, Award } from "lucide-react";

export default function CorporateDebentures() {
  const { rates } = useRates();
  
  // Calculator states
  const [principal, setPrincipal] = useState<number>(1000000); // 1 Million LKR par value
  const [couponRate, setCouponRate] = useState<number>(11.50);
  const [purchasePricePercent, setPurchasePricePercent] = useState<number>(100); // Traded at Par (100%)
  const [payoutFrequency, setPayoutFrequency] = useState<number>(2); // 2 = Semi-Annual, 4 = Quarterly, 12 = Monthly, 1 = Annual
  const [years, setYears] = useState<number>(5);

  // Sync rate on load
  useEffect(() => {
    if (rates?.corporateDebenture?.averageYield) {
      setCouponRate(rates.corporateDebenture.averageYield);
    }
  }, [rates]);

  // Mock list of active Sri Lankan listed debentures
  const debentures = [
    { name: "LOLC Holdings PLC", coupon: 12.50, frequency: "Annual", rating: "A-(lka)", tenure: "5 Years" },
    { name: "Commercial Bank of Ceylon PLC", coupon: rates.corporateDebenture.averageYield, frequency: "Semi-Annual", rating: "AA(lka)", tenure: "5 Years" },
    { name: "Sampath Bank PLC", coupon: parseFloat((rates.corporateDebenture.averageYield - 0.25).toFixed(2)), frequency: "Quarterly", rating: "A+(lka)", tenure: "5 Years" },
    { name: "Hayleys PLC", coupon: parseFloat((rates.corporateDebenture.averageYield + 0.50).toFixed(2)), frequency: "Annual", rating: "AA-(lka)", tenure: "3 Years" },
    { name: "DFCC Bank PLC", coupon: parseFloat((rates.corporateDebenture.averageYield - 0.15).toFixed(2)), frequency: "Semi-Annual", rating: "A+(lka)", tenure: "7 Years" },
  ];

  // Calculations
  const actualCostToAcquire = principal * (purchasePricePercent / 100);
  const grossAnnualCoupon = principal * (couponRate / 100);
  const payoutsPerYear = payoutFrequency;
  
  const grossPerPayout = grossAnnualCoupon / payoutsPerYear;
  const whtPerPayout = grossPerPayout * 0.10; // 10% Withholding Tax on coupons
  const netPerPayout = grossPerPayout - whtPerPayout;
  
  const totalPayoutsCount = payoutsPerYear * years;
  const totalNetCouponIncome = netPerPayout * totalPayoutsCount;
  
  // Yield to Maturity (YTM) Approximation
  // YTM ≈ [C + (Par - Price)/n] / [(Par + Price)/2]
  const parValue = principal;
  const priceVal = actualCostToAcquire;
  const annualCapitalGainAmortized = (parValue - priceVal) / years;
  const averageValue = (parValue + priceVal) / 2;
  const grossYtm = averageValue > 0 ? ((grossAnnualCoupon + annualCapitalGainAmortized) / averageValue) * 100 : 0;
  const netYtm = grossYtm * 0.90; // Adjust roughly for WHT

  const formatLKR = (num: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      maximumFractionDigits: 2,
    }).format(num);
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header-container">
        <span className="badge badge-indigo" style={{ background: "rgba(168, 85, 247, 0.12)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.2)" }}>Listed Debt</span>
        <h1 className="page-title">Corporate Debentures</h1>
        <p className="page-subtitle">
          Secure regular fixed payouts from blue-chip corporations. Listed corporate debt securities traded on the Colombo Stock Exchange (CSE).
        </p>
      </div>

      {/* Credit Risk Warning */}
      <section className="risk-banner glass-card">
        <div className="banner-icon-box">
          <ShieldAlert size={32} className="alert-icon" />
        </div>
        <div className="banner-content">
          <h4>Credit Ratings & Investment Risks</h4>
          <p>
            Unlike government-backed Treasury bills, corporate debentures carry credit risk relative to the financial health of the issuing company. Always review the **Fitch Rating** of the issuer. Ratings of **AA** and **A** represent high-quality credit with very low default probability, while BBB and below represent higher risk with higher yields.
          </p>
        </div>
      </section>

      <div className="debenture-grid">
        {/* Debenture Yield Calculator */}
        <div className="glass-card calculator-card">
          <div className="card-header-icon">
            <Calculator size={20} className="header-icon" />
            <h3>Debenture Yield & YTM Calculator</h3>
          </div>
          <p className="card-desc">Calculate your periodic coupon income and Yield-to-Maturity (YTM) based on market trading price.</p>

          <div className="calculator-inputs">
            {/* Input Row 1 */}
            <div className="input-row-double">
              <div className="input-group">
                <label>Principal Par Value (LKR)</label>
                <input
                  type="number"
                  step="50000"
                  value={principal}
                  onChange={(e) => setPrincipal(Math.max(0, parseInt(e.target.value) || 0))}
                  className="glass-input"
                />
                <span className="input-hint">Cost to Buy: {formatLKR(actualCostToAcquire)}</span>
              </div>
              <div className="input-group">
                <label>Coupon Rate (% p.a.)</label>
                <input
                  type="number"
                  step="0.05"
                  value={couponRate}
                  onChange={(e) => setCouponRate(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="glass-input"
                />
              </div>
            </div>

            {/* Input Row 2 */}
            <div className="input-row-double">
              <div className="input-group">
                <label>Purchase Price (% of Par)</label>
                <input
                  type="number"
                  min="50"
                  max="150"
                  step="0.5"
                  value={purchasePricePercent}
                  onChange={(e) => setPurchasePricePercent(Math.max(1, parseFloat(e.target.value) || 0))}
                  className="glass-input"
                />
                <span className="input-hint">{purchasePricePercent < 100 ? "Bought at Discount" : purchasePricePercent > 100 ? "Bought at Premium" : "Bought at Par"}</span>
              </div>
              <div className="input-group">
                <label>Coupon Payment Cycle</label>
                <select
                  value={payoutFrequency}
                  onChange={(e) => setPayoutFrequency(parseInt(e.target.value))}
                  className="glass-input"
                  style={{ background: "#0d1323" }}
                >
                  <option value={12}>Monthly (12 times/year)</option>
                  <option value={4}>Quarterly (4 times/year)</option>
                  <option value={2}>Semi-Annually (2 times/year)</option>
                  <option value={1}>Annually (1 time/year)</option>
                </select>
              </div>
            </div>

            {/* Input Row 3 */}
            <div className="input-group">
              <label>Tenure Remaining (Years)</label>
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
              </select>
            </div>
          </div>

          <div className="divider-h" />

          {/* Results Output */}
          <div className="calculator-results">
            <div className="results-row-grid">
              <div className="result-block">
                <span className="result-label">Net Periodic Payout</span>
                <span className="result-val text-teal">{formatLKR(netPerPayout)}</span>
                <span className="sub-label">Gross: {formatLKR(grossPerPayout)} (-10% WHT)</span>
              </div>
              <div className="result-block">
                <span className="result-label">Approx Net YTM (%)</span>
                <span className="result-val text-emerald">{netYtm.toFixed(2)}%</span>
                <span className="sub-label">Gross YTM: {grossYtm.toFixed(2)}%</span>
              </div>
              <div className="result-block">
                <span className="result-label">Total Net Interest Cashflow</span>
                <span className="result-val text-indigo">{formatLKR(totalNetCouponIncome)}</span>
                <span className="sub-label">{totalPayoutsCount} payouts total</span>
              </div>
            </div>
          </div>
        </div>

        {/* Listed Debentures Index */}
        <div className="glass-card list-card">
          <div className="card-header-icon">
            <Coins size={20} className="header-icon" />
            <h3>Prominent CSE Debenture Issues</h3>
          </div>
          <p className="card-desc">Compare coupon yield and credit ratings of debentures issued in Sri Lanka.</p>

          <div className="debentures-index-list">
            {debentures.map((deb) => (
              <div className="deb-item" key={deb.name}>
                <div className="deb-meta">
                  <div className="deb-header-box">
                    <span className="deb-name">{deb.name}</span>
                  </div>
                  <div className="deb-sub-details">
                    <span>Tenure: <strong>{deb.tenure}</strong></span>
                    <span className="separator-dot">•</span>
                    <span>Payout: {deb.frequency}</span>
                    <span className="separator-dot">•</span>
                    <span>Credit: {deb.rating}</span>
                  </div>
                </div>
                <div className="deb-action">
                  <span className="deb-rate">{deb.coupon.toFixed(2)}%</span>
                  <button className="apply-btn" onClick={() => setCouponRate(deb.coupon)}>
                    Apply
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="debenture-info-box">
            <Info size={14} className="info-icon" />
            <p>
              To purchase debentures, contact your stockbroker to place an order on the CSE corporate debt board. They are held electronically in your existing CDS account.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .debenture-grid {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        @media (max-width: 1024px) {
          .debenture-grid {
            grid-template-columns: 1fr;
          }
        }

        .risk-banner {
          display: flex;
          gap: 1.25rem;
          padding: 1.5rem;
          margin-bottom: 2rem;
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(9, 14, 26, 0.4) 100%);
          border-color: rgba(239, 68, 68, 0.15);
        }

        .banner-icon-box {
          color: var(--color-coral);
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(239, 68, 68, 0.08);
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
          color: #a855f7;
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
          color: #a855f7;
          font-weight: 500;
          margin-top: 2px;
        }

        .divider-h {
          height: 1px;
          background: var(--border-color);
          margin: 1.5rem 0;
        }

        /* Results */
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

        .sub-label {
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        .text-teal { color: var(--color-teal); }
        .text-emerald { color: var(--color-emerald); }
        .text-indigo { color: #6366f1; }
        .text-coral { color: var(--color-coral); }

        /* Debentures list */
        .debentures-index-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .deb-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.85rem 1rem;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          transition: all 0.2s ease;
        }

        .deb-item:hover {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.12);
        }

        .deb-name {
          font-weight: 700;
          font-size: 0.85rem;
          color: var(--text-primary);
        }

        .deb-sub-details {
          display: flex;
          align-items: center;
          font-size: 0.725rem;
          color: var(--text-secondary);
          gap: 6px;
          margin-top: 2px;
        }

        .separator-dot {
          color: var(--text-muted);
        }

        .deb-action {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .deb-rate {
          font-family: var(--font-display);
          font-size: 1.1rem;
          font-weight: 800;
          color: #a855f7;
        }

        .apply-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .apply-btn:hover {
          background: rgba(168, 85, 247, 0.08);
          border-color: rgba(168, 85, 247, 0.3);
          color: #a855f7;
        }

        .debenture-info-box {
          display: flex;
          gap: 8px;
          background: rgba(255, 255, 255, 0.01);
          border: 1px dashed var(--border-color);
          padding: 0.85rem;
          border-radius: 10px;
          margin-top: 1.5rem;
        }

        .info-icon {
          color: var(--text-muted);
          flex-shrink: 0;
          margin-top: 2px;
        }

        .debenture-info-box p {
          font-size: 0.75rem;
          color: var(--text-secondary);
          line-height: 1.35;
        }
      `}</style>
    </div>
  );
}
