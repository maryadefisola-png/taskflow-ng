import { useEffect, useRef, useState } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { supabase } from "./supabase"
import Admin from "./Admin"

const money = (v) => Number(v || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const dateText = (v) => v ? new Date(v).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }) : "—"

function UserApp() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)
  const [depositAmount, setDepositAmount] = useState("")
  const [depositLoading, setDepositLoading] = useState(false)
  const [withdrawals, setWithdrawals] = useState([])
  const [tasks, setTasks] = useState([])
  const [withdrawalLoading, setWithdrawalLoading] = useState(false)
  const [withdrawalForm, setWithdrawalForm] = useState({ balance_type: "task", amount: "", bank_name: "", account_name: "", account_number: "" })
  const [message, setMessage] = useState("")
  const [verificationStarted] = useState({ current: false })

  const loadProfile = async (currentUser) => {
    if (!currentUser) { setProfile(null); return null }
    const { data, error } = await supabase.from("profiles").select("*").eq("id", currentUser.id).single()
    if (error) { console.error("PROFILE ERROR:", error); return null }
    setProfile(data); return data
  }

  const loadUserData = async (currentUser) => {
    if (!currentUser) return
    const [w, t] = await Promise.all([
      supabase.from("withdrawals").select("*").eq("user_id", currentUser.id).order("created_at", { ascending: false }),
      supabase.from("tasks").select("*").eq("is_active", true).order("created_at", { ascending: false }),
    ])
    if (!w.error) setWithdrawals(w.data || [])
    if (!t.error) setTasks(t.data || [])
  }

  useEffect(() => {
    let mounted = true
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return
        if (session?.user) { setUser(session.user); await loadProfile(session.user); await loadUserData(session.user) }
        else { setUser(null); setProfile(null) }
      } catch (e) { console.error("AUTH ERROR:", e) }
      finally { if (mounted) setLoading(false) }
    }
    initializeAuth()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      if (session?.user) { setUser(session.user); await loadProfile(session.user); await loadUserData(session.user) }
      else { setUser(null); setProfile(null); setWithdrawals([]) }
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    let cancelled = false
    const verifyPayment = async () => {
      if (verificationStarted.current) return
      const params = new URLSearchParams(window.location.search)
      const reference = params.get("reference") || params.get("trxref")
      if (!reference) return
      verificationStarted.current = true
      setMessage("Payment returned. Checking your payment...")
      try {
        let { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          const { data } = await supabase.auth.refreshSession()
          session = data?.session || null
        }
        if (!session?.user) { setMessage("Your login session could not be restored. Please log in again before making another payment."); return }
        if (!cancelled) { setUser(session.user); await loadProfile(session.user) }
        const { data, error } = await supabase.functions.invoke("verify-payment", { body: { reference } })
        if (error) throw error
        if (!data?.status) throw new Error(data?.message || "Payment could not be verified.")
        setMessage(data.message || "Payment verified and balance credited successfully.")
        await loadProfile(session.user); await loadUserData(session.user)
        window.history.replaceState({}, document.title, window.location.origin + window.location.pathname)
      } catch (e) { console.error("PAYMENT VERIFICATION ERROR:", e); setMessage(e.message || "Payment verification failed. Check your payment status before trying again.") }
    }
    verifyPayment()
    return () => { cancelled = true }
  }, [])

  const login = async (e) => {
    e.preventDefault(); setMessage("")
    if (!email.trim() || !password) return setMessage("Enter your email and password.")
    setLoginLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw error
      setUser(data.user); await loadProfile(data.user); await loadUserData(data.user); setMessage("Logged in successfully.")
    } catch (e) { setMessage(e.message || "Unable to log in.") }
    finally { setLoginLoading(false) }
  }

  const initializeDeposit = async () => {
    setMessage("")
    const amount = Number(depositAmount)
    if (!Number.isFinite(amount) || amount < 1000) return setMessage("Minimum deposit is ₦1,000.")
    if (!user) return setMessage("Please log in first.")
    setDepositLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error("Your login session has expired. Please log in again.")
      const { data, error } = await supabase.functions.invoke("initialize-payment", { body: { email: user.email, amount } })
      if (error) throw error
      if (!data?.status || !data?.data?.authorization_url) throw new Error(data?.message || "Unable to initialize payment.")
      window.location.href = data.data.authorization_url
    } catch (e) { console.error(e); setMessage(e.message || "Unable to initialize payment.") }
    finally { setDepositLoading(false) }
  }

  const requestWithdrawal = async (e) => {
    e.preventDefault(); setMessage("")
    const amount = Number(withdrawalForm.amount)
    if (!Number.isFinite(amount) || amount < 1000) return setMessage("Minimum withdrawal is ₦1,000.")
    if (!withdrawalForm.bank_name.trim() || !withdrawalForm.account_name.trim() || !/^\d{10}$/.test(withdrawalForm.account_number.trim())) return setMessage("Enter a valid bank name, account name and 10-digit account number.")
    const balance = withdrawalForm.balance_type === "affiliate" ? Number(profile?.affiliate_balance || 0) : Number(profile?.task_balance || 0)
    if (amount > balance) return setMessage("Insufficient balance.")
    setWithdrawalLoading(true)
    try {
      const { data, error } = await supabase.rpc("request_withdrawal", {
        p_balance_type: withdrawalForm.balance_type,
        p_amount: amount,
        p_bank_name: withdrawalForm.bank_name.trim(),
        p_account_name: withdrawalForm.account_name.trim(),
        p_account_number: withdrawalForm.account_number.trim(),
      })
      if (error) throw error
      setMessage("Withdrawal request submitted successfully. It is now pending admin approval.")
      setWithdrawalForm(x => ({ ...x, amount: "", bank_name: "", account_name: "", account_number: "" }))
      await loadProfile(user); await loadUserData(user)
      console.log("WITHDRAWAL REQUEST:", data)
    } catch (e) { console.error("WITHDRAWAL ERROR:", e); setMessage(e.message || "Unable to submit withdrawal.") }
    finally { setWithdrawalLoading(false) }
  }

  const logout = async () => { await supabase.auth.signOut(); setUser(null); setProfile(null); setWithdrawals([]); setMessage("You have been logged out.") }

  if (loading) return <div style={styles.center}>Loading...</div>
  if (!user) return <div style={styles.center}><div style={styles.login}><h1>TaskFlow NG</h1><p>Login to your account</p><form onSubmit={login}><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" autoComplete="email" style={styles.input}/><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" autoComplete="current-password" style={styles.input}/><button type="submit" disabled={loginLoading} style={styles.fullButton}>{loginLoading ? "Logging in..." : "Login"}</button></form>{message && <div style={styles.notice}>{message}</div>}</div></div>

  return <div style={styles.page}><div style={styles.wrap}>
    <header style={styles.header}><div><h1>TaskFlow NG</h1><div style={styles.muted}>Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}</div></div><button onClick={logout}>Logout</button></header>
    {message && <div style={styles.notice}>{message}</div>}

    <div style={styles.grid}><div style={styles.card}><div style={styles.muted}>Task Balance</div><h2>₦{money(profile?.task_balance)}</h2></div><div style={styles.card}><div style={styles.muted}>Affiliate Balance</div><h2>₦{money(profile?.affiliate_balance)}</h2></div></div>

    <section style={styles.card}><h2>Deposit</h2><p style={styles.muted}>Minimum deposit: ₦1,000</p><input type="number" min="1000" step="100" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="Enter amount" style={styles.input}/><button onClick={initializeDeposit} disabled={depositLoading} style={styles.fullButton}>{depositLoading ? "Processing..." : "Deposit with Paystack"}</button></section>

    <section style={styles.card}><h2>Withdraw</h2><p style={styles.muted}>Minimum withdrawal: ₦1,000. Your balance is deducted when the request is accepted by the server.</p><form onSubmit={requestWithdrawal}><label style={styles.label}>Balance<select value={withdrawalForm.balance_type} onChange={e => setWithdrawalForm(x => ({ ...x, balance_type: e.target.value }))} style={styles.input}><option value="task">Task Balance — ₦{money(profile?.task_balance)}</option><option value="affiliate">Affiliate Balance — ₦{money(profile?.affiliate_balance)}</option></select></label><label style={styles.label}>Amount<input type="number" min="1000" step="100" value={withdrawalForm.amount} onChange={e => setWithdrawalForm(x => ({ ...x, amount: e.target.value }))} placeholder="Amount" style={styles.input}/></label><label style={styles.label}>Bank Name<input value={withdrawalForm.bank_name} onChange={e => setWithdrawalForm(x => ({ ...x, bank_name: e.target.value }))} placeholder="Bank name" style={styles.input}/></label><label style={styles.label}>Account Name<input value={withdrawalForm.account_name} onChange={e => setWithdrawalForm(x => ({ ...x, account_name: e.target.value }))} placeholder="Account name" style={styles.input}/></label><label style={styles.label}>Account Number<input inputMode="numeric" maxLength="10" value={withdrawalForm.account_number} onChange={e => setWithdrawalForm(x => ({ ...x, account_number: e.target.value.replace(/\D/g, "").slice(0, 10) }))} placeholder="10-digit account number" style={styles.input}/></label><button type="submit" disabled={withdrawalLoading} style={styles.fullButton}>{withdrawalLoading ? "Submitting..." : "Request Withdrawal"}</button></form></section>

    <section style={styles.card}><h2>My Withdrawals</h2>{withdrawals.length === 0 ? <p style={styles.muted}>No withdrawal requests yet.</p> : <div style={styles.tableWrap}><table style={styles.table}><thead><tr><th>Amount</th><th>Balance</th><th>Bank</th><th>Account</th><th>Status</th><th>Date</th></tr></thead><tbody>{withdrawals.map(w => <tr key={w.id}><td>₦{money(w.amount)}</td><td>{w.balance_type || "—"}</td><td>{w.bank_name || "—"}</td><td>{w.account_number || "—"}</td><td><strong>{w.status || "—"}</strong></td><td>{dateText(w.created_at)}</td></tr>)}</tbody></table></div>}</section>

    <section style={styles.card}><h2>Available Tasks</h2>{tasks.length === 0 ? <p style={styles.muted}>No active tasks available right now.</p> : tasks.map(t => <article key={t.id} style={styles.task}><div><h3>{t.title}</h3><p>{t.description || "Complete this task to earn the listed reward."}</p><div style={styles.muted}>{t.task_type || "Task"} · {t.verification_method || "Verification required"}</div></div><strong>₦{money(t.reward)}</strong></article>)}</section>

    <div style={styles.muted}>Logged in as {user.email}</div>
  </div></div>
}

