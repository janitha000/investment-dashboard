"use client";

import React, { Suspense, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Landmark,
  Compass,
  Wallet,
  Coins,
  LineChart,
  Home,
  Globe,
} from "lucide-react";

const FixedDepositsPanel = dynamic(() => import("@/components/instruments/FixedDepositsPanel"), {
  loading: () => <PanelLoading />,
});
const UnitTrustsPanel = dynamic(() => import("@/components/instruments/UnitTrustsPanel"), {
  loading: () => <PanelLoading />,
});
const TreasuryPanel = dynamic(() => import("@/components/instruments/TreasuryPanel"), {
  loading: () => <PanelLoading />,
});
const CorporateDebenturesPanel = dynamic(
  () => import("@/components/instruments/CorporateDebenturesPanel"),
  { loading: () => <PanelLoading /> }
);
const StockMarketPanel = dynamic(() => import("@/components/instruments/StockMarketPanel"), {
  loading: () => <PanelLoading />,
});
const RealEstatePanel = dynamic(() => import("@/components/instruments/RealEstatePanel"), {
  loading: () => <PanelLoading />,
});
const PfcaFdsPanel = dynamic(() => import("@/components/instruments/PfcaFdsPanel"), {
  loading: () => <PanelLoading />,
});

export const INSTRUMENT_TABS = [
  { id: "fixed-deposits", label: "Fixed Deposits", icon: Landmark },
  { id: "unit-trusts", label: "Unit Trusts", icon: Compass },
  { id: "treasury", label: "Treasury", icon: Wallet },
  { id: "corporate-debentures", label: "Debentures", icon: Coins },
  { id: "stock-market", label: "Stock Market", icon: LineChart },
  { id: "real-estate", label: "Real Estate", icon: Home },
  { id: "pfca-fds", label: "PFCA FD", icon: Globe },
] as const;

export type InstrumentTabId = (typeof INSTRUMENT_TABS)[number]["id"];

function isInstrumentTab(id: string | null): id is InstrumentTabId {
  return INSTRUMENT_TABS.some((t) => t.id === id);
}

function PanelLoading() {
  return <div className="instruments-panel-loading">Loading instrument…</div>;
}

function InstrumentsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get("tab");
  const activeTab: InstrumentTabId = isInstrumentTab(raw) ? raw : "fixed-deposits";

  const setTab = useCallback(
    (id: InstrumentTabId) => {
      router.replace(`/instruments?tab=${id}`, { scroll: false });
    },
    [router]
  );

  const ActivePanel = useMemo(() => {
    switch (activeTab) {
      case "fixed-deposits":
        return FixedDepositsPanel;
      case "unit-trusts":
        return UnitTrustsPanel;
      case "treasury":
        return TreasuryPanel;
      case "corporate-debentures":
        return CorporateDebenturesPanel;
      case "stock-market":
        return StockMarketPanel;
      case "real-estate":
        return RealEstatePanel;
      case "pfca-fds":
        return PfcaFdsPanel;
      default:
        return FixedDepositsPanel;
    }
  }, [activeTab]);

  return (
    <div className="animate-fade-in text-sans-layout instruments-page">
      <div className="page-header-container">
        <span className="badge badge-teal">Explorers</span>
        <h1 className="page-title">Investment Instruments</h1>
        <p className="page-subtitle">
          Model yields and tax treatment across Sri Lankan fixed income, equities, property, and
          foreign-currency deposits — switch tabs without leaving this page.
        </p>
      </div>

      <div className="instruments-tabs-shell">
        <div className="instruments-tabs-row" role="tablist" aria-label="Investment instruments">
          {INSTRUMENT_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`instruments-tab ${active ? "active" : ""}`}
                onClick={() => setTab(tab.id)}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="instruments-panel" role="tabpanel">
        <ActivePanel />
      </div>

      <style jsx>{`
        .instruments-page {
          width: 100%;
        }

        .instruments-tabs-shell {
          margin-bottom: 1.25rem;
        }

        .instruments-tabs-row {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          padding: 4px;
          border-radius: 12px;
          border: 1px solid var(--border-color);
          background: rgba(255, 255, 255, 0.02);
          width: 100%;
          box-sizing: border-box;
        }

        .instruments-tab {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0.55rem 0.85rem;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: var(--text-secondary);
          font-family: var(--font-body);
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .instruments-tab:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.04);
        }

        .instruments-tab.active {
          color: #04060c;
          background: linear-gradient(135deg, var(--color-teal) 0%, var(--color-indigo) 100%);
        }

        .instruments-panel {
          width: 100%;
        }

        .instruments-panel :global(.page-header-container) {
          display: none;
        }

        .instruments-panel :global(.animate-fade-in) {
          animation: none;
        }

        :global(.instruments-panel-loading) {
          padding: 2.5rem 0;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.88rem;
          font-weight: 600;
        }

        @media (max-width: 720px) {
          .instruments-tab {
            flex: 1 1 auto;
            justify-content: center;
            font-size: 0.7rem;
            padding: 0.5rem 0.65rem;
          }
        }
      `}</style>
    </div>
  );
}

export default function InstrumentsPage() {
  return (
    <Suspense
      fallback={
        <div className="animate-fade-in text-sans-layout" style={{ padding: "2rem 0", color: "var(--text-muted)" }}>
          Loading instruments…
        </div>
      }
    >
      <InstrumentsInner />
    </Suspense>
  );
}
