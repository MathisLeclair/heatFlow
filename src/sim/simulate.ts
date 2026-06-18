import type { OutsideZone, Project } from '../model/types'
import { dist, polygonArea, polygonCentroid } from '../model/geometry'
import { wallResistance, openingPresetById, wallTypeById, SURFACE_FILM_R } from '../presets'

// Physical constants (SI).
const AIR_DENSITY = 1.2 // kg/m³
const AIR_CP = 1005 // J/(kg·K)
const G = 9.81 // m/s²
/** Baseline air speed through an open aperture to represent ambient breeze (m/s). */
const BASE_BREEZE = 0.12
/** Extra flow factor when a room can cross-ventilate (≥2 open openings to outside). */
const CROSS_VENT_BOOST = 1.6
/** Peak direct normal solar irradiance on a clear summer day (W/m²). */
const I_DIRECT = 800
/** Peak sun elevation above horizon for mid-latitude summer (degrees). */
const PEAK_SUN_ELEVATION_DEG = 60

export interface SimResult {
  /** Timestamps in hours from start. */
  hours: number[]
  roomIds: string[]
  roomNames: string[]
  /** temps[frame][roomIndex] in °C. */
  roomTemps: number[][]
  openingIds: string[]
  /** Exchange flow magnitude per opening per frame (m³/s); 0 when closed. */
  openingFlow: number[][]
  /** +1 = net airflow from sideB toward sideA (room); -1 = the reverse. */
  openingDir: number[][]
  /** Outside zone temperature series, keyed by zone id. */
  zoneTemps: Record<string, number[]>
  /** Cooling score: room-averaged degree-hours above the comfort threshold (lower is better). */
  degreeHoursAboveComfort: number
  /** Per-room degree-hours above comfort. */
  roomDegreeHours: number[]
}

/** Outside-zone temperature at a given hour (constant or diurnal sinusoid). */
export function zoneTempAt(zone: OutsideZone, hour: number): number {
  if (zone.diurnal) {
    const { minC, maxC, peakHour } = zone.diurnal
    const mid = (minC + maxC) / 2
    const amp = (maxC - minC) / 2
    return mid + amp * Math.cos((2 * Math.PI * (hour - peakHour)) / 24)
  }
  return zone.tempC
}

interface SolidEdge {
  a: number // room index
  b: number // room index, or -1 if outside
  zoneId?: string // when b === -1
  /** Constant conductance for conduction, W/K. */
  g: number
}

interface VentEdge {
  openingId: string
  a: number
  b: number // room index, or -1 if outside
  zoneId?: string
  /** Open aperture area (m²). */
  area: number
  /** Opening clear height (m), the stack driving height. */
  height: number
  dischargeCoeff: number
  crossVentBoost: number
  /** Fraction of ambient wind reaching this opening (1=open air, 0=fully enclosed yard). */
  breezeFactor: number
}

/** Volumetric exchange flow through an open aperture (m³/s). */
function ventFlow(edge: VentEdge, ta: number, tb: number): number {
  const dT = Math.abs(ta - tb)
  const tAvgK = 273.15 + (ta + tb) / 2
  const stack =
    (edge.dischargeCoeff / 3) *
    edge.area *
    Math.sqrt((G * edge.height * dT) / tAvgK)
  const breeze = edge.dischargeCoeff * edge.area * BASE_BREEZE * edge.breezeFactor
  return (stack + breeze) * edge.crossVentBoost
}

// ─── Solar helpers ────────────────────────────────────────────────────────────

/** Sun azimuth in degrees (clockwise from north) for a given local hour of day. */
function sunAzimuthDeg(hour: number): number {
  // Simple linear model: east (90°) at 6am → south (180°) at noon → west (270°) at 6pm.
  return 90 + (hour - 6) * 15
}

/** Sun elevation above horizon in degrees. Returns 0 at night. */
function sunElevationDeg(hour: number): number {
  const h = ((hour % 24) + 24) % 24
  const progress = (h - 6) / 12  // 0 at 6am, 1 at 6pm
  if (progress <= 0 || progress >= 1) return 0
  return PEAK_SUN_ELEVATION_DEG * Math.sin(Math.PI * progress)
}

/**
 * Irradiance on a vertical exterior wall surface (W/m²).
 * Uses the standard formula for a tilted surface:
 *   I = I_direct × max(0, cos(elev) × cos(sunAz − wallNormalAz))
 */
