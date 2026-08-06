"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface Rates {
  treasury: {
    tb3m: number;
    tb6m: number;
    tb12m: number;
    tbills?: {
      "91-day": number;
      "182-day": number;
      "364-day": number;
    };
    tbonds?: {
      "2-year": number;
      "3-year": number;
      "5-year": number;
      "10-year": number;
      "15-year": number;
      "20-year": number;
    };
  };
  fixedDeposit: {
    bankAverage1m: number;
    bankAverage12m: number;
    financeAverage12m: number;
    institutions?: Record<string, Record<string, { monthly: number; quarterly: number | null; maturity: number }>>;
  };
  unitTrust: {
    moneyMarketYield: number;
    giltEdgedYield: number;
    funds?: Record<string, number>;
  };
  cse: {
    averageDividendYield: number;
  };
  realEstate: {
    residentialYield: number;
    commercialYield: number;
  };
  corporateDebenture: {
    averageYield: number;
  };
  pfcaFd: {
    usdYield12m: number;
  };
}

interface RatesContextType {
  rates: Rates;
  liveRates: Rates | null;
  customRates: Rates;
  isCustom: boolean;
  isLoading: boolean;
  lastUpdated: string | null;
  dataSource: string;
  updateCustomRates: (updater: (prev: Rates) => Rates) => void;
  toggleCustomMode: (useCustom: boolean) => void;
  resetCustomRates: () => void;
  fetchRatesViaGemini: (key: string) => Promise<{ success: boolean; message: string }>;
}

const DEFAULT_RATES: Rates = {
  treasury: { tb3m: 9.86, tb6m: 10.21, tb12m: 10.20 },
  fixedDeposit: { bankAverage1m: 7.50, bankAverage12m: 9.25, financeAverage12m: 11.50 },
  unitTrust: { moneyMarketYield: 10.85, giltEdgedYield: 9.90 },
  cse: { averageDividendYield: 5.40 },
  realEstate: { residentialYield: 4.80, commercialYield: 7.20 },
  corporateDebenture: { averageYield: 11.50 },
  pfcaFd: { usdYield12m: 4.25 },
};

const RatesContext = createContext<RatesContextType | undefined>(undefined);

export function RatesProvider({ children }: { children: React.ReactNode }) {
  const [liveRates, setLiveRates] = useState<Rates | null>(null);
  const [customRates, setCustomRates] = useState<Rates>(DEFAULT_RATES);
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>("default");

  useEffect(() => {
    // 1. Fetch live rates from the API
    async function fetchRates() {
      try {
        const response = await fetch("/api/rates");
        if (response.ok) {
          const data = await response.json();
          setLiveRates(data.rates);
          setLastUpdated(data.updatedAt);
          setDataSource(data.source);
          
          // Seed custom rates with live rates if no storage exists
          const savedCustom = localStorage.getItem("lankawealth_custom_rates");
          if (!savedCustom) {
            setCustomRates(data.rates);
          }
        } else {
          setDataSource("failed");
        }
      } catch (error) {
        console.error("Failed to fetch rates:", error);
        setDataSource("failed");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRates();

    // 2. Load custom rates and toggle state from localStorage
    const savedCustom = localStorage.getItem("lankawealth_custom_rates");
    if (savedCustom) {
      try {
        setCustomRates(JSON.parse(savedCustom));
      } catch (e) {
        console.error(e);
      }
    }

    const savedMode = localStorage.getItem("lankawealth_is_custom");
    if (savedMode) {
      setIsCustom(savedMode === "true");
    }
  }, []);

  const updateCustomRates = (updater: (prev: Rates) => Rates) => {
    setCustomRates((prev) => {
      const next = updater(prev);
      localStorage.setItem("lankawealth_custom_rates", JSON.stringify(next));
      return next;
    });
  };

  const toggleCustomMode = (useCustom: boolean) => {
    setIsCustom(useCustom);
    localStorage.setItem("lankawealth_is_custom", String(useCustom));
  };

  const resetCustomRates = () => {
    const base = liveRates || DEFAULT_RATES;
    setCustomRates(base);
    localStorage.setItem("lankawealth_custom_rates", JSON.stringify(base));
  };

  const fetchRatesViaGemini = async (key: string) => {
    // Save key immediately in localStorage so it persists even if the sync fails
    localStorage.setItem("lankawealth_gemini_key", key);
    try {
      const response = await fetch("/api/rates/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gemini-key": key
        }
      });
      const data = await response.json();
      if (response.ok && data.status === "success") {
        // Save key in localStorage
        localStorage.setItem("lankawealth_gemini_key", key);
        
        // Merge the AI parsed rates into liveRates
        setLiveRates((prev) => {
          const base = prev || DEFAULT_RATES;
          return {
            ...base,
            fixedDeposit: {
              ...base.fixedDeposit,
              institutions: data.rates.fixedDeposit || {}
            },
            unitTrust: {
              ...base.unitTrust,
              moneyMarketYield: data.rates.unitTrust?.["CAL Money Market Fund"] || base.unitTrust.moneyMarketYield,
              giltEdgedYield: data.rates.unitTrust?.["CAL Gilt Edged Fund"] || base.unitTrust.giltEdgedYield,
              funds: data.rates.unitTrust || {}
            },
            treasury: {
              ...base.treasury,
              tb3m: data.rates.treasury?.tbills?.["91-day"] || base.treasury.tb3m,
              tb6m: data.rates.treasury?.tbills?.["182-day"] || base.treasury.tb6m,
              tb12m: data.rates.treasury?.tbills?.["364-day"] || base.treasury.tb12m,
              tbills: data.rates.treasury?.tbills || {
                "91-day": base.treasury.tb3m,
                "182-day": base.treasury.tb6m,
                "364-day": base.treasury.tb12m
              },
              tbonds: data.rates.treasury?.tbonds || {
                "2-year": 10.50,
                "3-year": 11.20,
                "5-year": 11.80,
                "10-year": 12.25,
                "15-year": 12.50,
                "20-year": 12.80
              }
            }
          };
        });
        
        setLastUpdated(data.updatedAt);
        setDataSource("gemini_ai");
        setIsCustom(false); // Toggle off manual overrides to show the synced rates
        localStorage.setItem("lankawealth_is_custom", "false");
        
        return { success: true, message: "Rates successfully synced via Gemini AI!" };
      } else {
        return { success: false, message: data.message || "Failed to parse rates using Gemini AI." };
      }
    } catch (e: any) {
      console.error(e);
      return { success: false, message: e.message || "Network error. Please try again." };
    }
  };

  const activeRates = isCustom ? customRates : (liveRates || DEFAULT_RATES);

  return (
    <RatesContext.Provider
      value={{
        rates: activeRates,
        liveRates,
        customRates,
        isCustom,
        isLoading,
        lastUpdated,
        dataSource: isCustom ? "custom" : dataSource,
        updateCustomRates,
        toggleCustomMode,
        resetCustomRates,
        fetchRatesViaGemini,
      }}
    >
      {children}
    </RatesContext.Provider>
  );
}

export function useRates() {
  const context = useContext(RatesContext);
  if (!context) {
    throw new Error("useRates must be used within a RatesProvider");
  }
  return context;
}
