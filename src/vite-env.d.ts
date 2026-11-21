/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LAB_MODE?: string
  readonly VITE_LAB_API_BASE?: string
  /** 'hash' → HashRouter (any static folder, e.g. the macOS zip). Default: BrowserRouter. */
  readonly VITE_ROUTER?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
