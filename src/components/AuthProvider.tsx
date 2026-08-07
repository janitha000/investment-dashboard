"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Lock, LogOut } from "lucide-react";

type AuthContextValue = {
  authenticated: boolean;
  loading: boolean;
  login: (pin: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setAuthenticated(Boolean(data.authenticated));
    } catch {
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (pinValue: string) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid PIN");
      setAuthenticated(true);
      setPin("");
    } catch (e) {
      setAuthenticated(false);
      setError(e instanceof Error ? e.message : "Login failed");
      throw e;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthenticated(false);
  }, []);

  if (loading) {
    return (
      <div className="auth-gate-loading">
        <span>Loading…</span>
        <style jsx>{`
          .auth-gate-loading {
            min-height: 60vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-muted);
            font-size: 0.9rem;
          }
        `}</style>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="auth-gate">
        <div className="auth-card glass-card">
          <div className="auth-icon">
            <Lock size={22} />
          </div>
          <h1>Enter PIN</h1>
          <p>Single-user access for your investment dashboard.</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await login(pin);
              } catch {
                /* error shown */
              }
            }}
          >
            <input
              className="glass-input auth-pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              placeholder="PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoFocus
            />
            {error && <div className="auth-error">{error}</div>}
            <button className="auth-submit" type="submit" disabled={submitting || !pin}>
              {submitting ? "Checking…" : "Unlock"}
            </button>
          </form>
        </div>
        <style jsx>{`
          .auth-gate {
            min-height: 70vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
          }
          .auth-card {
            width: 100%;
            max-width: 380px;
            padding: 1.75rem;
            text-align: center;
          }
          .auth-icon {
            width: 48px;
            height: 48px;
            margin: 0 auto 1rem;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 242, 254, 0.1);
            color: var(--color-teal);
            border: 1px solid rgba(0, 242, 254, 0.25);
          }
          h1 {
            margin: 0 0 0.35rem;
            font-size: 1.35rem;
            color: var(--text-primary);
          }
          p {
            margin: 0 0 1.25rem;
            font-size: 0.82rem;
            color: var(--text-muted);
          }
          .auth-pin {
            width: 100%;
            text-align: center;
            letter-spacing: 0.35em;
            font-size: 1.1rem;
            margin-bottom: 0.75rem;
          }
          .auth-error {
            color: #f87171;
            font-size: 0.78rem;
            font-weight: 600;
            margin-bottom: 0.75rem;
          }
          .auth-submit {
            width: 100%;
            border: none;
            border-radius: 8px;
            padding: 0.7rem 1rem;
            font-weight: 700;
            cursor: pointer;
            background: linear-gradient(135deg, var(--color-teal) 0%, var(--color-indigo) 100%);
            color: #04060c;
          }
          .auth-submit:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        `}</style>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ authenticated, loading, login, logout, refresh }}>
      <div className="auth-shell">
        <button type="button" className="auth-logout" onClick={() => logout()} title="Log out">
          <LogOut size={14} />
          Lock
        </button>
        {children}
      </div>
      <style jsx>{`
        .auth-shell {
          position: relative;
        }
        .auth-logout {
          position: fixed;
          top: 14px;
          right: 18px;
          z-index: 50;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: rgba(9, 14, 26, 0.85);
          color: var(--text-secondary);
          font-size: 0.72rem;
          font-weight: 700;
          cursor: pointer;
        }
        .auth-logout:hover {
          color: var(--text-primary);
          border-color: rgba(248, 113, 113, 0.4);
        }
      `}</style>
    </AuthContext.Provider>
  );
}
