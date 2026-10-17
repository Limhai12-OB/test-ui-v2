import type { Metadata } from "next";
import { Suspense } from "react";
import { Security } from "@/components/settings/account";

export const metadata: Metadata = { title: "Password & security · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <Security />
    </Suspense>
  );
}
