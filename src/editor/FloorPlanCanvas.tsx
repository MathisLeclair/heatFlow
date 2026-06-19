import { useMemoizedSnap } from './snap'
import { useMemo, useState, useRef, useEffect, type ReactElement } from 'react'
import { Stage, Layer, Line, Circle, Arrow, Text, Group, Rect } from 'react-konva'
import { useTheme } from '@mui/material/styles'
import type Konva from 'konva'
import type { Fan, Opening, Point, PortableAC, Wall } from '../model/types'
import { useProjectStore } from '../state/projectStore'
import { useUiStore } from '../state/uiStore'
import { useSimStore } from '../state/simStore'
import { fitTransform, type ViewTransform } from './viewTransform'
import { closestPointOnSegment, lerpPoint, polygonCentroid } from '../model/geometry'
import { tempToRGB } from '../viz/colorScale'

interface Props {
  width: number
  height: number
}

interface Vp { scale: number; ox: number; oy: number; w: number; h: number }

export function FloorPlanCanvas({ width, height }: Props) {
  const muiTheme = useTheme()
  const dark = muiTheme.palette.mode === 'dark'

  const project = useProjectStore((s) => s.project)
  const addRoom = useProjectStore((s) => s.addRoom)
  const setRoomPolygon = useProjectStore((s) => s.setRoomPolygon)
  const insertWallVertex = useProjectStore((s) => s.insertWallVertex)
  const addOpening = useProjectStore((s) => s.addOpening)
  const updateFan = useProjectStore((s) => s.updateFan)
  const updatePortableAC = useProjectStore((s) => s.updatePortableAC)

  const mode = useUiStore((s) => s.mode)
  const tool = useUiStore((s) => s.tool)
  const setTool = useUiStore((s) => s.setTool)
  const selection = useUiStore((s) => s.selection)
  const select = useUiStore((s) => s.select)
  const pendingWindowPreset = useUiStore((s) => s.pendingWindowPreset)
  const pendingDoorPreset = useUiStore((s) => s.pendingDoorPreset)

  const result = useSimStore((s) => s.result)
  const frame = useSimStore((s) => s.frame)

  const baseView = useMemo(
    () => fitTransform(project, width, height),
    [project, width, height],
  )

  // User-controlled viewport. Invalidated automatically when canvas dimensions change.
  const [vpStored, setVpStored] = useState<Vp | null>(null)
  const vp = vpStored?.w === width && vpStored?.h === height ? vpStored : null

  function setVp(next: Omit<Vp, 'w' | 'h'>) {
    setVpStored({ ...next, w: width, h: height })
  }

  const view: ViewTransform = useMemo(() => {
    const { scale, ox: offsetX, oy: offsetY } = vp ?? {
      scale: baseView.scale,
      ox: baseView.offsetX,
      oy: baseView.offsetY,
    }
    return {
      scale,
      offsetX,
      offsetY,
      toScreen: (p) => ({ x: p.x * scale + offsetX, y: p.y * scale + offsetY }),
      toWorld: (p) => ({ x: (p.x - offsetX) / scale, y: (p.y - offsetY) / scale }),
    }
  }, [vp, baseView])

  const viewRef = useRef(view)
  useEffect(() => { viewRef.current = view }, [view])

  const snap = useMemoizedSnap(project)

  const [draft, setDraft] = useState<Point[]>([])
  const [hover, setHover] = useState<Point | null>(null)

  const simulating = mode === 'simulate' && !!result

  // Temperature range for the heat colour scale (updated each render).
  const tempRange = useMemo(() => {
    if (!result) return { min: 20, max: 35 }
    let min = Infinity, max = -Infinity
    for (const row of result.roomTemps) {
      for (const t of row) { min = Math.min(min, t); max = Math.max(max, t) }
    }
    return isFinite(min) ? { min, max } : { min: 20, max: 35 }
  }, [result])

  // Middle-mouse pan tracking
  const panOrigin = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null)

  // ─── viewport handlers ───────────────────────────────────────────────────

  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault()
    const stage = e.target.getStage()
    if (!stage) return
    const ptr = stage.getPointerPosition()
    if (!ptr) return
    const v = viewRef.current

    if (e.evt.ctrlKey || e.evt.metaKey) {
      // Trackpad pinch → zoom
      const factor = Math.exp(-e.evt.deltaY / 150)
      const newScale = Math.max(8, Math.min(800, v.scale * factor))
      setVp({
        scale: newScale,
        ox: ptr.x - (ptr.x - v.offsetX) * (newScale / v.scale),
        oy: ptr.y - (ptr.y - v.offsetY) * (newScale / v.scale),
      })
    } else {
      // Scroll → pan
      setVp({ scale: v.scale, ox: v.offsetX - e.evt.deltaX, oy: v.offsetY - e.evt.deltaY })
    }
  }

  function handleStageMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    if (e.evt.button === 1) {
      // Middle button → start pan
      e.evt.preventDefault()
      const v = viewRef.current
      panOrigin.current = { mx: e.evt.clientX, my: e.evt.clientY, ox: v.offsetX, oy: v.offsetY }
      return
    }
    handleStageClick(e)
  }

  function handleStageMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
    if (panOrigin.current) {
      const { mx, my, ox, oy } = panOrigin.current
      const v = viewRef.current
      setVp({ scale: v.scale, ox: ox + e.evt.clientX - mx, oy: oy + e.evt.clientY - my })
      return
    }
    if (tool === 'select') return
    setHover(pointerWorld(e))
  }

  function handleStageMouseUp(e: Konva.KonvaEventObject<MouseEvent>) {
    if (e.evt.button === 1) {
      panOrigin.current = null
    }
  }

  // ─── edit tool handlers ───────────────────────────────────────────────────

  function pointerWorld(e: Konva.KonvaEventObject<MouseEvent>): Point | null {
    const stage = e.target.getStage()
    const pos = stage?.getPointerPosition()
    if (!pos) return null
    return view.toWorld(pos)
  }

  function handleStageClick(e: Konva.KonvaEventObject<MouseEvent>) {
    if (e.evt.button !== 0) return
    const w = pointerWorld(e)
    if (!w) return

    if (tool === 'draw-room') {
      const p = snap.snapPoint(w, draft)
      if (draft.length >= 3 && near(p, draft[0])) {
        addRoom(draft)
        setDraft([])
        setTool('select')
      } else {
        setDraft([...draft, p])
      }
      return
    }

    if (tool === 'add-window' || tool === 'add-door') {
      const hit = nearestWall(w)
      if (hit) {
        const kind = tool === 'add-window' ? 'window' : 'door'
        const preset = kind === 'window' ? pendingWindowPreset : pendingDoorPreset
        const id = addOpening(hit.wall.id, kind, preset, hit.t)
        select({ type: 'opening', id })
        setTool('select')
      }
      return
    }

    if (e.target === e.target.getStage()) select(null)
  }

  function handleStageDblClick(e: Konva.KonvaEventObject<MouseEvent>) {
    if (e.evt.button !== 0) return
    if (tool !== 'select') return
    const w = pointerWorld(e)
    if (!w) return
    const hit = nearestWall(w)
    if (!hit) return
    const pt = closestPointOnSegment(w, hit.wall.a, hit.wall.b).point
    insertWallVertex(hit.wall.id, pt)
    // Auto-select the room that owns this wall so vertex handles appear.
    const ownId =
      hit.wall.sideA.type === 'room'
        ? hit.wall.sideA.id
        : hit.wall.sideB.type === 'room'
          ? hit.wall.sideB.id
          : null
    if (ownId) select({ type: 'room', id: ownId })
  }

  function nearestWall(w: Point): { wall: Wall; t: number } | null {
    let best: { wall: Wall; t: number; d: number } | null = null
    for (const wall of project.walls) {
      const { t, distance } = closestPointOnSegment(w, wall.a, wall.b)
      if (!best || distance < best.d) best = { wall, t, d: distance }
    }
    if (best && best.d < 0.6) return { wall: best.wall, t: best.t }
    return null
  }

  const sp = (p: Point) => view.toScreen(p)

  const canvasBg = dark
    ? 'radial-gradient(120% 120% at 50% 0%, #111827 0%, #0d1420 60%, #0a0d14 100%)'
    : 'radial-gradient(120% 120% at 50% 0%, #f4f8f9 0%, #dde6e9 70%, #cfd9dd 100%)'

  return (
    <Stage
      width={width}
      height={height}
      onMouseDown={handleStageMouseDown}
      onMouseMove={handleStageMouseMove}
      onMouseUp={handleStageMouseUp}
      onWheel={handleWheel}
      onDblClick={handleStageDblClick}
      style={{
        background: canvasBg,
        cursor: panOrigin.current
          ? 'grabbing'
          : tool === 'select'
            ? 'default'
            : 'crosshair',
      }}
    >
      {/* Grid */}
      <Layer listening={false}>
        <GridLines view={view} width={width} height={height} dark={dark} />
      </Layer>

      {/* Rooms — filled with temperature colour in simulate mode */}
      <Layer>
        {project.rooms.map((room) => {
          const pts = room.polygon.flatMap((p) => {
            const s = sp(p)
            return [s.x, s.y]
          })
          const isSel = selection?.type === 'room' && selection.id === room.id
          let fill = 'rgba(0,0,0,0.005)'
          if (simulating && result) {
            const ri = result.roomIds.indexOf(room.id)
            const temp = ri >= 0 ? (result.roomTemps[frame]?.[ri] ?? 22) : 22
            const [r, g, b] = tempToRGB(temp, tempRange.min, tempRange.max)
            fill = `rgba(${r},${g},${b},0.45)`
          }
          return (
            <Line
              key={room.id}
              points={pts}
              closed
              fill={fill}
              lineJoin="round"
              stroke={isSel ? '#ff7a3d' : dark ? '#3a5270' : '#8fa8b8'}
              strokeWidth={isSel ? 2.5 : 1.5}
              onClick={(e) => {
                if (tool !== 'select') return
                e.cancelBubble = true
                select({ type: 'room', id: room.id })
              }}
            />
          )
        })}

        {/* Room labels */}
        {project.rooms.map((room) => {
          const c = sp(polygonCentroid(room.polygon))
          const temp = simulating && result
            ? result.roomTemps[frame]?.[result.roomIds.indexOf(room.id)]
            : undefined
          const labelColor = dark ? '#c8d0e0' : '#1a2b35'
          const haloColor = dark ? '#0a0d14' : '#ffffff'
          return (
            <Group key={`lbl-${room.id}`} listening={false}>
              <Text
                x={c.x - 60}
                y={c.y - (temp != null ? 14 : 8)}
                width={120}
                align="center"
                text={room.name}
                fontSize={12}
                fontFamily="Space Grotesk, system-ui, sans-serif"
                fontStyle="600"
                fill={labelColor}
                shadowColor={haloColor}
                shadowBlur={5}
                shadowOpacity={0.85}
              />
              {temp != null && (
                <Text
                  x={c.x - 50}
                  y={c.y + 2}
                  width={100}
                  align="center"
                  text={`${temp.toFixed(1)}°C`}
                  fontSize={12}
                  fontFamily="JetBrains Mono, monospace"
                  fontStyle="500"
                  fill={labelColor}
                  shadowColor={haloColor}
                  shadowBlur={5}
                  shadowOpacity={0.85}
                />
              )}
            </Group>
          )
        })}
      </Layer>

      {/* Walls */}
      <Layer>
        {project.walls.map((wall) => {
          const a = sp(wall.a)
          const b = sp(wall.b)
          const isSel = selection?.type === 'wall' && selection.id === wall.id
          const extColor = dark ? '#4a6080' : '#37474f'
          const intColor = dark ? '#2e3f55' : '#90a4ae'
          return (
            <Line
              key={wall.id}
              points={[a.x, a.y, b.x, b.y]}
              stroke={isSel ? '#ff7a3d' : wall.exterior ? extColor : intColor}
              strokeWidth={isSel ? 7 : wall.exterior ? 5 : 3}
              lineCap="round"
              onClick={(e) => {
                if (tool !== 'select') return
                e.cancelBubble = true
                select({ type: 'wall', id: wall.id })
              }}
            />
          )
        })}

        {/* Openings */}
        {project.openings.map((op) => (
          <OpeningShape
            key={op.id}
            opening={op}
            wall={project.walls.find((w) => w.id === op.wallId)}
            toScreen={sp}
            selected={selection?.type === 'opening' && selection.id === op.id}
            onSelect={() => tool === 'select' && select({ type: 'opening', id: op.id })}
          />
        ))}
      </Layer>

      {/* Equipment: fans and portable ACs */}
      {mode === 'edit' && (
        <Layer>
          {(project.fans ?? []).map((fan) => {
            const room = project.rooms.find((r) => r.id === fan.roomId)
            if (!room) return null
            const opening = fan.openingId ? project.openings.find((o) => o.id === fan.openingId) : undefined
            const wall = opening ? project.walls.find((w) => w.id === opening.wallId) : undefined
            const defaultPos = opening && wall
              ? lerpPoint(wall.a, wall.b, opening.t)
              : polygonCentroid(room.polygon)
            const posWorld: Point = fan.x != null ? { x: fan.x, y: fan.y! } : defaultPos
            return (
              <FanShape
                key={fan.id}
                fan={fan}
                posWorld={posWorld}
                wall={wall}
                opening={opening}
                toScreen={sp}
                view={view}
                selected={selection?.type === 'fan' && selection.id === fan.id}
                onSelect={() => tool === 'select' && select({ type: 'fan', id: fan.id })}
                onDragEnd={(p) => updateFan(fan.id, { x: p.x, y: p.y })}
                dark={dark}
              />
            )
          })}
          {(project.portableACs ?? []).map((ac) => {
            const room = project.rooms.find((r) => r.id === ac.roomId)
            if (!room) return null
            const defaultPos = polygonCentroid(room.polygon)
            const posWorld: Point = ac.x != null ? { x: ac.x, y: ac.y! } : defaultPos
            return (
              <ACShape
                key={ac.id}
                ac={ac}
                posWorld={posWorld}
                toScreen={sp}
                view={view}
                selected={selection?.type === 'ac' && selection.id === ac.id}
                onSelect={() => tool === 'select' && select({ type: 'ac', id: ac.id })}
                onDragEnd={(p) => updatePortableAC(ac.id, { x: p.x, y: p.y })}
              />
            )
          })}
        </Layer>
      )}

      {/* Airflow direction arrows (simulate mode) */}
      {simulating && result && (
        <Layer listening={false}>
          {project.openings.map((op) => {
            const wall = project.walls.find((w) => w.id === op.wallId)
            if (!wall) return null
            const flow = result.openingFlow[frame]?.[result.openingIds.indexOf(op.id)] ?? 0
            const dir = result.openingDir[frame]?.[result.openingIds.indexOf(op.id)] ?? 0
            if (flow < 0.02 || dir === 0) return null
            return (
              <AirflowArrow
                key={`flow-${op.id}`}
                opening={op}
                wall={wall}
                flow={flow}
                dir={dir}
                toScreen={sp}
              />
            )
          })}
        </Layer>
      )}

      {/* Scale bar */}
      <ScaleBar view={view} width={width} height={height} dark={dark} />

      {/* Editing overlays */}
      <Layer>
        {tool === 'draw-room' && draft.length > 0 && (
          <Group listening={false}>
            <Line
              points={[...draft, ...(hover ? [hover] : [])].flatMap((p) => {
                const s = sp(p)
                return [s.x, s.y]
              })}
              stroke="#ff7a3d"
              strokeWidth={2}
              dash={[6, 4]}
            />
            {draft.map((p, i) => {
              const s = sp(p)
              return <Circle key={i} x={s.x} y={s.y} radius={4} fill="#ff7a3d" />
            })}
          </Group>
        )}

        {tool === 'select' &&
          selection?.type === 'room' &&
          (() => {
            const room = project.rooms.find((r) => r.id === selection.id)
            if (!room) return null
            return room.polygon.map((p, i) => {
              const s = sp(p)
              return (
                <Circle
                  key={i}
                  x={s.x}
                  y={s.y}
                  radius={6}
                  fill={dark ? '#1e2d42' : '#fff'}
                  stroke="#ff7a3d"
                  strokeWidth={2}
                  draggable
                  onDragMove={(e) => {
                    const world = view.toWorld({ x: e.target.x(), y: e.target.y() })
                    const snapped = snap.snapToGrid(world)
                    const next = room.polygon.slice()
                    next[i] = snapped
                    setRoomPolygon(room.id, next)
                  }}
                  onDblClick={(e) => {
                    e.cancelBubble = true  // don't also trigger wall vertex insertion
                    if (room.polygon.length <= 3) return
                    setRoomPolygon(room.id, room.polygon.filter((_, idx) => idx !== i))
                  }}
                  onContextMenu={(e) => {
                    e.evt.preventDefault()
                    e.cancelBubble = true
                    if (room.polygon.length <= 3) return
                    setRoomPolygon(room.id, room.polygon.filter((_, idx) => idx !== i))
                  }}
                />
              )
            })
          })()}
      </Layer>
    </Stage>
  )

  function near(a: Point, b: Point): boolean {
    const sa = sp(a)
    const sb = sp(b)
    return Math.hypot(sa.x - sb.x, sa.y - sb.y) < 12
  }
}

