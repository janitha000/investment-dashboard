import { redirect } from "next/navigation";

export default function FixedDepositsRedirect() {
  redirect("/instruments?tab=fixed-deposits");
}
