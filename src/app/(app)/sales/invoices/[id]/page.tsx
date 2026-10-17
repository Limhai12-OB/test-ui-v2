import type { Metadata } from "next";
import { Suspense } from "react";
import { InvoiceRoute } from "@/components/sales/invoice-detail";
import { buildOpsState } from "@/lib/mock/ops-data";

export function generateStaticParams() {
  const ids = buildOpsState().invoices.map((invoice) => invoice.id);
  // Numbers the app hands out next (new invoices, conversions, voice drafts).
  for (let n = 157; n <= 175; n++) ids.push(`INV-2026-0${n}`);
  return ids.map((id) => ({ id }));
}
export const metadata: Metadata = { title: "Invoice · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <InvoiceRoute />
    </Suspense>
  );
}
