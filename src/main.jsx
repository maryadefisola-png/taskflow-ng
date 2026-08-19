import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import TestSupabase from './TestSupabase.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TestSupabase />
  </StrictMode>
)
