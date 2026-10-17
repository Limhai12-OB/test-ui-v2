import type { Metadata } from "next";
import { Suspense } from "react";
import { OwnerOnlyIntegrations } from "@/components/integrations/integrations-shared";
import { TelegramIntegration } from "@/components/integrations/telegram-integration";

export const metadata: Metadata = { title: "Telegram · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <OwnerOnlyIntegrations>
        <TelegramIntegration />
      </OwnerOnlyIntegrations>
    </Suspense>
  );
}
