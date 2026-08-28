import { useEffect, useState } from "react"
import { supabase } from "./supabase"

const tabs = [
  ["home", "⌂", "Home"],
  ["refer", "↗", "Refer"],
  ["wallet", "₦", "Wallet"],
  ["tasks", "✓", "Tasks"],
  ["profile", "●", "Profile"]
]

export default function UserNavigation() {
  const [active, setActive] = useState(() => window.location.hash.replace(/^#/, "") || "home")
  const [profile, setProfile] = useState(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const syncPage = () => {
      const next = window.location.hash.replace(/^#/, "") || "home"
      setActive(["home", "refer", "wallet", "tasks", "profile"].includes(next) ? next : "home")
    }
    window.addEventListener("hashchange", syncPage)
    syncPage()
    return () => window.removeEventListener("hashchange", syncPage)
  }, [])

  useEffect(() => {
    let mounted = true
    const sync = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return
      if (!session?.user) { setVisible(false); setProfile(null); return }
      setVisible(true)
      const { data } = await supabase.from("profiles").select("full_name,phone,referral_code,created_at,role,is_active").eq("id", session.user.id).maybeSingle()
      if (mounted) setProfile(data || null)
    }
    sync()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => sync())
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  if (!visible) return null

  const go = id => {
    if (window.location.hash === `#${id}`) setActive(id)
    else window.location.hash = id
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const content = () => {
    if (active === "refer") return <div style={panel}><div style={eyebrow}>GROWVIA REFERRALS</div><h2 style={title}>Invite & earn</h2><p style={text}>Share your referral code with friends and earn from eligible referrals.</p><div style={refBox}><span style={refLabel}>Your referral code</span><strong style={refCode}>{profile?.referral_code || "Not available"}</strong>{profile?.referral_code && <><button style={copyBtn} onClick={() => navigator.clipboard?.writeText(profile.referral_code)}>Copy code</button><div style={refLink}>{window.location.origin}/?ref={encodeURIComponent(profile.referral_code)}</div></>}</div></div>
    if (active === "profile") return <div style={panel}><div style={eyebrow}>YOUR ACCOUNT</div><h2 style={title}>{profile?.full_name || "Profile"}</h2><div style={profileRows}><div><span>Phone</span><strong>{profile?.phone || "Not set"}</strong></div><div><span>Referral code</span><strong>{profile?.referral_code || "Not set"}</strong></div><div><span>Status</span><strong>{profile?.is_active === false ? "Inactive" : "Active"}</strong></div><div><span>Member since</span><strong>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en-NG") : "—"}</strong></div></div><p style={text}>Use the Log out button at the top to safely end your session.</p></div>
    return null
  }

  return <>
    {content()}
    <nav aria-label="Growvia navigation" style={nav}>
      {tabs.map(([id, icon, label]) => <button key={id} onClick={() => go(id)} style={{...tab, ...(active === id ? activeTab : {})}} aria-label={label} aria-current={active === id ? "page" : undefined}><span style={tabIcon}>{icon}</span><span>{label}</span></button>)}
    </nav>
  </>
}

const nav={position:"fixed",left:"50%",bottom:12,transform:"translateX(-50%)",zIndex:9990,width:"min(720px,calc(100vw - 24px))",display:"grid",gridTemplateColumns:"repeat(5,1fr)",padding:"8px 6px",border:"1px solid #e3e7ed",borderRadius:20,background:"rgba(255,255,255,.96)",backdropFilter:"blur(16px)",boxShadow:"0 12px 35px rgba(0,0,0,.14)"}
const tab={border:0,background:"transparent",color:"#7a828e",display:"grid",placeItems:"center",gap:3,padding:"7px 3px",borderRadius:14,fontSize:11,fontWeight:700,cursor:"pointer"}
const activeTab={color:"#15171a",background:"#eef1f5"}
const tabIcon={fontSize:19,lineHeight:1,fontWeight:850}
const panel={background:"#fff",border:"1px solid #e4e7ec",borderRadius:18,padding:22,marginBottom:16,boxShadow:"0 5px 20px rgba(0,0,0,.035)"}
const eyebrow={fontSize:11,fontWeight:850,letterSpacing:".12em",color:"#7b8490"}
const title={fontSize:24,margin:"6px 0 7px"}
const text={color:"#68707d",fontSize:13,lineHeight:1.55}
const refBox={marginTop:18,padding:18,borderRadius:16,background:"#15171a",color:"#fff",display:"grid",gap:8}
const refLabel={fontSize:11,opacity:.65}
const refCode={fontSize:24,letterSpacing:1}
const copyBtn={justifySelf:"start",padding:"8px 12px",border:0,borderRadius:9,fontWeight:750,cursor:"pointer"}
const refLink={fontSize:11,opacity:.7,wordBreak:"break-all"}
const profileRows={display:"grid",gap:10,margin:"18px 0"}
