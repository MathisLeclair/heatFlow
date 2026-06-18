import { useState } from 'react'
import {
  Stack,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import DeleteIcon from '@mui/icons-material/Delete'
import { useProjectStore } from '../state/projectStore'

/**
 * Save the current open/closed configuration as a named scenario and re-apply it
 * later, so the user can A/B compare strategies by applying then re-running.
 */
export function ScenariosPanel() {
  const scenarios = useProjectStore((s) => s.project.scenarios)
  const openings = useProjectStore((s) => s.project.openings)
  const saveScenario = useProjectStore((s) => s.saveScenario)
  const applyScenario = useProjectStore((s) => s.applyScenario)
  const removeScenario = useProjectStore((s) => s.removeScenario)
  const [name, setName] = useState('')

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2">Scenarios</Typography>
      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          fullWidth
          placeholder="e.g. Night cross-vent"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button
          variant="outlined"
          startIcon={<SaveIcon />}
          onClick={() => {
            saveScenario(name)
            setName('')
          }}
        >
          Save
        </Button>
      </Stack>
      {scenarios.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          Save the current open/closed layout to compare strategies. Apply one, then
          re-run the simulation to see its score.
        </Typography>
      ) : (
        <List dense disablePadding>
          {scenarios.map((sc) => {
            const open = Object.values(sc.openStates).filter(Boolean).length
            return (
              <ListItem
                key={sc.id}
                disableGutters
                secondaryAction={
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => removeScenario(sc.id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemButton onClick={() => applyScenario(sc.id)}>
                  <ListItemText
                    primary={sc.name}
                    secondary={`${open}/${openings.length} open — tap to apply`}
                    slotProps={{
                      primary: { variant: 'body2' },
                      secondary: { variant: 'caption' },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            )
          })}
        </List>
      )}
    </Stack>
  )
}
