import { redirect } from "next/navigation";

// Movement history now lives in the Adjustments tab as the "All movements" view.
export default async function Page({ searchParams }: { searchParams: Promise<{ item?: string }> }) {
  const { item } = await searchParams;
  redirect(`/inventory/adjustments?view=movements${item ? `&item=${encodeURIComponent(item)}` : ""}`);
}
