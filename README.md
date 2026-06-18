# HeatFlow

A responsive React + Material UI web app that helps you work out **which windows, doors,
and airflow paths cool an apartment most efficiently during a heat wave**.

You sketch your home as a set of room polygons, describe the walls (thickness + R-value
from common presets), place windows and doors (from preset types), set indoor and
outdoor temperatures — including separate outside zones such as a shaded courtyard — then
run a dynamic thermal simulation to watch heat move and find the best way to cool down.

## What it does

- **Draw the plan** — free-polygon rooms with grid + corner snapping. Shared edges are
  auto-detected as interior walls; the rest become exterior walls.
- **Describe the fabric** — pick a wall construction and thickness (R-value shown),
  add windows/doors from preset types with height and sill, and assign each exterior
  wall to an outside zone.
- **Set conditions** — per-room starting temperature and thermal mass; per-zone constant
  or day/night (diurnal) outdoor temperatures.
- **Simulate** — toggle openings open/closed and run a time-stepping simulation. See an
  animated temperature heatmap, airflow arrows through open openings, a per-room
  temperature-vs-time chart, a "cooling score" (degree-hours above comfort), and
  plain-language suggestions.
- **Compare** — save open/closed configurations as scenarios and re-apply them.
- Autosaves to `localStorage`; import/export plans as JSON.

## The model

Each room is a lumped thermal mass. Heat moves by:

1. **Conduction** through walls and closed openings — `Q = U·A·ΔT`.
2. **Ventilation** through open windows/doors — buoyancy/stack flow plus a background
   breeze, carrying air enthalpy `Q = ρ·c·V̇·ΔT`.
3. **Mixing** between rooms through open interior doors.

Temperatures are integrated forward with adaptive explicit Euler steps (in a Web Worker).
These are engineering estimates for building intuition — not a certified building-energy
or CFD tool. Solar gain through glass, wind direction, and humidity are not yet modelled.

## Stack

Vite · React + TypeScript · MUI v7 · Konva/react-konva (canvas) · Zustand (state) ·
Comlink Web Worker (simulation) · Recharts (chart) · Vitest (tests).

## Scripts

```bash
npm run dev      # start the dev server
npm run build    # type-check + production build
npm run lint     # eslint
npm test         # run unit tests (geometry + physics)
```

## Project layout

- `src/model/` — data types, geometry helpers, wall derivation, sample project
- `src/presets/` — wall / window / door presets (R and U values)
- `src/sim/` — thermal simulation engine, Web Worker, cooling hints (+ tests)
- `src/editor/` — Konva floor-plan canvas, view transform, snapping
- `src/panels/` — toolbar, property editors, simulate controls, scenarios, settings
- `src/viz/` — colour scale, temperature chart, heatmap legend
- `src/state/` — Zustand stores (project / ui / sim) and playback
- `src/ui/` — responsive app shell and the model disclaimer
