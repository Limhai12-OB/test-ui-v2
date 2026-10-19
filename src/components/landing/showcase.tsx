import s from "./landing.module.css";
import Phone from "./phone";
import SectionHead from "./section-head";

export default function Showcase() {
  return (
    <section className={`${s.section} ${s.container}`} aria-labelledby="app-title">
      <SectionHead id="app-title" badge="Mobile app" title="Snap, ask and check" muted="right from the shop floor" />
      <div className={s.showcase}>
        <div className={s.sideWrap} data-reveal="right">
          <Phone screen="balance" size={0.84} className={s.sidePhone} />
        </div>
        <div className={s.mainWrap} data-reveal="" style={{ "--d": "120ms" } as React.CSSProperties}>
          <Phone screen="overview" className={s.mainPhone} />
        </div>
        <div className={s.sideWrap} data-reveal="left">
          <Phone screen="assistant" size={0.84} className={s.sidePhone} />
        </div>
        <span className={s.showcaseGlow} aria-hidden="true" />
      </div>
    </section>
  );
}
