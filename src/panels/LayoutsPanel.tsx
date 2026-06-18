import { useRef, useState } from 'react'
import {
  Stack,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  IconButton,
  Box,
  Divider,
  Tooltip,
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import DeleteIcon from '@mui/icons-material/Delete'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import { nanoid } from 'nanoid'
import { useProjectStore } from '../state/projectStore'
import {
  loadLayouts,
  persistLayouts,
  exportProjectFile,
  importProjectFile,
  type LayoutSave,
} from '../persistence/storage'

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function LayoutsPanel() {
  const project = useProjectStore((s) => s.project)
  const setProject = useProjectStore((s) => s.setProject)

  const [layouts, setLayouts] = useState<LayoutSave[]>(() => loadLayouts())
  const [name, setName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function save() {
    const label = name.trim() || project.name || 'Untitled layout'
    const entry: LayoutSave = {
      id: nanoid(8),
      name: label,
      savedAt: Date.now(),
      roomCount: project.rooms.length,
      project,
    }
    const next = [entry, ...layouts]
    setLayouts(next)
    persistLayouts(next)
    setName('')
  }

  function load(entry: LayoutSave) {
    setProject(entry.project)
  }

  function remove(id: string) {
    const next = layouts.filter((l) => l.id !== id)
    setLayouts(next)
    persistLayouts(next)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const p = await importProjectFile(file)
      setProject(p)
    } catch {
      // Malformed file — silently ignore.
    }
    e.target.value = ''
  }

  return (
    <Stack spacing={1.5}>
      {/* Save current layout */}
      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          fullWidth
          placeholder={project.name || 'Layout name…'}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') save() }}
        />
        <Button variant="outlined" startIcon={<SaveIcon />} onClick={save}>
          Save
        </Button>
      </Stack>

      {/* Saved layouts list */}
      {layouts.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          Save the current floor plan to recall different room configurations
          independently of the opening scenarios.
        </Typography>
      ) : (
        <List dense disablePadding>
          {layouts.map((entry) => (
            <ListItem
              key={entry.id}
              disableGutters
              secondaryAction={
                <IconButton size="small" edge="end" onClick={() => remove(entry.id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              }
            >
              <ListItemButton onClick={() => load(entry)} sx={{ borderRadius: 1 }}>
                <ListItemText
                  primary={entry.name}
                  secondary={`${entry.roomCount} room${entry.roomCount !== 1 ? 's' : ''} · ${formatDate(entry.savedAt)}`}
                  slotProps={{
                    primary: { variant: 'body2' },
                    secondary: { variant: 'caption' },
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}

      {/* File export / import */}
      <Divider />
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Tooltip title="Export full project as JSON file">
          <Button
            size="small"
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={() => exportProjectFile(project)}
            sx={{ flex: 1 }}
          >
            Export
          </Button>
        </Tooltip>
        <Tooltip title="Import project from JSON file">
          <Button
            size="small"
            variant="outlined"
            startIcon={<FileUploadIcon />}
            onClick={() => fileRef.current?.click()}
            sx={{ flex: 1 }}
          >
            Import
          </Button>
        </Tooltip>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={handleImport}
        />
      </Box>
    </Stack>
  )
}
