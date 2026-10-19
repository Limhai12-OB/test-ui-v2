import s from "./landing.module.css";
import { delay } from "./motion";

/** Badge + two-tone heading (second line muted) + optional intro. Fades up when scrolled into view. */
export default function SectionHead({
  badge,
  title,
  muted,
  intro,
  id,
}: {
  badge: string;
  title: string;
  muted: string;
  intro?: string;
  id?: string;
}) {
  return (
    <header className={s.head}>
      <span className={s.badge} data-reveal="">
        <i /> {badge}
      </span>
      <h2 id={id} className={s.title} data-reveal="" style={delay(1)}>
        {title}
        <br />
        <span className={s.mutedText}>{muted}</span>
      </h2>
      {intro && (
        <p className={s.intro} data-reveal="" style={delay(2)}>
          {intro}
        </p>
      )}
    </header>
  );
}
