import { redirect } from "next/navigation";

// Stock by branch now lives on the Items page as the "Stock" tab.
export default function Page() {
  redirect("/inventory?view=stock");
}
