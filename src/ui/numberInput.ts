/** Parse a number-input draft. Empty or non-finite → null (do not coerce to 0). */
export function parseNumberDraft(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function clamp(n: number, min?: number, max?: number): number {
  let out = n;
  if (min !== undefined && out < min) out = min;
  if (max !== undefined && out > max) out = max;
  return out;
}

/**
 * Normalize a number field on blur (or submit) to a finite value.
 * Optional fields may snap to null when empty.
 */
export function snapNumber(
  raw: string,
  opts: {
    min?: number;
    max?: number;
    optional?: boolean;
    fallback: number | null;
  },
): number | null {
  const parsed = parseNumberDraft(raw);
  if (parsed === null) {
    if (opts.optional) return null;
    const fb = opts.fallback;
    if (fb !== null && Number.isFinite(fb)) return clamp(fb, opts.min, opts.max);
    if (opts.min !== undefined) return opts.min;
    return 0;
  }
  return clamp(parsed, opts.min, opts.max);
}

export function formatCommitted(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "";
  return String(value);
}

/**
 * HTML5 constraint validation: (value − min) must be an integer multiple of step.
 * Documents why `min=0.001` + `step=0.01` rejects Iload=1 (nearest 0.991 / 1.001).
 */
export function htmlStepMatches(value: number, min: number, step: number): boolean {
  if (!(step > 0) || !Number.isFinite(value) || !Number.isFinite(min)) return true;
  const n = (value - min) / step;
  return Math.abs(n - Math.round(n)) < 1e-6;
}
