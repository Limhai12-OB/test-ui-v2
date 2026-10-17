// Hairline UI · stepper-input · MIT License
// Copyright (c) 2026 Hairline UI · https://hairlineui.com/license#components

"use client";
"use no memo";

import * as React from "react";
import { NumberRoll } from "./number-roll";

/* ─────────────────────────────────────────────────────────
 * STEPPER INPUT: a tactile number control with acceleration
 *
 *   single tap   increments or decrements by step, rolling
 *                the odometer in the direction of travel
 *   holding      waits 300ms, then accelerates smoothly from
 *                100ms down to 30ms intervals with scaled steps
 *   boundary     hitting min or max bounds disables the action
 *                and gives the container an elastic bumper shake
 *   direct edit  clicking the number reveals an exact input,
 *                committing on blur or Enter, cancelling on Escape
 * ───────────────────────────────────────────────────────── */

export interface StepperInputProps {
  /** Accessible label, e.g. "Team seats" or "Border radius". */
  label: string;
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Large step for PageUp/PageDown and prolonged acceleration. Defaults to step * 10. */
  largeStep?: number;
  /** Optional unit appended to the number, e.g. "px", "%", "seats". */
  unit?: string;
  /** Format options passed to NumberRoll when not editing. */
  format?: Intl.NumberFormatOptions;
  /** Visual variant: "pill" for rounded-full, "field" for standard form input. */
  variant?: "pill" | "field";
  size?: "sm" | "default";
  disabled?: boolean;
  name?: string;
  className?: string;
}

const EASE = "cubic-bezier(0.16,1,0.3,1)";

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(reducedQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useReducedMotion = () =>
  React.useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false);

function MinusIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path d="M3.5 8h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

const shake = (el: HTMLElement | null, reduced: boolean) => {
  if (!el || reduced) return;
  el.animate(
    [
      { transform: "none" },
      { transform: "translateX(-3px)" },
      { transform: "translateX(3px)" },
      { transform: "translateX(-1.5px)" },
      { transform: "none" },
    ],
    { duration: 280, easing: "ease-out", composite: "add" }
  );
};

