import s from "./landing.module.css";
import Icon from "./icon";
import Avatar from "./avatar";
import Phone from "./phone";
import Orb from "./orb";
import { BRAND } from "./content";

export default function Hero() {
  return (
    <section className={s.hero} id="top">
      <div className={s.heroBg} aria-hidden="true" />

      <div className={`${s.heroGrid} ${s.container}`}>
        <div className={s.heroCopy}>
          <a href="#features" className={s.announce}>
            <span>New</span> Voice-to-invoice in Khmer & English
            <Icon name="arrowRight" size={13} />
          </a>
          <h1>
            <span>Keep your books,</span>
            <span>know your cash,</span>
            <span className={s.mutedText}>plan what comes next</span>
          </h1>
          <p>
            {BRAND} helps small retail businesses in Cambodia keep their books, understand their cash and plan
            ahead, in Khmer or English and in USD or KHR.
          </p>
          <div className={s.heroActions}>
            <a href="/sign-up" className={`${s.btn} ${s.btnDark}`}>
              Get Started <Icon name="arrowRight" size={15} />
            </a>
            <a href="#features" className={`${s.btn} ${s.btnLight}`}>
              See how it works
            </a>
          </div>
          <div className={s.trust}>
            <span className={s.avatarStack}>
              {["Ana Li", "Ben Ko", "Cy Ma", "Di Ro"].map((n, i) => (
                <Avatar key={n} name={n} size={30} tone={i} />
              ))}
            </span>
            <span>
              <b>Built for Cambodian</b> retail
              <br />
              shops and their branches
            </span>
          </div>
        </div>

        <div className={s.heroArt}>
          <span className={s.ring} aria-hidden="true" />
          <span className={`${s.ring} ${s.ring2}`} aria-hidden="true" />
          <div className={s.heroPhone}>
            <div className={s.floatY}>
              <Phone screen="overview" />
            </div>
          </div>

          <div className={`${s.chip} ${s.chipA}`} aria-hidden="true">
            <span className={s.chipIcon}>
              <Icon name="chart" size={15} />
            </span>
            <span>
              <small>Monthly revenue</small>
              <b>
                $48.9K <em className={s.up}>+12.5%</em>
              </b>
            </span>
          </div>
          <div className={`${s.chip} ${s.chipB}`} aria-hidden="true">
            <Orb size={30} />
            <span>
              <small>Cash runway</small>
              <b>74 days on the expected line</b>
            </span>
          </div>
          <div className={`${s.chip} ${s.chipC}`} aria-hidden="true">
            <Icon name="checkCircle" size={16} />
            <b>Till signed off</b>
          </div>
        </div>
      </div>
    </section>
  );
}
