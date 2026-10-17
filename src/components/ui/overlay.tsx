"use client";

import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { toast as hairlineToast, Toaster } from "@/components/hairline/toast-stack";
import { DialogClose } from "@/components/ui/dialog";
import { cn } from "@/lib/format";

/** Dialog header: optional 40px icon tile, 20/28 title, muted description and a close button. */
export function ModalHeader({
  id,
  title,
  description,
  icon,
  iconTone = "primary",
  onClose,
}: {
  id: string;
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  iconTone?: "primary" | "warning" | "error";
  onClose: () => void;
}) {
  const tones = { primary: "bg-primary-subtle text-brand", warning: "bg-warning-subtle text-icon-warning", error: "bg-error-subtle text-icon-error" };
  return (
    <div className="flex items-start gap-4 border-b border-line px-5 py-5 md:px-6">
      {icon && <span className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-[10px]", tones[iconTone])}>{icon}</span>}
      <div className="min-w-0 flex-1">
        <h2 id={id} className="text-xl leading-7 font-semibold text-fg">
          {title}
        </h2>
        {description && <p className="mt-1 text-sm leading-5 text-muted">{description}</p>}
      </div>
      <DialogClose onClose={onClose} />
    </div>
  );
}

export function ModalBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("px-5 py-5 md:px-6", className)}>{children}</div>;
}

export function ModalFooter({ children, note, className }: { children: React.ReactNode; note?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center justify-end gap-3 border-t border-line bg-subtle px-5 py-4 md:px-6", className)}>
      {note && <div className="mr-auto text-[13px] leading-5">{note}</div>}
      {children}
    </div>
  );
}

/** Right-hand sheet (transaction details). Full width on phones. */
export function Drawer({
  open,
  onClose,
  labelledBy,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="m-0 ml-auto h-dvh max-h-none w-full max-w-[480px] overflow-hidden border-l border-line bg-surface p-0 text-body shadow-md backdrop:bg-[rgb(17_24_39/0.55)]"
    >
      {open && (
        // Focus the panel itself on open so the close button does not show a focus ring.
        <div autoFocus tabIndex={-1} className="flex h-full flex-col outline-none">
          {children}
        </div>
      )}
    </dialog>
  );
}

type Toast = { title: string; body?: string; tone?: "success" | "error" | "info"; action?: { label: string; onClick: () => void } };
const ToastContext = createContext<((toast: Toast) => void) | null>(null);

/**
 * Toasts use the Hairline UI toast stack: they stack, fan out on hover, pause
 * while hovered and swipe away. Alt+T moves focus to them.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const push = useCallback((t: Toast) => {
    hairlineToast(t.title, { description: t.body, type: t.tone ?? "success", duration: 6000, action: t.action });
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <Toaster position="bottom-right" className="max-md:!bottom-24" />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
