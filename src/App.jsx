import { useEffect, useRef, useState } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { supabase } from "./supabase"
import Admin from "./Admin"
import CustomerCare from "./CustomerCare"

const money = v => Number(v || 0).toLocaleString("en-NG", {
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

function UserApp() {
  const [user, setUser] = useState(null),
    [profile, setProfile] = useState(null),
    [loading, setLoading] = useState(true)

  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [loginLoading, setLoginLoading] = useState(false)

  const [depositAmount, setDepositAmount] = useState(""),
    [depositLoading, setDepositLoading] = useState(false)

  const [tasks, setTasks] = useState([]),
    [submissions, setSubmissions] = useState([]),
    [withdrawals, setWithdrawals] = useState([])

  const [proofTask, setProofTask] = useState(null),
    [proof, setProof] = useState(""),
    [taskLoading, setTaskLoading] = useState(false)

  const [withdrawalLoading, setWithdrawalLoading] = useState(false),
    [message, setMessage] = useState("")

  const [withdrawalForm, setWithdrawalForm] = useState({
    balance_type: "task",
    amount: "",
    bank_name: "",
    account_name: "",
    account_number: ""
  })

  const verificationStarted = useRef(false)

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

  const loadUserData = async u => {
    if (!u) return

    const [t, s, w] = await Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false }),

      supabase
        .from("task_submissions")
        .select(
          "id,task_id,status,reward_amount,created_at,rejection_reason"
        )
        .eq("user_id", u.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("withdrawals")
        .select("*")
        .eq("user_id", u.id)
        .order("created_at", { ascending: false })
    ])

    if (!t.error) setTasks(t.data || [])
    if (!s.error) setSubmissions(s.data || [])
    if (!w.error) setWithdrawals(w.data || [])
  }

  useEffect(() => {
    let mounted = true

    const init = async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!mounted) return

      if (session?.user) {
        setUser(session.user)
        await loadProfile(session.user)
        await loadUserData(session.user)
      }

      setLoading(false)
    }

    init()

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_, session) => {
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
    const verify = async () => {
      if (verificationStarted.current) return

      const p = new URLSearchParams(window.location.search)
      const reference = p.get("reference") || p.get("trxref")

      if (!reference) return

      verificationStarted.current = true
      setMessage("Payment returned. Checking your payment...")

      try {
        let {
          data: { session }
        } = await supabase.auth.getSession()

        if (!session?.access_token) {
          const { data } = await supabase.auth.refreshSession()
          session = data?.session || null
        }

        if (!session?.user) {
          throw new Error(
            "Please log in again to verify your payment."
          )
        }

        const { data, error } =
          await supabase.functions.invoke("verify-payment", {
            body: { reference }
          })

        if (error) throw error

        if (!data?.status) {
          throw new Error(
            data?.message || "Payment could not be verified."
          )
        }

        setMessage(
          data.message ||
            "Payment verified and balance credited successfully."
        )

        await loadProfile(session.user)
        await loadUserData(session.user)

        window.history.replaceState(
          {},
          document.title,
          window.location.origin + window.location.pathname
        )
      } catch (e) {
        setMessage(e.message || "Payment verification failed.")
      }
    }

    verify()
  }, [])

  const login = async e => {
    e.preventDefault()
    setMessage("")

    if (!email.trim() || !password) {
      return setMessage("Enter your email and password.")
    }

    setLoginLoading(true)

    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        })

      if (error) throw error

      setUser(data.user)
      await loadProfile(data.user)
      await loadUserData(data.user)
    } catch (e) {
      setMessage(e.message || "Unable to log in.")
    } finally {
      setLoginLoading(false)
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const initializeDeposit = async () => {
    const amount = Number(depositAmount)

    if (!Number.isFinite(amount) || amount < 1000) {
      return setMessage("Minimum deposit is ₦1,000.")
    }

    setDepositLoading(true)

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error(
          "Your session has expired. Please log in again."
        )
      }

      const { data, error } =
        await supabase.functions.invoke("initialize-payment", {
          body: {
            email: user.email,
            amount
          }
        })

      if (error) throw error

      if (
        !data?.status ||
        !data?.data?.authorization_url
      ) {
        throw new Error(
          data?.message || "Unable to initialize payment."
        )
      }

      window.location.href =
        data.data.authorization_url
    } catch (e) {
      setMessage(
        e.message || "Unable to initialize payment."
      )
    } finally {
      setDepositLoading(false)
    }
  }

  const submitTask = async () => {
    if (!proofTask) return

    setTaskLoading(true)
    setMessage("")

    try {
      const { error } = await supabase.rpc(
        "submit_task",
        {
          p_task_id: proofTask.id,
          p_proof: proof.trim() || null
        }
      )

      if (error) throw error

      setMessage(
        "Task submitted successfully. Your proof is now pending verification."
      )

      setProofTask(null)
      setProof("")

      await loadUserData(user)
    } catch (e) {
      setMessage(
        e.message || "Unable to submit task."
      )
    } finally {
      setTaskLoading(false)
    }
  }

  const requestWithdrawal = async e => {
    e.preventDefault()

    const amount = Number(withdrawalForm.amount)

    if (!Number.isFinite(amount) || amount < 1000) {
      return setMessage("Minimum withdrawal is ₦1,000.")
    }

    if (
      !withdrawalForm.bank_name.trim() ||
      !withdrawalForm.account_name.trim() ||
      !/^[0-9]{10}$/.test(
        withdrawalForm.account_number.trim()
      )
    ) {
      return setMessage(
        "Enter a valid bank name, account name and 10-digit account number."
      )
    }

    const balance =
      withdrawalForm.balance_type === "affiliate"
        ? Number(profile?.affiliate_balance || 0)
        : Number(profile?.task_balance || 0)

    if (amount > balance) {
      return setMessage("Insufficient balance.")
    }

    setWithdrawalLoading(true)

    try {
      const { error } = await supabase.rpc(
        "request_withdrawal",
        {
          p_balance_type:
            withdrawalForm.balance_type,
          p_amount: amount,
          p_bank_name:
            withdrawalForm.bank_name.trim(),
          p_account_name:
            withdrawalForm.account_name.trim(),
          p_account_number:
            withdrawalForm.account_number.trim()
        }
      )

      if (error) throw error

      setMessage(
        "Withdrawal request submitted. It is pending admin approval and manual payment."
      )

      setWithdrawalForm(x => ({
        ...x,
        amount: "",
        bank_name: "",
        account_name: "",
        account_number: ""
      }))

      await loadProfile(user)
      await loadUserData(user)
    } catch (e) {
      setMessage(
        e.message || "Unable to submit withdrawal."
      )
    } finally {
      setWithdrawalLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={s.center}>
        Loading Growvia...
      </div>
    )
  }

  if (!user) {
    return (
      <div className="growvia-login-page">
        <div className="growvia-login-card">
          <div className="growvia-login-orb">
            G
          </div>

          <h1>Growvia</h1>

          <p>
            Complete tasks. Earn rewards. Grow with us.
          </p>

          <form
            className="growvia-login-form"
            onSubmit={login}
          >
            <input
              type="email"
              value={email}
              onChange={e =>
                setEmail(e.target.value)
              }
              placeholder="Email"
              autoComplete="email"
            />

            <input
              type="password"
              value={password}
              onChange={e =>
                setPassword(e.target.value)
              }
              placeholder="Password"
              autoComplete="current-password"
            />

            <button disabled={loginLoading}>
              {loginLoading
                ? "Signing in..."
                : "Sign in"}
            </button>
          </form>

          {message && (
            <div className="growvia-login-message">
              {message}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <header style={s.header}>
          <div>
            <div style={s.brand}>
              Growvia
            </div>

            <div style={s.muted}>
              Welcome
              {profile?.full_name
                ? `, ${profile.full_name}`
                : ""}
            </div>
          </div>

          <button
            style={s.secondary}
            onClick={logout}
          >
            Log out
          </button>
        </header>

        {message && (
          <div style={s.notice}>
            {message}
          </div>
        )}

        <section style={s.hero}>
          <div>
            <div style={s.heroLabel}>
              Available earnings
            </div>

            <div style={s.heroAmount}>
              ₦
              {money(
                Number(
                  profile?.task_balance || 0
                ) +
                  Number(
                    profile?.affiliate_balance || 0
                  )
              )}
            </div>

            <div style={s.heroSub}>
              Task + affiliate balances
            </div>
          </div>

          <div style={s.logoSmall}>
            G
          </div>
        </section>

        <div style={s.grid}>
          <div style={s.card}>
            <div style={s.muted}>
              Task Balance
            </div>

            <h2>
              ₦{money(profile?.task_balance)}
            </h2>
          </div>

          <div style={s.card}>
            <div style={s.muted}>
              Affiliate Balance
            </div>

            <h2>
              ₦{money(profile?.affiliate_balance)}
            </h2>
          </div>
        </div>

        <section style={s.card}>
          <div style={s.sectionHead}>
            <div>
              <h2>Available Tasks</h2>

              <p style={s.muted}>
                Complete a task and submit the
                requested proof. Rewards are
                credited after admin verification.
              </p>
            </div>
          </div>

          {tasks.length === 0 ? (
            <p style={s.muted}>
              No active tasks available right now.
            </p>
          ) : (
            tasks.map(t => {
              const sub = submissions.find(
                x => x.task_id === t.id
              )

              return (
                <article
                  key={t.id}
                  style={s.task}
                >
                  <div style={{ flex: 1 }}>
                    <h3
                      style={{
                        margin: "0 0 6px"
                      }}
                    >
                      {t.title}
                    </h3>

                    <p style={s.muted}>
                      {t.description ||
                        "Complete this task according to the instructions."}
                    </p>

                    <div style={s.muted}>
                      {t.task_type || "Task"} ·{" "}
                      {t.verification_method ||
                        "Proof verification"}
                    </div>
                  </div>

                  <div style={s.taskAction}>
                    <div style={s.reward}>
                      ₦{money(t.reward)}
                    </div>

                    {sub ? (
                      <span style={s.status}>
                        {sub.status}

                        {sub.status ===
                          "rejected" &&
                        sub.rejection_reason
                          ? `: ${sub.rejection_reason}`
                          : ""}
                      </span>
                    ) : (
                      <button
                        style={s.smallButton}
                        onClick={() => {
                          setProofTask(t)
                          setProof("")
                        }}
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </article>
              )
            })
          )}
        </section>

        {proofTask && (
          <section style={s.card}>
            <h2>
              Submit: {proofTask.title}
            </h2>

            <p style={s.muted}>
              Enter the proof requested by this
              task. Your submission will remain
              pending until an admin reviews it.
            </p>

            <textarea
              value={proof}
              onChange={e =>
                setProof(e.target.value)
              }
              placeholder="Paste proof, link, username, screenshot link, or required details..."
              style={{
                ...s.input,
                minHeight: 120,
                resize: "vertical"
              }}
            />

            <button
              style={s.primary}
              disabled={taskLoading}
              onClick={submitTask}
            >
              {taskLoading
                ? "Submitting..."
                : "Submit for Verification"}
            </button>

            <button
              style={{
                ...s.secondary,
                width: "100%",
                marginTop: 8
              }}
              onClick={() =>
                setProofTask(null)
              }
            >
              Cancel
            </button>
          </section>
        )}

        <section style={s.card}>
          <div style={s.sectionHead}>
            <div>
              <h2>Deposit</h2>

              <p style={s.muted}>
                Pay securely with Paystack.
                Successful payments are verified
                and credited automatically.
              </p>
            </div>

            <span style={s.badge}>
              Automatic
            </span>
          </div>

          <input
            type="number"
            min="1000"
            step="100"
            value={depositAmount}
            onChange={e =>
              setDepositAmount(e.target.value)
            }
            placeholder="Enter amount"
            style={s.input}
          />

          <button
            style={s.primary}
            disabled={depositLoading}
            onClick={initializeDeposit}
          >
            {depositLoading
              ? "Processing..."
              : "Deposit with Paystack"}
          </button>
        </section>

        <section style={s.card}>
          <h2>Withdraw Earnings</h2>

          <p style={s.muted}>
            Withdrawals are reviewed and paid
            manually by our team. You will see
            the status here after approval and
            payment.
          </p>

          <form
            onSubmit={requestWithdrawal}
          >
            <label style={s.label}>
              Balance

              <select
                value={
                  withdrawalForm.balance_type
                }
                onChange={e =>
                  setWithdrawalForm(x => ({
                    ...x,
                    balance_type:
                      e.target.value
                  }))
                }
                style={s.input}
              >
                <option value="task">
                  Task Balance — ₦
                  {money(
                    profile?.task_balance
                  )}
                </option>

                <option value="affiliate">
                  Affiliate Balance — ₦
                  {money(
                    profile?.affiliate_balance
                  )}
                </option>
              </select>
            </label>

            <label style={s.label}>
              Amount

              <input
                type="number"
                min="1000"
                step="100"
                value={
                  withdrawalForm.amount
                }
                onChange={e =>
                  setWithdrawalForm(x => ({
                    ...x,
                    amount: e.target.value
                  }))
                }
                placeholder="₦1,000 minimum"
                style={s.input}
              />
            </label>

            <label style={s.label}>
              Bank Name

              <input
                value={
                  withdrawalForm.bank_name
                }
                onChange={e =>
                  setWithdrawalForm(x => ({
                    ...x,
                    bank_name: e.target.value
                  }))
                }
                placeholder="Bank name"
                style={s.input}
              />
            </label>

            <label style={s.label}>
              Account Name

              <input
                value={
                  withdrawalForm.account_name
                }
                onChange={e =>
                  setWithdrawalForm(x => ({
                    ...x,
                    account_name:
                      e.target.value
                  }))
                }
                placeholder="Account name"
                style={s.input}
              />
            </label>

            <label style={s.label}>
              Account Number

              <input
                inputMode="numeric"
                maxLength="10"
                value={
                  withdrawalForm.account_number
                }
                onChange={e =>
                  setWithdrawalForm(x => ({
                    ...x,
                    account_number:
                      e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 10)
                  }))
                }
                placeholder="10-digit account number"
                style={s.input}
              />
            </label>

            <button
              style={s.primary}
              disabled={withdrawalLoading}
            >
              {withdrawalLoading
                ? "Submitting..."
                : "Request Withdrawal"}
            </button>
          </form>
        </section>

        <section style={s.card}>
          <h2>My Withdrawals</h2>

          {withdrawals.length === 0 ? (
            <p style={s.muted}>
              No withdrawal requests yet.
            </p>
          ) : (
            withdrawals.map(w => (
              <div
                key={w.id}
                style={s.item}
              >
                <div>
                  <strong>
                    ₦{money(w.amount)}
                  </strong>

                  <div style={s.muted}>
                    {w.bank_name || "Bank"} ·{" "}
                    {w.account_number || ""}
                  </div>

                  <div style={s.muted}>
                    {dateText(w.created_at)}
                  </div>
                </div>

                <span style={s.status}>
                  {w.status || "pending"}
                </span>
              </div>
            ))
          )}
        </section>

        <footer style={s.footer}>
          Growvia · Digital services and
          online task platform
        </footer>

        {/* Customer Care: Telegram + WhatsApp */}
        <CustomerCare />
      </div>
    </div>
  )
}

const s = {
  page: {
    minHeight: "100vh",
    padding: 20,
    background: "#f5f7fb",
    fontFamily: "Inter,Arial,sans-serif",
    color: "#15171a"
  },

  wrap: {
    maxWidth: 850,
    margin: "0 auto"
  },

  center: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    fontFamily: "Arial,sans-serif"
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 20
  },

  brand: {
    fontSize: 25,
    fontWeight: 850
  },

  muted: {
    color: "#68707d",
    fontSize: 13,
    lineHeight: 1.5
  },

  hero: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderRadius: 22,
    marginBottom: 16,
    background: "#15171a",
    color: "#fff"
  },

  heroLabel: {
    opacity: 0.75,
    fontSize: 13
  },

  heroAmount: {
    fontSize: 34,
    fontWeight: 850,
    margin: "5px 0"
  },

  heroSub: {
    opacity: 0.65,
    fontSize: 12
  },

  logoSmall: {
    width: 52,
    height: 52,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,.18)",
    fontSize: 25,
    fontWeight: 800
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: 14
  },

  card: {
    background: "#fff",
    border: "1px solid #e4e7ec",
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    boxShadow:
      "0 5px 20px rgba(0,0,0,.035)"
  },

  sectionHead: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    marginBottom: 10
  },

  input: {
    width: "100%",
    padding: 13,
    border: "1px solid #d9dee7",
    borderRadius: 11,
    margin: "6px 0 12px",
    boxSizing: "border-box",
    fontSize: 15,
    background: "#fff"
  },

  label: {
    display: "block",
    fontWeight: 650,
    fontSize: 13
  },

  primary: {
    width: "100%",
    padding: 14,
    border: 0,
    borderRadius: 11,
    background: "#15171a",
    color: "#fff",
    fontWeight: 750,
    fontSize: 15
  },

  secondary: {
    padding: "10px 14px",
    border: "1px solid #d9dee7",
    borderRadius: 10,
    background: "#fff"
  },

  notice: {
    background: "#eef3ff",
    border: "1px solid #ccd8ff",
    padding: 12,
    borderRadius: 11,
    marginBottom: 14,
    lineHeight: 1.5
  },

  badge: {
    fontSize: 11,
    fontWeight: 800,
    padding: "6px 9px",
    borderRadius: 999,
    background: "#edf7ef",
    color: "#2d6a3f"
  },

  task: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "center",
    padding: 16,
    border: "1px solid #e4e7ec",
    borderRadius: 13,
    marginBottom: 10
  },

  taskAction: {
    textAlign: "right",
    minWidth: 110
  },

  reward: {
    fontWeight: 850,
    whiteSpace: "nowrap",
    marginBottom: 8
  },

  smallButton: {
    padding: "9px 12px",
    border: 0,
    borderRadius: 9,
    background: "#15171a",
    color: "#fff",
    fontWeight: 700
  },

  status: {
    fontSize: 11,
    fontWeight: 800,
    padding: "6px 9px",
    borderRadius: 999,
    background: "#f0f1f3",
    textTransform: "capitalize",
    whiteSpace: "normal",
    display: "inline-block",
    maxWidth: 180
  },

  item: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    padding: 14,
    border: "1px solid #e4e7ec",
    borderRadius: 12,
    marginBottom: 8
  },

  footer: {
    textAlign: "center",
    padding: "10px 0 25px",
    color: "#8a919d",
    fontSize: 12
  }
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/admin"
          element={<Admin />}
        />

        <Route
          path="*"
          element={<UserApp />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
