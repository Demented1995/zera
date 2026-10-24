import { redirect } from "next/navigation";

/** Stage 6.1: commercial catalog lives under Modele de oglinzi. */
export default function ProduseRedirectPage() {
  redirect("/admin/modele");
}
