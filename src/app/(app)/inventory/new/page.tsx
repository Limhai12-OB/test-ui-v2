import type { Metadata } from "next";
import { Suspense } from "react";
import { ItemForm } from "@/components/inventory/item-form";

export const metadata: Metadata = { title: "Add item · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <ItemForm mode="new" />
    </Suspense>
  );
}
