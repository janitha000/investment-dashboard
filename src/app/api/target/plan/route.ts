import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getTarget, saveTarget, type TargetPlan } from "@/lib/db";
import {
  buildHeuristicPlan,
  parseGeminiPlan,
  type CurrentMetrics,
  type TargetMetrics,
} from "@/lib/targetPlan";

type PlanBody = {
  current: CurrentMetrics;
  target: TargetMetrics;
  ratesHint?: string;
  persist?: boolean;
};

function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function callGemini(apiKey: string, prompt: string): Promise<Record<string, unknown>> {
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
  const geminiResponse = await fetch(geminiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });

  if (!geminiResponse.ok) {
    const errText = await geminiResponse.text();
    throw new Error(`Gemini error ${geminiResponse.status}: ${errText.slice(0, 240)}`);
  }

  const data = await geminiResponse.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") ||
    "";
  const parsed = extractJsonObject(text);
  if (!parsed) throw new Error("Gemini returned non-JSON plan");
  return parsed;
}

export async function POST(req: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  try {
    const body = (await req.json()) as PlanBody;
    if (!body?.current || !body?.target) {
      return NextResponse.json({ error: "current and target are required" }, { status: 400 });
    }

    const targetMetrics: TargetMetrics = {
      netMonthlyWht: Math.max(0, Number(body.target.netMonthlyWht) || 0),
      netMonthlyIit: Math.max(0, Number(body.target.netMonthlyIit) || 0),
      physicalCashMonthly: Math.max(0, Number(body.target.physicalCashMonthly) || 0),
      monthsToTarget: Math.max(1, Math.round(Number(body.target.monthsToTarget) || 12)),
    };

    const current: CurrentMetrics = {
      netMonthlyWht: Math.max(0, Number(body.current.netMonthlyWht) || 0),
      netMonthlyIit: Math.max(0, Number(body.current.netMonthlyIit) || 0),
      physicalCashMonthly: Math.max(0, Number(body.current.physicalCashMonthly) || 0),
      invested: Math.max(0, Number(body.current.invested) || 0),
      investedByCategory: {
        fds: Math.max(0, Number(body.current.investedByCategory?.fds) || 0),
        uts: Math.max(0, Number(body.current.investedByCategory?.uts) || 0),
        treasury: Math.max(0, Number(body.current.investedByCategory?.treasury) || 0),
        dividends: Math.max(0, Number(body.current.investedByCategory?.dividends) || 0),
        pfcaFds: Math.max(0, Number(body.current.investedByCategory?.pfcaFds) || 0),
      },
    };

    const heuristic = buildHeuristicPlan(current, targetMetrics);
    const apiKey =
      req.headers.get("x-gemini-key") || process.env.GEMINI_API_KEY || "";

    let plan: TargetPlan = heuristic;
    let warning: string | null = null;

    if (apiKey) {
      const prompt = `You are a Sri Lankan personal-finance planner for a single-user investor dashboard.
Return ONLY JSON matching this schema:
{
  "summary": "string",
  "steps": ["string"],
  "assumptions": ["string"],
  "monthlyContributionNeeded": number,
  "additionalCapitalByCategory": {
    "fds": number,
    "uts": number,
    "treasury": number,
    "dividends": number,
    "pfcaFds": number
  },
  "expectedMonthlyLift": {
    "netWht": number,
    "netIit": number,
    "physicalCash": number
  }
}

Rules:
- Currency is LKR. Numbers are absolute LKR (not lakhs/millions labels).
- additionalCapitalByCategory = EXTRA capital still needed (not current holdings).
- Prefer a practical mix: UTs for liquidity/yield, FDs for predictable cash (10% WHT at source, credit against progressive IIT), Treasury for sovereign ballast (no personal WHT in this app), dividends for tax-free income, PFCA for FX diversification (interest counts to physical cash; FX valuation does not).
- Progressive IIT pools FD+UT+Treasury only; only FD WHT is an IIT credit.
- Horizon: ${targetMetrics.monthsToTarget} months.
- Keep steps actionable (5-8). Keep assumptions short.

CURRENT (from latest snapshot, monthly):
${JSON.stringify(current, null, 2)}

TARGETS (monthly):
${JSON.stringify(targetMetrics, null, 2)}

GAPS:
netWht=${Math.max(0, targetMetrics.netMonthlyWht - current.netMonthlyWht)}
netIit=${Math.max(0, targetMetrics.netMonthlyIit - current.netMonthlyIit)}
physicalCash=${Math.max(0, targetMetrics.physicalCashMonthly - current.physicalCashMonthly)}

RATES HINT:
${body.ratesHint || "Use typical Sri Lanka 2025/26 retail rates (~8-12% p.a. for FD/UT/Treasury)."}

Heuristic baseline (refine, do not ignore realism):
${JSON.stringify(heuristic, null, 2)}
`;

      try {
        const geminiJson = await callGemini(apiKey, prompt);
        plan = parseGeminiPlan(geminiJson, heuristic);
      } catch (e) {
        warning = e instanceof Error ? e.message : "Gemini failed; used heuristic plan";
        plan = heuristic;
      }
    } else {
      warning = "No Gemini API key — used local heuristic plan. Add a key in Rates customizer or GEMINI_API_KEY.";
    }

    if (body.persist !== false) {
      const existing = await getTarget();
      await saveTarget({
        ...existing,
        netMonthlyWht: targetMetrics.netMonthlyWht,
        netMonthlyIit: targetMetrics.netMonthlyIit,
        physicalCashMonthly: targetMetrics.physicalCashMonthly,
        monthsToTarget: targetMetrics.monthsToTarget,
        setAt: existing.setAt || new Date().toISOString(),
        plan,
      });
    }

    return NextResponse.json({ ok: true, plan, warning });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to build plan";
    console.error("[/api/target/plan]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
