import s from "./landing.module.css";
import Icon from "./icon";
import { plans } from "./content";
import { delay } from "./motion";

export default function Pricing() {
  return (
    <section className={s.pricingWrap} id="pricing" aria-labelledby="pricing-title">
      <div className={`${s.section} ${s.container}`}>
        <div className={s.pricingHead}>
          <span className={s.badge} data-reveal="">
            <i /> Roles
          </span>
          <h2 id="pricing-title" className={s.pricingTitle} data-reveal="" style={delay(1)}>
            One business, many branches. Everyone sees{" "}
            <span className={s.inlineChip} aria-hidden="true">
              <Icon name="users" size={18} />
            </span>{" "}
            exactly their part, <span className={s.mutedText}>with every record kept separate per branch</span>
          </h2>
        </div>

        <div className={s.plans}>
          {plans.map((p, i) => (
            <article key={p.name} className={`${s.plan} ${p.featured ? s.planFeatured : ""}`} data-reveal="" style={delay(i + 1, 140)}>
              <div className={s.planTop}>
                <span className={s.planIcon}>
                  <Icon name={p.icon} size={18} />
                </span>
                {p.featured && <span className={s.popular}>Full access</span>}
              </div>
              <h3>{p.name}</h3>
              <p className={s.price}>
                <b>{p.price}</b> {p.unit}
              </p>
              <p className={s.planText}>{p.text}</p>
              <ul>
                {p.points.map((pt) => (
                  <li key={pt}>
                    <span>
                      <Icon name="check" size={12} />
                    </span>
                    {pt}
                  </li>
                ))}
              </ul>
              <a href={p.featured ? "/sign-up" : "/invitation"} className={`${s.btn} ${s.btnBlock} ${p.featured ? s.btnAccent : s.btnDark}`}>
                {p.cta} <Icon name="arrowRight" size={15} />
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
