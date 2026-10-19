import s from "./landing.module.css";
import { navLinks } from "./content";
import Logo from "./logo";

/** Sticky, translucent top bar. */
export default function Nav() {
  return (
    <header className={s.navBar}>
      <div className={`${s.nav} ${s.container}`}>
        <Logo />
        <nav aria-label="Primary" className={s.navLinks}>
          {navLinks.map(([label, href]) => (
            <a key={label} href={href}>
              {label}
            </a>
          ))}
        </nav>
        <div className={s.navActions}>
          <a href="/sign-in" className={s.navLogin}>
            Login
          </a>
          <a href="/sign-up" className={`${s.btn} ${s.btnDark} ${s.btnSm}`}>
            Get Started
          </a>
        </div>
      </div>
    </header>
  );
}
