import { useMemo } from 'react'
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
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import { useProjectStore } from '../state/projectStore'
import { useSimStore } from '../state/simStore'
import { coolingHints } from '../sim/hints'

export function SimulatePanel() {
  const project = useProjectStore((s) => s.project)

  const { result, running, error } = useSimStore()
  const run = useSimStore((s) => s.run)

  const hints = useMemo(
    () => (result ? coolingHints(project, result) : []),
    [project, result],
  )

  const score = result?.degreeHoursAboveComfort ?? 0
  const scoreColor =
    score < 5
      ? 'linear-gradient(120deg, #059669, #34d399)'
      : score < 30
        ? 'linear-gradient(120deg, #d97706, #fbbf24)'
        : 'linear-gradient(120deg, #dc2626, #f87171)'

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
        {running ? 'Simulating…' : result ? 'Re-run simulation' : 'Run simulation'}
      </Button>

      {error && <Alert severity="error">{error}</Alert>}

      {result && (
        <>
          {/* Score card */}
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              color: '#fff',
              background: scoreColor,
              position: 'relative',
              overflow: 'hidden',
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
            <Typography
              variant="caption"
              sx={{ opacity: 0.9, fontWeight: 700, letterSpacing: '0.1em' }}
            >
              COOLING SCORE
            </Typography>
            <Stack direction="row" alignItems="baseline" spacing={0.5}>
              <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
                {score.toFixed(0)}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                °C·h over comfort
              </Typography>
            </Stack>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              Lower is better — avg. degree-hours above {project.comfortTempC}°C.
            </Typography>
          </Box>

          {/* Suggestions */}
          {hints.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Suggestions
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
          )}
        </>
      )}
    </Stack>
  )
}
