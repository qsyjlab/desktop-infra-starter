import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
})

// --------- Preload scripts loading ---------
function domReady(condition: DocumentReadyState[] = ['complete', 'interactive']) {
  return new Promise((resolve) => {
    if (condition.includes(document.readyState)) {
      resolve(true)
    } else {
      document.addEventListener('readystatechange', () => {
        if (condition.includes(document.readyState)) {
          resolve(true)
        }
      })
    }
  })
}

const safeDOM = {
  append(parent: HTMLElement, child: HTMLElement) {
    if (!Array.from(parent.children).find(e => e === child)) {
      return parent.appendChild(child)
    }
  },
  remove(parent: HTMLElement, child: HTMLElement) {
    if (Array.from(parent.children).find(e => e === child)) {
      return parent.removeChild(child)
    }
  },
}

/**
 * https://tobiasahlin.com/spinkit
 * https://connoratherton.com/loaders
 * https://projects.lukehaas.me/css-loaders
 * https://matejkustec.github.io/SpinThatShit
 */
function useLoading() {
  const className = `loaders-css__square-spin`
  const styleContent = `
@keyframes square-spin {
  25% { transform: perspective(100px) rotateX(180deg) rotateY(0); }
  50% { transform: perspective(100px) rotateX(180deg) rotateY(180deg); }
  75% { transform: perspective(100px) rotateX(0) rotateY(180deg); }
  100% { transform: perspective(100px) rotateX(0) rotateY(0); }
}
.${className} > div {
  animation-fill-mode: both;
  width: 50px;
  height: 50px;
  background: #fff;
  animation: square-spin 3s 0s cubic-bezier(0.09, 0.57, 0.49, 0.9) infinite;
}
.app-loading-wrap {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #282c34;
  z-index: 9;
}
.app-loading-text {
  margin-top: 12px;
  color: #dbe6ff;
  font-size: 14px;
  letter-spacing: 0.2px;
  text-align: center;
}
    `
  const oStyle = document.createElement('style')
  const oDiv = document.createElement('div')
  const textId = 'app-loading-text'

  oStyle.id = 'app-loading-style'
  oStyle.innerHTML = styleContent
  oDiv.className = 'app-loading-wrap'
  oDiv.innerHTML = `<div><div class="${className}"><div></div></div><div id="${textId}" class="app-loading-text">正在启动本地服务...</div></div>`

  const setText = (text: string) => {
    const el = document.getElementById(textId)
    if (el) el.textContent = text
  }

  return {
    appendLoading() {
      safeDOM.append(document.head, oStyle)
      safeDOM.append(document.body, oDiv)
    },
    removeLoading() {
      safeDOM.remove(document.head, oStyle)
      safeDOM.remove(document.body, oDiv)
    },
    setLoadingText(text: string) {
      setText(text)
    },
  }
}

// ----------------------------------------------------------------------

const { appendLoading, removeLoading, setLoadingText } = useLoading()
domReady().then(appendLoading)

interface RuntimeStartupStatus {
  phase?: 'idle' | 'starting_embedded_db' | 'starting_api' | 'ready' | 'error'
  ready?: boolean
  errorMessage?: string
  api?: {
    healthy?: boolean
    processAlive?: boolean
  }
  database?: {
    enabled?: boolean
    processAlive?: boolean
    connected?: boolean
    mode?: string
  }
}

let statusPollingTimer: ReturnType<typeof setTimeout> | null = null

function clearStatusPolling() {
  if (statusPollingTimer) {
    clearTimeout(statusPollingTimer)
    statusPollingTimer = null
  }
}

function renderStartupStatus(payload?: RuntimeStartupStatus) {
  const phase = payload?.phase

  if (payload?.ready) {
    clearStatusPolling()
    removeLoading()
    return
  }

  if (phase === 'error') {
    setLoadingText(`启动失败: ${payload?.errorMessage || '请检查 startup.log'}`)
    return
  }

  if (payload?.database?.enabled && payload?.database?.connected === false) {
    setLoadingText('等待数据库就绪...')
    return
  }

  if (payload?.api?.healthy === false || phase === 'starting_api') {
    setLoadingText('等待接口就绪...(/ready)')
    return
  }

  if (phase === 'starting_embedded_db') {
    setLoadingText('正在启动本地数据库...')
    return
  }

  setLoadingText('正在启动本地服务...')
}

async function pollRuntimeStatus() {
  try {
    const status = (await ipcRenderer.invoke('runtime:get-status')) as RuntimeStartupStatus
    renderStartupStatus(status)
    if (!status?.ready) {
      statusPollingTimer = setTimeout(() => {
        void pollRuntimeStatus()
      }, 900)
    }
  } catch {
    setLoadingText('正在等待主进程状态...')
    statusPollingTimer = setTimeout(() => {
      void pollRuntimeStatus()
    }, 1200)
  }
}

ipcRenderer.on('runtime:startup-status', (_event, payload) => {
  renderStartupStatus(payload as RuntimeStartupStatus)
})

void pollRuntimeStatus()
