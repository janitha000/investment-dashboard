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
      if (!d.stocks) {
        d.stocks = [];
      }
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

  const handleAddStock = () => {
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

  const handleUpdatePrice = (id: string) => {
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
      <div className="flex h-screen items-center justify-center">
        <RefreshCw className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  const stocks = data?.stocks || [];
  
  // Prepare chart data
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
    <div className="p-6 max-w-6xl mx-auto pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Stock Gains</h1>
          <p className="text-gray-500 mt-1">Track the performance of your stock investments.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
        >
          {showAddForm ? <AlertCircle size={18} /> : <Plus size={18} />}
          {showAddForm ? "Cancel" : "Add Stock"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6 border border-red-200 flex items-center gap-2">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Add New Stock</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Symbol / Name</label>
              <input
                type="text"
                placeholder="e.g. JKH.N0000"
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Buy Date</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={newBuyDate}
                onChange={(e) => setNewBuyDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Buy Price (Per Share)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={newBuyPrice}
                onChange={(e) => setNewBuyPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Cost (Investment)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={newTotalCost}
                onChange={(e) => setNewTotalCost(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleAddStock}
              disabled={saving || !newSymbol || !newBuyDate || !newBuyPrice || !newTotalCost}
              className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Stock"}
            </button>
          </div>
        </div>
      )}

      {stocks.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Portfolio Overview</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="symbol" tick={{ fill: '#6b7280' }} axisLine={{ stroke: '#d1d5db' }} />
                <YAxis tick={{ fill: '#6b7280' }} axisLine={{ stroke: '#d1d5db' }} tickFormatter={(val) => `${(val / 1000)}k`} />
                <Tooltip
                  formatter={(value: any) => `Rs. ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Bar dataKey="cost" name="Total Cost" fill="#9ca3af" radius={[4, 4, 0, 0]} />
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

      <div className="space-y-4">
        {stocks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-100 shadow-sm">
            <TrendingUp className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500">No stocks added yet. Add one to start tracking gains!</p>
          </div>
        ) : (
          stocks.map((stock) => {
            const metrics = calculateMetrics(stock);
            
            return (
              <div key={stock.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${metrics.gainPercent !== null ? (metrics.gainPercent >= 0 ? 'bg-green-500' : 'bg-red-500') : 'bg-gray-300'}`}></div>
                
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{stock.symbol}</h3>
                      <p className="text-sm text-gray-500">Bought on {new Date(stock.buyDate).toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteStock(stock.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete stock"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Cost Basis</p>
                      <p className="font-semibold text-gray-800">Rs. {stock.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p className="text-xs text-gray-400">{metrics.quantity.toFixed(2)} shares @ Rs. {stock.buyPrice}</p>
                    </div>
                    
                    <div>
                      <p className="text-gray-500">Current Value</p>
                      {metrics.currentTotalValue !== null ? (
                        <p className="font-semibold text-gray-800">Rs. {metrics.currentTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      ) : (
                        <p className="text-gray-400 italic">Not set</p>
                      )}
                      
                      {stock.currentPrice !== undefined && (
                        <p className="text-xs text-gray-400">@ Rs. {stock.currentPrice} / share</p>
                      )}
                    </div>

                    <div>
                      <p className="text-gray-500">Gain/Loss</p>
                      {metrics.gainAmount !== null ? (
                        <p className={`font-semibold flex items-center gap-1 ${metrics.gainAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {metrics.gainAmount >= 0 ? '+' : ''}{metrics.gainAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          {metrics.gainAmount >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        </p>
                      ) : (
                        <p className="text-gray-400">-</p>
                      )}
                    </div>

                    <div>
                      <p className="text-gray-500">Returns</p>
                      {metrics.gainPercent !== null && metrics.annualized !== null ? (
                        <div>
                          <p className={`font-semibold ${metrics.gainPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {metrics.gainPercent > 0 ? '+' : ''}{metrics.gainPercent.toFixed(2)}% <span className="text-xs font-normal text-gray-500 ml-1">Total</span>
                          </p>
                          <p className={`font-medium text-xs mt-0.5 ${metrics.annualized >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {metrics.annualized > 0 ? '+' : ''}{metrics.annualized.toFixed(2)}% <span className="font-normal text-gray-500 ml-1">Annualized</span>
                          </p>
                        </div>
                      ) : (
                        <p className="text-gray-400">-</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-64 bg-gray-50 rounded-md p-4 border border-gray-100 flex flex-col justify-center">
                  <p className="text-sm font-medium text-gray-700 mb-2">Update Current Price</p>
                  
                  {editPriceId === stock.id ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.01"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Current Price"
                          value={editPriceVal}
                          onChange={(e) => setEditPriceVal(e.target.value)}
                        />
                        <button
                          onClick={() => handleUpdatePrice(stock.id)}
                          disabled={saving}
                          className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
                        >
                          Save
                        </button>
                      </div>
                      <button
                        onClick={() => setEditPriceId(null)}
                        className="text-xs text-gray-500 hover:text-gray-700 w-full text-left"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div>
                      <button
                        onClick={() => {
                          setEditPriceId(stock.id);
                          setEditPriceVal(stock.currentPrice !== undefined ? String(stock.currentPrice) : "");
                        }}
                        className="w-full bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-50 transition-colors"
                      >
                        {stock.currentPrice !== undefined ? "Update Price" : "Set Current Price"}
                      </button>
                      {stock.lastUpdated && (
                        <p className="text-xs text-gray-400 mt-2 text-center">
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
    </div>
  );
}
