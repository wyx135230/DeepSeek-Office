import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mobilePageTarget, mobilePageHtml, mobilePageText, mobilePageIssue, proxyFromEnvironment, proxyFromRegistryText, MOBILE_AGENT } from '../src/host/mobile-page.js'

test('only http(s) pages are fetched, and cloud metadata stays closed', () => {
  assert.equal(mobilePageTarget('https://example.com/a'), 'https://example.com/a')
  assert.equal(mobilePageTarget('http://127.0.0.1:3000/'), 'http://127.0.0.1:3000/')
  for (const value of ['file:///C:/Windows', 'javascript:alert(1)', 'not a url']) {
    assert.throws(() => mobilePageTarget(value), error => error.code === 'bot/invalid', value)
  }
  assert.throws(() => mobilePageTarget('http://169.254.169.254/latest/meta-data/'), error => error.code === 'bot/invalid')
})

test('the frame gets a base for assets and the navigation bridge, without a page CSP', () => {
  const html = '<html><head><meta http-equiv="Content-Security-Policy" content="default-src none"><base href="https://evil.test/"></head><body><a href="/next">Next</a></body></html>'
  const out = mobilePageHtml(html, 'https://example.com/start?q=1')
  assert.ok(out.includes('<base href="https://example.com/start?q=1">'))
  assert.ok(!out.includes('https://evil.test/'))
  assert.ok(!out.includes('Content-Security-Policy'))
  assert.ok(out.includes('of-pb-navigate'))
  assert.ok(out.indexOf('of-pb-navigate') < out.indexOf('<body>'))
})

test('a fragment without head still receives the base and bridge', () => {
  const out = mobilePageHtml('<p>hi</p>', 'https://example.com/page')
  assert.match(out, /^<head><base href="https:\/\/example.com\/page">/)
  assert.ok(out.endsWith('<p>hi</p>'))
})

test('desktop viewport declarations are replaced with one phone-width viewport', () => {
  const html = '<html><head><meta content="width=1280" name="viewport"><meta NAME=viewport content="initial-scale=.3"></head><body style="min-width:1200px"><h1>Heading</h1><p>Readable text</p></body></html>'
  const out = mobilePageHtml(html, 'https://example.com/')
  assert.equal((out.match(/name="viewport"/gi) ?? []).length, 1)
  assert.ok(out.includes('width=device-width, initial-scale=1'))
  assert.ok(!out.includes('width=1280'))
})

test('the page is decoded with its declared charset', () => {
  const latin = new Uint8Array([0x63, 0x61, 0x66, 0xe9])
  assert.equal(mobilePageText(latin, 'text/html; charset=windows-1252'), 'café')
  const utf8 = new TextEncoder().encode('咖啡')
  assert.equal(mobilePageText(utf8, 'text/html; charset=utf-8'), '咖啡')
})

test('the injected navigation bridge parses and meta refresh cannot escape the frame', () => {
  const out = mobilePageHtml('<html><head><meta http-equiv="refresh" content="0;url=https://real.example/"></head><body></body></html>', 'https://example.com/')
  assert.ok(!/http-equiv="refresh"/i.test(out))
  const script = /<script>([\s\S]*?)<\/script>/.exec(out)[1]
  assert.doesNotThrow(() => new Function(script))
  assert.match(script, /stopImmediatePropagation/)
  assert.match(script, /Location\.prototype/)
})

test('the phone User-Agent is a phone, and not a desktop browser', () => {
  assert.match(MOBILE_AGENT, /Mobile Safari/)
  assert.ok(!/Windows NT/.test(MOBILE_AGENT))
})

test('Google verification and script requirements remain Google errors, including HTTP challenges', () => {
  for (const [url, status, html] of [
    ['https://www.google.com/sorry/index', 200, 'Verification'],
    ['https://www.google.com/search?q=office', 429, 'Rate limited'],
    ['https://www.google.co.uk/search?q=office', 200, '<noscript><a href="/httpservice/retry/enablejs">Enable JavaScript</a></noscript><p>Trouble accessing Google Search</p>'],
  ]) assert.match(mobilePageIssue(url, status, html), /Google.*verification/)
  assert.equal(mobilePageIssue('https://www.google.com/search?q=office', 200, '<h3>Actual results</h3>'), null)
  assert.equal(mobilePageIssue('https://www.google.com/search?q=unusual+traffic', 200, '<title>unusual traffic - Google Search</title><h3>Normal result</h3>'), null)
  assert.equal(mobilePageIssue('https://google.example.com/sorry/', 429, 'unusual traffic'), null)
})

test('the system proxy is read from the environment or the system settings', () => {
  assert.deepEqual(proxyFromEnvironment({ HTTPS_PROXY: 'http://127.0.0.1:7897' }), { host: '127.0.0.1', port: 7897, auth: null })
  assert.equal(proxyFromEnvironment({ NO_PROXY: '*' }), null)
  const registry = 'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings\r\n    ProxyEnable    REG_DWORD    0x1\r\n    ProxyServer    REG_SZ    127.0.0.1:7897\r\n'
  assert.deepEqual(proxyFromRegistryText(registry), { host: '127.0.0.1', port: 7897, auth: null })
  assert.equal(proxyFromRegistryText(registry.replace('0x1', '0x0')), null)
  const split = 'ProxyEnable    REG_DWORD    0x1\r\nProxyServer    REG_SZ    http=127.0.0.1:8080;https=127.0.0.1:8443\r\n'
  assert.deepEqual(proxyFromRegistryText(split), { host: '127.0.0.1', port: 8443, auth: null })
})

test('an authenticated proxy keeps its credentials', () => {
  assert.deepEqual(proxyFromEnvironment({ HTTP_PROXY: 'http://user:pass@10.0.0.2:3128' }), {
    host: '10.0.0.2',
    port: 3128,
    auth: `Basic ${Buffer.from('user:pass').toString('base64')}`,
  })
})
