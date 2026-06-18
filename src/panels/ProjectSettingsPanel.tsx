import { useRef } from 'react'
import { Stack, TextField, Typography, Button, Divider } from '@mui/material'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../state/projectStore'
import {
  exportProjectFile,
  importProjectFile,
} from '../persistence/storage'

export function ProjectSettingsPanel() {
  const { t } = useTranslation()
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
      <Typography variant="subtitle2">{t('project.title')}</Typography>
      <TextField
        size="small"
        label={t('project.name')}
        value={project.name}
        onChange={(e) => setName(e.target.value)}
      />
      <TextField
        size="small"
        type="number"
        label={t('project.comfortTemp')}
        value={project.comfortTempC}
        onChange={(e) => setComfortTempC(Number(e.target.value))}
        helperText={t('project.comfortTempHelper')}
      />
      <TextField
        size="small"
        type="number"
        label={t('project.simLength')}
        value={project.simHours}
        onChange={(e) => setSimHours(Math.max(1, Number(e.target.value)))}
      />

      <Divider />
      <Typography variant="subtitle2">{t('project.solarSection')}</Typography>
      <TextField
        size="small"
        type="number"
        label={t('project.startHour')}
        value={project.startHour ?? 6}
        onChange={(e) => setStartHour(Math.max(0, Math.min(23, Number(e.target.value))))}
        helperText={t('project.startHourHelper')}
      />
      <TextField
        size="small"
        type="number"
        label={t('project.northOffset')}
        value={project.northAngle ?? 0}
        onChange={(e) => setNorthAngle(Number(e.target.value) % 360)}
        helperText={t('project.northOffsetHelper')}
      />

      <Divider />
      <Button startIcon={<FileDownloadIcon />} onClick={() => exportProjectFile(project)}>
        {t('project.export')}
      </Button>
      <Button startIcon={<FileUploadIcon />} onClick={() => fileRef.current?.click()}>
        {t('project.import')}
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
              alert(t('project.importError'))
            }
          }
          e.target.value = ''
        }}
      />
      <Button
        color="warning"
        startIcon={<RestartAltIcon />}
        onClick={() => {
          if (confirm(t('project.resetConfirm'))) resetSample()
        }}
      >
        {t('project.reset')}
      </Button>
    </Stack>
  )
}
