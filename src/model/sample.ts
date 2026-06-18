import { nanoid } from 'nanoid'
import type { Opening, Project, Room } from './types'
import { deriveWalls } from './walls'
import { DEFAULT_WINDOW_SIZE_ID, DEFAULT_DOOR_SIZE_ID, sizePresetById } from '../presets'

/**
 * A small two-room apartment plus a walled courtyard, so the app is immediately
 * explorable. Coordinates in metres.
 */
export function makeSampleProject(): Project {
  const living: Room = {
    id: nanoid(8),
    name: 'Living room',
    polygon: [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 5, y: 4 },
      { x: 0, y: 4 },
    ],
    initialTempC: 29,
    ceilingHeightM: 2.5,
    thermalMassMultiplier: 8,
    color: '#90caf9',
  }
  const bedroom: Room = {
    id: nanoid(8),
    name: 'Bedroom',
    polygon: [
      { x: 5, y: 0 },
      { x: 9, y: 0 },
      { x: 9, y: 4 },
      { x: 5, y: 4 },
    ],
    initialTempC: 28,
    ceilingHeightM: 2.5,
    thermalMassMultiplier: 8,
    color: '#a5d6a7',
  }

  const outsideGlobal = {
    id: nanoid(8),
    kind: 'global' as const,
    name: 'Outside',
    tempC: 30,
    diurnal: { minC: 21, maxC: 38, peakHour: 16 },
    color: '#ffe0b2',
  }
  const courtyard = {
    id: nanoid(8),
    kind: 'custom' as const,
    name: 'Shaded courtyard',
    tempC: 25,
    diurnal: { minC: 20, maxC: 28, peakHour: 17 },
    color: '#c8e6c9',
  }

  const walls = deriveWalls([living, bedroom], [outsideGlobal, courtyard], [])

  // Place a few openings on exterior + interior walls.
  const openings: Opening[] = []
  const livingNorth = walls.find(
    (w) => w.exterior && near(w.a.y, 0) && near(w.b.y, 0) && w.a.x < 5,
  )
  const bedroomNorth = walls.find(
    (w) => w.exterior && near(w.a.y, 0) && near(w.b.y, 0) && w.a.x >= 5,
  )
  const livingSouth = walls.find(
    (w) => w.exterior && near(w.a.y, 4) && near(w.b.y, 4) && w.a.x < 5,
  )
  const interior = walls.find((w) => !w.exterior)

  if (livingNorth) openings.push(makeWindow(livingNorth.id, 0.5))
  if (bedroomNorth) openings.push(makeWindow(bedroomNorth.id, 0.5))
  if (livingSouth) openings.push(makeWindow(livingSouth.id, 0.5))
  if (interior) openings.push(makeDoor(interior.id, 0.5))

  return {
    id: nanoid(8),
    name: 'My apartment',
    outsideZones: [outsideGlobal, courtyard],
    rooms: [living, bedroom],
    walls,
    openings,
    scenarios: [],
    comfortTempC: 26,
    simHours: 48,
  }
}

function near(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.01
}

function makeWindow(wallId: string, t: number): Opening {
  const sz = sizePresetById(DEFAULT_WINDOW_SIZE_ID)
  return {
    id: nanoid(8),
    kind: 'window',
    wallId,
    presetId: 'window-double',
    sizePresetId: DEFAULT_WINDOW_SIZE_ID,
    t,
    widthM: sz.widthM,
    heightM: sz.heightM,
    sillHeightM: sz.sillHeightM,
    isOpen: false,
  }
}

function makeDoor(wallId: string, t: number): Opening {
  const sz = sizePresetById(DEFAULT_DOOR_SIZE_ID)
  return {
    id: nanoid(8),
    kind: 'door',
    wallId,
    presetId: 'door-interior',
    sizePresetId: DEFAULT_DOOR_SIZE_ID,
    t,
    widthM: sz.widthM,
    heightM: sz.heightM,
    sillHeightM: sz.sillHeightM,
    isOpen: true,
  }
}
