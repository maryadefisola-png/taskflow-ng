import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import GrowviaApp from './GrowviaApp.jsx'
import Admin from './Admin.jsx'
import './index.css'

const publicRoutes=['/','/plans','/wallet','/history','/more']
if(!window.location.pathname.startsWith('/admin')&&!publicRoutes.includes(window.location.pathname)){
 window.history.replaceState({},'', '/')
}

function RootApp(){
 if(window.location.pathname.startsWith('/admin')) return <Admin />
 return <GrowviaApp />
}

if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))
createRoot(document.getElementById('root')).render(<StrictMode><RootApp/></StrictMode>)
