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

const ROOM_LINE_COLORS = ['#1565c0', '#2e7d32', '#ef6c00', '#6a1b9a', '#00838f', '#c62828']

export function TempChart() {
  const result = useSimStore((s) => s.result)
  const frame = useSimStore((s) => s.frame)
  const comfort = useProjectStore((s) => s.project.comfortTempC)

  const data = useMemo(() => {
    if (!result) return []
    // Down-sample to keep the chart light.
    const step = Math.max(1, Math.floor(result.hours.length / 240))
    const rows: Record<string, number>[] = []
    for (let f = 0; f < result.hours.length; f += step) {
      const row: Record<string, number> = { hour: +result.hours[f].toFixed(2) }
      result.roomNames.forEach((name, i) => {
        row[name] = +result.roomTemps[f][i].toFixed(2)
      })
      rows.push(row)
    }
    return rows
  }, [result])

  if (!result) return null
  const currentHour = +result.hours[frame].toFixed(2)

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
      </LineChart>
    </ResponsiveContainer>
  )
}
