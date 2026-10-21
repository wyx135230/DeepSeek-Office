import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { build } from 'esbuild'

const bundle = await build({
  entryPoints: [fileURLToPath(new URL('../src/client/office/index.js', import.meta.url))],
  bundle: true, format: 'cjs', platform: 'browser', write: false,
  loader: { '.png': 'dataurl', '.glb': 'dataurl' },
  external: ['react', 'react-dom', '@deepseek-ai/dsh-client-ui-primitives'],
})

function overlay() {
  const refs = [], module = { exports: {} }
  let cursor = 0, view = null
  let roster = { bots: [{ id: 'b1', name: 'Coder' }], rooms: [{ id: 'r1', name: 'Studio', members: ['b1'] }] }
  runInNewContext(bundle.outputFiles[0].text, {
    module, exports: module.exports,
    require: name => name === 'react' ? {
      createElement: (type, props) => ({ type, props }),
      useMemo: make => make(),
      useRef: initial => refs[cursor++] ??= { current: initial },
    } : {},
  })
  return {
    render(next, roomId) {
      cursor = 0; view = next
      return module.exports.OfficeOverlay({ useRoster: select => select(roster), useUi: select => select({ office: view, officeRoomId: roomId }), useWork: select => select({}) })
    },
    clearTeam() { roster = { bots: [], rooms: [] } },
  }
}

test('leaving the office retains the workspace instance and last floor while hiding its controls', () => {
  const office = overlay()
  assert.equal(office.render(null), null, 'the scene starts lazily')
  const opened = office.render({ roomId: 'r1' })
  const hidden = office.render(null)
  assert.ok(hidden, 'returning to chat must not unmount the simulation')
  assert.equal(hidden.type, opened.type)
  assert.equal(hidden.props.key, opened.props.key)
  assert.equal(hidden.props.view.roomId, 'r1')
  assert.equal(hidden.props.active, false)
  const resumed = office.render({ roomId: 'r1' })
  assert.equal(resumed.type, hidden.type)
  assert.equal(resumed.props.active, true)
})

test('removing the last group releases the retained office', () => {
  const office = overlay()
  office.render({ roomId: 'r1' })
  office.clearTeam()
  assert.equal(office.render(null), null)
})

test('a lift can change the retained floor without revealing the office', () => {
  const office = overlay()
  office.render({ roomId: 'r1' }, 'r1')
  const arrived = office.render(null, null)
  assert.equal(arrived.props.view.roomId, null)
  assert.equal(arrived.props.active, false)
})
