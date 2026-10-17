// A local mock DSH for the office. Never uses or imports the user's own DSH_HOME.
import { spawn } from 'node:child_process'
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const plugin = dirname(dirname(fileURLToPath(import.meta.url)))
const root = dirname(plugin)
const name = process.env.OFFICE_BENCH_NAME ?? 'office'
if (!/^[a-z0-9-]{1,40}$/.test(name)) throw new Error('Use a short alphanumeric test bench name')
const home = join(root, `.dsh-test-${name}`)
const port = Number(process.env.OFFICE_WEB_PORT ?? 3106)
const mockPort = Number(process.env.OFFICE_MOCK_PORT ?? 8806)
const pkg = JSON.parse(readFileSync(join(plugin, 'package.json'), 'utf8'))
const profile = join(home, 'profiles', 'web')
const cli = join(plugin, 'dev', 'harness', 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
if (!existsSync(cli)) throw new Error('Run npm run harness first')
if (port === 3080 || !Number.isInteger(port) || !Number.isInteger(mockPort) || port === mockPort) throw new Error('Use distinct test ports, never the live DSH port 3080')

async function free(value) {
  await new Promise((done, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(value, '127.0.0.1', () => server.close(done))
  })
}
await free(port)
await free(mockPort)
mkdirSync(profile, { recursive: true })
if (!existsSync(join(profile, 'package.json'))) writeFileSync(join(profile, 'package.json'), `${JSON.stringify({ name: 'office-test-profile', private: true, dependencies: { [pkg.name]: `file:${plugin}` }, dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', pkg.name] } } }, null, 2)}\n`)
writeFileSync(join(profile, 'pnpm-workspace.yaml'), 'packages:\n  - .\n\nnodeLinker: hoisted\nautoInstallPeers: false\n')
const overlay = join(home, 'office.patch.yml')
writeFileSync(overlay, '- id: bot\n  config:\n    checkRatio: 0.45\n- id: llm-deepseek\n  config:\n    models:\n      - { id: deepseek-flash, contextWindow: 100000, maxTokens: 8000, inputModalities: [text, image] }\n      - { id: deepseek-v4-pro, contextWindow: 100000, maxTokens: 8000 }\n')
const env = { ...process.env, DSH_HOME: home, DSH_TELEMETRY_DISABLED: '1', DEEPSEEK_API_KEY: 'mock-key', DEEPSEEK_BASE_URL: `http://127.0.0.1:${mockPort}/v1`, MOCK_PORT: String(mockPort), MOCK_LOG: join(home, 'mock.jsonl'), MOCK_DELAY_MS: '150' }
const children = []
let stopping = false
function stop() {
  if (stopping) return
  stopping = true
  for (const child of children) child.kill('SIGTERM')
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, stop)
process.once('exit', stop)
function launch(script, args, logName) {
  const log = createWriteStream(join(home, logName), { flags: 'w' })
  const child = spawn(process.execPath, [script, ...args], { cwd: plugin, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  child.stdout.pipe(log); child.stderr.pipe(log)
  child.once('error', (error) => { console.error(error.message); stop(); process.exitCode = 1 })
  child.once('exit', (code) => { if (!stopping) { console.error(`${logName} exited (${code}); inspect the local test log`); stop(); process.exitCode = code || 1 } })
  children.push(child)
}
launch(join(plugin, 'dev', 'mock-llm.mjs'), [home], 'mock.out')
launch(cli, ['--profile', 'web', '--patch', overlay, '--no-open', '--port', String(port)], 'web.log')
console.log(`Office mock bench starting at http://127.0.0.1:${port}. Data: ${resolve(home)}. Stop with Ctrl+C.`)
