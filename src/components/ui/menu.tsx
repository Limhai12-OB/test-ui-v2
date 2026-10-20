"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

/** Space between trigger and list, and the minimum gap kept from the viewport edges. */
const GAP = 6;
const EDGE = 8;

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
  // Where the list renders: a modal <dialog> sits in the top layer, so a menu inside one must render inside it to stay visible.
  const [host, setHost] = useState<HTMLElement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  // The list is portalled and fixed-positioned so cards, tables and dialogs with overflow can't clip it.
  // It opens below the trigger, flips above when there is more room there, and stays inside the viewport.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const trigger = triggerRef.current;
      const list = listRef.current;
      if (!trigger || !list) return;
      const t = trigger.getBoundingClientRect();
      list.style.maxHeight = "";
      const { width: w, height: h } = list.getBoundingClientRect();
      const below = window.innerHeight - t.bottom - GAP - EDGE;
      const above = t.top - GAP - EDGE;
      const up = h > below && above > below;
      const left = align === "end" ? t.right - w : t.left;
      list.style.left = `${Math.min(Math.max(EDGE, left), window.innerWidth - w - EDGE)}px`;
      list.style.top = `${up ? Math.max(EDGE, t.top - GAP - h) : t.bottom + GAP}px`;
      list.style.maxHeight = `${Math.max(120, up ? above : below)}px`;
      list.style.transformOrigin = `${align === "end" ? "right" : "left"} ${up ? "bottom" : "top"}`;
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !listRef.current?.contains(target)) setOpen(false);
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
    if (event.key === "Tab") {
      // The list lives at the end of the page; hand focus back so Tab continues from the trigger.
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
        onClick={(event) => {
          setHost(event.currentTarget.closest("dialog") ?? document.body);
          setOpen((value) => !value);
        }}
        className={cn("focus-ring cursor-pointer", triggerClassName)}
      >
        {trigger}
      </button>
      {open &&
        host &&
        createPortal(
          <div
            ref={listRef}
            id={menuId}
            role="menu"
            style={{ width }}
            className="fixed top-0 left-0 z-50 max-w-[calc(100vw-16px)] overflow-y-auto rounded-lg border border-line bg-surface p-1.5 shadow-md transition-[opacity,scale] duration-150 ease-out motion-reduce:transition-none starting:scale-95 starting:opacity-0"
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
          </div>,
          host,
        )}
    </div>
  );
}
