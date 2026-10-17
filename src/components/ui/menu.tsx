"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/format";

export type MenuItem = {
  id: string;
  label: React.ReactNode;
  description?: string;
  icon?: React.ReactNode;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
};

/**
 * Small dropdown menu: a trigger button and a popover list. Closes on outside
 * click and Escape; arrow keys move between items.
 */
export function Menu({
  trigger,
  triggerLabel,
  triggerClassName,
  items,
  align = "start",
  width = 220,
  header,
}: {
  trigger: React.ReactNode;
  triggerLabel?: string;
  triggerClassName?: string;
  items: MenuItem[];
  align?: "start" | "end";
  width?: number;
  header?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    listRef.current?.querySelector<HTMLButtonElement>("[role=menuitem]:not([disabled])")?.focus();
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const nodes = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]:not([disabled])") ?? []);
    const index = nodes.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === "ArrowDown" ? index + 1 : index - 1;
    nodes[(next + nodes.length) % nodes.length]?.focus();
  };

  return (
    <div ref={rootRef} className="relative" onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={triggerLabel}
        onClick={() => setOpen((value) => !value)}
        className={cn("focus-ring cursor-pointer", triggerClassName)}
      >
        {trigger}
      </button>
      {open && (
        <div
          ref={listRef}
          id={menuId}
          role="menu"
          style={{ width }}
          className={cn(
            "absolute top-full z-50 mt-1.5 max-w-[calc(100vw-32px)] rounded-lg border border-line bg-surface p-1.5 shadow-md",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {header}
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                item.onSelect?.();
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm leading-5 text-body outline-none hover:bg-muted-bg focus-visible:bg-muted-bg disabled:cursor-not-allowed disabled:text-icon-subtle disabled:hover:bg-transparent"
            >
              {item.icon}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={cn("truncate", item.selected && "font-medium text-fg")}>{item.label}</span>
                {item.description && <span className="text-xs leading-4 text-muted">{item.description}</span>}
              </span>
              {item.selected && <Check size={16} className="text-brand" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
