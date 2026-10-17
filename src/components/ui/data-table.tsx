"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/format";

export type Column<T> = {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  align?: "left" | "right" | "center";
  /** CSS width for the <col>, e.g. "120px" or "18%". */
  width?: string;
  className?: string;
  /** Visually hidden header (checkbox and action columns). */
  srHeader?: boolean;
};

export type SortState = { key: string; dir: "asc" | "desc" };

/**
 * Table in the style of the Figma "Table" component: 44px header on a subtle
 * background, 56px rows with a subtle bottom border. Below 768px it renders
 * `mobileRow` for each row instead (tables become cards, frame 20.1).
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  onRowClick,
  rowClassName,
  mobileRow,
  sort,
  sortable = [],
  onSort,
  empty,
  minWidth = 760,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  caption: string;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  mobileRow?: (row: T) => React.ReactNode;
  sort?: SortState;
  sortable?: string[];
  onSort?: (sort: SortState) => void;
  empty?: React.ReactNode;
  minWidth?: number;
}) {
  if (!rows.length) {
    return <div className="px-5 py-12 text-center text-sm leading-5 text-muted">{empty ?? "Nothing to show."}</div>;
  }

  const clickable = (row: T) =>
    onRowClick
      ? {
          tabIndex: 0,
          onClick: (event: React.MouseEvent) => {
            if ((event.target as HTMLElement).closest("button, a, input, select, label")) return;
            onRowClick(row);
          },
          onKeyDown: (event: React.KeyboardEvent) => {
            if (event.key === "Enter" && event.target === event.currentTarget) onRowClick(row);
          },
        }
      : {};

  return (
    <>
      <div className={cn("relative overflow-x-auto", mobileRow && "hidden md:block")}>
        <table className="w-full table-fixed border-collapse text-left" style={{ minWidth }}>
          <caption className="sr-only">{caption}</caption>
          <colgroup>
            {columns.map((column) => (
              <col key={column.key} style={column.width ? { width: column.width } : undefined} />
            ))}
          </colgroup>
          <thead>
            <tr className="h-11 border-b border-line bg-subtle">
              {columns.map((column) => {
                const isSortable = sortable.includes(column.key) && onSort;
                const active = sort?.key === column.key;
                const SortIcon = active && sort?.dir === "asc" ? ArrowUp : ArrowDown;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={active ? (sort?.dir === "asc" ? "ascending" : "descending") : undefined}
                    className={cn(
                      "px-4 text-xs leading-4 font-medium whitespace-nowrap text-muted",
                      column.align === "right" && "text-right",
                      column.align === "center" && "text-center",
                      active && "text-fg",
                    )}
                  >
                    {column.srHeader ? (
                      <span className="sr-only">{column.header}</span>
                    ) : isSortable ? (
                      <button
                        type="button"
                        onClick={() => onSort!({ key: column.key, dir: active && sort?.dir === "desc" ? "asc" : "desc" })}
                        className={cn("focus-ring inline-flex cursor-pointer items-center gap-1 rounded-xs", column.align === "right" && "flex-row-reverse")}
                      >
                        {column.header}
                        <SortIcon size={14} className={active ? "text-icon-strong" : "text-icon-subtle"} aria-hidden />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                {...clickable(row)}
                className={cn(
                  "h-14 border-b border-line-subtle last:border-b-0",
                  onRowClick && "cursor-pointer outline-none hover:bg-subtle focus-visible:bg-subtle focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-inset",
                  rowClassName?.(row),
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "px-4 py-2 text-[13px] leading-5 text-body",
                      column.align === "right" && "text-right",
                      column.align === "center" && "text-center",
                      column.className,
                    )}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {mobileRow && (
        <ul className="flex flex-col md:hidden" aria-label={caption}>
          {rows.map((row) => (
            <li
              key={rowKey(row)}
              {...clickable(row)}
              className={cn(
                "border-b border-line-subtle px-4 py-3 last:border-b-0",
                onRowClick && "cursor-pointer outline-none active:bg-subtle focus-visible:bg-subtle",
                rowClassName?.(row),
              )}
            >
              {mobileRow(row)}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Two-line cell: primary text over a muted 12px line. */
export function TwoLine({ title, sub, titleClassName }: { title: React.ReactNode; sub?: React.ReactNode; titleClassName?: string }) {
  return (
    <div className="min-w-0">
      <p className={cn("truncate text-[13px] leading-5 font-medium text-fg", titleClassName)}>{title}</p>
      {sub && <p className="truncate text-xs leading-4 text-muted">{sub}</p>}
    </div>
  );
}

/** Generic phone row: title/sub on the left, value/sub on the right. */
export function MobileRow({
  leading,
  title,
  sub,
  value,
  valueSub,
  valueClassName,
}: {
  leading?: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  value?: React.ReactNode;
  valueSub?: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {leading}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] leading-5 font-medium text-fg">{title}</div>
        {sub && <div className="truncate text-xs leading-4 text-muted">{sub}</div>}
      </div>
      {(value || valueSub) && (
        <div className="shrink-0 text-right">
          {value && <div className={cn("text-[13px] leading-5 text-fg", valueClassName)}>{value}</div>}
          {valueSub && <div className="text-xs leading-4 text-muted">{valueSub}</div>}
        </div>
      )}
    </div>
  );
}
