# HeatFlow — UI & Design Specification

## Design language

The visual identity reads as a **precision tool for heat**, not a casual app:

- **Primary color** — Deep teal `#0e7c86` (cool, clinical, trustworthy).
- **Accent** — Warm orange `#f97316` (maps to heat, used sparingly for contrast and the
  score card when conditions are uncomfortable).
- **Background** — Off-white `#eef2f4`; panels on white `#ffffff`.
- **App bar** — Dark-to-teal gradient `linear-gradient(100deg, #0b1f2a, #0e7c86)` giving
  a deep-navy→teal sweep.
- **Canvas background** — Radial gradient `#f4f8f9 → #dde6e9 → #cfd9dd` (top-lit matte
  floor plan look).
- **Typography** — Inter (Google Fonts). `h6` 700 weight for app title; `subtitle2` all-caps
  uppercase small caps for section headers; `body2` for data. `fontSize: 13` base.
- **Shape** — `borderRadius: 12` on papers; `10` on buttons and toggles. No sharp corners.
- **Elevation** — Used minimally. Canvas sits flush; side panel uses a `divider` border, not a shadow.

### Color semantics in visualizations

| Hue | Meaning |
|---|---|
| Blue `#5b8dee` → Cyan `#29c4d0` | Cool air / low temperature |
| Green `#4ade80` | Near-comfortable temperature |
| Yellow `#fbbf24` | Warming |
| Orange `#fb923c` | Hot |
| Red `#ef4444` | Very hot |
| Blue `#0288d1` (opaque line) | Window opening on canvas |
| Brown `#6d4c41` (opaque line) | Door opening on canvas |
| Dashed line | Closed opening |
| Solid line | Open opening |

---

## Layout

### Desktop (≥ md breakpoint, ≥ 900 px)

```
┌─────────────────────────────────────────────────────────────┐
│  AppBar  [❄ HeatFlow]  [Edit plan] [Simulate]       [ℹ]    │
├──────────────────────────────────────┬──────────────────────┤
│                                      │                      │
│            Konva Canvas              │   Side Panel         │
│         (flex: 1, fills space)       │   (360 px fixed)     │
│                                      │                      │
│   [Legend overlay — bottom-left]     │   Edit mode:         │
│                                      │     EditToolbar      │
│                                      │     PropertiesPanel  │
│                                      │     ZoneListPanel    │
│                                      │     ProjectSettings  │
│                                      │                      │
│                                      │   Simulate mode:     │
│                                      │     SimulatePanel    │
│                                      │     ScenariosPanel   │
│                                      │     TempChart        │
└──────────────────────────────────────┴──────────────────────┘
```

- The canvas box uses `ResizeObserver` (`useElementSize`) to pass pixel-exact
  `width` / `height` to `<FloorPlanCanvas>`. The Konva `Stage` matches these exactly.
- `minHeight: 0` on both flex children prevents overflow on small screens.
- Legend is absolutely positioned inside the canvas box (`position: absolute`).

### Mobile (< md, < 900 px)

```
┌──────────────────────────────────────┐
│  AppBar  [❄ HeatFlow] [Edit][Sim] [ℹ]│
├──────────────────────────────────────┤
│                                      │
│    Canvas  (50 vh min-height)        │
│                                      │
├──────────────────────────────────────┤
│    Side panel (full width,           │
│    border-top, scrollable)           │
└──────────────────────────────────────┘
```

---

## Component inventory

### AppBar

- Gradient background (theme override).
- `AcUnitIcon` (snowflake) + `HeatFlow` title.
- MUI `Tabs` with `indicatorColor="secondary"` (orange underline) and `textColor="inherit"`.
- Tab values: `"edit"` / `"simulate"` — wired to `uiStore.mode`.
- Info `IconButton` opens `DisclaimerDialog`.

### FloorPlanCanvas (Konva Stage)

Full-resolution 2-D canvas. Coordinate system is metres; `fitTransform` computes a scale
+ offset to center and fit the plan into the available pixels.

**Tool modes** (driven by `uiStore.tool`):
- `select` — click room/wall/opening to select; drag vertex handles to reshape room.
- `draw-room` — click to add vertices; click near first vertex to close the polygon.
- `add-window` / `add-door` — click near a wall to place opening at the nearest point.

**Editing overlays:**
- Draft polygon: dashed blue line + blue dots showing in-progress vertices.
- Vertex handles: white/teal `Circle` nodes on the selected room's polygon, draggable.

**Cursor**: `crosshair` when any drawing tool active; `default` for select.

### EditToolbar

`ToggleButtonGroup` for tool selection:
- Select (arrow icon)
- Draw room (pencil icon)
- Add window (dropdown for preset type when active)
- Add door (dropdown for preset type when active)

When `add-window` or `add-door` is active, a `Select` appears below the toggle group to
choose from the preset list. This sets `uiStore.pendingWindowPreset` /
`uiStore.pendingDoorPreset`.

### PropertiesPanel

Contextual editor — shows one of four sub-editors based on `uiStore.selection`:

**RoomEditor**: name TextField, temperature number input, ceiling height number input,
thermal mass Slider (3–15×), delete button.

**WallEditor**: exterior/interior label, R-value Chip (teal outlined), construction
Select (5 wall types), thickness Select (type-specific options), and — for exterior walls
only — an outside-zone Select to choose which outside environment the wall faces.

