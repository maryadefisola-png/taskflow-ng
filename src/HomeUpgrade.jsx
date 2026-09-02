import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { supabase } from "./supabase"

const naira = v => `₦${Number(v || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const ago = value => { const s=Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/1000)); if(s<60)return "Just now"; const m=Math.floor(s/60); if(m<60)return `${m}m ago`; const h=Math.floor(m/60); if(h<24)return `${h}h ago`; return `${Math.floor(h/24)}d ago` }

export default function HomeUpgrade({ user }) {
  const [rows,setRows]=useState([]), [,setTick]=useState(0)
  useEffect(()=>{
    if(window.location.pathname!=="/") return
    let alive=true
    const load=async()=>{
      if(!user?.id)return
      const [d,w,s]=await Promise.all([
        supabase.from("deposits").select("amount,status,created_at").eq("user_id",user.id).eq("status","success").order("created_at",{ascending:false}).limit(5),
        supabase.from("withdrawals").select("amount,status,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(5),
        supabase.from("task_submissions").select("reward,status,created_at").eq("user_id",user.id).eq("status","approved").order("created_at",{ascending:false}).limit(5)
      ])
      if(!alive)return
      const all=[...(d.data||[]).map(x=>({...x,type:"Deposit",icon:"↓",positive:true})),...(w.data||[]).filter(x=>["paid","completed","success","approved"].includes(String(x.status).toLowerCase())).map(x=>({...x,type:"Withdrawal",icon:"↑",positive:false})),...(s.data||[]).map(x=>({...x,type:"Task reward",amount:x.reward,icon:"✓",positive:true}))].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,5)
      setRows(all)
    }
    load(); const id=setInterval(load,15000), clock=setInterval(()=>setTick(x=>x+1),30000)
    return()=>{alive=false;clearInterval(id);clearInterval(clock)}
  },[user?.id])
  if(window.location.pathname!=="/")return null
  const target=document.querySelector(".gv-app main")
  if(!target)return null
  const go=path=>{ window.history.pushState({},"",path); window.dispatchEvent(new PopStateEvent("popstate")) }
  return createPortal(<>
    <section className="gv-pro-actions">
      <button onClick={()=>go("/wallet")}><span>₦</span><b>Deposit</b><small>Add money securely</small></button>
      <button onClick={()=>go("/wallet")}><span>↑</span><b>Withdraw</b><small>Cash out earnings</small></button>
      <button onClick={()=>go("/tasks")}><span>✓</span><b>Earn</b><small>Complete tasks</small></button>
    </section>
    <section className="gv-card gv-transactions">
      <div className="gv-section-head"><div><div className="eyebrow">WALLET ACTIVITY</div><h2>Recent transactions</h2></div><button className="gv-text-btn" onClick={()=>go("/wallet")}>View wallet →</button></div>
      {rows.length?rows.map((r,i)=><div className="gv-tx" key={`${r.type}-${r.created_at}-${i}`}><span className={`gv-tx-icon ${r.positive?"positive":"negative"}`}>{r.icon}</span><div className="gv-tx-main"><b>{r.type}</b><small>{ago(r.created_at)} · {r.status}</small></div><strong className={r.positive?"positive-text":"negative-text"}>{r.positive?"+":"−"}{naira(r.amount)}</strong></div>):<div className="gv-empty"><span>◎</span><div><b>No transactions yet</b><small>Your deposits, rewards and withdrawals will appear here.</small></div></div>}
    </section>
    <section className="gv-trust"><div className="gv-trust-icon">✓</div><div><b>Account protected</b><span>Secure wallet · Verified payments · Real-time balance</span></div><span className="gv-online"><i/>Active</span></section>
  </>,target)
}
