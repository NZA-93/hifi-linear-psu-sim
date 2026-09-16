# HiFi linear PSU simulator

Browser app for **dimensioning and simulating audio HiFi linear power supplies**: transformer secondary → rectifier (silicon / tube / IC ideal-diode) → CRC or CLC filter → optional series regulator.

This is **v1**. Models are analytic + a simple time-step of an RLC ladder. They are **not SPICE-accurate**.

Live layout is a single page: spec form → recommended architecture → editable stage list → numbers + waveforms.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173/
npm test
npm run build
npm run preview  # serves the production build
```

Node 20+ recommended.

Demo path: leave the defaults (**12 V / 1 A / 50 mVpp**, 50 Hz, regulator included) and click **Recommend architecture**. You should get a silicon bridge + CRC + LM7812/LM317-class regulator. Change the rectifier to **5AR4/GZ34** or click **+ Choke L** — Vdc, ripple, heat, and warnings update immediately.

## GitHub Pages

The repo name is `hifi-linear-psu-sim`. Production builds use Vite `base: "/hifi-linear-psu-sim/"`, so the app is meant to be served at:

`https://<user>.github.io/hifi-linear-psu-sim/`

Local `npm run dev` keeps `base: "/"`.

Deploy (after enabling Pages on the repo):

1. Repo **Settings → Pages → Source: GitHub Actions**
2. Merge to `main`. The workflow in `.github/workflows/pages.yml` builds and uploads `dist/`.

To build Pages output locally:

```bash
npm run build
# dist/ is the static site; asset URLs are prefixed with /hifi-linear-psu-sim/
```

## Architecture of this repo

| Path | Role |
| --- | --- |
| `src/sim/` | Rectifier drop, ripple estimates, recommend, time-domain stepper. No React. |
| `src/library/components.json` | Real catalog parts (diodes, tubes, IC rectifiers, C/R/L, regulators). |
| `src/ui/` | Spec form, stage editor, block diagram, results, SVG plot. |
| `src/sim/*.test.ts` | Unit tests for ripple, rectifier drop, recommend, and a few sim sanity checks. |

## What the model does

1. **Transformer** — secondary RMS (typed in, from Ns/Np × mains, or auto-picked). A single winding resistance from a %-regulation slider. No magnetizing branch, no leakage L. Sizing uses a cap-input rule of thumb **Isec_rms ≈ 1.8× Idc** and **VA = Vsec × Isec_rms** (tube FW-CT: **2×** half-winding contribution). Those numbers are labelled as a rule of thumb, not SPICE.
2. **Rectifier**
   - Silicon bridge: two diode drops `2·(Vf0 + Rd·I)`, full-wave `|sin|`. `rectifierModel` already scales vf0/rd by `diodesInPath`.
   - Tube FW-CT (5AR4/GZ34, 5U4G, EZ81): large Vf0 + tens of ohms, peak-current clamp, typical Cin max. **Secondary is RMS per anode** (each side of a centre tap).
   - IC ideal-diode (LT4320, LM74610-Q1): near-zero Vf, drop ≈ I·Rds(on) of the example MOSFET path.
   - One Rd: analytic `vfTotal = rectifierDropAt` (Vf0+Rd·I). Time-domain conduction uses **full-path Rd** with transformer Rs and first-cap ESR. Analytic loaded Vdc does **not** add Rd a second time, and does **not** treat capacitor ESR as DC series IR (ESR is a ripple/stepper path).
3. **Filter ladder** — shunt C and series R or L, implicit-Euler step of capacitor voltages / inductor currents, ~800 samples per mains cycle, last two cycles scored.
4. **Regulator** — dropout while in regulation; **PSRR is AC-only** (`vOut ≈ vset + (vPre − meanPre)·10^(−PSRR_dB/20)`). DC headroom does not lift the DC output. Below dropout the rail still collapses to `vPre − dropout`.

### Warn / error thresholds (order-of-magnitude, not SPICE)

Messages say **rule of thumb, not SPICE**. Analytic Vdc/ripple is a **hand estimate**; the time-domain stepper is still not a SPICE deck.

