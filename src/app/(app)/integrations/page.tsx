import type { Metadata } from "next";
import { Suspense } from "react";
import { OwnerOnlyIntegrations } from "@/components/integrations/integrations-shared";
import { IntegrationsOverview } from "@/components/integrations/integrations-overview";

export const metadata: Metadata = { title: "Integrations · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <OwnerOnlyIntegrations>
        <IntegrationsOverview />
      </OwnerOnlyIntegrations>
    </Suspense>
  );
}
