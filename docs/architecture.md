# HeatFlow — Technical Architecture

## Repository layout

```
src/
  model/          Core data types, geometry helpers, wall derivation, sample project
  presets/        Static building-element presets (walls, windows, doors)
  sim/            Thermal simulation engine + Web Worker wrapper + hint generator
  editor/         Konva canvas, view transform, snapping, resize observer
  viz/            Color scale, heat-particle system, emitter precompute, chart, legend
  state/          Zustand stores (project, sim, ui) + playback rAF hook
  panels/         MUI side-panel components (edit toolbar, properties, simulate, etc.)
  ui/             App shell, disclaimer dialog
  persistence/    localStorage save/load
  test/           Vitest setup
docs/             This documentation
```

---

## Data model (`src/model/types.ts`)

All geometry is stored in **metres** in a right-handed 2-D coordinate system (x right,
y down in canvas space).

```
Project
  id, name
  comfortTempC        comfort threshold for the cooling score
  simHours            simulation duration (e.g. 24 or 72)
  outsideZones[]      OutsideZone
  rooms[]             Room
  walls[]             Wall          ← derived from room polygons, but persisted
  openings[]          Opening
  scenarios[]         Scenario
```

### OutsideZone

```typescript
{ id, kind: 'global'|'custom', name, tempC, diurnal?: DiurnalProfile, color }
DiurnalProfile { minC, maxC, peakHour }   // sinusoidal daily swing
```

The global zone cannot be removed. Custom zones (e.g. a courtyard) can be assigned to
individual exterior walls via the properties panel.

Temperature at any hour: `T(h) = mid + amp · cos(2π(h − peakHour)/24)`

### Room

```typescript
{ id, name, polygon: Point[], initialTempC, ceilingHeightM, thermalMassMultiplier, color }
```

`thermalMassMultiplier` (~5–12) scales the air heat capacity to approximate furniture and
inner wall surfaces that buffer temperature. Volume = `polygonArea(polygon) × ceilingHeightM`.

### Wall (derived)

```typescript
{ id, a: Point, b: Point, sideA: ZoneRef, sideB: ZoneRef,
  wallTypeId, thicknessM, exterior: boolean }
ZoneRef = { type: 'room'|'outside', id }
```

Walls are **derived** from room polygons each time geometry changes (see below), but
stored explicitly so the user can edit thermal properties. Thermal settings are preserved
across geometry rebuilds by matching coincident edges.

### Opening

```typescript
{ id, kind: 'window'|'door', wallId, presetId, t: 0..1,
  widthM, heightM, sillHeightM, isOpen }
```

`t` is the parametric position of the opening centre along its wall
(`0` = vertex a, `1` = vertex b). Visual extent: `[t − half, t + half]` where
`half = widthM / (2 × wallLength)`.

---

## Wall derivation (`src/model/walls.ts`)

Called after every geometry change (add/edit/remove room polygon).

**Algorithm:**

1. Collect every directed edge `(a→b)` from every room polygon.
2. For each pair of edges: if `|a1−a2| < ε AND |b1−b2| < ε` **or**
   `|a1−b2| < ε AND |b1−a2| < ε` (same segment, either orientation), they are
   **coincident** (tolerance `ε = 0.25 m`). These become **interior walls** (room↔room).
3. Unmatched edges become **exterior walls**, assigned to the global outside zone by
   default.
4. Existing wall thermal settings (wallTypeId, thicknessM) are preserved by matching the
   new wall's endpoints against the prior wall list.
5. Openings whose wall was removed are **pruned** (`pruneOrphanOpenings`).

Grid snapping during drawing (`useMemoizedSnap`, 0.25 m grid + 0.4 m vertex snap)
ensures shared vertices align within the coincidence tolerance.

---

## Presets (`src/presets/index.ts`)

All values are typical engineering figures. A disclaimer dialog surfaces this to users.

### Wall types

| ID | Name | R-value (m²·K/W) | Ref thickness |
|---|---|---|---|
| `brick-solid` | Solid brick | 0.35 | 0.22 m |
| `concrete` | Concrete / block | 0.20 | 0.20 m |
| `cavity-insulated` | Insulated cavity | 2.50 | 0.30 m |
| `timber-stud-insulated` | Insulated timber stud | 3.50 | 0.20 m |
| `interior-partition` | Plasterboard partition | 0.40 | 0.10 m |

R-value scales linearly with thickness: `R = R_ref × (thickness / refThickness)`.
Total conductance includes ISO 6946 surface films: `U = 1 / (R + 0.17)`.

### Window presets (5)

Single (U=5.0), Double (U=2.8), Low-E double (U=1.4), Triple (U=0.8), Large bay (U=2.8,
wider). All have discharge coefficient `Cd = 0.6`.

### Door presets (3)

Interior hollow (U=2.5, w=0.83 m), Exterior solid (U=2.0, w=0.9 m),
French doors (U=2.8, w=1.5 m). `Cd = 0.65`.

---

## Simulation engine (`src/sim/simulate.ts`)

### Thermal model

Rooms are **lumped capacitances** (well-mixed air + buffered mass). Outside zones are
temperature boundary conditions. The network has two edge types:

**Solid edge** — conduction through wall fabric and closed openings:
```
Q = U · A · ΔT      [W]
U = 1 / (R_fabric + R_surface_films)
```

**Vent edge** — open opening (window or door), advective exchange:
```
Q = ρ_air · c_p · V̇ · ΔT      [W]
V̇ = (Cd/3)·A·√(g·ΔH·|ΔT|/T̄_K) + Cd·A·V_breeze   [m³/s]
```

