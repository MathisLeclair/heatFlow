import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  MobileStepper,
  useTheme,
  Paper,
} from '@mui/material'
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft'
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight'

// ─── Step illustrations (inline SVG) ─────────────────────────────────────────

function IllustrationFloorPlan() {
  return (
    <svg viewBox="0 0 200 120" width="100%" style={{ maxHeight: 120 }}>
      {/* Room outline */}
      <rect x="30" y="20" width="140" height="80" fill="none" stroke="#90caf9" strokeWidth="2.5" />
      {/* Interior wall */}
      <line x1="100" y1="20" x2="100" y2="100" stroke="#90caf9" strokeWidth="2.5" />
      {/* Room labels */}
      <text x="65" y="65" textAnchor="middle" fontSize="11" fill="#90caf9">Living</text>
      <text x="135" y="65" textAnchor="middle" fontSize="11" fill="#a5d6a7">Bedroom</text>
      {/* Cursor pointer hint */}
      <polygon points="155,15 155,30 159,26 163,34 165,33 161,25 166,25" fill="#fbbf24" />
    </svg>
  )
}

function IllustrationOpenings() {
  return (
    <svg viewBox="0 0 200 120" width="100%" style={{ maxHeight: 120 }}>
      {/* Wall */}
      <rect x="20" y="50" width="160" height="14" fill="#90caf9" opacity="0.4" />
      <rect x="20" y="50" width="60" height="14" fill="#90caf9" opacity="0.4" />
      <rect x="120" y="50" width="60" height="14" fill="#90caf9" opacity="0.4" />
      {/* Window gap */}
      <rect x="80" y="48" width="40" height="18" fill="none" stroke="#60a5fa" strokeWidth="2" strokeDasharray="3,2" />
      <text x="100" y="43" textAnchor="middle" fontSize="9" fill="#60a5fa">window</text>
      {/* Airflow arrows */}
      <path d="M100,80 Q90,90 80,95" stroke="#34d399" strokeWidth="1.5" fill="none" markerEnd="url(#arr)" />
      <path d="M100,80 Q110,90 120,95" stroke="#34d399" strokeWidth="1.5" fill="none" />
      <text x="100" y="108" textAnchor="middle" fontSize="9" fill="#34d399">airflow</text>
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#34d399" />
        </marker>
      </defs>
    </svg>
  )
}

function IllustrationProperties() {
  return (
    <svg viewBox="0 0 200 120" width="100%" style={{ maxHeight: 120 }}>
      {/* Room */}
      <rect x="20" y="20" width="90" height="80" fill="#90caf920" stroke="#90caf9" strokeWidth="2" />
      <text x="65" y="65" textAnchor="middle" fontSize="10" fill="#90caf9">Room</text>
      {/* Properties panel mockup */}
      <rect x="125" y="15" width="65" height="90" rx="4" fill="none" stroke="#6b7280" strokeWidth="1" />
      <text x="157" y="29" textAnchor="middle" fontSize="8" fill="#9ca3af">Properties</text>
      <line x1="130" y1="33" x2="185" y2="33" stroke="#374151" strokeWidth="0.8" />
      <rect x="130" y="38" width="50" height="7" rx="2" fill="#374151" />
      <rect x="130" y="50" width="50" height="7" rx="2" fill="#374151" />
      <rect x="130" y="62" width="35" height="7" rx="2" fill="#374151" />
      {/* Selection arrow */}
      <path d="M112,60 L122,60" stroke="#fbbf24" strokeWidth="1.5" markerEnd="url(#arr2)" />
      <defs>
        <marker id="arr2" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#fbbf24" />
        </marker>
      </defs>
    </svg>
  )
}

function IllustrationOutside() {
  return (
    <svg viewBox="0 0 200 120" width="100%" style={{ maxHeight: 120 }}>
      {/* Sky gradient rect */}
      <rect x="0" y="0" width="200" height="120" fill="#0f172a" />
      {/* Sun */}
      <circle cx="160" cy="35" r="18" fill="#fbbf24" opacity="0.85" />
      {/* Temperature wave */}
      <path d="M10,85 Q30,60 50,75 Q70,90 90,65 Q110,40 130,60 Q150,80 170,55 Q190,30 200,50"
        fill="none" stroke="#f97316" strokeWidth="2" opacity="0.8" />
      <text x="10" y="112" fontSize="9" fill="#f97316" opacity="0.9">day/night temperature swing</text>
    </svg>
  )
}

