import type { Metadata } from "next";
import { Suspense } from "react";
import { OwnerOnlyIntegrations } from "@/components/integrations/integrations-shared";
import { WebillPage } from "@/components/integrations/webill";

export const metadata: Metadata = { title: "WeBill365 · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <OwnerOnlyIntegrations>
        <WebillPage />
      </OwnerOnlyIntegrations>
    </Suspense>
  );
}
