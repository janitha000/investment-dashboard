"use client";

import React, { useState, useEffect } from "react";
import { useRates } from "@/context/RatesContext";
import { Landmark, Compass, Wallet, LineChart, Home, Info, HelpCircle, Coins, Globe } from "lucide-react";

export default function PortfolioSimulator() {
  const { rates } = useRates();
  const [totalCapital, setTotalCapital] = useState<number>(10000000); // 10 Million LKR default
  
  // Allocations in percentages (must sum to 100%)
  const [allocations, setAllocations] = useState({
    fd: 15,
    ut: 20,
    treasury: 20,
    debenture: 15,
    cse: 10,
    re: 10,
    pfca: 10,
  });

  const handlePercentChange = (key: keyof typeof allocations, val: number) => {
    // Distribute the difference proportionally among other assets to maintain 100% total
    const oldVal = allocations[key];
    const diff = val - oldVal;
    
    const keys = Object.keys(allocations) as Array<keyof typeof allocations>;
    const otherKeys = keys.filter((k) => k !== key);
    
    // Total of other fields
    const otherTotal = otherKeys.reduce((sum, k) => sum + allocations[k], 0);
    
    const nextAllocations = { ...allocations };
    nextAllocations[key] = val;

    if (otherTotal === 0) {
      // If others are zero, distribute evenly
      otherKeys.forEach((k) => {
        nextAllocations[k] = parseFloat((diff / -otherKeys.length).toFixed(2));
      });
    } else {
      // Distribute proportionally
      otherKeys.forEach((k) => {
        const share = allocations[k] / otherTotal;
        nextAllocations[k] = Math.max(0, parseFloat((allocations[k] - diff * share).toFixed(2)));
      });
    }

    // Adjust minor rounding errors to sum exactly to 100
    const finalSum = Object.values(nextAllocations).reduce((a, b) => a + b, 0);
    const roundingDiff = 100 - finalSum;
    if (roundingDiff !== 0) {
      // Apply correction to the asset with largest share other than current
      const largestKey = otherKeys.reduce((maxKey, k) => 
        nextAllocations[k] > nextAllocations[maxKey] ? k : maxKey
      , otherKeys[0]);
      nextAllocations[largestKey] = parseFloat((nextAllocations[largestKey] + roundingDiff).toFixed(2));
    }

    setAllocations(nextAllocations);
  };

  // Yield calculations
  const yields = {
    fd: rates.fixedDeposit.bankAverage12m,
    ut: rates.unitTrust.moneyMarketYield,
    treasury: rates.treasury.tb12m,
    debenture: rates.corporateDebenture.averageYield,
    cse: rates.cse.averageDividendYield,
    re: rates.realEstate.commercialYield,
    pfca: rates.pfcaFd.usdYield12m,
  };

  const amounts = {
    fd: (totalCapital * allocations.fd) / 100,
    ut: (totalCapital * allocations.ut) / 100,
    treasury: (totalCapital * allocations.treasury) / 100,
    debenture: (totalCapital * allocations.debenture) / 100,
    cse: (totalCapital * allocations.cse) / 100,
    re: (totalCapital * allocations.re) / 100,
    pfca: (totalCapital * allocations.pfca) / 100,
  };

  const annualIncomes = {
    fd: (amounts.fd * yields.fd) / 100,
    ut: (amounts.ut * yields.ut) / 100,
    treasury: (amounts.treasury * yields.treasury) / 100,
    debenture: (amounts.debenture * yields.debenture) / 100,
    cse: (amounts.cse * yields.cse) / 100,
    re: (amounts.re * yields.re) / 100,
    pfca: (amounts.pfca * yields.pfca) / 100,
  };

  const monthlyIncomes = {
    fd: annualIncomes.fd / 12,
    ut: annualIncomes.ut / 12,
    treasury: annualIncomes.treasury / 12,
    debenture: annualIncomes.debenture / 12,
    cse: annualIncomes.cse / 12,
    re: annualIncomes.re / 12,
    pfca: annualIncomes.pfca / 12,
  };

  const totalAnnualIncome = Object.values(annualIncomes).reduce((a, b) => a + b, 0);
  const totalMonthlyIncome = totalAnnualIncome / 12;
  const overallYield = totalCapital > 0 ? (totalAnnualIncome / totalCapital) * 100 : 0;

  // Custom SVG Donut Chart Calculation
  // circle radius = 50, circumference = 314.159
  const radius = 50;
  const circum = 2 * Math.PI * radius;
  
  const chartItems = [
    { key: "fd", label: "Fixed Deposit", color: "var(--color-teal)", val: allocations.fd },
    { key: "ut", label: "Unit Trust", color: "var(--color-emerald)", val: allocations.ut },
    { key: "treasury", label: "Treasury Bills", color: "var(--color-indigo)", val: allocations.treasury },
    { key: "debenture", label: "Corp Debentures", color: "#a855f7", val: allocations.debenture },
    { key: "cse", label: "CSE Dividends", color: "#6366f1", val: allocations.cse },
    { key: "re", label: "Real Estate", color: "var(--color-gold)", val: allocations.re },
    { key: "pfca", label: "PFCA FD (USD)", color: "#f43f5e", val: allocations.pfca },
  ];

  let accumulatedOffset = 0;

  const formatLKR = (num: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="simulator-grid">
      {/* Simulation Inputs */}
      <div className="glass-card controls-card">
        <h3 className="card-title">Portfolio Settings</h3>
        <p className="card-description">Set your total investment capital and distribute it across different passive assets.</p>

        <div className="input-group-capital">
          <label>Total Capital (LKR)</label>
          <div className="capital-input-wrapper">
            <input
              type="number"
              min="100000"
              step="100000"
              value={totalCapital}
              onChange={(e) => setTotalCapital(Math.max(0, parseInt(e.target.value) || 0))}
              className="glass-input capital-input"
            />
            <span className="capital-formatted">{formatLKR(totalCapital)}</span>
          </div>
        </div>

        <div className="sliders-container">
          {chartItems.map((item) => {
            const Icon = item.key === "fd" ? Landmark : 
                         item.key === "ut" ? Compass :
                         item.key === "treasury" ? Wallet :
                         item.key === "debenture" ? Coins :
                         item.key === "cse" ? LineChart :
                         item.key === "pfca" ? Globe : Home;
            return (
              <div className="slider-item" key={item.key}>
                <div className="slider-header">
                  <div className="asset-label-box">
                    <span className="color-indicator" style={{ backgroundColor: item.color }} />
                    <Icon className="asset-icon" size={16} />
                    <span className="asset-name">{item.label}</span>
                    <span className="asset-yield-tag">({yields[item.key as keyof typeof yields].toFixed(2)}%)</span>
                  </div>
                  <div className="percent-display">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={Math.round(item.val)}
                      onChange={(e) => handlePercentChange(item.key as keyof typeof allocations, Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                      className="percent-input"
                    />
                    <span className="percent-sign">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={item.val}
                  onChange={(e) => handlePercentChange(item.key as keyof typeof allocations, parseInt(e.target.value))}
                  className="glass-slider"
                  style={{
                    background: `linear-gradient(to right, ${item.color} 0%, ${item.color} ${item.val}%, rgba(255,255,255,0.1) ${item.val}%, rgba(255,255,255,0.1) 100%)`
                  }}
                />
                <div className="allocation-details">
                <span>Allocated: {formatLKR(amounts[item.key as keyof typeof amounts])}</span>
                <span className="income-sub">Est. Income: +{formatLKR(monthlyIncomes[item.key as keyof typeof monthlyIncomes])}/mo</span>
                {item.key === 'fd' && (
                  <span className="income-sub">Annual Income: +{formatLKR(annualIncomes.fd)}/yr</span>
                )}
              </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Simulation Results & Visuals */}
      <div className="results-wrapper">
        {/* Dynamic SVG Donut Chart */}
        <div className="glass-card chart-card">
          <h3 className="card-title">Portfolio Allocation</h3>
          
          <div className="chart-content">
            <div className="svg-container">
              <svg width="220" height="220" viewBox="0 0 140 140" className="donut-chart">
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="transparent"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="14"
                />
                {chartItems.map((item) => {
                  const percentage = item.val;
                  if (percentage === 0) return null;
                  
                  const strokeLength = (percentage / 100) * circum;
                  const strokeOffset = circum - strokeLength + accumulatedOffset;
                  accumulatedOffset -= strokeLength;

                  return (
                    <circle
                      key={item.key}
                      cx="70"
                      cy="70"
                      r={radius}
                      fill="transparent"
                      stroke={item.color}
                      strokeWidth="14"
                      strokeDasharray={`${strokeLength} ${circum - strokeLength}`}
                      strokeDashoffset={strokeOffset}
                      strokeLinecap="round"
                      transform="rotate(-90 70 70)"
                      className="donut-segment"
                    />
                  );
                })}
              </svg>
              <div className="donut-center">
                <span className="donut-yield-val">{overallYield.toFixed(2)}%</span>
                <span className="donut-yield-label">Avg. Yield</span>
              </div>
            </div>

            <div className="chart-legend">
              {chartItems.map((item) => (
                <div className="legend-item" key={item.key}>
                  <div className="legend-label">
                    <span className="color-indicator" style={{ backgroundColor: item.color }} />
                    <span className="legend-text">{item.label}</span>
                  </div>
                  <span className="legend-val">{Math.round(item.val)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Returns Output Card */}
        <div className="glass-card totals-card">
          <h3 className="card-title">Projected Passive Income</h3>
          <div className="returns-display">
            <div className="return-stat">
              <span className="stat-label">Monthly Passive Payout</span>
              <span className="stat-value text-teal">{formatLKR(totalMonthlyIncome)}</span>
            </div>
            <div className="divider-h" />
            <div className="return-stat">
              <span className="stat-label">Annual Passive Payout</span>
              <span className="stat-value text-emerald">{formatLKR(totalAnnualIncome)}</span>
            </div>
          </div>
          
          <div className="safety-warning-banner">
            <Info size={14} className="banner-icon" />
            <p>
              Calculated using current rates. Returns on Unit Trusts and Stocks are subject to market conditions, while FDs and Treasury bills are locked-in.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .simulator-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 1.5rem;
          margin-bottom: 2.5rem;
        }

        @media (max-width: 1200px) {
          .simulator-grid {
            grid-template-columns: 1fr;
          }
        }

        .controls-card {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .card-title {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 1.25rem;
          color: var(--text-primary);
        }

        .card-description {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-top: -6px;
        }

        .input-group-capital {
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.15rem;
        }

        .input-group-capital label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .capital-input-wrapper {
          display: flex;
          align-items: center;
          gap: 1rem;
          justify-content: space-between;
          flex-wrap: wrap;
        }

        .capital-input {
          flex: 1;
          min-width: 150px;
          max-width: 300px;
          font-size: 1.2rem;
          font-weight: 700;
          background: rgba(255,255,255,0.03);
          border-color: rgba(255,255,255,0.1);
        }

        .capital-formatted {
          font-family: var(--font-display);
          font-size: 1.3rem;
          font-weight: 800;
          color: var(--color-teal);
          text-shadow: 0 0 10px rgba(0, 242, 254, 0.1);
        }

        .sliders-container {
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
          margin-top: 0.5rem;
        }

        .slider-item {
          padding: 0.75rem 0.25rem 0.25rem;
        }

        .slider-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .asset-label-box {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .color-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          box-shadow: 0 0 8px currentColor;
        }

        .asset-icon {
          color: var(--text-secondary);
        }

        .asset-name {
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--text-primary);
        }

        .asset-yield-tag {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .percent-display {
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          padding: 2px 6px;
        }

        .percent-input {
          background: none;
          border: none;
          color: var(--text-primary);
          font-size: 0.85rem;
          font-weight: 700;
          width: 32px;
          text-align: right;
          outline: none;
        }
        
        /* Remove arrows from number input */
        .percent-input::-webkit-outer-spin-button,
        .percent-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .percent-sign {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-left: 2px;
        }

        .allocation-details {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-top: -6px;
        }

        .income-sub {
          font-weight: 500;
          color: var(--text-primary);
        }

        .results-wrapper {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .chart-card {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .chart-content {
          display: flex;
          align-items: center;
          justify-content: space-around;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .svg-container {
          position: relative;
          width: 220px;
          height: 220px;
        }

        .donut-chart {
          filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.2));
        }

        .donut-segment {
          transition: stroke-dasharray 0.3s ease, stroke-dashoffset 0.3s ease;
        }

        .donut-center {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .donut-yield-val {
          font-family: var(--font-display);
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1.2;
        }

        .donut-yield-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .chart-legend {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 140px;
        }

        .legend-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.8rem;
          gap: 1.5rem;
        }

        .legend-label {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .legend-text {
          color: var(--text-secondary);
        }

        .legend-val {
          font-weight: 700;
          color: var(--text-primary);
        }

        .totals-card {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          background: linear-gradient(135deg, rgba(20, 27, 45, 0.6) 0%, rgba(9, 14, 26, 0.8) 100%);
        }

        .returns-display {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .return-stat {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-value {
          font-family: var(--font-display);
          font-size: 2rem;
          font-weight: 800;
          line-height: 1;
        }

        .text-teal {
          color: var(--color-teal);
          text-shadow: 0 0 15px rgba(0, 242, 254, 0.15);
        }

        .text-emerald {
          color: var(--color-emerald);
          text-shadow: 0 0 15px rgba(16, 185, 129, 0.15);
        }

        .divider-h {
          height: 1px;
          background: var(--border-color);
          width: 100%;
        }

        .safety-warning-banner {
          display: flex;
          gap: 8px;
          padding: 0.75rem 0.95rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: 10px;
        }

        .banner-icon {
          color: var(--text-muted);
          flex-shrink: 0;
          margin-top: 1px;
        }

        .safety-warning-banner p {
          font-size: 0.75rem;
          color: var(--text-secondary);
          line-height: 1.35;
        }
      `}</style>
    </div>
  );
}
