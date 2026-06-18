import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import type {
  Id,
  Opening,
  OutsideZone,
  Point,
  Project,
  Room,
  Wall,
} from '../model/types'
import { deriveWalls } from '../model/walls'
import { makeSampleProject } from '../model/sample'
import { loadProject, saveProject } from '../persistence/storage'
import {
  openingPresetById,
  sizePresetById,
  DEFAULT_WINDOW_SIZE_ID,
  DEFAULT_DOOR_SIZE_ID,
} from '../presets'

interface ProjectState {
  project: Project
  // --- whole-project ---
  setProject: (p: Project) => void
  resetSample: () => void
  resetBlank: () => void
  setName: (name: string) => void
  setComfortTempC: (t: number) => void
  setSimHours: (h: number) => void
  setNorthAngle: (deg: number) => void
  setStartHour: (hour: number) => void
  // --- rooms ---
  addRoom: (polygon: Point[]) => Id
  updateRoom: (id: Id, patch: Partial<Room>) => void
  setRoomPolygon: (id: Id, polygon: Point[]) => void
  removeRoom: (id: Id) => void
  // --- walls ---
  updateWall: (id: Id, patch: Partial<Wall>) => void
  resizeWall: (id: Id, newLengthM: number) => void
  insertWallVertex: (wallId: Id, point: Point) => void
  rebuildWalls: () => void
  // --- openings ---
  addOpening: (
    wallId: Id,
    kind: 'window' | 'door',
    presetId: string,
    t: number,
  ) => Id
  updateOpening: (id: Id, patch: Partial<Opening>) => void
  removeOpening: (id: Id) => void
  setAllOpen: (isOpen: boolean) => void
  // --- outside zones ---
  updateZone: (id: Id, patch: Partial<OutsideZone>) => void
  addCustomZone: () => Id
  removeZone: (id: Id) => void
  // --- scenarios ---
  saveScenario: (name: string) => Id
  applyScenario: (id: Id) => void
  removeScenario: (id: Id) => void
}

const ROOM_COLORS = [
  '#90caf9',
  '#a5d6a7',
  '#ffcc80',
  '#ce93d8',
  '#80deea',
  '#ef9a9a',
]

function initialProject(): Project {
  return loadProject() ?? makeSampleProject()
}

