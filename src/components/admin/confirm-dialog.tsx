"use client";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/format";

/**
 * Small confirmation dialog: round icon on the left, title, text and two
 * buttons (07.10 main branch, 17.6 unlink Google, 17.14 final deletion).
 */
export function ConfirmDialog({
  open,
  onClose,
  id,
  icon,
  tone = "warning",
  title,
  children,
  cancelLabel = "Cancel",
  confirmLabel,
  confirmVariant = "primary",
  onConfirm,
  focusCancel = false,
}: {
  open: boolean;
  onClose: () => void;
  id: string;
  icon: React.ReactNode;
  tone?: "warning" | "error";
  title: string;
  children: React.ReactNode;
  cancelLabel?: string;
  confirmLabel: string;
  confirmVariant?: "primary" | "secondary" | "danger";
  onConfirm: () => void;
  /** Put focus on the safe choice (Figma shows "Keep linked" focused). */
  focusCancel?: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} labelledBy={id} width={480}>
      <div role="alertdialog" aria-labelledby={id} className="flex gap-4 p-6">
        <span
          className={cn(
            "inline-flex size-11 shrink-0 items-center justify-center rounded-full",
            tone === "error" ? "bg-error-subtle text-icon-error" : "bg-warning-subtle text-icon-warning",
          )}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={id} className="text-lg leading-7 font-semibold text-fg">
            {title}
          </h2>
          <div className="mt-1.5 text-sm leading-[22px] text-muted">{children}</div>
          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={onClose} autoFocus={focusCancel}>
              {cancelLabel}
            </Button>
            <Button variant={confirmVariant} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
