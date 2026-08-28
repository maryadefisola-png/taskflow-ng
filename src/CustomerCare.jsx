import { useEffect, useState } from "react"
import { supabase } from "./supabase"

const cleanTelegram = value => String(value || "").trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?t\.me\//i, "").replace(/\/$/, "")
const cleanWhatsApp = value => String(value || "").trim().replace(/^https?:\/\/(www\.)?wa\.me\//i, "").replace(/^\+/, "").replace(/[^0-9]/g, "")
const telegramUrl = value => { const username = cleanTelegram(value); return username ? `https://t.me/${encodeURIComponent(username)}` : "" }
const whatsappUrl = value => { const number = cleanWhatsApp(value); return number ? `https://wa.me/${number}` : "" }

const TelegramIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true" style={{width:22,height:22,display:"block",flex:"0 0 auto"}}><path fill="currentColor" d="M21.4 3.3 2.9 10.4c-1.3.5-1.3 1.2-.2 1.5l4.7 1.5 1.8 5.7c.2.6.1.8.7.8.5 0 .7-.2 1-.9.7-.6 1.1-1.2 1.7l-2.6-2.5 5.4 4c1 .6 1.7.3 1.9-.9l3.1-16c.3-1.5-.6-2.1-1.6-1.6ZM8.1 13.1l10.9-6.9c.5-.3 1-.1.6.2l-9 8.1-.3 3.1-1.2-4.5Z"/></svg>
const WhatsAppIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true" style={{width:22,height:22,display:"block",flex:"0 0 auto"}}><path fill="currentColor" d="M12 2.2a9.7 9.7 0 0 0-8.4 14.6L2.2 21.8l5.2-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-3.1.8.8-3-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.3-.7-1.5-.7-.2-.1-.4-.1-.6.1-.2.2-.6.7-.7.9-.1.2-.3.2-.5.1-1.4-.7-2.4-1.2-3.4-2.7-.2-.3.2-.3.6-1.1.1-.2.1-.3 0-.5 0-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.2-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.2.7 3 .6.5-.1 1.3-.5 1.5-1 .2-.5.2-.9.2-1-.1-.1-.3-.2-.5-.3Z"/></svg>

export default function CustomerCare() {
  const [telegram, setTelegram] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [admin, setAdmin] = useState(false)
  const [editing, setEditing] = useState(false)
  const [telegramDraft, setTelegramDraft] = useState("")
  const [whatsappDraft, setWhatsappDraft] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    let active = true
    const load = async () => {
      const { data, error } = await supabase.from("platform_settings").select("customer_care_telegram,customer_care_whatsapp").order("id", { ascending: true }).limit(1).maybeSingle()
      if (!active) return
      if (error) { setMessage(error.message); return }
      const tg = data?.customer_care_telegram || ""
      const wa = data?.customer_care_whatsapp || ""
      setTelegram(tg); setTelegramDraft(tg); setWhatsapp(wa); setWhatsappDraft(wa)
      if (window.location.pathname === "/admin") { const { data: isAdmin } = await supabase.rpc("is_admin"); if (active) setAdmin(isAdmin === true) }
    }
    load(); return () => { active = false }
  }, [])

  const openTelegram = () => {
    const url = telegramUrl(telegram)
    if (!url) { setMessage("Customer care Telegram username has not been configured yet."); setTimeout(() => setMessage(""), 3500); return }
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const openWhatsApp = () => {
    const url = whatsappUrl(whatsapp)
    if (!url) { setMessage("Customer care WhatsApp number has not been configured yet."); setTimeout(() => setMessage(""), 3500); return }
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const save = async e => {
    e.preventDefault()
    const tg = cleanTelegram(telegramDraft)
    const wa = cleanWhatsApp(whatsappDraft)
    if (!tg && !wa) return setMessage("Enter at least a Telegram username or WhatsApp number.")
    setSaving(true); setMessage("")
    try {
      const { data: row, error: findError } = await supabase.from("platform_settings").select("id").order("id", { ascending: true }).limit(1).maybeSingle()
      if (findError) throw findError
      if (!row?.id) throw new Error("Platform settings record was not found.")
      const { error } = await supabase.from("platform_settings").update({ customer_care_telegram: tg || null, customer_care_whatsapp: wa || null, updated_at: new Date().toISOString() }).eq("id", row.id)
      if (error) throw error
      setTelegram(tg); setTelegramDraft(tg); setWhatsapp(wa); setWhatsappDraft(wa); setEditing(false); setMessage("Customer care settings saved.")
    } catch (e) { setMessage(e.message || "Unable to save customer care settings.") }
    finally { setSaving(false) }
  }

  const fabStyle = {position:"fixed",right:18,bottom:82,zIndex:99999,minWidth:58,height:54,padding:"0 16px",border:0,borderRadius:27,background:"#229ED9",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontSize:13,fontWeight:800,cursor:"pointer",boxShadow:"0 8px 26px rgba(0,0,0,.24)"}
  const optionStyle = {minWidth:58,height:50,padding:"0 14px",border:0,borderRadius:25,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontSize:13,fontWeight:800,cursor:"pointer",boxShadow:"0 8px 24px rgba(0,0,0,.22)"}

  if (window.location.pathname === "/admin" && admin) return <>
    <button style={{...fabStyle,background:"#15171a",bottom:20}} onClick={() => { setEditing(v => !v); setMessage("") }} aria-label="Customer care settings" title="Customer care settings"><TelegramIcon /><span>Customer Care</span></button>
    {editing && <div className="customer-care-admin-panel">
      <div className="customer-care-admin-title">Customer Care</div><div className="customer-care-admin-help">Set the Telegram username and WhatsApp number users will be sent to.</div>
      <form onSubmit={save}>
        <label>Telegram username<input value={telegramDraft} onChange={e => setTelegramDraft(e.target.value)} placeholder="@CustomerCareUsername" aria-label="Customer care Telegram username" /></label>
        <label>WhatsApp number<input value={whatsappDraft} onChange={e => setWhatsappDraft(e.target.value)} placeholder="2348012345678" aria-label="Customer care WhatsApp number" inputMode="numeric" /></label>
        <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Customer Care"}</button>
      </form>
      {message && <div className="customer-care-admin-message">{message}</div>}
    </div>}
  </>

  return <>
    <div style={{position:"fixed",right:18,bottom:82,zIndex:99999,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:10}}>
      <button style={{...optionStyle,background:"#229ED9"}} onClick={openTelegram} aria-label="Customer Care on Telegram" title="Customer Care on Telegram"><TelegramIcon /><span>Telegram</span></button>
      <button style={{...optionStyle,background:"#25D366"}} onClick={openWhatsApp} aria-label="Customer Care on WhatsApp" title="Customer Care on WhatsApp"><WhatsAppIcon /><span>WhatsApp</span></button>
    </div>
    {message && <div className="customer-care-message">{message}</div>}
  </>
}
