import { redirect } from "next/navigation";

export default function PfcaFdsRedirect() {
  redirect("/instruments?tab=pfca-fds");
}
