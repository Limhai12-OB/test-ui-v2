import { redirect } from "next/navigation";

// Stock by branch now lives in the Items tab as the "Stock by branch" view.
export default function Page() {
  redirect("/inventory?view=branch");
}
