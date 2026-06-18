import { useState } from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Paper,
  Stack,
  Divider,
  Tooltip,
  IconButton,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Slider,
  List,
  ListItem,
  ListItemText,
  Switch,
  TextField,
  MenuItem,
  FormControlLabel,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import ReplayIcon from '@mui/icons-material/Replay'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import NearMeIcon from '@mui/icons-material/NearMe'
import PentagonIcon from '@mui/icons-material/Pentagon'
import WindowIcon from '@mui/icons-material/Window'
import DoorFrontIcon from '@mui/icons-material/DoorFront'
import { useUiStore, type Tool } from '../state/uiStore'
import { useProjectStore } from '../state/projectStore'
import { useSimStore } from '../state/simStore'
import { usePlayback } from '../state/usePlayback'
import { FloorPlanCanvas } from '../editor/FloorPlanCanvas'
import { useElementSize } from '../editor/useElementSize'
import { PropertiesPanel } from '../panels/PropertiesPanel'
import { SimulatePanel } from '../panels/SimulatePanel'
import { ScenariosPanel } from '../panels/ScenariosPanel'
import { LayoutsPanel } from '../panels/LayoutsPanel'
import { TempChart } from '../viz/TempChart'
import { Legend } from '../viz/Legend'
import { DisclaimerDialog } from './DisclaimerDialog'
import { WINDOW_PRESETS, DOOR_PRESETS } from '../presets'
import { zoneTempAt } from '../sim/simulate'
import type { Project, Wall } from '../model/types'

export function AppLayout() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const mode = useUiStore((s) => s.mode)
  const setMode = useUiStore((s) => s.setMode)
  const themeMode = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const resetSample = useProjectStore((s) => s.resetSample)
  const resetBlank = useProjectStore((s) => s.resetBlank)
  const [infoOpen, setInfoOpen] = useState(false)

  const { ref: canvasRef, width: canvasW, height: canvasH } = useElementSize<HTMLDivElement>()
  const result = useSimStore((s) => s.result)

  usePlayback()

  const sidePanel = (
    <Paper
      square
      elevation={0}
      sx={{
        width: isMobile ? '100%' : 360,
        flexShrink: 0,
        borderLeft: isMobile ? 0 : `1px solid ${theme.palette.divider}`,
        borderTop: isMobile ? `1px solid ${theme.palette.divider}` : 0,
        overflowY: 'auto',
      }}
    >
      {mode === 'edit' ? (
        <Stack divider={<Divider />}>
          <PanelSection title="Properties">
            <PropertiesPanel />
          </PanelSection>
          <PanelSection title="Outside environment">
            <OutsideEnvSection />
          </PanelSection>
          <PanelSection title="Openings">
            <OpeningsListSection />
          </PanelSection>
          <PanelSection title="Layouts">
            <LayoutsPanel />
          </PanelSection>
        </Stack>
      ) : (
        <Stack divider={<Divider />}>
          <SimulatePanel />
          <PanelSection title="Scenarios">
            <ScenariosPanel />
          </PanelSection>
          <PanelSection title="Temperature over time">
            <Box sx={{ height: 200 }}>
              <TempChart />
            </Box>
          </PanelSection>
        </Stack>
      )}
    </Paper>
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <AppBar position="static" elevation={0}>
        <Toolbar variant="dense" sx={{ gap: 1 }}>
          {/* Diamond logo */}
          <Box
            sx={{
              width: 20,
              height: 20,
              transform: 'rotate(45deg)',
              background: 'linear-gradient(135deg, #ff9a67, #ff7a3d)',
              borderRadius: '4px',
              flexShrink: 0,
            }}
          />
          <Typography variant="h6" sx={{ fontWeight: 700, mr: 1 }}>
            HeatFlow
          </Typography>

          {/* Mode pill */}
          <ToggleButtonGroup
            exclusive
            value={mode}
            onChange={(_, v) => v && setMode(v)}
            size="small"
            sx={{
              bgcolor: alpha(theme.palette.text.primary, 0.06),
              borderRadius: '10px',
              p: '2px',
              '& .MuiToggleButtonGroup-grouped': {
                border: 'none',
                borderRadius: '8px !important',
                px: 1.5,
                py: 0.25,
                fontSize: 13,
                fontWeight: 600,
              },
            }}
          >
            <ToggleButton value="edit" disableRipple>
              Edit
            </ToggleButton>
            <ToggleButton value="simulate" disableRipple>
              Simulate
            </ToggleButton>
          </ToggleButtonGroup>

          <Box sx={{ flexGrow: 1 }} />

          <Button
            size="small"
            variant="outlined"
            sx={{ minWidth: 0, fontSize: 12, px: 1.25, py: 0.25, borderRadius: 2 }}
            onClick={() => {
              resetSample()
              setMode('edit')
            }}
          >
            Sample
          </Button>
          <Button
            size="small"
            variant="outlined"
            sx={{ minWidth: 0, fontSize: 12, px: 1.25, py: 0.25, borderRadius: 2 }}
            onClick={() => {
              resetBlank()
              setMode('edit')
            }}
          >
            Blank
          </Button>

          <Tooltip title={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            <IconButton size="small" onClick={toggleTheme} color="inherit">
              {themeMode === 'dark' ? (
                <LightModeIcon fontSize="small" />
              ) : (
                <DarkModeIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>

          <Tooltip title="About the model">
            <IconButton size="small" onClick={() => setInfoOpen(true)} color="inherit">
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Main body */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
        }}
      >
        {/* Canvas column */}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Box
            ref={canvasRef}
            sx={{
              position: 'relative',
              flex: 1,
              minHeight: isMobile ? '50vh' : 0,
              bgcolor: theme.palette.mode === 'dark' ? '#0d1420' : '#e2e8f0',
            }}
          >
            {canvasW > 0 && <FloorPlanCanvas width={canvasW} height={canvasH} />}
            {mode === 'edit' && <ToolPaletteOverlay />}
            {mode === 'simulate' && result && <SimHUD />}
            {mode === 'simulate' && <Legend />}
          </Box>
          {mode === 'simulate' && <TimelineBar />}
        </Box>

        {sidePanel}
      </Box>

      <DisclaimerDialog open={infoOpen} onClose={() => setInfoOpen(false)} />
    </Box>
  )
}

