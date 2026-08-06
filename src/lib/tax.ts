/**
 * Sri Lanka resident individual income tax — YoA 2025/2026
 * (Inland Revenue Act No. 24 of 2017 as amended by Act No. 2 of 2025)
 *
 * Progressive tax applies to the pooled annual income of all IIT-liable
 * sources, never per investment or per category.
 */

export const PERSONAL_RELIEF = 1_800_000;

export const IIT_SLABS: { width: number; rate: number }[] = [
  { width: 1_000_000, rate: 0.06 },
  { width: 500_000, rate: 0.18 },
  { width: 500_000, rate: 0.24 },
  { width: 500_000, rate: 0.30 },
  { width: Infinity, rate: 0.36 },
];

export interface SlabBreakdown {
  rate: number;
  incomeInSlab: number;
  tax: number;
}

export interface ProgressiveIitResult {
  assessableIncome: number;
  relief: number;
  taxableIncome: number;
  slabTax: number;
  whtCredit: number;
  balancePayable: number;
  effectiveRate: number;
  slabs: SlabBreakdown[];
}

/**
 * @param assessableIncome pooled annual income from IIT-liable sources
 * @param whtCredit WHT already withheld on that income, credited against the slab tax
 */
export function calcProgressiveIit(assessableIncome: number, whtCredit = 0): ProgressiveIitResult {
  const income = Math.max(0, assessableIncome);
  const relief = Math.min(PERSONAL_RELIEF, income);
  let remaining = income - relief;

  let slabTax = 0;
  const slabs: SlabBreakdown[] = [];
  for (const slab of IIT_SLABS) {
    const incomeInSlab = Math.min(remaining, slab.width);
    if (incomeInSlab <= 0) break;
    const tax = incomeInSlab * slab.rate;
    slabTax += tax;
    slabs.push({ rate: slab.rate, incomeInSlab, tax });
    remaining -= incomeInSlab;
  }

  return {
    assessableIncome: income,
    relief,
    taxableIncome: Math.max(0, income - relief),
    slabTax,
    whtCredit,
    balancePayable: Math.max(0, slabTax - whtCredit),
    effectiveRate: income > 0 ? (slabTax / income) * 100 : 0,
    slabs,
  };
}