function IllustrationSolar() {
  return (
    <svg viewBox="0 0 200 120" width="100%" style={{ maxHeight: 120 }}>
      {/* Building */}
      <rect x="70" y="30" width="80" height="70" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
      {/* Window */}
      <rect x="90" y="45" width="18" height="22" fill="#60a5fa" opacity="0.5" stroke="#60a5fa" strokeWidth="1" />
      {/* Sun */}
      <circle cx="30" cy="40" r="14" fill="#fbbf24" />
      {/* Sun rays hitting building */}
      <line x1="44" y1="40" x2="70" y2="50" stroke="#fbbf24" strokeWidth="1.5" opacity="0.7" />
      <line x1="44" y1="35" x2="70" y2="42" stroke="#fbbf24" strokeWidth="1.5" opacity="0.7" />
      <line x1="44" y1="45" x2="70" y2="60" stroke="#fbbf24" strokeWidth="1.5" opacity="0.7" />
      {/* Compass needle */}
      <g transform="translate(170,25)">
        <circle cx="0" cy="0" r="16" fill="#1e293b" stroke="#374151" strokeWidth="1" />
        <polygon points="0,-11 -4,2 0,0 4,2" fill="#ef4444" />
        <polygon points="0,11 -4,-2 0,0 4,-2" fill="#6b7280" />
        <text x="0" y="-13" textAnchor="middle" fontSize="7" fill="#ef4444">N</text>
      </g>
    </svg>
  )
}

function IllustrationSimulate() {
  return (
    <svg viewBox="0 0 200 120" width="100%" style={{ maxHeight: 120 }}>
      {/* Heatmap rooms */}
      <rect x="20" y="20" width="70" height="60" fill="#f97316" opacity="0.7" rx="2" />
      <rect x="95" y="20" width="85" height="60" fill="#fbbf24" opacity="0.55" rx="2" />
      <text x="55" y="55" textAnchor="middle" fontSize="11" fill="white" fontWeight="bold">29°C</text>
      <text x="137" y="55" textAnchor="middle" fontSize="11" fill="white" fontWeight="bold">26°C</text>
      {/* Timeline bar */}
      <rect x="20" y="92" width="160" height="8" rx="4" fill="#1e293b" />
      <rect x="20" y="92" width="90" height="8" rx="4" fill="#6366f1" />
      <circle cx="110" cy="96" r="5" fill="white" stroke="#6366f1" strokeWidth="1.5" />
      <text x="100" y="115" textAnchor="middle" fontSize="9" fill="#9ca3af">drag to scrub time</text>
    </svg>
  )
}

// ─── Step data ────────────────────────────────────────────────────────────────

interface Step {
  title: string
  description: string
  tip?: string
  illustration: React.ReactNode
}

