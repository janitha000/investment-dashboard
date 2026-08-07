import type { Metadata } from "next";
import { RatesProvider } from "@/context/RatesContext";
import { AuthProvider } from "@/components/AuthProvider";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Investment Dashboard | Sri Lankan Passive Income & Wealth",
  description: "Identify, simulate, and track passive income investment opportunities in Sri Lanka. Dynamic rates updated daily from Central Bank of Sri Lanka (CBSL).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <RatesProvider>
          <div className="dashboard-container">
            <Sidebar />
            <main className="main-content">
              <AuthProvider>{children}</AuthProvider>
            </main>
          </div>
        </RatesProvider>
      </body>
    </html>
  );
}
