import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { DICTIONARY, hostText, installLocale, language, t } from '../src/client/i18n.js'

function fakeLocale(active) {
  const dicts = new Map()
  return {
    register: (ns, locale, dict) => { dicts.set(`${ns}:${locale}`, dict); return () => dicts.delete(`${ns}:${locale}`) },
    bind: ns => (key, params) => {
      const text = (active === 'zh' ? dicts.get(`${ns}:zh`)?.[key] : undefined) ?? key
      return params ? text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match)) : text
    },
    getLocale: () => ({ active }),
  }
}

test('every literal the client translates has a Chinese entry', () => {
  const dir = new URL('../src/client/', import.meta.url)
  const missing = []
  for (const name of readdirSync(dir).filter(file => file.endsWith('.js'))) {
    const text = readFileSync(new URL(name, dir), 'utf8')
    for (const match of text.matchAll(/\bt\(\s*(['"])((?:\\.|(?!\1).)*)\1/g)) {
      const key = match[2].replace(/\\'/g, "'")
      if (!Object.hasOwn(DICTIONARY.zh, key)) missing.push(`${name}: ${key}`)
    }
  }
  assert.deepEqual(missing, [])
})

test('the plugin interface stays English when Harness is localized', () => {
  assert.equal(t('Message {name}', { name: 'Chief' }), 'Message Chief')
  assert.equal(language(), 'en')
  const off = installLocale(fakeLocale('zh'))
  try {
    assert.equal(language(), 'en')
    assert.equal(t('Message {name}', { name: 'Chief' }), 'Message Chief')
    assert.equal(t('Model'), 'Model')
    assert.equal(hostText('A Bot named Writer already exists'), 'A Bot named Writer already exists')
    assert.equal(hostText('The team needs at least one Main Bot'), 'The team needs at least one Main Bot')
    assert.equal(hostText('Something new'), 'Something new')
    const message = 'An entry holds at most 300 characters; this one has 301. Keep one fact per entry, or save the details as several entries in a topic.'
    assert.equal(hostText(message), message)
    assert.equal(hostText('There is no entry 9.'), 'There is no entry 9.')
  } finally {
    off()
  }
  assert.equal(t('Model'), 'Model')
  assert.equal(hostText('A Bot named Writer already exists'), 'A Bot named Writer already exists')
})
