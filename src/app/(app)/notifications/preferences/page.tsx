import type { Metadata } from "next";
import { Suspense } from "react";
import { NotificationPreferences } from "@/components/notifications/preferences";

export const metadata: Metadata = { title: "Notification preferences · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <NotificationPreferences />
    </Suspense>
  );
}
