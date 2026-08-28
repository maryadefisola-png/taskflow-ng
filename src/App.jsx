import { useEffect, useRef, useState } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { supabase } from "./supabase"
import Admin from "./Admin"

const money = v =>
  Number(v || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

const dateText = v =>
  v
    ? new Date(v).toLocaleString("en-NG", {
        dateStyle: "medium",
        timeStyle: "short"
      })
    : "—"

const pages = ["home", "tasks", "wallet", "refer", "profile", "care"]

function UserApp() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState("home")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)

  const [depositAmount, setDepositAmount] = useState("")
  const [depositLoading, setDepositLoading] = useState(false)
  const [minimumDeposit, setMinimumDeposit] = useState(100)

  const [tasks, setTasks] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [withdrawals, setWithdrawals] = useState([])

  const [proofTask, setProofTask] = useState(null)
  const [proof, setProof] = useState("")
  const [taskLoading, setTaskLoading] = useState(false)

  const [withdrawalLoading, setWithdrawalLoading] = useState(false)
  const [message, setMessage] = useState("")

  const [withdrawalForm, setWithdrawalForm] = useState({
    balance_type: "task",
    amount: "",
    bank_name: "",
    account_name: "",
    account_number: ""
  })

  const verificationStarted = useRef(false)

  useEffect(() => {
    const readPage = () => {
      const value = window.location.hash.replace("#", "") || "home"
      setPage(pages.includes(value) ? value : "home")
    }

    readPage()
    window.addEventListener("hashchange", readPage)

    return () => window.removeEventListener("hashchange", readPage)
  }, [])

  const navigate = nextPage => {
    if (!pages.includes(nextPage)) nextPage = "home"

    if (window.location.hash === `#${nextPage}`) {
      setPage(nextPage)
    } else {
      window.location.hash = nextPage
    }

    window.scrollTo({ top: 0, behavior: "smooth" })
    setMessage("")
  }

  const loadProfile = async u => {
    if (!u) {
      setProfile(null)
      return
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", u.id)
      .single()

    if (!error) setProfile(data)
  }

  const loadMinimumDeposit = async () => {
    const { data, error } = await supabase
      .from("platform_settings")
      .select("minimum_deposit")
      .limit(1)
      .maybeSingle()

    if (!error && data?.minimum_deposit != null) {
      setMinimumDeposit(Number(data.minimum_deposit))
    }
  }

  const loadUserData = async u => {
    if (!u) return

    const [tasksResult, submissionsResult, withdrawalsResult] =
      await Promise.all([
        supabase
          .from("tasks")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false }),

        supabase
          .from("task_submissions")
          .select("id,task_id,status,reward_amount,created_at,rejection_reason")
          .eq("user_id", u.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("withdrawals")
          .select("*")
          .eq("user_id", u.id)
          .order("created_at", { ascending: false })
      ])

    if (!tasksResult.error) setTasks(tasksResult.data || [])
    if (!submissionsResult.error) setSubmissions(submissionsResult.data || [])
    if (!withdrawalsResult.error) setWithdrawals(withdrawalsResult.data || [])
  }

  useEffect(() => {
    let mounted = true

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return

      await loadMinimumDeposit()

      if (session?.user) {
        setUser(session.user)
        await loadProfile(session.user)
        await loadUserData(session.user)
      }

      setLoading(false)
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (!mounted) return

      if (session?.user) {
        setUser(session.user)
        await loadProfile(session.user)
        await loadUserData(session.user)
      } else {
        setUser(null)
        setProfile(null)
        setTasks([])
        setSubmissions([])
        setWithdrawals([])
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
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

        if (!session?.user) {
          throw new Error("Please log in again to verify your payment.")
        }

        const { data, error } = await supabase.functions.invoke("verify-payment", {
          body: { reference }
        })

        if (error) throw error
        if (!data?.status) throw new Error(data?.message || "Payment could not be verified.")

        setMessage(data.message || "Payment verified and balance credited successfully.")
        await loadProfile(session.user)
        await loadUserData(session.user)

        window.history.replaceState({}, document.title, window.location.origin + window.location.pathname + window.location.hash)
      } catch (error) {
        setMessage(error.message || "Payment verification failed.")
      }
    }

    verifyPayment()
  }, [])

  const login = async e => {
    e.preventDefault()
    setMessage("")

    if (!email.trim() || !password) {
      setMessage("Enter your email and password.")
      return
    }

    setLoginLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      })

      if (error) throw error
      setUser(data.user)
      await loadProfile(data.user)
      await loadUserData(data.user)
    } catch (error) {
      setMessage(error.message || "Unable to log in.")
    } finally {
      setLoginLoading(false)
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setTasks([])
    setSubmissions([])
    setWithdrawals([])
    window.location.hash = "home"
  }

  const initializeDeposit = async () => {
    const amount = Number(depositAmount)
    const minDeposit = Number(minimumDeposit || 0)

    if (!Number.isFinite(amount) || amount < minDeposit) {
      setMessage(`Minimum deposit is ₦${money(minDeposit)}.`)
      return
    }

    setDepositLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error("Your session has expired. Please log in again.")
      }

      const { data, error } = await supabase.functions.invoke("initialize-payment", {
        body: { email: user.email, amount }
      })

      if (error) throw error
      if (!data?.status || !data?.data?.authorization_url) {
        throw new Error(data?.message || "Unable to initialize payment.")
      }

      window.location.href = data.data.authorization_url
    } catch (error) {
      setMessage(error.message || "Unable to initialize payment.")
    } finally {
      setDepositLoading(false)
    }
  }

  const submitTask = async () => {
    if (!proofTask) return
    setTaskLoading(true)
    setMessage("")

    try {
      const { error } = await supabase.rpc("submit_task", {
        p_task_id: proofTask.id,
        p_proof: proof.trim() || null
      })

      if (error) throw error

      setMessage("Task submitted successfully. Your proof is now pending verification.")
      setProofTask(null)
      setProof("")
      await loadUserData(user)
    } catch (error) {
      setMessage(error.message || "Unable to submit task.")
    } finally {
      setTaskLoading(false)
    }
  }

  const requestWithdrawal = async e => {
    e.preventDefault()
    const amount = Number(withdrawalForm.amount)

    if (!Number.isFinite(amount) || amount < 1000) {
      setMessage("Minimum withdrawal is ₦1,000.")
      return
    }

    if (!withdrawalForm.bank_name.trim() || !withdrawalForm.account_name.trim() || !/^[0-9]{10}$/.test(withdrawalForm.account_number.trim())) {
      setMessage("Enter a valid bank name, account name and 10-digit account number.")
      return
    }

    const balance = withdrawalForm.balance_type === "affiliate"
      ? Number(profile?.affiliate_balance || 0)
      : Number(profile?.task_balance || 0)

    if (amount > balance) {
      setMessage("Insufficient balance.")
      return
    }

    setWithdrawalLoading(true)

    try {
      const { error } = await supabase.rpc("request_withdrawal", {
        p_balance_type: withdrawalForm.balance_type,
        p_amount: amount,
        p_bank_name: withdrawalForm.bank_name.trim(),
        p_account_name: withdrawalForm.account_name.trim(),
        p_account_number: withdrawalForm.account_number.trim()
      })

      if (error) throw error

      setMessage("Withdrawal request submitted. It is pending admin approval and manual payment.")
      setWithdrawalForm({
        balance_type: withdrawalForm.balance_type,
        amount: "",
        bank_name: "",
        account_name: "",
        account_number: ""
      })

      await loadProfile(user)
      await loadUserData(user)
    } catch (error) {
      setMessage(error.message || "Unable to submit withdrawal.")
    } finally {
      setWithdrawalLoading(false)
    }
  }

  if (loading) return <div style={styles.center}>Loading Growvia...</div>

  if (!user) {
    return (
      <div className="growvia-login-page">
        <div className="growvia-login-card">
          <div className="growvia-login-orb">G</div>
          <h1>Growvia</h1>
          <p>Complete tasks. Earn rewards. Grow with us.</p>
          <form className="growvia-login-form" onSubmit={login}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" autoComplete="email" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" autoComplete="current-password" />
            <button disabled={loginLoading}>{loginLoading ? "Signing in..." : "Sign in"}</button>
          </form>
          {message && <div className="growvia-login-message">{message}</div>}
        </div>
      </div>
    )
  }

  const HomePage = () => (
    <>
      <section style={styles.hero}>
        <div>
          <div style={styles.heroLabel}>Available earnings</div>
          <div style={styles.heroAmount}>₦{money(Number(profile?.task_balance || 0) + Number(profile?.affiliate_balance || 0))}</div>
          <div style={styles.heroSub}>Task + affiliate balances</div>
        </div>
        <div style={styles.logoSmall}>G</div>
      </section>
      <div style={styles.grid}>
        <div style={styles.card}><div style={styles.muted}>Task Balance</div><h2>₦{money(profile?.task_balance)}</h2></div>
        <div style={styles.card}><div style={styles.muted}>Affiliate Balance</div><h2>₦{money(profile?.affiliate_balance)}</h2></div>
      </div>
      <section style={styles.card}>
        <div style={styles.eyebrow}>OVERVIEW</div>
        <h2 style={{ margin: "6px 0" }}>Welcome to Growvia</h2>
        <p style={styles.muted}>Complete available tasks, grow your earnings and invite others through your referral account.</p>
        <div style={styles.overviewGrid}>
          <div style={styles.overviewBox}><strong>{tasks.length}</strong><span>Active tasks</span></div>
          <div style={styles.overviewBox}><strong>{withdrawals.length}</strong><span>Withdrawals</span></div>
        </div>
      </section>
    </>
  )

  const TasksPage = () => (
    <>
      <section style={styles.card}>
        <div style={styles.eyebrow}>EARN</div>
        <h2>Available Tasks</h2>
        <p style={styles.muted}>Complete a task and submit the requested proof. Rewards are credited after admin verification.</p>
        {tasks.length === 0 ? <div style={styles.empty}>No active tasks right now.</div> : tasks.map(task => (
          <div key={task.id} style={styles.taskCard}>
            <div><strong>{task.title}</strong><p style={styles.muted}>{task.description}</p></div>
            <div style={styles.taskReward}>₦{money(task.reward)}</div>
            <button style={styles.primaryButton} onClick={() => { setProofTask(task); setProof(""); setMessage("") }}>Submit proof</button>
          </div>
        ))}
      </section>
      {proofTask && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modal}>
            <h3>{proofTask.title}</h3>
            <p style={styles.muted}>Submit the proof requested for this task.</p>
            <textarea value={proof} onChange={e => setProof(e.target.value)} placeholder="Proof / evidence" style={styles.textarea} />
            <div style={styles.modalActions}>
              <button style={styles.secondaryButton} onClick={() => setProofTask(null)}>Cancel</button>
              <button style={styles.primaryButton} disabled={taskLoading} onClick={submitTask}>{taskLoading ? "Submitting..." : "Submit"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )

  const WalletPage = () => (
    <>
      <section style={styles.card}>
        <div style={styles.eyebrow}>WALLET</div>
        <h2>Deposit</h2>
        <p style={styles.muted}>Minimum deposit: ₦{money(minimumDeposit)}</p>
        <div style={styles.formRow}>
          <input type="number" min={minimumDeposit} value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder={`Amount (minimum ₦${money(minimumDeposit)})`} style={styles.input} />
          <button style={styles.primaryButton} disabled={depositLoading} onClick={initializeDeposit}>{depositLoading ? "Processing..." : "Deposit"}</button>
        </div>
      </section>
      <section style={styles.card}>
        <div style={styles.eyebrow}>WITHDRAW</div>
        <h2>Request withdrawal</h2>
        <form onSubmit={requestWithdrawal}>
          <select value={withdrawalForm.balance_type} onChange={e => setWithdrawalForm({ ...withdrawalForm, balance_type: e.target.value })} style={styles.input}>
            <option value="task">Task balance</option>
            <option value="affiliate">Affiliate balance</option>
          </select>
          <input type="number" value={withdrawalForm.amount} onChange={e => setWithdrawalForm({ ...withdrawalForm, amount: e.target.value })} placeholder="Amount" style={styles.input} />
          <input value={withdrawalForm.bank_name} onChange={e => setWithdrawalForm({ ...withdrawalForm, bank_name: e.target.value })} placeholder="Bank name" style={styles.input} />
          <input value={withdrawalForm.account_name} onChange={e => setWithdrawalForm({ ...withdrawalForm, account_name: e.target.value })} placeholder="Account name" style={styles.input} />
          <input value={withdrawalForm.account_number} onChange={e => setWithdrawalForm({ ...withdrawalForm, account_number: e.target.value })} placeholder="10-digit account number" style={styles.input} maxLength={10} />
          <button style={styles.primaryButton} disabled={withdrawalLoading}>{withdrawalLoading ? "Submitting..." : "Request withdrawal"}</button>
        </form>
      </section>
      <section style={styles.card}>
        <div style={styles.eyebrow}>HISTORY</div>
        <h2>Withdrawals</h2>
        {withdrawals.length === 0 ? <div style={styles.empty}>No withdrawals yet.</div> : withdrawals.map(w => (
          <div key={w.id} style={styles.historyRow}><div><strong>₦{money(w.amount)}</strong><div style={styles.muted}>{w.bank_name || "—"}</div></div><span>{w.status}</span></div>
        ))}
      </section>
    </>
  )

  const ReferPage = () => <section style={styles.card}><div style={styles.eyebrow}>REFER</div><h2>Referral</h2><p style={styles.muted}>Share your referral code and earn affiliate rewards when eligible.</p><div style={styles.refCode}>{profile?.referral_code || "—"}</div></section>
  const ProfilePage = () => <section style={styles.card}><div style={styles.eyebrow}>PROFILE</div><h2>{profile?.full_name || "Growvia user"}</h2><p style={styles.muted}>{user.email}</p><p style={styles.muted}>{profile?.phone || "No phone number"}</p><button style={styles.secondaryButton} onClick={logout}>Sign out</button></section>
  const CarePage = () => <section style={styles.card}><div style={styles.eyebrow}>SUPPORT</div><h2>Customer care</h2><p style={styles.muted}>Need help? Contact customer care through the available support channels.</p></section>

  const pageContent = {
    home: <HomePage />,
    tasks: <TasksPage />,
    wallet: <WalletPage />,
    refer: <ReferPage />,
    profile: <ProfilePage />,
    care: <CarePage />
  }[page]

  return (
    <div style={styles.app}>
      <header style={styles.header}><div style={styles.brand}>Growvia</div><nav>{pages.map(item => <button key={item} style={styles.navButton} onClick={() => navigate(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</nav></header>
      <main style={styles.main}>{message && <div style={styles.message}>{message}</div>}{pageContent}</main>
    </div>
  )
}

function App() {
  return <BrowserRouter><Routes><Route path="*" element={<UserApp />} /><Route path="/admin/*" element={<Admin />} /></Routes></BrowserRouter>
}

const styles = {
  app: { minHeight: "100vh", background: "#f6f8fb", color: "#172033" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, padding: "16px 20px", background: "#fff", borderBottom: "1px solid #e8ecf2", position: "sticky", top: 0, zIndex: 10 },
  brand: { fontWeight: 800, fontSize: 22 },
  navButton: { border: 0, background: "transparent", padding: "8px 10px", cursor: "pointer" },
  main: { maxWidth: 980, margin: "0 auto", padding: 20 },
  center: { minHeight: "100vh", display: "grid", placeItems: "center" },
  hero: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: 28, borderRadius: 20, background: "#172033", color: "#fff", marginBottom: 20 },
  heroLabel: { opacity: .75 },
  heroAmount: { fontSize: 36, fontWeight: 800, marginTop: 5 },
  heroSub: { opacity: .7, marginTop: 4 },
  logoSmall: { width: 48, height: 48, borderRadius: 16, display: "grid", placeItems: "center", background: "#fff", color: "#172033", fontWeight: 800 },
  grid: { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 16, marginBottom: 20 },
  card: { background: "#fff", border: "1px solid #e8ecf2", borderRadius: 18, padding: 20, marginBottom: 20 },
  muted: { color: "#697386", lineHeight: 1.5 },
  eyebrow: { fontSize: 12, fontWeight: 800, letterSpacing: 1.2, color: "#697386" },
  overviewGrid: { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12, marginTop: 18 },
  overviewBox: { padding: 16, borderRadius: 14, background: "#f6f8fb", display: "flex", flexDirection: "column", gap: 4 },
  empty: { padding: 16, color: "#697386" },
  taskCard: { borderTop: "1px solid #e8ecf2", padding: "16px 0", display: "grid", gridTemplateColumns: "1fr auto", gap: 8 },
  taskReward: { fontWeight: 800 },
  primaryButton: { border: 0, borderRadius: 10, padding: "11px 15px", background: "#172033", color: "#fff", cursor: "pointer" },
  secondaryButton: { border: "1px solid #d7dce5", borderRadius: 10, padding: "11px 15px", background: "#fff", cursor: "pointer" },
  input: { width: "100%", boxSizing: "border-box", border: "1px solid #d7dce5", borderRadius: 10, padding: 12, marginBottom: 10, background: "#fff" },
  textarea: { width: "100%", minHeight: 120, boxSizing: "border-box", border: "1px solid #d7dce5", borderRadius: 10, padding: 12, resize: "vertical" },
  formRow: { display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "start" },
  modalBackdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "grid", placeItems: "center", padding: 20, zIndex: 20 },
  modal: { width: "min(520px,100%)", background: "#fff", borderRadius: 18, padding: 20 },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 },
  historyRow: { display: "flex", justifyContent: "space-between", padding: "14px 0", borderTop: "1px solid #e8ecf2" },
  refCode: { padding: 14, borderRadius: 10, background: "#f6f8fb", fontWeight: 800, letterSpacing: 1 },
  message: { padding: 14, borderRadius: 12, background: "#fff", border: "1px solid #e8ecf2", marginBottom: 16 }
}

export default App
