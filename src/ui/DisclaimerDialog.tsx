import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
} from '@mui/material'

export function DisclaimerDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm">
      <DialogTitle>How HeatFlow works</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" paragraph>
          HeatFlow models each room as a lumped thermal mass. Heat moves between rooms
          and the outside in three ways:
        </Typography>
        <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
          <li>
            <b>Conduction</b> through walls and closed windows/doors, set by their
            R/U-value and area.
          </li>
          <li>
            <b>Ventilation</b> through open windows/doors, driven by the temperature
            difference (buoyancy/stack effect) plus a small background breeze.
          </li>
          <li>
            <b>Mixing</b> between rooms through open interior doors.
          </li>
        </Typography>
        <Typography variant="body2" paragraph sx={{ mt: 1 }}>
          The simulation steps temperatures forward over time, so you can see slow
          effects like overnight cooling and thermal mass.
        </Typography>
        <Alert severity="info">
          These are engineering estimates to build intuition, not a certified
          building-energy or CFD calculation. Wind direction, solar gain through glass,
          and humidity are not yet modelled.
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Got it</Button>
      </DialogActions>
    </Dialog>
  )
}
