import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/format";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg" | "sm";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover disabled:bg-muted-bg disabled:text-icon-subtle",
  secondary:
    "border border-line-strong bg-surface text-fg hover:bg-subtle disabled:border-line disabled:text-icon-subtle",
  ghost: "text-body hover:bg-muted-bg disabled:text-icon-subtle",
  danger: "bg-error text-white hover:bg-error/90 disabled:bg-muted-bg disabled:text-icon-subtle",
};

// Button/MD in Figma: 40px tall, 16px side padding, 8px gap, Poppins Medium 14/20.
const sizes: Record<Size, string> = {
  sm: "h-8 gap-1.5 px-3 text-[13px] leading-[18px]",
  md: "h-10 gap-2 px-4 text-sm leading-5",
  lg: "h-12 gap-2 px-5 text-base leading-6",
};

type Common = {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  className?: string;
  children?: React.ReactNode;
};

function classes(variant: Variant, size: Size, className?: string) {
  return cn(
    "focus-ring inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md font-medium whitespace-nowrap transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100",
    variants[variant],
    sizes[size],
    className,
  );
}

function Content({ icon: Icon, iconRight: IconRight, children, size }: Common) {
  const iconSize = size === "sm" ? 14 : 16;
  return (
    <>
      {Icon && <Icon size={iconSize} strokeWidth={2} aria-hidden />}
      {children}
      {IconRight && <IconRight size={iconSize} strokeWidth={2} aria-hidden />}
    </>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  className,
  children,
  ...props
}: Common & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={classes(variant, size, className)} {...props}>
      <Content icon={icon} iconRight={iconRight} size={size}>
        {children}
      </Content>
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  className,
  children,
  href,
}: Common & { href: string }) {
  return (
    <Link href={href} className={classes(variant, size, className)}>
      <Content icon={icon} iconRight={iconRight} size={size}>
        {children}
      </Content>
    </Link>
  );
}

/** 32px square icon-only button (Figma "Icon button"). */
export function IconButton({
  icon: Icon,
  label,
  size = 32,
  iconSize = 16,
  className,
  ...props
}: { icon: LucideIcon; label: string; size?: 32 | 40; iconSize?: number } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "focus-ring inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md text-icon hover:bg-muted-bg hover:text-icon-strong",
        size === 40 ? "size-10" : "size-8",
        className,
      )}
      {...props}
    >
      <Icon size={iconSize} strokeWidth={2} aria-hidden />
    </button>
  );
}
