"use client";

import { forwardRef, useId, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronDown, CircleAlert, CircleCheck, Circle, Eye, EyeOff, Info, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/format";

type FieldState = "default" | "error" | "success" | "warning";
type FieldSize = "md" | "lg";

type FieldFrameProps = {
  label: string;
  /** Muted text after the label, e.g. "Optional". */
  labelHint?: string;
  state?: FieldState;
  /** Helper or error text under the control. */
  message?: React.ReactNode;
  size?: FieldSize;
  disabled?: boolean;
  className?: string;
};

/**
 * Label, control box and message shared by every form field. `lg` (48px) is
 * the auth screens' input; `md` (40px) is used inside the app and Business Setup.
 */
function FieldFrame({
  id,
  label,
  labelHint,
  state = "default",
  message,
  size = "lg",
  disabled,
  className,
  boxClassName,
  children,
}: FieldFrameProps & { id: string; boxClassName?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex min-w-0 flex-col", className)}>
      <label
        htmlFor={id}
        className={cn(
          "mb-1.5 leading-5 font-medium",
          size === "lg" ? "text-[13px]" : "text-sm",
          disabled ? "text-muted" : "text-fg",
        )}
      >
        {label}
        {labelHint && <span className="ml-1.5 font-normal text-muted">{labelHint}</span>}
      </label>
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-md border px-3 transition-colors focus-within:ring-2 focus-within:ring-primary/20",
          size === "lg" ? "h-12" : "min-h-10",
          state === "error" && "border-error focus-within:ring-error/20",
          state === "success" && "border-success focus-within:ring-success/20",
          state === "warning" && "border-warning bg-warning-subtle! focus-within:ring-warning/25",
          state === "default" && "border-icon-subtle focus-within:border-primary",
          disabled ? "border-line bg-muted-bg" : "bg-surface",
          boxClassName,
        )}
      >
        {children}
      </div>
      {message && (
        <p
          id={`${id}-message`}
          className={cn(
            "mt-1.5 text-[13px] leading-5",
            state === "error" ? "text-error-fg" : state === "success" ? "text-success-fg" : state === "warning" ? "text-warning-fg" : "text-muted",
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}

const controlClass =
  "h-full min-w-0 flex-1 bg-transparent text-sm leading-5 text-fg outline-none placeholder:text-placeholder disabled:text-muted";

type TextFieldProps = FieldFrameProps & {
  icon?: LucideIcon;
  password?: boolean;
  /** Content after the input, e.g. a unit such as "USD". */
  suffix?: React.ReactNode;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> & { type?: string };

/** Text input with optional icon, password toggle and status. */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, labelHint, icon: Icon, state = "default", message, size = "lg", password = false, suffix, className, type = "text", disabled, ...props },
  ref,
) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <FieldFrame id={id} label={label} labelHint={labelHint} state={state} message={message} size={size} disabled={disabled} className={className}>
      {Icon && <Icon size={size === "lg" ? 18 : 16} className="shrink-0 text-icon" aria-hidden />}
      <input
        ref={ref}
        id={id}
        type={password ? (visible ? "text" : "password") : type}
        disabled={disabled}
        aria-invalid={state === "error" || undefined}
        aria-describedby={message ? `${id}-message` : undefined}
        className={cn(controlClass, size === "md" && "h-10")}
        {...props}
      />
      {suffix}
      {password && (
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          disabled={disabled}
          aria-label={visible ? "Hide password" : "Show password"}
          className="focus-ring -mr-1 inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-icon hover:text-icon-strong disabled:cursor-not-allowed disabled:text-icon-subtle"
        >
          {visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
        </button>
      )}
      {state === "error" && <CircleAlert size={18} className="shrink-0 text-icon-error" aria-hidden />}
      {state === "success" && <CircleCheck size={18} className="shrink-0 text-icon-success" aria-hidden />}
    </FieldFrame>
  );
});

type SelectFieldProps = FieldFrameProps & {
  icon?: LucideIcon;
  options: { value: string; label: string; disabled?: boolean }[];
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size">;

/** Native select styled as a field, so keyboard and mobile pickers work as expected. */
export function SelectField({ label, labelHint, icon: Icon, state = "default", message, size = "md", options, className, disabled, ...props }: SelectFieldProps) {
  const id = useId();
  return (
    <FieldFrame id={id} label={label} labelHint={labelHint} state={state} message={message} size={size} disabled={disabled} className={className} boxClassName="relative pr-0">
      {Icon && <Icon size={16} className="shrink-0 text-icon" aria-hidden />}
      <select
        id={id}
        disabled={disabled}
        aria-invalid={state === "error" || undefined}
        aria-describedby={message ? `${id}-message` : undefined}
        className={cn(controlClass, "h-10 cursor-pointer appearance-none pr-9 disabled:cursor-not-allowed")}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 text-icon" aria-hidden />
    </FieldFrame>
  );
}

type TextAreaFieldProps = FieldFrameProps & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "size">;

export function TextAreaField({ label, labelHint, state = "default", message, className, disabled, rows = 3, ...props }: TextAreaFieldProps) {
  const id = useId();
  return (
    <FieldFrame id={id} label={label} labelHint={labelHint} state={state} message={message} size="md" disabled={disabled} className={className} boxClassName="py-2">
      <textarea
        id={id}
        rows={rows}
        disabled={disabled}
        aria-invalid={state === "error" || undefined}
        aria-describedby={message ? `${id}-message` : undefined}
        className={cn(controlClass, "resize-y")}
        {...props}
      />
    </FieldFrame>
  );
}

export function Checkbox({
  checked,
  onChange,
  disabled,
  children,
  invalid,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  invalid?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2.5 text-sm leading-5", disabled ? "cursor-not-allowed text-muted" : "text-fg")}>
      <span className="relative inline-flex size-[18px] shrink-0">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          onChange={(event) => onChange(event.target.checked)}
          className={cn(
            "peer size-[18px] cursor-pointer appearance-none rounded-[4px] border bg-surface checked:border-primary checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:checked:border-line-strong disabled:checked:bg-line-strong",
            invalid ? "border-error" : "border-icon-subtle",
          )}
        />
        <Check
          size={13}
          strokeWidth={3}
          aria-hidden
          className="pointer-events-none absolute top-[2.5px] left-[2.5px] hidden text-white peer-checked:block"
        />
      </span>
      <span>{children}</span>
    </label>
  );
}

export const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (value: string) => value.length >= 8 },
  { id: "number", label: "Contains a number", test: (value: string) => /\d/.test(value) },
  { id: "letter", label: "Contains a letter", test: (value: string) => /[a-z]/i.test(value) },
];

