import type { Project } from '../model/types'

const KEY = 'heatflow.project.v1'
const LAYOUTS_KEY = 'heatflow.layouts.v1'

export interface LayoutSave {
  id: string
  name: string
  savedAt: number   // Date.now()
  roomCount: number
  /** North angle in degrees (CW from canvas-up) at save time — for display only. */
  northAngle?: number
  project: Project
}

export function loadProject(): Project | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Project
    // Migrate old openings that predate the glazing/size split.
    for (const o of p.openings) {
      if (!o.sizePresetId) o.sizePresetId = 'win-sz-standard'
    }
    // Migrate projects saved before scenarios were added.
    if (!p.scenarios) p.scenarios = []
    return p
  } catch {
    return null
  }
}

export function saveProject(project: Project): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(project))
  } catch {
    // Quota or serialization failure — non-fatal for this tool.
  }
}

export function exportProjectFile(project: Project): void {
  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${project.name.replace(/\s+/g, '-').toLowerCase() || 'heatflow'}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function loadLayouts(): LayoutSave[] {
  try {
    return JSON.parse(localStorage.getItem(LAYOUTS_KEY) ?? '[]') as LayoutSave[]
  } catch {
    return []
  }
}

export function persistLayouts(layouts: LayoutSave[]): void {
  try {
    localStorage.setItem(LAYOUTS_KEY, JSON.stringify(layouts))
  } catch { /* quota */ }
}

export function importProjectFile(file: File): Promise<Project> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result)) as Project)
      } catch (e) {
        reject(e)
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}
