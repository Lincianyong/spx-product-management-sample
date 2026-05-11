import { redirect } from "next/navigation";

export default function RootPage() {
  // Auth gate happens client-side; this just bounces.
  redirect("/login");
}
