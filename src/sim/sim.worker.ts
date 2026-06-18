import * as Comlink from 'comlink'
import type { Project } from '../model/types'
import { simulate, type SimResult } from './simulate'

const api = {
  run(project: Project): SimResult {
    return simulate(project)
  },
}

export type SimWorkerApi = typeof api

Comlink.expose(api)
