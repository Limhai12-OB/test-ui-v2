import type { Metadata } from "next";
import { ImportHome } from "@/components/data-import/import-home";

export const metadata: Metadata = { title: "Data Import · FinanceSight" };

export default function Page() {
  return <ImportHome />;
}