function wallSolarIrradiance(
  sunAzDeg: number,
  sunElevDeg: number,
  wallNormalAzDeg: number,
): number {
  if (sunElevDeg <= 0) return 0
  const elevRad = (sunElevDeg * Math.PI) / 180
  const azDiffRad = ((sunAzDeg - wallNormalAzDeg) * Math.PI) / 180
  return I_DIRECT * Math.max(0, Math.cos(elevRad) * Math.cos(azDiffRad))
}

interface SolarWall {
  roomIndex: number
  /** Azimuth (degrees CW from north) of the outward wall normal. */
  wallNormalAzDeg: number
  /** Opaque wall area (m²) facing this direction. */
  solidArea: number
  /** Fraction of absorbed solar that flows inward: R_int_film / R_total. */
  inwardFraction: number
  solarAbsorptance: number
}

interface SolarOpening {
  roomIndex: number
  wallNormalAzDeg: number
  area: number
  shgc: number
}

/**
 * Run the dynamic thermal simulation. Rooms are lumped capacitances; walls and
 * closed openings conduct (Q = U·A·ΔT); open openings exchange air (Q = ρ·c·V̇·ΔT).
 * Integrated with adaptive explicit Euler sub-steps for stability.
 */
export function simulate(project: Project): SimResult {
  const rooms = project.rooms
  const n = rooms.length
  const roomIndex = new Map(rooms.map((r, i) => [r.id, i]))

  // Capacitance and initial temperature per room.
  const C = new Array<number>(n)
  const T = new Array<number>(n)
  for (let i = 0; i < n; i++) {
    const r = rooms[i]
    const volume = polygonArea(r.polygon) * r.ceilingHeightM
    C[i] = AIR_DENSITY * AIR_CP * volume * Math.max(1, r.thermalMassMultiplier)
    T[i] = r.initialTempC
  }

  const zoneById = new Map(project.outsideZones.map((z) => [z.id, z]))
  const northAngleRad = ((project.northAngle ?? 0) * Math.PI) / 180
  const startHour = project.startHour ?? 6

  // Count open exterior openings per room for the cross-ventilation boost.
  const openExtCount = new Array<number>(n).fill(0)
  for (const o of project.openings) {
    if (!o.isOpen) continue
    const wall = project.walls.find((w) => w.id === o.wallId)
    if (!wall || !wall.exterior) continue
    const ri = sideRoomIndex(wall.sideA, roomIndex) ?? sideRoomIndex(wall.sideB, roomIndex)
    if (ri != null) openExtCount[ri]++
  }

  // Build edges.
  const solidEdges: SolidEdge[] = []
  const ventEdges: VentEdge[] = []
  const solarWalls: SolarWall[] = []
  const solarOpenings: SolarOpening[] = []

  // Precompute room centroids for outward-normal detection.
  const roomCentroids = rooms.map((r) => polygonCentroid(r.polygon))

  for (const wall of project.walls) {
    const ai = sideRoomIndex(wall.sideA, roomIndex)
    const bi = sideRoomIndex(wall.sideB, roomIndex)
    // Wall must touch at least one room.
    const roomA = ai ?? bi
    if (roomA == null) continue

    const length = dist(wall.a, wall.b)
    const height = wallHeight(ai, bi, rooms)
    const grossArea = length * height

    const wallOpenings = project.openings.filter((o) => o.wallId === wall.id)
    const openingsArea = wallOpenings.reduce((s, o) => s + o.widthM * o.heightM, 0)
    const solidArea = Math.max(0.1, grossArea - openingsArea)

    const rFabric = wallResistance(wall.wallTypeId, wall.thicknessM)
    const uWall = 1 / (rFabric + SURFACE_FILM_R)

    const outsideZoneId =
      ai == null
        ? refZoneId(wall.sideA)
        : bi == null
          ? refZoneId(wall.sideB)
          : undefined

    const outsideZone = outsideZoneId ? zoneById.get(outsideZoneId) : undefined
    const breezeFactor = 1 - Math.max(0, Math.min(1, outsideZone?.shelterFactor ?? 0))

    solidEdges.push({
      a: ai ?? (bi as number),
      b: ai != null && bi != null ? bi : -1,
      zoneId: outsideZoneId,
      g: uWall * solidArea,
    })

    for (const o of wallOpenings) {
      const area = o.widthM * o.heightM
      if (o.isOpen) {
        const ventRoom = ai ?? (bi as number)
        const boost = openExtCount[ventRoom] >= 2 ? CROSS_VENT_BOOST : 1
        ventEdges.push({
          openingId: o.id,
          a: ai ?? (bi as number),
          b: ai != null && bi != null ? bi : -1,
          zoneId: outsideZoneId,
          area,
          height: Math.max(0.2, o.heightM),
          dischargeCoeff: openingPresetById(o.presetId).dischargeCoeff,
          crossVentBoost: boost,
          breezeFactor,
        })
      } else {
        const uOpening = openingPresetById(o.presetId).uValue
        solidEdges.push({
          a: ai ?? (bi as number),
          b: ai != null && bi != null ? bi : -1,
          zoneId: outsideZoneId,
          g: uOpening * area,
        })
      }
    }

    // Build solar data for exterior walls only.
    if (wall.exterior && outsideZoneId) {
      const roomIdx = ai ?? (bi as number)
      const centroid = roomCentroids[roomIdx]

      // Outward normal: perpendicular to wall, pointing away from room centroid.
      const dx = wall.b.x - wall.a.x
      const dy = wall.b.y - wall.a.y
      const mx = (wall.a.x + wall.b.x) / 2
      const my = (wall.a.y + wall.b.y) / 2
      // Two candidate normals
      let nx = -dy, ny = dx
      if ((mx - centroid.x) * nx + (my - centroid.y) * ny < 0) { nx = dy; ny = -dx }
      // Normalize
      const nLen = Math.hypot(nx, ny)
      if (nLen > 1e-9) { nx /= nLen; ny /= nLen }

      // Convert canvas normal (Y-down) to geographic azimuth (CW from north).
      // North vector in canvas = (sin(northAngle), -cos(northAngle))
      // East vector in canvas  = (cos(northAngle),  sin(northAngle))
      const nNorth = nx * Math.sin(northAngleRad) + ny * (-Math.cos(northAngleRad))
      const nEast  = nx * Math.cos(northAngleRad) + ny * Math.sin(northAngleRad)
      const wallNormalAzDeg = (Math.atan2(nEast, nNorth) * 180) / Math.PI

      const wt = wallTypeById(wall.wallTypeId)
      const rTotal = rFabric + SURFACE_FILM_R
      // Fraction of absorbed solar that flows inward: R_int_film / R_total
      const inwardFraction = 0.13 / rTotal

      solarWalls.push({
        roomIndex: roomIdx,
        wallNormalAzDeg,
        solidArea,
        inwardFraction,
        solarAbsorptance: wt.solarAbsorptance,
      })

      for (const o of wallOpenings) {
        const preset = openingPresetById(o.presetId)
        if (preset.shgc > 0) {
          solarOpenings.push({
            roomIndex: roomIdx,
            wallNormalAzDeg,
            area: o.widthM * o.heightM,
            shgc: preset.shgc,
          })
        }
      }
    }
  }

  // Output cadence and integration.
  const simHours = project.simHours
  const outStepHours = Math.min(0.1, simHours / 200) // ≤6 min, ≥ ~enough frames
  const outStepSec = outStepHours * 3600

  const result: SimResult = {
    hours: [],
    roomIds: rooms.map((r) => r.id),
    roomNames: rooms.map((r) => r.name),
    roomTemps: [],
    openingIds: project.openings.map((o) => o.id),
    openingFlow: [],
    openingDir: [],
    zoneTemps: Object.fromEntries(project.outsideZones.map((z) => [z.id, []])),
    degreeHoursAboveComfort: 0,
    roomDegreeHours: new Array<number>(n).fill(0),
  }

  const zoneTempCache = new Map<string, number>()
  const zoneTempNow = (id: string | undefined, hour: number): number => {
    if (id == null) return 20
    const cached = zoneTempCache.get(id)
    if (cached != null) return cached
    const z = zoneById.get(id)
    const t = z ? zoneTempAt(z, hour) : 20
    zoneTempCache.set(id, t)
    return t
  }

  const net = new Array<number>(n)
  let elapsedSec = 0
  const totalSec = simHours * 3600

  // Record the very first frame.
  recordFrame(0)

  let frameTargetSec = outStepSec
  let guard = 0
  while (elapsedSec < totalSec - 1e-6 && guard++ < 5_000_000) {
    const hour = elapsedSec / 3600
    zoneTempCache.clear()

    // Accumulate conductances per room to choose a stable step.
    net.fill(0)
    const gSum = new Array<number>(n).fill(0)

    for (const e of solidEdges) {
      const ta = T[e.a]
      const tb = e.b >= 0 ? T[e.b] : zoneTempNow(e.zoneId, hour)
      const q = e.g * (tb - ta)
      net[e.a] += q
      gSum[e.a] += e.g
      if (e.b >= 0) {
        net[e.b] -= q
        gSum[e.b] += e.g
      }
    }
    for (const e of ventEdges) {
      const ta = T[e.a]
      const tb = e.b >= 0 ? T[e.b] : zoneTempNow(e.zoneId, hour)
      const vdot = ventFlow(e, ta, tb)
      const g = AIR_DENSITY * AIR_CP * vdot
      const q = g * (tb - ta)
      net[e.a] += q
      gSum[e.a] += g
      if (e.b >= 0) {
        net[e.b] -= q
        gSum[e.b] += g
      }
    }

    // Solar heat gain (time-of-day driven, based on northAngle and startHour).
    const localHour = (startHour + hour) % 24
    const sunAz = sunAzimuthDeg(localHour)
    const sunElev = sunElevationDeg(localHour)
    if (sunElev > 0) {
      for (const sw of solarWalls) {
        const irr = wallSolarIrradiance(sunAz, sunElev, sw.wallNormalAzDeg)
        net[sw.roomIndex] += sw.solarAbsorptance * irr * sw.solidArea * sw.inwardFraction
      }
      for (const so of solarOpenings) {
        const irr = wallSolarIrradiance(sunAz, sunElev, so.wallNormalAzDeg)
        net[so.roomIndex] += so.shgc * irr * so.area
      }
    }

    // Stable explicit step: dt ≤ 0.4·min(C/Gsum), bounded by the frame boundary.
    let dt = frameTargetSec - elapsedSec
    for (let i = 0; i < n; i++) {
      if (gSum[i] > 0) dt = Math.min(dt, (0.4 * C[i]) / gSum[i])
    }
    dt = Math.max(dt, 0.01)

    for (let i = 0; i < n; i++) {
      T[i] += (dt * net[i]) / C[i]
    }
    elapsedSec += dt

    if (elapsedSec >= frameTargetSec - 1e-6) {
      recordFrame(elapsedSec / 3600)
      frameTargetSec += outStepSec
    }
  }

  // Finalize cooling score (degree-hours above comfort, trapezoidal).
  finalizeScore()

  return result

  function recordFrame(hour: number): void {
    result.hours.push(hour)
    result.roomTemps.push(T.slice())
    for (const z of project.outsideZones) {
      result.zoneTemps[z.id].push(zoneTempAt(z, hour))
    }
    // Per-opening flow snapshot at current temps.
    const flowRow: number[] = []
    const dirRow: number[] = []
    for (const o of project.openings) {
      const e = ventEdges.find((v) => v.openingId === o.id)
      if (!e) {
        flowRow.push(0)
        dirRow.push(0)
        continue
      }
      const ta = T[e.a]
      const tb = e.b >= 0 ? T[e.b] : zoneTempAt(zoneById.get(e.zoneId!)!, hour)
      flowRow.push(ventFlow(e, ta, tb))
      // Arrow points toward the warmer side (cool air displaces warm).
      dirRow.push(Math.sign(ta - tb) || 0)
    }
    result.openingFlow.push(flowRow)
    result.openingDir.push(dirRow)
  }

  function finalizeScore(): void {
    const comfort = project.comfortTempC
    const hours = result.hours
    const temps = result.roomTemps
    for (let i = 0; i < n; i++) {
      let acc = 0
      for (let f = 1; f < hours.length; f++) {
        const dtH = hours[f] - hours[f - 1]
        const e0 = Math.max(0, temps[f - 1][i] - comfort)
        const e1 = Math.max(0, temps[f][i] - comfort)
        acc += ((e0 + e1) / 2) * dtH
      }
      result.roomDegreeHours[i] = acc
    }
    result.degreeHoursAboveComfort =
      n > 0 ? result.roomDegreeHours.reduce((a, b) => a + b, 0) / n : 0
  }
}

function sideRoomIndex(
  ref: { type: string; id: string },
  roomIndex: Map<string, number>,
): number | null {
  if (ref.type === 'room') {
    const i = roomIndex.get(ref.id)
    return i == null ? null : i
  }
  return null
}

function refZoneId(ref: { type: string; id: string }): string | undefined {
  return ref.type === 'outside' ? ref.id : undefined
}

function wallHeight(
  ai: number | null,
  bi: number | null,
  rooms: { ceilingHeightM: number }[],
): number {
  const heights: number[] = []
  if (ai != null) heights.push(rooms[ai].ceilingHeightM)
  if (bi != null) heights.push(rooms[bi].ceilingHeightM)
  return heights.length ? Math.min(...heights) : 2.5
}
