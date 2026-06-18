import { createTheme, alpha } from '@mui/material/styles'

const ACCENT = '#ff7a3d'

export function createAppTheme(mode: 'dark' | 'light') {
  const dark = mode === 'dark'
  return createTheme({
    palette: {
      mode,
      primary: { main: ACCENT, dark: '#e55a1f', light: '#ff9a67' },
      secondary: { main: '#34d399' },
      background: {
        default: dark ? '#0a0d14' : '#eef1f6',
        paper: dark ? '#121826' : '#ffffff',
      },
      text: {
        primary: dark ? '#eef2f8' : '#161b26',
        secondary: dark ? '#8b93a7' : '#4a5366',
        disabled: dark ? '#5b6478' : '#97a0b2',
      },
      divider: dark ? 'rgba(255,255,255,.08)' : 'rgba(15,23,42,.10)',
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: "'Space Grotesk', system-ui, -apple-system, 'Segoe UI', sans-serif",
      fontSize: 13,
      h6: { fontWeight: 700, letterSpacing: '-0.01em' },
      subtitle2: {
        fontWeight: 700,
        fontSize: 11,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
      },
      button: { fontWeight: 600, textTransform: 'none' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            fontFamily:
              "'Space Grotesk', system-ui, -apple-system, 'Segoe UI', sans-serif",
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { textTransform: 'none', borderRadius: 9 } },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: '9px !important',
            fontWeight: 600,
            border: dark
              ? '1px solid rgba(255,255,255,.08)'
              : '1px solid rgba(15,23,42,.10)',
            '&.Mui-selected': {
              backgroundColor: alpha(ACCENT, 0.15),
              color: ACCENT,
              borderColor: alpha(ACCENT, 0.3),
              '&:hover': { backgroundColor: alpha(ACCENT, 0.2) },
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: 'none' } },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: dark ? '#121826' : '#ffffff',
            boxShadow: 'none',
            borderBottom: `1px solid ${dark ? 'rgba(255,255,255,.08)' : 'rgba(15,23,42,.10)'}`,
          },
        },
      },
      MuiTextField: { defaultProps: { variant: 'outlined', size: 'small' } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontSize: 13,
            background: dark ? '#0d1320' : '#f3f5fa',
            '& fieldset': {
              borderColor: dark ? 'rgba(255,255,255,.14)' : 'rgba(15,23,42,.16)',
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontSize: 13,
            background: dark ? '#0d1320' : '#f3f5fa',
          },
        },
      },
      MuiSlider: {
        styleOverrides: {
          thumb: { color: ACCENT, width: 14, height: 14 },
          track: { color: ACCENT },
          rail: {
            color: dark ? 'rgba(255,255,255,.14)' : 'rgba(15,23,42,.16)',
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          switchBase: {
            '&.Mui-checked': { color: ACCENT },
            '&.Mui-checked + .MuiSwitch-track': { backgroundColor: ACCENT },
          },
        },
      },
      MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
      MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            '&.Mui-selected': {
              backgroundColor: alpha(ACCENT, 0.1),
              color: ACCENT,
            },
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: dark ? 'rgba(255,255,255,.08)' : 'rgba(15,23,42,.10)',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 18,
            border: `1px solid ${dark ? 'rgba(255,255,255,.14)' : 'rgba(15,23,42,.10)'}`,
          },
        },
      },
    },
  })
}
