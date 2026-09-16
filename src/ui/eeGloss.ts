import type { RectifierKind, Warning } from "../types";

/** Circuit Designer plain glosses — do not paraphrase. */
export const SILICON_BRIDGE_GLOSS =
  "Two diodes in the current path each half-cycle; secondary is ordinary two-wire RMS.";

export const TUBE_FWCT_GLOSS =
  "Needs a centre-tapped secondary; the Vac you enter is RMS *per anode* (each half), not the full end-to-end.";

export const PEAK_CLAMP_GLOSS =
  "Sim caps rectifier current at the part’s peak rating so the math doesn’t run away — a hit means real inrush/stress risk.";

export const DROPOUT_GLOSS =
  "Regulator needs Vin above Vout by about this many volts at the *valley* of the ripple, or the rail collapses.";

export const IC_IDEAL_GLOSS =
  "Near-zero diode drop (FET Rds); LT4320 ≈ full ideal bridge; LM74610 is a *modeled* low-drop path, not a drop-in four-FET AC bridge.";

export const MODELED_LOW_DROP_BADGE = "modeled low-drop path";

export function rectifierKindGloss(kind: RectifierKind): string {
  switch (kind) {
    case "silicon-bridge":
      return SILICON_BRIDGE_GLOSS;
    case "tube-fwct":
      return TUBE_FWCT_GLOSS;
    case "ic-ideal-bridge":
      return IC_IDEAL_GLOSS;
  }
}

/** Secondary VAC field: only kinds whose gloss mentions the winding. */
export function secondaryVacGloss(kind: RectifierKind): string | null {
  if (kind === "silicon-bridge") return SILICON_BRIDGE_GLOSS;
  if (kind === "tube-fwct") return TUBE_FWCT_GLOSS;
  return null;
}

export function isPeakClampWarning(w: Warning): boolean {
  return /peak current hits the .+ clamp/i.test(w.message);
}

export function isModeledLowDropPath(part: { id?: string; mpn?: string }): boolean {
  return /lm74610/i.test(`${part.id ?? ""} ${part.mpn ?? ""}`);
}
