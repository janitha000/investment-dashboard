import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  
  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }

  try {
    const res = await fetch("https://www.cse.lk/api/tradeSummary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ symbol }),
    });

    if (!res.ok) {
      throw new Error("Failed to fetch from CSE");
    }

    const data = await res.json();
    
    // Find the specific symbol in the array (note CSE's spelling "Summery")
    const stock = data?.reqTradeSummery?.find(
      (s: any) => s.symbol.toUpperCase() === symbol.toUpperCase()
    );

    if (stock) {
      return NextResponse.json({ price: stock.price });
    }

    return NextResponse.json({ error: "Symbol not found" }, { status: 404 });
  } catch (error) {
    console.error("Error fetching stock price:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
