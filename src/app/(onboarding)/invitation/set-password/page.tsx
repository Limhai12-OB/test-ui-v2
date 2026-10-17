import type { Metadata } from "next";
import { Suspense } from "react";
import { SetPassword } from "./set-password";

export const metadata: Metadata = { title: "Finish setting up your account · FinanceSight" };

export default function SetPasswordPage() {
  return (
    <Suspense>
      <SetPassword />
    </Suspense>
  );
}
