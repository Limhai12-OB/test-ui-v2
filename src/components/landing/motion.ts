/** Stagger helper: `style={delay(i)}` sets the reveal delay for the i-th item. */
export function delay(i: number, step = 90): React.CSSProperties {
  return { "--d": `${i * step}ms` } as React.CSSProperties;
}
