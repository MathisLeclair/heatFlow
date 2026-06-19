/**
 * Core data model for HeatFlow.
 *
 * Geometry is stored in metres. The floor plan is a set of rooms (polygons) plus
 * outside zones. Walls are derived edges between two zones (room↔room interior walls,
 * or room↔outside exterior walls). Openings (windows/doors) live on a wall.
 */

export type Id = string

/** A point in plan coordinates, in metres. */
export interface Point {
  x: number
  y: number
}

/** Outside environment a room can border (global outdoors, a courtyard, …). */
export interface OutsideZone {
  id: Id
  kind: 'global' | 'custom'
  name: string
  /** Constant temperature (°C) used when `diurnal` is undefined. */
  tempC: number
  /** Optional daily temperature swing; overrides `tempC` when present. */
  diurnal?: DiurnalProfile
  /**
   * 0 = fully exposed (open air); 1 = fully enclosed (walled courtyard).
   * Reduces the ambient wind component reaching openings that face this zone.
   */
  shelterFactor?: number
  color: string
}

/** Sinusoidal daily temperature profile, peaking at `peakHour`. */
export interface DiurnalProfile {
  minC: number
  maxC: number
  /** Hour of day (0–24) at which the maximum occurs. */
  peakHour: number
}

/** A room: a closed polygon with thermal state. */
export interface Room {
  id: Id
  name: string
  /** Polygon vertices in order (metres). At least 3. */
  polygon: Point[]
  /** Initial / current indoor air temperature (°C). */
  initialTempC: number
  /** Assumed ceiling height (m) — used for air volume. */
  ceilingHeightM: number
  /**
   * Multiplier on bare-air heat capacity to approximate furniture and the inner
   * faces of walls/floors that buffer temperature. ~5–12 is realistic.
   */
  thermalMassMultiplier: number
  color: string
}

/** What sits on the far side of a wall: another room, or an outside zone. */
export type ZoneRef =
  | { type: 'room'; id: Id }
  | { type: 'outside'; id: Id }

/**
 * A wall segment separating two zones. Derived from coincident room polygon edges
 * (interior) or unshared edges (exterior), but stored explicitly so the user can
 * edit thermal properties and attach openings.
 */
export interface Wall {
  id: Id
  /** Endpoints in plan coordinates (metres). */
  a: Point
  b: Point
  /** The two sides. For interior walls both are rooms; exterior has one outside. */
  sideA: ZoneRef
  sideB: ZoneRef
  wallTypeId: Id
  thicknessM: number
  /** Whether this wall is interior (room↔room) or exterior (room↔outside). */
  exterior: boolean
}

export type OpeningKind = 'window' | 'door'

/** A window or door positioned along a wall. */
export interface Opening {
  id: Id
  kind: OpeningKind
  wallId: Id
  /** Glazing / insulation type — determines U-value and discharge coefficient. */
  presetId: Id
  /** Size preset — determines physical dimensions (width, height, sill). */
  sizePresetId: Id
  /** Parametric position of the opening centre along the wall (0..1). */
  t: number
  widthM: number
  heightM: number
  /** Height of the bottom of the opening above the floor (m). */
  sillHeightM: number
  /** Whether the opening is currently open (lets air through) in this scenario. */
  isOpen: boolean
  /**
   * When true the simulation dynamically opens/closes this opening each step:
   * open when outside temperature < room temperature, closed otherwise.
   * Overrides `isOpen` during simulation when active.
   */
  autoOpen?: boolean
}

/** A saved open/closed/auto configuration the user can compare. */
export interface Scenario {
  id: Id
  name: string
  /**
   * openingId -> opening state.
   * true = open, false = closed, 'auto' = smart auto-open.
   * Legacy saved scenarios only have booleans; new ones may include 'auto'.
   */
  openStates: Record<Id, boolean | 'auto'>
}

export type FanKind = 'ceiling' | 'standing' | 'box'

/**
 * A fan placed in a room. Ceiling/standing fans improve perceived comfort via
 * air movement (modelled as a comfort-threshold offset at scoring time).
 * Box fans are directed at a specific opening and force a fixed volumetric flow
 * through it, overriding natural stack + breeze ventilation for that opening.
 */
export interface Fan {
  id: Id
  roomId: Id
  kind: FanKind
  /** Box fans only: the opening (window or door) the fan is directed at. */
  openingId?: Id
  /** Forced flow rate (m³/s) used when openingId is set and the opening is open. */
  flowRateM3S: number
  isOn: boolean
  /** Position in world coordinates (metres). Defaults to room centroid. */
  x?: number
  y?: number
  /**
   * Blow direction for ceiling/standing fans: degrees clockwise from canvas-up.
   * 0 = blowing toward top of canvas.
   */
  directionDeg?: number
  /** Box fans only: true = pushes outside air into the room; false = extracts room air out. */
  blowsInward?: boolean
}

/** A portable air conditioning unit placed in a room. */
export interface PortableAC {
  id: Id
  roomId: Id
  /** Cooling power in watts (heat extracted from the room air). */
  coolingPowerW: number
  isOn: boolean
  /** Position in world coordinates (metres). Defaults to room centroid. */
  x?: number
  y?: number
}

export type HousingType = 'ground-floor' | 'middle-floor' | 'top-floor' | 'house'

/** The whole document. */
export interface Project {
  id: Id
  name: string
  outsideZones: OutsideZone[]
  rooms: Room[]
  walls: Wall[]
  openings: Opening[]
  scenarios: Scenario[]
  fans?: Fan[]
  portableACs?: PortableAC[]
  /** Comfort threshold (°C) used for the cooling score. */
  comfortTempC: number
  /** Simulation duration in hours. */
  simHours: number
  /**
   * Degrees clockwise from canvas-up to true north (0 = up is north).
   * Used to determine which walls face the sun.
   */
  northAngle?: number
  /** Hour of day (0–23) when the simulation starts. Default 6 (6 am). */
  startHour?: number
  /**
   * Where the building sits: determines whether roof solar/conduction and/or
   * ground-slab coupling terms are added to the heat balance.
   * Defaults to 'house' (full exposure) when absent.
   */
  housingType?: HousingType
  /** Whether the roof is insulated. Only relevant for top-floor and house. */
  roofInsulated?: boolean
}
