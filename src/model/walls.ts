import { nanoid } from 'nanoid'
import type { OutsideZone, Point, Room, Wall, ZoneRef } from './types'
import { polygonEdges, segmentsCoincident } from './geometry'
import { wallTypeById } from '../presets'

/** Tolerance (m) for treating two room edges as the same shared wall. */
export const WALL_COINCIDENCE_TOL = 0.25

const DEFAULT_INTERIOR_WALL = 'interior-partition'
const DEFAULT_EXTERIOR_WALL = 'brick-solid'

interface RawEdge {
  a: Point
  b: Point
  roomId: string
}

/**
 * Derive the set of walls from room polygons. Edges shared by two rooms become a
 * single interior wall; unshared edges become exterior walls bordering an outside
 * zone (the global one by default).
 *
 * Existing walls are matched by endpoint coincidence so user-set thermal properties
 * (type, thickness) and the chosen outside zone survive geometry edits.
 */
export function deriveWalls(
  rooms: Room[],
  outsideZones: OutsideZone[],
  existing: Wall[],
): Wall[] {
  const globalZone =
    outsideZones.find((z) => z.kind === 'global') ?? outsideZones[0]

  const rawEdges: RawEdge[] = []
  for (const room of rooms) {
    for (const [a, b] of polygonEdges(room.polygon)) {
      rawEdges.push({ a, b, roomId: room.id })
    }
  }

  const used = new Array(rawEdges.length).fill(false)
  const walls: Wall[] = []

  for (let i = 0; i < rawEdges.length; i++) {
    if (used[i]) continue
    const e = rawEdges[i]

    // Find a matching edge from a *different* room → interior wall.
    let partner = -1
    for (let j = i + 1; j < rawEdges.length; j++) {
      if (used[j]) continue
      const f = rawEdges[j]
      if (f.roomId === e.roomId) continue
      if (segmentsCoincident(e.a, e.b, f.a, f.b, WALL_COINCIDENCE_TOL)) {
        partner = j
        break
      }
    }

    if (partner >= 0) {
      used[i] = true
      used[partner] = true
      const sideA: ZoneRef = { type: 'room', id: e.roomId }
      const sideB: ZoneRef = { type: 'room', id: rawEdges[partner].roomId }
      walls.push(makeWall(e.a, e.b, sideA, sideB, false, existing))
    } else {
      used[i] = true
      const sideA: ZoneRef = { type: 'room', id: e.roomId }
      const sideB: ZoneRef = { type: 'outside', id: globalZone?.id ?? 'outside' }
      walls.push(makeWall(e.a, e.b, sideA, sideB, true, existing))
    }
  }

  return walls
}

function makeWall(
  a: Point,
  b: Point,
  sideA: ZoneRef,
  sideB: ZoneRef,
  exterior: boolean,
  existing: Wall[],
): Wall {
  const prev = existing.find(
    (w) =>
      segmentsCoincident(w.a, w.b, a, b, WALL_COINCIDENCE_TOL) &&
      w.exterior === exterior,
  )
  if (prev) {
    // Keep user thermal settings + outside-zone choice; refresh geometry/topology.
    const keepSideB =
      exterior && prev.sideB.type === 'outside' ? prev.sideB : sideB
    return { ...prev, a, b, sideA, sideB: keepSideB, exterior }
  }
  const defaultType = exterior ? DEFAULT_EXTERIOR_WALL : DEFAULT_INTERIOR_WALL
  return {
    id: nanoid(8),
    a,
    b,
    sideA,
    sideB,
    wallTypeId: defaultType,
    thicknessM: wallTypeById(defaultType).refThicknessM,
    exterior,
  }
}