export function StepperInput({
  label,
  value: controlledValue,
  defaultValue = 0,
  onValueChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  largeStep,
  unit,
  format,
  variant = "pill",
  size = "default",
  disabled = false,
  name,
  className = "",
}: StepperInputProps) {
  const reduced = useReducedMotion();
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const currentVal = isControlled ? controlledValue : uncontrolledValue;

  const [editing, setEditing] = React.useState(false);
  const [editText, setEditText] = React.useState(String(currentVal));

  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const holdTimerRef = React.useRef<number | null>(null);
  const holdIntervalRef = React.useRef<number | null>(null);
  const holdStartRef = React.useRef<number>(0);

  const effectiveLargeStep = largeStep ?? step * 10;
  const atMin = currentVal <= min;
  const atMax = currentVal >= max;

  const clamp = React.useCallback(
    (n: number) => {
      let rounded = Math.round(n / step) * step;
      // Fix floating point precision, e.g. 0.1 + 0.2
      const stepDecimals = (step.toString().split(".")[1] || "").length;
      if (stepDecimals > 0) {
        rounded = Number(rounded.toFixed(stepDecimals));
      }
      return Math.min(max, Math.max(min, rounded));
    },
    [min, max, step]
  );

  const updateVal = React.useCallback(
    (nextRaw: number) => {
      const next = clamp(nextRaw);
      if (next === currentVal) {
        shake(rootRef.current, reduced);
        return false;
      }
      if (!isControlled) {
        setUncontrolledValue(next);
      }
      onValueChange?.(next);
      return true;
    },
    [clamp, currentVal, isControlled, onValueChange, reduced]
  );

  const stopHold = React.useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdIntervalRef.current !== null) {
      window.clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  }, []);

  const stepDelta = React.useCallback(
    (dir: 1 | -1, multiplier = 1) => {
      const delta = step * multiplier * dir;
      return updateVal(currentVal + delta);
    },
    [currentVal, step, updateVal]
  );

  const startHold = React.useCallback(
    (dir: 1 | -1) => {
      if (disabled) return;
      stopHold();

      // Immediate first step
      const canMove = stepDelta(dir, 1);
      if (!canMove) return;

      holdStartRef.current = Date.now();

      // 300ms initial pause before rapid firing
      holdTimerRef.current = window.setTimeout(() => {
        const tick = () => {
          const elapsed = Date.now() - holdStartRef.current;
          let mult = 1;
          let intervalTime = 90;

          if (elapsed > 2400) {
            mult = Math.max(1, Math.round(effectiveLargeStep / step));
            intervalTime = 30;
          } else if (elapsed > 1200) {
            mult = Math.max(1, Math.round((effectiveLargeStep / step) / 2));
            intervalTime = 55;
          }

          const ok = stepDelta(dir, mult);
          if (!ok) {
            stopHold();
            return;
          }

          holdIntervalRef.current = window.setTimeout(tick, intervalTime);
        };
        tick();
      }, 300);
    },
    [disabled, effectiveLargeStep, step, stepDelta, stopHold]
  );

  React.useEffect(() => {
    return () => stopHold();
  }, [stopHold]);

  // Sync edit text when value changes from outside while not editing
  React.useEffect(() => {
    if (!editing) {
      setEditText(String(currentVal));
    }
  }, [currentVal, editing]);

  const commitEdit = React.useCallback(() => {
    setEditing(false);
    const parsed = parseFloat(editText);
    if (!Number.isNaN(parsed)) {
      updateVal(parsed);
    } else {
      setEditText(String(currentVal));
    }
  }, [currentVal, editText, updateVal]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      stepDelta(1, 1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      stepDelta(-1, 1);
    } else if (e.key === "PageUp") {
      e.preventDefault();
      updateVal(currentVal + effectiveLargeStep);
    } else if (e.key === "PageDown") {
      e.preventDefault();
      updateVal(currentVal - effectiveLargeStep);
    } else if (e.key === "Home" && min !== -Infinity) {
      e.preventDefault();
      updateVal(min);
    } else if (e.key === "End" && max !== Infinity) {
      e.preventDefault();
      updateVal(max);
    } else if (editing) {
      if (e.key === "Enter") {
        e.preventDefault();
        commitEdit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setEditing(false);
        setEditText(String(currentVal));
      }
    }
  };

  const isSmall = size === "sm";
  const hCls = isSmall ? "h-7" : "h-9";
  const btnW = isSmall ? "w-7" : "w-8";
  const roundedCls = variant === "pill" ? "rounded-full" : "rounded-lg";

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label={label}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      className={`inline-flex ${hCls} items-center border border-line bg-surface p-0.5 select-none ${roundedCls} transition-[box-shadow,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${disabled ? "opacity-50 pointer-events-none" : ""} ${className}`}
      style={{
        boxShadow: "0 0 0 1px transparent",
      }}
    >
      {/* Hidden input for HTML form submissions */}
      {name && <input type="hidden" name={name} value={currentVal} />}

      {/* Decrement Button */}
      <button
        type="button"
        tabIndex={-1}
        aria-label={`Decrease ${label}`}
        disabled={disabled || atMin}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {}
          startHold(-1);
        }}
        onPointerUp={(e) => {
          try {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
              e.currentTarget.releasePointerCapture(e.pointerId);
            }
          } catch {}
          stopHold();
        }}
        onPointerCancel={stopHold}
        className={`flex ${btnW} h-full items-center justify-center ${variant === "pill" ? "rounded-full" : "rounded-md"} text-muted transition-colors hover:bg-muted-bg hover:text-fg active:scale-95 disabled:pointer-events-none disabled:opacity-30 cursor-pointer disabled:cursor-default touch-manipulation`}
      >
        <MinusIcon />
      </button>

      {/* Value Display / Direct Edit */}
      <div
        className="relative flex min-w-[3.25rem] flex-1 items-center justify-center px-2 font-num text-[13px] tabular-nums text-fg cursor-text"
        onClick={() => {
          if (disabled || editing) return;
          setEditing(true);
          setEditText(String(currentVal));
          setTimeout(() => inputRef.current?.select(), 10);
        }}
      >
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={commitEdit}
            className="w-full bg-transparent text-center font-num text-[13px] text-fg outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            autoFocus
          />
        ) : (
          <div className="flex items-baseline gap-1" aria-hidden="true">
            <NumberRoll value={currentVal} format={format} duration={260} />
            {unit && <span className="font-sans text-[11px] text-muted">{unit}</span>}
          </div>
        )}

        {/* Screen reader live value */}
        <span className="sr-only" role="status" aria-live="polite">
          {label}: {currentVal} {unit ?? ""}
        </span>
      </div>

      {/* Increment Button */}
      <button
        type="button"
        tabIndex={-1}
        aria-label={`Increase ${label}`}
        disabled={disabled || atMax}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {}
          startHold(1);
        }}
        onPointerUp={(e) => {
          try {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
              e.currentTarget.releasePointerCapture(e.pointerId);
            }
          } catch {}
          stopHold();
        }}
        onPointerCancel={stopHold}
        className={`flex ${btnW} h-full items-center justify-center ${variant === "pill" ? "rounded-full" : "rounded-md"} text-muted transition-colors hover:bg-muted-bg hover:text-fg active:scale-95 disabled:pointer-events-none disabled:opacity-30 cursor-pointer disabled:cursor-default touch-manipulation`}
      >
        <PlusIcon />
      </button>
    </div>
  );
}
