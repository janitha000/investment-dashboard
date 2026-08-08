import { redirect } from "next/navigation";

export default function StockMarketRedirect() {
  redirect("/instruments?tab=stock-market");
}
