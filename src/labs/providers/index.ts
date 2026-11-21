import { getLabMode as resolveMode } from '../mode'
import { realProvider } from './real'
import { simulatedProvider } from './simulated'
import type { LabProvider } from './types'

export type { LabMode, LabProvider } from './types'
export {
  getLabMode,
  setLabMode,
  clearLabModeOverride,
  envLabApiBase,
  envLabMode,
} from '../mode'

export function getLabProvider(): LabProvider {
  return resolveMode() === 'real' ? realProvider : simulatedProvider
}
