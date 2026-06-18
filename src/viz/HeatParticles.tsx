/**
 * Unified particle simulation driven by the thermal simulation data.
 *
 * Physics: 2D potential-flow velocity field inside each room.
 * Each open opening is a point source (inlet) or sink (outlet) for its room.
 * Particles spawned at inlets, swept by the field, hand off across interior
 * openings, and fade out when they exit to the outside.
 *
 * All particles — ambient room-fill and inlet-spawned — live in one pool and
 * obey the same physics.
 */

import { useEffect, useMemo, useRef } from 'react'
import { Layer } from 'react-konva'
import Konva from 'konva'
import type { Point } from '../model/types'
import type { ViewTransform } from '../editor/viewTransform'
import { useProjectStore } from '../state/projectStore'
import { useUiStore } from '../state/uiStore'
import { useSimStore } from '../state/simStore'
import { buildEmitters, type OpeningEmitter } from './emitters'
import { tempToColor } from './colorScale'
import { zoneTempAt } from '../sim/simulate'
import { polygonArea, pointInPolygon } from '../model/geometry'

// ─── tuning ──────────────────────────────────────────────────────────────────

const MAX_PARTICLES   = 500    // hard cap on Konva nodes
const MAX_SEED        = 300    // ambient particles seeded at sim start
const DENSITY         = 10     // seeded particles per m²
const SPAWN_RATE      = 18     // spawned particles per (m³/s) per second
const FIELD_SCALE     = 7.0    // potential field strength
const MIN_DIST        = 0.25   // m — singularity clamp
const MAX_SPEED       = 2.8    // m/s — velocity cap
const DRAG_PER_S      = 1.8    // exponential drag coefficient (per second)
const BROWNIAN        = 0.12   // m/s RMS jitter scale
const BUOYANCY        = 0.045  // m/s² per °C above midpoint temperature
const TEMP_TAU        = 6.0    // s — particle temperature mixing time
const HANDOFF_R       = 0.18   // m — proximity to trigger room crossing
const MIN_ROOM_POP    = 6      // minimum live particles per room; refilled each tick
const FADE_IN         = 0.35   // s
const FADE_OUT        = 0.40   // s — when exiting to outside

// ─── types ───────────────────────────────────────────────────────────────────

interface Particle {
  x: number; y: number
  vx: number; vy: number
  temp: number
  roomId: string | null   // null only while fading out to outside
  age: number             // seconds since activation (fade-in)
  ttl: number             // remaining fade-out time; Infinity while alive in room
  node: Konva.Circle
  alive: boolean
}

// ─── helper — room → emitter lookup ──────────────────────────────────────────

function buildRoomEmitterMap(emitters: OpeningEmitter[]): Map<string, OpeningEmitter[]> {
  const m = new Map<string, OpeningEmitter[]>()
  for (const e of emitters) {
    for (const rid of [e.sideARoomId, e.sideBRoomId]) {
      if (!rid) continue
      if (!m.has(rid)) m.set(rid, [])
      m.get(rid)!.push(e)
    }
  }
  return m
}

// ─── component ───────────────────────────────────────────────────────────────

