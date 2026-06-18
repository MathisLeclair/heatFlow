import { useMemo } from 'react'
import type { Point, Project } from '../model/types'
import { dist } from '../model/geometry'

const GRID_M = 0.25
/** Snap to an existing vertex within this distance (m). */
const VERTEX_SNAP_M = 0.4

export interface Snapper {
  snapToGrid: (p: Point) => Point
  /** Snap to grid, but prefer an existing vertex (or the draft's first point) if close. */
  snapPoint: (p: Point, draft: Point[]) => Point
}

function snapToGrid(p: Point): Point {
  return {
    x: Math.round(p.x / GRID_M) * GRID_M,
    y: Math.round(p.y / GRID_M) * GRID_M,
  }
}

/** Build a snapper that is aware of all existing room vertices. */
export function useMemoizedSnap(project: Project): Snapper {
  return useMemo(() => {
    const vertices: Point[] = project.rooms.flatMap((r) => r.polygon)

    function snapPoint(p: Point, draft: Point[]): Point {
      const candidates = [...vertices, ...draft]
      let best: Point | null = null
      let bestD = VERTEX_SNAP_M
      for (const v of candidates) {
        const d = dist(p, v)
        if (d < bestD) {
          best = v
          bestD = d
        }
      }
      return best ?? snapToGrid(p)
    }

    return { snapToGrid, snapPoint }
  }, [project.rooms])
}
