import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import GrowviaPolished from './GrowviaPolished.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GrowviaPolished />
  </StrictMode>
)
