import { redirect } from "next/navigation";

export default function RealEstateRedirect() {
  redirect("/instruments?tab=real-estate");
}
