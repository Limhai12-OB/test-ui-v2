import s from "./landing.module.css";
import Icon from "./icon";
import { features, type Feature } from "./content";
import SectionHead from "./section-head";
import { Segments } from "./phone";
import LineChart from "./line-chart";
import Orb from "./orb";
import { delay } from "./motion";

function TargetWidget() {
  return (
    <div className={s.widgetInner}>
      <small className={s.wLabel}>Receipt · Lucky Mart</small>
      <b className={s.wBig}>៛48,000</b>
      <em className={s.wDelta}>
        <span className={s.up}>✓ Read in 2 seconds</span> from a Khmer receipt
      </em>
      <div className={s.wCard}>
        <div className={s.wCardRow}>
          <span>
            <b>AI cleanup</b> 4 of 6 fields confirmed
          </span>
          <Icon name="arrowUpRight" size={13} />
        </div>
        <small>No duplicates found · Draft ready to review and post</small>
        <Segments filled={15} total={22} />
      </div>
      <div className={s.wMini}>
        <span>
          <small>Date</small>
          <b>07 Oct</b>
        </span>
        <span>
          <small>Category</small>
          <b>Restock</b>
        </span>
        <span>
          <small>Account</small>
          <b>Cash till</b>
        </span>
      </div>
    </div>
  );
}

function BalanceWidget() {
  return (
    <div className={s.widgetInner}>
      <small className={s.wLabel}>Cash, bank & wallets</small>
      <b className={s.wBig}>$48,500</b>
      <div className={s.legend}>
        <span>
          <i style={{ background: "#1e40af" }} /> Actual
        </span>
        <span>
          <i style={{ background: "#c7d2fb" }} /> Last year
        </span>
      </div>
      <div className={s.wChart}>
        <LineChart marker={8} tip="$32,410" />
        <div className={s.months}>
          <span>Jan</span>
          <span>Mar</span>
          <span>May</span>
          <span>Jul</span>
          <span className={s.on}>Sep</span>
          <span>Nov</span>
        </div>
      </div>
    </div>
  );
}

function AiWidget() {
  return (
    <div className={`${s.widgetInner} ${s.wAi}`}>
      <span className={s.aiTag}>
        <Icon name="sparkle" size={13} /> AI financial advisor
      </span>
      <p>
        Expenses rose <mark>12%</mark> this month, mostly from a one-time packaging restock. Rent and wages are
        unchanged, so next month should return to about <mark>$3,400</mark>.
      </p>
      <div className={s.wOrb}>
        <span className={s.orbWrap}>
          <Orb size={64} />
        </span>
        <small>Ask in Khmer or English</small>
      </div>
    </div>
  );
}

const widgets: Record<Feature["widget"], () => React.JSX.Element> = {
  target: TargetWidget,
  balance: BalanceWidget,
  ai: AiWidget,
};

export default function Features() {
  return (
    <section className={`${s.section} ${s.container}`} id="features" aria-labelledby="features-title">
      <SectionHead
        id="features-title"
        badge="Features"
        title="Your books, cash and plans"
        muted="all in one place"
        intro="From a receipt snapped at the counter to a 90-day cash forecast, FinanceSight turns everyday shop records into a clear picture, no accounting skills needed."
      />

      <div className={s.featureList}>
        {features.map((f, idx) => {
          const Widget = widgets[f.widget];
          return (
            <article key={f.title} className={`${s.feature} ${idx % 2 ? s.featureFlip : ""}`} data-reveal="">
              <div className={s.featureText}>
                <span className={s.featureNum}>0{idx + 1}</span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
                <ul>
                  {f.points.map((p) => (
                    <li key={p.label}>
                      <span>
                        <Icon name={p.icon} size={14} />
                      </span>
                      {p.label}
                    </li>
                  ))}
                </ul>
                <a href="#pricing" className={s.link}>
                  Learn more <Icon name="arrowRight" size={14} />
                </a>
              </div>
              <div className={s.widget} data-reveal="scale" style={delay(2)}>
                <Widget />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
