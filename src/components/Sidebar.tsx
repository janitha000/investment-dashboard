"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRates } from "@/context/RatesContext";
import RatesEditor from "./RatesEditor";
import {
  TrendingUp,
  Wallet,
  Landmark,
  Compass,
  LineChart,
  Home,
  Menu,
  X,
  Sliders,
  Settings,
  Briefcase,
  Coins,
  Globe,
  FlaskConical
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const { isCustom, lastUpdated, dataSource } = useRates();
  const [isOpen, setIsOpen] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  const menuItems = [
    { name: "Overview Dashboard", href: "/", icon: Home },
    { name: "My Portfolio", href: "/portfolio", icon: Briefcase },
    { name: "What-If Scenarios", href: "/scenarios", icon: FlaskConical },
    { name: "Fixed Deposits", href: "/fixed-deposits", icon: Landmark },
    { name: "Unit Trusts", href: "/unit-trusts", icon: Compass },
    { name: "Treasury Securities", href: "/treasury", icon: Wallet },
    { name: "Corporate Debentures", href: "/corporate-debentures", icon: Coins },
    { name: "Stock Market (CSE)", href: "/stock-market", icon: LineChart },
    { name: "Real Estate", href: "/real-estate", icon: Home },
    { name: "PFCA FD (USD)", href: "/pfca-fds", icon: Globe },
  ];

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-LK", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      {/* Mobile Header Bar */}
      <header className="mobile-header">
        <div className="mobile-logo">
          <TrendingUp className="logo-icon" />
          <span>Investment Dashboard</span>
        </div>
        <button className="menu-toggle" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar Sidebar */}
      <aside className={`sidebar-container ${isOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-logo">
          <TrendingUp className="logo-icon" />
          <h2>Investment Dashboard</h2>
        </div>

        <nav className="sidebar-nav">
          <ul>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`nav-link ${isActive ? "active" : ""}`}
                    onClick={() => setIsOpen(false)}
                  >
                    <Icon className="nav-icon" size={18} />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Market Rates Status Box */}
        <div className="rates-status-box">
          <div className="rates-status-header">
            <span className="rates-status-title">Market Rates</span>
            <span className={`status-pill ${isCustom ? "custom" : "live"}`}>
              {isCustom ? "Custom" : "Live"}
            </span>
          </div>
          
          <div className="rates-status-info">
            <p className="source-label">
              Source: <span className="source-val">{dataSource === "cbsl_scraped" ? "CBSL Scraped" : dataSource === "fallback" ? "System Default" : "Manual Custom"}</span>
            </p>
            {!isCustom && lastUpdated && (
              <p className="update-label">
                Refreshed: <span>{formatDate(lastUpdated)}</span>
              </p>
            )}
          </div>

          <button className="configure-btn" onClick={() => setShowEditor(true)}>
            <Sliders size={14} style={{ marginRight: "6px" }} />
            Configure Rates
          </button>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {isOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsOpen(false)} />
      )}

      {/* Rates Customizer Modal */}
      {showEditor && <RatesEditor onClose={() => setShowEditor(false)} />}
    </>
  );
}
