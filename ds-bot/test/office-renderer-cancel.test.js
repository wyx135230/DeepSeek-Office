import assert from 'node:assert/strict'
import { test } from 'node:test'
import { build } from 'esbuild'
import { runInNewContext } from 'node:vm'
import { fileURLToPath } from 'node:url'

const stubs = {
  phaser: `export default { Scene: class {}, Game: class {
    constructor(config) { __test.Scene=config.scene; this.canvas={classList:{add(){}}}; this.scale={width:800,height:600}; __test.started() }
    destroy() { __test.destroyed++ }
  } }`,
  'worker-3d': 'export async function loadOfficeCharacters(){return {dispose(){__test.charactersDisposed++}}} export function makeWorker(){throw new Error("Preload has not completed")}',
  'elevator-3d': 'export async function loadOfficeElevator(){return {dispose(){__test.elevatorDisposed++}}}',
  'television-3d': 'export async function loadOfficeTelevision(){return {dispose(){__test.televisionDisposed++}}}',
  'view-3d': 'export function createOfficeView(){__test.createdViews++;throw new Error("Late scene creation")}',
}
const bundled = await build({
  entryPoints: [fileURLToPath(new URL('../src/client/office/renderer.js', import.meta.url))],
  bundle: true, format: 'cjs', platform: 'node', write: false,
  loader: { '.png': 'dataurl', '.glb': 'dataurl' },
  plugins: [{ name: 'initialization-boundaries', setup(build) {
    build.onResolve({ filter: /^(phaser|\.\/worker-3d\.js|\.\/elevator-3d\.js|\.\/television-3d\.js|\.\/view-3d\.js)$/ }, args => ({ path: args.path === 'phaser' ? 'phaser' : args.path.slice(2, -3), namespace: 'initialization-stub' }))
    build.onLoad({ filter: /.*/, namespace: 'initialization-stub' }, args => ({ contents: stubs[args.path], loader: 'js' }))
  } }],
})

test('aborting while Phaser preload is pending releases game, models, observers and input listeners', async () => {
  let start
  const started = new Promise(resolve => { start = resolve })
  const tracked = { started: start, destroyed: 0, charactersDisposed: 0, elevatorDisposed: 0, televisionDisposed: 0, disconnected: 0, createdViews: 0 }
  const listeners = new Map(), elementListeners = new Map()
  const element = { clientWidth: 800, clientHeight: 600, closest: () => null,
    addEventListener: (name, fn) => elementListeners.set(name, fn), removeEventListener: name => elementListeners.delete(name) }
  class Observer { observe() {} disconnect() { tracked.disconnected++ } }
  const module = { exports: {} }
  runInNewContext(bundled.outputFiles[0].text, { module, exports: module.exports, __test: tracked,
    window: { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) },
    document: {}, ResizeObserver: Observer, MutationObserver: Observer, DOMException,
    console, performance, setTimeout, clearTimeout, TextDecoder, TextEncoder, URL,
  })
  const controller = new AbortController()
  const pending = module.exports.createOfficeRenderer(element, { floor: { id: 'a', members: [] }, signal: controller.signal })
  await started
  controller.abort()
  await assert.rejects(pending, error => error.name === 'AbortError')
  // Phaser destruction is deferred until its next frame; an already queued
  // image-load completion must not resurrect the Three scene in that interval.
  new tracked.Scene().create()
  assert.equal(tracked.createdViews, 0)
  assert.equal(tracked.destroyed, 1)
  assert.equal(tracked.charactersDisposed, 1); assert.equal(tracked.elevatorDisposed, 1)
  assert.equal(tracked.televisionDisposed, 1)
  assert.equal(tracked.disconnected, 2)
  assert.equal(listeners.size, 0); assert.equal(elementListeners.size, 0)
})
