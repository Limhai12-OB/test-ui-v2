import { cn } from "@/lib/format";

/** Figma "Avatar" (type Initials, size SM = 32px). */
export function Avatar({ initials, size = 32, className }: { initials: string; size?: 32 | 40; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-primary-subtle font-medium text-brand",
        size === 40 ? "size-10 text-[13px] leading-[18px]" : "size-8 text-xs leading-4",
        className,
      )}
    >
      {initials}
    </span>
  );
}
