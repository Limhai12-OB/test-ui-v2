"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts a value like "14.5K" or "350+" up from zero each time it scrolls into view,
 * and resets once it has fully left the viewport.
 */
export default function CountUp({ value, duration = 1400 }: { value: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [text, setText] = useState(value);

  useEffect(() => {
    const m = value.match(/^([\d.]+)(.*)$/);
    const el = ref.current;
    if (!m || !el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const target = parseFloat(m[1]);
    const decimals = (m[1].split(".")[1] ?? "").length;
    const suffix = m[2];
    const format = (n: number) => `${n.toFixed(decimals)}${suffix}`;
    setText(format(0));

    let raf = 0;
    let running = false; // true from the moment a count starts until the element fully leaves
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) {
          cancelAnimationFrame(raf);
          running = false;
          setText(format(0));
          return;
        }
        if (running || e.intersectionRatio < 0.4) return;
        running = true;
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          setText(format(target * (1 - Math.pow(1 - t, 3))));
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: [0, 0.4] },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  return (
    <span ref={ref} aria-label={value}>
      {text}
    </span>
  );
}