The first term is the buoyancy / stack-effect flow (height `ΔH` = opening height,
`T̄_K` = mean absolute temperature, `g = 9.81 m/s²`). The second is a baseline ambient
breeze term (`V_breeze = 0.12 m/s`). Rooms with ≥ 2 open exterior openings get a
`CROSS_VENT_BOOST = 1.6×` multiplier (cross-ventilation is empirically much more
effective than single-sided).

### Integration

Adaptive explicit Euler:

```
dT_i/dt = ΣQ_i / C_i

dt ≤ 0.4 · min_i(C_i / G_sum_i)     (stability limit)
dt also capped at the next output frame boundary
dt ≥ 0.01 s (minimum step to prevent infinite loop)
```

Output frames are emitted at intervals of `min(0.1 h, simHours/200)` — about every
6 minutes of simulated time, giving ≥ 200 frames for a 24 h run.

### Cooling score

Trapezoidal integration of per-room temperature excess above `comfortTempC`, averaged
over rooms:

```
score = mean_rooms(∫ max(0, T(t) − T_comfort) dt)     [°C·h]
```

Lower score = less total discomfort. Used to colour the score card green/amber/red.

### Web Worker

`src/sim/sim.worker.ts` exposes a Comlink API `{ run(project): SimResult }`. The
`simStore` creates the worker lazily on first use and calls `run`, storing the result.
`simStore.frame` is an index into `result.hours[]` (0 … N-1), driven by the `usePlayback`
rAF loop.

---

## Visualization (`src/viz/` + `src/editor/FloorPlanCanvas.tsx`)

### Canvas layers (Konva, bottom → top)

1. **GridLines** — faint 1 m reference grid, emphasized every 5 m.
2. **Rooms** — filled closed polygons; simulate mode uses `tempToColor(T, min, max)`.
   Shadow + `lineJoin="round"` for modern look.
3. **Room labels** — room name + temperature (in simulate mode) with white halo for
   legibility over any fill color.
4. **Walls** — exterior walls drawn thicker/darker than interior partitions.
5. **Openings** — colored line segments (blue = window, brown = door); dashed = closed.
6. **HeatParticles** — imperative rAF particle layer (see below).
7. **Airflow arrows** — directional Arrow per open opening, opacity 0.5.
8. **Editing overlays** — draft polygon while drawing, draggable vertex handles for
   selected room.

### Heat-particle system (`src/viz/HeatParticles.tsx`)

A pool of up to **420 Konva.Circle nodes** driven by its own `requestAnimationFrame`
loop (no React re-renders in the hot path).

**Per-frame:**
- For each open opening with flow > 0.02 m³/s: accumulate `flow × SPAWN_RATE × dt`
  spawn credits and emit particles at the opening centre, launched in the simulated
  airflow direction (emitter inward normal × `dir` sign from sim result).
- Each particle integrates: `p += v·dt`, `v *= (1 − DRAG·dt)`, buoyancy
  `vy -= (temp − midTemp) × 0.06 × dt` (warm rises = −y in canvas), plus a small
  random jitter.
- Color: `tempToColor(particle.temp, globalMin, globalMax)` — same 6-stop blue→red
  ramp as the room heatmap.
- Opacity fades in (first 0.3 s) and out (last 0.8 s of lifetime).
- Lifetime 2.4–4.2 s (randomized).

**Emitter precompute** (`src/viz/emitters.ts`): for each opening, stores the wall-centre
point and an inward unit normal (oriented toward the sideA room centroid). Recomputed
only when the project changes.

### Color scale (`src/viz/colorScale.ts`)

Six-stop blue → cyan → green → yellow → orange → red ramp mapped linearly from the
global simulation min to max temperature. Also used for the Legend gradient.

### Temperature chart (`src/viz/TempChart.tsx`)

Recharts `LineChart`, downsampled to ≤ 240 points. One colored line per room, a dashed
`ReferenceLine` at `comfortTempC`, and a vertical line at the current playback frame.

---

## State management

### `projectStore` (Zustand + immer)

Single source of truth for the `Project` document. Every action that mutates room
geometry calls `deriveWalls` and `pruneOrphanOpenings`. Autosaves to localStorage after
a 400 ms debounce.

### `uiStore`

Ephemeral UI state: current tool (`select` | `draw-room` | `add-window` | `add-door`),
current selection (room/wall/opening/zone id), mode (`edit` | `simulate`), pending
preset IDs for the add tools.

### `simStore`

Holds the latest `SimResult`, running/error flags, current `frame`, `playing`, `speed`.
`run(project)` calls the Comlink worker. `usePlayback` drives `frame` via rAF using a
fractional accumulator at `framesPerSec = (totalFrames/20) × speed`.

---

## Testing

**`src/sim/simulate.test.ts`** (6 tests):
- `zoneTempAt` peaks at correct hour; constant without diurnal.
- Room drifts toward outside temperature (120 h conduction-only run).
- Open window cools faster than closed (compare at 1 h).
- Cross-ventilation cools faster than single window (compare at 0.5 h).
- `SimResult` shape: correct array lengths, score ≥ 0.

**`src/model/walls.test.ts`** (3 tests):
- Two adjacent rooms → 1 interior + 6 exterior = 7 walls.
- Isolated room → 4 exterior walls.
- Thermal settings preserved across geometry rebuild.

Run with `npm test`. TypeScript checked with `npm run typecheck`. Lint with `npm run lint`.
