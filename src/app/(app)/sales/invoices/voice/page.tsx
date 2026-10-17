import type { Metadata } from "next";
import { Suspense } from "react";
import { VoiceToInvoice } from "@/components/sales/voice";

export const metadata: Metadata = { title: "Voice to invoice · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <VoiceToInvoice />
    </Suspense>
  );
}
