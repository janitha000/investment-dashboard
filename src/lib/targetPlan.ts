import type { CategoryCapitalPlan, TargetPlan } from "@/lib/db";

export type TargetMetrics = {
  netMonthlyWht: number;
  netMonthlyIit: number;
  physicalCashMonthly: number;
  monthsToTarget: number;
};

export type CurrentMetrics = {
  netMonthlyWht: number;
  netMonthlyIit: number;
  physicalCashMonthly: number;
  investedByCategory: CategoryCapitalPlan;
  invested: number;
};

/** Approximate net-of-WHT monthly yield by category (conservative SL defaults). */
const CATEGORY_MONTHLY_YIELD: CategoryCapitalPlan = {
  fds: 0.09 * 0.9 / 12, // ~9% gross, 10% WHT
  uts: 0.105 / 12, // quoted net
  treasury: 0.10 / 12, // no WHT in our model
  dividends: 0.045 / 12,
  pfcaFds: (0.05 * 1.05) / 12, // USD interest + capital gain on that interest
};

const CATEGORY_ORDER: (keyof CategoryCapitalPlan)[] = [
  "uts",
  "fds",
  "treasury",
  "dividends",
  "pfcaFds",
];

/**
 * Deterministic fallback when Gemini is unavailable.
 * Allocates extra capital toward the largest monthly gap (physical cash ≈ spendable),
 * preferring liquid/high-yield categories first.
 */
export function buildHeuristicPlan(
  current: CurrentMetrics,
  target: TargetMetrics
): TargetPlan {
  const gapWht = Math.max(0, target.netMonthlyWht - current.netMonthlyWht);
  const gapIit = Math.max(0, target.netMonthlyIit - current.netMonthlyIit);
  const gapCash = Math.max(0, target.physicalCashMonthly - current.physicalCashMonthly);
  const primaryGap = Math.max(gapCash, gapWht, gapIit);
  const months = Math.max(1, target.monthsToTarget);

  // Capital needed ≈ gap / blended monthly yield (~0.75%/mo ≈ 9% p.a. net)
  const blendedYield = 0.0075;
  const totalCapitalNeeded = primaryGap > 0 ? primaryGap / blendedYield : 0;
  const monthlyContributionNeeded = totalCapitalNeeded / months;

  // Weight toward categories that help physical cash + WHT, with some IIT-efficient mix
  const weights: CategoryCapitalPlan = {
    uts: 0.32,
    fds: 0.28,
    treasury: 0.18,
    dividends: 0.12,
    pfcaFds: 0.10,
  };

  const additionalCapitalByCategory: CategoryCapitalPlan = {
    fds: Math.round(totalCapitalNeeded * weights.fds),
    uts: Math.round(totalCapitalNeeded * weights.uts),
    treasury: Math.round(totalCapitalNeeded * weights.treasury),
    dividends: Math.round(totalCapitalNeeded * weights.dividends),
    pfcaFds: Math.round(totalCapitalNeeded * weights.pfcaFds),
  };

  const liftWht =
    additionalCapitalByCategory.fds * CATEGORY_MONTHLY_YIELD.fds +
    additionalCapitalByCategory.uts * CATEGORY_MONTHLY_YIELD.uts +
    additionalCapitalByCategory.treasury * CATEGORY_MONTHLY_YIELD.treasury +
    additionalCapitalByCategory.dividends * CATEGORY_MONTHLY_YIELD.dividends +
    additionalCapitalByCategory.pfcaFds * CATEGORY_MONTHLY_YIELD.pfcaFds;

  const steps: string[] = [
    primaryGap <= 0
      ? "Targets are already met on the latest snapshot — maintain allocations and reinvest maturities."
      : `Close a ~LKR ${Math.round(primaryGap).toLocaleString("en-LK")} monthly income gap over ${months} months.`,
    `Deploy about LKR ${Math.round(monthlyContributionNeeded).toLocaleString("en-LK")} of new capital each month (or lump-sum equivalent).`,
    `Prefer Unit Trusts (~${Math.round(weights.uts * 100)}%) and FDs (~${Math.round(weights.fds * 100)}%) for cash yield; keep Treasury for sovereign ballast.`,
    "Remember: only LKR FDs withhold 10% WHT (IIT credit). UT/Treasury/dividends/PFCA do not add personal WHT credit.",
    "Re-save a portfolio snapshot after each material deployment so progress bars stay accurate.",
  ];

  const assumptions = [
    "Uses latest snapshot totals as the current baseline.",
    "Assumes ~9% p.a. blended net yield for capital sizing.",
    "PFCA contribution counts interest only toward Physical Cash Available.",
    "Progressive IIT still pools FD + UT + Treasury; dividends/PFCA remain outside the IIT pool.",
  ];

  return {
    generatedAt: new Date().toISOString(),
    source: "heuristic",
    summary:
      primaryGap <= 0
        ? "You are already at or above the selected monthly targets on the latest snapshot."
        : `To reach your targets in ${months} months, add roughly LKR ${Math.round(totalCapitalNeeded).toLocaleString("en-LK")} of productive capital (~LKR ${Math.round(monthlyContributionNeeded).toLocaleString("en-LK")}/mo), tilted toward UTs and FDs for spendable cash.`,
    steps,
    assumptions,
    monthlyContributionNeeded: Math.round(monthlyContributionNeeded),
    additionalCapitalByCategory,
    expectedMonthlyLift: {
      netWht: Math.round(liftWht),
      netIit: Math.round(liftWht * 0.92),
      physicalCash: Math.round(liftWht),
    },
  };
}

export function normalizeCategoryCapital(raw: unknown): CategoryCapitalPlan {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const n = (k: string) => Math.max(0, Math.round(Number(r[k]) || 0));
  return {
    fds: n("fds"),
    uts: n("uts"),
    treasury: n("treasury"),
    dividends: n("dividends"),
    pfcaFds: n("pfcaFds"),
  };
}

export function parseGeminiPlan(
  parsed: Record<string, unknown>,
  fallback: TargetPlan
): TargetPlan {
  const steps = Array.isArray(parsed.steps)
    ? parsed.steps.map(String).filter(Boolean)
    : fallback.steps;
  const assumptions = Array.isArray(parsed.assumptions)
    ? parsed.assumptions.map(String).filter(Boolean)
    : fallback.assumptions;
  const capital = normalizeCategoryCapital(parsed.additionalCapitalByCategory);
  const hasCapital = CATEGORY_ORDER.some((k) => capital[k] > 0);

  const liftRaw = (parsed.expectedMonthlyLift || {}) as Record<string, unknown>;
  return {
    generatedAt: new Date().toISOString(),
    source: "gemini",
    summary: String(parsed.summary || fallback.summary),
    steps: steps.length ? steps : fallback.steps,
    assumptions: assumptions.length ? assumptions : fallback.assumptions,
    monthlyContributionNeeded: Math.max(
      0,
      Math.round(Number(parsed.monthlyContributionNeeded) || fallback.monthlyContributionNeeded)
    ),
    additionalCapitalByCategory: hasCapital ? capital : fallback.additionalCapitalByCategory,
    expectedMonthlyLift: {
      netWht: Math.max(0, Math.round(Number(liftRaw.netWht) || fallback.expectedMonthlyLift.netWht)),
      netIit: Math.max(0, Math.round(Number(liftRaw.netIit) || fallback.expectedMonthlyLift.netIit)),
      physicalCash: Math.max(
        0,
        Math.round(Number(liftRaw.physicalCash) || fallback.expectedMonthlyLift.physicalCash)
      ),
    },
  };
}
