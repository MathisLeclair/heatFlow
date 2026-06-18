import {
  ToggleButton,
  ToggleButtonGroup,
  Stack,
  TextField,
  MenuItem,
  Typography,
  Box,
} from '@mui/material'
import NearMeIcon from '@mui/icons-material/NearMe'
import PentagonIcon from '@mui/icons-material/Pentagon'
import WindowIcon from '@mui/icons-material/Window'
import DoorFrontIcon from '@mui/icons-material/DoorFront'
import { useTranslation } from 'react-i18next'
import { useUiStore, type Tool } from '../state/uiStore'
import { WINDOW_PRESETS, DOOR_PRESETS } from '../presets'

export function EditToolbar() {
  const { t } = useTranslation()
  const tool = useUiStore((s) => s.tool)
  const setTool = useUiStore((s) => s.setTool)
  const pendingWindowPreset = useUiStore((s) => s.pendingWindowPreset)
  const setPendingWindowPreset = useUiStore((s) => s.setPendingWindowPreset)
  const pendingDoorPreset = useUiStore((s) => s.pendingDoorPreset)
  const setPendingDoorPreset = useUiStore((s) => s.setPendingDoorPreset)

  return (
    <Stack spacing={1.5}>
      <ToggleButtonGroup
        exclusive
        value={tool}
        onChange={(_, v: Tool | null) => v && setTool(v)}
        size="small"
        fullWidth
      >
        <ToggleButton value="select" aria-label={t('tool.select')}>
          <NearMeIcon fontSize="small" sx={{ mr: 0.5 }} /> {t('tool.select')}
        </ToggleButton>
        <ToggleButton value="draw-room" aria-label={t('tool.drawRoom')}>
          <PentagonIcon fontSize="small" sx={{ mr: 0.5 }} /> {t('tool.drawRoom')}
        </ToggleButton>
      </ToggleButtonGroup>

      <ToggleButtonGroup
        exclusive
        value={tool}
        onChange={(_, v: Tool | null) => v && setTool(v)}
        size="small"
        fullWidth
      >
        <ToggleButton value="add-window" aria-label={t('tool.addWindow')}>
          <WindowIcon fontSize="small" sx={{ mr: 0.5 }} /> {t('tool.addWindow')}
        </ToggleButton>
        <ToggleButton value="add-door" aria-label={t('tool.addDoor')}>
          <DoorFrontIcon fontSize="small" sx={{ mr: 0.5 }} /> {t('tool.addDoor')}
        </ToggleButton>
      </ToggleButtonGroup>

      {tool === 'add-window' && (
        <TextField
          select
          size="small"
          label={t('tool.windowType')}
          value={pendingWindowPreset}
          onChange={(e) => setPendingWindowPreset(e.target.value)}
        >
          {WINDOW_PRESETS.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </TextField>
      )}
      {tool === 'add-door' && (
        <TextField
          select
          size="small"
          label={t('tool.doorType')}
          value={pendingDoorPreset}
          onChange={(e) => setPendingDoorPreset(e.target.value)}
        >
          {DOOR_PRESETS.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </TextField>
      )}

      <Box>
        <Typography variant="caption" color="text.secondary">
          {hintForTool(tool, t)}
        </Typography>
      </Box>
    </Stack>
  )
}

function hintForTool(tool: Tool, t: (key: string) => string): string {
  switch (tool) {
    case 'draw-room': return t('tool.hintDrawRoom')
    case 'add-window': return t('tool.hintAddWindow')
    case 'add-door': return t('tool.hintAddDoor')
    default: return t('tool.hintSelect')
  }
}
