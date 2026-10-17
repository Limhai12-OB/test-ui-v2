import type { Metadata } from "next";
import { Suspense } from "react";
import { OwnerOnlyBranches } from "@/components/branches/branches-list";
import { AddBranch } from "@/components/branches/branch-form";

export const metadata: Metadata = { title: "Add branch · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <OwnerOnlyBranches>
        <AddBranch />
      </OwnerOnlyBranches>
    </Suspense>
  );
}
