import { useMemo, useState } from 'react'
import {
  Stack,
  Button,
  Typography,
  Box,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Divider,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import CloseIcon from '@mui/icons-material/Close'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../state/projectStore'
import { useSimStore } from '../state/simStore'
import { coolingHints } from '../sim/hints'

function scoreColor(score: number): string {
  return score < 5
    ? 'linear-gradient(120deg, #059669, #34d399)'
    : score < 30
      ? 'linear-gradient(120deg, #d97706, #fbbf24)'
      : 'linear-gradient(120deg, #dc2626, #f87171)'
}

function ScoreCard({
  score,
  label,
  comfortTemp,
  dimmed = false,
}: {
  score: number
  label: string
  comfortTemp: number
  dimmed?: boolean
}) {
  const { t } = useTranslation()
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        color: '#fff',
        background: scoreColor(score),
        opacity: dimmed ? 0.65 : 1,
        position: 'relative',
        overflow: 'hidden',
        flex: 1,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          bgcolor: 'rgba(255,255,255,0.35)',
        }}
      />
      <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 700, letterSpacing: '0.08em', display: 'block' }}>
        {label}
      </Typography>
      <Stack direction="row" alignItems="baseline" spacing={0.5}>
        <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
          {score.toFixed(0)}
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.85 }}>
          {t('simulate.degreeHours')}
        </Typography>
      </Stack>
      <Typography variant="caption" sx={{ opacity: 0.75 }}>
        {t('simulate.coolingScoreHelper', { temp: comfortTemp })}
      </Typography>
    </Box>
  )
}

export function SimulatePanel() {
  const { t } = useTranslation()
  const project = useProjectStore((s) => s.project)

  const { result, running, error } = useSimStore()
  const compResult = useSimStore((s) => s.compResult)
  const compLabel = useSimStore((s) => s.compLabel)
  const compRunning = useSimStore((s) => s.compRunning)
  const compError = useSimStore((s) => s.compError)
  const run = useSimStore((s) => s.run)
  const runComparison = useSimStore((s) => s.runComparison)
  const clearComparison = useSimStore((s) => s.clearComparison)

  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('')

  const hints = useMemo(
    () => (result ? coolingHints(project, result) : []),
    [project, result],
  )

  const mainScore = result?.degreeHoursAboveComfort ?? 0
  const compScore = compResult?.degreeHoursAboveComfort ?? 0

  const scenarios = project.scenarios ?? []

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <Button
        variant="contained"
        onClick={() => run(project)}
        disabled={running}
        startIcon={
          running ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />
        }
      >
        {running ? t('simulate.running') : result ? t('simulate.rerun') : t('simulate.run')}
      </Button>

      {error && <Alert severity="error">{error}</Alert>}

      {result && (
        <>
          {/* Score(s) */}
          <Stack direction="row" spacing={1}>
            <ScoreCard
              score={mainScore}
              label={t('simulate.coolingScore')}
              comfortTemp={project.comfortTempC}
            />
            {compResult && (
              <ScoreCard
                score={compScore}
                label={compLabel ?? 'B'}
                comfortTemp={project.comfortTempC}
                dimmed={compScore > mainScore}
              />
            )}
          </Stack>

          {/* Compare section */}
          <Divider />
          <Typography variant="subtitle2">{t('simulate.compareTitle')}</Typography>

          {scenarios.length === 0 ? (
            <Typography variant="caption" color="text.secondary">
              {t('simulate.compareNoScenarios')}
            </Typography>
          ) : (
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                select
                size="small"
                value={selectedScenarioId}
                onChange={(e) => setSelectedScenarioId(e.target.value)}
                sx={{ flex: 1 }}
                label={t('simulate.compareScenario')}
              >
                {scenarios.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </TextField>
              <Button
                size="small"
                variant="outlined"
                startIcon={
                  compRunning
                    ? <CircularProgress size={14} color="inherit" />
                    : <CompareArrowsIcon fontSize="small" />
                }
                disabled={!selectedScenarioId || compRunning}
                onClick={() => {
                  const scenario = scenarios.find((s) => s.id === selectedScenarioId)
                  if (scenario) runComparison(project, scenario)
                }}
              >
                {compRunning ? t('simulate.running') : t('simulate.compareRun')}
              </Button>
              {compResult && (
                <Tooltip title={t('simulate.compareClear')}>
                  <IconButton size="small" onClick={clearComparison}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          )}

          {compError && <Alert severity="error">{compError}</Alert>}

          {/* Suggestions */}
          {hints.length > 0 && (
            <>
              <Divider />
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  {t('simulate.suggestions')}
                </Typography>
                <List dense disablePadding>
                  {hints.map((h, i) => (
                    <ListItem key={i} disableGutters alignItems="flex-start">
                      <ListItemIcon sx={{ minWidth: 28, mt: 0.5 }}>
                        <LightbulbIcon fontSize="small" color="warning" />
                      </ListItemIcon>
                      <ListItemText
                        primary={h}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </>
          )}
        </>
      )}
    </Stack>
  )
}
