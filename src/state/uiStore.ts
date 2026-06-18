import { create } from 'zustand'
import type { Id } from '../model/types'

export type Tool = 'select' | 'draw-room' | 'add-window' | 'add-door'

export type Selection =
  | { type: 'room'; id: Id }
  | { type: 'wall'; id: Id }
  | { type: 'opening'; id: Id }
  | { type: 'zone'; id: Id }
  | { type: 'fan'; id: Id }
  | { type: 'ac'; id: Id }
  | null

export type Mode = 'edit' | 'simulate'
export type ThemeMode = 'dark' | 'light'

function loadTheme(): ThemeMode {
  try {
    return (localStorage.getItem('hf-theme') as ThemeMode | null) ?? 'dark'
  } catch {
    return 'dark'
  }
}

interface UiState {
  mode: Mode
  tool: Tool
  selection: Selection
  theme: ThemeMode
  pendingWindowPreset: string
  pendingDoorPreset: string
  setMode: (m: Mode) => void
  setTool: (t: Tool) => void
  select: (s: Selection) => void
  toggleTheme: () => void
  setPendingWindowPreset: (id: string) => void
  setPendingDoorPreset: (id: string) => void
}

export const useUiStore = create<UiState>((set) => ({
  mode: 'edit',
  tool: 'select',
  selection: null,
  theme: loadTheme(),
  pendingWindowPreset: 'window-double',
  pendingDoorPreset: 'door-interior',
  setMode: (mode) => set({ mode }),
  setTool: (tool) => set({ tool, selection: null }),
  select: (selection) => set({ selection }),
  toggleTheme: () =>
    set((s) => {
      const next: ThemeMode = s.theme === 'dark' ? 'light' : 'dark'
      try { localStorage.setItem('hf-theme', next) } catch { /* quota */ }
      return { theme: next }
    }),
  setPendingWindowPreset: (pendingWindowPreset) => set({ pendingWindowPreset }),
  setPendingDoorPreset: (pendingDoorPreset) => set({ pendingDoorPreset }),
}))
