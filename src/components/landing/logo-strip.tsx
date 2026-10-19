import s from "./landing.module.css";
import Icon from "./icon";
import { logos } from "./content";

/** Endless integrations marquee. The list is rendered twice so the loop is seamless. */
export default function LogoStrip() {
  return (
    <section className={s.logoStrip} aria-label="Integrations">
      <p>Connects with the banks, wallets and tools you already use</p>
      <div className={s.marquee}>
        <div className={s.marqueeTrack}>
          {[0, 1].map((copy) => (
            <ul key={copy} aria-hidden={copy === 1}>
              {logos.map((l) => (
                <li key={l.name}>
                  <Icon name={l.icon} size={20} />
                  {l.name}
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
