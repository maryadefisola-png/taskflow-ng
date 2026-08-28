import { useEffect, useState } from "react"
import { supabase } from "./supabase"

const cleanUsername = value => String(value || "").trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?t\.me\//i, "").replace(/\/$/, "")
const telegramUrl = value => { const username = cleanUsername(value); return username ? `https://t.me/${encodeURIComponent(username)}` : "" }

const TelegramIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true" style={{width:22,height:22,display:"block",flex:"0 0 auto"}}><path fill="currentColor" d="M21.4 3.3 2.9 10.4c-1.3.5-1.3 1.2-.2 1.5l4.7 1.5 1.8 5.7c.2.6.1.8.7.8.5 0 .7-.2 1-.9.7l2.6-2.5 5.4 4c1 .6 1.7.3 1.9-.9l3.1-16c.3-1.5-.6-2.1-1.6-1.6ZM8.1 13.1l10.9-6.9c.5-.3 1-.1.6.2l-9 8.1-.3 3.1-1.2-4.5Z"/></svg>

export default function CustomerCare() {
  const [username, setUsername] = useState("")
  const [admin, setAdmin] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    let active = true
    const load = async () => {
      const { data } = await supabase.from("platform_settings").select("customer_care_telegram").order("id", { ascending: true }).limit(1).maybeSingle()
      if (!active) return
      const value = data?.customer_care_telegram || ""
      setUsername(value); setDraft(value)
      if (window.location.pathname === "/admin") { const { data: isAdmin } = await supabase.rpc("is_admin"); if (active) setAdmin(isAdmin === true) }
    }
    load(); return () => { active = false }
  }, [])

  const openCare = () => {
    const url = telegramUrl(username)
    if (!url) { setMessage("Customer care Telegram username has not been configured yet."); setTimeout(() => setMessage(""), 3500); return }
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const save = async e => {
    e.preventDefault(); const value = cleanUsername(draft)
    if (!value) return setMessage("Enter a Telegram username.")
    setSaving(true); setMessage("")
    try {
      const { data: row, error: findError } = await supabase.from("platform_settings").select("id").order("id", { ascending: true }).limit(1).maybeSingle()
      if (findError) throw findError
      if (!row?.id) throw new Error("Platform settings record was not found.")
      const { error } = await supabase.from("platform_settings").update({ customer_care_telegram: value, updated_at: new Date().toISOString() }).eq("id", row.id)
      if (error) throw error
      setUsername(value); setDraft(value); setEditing(false); setMessage("Customer care Telegram username saved.")
    } catch (e) { setMessage(e.message || "Unable to save customer care username.") }
    finally { setSaving(false) }
  }

  const fabStyle = {position:"fixed",right:18,bottom:82,zIndex:99999,minWidth:58,height:54,padding:"0 16px",border:0,borderRadius:27,background:"#229ED9",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontSize:13,fontWeight:800,cursor:"pointer",boxShadow:"0 8px 26px rgba(0,0,0,.24)"}

  if (window.location.pathname === "/admin" && admin) return <>
    <button style={{...fabStyle,background:"#15171a",bottom:20}} onClick={() => { setEditing(v => !v); setMessage("") }} aria-label="Customer care settings" title="Customer care settings"><TelegramIcon /><span>Customer Care</span></button>
    {editing && <div className="customer-care-admin-panel">
      <div className="customer-care-admin-title">Customer Care</div><div className="customer-care-admin-help">Set the Telegram username users will be sent to.</div>
      <form onSubmit={save}><input value={draft} onChange={e => setDraft(e.target.value)} placeholder="@CustomerCareUsername" aria-label="Customer care Telegram username" /><button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Username"}</button></form>
      {message && <div className="customer-care-admin-message">{message}</div>}
    </div>}
  </>

  return <>
    <button style={fabStyle} onClick={openCare} aria-label="Customer Care on Telegram" title="Customer Care"><TelegramIcon /><span>Customer Care</span></button>
    {message && <div className="customer-care-message">{message}</div>}
  </>
}
