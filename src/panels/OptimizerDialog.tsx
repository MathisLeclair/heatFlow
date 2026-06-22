import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Stack,
  Typography,
  Box,
  Button,
  IconButton,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Chip,
  Divider,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import SyncIcon from '@mui/icons-material/Sync'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import BlockIcon from '@mui/icons-material/Block'
import AcUnitIcon from '@mui/icons-material/AcUnit'
import AirIcon from '@mui/icons-material/Air'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../state/projectStore'
import { useSimStore } from '../state/simStore'
import type { OptimizerInventory, OptimizerResult } from '../optimizer/optimizer'
import type { Opening, Project } from '../model/types'

const AC_OPTIONS = [
  { value: 1000, labelKey: 'optimizer.acSmall' },
  { value: 2000, labelKey: 'optimizer.acMedium' },
  { value: 3500, labelKey: 'optimizer.acLarge' },
]

function scoreGradient(score: number) {
  return score < 5
    ? 'linear-gradient(120deg,#059669,#34d399)'
    : score < 30
      ? 'linear-gradient(120deg,#d97706,#fbbf24)'
      : 'linear-gradient(120deg,#dc2626,#f87171)'
}

/** Human-readable label for a single opening: "Bedroom window" or "Kitchen ↔ Living door" */
function openingLabel(o: Opening, project: Project): string {
  const wall = project.walls.find((w) => w.id === o.wallId)
  if (!wall) return o.kind
  const roomName = (id: string) => project.rooms.find((r) => r.id === id)?.name ?? '?'
  if (wall.exterior) {
    const roomSide = wall.sideA.type === 'room' ? wall.sideA : wall.sideB
    const name = roomSide.type === 'room' ? roomName(roomSide.id) : '?'
    return `${name} ${o.kind}`
  }
  const a = wall.sideA.type === 'room' ? roomName(wall.sideA.id) : '?'
  const b = wall.sideB.type === 'room' ? roomName(wall.sideB.id) : '?'
  return `${a} ↔ ${b} ${o.kind}`
}

function OpeningStateChip({ opening }: { opening: Opening }) {
  if (opening.autoOpen) {
    return (
      <Chip
        icon={<SyncIcon sx={{ fontSize: '13px !important' }} />}
        label="auto"
        size="small"
        sx={{ bgcolor: '#e8f4fd', color: '#1565c0', fontSize: 10, height: 20 }}
      />
    )
  }
  if (opening.isOpen) {
    return (
      <Chip
        icon={<OpenInNewIcon sx={{ fontSize: '13px !important' }} />}
        label="open"
        size="small"
        sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontSize: 10, height: 20 }}
      />
    )
  }
  return (
    <Chip
      icon={<BlockIcon sx={{ fontSize: '13px !important' }} />}
      label="closed"
      size="small"
      sx={{ bgcolor: '#fafafa', color: '#757575', fontSize: 10, height: 20 }}
    />
  )
}

