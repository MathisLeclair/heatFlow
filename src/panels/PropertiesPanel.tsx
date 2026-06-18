import { useState } from 'react'
import {
  Stack,
  TextField,
  MenuItem,
  Typography,
  Button,
  Divider,
  Switch,
  FormControlLabel,
  Slider,
  Box,
  Chip,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../state/projectStore'
import { useUiStore } from '../state/uiStore'
import {
  WALL_TYPES,
  WINDOW_PRESETS,
  DOOR_PRESETS,
  WINDOW_SIZE_PRESETS,
  DOOR_SIZE_PRESETS,
  wallTypeById,
  wallResistance,
} from '../presets'
import type { OutsideZone, Room, Wall, Opening } from '../model/types'

export function PropertiesPanel() {
  const { t } = useTranslation()
  const selection = useUiStore((s) => s.selection)
  const project = useProjectStore((s) => s.project)

  if (!selection) {
    return (
      <Typography variant="body2" color="text.secondary">
        {t('properties.nothingSelected')}
      </Typography>
    )
  }

  if (selection.type === 'room') {
    const room = project.rooms.find((r) => r.id === selection.id)
    return room ? <RoomEditor room={room} /> : null
  }
  if (selection.type === 'wall') {
    const wall = project.walls.find((w) => w.id === selection.id)
    return wall ? <WallEditor key={wall.id} wall={wall} /> : null
  }
  if (selection.type === 'opening') {
    const op = project.openings.find((o) => o.id === selection.id)
    return op ? <OpeningEditor opening={op} /> : null
  }
  if (selection.type === 'zone') {
    const zone = project.outsideZones.find((z) => z.id === selection.id)
    return zone ? <ZoneEditor zone={zone} /> : null
  }
  return null
}

function num(e: { target: { value: string } }): number {
  return Number(e.target.value)
}

function RoomEditor({ room }: { room: Room }) {
  const { t } = useTranslation()
  const updateRoom = useProjectStore((s) => s.updateRoom)
  const removeRoom = useProjectStore((s) => s.removeRoom)
  const select = useUiStore((s) => s.select)

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2">{t('room.title')}</Typography>
      <TextField
        size="small"
        label={t('room.name')}
        value={room.name}
        onChange={(e) => updateRoom(room.id, { name: e.target.value })}
      />
      <TextField
        size="small"
        type="number"
        label={t('room.airTemp')}
        value={room.initialTempC}
        onChange={(e) => updateRoom(room.id, { initialTempC: num(e) })}
      />
      <TextField
        size="small"
        type="number"
        label={t('room.ceilingHeight')}
        value={room.ceilingHeightM}
        onChange={(e) => updateRoom(room.id, { ceilingHeightM: num(e) })}
      />
      <Box>
        <Typography variant="caption" color="text.secondary">
          {t('room.thermalMass')} {room.thermalMassMultiplier}×
        </Typography>
        <Slider
          size="small"
          min={3}
          max={15}
          step={1}
          value={room.thermalMassMultiplier}
          onChange={(_, v) =>
            updateRoom(room.id, { thermalMassMultiplier: v as number })
          }
        />
      </Box>
      <Button
        color="error"
        startIcon={<DeleteIcon />}
        onClick={() => {
          removeRoom(room.id)
          select(null)
        }}
      >
        {t('room.delete')}
      </Button>
    </Stack>
  )
}

