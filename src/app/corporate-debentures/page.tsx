import { redirect } from "next/navigation";

export default function CorporateDebenturesRedirect() {
  redirect("/instruments?tab=corporate-debentures");
}
