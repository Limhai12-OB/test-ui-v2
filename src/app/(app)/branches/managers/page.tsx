import type { Metadata } from "next";
import { Suspense } from "react";
import { OwnerOnlyBranches, ManagersList } from "@/components/branches/branches-list";

export const metadata: Metadata = { title: "Branch Managers · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <OwnerOnlyBranches>
        <ManagersList />
      </OwnerOnlyBranches>
    </Suspense>
  );
}