function WallEditor({ wall }: { wall: Wall }) {
  const { t } = useTranslation()
  const updateWall = useProjectStore((s) => s.updateWall)
  const resizeWall = useProjectStore((s) => s.resizeWall)
  const project = useProjectStore((s) => s.project)
  const type = wallTypeById(wall.wallTypeId)
  const r = wallResistance(wall.wallTypeId, wall.thicknessM)
  const outsideZones = project.outsideZones
  const currentLen = Math.hypot(wall.b.x - wall.a.x, wall.b.y - wall.a.y)

  const [lenInput, setLenInput] = useState(() => currentLen.toFixed(2))

  function commitLength() {
    const v = parseFloat(lenInput)
    if (isNaN(v) || v < 0.05) { setLenInput(currentLen.toFixed(2)); return }
    if (Math.abs(v - currentLen) < 0.001) return
    resizeWall(wall.id, v)
  }

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2">
        {wall.exterior ? t('wall.exterior') : t('wall.interior')}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <Chip
          size="small"
          label={`R ≈ ${r.toFixed(2)} m²·K/W`}
          color="primary"
          variant="outlined"
        />
        <Chip
          size="small"
          label={`${currentLen.toFixed(2)} m`}
          variant="outlined"
        />
      </Box>
      <TextField
        size="small"
        label={t('wall.length')}
        value={lenInput}
        onChange={(e) => setLenInput(e.target.value)}
        onBlur={commitLength}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        slotProps={{ htmlInput: { inputMode: 'decimal', step: '0.05' } }}
        helperText={t('wall.lengthHelper')}
      />
      <TextField
        select
        size="small"
        label={t('wall.construction')}
        value={wall.wallTypeId}
        onChange={(e) => {
          const wt = wallTypeById(e.target.value)
          updateWall(wall.id, {
            wallTypeId: e.target.value,
            thicknessM: wt.thicknessOptions.includes(wall.thicknessM)
              ? wall.thicknessM
              : wt.refThicknessM,
          })
        }}
      >
        {WALL_TYPES.map((wt) => (
          <MenuItem key={wt.id} value={wt.id}>
            {wt.name}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size="small"
        label={t('wall.thickness')}
        value={wall.thicknessM}
        onChange={(e) => updateWall(wall.id, { thicknessM: Number(e.target.value) })}
      >
        {type.thicknessOptions.map((th) => (
          <MenuItem key={th} value={th}>
            {th} m
          </MenuItem>
        ))}
      </TextField>

      {wall.exterior && (
        <TextField
          select
          size="small"
          label={t('wall.facesZone')}
          value={wall.sideB.type === 'outside' ? wall.sideB.id : ''}
          onChange={(e) =>
            updateWall(wall.id, { sideB: { type: 'outside', id: e.target.value } })
          }
        >
          {outsideZones.map((z) => (
            <MenuItem key={z.id} value={z.id}>
              {z.name}
            </MenuItem>
          ))}
        </TextField>
      )}
    </Stack>
  )
}

function OpeningEditor({ opening }: { opening: Opening }) {
  const { t } = useTranslation()
  const updateOpening = useProjectStore((s) => s.updateOpening)
  const removeOpening = useProjectStore((s) => s.removeOpening)
  const select = useUiStore((s) => s.select)

  const glazingPresets = opening.kind === 'window' ? WINDOW_PRESETS : DOOR_PRESETS
  const sizePresets    = opening.kind === 'window' ? WINDOW_SIZE_PRESETS : DOOR_SIZE_PRESETS

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2">
        {opening.kind === 'window' ? t('opening.titleWindow') : t('opening.titleDoor')}
      </Typography>
      <FormControlLabel
        control={
          <Switch
            checked={opening.isOpen}
            onChange={(e) => updateOpening(opening.id, { isOpen: e.target.checked })}
          />
        }
        label={opening.isOpen ? t('opening.isOpen') : t('opening.isClosed')}
      />
      <TextField
        select
        size="small"
        label={t('opening.glazing')}
        value={opening.presetId}
        onChange={(e) => updateOpening(opening.id, { presetId: e.target.value })}
      >
        {glazingPresets.map((p) => (
          <MenuItem key={p.id} value={p.id}>
            {p.name}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size="small"
        label={t('opening.size')}
        value={opening.sizePresetId ?? ''}
        onChange={(e) => updateOpening(opening.id, { sizePresetId: e.target.value })}
      >
        {sizePresets.map((p) => (
          <MenuItem key={p.id} value={p.id}>
            {p.name}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        size="small"
        type="number"
        label={t('opening.width')}
        value={opening.widthM}
        onChange={(e) => updateOpening(opening.id, { widthM: num(e) })}
      />
      <TextField
        size="small"
        type="number"
        label={t('opening.height')}
        value={opening.heightM}
        onChange={(e) => updateOpening(opening.id, { heightM: num(e) })}
      />
      <TextField
        size="small"
        type="number"
        label={t('opening.sillHeight')}
        value={opening.sillHeightM}
        onChange={(e) => updateOpening(opening.id, { sillHeightM: num(e) })}
      />
      <Box>
        <Typography variant="caption" color="text.secondary">
          {t('opening.positionAlongWall')}
        </Typography>
        <Slider
          size="small"
          min={0.05}
          max={0.95}
          step={0.01}
          value={opening.t}
          onChange={(_, v) => updateOpening(opening.id, { t: v as number })}
        />
      </Box>
      <Button
        color="error"
        startIcon={<DeleteIcon />}
        onClick={() => {
          removeOpening(opening.id)
          select(null)
        }}
      >
        {t('opening.delete')}
      </Button>
    </Stack>
  )
}

function ZoneEditor({ zone }: { zone: OutsideZone }) {
  const { t } = useTranslation()
  const updateZone = useProjectStore((s) => s.updateZone)
  const removeZone = useProjectStore((s) => s.removeZone)
  const select = useUiStore((s) => s.select)
  const useDiurnal = !!zone.diurnal

  const shelterLabel =
    zone.shelterFactor == null || zone.shelterFactor === 0
      ? t('zone.shelterOpen')
      : zone.shelterFactor >= 1
        ? t('zone.shelterFull')
        : t('zone.shelterPartial', { pct: Math.round((zone.shelterFactor ?? 0) * 100) })

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2">
        {zone.kind === 'global' ? t('zone.titleGlobal') : t('zone.titleCustom')}
      </Typography>
      <TextField
        size="small"
        label={t('zone.name')}
        value={zone.name}
        onChange={(e) => updateZone(zone.id, { name: e.target.value })}
      />
      <FormControlLabel
        control={
          <Switch
            checked={useDiurnal}
            onChange={(e) =>
              updateZone(zone.id, {
                diurnal: e.target.checked
                  ? { minC: zone.tempC - 6, maxC: zone.tempC + 6, peakHour: 16 }
                  : undefined,
              })
            }
          />
        }
        label={t('zone.diurnalSwing')}
      />
      {!useDiurnal && (
        <TextField
          size="small"
          type="number"
          label={t('zone.temperature')}
          value={zone.tempC}
          onChange={(e) => updateZone(zone.id, { tempC: num(e) })}
        />
      )}
      {useDiurnal && zone.diurnal && (
        <>
          <TextField
            size="small"
            type="number"
            label={t('zone.nightLow')}
            value={zone.diurnal.minC}
            onChange={(e) =>
              updateZone(zone.id, { diurnal: { ...zone.diurnal!, minC: num(e) } })
            }
          />
          <TextField
            size="small"
            type="number"
            label={t('zone.dayHigh')}
            value={zone.diurnal.maxC}
            onChange={(e) =>
              updateZone(zone.id, { diurnal: { ...zone.diurnal!, maxC: num(e) } })
            }
          />
          <TextField
            size="small"
            type="number"
            label={t('zone.peakHeatHour')}
            value={zone.diurnal.peakHour}
            onChange={(e) =>
              updateZone(zone.id, { diurnal: { ...zone.diurnal!, peakHour: num(e) } })
            }
          />
        </>
      )}
      <Box>
        <Typography variant="caption" color="text.secondary">
          {t('zone.shelter')} {shelterLabel}
        </Typography>
        <Slider
          size="small"
          min={0}
          max={1}
          step={0.05}
          value={zone.shelterFactor ?? 0}
          onChange={(_, v) => updateZone(zone.id, { shelterFactor: v as number })}
        />
        <Typography variant="caption" color="text.secondary">
          {t('zone.shelterHelper')}
        </Typography>
      </Box>
      {zone.kind !== 'global' && (
        <>
          <Divider />
          <Button
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => {
              removeZone(zone.id)
              select(null)
            }}
          >
            {t('zone.delete')}
          </Button>
        </>
      )}
    </Stack>
  )
}
