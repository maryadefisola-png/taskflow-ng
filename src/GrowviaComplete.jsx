import { useEffect, useState } from "react"
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom"
import { supabase } from "./supabase"

const money = (v) => Number(v || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const s = {
  page: { minHeight: "100vh", background: "#f5f7fb", color: "#15171a", fontFamily: "Inter,Arial,sans-serif", padding: 20 },
  wrap: { maxWidth: 900, margin: "0 auto", paddingBottom: 30 },
  card: { background: "#fff", border: "1px solid #e4e7ec", borderRadius: 18, padding: 20, marginBottom: 16, boxShadow: "0 5px 20px rgba(0,0,0,.035)" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 14 },
  input: { width: "100%", boxSizing: "border-box", padding: 12, border: "1px solid #d9dee7", borderRadius: 10, margin: "5px 0 12px", fontSize: 15 },
  button: { padding: "11px 15px", border: 0, borderRadius: 10, background: "#15171a", color: "#fff", fontWeight: 750 },
  secondary: { padding: "10px 14px", border: "1px solid #d9dee7", borderRadius: 10, background: "#fff" },
  muted: { color: "#68707d", fontSize: 13, lineHeight: 1.5 },
  notice: { padding: 12, borderRadius: 11, background: "#eef3ff", border: "1px solid #ccd8ff", marginBottom: 14 },
  item: { padding: 14, border: "1px solid #e4e7ec", borderRadius: 12, marginBottom: 9, display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center" },
  status: { fontSize: 11, fontWeight: 800, padding: "6px 9px", borderRadius: 999, background: "#f0f1f3", textTransform: "capitalize" }
}

function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setMessage("")
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) setMessage(error.message)
    setBusy(false)
  }

  return (
    <div style={{ ...s.page, display: "grid", placeItems: "center" }}>
      <div style={{ ...s.card, maxWidth: 420, width: "100%", textAlign: "center" }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: "#15171a", color: "#fff", display: "grid", placeItems: "center", margin: "0 auto 12px", fontSize: 28, fontWeight: 850 }}>G</div>
        <h1>Growvia</h1>
        <p style={s.muted}>Complete tasks. Earn rewards. Grow with us.</p>
        <form onSubmit={submit}>
          <input style={s.input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input style={s.input} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button style={{ ...s.button, width: "100%" }} disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
        </form>
        {message && <p style={s.notice}>{message}</p>}
      </div>
    </div>
  )
}

