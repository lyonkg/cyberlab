export type ModuleId =
  | 'network'
  | 'encryption'
  | 'phishing'
  | 'malware'
  | 'ddos'
  | 'mitm'
  | 'sqli'
  | 'defense'

export interface QuizQuestion {
  id: string
  prompt: string
  choices: string[]
  correctIndex: number
  explanation: string
}

export interface LessonSection {
  id: string
  title: string
  content: string
}

export interface ModuleMeta {
  id: ModuleId
  title: string
  shortTitle: string
  description: string
  icon: string
  path: string
  color: string
  lessons: LessonSection[]
  quiz: QuizQuestion[]
  labIds: string[]
}

export interface ProgressState {
  completedLessons: string[]
  completedLabs: string[]
  quizScores: Record<string, { score: number; total: number; at: string }>
  lastVisited?: string
}

export type LabMode = 'simulated' | 'real'

export interface FirewallRule {
  id: string
  action: 'allow' | 'deny'
  protocol: 'tcp' | 'udp' | 'icmp' | 'any'
  srcIp: string
  dstIp: string
  dstPort: number | 'any'
  direction: 'inbound' | 'outbound' | 'any'
}

export interface Packet {
  id: string
  protocol: 'tcp' | 'udp' | 'icmp'
  srcIp: string
  dstIp: string
  dstPort: number
  direction: 'inbound' | 'outbound'
  payload?: string
}

export interface FirewallDecision {
  allowed: boolean
  matchedRuleId: string | null
  reason: string
}
