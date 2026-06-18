import { List, ListItemButton, ListItemText, Button, Stack, Typography, Box } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { useProjectStore } from '../state/projectStore'
import { useUiStore } from '../state/uiStore'
import { zoneTempAt } from '../sim/simulate'

export function ZoneListPanel() {
  const zones = useProjectStore((s) => s.project.outsideZones)
  const addCustomZone = useProjectStore((s) => s.addCustomZone)
  const selection = useUiStore((s) => s.selection)
  const select = useUiStore((s) => s.select)

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">Outside zones</Typography>
      <List dense disablePadding>
        {zones.map((z) => {
          const isSel = selection?.type === 'zone' && selection.id === z.id
          const label = z.diurnal
            ? `${z.diurnal.minC}–${z.diurnal.maxC}°C (peak ${z.diurnal.peakHour}h)`
            : `${z.tempC}°C constant`
          return (
            <ListItemButton
              key={z.id}
              selected={isSel}
              onClick={() => select({ type: 'zone', id: z.id })}
            >
              <Box
                sx={{
                  width: 14,
                  height: 14,
                  borderRadius: 0.5,
                  bgcolor: z.color,
                  mr: 1,
                  border: '1px solid rgba(0,0,0,0.2)',
                }}
              />
              <ListItemText
                primary={z.name}
                secondary={label}
                primaryTypographyProps={{ variant: 'body2' }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItemButton>
          )
        })}
      </List>
      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={() => {
          const id = addCustomZone()
          select({ type: 'zone', id })
        }}
      >
        Add outside zone
      </Button>
      <Typography variant="caption" color="text.secondary">
        Assign each exterior wall to a zone in the wall’s properties (e.g. a shaded
        courtyard that stays cooler than the street). Current peak example:{' '}
        {zones[0] ? `${zoneTempAt(zones[0], 16).toFixed(0)}°C` : '—'}.
      </Typography>
    </Stack>
  )
}