// ─── sub-components ──────────────────────────────────────────────────────────

function PanelSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        {title}
      </Typography>
      {children}
    </Box>
  )
}

function ToolPaletteOverlay() {
  const theme = useTheme()
  const tool = useUiStore((s) => s.tool)
  const setTool = useUiStore((s) => s.setTool)
  const pendingWindowPreset = useUiStore((s) => s.pendingWindowPreset)
  const setPendingWindowPreset = useUiStore((s) => s.setPendingWindowPreset)
  const pendingDoorPreset = useUiStore((s) => s.pendingDoorPreset)
  const setPendingDoorPreset = useUiStore((s) => s.setPendingDoorPreset)

  const tools: { value: Tool; icon: React.ReactNode; label: string }[] = [
    { value: 'select', icon: <NearMeIcon fontSize="small" />, label: 'Select' },
    { value: 'draw-room', icon: <PentagonIcon fontSize="small" />, label: 'Draw room' },
    { value: 'add-window', icon: <WindowIcon fontSize="small" />, label: 'Add window' },
    { value: 'add-door', icon: <DoorFrontIcon fontSize="small" />, label: 'Add door' },
  ]

  return (
    <Box
      sx={{
        position: 'absolute',
        left: 12,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        alignItems: 'flex-start',
      }}
    >
      <Paper
        elevation={4}
        sx={{
          p: 0.5,
          borderRadius: 3,
          backdropFilter: 'blur(8px)',
          bgcolor:
            theme.palette.mode === 'dark'
              ? 'rgba(18,24,38,0.88)'
              : 'rgba(255,255,255,0.92)',
        }}
      >
        <Stack spacing={0.25}>
          {tools.map(({ value, icon, label }) => (
            <Tooltip key={value} title={label} placement="right">
              <IconButton
                size="small"
                onClick={() => setTool(value)}
                sx={{
                  color: tool === value ? 'primary.main' : 'text.secondary',
                  bgcolor:
                    tool === value
                      ? alpha(theme.palette.primary.main, 0.12)
                      : 'transparent',
                  borderRadius: 2,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                  },
                }}
              >
                {icon}
              </IconButton>
            </Tooltip>
          ))}
        </Stack>
      </Paper>

      {(tool === 'add-window' || tool === 'add-door') && (
        <Paper
          elevation={4}
          sx={{
            p: 1.5,
            borderRadius: 2,
            minWidth: 160,
            backdropFilter: 'blur(8px)',
            bgcolor:
              theme.palette.mode === 'dark'
                ? 'rgba(18,24,38,0.88)'
                : 'rgba(255,255,255,0.92)',
          }}
        >
          <TextField
            select
            size="small"
            fullWidth
            label={tool === 'add-window' ? 'Window type' : 'Door type'}
            value={tool === 'add-window' ? pendingWindowPreset : pendingDoorPreset}
            onChange={(e) =>
              tool === 'add-window'
                ? setPendingWindowPreset(e.target.value)
                : setPendingDoorPreset(e.target.value)
            }
          >
            {(tool === 'add-window' ? WINDOW_PRESETS : DOOR_PRESETS).map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </TextField>
        </Paper>
      )}
    </Box>
  )
}