export const useProjectStore = create<ProjectState>()(
  immer((set) => ({
    project: initialProject(),

    setProject: (p) =>
      set((s) => {
        s.project = p
      }),

    resetSample: () =>
      set((s) => {
        s.project = makeSampleProject()
      }),

    resetBlank: () =>
      set((s) => {
        const globalZoneId = nanoid(8)
        s.project = {
          id: nanoid(8),
          name: 'Untitled project',
          comfortTempC: 26,
          simHours: 24,
          outsideZones: [
            {
              id: globalZoneId,
              kind: 'global',
              name: 'Outside',
              tempC: 30,
              diurnal: { minC: 20, maxC: 36, peakHour: 15 },
              color: '#b2dfdb',
            },
          ],
          rooms: [],
          walls: [],
          openings: [],
          scenarios: [],
        }
      }),

    setName: (name) =>
      set((s) => {
        s.project.name = name
      }),

    setComfortTempC: (t) =>
      set((s) => {
        s.project.comfortTempC = t
      }),

    setSimHours: (h) =>
      set((s) => {
        s.project.simHours = h
      }),

    setNorthAngle: (deg) =>
      set((s) => {
        s.project.northAngle = deg
      }),

    setStartHour: (hour) =>
      set((s) => {
        s.project.startHour = hour
      }),

    addRoom: (polygon) => {
      const id = nanoid(8)
      set((s) => {
        const n = s.project.rooms.length
        s.project.rooms.push({
          id,
          name: `Room ${n + 1}`,
          polygon,
          initialTempC: 28,
          ceilingHeightM: 2.5,
          thermalMassMultiplier: 8,
          color: ROOM_COLORS[n % ROOM_COLORS.length],
        })
        s.project.walls = deriveWalls(
          s.project.rooms,
          s.project.outsideZones,
          s.project.walls,
        )
      })
      return id
    },

    updateRoom: (id, patch) =>
      set((s) => {
        const r = s.project.rooms.find((x) => x.id === id)
        if (r) Object.assign(r, patch)
      }),

    setRoomPolygon: (id, polygon) =>
      set((s) => {
        const r = s.project.rooms.find((x) => x.id === id)
        if (!r) return
        r.polygon = polygon
        s.project.walls = deriveWalls(
          s.project.rooms,
          s.project.outsideZones,
          s.project.walls,
        )
        pruneOrphanOpenings(s.project)
      }),

    removeRoom: (id) =>
      set((s) => {
        s.project.rooms = s.project.rooms.filter((r) => r.id !== id)
        s.project.walls = deriveWalls(
          s.project.rooms,
          s.project.outsideZones,
          s.project.walls,
        )
        pruneOrphanOpenings(s.project)
      }),

    updateWall: (id, patch) =>
      set((s) => {
        const w = s.project.walls.find((x) => x.id === id)
        if (w) Object.assign(w, patch)
      }),

    resizeWall: (id, newLengthM) =>
      set((s) => {
        const wall = s.project.walls.find((w) => w.id === id)
        if (!wall) return
        const dx = wall.b.x - wall.a.x
        const dy = wall.b.y - wall.a.y
        const currentLen = Math.hypot(dx, dy)
        if (currentLen < 0.001) return
        const newB: Point = {
          x: wall.a.x + (dx / currentLen) * newLengthM,
          y: wall.a.y + (dy / currentLen) * newLengthM,
        }
        // Move the wall.b vertex in every room polygon that references it.
        for (const room of s.project.rooms) {
          room.polygon = room.polygon.map((pt) =>
            Math.hypot(pt.x - wall.b.x, pt.y - wall.b.y) < 0.001 ? newB : pt,
          )
        }
        s.project.walls = deriveWalls(
          s.project.rooms,
          s.project.outsideZones,
          s.project.walls,
        )
        pruneOrphanOpenings(s.project)
      }),

    insertWallVertex: (wallId, point) =>
      set((s) => {
        const wall = s.project.walls.find((w) => w.id === wallId)
        if (!wall) return
        // Update every room whose polygon has an edge matching this wall.
        // Both rooms are updated in a single set() to keep wall derivation consistent.
        for (const room of s.project.rooms) {
          const poly = room.polygon
          const n = poly.length
          for (let i = 0; i < n; i++) {
            const a = poly[i]
            const b = poly[(i + 1) % n]
            const fwd =
              ptClose(a, wall.a) && ptClose(b, wall.b)
            const rev =
              ptClose(a, wall.b) && ptClose(b, wall.a)
            if (fwd || rev) {
              room.polygon = [...poly.slice(0, i + 1), point, ...poly.slice(i + 1)]
              break
            }
          }
        }
        s.project.walls = deriveWalls(
          s.project.rooms,
          s.project.outsideZones,
          s.project.walls,
        )
        pruneOrphanOpenings(s.project)
      }),

    rebuildWalls: () =>
      set((s) => {
        s.project.walls = deriveWalls(
          s.project.rooms,
          s.project.outsideZones,
          s.project.walls,
        )
        pruneOrphanOpenings(s.project)
      }),

    addOpening: (wallId, kind, presetId, t) => {
      const id = nanoid(8)
      const sizeId = kind === 'window' ? DEFAULT_WINDOW_SIZE_ID : DEFAULT_DOOR_SIZE_ID
      const sz = sizePresetById(sizeId)
      set((s) => {
        s.project.openings.push({
          id,
          kind,
          wallId,
          presetId,
          sizePresetId: sizeId,
          t,
          widthM: sz.widthM,
          heightM: sz.heightM,
          sillHeightM: sz.sillHeightM,
          isOpen: kind === 'door',
        })
      })
      return id
    },

    updateOpening: (id, patch) =>
      set((s) => {
        const o = s.project.openings.find((x) => x.id === id)
        if (!o) return
        Object.assign(o, patch)
        // Applying a glazing preset only changes kind (U-value and Cd are derived
        // at simulation time from presetId — they are not stored on the opening).
        if (patch.presetId) {
          const preset = openingPresetById(patch.presetId)
          o.kind = preset.kind
        }
        // Applying a size preset overwrites physical dimensions.
        if (patch.sizePresetId) {
          const sz = sizePresetById(patch.sizePresetId)
          o.widthM = sz.widthM
          o.heightM = sz.heightM
          o.sillHeightM = sz.sillHeightM
        }
      }),

    removeOpening: (id) =>
      set((s) => {
        s.project.openings = s.project.openings.filter((o) => o.id !== id)
      }),

    setAllOpen: (isOpen) =>
      set((s) => {
        for (const o of s.project.openings) o.isOpen = isOpen
      }),

    updateZone: (id, patch) =>
      set((s) => {
        const z = s.project.outsideZones.find((x) => x.id === id)
        if (z) Object.assign(z, patch)
      }),

    addCustomZone: () => {
      const id = nanoid(8)
      set((s) => {
        s.project.outsideZones.push({
          id,
          kind: 'custom',
          name: `Outside zone ${s.project.outsideZones.length}`,
          tempC: 26,
          color: '#b2dfdb',
        })
      })
      return id
    },

    removeZone: (id) =>
      set((s) => {
        const z = s.project.outsideZones.find((x) => x.id === id)
        if (!z || z.kind === 'global') return
        const globalZone = s.project.outsideZones.find((x) => x.kind === 'global')
        // Reassign any exterior walls pointing at this zone to the global one.
        for (const w of s.project.walls) {
          if (w.sideB.type === 'outside' && w.sideB.id === id && globalZone) {
            w.sideB = { type: 'outside', id: globalZone.id }
          }
        }
        s.project.outsideZones = s.project.outsideZones.filter((x) => x.id !== id)
      }),

    saveScenario: (name) => {
      const id = nanoid(8)
      set((s) => {
        s.project.scenarios.push({
          id,
          name: name || `Scenario ${s.project.scenarios.length + 1}`,
          openStates: Object.fromEntries(
            s.project.openings.map((o) => [o.id, o.isOpen]),
          ),
        })
      })
      return id
    },

    applyScenario: (id) =>
      set((s) => {
        const sc = s.project.scenarios.find((x) => x.id === id)
        if (!sc) return
        for (const o of s.project.openings) {
          if (sc.openStates[o.id] !== undefined) o.isOpen = sc.openStates[o.id]
        }
      }),

    removeScenario: (id) =>
      set((s) => {
        s.project.scenarios = s.project.scenarios.filter((x) => x.id !== id)
      }),
  })),
)

function ptClose(a: Point, b: Point): boolean {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy < 1e-6  // 0.001 m tolerance
}

/** Drop openings whose wall no longer exists after a geometry change. */
function pruneOrphanOpenings(project: Project): void {
  const wallIds = new Set(project.walls.map((w) => w.id))
  project.openings = project.openings.filter((o) => wallIds.has(o.wallId))
}

// Autosave (debounced) on every change.
let saveTimer: ReturnType<typeof setTimeout> | undefined
useProjectStore.subscribe((state) => {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => saveProject(state.project), 400)
})
