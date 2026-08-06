import { NextResponse } from "next/server";

const BANK_URLS = {
  cbsl: "https://www.cbsl.gov.lk/",
  combank: "https://www.combank.lk/personal-banking/term-deposits/fixed-deposits",
  ndb: "https://www.ndbbank.com/rates/interest-rates-on-deposits",
  ntb: "https://www.nationstrust.com/deposit-interest-rates",
  peoples: "https://www.peoplesbank.lk/interest-rates/"
};

export async function POST(request: Request) {
  try {
    // 1. Resolve Gemini API Key from headers or environment variables
    const geminiKeyHeader = request.headers.get("x-gemini-key");
    const apiKey = geminiKeyHeader || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          status: "error",
          message: "Gemini API Key is missing. Please configure it in the Rates customizer."
        },
        { status: 400 }
      );
    }

    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
    };

    // 2. Fetch the text from the banks concurrently with a 5-second timeout
    const fetchPromises = Object.entries(BANK_URLS).map(async ([key, url]) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      try {
        const res = await fetch(url, { headers, signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const html = await res.text();
          // Clean HTML tags to fit context limits
          let t = html.replace(/<(script|style)[^]*?>[^]*?<\/\1>/gi, "");
          t = t.replace(/<[^>]+>/g, " ");
          return { key, text: t.replace(/\s+/g, " ").trim().slice(0, 15000) }; // Slice to 15KB per bank
        }
        return { key, text: "" };
      } catch {
        clearTimeout(timeoutId);
        return { key, text: "" };
      }
    });

    const results = await Promise.allSettled(fetchPromises);
    const textData: Record<string, string> = {};
    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value) {
        textData[r.value.key] = r.value.text;
      }
    });

    // 3. Formulate the prompt for Gemini to return BOTH Fixed Deposits, Unit Trusts, and Treasury yields
    const systemPrompt = `You are a financial parsing assistant for Sri Lankan deposits, mutual funds (unit trusts), and treasury yields.
Analyze the provided scraped text from bank and Central Bank of Sri Lanka (CBSL) websites, and extract the LKR Fixed Deposit interest rates for tenures 1 to 6 years.
Extract rates for:
- Monthly interest payout
- At Maturity interest payout

Also, parse/estimate the current annual interest rate yields for prominent Sri Lankan Unit Trust (Mutual Fund) schemes:
- CAL Money Market Fund
- CAL Income Fund
- CAL First Income Opportunities Fund (FIOF)
- CAL Gilt Edged Fund
- NDB Wealth Money Market Fund
- NDB Wealth Income Fund
- NDB Wealth Gilt Edged Fund
- First Capital Money Market Fund
- First Capital Gilt Edged Fund
- JB Vantage Money Market Fund
- JB Vantage Short Term Gilt Fund

Also, parse/estimate the latest Government of Sri Lanka Treasury Bill (T-Bill) yields and Treasury Bond (T-Bond) coupon rate yields:
- T-Bills: "91-day", "182-day", "364-day"
- T-Bonds: "2-year", "3-year", "5-year", "10-year", "15-year", "20-year"

For missing text, use your knowledge of current yields in Sri Lanka (as of mid 2026, where average MMF yields are 10.50% - 11.25%, Gilt yields are 9.75% - 10.20%, T-Bills are 9.50% - 10.30% (with 3M at ~9.86%, 6M at ~10.21%, 12M at ~10.20%), and T-Bonds track slightly higher ranging from 10.50% for 2Y up to 12.80% for 20Y). Set quarterly rates to null for FDs unless explicitly listed.

Return a single JSON object with EXACTLY these three root keys:
1. "fixedDeposit": a dictionary of bank names to their tenure rate matrices:
   - Banks: "Commercial Bank of Ceylon", "NDB Bank PLC", "Sampath Bank PLC", "Hatton National Bank (HNB)", "Nations Trust Bank (NTB)", "People's Bank", "Bank of Ceylon (BOC)"
   - Tenures must be strings: "1", "2", "3", "4", "5", "6"
   - Each tenure must have: "monthly" (number), "quarterly" (number | null), "maturity" (number)
2. "unitTrust": a dictionary mapping the EXACT fund names listed above to their current annual yield numbers.
3. "treasury": a dictionary with keys:
   - "tbills": a dictionary with keys: "91-day", "182-day", "364-day"
   - "tbonds": a dictionary with keys: "2-year", "3-year", "5-year", "10-year", "15-year", "20-year"

Example format:
{
  "fixedDeposit": {
    "Commercial Bank of Ceylon": {
      "1": { "monthly": 9.55, "quarterly": null, "maturity": 10.00 },
      "5": { "monthly": 9.75, "quarterly": null, "maturity": 12.50 }
    }
  },
  "unitTrust": {
    "CAL Money Market Fund": 10.85,
    "CAL Income Fund": 11.25,
    "CAL First Income Opportunities Fund (FIOF)": 11.85,
    "CAL Gilt Edged Fund": 9.90,
    "NDB Wealth Gilt Edged Fund": 9.80
  },
  "treasury": {
    "tbills": {
      "91-day": 9.86,
      "182-day": 10.21,
      "364-day": 10.20
    },
    "tbonds": {
      "2-year": 10.50,
      "3-year": 11.20,
      "5-year": 11.80,
      "10-year": 12.25,
      "15-year": 12.50,
      "20-year": 12.80
    }
  }
}`;

    const userPrompt = `Here is the scraped plain text from the bank and Central Bank of Sri Lanka (CBSL) websites:

[CBSL (Treasury Rates)]
${textData.cbsl || "No text scraped"}

[Commercial Bank of Ceylon]
${textData.combank || "No text scraped"}

[NDB Bank]
${textData.ndb || "No text scraped"}

[Nations Trust Bank]
${textData.ntb || "No text scraped"}

[People's Bank]
${textData.peoples || "No text scraped"}

Parse and estimate the rate matrices, unit trust yields, and treasury yields. Return the JSON object directly.`;

    // 4. Send request to Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: systemPrompt },
              { text: userPrompt }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error("Gemini API Error:", errText);
      let errorDetails = errText;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error?.message) {
          errorDetails = `${parsed.error.message} (Status: ${parsed.error.status || "Unknown"}, Code: ${parsed.error.code || "502"})`;
        }
      } catch {}
      
      return NextResponse.json(
        {
          status: "error",
          message: `Gemini API Error: ${errorDetails}`
        },
        { status: 502 }
      );
    }

    const geminiData = await geminiResponse.json();
    const parsedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!parsedText) {
      return NextResponse.json(
        {
          status: "error",
          message: "Gemini returned empty rate results."
        },
        { status: 502 }
      );
    }

    let ratesObject;
    try {
      ratesObject = JSON.parse(parsedText);
    } catch (parseError: any) {
      return NextResponse.json(
        {
          status: "error",
          message: `JSON Parse Error on Gemini Response: ${parseError.message}. Content: ${parsedText.slice(0, 150)}`
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      status: "success",
      source: "gemini_ai",
      updatedAt: new Date().toISOString(),
      rates: ratesObject
    });

  } catch (error: any) {
    console.error("Gemini Scraper Route error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error.message || "Failed to parse rates using Gemini AI."
      },
      { status: 500 }
    );
  }
}