| Check | Warn | Error |
| --- | --- | --- |
| **Isec / VA** | Always shown (1.8× Idc; tube VA = 2×Vsec×Isec). | — |
| **Inrush / IFSM** | First-cycle (empty-C) peak ≥ 0.7× IFSM. Silicon JSON has datasheet `iFsm_A`; tubes/ICs map from `iPeakMax` with a note. | — |
| **Peak clamp** | Unclamped charging current would hit `iPeakMax`. | — |
| **VRRM** | Rectified peak ≥ 0.7× VRRM (bridge: Vsec peak; FW-CT: 2× that). Important for 1N5822 (40 V). | ≥ 0.9× VRRM |
| **C1 voltage** | — | First capacitor vs **first-node** peak, not vPre after CRC. |
| **Tube heater** | Efficiency omits heater watts. | — |

### Limitations (not SPICE)

- No diode reverse recovery, snubbers, or transformer leakage spikes.
- Tube curves are linearized (Vf0 + Rd); real 5AR4/5U4G plate curves are nonlinear and heater-limited.
- LT4320 start-up, charge-pump, and MOSFET body-diode conduction are ignored.
- Regulator PSRR is a single number, not a frequency-dependent curve; no loop stability.
- ESR is lumped; no temperature, aging, or ripple-current heating of capacitors.
- Choke saturation and swinging-choke behaviour are not modelled — only L and DCR.
- Efficiency omits heater power (tubes) and magnetics core loss.

Treat numbers as **order-of-magnitude design aid** for choosing C, CRC vs CLC, and whether a valve rectifier even belongs on the rail.

## Component library sources

Datasheet-typical values; a few ESR figures are derived from tan δ via `ESR ≈ tanδ / (2π f C)` at 120 Hz. One large-can KMH suffix is marked PLACEHOLDER — family values, confirm the exact MPN before ordering.

| Category | Examples | Sources |
| --- | --- | --- |
| Silicon | 1N4007, 1N5408, KBU8M, GBPC3506, 1N5822 | [onsemi 1N4007](https://www.onsemi.com/pdf/datasheet/1n4001-d.pdf), [1N5408](https://www.onsemi.com/pdf/datasheet/1n5400-d.pdf), [Vishay KBU8](https://www.vishay.com/docs/88656/kbu8.pdf), [GBPC](https://www.onsemi.com/pdf/datasheet/gbpc12005-d.pdf), [1N5822](https://www.onsemi.com/pdf/datasheet/1n5820-d.pdf) |
| Tubes | 5AR4/GZ34, 5U4G, EZ81/6CA4 | [RCA 5AR4](https://frank.pocnet.net/sheets/084/5/5AR4.pdf), [RCA 5U4G](https://frank.pocnet.net/sheets/049/5/5U4G.pdf), [Philips EZ81](https://frank.pocnet.net/sheets/010/e/EZ81.pdf) |
| IC rectifiers | LT4320, LM74610-Q1 | [AD LT4320](https://www.analog.com/media/en/technical-documentation/data-sheets/4320fb.pdf), [TI LM74610-Q1](https://www.ti.com/lit/ds/symlink/lm74610-q1.pdf) |
| Capacitors | Nichicon KW/FW, Panasonic FC/FR, CDE 381LX, Rubycon ZLH, WIMA MKS4, UCC KXG | Manufacturer PDFs linked on each JSON `source` field |
| Chokes | Hammond 193H/193J/193B/159ZC/159SA, Bourns 1140-102K-RC | [Hammond chokes](https://www.hammfg.com/electronics/transformers/choke), [Bourns 1140](https://www.bourns.com/docs/product-datasheets/1140.pdf) |
| Resistors | Vishay AC05/AC07/AC10, Ohmite 20J10R | [Vishay AC](https://www.vishay.com/docs/28730/ac03acat.pdf), [Ohmite 20](https://www.ohmite.com/assets/docs/res_20.pdf) |
| Regulators | LM317T, LM7812CT, LM7805, LT1085CT-12, TIP3055+1N4743A | [TI LM317](https://www.ti.com/lit/ds/symlink/lm317.pdf), [LM7812](https://www.ti.com/lit/ds/symlink/lm7812.pdf), [AD LT1085](https://www.analog.com/media/en/technical-documentation/data-sheets/108345fd.pdf) |

Tube rectifiers in this library are **high-voltage, low-current** (150–250 mA). Swapping a 5AR4 onto a 12 V / 1 A design should look bad — that is the point of the comparison.

## Out of scope (v1)

Switch-mode supplies, full SPICE, PCB layout, and magnetics design beyond catalog choke L/DCR.
