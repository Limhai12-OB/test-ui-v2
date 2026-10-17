import type { Metadata } from "next";
import { Suspense } from "react";
import { EditProfile } from "@/components/settings/account";

export const metadata: Metadata = { title: "Edit profile · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <EditProfile />
    </Suspense>
  );
}
