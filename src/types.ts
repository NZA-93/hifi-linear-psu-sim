export type RectifierKind = "silicon-bridge" | "tube-fwct" | "ic-ideal-bridge";

export type RippleUnit = "mVpp" | "percent";

export interface SpecInput {
  vout: number;
  iload: number;
  rippleValue: number;
  rippleUnit: RippleUnit;
  mainsHz: 50 | 60;
  mainsVac: number;
  /** RMS secondary. Bridge: full winding. Tube FW-CT: per anode (each side of CT). */
  vsecRms: number | null;
  turnsPrimary: number | null;
  turnsSecondary: number | null;
  /** Extra volts of DC headroom above Vout (+ dropout if regulated). */
  headroomV: number;
  transformerRegulation: number;
  includeRegulator: boolean;
}

export type StageType = "cap" | "resistor" | "choke" | "regulator";

export interface CapStage {
  id: string;
  type: "cap";
  partId: string;
  C_uF: number;
  ESR_ohm: number;
  Vdc_V: number;
}

export interface ResistorStage {
  id: string;
  type: "resistor";
  partId: string;
  R_ohm: number;
  Pmax_W: number;
}

export interface ChokeStage {
  id: string;
  type: "choke";
  partId: string;
  L_mH: number;
  DCR_ohm: number;
  Imax_A: number;
}

export interface RegulatorStage {
  id: string;
  type: "regulator";
  partId: string;
  vset: number;
}

export type FilterStage = CapStage | ResistorStage | ChokeStage | RegulatorStage;

export interface Architecture {
  rectifierId: string;
  stages: FilterStage[];
}

export interface DiodePart {
  category: "diode";
  id: string;
  mfr: string;
  mpn: string;
  description: string;
  source: string;
  notes: string;
  kind: "silicon-bridge";
  vf0_V: number;
  rd_ohm: number;
  diodesInPath: number;
  iAvgMax_A: number;
  iPeakMax_A: number;
  vRrm_V: number;
}

export interface TubePart {
  category: "tube";
  id: string;
  mfr: string;
  mpn: string;
  description: string;
  source: string;
  notes: string;
  kind: "tube-fwct";
  vf0_V: number;
  rd_ohm: number;
  iAvgMax_A: number;
  iPeakMax_A: number;
  vRrm_V: number;
  cinMax_uF: number;
  heater_V: number;
  heater_A: number;
}

export interface IcRectifierPart {
  category: "ic-rectifier";
  id: string;
  mfr: string;
  mpn: string;
  description: string;
  source: string;
  notes: string;
  kind: "ic-ideal-bridge";
  vf0_V: number;
  rd_ohm: number;
  iAvgMax_A: number;
  iPeakMax_A: number;
  vRrm_V: number;
}

export interface CapacitorPart {
  category: "capacitor";
  id: string;
  mfr: string;
  mpn: string;
  description: string;
  source: string;
  notes: string;
  C_uF: number;
  Vdc_V: number;
  ESR_ohm: number;
}

export interface ChokePart {
  category: "choke";
  id: string;
  mfr: string;
  mpn: string;
  description: string;
  source: string;
  notes: string;
  L_mH: number;
  DCR_ohm: number;
  Imax_A: number;
}

export interface ResistorPart {
  category: "resistor";
  id: string;
  mfr: string;
  mpn: string;
  description: string;
  source: string;
  notes: string;
  R_ohm: number;
  Pmax_W: number;
}

export interface RegulatorPart {
  category: "regulator";
  id: string;
  mfr: string;
  mpn: string;
  description: string;
  source: string;
  notes: string;
  topology: "ic-adjustable" | "ic-fixed" | "discrete-series";
  voutMin_V: number;
  voutMax_V: number;
  vfixed_V: number | null;
  dropout_V: number;
  iMax_A: number;
  iq_A: number;
  psrr_dB: number;
}

export type RectifierPart = DiodePart | TubePart | IcRectifierPart;

export interface ComponentLibrary {
  version: number;
  diodes: DiodePart[];
  tubes: TubePart[];
  icRectifiers: IcRectifierPart[];
  capacitors: CapacitorPart[];
  chokes: ChokePart[];
  resistors: ResistorPart[];
  regulators: RegulatorPart[];
}

export interface RectifierModel {
  id: string;
  label: string;
  kind: RectifierKind;
  vf0: number;
  rd: number;
  iPeakMax: number;
  iDcMax: number;
  vRrm: number;
  cinMax_uF?: number;
}

export interface Warning {
  level: "warn" | "error";
  message: string;
}

export interface SimMetrics {
  vdcAvg: number;
  vdcMin: number;
  vdcMax: number;
  ripplePp: number;
  vPreRegAvg: number;
  vPreRegMin: number;
  vPreRegMax: number;
  ripplePreRegPp: number;
  voutAvg: number;
  voutMin: number;
  voutMax: number;
  rippleOutPp: number;
  headroomMin: number;
  dropout: number;
  inRegulation: boolean;
  pRegulator_W: number;
  pSeries_W: number;
  pRectifier_W: number;
  pTotalLoss_W: number;
  efficiency: number;
  transformerRs_ohm: number;
  vsecUsed: number;
  warnings: Warning[];
}

export interface Waveform {
  t: number[];
  vRect: number[];
  vFirstCap: number[];
  vPreReg: number[];
  vOut: number[];
  iRect: number[];
}

export interface SimResult {
  metrics: SimMetrics;
  waveform: Waveform;
  analytic: AnalyticEstimate;
}

export interface AnalyticEstimate {
  vPeak: number;
  vfTotal: number;
  vdcNoLoad: number;
  reservoirRipplePp: number;
  vdcLoaded: number;
  seriesDrop: number;
  rippleOutEstimate: number;
}
