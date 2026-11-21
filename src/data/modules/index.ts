import type { ModuleMeta } from '../../types'
import { NETWORK_MODULE } from './network'
import { ENCRYPTION_MODULE } from './encryption'
import { PHISHING_MODULE } from './phishing'
import { MALWARE_MODULE } from './malware'
import { DDOS_MODULE } from './ddos'
import { MITM_MODULE } from './mitm'
import { SQLI_MODULE } from './sqli'
import { DEFENSE_MODULE } from './defense'

export const MODULES: ModuleMeta[] = [
  NETWORK_MODULE,
  ENCRYPTION_MODULE,
  PHISHING_MODULE,
  MALWARE_MODULE,
  DDOS_MODULE,
  MITM_MODULE,
  SQLI_MODULE,
  DEFENSE_MODULE,
]

export function getModule(id: string): ModuleMeta | undefined {
  return MODULES.find((m) => m.id === id)
}

export function totalLessonCount(): number {
  return MODULES.reduce((n, m) => n + m.lessons.length, 0)
}

export function totalLabCount(): number {
  return MODULES.reduce((n, m) => n + m.labIds.length, 0)
}

export function totalQuizCount(): number {
  return MODULES.length
}
