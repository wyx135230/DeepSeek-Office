import assert from 'node:assert/strict'
import { test } from 'node:test'
import { phoneBrowserAddress, phoneBrowserHost, phoneBrowserLabel, phoneBrowserSecure, BROWSER_SEARCH_URL } from '../src/client/office/phone-browser-data.js'

test('an explicit http(s) address is kept, other schemes are refused', () => {
  assert.equal(phoneBrowserAddress('https://example.com/a?b=1'), 'https://example.com/a?b=1')
  assert.equal(phoneBrowserAddress('http://example.com/'), 'http://example.com/')
  for (const value of ['javascript:alert(1)', 'file:///C:/Windows', 'data:text/html,x', 'about:blank', 'chrome://settings']) {
    assert.equal(phoneBrowserAddress(value), null, value)
  }
})

test('a host opens over https, while local and private hosts stay on http', () => {
  assert.equal(phoneBrowserAddress('example.com'), 'https://example.com/')
  assert.equal(phoneBrowserAddress('example.com/path'), 'https://example.com/path')
  assert.equal(phoneBrowserAddress('localhost:3000'), 'http://localhost:3000/')
  assert.equal(phoneBrowserAddress('192.168.1.20:8080/admin'), 'http://192.168.1.20:8080/admin')
  assert.equal(phoneBrowserAddress('10.0.0.4'), 'http://10.0.0.4/')
})

test('address-bar searches use Google and preserve multilingual query text', () => {
  assert.equal(BROWSER_SEARCH_URL, 'https://www.google.com/search?q=')
  assert.equal(phoneBrowserAddress('office phone browser'), 'https://www.google.com/search?q=office%20phone%20browser')
  assert.equal(phoneBrowserAddress('咖啡 & tea'), 'https://www.google.com/search?q=%E5%92%96%E5%95%A1%20%26%20tea')
  assert.equal(phoneBrowserAddress('  '), null)
  assert.equal(phoneBrowserAddress(''), null)
})

test('Google addresses stay ordinary addresses now that pages are fetched for mobile', () => {
  assert.equal(phoneBrowserAddress('google.com'), 'https://google.com/')
  assert.equal(phoneBrowserAddress('https://www.google.com/search?q=office'), 'https://www.google.com/search?q=office')
  assert.equal(phoneBrowserAddress('https://example.com/'), 'https://example.com/')
})

test('cloud metadata hosts are not opened by accident', () => {
  assert.equal(phoneBrowserAddress('http://169.254.169.254/latest/meta-data/'), null)
  assert.equal(phoneBrowserAddress('169.254.169.254'), null)
  assert.equal(phoneBrowserAddress('http://metadata.google.internal/'), null)
})

test('the address helpers describe a page for the phone bar', () => {
  assert.equal(phoneBrowserHost('https://en.wikipedia.org/wiki/Main_Page'), 'en.wikipedia.org')
  assert.equal(phoneBrowserLabel('https://en.wikipedia.org/wiki/Main_Page'), 'en.wikipedia.org/wiki/Main_Page')
  assert.equal(phoneBrowserLabel('https://example.com/'), 'example.com')
  assert.equal(phoneBrowserLabel('not a url'), 'not a url')
  assert.equal(phoneBrowserSecure('https://example.com/'), true)
  assert.equal(phoneBrowserSecure('http://localhost:3000/'), false)
  assert.equal(phoneBrowserHost('nope'), '')
})
