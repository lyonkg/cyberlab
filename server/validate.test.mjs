import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isSafeHost, isSafeHttpUrl, isSafePort } from './validate.mjs'

describe('isSafeHost', () => {
  it('accepts hostnames and ipv4', () => {
    assert.equal(isSafeHost('example.com'), true)
    assert.equal(isSafeHost('1.1.1.1'), true)
    assert.equal(isSafeHost('localhost'), true)
  })
  it('rejects injection / junk', () => {
    assert.equal(isSafeHost('example.com;id'), false)
    assert.equal(isSafeHost('$(reboot)'), false)
    assert.equal(isSafeHost('host with space'), false)
    assert.equal(isSafeHost('example.com:80'), false)
    assert.equal(isSafeHost(''), false)
    assert.equal(isSafeHost('../../etc'), false)
  })
})

describe('isSafePort / isSafeHttpUrl', () => {
  it('ports', () => {
    assert.equal(isSafePort(443), true)
    assert.equal(isSafePort(0), false)
    assert.equal(isSafePort(70000), false)
  })
  it('urls', () => {
    assert.equal(isSafeHttpUrl('https://example.com/path'), true)
    assert.equal(isSafeHttpUrl('http://127.0.0.1/'), true)
    assert.equal(isSafeHttpUrl('javascript:alert(1)'), false)
    assert.equal(isSafeHttpUrl('https://user:pass@x.com/'), false)
  })
})
