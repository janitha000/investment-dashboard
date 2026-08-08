import { redirect } from "next/navigation";

export default function TreasuryRedirect() {
  redirect("/instruments?tab=treasury");
}
