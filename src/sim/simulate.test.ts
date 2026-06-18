import { describe, it, expect } from 'vitest'
import { nanoid } from 'nanoid'
import type { Opening, OutsideZone, Project, Room, Wall } from '../model/types'
import { deriveWalls } from '../model/walls'
import { simulate, zoneTempAt } from './simulate'

function squareRoom(x0: number, name: string, tempC: number): Room {
  return {
    id: nanoid(8),
    name,
    polygon: [
      { x: x0, y: 0 },
      { x: x0 + 4, y: 0 },
      { x: x0 + 4, y: 4 },
      { x: x0, y: 4 },
    ],
    initialTempC: tempC,
    ceilingHeightM: 2.5,
    thermalMassMultiplier: 8,
    color: '#90caf9',
  }
}

function globalZone(tempC: number): OutsideZone {
  return { id: nanoid(8), kind: 'global', name: 'Outside', tempC, color: '#eee' }
}

function openingOnWall(wall: Wall, isOpen: boolean): Opening {
  return {
    id: nanoid(8),
    kind: 'window',
    wallId: wall.id,
    presetId: 'window-double',
    t: 0.5,
    widthM: 1.2,
    heightM: 1.2,
    sillHeightM: 0.9,
    isOpen,
  }
}

function project(rooms: Room[], zones: OutsideZone[]): Project {
  return {
    id: 'p',
    name: 'test',
    outsideZones: zones,
    rooms,
    walls: deriveWalls(rooms, zones, []),
    openings: [],
    scenarios: [],
    comfortTempC: 26,
    simHours: 24,
  }
}

/** Attach an open/closed window to one of the project's own walls. */
function addWindow(p: Project, wallIdx: number, isOpen: boolean): void {
  p.openings.push(openingOnWall(p.walls[wallIdx], isOpen))
}

/** Room temperature at (or just after) a given hour, for early-frame comparisons. */
function tempAtHour(
  r: ReturnType<typeof simulate>,
  roomIdx: number,
  hour: number,
): number {
  const f = r.hours.findIndex((h) => h >= hour)
  return r.roomTemps[f < 0 ? r.roomTemps.length - 1 : f][roomIdx]
}

describe('zoneTempAt', () => {
  it('peaks and troughs at the right hours', () => {
    const z: OutsideZone = {
      id: 'z',
      kind: 'global',
      name: 'o',
      tempC: 0,
      diurnal: { minC: 20, maxC: 38, peakHour: 16 },
      color: '#eee',
    }
    expect(zoneTempAt(z, 16)).toBeCloseTo(38, 5)
    expect(zoneTempAt(z, 4)).toBeCloseTo(20, 5) // 12h offset = trough
    expect(zoneTempAt(z, 10)).toBeCloseTo(29, 1) // mid
  })

  it('returns constant when no diurnal profile', () => {
    expect(zoneTempAt(globalZone(30), 13)).toBe(30)
  })
})

describe('simulate', () => {
  it('a closed room drifts toward the outside temperature', () => {
    const room = squareRoom(0, 'A', 20)
    const zones = [globalZone(35)]
    const p = project([room], zones)
    p.simHours = 120
    const r = simulate(p)
    const last = r.roomTemps[r.roomTemps.length - 1][0]
    expect(last).toBeGreaterThan(20)
    expect(last).toBeLessThanOrEqual(35)
    // Should get meaningfully closer to outside over 5 days.
    expect(last).toBeGreaterThan(28)
  })

  it('an open window cools a hot room faster than a closed one', () => {
    const zones = [globalZone(22)] // cool outside

    const closed = project([squareRoom(0, 'A', 32)], zones)
    addWindow(closed, 0, false)
    const r1 = simulate(closed)

    const open = project([squareRoom(0, 'A', 32)], zones)
    addWindow(open, 0, true)
    const r2 = simulate(open)

    // Compare early (before both settle at the outdoor temperature).
    expect(tempAtHour(r2, 0, 1)).toBeLessThan(tempAtHour(r1, 0, 1))
  })

  it('cross-ventilation (two open windows) cools faster than one', () => {
    const zones = [globalZone(22)]

    const pOne = project([squareRoom(0, 'A', 32)], zones)
    addWindow(pOne, 0, true)
    const rOne = simulate(pOne)

    // Two windows on different exterior walls.
    const pTwo = project([squareRoom(0, 'A', 32)], zones)
    addWindow(pTwo, 0, true)
    addWindow(pTwo, 1, true)
    const rTwo = simulate(pTwo)

    expect(tempAtHour(rTwo, 0, 0.5)).toBeLessThan(tempAtHour(rOne, 0, 0.5))
  })

  it('produces a cooling score and one temperature series per room', () => {
    const p = project([squareRoom(0, 'A', 30), squareRoom(4, 'B', 30)], [globalZone(35)])
    const r = simulate(p)
    expect(r.roomTemps[0]).toHaveLength(2)
    expect(r.roomDegreeHours).toHaveLength(2)
    expect(r.degreeHoursAboveComfort).toBeGreaterThan(0)
  })
})
