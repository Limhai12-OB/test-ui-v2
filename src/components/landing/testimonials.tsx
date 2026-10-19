"use client";

import { useEffect, useState } from "react";
import s from "./landing.module.css";
import Icon from "./icon";
import Avatar from "./avatar";
import { quotes } from "./content";

const AUTOPLAY_MS = 6000;

export default function Testimonials() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const q = quotes[i];
  const go = (d: number) => setI((n) => (n + d + quotes.length) % quotes.length);

  useEffect(() => {
    if (paused || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setI((n) => (n + 1) % quotes.length), AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [i, paused]);

  return (
    <section
      className={`${s.quoteWrap} ${s.container}`}
      aria-roledescription="carousel"
      aria-label="Customer quotes"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      data-reveal=""
    >
      <div className={s.quote}>
        <button type="button" className={s.arrow} onClick={() => go(-1)} aria-label="Previous quote">
          <Icon name="arrowLeft" size={16} />
        </button>

        <figure key={i} className={s.quoteBody} aria-live="polite">
          <Avatar name={q.name.replace("Sample ", "S ")} size={56} tone={i} />
          <blockquote>“{q.text}”</blockquote>
          <figcaption>
            <b>{q.name}</b>
            <small>{q.role}</small>
          </figcaption>
        </figure>

        <button type="button" className={s.arrow} onClick={() => go(1)} aria-label="Next quote">
          <Icon name="arrowRight" size={16} />
        </button>
      </div>

      <div className={s.dots} role="tablist" aria-label="Choose quote">
        {quotes.map((_, n) => (
          <button
            key={n}
            type="button"
            role="tab"
            aria-selected={n === i}
            aria-label={`Quote ${n + 1}`}
            className={n === i ? s.dotOn : undefined}
            onClick={() => setI(n)}
          >
            {n === i && !paused && <i key={i} style={{ animationDuration: `${AUTOPLAY_MS}ms` }} />}
          </button>
        ))}
      </div>
      <p className={s.placeholderNote}>Sample quotes: replace with real customer feedback.</p>
    </section>
  );
}