function OpeningShape({
  opening,
  wall,
  toScreen,
  selected,
  onSelect,
}: {
  opening: Opening
  wall: Wall | undefined
  toScreen: (p: Point) => Point
  selected: boolean
  onSelect: () => void
}) {
  if (!wall) return null
  const half = openingHalfFraction(opening, wall)
  const p1 = lerpPoint(wall.a, wall.b, Math.max(0, opening.t - half))
  const p2 = lerpPoint(wall.a, wall.b, Math.min(1, opening.t + half))
  const a = toScreen(p1)
  const b = toScreen(p2)
  const color = opening.kind === 'window' ? '#56b0ff' : '#d49a5a'
  return (
    <Line
      points={[a.x, a.y, b.x, b.y]}
      stroke={selected ? '#ff7a3d' : color}
      strokeWidth={selected ? 9 : 7}
      lineCap="butt"
      dash={opening.isOpen ? undefined : [3, 3]}
      onClick={(e) => {
        e.cancelBubble = true
        onSelect()
      }}
    />
  )
}

function AirflowArrow({
  opening,
  wall,
  flow,
  dir,
  toScreen,
}: {
  opening: Opening
  wall: Wall
  flow: number
  dir: number
  toScreen: (p: Point) => Point
}) {
  const center = lerpPoint(wall.a, wall.b, opening.t)
  const dx = wall.b.x - wall.a.x
  const dy = wall.b.y - wall.a.y
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const mag = Math.min(1.6, 0.5 + flow * 1.5)
  const sign = dir
  const tail = { x: center.x - nx * mag * sign, y: center.y - ny * mag * sign }
  const headW = { x: center.x + nx * mag * sign, y: center.y + ny * mag * sign }
  const a = toScreen(tail)
  const b = toScreen(headW)
  return (
    <Arrow
      points={[a.x, a.y, b.x, b.y]}
      pointerLength={9}
      pointerWidth={9}
      stroke="#0b3a42"
      fill="#0b3a42"
      strokeWidth={Math.min(4, 1.5 + flow * 2.5)}
      opacity={0.5}
    />
  )
}

