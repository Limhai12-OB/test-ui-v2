import s from "./landing.module.css";
import Icon from "./icon";
import { BRAND, footerCols } from "./content";
import Logo from "./logo";

export default function Footer() {
  return (
    <footer className={s.footer}>
      <div className={`${s.footerGrid} ${s.container}`}>
        <div className={s.footerBrand}>
          <Logo />
          <p>Bookkeeping, cash and planning for small retail businesses in Cambodia, in Khmer or English.</p>
          <div className={s.social}>
            <a href="#" aria-label="Photos">
              <Icon name="camera" size={15} />
            </a>
            <a href="#" aria-label="Email">
              <Icon name="at" size={15} />
            </a>
            <a href="#" aria-label="Share">
              <Icon name="share" size={15} />
            </a>
          </div>
        </div>
        {footerCols.map((c) => (
          <nav key={c.title} aria-label={c.title} className={s.footerCol}>
            <h4>{c.title}</h4>
            <ul>
              {c.items.map((it) => (
                <li key={it}>
                  <a href="#">{it}</a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className={`${s.copy} ${s.container}`}>
        <span>© 2026 Copyright {BRAND}. All rights reserved.</span>
        <a href="#top">
          Back to top <Icon name="arrowUpRight" size={13} />
        </a>
      </div>
      <p className={s.bigWord} aria-hidden="true">
        {BRAND}
      </p>
    </footer>
  );
}
