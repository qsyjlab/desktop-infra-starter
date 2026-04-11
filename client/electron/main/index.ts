import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '../..')
const APP_ROOT = process.env.APP_ROOT || path.join(__dirname, '../..')

export const MAIN_DIST = path.join(APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

const WORKSPACE_ROOT = path.resolve(APP_ROOT, '..')
const API_READY_URL = process.env.VITE_API_READY_URL || 'http://127.0.0.1:37001/ready'
const API_START_TIMEOUT_MS = 35_000

type DbMode = 'none' | 'external' | 'embedded'
type StartupPhase = 'idle' | 'starting_embedded_db' | 'starting_api' | 'ready' | 'error'

function resolveDbMode(): DbMode {
  const raw = (process.env.DB_MODE || '').trim().toLowerCase()
  if (raw === 'none' || raw === 'external' || raw === 'embedded') return raw
  if (process.env.EMBEDDED_MYSQL_ENABLED === 'true') return 'embedded'
  return 'external'
}

const DB_MODE = resolveDbMode()
const EMBEDDED_MYSQL_HOST = '127.0.0.1'
const EMBEDDED_MYSQL_PORT = Number(process.env.EMBEDDED_MYSQL_PORT || 46307)
const EXTERNAL_MYSQL_HOST = process.env.MYSQL_HOST || '127.0.0.1'
const EXTERNAL_MYSQL_PORT = Number(process.env.MYSQL_PORT || 3306)

let startupLogFile = ''

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(APP_ROOT, 'public')
  : RENDERER_DIST

if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null
let apiProcess: ChildProcess | null = null
let embeddedMysqlProcess: ChildProcess | null = null
let startupPhase: StartupPhase = 'idle'
let startupErrorMessage = ''

const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

interface RuntimeStatusPayload {
  phase: StartupPhase
  api: {
    healthy: boolean
    processAlive: boolean
  }
  database: {
    enabled: boolean
    processAlive: boolean
    connected: boolean
    mode: DbMode
  }
  ready: boolean
  errorMessage?: string
}

function emitStartupStatus(payload: Partial<RuntimeStatusPayload> = {}) {
  if (!win || win.isDestroyed()) return
  win.webContents.send('runtime:startup-status', {
    phase: startupPhase,
    ready: startupPhase === 'ready',
    errorMessage: startupErrorMessage || undefined,
    ...payload,
  })
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function logStartup(message: string) {
  const text = `[${new Date().toISOString()}] ${message}\n`
  console.log(text.trim())
  if (!startupLogFile) return
  fs.appendFileSync(startupLogFile, text, 'utf8')
}

async function isApiReady() {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 1500)
  try {
    const res = await fetch(API_READY_URL, {
      method: 'GET',
      signal: controller.signal,
    })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

async function waitForApiReady(timeoutMs = API_START_TIMEOUT_MS) {
  const startAt = Date.now()
  let okCount = 0
  while (Date.now() - startAt < timeoutMs) {
    if (await isApiReady()) {
      okCount += 1
      if (okCount >= 2) return true
    } else {
      okCount = 0
    }
    await delay(400)
  }
  return false
}

async function isPortReady(host: string, port: number) {
  return new Promise<boolean>((resolve) => {
    const socket = new net.Socket()
    const done = (ready: boolean) => {
      socket.destroy()
      resolve(ready)
    }
    socket.setTimeout(1000)
    socket.once('connect', () => done(true))
    socket.once('timeout', () => done(false))
    socket.once('error', () => done(false))
    socket.connect(port, host)
  })
}

async function waitForPortReady(host: string, port: number, timeoutMs = 25_000) {
  const startAt = Date.now()
  while (Date.now() - startAt < timeoutMs) {
    if (await isPortReady(host, port)) return true
    await delay(500)
  }
  return false
}

function resolveExternalPortProbe() {
  const mysqlUrl = process.env.MYSQL_URL
  if (mysqlUrl) {
    try {
      const url = new URL(mysqlUrl)
      return {
        host: url.hostname,
        port: Number(url.port || 3306),
      }
    } catch {
      return null
    }
  }
  return {
    host: EXTERNAL_MYSQL_HOST,
    port: EXTERNAL_MYSQL_PORT,
  }
}

async function getDatabaseConnectedStatus() {
  if (DB_MODE === 'none') return false
  if (DB_MODE === 'embedded') {
    return isPortReady(EMBEDDED_MYSQL_HOST, EMBEDDED_MYSQL_PORT)
  }
  const probe = resolveExternalPortProbe()
  if (!probe) return false
  return isPortReady(probe.host, probe.port)
}

async function getRuntimeStatus(): Promise<RuntimeStatusPayload> {
  const apiHealthy = await isApiReady()
  const dbConnected = await getDatabaseConnectedStatus()
  return {
    phase: startupPhase,
    api: {
      healthy: apiHealthy,
      processAlive: Boolean(apiProcess && !apiProcess.killed),
    },
    database: {
      enabled: DB_MODE !== 'none',
      processAlive:
        DB_MODE === 'embedded'
          ? Boolean(embeddedMysqlProcess && !embeddedMysqlProcess.killed)
          : false,
      connected: dbConnected,
      mode: DB_MODE,
    },
    ready: startupPhase === 'ready',
    errorMessage: startupErrorMessage || undefined,
  }
}

function resolveMysqlBaseFromRoot(mysqlRoot: string) {
  const platformDir =
    process.platform === 'win32'
      ? 'win-x64'
      : process.platform === 'darwin' && process.arch === 'arm64'
        ? 'mac-arm64'
        : null
  if (!platformDir) return null

  const platformRoot = path.join(mysqlRoot, platformDir)
  if (!fs.existsSync(platformRoot)) return null

  const directBin =
    process.platform === 'win32'
      ? path.join(platformRoot, 'bin', 'mysqld.exe')
      : path.join(platformRoot, 'bin', 'mysqld')

  if (fs.existsSync(directBin)) return platformRoot

  const children = fs.readdirSync(platformRoot, { withFileTypes: true })
  const nested = children.find((entry) => entry.isDirectory())
  if (!nested) return null

  const nestedRoot = path.join(platformRoot, nested.name)
  const nestedBin =
    process.platform === 'win32'
      ? path.join(nestedRoot, 'bin', 'mysqld.exe')
      : path.join(nestedRoot, 'bin', 'mysqld')
  return fs.existsSync(nestedBin) ? nestedRoot : null
}

async function startEmbeddedMysql(mysqlRoot: string) {
  if (!(process.platform === 'win32' || process.platform === 'darwin')) return
  if (await isPortReady(EMBEDDED_MYSQL_HOST, EMBEDDED_MYSQL_PORT)) return

  const mysqlBase = resolveMysqlBaseFromRoot(mysqlRoot)
  if (!mysqlBase) {
    throw new Error('未找到内置 MySQL 目录，请执行 pnpm db:download 后重试。')
  }

  const mysqld =
    process.platform === 'win32'
      ? path.join(mysqlBase, 'bin', 'mysqld.exe')
      : path.join(mysqlBase, 'bin', 'mysqld')

  const mysqlDataRoot = path.join(app.getPath('userData'), 'mysql')
  const dataDir = path.join(mysqlDataRoot, 'data')
  const logDir = path.join(mysqlDataRoot, 'logs')
  const logFile = path.join(logDir, 'mysql-error.log')

  if (!fs.existsSync(mysqld)) {
    throw new Error(`未找到内置 MySQL 可执行文件: ${mysqld}`)
  }

  fs.mkdirSync(dataDir, { recursive: true })
  fs.mkdirSync(logDir, { recursive: true })

  const hasInnoDbFile = fs.existsSync(path.join(dataDir, 'ibdata1'))
  if (!hasInnoDbFile) {
    logStartup(`初始化内置 MySQL 数据目录: ${dataDir}`)
    const init = spawn(
      mysqld,
      ['--initialize-insecure', `--basedir=${mysqlBase}`, `--datadir=${dataDir}`],
      {
        cwd: mysqlBase,
        windowsHide: process.platform === 'win32',
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )

    await new Promise<void>((resolve, reject) => {
      let stderr = ''
      init.stderr?.on('data', (d) => {
        stderr += String(d)
      })
      init.on('exit', (code) => {
        if (code === 0) resolve()
        else reject(new Error(`MySQL 初始化失败(code=${code}): ${stderr.trim()}`))
      })
      init.on('error', reject)
    })
  }

  logStartup(`启动内置 MySQL: host=${EMBEDDED_MYSQL_HOST} port=${EMBEDDED_MYSQL_PORT}`)
  embeddedMysqlProcess = spawn(
    mysqld,
    [
      `--basedir=${mysqlBase}`,
      `--datadir=${dataDir}`,
      `--port=${EMBEDDED_MYSQL_PORT}`,
      '--bind-address=127.0.0.1',
      '--skip-networking=0',
      `--log-error=${logFile}`,
      '--console',
    ],
    {
      cwd: mysqlBase,
      windowsHide: process.platform === 'win32',
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  embeddedMysqlProcess.stdout?.on('data', (data) => {
    logStartup(`[mysql] ${String(data).trim()}`)
  })
  embeddedMysqlProcess.stderr?.on('data', (data) => {
    logStartup(`[mysql][err] ${String(data).trim()}`)
  })
  embeddedMysqlProcess.on('exit', (code, signal) => {
    logStartup(`mysql 退出: code=${code ?? 'null'} signal=${signal ?? 'null'}`)
  })

  const ready = await waitForPortReady(EMBEDDED_MYSQL_HOST, EMBEDDED_MYSQL_PORT)
  if (!ready) {
    throw new Error(`内置 MySQL 启动超时，请检查日志: ${logFile}`)
  }
}

async function ensureEmbeddedMysql() {
  if (DB_MODE !== 'embedded') return
  const mysqlRoot = VITE_DEV_SERVER_URL
    ? path.join(WORKSPACE_ROOT, 'client', 'resources', 'mysql')
    : path.join(process.resourcesPath, 'mysql')
  await startEmbeddedMysql(mysqlRoot)
}

function resolveApiEnv() {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DB_MODE,
  }
  if (DB_MODE === 'embedded') {
    env.MYSQL_HOST = EMBEDDED_MYSQL_HOST
    env.MYSQL_PORT = String(EMBEDDED_MYSQL_PORT)
    env.MYSQL_USER = process.env.MYSQL_USER || 'root'
    env.MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || ''
    env.MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'desktop_infra'
  }
  return env
}

async function ensureApiServiceForDev() {
  if (!VITE_DEV_SERVER_URL) return
  if (await isApiReady()) return

  logStartup('dev 模式：尝试自动拉起 api-service')
  apiProcess = spawn(
    'pnpm',
    ['--dir', WORKSPACE_ROOT, '--filter', '@desktop-infra/api-service', 'dev'],
    {
      cwd: WORKSPACE_ROOT,
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: resolveApiEnv(),
    },
  )

  apiProcess.stdout?.on('data', (data) => {
    logStartup(`[api-service] ${String(data).trim()}`)
  })
  apiProcess.stderr?.on('data', (data) => {
    logStartup(`[api-service][err] ${String(data).trim()}`)
  })

  const ready = await waitForApiReady()
  if (!ready) {
    throw new Error('api-service 启动超时，请检查终端日志。')
  }
}

async function ensureApiServiceForProd() {
  if (VITE_DEV_SERVER_URL) return
  if (await isApiReady()) return

  const apiEntry = path.join(process.resourcesPath, 'api-serivce', 'dist', 'main.js')
  const apiCwd = path.join(process.resourcesPath, 'api-serivce')

  if (!fs.existsSync(apiEntry)) {
    throw new Error(`未找到内嵌 API 入口文件: ${apiEntry}`)
  }

  apiProcess = spawn(process.execPath, [apiEntry], {
    cwd: apiCwd,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...resolveApiEnv(),
      ELECTRON_RUN_AS_NODE: '1',
      API_HOST: process.env.API_HOST || '127.0.0.1',
      API_PORT: process.env.API_PORT || '37001',
    },
  })

  apiProcess.stdout?.on('data', (data) => {
    logStartup(`[api-service] ${String(data).trim()}`)
  })
  apiProcess.stderr?.on('data', (data) => {
    logStartup(`[api-service][err] ${String(data).trim()}`)
  })

  const ready = await waitForApiReady()
  if (!ready) {
    throw new Error('打包环境 api-service 启动超时，请检查资源文件与日志。')
  }
}

function stopApiService() {
  if (!apiProcess || apiProcess.killed) return
  if (process.platform === 'win32' && apiProcess.pid) {
    spawn('taskkill', ['/pid', String(apiProcess.pid), '/T', '/F'], {
      shell: true,
      stdio: 'ignore',
    })
  } else {
    apiProcess.kill('SIGTERM')
  }
  apiProcess = null
}

function stopEmbeddedMysql() {
  if (!embeddedMysqlProcess || embeddedMysqlProcess.killed) return
  if (process.platform === 'win32' && embeddedMysqlProcess.pid) {
    spawn('taskkill', ['/pid', String(embeddedMysqlProcess.pid), '/T', '/F'], {
      shell: true,
      stdio: 'ignore',
    })
  } else {
    embeddedMysqlProcess.kill('SIGTERM')
  }
  embeddedMysqlProcess = null
}

async function createWindow() {
  win = new BrowserWindow({
    title: 'Desktop Infra Starter',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    width: 1460,
    height: 920,
    minWidth: 1200,
    minHeight: 760,
    center: true,
    webPreferences: {
      preload,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
    emitStartupStatus()
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(async () => {
  const logDir = path.join(app.getPath('userData'), 'logs')
  fs.mkdirSync(logDir, { recursive: true })
  startupLogFile = path.join(logDir, 'startup.log')

  try {
    await createWindow()
    startupErrorMessage = ''

    if (DB_MODE === 'embedded') {
      startupPhase = 'starting_embedded_db'
      emitStartupStatus()
      await ensureEmbeddedMysql()
    }

    startupPhase = 'starting_api'
    emitStartupStatus()
    await ensureApiServiceForDev()
    await ensureApiServiceForProd()

    startupPhase = 'ready'
    emitStartupStatus(await getRuntimeStatus())
  } catch (error) {
    startupPhase = 'error'
    startupErrorMessage = error instanceof Error ? error.message : String(error)
    emitStartupStatus()
    dialog.showErrorBox('启动失败', startupErrorMessage)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  stopApiService()
  stopEmbeddedMysql()
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  stopApiService()
  stopEmbeddedMysql()
})

ipcMain.handle('runtime:get-status', async () => getRuntimeStatus())
ipcMain.handle('runtime:get-log-file', async () => startupLogFile || null)

ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })
  if (VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})