function ResultCard({
  result,
  rank,
  applied,
  onApply,
  project,
}: {
  result: OptimizerResult
  rank: number
  applied: boolean
  onApply: () => void
  project: Project
}) {
  const { t } = useTranslation()
  const fans = result.project.fans ?? []
  const acs = result.project.portableACs ?? []
  const hasEquipment = fans.length > 0 || acs.length > 0
  const roomName = (id: string) => project.rooms.find((r) => r.id === id)?.name ?? '?'

  return (
    <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
      {/* Score header */}
      <Box sx={{ p: 1.5, background: scoreGradient(result.score), color: '#fff', position: 'relative' }}>
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, bgcolor: 'rgba(255,255,255,0.35)' }} />
        <Stack direction="row" alignItems="center" spacing={1}>
          <Stack direction="row" alignItems="baseline" spacing={0.5} sx={{ flex: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1 }}>
              {result.score.toFixed(0)}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>°C·h</Typography>
          </Stack>
          <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 600 }}>
            {rank === 0 ? '🏆 ' : `#${rank + 1} `}{result.label}
          </Typography>
        </Stack>
      </Box>

      {/* Openings breakdown */}
      <Box sx={{ px: 1.5, pt: 1.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.06em', display: 'block', mb: 0.75 }}>
          OPENINGS
        </Typography>
        <Stack spacing={0.5}>
          {result.project.openings.map((o) => (
            <Stack key={o.id} direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
              <Typography variant="caption" color="text.primary" sx={{ flex: 1, minWidth: 0 }} noWrap>
                {openingLabel(o, project)}
              </Typography>
              <OpeningStateChip opening={o} />
            </Stack>
          ))}
        </Stack>
      </Box>

      {/* Equipment breakdown */}
      {hasEquipment && (
        <Box sx={{ px: 1.5, pt: 1.25 }}>
          <Divider sx={{ mb: 1 }} />
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.06em', display: 'block', mb: 0.75 }}>
            EQUIPMENT
          </Typography>
          <Stack spacing={0.5}>
            {acs.map((ac) => (
              <Stack key={ac.id} direction="row" alignItems="center" spacing={0.75}>
                <AcUnitIcon sx={{ fontSize: 14, color: 'info.main' }} />
                <Typography variant="caption">
                  AC {(ac.coolingPowerW / 1000).toFixed(0)} kW → {roomName(ac.roomId)}
                </Typography>
              </Stack>
            ))}
            {fans.map((fan) => (
              <Stack key={fan.id} direction="row" alignItems="center" spacing={0.75}>
                <AirIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                <Typography variant="caption">
                  {fan.kind === 'box' ? 'Box fan' : fan.kind === 'standing' ? 'Standing fan' : 'Ceiling fan'}
                  {fan.kind === 'box' && fan.openingId
                    ? ` @ ${openingLabel(result.project.openings.find((o) => o.id === fan.openingId)!, project)}`
                    : ` → ${roomName(fan.roomId)}`}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      )}

      {/* Apply button */}
      <Box sx={{ p: 1.5 }}>
        {applied ? (
          <Chip
            icon={<CheckCircleIcon fontSize="small" />}
            label="Applied"
            color="success"
            size="small"
            sx={{ width: '100%' }}
          />
        ) : (
          <Button
            size="small"
            variant="outlined"
            fullWidth
            onClick={onApply}
          >
            {t('optimizer.apply')}
          </Button>
        )}
      </Box>
    </Box>
  )
}

function CountStepper({
  label,
  value,
  onChange,
  min = 0,
  max = 3,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
}) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between">
      <Typography variant="body2">{label}</Typography>
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <IconButton size="small" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>
          <RemoveIcon fontSize="small" />
        </IconButton>
        <Typography variant="body2" sx={{ minWidth: 20, textAlign: 'center', fontWeight: 600 }}>
          {value}
        </Typography>
        <IconButton size="small" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>
          <AddIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Stack>
  )
}

export function OptimizerDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const project = useProjectStore((s) => s.project)
  const setProject = useProjectStore((s) => s.setProject)
  const saveScenario = useProjectStore((s) => s.saveScenario)

  const optimizerRunning = useSimStore((s) => s.optimizerRunning)
  const optimizerProgress = useSimStore((s) => s.optimizerProgress)
  const optimizerResults = useSimStore((s) => s.optimizerResults)
  const optimizerError = useSimStore((s) => s.optimizerError)
  const runOptimizer = useSimStore((s) => s.runOptimizer)
  const clearOptimizer = useSimStore((s) => s.clearOptimizer)

  const [inventory, setInventory] = useState<OptimizerInventory>({
    standingFans: 0,
    boxFans: 0,
    portableACs: 0,
    acPowerW: 2000,
  })
  const [appliedIdx, setAppliedIdx] = useState<number | null>(null)

  function patch(k: keyof OptimizerInventory, v: number) {
    setInventory((prev) => ({ ...prev, [k]: v }))
  }

  function handleRun() {
    setAppliedIdx(null)
    clearOptimizer()
    runOptimizer(project, inventory)
  }

  function handleApply(result: OptimizerResult, idx: number) {
    setProject({ ...result.project, scenarios: project.scenarios })
    saveScenario(result.label)
    setAppliedIdx(idx)
  }

  const candidateCount = 28

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AutoFixHighIcon color="primary" />
        {t('optimizer.title')}
        <IconButton size="small" onClick={onClose} sx={{ ml: 'auto' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          {/* Inventory form */}
          <Stack spacing={1.5}>
            <CountStepper
              label={t('optimizer.standingFans')}
              value={inventory.standingFans}
              onChange={(v) => patch('standingFans', v)}
            />
            <CountStepper
              label={t('optimizer.boxFans')}
              value={inventory.boxFans}
              onChange={(v) => patch('boxFans', v)}
            />
            <CountStepper
              label={t('optimizer.portableACs')}
              value={inventory.portableACs}
              max={2}
              onChange={(v) => patch('portableACs', v)}
            />
            {inventory.portableACs > 0 && (
              <FormControl size="small" fullWidth>
                <InputLabel>{t('optimizer.acSize')}</InputLabel>
                <Select
                  value={inventory.acPowerW}
                  label={t('optimizer.acSize')}
                  onChange={(e) => patch('acPowerW', Number(e.target.value))}
                >
                  {AC_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {t(o.labelKey)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Stack>

          <Button
            variant="contained"
            startIcon={<AutoFixHighIcon />}
            onClick={handleRun}
            disabled={optimizerRunning}
            fullWidth
          >
            {optimizerRunning
              ? t('optimizer.running', { count: candidateCount })
              : t('optimizer.run')}
          </Button>

          {/* Progress */}
          {optimizerRunning && (
            <Box>
              <LinearProgress variant="determinate" value={optimizerProgress * 100} sx={{ borderRadius: 1 }} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {Math.round(optimizerProgress * 100)}%
              </Typography>
            </Box>
          )}

          {optimizerError && <Alert severity="error">{optimizerError}</Alert>}

          {/* Results */}
          {!optimizerRunning && optimizerResults.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              {t('optimizer.noResults')}
            </Typography>
          )}

          {optimizerResults.length > 0 && (
            <Stack spacing={2}>
              {optimizerResults.map((r, i) => (
                <ResultCard
                  key={i}
                  result={r}
                  rank={i}
                  applied={appliedIdx === i}
                  onApply={() => handleApply(r, i)}
                  project={project}
                />
              ))}
            </Stack>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  )
}
