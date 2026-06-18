import { create } from 'zustand'
import * as Comlink from 'comlink'
import type { Project } from '../model/types'
import type { SimResult } from '../sim/simulate'
import type { SimWorkerApi } from '../sim/sim.worker'

let workerApi: Comlink.Remote<SimWorkerApi> | null = null

function getWorker(): Comlink.Remote<SimWorkerApi> {
  if (!workerApi) {
    const worker = new Worker(new URL('../sim/sim.worker.ts', import.meta.url), {
      type: 'module',
    })
    workerApi = Comlink.wrap<SimWorkerApi>(worker)
  }
  return workerApi
}

interface SimState {
  result: SimResult | null
  running: boolean
  error: string | null
  /** Current playback frame index. */
  frame: number
  playing: boolean
  /** Playback speed multiplier. */
  speed: number
  run: (project: Project) => Promise<void>
  setFrame: (f: number) => void
  setPlaying: (p: boolean) => void
  setSpeed: (s: number) => void
  clear: () => void
}

export const useSimStore = create<SimState>((set, get) => ({
  result: null,
  running: false,
  error: null,
  frame: 0,
  playing: false,
  speed: 1,

  run: async (project) => {
    set({ running: true, error: null, playing: false })
    try {
      const result = await getWorker().run(project)
      set({ result, running: false, frame: 0 })
    } catch (e) {
      set({ running: false, error: e instanceof Error ? e.message : String(e) })
    }
  },

  setFrame: (frame) => {
    const result = get().result
    if (!result) return
    set({ frame: Math.max(0, Math.min(result.hours.length - 1, frame)) })
  },

  setPlaying: (playing) => set({ playing }),
  setSpeed: (speed) => set({ speed }),
  clear: () => set({ result: null, frame: 0, playing: false, error: null }),
}))
