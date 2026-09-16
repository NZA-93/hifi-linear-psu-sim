export function fmt(n: number, digits = 2, unit = ""): string {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  const d = abs >= 100 ? 1 : abs >= 10 ? Math.min(digits, 2) : digits;
  return `${n.toFixed(d)}${unit ? `\u00a0${unit}` : ""}`;
}

export function fmtMv(v: number): string {
  if (!Number.isFinite(v)) return "—";
  const mv = v * 1000;
  if (Math.abs(mv) >= 100) return `${mv.toFixed(0)}\u00a0mV`;
  if (Math.abs(mv) >= 10) return `${mv.toFixed(1)}\u00a0mV`;
  return `${mv.toFixed(2)}\u00a0mV`;
}