**OpeningEditor**: open/closed Switch, preset type Select, width/height/sill TextFields,
position-along-wall Slider (0.05–0.95), delete button.

**ZoneEditor**: name TextField, diurnal swing Switch; if constant: temperature TextField;
if diurnal: night low / day high / peak hour TextFields. Delete button (disabled for
global zone).

### ZoneListPanel

Lists all outside zones with a colored square swatch and name. `Add zone` button.
Clicking a zone item selects it (→ ZoneEditor in PropertiesPanel).

### ProjectSettingsPanel

Project name TextField, comfort temperature TextField, simulation duration Select
(12 / 24 / 48 / 72 h), export-as-JSON button, import-from-JSON button, reset-to-sample
button.

### SimulatePanel

1. **Run button** — `variant="contained"`, shows `CircularProgress` while running.
2. **Openings list** — scrollable (max-height 160 px), each row has the opening label
   ("Window · Living ↔ Outside") and a `Switch` to toggle open/closed without re-running.
   "Open all" / "Close all" shortcut buttons above.
3. **Cooling score card** — gradient `Box` (teal if score < 5, amber if < 30, red otherwise).
   Large `h4` number, `°C·h over comfort` label, caption explaining the metric.
4. **Timeline** — play/pause `IconButton`, reset `IconButton`, current time label
   (`D1 14:30`), `Slider` (0 → N frames), speed `ToggleButtonGroup` (0.5× / 1× / 2× / 4×).
5. **Suggestions** — list of `LightbulbIcon` + body2 text hints from `coolingHints()`.

### ScenariosPanel

Name TextField + Save button → stores current open/closed snapshot.
List of saved scenarios: name, apply button (restores open/closed state), delete button.

### TempChart

Recharts `ResponsiveContainer` → `LineChart`.
- One `Line` per room, colored by `room.color`.
- `ReferenceLine` at `comfortTempC` (dashed, labeled "Comfort").
- Vertical `ReferenceLine` at `result.hours[frame]` (orange, shows current playback position).
- Downsampled to ≤ 240 points for performance.
- X axis: hours; Y axis: °C.

### Legend

Floating `Paper` (bottom-left of canvas, `position: absolute`).
Vertical gradient bar (20 × 120 px CSS `linear-gradient`) from blue to red.
Min temperature label at bottom, max at top (both in °C).

### DisclaimerDialog

Standard `Dialog` (max-width `sm`). Explains:
- Rooms are treated as well-mixed (no CFD).
- Ventilation uses stack-effect / orifice equations, not measured airflow.
- Wall R-values are typical figures.
- Diurnal profiles are sinusoidal approximations.
- Results are estimates for comparative use, not engineering certification.

---

## Interaction patterns

### Drawing a room

1. Switch to `draw-room` tool.
2. Click on canvas to add vertices (snapped to 0.25 m grid or nearest existing vertex
   within 0.4 m radius).
3. When ≥ 3 vertices placed, clicking within ~12 screen-px of the first vertex closes and
   saves the polygon.
4. Tool auto-reverts to `select`.

### Placing a window or door

1. Select the preset type from the dropdown in EditToolbar.
2. Switch to `add-window` / `add-door`.
3. Click anywhere near a wall (< 0.6 m in world space). The opening is placed at the
   nearest point on that wall.
4. Tool auto-reverts to `select`; the new opening is selected → OpeningEditor appears.

### Simulating

1. Adjust room temperatures, outside zone profiles, which openings are open.
2. Switch to Simulate tab → click **Run simulation**.
3. The Comlink worker runs the engine (may take < 1 s for 24 h, a few seconds for 72 h).
4. Canvas switches to heatmap mode: rooms colored by temperature, particles stream from
   open openings.
5. Use the timeline to scrub forward; use play/speed to animate.
6. Adjust openings (Switch in SimulatePanel) and re-run to compare scores.
7. Save a scenario, adjust openings differently, re-run, compare scores.

---

## Responsive breakpoints

`useMediaQuery(theme.breakpoints.down('md'))` (< 900 px) triggers:
- Side panel stacks below canvas instead of beside it.
- Canvas gets `minHeight: 50vh` instead of filling the remaining column.
- Side panel border changes from left to top.

No further breakpoints are defined. Touch targets on canvas (Konva nodes) are at least
12 px hit radius.

---

## Accessibility notes (current state)

- MUI components carry ARIA roles and keyboard navigation by default.
- Canvas interactions (Konva) are mouse-only; no keyboard or touch equivalents are
  implemented yet.
- Color is not the sole encoding for opening state (dashed = closed, solid = open adds
  a pattern dimension).
- The Legend floating panel is not yet screen-reader annotated.

---

## Potential future enhancements (not implemented)

- **Wind direction / speed** input affecting ventilation flow direction and magnitude.
- **Solar gain** through glazing (orientation-dependent, time-of-day).
- **Auto-optimize** — exhaustive or greedy search over open/closed combinations to
  suggest the best configuration, with ranked results.
- **Touch / mobile** editor interactions — pinch-zoom, tap-to-draw.
- **Units toggle** — °F and imperial R-values for US users.
- **3-D section view** — stack effect visualized vertically, showing sill height / warm
  air rising.
- **Export to PDF** — floor plan + simulation summary for sharing.
