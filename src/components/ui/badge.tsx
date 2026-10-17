import { cn } from "@/lib/format";
import type { Tone } from "@/lib/mock/dashboard";

export type BadgeTone = Tone | "sky" | "violet";

const tones: Record<BadgeTone, { bg: string; fg: string; dot: string }> = {
  neutral: { bg: "bg-muted-bg", fg: "text-body", dot: "bg-icon" },
  success: { bg: "bg-success-subtle", fg: "text-success-fg", dot: "bg-success" },
  error: { bg: "bg-error-subtle", fg: "text-error-fg", dot: "bg-error" },
  warning: { bg: "bg-warning-subtle", fg: "text-warning-fg", dot: "bg-warning" },
  info: { bg: "bg-primary-subtle", fg: "text-brand", dot: "bg-primary" },
  sky: { bg: "bg-info-subtle", fg: "text-info-fg", dot: "bg-icon-info" },
  violet: { bg: "bg-ai-subtle", fg: "text-ai-fg", dot: "bg-icon-ai" },
};

/** Figma "Badge" (Soft style). MD is 24px tall, SM is 20px. */
export function Badge({
  tone = "neutral",
  size = "md",
  dot = false,
  children,
  className,
}: {
  tone?: BadgeTone;
  size?: "sm" | "md";
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const t = tones[tone];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full text-xs leading-4 font-medium whitespace-nowrap",
        size === "md" ? "h-6 px-2.5" : "h-5 px-2",
        t.bg,
        t.fg,
        className,
      )}
    >
      {dot && <span aria-hidden className={cn("size-1.5 rounded-full", t.dot)} />}
      {children}
    </span>
  );
}