function openingHalfFraction(opening: Opening, wall: Wall): number {
  const wallLen = Math.hypot(wall.b.x - wall.a.x, wall.b.y - wall.a.y) || 1
  return Math.min(0.45, opening.widthM / 2 / wallLen)
}

function FanShape({
  fan,
  posWorld,
  wall,
  opening,
  toScreen,
  view,
  selected,
  onSelect,
  onDragEnd,
  dark,
}: {
  fan: Fan
  posWorld: Point
  wall?: Wall
  opening?: Opening
  toScreen: (p: Point) => Point
  view: ViewTransform
  selected: boolean
  onSelect: () => void
  onDragEnd: (p: Point) => void
  dark: boolean
}) {
  const pos = toScreen(posWorld)
  const R = 11
  const color = fan.isOn ? '#43a047' : '#757575'
  const ringColor = selected ? '#ff7a3d' : color

  const dirRad = ((fan.directionDeg ?? 0) * Math.PI) / 180
  // 3 blade lines at 120° intervals, rotated by direction
  const blades = [0, 120, 240].map((offset) => {
    const a = dirRad + (offset * Math.PI) / 180
    return [Math.sin(a) * R * 0.85, -Math.cos(a) * R * 0.85]
  })

  // For box fans with an opening, compute the wall-normal arrow direction
  let boxDirDx = 0; let boxDirDy = 0
  if (fan.kind === 'box' && wall && opening) {
    const dx = wall.b.x - wall.a.x
    const dy = wall.b.y - wall.a.y
    const len = Math.hypot(dx, dy) || 1
    // perpendicular to wall in canvas coords
    let nx = -dy / len; let ny = dx / len
    // determine which side is the room interior (we point away from centroid = outward normal)
    // we use the room centroid: if we can't determine, default to nx/ny
    // blowsInward: arrow from outside into room (reverse of outward normal)
    const sign = fan.blowsInward ? -1 : 1
    boxDirDx = nx * sign; boxDirDy = ny * sign
  }

  return (
    <Group
      x={pos.x}
      y={pos.y}
      draggable
      onDragEnd={(e) => {
        const world = view.toWorld({ x: e.target.x(), y: e.target.y() })
        onDragEnd(world)
        e.target.x(pos.x)
        e.target.y(pos.y)
      }}
      onClick={(e) => { e.cancelBubble = true; onSelect() }}
    >
      {/* Background circle */}
      <Circle
        radius={R}
        fill={dark ? 'rgba(20,30,45,0.88)' : 'rgba(255,255,255,0.88)'}
        stroke={ringColor}
        strokeWidth={selected ? 2.5 : 1.5}
      />
      {/* Blade lines */}
      {blades.map(([bx, by], i) => (
        <Line key={i} points={[0, 0, bx, by]} stroke={color} strokeWidth={1.8} lineCap="round" />
      ))}
      {/* Center hub */}
      <Circle radius={2.5} fill={color} />
      {/* Direction arrow for ceiling/standing fans */}
      {fan.kind !== 'box' && (
        <Arrow
          points={[0, 0, Math.sin(dirRad) * (R + 7), -Math.cos(dirRad) * (R + 7)]}
          pointerLength={5}
          pointerWidth={5}
          stroke={color}
          fill={color}
          strokeWidth={1.5}
        />
      )}
      {/* Direction arrow for box fans */}
      {fan.kind === 'box' && (boxDirDx !== 0 || boxDirDy !== 0) && (
        <Arrow
          points={[
            -boxDirDx * R * 0.6, -boxDirDy * R * 0.6,
            boxDirDx * (R + 7), boxDirDy * (R + 7),
          ]}
          pointerLength={6}
          pointerWidth={6}
          stroke={color}
          fill={color}
          strokeWidth={2}
        />
      )}
    </Group>
  )
}

