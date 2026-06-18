import type { Point, Project } from '../model/types'
import { lerpPoint, polygonCentroid } from '../model/geometry'

export interface OpeningEmitter {
  openingId: string
  /** Index into Project.openings (matches SimResult opening arrays). */
  index: number
  /** Opening centre in world coordinates. */
  center: Point
  /** Unit normal pointing into the sideA room interior. */
  inward: Point
  sideARoomId: string | null
  sideBRoomId: string | null
  sideBZoneId: string | null
}

/**
 * Precompute, for every opening, where heat particles should spawn and which way
 * "into the room" points. dir from the simulation (+1 = toward sideA) combines with
 * this inward normal to give a flow direction.
 */
export function buildEmitters(project: Project): OpeningEmitter[] {
  const roomById = new Map(project.rooms.map((r) => [r.id, r]))
  return project.openings.flatMap((op, index) => {
    const wall = project.walls.find((w) => w.id === op.wallId)
    if (!wall) return []
    const center = lerpPoint(wall.a, wall.b, op.t)

    // Wall direction + perpendicular.
    const dx = wall.b.x - wall.a.x
    const dy = wall.b.y - wall.a.y
    const len = Math.hypot(dx, dy) || 1
    let nx = -dy / len
    let ny = dx / len

    // Orient the normal toward the sideA room's centroid (its interior).
    const sideARoomId = wall.sideA.type === 'room' ? wall.sideA.id : null
    const sideBRoomId = wall.sideB.type === 'room' ? wall.sideB.id : null
    const sideBZoneId = wall.sideB.type === 'outside' ? wall.sideB.id : null
    const anchorRoom = roomById.get(sideARoomId ?? sideBRoomId ?? '')
    if (anchorRoom) {
      const c = polygonCentroid(anchorRoom.polygon)
      const toCentroid = { x: c.x - center.x, y: c.y - center.y }
      if (nx * toCentroid.x + ny * toCentroid.y < 0) {
        nx = -nx
        ny = -ny
      }
    }

    return [
      {
        openingId: op.id,
        index,
        center,
        inward: { x: nx, y: ny },
        sideARoomId,
        sideBRoomId,
        sideBZoneId,
      },
    ]
  })
}
