import type { Metadata } from "next";
import { Suspense } from "react";
import { ItemForm } from "@/components/inventory/item-form";
import { ITEMS } from "@/lib/mock/ops-data";

export function generateStaticParams() {
  return ITEMS.map((item) => ({ id: item.id }));
}
export const metadata: Metadata = { title: "Edit item · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <ItemForm mode="edit" />
    </Suspense>
  );
}
