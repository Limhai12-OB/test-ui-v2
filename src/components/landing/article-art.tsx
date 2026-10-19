import s from "./landing.module.css";

/**
 * Illustrated cover for an article card (used until real photos exist).
 * kind 0 = growth bars, 1 = data network, 2 = performance gauge.
 */
export default function ArticleArt({ kind }: { kind: number }) {
  const bg = [
    ["#e8edfc", "#dbe2fb"],
    ["#e8edfc", "#c7d2fb"],
    ["#fbf4e6", "#f1dcb4"],
  ][kind % 3];
  return (
    <svg className={s.art} viewBox="0 0 320 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={`art-bg-${kind}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={bg[0]} />
          <stop offset="1" stopColor={bg[1]} />
        </linearGradient>
      </defs>
      <rect width="320" height="240" fill={`url(#art-bg-${kind})`} />
      <circle cx="270" cy="40" r="70" fill="#fff" opacity=".35" />
      <circle cx="40" cy="220" r="60" fill="#fff" opacity=".25" />

      {kind === 0 && (
        <g className={s.artFloat}>
          <rect x="70" y="58" width="180" height="130" rx="16" fill="#fff" />
          {[38, 54, 46, 70, 84].map((h, i) => (
            <rect key={i} x={92 + i * 30} y={168 - h} width="18" height={h} rx="5" fill={i === 4 ? "#1e40af" : "#e8edfc"} />
          ))}
          <path d="M92 116 L122 100 L152 108 L182 84 L212 70" fill="none" stroke="#3b5ed9" strokeWidth="2" strokeLinecap="round" />
          <circle cx="212" cy="70" r="4" fill="#3b5ed9" />
          <text x="92" y="82" fontSize="11" fontWeight="600" fill="#3b5ed9">+24%</text>
        </g>
      )}

      {kind === 1 && (
        <g className={s.artFloat}>
          {[
            [80, 80], [240, 70], [70, 170], [250, 175], [160, 50], [160, 195],
          ].map(([x, y], i) => (
            <g key={i}>
              <line x1="160" y1="122" x2={x} y2={y} stroke="#fff" strokeWidth="2" strokeDasharray="4 4" />
              <rect x={x - 16} y={y - 16} width="32" height="32" rx="9" fill="#fff" />
              <circle cx={x} cy={y} r="5" fill={i % 2 ? "#93a9f0" : "#3b5ed9"} />
            </g>
          ))}
          <rect x="132" y="94" width="56" height="56" rx="16" fill="#1e40af" />
          <path d="M150 128 l8-10 8 6 8-12" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}

      {kind === 2 && (
        <g className={s.artFloat}>
          <rect x="85" y="50" width="150" height="140" rx="18" fill="#fff" />
          <circle cx="160" cy="118" r="40" fill="none" stroke="#e8edfc" strokeWidth="12" />
          <circle
            cx="160" cy="118" r="40" fill="none" stroke="#1e40af" strokeWidth="12" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 40 * 0.72} ${2 * Math.PI * 40}`} transform="rotate(-90 160 118)"
          />
          <text x="160" y="123" textAnchor="middle" fontSize="16" fontWeight="700" fill="#3b5ed9">72%</text>
          <rect x="112" y="170" width="96" height="6" rx="3" fill="#e8edfc" />
        </g>
      )}
    </svg>
  );
}
