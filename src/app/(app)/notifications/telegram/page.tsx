import type { Metadata } from "next";
import { Suspense } from "react";
import { TelegramAlerts } from "@/components/notifications/telegram";

export const metadata: Metadata = { title: "Telegram alerts · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <TelegramAlerts />
    </Suspense>
  );
}
