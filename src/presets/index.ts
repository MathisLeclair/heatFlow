/**
 * Common building-element presets. Values are typical engineering figures, not
 * certified data — the app surfaces a disclaimer to that effect.
 *
 * Wall R-values are thermal resistances in m²·K/W for the listed reference thickness;
 * we scale linearly with thickness around that reference. Window/door U-values are in
 * W/(m²·K). Conductance U = 1 / (R + surface films).
 *
 * Opening presets are now split into two independent concepts:
 *   - GlazingPreset  — thermal properties (U-value, Cd); stored as Opening.presetId
 *   - SizePreset     — physical dimensions; stored as Opening.sizePresetId
 */

export interface WallType {
  id: string
  name: string
  /** Reference thickness in metres for the quoted R-value. */
  refThicknessM: number
  /** Thermal resistance (m²·K/W) at the reference thickness, fabric only. */
  rValue: number
  /** Selectable thickness options (m). */
  thicknessOptions: number[]
  /** Fraction of incident solar radiation absorbed by the exterior surface (0–1). */
  solarAbsorptance: number
}

/** Thermal properties of a window or door — independent of physical size. */
export interface GlazingPreset {
  id: string
  kind: 'window' | 'door'
  name: string
  /** Overall heat-transfer coefficient when closed, W/(m²·K). */
  uValue: number
  /** Discharge coefficient when open (orifice efficiency, ~0.6). */
  dischargeCoeff: number
  /** Solar heat gain coefficient: fraction of incident solar radiation transmitted into the room (0–1). */
  shgc: number
}

/** Physical size of a window or door — independent of glazing type. */
export interface SizePreset {
  id: string
  kind: 'window' | 'door'
  name: string
  widthM: number
  heightM: number
  sillHeightM: number
}

/**
 * Legacy combined preset — kept only for backwards compatibility with
 * openingPresetById() used in the simulation.
 */
export interface OpeningPreset extends GlazingPreset {
  widthM: number
  heightM: number
  sillHeightM: number
}

/** Inside + outside surface film resistances (m²·K/W), roughly per ISO 6946. */
export const SURFACE_FILM_R = 0.13 + 0.04

export const WALL_TYPES: WallType[] = [
  {
    id: 'brick-solid',
    name: 'Solid brick (uninsulated)',
    refThicknessM: 0.22,
    rValue: 0.35,
    thicknessOptions: [0.1, 0.22, 0.33, 0.45],
    solarAbsorptance: 0.75,
  },
  {
    id: 'concrete',
    name: 'Concrete / block (uninsulated)',
    refThicknessM: 0.2,
    rValue: 0.2,
    thicknessOptions: [0.1, 0.2, 0.3],
    solarAbsorptance: 0.65,
  },
  {
    id: 'cavity-insulated',
    name: 'Insulated cavity wall',
    refThicknessM: 0.3,
    rValue: 2.5,
    thicknessOptions: [0.25, 0.3, 0.35],
    solarAbsorptance: 0.70,
  },
  {
    id: 'timber-stud-insulated',
    name: 'Insulated timber stud',
    refThicknessM: 0.2,
    rValue: 3.5,
    thicknessOptions: [0.12, 0.2, 0.25],
    solarAbsorptance: 0.60,
  },
  {
    id: 'interior-partition',
    name: 'Interior partition (plasterboard)',
    refThicknessM: 0.1,
    rValue: 0.4,
    thicknessOptions: [0.07, 0.1, 0.12],
    solarAbsorptance: 0.55,
  },
]

// ─── Window glazing presets ───────────────────────────────────────────────────

export const WINDOW_PRESETS: GlazingPreset[] = [
  { id: 'window-single', kind: 'window', name: 'Single glazing',    uValue: 5.0, dischargeCoeff: 0.6, shgc: 0.86 },
  { id: 'window-double', kind: 'window', name: 'Double glazing',    uValue: 2.8, dischargeCoeff: 0.6, shgc: 0.70 },
  { id: 'window-lowe',   kind: 'window', name: 'Low-E double',      uValue: 1.4, dischargeCoeff: 0.6, shgc: 0.40 },
  { id: 'window-triple', kind: 'window', name: 'Triple glazing',    uValue: 0.8, dischargeCoeff: 0.6, shgc: 0.35 },
]

export const WINDOW_SIZE_PRESETS: SizePreset[] = [
  { id: 'win-sz-small',    kind: 'window', name: 'Small (0.6 × 0.9 m)',           widthM: 0.6,  heightM: 0.9,  sillHeightM: 1.0 },
  { id: 'win-sz-standard', kind: 'window', name: 'Standard (1.0 × 1.2 m)',        widthM: 1.0,  heightM: 1.2,  sillHeightM: 0.9 },
  { id: 'win-sz-large',    kind: 'window', name: 'Large (1.4 × 1.4 m)',           widthM: 1.4,  heightM: 1.4,  sillHeightM: 0.7 },
  { id: 'win-sz-bay',      kind: 'window', name: 'Bay / picture (2.0 × 1.6 m)',   widthM: 2.0,  heightM: 1.6,  sillHeightM: 0.4 },
  { id: 'win-sz-tall',     kind: 'window', name: 'Tall (1.0 × 1.8 m)',            widthM: 1.0,  heightM: 1.8,  sillHeightM: 0.2 },
  { id: 'win-sz-full',     kind: 'window', name: 'Floor-to-ceiling (1.0 × 2.2 m)', widthM: 1.0, heightM: 2.2,  sillHeightM: 0.0 },
]

// ─── Door glazing presets ─────────────────────────────────────────────────────

