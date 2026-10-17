import type { Metadata } from "next";
import { Suspense } from "react";
import { CategoriesPage } from "@/components/records/categories";

export const metadata: Metadata = { title: "Categories · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <CategoriesPage />
    </Suspense>
  );
}