export function RuleList({ rules }: { rules: { id: string; label: string; met: boolean }[] }) {
  return (
    <ul className="mt-2 flex flex-col gap-1" aria-label="Password requirements">
      {rules.map((rule) => (
        <li
          key={rule.id}
          className={cn("flex items-center gap-2 text-[13px] leading-5", rule.met ? "text-success-fg" : "text-muted")}
        >
          {rule.met ? (
            <CircleCheck size={14} className="text-icon-success" aria-hidden />
          ) : (
            <Circle size={14} className="text-icon" aria-hidden />
          )}
          {rule.label}
          <span className="sr-only">{rule.met ? "(met)" : "(not met)"}</span>
        </li>
      ))}
    </ul>
  );
}

/** "G" tile used on the Google buttons; Figma uses a lettered tile rather than the Google logo. */
export function GoogleMark() {
  return (
    <span
      aria-hidden
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-xs font-semibold text-fg"
    >
      G
    </span>
  );
}

export function GoogleButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="focus-ring inline-flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-md border border-line-strong bg-surface text-base leading-6 font-medium text-fg hover:bg-subtle disabled:cursor-not-allowed disabled:bg-muted-bg disabled:text-muted"
      {...props}
    >
      <GoogleMark />
      {children}
    </button>
  );
}

export function OrDivider({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3 text-xs leading-4 text-muted" role="separator">
      <span className="h-px flex-1 bg-line" />
      {children}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-md bg-subtle px-3 py-2 text-xs leading-4 text-muted">
      <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export function BackLink({ href, children, onClick }: { href?: string; children: string; onClick?: () => void }) {
  const className =
    "focus-ring inline-flex w-fit cursor-pointer items-center gap-2 rounded-xs text-[13px] leading-5 font-medium text-body hover:text-fg";
  const content = (
    <>
      <ArrowLeft size={16} aria-hidden />
      {children}
    </>
  );
  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

export function SubmitButton({ loading, loadingLabel, children, ...props }: { loading?: boolean; loadingLabel?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="submit"
      aria-busy={loading || undefined}
      className="focus-ring inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2.5 rounded-md bg-primary text-base leading-6 font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed"
      {...props}
    >
      {loading ? (
        <>
          <span aria-hidden className="size-[18px] animate-spin rounded-full border-2 border-white/40 border-t-white" />
          {loadingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function FormError({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div role="alert" className="flex gap-3 rounded-md border border-error/30 bg-error-subtle px-4 py-3">
      <CircleAlert size={18} className="mt-0.5 shrink-0 text-icon-error" aria-hidden />
      <div className="text-sm leading-5 text-body">
        <p className="font-medium text-fg">{title}</p>
        <p className="mt-0.5">{children}</p>
      </div>
    </div>
  );
}
