import s from "./landing.module.css";
import Icon from "./icon";
import Avatar from "./avatar";
import { stats } from "./content";
import CountUp from "./count-up";
import { delay } from "./motion";

export default function Cta() {
  return (
    <section className={s.cta} aria-labelledby="cta-title">
      <div className={s.ctaTiles} aria-hidden="true">
        {Array.from({ length: 40 }, (_, i) => (
          <i key={i} style={{ "--n": i % 7 } as React.CSSProperties} />
        ))}
      </div>

      <div className={s.floaters} aria-hidden="true">
        <span className={`${s.floatTile} ${s.ft1}`}>
          <Icon name="sparkle" size={26} />
        </span>
        <span className={`${s.floatTile} ${s.ft2}`}>
          <Icon name="chart" size={24} />
        </span>
        <span className={`${s.floatChip} ${s.ft3}`}>
          <span className={s.up}>✓</span> Telegram alert sent
        </span>
        <span className={`${s.floatChip} ${s.ft4}`}>
          <span className={s.avatarStack}>
            {["Ana Li", "Ben Ko", "Cy Ma"].map((n, i) => (
              <Avatar key={n} name={n} size={22} tone={i} />
            ))}
          </span>
          Branch team synced
        </span>
        <span className={`${s.floatTile} ${s.ft5}`}>
          <Icon name="wallet" size={22} />
        </span>
      </div>

      <div className={s.ctaCopy}>
        <h2 id="cta-title" className={s.ctaTitle} data-reveal="">
          Know your numbers,
          <br />
          <span className={s.mutedText}>plan your next move</span>
        </h2>
        <p className={s.intro} data-reveal="" style={delay(1)}>
          Set up your business in minutes, invite your branch managers, and see your books, cash and forecast in
          one place.
        </p>
        <div className={s.heroActions} data-reveal="" style={delay(2)}>
          <a href="/sign-up" className={`${s.btn} ${s.btnDark}`}>
            Get Started <Icon name="arrowRight" size={15} />
          </a>
          <a href="#features" className={`${s.btn} ${s.btnLight}`}>
            Book a demo
          </a>
        </div>
      </div>

      <dl className={`${s.stats} ${s.container}`}>
        {stats.map(([value, label], i) => (
          <div key={label} data-reveal="" style={delay(i, 110)}>
            <dt>
              <CountUp value={value} />
            </dt>
            <dd>{label}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
