import { useRef } from 'react'
import { Stack, TextField, Typography, Button, Divider } from '@mui/material'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import { useProjectStore } from '../state/projectStore'
import {
  exportProjectFile,
  importProjectFile,
} from '../persistence/storage'

export function ProjectSettingsPanel() {
  const project = useProjectStore((s) => s.project)
  const setName = useProjectStore((s) => s.setName)
  const setComfortTempC = useProjectStore((s) => s.setComfortTempC)
  const setSimHours = useProjectStore((s) => s.setSimHours)
  const setProject = useProjectStore((s) => s.setProject)
  const resetSample = useProjectStore((s) => s.resetSample)
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2">Project</Typography>
      <TextField
        size="small"
        label="Name"
        value={project.name}
        onChange={(e) => setName(e.target.value)}
      />
      <TextField
        size="small"
        type="number"
        label="Comfort temperature (°C)"
        value={project.comfortTempC}
        onChange={(e) => setComfortTempC(Number(e.target.value))}
        helperText="Used for the cooling score."
      />
      <TextField
        size="small"
        type="number"
        label="Simulation length (hours)"
        value={project.simHours}
        onChange={(e) => setSimHours(Math.max(1, Number(e.target.value)))}
      />

      <Divider />
      <Button startIcon={<FileDownloadIcon />} onClick={() => exportProjectFile(project)}>
        Export JSON
      </Button>
      <Button startIcon={<FileUploadIcon />} onClick={() => fileRef.current?.click()}>
        Import JSON
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (file) {
            try {
              setProject(await importProjectFile(file))
            } catch {
              alert('Could not read that file as a HeatFlow project.')
            }
          }
          e.target.value = ''
        }}
      />
      <Button
        color="warning"
        startIcon={<RestartAltIcon />}
        onClick={() => {
          if (confirm('Replace the current plan with the sample apartment?')) resetSample()
        }}
      >
        Reset to sample
      </Button>
    </Stack>
  )
}
