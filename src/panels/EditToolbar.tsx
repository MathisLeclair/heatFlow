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
import { useUiStore, type Tool } from '../state/uiStore'
import { WINDOW_PRESETS, DOOR_PRESETS } from '../presets'

export function EditToolbar() {
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
        <ToggleButton value="select" aria-label="Select">
          <NearMeIcon fontSize="small" sx={{ mr: 0.5 }} /> Select
        </ToggleButton>
        <ToggleButton value="draw-room" aria-label="Draw room">
          <PentagonIcon fontSize="small" sx={{ mr: 0.5 }} /> Room
        </ToggleButton>
      </ToggleButtonGroup>

      <ToggleButtonGroup
        exclusive
        value={tool}
        onChange={(_, v: Tool | null) => v && setTool(v)}
        size="small"
        fullWidth
      >
        <ToggleButton value="add-window" aria-label="Add window">
          <WindowIcon fontSize="small" sx={{ mr: 0.5 }} /> Window
        </ToggleButton>
        <ToggleButton value="add-door" aria-label="Add door">
          <DoorFrontIcon fontSize="small" sx={{ mr: 0.5 }} /> Door
        </ToggleButton>
      </ToggleButtonGroup>

      {tool === 'add-window' && (
        <TextField
          select
          size="small"
          label="Window type"
          value={pendingWindowPreset}
          onChange={(e) => setPendingWindowPreset(e.target.value)}
        >
          {WINDOW_PRESETS.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name} · {p.widthM}×{p.heightM} m
            </MenuItem>
          ))}
        </TextField>
      )}
      {tool === 'add-door' && (
        <TextField
          select
          size="small"
          label="Door type"
          value={pendingDoorPreset}
          onChange={(e) => setPendingDoorPreset(e.target.value)}
        >
          {DOOR_PRESETS.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name} · {p.widthM}×{p.heightM} m
            </MenuItem>
          ))}
        </TextField>
      )}

      <Box>
        <Typography variant="caption" color="text.secondary">
          {hintFor(tool)}
        </Typography>
      </Box>
    </Stack>
  )
}

function hintFor(tool: Tool): string {
  switch (tool) {
    case 'draw-room':
      return 'Click to add corners; click the first point to close the room. Points snap to a 0.25 m grid and to existing corners.'
    case 'add-window':
      return 'Click on a wall to place a window.'
    case 'add-door':
      return 'Click on a wall (interior walls connect rooms) to place a door.'
    default:
      return 'Click a room, wall, or opening to edit it. Drag a selected room’s corner handles to reshape it.'
  }
}
