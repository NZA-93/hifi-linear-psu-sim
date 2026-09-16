# HiFi Linear PSU Dimensioner

Browser app for **dimensioning a single positive linear HiFi rail**. Enter Vout, load current, ripple target, and secondary Vac; pick CRC / CLC / C-only and a series regulator; get closed-form estimates (ripple, headroom, dissipation).

**Circuit Designer owns the electrical approximations.** They live only in [`src/sim/linearPsu.ts`](src/sim/linearPsu.ts). The React UI calls that module and must not re-implement formulas. Future model changes belong in that file.

Dual ± rails are **out of scope**. Tube and active rectifiers are UI stubs (diode-bridge math is still used). Discrete regulators use a labeled Vbe/dropout stub.

## Default preset

`line_preamp_p15` (CRC + LM317-class): Vout = 15 V, Iload = 100 mA, ripple target ≤ 1 mVpp, Vac_rms = 18 V, f = 50 Hz, C1 = 4700 µF, R = 10 Ω, C2 = 2200 µF.

Named presets are data in [`public/data/presets.json`](public/data/presets.json) — they are not baked into the sim math.

## Local development

Requires Node.js 22+ (20+ should work).

```bash
npm install
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173/hifi-linear-psu-sim/`). The `base` path is `/hifi-linear-psu-sim/` so GitHub Pages project-site URLs work locally too.

```bash
npm run typecheck
npm test
npm run build
npm run preview
```

## Deploy to GitHub Pages

Vite `base` is `/hifi-linear-psu-sim/`. Production URL:

`https://<owner>.github.io/hifi-linear-psu-sim/`

1. Repo Settings → Pages → Source: **GitHub Actions**.
2. Push to `main`. [`.github/workflows/pages.yml`](.github/workflows/pages.yml) builds `dist/` and deploys.
3. [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs typecheck, tests, and build on pull requests.

To serve from a custom domain or a path-less site, set `base: './'` in `vite.config.ts`.

## Topology (this PR)

AC secondary (ideal sine: Vac_rms + f) → full-wave bridge (4 diodes) → reservoir C1 → optional R1 (CRC) or L1 (CLC) → C2 → series linear regulator → Vout / Iload.

Stages can be enabled or disabled in the UI. Filter topology: **CRC | CLC | C-only**. Regulator: **none | series_IC (LM317-class) | series_discrete (stub)**.

## Approximations (`src/sim/linearPsu.ts`)

Labeled as approximations in the UI:

| Quantity | Named function / rule |
| --- | --- |
| Vpeak after rectify | `peakAfterRectify`: Vac_rms · √2 − 2·Vf |
| Ripple frequency | `fullWaveRippleHz`: 2 · f_line |
| Cap ripple | `capacitorRippleVpp`: ΔV ≈ Iload / (f_ripple · C) |
| CRC | `crcRippleAttenuation`: first-order R–C2 at f_ripple |
| CLC | `clcRippleAttenuationStub`: coarser LC divider, labeled stub |
| Regulator residual ripple | `regulatorResidualRippleVpp` via `PSRR_dB_120Hz` |
| Headroom | `headroomV`: Vdc_min − Vout − Vdropout |
| Dissipation | `regulatorDissipationW`: (Vin_avg − Vout) · Iload; thermal flag if &gt; 1 W (no θJA model) |

Pass/fail compares estimated load ripple to `ripple_target_mVpp` and headroom ≥ 0.

## Component library

Edit [`public/data/components.json`](public/data/components.json) (version 1). Fetched at runtime from `${import.meta.env.BASE_URL}data/components.json`.

| Array | Fields |
| --- | --- |
| `diodes` | `id`, `name`, `Vf`, `If_max`, `Vrrrm` |
| `capacitors` | `id`, `name`, `C_uF`, `V_rated`, `ESR_ohm`, `type` |
| `resistors` | `id`, `name`, `R_ohm`, `P_max_W` |
| `chokes` | `id`, `name`, `L_H`, `I_sat_mA`, `DCR_ohm` |
| `regulators` | `id`, `name`, `type` (`series_IC` \| `series_discrete`), `Vdropout`, `I_max_A`, `PSRR_dB_120Hz`, `Vref` (number or `null`) |

Optional `notes` mark placeholders. Seed parts: **1N4007**, **LM317**, **7805**, generic electrolytics including 4700 µF / 35 V. Chokes and the discrete regulator are labeled **PLACEHOLDER** — no invented catalog numbers.

## Presets

[`public/data/presets.json`](public/data/presets.json): `id`, `name`, `description`, `enabled`, polarity, and circuit/spec fields. Disabled / `comingSoon` presets appear in the picker but do not overwrite a working draft (`phono_p15`, `power_amp_placeholder`).

## Out of scope

- SPICE / time-domain solver (the chart is an EXAMPLE drawing)
- Dual ± rails, transformer design, BOM, shopping links, auth, backend

## License

Unlicensed unless the repository owner adds one.