function UserApp() {
  const nav = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [plans, setPlans] = useState([])
  const [activation, setActivation] = useState(null)
  const [tasks, setTasks] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [deposit, setDeposit] = useState("")
  const [proofTask, setProofTask] = useState(null)
  const [proof, setProof] = useState("")
  const [campaign, setCampaign] = useState({ title: "", description: "", target_url: "", cost_per_click: "", budget: "" })
  const [withdrawal, setWithdrawal] = useState({ balance_type: "task", amount: "", bank_name: "", account_name: "", account_number: "" })
  const page = location.pathname.replace(/^\//, "") || "home"

  async function loadData(u) {
    if (!u) return
    const [p, pl, a, t, sub, w, c] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", u.id).single(),
      supabase.from("activation_plans").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("user_activations").select("*,activation_plans(*)").eq("user_id", u.id).eq("status", "active").maybeSingle(),
      supabase.from("tasks").select("*").eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("task_submissions").select("*").eq("user_id", u.id).order("created_at", { ascending: false }),
      supabase.from("withdrawals").select("*").eq("user_id", u.id).order("created_at", { ascending: false }),
      supabase.from("engagement_campaigns").select("*").or(`user_id.eq.${u.id},status.eq.approved`).order("created_at", { ascending: false })
    ])
    setProfile(p.data || null)
    setPlans(pl.data || [])
    setActivation(a.data || null)
    setTasks(t.data || [])
    setSubmissions(sub.data || [])
    setWithdrawals(w.data || [])
    setCampaigns(c.data || [])
  }

  useEffect(() => {
    let active = true
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!active) return
      if (session?.user) {
        setUser(session.user)
        await loadData(session.user)
      }
      setLoading(false)
    }
    init()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return
      if (session?.user) {
        setUser(session.user)
        await loadData(session.user)
      } else {
        setUser(null)
        setProfile(null)
      }
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [])

  if (loading) return <div style={s.page}>Loading Growvia...</div>
  if (!user) return <Login />

  async function logout() {
    await supabase.auth.signOut()
    setUser(null)
    nav("/")
  }

  async function startDeposit() {
    const amount = Number(deposit)
    if (!Number.isFinite(amount) || amount < 1000) return setMessage("Minimum deposit is ₦1,000.")
    const { data, error } = await supabase.functions.invoke("initialize-payment", { body: { email: user.email, amount } })
    if (error) return setMessage(error.message)
    if (!data?.data?.authorization_url) return setMessage(data?.message || "Unable to initialize payment.")
    window.location.href = data.data.authorization_url
  }

  async function activatePlan(plan) {
    if (activation) return
    const { error } = await supabase.rpc("activate_plan", { p_plan_id: plan.id })
    if (error) return setMessage(error.message)
    setMessage(`${plan.name} activated successfully.`)
    await loadData(user)
  }

  async function submitTask() {
    if (!proofTask) return
    const { error } = await supabase.rpc("submit_task", { p_task_id: proofTask.id, p_proof: proof.trim() || null })
    if (error) return setMessage(error.message)
    setProofTask(null)
    setProof("")
    setMessage("Task submitted for verification.")
    await loadData(user)
  }

  async function createCampaign(e) {
    e.preventDefault()
    const cost = Number(campaign.cost_per_click)
    const budget = Number(campaign.budget)
    if (!campaign.title.trim() || !campaign.target_url.trim() || !Number.isFinite(cost) || cost <= 0 || !Number.isFinite(budget) || budget < cost) {
      return setMessage("Enter a title, link, valid cost per click and a budget at least equal to one click.")
    }
    const { error } = await supabase.rpc("create_engagement_campaign", {
      p_title: campaign.title.trim(), p_description: campaign.description.trim() || null,
      p_target_url: campaign.target_url.trim(), p_cost_per_click: cost, p_budget: budget
    })
    if (error) return setMessage(error.message)
    setCampaign({ title: "", description: "", target_url: "", cost_per_click: "", budget: "" })
    setMessage("Campaign submitted for admin approval.")
    await loadData(user)
  }

  async function engage(c) {
    const { error } = await supabase.rpc("register_engagement_click", { p_campaign_id: c.id })
    if (error) return setMessage(error.message)
    window.open(c.target_url, "_blank", "noopener,noreferrer")
    setMessage(`You earned ₦${money(c.cost_per_click)}.`)
    await loadData(user)
  }

  async function requestWithdrawal(e) {
    e.preventDefault()
    const amount = Number(withdrawal.amount)
    if (!Number.isFinite(amount) || amount < 1000) return setMessage("Minimum withdrawal is ₦1,000.")
    if (!withdrawal.bank_name.trim() || !withdrawal.account_name.trim() || !/^\d{10}$/.test(withdrawal.account_number)) return setMessage("Enter valid bank details and a 10-digit account number.")
    const { error } = await supabase.rpc("request_withdrawal", {
      p_balance_type: withdrawal.balance_type, p_amount: amount, p_bank_name: withdrawal.bank_name.trim(),
      p_account_name: withdrawal.account_name.trim(), p_account_number: withdrawal.account_number
    })
    if (error) return setMessage(error.message)
    setWithdrawal({ balance_type: withdrawal.balance_type, amount: "", bank_name: "", account_name: "", account_number: "" })
    setMessage("Withdrawal submitted. Payment is manual after admin approval.")
    await loadData(user)
  }

  const Home = () => (
    <>
      <section style={{ ...s.card, background: "#15171a", color: "#fff" }}>
        <div style={{ opacity: .7 }}>Available earnings</div>
        <div style={{ fontSize: 34, fontWeight: 850, margin: "5px 0" }}>₦{money(Number(profile?.task_balance || 0) + Number(profile?.affiliate_balance || 0))}</div>
        <div style={{ opacity: .65, fontSize: 12 }}>Task + affiliate balances</div>
      </section>
      <div style={s.grid}>
        <div style={s.card}><div style={s.muted}>Task Balance</div><h2>₦{money(profile?.task_balance)}</h2></div>
        <div style={s.card}><div style={s.muted}>Affiliate Balance</div><h2>₦{money(profile?.affiliate_balance)}</h2></div>
        <div style={s.card}><div style={s.muted}>Active Tasks</div><h2>{tasks.length}</h2></div>
        <div style={s.card}><div style={s.muted}>Activation</div><h2>{activation?.activation_plans?.name || "Not activated"}</h2></div>
      </div>
      <section style={s.card}><small>OVERVIEW</small><h2>Welcome to Growvia</h2><p style={s.muted}>Home is only your overview. Each other section has its own dedicated page.</p></section>
    </>
  )

  const Tasks = () => (
    <>
      <section style={s.card}>
        <small>POST & EARN</small><h2>Post your stuff for engagement</h2>
        {activation ? (
          <form onSubmit={createCampaign}>
            <p style={s.muted}>Set what you want promoted, how much you will pay per click, and your total campaign budget. Campaigns require admin approval.</p>
            <label>Title<input style={s.input} value={campaign.title} onChange={e => setCampaign({ ...campaign, title: e.target.value })} /></label>
            <label>Description<textarea style={s.input} rows="3" value={campaign.description} onChange={e => setCampaign({ ...campaign, description: e.target.value })} /></label>
            <label>Link / URL<input style={s.input} type="url" value={campaign.target_url} onChange={e => setCampaign({ ...campaign, target_url: e.target.value })} /></label>
            <label>Pay per click<input style={s.input} type="number" min="1" step="0.01" value={campaign.cost_per_click} onChange={e => setCampaign({ ...campaign, cost_per_click: e.target.value })} /></label>
            <label>Campaign budget<input style={s.input} type="number" min="1" step="0.01" value={campaign.budget} onChange={e => setCampaign({ ...campaign, budget: e.target.value })} /></label>
            <button style={s.button}>Submit Campaign</button>
          </form>
        ) : <div style={s.notice}>Activate an activation plan to unlock Post & Earn.</div>}
      </section>

      <section style={s.card}><h2>Available Tasks</h2>
        {tasks.length === 0 ? <p style={s.muted}>No active tasks available right now.</p> : tasks.map(task => {
          const sub = submissions.find(x => x.task_id === task.id)
          return <div style={s.item} key={task.id}>
            <div><strong>{task.title}</strong><p style={s.muted}>{task.description}</p><b>₦{money(task.reward)}</b></div>
            {sub ? <span style={s.status}>{sub.status}</span> : <button style={s.button} onClick={() => setProofTask(task)}>Complete</button>}
          </div>
        })}
      </section>

      {proofTask && <section style={s.card}><h2>Submit: {proofTask.title}</h2><textarea style={{ ...s.input, minHeight: 120 }} value={proof} onChange={e => setProof(e.target.value)} placeholder="Enter proof..." /><button style={s.button} onClick={submitTask}>Submit for Verification</button></section>}

      <section style={s.card}><h2>Available Engagements</h2>
        {campaigns.filter(c => c.status === "approved" && c.user_id !== user.id).length === 0 ? <p style={s.muted}>No approved engagements available.</p> : campaigns.filter(c => c.status === "approved" && c.user_id !== user.id).map(c => <div style={s.item} key={c.id}><div><strong>{c.title}</strong><p style={s.muted}>{c.description}</p><b>₦{money(c.cost_per_click)} per click</b></div><button style={s.button} onClick={() => engage(c)}>Click & Earn</button></div>)}
      </section>
    </>
  )

  const Plans = () => <section style={s.card}><small>ACTIVATION</small><h2>Activation Plans</h2>{activation && <div style={s.notice}>Active plan: <b>{activation.activation_plans?.name}</b></div>}<div style={s.grid}>{plans.map(plan => <div style={s.card} key={plan.id}><h3>{plan.name}</h3><div style={{ fontSize: 26, fontWeight: 850 }}>₦{money(plan.price)}</div><p>{plan.description}</p><p style={s.muted}>{plan.benefits || `Up to ${plan.daily_task_limit} tasks and ${plan.daily_blog_limit} blogs daily`}</p><p style={s.muted}>Referral bonus: ₦{money(plan.referral_bonus)}</p><button style={{ ...s.button, width: "100%" }} disabled={!!activation} onClick={() => activatePlan(plan)}>{activation ? "Plan Active" : "Activate Plan"}</button></div>)}</div></section>

  const Wallet = () => <>
    <section style={s.card}><h2>Wallet</h2><div style={s.grid}><div><div style={s.muted}>Task Balance</div><h2>₦{money(profile?.task_balance)}</h2></div><div><div style={s.muted}>Affiliate Balance</div><h2>₦{money(profile?.affiliate_balance)}</h2></div></div></section>
    <section style={s.card}><h2>Deposit</h2><p style={s.muted}>Pay securely with Paystack. Successful payments are verified and credited automatically.</p><input style={s.input} type="number" min="1000" value={deposit} onChange={e => setDeposit(e.target.value)} placeholder="Minimum ₦1,000" /><button style={s.button} onClick={startDeposit}>Deposit with Paystack</button></section>
    <section style={s.card}><h2>Withdraw</h2><p style={s.muted}>Withdrawals are reviewed and paid manually after admin approval.</p><form onSubmit={requestWithdrawal}><select style={s.input} value={withdrawal.balance_type} onChange={e => setWithdrawal({ ...withdrawal, balance_type: e.target.value })}><option value="task">Task Balance</option><option value="affiliate">Affiliate Balance</option></select><input style={s.input} type="number" min="1000" value={withdrawal.amount} onChange={e => setWithdrawal({ ...withdrawal, amount: e.target.value })} placeholder="Amount" /><input style={s.input} value={withdrawal.bank_name} onChange={e => setWithdrawal({ ...withdrawal, bank_name: e.target.value })} placeholder="Bank Name" /><input style={s.input} value={withdrawal.account_name} onChange={e => setWithdrawal({ ...withdrawal, account_name: e.target.value })} placeholder="Account Name" /><input style={s.input} inputMode="numeric" maxLength="10" value={withdrawal.account_number} onChange={e => setWithdrawal({ ...withdrawal, account_number: e.target.value.replace(/\D/g, "").slice(0, 10) })} placeholder="10-digit Account Number" /><button style={s.button}>Request Withdrawal</button></form></section>
    <section style={s.card}><h2>My Withdrawals</h2>{withdrawals.length === 0 ? <p style={s.muted}>No withdrawal requests yet.</p> : withdrawals.map(w => <div style={s.item} key={w.id}><div><b>₦{money(w.amount)}</b><div style={s.muted}>{w.bank_name} · {w.account_number}</div></div><span style={s.status}>{w.status}</span></div>)}</section>
  </>

  const Refer = () => <section style={s.card}><small>REFER</small><h2>Referral</h2><p style={s.muted}>Your referral code</p><h2>{profile?.referral_code || "—"}</h2><p>Current plan referral bonus: ₦{money(activation?.activation_plans?.referral_bonus)}</p></section>
  const Profile = () => <section style={s.card}><small>PROFILE</small><h2>My Profile</h2><p><b>Name:</b> {profile?.full_name || "—"}</p><p><b>Email:</b> {user.email}</p><p><b>Plan:</b> {activation?.activation_plans?.name || "None"}</p><button style={s.secondary} onClick={logout}>Log out</button></section>
  const Care = () => <section style={s.card}><small>CUSTOMER CARE</small><h2>Customer Care</h2><p style={s.muted}>Contact support through your preferred channel.</p><div style={s.grid}><a style={{ ...s.secondary, textDecoration: "none", color: "inherit" }} href="https://t.me/" target="_blank" rel="noreferrer">Telegram</a><a style={{ ...s.secondary, textDecoration: "none", color: "inherit" }} href="https://wa.me/" target="_blank" rel="noreferrer">WhatsApp</a></div></section>

  const pages = { home: <Home />, tasks: <Tasks />, activation: <Plans />, wallet: <Wallet />, refer: <Refer />, profile: <Profile />, care: <Care /> }
  const navItems = [["home", "Home"], ["tasks", "Tasks"], ["activation", "Plans"], ["wallet", "Wallet"], ["refer", "Refer"], ["profile", "Profile"], ["care", "Care"]]

  return <div style={s.page}><div style={s.wrap}><header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><div><b style={{ fontSize: 26 }}>Growvia</b><div style={s.muted}>Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}</div></div><button style={s.secondary} onClick={logout}>Log out</button></header>{message && <div style={s.notice}>{message}</div>}<main>{pages[page] || pages.home}</main><nav style={{ ...s.card, position: "sticky", bottom: 10, display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", padding: 8 }}>{navItems.map(([key, label]) => <button key={key} style={page === key ? s.button : s.secondary} onClick={() => nav(key === "home" ? "/" : `/${key}`)}>{label}</button>)}</nav></div></div>
}

function AdminPanel() {
  const [allowed, setAllowed] = useState(null)
  const [section, setSection] = useState("overview")
  const [plans, setPlans] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [users, setUsers] = useState([])
  const [editing, setEditing] = useState(null)
  const [message, setMessage] = useState("")

  async function load() {
    const [p, pl, c] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("activation_plans").select("*").order("sort_order"),
      supabase.from("engagement_campaigns").select("*").order("created_at", { ascending: false })
    ])
    setUsers(p.data || [])
    setPlans(pl.data || [])
    setCampaigns(c.data || [])
  }

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return setAllowed(false)
      const { data } = await supabase.rpc("is_admin")
      setAllowed(data === true)
      if (data === true) await load()
    })()
  }, [])

  if (allowed === null) return <div style={s.page}>Checking admin access...</div>
  if (!allowed) return <div style={s.page}><div style={s.card}><h2>Access denied</h2><a href="/">Return to Growvia</a></div></div>

  async function savePlan(e) {
    e.preventDefault()
    const values = { ...editing, price: Number(editing.price), daily_task_limit: Number(editing.daily_task_limit), daily_blog_limit: Number(editing.daily_blog_limit), referral_bonus: Number(editing.referral_bonus), minimum_task_withdrawal: Number(editing.minimum_task_withdrawal), minimum_blog_withdrawal: Number(editing.minimum_blog_withdrawal), sort_order: Number(editing.sort_order), updated_at: new Date().toISOString() }
    const result = editing.id ? await supabase.from("activation_plans").update(values).eq("id", editing.id) : await supabase.from("activation_plans").insert(values)
    if (result.error) return setMessage(result.error.message)
    setEditing(null)
    setMessage("Activation plan saved.")
    await load()
  }

  async function campaignStatus(c, status) {
    const { error } = await supabase.from("engagement_campaigns").update({ status, updated_at: new Date().toISOString() }).eq("id", c.id)
    if (error) return setMessage(error.message)
    setMessage(`Campaign ${status}.`)
    await load()
  }

  return <div style={s.page}><div style={s.wrap}><header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><h1>Growvia Admin</h1><div style={s.muted}>Platform management</div></div><a href="/">User App</a></header>{message && <div style={s.notice}>{message}</div>}<nav style={{ ...s.card, display: "flex", gap: 8, flexWrap: "wrap" }}>{[["overview", "Overview"], ["plans", "Activation Plans"], ["campaigns", "Engagement Campaigns"], ["users", "Users"]].map(([key, label]) => <button key={key} style={section === key ? s.button : s.secondary} onClick={() => setSection(key)}>{label}</button>)}</nav>
    {section === "overview" && <div style={s.grid}>{[["Users", users.length], ["Plans", plans.length], ["Campaigns", campaigns.length], ["Pending Campaigns", campaigns.filter(c => c.status === "pending").length]].map(([label, value]) => <div style={s.card} key={label}><div style={s.muted}>{label}</div><h2>{value}</h2></div>)}</div>}
    {section === "plans" && <><div style={s.card}><button style={s.button} onClick={() => setEditing({ name: "", price: 0, daily_task_limit: 1, daily_blog_limit: 1, referral_bonus: 0, minimum_task_withdrawal: 1000, minimum_blog_withdrawal: 1000, description: "", benefits: "", is_active: true, sort_order: plans.length + 1 })}>Add Plan</button></div>{editing && <section style={s.card}><h2>{editing.id ? "Edit Plan" : "Add Plan"}</h2><form onSubmit={savePlan}>{[["name", "Name"], ["price", "Price"], ["daily_task_limit", "Daily task limit"], ["daily_blog_limit", "Daily blog limit"], ["referral_bonus", "Referral bonus"], ["minimum_task_withdrawal", "Task withdrawal minimum"], ["minimum_blog_withdrawal", "Blog withdrawal minimum"], ["sort_order", "Sort order"]].map(([key, label]) => <label key={key}>{label}<input style={s.input} type={key === "name" ? "text" : "number"} value={editing[key]} onChange={e => setEditing({ ...editing, [key]: e.target.value })} /></label>)}<label>Description<textarea style={s.input} value={editing.description || ""} onChange={e => setEditing({ ...editing, description: e.target.value })} /></label><label>Benefits<textarea style={s.input} value={editing.benefits || ""} onChange={e => setEditing({ ...editing, benefits: e.target.value })} /></label><label><input type="checkbox" checked={!!editing.is_active} onChange={e => setEditing({ ...editing, is_active: e.target.checked })} /> Active</label><br /><button style={s.button}>Save Plan</button> <button type="button" style={s.secondary} onClick={() => setEditing(null)}>Cancel</button></form></section>}{plans.map(p => <div style={s.item} key={p.id}><div><b>{p.name}</b><div>₦{money(p.price)} · {p.daily_task_limit} tasks/day · {p.daily_blog_limit} blogs/day · referral ₦{money(p.referral_bonus)}</div><div style={s.muted}>{p.benefits}</div></div><button style={s.button} onClick={() => setEditing({ ...p })}>Edit</button></div>)}</>}
    {section === "campaigns" && <section style={s.card}><h2>Engagement Campaigns</h2>{campaigns.length === 0 ? <p style={s.muted}>No campaigns yet.</p> : campaigns.map(c => <div style={s.item} key={c.id}><div><b>{c.title}</b><div style={s.muted}>{c.target_url}</div><div>₦{money(c.cost_per_click)}/click · Budget ₦{money(c.budget)} · Spent ₦{money(c.spent)} · Clicks {c.total_clicks}</div><span style={s.status}>{c.status}</span></div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{c.status === "pending" && <><button style={s.button} onClick={() => campaignStatus(c, "approved")}>Approve</button><button style={s.secondary} onClick={() => campaignStatus(c, "rejected")}>Reject</button></>}{c.status === "approved" && <button style={s.secondary} onClick={() => campaignStatus(c, "paused")}>Pause</button>}{c.status === "paused" && <button style={s.button} onClick={() => campaignStatus(c, "approved")}>Resume</button>}</div></div>)}</section>}
    {section === "users" && <section style={s.card}><h2>Users</h2>{users.map(u => <div style={s.item} key={u.id}><div><b>{u.full_name || "—"}</b><div style={s.muted}>{u.id}</div></div><div>₦{money(u.task_balance)} task<br />₦{money(u.affiliate_balance)} affiliate</div></div>)}</section>}
  </div></div>
}

export default function GrowviaComplete() {
  return <BrowserRouter><Routes><Route path="/admin" element={<AdminPanel />} /><Route path="*" element={<UserApp />} /></Routes></BrowserRouter>
}
