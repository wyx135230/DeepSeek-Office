import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, test } from 'node:test'
import { cleanVersion, install, newer, sourceOf } from '../src/host/update.js'

const PKG = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const flush = () => new Promise(resolve => setImmediate(resolve))
const realFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = realFetch })

// The update module alone, on a stub plugin manager and a scripted fetch.
function start({ source, registries, answers = {}, result = { application: 'restart-required' }, config = {}, profileDir, manager = {} }) {
  const fetched = []
  const installs = []
  const warnings = []
  globalThis.fetch = async (url) => {
    fetched.push(url)
    const answer = answers[url]
    if (answer === undefined) return { ok: false, status: 404, json: async () => ({}) }
    if (answer instanceof Error) throw answer
    return { ok: true, status: 200, json: async () => answer }
  }
  const pluginManager = {
    listBundles: async () => [{ name: 'other', source: 'other@^1.0.0' }, ...(source === undefined ? [] : [{ name: PKG.name, source }])],
    registries: async () => registries ?? { registry: null, fallbackRegistries: ['https://registry.npmmirror.com/'], resolved: 'https://registry.npmjs.org/' },
    installBundle: async (spec, options) => { installs.push([spec, options]); return typeof result === 'function' ? result() : result },
    ...manager,
  }
  const rt = {
    ctx: { get: name => (name === 'pluginManager' ? pluginManager : name === 'profileContext' && profileDir ? { dir: profileDir } : undefined), effect() {} },
    config,
    warn: (...args) => warnings.push(args),
  }
  install(rt)
  return { rt, fetched, installs, warnings, pluginManager }
}

const updateOffer = {
  source: `${PKG.name}@^${PKG.version}`,
  answers: { [`https://registry.npmjs.org/${PKG.name}/latest`]: { version: '9.0.0' } },
}

test('HMR updates remove the installed bundle and continue after the caller is disposed', async () => {
  const calls = []
  let rt
  const fixture = start({ ...updateOffer, manager: {
    listBundles: async () => [{ name: PKG.name, source: updateOffer.source, version: PKG.version, installed: true, removable: true, enabled: true }],
    removeBundle: async name => {
      calls.push(['remove', name])
      rt.ctx.get = () => { throw new Error('caller disposed') }
      return { application: 'applied' }
    },
    installBundle: async (spec, options) => {
      calls.push(['install', spec, options])
      return calls.length === 1 ? { application: 'failed', error: { code: 'already-installed' } } : { application: 'applied', version: '9.0.0' }
    },
  } })
  rt = fixture.rt
  await rt.updateCheck()
  rt.updateStart()
  rt.updateStart()
  await flush()
  assert.equal(rt.updateView().phase, 'installed')
  assert.deepEqual(calls, [
    ['install', `${PKG.name}@9.0.0`, { registry: 'https://registry.npmjs.org/' }],
    ['remove', PKG.name],
    ['install', `${PKG.name}@9.0.0`, { registry: 'https://registry.npmjs.org/', enabled: true }],
  ])
})

test('a failed HMR replacement reinstalls the previous exact version and selection', async () => {
  const calls = []
  const { rt, warnings } = start({ ...updateOffer, manager: {
    listBundles: async () => [{ name: PKG.name, source: updateOffer.source, version: PKG.version, installed: true, removable: true, enabled: false }],
    removeBundle: async () => ({ application: 'applied' }),
    installBundle: async (spec, options) => {
      calls.push([spec, options])
      return calls.length === 1 ? { application: 'failed', error: { code: 'already-installed' } }
        : calls.length === 2 ? { application: 'failed', error: { code: 'operation-error', diagnostic: 'network offline' } }
          : { application: 'applied', version: PKG.version }
    },
  } })
  await rt.updateCheck()
  rt.updateStart()
  await flush()
  assert.equal(rt.updateView().phase, 'failed')
  assert.match(rt.updateView().error, /network offline/)
  assert.deepEqual(calls[2], [`${PKG.name}@${PKG.version}`, { registry: 'https://registry.npmjs.org/', enabled: false }])
  assert.equal(warnings.length, 1)
})

