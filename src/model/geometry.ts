import type { Point } from './types'

export function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/** Signed polygon area (shoelace); positive for counter-clockwise in screen-down Y. */
export function signedArea(poly: Point[]): number {
  let s = 0
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    const q = poly[(i + 1) % poly.length]
    s += p.x * q.y - q.x * p.y
  }
  return s / 2
}

export function polygonArea(poly: Point[]): number {
  return Math.abs(signedArea(poly))
}

export function polygonCentroid(poly: Point[]): Point {
  const a = signedArea(poly)
  if (Math.abs(a) < 1e-9) {
    // Degenerate: fall back to vertex average.
    const sum = poly.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), {
      x: 0,
      y: 0,
    })
    return { x: sum.x / poly.length, y: sum.y / poly.length }
  }
  let cx = 0
  let cy = 0
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    const q = poly[(i + 1) % poly.length]
    const cross = p.x * q.y - q.x * p.y
    cx += (p.x + q.x) * cross
    cy += (p.y + q.y) * cross
  }
  return { x: cx / (6 * a), y: cy / (6 * a) }
}

/** Each undirected edge of a polygon as an [a, b] pair. */
export function polygonEdges(poly: Point[]): [Point, Point][] {
  const edges: [Point, Point][] = []
  for (let i = 0; i < poly.length; i++) {
    edges.push([poly[i], poly[(i + 1) % poly.length]])
  }
  return edges
}

/** Ray-casting point-in-polygon test. */
export function pointInPolygon(pt: Point, poly: Point[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const pi = poly[i]
    const pj = poly[j]
    const intersect =
      pi.y > pt.y !== pj.y > pt.y &&
      pt.x < ((pj.x - pi.x) * (pt.y - pi.y)) / (pj.y - pi.y) + pi.x
    if (intersect) inside = !inside
  }
  return inside
}

/**
 * Test whether two undirected segments are (near) coincident — i.e. the same wall
 * shared by two rooms. Coincident means endpoints match within tolerance in either
 * orientation.
 */
export function segmentsCoincident(
  a1: Point,
  a2: Point,
  b1: Point,
  b2: Point,
  tol: number,
): boolean {
  const fwd = dist(a1, b1) <= tol && dist(a2, b2) <= tol
  const rev = dist(a1, b2) <= tol && dist(a2, b1) <= tol
  return fwd || rev
}

/** Closest point on segment [a,b] to p, and its parametric t in [0,1]. */
export function closestPointOnSegment(
  p: Point,
  a: Point,
  b: Point,
): { point: Point; t: number; distance: number } {
  const abx = b.x - a.x
  const aby = b.y - a.y
  const len2 = abx * abx + aby * aby
  let t = len2 === 0 ? 0 : ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2
  t = Math.max(0, Math.min(1, t))
  const point = { x: a.x + t * abx, y: a.y + t * aby }
  return { point, t, distance: dist(p, point) }
}

/** Interpolate a point a fraction t along segment [a,b]. */
export function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}