function ACShape({
  ac,
  posWorld,
  toScreen,
  view,
  selected,
  onSelect,
  onDragEnd,
}: {
  ac: PortableAC
  posWorld: Point
  toScreen: (p: Point) => Point
  view: ViewTransform
  selected: boolean
  onSelect: () => void
  onDragEnd: (p: Point) => void
}) {
  const pos = toScreen(posWorld)
  const W = 18; const H = 14
  const color = ac.isOn ? '#1e88e5' : '#757575'
  const borderColor = selected ? '#ff7a3d' : color

  return (
    <Group
      x={pos.x}
      y={pos.y}
      draggable
      onDragEnd={(e) => {
        const world = view.toWorld({ x: e.target.x(), y: e.target.y() })
        onDragEnd(world)
        e.target.x(pos.x)
        e.target.y(pos.y)
      }}
      onClick={(e) => { e.cancelBubble = true; onSelect() }}
    >
      <Rect
        x={-W / 2} y={-H / 2}
        width={W} height={H}
        fill={ac.isOn ? 'rgba(30,136,229,0.15)' : 'rgba(100,100,100,0.12)'}
        stroke={borderColor}
        strokeWidth={selected ? 2.5 : 1.5}
        cornerRadius={3}
      />
      {/* Three horizontal vent slats */}
      {[-3, 0, 3].map((yOff) => (
        <Line
          key={yOff}
          points={[-W / 2 + 3, yOff, W / 2 - 3, yOff]}
          stroke={color}
          strokeWidth={1.5}
          lineCap="round"
        />
      ))}
    </Group>
  )
}