test('a refused removal never starts a replacement installation', async () => {
  const { rt, installs } = start({ ...updateOffer, result: { application: 'failed', error: { code: 'already-installed' } }, manager: {
    listBundles: async () => [{ name: PKG.name, source: updateOffer.source, version: PKG.version, installed: true, removable: true, enabled: true }],
    removeBundle: async () => ({ application: 'failed', error: { code: 'bundle-in-use' } }),
  } })
  await rt.updateCheck()
  rt.updateStart()
  await flush()
  assert.equal(rt.updateView().phase, 'failed')
  assert.match(rt.updateView().error, /bundle-in-use/)
  assert.equal(installs.length, 1)
})

test('a manager without removal support gives actionable recovery without removing anything', async () => {
  const { rt, installs } = start({ ...updateOffer, result: { application: 'failed', error: { code: 'already-installed' } } })
  await rt.updateCheck()
  rt.updateStart()
  await flush()
  assert.match(rt.updateView().error, /DSH.*Plugins/)
  assert.equal(installs.length, 1)
})

test('a synchronous manager error settles the update instead of leaving it installing', async () => {
  const { rt } = start({ ...updateOffer, manager: { installBundle() { throw new Error('manager unavailable') } } })
  await rt.updateCheck()
  assert.doesNotThrow(() => rt.updateStart())
  await flush()
  assert.equal(rt.updateView().phase, 'failed')
})

test('a manager reporting an older installed version cannot report the update as successful', async () => {
  const { rt } = start({ ...updateOffer, result: { application: 'restart-required', version: PKG.version } })
  await rt.updateCheck()
  rt.updateStart()
  await flush()
  assert.equal(rt.updateView().phase, 'failed')
  assert.match(rt.updateView().error, /version/)
})

test('a protected bundle or changed version is never removed by a stale updater', async () => {
  for (const bundle of [{ removable: false }, { version: '8.0.0' }]) {
    let removed = false
    const { rt } = start({ ...updateOffer, result: { application: 'failed', error: { code: 'already-installed' } }, manager: {
      listBundles: async () => [{ name: PKG.name, source: updateOffer.source, version: PKG.version, installed: true, removable: true, enabled: true, ...bundle }],
      removeBundle: async () => { removed = true; return { application: 'applied' } },
    } })
    await rt.updateCheck()
    rt.updateStart()
    await flush()
    assert.equal(rt.updateView().phase, 'failed')
    assert.equal(removed, false)
  }
})

test('a failed rollback reports both failures and the official recovery path', async () => {
  let attempt = 0
  const { rt } = start({ ...updateOffer, manager: {
    listBundles: async () => [{ name: PKG.name, source: updateOffer.source, installed: true, removable: true, enabled: true }],
    removeBundle: async () => ({ application: 'applied' }),
    installBundle: async () => {
      attempt += 1
      if (attempt === 1) return { application: 'failed', error: { code: 'already-installed' } }
      throw new Error(attempt === 2 ? 'download failed' : 'restore failed')
    },
  } })
  await rt.updateCheck()
  rt.updateStart()
  await flush()
  assert.equal(rt.updateView().phase, 'failed')
  assert.match(rt.updateView().error, /download failed.*restore failed.*DSH Settings > Plugins/)
  assert.equal(attempt, 3)
})

test('a failed GitHub replacement restores its original versioned source and path', async () => {
  const source = 'github:example/office#v0.6.1&path:/ds-bot'
  const calls = []
  const { rt } = start({ source, answers: { 'https://api.github.com/repos/example/office/releases/latest': { tag_name: 'v9.0.0' } }, manager: {
    listBundles: async () => [{ name: PKG.name, source, installed: true, removable: true, enabled: true }],
    removeBundle: async () => ({ application: 'applied' }),
    installBundle: async spec => {
      calls.push(spec)
      return calls.length === 1 ? { application: 'failed', error: { code: 'already-installed' } }
        : calls.length === 2 ? { application: 'cancelled' } : { application: 'applied' }
    },
  } })
  await rt.updateCheck()
  rt.updateStart()
  await flush()
  assert.equal(rt.updateView().phase, 'failed')
  assert.deepEqual(calls, ['github:example/office#v9.0.0&path:/ds-bot', 'github:example/office#v9.0.0&path:/ds-bot', source])
})