const styles = { page: { minHeight: "100vh", padding: 20, background: "#f7f7f8", fontFamily: "Arial, sans-serif", boxSizing: "border-box" }, wrap: { maxWidth: 850, margin: "0 auto" }, center: { minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, fontFamily: "Arial, sans-serif" }, login: { width: "100%", maxWidth: 420, border: "1px solid #ddd", borderRadius: 16, padding: 25, boxSizing: "border-box" }, header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 20 }, grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }, card: { background: "#fff", border: "1px solid #ddd", borderRadius: 14, padding: 20, marginBottom: 18 }, input: { width: "100%", padding: 12, margin: "6px 0 12px", boxSizing: "border-box", fontSize: 16 }, label: { display: "block", fontWeight: 600 }, fullButton: { width: "100%", padding: 14, fontSize: 16 }, notice: { background: "#eef3ff", border: "1px solid #ccd8ff", padding: 12, borderRadius: 10, marginBottom: 14, lineHeight: 1.5 }, muted: { color: "#666", fontSize: 13 }, tableWrap: { overflowX: "auto" }, table: { width: "100%", borderCollapse: "collapse", minWidth: 650 }, task: { display: "flex", justifyContent: "space-between", gap: 15, padding: 15, border: "1px solid #ddd", borderRadius: 10, marginBottom: 10 } }

function App() { return <BrowserRouter><Routes><Route path="/admin" element={<Admin />} /><Route path="*" element={<UserApp />} /></Routes></BrowserRouter> }
export default App
