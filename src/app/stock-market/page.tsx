"use client";

import React, { useState, useEffect } from "react";
import { useRates } from "@/context/RatesContext";
import { LineChart, Info, Calculator, Landmark, ShieldCheck, Flame } from "lucide-react";

export default function StockMarket() {
  const { rates } = useRates();
  
  // Calculator states
  const [capital, setCapital] = useState<number>(1000000); // 1 Million LKR
  const [dividendYield, setDividendYield] = useState<number>(5.40);
  const [priceGrowth, setPriceGrowth] = useState<number>(6.00); // Projected capital gain
  const [years, setYears] = useState<number>(5);

  // Sync rates on load
  useEffect(() => {
    if (rates?.cse?.averageDividendYield) {
      setDividendYield(rates.cse.averageDividendYield);
    }
  }, [rates]);

  // Calculations
  const whtRate = 0.15; // 15% Withholding Tax on dividends in Sri Lanka
  
  // Simple compound price growth + annual dividend payout
  let currentPortfolioValue = capital;
  let accumulatedDividendsGross = 0;
  let accumulatedDividendsNet = 0;

  for (let year = 1; year <= years; year++) {
    // Dividends paid on current portfolio value at start of the year (roughly)
    const grossDividend = currentPortfolioValue * (dividendYield / 100);
    const netDividend = grossDividend * (1 - whtRate);
    
    accumulatedDividendsGross += grossDividend;
    accumulatedDividendsNet += netDividend;

    // Portfolio appreciates in value
    currentPortfolioValue = currentPortfolioValue * (1 + priceGrowth / 100);
  }

  const capitalGain = currentPortfolioValue - capital;
  const netTotalReturnValue = currentPortfolioValue + accumulatedDividendsNet;
  const totalReturnPercent = ((netTotalReturnValue - capital) / capital) * 100;

  const formatLKR = (num: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const dividendStocks = [
    { name: "John Keells Holdings PLC (JKH)", ticker: "JKH.N0000", typicalYield: "4.8% - 5.5%", sector: "Conglomerates", stability: "High" },
    { name: "Commercial Bank of Ceylon", ticker: "COMB.N0000", typicalYield: "6.0% - 7.5%", sector: "Banking", stability: "High" },
    { name: "Hemas Holdings PLC", ticker: "HHL.N0000", typicalYield: "4.5% - 5.2%", sector: "Healthcare & FMCG", stability: "High" },
    { name: "Teejay Lanka PLC", ticker: "TJL.N0000", typicalYield: "5.5% - 7.0%", sector: "Textiles", stability: "Medium" },
    { name: "Dialog Axiata PLC", ticker: "DIAL.N0000", typicalYield: "6.5% - 8.0%", sector: "Telecom", stability: "High" },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header-container">
        <span className="badge badge-indigo" style={{ background: "rgba(99, 102, 241, 0.12)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.2)" }}>Equities</span>
        <h1 className="page-title">Colombo Stock Exchange (CSE)</h1>
        <p className="page-subtitle">
          Unlock dividend income and capital growth. Invest in publicly listed corporations on the Colombo Stock Exchange to earn periodic dividend payouts.
        </p>
      </div>

      {/* Tax Info Banner */}
      <section className="tax-banner glass-card">
        <div className="banner-icon-box">
          <ShieldCheck size={32} className="shield-icon" />
        </div>
        <div className="banner-content">
          <h4>Sri Lankan CSE Tax Incentives</h4>
          <p>
            The stock market offers unique tax advantages in Sri Lanka: **Capital gains are currently subject to 0% tax** (there is no capital gains tax on trading listed shares). However, cash dividend payouts are subject to a **15% Withholding Tax (WHT)**, which is deducted automatically before reaching your account.
          </p>
        </div>
      </section>

      <div className="cse-grid">
        {/* Dividend Yield Calculator */}
        <div className="glass-card calculator-card">
          <div className="card-header-icon">
            <Calculator size={20} className="header-icon" />
            <h3>Dividend & Growth Projection</h3>
          </div>
          <p className="card-desc">Simulate compounding share values alongside annual cash dividend receipts.</p>

          <div className="calculator-inputs">
            <div className="input-row-double">
              <div className="input-group">
                <label>Investment Capital (LKR)</label>
                <input
                  type="number"
                  step="50000"
                  value={capital}
                  onChange={(e) => setCapital(Math.max(0, parseInt(e.target.value) || 0))}
                  className="glass-input"
                />
                <span className="input-hint">{formatLKR(capital)}</span>
              </div>
              <div className="input-group">
                <label>Estimated Dividend Yield (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={dividendYield}
                  onChange={(e) => setDividendYield(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="glass-input"
                />
              </div>
            </div>

            <div className="input-row-double">
              <div className="input-group">
                <label>Annual Price Growth Estimate (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={priceGrowth}
                  onChange={(e) => setPriceGrowth(parseFloat(e.target.value) || 0)}
                  className="glass-input"
                />
              </div>
              <div className="input-group">
                <label>Holding Period (Years)</label>
                <select
                  value={years}
                  onChange={(e) => setYears(parseInt(e.target.value))}
                  className="glass-input"
                  style={{ background: "#0d1323" }}
                >
                  <option value={1}>1 Year</option>
                  <option value={2}>2 Years</option>
                  <option value={3}>3 Years</option>
                  <option value={5}>5 Years (Medium term)</option>
                  <option value={10}>10 Years (Long term)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="divider-h" />

          {/* Results Output */}
          <div className="calculator-results">
            <div className="results-row-grid">
              <div className="result-block">
                <span className="result-label">Accumulated Net Dividends</span>
                <span className="result-val text-emerald">+{formatLKR(accumulatedDividendsNet)}</span>
                <span className="sub-label">Gross: {formatLKR(accumulatedDividendsGross)} (15% WHT)</span>
              </div>
              <div className="result-block">
                <span className="result-label">End Portfolio Share Value</span>
                <span className="result-val text-teal">{formatLKR(currentPortfolioValue)}</span>
                <span className="sub-label">Gain: +{formatLKR(capitalGain)} (Tax-Free)</span>
              </div>
              <div className="result-block">
                <span className="result-label">Combined Total Returns</span>
                <span className="result-val text-indigo">{formatLKR(netTotalReturnValue)}</span>
                <span className="sub-label">Total Gain: +{totalReturnPercent.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Historical Dividend Stocks */}
        <div className="glass-card stocks-card">
          <div className="card-header-icon">
            <LineChart size={20} className="header-icon" />
            <h3>Stable Dividend Payers in Sri Lanka</h3>
          </div>
          <p className="card-desc">CSE companies known for consistent, premium dividend payouts to retail investors.</p>

          <div className="stocks-list">
            {dividendStocks.map((stock) => (
              <div className="stock-item" key={stock.ticker}>
                <div className="stock-meta">
                  <div className="stock-title-box">
                    <span className="stock-name">{stock.name}</span>
                    <span className="stock-ticker">{stock.ticker}</span>
                  </div>
                  <div className="stock-sub-details">
                    <span>Sector: <strong>{stock.sector}</strong></span>
                    <span className="separator-dot">•</span>
                    <span>Payout Stability: {stock.stability}</span>
                  </div>
                </div>
                <div className="stock-action">
                  <span className="stock-yield-value">{stock.typicalYield}</span>
                  <button
                    className="apply-yield-btn"
                    onClick={() => {
                      const avg = parseFloat(stock.typicalYield.split("-")[0].replace("%", "").trim());
                      setDividendYield(avg);
                    }}
                  >
                    Use
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="cse-guide-box">
            <Info size={14} className="info-icon" />
            <p>
              To start investing, you must open a Central Depository System (CDS) account through a licensed Sri Lankan stockbroker. Trade executions can then be managed online or via the CSE Mobile App.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .cse-grid {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        @media (max-width: 1024px) {
          .cse-grid {
            grid-template-columns: 1fr;
          }
        }

        .tax-banner {
          display: flex;
          gap: 1.25rem;
          padding: 1.5rem;
          margin-bottom: 2rem;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(9, 14, 26, 0.4) 100%);
          border-color: rgba(99, 102, 241, 0.15);
        }

        .banner-icon-box {
          color: #6366f1;
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
          color: #6366f1;
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
          color: #6366f1;
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

        /* Stocks list */
        .stocks-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .stock-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.85rem 1rem;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          transition: all 0.2s ease;
        }

        .stock-item:hover {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.12);
        }

        .stock-title-box {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 2px;
        }

        .stock-name {
          font-weight: 700;
          font-size: 0.85rem;
          color: var(--text-primary);
        }

        .stock-ticker {
          font-size: 0.7rem;
          color: var(--text-muted);
          background: rgba(255,255,255,0.05);
          padding: 1px 4px;
          border-radius: 4px;
        }

        .stock-sub-details {
          display: flex;
          align-items: center;
          font-size: 0.725rem;
          color: var(--text-secondary);
          gap: 6px;
        }

        .separator-dot {
          color: var(--text-muted);
        }

        .stock-action {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .stock-yield-value {
          font-family: var(--font-display);
          font-size: 1.1rem;
          font-weight: 800;
          color: #6366f1;
        }

        .apply-yield-btn {
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

        .apply-yield-btn:hover {
          background: rgba(99, 102, 241, 0.08);
          border-color: rgba(99, 102, 241, 0.3);
          color: #6366f1;
        }

        .cse-guide-box {
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

        .cse-guide-box p {
          font-size: 0.75rem;
          color: var(--text-secondary);
          line-height: 1.35;
        }
      `}</style>
    </div>
  );
}
