import type { Metadata } from "next";
import { Suspense } from "react";
import { NotificationCenter } from "@/components/notifications/notification-center";

export const metadata: Metadata = { title: "Notifications · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <NotificationCenter />
    </Suspense>
  );
}
