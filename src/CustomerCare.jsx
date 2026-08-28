import { useEffect, useState } from "react"
import { supabase } from "./supabase"

const cleanUsername = value => String(value || "").trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?t\.me\//i, "").replace(/\/$/, "")
const telegramUrl = value => {
  const username = cleanUsername(value)
  return username ? `https://t.me/${encodeURIComponent(username)}` : ""
}

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
      setUsername(value)
      setDraft(value)
      if (window.location.pathname === "/admin") {
        const { data: isAdmin } = await supabase.rpc("is_admin")
        if (active) setAdmin(isAdmin === true)
      }
    }
    load()
    return () => { active = false }
  }, [])

  const openCare = () => {
    const url = telegramUrl(username)
    if (!url) {
      setMessage("Customer care Telegram username has not been configured yet.")
      if (window.location.pathname !== "/admin") setTimeout(() => setMessage(""), 3500)
      return
    }
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const save = async e => {
    e.preventDefault()
    const value = cleanUsername(draft)
    if (!value) return setMessage("Enter a Telegram username.")
    setSaving(true)
    setMessage("")
    try {
      const { data: row, error: findError } = await supabase.from("platform_settings").select("id").order("id", { ascending: true }).limit(1).maybeSingle()
      if (findError) throw findError
      if (!row?.id) throw new Error("Platform settings record was not found.")
      const { error } = await supabase.from("platform_settings").update({ customer_care_telegram: value, updated_at: new Date().toISOString() }).eq("id", row.id)
      if (error) throw error
      setUsername(value)
      setDraft(value)
      setEditing(false)
      setMessage("Customer care Telegram username saved.")
    } catch (e) {
      setMessage(e.message || "Unable to save customer care username.")
    } finally {
      setSaving(false)
    }
  }

  if (window.location.pathname === "/admin" && admin) {
    return <>
      <button className="customer-care-fab admin-care-fab" onClick={() => { setEditing(v => !v); setMessage("") }} aria-label="Customer care settings" title="Customer care settings">✈</button>
      {editing && <div className="customer-care-admin-panel">
        <div className="customer-care-admin-title">Customer Care</div>
        <div className="customer-care-admin-help">Set the Telegram username users will be sent to.</div>
        <form onSubmit={save}>
          <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="@CustomerCareUsername" aria-label="Customer care Telegram username" />
          <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Username"}</button>
        </form>
        {message && <div className="customer-care-admin-message">{message}</div>}
      </div>}
    </>
  }

  return <>
    <button className="customer-care-fab" onClick={openCare} aria-label="Customer Care" title="Customer Care">✈</button>
    {message && <div className="customer-care-message">{message}</div>}
  </>
}
