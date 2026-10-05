import Link from 'next/link';
import { Dial } from '@/components/dial';
import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.page}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className={styles.header}>
        <Link
          className={styles.wordmark}
          href="/"
          aria-label="Good Timing home"
        >
          GT<span className={styles.dot}>.</span>
        </Link>
        <p className={styles.headerNote}>An independent eye on watches</p>
        <span className={styles.edition}>Est. 2026 / Canada</span>
      </header>
      <main id="main" tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="brand">
          <div className={styles.masthead}>
            <p className={styles.kicker}>
              <span /> Something good is on the way
            </p>
            <h1 id="brand">
              GOOD
              <span>
                TIMING<span className={styles.period}>.</span>
              </span>
            </h1>
          </div>
          <div className={styles.feature}>
            <div className={styles.editorial}>
              <p className={styles.index}>01 / The idea</p>
              <h2>
                Interesting watches.
                <br />
                <em>Found daily.</em>
              </h2>
              <p className={styles.description}>
                A curated collection of noteworthy watches available online—from
                affordable oddities to modern icons and vintage finds.
              </p>
              <p className={styles.manifesto}>
                An eye for the interesting. A feel for the unexpected.
              </p>
              <div className={styles.launch}>
                <span className={styles.launchMark} aria-hidden="true">
                  ↗
                </span>
                <p>
                  Launching soon.<span>Good finds take good timing.</span>
                </p>
              </div>
            </div>
            <div className={styles.visual}>
              <Dial />
            </div>
          </div>
        </section>
        <div
          className={styles.principles}
          aria-label="Our editorial perspective"
        >
          <span>Character over hype.</span>
          <span>Discovery over endless scrolling.</span>
          <span>Always worth a closer look.</span>
        </div>
      </main>
      <footer className={styles.footer}>
        <span>Good Timing © 2026</span>
        <span>Interesting watches. Found daily.</span>
        <span>goodtiming.ca</span>
      </footer>
    </div>
  );
}
