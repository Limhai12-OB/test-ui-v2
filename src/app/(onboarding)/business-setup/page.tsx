import type { Metadata } from "next";
import { BusinessSetup } from "./business-setup";

export const metadata: Metadata = { title: "Business setup · FinanceSight" };

export default function BusinessSetupPage() {
  return <BusinessSetup />;
}
