import { create } from 'zustand'
import * as Comlink from 'comlink'
import type { Project, Scenario } from '../model/types'
import type { SimResult } from '../sim/simulate'
import type { SimWorkerApi } from '../sim/sim.worker'
import { runOptimizer as runOptimizerAlgo, type OptimizerInventory, type OptimizerResult } from '../optimizer/optimizer'

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

/** Apply a saved scenario's open states to a project copy. */
function applyScenario(project: Project, scenario: Scenario): Project {
  return {
    ...project,
    openings: project.openings.map((o) => {
      const state = scenario.openStates[o.id]
      if (state === undefined) return o
      if (state === 'auto') return { ...o, autoOpen: true, isOpen: false }
      return { ...o, autoOpen: false, isOpen: state }
    }),
  }
}

interface ScenarioRun {
  result: SimResult
  runAt: number
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
  /** Optional comparison run (a second scenario overlaid in the chart). */
  compResult: SimResult | null
  compLabel: string | null
  compRunning: boolean
  compError: string | null
  /** Per-scenario simulation results for the Compare tab. */
  scenarioResults: Record<string, ScenarioRun>
  /** Scenario IDs currently being computed. */
  scenarioRunning: Record<string, boolean>
  run: (project: Project) => Promise<void>
  runComparison: (project: Project, scenario: Scenario) => Promise<void>
  clearComparison: () => void
  runScenario: (project: Project, scenario: Scenario) => Promise<void>
  runAllScenarios: (project: Project) => Promise<void>
  clearScenarioResults: () => void
  optimizerRunning: boolean
  optimizerProgress: number
  optimizerResults: OptimizerResult[]
  optimizerError: string | null
  runOptimizer: (project: Project, inventory: OptimizerInventory) => Promise<void>
  clearOptimizer: () => void
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
  compResult: null,
  compLabel: null,
  compRunning: false,
  compError: null,
  scenarioResults: {},
  scenarioRunning: {},
  optimizerRunning: false,
  optimizerProgress: 0,
  optimizerResults: [],
  optimizerError: null,

  run: async (project) => {
    set({ running: true, error: null, playing: false })
    try {
      const result = await getWorker().run(project)
      set({ result, running: false, frame: 0 })
    } catch (e) {
      set({ running: false, error: e instanceof Error ? e.message : String(e) })
    }
  },

  runComparison: async (project, scenario) => {
    set({ compRunning: true, compError: null })
    try {
      const derived = applyScenario(project, scenario)
      const compResult = await getWorker().run(derived)
      set({ compResult, compLabel: scenario.name, compRunning: false })
    } catch (e) {
      set({ compRunning: false, compError: e instanceof Error ? e.message : String(e) })
    }
  },

  clearComparison: () => set({ compResult: null, compLabel: null, compError: null }),

  runScenario: async (project, scenario) => {
    set((s) => ({ scenarioRunning: { ...s.scenarioRunning, [scenario.id]: true } }))
    try {
      const derived = applyScenario(project, scenario)
      const result = await getWorker().run(derived)
      set((s) => ({
        scenarioResults: { ...s.scenarioResults, [scenario.id]: { result, runAt: Date.now() } },
        scenarioRunning: { ...s.scenarioRunning, [scenario.id]: false },
      }))
    } catch {
      set((s) => ({ scenarioRunning: { ...s.scenarioRunning, [scenario.id]: false } }))
    }
  },

  runAllScenarios: async (project) => {
    const { scenarios } = project
    await Promise.all(scenarios.map((sc) => get().runScenario(project, sc)))
  },

  clearScenarioResults: () => set({ scenarioResults: {}, scenarioRunning: {} }),

  runOptimizer: async (project, inventory) => {
    set({ optimizerRunning: true, optimizerProgress: 0, optimizerError: null, optimizerResults: [] })
    try {
      const results = await runOptimizerAlgo(project, inventory, (p) => {
        set({ optimizerProgress: p })
      })
      set({ optimizerResults: results, optimizerRunning: false, optimizerProgress: 1 })
    } catch (e) {
      set({ optimizerRunning: false, optimizerError: e instanceof Error ? e.message : String(e) })
    }
  },

  clearOptimizer: () => set({ optimizerResults: [], optimizerError: null, optimizerProgress: 0 }),

  setFrame: (frame) => {
    const result = get().result
    if (!result) return
    set({ frame: Math.max(0, Math.min(result.hours.length - 1, frame)) })
  },

  setPlaying: (playing) => set({ playing }),
  setSpeed: (speed) => set({ speed }),
  clear: () => set({ result: null, frame: 0, playing: false, error: null, compResult: null, compLabel: null }),
}))
