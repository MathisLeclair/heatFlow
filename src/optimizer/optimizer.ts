import { nanoid } from 'nanoid'
import * as Comlink from 'comlink'
import type { Project, Opening, Fan, PortableAC, Wall } from '../model/types'
import type { SimResult } from '../sim/simulate'
import type { SimWorkerApi } from '../sim/sim.worker'

// Separate worker instance so the optimizer doesn't block main sim playback.
let _worker: Comlink.Remote<SimWorkerApi> | null = null
function getWorker(): Comlink.Remote<SimWorkerApi> {
  if (!_worker) {
    const w = new Worker(new URL('../sim/sim.worker.ts', import.meta.url), { type: 'module' })
    _worker = Comlink.wrap<SimWorkerApi>(w)
  }
  return _worker
}

export interface OptimizerInventory {
  standingFans: number   // 0–3
  boxFans: number        // 0–3
  portableACs: number    // 0–2
  acPowerW: number       // 1000 | 2000 | 3500
}

export interface OptimizerResult {
  label: string
  score: number
  result: SimResult
  project: Project
}

type OpeningState = boolean | 'auto'
type Mask = Record<string, OpeningState>

// ─── Wall helpers ─────────────────────────────────────────────────────────────

function wallNormal(w: Wall): [number, number] {
  const dx = w.b.x - w.a.x
  const dy = w.b.y - w.a.y
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  return [dy / len, -dx / len]  // right-hand perpendicular, normalised
}

// ─── Mask generation ─────────────────────────────────────────────────────────

function generateMasks(project: Project): Array<{ label: string; mask: Mask }> {
  const { openings, walls } = project
  const ids = openings.map((o) => o.id)
  const results: Array<{ label: string; mask: Mask }> = []
  const seen = new Set<string>()

  function add(label: string, mask: Mask) {
    const key = ids.map((id) => String(mask[id] ?? 'x')).join(',')
    if (seen.has(key)) return
    seen.add(key)
    results.push({ label, mask })
  }

  const allAuto = Object.fromEntries(ids.map((id) => [id, 'auto' as OpeningState]))
  const allOpen = Object.fromEntries(ids.map((id) => [id, true as OpeningState]))
  const allClosed = Object.fromEntries(ids.map((id) => [id, false as OpeningState]))

  // 1. All auto
  add('All auto', allAuto)
  // 2. All open
  add('All open', allOpen)
  // 3. All closed (equipment only)
  add('Equipment only', allClosed)

  // 4. Cross-ventilation: mark openings whose wall normals are roughly opposite
  const wallNormals = new Map<string, [number, number]>()
  for (const w of walls) wallNormals.set(w.id, wallNormal(w))

  const crossVentSet = new Set<string>()
  for (let i = 0; i < openings.length; i++) {
    for (let j = i + 1; j < openings.length; j++) {
      if (openings[i].wallId === openings[j].wallId) continue
      const na = wallNormals.get(openings[i].wallId)
      const nb = wallNormals.get(openings[j].wallId)
      if (!na || !nb) continue
      if (na[0] * nb[0] + na[1] * nb[1] < -0.5) {
        crossVentSet.add(openings[i].id)
        crossVentSet.add(openings[j].id)
      }
    }
  }
  if (crossVentSet.size >= 2) {
    add('Cross-ventilation', Object.fromEntries(ids.map((id) => [id, crossVentSet.has(id) ? ('auto' as OpeningState) : false])))
  }

  // 5. Largest-area openings (top 50%) → auto
  const byArea = [...openings].sort((a, b) => b.widthM * b.heightM - a.widthM * a.heightM)
  const topHalf = new Set(byArea.slice(0, Math.ceil(byArea.length / 2)).map((o) => o.id))
  add('Largest openings auto', Object.fromEntries(ids.map((id) => [id, topHalf.has(id) ? ('auto' as OpeningState) : false])))

  // 6. Windows → auto, doors closed
  add('Windows auto', Object.fromEntries(
    openings.map((o) => [o.id, o.kind === 'window' ? ('auto' as OpeningState) : false])
  ))

  // 7. Exterior openings only (walls with one outside side)
  const exteriorOpeningIds = new Set(
    openings
      .filter((o) => {
        const w = walls.find((wl) => wl.id === o.wallId)
        return w?.exterior === true
      })
      .map((o) => o.id)
  )
  if (exteriorOpeningIds.size > 0 && exteriorOpeningIds.size < ids.length) {
    add('Exterior only', Object.fromEntries(ids.map((id) => [id, exteriorOpeningIds.has(id) ? ('auto' as OpeningState) : false])))
  }

  // 8. Cross-vent set open (static)
  if (crossVentSet.size >= 2) {
    add('Cross-vent open', Object.fromEntries(ids.map((id) => [id, crossVentSet.has(id) ? (true as OpeningState) : false])))
  }

  // Random sampling — fill up to 28 total candidates
  for (let attempt = 0; attempt < 120 && results.length < 28; attempt++) {
    // Bias toward auto (45%) > open (35%) > closed (20%)
    const bucket = [
      'auto', 'auto', 'auto', 'auto', 'auto',
      true, true, true, true,
      false, false,
    ] as OpeningState[]
    const mask = Object.fromEntries(
      ids.map((id) => [id, bucket[Math.floor(Math.random() * bucket.length)]])
    )
    add(`Config ${results.length - 7}`, mask)
  }

  return results
}