export function HeatParticles({ view }: { view: ViewTransform }) {
  const layerRef = useRef<Konva.Layer>(null)
  const project  = useProjectStore((s) => s.project)
  const result   = useSimStore((s) => s.result)

  const emitters = useMemo(() => buildEmitters(project), [project])

  const range = useMemo(() => {
    let min = Infinity, max = -Infinity
    if (result)
      for (const row of result.roomTemps)
        for (const t of row) { min = Math.min(min, t); max = Math.max(max, t) }
    return isFinite(min) ? { min, max } : { min: 20, max: 35 }
  }, [result])

  // Live refs — updated every render, read inside the rAF closure.
  const viewRef     = useRef(view)
  const emittersRef = useRef(emitters)
  const rangeRef    = useRef(range)
  const projectRef  = useRef(project)
  useEffect(() => {
    viewRef.current     = view
    emittersRef.current = emitters
    rangeRef.current    = range
    projectRef.current  = project
  }, [view, emitters, range, project])

  // Main simulation: rebuilt whenever simulation result changes.
  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return

    // ── particle pool ─────────────────────────────────────────────────────
    const pool: Particle[] = []
    const spawnAcc: Record<string, number> = {}

    function acquire(): Particle | null {
      const dead = pool.find((p) => !p.alive)
      if (dead) return dead
      if (pool.length >= MAX_PARTICLES) return null
      const node = new Konva.Circle({ radius: 2, listening: false })
      layer!.add(node)
      const p: Particle = {
        x: 0, y: 0, vx: 0, vy: 0, temp: 20,
        roomId: null, age: 0, ttl: Infinity, node, alive: false,
      }
      pool.push(p)
      return p
    }

    function activate(
      p: Particle,
      x: number, y: number, vx: number, vy: number,
      temp: number, roomId: string,
    ) {
      p.x = x; p.y = y; p.vx = vx; p.vy = vy
      p.temp = temp; p.roomId = roomId
      p.age = 0; p.ttl = Infinity; p.alive = true
      p.node.visible(true)
    }

    function release(p: Particle) {
      p.alive = false; p.roomId = null; p.node.visible(false)
    }

    // ── seed ambient particles at simulation start ────────────────────────
    if (result) {
      const rooms = projectRef.current.rooms
      const areas = rooms.map((r) => polygonArea(r.polygon))
      const frameTemps = result.roomTemps[0] ?? []
      let budget = MAX_SEED

      for (let ri = 0; ri < rooms.length && budget > 0; ri++) {
        const room = rooms[ri]
        const poly = room.polygon
        const n    = Math.min(budget, Math.max(2, Math.round(areas[ri] * DENSITY)))
        const tIdx = result.roomIds.indexOf(room.id)
        const initT = tIdx >= 0 ? (frameTemps[tIdx] ?? 22) : 22

        let bMinX = Infinity, bMinY = Infinity, bMaxX = -Infinity, bMaxY = -Infinity
        for (const pt of poly) {
          bMinX = Math.min(bMinX, pt.x); bMinY = Math.min(bMinY, pt.y)
          bMaxX = Math.max(bMaxX, pt.x); bMaxY = Math.max(bMaxY, pt.y)
        }

        let placed = 0
        for (let attempt = 0; attempt < n * 10 && placed < n; attempt++) {
          const pt = {
            x: bMinX + Math.random() * (bMaxX - bMinX),
            y: bMinY + Math.random() * (bMaxY - bMinY),
          }
          if (!pointInPolygon(pt, poly)) continue
          const p = acquire()
          if (!p) break
          activate(p, pt.x, pt.y,
            (Math.random() - 0.5) * 0.15,
            (Math.random() - 0.5) * 0.15,
            initT + (Math.random() - 0.5) * 0.5,
            room.id)
          placed++; budget--
        }
      }
    }

    // ── rAF loop ─────────────────────────────────────────────────────────
    let raf  = 0
    let last = performance.now()

    // Cache the room→emitter map, rebuilt only when emitters identity changes.
    let cachedEmitters: OpeningEmitter[] | null = null
    let roomEmMap = new Map<string, OpeningEmitter[]>()

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      raf  = requestAnimationFrame(tick)

      const sim = useSimStore.getState()
      if (useUiStore.getState().mode !== 'simulate' || !sim.result) {
        pool.forEach((p) => p.node.visible(false))
        layer!.batchDraw()
        return
      }

      const res    = sim.result
      const frame  = sim.frame
      const vt     = viewRef.current
      const em     = emittersRef.current
      const proj   = projectRef.current
      const { min, max } = rangeRef.current
      const midT   = (min + max) / 2
      const hour   = res.hours[frame]

      // Rebuild room→emitter map only when emitters array changes.
      if (em !== cachedEmitters) {
        cachedEmitters = em
        roomEmMap = buildRoomEmitterMap(em)
      }

      // Per-frame lookup tables — O(rooms + openings), negligible cost.
      const roomById = new Map(proj.rooms.map((r) => [r.id, r]))
      const frameTemps = res.roomTemps[frame] ?? []
      const frameFlows = res.openingFlow[frame] ?? []
      const frameDirs  = res.openingDir[frame]  ?? []
      const opIdx      = new Map(res.openingIds.map((id, i) => [id, i] as [string, number]))
      const roomTempAt = (rid: string) => {
        const i = res.roomIds.indexOf(rid)
        return i >= 0 ? (frameTemps[i] ?? midT) : midT
      }
      const zoneTemp = (zid: string | null) => {
        if (!zid) return midT
        const z = proj.outsideZones.find((z) => z.id === zid)
        return z ? zoneTempAt(z, hour) : midT
      }

      // ── spawn from inlets ─────────────────────────────────────────────
      for (const e of em) {
        const eIdx = opIdx.get(e.openingId)
        if (eIdx === undefined) continue
        const flow = frameFlows[eIdx] ?? 0
        const dir  = frameDirs[eIdx]  ?? 0
        if (flow < 0.01 || dir === 0) continue

        // Which room does air enter, from what temperature?
        let inletRoom: string | null
        let inDir: Point
        let srcTemp: number

        if (dir > 0) {
          // sideB → sideA
          inletRoom = e.sideARoomId
          inDir     = e.inward
          srcTemp   = e.sideBRoomId ? roomTempAt(e.sideBRoomId) : zoneTemp(e.sideBZoneId)
        } else {
          // sideA → sideB
          inletRoom = e.sideBRoomId
          inDir     = { x: -e.inward.x, y: -e.inward.y }
          srcTemp   = e.sideARoomId ? roomTempAt(e.sideARoomId) : midT
        }
        if (!inletRoom) continue

        const key = e.openingId + (dir > 0 ? '_a' : '_b')
        spawnAcc[key] = (spawnAcc[key] ?? 0) + flow * SPAWN_RATE * dt

        while (spawnAcc[key] >= 1) {
          spawnAcc[key] -= 1
          const p = acquire()
          if (!p) break
          const tx     = -inDir.y
          const ty     =  inDir.x
          const spread = (Math.random() - 0.5) * 0.35
          const speed  =  0.25 + Math.min(1.0, flow * 1.4)
          activate(p,
            e.center.x + inDir.x * 0.08 + tx * spread,
            e.center.y + inDir.y * 0.08 + ty * spread,
            inDir.x * speed + tx * (Math.random() - 0.5) * 0.15,
            inDir.y * speed + ty * (Math.random() - 0.5) * 0.15,
            srcTemp, inletRoom,
          )
        }
      }

      // ── integrate all particles ───────────────────────────────────────
      const dragF  = Math.exp(-DRAG_PER_S * dt)
      const minDSq = MIN_DIST * MIN_DIST
      const sqDt   = Math.sqrt(dt)

      for (const p of pool) {
        if (!p.alive) continue
        p.age += dt

        // ── fading out (exited to outside) ─────────────────────────────
        if (isFinite(p.ttl)) {
          p.ttl -= dt
          if (p.ttl <= 0) { release(p); continue }
          p.x += p.vx * dt
          p.y += p.vy * dt
          const s = vt.toScreen({ x: p.x, y: p.y } as Point)
          p.node.x(s.x); p.node.y(s.y); p.node.radius(2.0)
          p.node.fill(tempToColor(p.temp, min, max))
          p.node.opacity(Math.min(1, p.age / FADE_IN) * (p.ttl / FADE_OUT) * 0.65)
          p.node.visible(true)
          continue
        }

        // ── active particle ─────────────────────────────────────────────
        if (!p.roomId) { release(p); continue }
        const room = roomById.get(p.roomId)
        if (!room) { release(p); continue }

        const roomT = roomTempAt(p.roomId)

        // Temperature advection toward bulk room temperature.
        p.temp += (roomT - p.temp) * (dt / TEMP_TAU)

        // ── 2D potential-flow velocity field ───────────────────────────
        // Each opening in this room acts as a point source (inlet) or sink (outlet).
        // Source at s:  v(r) =  Q·K·(r−s)/|r−s|²  (pushes away)
        // Sink   at s:  v(r) = −Q·K·(r−s)/|r−s|²  (pulls toward)
        let fx = 0, fy = 0
        for (const e of (roomEmMap.get(p.roomId) ?? [])) {
          const eIdx = opIdx.get(e.openingId)
          if (eIdx === undefined) continue
          const flow = frameFlows[eIdx] ?? 0
          const dir  = frameDirs[eIdx]  ?? 0
          if (flow < 0.01 || dir === 0) continue

          // +1 = source (air enters this room here), −1 = sink (exits)
          const roleSign = (e.sideARoomId === p.roomId)
            ? (dir > 0 ? +1 : -1)
            : (dir > 0 ? -1 : +1)  // room is sideB

          const dx = p.x - e.center.x
          const dy = p.y - e.center.y
          const d2 = Math.max(dx * dx + dy * dy, minDSq)
          const str = roleSign * flow * FIELD_SCALE / d2
          fx += str * dx
          fy += str * dy
        }

        // Thermal buoyancy: warm air rises (−Y in world/canvas coords).
        fy -= (p.temp - midT) * BUOYANCY

        // Integrate: drag + field + brownian jitter.
        p.vx = p.vx * dragF + fx * dt
        p.vy = p.vy * dragF + fy * dt
        p.vx += (Math.random() - 0.5) * BROWNIAN * sqDt
        p.vy += (Math.random() - 0.5) * BROWNIAN * sqDt

        // Speed cap.
        const spd = Math.hypot(p.vx, p.vy)
        if (spd > MAX_SPEED) { p.vx *= MAX_SPEED / spd; p.vy *= MAX_SPEED / spd }

        // ── move + polygon boundary reflection ─────────────────────────
        const nx   = p.x + p.vx * dt
        const ny   = p.y + p.vy * dt
        const poly = room.polygon

        if (pointInPolygon({ x: nx, y: ny }, poly)) {
          p.x = nx; p.y = ny
        } else if (pointInPolygon({ x: nx, y: p.y }, poly)) {
          p.x = nx; p.vy = -p.vy * 0.25
        } else if (pointInPolygon({ x: p.x, y: ny }, poly)) {
          p.y = ny; p.vx = -p.vx * 0.25
        } else {
          p.vx = -p.vx * 0.25; p.vy = -p.vy * 0.25
        }

        // ── room handoff: cross through sink openings ──────────────────
        for (const e of (roomEmMap.get(p.roomId) ?? [])) {
          const eIdx = opIdx.get(e.openingId)
          if (eIdx === undefined) continue
          const flow = frameFlows[eIdx] ?? 0
          const dir  = frameDirs[eIdx]  ?? 0
          if (flow < 0.01 || dir === 0) continue

          // Only act on openings where air exits this room (sink).
          const isSink = (e.sideARoomId === p.roomId) ? (dir < 0) : (dir > 0)
          if (!isSink) continue
          const ddx = p.x - e.center.x
          const ddy = p.y - e.center.y
          if (Math.hypot(ddx, ddy) > HANDOFF_R) continue
          // Particle must actually be moving toward the opening.
          if (p.vx * ddx + p.vy * ddy > 0) continue

          // Destination: adjacent room or outside.
          let destId: string | null
          let inDir: Point
          if (e.sideARoomId === p.roomId) {
            destId = e.sideBRoomId
            inDir  = { x: -e.inward.x, y: -e.inward.y }
          } else {
            destId = e.sideARoomId  // always a room by topology
            inDir  = { x:  e.inward.x, y:  e.inward.y }
          }

          if (destId) {
            // Cross to adjacent room. Preserve tangential velocity, set
            // inward component to minimum entry speed.
            p.roomId = destId
            p.x = e.center.x + inDir.x * 0.18
            p.y = e.center.y + inDir.y * 0.18
            const tang  = p.vx * (-inDir.y) + p.vy * inDir.x
            const inSpd = Math.max(0.25, flow * 0.9)
            p.vx = inDir.x * inSpd + (-inDir.y) * tang
            p.vy = inDir.y * inSpd +   inDir.x  * tang
          } else {
            // Exiting to outside: start fade-out, release room.
            p.ttl    = FADE_OUT
            p.roomId = null
          }
          break
        }

        // ── render ──────────────────────────────────────────────────────
        const s = vt.toScreen({ x: p.x, y: p.y } as Point)
        p.node.x(s.x); p.node.y(s.y); p.node.radius(2.0)
        p.node.fill(tempToColor(p.temp, min, max))
        p.node.opacity(Math.min(1, p.age / FADE_IN) * 0.65)
        p.node.visible(true)
      }

      // ── room refill: keep each room above minimum particle count ────────
      // Rooms with only outlets will drain over time; refill with slow-moving
      // ambient particles to represent the air always present in the space.
      const roomPop = new Map<string, number>()
      for (const p of pool) {
        if (p.alive && p.roomId !== null) {
          roomPop.set(p.roomId, (roomPop.get(p.roomId) ?? 0) + 1)
        }
      }
      for (const room of proj.rooms) {
        if ((roomPop.get(room.id) ?? 0) >= MIN_ROOM_POP) continue
        const poly = room.polygon
        let rMinX = Infinity, rMinY = Infinity, rMaxX = -Infinity, rMaxY = -Infinity
        for (const pt of poly) {
          rMinX = Math.min(rMinX, pt.x); rMinY = Math.min(rMinY, pt.y)
          rMaxX = Math.max(rMaxX, pt.x); rMaxY = Math.max(rMaxY, pt.y)
        }
        const roomT = roomTempAt(room.id)
        for (let attempt = 0; attempt < 40; attempt++) {
          const pt = {
            x: rMinX + Math.random() * (rMaxX - rMinX),
            y: rMinY + Math.random() * (rMaxY - rMinY),
          }
          if (!pointInPolygon(pt, poly)) continue
          const p = acquire()
          if (!p) break
          activate(p, pt.x, pt.y,
            (Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.08,
            roomT, room.id)
          break
        }
      }

      layer!.batchDraw()
    }

    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      pool.forEach((p) => p.node.destroy())
      layer.destroyChildren()
    }
  }, [result])

  return <Layer ref={layerRef} listening={false} />
}
