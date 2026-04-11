import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const serviceRoot = path.resolve(__dirname, '..')
const packDir = path.join(serviceRoot, '.pack')

if (!existsSync(path.join(serviceRoot, 'dist', 'main.js'))) {
  throw new Error('dist/main.js 不存在，请先执行构建。')
}

rmSync(packDir, { recursive: true, force: true })
mkdirSync(packDir, { recursive: true })

cpSync(path.join(serviceRoot, 'dist'), path.join(packDir, 'dist'), {
  recursive: true,
})
cpSync(
  path.join(serviceRoot, 'package.json'),
  path.join(packDir, 'package.json'),
)

const installResult = spawnSync(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['install', '--omit=dev', '--no-fund', '--no-audit'],
  {
    cwd: packDir,
    stdio: 'inherit',
  },
)

if (installResult.status !== 0) {
  throw new Error(`.pack 依赖安装失败，exit code=${installResult.status}`)
}

console.log(`[api-service] pack prepared at: ${packDir}`)