test('an older manager without result.version is checked against its bundle inventory', async () => {
  const { rt } = start({ ...updateOffer, result: { application: 'restart-required' }, manager: {
    listBundles: async () => [{ name: PKG.name, source: updateOffer.source, version: PKG.version }],
  } })
  await rt.updateCheck()
  rt.updateStart()
  await flush()
  assert.equal(rt.updateView().phase, 'failed')
  assert.match(rt.updateView().error, /version/)
})

test('a cached update cannot remove a bundle whose install source has changed', async () => {
  for (const source of ['link:/work/office', 'github:someone/office#v0.7.0']) {
    let reads = 0
    let removed = false
    const { rt } = start({ ...updateOffer, result: { application: 'failed', error: { code: 'already-installed' } }, manager: {
      listBundles: async () => [{ name: PKG.name, source: ++reads === 1 ? updateOffer.source : source, version: PKG.version, installed: true, removable: true, enabled: true }],
      removeBundle: async () => { removed = true; return { application: 'applied' } },
    } })
    await rt.updateCheck()
    rt.updateStart()
    await flush()
    assert.equal(removed, false)
    assert.equal(rt.updateView().phase, 'failed')
  }
})

test('an applied replacement with the wrong version is removed before restoring the old one', async () => {
  let attempt = 0
  let removals = 0
  const { rt } = start({ ...updateOffer, manager: {
    listBundles: async () => [{ name: PKG.name, source: updateOffer.source, version: PKG.version, installed: true, removable: true, enabled: true }],
    removeBundle: async () => { removals += 1; return { application: 'applied' } },
    installBundle: async () => ++attempt === 1 ? { application: 'failed', error: { code: 'already-installed' } }
      : { application: 'applied', version: PKG.version },
  } })
  await rt.updateCheck()
  rt.updateStart()
  await flush()
  assert.equal(rt.updateView().phase, 'failed')
  assert.match(rt.updateView().error, /version.*previous version was restored/)
  assert.equal(removals, 2)
  assert.equal(attempt, 3)
})

test('restoration with an unexpected manifest version is reported as failed recovery', async () => {
  let attempt = 0
  const { rt } = start({ ...updateOffer, manager: {
    listBundles: async () => [{ name: PKG.name, source: updateOffer.source, version: PKG.version, installed: true, removable: true, enabled: true }],
    removeBundle: async () => ({ application: 'applied' }),
    installBundle: async () => ++attempt === 1 ? { application: 'failed', error: { code: 'already-installed' } }
      : attempt === 2 ? { application: 'failed', error: { code: 'operation-error' } } : { application: 'applied', version: '8.0.0' },
  } })
  await rt.updateCheck()
  rt.updateStart()
  await flush()
  assert.match(rt.updateView().error, /Restoring the previous version failed.*version/)
})

test('versions compare in semver order and lose their v and build metadata', () => {
  assert.equal(cleanVersion('v1.2.3+build.5'), '1.2.3')
  assert.equal(cleanVersion('latest'), null)
  assert.equal(newer('0.2.0', '0.1.9'), true)
  assert.equal(newer('0.10.0', '0.9.0'), true)
  assert.equal(newer('1.0.0', '1.0.0'), false)
  assert.equal(newer('1.0.0', '1.0.0-beta.2'), true)
  assert.equal(newer('1.0.0-beta.10', '1.0.0-beta.2'), true)
  assert.equal(newer('0.1.0', '0.2.0'), false)
})

test('the install source decides where a newer version is looked for', () => {
  assert.deepEqual(sourceOf('ds-bot@^0.1.0'), { kind: 'registry' })
  assert.deepEqual(sourceOf('@scope/ds-bot@latest'), { kind: 'registry' })
  // A profile's own dependency entry says the same without the package name.
  assert.deepEqual(sourceOf('^0.1.0'), { kind: 'registry' })
  assert.deepEqual(sourceOf('npm:ds-bot@^0.1.0'), { kind: 'registry' })
  assert.deepEqual(sourceOf('link:E:/项目库/My Bots/ds-bot'), { kind: 'path' })
  assert.deepEqual(sourceOf('/home/user/ds-bot'), { kind: 'path' })
  assert.deepEqual(sourceOf('github:Fei2411/DeepSeek-Bot#v0.1.0&path:/ds-bot'),
    { kind: 'git', owner: 'Fei2411', repo: 'DeepSeek-Bot', ref: 'v0.1.0', rest: ['path:/ds-bot'] })
  assert.deepEqual(sourceOf('git+https://github.com/Fei2411/DeepSeek-Bot.git#main'),
    { kind: 'git', owner: 'Fei2411', repo: 'DeepSeek-Bot', rest: [] })
  assert.deepEqual(sourceOf('https://example.com/ds-bot-0.1.0.tgz'), { kind: 'tarball' })
  assert.deepEqual(sourceOf(undefined), { kind: 'unknown' })
})