const STEPS: Step[] = [
  {
    title: 'Welcome to HeatFlow',
    description:
      'HeatFlow simulates how heat moves through your building over time. Draw a floor plan, configure walls and openings, then run the simulation to see how indoor temperatures evolve — and find the best ventilation strategy.',
    tip: 'This takes about 2 minutes to walk through.',
    illustration: (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 120 }}>
        <Box
          sx={{
            width: 52,
            height: 52,
            transform: 'rotate(45deg)',
            background: 'linear-gradient(135deg, #ff9a67, #ff7a3d)',
            borderRadius: '10px',
            boxShadow: '0 8px 32px #ff7a3d66',
          }}
        />
      </Box>
    ),
  },
  {
    title: 'Draw your floor plan',
    description:
      'Select the Draw Room tool (pentagon icon) in the left toolbar. Click on the canvas to place vertices, then double-click — or click back on the first point — to close the room.',
    tip: 'Rooms automatically share walls where they touch. Interior walls are derived for you.',
    illustration: <IllustrationFloorPlan />,
  },
  {
    title: 'Add windows & doors',
    description:
      'Select the Window or Door tool, then click on any exterior wall to place an opening. Openings drive natural ventilation: the simulation models the stack effect (buoyancy) and a background breeze.',
    tip: 'Cross-ventilation (openings on opposite sides) gets a 1.6× flow boost.',
    illustration: <IllustrationOpenings />,
  },
  {
    title: 'Edit thermal properties',
    description:
      'Click any room, wall, or opening to select it — its properties appear in the right panel. Set construction type, glazing, ceiling height, and thermal mass. Click an outside zone to configure temperature or shelter factor.',
    tip: 'Thermal mass (3–15×) slows how quickly a room heats or cools.',
    illustration: <IllustrationProperties />,
  },
  {
    title: 'Set the outdoor environment',
    description:
      'The "Outside environment" panel lets you set outdoor temperature with an optional day/night swing. Add custom zones (e.g. a walled courtyard) and use the shelter slider to reduce wind reaching openings that face them.',
    tip: 'A fully enclosed courtyard still benefits from the stack effect — only the breeze component is reduced.',
    illustration: <IllustrationOutside />,
  },
  {
    title: 'Sun & solar orientation',
    description:
      'Drag the compass needle in the bottom-left corner of the canvas to point it toward true north. The simulation then calculates which walls and windows face the sun at each hour, and applies solar heat gain accordingly.',
    tip: 'Set the simulation start hour to 6 (6 am) for a full day run. Low-E glazing has a much lower solar heat gain coefficient than single glazing.',
    illustration: <IllustrationSolar />,
  },
  {
    title: 'Run the simulation',
    description:
      'Switch to Simulate mode and press Run. Rooms are colour-coded by temperature. Drag the timeline to scrub through the day, or press play to animate. The cooling score (degree-hours above comfort) lets you compare scenarios.',
    tip: 'Save different window configurations as Scenarios to compare them side by side.',
    illustration: <IllustrationSimulate />,
  },
]

// ─── localStorage key ─────────────────────────────────────────────────────────

const STORAGE_KEY = 'heatflow-onboarding-done'

export function hasSeenOnboarding(): boolean {
  return localStorage.getItem(STORAGE_KEY) === '1'
}

export function markOnboardingSeen(): void {
  localStorage.setItem(STORAGE_KEY, '1')
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OnboardingDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const theme = useTheme()
  const [step, setStep] = useState(0)
  const maxSteps = STEPS.length
  const current = STEPS[step]
  const isLast = step === maxSteps - 1

  function handleClose() {
    markOnboardingSeen()
    setStep(0)
    onClose()
  }

  function handleNext() {
    if (isLast) {
      handleClose()
    } else {
      setStep((s) => s + 1)
    }
  }

  function handleBack() {
    setStep((s) => Math.max(0, s - 1))
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
    >
      <DialogContent sx={{ p: 0 }}>
        {/* Illustration area */}
        <Box
          sx={{
            bgcolor: theme.palette.mode === 'dark' ? '#0d1420' : '#f1f5f9',
            px: 3,
            pt: 3,
            pb: 1,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          {current.illustration}
        </Box>

        {/* Text content */}
        <Box sx={{ px: 3, pt: 2.5, pb: 1 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
            {current.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
            {current.description}
          </Typography>

          {current.tip && (
            <Paper
              variant="outlined"
              sx={{
                mt: 2,
                px: 1.5,
                py: 1,
                bgcolor: theme.palette.mode === 'dark' ? '#1a2335' : '#eff6ff',
                borderColor: theme.palette.mode === 'dark' ? '#1e3a5f' : '#bfdbfe',
              }}
            >
              <Typography variant="caption" color="primary" sx={{ fontWeight: 600 }}>
                Tip:{' '}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {current.tip}
              </Typography>
            </Paper>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ flexDirection: 'column', gap: 0, p: 0 }}>
        <MobileStepper
          variant="dots"
          steps={maxSteps}
          position="static"
          activeStep={step}
          sx={{ width: '100%', bgcolor: 'transparent', px: 2, py: 1.5 }}
          nextButton={
            <Button size="small" onClick={handleNext} endIcon={isLast ? undefined : <KeyboardArrowRight />}>
              {isLast ? 'Get started' : 'Next'}
            </Button>
          }
          backButton={
            <Button size="small" onClick={handleBack} startIcon={<KeyboardArrowLeft />} disabled={step === 0}>
              Back
            </Button>
          }
        />
        {!isLast && (
          <Button
            size="small"
            onClick={handleClose}
            sx={{ mb: 1, color: 'text.disabled', fontSize: 11 }}
          >
            Skip tutorial
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
