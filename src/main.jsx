import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { supabase } from './supabase'
import GrowviaPolishedV2 from './GrowviaPolishedV2.jsx'
import LiveActivity from './LiveActivity.jsx'
import Admin from './Admin.jsx'
import './index.css'

function PwaInstallPrompt() {
  const [event, setEvent] = useState(null)
  const [installed, setInstalled] = useState(false)
  useEffect(() => {
    const onPrompt = e => { e.preventDefault(); setEvent(e) }
    const onInstalled = () => { setInstalled(true); setEvent(null) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) setInstalled(true)
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled) }
  }, [])
  if (!event || installed) return null
  return <button type="button" className="gv-primary" style={{position:'fixed',right:16,bottom:88,zIndex:1000,boxShadow:'0 8px 24px rgba(0,0,0,.18)'}} onClick={async()=>{await event.prompt();setEvent(null)}}>Install Growvia</button>
}

function AuthGate() {
  const [mode, setMode] = useState('signin'), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [fullName, setFullName] = useState(''), [phone, setPhone] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  async function submit(e) { e.preventDefault(); setBusy(true); setMessage(''); if (mode === 'signup') { const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: fullName.trim(), phone: phone.trim() } } }); if (error) setMessage(error.message); else if (data.session) setMessage('Account created successfully. Welcome to Growvia!'); else { setMessage('Account created. Please check your email to confirm your account, then sign in.'); setMode('signin'); setPassword('') } } else { const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password }); if (error) setMessage(error.message) } setBusy(false) }
  return <div className="gv-login"><div className="gv-login-card"><div className="gv-logo">G</div><div className="eyebrow">WELCOME TO</div><h1>Growvia</h1><p>Complete tasks. Earn rewards. Grow with us.</p><div style={{display:'flex',gap:8,marginBottom:18}}><button type="button" className={mode==='signin'?'gv-primary':'gv-ghost'} onClick={()=>{setMode('signin');setMessage('')}} style={{flex:1}}>Sign in</button><button type="button" className={mode==='signup'?'gv-primary':'gv-ghost'} onClick={()=>{setMode('signup');setMessage('')}} style={{flex:1}}>Create account</button></div><form onSubmit={submit}>{mode==='signup'&&<><input type="text" placeholder="Full name" value={fullName} onChange={e=>setFullName(e.target.value)} required/><input type="tel" placeholder="Phone number" value={phone} onChange={e=>setPhone(e.target.value)} required/></>}<input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required/><input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} minLength={6} required/><button className="gv-primary" disabled={busy}>{busy?(mode==='signup'?'Creating account…':'Signing in…'):(mode==='signup'?'Create account':'Sign in')}</button></form>{message&&<div className="gv-alert">{message}</div>}</div></div>
}

function RootApp() {
  const [session, setSession] = useState(undefined)
  useEffect(() => { let mounted=true; supabase.auth.getSession().then(({data})=>{if(mounted)setSession(data.session)}); const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,nextSession)=>{if(mounted)setSession(nextSession)}); return ()=>{mounted=false;subscription.unsubscribe()} }, [])
  if (window.location.pathname.startsWith('/admin')) return <Admin />
  if (session===undefined) return <div className="gv-loading">Loading Growvia…</div>
  if (!session) return <AuthGate />
  return <><GrowviaPolishedV2 /><LiveActivity /><PwaInstallPrompt /></>
}

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))

createRoot(document.getElementById('root')).render(<StrictMode><RootApp /></StrictMode>)