export const DOOR_PRESETS: GlazingPreset[] = [
  { id: 'door-interior',  kind: 'door', name: 'Interior (hollow core)',  uValue: 2.5, dischargeCoeff: 0.65, shgc: 0.0 },
  { id: 'door-exterior',  kind: 'door', name: 'Exterior (solid core)',   uValue: 2.0, dischargeCoeff: 0.65, shgc: 0.0 },
  { id: 'door-insulated', kind: 'door', name: 'Insulated exterior',      uValue: 1.2, dischargeCoeff: 0.65, shgc: 0.0 },
  { id: 'door-glazed',    kind: 'door', name: 'Full-glazed panel',       uValue: 2.8, dischargeCoeff: 0.65, shgc: 0.65 },
]

export const DOOR_SIZE_PRESETS: SizePreset[] = [
  { id: 'door-sz-single', kind: 'door', name: 'Single (0.83 × 2.04 m)',     widthM: 0.83, heightM: 2.04, sillHeightM: 0 },
  { id: 'door-sz-wide',   kind: 'door', name: 'Wide single (0.93 × 2.10 m)', widthM: 0.93, heightM: 2.10, sillHeightM: 0 },
  { id: 'door-sz-double', kind: 'door', name: 'Double (1.60 × 2.10 m)',     widthM: 1.60, heightM: 2.10, sillHeightM: 0 },
  { id: 'door-sz-french', kind: 'door', name: 'French / patio (1.40 × 2.10 m)', widthM: 1.40, heightM: 2.10, sillHeightM: 0 },
  { id: 'door-sz-slider', kind: 'door', name: 'Sliding glass (1.80 × 2.10 m)', widthM: 1.80, heightM: 2.10, sillHeightM: 0 },
]

// ─── Legacy combined presets (backwards compat for openingPresetById) ─────────
// These are not shown in the UI dropdowns but let the simulation find U-value
// and Cd for any presetId stored in old saved projects.

const LEGACY_COMBINED: OpeningPreset[] = [
  // Old combined "large bay" entry — glazing was double, size was large
  { id: 'window-large', kind: 'window', name: 'Large double-glazed bay (legacy)', uValue: 2.8, dischargeCoeff: 0.6, shgc: 0.70, widthM: 2.0, heightM: 1.6, sillHeightM: 0.5 },
  // Old door-french (French doors) — now split into door-glazed + door-sz-french
  { id: 'door-french', kind: 'door', name: 'French doors (legacy)', uValue: 2.8, dischargeCoeff: 0.65, shgc: 0.65, widthM: 1.5, heightM: 2.1, sillHeightM: 0 },
]

// All glazing presets cast as OpeningPreset for simulation lookup (size fields unused there)
const _DUMMY_SIZE = { widthM: 1.0, heightM: 1.2, sillHeightM: 0.9 }
const ALL_OPENING_PRESETS: OpeningPreset[] = [
  ...[...WINDOW_PRESETS, ...DOOR_PRESETS].map((g) => ({ ...g, ..._DUMMY_SIZE })),
  ...LEGACY_COMBINED,
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function wallTypeById(id: string): WallType {
  return WALL_TYPES.find((w) => w.id === id) ?? WALL_TYPES[0]
}

export function openingPresetById(id: string): OpeningPreset {
  return ALL_OPENING_PRESETS.find((p) => p.id === id) ?? ALL_OPENING_PRESETS[0]
}

export function sizePresetById(id: string): SizePreset {
  const all = [...WINDOW_SIZE_PRESETS, ...DOOR_SIZE_PRESETS]
  return all.find((p) => p.id === id) ?? WINDOW_SIZE_PRESETS[1]
}

export const DEFAULT_WINDOW_SIZE_ID = 'win-sz-standard'
export const DEFAULT_DOOR_SIZE_ID   = 'door-sz-single'

// ─── Fan presets ──────────────────────────────────────────────────────────────

export interface FanPreset {
  kind: 'ceiling' | 'standing' | 'box'
  name: string
  /** Forced volumetric flow (m³/s) for box fans directed at an opening. 0 for room fans. */
  flowRateM3S: number
  /**
   * Comfort-threshold offset (°C) for ceiling/standing fans: the occupant feels
   * comfortable at this many degrees warmer than without the fan. Not stored on
   * the Fan entity — looked up at scoring time from the kind.
   */
  comfortOffsetC: number
}

export const FAN_PRESETS: FanPreset[] = [
  { kind: 'ceiling',  name: 'Ceiling fan',  flowRateM3S: 0,    comfortOffsetC: 2.0 },
  { kind: 'standing', name: 'Standing fan', flowRateM3S: 0,    comfortOffsetC: 1.5 },
  { kind: 'box',      name: 'Box fan',      flowRateM3S: 0.09, comfortOffsetC: 0.0 },
]

export function fanPresetByKind(kind: string): FanPreset {
  return FAN_PRESETS.find((f) => f.kind === kind) ?? FAN_PRESETS[0]
}

// ─── Portable AC presets ──────────────────────────────────────────────────────

export interface AcPreset {
  coolingPowerW: number
  name: string
}

export const AC_PRESETS: AcPreset[] = [
  { coolingPowerW: 1000, name: 'Small (~1 kW / 3 500 BTU)' },
  { coolingPowerW: 2000, name: 'Medium (~2 kW / 7 000 BTU)' },
  { coolingPowerW: 3500, name: 'Large (~3.5 kW / 12 000 BTU)' },
]

/** R-value of a wall scaled from its preset to an arbitrary thickness. */
export function wallResistance(wallTypeId: string, thicknessM: number): number {
  const t = wallTypeById(wallTypeId)
  return t.rValue * (thicknessM / t.refThicknessM)
}
