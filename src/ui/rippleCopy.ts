import type { SpecInput } from "../types";
import { rippleTargetVolts } from "../sim/analytics";

export function formatRippleTarget(spec: SpecInput): string {
  if (spec.rippleUnit === "percent") return `${spec.rippleValue}% of Vout`;
  return `${spec.rippleValue} mVpp`;
}

/** Plain under/over copy vs the user's ripple target (not a 15% band). */
export function rippleVsTargetLabel(rippleOutPp: number, spec: SpecInput): string {
  const target = rippleTargetVolts(spec);
  const rel = rippleOutPp <= target ? "under" : "over";
  return `${rel} target (${formatRippleTarget(spec)})`;
}

export function rippleMeetsTarget(rippleOutPp: number, spec: SpecInput): boolean {
  return rippleOutPp <= rippleTargetVolts(spec);
}
