import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App'
import { resolveRouterConfig } from './lib/routerConfig'
import './index.css'

const router = resolveRouterConfig(import.meta.env.BASE_URL, import.meta.env.VITE_ROUTER)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {router.kind === 'hash' ? (
      <HashRouter>
        <App />
      </HashRouter>
    ) : (
      <BrowserRouter basename={router.basename}>
        <App />
      </BrowserRouter>
    )}
  </StrictMode>,
)
