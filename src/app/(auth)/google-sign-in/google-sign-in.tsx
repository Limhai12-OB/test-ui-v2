"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { InfoNote } from "@/components/ui/fields";
import { GOOGLE_ACCOUNT, signInWithGoogle } from "@/lib/mock/auth";
import { useSession } from "@/lib/session";

/** Frame 04.6 "Google Sign In — Signing in". */
export function GoogleSignIn() {
  const router = useRouter();
  const params = useSearchParams();
  const { signIn } = useSession();
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    signInWithGoogle().then((result) => {
      if (!result.ok) {
        setFailed(true);
        return;
      }
      signIn(result.data, params.get("remember") !== "0");
      router.replace("/dashboard");
    });
  }, [params, router, signIn]);

  if (failed) {
    return (
      <div className="text-center">
        <h1 className="text-[22px] leading-8 font-semibold text-fg">Google sign-in did not finish</h1>
        <p className="mt-2 text-[15px] leading-[22px] text-muted">
          <Link href="/sign-in" className="font-medium text-brand hover:underline">
            Go back to sign in
          </Link>{" "}
          and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center" role="status" aria-live="polite">
      <span className="inline-flex size-16 items-center justify-center rounded-full bg-primary-subtle">
        <span aria-hidden className="size-6 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
      </span>
      <h1 className="mt-8 text-xl leading-7 font-semibold text-fg">Signing you in with Google…</h1>
      <p className="mt-2 text-sm leading-[22px] text-muted">
        Checking {GOOGLE_ACCOUNT.email} and loading {GOOGLE_ACCOUNT.businessName}.
      </p>
      <div className="mt-6 w-full">
        <InfoNote>First time with Google? Business Setup comes next.</InfoNote>
      </div>
    </div>
  );
}
