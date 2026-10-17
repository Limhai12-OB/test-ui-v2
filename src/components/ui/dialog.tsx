"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/format";

/**
 * Modal built on the native <dialog> element (focus trapping and Escape come
 * from the browser). Centred on desktop; a bottom sheet below 768px, as frame
 * 20.1 specifies.
 */
export function Dialog({
  open,
  onClose,
  labelledBy,
  width = 440,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  /** Desktop width in px (Figma dialogs are 440, 520, 600 or 640). */
  width?: number;
  className?: string;
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
      style={{ "--dialog-w": `${width}px` } as React.CSSProperties}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-2xl border border-line bg-surface p-0 text-body shadow-md backdrop:bg-[rgb(17_24_39/0.55)]",
        "md:m-auto md:max-h-[calc(100dvh-48px)] md:w-[calc(100%-48px)] md:max-w-[var(--dialog-w)] md:rounded-2xl",
        className,
      )}
    >
      {open && (
        <div autoFocus tabIndex={-1} className="outline-none">
          {children}
        </div>
      )}
    </dialog>
  );
}

export function DialogClose({ onClose, label = "Close" }: { onClose: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label={label}
      className="focus-ring inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-icon hover:bg-muted-bg"
    >
      <X size={18} aria-hidden />
    </button>
  );
}
