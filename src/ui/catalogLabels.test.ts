import { describe, expect, it } from "vitest";
import { library } from "../library";
import {
  capacitorOptionLabel,
  chokeOptionLabel,
  isPlaceholderPart,
  rectifierOptionLabel,
  regulatorOptionLabel,
  resistorOptionLabel,
} from "./catalogLabels";

describe("isPlaceholderPart", () => {
  it("flags the KMH PLACEHOLDER can and not ordinary parts", () => {
    const kmh = library.capacitors.find((p) => p.id === "kmh250v227m35x40");
    expect(kmh).toBeDefined();
    expect(isPlaceholderPart(kmh!)).toBe(true);
    expect(isPlaceholderPart(library.capacitors[0])).toBe(false);
    expect(isPlaceholderPart(library.resistors[0])).toBe(false);
  });
});

describe("value-first option labels", () => {
  it("leads capacitors with µF / V, MPN secondary", () => {
    const p = library.capacitors.find((c) => c.C_uF === 4700)!;
    const label = capacitorOptionLabel(p);
    expect(label.startsWith("4700 µF / 35 V")).toBe(true);
    expect(label.indexOf(p.mpn)).toBeGreaterThan(0);
  });

  it("does not lead resistors with opaque AC05 MPNs", () => {
    const p = library.resistors.find((r) => r.id === "ac05-r47")!;
    const label = resistorOptionLabel(p);
    expect(label.startsWith("0.47 Ω / 5 W")).toBe(true);
    expect(label).toContain(p.mpn);
    expect(label.indexOf("AC050")).toBeGreaterThan(label.indexOf("Ω"));
  });

  it("suffixes PLACEHOLDER on the KMH can", () => {
    const p = library.capacitors.find((c) => c.id === "kmh250v227m35x40")!;
    expect(capacitorOptionLabel(p)).toMatch(/PLACEHOLDER/);
  });

  it("labels chokes, regulators, and rectifiers value-first", () => {
    const choke = library.chokes.find((c) => c.id === "hammond-193h")!;
    expect(chokeOptionLabel(choke).startsWith("5 H / 0.2 A")).toBe(true);

    const reg = library.regulators.find((r) => r.id === "lm7812")!;
    expect(regulatorOptionLabel(reg).startsWith("12 V")).toBe(true);
    expect(regulatorOptionLabel(reg)).toContain("LM7812CT");

    const diode = library.diodes.find((d) => d.id === "kbu8m")!;
    expect(rectifierOptionLabel(diode).startsWith("8 A / 1000 V")).toBe(true);
    expect(rectifierOptionLabel(diode)).toContain("KBU8M");
  });
});
