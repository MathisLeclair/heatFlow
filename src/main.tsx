import { StrictMode, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { createAppTheme } from './theme'
import { useUiStore } from './state/uiStore'
import App from './App.tsx'
import './index.css'

// eslint-disable-next-line react-refresh/only-export-components
function ThemedApp() {
  const themeMode = useUiStore((s) => s.theme)
  const muiTheme = useMemo(() => createAppTheme(themeMode), [themeMode])
  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemedApp />
  </StrictMode>,
)
