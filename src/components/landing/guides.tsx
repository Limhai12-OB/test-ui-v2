import s from "./landing.module.css";
import Icon from "./icon";
import { articles } from "./content";
import SectionHead from "./section-head";
import ArticleArt from "./article-art";
import { delay } from "./motion";

export default function Insights() {
  return (
    <section className={`${s.section} ${s.container}`} id="insights" aria-labelledby="insights-title">
      <SectionHead
        id="insights-title"
        badge="Guides"
        title="Guides, tips and ideas"
        muted="to run your shop with confidence"
        intro="Practical how-tos for owners and branch managers, from closing the till to reading your forecast."
      />

      <div className={s.articles}>
        {articles.map((a, i) => (
          <a key={a.title} href="#insights" className={s.article} data-reveal="" style={delay(i, 120)}>
            <div className={s.articleMedia}>
              {/* Swap ArticleArt for <Photo src="/images/..."/> once real photos exist. */}
              <ArticleArt kind={a.tone} />
              <span className={s.tags}>
                <span className={s.tagAccent}>{a.tag}</span>
                <span>{a.read}</span>
              </span>
            </div>
            <div className={s.articleBody}>
              <span>
                <h3>{a.title}</h3>
                <time>{a.date}</time>
              </span>
              <span className={s.articleGo}>
                <Icon name="arrowUpRight" size={16} />
              </span>
            </div>
          </a>
        ))}
      </div>

      <div className={s.center} data-reveal="">
        <a href="#insights" className={`${s.btn} ${s.btnLight}`}>
          View all guides <Icon name="arrowRight" size={15} />
        </a>
      </div>
    </section>
  );
}
