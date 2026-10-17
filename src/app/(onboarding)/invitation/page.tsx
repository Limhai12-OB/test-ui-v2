import type { Metadata } from "next";
import { Suspense } from "react";
import { Invitation } from "./invitation";

export const metadata: Metadata = { title: "Invitation · FinanceSight" };

export default function InvitationPage() {
  return (
    <Suspense>
      <Invitation />
    </Suspense>
  );
}
