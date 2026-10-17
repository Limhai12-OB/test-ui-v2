import type { Metadata } from "next";
import { Suspense } from "react";
import { AiReview } from "@/components/banking/ai-review";

export const metadata: Metadata = { title: "Review AI categorisation · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <AiReview />
    </Suspense>
  );
}
