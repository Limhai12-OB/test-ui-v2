import type { Metadata } from "next";
import { Suspense } from "react";
import { OwnerOnlyIntegrations } from "@/components/integrations/integrations-shared";
import { ShopifyPage } from "@/components/integrations/shopify";

export const metadata: Metadata = { title: "Shopify · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <OwnerOnlyIntegrations>
        <ShopifyPage />
      </OwnerOnlyIntegrations>
    </Suspense>
  );
}
