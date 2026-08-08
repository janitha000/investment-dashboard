import { redirect } from "next/navigation";

export default function UnitTrustsRedirect() {
  redirect("/instruments?tab=unit-trusts");
}
