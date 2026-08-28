import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import GrowviaPolished from './GrowviaPolished.jsx'
import Admin from './Admin.jsx'
import './index.css'

const RootApp = () => window.location.pathname.startsWith('/admin') ? <Admin /> : <GrowviaPolished />

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootApp />
  </StrictMode>
)
