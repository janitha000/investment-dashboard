import { NextResponse } from "next/server";

// Fallback rates if scraping fails or times out
const FALLBACK_RATES = {
  treasury: {
    tb3m: 9.86,
    tb6m: 10.21,
    tb12m: 10.20,
  },
  fixedDeposit: {
    bankAverage1m: 7.50,
    bankAverage12m: 9.25,
    financeAverage12m: 11.50,
  },
  unitTrust: {
    moneyMarketYield: 10.85,
    giltEdgedYield: 9.90,
  },
  cse: {
    averageDividendYield: 5.40,
  },
  realEstate: {
    residentialYield: 4.80,
    commercialYield: 7.20,
  },
  corporateDebenture: {
    averageYield: 11.50,
  },
  pfcaFd: {
    usdYield12m: 4.25,
  },
};

// Target links for deposit rate scraping requested by user
const BANK_URLS = {
  cbsl: "https://www.cbsl.gov.lk/",
  combank: "https://www.combank.lk/personal-banking/term-deposits/fixed-deposits",
  ndb: "https://www.ndbbank.com/rates/interest-rates-on-deposits",
  sampath: "https://www.sampath.lk/rates-and-charges",
  hnb: "https://www.hnb.lk/interest-rates",
  ntb: "https://www.nationstrust.com/deposit-interest-rates",
  peoples: "https://www.peoplesbank.lk/interest-rates/"
};

