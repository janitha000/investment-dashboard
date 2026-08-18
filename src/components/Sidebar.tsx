"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRates } from "@/context/RatesContext";
import RatesEditor from "./RatesEditor";
import {
  TrendingUp,
  Home,
  Menu,
  X,
  Sliders,
  Briefcase,
  FlaskConical,
  Target,
  Layers,
  History,
  Flame,
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
    { name: "Income Target", href: "/target", icon: Target },
    { name: "History", href: "/history", icon: History },
    { name: "FIRE Analysis", href: "/fire", icon: Flame },
    { name: "Investment Instruments", href: "/instruments", icon: Layers },
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

  const isActiveHref = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      <header className="mobile-header">
        <div className="mobile-logo">
          <TrendingUp className="logo-icon" />
          <span>Investment Dashboard</span>
        </div>
        <button className="menu-toggle" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      <aside className={`sidebar-container ${isOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-logo">
          <TrendingUp className="logo-icon" />
          <h2>Investment Dashboard</h2>
        </div>

        <nav className="sidebar-nav">
          <ul>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveHref(item.href);
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

        <div className="rates-status-box">
          <div className="rates-status-header">
            <span className="rates-status-title">Market Rates</span>
            <span className={`status-pill ${isCustom ? "custom" : "live"}`}>
              {isCustom ? "Custom" : "Live"}
            </span>
          </div>

          <div className="rates-status-info">
            <p className="source-label">
              Source:{" "}
              <span className="source-val">
                {dataSource === "cbsl_scraped"
                  ? "CBSL Scraped"
                  : dataSource === "fallback"
                    ? "System Default"
                    : "Manual Custom"}
              </span>
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

      {isOpen && <div className="sidebar-backdrop" onClick={() => setIsOpen(false)} />}

      {showEditor && <RatesEditor onClose={() => setShowEditor(false)} />}
    </>
  );
}
