import { describe, it, expect } from 'vitest'
import { nanoid } from 'nanoid'
import type { OutsideZone, Room } from './types'
import { deriveWalls } from './walls'

function room(x0: number, name: string): Room {
  return {
    id: nanoid(8),
    name,
    polygon: [
      { x: x0, y: 0 },
      { x: x0 + 4, y: 0 },
      { x: x0 + 4, y: 4 },
      { x: x0, y: 4 },
    ],
    initialTempC: 28,
    ceilingHeightM: 2.5,
    thermalMassMultiplier: 8,
    color: '#90caf9',
  }
}

const zones: OutsideZone[] = [
  { id: 'g', kind: 'global', name: 'Outside', tempC: 30, color: '#eee' },
]

describe('deriveWalls', () => {
  it('creates one interior wall shared by two adjacent rooms', () => {
    const a = room(0, 'A')
    const b = room(4, 'B') // shares the x=4 edge with A
    const walls = deriveWalls([a, b], zones, [])

    const interior = walls.filter((w) => !w.exterior)
    expect(interior).toHaveLength(1)
    expect(interior[0].sideA.type).toBe('room')
    expect(interior[0].sideB.type).toBe('room')

    // 8 raw edges, one shared pair merges into a single wall → 8 - 1 = 7 walls.
    expect(walls).toHaveLength(7)
  })

  it('makes all edges exterior for an isolated room', () => {
    const walls = deriveWalls([room(0, 'A')], zones, [])
    expect(walls).toHaveLength(4)
    expect(walls.every((w) => w.exterior)).toBe(true)
    expect(walls.every((w) => w.sideB.type === 'outside')).toBe(true)
  })

  it('preserves user thermal settings across a rebuild', () => {
    const a = room(0, 'A')
    let walls = deriveWalls([a], zones, [])
    walls = walls.map((w) =>
      w === walls[0] ? { ...w, wallTypeId: 'timber-stud-insulated', thicknessM: 0.25 } : w,
    )
    const rebuilt = deriveWalls([a], zones, walls)
    const match = rebuilt.find((w) => w.wallTypeId === 'timber-stud-insulated')
    expect(match).toBeDefined()
    expect(match?.thicknessM).toBe(0.25)
  })
})
