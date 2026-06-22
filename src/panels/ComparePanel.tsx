import { useMemo } from 'react'
import {
  Stack,
  Button,
  Typography,
  Box,
  CircularProgress,
  Chip,
  Divider,
  Grid,
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
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
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../state/projectStore'
import { useSimStore } from '../state/simStore'
import type { SimResult } from '../sim/simulate'
import type { Scenario } from '../model/types'

const SCENARIO_COLORS = [
  '#1565c0', '#2e7d32', '#ef6c00', '#6a1b9a',
  '#00838f', '#c62828', '#558b2f', '#4527a0',
]

function scoreGradient(score: number) {
  return score < 5
    ? 'linear-gradient(120deg,#059669,#34d399)'
    : score < 30
      ? 'linear-gradient(120deg,#d97706,#fbbf24)'
      : 'linear-gradient(120deg,#dc2626,#f87171)'
}

interface ScenarioResult { scenario: Scenario; result: SimResult; color: string }

/** Shared downsampler: picks ~200 evenly spaced frames from a result. */
function downsampleHours(result: SimResult): number[] {
  const step = Math.max(1, Math.floor(result.hours.length / 200))
  const hours: number[] = []
  for (let f = 0; f < result.hours.length; f += step) {
    hours.push(+result.hours[f].toFixed(2))
  }
  return hours
}

/** Build lookup map: hour → room temperatures for one run. */
function buildLookup(r: ScenarioResult): Map<number, number[]> {
  const step = Math.max(1, Math.floor(r.result.hours.length / 200))
  const m = new Map<number, number[]>()
  for (let f = 0; f < r.result.hours.length; f += step) {
    const h = +r.result.hours[f].toFixed(2)
    m.set(h, r.result.roomTemps[f].map((t) => +t.toFixed(2)))
  }
  return m
}

/** Combined chart: one line per scenario (average room temp). */
function buildAvgChartData(runs: ScenarioResult[]) {
  if (runs.length === 0) return []
  const hours = downsampleHours(runs[0].result)
  const lookups = runs.map(buildLookup)
  return hours.map((h) => {
    const row: Record<string, number> = { hour: h }
    runs.forEach((r, ri) => {
      const temps = lookups[ri].get(h)
      if (temps && temps.length > 0) {
        row[r.scenario.name] = +(temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(2)
      }
    })
    return row
  })
}

/** Per-room charts: one chart per room, one line per scenario. */
function buildRoomChartData(runs: ScenarioResult[], roomNames: string[]) {
  if (runs.length === 0) return []
  const hours = downsampleHours(runs[0].result)
  const lookups = runs.map(buildLookup)
  return roomNames.map((roomName, ri) => {
    const data = hours.map((h) => {
      const row: Record<string, number> = { hour: h }
      runs.forEach((run, si) => {
        const temps = lookups[si].get(h)
        if (temps) row[run.scenario.name] = temps[ri] ?? 0
      })
      return row
    })
    return { roomName, data }
  })
}

function ScenarioChart({
  title,
  data,
  runs,
  comfort,
  height = 220,
}: {
  title: string
  data: Record<string, number>[]
  runs: ScenarioResult[]
  comfort: number
  height?: number
}) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.08em' }}>
        {title}
      </Typography>
      <Box sx={{ height, mt: 0.5 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 24, bottom: 4, left: -8 }}>
            <XAxis
              dataKey="hour"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(h) => `${Math.round(h)}h`}
              fontSize={11}
            />
            <YAxis fontSize={11} width={38} unit="°" />
            <Tooltip formatter={(v) => `${v}°C`} labelFormatter={(h) => `Hour ${h}`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine
              y={comfort}
              stroke="#9e9e9e"
              strokeDasharray="4 4"
              label={{ value: 'comfort', fontSize: 10, position: 'insideTopRight' }}
            />
            {runs.map((r) => (
              <Line
                key={r.scenario.id}
                type="monotone"
                dataKey={r.scenario.name}
                stroke={r.color}
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  )
}

export function ComparePanel() {
  const { t } = useTranslation()
  const project = useProjectStore((s) => s.project)
  const scenarioResults = useSimStore((s) => s.scenarioResults)
  const scenarioRunning = useSimStore((s) => s.scenarioRunning)
  const runScenario = useSimStore((s) => s.runScenario)
  const runAllScenarios = useSimStore((s) => s.runAllScenarios)
  const clearScenarioResults = useSimStore((s) => s.clearScenarioResults)

  const scenarios = project.scenarios ?? []
  const comfort = project.comfortTempC

  const anyRunning = Object.values(scenarioRunning).some(Boolean)

  const runs: ScenarioResult[] = useMemo(
    () =>
      scenarios
        .filter((sc) => scenarioResults[sc.id])
        .map((sc, i) => ({
          scenario: sc,
          result: scenarioResults[sc.id].result,
          color: SCENARIO_COLORS[i % SCENARIO_COLORS.length],
        })),
    [scenarios, scenarioResults],
  )

  const avgChartData = useMemo(() => buildAvgChartData(runs), [runs])
  const roomNames = runs.length > 0 ? runs[0].result.roomNames : []
  const roomCharts = useMemo(() => buildRoomChartData(runs, roomNames), [runs, roomNames])

  if (scenarios.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {t('compare.noScenarios')}
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header controls */}
      <Stack direction="row" spacing={1} alignItems="center" mb={3}>
        <Button
          variant="contained"
          startIcon={anyRunning ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />}
          disabled={anyRunning}
          onClick={() => runAllScenarios(project)}
        >
          {anyRunning ? t('compare.running') : t('compare.runAll')}
        </Button>
        {runs.length > 0 && (
          <Button variant="text" onClick={clearScenarioResults}>
            {t('compare.clear')}
          </Button>
        )}
      </Stack>

      {/* Score cards grid */}
      <Grid container spacing={2} mb={3}>
        {scenarios.map((sc, i) => {
          const run = scenarioResults[sc.id]
          const isRunning = !!scenarioRunning[sc.id]
          const color = SCENARIO_COLORS[i % SCENARIO_COLORS.length]
          const openCount = Object.values(sc.openStates).filter(Boolean).length

          return (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={sc.id}>
              {run ? (
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background: scoreGradient(run.result.degreeHoursAboveComfort),
                    color: '#fff',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, bgcolor: 'rgba(255,255,255,0.35)' }} />
                  <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, border: '2px solid rgba(255,255,255,0.6)' }} />
                    <Typography variant="body2" sx={{ fontWeight: 700, opacity: 0.95 }}>
                      {sc.name}
                    </Typography>
                  </Stack>
                  <Stack direction="row" alignItems="baseline" spacing={0.5}>
                    <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>
                      {run.result.degreeHoursAboveComfort.toFixed(0)}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.85 }}>°C·h</Typography>
                  </Stack>
                  <Typography variant="caption" sx={{ opacity: 0.75 }}>
                    {openCount}/{project.openings.length} openings open
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '1px dashed',
                    borderColor: 'divider',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500, flex: 1 }}>
                      {sc.name}
                    </Typography>
                  </Stack>
                  <Chip label={`${openCount}/${project.openings.length} open`} size="small" sx={{ alignSelf: 'flex-start', fontSize: 10 }} />
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={isRunning}
                    startIcon={isRunning ? <CircularProgress size={12} color="inherit" /> : undefined}
                    onClick={() => runScenario(project, sc)}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    {isRunning ? t('compare.running') : t('compare.run')}
                  </Button>
                </Box>
              )}
            </Grid>
          )
        })}
      </Grid>

      {/* Charts — only when at least 2 scenarios have results */}
      {runs.length >= 2 && (
        <Stack spacing={3}>
          {/* Combined average */}
          <ScenarioChart
            title={t('compare.avgTemp')}
            data={avgChartData}
            runs={runs}
            comfort={comfort}
            height={260}
          />

          {/* Per-room individual charts */}
          {roomCharts.length > 0 && (
            <>
              <Divider />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.08em' }}>
                {t('compare.perRoom')}
              </Typography>
              <Stack spacing={2}>
                {roomCharts.map(({ roomName, data }) => (
                  <ScenarioChart
                    key={roomName}
                    title={roomName}
                    data={data}
                    runs={runs}
                    comfort={comfort}
                    height={200}
                  />
                ))}
              </Stack>
            </>
          )}
        </Stack>
      )}
    </Box>
  )
}
