/** Blue → cyan → green → yellow → orange → red ramp (matches design). */
const RAMP: [number, number, number][] = [
  [37, 99, 235],   // blue
  [6, 182, 212],   // cyan
  [34, 197, 94],   // green
  [234, 179, 8],   // yellow
  [249, 115, 22],  // orange
  [239, 68, 68],   // red
]

function rampRGB(t: number): [number, number, number] {
  t = Math.max(0, Math.min(1, t))
  const seg = t * (RAMP.length - 1)
  const i = Math.min(RAMP.length - 2, Math.floor(seg))
  const f = seg - i
  const a = RAMP[i]
  const b = RAMP[i + 1]
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ]
}

export function tempToColor(tempC: number, min: number, max: number): string {
  const [r, g, b] = rampRGB(Math.max(0, Math.min(1, (tempC - min) / (max - min || 1))))
  return `rgb(${r},${g},${b})`
}

export function tempToRGB(tempC: number, min: number, max: number): [number, number, number] {
  return rampRGB(Math.max(0, Math.min(1, (tempC - min) / (max - min || 1))))
}

export function rampStops(steps = 6): string[] {
  return Array.from({ length: steps }, (_, i) => {
    const [r, g, b] = rampRGB(i / (steps - 1))
    return `rgb(${r},${g},${b})`
  })
}

/** CSS linear-gradient string for the legend bar. */
export function rampCSS(): string {
  return RAMP.map(([r, g, b], i) =>
    `rgb(${r},${g},${b}) ${Math.round((i / (RAMP.length - 1)) * 100)}%`,
  ).join(', ')
}
