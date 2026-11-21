import type { FirewallDecision, FirewallRule, Packet } from '../types'

function ipMatches(pattern: string, ip: string): boolean {
  if (pattern === '*' || pattern === 'any' || pattern === '0.0.0.0/0') return true
  if (pattern.includes('/')) {
    const [net, bitsStr] = pattern.split('/')
    const bits = parseInt(bitsStr, 10)
    const ipNum = ipToInt(ip)
    const netNum = ipToInt(net)
    if (ipNum === null || netNum === null || Number.isNaN(bits)) return pattern === ip
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0
    return (ipNum & mask) === (netNum & mask)
  }
  return pattern === ip
}

function ipToInt(ip: string): number | null {
  const parts = ip.split('.').map((p) => parseInt(p, 10))
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return null
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

function portMatches(rulePort: number | 'any', packetPort: number): boolean {
  return rulePort === 'any' || rulePort === packetPort
}

function protocolMatches(ruleProto: FirewallRule['protocol'], packetProto: Packet['protocol']): boolean {
  return ruleProto === 'any' || ruleProto === packetProto
}

function directionMatches(
  ruleDir: FirewallRule['direction'],
  packetDir: Packet['direction'],
): boolean {
  return ruleDir === 'any' || ruleDir === packetDir
}

/**
 * First-match firewall evaluation. Rules are checked in order; first match wins.
 * If nothing matches, default deny.
 */
export function evaluatePacket(rules: FirewallRule[], packet: Packet): FirewallDecision {
  for (const rule of rules) {
    if (
      protocolMatches(rule.protocol, packet.protocol) &&
      ipMatches(rule.srcIp, packet.srcIp) &&
      ipMatches(rule.dstIp, packet.dstIp) &&
      portMatches(rule.dstPort, packet.dstPort) &&
      directionMatches(rule.direction, packet.direction)
    ) {
      return {
        allowed: rule.action === 'allow',
        matchedRuleId: rule.id,
        reason: `Matched rule ${rule.id}: ${rule.action.toUpperCase()} ${rule.protocol.toUpperCase()} ${rule.srcIp} → ${rule.dstIp}:${rule.dstPort}`,
      }
    }
  }
  return {
    allowed: false,
    matchedRuleId: null,
    reason: 'No matching rule — default DENY',
  }
}

export function createDefaultRules(): FirewallRule[] {
  return [
    {
      id: 'r1',
      action: 'allow',
      protocol: 'tcp',
      srcIp: 'any',
      dstIp: '10.0.0.10',
      dstPort: 443,
      direction: 'inbound',
    },
    {
      id: 'r2',
      action: 'allow',
      protocol: 'tcp',
      srcIp: 'any',
      dstIp: '10.0.0.10',
      dstPort: 80,
      direction: 'inbound',
    },
    {
      id: 'r3',
      action: 'deny',
      protocol: 'tcp',
      srcIp: 'any',
      dstIp: '10.0.0.10',
      dstPort: 22,
      direction: 'inbound',
    },
    {
      id: 'r4',
      action: 'allow',
      protocol: 'any',
      srcIp: '10.0.0.0/24',
      dstIp: 'any',
      dstPort: 'any',
      direction: 'outbound',
    },
  ]
}
