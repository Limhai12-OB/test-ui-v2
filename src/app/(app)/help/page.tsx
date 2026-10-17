import type { Metadata } from "next";
import { Help } from "@/components/help/help";

export const metadata: Metadata = { title: "Help · FinanceSight" };

export default function Page() {
  return <Help />;
}
