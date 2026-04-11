import { ref } from 'vue'

export interface RuntimeStatus {
  phase: 'idle' | 'starting_api' | 'starting_embedded_db' | 'ready' | 'error'
  ready: boolean
  errorMessage?: string
  api?: {
    healthy: boolean
    processAlive: boolean
  }
  database?: {
    enabled: boolean
    processAlive: boolean
    connected: boolean
    mode: string
  }
}

const runtimeStatus = ref<RuntimeStatus>({
  phase: 'idle',
  ready: false,
})

let initialized = false
let listener: ((event: unknown, payload: unknown) => void) | null = null

function setStatus(payload: Partial<RuntimeStatus>) {
  runtimeStatus.value = {
    ...runtimeStatus.value,
    ...payload,
  }
}

async function initRuntime() {
  if (initialized) return
  initialized = true

  listener = (_event: unknown, payload: unknown) => {
    setStatus(payload as RuntimeStatus)
  }

  window.ipcRenderer.on('runtime:startup-status', listener)
  const initial = (await window.ipcRenderer.invoke('runtime:get-status')) as RuntimeStatus
  runtimeStatus.value = initial
}

function disposeRuntime() {
  if (!listener) return
  window.ipcRenderer.off('runtime:startup-status', listener)
  listener = null
  initialized = false
}

export function useRuntimeStore() {
  return {
    runtimeStatus,
    initRuntime,
    disposeRuntime,
  }
}
