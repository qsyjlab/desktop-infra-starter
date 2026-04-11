import { createWriteStream, existsSync, mkdirSync, rmSync } from 'node:fs'
import { readdir, rename, stat } from 'node:fs/promises'
import { get } from 'node:https'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

type PlatformKey = 'mac-arm64' | 'win-x64'

interface CliOptions {
  platform: 'all' | PlatformKey
  version: string
  force: boolean
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(__dirname, '..')
const mysqlRoot = path.join(workspaceRoot, 'client', 'resources', 'mysql')
const downloadRoot = path.join(mysqlRoot, 'downloads')

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  const options: CliOptions = {
    platform: platformByRuntime(),
    version: '8.0.45',
    force: false,
  }

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i]
    const next = args[i + 1]

    if (token === '--platform' && next) {
      if (next === 'all' || next === 'mac-arm64' || next === 'win-x64') {
        options.platform = next
      }
      i += 1
      continue
    }

    if (token === '--version' && next) {
      options.version = next
      i += 1
      continue
    }

    if (token === '--force') {
      options.force = true
    }
  }

  return options
}

function platformByRuntime(): PlatformKey {
  if (process.platform === 'darwin' && process.arch === 'arm64') return 'mac-arm64'
  return 'win-x64'
}

function resolveTargets(platform: CliOptions['platform']) {
  if (platform === 'all') return ['mac-arm64', 'win-x64'] as PlatformKey[]
  return [platform]
}

function resolveDownloadConfig(version: string, platform: PlatformKey) {
  if (platform === 'mac-arm64') {
    return {
      url: `https://downloads.mysql.com/archives/get/p/23/file/mysql-${version}-macos15-arm64.tar.gz`,
      archiveName: `mysql-${version}-macos15-arm64.tar.gz`,
      outputDir: path.join(mysqlRoot, platform),
      extractedDirName: `mysql-${version}-macos15-arm64`,
      archiveType: 'tar.gz' as const,
    }
  }

  return {
    url: `https://downloads.mysql.com/archives/get/p/23/file/mysql-${version}-winx64.zip`,
    archiveName: `mysql-${version}-winx64.zip`,
    outputDir: path.join(mysqlRoot, platform),
    extractedDirName: `mysql-${version}-winx64`,
    archiveType: 'zip' as const,
  }
}

function runCommand(command: string, args: string[], cwd: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} 执行失败，退出码=${code}`))
    })
  })
}

function ensureDirs() {
  mkdirSync(mysqlRoot, { recursive: true })
  mkdirSync(downloadRoot, { recursive: true })
}

function downloadFile(url: string, targetFile: string) {
  return new Promise<void>((resolve, reject) => {
    const file = createWriteStream(targetFile)
    get(url, (response) => {
      if (
        response.statusCode &&
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        file.close()
        rmSync(targetFile, { force: true })
        void downloadFile(response.headers.location, targetFile).then(resolve).catch(reject)
        return
      }

      if (response.statusCode !== 200) {
        file.close()
        rmSync(targetFile, { force: true })
        reject(new Error(`下载失败，状态码=${response.statusCode}`))
        return
      }

      response.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
    })
      .on('error', (error) => {
        file.close()
        rmSync(targetFile, { force: true })
        reject(error)
      })
  })
}

async function extractArchive(
  archiveFile: string,
  outputDir: string,
  archiveType: 'zip' | 'tar.gz',
) {
  mkdirSync(outputDir, { recursive: true })
  const extractionWorkspace = path.join(outputDir, '.extracting')
  rmSync(extractionWorkspace, { recursive: true, force: true })
  mkdirSync(extractionWorkspace, { recursive: true })

  if (archiveType === 'zip') {
    await runCommand('unzip', ['-q', archiveFile, '-d', extractionWorkspace], workspaceRoot)
  } else {
    await runCommand('tar', ['-xzf', archiveFile, '-C', extractionWorkspace], workspaceRoot)
  }

  return extractionWorkspace
}

async function moveExtractedDir(extractionWorkspace: string, finalDir: string) {
  const entries = await stat(extractionWorkspace)
  if (!entries.isDirectory()) {
    throw new Error(`解压目录无效: ${extractionWorkspace}`)
  }

  const children = await readdir(extractionWorkspace, {
    withFileTypes: true,
  })
  const dirs = children.filter((entry) => entry.isDirectory())

  if (dirs.length !== 1) {
    throw new Error('解压结果异常，未找到唯一根目录。')
  }

  const source = path.join(extractionWorkspace, dirs[0].name)
  rmSync(finalDir, { recursive: true, force: true })
  await rename(source, finalDir)
  rmSync(extractionWorkspace, { recursive: true, force: true })
}

async function main() {
  const options = parseArgs()
  const targets = resolveTargets(options.platform)
  ensureDirs()

  for (const target of targets) {
    const config = resolveDownloadConfig(options.version, target)
    const archiveFile = path.join(downloadRoot, config.archiveName)
    const finalDir = path.join(config.outputDir, config.extractedDirName)

    if (existsSync(finalDir) && !options.force) {
      console.log(`[mysql-download] 已存在，跳过: ${finalDir}`)
      continue
    }

    if (options.force) {
      rmSync(finalDir, { recursive: true, force: true })
    }

    console.log(`[mysql-download] 下载 ${target}: ${config.url}`)
    await downloadFile(config.url, archiveFile)

    console.log(`[mysql-download] 解压 ${config.archiveName}`)
    const extractionWorkspace = await extractArchive(
      archiveFile,
      config.outputDir,
      config.archiveType,
    )
    await moveExtractedDir(extractionWorkspace, finalDir)

    console.log(`[mysql-download] 完成 ${target}: ${finalDir}`)
  }

  console.log('[mysql-download] 全部完成')
}

void main()
