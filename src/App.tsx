import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'

// Route-level code splitting: only Home ships in the entry chunk.
const ModulePage = lazy(() => import('./pages/ModulePage').then((m) => ({ default: m.ModulePage })))
const LabsOverviewPage = lazy(() =>
  import('./pages/LabsOverviewPage').then((m) => ({ default: m.LabsOverviewPage })),
)
const ProgressPage = lazy(() => import('./pages/ProgressPage').then((m) => ({ default: m.ProgressPage })))
const NetworkToolsPage = lazy(() =>
  import('./pages/NetworkToolsPage').then((m) => ({ default: m.NetworkToolsPage })),
)

const Loading = () => <p className="text-sm text-slate-400 py-10 text-center">Loading…</p>

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/modules/:moduleId" element={<ModulePage />} />
          <Route path="/labs" element={<LabsOverviewPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/tools" element={<NetworkToolsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
