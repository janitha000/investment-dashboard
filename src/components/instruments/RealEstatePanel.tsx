"use client";

import React, { useState } from "react";
import { useRates } from "@/context/RatesContext";
import { Home, Info, Calculator, Landmark, ShieldCheck, MapPin } from "lucide-react";

export default function RealEstate() {
  const { rates } = useRates();
  
  // Calculator states
  const [purchasePrice, setPurchasePrice] = useState<number>(35000000); // 35M LKR default (Colombo apartment)
  const [upfrontCosts, setUpfrontCosts] = useState<number>(1500000); // 1.5M closing/stamp/refurbishment
  const [monthlyRent, setMonthlyRent] = useState<number>(180000); // 180k monthly rent
  const [maintenanceMonthly, setMaintenanceMonthly] = useState<number>(15000); // 15k monthly condo fees
  const [propertyTaxAnnual, setPropertyTaxAnnual] = useState<number>(50000); // 50k annual municipal rates
  const [vacancyRate, setVacancyRate] = useState<number>(8.33); // ~1 month empty per year (8.33%)

  // Calculations
  const totalInvestment = purchasePrice + upfrontCosts;
  
  // Gross annual rent accounting for vacancy rate
  const grossAnnualRent = (monthlyRent * 12) * (1 - vacancyRate / 100);
  
  // Annual maintenance and taxes
  const annualExpenses = (maintenanceMonthly * 12) + propertyTaxAnnual;
  
  // Net annual return
  const netAnnualRent = grossAnnualRent - annualExpenses;
  
  // Net Yield
  const netYield = totalInvestment > 0 ? (netAnnualRent / totalInvestment) * 100 : 0;
  const grossYield = totalInvestment > 0 ? ((monthlyRent * 12) / totalInvestment) * 100 : 0;

  const formatLKR = (num: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const locations = [
    { name: "Colombo 03 / 07 (Luxury Apartments)", grossYield: "4.5% - 5.5%", rentRange: "LKR 250k - 450k / mo", type: "Residential" },
    { name: "Rajagiriya / Battaramulla (Suburban Condos)", grossYield: "5.0% - 6.0%", rentRange: "LKR 120k - 220k / mo", type: "Residential" },
    { name: "Colombo 10 / 11 (Commercial / Retail)", grossYield: "6.5% - 8.5%", rentRange: "LKR 300k - 800k / mo", type: "Commercial" },
    { name: "Galle / Weligama (Tourism / Short-let)", grossYield: "7.0% - 10.0%", rentRange: "Variable (USD-pegged)", type: "Tourism/Leisure" },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header-container">
        <span className="badge badge-gold" style={{ background: "rgba(251, 191, 36, 0.12)", color: "var(--color-gold)", border: "1px solid rgba(251,191,36,0.2)" }}>Tangible Assets</span>
        <h1 className="page-title">Real Estate (Rental Income)</h1>
        <p className="page-subtitle">
          Secure cash flow and inflation-hedged growth. Renting out residential apartments, commercial buildings, or tourist villas in prime Sri Lankan locations.
        </p>
      </div>

      {/* Regulation Alert */}
      <section className="safety-banner glass-card">
        <div className="banner-icon-box">
          <ShieldCheck size={32} className="shield-icon" />
        </div>
        <div className="banner-content">
          <h4>Inflation Hedge & Capital Appreciation</h4>
          <p>
            Real estate in Sri Lanka has historically acted as a powerful shield against high inflation and rupee devaluation. While yields are lower than paper assets (like FDs), properties offer compounding capital appreciation and rents can be adjusted upwards over time.
          </p>
        </div>
      </section>

      <div className="re-grid">
        {/* Net Yield Calculator */}
        <div className="glass-card calculator-card">
          <div className="card-header-icon">
            <Calculator size={20} className="header-icon" />
            <h3>Net Rental Yield Calculator</h3>
          </div>
          <p className="card-desc">Calculate net yields by factoring in upfront closing costs, ongoing service charges, municipal taxes, and vacancy periods.</p>

          <div className="calculator-inputs">
            {/* Row 1: Capital */}
            <div className="input-row-double">
              <div className="input-group">
                <label>Property Purchase Price (LKR)</label>
                <input
                  type="number"
                  step="500000"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(Math.max(0, parseInt(e.target.value) || 0))}
                  className="glass-input"
                />
                <span className="input-hint">Total: {formatLKR(totalInvestment)} (with costs)</span>
              </div>
              <div className="input-group">
                <label>Upfront Costs (Stamp Duty, Legal, Refurbish)</label>
                <input
                  type="number"
                  step="100000"
                  value={upfrontCosts}
                  onChange={(e) => setUpfrontCosts(Math.max(0, parseInt(e.target.value) || 0))}
                  className="glass-input"
                />
              </div>
            </div>

            {/* Row 2: Rent & Vacancy */}
            <div className="input-row-double">
              <div className="input-group">
                <label>Expected Monthly Rent (LKR)</label>
                <input
                  type="number"
                  step="10000"
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(Math.max(0, parseInt(e.target.value) || 0))}
                  className="glass-input"
                />
                <span className="input-hint">{formatLKR(monthlyRent * 12)} gross annual rent</span>
              </div>
              <div className="input-group">
                <label>Vacancy Assumption (empty rate %)</label>
                <select
                  value={vacancyRate}
                  onChange={(e) => setVacancyRate(parseFloat(e.target.value))}
                  className="glass-input"
                  style={{ background: "#0d1323" }}
                >
                  <option value={0}>0% (Occupied 12 months/year)</option>
                  <option value={4.17}>4.17% (Occupied 11.5 months/year)</option>
                  <option value={8.33}>8.33% (Occupied 11 months/year)</option>
                  <option value={16.67}>16.67% (Occupied 10 months/year)</option>
                  <option value={25.0}>25% (Occupied 9 months/year)</option>
                </select>
              </div>
            </div>

            {/* Row 3: Expenses */}
            <div className="input-row-double">
              <div className="input-group">
                <label>Monthly Maintenance / Service Charges</label>
                <input
                  type="number"
                  step="2000"
                  value={maintenanceMonthly}
                  onChange={(e) => setMaintenanceMonthly(Math.max(0, parseInt(e.target.value) || 0))}
                  className="glass-input"
                />
              </div>
              <div className="input-group">
                <label>Annual Municipal Property Tax (Rates)</label>
                <input
                  type="number"
                  step="5000"
                  value={propertyTaxAnnual}
                  onChange={(e) => setPropertyTaxAnnual(Math.max(0, parseInt(e.target.value) || 0))}
                  className="glass-input"
                />
              </div>
            </div>
          </div>

          <div className="divider-h" />

          {/* Results Output */}
          <div className="calculator-results">
            <div className="results-row-grid">
              <div className="result-block">
                <span className="result-label">Net Annual Cash Flow</span>
                <span className="result-val text-emerald">{formatLKR(netAnnualRent)}</span>
                <span className="sub-label">Expenses: {formatLKR(annualExpenses)}/year</span>
              </div>
              <div className="result-block">
                <span className="result-label">Net Rental Yield</span>
                <span className="result-val text-gold">{netYield.toFixed(2)}%</span>
                <span className="sub-label">Gross Yield: {grossYield.toFixed(2)}%</span>
              </div>
              <div className="result-block">
                <span className="result-label">Net Monthly Cash Flow</span>
                <span className="result-val text-teal">{formatLKR(netAnnualRent / 12)}</span>
                <span className="sub-label">Avg. monthly equivalent</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sri Lankan Locations & Yields */}
        <div className="glass-card yields-card">
          <div className="card-header-icon">
            <MapPin size={20} className="header-icon" />
            <h3>Sri Lankan Location & Yield Guide</h3>
          </div>
          <p className="card-desc">Average property profiles across different geographical locations in Sri Lanka.</p>

          <div className="locations-list">
            {locations.map((loc) => (
              <div className="location-item" key={loc.name}>
                <div className="loc-meta">
                  <div className="loc-title-box">
                    <span className="loc-name">{loc.name}</span>
                  </div>
                  <div className="loc-sub-details">
                    <span>Rent Range: <strong>{loc.rentRange}</strong></span>
                    <span className="separator-dot">•</span>
                    <span>Type: {loc.type}</span>
                  </div>
                </div>
                <div className="loc-action">
                  <span className="loc-yield-value">{loc.grossYield}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="reit-info-box">
            <Info size={14} className="info-icon" />
            <p>
              <strong>Looking for REITs?</strong> Real Estate Investment Trusts are beginning to emerge in Sri Lanka, allowing you to invest as little as LKR 10,000 to earn rental dividends from commercial portfolios with zero tenant management hassle.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .re-grid {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        @media (max-width: 1024px) {
          .re-grid {
            grid-template-columns: 1fr;
          }
        }

        .safety-banner {
          display: flex;
          gap: 1.25rem;
          padding: 1.5rem;
          margin-bottom: 2rem;
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.05) 0%, rgba(9, 14, 26, 0.4) 100%);
          border-color: rgba(251, 191, 36, 0.15);
        }

        .banner-icon-box {
          color: var(--color-gold);
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(251, 191, 36, 0.08);
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
          color: var(--color-gold);
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
          color: var(--color-gold);
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
        .text-gold { color: var(--color-gold); }

        /* Locations list */
        .locations-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .location-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.85rem 1rem;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          transition: all 0.2s ease;
        }

        .location-item:hover {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.12);
        }

        .loc-title-box {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 2px;
        }

        .loc-name {
          font-weight: 700;
          font-size: 0.85rem;
          color: var(--text-primary);
        }

        .loc-sub-details {
          display: flex;
          align-items: center;
          font-size: 0.725rem;
          color: var(--text-secondary);
          gap: 6px;
        }

        .separator-dot {
          color: var(--text-muted);
        }

        .loc-action {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .loc-yield-value {
          font-family: var(--font-display);
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--color-gold);
        }

        .reit-info-box {
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

        .reit-info-box p {
          font-size: 0.75rem;
          color: var(--text-secondary);
          line-height: 1.35;
        }
      `}</style>
    </div>
  );
}
