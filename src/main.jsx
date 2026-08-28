import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import GrowviaComplete from './GrowviaComplete.jsx'
import './index.css'
import './GrowviaUI.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GrowviaComplete />
  </StrictMode>
)