const SCALE_CANDIDATES = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100]

function ScaleBar({
  view,
  width,
  height,
  dark,
}: {
  view: ViewTransform
  width: number
  height: number
  dark: boolean
}) {
  const worldLen = SCALE_CANDIDATES.find((c) => c * view.scale >= 60) ?? 100
  const pxLen = worldLen * view.scale
  const label = worldLen < 1 ? `${Math.round(worldLen * 100)} cm` : `${worldLen} m`
  const color = dark ? 'rgba(190,205,225,0.85)' : 'rgba(28,46,64,0.80)'
  const x2 = width - 16
  const x1 = x2 - pxLen
  const y = height - 20

  return (
    <Layer listening={false}>
      <Line points={[x1, y, x2, y]} stroke={color} strokeWidth={2} lineCap="square" />
      <Line points={[x1, y - 5, x1, y + 5]} stroke={color} strokeWidth={2} lineCap="square" />
      <Line points={[x2, y - 5, x2, y + 5]} stroke={color} strokeWidth={2} lineCap="square" />
      <Text
        x={x1}
        y={y - 18}
        width={pxLen}
        align="center"
        text={label}
        fontSize={11}
        fontFamily="JetBrains Mono, monospace"
        fill={color}
      />
    </Layer>
  )
}

function GridLines({
  view,
  width,
  height,
  dark,
}: {
  view: ViewTransform
  width: number
  height: number
  dark: boolean
}) {
  const topLeft = view.toWorld({ x: 0, y: 0 })
  const bottomRight = view.toWorld({ x: width, y: height })
  const x0 = Math.floor(topLeft.x) - 1
  const x1 = Math.ceil(bottomRight.x) + 1
  const y0 = Math.floor(topLeft.y) - 1
  const y1 = Math.ceil(bottomRight.y) + 1
  if ((x1 - x0) * (y1 - y0) > 6000) return null

  const gridColor = dark ? '#2a3a52' : '#9fb2b8'
  const lines: ReactElement[] = []
  for (let x = x0; x <= x1; x++) {
    const a = view.toScreen({ x, y: y0 })
    const b = view.toScreen({ x, y: y1 })
    lines.push(
      <Line
        key={`gx-${x}`}
        points={[a.x, a.y, b.x, b.y]}
        stroke={gridColor}
        strokeWidth={x % 5 === 0 ? 1 : 0.5}
        opacity={x % 5 === 0 ? 0.4 : 0.2}
      />,
    )
  }
  for (let y = y0; y <= y1; y++) {
    const a = view.toScreen({ x: x0, y })
    const b = view.toScreen({ x: x1, y })
    lines.push(
      <Line
        key={`gy-${y}`}
        points={[a.x, a.y, b.x, b.y]}
        stroke={gridColor}
        strokeWidth={y % 5 === 0 ? 1 : 0.5}
        opacity={y % 5 === 0 ? 0.4 : 0.2}
      />,
    )
  }
  return <>{lines}</>
}
