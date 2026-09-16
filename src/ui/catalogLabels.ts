import type {
  CapacitorPart,
  ChokePart,
  RectifierPart,
  RegulatorPart,
  ResistorPart,
} from "../types";
import { MODELED_LOW_DROP_BADGE, isModeledLowDropPath } from "./eeGloss";

const PLACEHOLDER_RE = /placeholder/i;

/** True when library notes, description, or MPN mark the part as a placeholder SKU. */
export function isPlaceholderPart(part: {
  notes?: string;
  description?: string;
  mpn?: string;
}): boolean {
  return PLACEHOLDER_RE.test(`${part.notes ?? ""}\n${part.description ?? ""}\n${part.mpn ?? ""}`);
}

function qty(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Number.isInteger(n)) return String(n);
  return String(Number(n.toPrecision(6)));
}

function withMpn(gloss: string, mpn: string, placeholder: boolean): string {
  const base = `${gloss} (${mpn})`;
  return placeholder ? `${base} · PLACEHOLDER` : base;
}

export function capacitorOptionLabel(p: CapacitorPart): string {
  return withMpn(`${qty(p.C_uF)} µF / ${qty(p.Vdc_V)} V`, p.mpn, isPlaceholderPart(p));
}

export function resistorOptionLabel(p: ResistorPart): string {
  return withMpn(`${qty(p.R_ohm)} Ω / ${qty(p.Pmax_W)} W`, p.mpn, isPlaceholderPart(p));
}

export function chokeOptionLabel(p: ChokePart): string {
  const l = p.L_mH >= 1000 ? `${qty(p.L_mH / 1000)} H` : `${qty(p.L_mH)} mH`;
  return withMpn(`${l} / ${qty(p.Imax_A)} A`, p.mpn, isPlaceholderPart(p));
}

export function regulatorOptionLabel(p: RegulatorPart): string {
  const gloss =
    p.vfixed_V !== null
      ? `${qty(p.vfixed_V)} V`
      : `${qty(p.voutMin_V)}–${qty(p.voutMax_V)} V`;
  return withMpn(gloss, p.mpn, isPlaceholderPart(p));
}

export function rectifierOptionLabel(p: RectifierPart): string {
  const base = withMpn(`${qty(p.iAvgMax_A)} A / ${qty(p.vRrm_V)} V`, p.mpn, isPlaceholderPart(p));
  return isModeledLowDropPath(p) ? `${base} · ${MODELED_LOW_DROP_BADGE}` : base;
}
