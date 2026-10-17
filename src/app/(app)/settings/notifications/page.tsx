import type { Metadata } from "next";
import { Suspense } from "react";
import { NotificationSettings } from "@/components/settings/account";

export const metadata: Metadata = { title: "Notification settings · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <NotificationSettings />
    </Suspense>
  );
}
