import type { Metadata } from "next";
import { Suspense } from "react";
import { MyProfile } from "@/components/settings/account";

export const metadata: Metadata = { title: "My profile · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <MyProfile />
    </Suspense>
  );
}
