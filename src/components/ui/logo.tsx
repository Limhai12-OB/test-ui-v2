import Image from "next/image";
import { cn } from "@/lib/format";

/**
 * FinanceSight logo (Figma component "Logo", type Full). The mark is the
 * exported Figma asset; the inverse mark is used on the blue auth panel.
 */
export function Logo({
  inverse = false,
  showText = true,
  className,
}: {
  inverse?: boolean;
  showText?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src={inverse ? "/figma/logo-mark-inverse.svg" : "/figma/logo-mark.svg"}
        alt=""
        width={32}
        height={32}
        priority
        unoptimized
      />
      {showText && (
        <span className={cn("text-xl leading-7 font-semibold", inverse ? "text-white" : "text-fg")}>
          FinanceSight
        </span>
      )}
    </span>
  );
}
