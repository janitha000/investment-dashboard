"use client";

import React, { useState, useEffect } from "react";
import { useRates } from "@/context/RatesContext";
import { Globe, Info, Calculator, ShieldCheck, ArrowRight, TrendingDown } from "lucide-react";

export default function PfcaFds() {
  const { rates } = useRates();
  
  // Calculator states
  const [usdCapital, setUsdCapital] = useState<number>(10000); // $10,000 default
  const [usdRate, setUsdRate] = useState<number>(4.25);
  const [tenureMonths, setTenureMonths] = useState<number>(12);
  const [depreciationRate, setDepreciationRate] = useState<number>(6.00); // 6% LKR depreciation default
  const [exchangeRate, setExchangeRate] = useState<number>(310.00); // 310 LKR per USD

  // Sync rates on load
  useEffect(() => {
    if (rates?.pfcaFd?.usdYield12m) {
      setUsdRate(rates.pfcaFd.usdYield12m);
    }
  }, [rates]);

  // Calculations
  const initialValueLkr = usdCapital * exchangeRate;
  const grossUsdInterest = usdCapital * (usdRate / 100) * (tenureMonths / 12);
  const totalMaturityUsd = usdCapital + grossUsdInterest;

  // LKR translation at maturity
  const projectedExchangeRate = exchangeRate * (1 + (depreciationRate * (tenureMonths / 12)) / 100);
  const totalMaturityLkr = totalMaturityUsd * projectedExchangeRate;
  
  const lkrNetProfit = totalMaturityLkr - initialValueLkr;
  const effectiveLkrYield = initialValueLkr > 0 ? (lkrNetProfit / initialValueLkr) * 100 : 0;

  const formatUSD = (num: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatLKR = (num: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const bankUsdRates = [
    { name: "Commercial Bank of Ceylon", rate12m: rates.pfcaFd.usdYield12m, minDeposit: "$1,000", security: "High" },
    { name: "Hatton National Bank (HNB)", rate12m: parseFloat((rates.pfcaFd.usdYield12m - 0.15).toFixed(2)), minDeposit: "$1,000", security: "High" },
    { name: "Sampath Bank PLC", rate12m: parseFloat((rates.pfcaFd.usdYield12m - 0.10).toFixed(2)), minDeposit: "$1,000", security: "High" },
    { name: "National Development Bank (NDB)", rate12m: parseFloat((rates.pfcaFd.usdYield12m + 0.25).toFixed(2)), minDeposit: "$5,000", security: "Medium - High" },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header-container">
        <span className="badge badge-teal" style={{ background: "rgba(244, 63, 94, 0.12)", color: "#f43f5e", border: "1px solid rgba(244,63,94,0.2)" }}>Foreign Currency</span>
        <h1 className="page-title">PFCA Fixed Deposits (USD)</h1>
        <p className="page-subtitle">
          Devaluation protection and currency diversification. Hold savings in global currencies (USD, EUR, GBP) via Personal Foreign Currency Accounts.
        </p>
      </div>

      {/* Tax Alert */}
      <section className="tax-banner glass-card">
        <div className="banner-icon-box">
          <ShieldCheck size={32} className="shield-icon" />
        </div>
        <div className="banner-content">
          <h4>100% Tax-Free Interest Income</h4>
          <p>
            Unlike LKR fixed deposits which are subject to a mandatory 10% Withholding Tax (WHT), **interest earned on foreign currency deposits in PFCAs is completely exempt from tax** for Sri Lankan individuals. All yields compounded in USD belong entirely to you.
          </p>
        </div>
      </section>

      <div className="pfca-grid">
        {/* PFCA Calculator */}
        <div className="glass-card calculator-card">
          <div className="card-header-icon">
            <Calculator size={20} className="header-icon" />
            <h3>Hedged Returns Calculator</h3>
          </div>
          <p className="card-desc">Simulate how USD interest yields compound with local currency exchange depreciation rates.</p>

          <div className="calculator-inputs">
            {/* Input Row 1 */}
            <div className="input-row-double">
              <div className="input-group">
                <label>Deposit Capital (USD)</label>
                <input
                  type="number"
                  step="500"
                  value={usdCapital}
                  onChange={(e) => setUsdCapital(Math.max(0, parseInt(e.target.value) || 0))}
                  className="glass-input"
                />
                <span className="input-hint">Initial Value: {formatLKR(initialValueLkr)}</span>
              </div>
              <div className="input-group">
                <label>USD Interest Rate (% p.a.)</label>
                <input
                  type="number"
                  step="0.05"
                  value={usdRate}
                  onChange={(e) => setUsdRate(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="glass-input"
                />
              </div>
            </div>

            {/* Input Row 2 */}
            <div className="input-row-double">
              <div className="input-group">
                <label>Current USD/LKR rate</label>
                <input
                  type="number"
                  step="0.5"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(Math.max(100, parseFloat(e.target.value) || 0))}
                  className="glass-input"
                />
              </div>
              <div className="input-group">
                <label>Est. Annual Rupee Depreciation (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={depreciationRate}
                  onChange={(e) => setDepreciationRate(parseFloat(e.target.value) || 0)}
                  className="glass-input"
                />
                <span className="input-hint">Projected rate: {projectedExchangeRate.toFixed(2)} LKR/USD</span>
              </div>
            </div>

            {/* Input Row 3 */}
            <div className="input-group">
              <label>Tenure (Months)</label>
              <select
                value={tenureMonths}
                onChange={(e) => setTenureMonths(parseInt(e.target.value))}
                className="glass-input"
                style={{ background: "#0d1323" }}
              >
                <option value={3}>3 Months</option>
                <option value={6}>6 Months</option>
                <option value={12}>12 Months (1 Year)</option>
                <option value={24}>24 Months (2 Years)</option>
              </select>
            </div>
          </div>

          <div className="divider-h" />

          {/* Results Output */}
          <div className="calculator-results">
            <div className="results-row-grid">
              <div className="result-block">
                <span className="result-label">USD Interest at Maturity</span>
                <span className="result-val text-teal">{formatUSD(grossUsdInterest)}</span>
                <span className="sub-label">Net of taxes (Exempt)</span>
              </div>
              <div className="result-block">
                <span className="result-label">Projected LKR Maturity Value</span>
                <span className="result-val text-emerald">{formatLKR(totalMaturityLkr)}</span>
                <span className="sub-label">USD Total: {formatUSD(totalMaturityUsd)}</span>
              </div>
              <div className="result-block">
                <span className="result-label">Effective LKR Yield</span>
                <span className="result-val text-rose">{effectiveLkrYield.toFixed(2)}%</span>
                <span className="sub-label">Net gain: +{formatLKR(lkrNetProfit)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bank Rates Directory */}
        <div className="glass-card directory-card">
          <div className="card-header-icon">
            <Globe size={20} className="header-icon" />
            <h3>Commercial Bank USD Rates (12-Month)</h3>
          </div>
          <p className="card-desc">Compare current annual interest rates on USD fixed deposits offered by licensed banks.</p>

          <div className="banks-list">
            {bankUsdRates.map((bank) => (
              <div className="bank-item" key={bank.name}>
                <div className="bank-meta">
                  <span className="bank-name">{bank.name}</span>
                  <div className="bank-sub-details">
                    <span>Min. Balance: <strong>{bank.minDeposit}</strong></span>
                    <span className="separator-dot">•</span>
                    <span>Security: {bank.security}</span>
                  </div>
                </div>
                <div className="bank-action">
                  <span className="bank-rate">{bank.rate12m.toFixed(2)}%</span>
                  <button className="apply-btn" onClick={() => setUsdRate(bank.rate12m)}>
                    Apply
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pfca-info-box">
            <Info size={14} className="info-icon" />
            <p>
              PFC accounts can be funded using foreign exchange earnings (remittances, tech export freelancing income) or by purchasing USD locally under Central Bank guidelines.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .pfca-grid {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        @media (max-width: 1024px) {
          .pfca-grid {
            grid-template-columns: 1fr;
          }
        }

        .tax-banner {
          display: flex;
          gap: 1.25rem;
          padding: 1.5rem;
          margin-bottom: 2rem;
          background: linear-gradient(135deg, rgba(244, 63, 94, 0.05) 0%, rgba(9, 14, 26, 0.4) 100%);
          border-color: rgba(244, 63, 94, 0.15);
        }

        .banner-icon-box {
          color: #f43f5e;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(244, 63, 94, 0.08);
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
          color: #f43f5e;
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
          color: #f43f5e;
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
        .text-rose { color: #f43f5e; }

        /* Banks list */
        .banks-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .bank-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.85rem 1rem;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          transition: all 0.2s ease;
        }

        .bank-item:hover {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.12);
        }

        .bank-name {
          font-weight: 700;
          font-size: 0.85rem;
          color: var(--text-primary);
        }

        .bank-sub-details {
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

        .bank-action {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .bank-rate {
          font-family: var(--font-display);
          font-size: 1.1rem;
          font-weight: 800;
          color: #f43f5e;
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
          background: rgba(244, 63, 94, 0.08);
          border-color: rgba(244, 63, 94, 0.3);
          color: #f43f5e;
        }

        .pfca-info-box {
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

        .pfca-info-box p {
          font-size: 0.75rem;
          color: var(--text-secondary);
          line-height: 1.35;
        }
      `}</style>
    </div>
  );
}
