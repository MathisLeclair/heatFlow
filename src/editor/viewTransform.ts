import type { Point, Project } from '../model/types'

export interface ViewTransform {
  scale: number
  offsetX: number
  offsetY: number
  toScreen: (p: Point) => Point
  toWorld: (p: Point) => Point
}

/** Bounding box of all geometry (rooms + walls), in metres, with a margin. */
export function planBounds(project: Project): {
  minX: number
  minY: number
  maxX: number
  maxY: number
} {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const include = (p: Point) => {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  for (const r of project.rooms) r.polygon.forEach(include)
  for (const w of project.walls) {
    include(w.a)
    include(w.b)
  }
  if (!isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 10, maxY: 8 }
  }
  return { minX, minY, maxX, maxY }
}

/** Fit the plan into the given pixel viewport, preserving aspect ratio. */
export function fitTransform(
  project: Project,
  width: number,
  height: number,
  paddingPx = 48,
): ViewTransform {
  const b = planBounds(project)
  const worldW = Math.max(0.5, b.maxX - b.minX)
  const worldH = Math.max(0.5, b.maxY - b.minY)
  const usableW = Math.max(1, width - paddingPx * 2)
  const usableH = Math.max(1, height - paddingPx * 2)
  const scale = Math.min(usableW / worldW, usableH / worldH)

  // Centre the plan in the viewport.
  const offsetX = (width - worldW * scale) / 2 - b.minX * scale
  const offsetY = (height - worldH * scale) / 2 - b.minY * scale

  return {
    scale,
    offsetX,
    offsetY,
    toScreen: (p) => ({ x: p.x * scale + offsetX, y: p.y * scale + offsetY }),
    toWorld: (p) => ({ x: (p.x - offsetX) / scale, y: (p.y - offsetY) / scale }),
  }
}