function SimHUD() {
  const frame = useSimStore((s) => s.frame)
  const result = useSimStore((s) => s.result)
  const globalZone = useProjectStore((s) =>
    s.project.outsideZones.find((z) => z.kind === 'global'),
  )

  if (!result) return null

  const h = result.hours[frame] ?? 0
  const outsideTemp = globalZone ? zoneTempAt(globalZone, h) : null
  const hour = h % 24
  const isDay = hour >= 6 && hour < 20

  return (
    <Box sx={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
      <Paper
        elevation={4}
        sx={{
          px: 1.5,
          py: 0.75,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          borderRadius: 2,
          backdropFilter: 'blur(8px)',
          bgcolor: 'rgba(10,13,20,0.78)',
          border: '1px solid rgba(255,255,255,0.10)',
        }}
      >
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: isDay ? '#fbbf24' : '#818cf8',
            boxShadow: `0 0 6px ${isDay ? '#fbbf2466' : '#818cf866'}`,
          }}
        />
        <Typography
          variant="caption"
          sx={{ fontFamily: 'JetBrains Mono, monospace', color: '#eef2f8', fontWeight: 500 }}
        >
          {formatHour(h)}
        </Typography>
        {outsideTemp !== null && (
          <Typography
            variant="caption"
            sx={{ fontFamily: 'JetBrains Mono, monospace', color: '#8b93a7' }}
          >
            {outsideTemp.toFixed(1)}°C
          </Typography>
        )}
      </Paper>
    </Box>
  )
}

