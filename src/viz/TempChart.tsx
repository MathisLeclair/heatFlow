import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts'
import { useProjectStore } from '../state/projectStore'
import { useSimStore } from '../state/simStore'
import type { SimResult } from '../sim/simulate'

const ROOM_LINE_COLORS = ['#1565c0', '#2e7d32', '#ef6c00', '#6a1b9a', '#00838f', '#c62828']
const OUTSIDE_LINE_COLORS = ['#78909c', '#a1887f', '#7e57c2', '#26a69a']

function downsample(result: SimResult, maxPoints = 240): Record<string, number>[] {
  const step = Math.max(1, Math.floor(result.hours.length / maxPoints))
  const rows: Record<string, number>[] = []
  for (let f = 0; f < result.hours.length; f += step) {
    const row: Record<string, number> = { hour: +result.hours[f].toFixed(2) }
    result.roomNames.forEach((name, i) => {
      row[name] = +result.roomTemps[f][i].toFixed(2)
    })
    // Outside zone temperatures
    for (const [zoneId, temps] of Object.entries(result.zoneTemps)) {
      const label = `outside:${zoneId}`
      row[label] = +temps[f].toFixed(2)
    }
    rows.push(row)
  }
  return rows
}

/** Merge primary and comparison data into a single array keyed by hour. */
function mergeData(
  primary: SimResult,
  comp: SimResult | null,
): Record<string, number>[] {
  const primaryRows = downsample(primary)

  if (!comp) return primaryRows

  // Build a map of comp data by hour (rounded to 2 dp) for fast lookup.
  const compStep = Math.max(1, Math.floor(comp.hours.length / 240))
  const compByHour = new Map<number, number[]>()
  for (let f = 0; f < comp.hours.length; f += compStep) {
    const h = +comp.hours[f].toFixed(2)
    compByHour.set(h, comp.roomTemps[f])
  }

  return primaryRows.map((row) => {
    const compTemps = compByHour.get(row.hour)
    if (compTemps) {
      comp.roomNames.forEach((name, i) => {
        row[`${name} (B)`] = +compTemps[i].toFixed(2)
      })
    }
    return row
  })
}

export function TempChart() {
  const result = useSimStore((s) => s.result)
  const compResult = useSimStore((s) => s.compResult)
  const compLabel = useSimStore((s) => s.compLabel)
  const frame = useSimStore((s) => s.frame)
  const comfort = useProjectStore((s) => s.project.comfortTempC)
  const outsideZones = useProjectStore((s) => s.project.outsideZones)

  const data = useMemo(() => {
    if (!result) return []
    return mergeData(result, compResult)
  }, [result, compResult])

  if (!result) return null
  const currentHour = +result.hours[frame].toFixed(2)

  // Build a name map for zone labels
  const zoneNameById = new Map(outsideZones.map((z) => [z.id, z.name]))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
        <XAxis
          dataKey="hour"
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={(h) => `${Math.round(h)}h`}
          fontSize={11}
        />
        <YAxis fontSize={11} width={36} unit="°" />
        <Tooltip
          formatter={(v) => `${v}°C`}
          labelFormatter={(h) => `Hour ${h}`}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <ReferenceLine
          y={comfort}
          stroke="#9e9e9e"
          strokeDasharray="4 4"
          label={{ value: 'comfort', fontSize: 10, position: 'insideTopRight' }}
        />
        <ReferenceLine x={currentHour} stroke="#d32f2f" strokeWidth={1.5} />

        {/* Outside zone temperatures — muted dashed lines */}
        {Object.keys(result.zoneTemps).map((zoneId, i) => (
          <Line
            key={`outside:${zoneId}`}
            type="monotone"
            dataKey={`outside:${zoneId}`}
            name={zoneNameById.get(zoneId) ?? 'Outside'}
            stroke={OUTSIDE_LINE_COLORS[i % OUTSIDE_LINE_COLORS.length]}
            strokeDasharray="3 3"
            dot={false}
            strokeWidth={1.5}
            opacity={0.7}
            isAnimationActive={false}
          />
        ))}

        {/* Primary result — solid lines */}
        {result.roomNames.map((name, i) => (
          <Line
            key={name}
            type="monotone"
            dataKey={name}
            stroke={ROOM_LINE_COLORS[i % ROOM_LINE_COLORS.length]}
            dot={false}
            strokeWidth={2}
            isAnimationActive={false}
          />
        ))}

        {/* Comparison result — dashed lines, same colours */}
        {compResult &&
          compResult.roomNames.map((name, i) => (
            <Line
              key={`${name}-comp`}
              type="monotone"
              dataKey={`${name} (B)`}
              name={`${name} — ${compLabel ?? 'B'}`}
              stroke={ROOM_LINE_COLORS[i % ROOM_LINE_COLORS.length]}
              strokeDasharray="5 3"
              dot={false}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