test('a registry install finds the newest version on the next registry and installs it from there', async () => {
  const { rt, fetched, installs } = start({
    source: `${PKG.name}@^${PKG.version}`,
    answers: {
      [`https://registry.npmjs.org/${PKG.name}/latest`]: new Error('offline'),
      [`https://registry.npmmirror.com/${PKG.name}/latest`]: { version: '9.0.0' },
    },
    result: { application: 'restart-required', version: '9.0.0' },
  })
  const view = await rt.updateCheck()
  assert.deepEqual(fetched, [`https://registry.npmjs.org/${PKG.name}/latest`, `https://registry.npmmirror.com/${PKG.name}/latest`])
  assert.equal(view.available, true)
  assert.equal(view.latest, '9.0.0')
  assert.equal(view.current, PKG.version)
  assert.equal(view.source, 'registry')
  assert.equal(view.notesUrl, 'https://github.com/wyx135230/DeepSeek-Office/releases')
  assert.equal(rt.updateStart().phase, 'installing')
  await flush()
  assert.deepEqual(installs, [[`${PKG.name}@9.0.0`, { registry: 'https://registry.npmmirror.com/' }]])
  const done = await rt.updateCheck()
  assert.equal(done.phase, 'installed')
  assert.equal(done.installed, '9.0.0')
  assert.equal(done.available, false)
})

test('a private registry of pnpm\'s own is asked alone, and an answer stands for a while', async () => {
  const { rt, fetched } = start({
    source: `${PKG.name}@^${PKG.version}`,
    registries: { registry: null, fallbackRegistries: ['https://registry.npmmirror.com/'], resolved: 'https://npm.corp.example/' },
    answers: { [`https://npm.corp.example/${PKG.name}/latest`]: { version: PKG.version } },
  })
  const view = await rt.updateCheck()
  assert.equal(view.available, false)
  assert.deepEqual(fetched, [`https://npm.corp.example/${PKG.name}/latest`])
  await rt.updateCheck()
  assert.equal(fetched.length, 1)
  await rt.updateCheck({ fresh: true })
  assert.equal(fetched.length, 2)
})

test('a versioned GitHub install follows the latest release tag and keeps its path', async () => {
  const { rt, installs } = start({
    source: 'github:Fei2411/DeepSeek-Bot#v0.1.0&path:/ds-bot',
    answers: { 'https://api.github.com/repos/Fei2411/DeepSeek-Bot/releases/latest': { tag_name: 'v9.1.0' } },
  })
  const view = await rt.updateCheck()
  assert.equal(view.available, true)
  assert.equal(view.latest, '9.1.0')
  rt.updateStart()
  await flush()
  assert.deepEqual(installs, [['github:Fei2411/DeepSeek-Bot#v9.1.0&path:/ds-bot', {}]])
})

test('a versioned GitHub install follows the release to the repository\'s current address', async () => {
  const { rt, installs } = start({
    source: 'github:old-owner/DeepSeek-Bot#v0.1.0&path:/ds-bot',
    answers: {
      'https://api.github.com/repos/old-owner/DeepSeek-Bot/releases/latest': {
        tag_name: 'v9.1.0',
        html_url: 'https://github.com/Fei2411/DeepSeek-Bot/releases/tag/v9.1.0',
      },
    },
  })
  const view = await rt.updateCheck()
  assert.equal(view.available, true)
  assert.equal(view.latest, '9.1.0')
  rt.updateStart()
  await flush()
  assert.deepEqual(installs, [['github:Fei2411/DeepSeek-Bot#v9.1.0&path:/ds-bot', {}]])
})

