# HeatFlow — Project Overview

## What it is

HeatFlow is a browser-based passive-cooling planner for apartments and houses. During a
heat wave the cheapest way to cool a home is correct use of windows, doors, and
cross-ventilation (night flushing, stack effect, shading sun-facing openings by day). But
it is unintuitive *which* openings to use and *when*.

The app lets a user:

1. **Sketch their floor plan** as free polygons (room outlines snapped to a 0.25 m grid).
2. **Configure walls, windows and doors** from built-in presets — material type,
   thickness, and glazing standard.
3. **Set temperatures** — initial temperature per room, and one or more outside
   environments (global outdoors, a shaded courtyard, etc.), each with an optional daily
   diurnal swing (e.g. 20 °C overnight / 38 °C at 2 pm).
4. **Run a dynamic thermal simulation** and watch heat move through the plan on an
   animated heatmap with particle trails that show airflow direction and temperature.
5. **Compare scenarios** — save named open/closed window configurations and re-run to
   find the best strategy.

## Target audience

Residents dealing with summer heat waves who want a qualitative, actionable
understanding of airflow and thermal mass in their home, without needing engineering
knowledge. The tool surfaces plain-language hints ("open living-room window and bedroom
door at night for cross-ventilation") and a single **cooling score** (lower is better).

## Design goals

| Goal | How it is met |
|---|---|
| Approachable | Polygon sketching on a canvas, no CAD knowledge needed |
| Physically grounded | RC lumped-network simulation, stack-effect ventilation physics |
| Honest | Disclaimer dialog explaining model limitations |
| Fast to explore | Web Worker keeps UI smooth while sim runs; autosave to localStorage |
| Metric-first | Metres, °C, R-values in m²·K/W — EU / FR locale target |

## Key concepts

**Rooms** are closed polygons. A two-room apartment drawn as two adjacent rectangles
automatically shares the coincident edge as an interior wall; the outer edges become
exterior walls attached to the global outside zone.

**Outside zones** can be the global open sky (hot in summer) or enclosed spaces like a
north-facing courtyard that stays cooler. Each zone has an optional sinusoidal daily
temperature profile.

**Walls** carry a material type (presets: solid brick, insulated cavity, timber stud,
etc.) and a thickness; the app derives the R-value and conduction conductance.

**Openings** (windows or doors) live on a wall at a parametric position (0 → 1 along
the wall length). Preset options fix glazing U-value, discharge coefficient, and nominal
size. Each opening has an `isOpen` flag; only open openings allow ventilation flow.

**Scenarios** are snapshots of the open/closed state of every opening, named and
replayable, so the user can compare e.g. "night flush all windows" vs "courtyard only".

## User journey (typical session)

```
Open app → sample two-room plan shown (can reset to blank)
  ↓
Edit tab:
  Draw/edit rooms → adjust wall materials → place windows & doors
  Set room temperatures and outside zone temperatures
  Toggle openings open/closed
  ↓
Simulate tab:
  Click "Run simulation" → worker runs 24–72 h simulation
  Watch animated heatmap + heat-particle trails
  Read cooling score + plain-language suggestions
  Adjust openings, re-run, compare
  Save scenarios → apply and compare cooling scores
```

## Tech stack at a glance

| Layer | Choice |
|---|---|
| Framework | React 19 + TypeScript via Vite |
| UI components | MUI v7 (Material UI) |
| Canvas / 2D | react-konva (Konva.js) |
| State | Zustand + immer |
| Simulation | Pure TypeScript, runs in a Comlink Web Worker |
| Charts | Recharts |
| Testing | Vitest + React Testing Library |
| Persistence | localStorage autosave + JSON import/export |
