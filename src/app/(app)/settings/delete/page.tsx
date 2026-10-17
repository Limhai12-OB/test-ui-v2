import type { Metadata } from "next";
import { Suspense } from "react";
import { DeleteAccount } from "@/components/settings/delete-account";

export const metadata: Metadata = { title: "Delete account · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <DeleteAccount />
    </Suspense>
  );
}
