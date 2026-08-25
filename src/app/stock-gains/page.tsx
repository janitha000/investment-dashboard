"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, TrendingUp, TrendingDown, RefreshCw, AlertCircle, ArrowLeft } from "lucide-react";
import {
  LineChart,
  Line,
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

  // Drill-down state
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  // Form states for new stock
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");
  const [newBuyDate, setNewBuyDate] = useState("");
  const [newBuyPrice, setNewBuyPrice] = useState("");
  const [newTotalCost, setNewTotalCost] = useState("");

  // Form states for updating current price for a symbol
  const [editPriceVal, setEditPriceVal] = useState("");

  const handleDatePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData("text").trim();
    const regex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
    const match = pastedText.match(regex);
    if (match) {
      e.preventDefault();
      let [_, day, month, year] = match;
      if (day.length === 1) day = "0" + day;
      if (month.length === 1) month = "0" + month;
      
      const formattedDate = `${year}-${month}-${day}`;
      setNewBuyDate(formattedDate);
    }
  };

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
    
    // If we are inside a specific stock view, force the symbol to be the selected one
    const symbolToUse = selectedSymbol ? selectedSymbol : newSymbol;
    if (!symbolToUse || !newBuyDate || !newBuyPrice || !newTotalCost) return;

    // Use the latest currentPrice of this symbol if it exists
    let existingCurrentPrice: number | undefined;
    let existingLastUpdated: string | undefined;
    const existingStocks = data.stocks || [];
    const sameSymbolStocks = existingStocks.filter(s => s.symbol.toUpperCase() === symbolToUse.toUpperCase());
    if (sameSymbolStocks.length > 0) {
      existingCurrentPrice = sameSymbolStocks[0].currentPrice;
      existingLastUpdated = sameSymbolStocks[0].lastUpdated;
    }

    const newStock: StockEntry = {
      id: crypto.randomUUID(),
      symbol: symbolToUse.toUpperCase(),
      buyDate: newBuyDate,
      buyPrice: parseFloat(newBuyPrice),
      totalCost: parseFloat(newTotalCost),
      currentPrice: existingCurrentPrice,
      lastUpdated: existingLastUpdated
    };

    const updatedStocks = [...existingStocks, newStock];
    const updatedData = { ...data, stocks: updatedStocks };

    handleSaveData(updatedData);
    setShowAddForm(false);
    setNewSymbol("");
    setNewBuyDate("");
    setNewBuyPrice("");
    setNewTotalCost("");
    if (!selectedSymbol) {
      setSelectedSymbol(symbolToUse.toUpperCase());
    }
  };

  const handleDeleteStock = (id: string) => {
    if (!data) return;
    const updatedStocks = (data.stocks || []).filter((s) => s.id !== id);
    const updatedData = { ...data, stocks: updatedStocks };
    handleSaveData(updatedData);
  };

  const handleUpdatePriceForSymbol = (symbol: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    const val = parseFloat(editPriceVal);
    if (isNaN(val) || val <= 0) return;

    const nowStr = new Date().toISOString();
    const updatedStocks = (data.stocks || []).map((s) => {
      if (s.symbol === symbol) {
        return { ...s, currentPrice: val, lastUpdated: nowStr };
      }
      return s;
    });

    const updatedData = { ...data, stocks: updatedStocks };
    handleSaveData(updatedData);
    setEditPriceVal("");
  };

  const handleFetchPrice = async (symbol: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/stock-price?symbol=${symbol}`);
      if (!res.ok) throw new Error("Price not found");
      const d = await res.json();
      
      const val = parseFloat(d.price);
      if (isNaN(val) || val <= 0) throw new Error("Invalid price received");

      const nowStr = new Date().toISOString();
      const updatedStocks = (data?.stocks || []).map((s) => {
        if (s.symbol === symbol) {
          return { ...s, currentPrice: val, lastUpdated: nowStr };
        }
        return s;
      });

      const updatedData = { ...data, stocks: updatedStocks };
      handleSaveData(updatedData);
      setEditPriceVal("");
    } catch (err) {
      console.error(err);
      setError("Failed to fetch latest price for " + symbol + " from CSE.");
    } finally {
      setSaving(false);
    }
  };

  const calculateMetrics = (stock: StockEntry) => {
    const quantity = stock.totalCost / stock.buyPrice;
    
    if (stock.currentPrice === undefined) {
      return { quantity, currentTotalValue: null, gainAmount: null, gainPercent: null, annualized: null };
    }

    const grossCurrentValue = quantity * stock.currentPrice;
    const secFee = grossCurrentValue * 0.0112; // Standard 1.12% CSE/SEC transaction fee
    const currentTotalValue = grossCurrentValue - secFee;
    
    const gainAmount = currentTotalValue - stock.totalCost;
    const gainPercent = (gainAmount / stock.totalCost) * 100;

    const buyDate = new Date(stock.buyDate);
    const now = new Date();
    const daysHeld = (now.getTime() - buyDate.getTime()) / (1000 * 3600 * 24);
    const yearsHeld = Math.max(daysHeld / 365, 0.001); // avoid div by zero

    let annualized = ((Math.pow(currentTotalValue / stock.totalCost, 1 / yearsHeld)) - 1) * 100;

    return { quantity, currentTotalValue, gainAmount, gainPercent, annualized, secFee, grossCurrentValue };
  };

  if (loading) {
    return (
      <div className="loading-container">
        <RefreshCw className="spinner" size={32} />
        <style jsx>{`
          .loading-container { display: flex; height: 100vh; align-items: center; justify-content: center; }
          .spinner { animation: spin 1s linear infinite; color: var(--color-teal); }
          @keyframes spin { 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  const stocks = data?.stocks || [];
  
  // Group stocks by symbol
  const groupedStocks = stocks.reduce((acc, stock) => {
    if (!acc[stock.symbol]) acc[stock.symbol] = [];
    acc[stock.symbol].push(stock);
    return acc;
  }, {} as Record<string, StockEntry[]>);
  
  const uniqueSymbols = Object.keys(groupedStocks).sort();

  // If the selected symbol was deleted entirely, go back to overview
  if (selectedSymbol && !groupedStocks[selectedSymbol]) {
    setSelectedSymbol(null);
  }

  const renderAddForm = () => (
    <div className="form-card glass-card">
      <div className="flex justify-between items-center mb-4">
        <h3>{selectedSymbol ? `Add Entry for ${selectedSymbol}` : 'Add New Stock'}</h3>
        <button onClick={() => setShowAddForm(false)} className="close-btn"><AlertCircle size={18}/> Cancel</button>
      </div>
      <form onSubmit={handleAddStock} className="stock-form">
        {!selectedSymbol && (
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
        )}
        <div className="form-group">
          <label>Buy Date</label>
          <input
            type="date"
            className="glass-input"
            value={newBuyDate}
            onChange={(e) => setNewBuyDate(e.target.value)}
            onPaste={handleDatePaste}
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
            disabled={saving || (!selectedSymbol && !newSymbol) || !newBuyDate || !newBuyPrice || !newTotalCost}
            className="save-btn"
          >
            {saving ? "Saving..." : "Save Entry"}
          </button>
        </div>
      </form>
    </div>
  );

  if (selectedSymbol) {
    const symbolStocks = groupedStocks[selectedSymbol];
    // They all share the same currentPrice / lastUpdated (based on logic, or at least we take the first one)
    const currentPrice = symbolStocks[0]?.currentPrice;
    const lastUpdated = symbolStocks[0]?.lastUpdated;

    // Calculate aggregate totals for this symbol
    let totalCost = 0;
    let totalValue = 0;
    let totalQty = 0;
    let totalFees = 0;
    symbolStocks.forEach(s => {
      const m = calculateMetrics(s);
      totalCost += s.totalCost;
      totalQty += m.quantity;
      if (m.currentTotalValue) totalValue += m.currentTotalValue;
    if (m.secFee) totalFees += m.secFee;
    });
    const totalGain = totalValue > 0 ? totalValue - totalCost : 0;
    const totalGainPercent = totalValue > 0 ? (totalGain / totalCost) * 100 : 0;

    // Chart data for entries (Timeline)
    const sortedStocks = [...symbolStocks].sort((a, b) => new Date(a.buyDate).getTime() - new Date(b.buyDate).getTime());
    let cumCost = 0;
    let cumQty = 0;
    const chartData = sortedStocks.map((s) => {
      cumCost += s.totalCost;
      cumQty += s.totalCost / s.buyPrice;
      const grossVal = currentPrice ? cumQty * currentPrice : cumCost;
      const netVal = currentPrice ? grossVal - (grossVal * 0.0112) : null;
      
      return {
        name: new Date(s.buyDate).toLocaleDateString(),
        timestamp: new Date(s.buyDate).getTime(),
        cost: cumCost,
        currentValue: netVal
      };
    });

    if (chartData.length > 0) {
      const todayTime = new Date().getTime();
      if (todayTime > chartData[chartData.length - 1].timestamp) {
        chartData.push({
          name: "Today",
          timestamp: todayTime,
          cost: cumCost,
          currentValue: currentPrice ? (cumQty * currentPrice * (1 - 0.0112)) : null
        });
      }
    }

    return (
      <div className="stock-gains-page">
        <div className="page-header">
          <div className="flex gap-4 items-center">
            <button onClick={() => setSelectedSymbol(null)} className="back-btn">
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="page-title">{selectedSymbol}</h1>
              <p className="page-subtitle">Per-entry metrics and visualization</p>
            </div>
          </div>
          <button onClick={() => setShowAddForm(true)} className="add-btn">
            <Plus size={18} /> Add Entry
          </button>
        </div>

        {error && (
          <div className="error-banner glass-card">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {showAddForm && renderAddForm()}

        {/* Symbol Aggregate & Price Update */}
        <div className="glass-card summary-update-card mb-8">
          <div className="symbol-summary">
            <div>
              <p className="metric-label">Total Cost Basis</p>
              <p className="metric-val">Rs. {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="metric-sub">{totalQty.toFixed(2)} total shares</p>
            </div>
            <div>
              <p className="metric-label">Total Net Value</p>
              <p className="metric-val">Rs. {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="metric-sub">After Rs. {totalFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEC fees</p>
            </div>
            <div>
              <p className="metric-label">Total Gain/Loss</p>
              <p className={`metric-val flex-val ${totalGain >= 0 ? 'text-gain' : 'text-loss'}`}>
                {totalGain >= 0 ? '+' : ''}{totalGain.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                ({totalGainPercent.toFixed(2)}%)
              </p>
            </div>
          </div>
          
          <div className="price-update-section">
            <div className="flex justify-between items-center mb-2">
              <p className="section-title mb-0">Market Price</p>
              <button 
                type="button" 
                onClick={() => handleFetchPrice(selectedSymbol)} 
                disabled={saving}
                className="fetch-api-btn"
                title="Fetch latest from CSE"
              >
                <RefreshCw size={14} className={saving ? 'spin' : ''} /> Fetch
              </button>
            </div>
            <form onSubmit={(e) => handleUpdatePriceForSymbol(selectedSymbol, e)} className="update-form">
              <div className="update-inputs">
                <input
                  type="number"
                  step="0.01"
                  className="glass-input small-input"
                  placeholder={currentPrice ? String(currentPrice) : "Enter current price"}
                  value={editPriceVal}
                  onChange={(e) => setEditPriceVal(e.target.value)}
                />
                <button type="submit" disabled={saving || !editPriceVal} className="save-sm-btn">
                  Update
                </button>
              </div>
            </form>
            {lastUpdated && (
              <p className="last-updated">
                Last updated: {new Date(lastUpdated).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {/* Per-Entry Chart */}
        <div className="overview-card glass-card">
          <h3>Entry Visualizations</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" tick={{ fill: '#9ca3af' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} />
                <YAxis tick={{ fill: '#9ca3af' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickFormatter={(val) => `${(val / 1000)}k`} />
                <Tooltip
                  formatter={(value: any) => `Rs. ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  contentStyle={{ backgroundColor: '#141b2d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend />
                <Line type="monotone" dataKey="cost" name="Total Cost Spent" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="currentValue" name="Actual Selling Value" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Entries List */}
        <h3 className="section-heading mt-8 mb-4">Individual Entries</h3>
        <div className="stocks-list">
          {symbolStocks.map((stock) => {
            const metrics = calculateMetrics(stock);
            const isGain = metrics.gainAmount !== null && metrics.gainAmount >= 0;
            const hasPrice = stock.currentPrice !== undefined;
            
            return (
              <div key={stock.id} className="stock-card glass-card">
                <div className={`indicator-bar ${hasPrice ? (isGain ? 'gain' : 'loss') : 'neutral'}`}></div>
                <div className="stock-content">
                  <div className="stock-header">
                    <div>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Bought on {new Date(stock.buyDate).toLocaleDateString()}</h4>
                    </div>
                    <button onClick={() => handleDeleteStock(stock.id)} className="delete-btn" title="Delete entry">
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
                      <p className="metric-label">Net Current Value</p>
                      {metrics.currentTotalValue !== null ? (
                        <div>
                          <p className="metric-val">Rs. {metrics.currentTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          <p className="metric-sub">After Rs. {metrics.secFee?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEC fees</p>
                        </div>
                      ) : (
                        <p className="metric-val not-set">Not set</p>
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
              </div>
            );
          })}
        </div>

        <style jsx>{`
          .stock-gains-page { max-width: 1200px; margin: 0 auto; padding-bottom: 4rem; }
          .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
          .back-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 50%; padding: 0.5rem; color: var(--text-primary); cursor: pointer; transition: all 0.2s; }
          .back-btn:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.3); }
          .add-btn { display: flex; align-items: center; gap: 8px; background: linear-gradient(135deg, var(--color-teal) 0%, var(--color-emerald) 100%); color: #000; border: none; padding: 0.6rem 1.25rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: transform 0.2s; }
          .add-btn:hover { transform: translateY(-2px); box-shadow: var(--glow-emerald); }
          .close-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 0.85rem; }
          .close-btn:hover { color: var(--text-primary); }
          
          .error-banner { display: flex; align-items: center; gap: 10px; color: var(--color-coral); border-color: rgba(248, 113, 113, 0.3); margin-bottom: 2rem; }
          .form-card { margin-bottom: 2rem; }
          .form-card h3 { margin-bottom: 1.5rem; font-size: 1.2rem; }
          .stock-form { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
          @media (min-width: 640px) { .stock-form { grid-template-columns: repeat(2, 1fr); } }
          @media (min-width: 1024px) { .stock-form { grid-template-columns: repeat(4, 1fr); } }
          .form-group label { display: block; margin-bottom: 0.5rem; font-size: 0.85rem; color: var(--text-secondary); }
          .form-actions { grid-column: 1 / -1; display: flex; justify-content: flex-end; margin-top: 1rem; }
          .save-btn { background: rgba(0, 242, 254, 0.15); color: var(--color-teal); border: 1px solid rgba(0, 242, 254, 0.3); padding: 0.6rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
          .save-btn:hover:not(:disabled) { background: rgba(0, 242, 254, 0.25); }
          .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
          
          .summary-update-card { display: flex; flex-direction: column; gap: 1.5rem; }
          @media (min-width: 768px) { .summary-update-card { flex-direction: row; justify-content: space-between; align-items: center; } }
          .symbol-summary { display: flex; gap: 2rem; flex-wrap: wrap; }
          .price-update-section { background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 1rem; display: flex; flex-direction: column; width: 100%; max-width: 300px; }
          .section-title { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.75rem; font-weight: 500; }
          .update-form { display: flex; flex-direction: column; gap: 0.5rem; }
          .update-inputs { display: flex; gap: 0.5rem; }
          .small-input { padding: 0.4rem 0.6rem; font-size: 0.85rem; width: 100%; }
          .save-sm-btn { background: rgba(0, 242, 254, 0.15); color: var(--color-teal); border: 1px solid rgba(0, 242, 254, 0.3); border-radius: 6px; padding: 0 0.75rem; font-size: 0.85rem; cursor: pointer; }
          .save-sm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
          .fetch-api-btn { display: flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: var(--text-primary); border-radius: 4px; padding: 0.2rem 0.5rem; font-size: 0.75rem; cursor: pointer; transition: all 0.2s; }
          .fetch-api-btn:hover:not(:disabled) { background: rgba(255,255,255,0.2); }
          .fetch-api-btn:disabled { opacity: 0.5; cursor: not-allowed; }
          .spin { animation: spin 1s linear infinite; }
          .mb-0 { margin-bottom: 0 !important; }
          .last-updated { font-size: 0.7rem; color: var(--text-muted); margin-top: 0.5rem; }

          .overview-card { margin-bottom: 2rem; }
          .overview-card h3 { margin-bottom: 1.5rem; font-size: 1.2rem; }
          .chart-container { height: 300px; width: 100%; }
          
          .section-heading { font-size: 1.2rem; color: var(--text-primary); }
          .stocks-list { display: flex; flex-direction: column; gap: 1.5rem; }
          .stock-card { display: flex; flex-direction: column; gap: 1.5rem; position: relative; overflow: hidden; }
          @media (min-width: 768px) { .stock-card { flex-direction: row; } }
          .indicator-bar { position: absolute; top: 0; left: 0; width: 4px; height: 100%; }
          .indicator-bar.gain { background: var(--color-emerald); }
          .indicator-bar.loss { background: var(--color-coral); }
          .indicator-bar.neutral { background: var(--text-muted); }
          
          .stock-content { flex: 1; padding-left: 0.5rem; }
          .stock-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
          .delete-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; transition: color 0.2s; }
          .delete-btn:hover { color: var(--color-coral); }
          
          .metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
          @media (min-width: 1024px) { .metrics-grid { grid-template-columns: repeat(4, 1fr); } }
          .metric-label { font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.3rem; }
          .metric-val { font-size: 1.1rem; font-weight: 600; color: var(--text-primary); }
          .metric-val.not-set { color: var(--text-muted); font-style: italic; font-weight: 400; }
          .metric-sub { font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem; }
          .flex-val { display: flex; align-items: center; gap: 4px; }
          .text-gain { color: var(--color-emerald) !important; }
          .text-loss { color: var(--color-coral) !important; }
          .sub-label { font-weight: 400; font-size: 0.7rem; color: var(--text-muted); }
          .flex { display: flex; }
          .items-center { align-items: center; }
          .gap-4 { gap: 1rem; }
          .mb-4 { margin-bottom: 1rem; }
          .mb-8 { margin-bottom: 2rem; }
          .mt-8 { margin-top: 2rem; }
        `}</style>
      </div>
    );
  }

  // MAIN PAGE VIEW (No symbol selected)
  return (
    <div className="stock-gains-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock Gains</h1>
          <p className="page-subtitle">Track the performance of your stock investments.</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="add-btn"
        >
          <Plus size={18} /> Add Stock
        </button>
      </div>

      {error && (
        <div className="error-banner glass-card">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {showAddForm && renderAddForm()}

      {uniqueSymbols.length > 0 ? (
        <div className="symbols-grid">
          {uniqueSymbols.map(sym => {
            const symStocks = groupedStocks[sym];
            let cost = 0;
            let val = 0;
            symStocks.forEach(s => {
              const m = calculateMetrics(s);
              cost += s.totalCost;
              if (m.currentTotalValue) val += m.currentTotalValue;
            });
            const gain = val > 0 ? val - cost : 0;
            const isGain = gain >= 0;

            return (
              <div key={sym} className="symbol-pill glass-card" onClick={() => setSelectedSymbol(sym)}>
                <div className={`indicator-bar ${val > 0 ? (isGain ? 'gain' : 'loss') : 'neutral'}`}></div>
                <div className="pill-content">
                  <h3>{sym}</h3>
                  <div className="pill-metrics">
                    <p className="pill-cost">Rs. {cost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                    <p className={`pill-gain ${val > 0 ? (isGain ? 'text-gain' : 'text-loss') : 'text-neutral'}`}>
                      {val > 0 ? (isGain ? '+' : '') : ''}{val > 0 ? gain.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '-'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state glass-card">
          <TrendingUp className="empty-icon" size={48} />
          <p>No stocks added yet. Add one to start tracking gains!</p>
        </div>
      )}

      <style jsx>{`
        .stock-gains-page { max-width: 1200px; margin: 0 auto; padding-bottom: 4rem; }
        .page-header { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2rem; }
        @media (min-width: 640px) { .page-header { flex-direction: row; justify-content: space-between; align-items: center; } }
        .add-btn { display: flex; align-items: center; gap: 8px; background: linear-gradient(135deg, var(--color-teal) 0%, var(--color-emerald) 100%); color: #000; border: none; padding: 0.6rem 1.25rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; }
        .add-btn:hover { transform: translateY(-2px); box-shadow: var(--glow-emerald); }
        .close-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 0.85rem; }
        .close-btn:hover { color: var(--text-primary); }
        .error-banner { display: flex; align-items: center; gap: 10px; color: var(--color-coral); border-color: rgba(248, 113, 113, 0.3); margin-bottom: 2rem; }
        
        .form-card { margin-bottom: 2rem; }
        .form-card h3 { margin-bottom: 1.5rem; font-size: 1.2rem; }
        .stock-form { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
        @media (min-width: 640px) { .stock-form { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) { .stock-form { grid-template-columns: repeat(4, 1fr); } }
        .form-group label { display: block; margin-bottom: 0.5rem; font-size: 0.85rem; color: var(--text-secondary); }
        .form-actions { grid-column: 1 / -1; display: flex; justify-content: flex-end; margin-top: 1rem; }
        .save-btn { background: rgba(0, 242, 254, 0.15); color: var(--color-teal); border: 1px solid rgba(0, 242, 254, 0.3); padding: 0.6rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; }
        .save-btn:hover:not(:disabled) { background: rgba(0, 242, 254, 0.25); }
        .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .symbols-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1.5rem; }
        .symbol-pill { position: relative; overflow: hidden; cursor: pointer; padding: 1.5rem; transition: all 0.2s; }
        .symbol-pill:hover { transform: translateY(-4px); border-color: rgba(0,242,254,0.3); }
        .indicator-bar { position: absolute; top: 0; left: 0; width: 4px; height: 100%; }
        .indicator-bar.gain { background: var(--color-emerald); }
        .indicator-bar.loss { background: var(--color-coral); }
        .indicator-bar.neutral { background: var(--text-muted); }
        .pill-content { padding-left: 0.5rem; }
        .pill-content h3 { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.75rem; }
        .pill-metrics { display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; }
        .pill-cost { color: var(--text-secondary); }
        .pill-gain { font-weight: 600; }
        .text-gain { color: var(--color-emerald); }
        .text-loss { color: var(--color-coral); }
        .text-neutral { color: var(--text-muted); }
        
        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 2rem; text-align: center; color: var(--text-muted); }
        .empty-icon { color: var(--text-secondary); margin-bottom: 1rem; opacity: 0.5; }
        
        .flex { display: flex; }
        .justify-between { justify-content: space-between; }
        .items-center { align-items: center; }
        .mb-4 { margin-bottom: 1rem; }
      `}</style>
    </div>
  );
}
