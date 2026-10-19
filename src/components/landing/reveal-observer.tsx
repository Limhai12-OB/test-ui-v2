"use client";

import { useEffect } from "react";

/**
 * Toggles `data-shown` on every `[data-reveal]` element as it scrolls in and out of view,
 * so reveal animations replay each time a section is reached (scrolling down or back up).
 * An element is shown once 12% of it is visible and only reset after it has fully left
 * the viewport, which avoids flicker at the edge.
 * CSS (landing.module.css) only hides those elements when <html> has the `js` class,
 * so content stays visible if scripts are disabled.
 */
export default function RevealObserver() {
  useEffect(() => {
    document.documentElement.classList.add("js");
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.setAttribute("data-shown", ""));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio >= 0.12) e.target.setAttribute("data-shown", "");
          else if (!e.isIntersecting) e.target.removeAttribute("data-shown");
        }),
      { rootMargin: "0px 0px -8% 0px", threshold: [0, 0.12] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}
