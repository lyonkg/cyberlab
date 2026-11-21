import { describe, expect, it } from 'vitest'
import { createDefaultRules, evaluatePacket } from './firewall'
import type { Packet } from '../types'

const base: Packet = {
  id: 't',
  protocol: 'tcp',
  srcIp: '203.0.113.10',
  dstIp: '10.0.0.10',
  dstPort: 443,
  direction: 'inbound',
}

describe('evaluatePacket', () => {
  const rules = createDefaultRules()

  it('allows inbound HTTPS to web server', () => {
    const d = evaluatePacket(rules, base)
    expect(d.allowed).toBe(true)
    expect(d.matchedRuleId).toBe('r1')
  })

  it('denies inbound SSH by explicit rule', () => {
    const d = evaluatePacket(rules, { ...base, dstPort: 22 })
    expect(d.allowed).toBe(false)
    expect(d.matchedRuleId).toBe('r3')
  })

  it('default-denies unmatched inbound', () => {
    const d = evaluatePacket(rules, { ...base, dstPort: 3389 })
    expect(d.allowed).toBe(false)
    expect(d.matchedRuleId).toBeNull()
  })

  it('allows outbound from LAN CIDR', () => {
    const d = evaluatePacket(rules, {
      ...base,
      srcIp: '10.0.0.50',
      dstIp: '8.8.8.8',
      dstPort: 53,
      protocol: 'udp',
      direction: 'outbound',
    })
    expect(d.allowed).toBe(true)
    expect(d.matchedRuleId).toBe('r4')
  })

  it('matches CIDR correctly', () => {
    const d = evaluatePacket(rules, {
      ...base,
      srcIp: '10.0.1.50',
      dstIp: '8.8.8.8',
      direction: 'outbound',
      dstPort: 80,
    })
    expect(d.allowed).toBe(false)
  })
})
