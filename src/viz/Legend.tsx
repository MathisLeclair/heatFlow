import { Box, Paper, Typography } from '@mui/material'
import { useSimStore } from '../state/simStore'
import { rampCSS } from './colorScale'

export function Legend() {
  const result = useSimStore((s) => s.result)
  if (!result) return null

  let min = Infinity
  let max = -Infinity
  for (const row of result.roomTemps)
    for (const t of row) {
      min = Math.min(min, t)
      max = Math.max(max, t)
    }
  if (!isFinite(min)) return null

  return (
    <Paper
      elevation={4}
      sx={{
        position: 'absolute',
        left: 12,
        bottom: 12,
        px: 1.25,
        py: 1,
        width: 140,
        backdropFilter: 'blur(8px)',
        bgcolor: (theme) =>
          theme.palette.mode === 'dark'
            ? 'rgba(18,24,38,0.82)'
            : 'rgba(255,255,255,0.88)',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mb: 0.5, fontWeight: 600, fontSize: 10, letterSpacing: '0.08em' }}
      >
        TEMPERATURE
      </Typography>
      <Box
        sx={{
          height: 8,
          borderRadius: 1,
          background: `linear-gradient(to right, ${rampCSS()})`,
          mb: 0.25,
        }}
      />
      <Box display="flex" justifyContent="space-between">
        <Typography variant="caption" sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>
          {min.toFixed(0)}°C
        </Typography>
        <Typography variant="caption" sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>
          {max.toFixed(0)}°C
        </Typography>
      </Box>
    </Paper>
  )
}
