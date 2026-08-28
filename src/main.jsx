import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import CustomerCare from './CustomerCare.jsx'
import UserNavigation from './UserNavigation.jsx'
import './index.css'
import './GrowviaUI.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <UserNavigation />
    <CustomerCare />
  </StrictMode>
)
