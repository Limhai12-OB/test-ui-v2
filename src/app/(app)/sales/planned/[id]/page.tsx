import type { Metadata } from "next";
import { Suspense } from "react";
import { PlannedDetail } from "@/components/sales/planned";
import { buildOpsState } from "@/lib/mock/ops-data";

export function generateStaticParams() {
  const ids = buildOpsState().planned.map((p) => p.id);
  for (let n = 32; n <= 45; n++) ids.push(`PP-2026-00${n}`);
  return ids.map((id) => ({ id }));
}
export const metadata: Metadata = { title: "Planned purchase · FinanceSight" };

export default function Page() {
  return (
    <Suspense>
      <PlannedDetail />
    </Suspense>
  );
}
