import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

export function DisclaimerDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm">
      <DialogTitle>{t('disclaimer.title')}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" paragraph>
          {t('disclaimer.intro')}
        </Typography>
        <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
          <li>
            <b>{t('disclaimer.conduction')}</b>{' '}
            {t('disclaimer.conductionDesc')}
          </li>
          <li>
            <b>{t('disclaimer.ventilation')}</b>{' '}
            {t('disclaimer.ventilationDesc')}
          </li>
          <li>
            <b>{t('disclaimer.mixing')}</b>{' '}
            {t('disclaimer.mixingDesc')}
          </li>
        </Typography>
        <Typography variant="body2" paragraph sx={{ mt: 1 }}>
          {t('disclaimer.timeNote')}
        </Typography>
        <Alert severity="info">
          {t('disclaimer.disclaimer')}
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('disclaimer.gotIt')}</Button>
      </DialogActions>
    </Dialog>
  )
}
