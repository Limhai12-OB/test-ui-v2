import s from "./landing.module.css";

const palettes = [
  ["#6d7cff", "#a46bff"],
  ["#ff8a5c", "#ffb35c"],
  ["#2cc3a4", "#3b8fe0"],
  ["#ef6aa0", "#ff9c6a"],
];

/** Initials avatar (no photos bundled — swap for next/image when you have real ones). */
export default function Avatar({ name, size = 32, tone = 0 }: { name: string; size?: number; tone?: number }) {
  const [a, b] = palettes[tone % palettes.length];
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className={s.avatar}
      style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(135deg, ${a}, ${b})` }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
