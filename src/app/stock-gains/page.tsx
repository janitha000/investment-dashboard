"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, TrendingUp, TrendingDown, RefreshCw, AlertCircle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

type StockEntry = {
  id: string;
  symbol: string;
  buyDate: string;
  buyPrice: number;
  totalCost: number;
  currentPrice?: number;
  lastUpdated?: string;
};

type PortfolioData = {
  fds?: any[];
  uts?: any[];
  treasury?: any[];
  dividends?: any[];
  pfcaFds?: any[];
  stocks?: StockEntry[];
};

export default function StockGainsPage() {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states for new stock
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");
  const [newBuyDate, setNewBuyDate] = useState("");
  const [newBuyPrice, setNewBuyPrice] = useState("");
  const [newTotalCost, setNewTotalCost] = useState("");

  // Form states for updating current price
  const [editPriceId, setEditPriceId] = useState<string | null>(null);
  const [editPriceVal, setEditPriceVal] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/portfolio");
      if (!res.ok) throw new Error("Failed to fetch portfolio");
      const d = await res.json();
      if (!d.stocks) d.stocks = [];
      setData(d);
    } catch (err) {
      console.error(err);
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveData = async (updatedData: PortfolioData) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/portfolio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });
      if (!res.ok) throw new Error("Failed to save data");
      setData(updatedData);
    } catch (err) {
      console.error(err);
      setError("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    if (!newSymbol || !newBuyDate || !newBuyPrice || !newTotalCost) return;

    const newStock: StockEntry = {
      id: crypto.randomUUID(),
      symbol: newSymbol.toUpperCase(),
      buyDate: newBuyDate,
      buyPrice: parseFloat(newBuyPrice),
      totalCost: parseFloat(newTotalCost),
    };

    const updatedStocks = [...(data.stocks || []), newStock];
    const updatedData = { ...data, stocks: updatedStocks };

    handleSaveData(updatedData);
    setShowAddForm(false);
    setNewSymbol("");
    setNewBuyDate("");
    setNewBuyPrice("");
    setNewTotalCost("");
  };

  const handleDeleteStock = (id: string) => {
    if (!data) return;
    const updatedStocks = (data.stocks || []).filter((s) => s.id !== id);
    const updatedData = { ...data, stocks: updatedStocks };
    handleSaveData(updatedData);
  };

  const handleUpdatePrice = (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    const val = parseFloat(editPriceVal);
    if (isNaN(val) || val <= 0) return;

    const updatedStocks = (data.stocks || []).map((s) => {
      if (s.id === id) {
        return {
          ...s,
          currentPrice: val,
          lastUpdated: new Date().toISOString(),
        };
      }
      return s;
    });

    const updatedData = { ...data, stocks: updatedStocks };
    handleSaveData(updatedData);
    setEditPriceId(null);
    setEditPriceVal("");
  };

  const calculateMetrics = (stock: StockEntry) => {
    const quantity = stock.totalCost / stock.buyPrice;
    
    if (stock.currentPrice === undefined) {
      return { quantity, currentTotalValue: null, gainAmount: null, gainPercent: null, annualized: null };
    }

    const currentTotalValue = quantity * stock.currentPrice;
    const gainAmount = currentTotalValue - stock.totalCost;
    const gainPercent = (gainAmount / stock.totalCost) * 100;

    const buyDate = new Date(stock.buyDate);
    const now = new Date();
    const daysHeld = (now.getTime() - buyDate.getTime()) / (1000 * 3600 * 24);
    const yearsHeld = Math.max(daysHeld / 365, 0.001); // avoid div by zero

    let annualized = ((Math.pow(currentTotalValue / stock.totalCost, 1 / yearsHeld)) - 1) * 100;

    return { quantity, currentTotalValue, gainAmount, gainPercent, annualized };
  };

  if (loading) {
    return (
      <div className="loading-container">
        <RefreshCw className="spinner" size={32} />
        <style jsx>{`
          .loading-container {
            display: flex;
            height: 100vh;
            align-items: center;
            justify-content: center;
          }
          .spinner {
            animation: spin 1s linear infinite;
            color: var(--color-teal);
          }
          @keyframes spin { 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  const stocks = data?.stocks || [];
  
  const chartData = stocks.map((s) => {
    const metrics = calculateMetrics(s);
    return {
      symbol: s.symbol,
      cost: s.totalCost,
      currentValue: metrics.currentTotalValue || s.totalCost,
      gain: metrics.gainAmount || 0,
    };
  });

  return (
    <div className="stock-gains-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock Gains</h1>
          <p className="page-subtitle">Track the performance of your stock investments.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="add-btn"
        >
          {showAddForm ? <AlertCircle size={18} /> : <Plus size={18} />}
          {showAddForm ? "Cancel" : "Add Stock"}
        </button>
      </div>

      {error && (
        <div className="error-banner glass-card">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {showAddForm && (
        <div className="form-card glass-card">
          <h3>Add New Stock</h3>
          <form onSubmit={handleAddStock} className="stock-form">
            <div className="form-group">
              <label>Symbol / Name</label>
              <input
                type="text"
                placeholder="e.g. JKH.N0000"
                className="glass-input"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Buy Date</label>
              <input
                type="date"
                className="glass-input"
                value={newBuyDate}
                onChange={(e) => setNewBuyDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Buy Price (Per Share)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                className="glass-input"
                value={newBuyPrice}
                onChange={(e) => setNewBuyPrice(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Total Cost (Investment)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                className="glass-input"
                value={newTotalCost}
                onChange={(e) => setNewTotalCost(e.target.value)}
              />
            </div>
            <div className="form-actions">
              <button
                type="submit"
                disabled={saving || !newSymbol || !newBuyDate || !newBuyPrice || !newTotalCost}
                className="save-btn"
              >
                {saving ? "Saving..." : "Save Stock"}
              </button>
            </div>
          </form>
        </div>
      )}

      {stocks.length > 0 && (
        <div className="overview-card glass-card">
          <h3>Portfolio Overview</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="symbol" tick={{ fill: '#9ca3af' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} />
                <YAxis tick={{ fill: '#9ca3af' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickFormatter={(val) => `${(val / 1000)}k`} />
                <Tooltip
                  formatter={(value: any) => `Rs. ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  contentStyle={{ backgroundColor: '#141b2d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend />
                <Bar dataKey="cost" name="Total Cost" fill="#6b7280" radius={[4, 4, 0, 0]} />
                <Bar dataKey="currentValue" name="Current Value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.gain >= 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="stocks-list">
        {stocks.length === 0 ? (
          <div className="empty-state glass-card">
            <TrendingUp className="empty-icon" size={48} />
            <p>No stocks added yet. Add one to start tracking gains!</p>
          </div>
        ) : (
          stocks.map((stock) => {
            const metrics = calculateMetrics(stock);
            const isGain = metrics.gainAmount !== null && metrics.gainAmount >= 0;
            const hasPrice = stock.currentPrice !== undefined;
            
            return (
              <div key={stock.id} className="stock-card glass-card">
                <div className={`indicator-bar ${hasPrice ? (isGain ? 'gain' : 'loss') : 'neutral'}`}></div>
                
                <div className="stock-content">
                  <div className="stock-header">
                    <div>
                      <h2>{stock.symbol}</h2>
                      <p className="buy-date">Bought on {new Date(stock.buyDate).toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteStock(stock.id)}
                      className="delete-btn"
                      title="Delete stock"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="metrics-grid">
                    <div className="metric">
                      <p className="metric-label">Cost Basis</p>
                      <p className="metric-val">Rs. {stock.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p className="metric-sub">{metrics.quantity.toFixed(2)} shares @ Rs. {stock.buyPrice}</p>
                    </div>
                    
                    <div className="metric">
                      <p className="metric-label">Current Value</p>
                      {metrics.currentTotalValue !== null ? (
                        <p className="metric-val">Rs. {metrics.currentTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      ) : (
                        <p className="metric-val not-set">Not set</p>
                      )}
                      {hasPrice && (
                        <p className="metric-sub">@ Rs. {stock.currentPrice} / share</p>
                      )}
                    </div>

                    <div className="metric">
                      <p className="metric-label">Gain/Loss</p>
                      {metrics.gainAmount !== null ? (
                        <p className={`metric-val flex-val ${isGain ? 'text-gain' : 'text-loss'}`}>
                          {isGain ? '+' : ''}{metrics.gainAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          {isGain ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        </p>
                      ) : (
                        <p className="metric-val not-set">-</p>
                      )}
                    </div>

                    <div className="metric">
                      <p className="metric-label">Returns</p>
                      {metrics.gainPercent !== null && metrics.annualized !== null ? (
                        <div>
                          <p className={`metric-val ${isGain ? 'text-gain' : 'text-loss'}`}>
                            {metrics.gainPercent > 0 ? '+' : ''}{metrics.gainPercent.toFixed(2)}% <span className="sub-label">Total</span>
                          </p>
                          <p className={`metric-sub ${metrics.annualized >= 0 ? 'text-gain' : 'text-loss'}`}>
                            {metrics.annualized > 0 ? '+' : ''}{metrics.annualized.toFixed(2)}% <span className="sub-label">Ann.</span>
                          </p>
                        </div>
                      ) : (
                        <p className="metric-val not-set">-</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="price-update-section">
                  <p className="section-title">Update Current Price</p>
                  
                  {editPriceId === stock.id ? (
                    <form onSubmit={(e) => handleUpdatePrice(stock.id, e)} className="update-form">
                      <div className="update-inputs">
                        <input
                          type="number"
                          step="0.01"
                          className="glass-input small-input"
                          placeholder="Current Price"
                          value={editPriceVal}
                          onChange={(e) => setEditPriceVal(e.target.value)}
                          autoFocus
                        />
                        <button
                          type="submit"
                          disabled={saving}
                          className="save-sm-btn"
                        >
                          Save
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditPriceId(null)}
                        className="cancel-sm-btn"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <div>
                      <button
                        onClick={() => {
                          setEditPriceId(stock.id);
                          setEditPriceVal(stock.currentPrice !== undefined ? String(stock.currentPrice) : "");
                        }}
                        className="update-price-btn"
                      >
                        {hasPrice ? "Update Price" : "Set Current Price"}
                      </button>
                      {stock.lastUpdated && (
                        <p className="last-updated">
                          Updated: {new Date(stock.lastUpdated).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <style jsx>{`
        .stock-gains-page {
          max-width: 1200px;
          margin: 0 auto;
          padding-bottom: 4rem;
        }

        .page-header {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        @media (min-width: 640px) {
          .page-header {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }
        }

        .add-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, var(--color-teal) 0%, var(--color-emerald) 100%);
          color: #000;
          border: none;
          padding: 0.6rem 1.25rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .add-btn:hover {
          transform: translateY(-2px);
          box-shadow: var(--glow-emerald);
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--color-coral);
          border-color: rgba(248, 113, 113, 0.3);
          margin-bottom: 2rem;
        }

        .form-card {
          margin-bottom: 2rem;
        }
        .form-card h3 {
          margin-bottom: 1.5rem;
          font-size: 1.2rem;
          color: var(--text-primary);
        }
        .stock-form {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }
        @media (min-width: 640px) {
          .stock-form {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (min-width: 1024px) {
          .stock-form {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .form-actions {
          grid-column: 1 / -1;
          display: flex;
          justify-content: flex-end;
          margin-top: 1rem;
        }
        .save-btn {
          background: rgba(0, 242, 254, 0.15);
          color: var(--color-teal);
          border: 1px solid rgba(0, 242, 254, 0.3);
          padding: 0.6rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .save-btn:hover:not(:disabled) {
          background: rgba(0, 242, 254, 0.25);
        }
        .save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .overview-card {
          margin-bottom: 2rem;
        }
        .overview-card h3 {
          margin-bottom: 1.5rem;
          font-size: 1.2rem;
        }
        .chart-container {
          height: 300px;
          width: 100%;
        }

        .stocks-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          text-align: center;
          color: var(--text-muted);
        }
        .empty-icon {
          color: var(--text-secondary);
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .stock-card {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          position: relative;
          overflow: hidden;
        }
        @media (min-width: 768px) {
          .stock-card {
            flex-direction: row;
          }
        }
        .indicator-bar {
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
        }
        .indicator-bar.gain { background: var(--color-emerald); }
        .indicator-bar.loss { background: var(--color-coral); }
        .indicator-bar.neutral { background: var(--text-muted); }

        .stock-content {
          flex: 1;
        }
        .stock-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
        }
        .stock-header h2 {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .buy-date {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-top: 0.2rem;
        }
        .delete-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: color 0.2s;
        }
        .delete-btn:hover {
          color: var(--color-coral);
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
        }
        @media (min-width: 1024px) {
          .metrics-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        .metric-label {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-bottom: 0.3rem;
        }
        .metric-val {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .metric-val.not-set {
          color: var(--text-muted);
          font-style: italic;
          font-weight: 400;
        }
        .metric-sub {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 0.2rem;
        }
        .flex-val {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .text-gain { color: var(--color-emerald) !important; }
        .text-loss { color: var(--color-coral) !important; }
        .sub-label {
          font-weight: 400;
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        .price-update-section {
          width: 100%;
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 8px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        @media (min-width: 768px) {
          .price-update-section {
            width: 240px;
          }
        }
        .section-title {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 0.75rem;
          font-weight: 500;
        }
        .update-price-btn {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: var(--text-primary);
          padding: 0.5rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.2s;
        }
        .update-price-btn:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.2);
        }
        .last-updated {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-align: center;
          margin-top: 0.5rem;
        }
        .update-form {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .update-inputs {
          display: flex;
          gap: 0.5rem;
        }
        .small-input {
          padding: 0.4rem 0.6rem;
          font-size: 0.85rem;
        }
        .save-sm-btn {
          background: rgba(0, 242, 254, 0.15);
          color: var(--color-teal);
          border: 1px solid rgba(0, 242, 254, 0.3);
          border-radius: 6px;
          padding: 0 0.75rem;
          font-size: 0.85rem;
          cursor: pointer;
        }
        .cancel-sm-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 0.75rem;
          cursor: pointer;
          text-align: left;
        }
        .cancel-sm-btn:hover {
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
}