// ─── Equipment placement ──────────────────────────────────────────────────────

// How box fans are oriented at their openings:
//   exhaust   – all blow outward (extract hot air)
//   intake    – all blow inward (push cooler outside air in)
//   alternate – even-indexed fans intake, odd-indexed exhaust (forced cross-flow)
type BoxFanMode = 'exhaust' | 'intake' | 'alternate'

function placeEquipment(
  base: Project,
  mask: Mask,
  inventory: OptimizerInventory,
  roomHeatRank: number[],       // room array indices sorted by °C·h desc
  flowRankedIds: string[],      // opening ids sorted by avg flow desc
  boxFanMode: BoxFanMode = 'exhaust',
): Project {
  const openings = base.openings.map((o): Opening => {
    const state = mask[o.id]
    if (state === undefined) return o
    if (state === 'auto') return { ...o, autoOpen: true, isOpen: false }
    return { ...o, autoOpen: false, isOpen: state as boolean }
  })

  const fans: Fan[] = []
  const portableACs: PortableAC[] = []
  const rooms = base.rooms

  // Portable ACs → hottest rooms
  for (let k = 0; k < Math.min(inventory.portableACs, rooms.length); k++) {
    portableACs.push({
      id: nanoid(8),
      roomId: rooms[roomHeatRank[k]].id,
      coolingPowerW: inventory.acPowerW,
      isOn: true,
    })
  }

  // Standing fans → hottest rooms (may overlap with ACs; both help)
  for (let k = 0; k < Math.min(inventory.standingFans, rooms.length); k++) {
    fans.push({
      id: nanoid(8),
      roomId: rooms[roomHeatRank[k]].id,
      kind: 'standing',
      flowRateM3S: 0,
      isOn: true,
    })
  }

  // Box fans → openings with highest flow that are open/auto in this mask.
  // Orientation is controlled by boxFanMode so the optimizer can test intake
  // vs exhaust vs alternating (forced cross-flow) as separate candidates.
  const eligibleIds = flowRankedIds.filter((id) => mask[id] === true || mask[id] === 'auto')
  let boxLeft = inventory.boxFans
  let boxIdx = 0
  for (const openingId of eligibleIds) {
    if (boxLeft <= 0) break
    const o = openings.find((op) => op.id === openingId)
    if (!o) continue
    const wall = base.walls.find((w) => w.id === o.wallId)
    if (!wall) continue
    const roomId =
      wall.sideA.type === 'room' ? wall.sideA.id
        : wall.sideB.type === 'room' ? wall.sideB.id
          : null
    if (!roomId) continue
    const blowsInward =
      boxFanMode === 'intake' ? true
        : boxFanMode === 'exhaust' ? false
          : boxIdx % 2 === 0  // alternate: first fan intake, next exhaust, …
    fans.push({
      id: nanoid(8),
      roomId,
      kind: 'box',
      openingId,
      flowRateM3S: 0.09,
      isOn: true,
      blowsInward,
    })
    boxLeft--
    boxIdx++
  }

  return { ...base, openings, fans, portableACs }
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function runOptimizer(
  project: Project,
  inventory: OptimizerInventory,
  onProgress: (p: number) => void,
): Promise<OptimizerResult[]> {
  const worker = getWorker()

  // Step 1: Baseline run (all-auto, no extra equipment)
  const baselineProject: Project = {
    ...project,
    openings: project.openings.map((o) => ({ ...o, autoOpen: true, isOpen: false })),
    fans: [],
    portableACs: [],
  }
  onProgress(0.05)
  const baseline = await worker.run(baselineProject)
  onProgress(0.15)

  // Room heat rank (indices sorted by degree-hours descending)
  const roomHeatRank = baseline.roomDegreeHours
    .map((dh, i) => ({ i, dh }))
    .sort((a, b) => b.dh - a.dh)
    .map((x) => x.i)

  // Opening flow rank (average flow across frames, descending)
  const flowRankedIds = project.openings
    .map((o, oi) => {
      const avg =
        baseline.openingFlow.reduce((s, frame) => s + (frame[oi] ?? 0), 0) /
        (baseline.openingFlow.length || 1)
      return { id: o.id, avg }
    })
    .sort((a, b) => b.avg - a.avg)
    .map((x) => x.id)

  // Step 2: Generate opening-state candidates
  const candidates = generateMasks(project)

  // Step 3: Expand each candidate by box-fan orientation.
  // When box fans are available we try exhaust, intake, and alternating
  // (forced cross-flow) as independent variants — they can meaningfully
  // differ in score and the best orientation is not known in advance.
  const orientations: Array<{ mode: BoxFanMode; suffix: string }> =
    inventory.boxFans === 0
      ? [{ mode: 'exhaust', suffix: '' }]                // no fans — orientation irrelevant
      : inventory.boxFans === 1
        ? [
            { mode: 'exhaust', suffix: ' · fans out' },
            { mode: 'intake',  suffix: ' · fans in' },
          ]
        : [
            { mode: 'exhaust',   suffix: ' · fans out' },
            { mode: 'intake',    suffix: ' · fans in' },
            { mode: 'alternate', suffix: ' · fans mixed' },
          ]

  const candidateProjects: Array<{ label: string; project: Project }> = []
  for (const c of candidates) {
    for (const { mode, suffix } of orientations) {
      candidateProjects.push({
        label: c.label + suffix,
        project: placeEquipment(project, c.mask, inventory, roomHeatRank, flowRankedIds, mode),
      })
    }
  }

  // Step 4: Simulate in batches of 8 with progress updates
  const BATCH = 8
  const total = candidateProjects.length
  let done = 0
  const allResults: Array<{ label: string; score: number; result: SimResult; project: Project }> = []

  for (let i = 0; i < candidateProjects.length; i += BATCH) {
    const batch = candidateProjects.slice(i, i + BATCH)
    const batchLabels = candidateProjects.slice(i, i + BATCH).map((c) => c.label)
    const simResults = await Promise.all(batch.map((p) => worker.run(p.project)))
    simResults.forEach((result, j) => {
      allResults.push({
        label: batchLabels[j],
        score: result.degreeHoursAboveComfort,
        result,
        project: batch[j].project,
      })
    })
    done += batch.length
    onProgress(0.15 + 0.8 * (done / total))
  }

  // Step 5: Sort, deduplicate within 0.5 °C·h, return top 5
  allResults.sort((a, b) => a.score - b.score)
  const top5: OptimizerResult[] = []
  for (const r of allResults) {
    if (top5.some((t) => Math.abs(t.score - r.score) < 0.5)) continue
    top5.push(r)
    if (top5.length >= 5) break
  }

  onProgress(1)
  return top5
}
