import type { Metadata } from "next";
import { Suspense } from "react";
import { InvoiceEditor } from "@/components/sales/invoice-editor";

export const metadata: Metadata = { title: "Create invoice · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <InvoiceEditor />
    </Suspense>
  );
}
