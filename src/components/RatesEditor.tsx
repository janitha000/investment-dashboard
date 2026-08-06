"use client";

import React from "react";
import { useRates, Rates } from "@/context/RatesContext";
import { X, RotateCcw, Sliders, Info } from "lucide-react";

interface RatesEditorProps {
  onClose: () => void;
}

export default function RatesEditor({ onClose }: RatesEditorProps) {
  const {
    customRates,
    isCustom,
    toggleCustomMode,
    updateCustomRates,
    resetCustomRates,
    liveRates
  } = useRates();

  const handleToggleMode = (e: React.ChangeEvent<HTMLInputElement>) => {
    toggleCustomMode(e.target.checked);
  };

  const handleRateChange = (
    category: keyof Rates,
    field: string,
    value: string
  ) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    
    updateCustomRates((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: numValue,
      },
    }));
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content animate-fade-in">
        <div className="modal-header">
          <div className="modal-title">
            <Sliders className="title-icon" size={20} />
            <h3>Configure Interest Rates</h3>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Mode Selector Toggle */}
          <div className="mode-toggle-card">
            <div className="toggle-info">
              <h4>Custom Overrides Mode</h4>
              <p>Toggle to manually override market rates with your own values for simulations.</p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={isCustom}
                onChange={handleToggleMode}
              />
              <span className="slider round"></span>
            </label>
          </div>

          {!isCustom && (
            <div className="live-info-banner">
              <Info size={16} className="info-icon" />
              <p>
                Rates are currently synced with <strong>live daily rates</strong> scraped from the Central Bank of Sri Lanka (CBSL) and market aggregates. Turn on overrides above to edit them.
              </p>
            </div>
          )}

          {/* Form Fields */}
          <div className={`rates-grid ${!isCustom ? "disabled-grid" : ""}`}>
            {/* Government Securities */}
            <div className="rate-section">
              <h5>Treasury Securities (Yield % p.a.)</h5>
              <div className="inputs-row">
                <div className="input-group">
                  <label>91-Day T-Bill</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!isCustom}
                    value={customRates.treasury.tb3m}
                    onChange={(e) => handleRateChange("treasury", "tb3m", e.target.value)}
                    className="glass-input"
                  />
                </div>
                <div className="input-group">
                  <label>182-Day T-Bill</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!isCustom}
                    value={customRates.treasury.tb6m}
                    onChange={(e) => handleRateChange("treasury", "tb6m", e.target.value)}
                    className="glass-input"
                  />
                </div>
                <div className="input-group">
                  <label>364-Day T-Bill</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!isCustom}
                    value={customRates.treasury.tb12m}
                    onChange={(e) => handleRateChange("treasury", "tb12m", e.target.value)}
                    className="glass-input"
                  />
                </div>
              </div>
            </div>

            {/* Fixed Deposits */}
            <div className="rate-section">
              <h5>Fixed Deposits (Interest % p.a.)</h5>
              <div className="inputs-row">
                <div className="input-group">
                  <label>1-Month (Bank)</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!isCustom}
                    value={customRates.fixedDeposit.bankAverage1m}
                    onChange={(e) => handleRateChange("fixedDeposit", "bankAverage1m", e.target.value)}
                    className="glass-input"
                  />
                </div>
                <div className="input-group">
                  <label>12-Month (Bank)</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!isCustom}
                    value={customRates.fixedDeposit.bankAverage12m}
                    onChange={(e) => handleRateChange("fixedDeposit", "bankAverage12m", e.target.value)}
                    className="glass-input"
                  />
                </div>
                <div className="input-group">
                  <label>12-Month (Finance Co)</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!isCustom}
                    value={customRates.fixedDeposit.financeAverage12m}
                    onChange={(e) => handleRateChange("fixedDeposit", "financeAverage12m", e.target.value)}
                    className="glass-input"
                  />
                </div>
              </div>
            </div>

            {/* Unit Trusts */}
            <div className="rate-section">
              <h5>Unit Trusts / Mutual Funds (Yield % p.a.)</h5>
              <div className="inputs-row">
                <div className="input-group">
                  <label>Money Market Fund</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!isCustom}
                    value={customRates.unitTrust.moneyMarketYield}
                    onChange={(e) => handleRateChange("unitTrust", "moneyMarketYield", e.target.value)}
                    className="glass-input"
                  />
                </div>
                <div className="input-group">
                  <label>Gilt-Edged Fund</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!isCustom}
                    value={customRates.unitTrust.giltEdgedYield}
                    onChange={(e) => handleRateChange("unitTrust", "giltEdgedYield", e.target.value)}
                    className="glass-input"
                  />
                </div>
              </div>
            </div>

            {/* Corporate Debt & PFCA FDs */}
            <div className="rate-section">
              <h5>Debentures & Currency FDs (% Yield)</h5>
              <div className="inputs-row">
                <div className="input-group">
                  <label>Corp Debenture Yield</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!isCustom}
                    value={customRates.corporateDebenture.averageYield}
                    onChange={(e) => handleRateChange("corporateDebenture", "averageYield", e.target.value)}
                    className="glass-input"
                  />
                </div>
                <div className="input-group">
                  <label>PFCA USD FD Yield</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!isCustom}
                    value={customRates.pfcaFd.usdYield12m}
                    onChange={(e) => handleRateChange("pfcaFd", "usdYield12m", e.target.value)}
                    className="glass-input"
                  />
                </div>
              </div>
            </div>

            {/* CSE & Real Estate */}
            <div className="rate-section">
              <h5>Equities & Properties (% Yield)</h5>
              <div className="inputs-row">
                <div className="input-group">
                  <label>CSE Avg Div Yield</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!isCustom}
                    value={customRates.cse.averageDividendYield}
                    onChange={(e) => handleRateChange("cse", "averageDividendYield", e.target.value)}
                    className="glass-input"
                  />
                </div>
                <div className="input-group">
                  <label>Res. Rental Yield</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!isCustom}
                    value={customRates.realEstate.residentialYield}
                    onChange={(e) => handleRateChange("realEstate", "residentialYield", e.target.value)}
                    className="glass-input"
                  />
                </div>
                <div className="input-group">
                  <label>Comm. Rental Yield</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!isCustom}
                    value={customRates.realEstate.commercialYield}
                    onChange={(e) => handleRateChange("realEstate", "commercialYield", e.target.value)}
                    className="glass-input"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          {isCustom && (
            <button className="reset-btn" onClick={resetCustomRates}>
              <RotateCcw size={14} style={{ marginRight: "6px" }} />
              Reset to Live Rates
            </button>
          )}
          <button className="save-btn" onClick={onClose}>
            Apply Configurations
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(4, 6, 12, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 1.5rem;
        }

        .modal-content {
          background: #0d1323;
          border: 1px solid var(--border-color);
          border-radius: 20px;
          width: 100%;
          max-width: 680px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
          overflow: hidden;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border-color);
        }

        .modal-title {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--text-primary);
        }

        .title-icon {
          color: var(--color-teal);
        }

        .modal-title h3 {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 1.2rem;
        }

        .close-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s ease;
        }

        .close-btn:hover {
          color: var(--color-coral);
        }

        .modal-body {
          padding: 1.5rem;
          max-height: 70vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .mode-toggle-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1rem 1.25rem;
        }

        .toggle-info h4 {
          font-size: 0.95rem;
          font-weight: 600;
          margin-bottom: 2px;
        }

        .toggle-info p {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .live-info-banner {
          display: flex;
          gap: 10px;
          background: rgba(0, 242, 254, 0.05);
          border: 1px solid rgba(0, 242, 254, 0.15);
          border-radius: 10px;
          padding: 0.85rem 1rem;
          font-size: 0.8rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .info-icon {
          color: var(--color-teal);
          flex-shrink: 0;
          margin-top: 2px;
        }

        .rates-grid {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          transition: opacity 0.3s ease;
        }

        .disabled-grid {
          opacity: 0.5;
          pointer-events: none;
        }

        .rate-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .rate-section h5 {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .inputs-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        @media (max-width: 500px) {
          .inputs-row {
            grid-template-columns: 1fr;
          }
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .input-group label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .modal-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          padding: 1.25rem 1.5rem;
          border-top: 1px solid var(--border-color);
          background: rgba(0, 0, 0, 0.1);
        }

        .reset-btn {
          background: none;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: var(--text-secondary);
          padding: 0.6rem 1rem;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: all 0.2s ease;
        }

        .reset-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
        }

        .save-btn {
          background: linear-gradient(135deg, var(--color-teal) 0%, var(--color-indigo) 100%);
          border: none;
          border-radius: 8px;
          color: #04060c;
          padding: 0.65rem 1.25rem;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .save-btn:hover {
          opacity: 0.95;
          box-shadow: 0 0 15px rgba(0, 242, 254, 0.3);
        }

        /* Toggle Switch Styling */
        .switch {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 26px;
          flex-shrink: 0;
        }

        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(255, 255, 255, 0.1);
          transition: .3s;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .3s;
        }

        input:checked + .slider {
          background-color: var(--color-indigo);
        }

        input:focus + .slider {
          box-shadow: 0 0 1px var(--color-indigo);
        }

        input:checked + .slider:before {
          transform: translateX(24px);
        }

        .slider.round {
          border-radius: 34px;
        }

        .slider.round:before {
          border-radius: 50%;
        }
      `}</style>
    </div>
  );
}
