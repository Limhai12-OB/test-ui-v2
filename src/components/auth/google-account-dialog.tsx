"use client";

import { ChevronRight, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { GOOGLE_ACCOUNT } from "@/lib/mock/auth";
import { initials } from "@/lib/session";
import { GoogleMark } from "@/components/ui/fields";

/**
 * Frame 04.6 "Google Sign In — Choose account". This is a stand-in for
 * Google's own account chooser; real Google OAuth is not connected.
 */
export function GoogleAccountDialog({
  open,
  onClose,
  onChoose,
}: {
  open: boolean;
  onClose: () => void;
  onChoose: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} labelledBy="google-dialog-title">
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <GoogleMark />
        <p className="flex-1 text-[15px] leading-[22px] font-medium text-fg">Sign in with Google</p>
        <DialogClose onClose={onClose} />
      </div>
      <div className="px-6 pt-6 pb-6">
        <h2 id="google-dialog-title" className="text-xl leading-7 font-semibold text-fg">
          Choose an account
        </h2>
        <p className="mt-1 text-[15px] leading-[22px] text-muted">to continue to LuyFlow</p>
        <div className="mt-5 overflow-hidden rounded-lg border border-line">
          <button
            type="button"
            onClick={onChoose}
            className="flex w-full cursor-pointer items-center gap-3 border-b border-line bg-subtle px-4 py-3.5 text-left outline-none hover:bg-muted-bg focus-visible:bg-muted-bg"
          >
            <Avatar initials={initials(GOOGLE_ACCOUNT.name)} size={40} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[15px] leading-[22px] font-medium text-fg">{GOOGLE_ACCOUNT.name}</span>
              <span className="truncate text-sm leading-5 text-body">{GOOGLE_ACCOUNT.email}</span>
            </span>
            <ChevronRight size={16} className="text-icon" aria-hidden />
          </button>
          <button
            type="button"
            disabled
            title="Only the demo account is available"
            className="flex w-full cursor-not-allowed items-center gap-3 px-4 py-3.5 text-left"
          >
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-muted-bg text-icon">
              <UserPlus size={18} aria-hidden />
            </span>
            <span className="flex flex-col">
              <span className="text-[15px] leading-[22px] font-medium text-fg">Use another account</span>
              <span className="text-xs leading-4 text-muted">Not available in this demo</span>
            </span>
          </button>
        </div>
        <p className="mt-4 text-[13px] leading-5 text-muted">
          Google will share your name, email address and profile picture with LuyFlow.
        </p>
      </div>
    </Dialog>
  );
}
