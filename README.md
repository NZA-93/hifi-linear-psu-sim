# HiFi Linear PSU Dimensioner

Browser scaffold for **dimensioning linear HiFi power supplies**. Enter output voltage, load current, and a ripple target, then assemble a starting topology (transformer → rectifier → filters → regulator). Rectifier type can be switched between diode, tube, and IC.

This repository is an **MVP shell**. The UI, editable component library, and a typed `simulate()` stub are in place. **Electrical formulas and device models are owned by Circuit Designer** and must not be invented in the UI layer.

## Status

| Area | This PR |
| --- | --- |
| Spec inputs, rectifier selector, add/remove stages | UI state only |
| Metrics (ripple, regulation, dropout headroom) | `pending_model` / N/A |
| Time-domain chart | Static EXAMPLE sine, not a simulation |
| Component library | Editable JSON, placeholder parts |
| Analytic RLC / rectifier / regulator models | **Not implemented** |

## Local development

Requires Node.js 22+ (20+ should work).

```bash
npm install
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173/hifi-linear-psu-sim/`). The `base` path is `/hifi-linear-psu-sim/` so GitHub Pages project-site URLs work locally too.

Useful scripts:

```bash
npm run typecheck   # tsc project references
npm test            # vitest: stub simulate() + library schema
npm run build       # typecheck + production bundle to dist/
npm run preview     # serve dist/ locally
```

## Deploy to GitHub Pages

The Vite `base` is `/hifi-linear-psu-sim/` (the repository name). The production URL will be:

`https://<owner>.github.io/hifi-linear-psu-sim/`

1. **Enable Pages** in the GitHub repo: Settings → Pages → Source: **GitHub Actions**.
2. Push to `main`. The workflow in `.github/workflows/pages.yml` builds `dist/` and deploys it.
3. `.github/workflows/ci.yml` runs typecheck, tests, and build on pull requests.

Manual deploy without Actions:

```bash
npm ci
npm run build
# upload the contents of dist/ to Pages (gh-pages branch, /docs, etc.)
```

To serve from a custom domain or a path-less site, set `base: './'` in `vite.config.ts` (relative asset URLs).

## Component library schema

Edit [`public/components.json`](public/components.json). The app fetches it at runtime (`${import.meta.env.BASE_URL}components.json`), so you can iterate on parts without changing TypeScript. Values in `params` are **placeholders** (`TBD`) until Circuit Designer supplies real data.

Top-level document:

| Field | Type | Notes |
| --- | --- | --- |
| `schemaVersion` | number | Bump when the schema changes. |
| `parts` | array | Unique `id` per part. |

Each part:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Stable key referenced from circuit stages. |
| `type` | `'R' \| 'L' \| 'C' \| 'diode' \| 'tube' \| 'ic_rect' \| 'regulator' \| 'transformer'` | |
| `label` | string | Display name. |
| `params` | object | Generic key/value map (`string \| number \| boolean`). No implied units or physics. |
| `notes` | string (optional) | Human comments; use PLACEHOLDER language for stub parts. |

Parsing lives in `src/library.ts` (`parseComponentLibrary`). Invalid documents fail closed.

## Simulation API (stub)

```ts
simulate(circuit, specs) → {
  rippleMVpp: null,
  regulationPct: null,
  dropoutHeadroomV: null,
  status: 'pending_model',
  comments: string[]
}
```

Implementation: [`src/sim/simulate.ts`](src/sim/simulate.ts). Comments echo the circuit and specs so the UI can show that inputs were received. **Do not fill numeric metrics with invented physics.** When Circuit Designer provides analytic models, replace the body of `simulate()` and keep the same TypeScript contract (`src/types.ts`).

## Out of scope (intentionally)

- SPICE or any real circuit solver
- Rectifier / regulator / transformer design equations
- BOM cost, shopping links, auth, backend, databases

## License

Unlicensed unless the repository owner adds one.
