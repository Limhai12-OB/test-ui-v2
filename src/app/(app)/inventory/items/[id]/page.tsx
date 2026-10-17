import type { Metadata } from "next";
import { Suspense } from "react";
import { ItemDetail } from "@/components/inventory/item-detail";
import { ITEMS } from "@/lib/mock/ops-data";

export function generateStaticParams() {
  return ITEMS.map((item) => ({ id: item.id }));
}
export const metadata: Metadata = { title: "Item · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <ItemDetail />
    </Suspense>
  );
}
