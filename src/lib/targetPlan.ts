import type { CategoryCapitalPlan, TargetPlan } from "@/lib/db";

export type TargetMetrics = {
  netMonthlyWht: number;
  netMonthlyIit: number;
  physicalCashMonthly: number;
  monthsToTarget: number;
  targetMonth?: string | null;
  categoryWeights?: CategoryCapitalPlan | null;
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
  fds: (0.09 * 0.9) / 12, // ~9% gross, 10% WHT
  uts: 0.105 / 12, // quoted net
  treasury: 0.1 / 12, // no WHT in our model
  dividends: 0.045 / 12,
  pfcaFds: (0.05 * 1.05) / 12, // USD interest + capital gain on that interest
};

const CATEGORY_NAMES: Record<keyof CategoryCapitalPlan, string> = {
  fds: "Fixed Deposits",
  uts: "Unit Trusts",
  treasury: "Treasury Securities",
  dividends: "Dividends",
  pfcaFds: "PFCA FDs",
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
 * weighted according to user-specified category percentages.
 */
export function buildHeuristicPlan(
  current: CurrentMetrics,
  target: TargetMetrics,
): TargetPlan {
  const gapWht = Math.max(0, target.netMonthlyWht - current.netMonthlyWht);
  const gapIit = Math.max(0, target.netMonthlyIit - current.netMonthlyIit);
  const gapCash = Math.max(
    0,
    target.physicalCashMonthly - current.physicalCashMonthly,
  );
  const primaryGap = Math.max(gapCash, gapWht, gapIit);
  const months = Math.max(1, target.monthsToTarget);

  // Capital needed ≈ gap / blended monthly yield (~0.75%/mo ≈ 9% p.a. net)
  const blendedYield = 0.0075;
  const totalCapitalNeeded = primaryGap > 0 ? primaryGap / blendedYield : 0;
  const monthlyContributionNeeded = totalCapitalNeeded / months;
  // Normalize user weights (default to 32% UT, 28% FD, 18% Treasury, 12% Dividends, 10% PFCA)
  const rawWeights = target.categoryWeights || {
    uts: 32,
    fds: 28,
    treasury: 18,
    dividends: 12,
    pfcaFds: 10,
  };

  // Weight toward categories that help physical cash + WHT, with some IIT-efficient mix
  const totalRaw =
    (rawWeights.uts || 0) +
    (rawWeights.fds || 0) +
    (rawWeights.treasury || 0) +
    (rawWeights.dividends || 0) +
    (rawWeights.pfcaFds || 0);

  const safeTotal = totalRaw > 0 ? totalRaw : 100;
  const weights: CategoryCapitalPlan = {
    uts: 0.32,
    fds: 0.28,
    treasury: 0.18,
    dividends: 0.12,
    pfcaFds: 0.1,
    uts: (rawWeights.uts || 0) / safeTotal,
    fds: (rawWeights.fds || 0) / safeTotal,
    treasury: (rawWeights.treasury || 0) / safeTotal,
    dividends: (rawWeights.dividends || 0) / safeTotal,
    pfcaFds: (rawWeights.pfcaFds || 0) / safeTotal,
  };

  // Blended monthly yield computed from user's custom allocation split
  const blendedMonthlyYield =
    weights.fds * CATEGORY_MONTHLY_YIELD.fds +
    weights.uts * CATEGORY_MONTHLY_YIELD.uts +
    weights.treasury * CATEGORY_MONTHLY_YIELD.treasury +
    weights.dividends * CATEGORY_MONTHLY_YIELD.dividends +
    weights.pfcaFds * CATEGORY_MONTHLY_YIELD.pfcaFds;

  const effectiveYield = Math.max(0.001, blendedMonthlyYield || 0.0075);
  const totalCapitalNeeded = primaryGap > 0 ? primaryGap / effectiveYield : 0;
  const monthlyContributionNeeded = totalCapitalNeeded / months;

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

  const activeAllocations = (Object.keys(weights) as (keyof CategoryCapitalPlan)[])
    .filter((k) => weights[k] > 0)
    .sort((a, b) => weights[b] - weights[a])
    .map((k) => `${CATEGORY_NAMES[k]} (~${Math.round(weights[k] * 100)}%)`);

  const steps: string[] = [
    primaryGap <= 0
      ? "Targets are already met on the latest snapshot — maintain allocations and reinvest maturities."
      : `Close a ~LKR ${Math.round(primaryGap).toLocaleString("en-LK")} monthly income gap over ${months} months.`,
    `Deploy about LKR ${Math.round(monthlyContributionNeeded).toLocaleString("en-LK")} of new capital each month (or lump-sum equivalent).`,
    `Prefer Unit Trusts (~${Math.round(weights.uts * 100)}%) and FDs (~${Math.round(weights.fds * 100)}%) for cash yield; keep Treasury for sovereign ballast.`,
    `Allocate new capital according to your specified percentage mix: ${activeAllocations.join(", ") || "balanced mix"}.`,
    "Remember: only LKR FDs withhold 10% WHT (IIT credit). UT/Treasury/dividends/PFCA do not add personal WHT credit.",
    "Re-save a portfolio snapshot after each material deployment so progress bars stay accurate.",
  ];

  const assumptions = [
    "Uses latest snapshot totals as the current baseline.",
    "Assumes ~9% p.a. blended net yield for capital sizing.",
    `Assumes ~${(effectiveYield * 12 * 100).toFixed(1)}% p.a. blended net yield tailored to your selected category allocation split.`,
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
        : `To reach your targets in ${months} months, add roughly LKR ${Math.round(totalCapitalNeeded).toLocaleString("en-LK")} of productive capital (~LKR ${Math.round(monthlyContributionNeeded).toLocaleString("en-LK")}/mo), distributed according to your target allocation split (${activeAllocations.slice(0, 3).join(", ")}).`,
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
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
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
  fallback: TargetPlan,
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
      Math.round(
        Number(parsed.monthlyContributionNeeded) ||
          fallback.monthlyContributionNeeded,
      ),
    ),
    additionalCapitalByCategory: hasCapital
      ? capital
      : fallback.additionalCapitalByCategory,
    expectedMonthlyLift: {
      netWht: Math.max(
        0,
        Math.round(
          Number(liftRaw.netWht) || fallback.expectedMonthlyLift.netWht,
        ),
      ),
      netIit: Math.max(
        0,
        Math.round(
          Number(liftRaw.netIit) || fallback.expectedMonthlyLift.netIit,
        ),
      ),
      physicalCash: Math.max(
        0,
        Math.round(
          Number(liftRaw.physicalCash) ||
            fallback.expectedMonthlyLift.physicalCash,
        ),
      ),
    },
  };
}