function TimelineBar() {
  const result = useSimStore((s) => s.result)
  const frame = useSimStore((s) => s.frame)
  const playing = useSimStore((s) => s.playing)
  const speed = useSimStore((s) => s.speed)
  const setFrame = useSimStore((s) => s.setFrame)
  const setPlaying = useSimStore((s) => s.setPlaying)
  const setSpeed = useSimStore((s) => s.setSpeed)

  if (!result) return null

  const SPEEDS = [0.5, 1, 2, 4]
  const currentHour = result.hours[frame] ?? 0

  return (
    <Box
      sx={{
        px: 2,
        py: 0.75,
        borderTop: 1,
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        bgcolor: 'background.paper',
        flexShrink: 0,
      }}
    >
      <IconButton
        size="small"
        color="primary"
        onClick={() => {
          if (frame >= result.hours.length - 1) setFrame(0)
          setPlaying(!playing)
        }}
      >
        {playing ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
      </IconButton>
      <IconButton
        size="small"
        onClick={() => {
          setFrame(0)
          setPlaying(false)
        }}
      >
        <ReplayIcon fontSize="small" />
      </IconButton>
      <Typography
        variant="caption"
        sx={{ fontFamily: 'JetBrains Mono, monospace', minWidth: 68, flexShrink: 0 }}
      >
        {formatHour(currentHour)}
      </Typography>
      <Slider
        size="small"
        sx={{ flex: 1, mx: 1 }}
        min={0}
        max={result.hours.length - 1}
        value={frame}
        onChange={(_, v) => setFrame(v as number)}
      />
      <ToggleButtonGroup
        exclusive
        size="small"
        value={speed}
        onChange={(_, v) => v && setSpeed(v)}
        sx={{ flexShrink: 0 }}
      >
        {SPEEDS.map((s) => (
          <ToggleButton key={s} value={s} sx={{ px: 0.75, minWidth: 32, fontSize: 11 }}>
            {s}×
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  )
}

function OutsideEnvSection() {
  const globalZone = useProjectStore((s) =>
    s.project.outsideZones.find((z) => z.kind === 'global'),
  )
  const updateZone = useProjectStore((s) => s.updateZone)

  if (!globalZone)
    return (
      <Typography variant="body2" color="text.secondary">
        No outside zone.
      </Typography>
    )

  const d = globalZone.diurnal

  return (
    <Stack spacing={1.5}>
      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={!!d}
            onChange={(e) => {
              if (e.target.checked) {
                updateZone(globalZone.id, {
                  diurnal: { minC: 18, maxC: 34, peakHour: 15 },
                })
              } else {
                updateZone(globalZone.id, { diurnal: undefined })
              }
            }}
          />
        }
        label={<Typography variant="body2">Daily swing</Typography>}
      />
      {d ? (
        <Stack spacing={1}>
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              type="number"
              label="Night low (°C)"
              value={d.minC}
              onChange={(e) =>
                updateZone(globalZone.id, { diurnal: { ...d, minC: Number(e.target.value) } })
              }
              sx={{ flex: 1 }}
            />
            <TextField
              size="small"
              type="number"
              label="Day high (°C)"
              value={d.maxC}
              onChange={(e) =>
                updateZone(globalZone.id, { diurnal: { ...d, maxC: Number(e.target.value) } })
              }
              sx={{ flex: 1 }}
            />
          </Stack>
          <TextField
            size="small"
            type="number"
            label="Peak hour (0–23)"
            value={d.peakHour}
            onChange={(e) =>
              updateZone(globalZone.id, {
                diurnal: { ...d, peakHour: Number(e.target.value) },
              })
            }
          />
        </Stack>
      ) : (
        <TextField
          size="small"
          type="number"
          label="Temperature (°C)"
          value={globalZone.tempC}
          onChange={(e) => updateZone(globalZone.id, { tempC: Number(e.target.value) })}
        />
      )}
    </Stack>
  )
}

function OpeningsListSection() {
  const project = useProjectStore((s) => s.project)
  const setAllOpen = useProjectStore((s) => s.setAllOpen)
  const updateOpening = useProjectStore((s) => s.updateOpening)

  if (project.openings.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No openings yet — draw rooms, then add windows or doors.
      </Typography>
    )
  }

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1}>
        <Button size="small" onClick={() => setAllOpen(true)}>
          Open all
        </Button>
        <Button size="small" onClick={() => setAllOpen(false)}>
          Close all
        </Button>
      </Stack>
      <List dense disablePadding sx={{ maxHeight: 200, overflow: 'auto' }}>
        {project.openings.map((o) => {
          const wall = project.walls.find((w) => w.id === o.wallId)
          const roomName = wall ? roomNameForWall(project, wall) : ''
          return (
            <ListItem
              key={o.id}
              disableGutters
              secondaryAction={
                <Switch
                  edge="end"
                  size="small"
                  checked={o.isOpen}
                  onChange={(e) => updateOpening(o.id, { isOpen: e.target.checked })}
                />
              }
            >
              <ListItemText
                primary={`${o.kind === 'window' ? 'Window' : 'Door'} · ${roomName}`}
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
          )
        })}
      </List>
    </Stack>
  )
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function roomNameForWall(project: Project, wall: Wall): string {
  return [wall.sideA, wall.sideB]
    .filter((s) => s.type === 'room')
    .map((s) => project.rooms.find((r) => r.id === s.id)?.name)
    .filter(Boolean)
    .join(' ↔ ')
}

function formatHour(h: number): string {
  const day = Math.floor(h / 24) + 1
  const hr = Math.floor(h % 24)
  const min = Math.round((h % 1) * 60)
  return `D${day} ${String(hr).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}