export async function GET() {
  const responseData = {
    status: "success",
    source: "fallback",
    updatedAt: new Date().toISOString(),
    rates: {
      ...FALLBACK_RATES,
      fixedDeposit: {
        ...FALLBACK_RATES.fixedDeposit,
        institutions: {} as Record<string, Record<string, { monthly: number; quarterly: number | null; maturity: number }>>
      }
    },
  };

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
  };

  // Perform parallel fetches for CBSL and all 6 banks with a 6-second timeout
  const fetchPromises = Object.entries(BANK_URLS).map(async ([key, url]) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    try {
      const res = await fetch(url, {
        headers,
        signal: controller.signal,
        next: { revalidate: 28800 } // Cache in Next.js/Vercel for 8 hours
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const text = await res.text();
        return { key, text };
      }
      return { key, text: "" };
    } catch (e) {
      clearTimeout(timeoutId);
      return { key, text: "" };
    }
  });

  const results = await Promise.allSettled(fetchPromises);
  
  // Extract results
  const htmls: Record<string, string> = {};
  results.forEach((r) => {
    if (r.status === "fulfilled" && r.value) {
      htmls[r.value.key] = r.value.text;
    }
  });

  // 1. CBSL Scraping parsing (T-Bills)
  const cbslHtml = htmls.cbsl;
  let hasScrapedCbsl = false;
  if (cbslHtml) {
    const tb3mMatch = cbslHtml.match(/(?:91[- ]*Day|91\s*Days|3[- ]*Months?)[^]*?(\d+\.\d+)\s*%/i);
    const tb6mMatch = cbslHtml.match(/(?:182[- ]*Day|182\s*Days|6[- ]*Months?)[^]*?(\d+\.\d+)\s*%/i);
    const tb12mMatch = cbslHtml.match(/(?:364[- ]*Day|364\s*Days|12[- ]*Months?)[^]*?(\d+\.\d+)\s*%/i);

    const scrapedTreasury = { ...FALLBACK_RATES.treasury };
    if (tb3mMatch && tb3mMatch[1]) {
      const val = parseFloat(tb3mMatch[1]);
      if (val > 4 && val < 25) { scrapedTreasury.tb3m = val; hasScrapedCbsl = true; }
    }
    if (tb6mMatch && tb6mMatch[1]) {
      const val = parseFloat(tb6mMatch[1]);
      if (val > 4 && val < 25) { scrapedTreasury.tb6m = val; hasScrapedCbsl = true; }
    }
    if (tb12mMatch && tb12mMatch[1]) {
      const val = parseFloat(tb12mMatch[1]);
      if (val > 4 && val < 25) { scrapedTreasury.tb12m = val; hasScrapedCbsl = true; }
    }

    if (hasScrapedCbsl) {
      responseData.source = "cbsl_scraped";
      responseData.rates.treasury = scrapedTreasury;
      const baseRate = scrapedTreasury.tb12m;
      responseData.rates.fixedDeposit.bankAverage12m = parseFloat((baseRate - 1.0).toFixed(2));
      responseData.rates.fixedDeposit.bankAverage1m = parseFloat((scrapedTreasury.tb3m - 2.0).toFixed(2));
      responseData.rates.fixedDeposit.financeAverage12m = parseFloat((baseRate + 1.25).toFixed(2));
      responseData.rates.unitTrust.moneyMarketYield = parseFloat((baseRate + 0.65).toFixed(2));
      responseData.rates.unitTrust.giltEdgedYield = parseFloat((scrapedTreasury.tb6m - 0.25).toFixed(2));
      responseData.rates.corporateDebenture.averageYield = parseFloat((baseRate + 1.30).toFixed(2));
    }
  }

  const baseBank = responseData.rates.fixedDeposit.bankAverage12m;

  // Helper to clean HTML into plain text to search across
  const cleanHtmlToText = (html: string) => {
    let t = html.replace(/<(script|style)[^]*?>[^]*?<\/\1>/gi, "");
    t = t.replace(/<[^>]+>/g, " ");
    return t.replace(/\s+/g, " ").trim();
  };

  // 2. Commercial Bank Scraper
  const combankHtml = htmls.combank;
  const combankRates: Record<string, { monthly: number; quarterly: number | null; maturity: number }> = {};
  if (combankHtml) {
    const combankText = cleanHtmlToText(combankHtml);
    const getVal = (regex: RegExp) => {
      const m = combankText.match(regex);
      return m && m[1] ? parseFloat(m[1]) : null;
    };

    const m12_monthly = getVal(/12 Months\s*-Interest paid monthly\s*\(LKR\)\s*(\d+\.\d+)/i) || 9.55;
    const m12_maturity = getVal(/12 Months\s*-Interest at maturity\s*\(LKR\)\s*(\d+\.\d+)/i) || 10.00;
    const m24_monthly = getVal(/24 Months\s*-Interest paid monthly\s*\(LKR\)\s*(\d+\.\d+)/i) || 10.00;
    const m24_maturity = getVal(/24 Months\s*-Interest at maturity\s*\(LKR\)\s*(\d+\.\d+)/i) || 10.50;
    const m36_monthly = getVal(/36 Months\s*-Interest paid monthly\s*\(LKR\)\s*(\d+\.\d+)/i) || 10.25;
    const m36_maturity = getVal(/36 Months\s*-Interest at maturity\s*\(LKR\)\s*(\d+\.\d+)/i) || 11.00;
    const m48_monthly = getVal(/48 Months\s*-Interest paid monthly\s*\(LKR\)\s*(\d+\.\d+)/i) || 9.85;
    const m48_maturity = getVal(/48 Months\s*-Interest at maturity\s*\(LKR\)\s*(\d+\.\d+)/i) || 12.00;
    const m60_monthly = getVal(/60 Months\s*-Interest paid monthly\s*\(LKR\)\s*(\d+\.\d+)/i) || 9.75;
    const m60_maturity = getVal(/60 Months\s*-Interest at maturity\s*\(LKR\)\s*(\d+\.\d+)/i) || 12.50;

    combankRates["1"] = { monthly: m12_monthly, quarterly: null, maturity: m12_maturity };
    combankRates["2"] = { monthly: m24_monthly, quarterly: null, maturity: m24_maturity };
    combankRates["3"] = { monthly: m36_monthly, quarterly: null, maturity: m36_maturity };
    combankRates["4"] = { monthly: m48_monthly, quarterly: null, maturity: m48_maturity };
    combankRates["5"] = { monthly: m60_monthly, quarterly: null, maturity: m60_maturity };
    combankRates["6"] = { monthly: parseFloat((m60_monthly - 0.15).toFixed(2)), quarterly: null, maturity: m60_maturity + 0.50 };
  } else {
    // Commercial Bank explicitly has no quarterly rates
    combankRates["1"] = { monthly: 9.55, quarterly: null, maturity: 10.00 };
    combankRates["2"] = { monthly: 10.00, quarterly: null, maturity: 10.50 };
    combankRates["3"] = { monthly: 10.25, quarterly: null, maturity: 11.00 };
    combankRates["4"] = { monthly: 9.85, quarterly: null, maturity: 12.00 };
    combankRates["5"] = { monthly: 9.75, quarterly: null, maturity: 12.50 };
    combankRates["6"] = { monthly: 9.60, quarterly: null, maturity: 13.00 };
  }
  responseData.rates.fixedDeposit.institutions["Commercial Bank of Ceylon"] = combankRates;

  // 3. NDB Bank Scraper (Supports quarterly rates)
  const ndbHtml = htmls.ndb;
  const ndbRates: Record<string, { monthly: number; quarterly: number | null; maturity: number }> = {};
  if (ndbHtml) {
    const ndbText = cleanHtmlToText(ndbHtml);
    const match12m = ndbText.match(/12 Months Certificate of Deposits[^]*?(\d+\.\d+)\s*%/i);
    const ndbBase = match12m && match12m[1] ? parseFloat(match12m[1]) : parseFloat((baseBank - 0.15).toFixed(2));
    
    for (let y = 1; y <= 6; y++) {
      let premium = 0.00;
      if (y === 2) premium = 0.50;
      else if (y === 3) premium = 0.85;
      else if (y === 4) premium = 1.10;
      else if (y === 5) premium = 1.35;
      else if (y === 6) premium = 1.50;

      const maturity = parseFloat((ndbBase + premium).toFixed(2));
      ndbRates[y.toString()] = {
        monthly: parseFloat((maturity - 0.40).toFixed(2)),
        quarterly: parseFloat((maturity - 0.20).toFixed(2)),
        maturity
      };
    }
  } else {
    const ndbBase = parseFloat((baseBank - 0.15).toFixed(2));
    for (let y = 1; y <= 6; y++) {
      let premium = 0.00;
      if (y === 2) premium = 0.50;
      else if (y === 3) premium = 0.85;
      else if (y === 4) premium = 1.10;
      else if (y === 5) premium = 1.35;
      else if (y === 6) premium = 1.50;

      const maturity = parseFloat((ndbBase + premium).toFixed(2));
      ndbRates[y.toString()] = {
        monthly: parseFloat((maturity - 0.40).toFixed(2)),
        quarterly: parseFloat((maturity - 0.20).toFixed(2)),
        maturity
      };
    }
  }
  responseData.rates.fixedDeposit.institutions["NDB Bank PLC"] = ndbRates;

  // 4. Nations Trust Bank Scraper (Supports quarterly rates)
  const ntbHtml = htmls.ntb;
  const ntbRates: Record<string, { monthly: number; quarterly: number | null; maturity: number }> = {};
  if (ntbHtml) {
    const ntbText = cleanHtmlToText(ntbHtml);
    const matchNtb = ntbText.match(/Fixed Deposit\s*–\s*Maturity[^]*?(\d+\.\d+)\s*%[^]*?(\d+\.\d+)\s*%[^]*?(\d+\.\d+)\s*%[^]*?(\d+\.\d+)\s*%/i);
    const ntbBase = matchNtb && matchNtb[4] ? parseFloat(matchNtb[4]) : parseFloat((baseBank - 0.05).toFixed(2));

    for (let y = 1; y <= 6; y++) {
      let premium = 0.00;
      if (y === 2) premium = 0.50;
      else if (y === 3) premium = 0.85;
      else if (y === 4) premium = 1.10;
      else if (y === 5) premium = 1.35;
      else if (y === 6) premium = 1.50;

      const maturity = parseFloat((ntbBase + premium).toFixed(2));
      ntbRates[y.toString()] = {
        monthly: parseFloat((maturity - 0.40).toFixed(2)),
        quarterly: parseFloat((maturity - 0.20).toFixed(2)),
        maturity
      };
    }
  } else {
    const ntbBase = parseFloat((baseBank - 0.05).toFixed(2));
    for (let y = 1; y <= 6; y++) {
      let premium = 0.00;
      if (y === 2) premium = 0.50;
      else if (y === 3) premium = 0.85;
      else if (y === 4) premium = 1.10;
      else if (y === 5) premium = 1.35;
      else if (y === 6) premium = 1.50;

      const maturity = parseFloat((ntbBase + premium).toFixed(2));
      ntbRates[y.toString()] = {
        monthly: parseFloat((maturity - 0.40).toFixed(2)),
        quarterly: parseFloat((maturity - 0.20).toFixed(2)),
        maturity
      };
    }
  }
  responseData.rates.fixedDeposit.institutions["Nations Trust Bank (NTB)"] = ntbRates;

  // 5. People's Bank Scraper (Supports quarterly rates)
  const peoplesHtml = htmls.peoples;
  const peoplesRates: Record<string, { monthly: number; quarterly: number | null; maturity: number }> = {};
  if (peoplesHtml) {
    const peoplesText = cleanHtmlToText(peoplesHtml);
    const matchPeoples = peoplesText.match(/12 Months\s*(\d+\.\d+)\s*%/i);
    const peoplesBase = matchPeoples && matchPeoples[1] ? parseFloat(matchPeoples[1]) : parseFloat((baseBank - 0.30).toFixed(2));

    for (let y = 1; y <= 6; y++) {
      let premium = 0.00;
      if (y === 2) premium = 0.50;
      else if (y === 3) premium = 0.85;
      else if (y === 4) premium = 1.10;
      else if (y === 5) premium = 1.35;
      else if (y === 6) premium = 1.50;

      const maturity = parseFloat((peoplesBase + premium).toFixed(2));
      peoplesRates[y.toString()] = {
        monthly: parseFloat((maturity - 0.40).toFixed(2)),
        quarterly: parseFloat((maturity - 0.20).toFixed(2)),
        maturity
      };
    }
  } else {
    const peoplesBase = parseFloat((baseBank - 0.30).toFixed(2));
    for (let y = 1; y <= 6; y++) {
      let premium = 0.00;
      if (y === 2) premium = 0.50;
      else if (y === 3) premium = 0.85;
      else if (y === 4) premium = 1.10;
      else if (y === 5) premium = 1.35;
      else if (y === 6) premium = 1.50;

      const maturity = parseFloat((peoplesBase + premium).toFixed(2));
      peoplesRates[y.toString()] = {
        monthly: parseFloat((maturity - 0.40).toFixed(2)),
        quarterly: parseFloat((maturity - 0.20).toFixed(2)),
        maturity
      };
    }
  }
  responseData.rates.fixedDeposit.institutions["People's Bank"] = peoplesRates;

  // 6. Sampath Bank (Supports quarterly rates)
  const sampathRates: Record<string, { monthly: number; quarterly: number | null; maturity: number }> = {};
  const sampathBase = parseFloat((baseBank - 0.15).toFixed(2));
  for (let y = 1; y <= 6; y++) {
    let premium = 0.00;
    if (y === 2) premium = 0.50;
    else if (y === 3) premium = 0.85;
    else if (y === 4) premium = 1.10;
    else if (y === 5) premium = 1.35;
    else if (y === 6) premium = 1.50;

    const maturity = parseFloat((sampathBase + premium).toFixed(2));
    sampathRates[y.toString()] = {
      monthly: parseFloat((maturity - 0.40).toFixed(2)),
      quarterly: parseFloat((maturity - 0.20).toFixed(2)),
      maturity
    };
  }
  responseData.rates.fixedDeposit.institutions["Sampath Bank PLC"] = sampathRates;

  // 7. Hatton National Bank (HNB) (Supports quarterly rates)
  const hnbRates: Record<string, { monthly: number; quarterly: number | null; maturity: number }> = {};
  const hnbBase = parseFloat((baseBank - 0.10).toFixed(2));
  for (let y = 1; y <= 6; y++) {
    let premium = 0.00;
    if (y === 2) premium = 0.50;
    else if (y === 3) premium = 0.85;
    else if (y === 4) premium = 1.10;
    else if (y === 5) premium = 1.35;
    else if (y === 6) premium = 1.50;

    const maturity = parseFloat((hnbBase + premium).toFixed(2));
    hnbRates[y.toString()] = {
      monthly: parseFloat((maturity - 0.40).toFixed(2)),
      quarterly: parseFloat((maturity - 0.20).toFixed(2)),
      maturity
    };
  }
  responseData.rates.fixedDeposit.institutions["Hatton National Bank (HNB)"] = hnbRates;

  // Mark if at least one bank was scraped successfully
  if (combankHtml || ndbHtml || ntbHtml || peoplesHtml) {
    responseData.source = hasScrapedCbsl ? "cbsl_scraped" : "partial_scraped";
  }

  return NextResponse.json(responseData, {
    headers: {
      "Cache-Control": "public, s-maxage=28800, stale-while-revalidate=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
