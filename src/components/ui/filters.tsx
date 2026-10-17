"use client";

import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Download, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";
import { cn } from "@/lib/format";

/** 40px search input used at the start of filter bars. */
export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label?: string;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex h-10 min-w-0 items-center gap-2 rounded-md border border-icon-subtle bg-surface px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 md:w-[280px]",
        className,
      )}
    >
      <Search size={16} className="shrink-0 text-icon" aria-hidden />
      <span className="sr-only">{label ?? placeholder}</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm leading-5 text-fg outline-none placeholder:text-placeholder [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button type="button" onClick={() => onChange("")} aria-label="Clear search" className="focus-ring cursor-pointer rounded-xs text-icon hover:text-icon-strong">
          <X size={14} aria-hidden />
        </button>
      )}
    </label>
  );
}

/**
 * Filter dropdown ("Type ⌄"). With a value selected it turns into the blue
 * "Label: value ×" chip from the design; × clears it.
 */
export function FilterMenu({
  label,
  value,
  options,
  onChange,
  icon,
  width = 220,
}: {
  label: string;
  value: string | null;
  options: { value: string; label: string }[];
  onChange: (value: string | null) => void;
  icon?: "calendar";
  width?: number;
}) {
  const selected = options.find((option) => option.value === value);
  const Icon = icon === "calendar" ? Calendar : null;
  if (selected) {
    return (
      <div className="inline-flex h-10 items-center gap-1.5 rounded-md border border-primary/40 bg-primary-subtle pr-1.5 pl-3 text-sm leading-5 text-brand">
        <Menu
          width={width}
          triggerLabel={`${label}: ${selected.label}. Change`}
          triggerClassName="inline-flex items-center gap-1.5 rounded-xs whitespace-nowrap"
          trigger={
            <>
              {Icon && <Icon size={16} aria-hidden />}
              <span className="font-medium">{label}:</span> {selected.label}
            </>
          }
          items={options.map((option) => ({ id: option.value, label: option.label, selected: option.value === value, onSelect: () => onChange(option.value) }))}
        />
        <button type="button" onClick={() => onChange(null)} aria-label={`Clear ${label} filter`} className="focus-ring inline-flex size-6 cursor-pointer items-center justify-center rounded-xs hover:bg-primary/10">
          <X size={14} aria-hidden />
        </button>
      </div>
    );
  }
  return (
    <Menu
      width={width}
      triggerLabel={`Filter by ${label}`}
      triggerClassName="inline-flex h-10 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-3 text-sm leading-5 font-medium whitespace-nowrap text-fg hover:bg-subtle"
      trigger={
        <>
          {Icon && <Icon size={16} className="text-icon-strong" aria-hidden />}
          {label}
          <ChevronDown size={16} className="text-icon-strong" aria-hidden />
        </>
      }
      items={options.map((option) => ({ id: option.value, label: option.label, onSelect: () => onChange(option.value) }))}
    />
  );
}

export function FilterBar({ children, onExport, className }: { children: React.ReactNode; onExport?: () => void; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3 p-4", className)}>
      {children}
      {onExport && (
        <Button variant="secondary" icon={Download} onClick={onExport} className="md:ml-auto">
          Export
        </Button>
      )}
    </div>
  );
}

function pageList(page: number, pages: number): (number | "…")[] {
  if (pages <= 5) return Array.from({ length: pages }, (_, i) => i + 1);
  if (page <= 3) return [1, 2, 3, "…", pages];
  if (page >= pages - 2) return [1, "…", pages - 2, pages - 1, pages];
  return [1, "…", page, "…", pages];
}

/** Card footer: "Showing 1–8 of 36 bills" and numbered pages. */
export function Pagination({
  page,
  pageSize,
  total,
  noun,
  onPage,
  onPageSize,
}: {
  page: number;
  pageSize: number;
  total: number;
  noun: string;
  onPage: (page: number) => void;
  onPageSize?: (size: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(total, page * pageSize);
  const arrow = "focus-ring inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-icon hover:bg-muted-bg disabled:cursor-not-allowed disabled:text-icon-subtle disabled:hover:bg-transparent";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 md:px-5">
      <p className="text-[13px] leading-5 text-muted">
        Showing {from}–{to} of {total} {noun}
      </p>
      <div className="flex items-center gap-4">
        {onPageSize && (
          <label className="hidden items-center gap-2 text-[13px] leading-5 text-muted sm:flex">
            Rows per page
            <select
              value={pageSize}
              onChange={(event) => onPageSize(Number(event.target.value))}
              className="focus-ring h-8 cursor-pointer rounded-md border border-line-strong bg-surface px-2 text-[13px] text-fg"
            >
              {[10, 25, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
        <nav aria-label="Pagination" className="flex items-center gap-1">
          <button type="button" className={arrow} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
            <ChevronLeft size={16} aria-hidden />
          </button>
          {pageList(page, pages).map((item, index) =>
            item === "…" ? (
              <span key={`gap-${index}`} className="w-6 text-center text-[13px] text-muted" aria-hidden>
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPage(item)}
                aria-current={item === page ? "page" : undefined}
                className={cn(
                  "focus-ring inline-flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-md px-2 text-[13px] leading-5",
                  item === page ? "border border-primary/40 bg-primary-subtle font-medium text-brand" : "text-body hover:bg-muted-bg",
                )}
              >
                {item}
              </button>
            ),
          )}
          <button type="button" className={arrow} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
            <ChevronRight size={16} aria-hidden />
          </button>
        </nav>
      </div>
    </div>
  );
}

/** Slices `rows` for the current page and clamps the page when filters shrink the list. */
export function paginate<T>(rows: T[], page: number, pageSize: number) {
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages);
  return { current, slice: rows.slice((current - 1) * pageSize, current * pageSize) };
}
