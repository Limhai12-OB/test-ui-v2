import type { Metadata } from "next";
import { Suspense } from "react";
import { OwnerOnlyBranches } from "@/components/branches/branches-list";
import { EditBranch } from "@/components/branches/branch-form";
import { BRANCH_SEED, NEW_BRANCH_IDS } from "@/lib/mock/admin-data";

export function generateStaticParams() {
  return [...BRANCH_SEED.map((b) => b.id), ...NEW_BRANCH_IDS].map((id) => ({ id }));
}

export const metadata: Metadata = { title: "Edit branch · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <OwnerOnlyBranches>
        <EditBranch />
      </OwnerOnlyBranches>
    </Suspense>
  );
}
