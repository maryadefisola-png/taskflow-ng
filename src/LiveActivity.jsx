import { useEffect, useMemo, useState } from "react"
import { supabase } from "./supabase"

const naira = value => `₦${Number(value || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`

const activityMeta = {
  earned: { icon: "↗", label: "earned" },
  deposited: { icon: "↓", label: "deposited" },
  withdrew: { icon: "↑", label: "withdrew" },
}

function relativeTime(value) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 5) return "just now"
  if (seconds < 60) return `${seconds} seconds ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`
  const hours = Math.floor(minutes / 60)
  return `${hours} hour${hours === 1 ? "" : "s"} ago`
}

export default function LiveActivity() {
  const [items, setItems] = useState([])
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)
  const [tick, setTick] = useState(0)

  async function load() {
    const { data, error } = await supabase.rpc("get_live_activity", { p_limit: 20 })
    if (!error && Array.isArray(data)) {
      setItems(data)
      setIndex(current => data.length ? current % data.length : 0)
    }
  }

  useEffect(() => {
    load()
    const poll = window.setInterval(load, 10000)
    const clock = window.setInterval(() => setTick(t => t + 1), 5000)
    return () => {
      window.clearInterval(poll)
      window.clearInterval(clock)
    }
  }, [])

  useEffect(() => {
    if (items.length < 2) return
    const rotate = window.setInterval(() => {
      setVisible(false)
      window.setTimeout(() => {
        setIndex(current => (current + 1) % items.length)
        setVisible(true)
      }, 220)
    }, 4500)
    return () => window.clearInterval(rotate)
  }, [items.length])

  const current = items[index]
  const meta = current ? activityMeta[current.activity_type] || activityMeta.earned : null
  const time = useMemo(() => current ? relativeTime(current.created_at) : "", [current, tick])

  if (window.location.pathname !== "/" || !current) return null

  return (
    <section
      aria-label="Live activity"
      style={{
        position: "fixed", top: 166, left: "50%", transform: "translateX(-50%)",
        width: "min(420px, calc(100vw - 32px))", boxSizing: "border-box", zIndex: 900,
        background: "rgba(255,255,255,.97)", border: "1px solid #e6e9ef", borderRadius: 16,
        padding: "11px 13px", boxShadow: "0 10px 28px rgba(15,23,42,.10)",
        backdropFilter: "blur(10px)", pointerEvents: "none",
        opacity: visible ? 1 : 0, transition: "opacity .22s ease, transform .22s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ position: "relative", width: 28, height: 28, borderRadius: 9, display: "grid", placeItems: "center", background: "#f0fdf4", color: "#16a34a", fontWeight: 900, flexShrink: 0 }}>
          <span style={{ position: "absolute", width: 7, height: 7, borderRadius: 999, background: "#22c55e", top: -2, right: -2, boxShadow: "0 0 0 3px #fff, 0 0 0 5px rgba(34,197,94,.18)" }} />
          {meta.icon}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
            <span style={{ fontSize: 10, fontWeight: 850, letterSpacing: ".08em", color: "#16a34a" }}>● LIVE ACTIVITY</span>
          </div>
          <div style={{ fontSize: 13, color: "#4b5563", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <b style={{ color: "#15171a" }}>{current.masked_name}</b> just {meta.label} <b style={{ color: "#15171a" }}>{naira(current.amount)}</b>
          </div>
          <div style={{ fontSize: 10, color: "#8a929f", marginTop: 2 }}>{time}</div>
        </div>
      </div>
    </section>
  )
}
