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
  const setNorthAngle = useProjectStore((s) => s.setNorthAngle)
  const setStartHour = useProjectStore((s) => s.setStartHour)
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
      <Typography variant="subtitle2">Solar / Orientation</Typography>
      <TextField
        size="small"
        type="number"
        label="Simulation start hour (0–23)"
        value={project.startHour ?? 6}
        onChange={(e) => setStartHour(Math.max(0, Math.min(23, Number(e.target.value))))}
        helperText="Hour of day when the simulation begins (6 = 6 am)."
      />
      <TextField
        size="small"
        type="number"
        label="North offset (°)"
        value={project.northAngle ?? 0}
        onChange={(e) => setNorthAngle(Number(e.target.value) % 360)}
        helperText="Degrees clockwise from canvas-up to true north. 0 = canvas up is north."
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