test('a linked checkout, an unversioned git install, or a disabled check never asks the network', async () => {
  for (const source of [`link:/work/${PKG.name}`, 'github:Fei2411/DeepSeek-Bot#main', undefined]) {
    const { rt, fetched } = start({ source })
    const view = await rt.updateCheck()
    assert.equal(view.available, false)
    assert.deepEqual(fetched, [])
    assert.throws(() => rt.updateStart(), /No DS Bot update/)
  }
  const { rt, fetched } = start({ source: `${PKG.name}@^${PKG.version}`, config: { updateCheck: false } })
  assert.equal((await rt.updateCheck({ fresh: true })).available, false)
  assert.deepEqual(fetched, [])
})

test('the star count comes from the repository, is kept for an hour, and survives a failed answer', async () => {
  const repo = 'https://api.github.com/repos/wyx135230/DeepSeek-Office'
  const answers = { [repo]: new Error('offline') }
  const { rt, fetched } = start({ source: `${PKG.name}@^${PKG.version}`, answers })
  assert.equal(rt.updateView().repoUrl, 'https://github.com/wyx135230/DeepSeek-Office')
  assert.equal(await rt.repoStars(), null)
  answers[repo] = { stargazers_count: 42 }
  assert.equal(await rt.repoStars(), 42)
  answers[repo] = new Error('offline')
  assert.equal(await rt.repoStars(), 42)
  assert.deepEqual(fetched, [repo, repo])
})

test('without a source from the plugin manager, the profile\'s own dependency entry decides', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ds-bot-update-'))
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ dependencies: { [PKG.name]: `^${PKG.version}` } }))
  const { rt } = start({
    profileDir: dir,
    answers: { [`https://registry.npmjs.org/${PKG.name}/latest`]: { version: '9.0.0' } },
  })
  const view = await rt.updateCheck()
  assert.equal(view.source, 'registry')
  assert.equal(view.available, true)
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ dependencies: { [PKG.name]: 'link:/work/ds-bot' } }))
  assert.equal((await rt.updateCheck({ fresh: true })).source, 'path')
  rmSync(dir, { recursive: true, force: true, maxRetries: 5 })
})

test('a check that finds nothing clears the version a check before it found', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ds-bot-update-'))
  const setSource = source => writeFileSync(join(dir, 'package.json'), JSON.stringify({ dependencies: { [PKG.name]: source } }))
  setSource(`^${PKG.version}`)
  const latest = `https://registry.npmjs.org/${PKG.name}/latest`
  const answers = { [latest]: { version: '9.0.0' } }
  const { rt } = start({ profileDir: dir, answers })
  const offered = await rt.updateCheck()
  assert.equal(offered.available, true)
  assert.equal(offered.latest, '9.0.0')
  // The profile now links a local checkout: the old registry offer must go.
  setSource('link:/work/ds-bot')
  const linked = await rt.updateCheck({ fresh: true })
  assert.equal(linked.available, false)
  assert.equal(linked.latest, null)
  assert.throws(() => rt.updateStart(), /No DS Bot update/)
  // Back on the registry with no copy answering: the offer stays cleared.
  delete answers[latest]
  setSource(`^${PKG.version}`)
  const gone = await rt.updateCheck({ fresh: true })
  assert.equal(gone.available, false)
  assert.equal(gone.latest, null)
  rmSync(dir, { recursive: true, force: true, maxRetries: 5 })
})

test('a failed install reports why and can be tried again', async () => {
  let attempt = 0
  const { rt, installs } = start({
    source: `${PKG.name}@^${PKG.version}`,
    config: { updateRegistry: 'https://registry.example' },
    answers: { [`https://registry.example/${PKG.name}/latest`]: { version: '9.0.0' } },
    result: () => (++attempt === 1
      ? { application: 'failed', error: { code: 'incompatible-version', diagnostic: 'needs a newer DSH' } }
      : { application: 'restart-required', version: '9.0.0' }),
  })
  await rt.updateCheck()
  rt.updateStart()
  await flush()
  const failed = await rt.updateCheck()
  assert.equal(failed.phase, 'failed')
  assert.equal(failed.error, 'needs a newer DSH')
  assert.equal(failed.available, true)
  rt.updateStart()
  await flush()
  assert.equal((await rt.updateCheck()).phase, 'installed')
  assert.equal(installs.length, 2)
  assert.deepEqual(installs[0][1], { registry: 'https://registry.example/' })
})
