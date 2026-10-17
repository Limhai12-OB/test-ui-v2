import type { Metadata } from "next";
import { Suspense } from "react";
import { OwnerOnlyBranches, BranchesList } from "@/components/branches/branches-list";

export const metadata: Metadata = { title: "Branches · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <OwnerOnlyBranches>
        <BranchesList />
      </OwnerOnlyBranches>
    </Suspense>
  );
}
