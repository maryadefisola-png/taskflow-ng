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

  /* ---------------- PAGE NAVIGATION ---------------- */

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

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    })

    setMessage("")
  }

  /* ---------------- DATA ---------------- */

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

    const [tasksResult, submissionsResult, withdrawalsResult] =
      await Promise.all([
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

    if (!tasksResult.error) {
      setTasks(tasksResult.data || [])
    }

    if (!submissionsResult.error) {
      setSubmissions(submissionsResult.data || [])
    }

    if (!withdrawalsResult.error) {
      setWithdrawals(withdrawalsResult.data || [])
    }
  }

  /* ---------------- AUTH ---------------- */

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

  /* ---------------- PAYMENT VERIFICATION ---------------- */

  useEffect(() => {
    const verifyPayment = async () => {
      if (verificationStarted.current) return

      const params = new URLSearchParams(window.location.search)

      const reference =
        params.get("reference") || params.get("trxref")

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
          window.location.origin +
            window.location.pathname +
            window.location.hash
        )
      } catch (error) {
        setMessage(
          error.message || "Payment verification failed."
        )
      }
    }

    verifyPayment()
  }, [])

  /* ---------------- LOGIN ---------------- */

  const login = async e => {
    e.preventDefault()

    setMessage("")

    if (!email.trim() || !password) {
      setMessage("Enter your email and password.")
      return
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

  /* ---------------- DEPOSIT ---------------- */

  const initializeDeposit = async () => {
    const amount = Number(depositAmount)

    if (!Number.isFinite(amount) || amount < 1000) {
      setMessage("Minimum deposit is ₦1,000.")
      return
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

      if (!data?.status || !data?.data?.authorization_url) {
        throw new Error(
          data?.message || "Unable to initialize payment."
        )
      }

      window.location.href =
        data.data.authorization_url
    } catch (error) {
      setMessage(
        error.message || "Unable to initialize payment."
      )
    } finally {
      setDepositLoading(false)
    }
  }

  /* ---------------- TASKS ---------------- */

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
    } catch (error) {
      setMessage(
        error.message || "Unable to submit task."
      )
    } finally {
      setTaskLoading(false)
    }
  }

  /* ---------------- WITHDRAWAL ---------------- */

  const requestWithdrawal = async e => {
    e.preventDefault()

    const amount = Number(withdrawalForm.amount)

    if (!Number.isFinite(amount) || amount < 1000) {
      setMessage("Minimum withdrawal is ₦1,000.")
      return
    }

    if (
      !withdrawalForm.bank_name.trim() ||
      !withdrawalForm.account_name.trim() ||
      !/^[0-9]{10}$/.test(
        withdrawalForm.account_number.trim()
      )
    ) {
      setMessage(
        "Enter a valid bank name, account name and 10-digit account number."
      )
      return
    }

    const balance =
      withdrawalForm.balance_type === "affiliate"
        ? Number(profile?.affiliate_balance || 0)
        : Number(profile?.task_balance || 0)

    if (amount > balance) {
      setMessage("Insufficient balance.")
      return
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
      setMessage(
        error.message || "Unable to submit withdrawal."
      )
    } finally {
      setWithdrawalLoading(false)
    }
  }

  /* ---------------- LOADING ---------------- */

  if (loading) {
    return (
      <div style={styles.center}>
        Loading Growvia...
      </div>
    )
  }

  /* ---------------- LOGIN PAGE ---------------- */

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

  /* ---------------- HOME ---------------- */

  const HomePage = () => (
    <>
      <section style={styles.hero}>
        <div>
          <div style={styles.heroLabel}>
            Available earnings
          </div>

          <div style={styles.heroAmount}>
            ₦
            {money(
              Number(profile?.task_balance || 0) +
                Number(
                  profile?.affiliate_balance || 0
                )
            )}
          </div>

          <div style={styles.heroSub}>
            Task + affiliate balances
          </div>
        </div>

        <div style={styles.logoSmall}>
          G
        </div>
      </section>

      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.muted}>
            Task Balance
          </div>

          <h2>
            ₦{money(profile?.task_balance)}
          </h2>
        </div>

        <div style={styles.card}>
          <div style={styles.muted}>
            Affiliate Balance
          </div>

          <h2>
            ₦{money(profile?.affiliate_balance)}
          </h2>
        </div>
      </div>

      <section style={styles.card}>
        <div style={styles.eyebrow}>
          OVERVIEW
        </div>

        <h2 style={{ margin: "6px 0" }}>
          Welcome to Growvia
        </h2>

        <p style={styles.muted}>
          Complete available tasks, grow your
          earnings and invite others through your
          referral account.
        </p>

        <div style={styles.overviewGrid}>
          <div style={styles.overviewBox}>
            <strong>{tasks.length}</strong>
            <span>Active tasks</span>
          </div>

          <div style={styles.overviewBox}>
            <strong>
              {withdrawals.length}
            </strong>
            <span>Withdrawals</span>
          </div>
        </div>
      </section>
    </>
  )

  /* ---------------- TASKS PAGE ---------------- */

  const TasksPage = () => (
    <>
      <section style={styles.card}>
        <div style={styles.eyebrow}>
          EARN
        </div>

        <h2>Available Tasks</h2>

        <p style={styles.muted}>
          Complete a task and submit the requested
          proof. Rewards are credited after admin
          verification.
        </p>

        {tasks.length === 0 ? (
          <p style={styles.muted}>
            No active tasks available right now.
          </p>
        ) : (
          tasks.map(task => {
            const submission =
              submissions.find(
                item =>
                  item.task_id === task.id
              )

            return (
              <article
                key={task.id}
                style={styles.task}
              >
                <div style={{ flex: 1 }}>
                  <h3
                    style={{
                      margin: "0 0 6px"
                    }}
                  >
                    {task.title}
                  </h3>

                  <p style={styles.muted}>
                    {task.description ||
                      "Complete this task according to the instructions."}
                  </p>

                  <div style={styles.muted}>
                    {task.task_type ||
                      "Task"}{" "}
                    ·{" "}
                    {task.verification_method ||
                      "Proof verification"}
                  </div>
                </div>

                <div
                  style={styles.taskAction}
                >
                  <div style={styles.reward}>
                    ₦{money(task.reward)}
                  </div>

                  {submission ? (
                    <span style={styles.status}>
                      {submission.status}

                      {submission.status ===
                        "rejected" &&
                      submission.rejection_reason
                        ? `: ${submission.rejection_reason}`
                        : ""}
                    </span>
                  ) : (
                    <button
                      style={styles.smallButton}
                      onClick={() => {
                        setProofTask(task)
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
        <section style={styles.card}>
          <h2>
            Submit: {proofTask.title}
          </h2>

          <p style={styles.muted}>
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
              ...styles.input,
              minHeight: 120,
              resize: "vertical"
            }}
          />

          <button
            style={styles.primary}
            disabled={taskLoading}
            onClick={submitTask}
          >
            {taskLoading
              ? "Submitting..."
              : "Submit for Verification"}
          </button>

          <button
            style={{
              ...styles.secondary,
              width: "100%",
              marginTop: 8
            }}
            onClick={() => {
              setProofTask(null)
              setProof("")
            }}
          >
            Cancel
          </button>
        </section>
      )}
    </>
  )

  /* ---------------- WALLET PAGE ---------------- */

  const WalletPage = () => (
    <>
      <section style={styles.card}>
        <div style={styles.sectionHead}>
          <div>
            <div style={styles.eyebrow}>
              FUND ACCOUNT
            </div>

            <h2>Deposit</h2>

            <p style={styles.muted}>
              Pay securely with Paystack.
              Successful payments are verified
              and credited automatically.
            </p>
          </div>

          <span style={styles.badge}>
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
          style={styles.input}
        />

        <button
          style={styles.primary}
          disabled={depositLoading}
          onClick={initializeDeposit}
        >
          {depositLoading
            ? "Processing..."
            : "Deposit with Paystack"}
        </button>
      </section>

      <section style={styles.card}>
        <div style={styles.eyebrow}>
          WITHDRAW
        </div>

        <h2>Withdraw Earnings</h2>

        <p style={styles.muted}>
          Withdrawals are reviewed and paid
          manually by our team.
        </p>

        <form
          onSubmit={requestWithdrawal}
        >
          <label style={styles.label}>
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
              style={styles.input}
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

          <label style={styles.label}>
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
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
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
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
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
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
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
              style={styles.input}
            />
          </label>

          <button
            style={styles.primary}
            disabled={withdrawalLoading}
          >
            {withdrawalLoading
              ? "Submitting..."
              : "Request Withdrawal"}
          </button>
        </form>
      </section>

      <section style={styles.card}>
        <div style={styles.eyebrow}>
          HISTORY
        </div>

        <h2>My Withdrawals</h2>

        {withdrawals.length === 0 ? (
          <p style={styles.muted}>
            No withdrawal requests yet.
          </p>
        ) : (
          withdrawals.map(withdrawal => (
            <div
              key={withdrawal.id}
              style={styles.item}
            >
              <div>
                <strong>
                  ₦{money(withdrawal.amount)}
                </strong>

                <div style={styles.muted}>
                  {withdrawal.bank_name ||
                    "Bank"}{" "}
                  ·{" "}
                  {withdrawal.account_number ||
                    ""}
                </div>

                <div style={styles.muted}>
                  {dateText(
                    withdrawal.created_at
                  )}
                </div>
              </div>

              <span style={styles.status}>
                {withdrawal.status ||
                  "pending"}
              </span>
            </div>
          ))
        )}
      </section>
    </>
  )

  /* ---------------- REFERRAL PAGE ---------------- */

  const ReferPage = () => {
    const referralCode =
      profile?.referral_code || ""

    const referralLink = referralCode
      ? `${window.location.origin}/?ref=${encodeURIComponent(
          referralCode
        )}`
      : ""

    const copyReferral = async () => {
      if (!referralLink) return

      try {
        await navigator.clipboard.writeText(
          referralLink
        )

        setMessage(
          "Referral link copied successfully."
        )
      } catch {
        setMessage(
          "Unable to copy automatically. Please copy the referral link manually."
        )
      }
    }

    return (
      <section style={styles.card}>
        <div style={styles.eyebrow}>
          REFERRALS
        </div>

        <h2>Refer & Earn</h2>

        <p style={styles.muted}>
          Invite people to Growvia using your
          referral link and earn eligible
          affiliate rewards.
        </p>

        <div style={styles.referralBox}>
          <span style={styles.referralLabel}>
            Your referral code
          </span>

          <strong style={styles.referralCode}>
            {referralCode ||
              "Referral code unavailable"}
          </strong>

          {referralCode && (
            <>
              <span style={styles.referralLabel}>
                Your referral link
              </span>

              <div style={styles.referralLink}>
                {referralLink}
              </div>

              <button
                style={styles.lightButton}
                onClick={copyReferral}
              >
                Copy Referral Link
              </button>
            </>
          )}
        </div>

        <div style={styles.referralInfo}>
          <div>
            <span>Affiliate Balance</span>

            <strong>
              ₦
              {money(
                profile?.affiliate_balance
              )}
            </strong>
          </div>
        </div>
      </section>
    )
  }

  /* ---------------- PROFILE PAGE ---------------- */

  const ProfilePage = () => (
    <section style={styles.card}>
      <div style={styles.eyebrow}>
        ACCOUNT
      </div>

      <h2>
        {profile?.full_name ||
          "My Profile"}
      </h2>

      <div style={styles.profileRows}>
        <div style={styles.profileRow}>
          <span>Email</span>
          <strong>
            {user.email || "—"}
          </strong>
        </div>

        <div style={styles.profileRow}>
          <span>Full name</span>
          <strong>
            {profile?.full_name ||
              "Not set"}
          </strong>
        </div>

        <div style={styles.profileRow}>
          <span>Phone</span>
          <strong>
            {profile?.phone ||
              "Not set"}
          </strong>
        </div>

        <div style={styles.profileRow}>
          <span>Referral code</span>
          <strong>
            {profile?.referral_code ||
              "Not set"}
          </strong>
        </div>

        <div style={styles.profileRow}>
          <span>Status</span>
          <strong>
            {profile?.is_active === false
              ? "Inactive"
              : "Active"}
          </strong>
        </div>

        <div style={styles.profileRow}>
          <span>Member since</span>
          <strong>
            {profile?.created_at
              ? new Date(
                  profile.created_at
                ).toLocaleDateString(
                  "en-NG"
                )
              : "—"}
          </strong>
        </div>
      </div>

      <button
        style={styles.secondaryFull}
        onClick={logout}
      >
        Log out
      </button>
    </section>
  )

  /* ---------------- CUSTOMER CARE ---------------- */

  const CustomerCarePage = () => {
    /*
      Replace these two values with the exact
      Growvia customer-care Telegram username
      and WhatsApp number if they are not already
      configured elsewhere in the project.
    */

    const telegramUsername =
      "GrowviaSupport"

    const whatsappNumber =
      "2340000000000"

    const telegramUrl =
      `https://t.me/${telegramUsername}`

    const whatsappUrl =
      `https://wa.me/${whatsappNumber}`

    return (
      <section style={styles.card}>
        <div style={styles.eyebrow}>
          SUPPORT
        </div>

        <h2>Customer Care</h2>

        <p style={styles.muted}>
          Need help with your account, tasks,
          deposits or withdrawals? Contact our
          customer-care team.
        </p>

        <div style={styles.supportGrid}>
          <a
            href={telegramUrl}
            target="_blank"
            rel="noreferrer"
            style={styles.supportButton}
          >
            <strong>Telegram</strong>
            <span>
              Chat with Customer Care
            </span>
          </a>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            style={styles.supportButton}
          >
            <strong>WhatsApp</strong>
            <span>
              Chat with Customer Care
            </span>
          </a>
        </div>
      </section>
    )
  }

  /* ---------------- PAGE CONTENT ---------------- */

  const renderPage = () => {
    if (page === "tasks") {
      return <TasksPage />
    }

    if (page === "wallet") {
      return <WalletPage />
    }

    if (page === "refer") {
      return <ReferPage />
    }

    if (page === "profile") {
      return <ProfilePage />
    }

    if (page === "care") {
      return <CustomerCarePage />
    }

    return <HomePage />
  }

  /* ---------------- MAIN APP ---------------- */

  return (
    <div style={styles.page}>
      <div style={styles.wrap}>
        <header style={styles.header}>
          <div>
            <div style={styles.brand}>
              Growvia
            </div>

            <div style={styles.muted}>
              Welcome
              {profile?.full_name
                ? `, ${profile.full_name}`
                : ""}
            </div>
          </div>

          <button
            style={styles.secondary}
            onClick={logout}
          >
            Log out
          </button>
        </header>

        {message && (
          <div style={styles.notice}>
            {message}
          </div>
        )}

        {renderPage()}

        <footer style={styles.footer}>
          Growvia · Digital services and
          online task platform
        </footer>

        {/* BOTTOM NAVIGATION */}

        <nav style={styles.bottomNav}>
          <NavButton
            active={page === "home"}
            icon="⌂"
            label="Home"
            onClick={() =>
              navigate("home")
            }
          />

          <NavButton
            active={page === "tasks"}
            icon="✓"
            label="Tasks"
            onClick={() =>
              navigate("tasks")
            }
          />

          <NavButton
            active={page === "wallet"}
            icon="₦"
            label="Wallet"
            onClick={() =>
              navigate("wallet")
            }
          />

          <NavButton
            active={page === "refer"}
            icon="↗"
            label="Refer"
            onClick={() =>
              navigate("refer")
            }
          />

          <NavButton
            active={page === "profile"}
            icon="●"
            label="Profile"
            onClick={() =>
              navigate("profile")
            }
          />

          <NavButton
            active={page === "care"}
            icon="?"
            label="Care"
            onClick={() =>
              navigate("care")
            }
          />
        </nav>
      </div>
    </div>
  )
}

/* ---------------- NAV BUTTON ---------------- */

function NavButton({
  active,
  icon,
  label,
  onClick
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.navButton,
        ...(active
          ? styles.navButtonActive
          : {})
      }}
    >
      <span style={styles.navIcon}>
        {icon}
      </span>

      <span>{label}</span>
    </button>
  )
}

/* ---------------- STYLES ---------------- */

const styles = {
  page: {
    minHeight: "100vh",
    padding: "20px 20px 120px",
    background: "#f5f7fb",
    fontFamily:
      "Inter, Arial, sans-serif",
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
    fontFamily: "Arial, sans-serif"
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

  eyebrow: {
    color: "#7b8490",
    fontSize: 11,
    fontWeight: 850,
    letterSpacing: ".12em"
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
    background:
      "rgba(255,255,255,.18)",
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
    border:
      "1px solid #e4e7ec",
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    boxShadow:
      "0 5px 20px rgba(0,0,0,.035)"
  },

  sectionHead: {
    display: "flex",
    justifyContent:
      "space-between",
    gap: 12,
    alignItems: "center",
    marginBottom: 10
  },

  input: {
    width: "100%",
    padding: 13,
    border:
      "1px solid #d9dee7",
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
    fontSize: 15,
    cursor: "pointer"
  },

  secondary: {
    padding: "10px 14px",
    border:
      "1px solid #d9dee7",
    borderRadius: 10,
    background: "#fff",
    cursor: "pointer"
  },

  secondaryFull: {
    width: "100%",
    padding: 13,
    border:
      "1px solid #d9dee7",
    borderRadius: 11,
    background: "#fff",
    fontWeight: 700,
    cursor: "pointer"
  },

  notice: {
    background: "#eef3ff",
    border:
      "1px solid #ccd8ff",
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
    justifyContent:
      "space-between",
    gap: 16,
    alignItems: "center",
    padding: 16,
    border:
      "1px solid #e4e7ec",
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
    fontWeight: 700,
    cursor: "pointer"
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
    justifyContent:
      "space-between",
    gap: 12,
    alignItems: "center",
    padding: 14,
    border:
      "1px solid #e4e7ec",
    borderRadius: 12,
    marginBottom: 8
  },

  overviewGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2,1fr)",
    gap: 10,
    marginTop: 18
  },

  overviewBox: {
    padding: 16,
    borderRadius: 13,
    background: "#f5f7fb",
    display: "grid",
    gap: 5
  },

  referralBox: {
    marginTop: 18,
    padding: 20,
    borderRadius: 16,
    background: "#15171a",
    color: "#fff",
    display: "grid",
    gap: 9
  },

  referralLabel: {
    fontSize: 11,
    opacity: 0.65
  },

  referralCode: {
    fontSize: 25,
    letterSpacing: 1
  },

  referralLink: {
    fontSize: 12,
    opacity: 0.7,
    wordBreak: "break-all",
    lineHeight: 1.5
  },

  lightButton: {
    justifySelf: "start",
    padding: "9px 13px",
    border: 0,
    borderRadius: 9,
    background: "#fff",
    color: "#15171a",
    fontWeight: 750,
    cursor: "pointer"
  },

  referralInfo: {
    marginTop: 16,
    padding: 16,
    border:
      "1px solid #e4e7ec",
    borderRadius: 13
  },

  profileRows: {
    display: "grid",
    gap: 10,
    margin: "18px 0"
  },

  profileRow: {
    display: "flex",
    justifyContent:
      "space-between",
    gap: 15,
    padding: 13,
    borderRadius: 11,
    background: "#f5f7fb",
    fontSize: 13
  },

  supportGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: 12,
    marginTop: 18
  },

  supportButton: {
    textDecoration: "none",
    color: "#15171a",
    border:
      "1px solid #e4e7ec",
    borderRadius: 14,
    padding: 18,
    display: "grid",
    gap: 6,
    background: "#f8f9fb"
  },

  footer: {
    textAlign: "center",
    padding: "10px 0 25px",
    color: "#8a919d",
    fontSize: 12
  },

  bottomNav: {
    position: "fixed",
    left: "50%",
    bottom: 12,
    transform:
      "translateX(-50%)",
    zIndex: 9990,
    width:
      "min(850px,calc(100vw - 24px))",
    display: "grid",
    gridTemplateColumns:
      "repeat(6,1fr)",
    padding: "8px 6px",
    border:
      "1px solid #e3e7ed",
    borderRadius: 20,
    background:
      "rgba(255,255,255,.97)",
    backdropFilter:
      "blur(16px)",
    boxShadow:
      "0 12px 35px rgba(0,0,0,.14)"
  },

  navButton: {
    border: 0,
    background: "transparent",
    color: "#7a828e",
    display: "grid",
    placeItems: "center",
    gap: 3,
    padding: "7px 3px",
    borderRadius: 14,
    fontSize: 10,
    fontWeight: 700,
    cursor: "pointer"
  },

  navButtonActive: {
    color: "#15171a",
    background: "#eef1f5"
  },

  navIcon: {
    fontSize: 18,
    lineHeight: 1,
    fontWeight: 850
  }
}

/* ---------------- ROUTES ---------------- */

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
