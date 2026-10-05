import styles from './dial.module.css';

/** Decorative, fixed at 10:10; no client clock or hydration required. */
export function Dial() {
  return (
    <div className={styles.artwork} aria-hidden="true">
      <div className={styles.orbit} />
      <svg className={styles.dial} viewBox="0 0 400 400" fill="none">
        <circle
          cx="200"
          cy="200"
          r="185"
          stroke="currentColor"
          strokeWidth="1"
        />
        <circle
          cx="200"
          cy="200"
          r="166"
          stroke="currentColor"
          strokeWidth="0.5"
        />
        {Array.from({ length: 60 }, (_, index) => (
          <line
            key={index}
            x1="200"
            y1="24"
            x2="200"
            y2={index % 5 === 0 ? '44' : '31'}
            stroke="currentColor"
            strokeWidth={index % 5 === 0 ? '3' : '1'}
            transform={`rotate(${index * 6} 200 200)`}
          />
        ))}
        <text x="200" y="91" textAnchor="middle" className={styles.numeral}>
          12
        </text>
        <text x="315" y="209" textAnchor="middle" className={styles.numeral}>
          3
        </text>
        <text x="200" y="329" textAnchor="middle" className={styles.numeral}>
          6
        </text>
        <text x="85" y="209" textAnchor="middle" className={styles.numeral}>
          9
        </text>
        <text x="200" y="144" textAnchor="middle" className={styles.signature}>
          GOOD TIMING
        </text>
        <path
          d="M200 200 L122 155"
          stroke="currentColor"
          strokeWidth="9"
          strokeLinecap="square"
        />
        <path
          d="M200 200 L307 138"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="square"
        />
        <g className={styles.secondHand}>
          <path d="M200 239 V62" stroke="var(--accent)" strokeWidth="2" />
          <circle cx="200" cy="231" r="5" fill="var(--accent)" />
        </g>
        <circle cx="200" cy="200" r="7" fill="var(--accent)" />
      </svg>
      <span className={styles.annotation}>A little out of the ordinary.</span>
    </div>
  );
}
