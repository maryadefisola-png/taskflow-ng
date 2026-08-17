import { useEffect, useState } from 'react'
import './App.css'
import { supabase } from './supabase.js'

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const [authMode, setAuthMode] = useState('login')
  const [authError, setAuthError] = useState('')
  const [authMessage, setAuthMessage] = useState('')

  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  })

  const [activeTab, setActiveTab] = useState('Dashboard')
  const [menuOpen, setMenuOpen] = useState(false)

  const [tasks, setTasks] = useState([])
  const [tasksLoading, setTasksLoading] = useState(false)

  const taskBalance = Number(profile?.task_balance || 0)
  const affiliateBalance = Number(
    profile?.affiliate_balance || 0
  )

  const totalBalance =
    taskBalance + affiliateBalance

  const menuItems = [
    { name: 'Dashboard', icon: '🏠' },
    { name: 'Tasks', icon: '📝' },
    { name: 'Withdraw', icon: '💸' },
    { name: 'History', icon: '📜' },
    { name: 'Referrals', icon: '🤝' },
    { name: 'Profile', icon: '👤' },
  ]

  // =========================
  // AUTH SESSION
  // =========================

  useEffect(() => {
    let mounted = true

    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!mounted) return

      setSession(session)

      if (session?.user) {
        await loadProfile(session.user.id)
      }

      setLoading(false)
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return

        setSession(newSession)

        if (newSession?.user) {
          await loadProfile(newSession.user.id)
        } else {
          setProfile(null)
        }

        setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // =========================
  // LOAD PROFILE
  // =========================

  const loadProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Profile error:', error)
      setProfile(null)
      return
    }

    setProfile(data)
  }

  // =========================
  // LOAD TASKS
  // =========================

  const loadTasks = async () => {
    setTasksLoading(true)

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('is_active', true)
      .order('created_at', {
        ascending: false,
      })

    if (error) {
      console.error('Tasks error:', error)
      setTasks([])
    } else {
      setTasks(data || [])
    }

    setTasksLoading(false)
  }

  useEffect(() => {
    if (session?.user) {
      loadTasks()
    }
  }, [session])

  // =========================
  // AUTH FORM
  // =========================

  const handleAuthChange = (field, value) => {
    setAuthForm((current) => ({
      ...current,
      [field]: value,
    }))

    setAuthError('')
    setAuthMessage('')
  }

  // =========================
  // SIGN UP / LOGIN
  // =========================

  const handleAuth = async (event) => {
    event.preventDefault()

    setAuthError('')
    setAuthMessage('')

    const email = authForm.email
      .trim()
      .toLowerCase()

    const password = authForm.password.trim()

    if (!email || !password) {
      setAuthError(
        'Please enter your email and password.'
      )
      return
    }

    if (authMode === 'signup') {
      const name = authForm.name.trim()
      const phone = authForm.phone.trim()

      if (!name) {
        setAuthError('Please enter your full name.')
        return
      }

      if (password.length < 6) {
        setAuthError(
          'Password must be at least 6 characters.'
        )
        return
      }

      const { data, error } =
        await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              phone,
            },
          },
        })

      if (error) {
        setAuthError(error.message)
        return
      }

      if (data.session) {
        setAuthMessage(
          'Account created successfully.'
        )
      } else {
        setAuthMessage(
          'Account created. Check your email if confirmation is required.'
        )
      }

      setAuthForm({
        name: '',
        email: '',
        phone: '',
        password: '',
      })

      return
    }

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      })

    if (error) {
      setAuthError(error.message)
      return
    }

    setAuthMessage('Login successful.')
  }

  // =========================
  // LOGOUT
  // =========================

  const handleLogout = async () => {
    await supabase.auth.signOut()

    setSession(null)
    setProfile(null)
    setActiveTab('Dashboard')
  }

  // =========================
  // NAVIGATION
  // =========================

  const openTab = (tab) => {
    setActiveTab(tab)
    setMenuOpen(false)

    if (tab === 'Tasks') {
      loadTasks()
    }
  }

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="loading-logo">TF</div>
          <h2>TaskFlow NG</h2>
          <p>Loading your account...</p>
        </div>
      </div>
    )
  }

  // =========================
  // LOGIN SCREEN
  // =========================

  if (!session) {
    return (
      <div className="app">
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-logo">
              TF
            </div>

            <h1>TaskFlow NG</h1>

            <p className="auth-subtitle">
              Earn rewards by completing tasks.
            </p>

            <div className="auth-tabs">
              <button
                type="button"
                className={
                  authMode === 'login'
                    ? 'active'
                    : ''
                }
                onClick={() => {
                  setAuthMode('login')
                  setAuthError('')
                  setAuthMessage('')
                }}
              >
                Login
              </button>

              <button
                type="button"
                className={
                  authMode === 'signup'
                    ? 'active'
                    : ''
                }
                onClick={() => {
                  setAuthMode('signup')
                  setAuthError('')
                  setAuthMessage('')
                }}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleAuth}>
              {authMode === 'signup' && (
                <>
                  <label>Full Name</label>

                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={authForm.name}
                    onChange={(event) =>
                      handleAuthChange(
                        'name',
                        event.target.value
                      )
                    }
                  />

                  <label>Phone Number</label>

                  <input
                    type="tel"
                    placeholder="Enter phone number"
                    value={authForm.phone}
                    onChange={(event) =>
                      handleAuthChange(
                        'phone',
                        event.target.value
                      )
                    }
                  />
                </>
              )}

              <label>Email</label>

              <input
                type="email"
                placeholder="Enter your email"
                value={authForm.email}
                onChange={(event) =>
                  handleAuthChange(
                    'email',
                    event.target.value
                  )
                }
              />

              <label>Password</label>

              <input
                type="password"
                placeholder="Enter your password"
                value={authForm.password}
                onChange={(event) =>
                  handleAuthChange(
                    'password',
                    event.target.value
                  )
                }
              />

              {authError && (
                <p className="auth-error">
                  {authError}
                </p>
              )}

              {authMessage && (
                <p className="auth-message">
                  {authMessage}
                </p>
              )}

              <button
                type="submit"
                className="auth-submit"
              >
                {authMode === 'login'
                  ? 'Login'
                  : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // =========================
  // MAIN APPLICATION
  // =========================

  return (
    <div className="app">
      <header className="navbar">
        <div className="brand">
          <div className="brand-logo">
            TF
          </div>

          <div>
            <h1>TaskFlow NG</h1>
            <span>
              Earn. Complete. Grow.
            </span>
          </div>
        </div>

        <button
          type="button"
          className="menu-button"
          onClick={() =>
            setMenuOpen(!menuOpen)
          }
        >
          ☰
        </button>
      </header>

      {menuOpen && (
        <>
          <div
            className="menu-overlay"
            onClick={() =>
              setMenuOpen(false)
            }
          />

          <aside className="side-menu">
            <div className="side-menu-header">
              <div className="brand-logo">
                TF
              </div>

              <div>
                <strong>
                  TaskFlow NG
                </strong>

                <small>
                  {profile?.full_name ||
                    'Account'}
                </small>
              </div>

              <button
                type="button"
                className="close-menu"
                onClick={() =>
                  setMenuOpen(false)
                }
              >
                ×
              </button>
            </div>

            <nav>
              {menuItems.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  className={
                    activeTab === item.name
                      ? 'menu-item active'
                      : 'menu-item'
                  }
                  onClick={() =>
                    openTab(item.name)
                  }
                >
                  <span>
                    {item.icon}
                  </span>

                  {item.name}
                </button>
              ))}
            </nav>

            <div className="menu-bottom">
              <button
                type="button"
                className="menu-item"
                onClick={() =>
                  alert(
                    'Settings coming soon.'
                  )
                }
              >
                <span>⚙️</span>
                Settings
              </button>

              <button
                type="button"
                className="menu-item logout-menu"
                onClick={handleLogout}
              >
                <span>🚪</span>
                Log Out
              </button>
            </div>
          </aside>
        </>
      )}

      <main className="main-content">
        {/* DASHBOARD */}

        {activeTab === 'Dashboard' && (
          <>
            <section className="welcome-section">
              <p className="eyebrow">
                YOUR DASHBOARD
              </p>

              <h2>
                Welcome back,{' '}
                {profile?.full_name ||
                  'User'}{' '}
                👋
              </h2>

              <p>
                Complete tasks, earn rewards
                and grow your balance.
              </p>
            </section>

            <section className="total-balance-card">
              <div>
                <span className="balance-label">
                  TOTAL BALANCE
                </span>

                <h2>
                  ₦
                  {totalBalance.toLocaleString(
                    'en-NG',
                    {
                      minimumFractionDigits: 2,
                    }
                  )}
                </h2>

                <p>
                  Available across both
                  wallets
                </p>
              </div>

              <div className="balance-icon">
                ₦
              </div>
            </section>

            <section className="balance-grid">
              <div className="wallet-card task-wallet">
                <div className="wallet-top">
                  <div className="wallet-icon">
                    📝
                  </div>

                  <span>
                    Task Wallet
                  </span>
                </div>

                <h3>
                  ₦
                  {taskBalance.toLocaleString(
                    'en-NG',
                    {
                      minimumFractionDigits: 2,
                    }
                  )}
                </h3>

                <p>
                  Earned from completed
                  tasks
                </p>
              </div>

              <div className="wallet-card affiliate-wallet">
                <div className="wallet-top">
                  <div className="wallet-icon">
                    🤝
                  </div>

                  <span>
                    Affiliate Wallet
                  </span>
                </div>

                <h3>
                  ₦
                  {affiliateBalance.toLocaleString(
                    'en-NG',
                    {
                      minimumFractionDigits: 2,
                    }
                  )}
                </h3>

                <p>
                  Earned from referrals
                </p>
              </div>
            </section>

            <section className="quick-actions">
              <div className="section-heading">
                <h2>
                  Quick Actions
                </h2>

                <span>
                  Get started
                </span>
              </div>

              <div className="quick-grid">
                <button
                  type="button"
                  className="quick-card"
                  onClick={() =>
                    openTab('Tasks')
                  }
                >
                  <span>📝</span>

                  <strong>
                    View Tasks
                  </strong>

                  <small>
                    Find tasks to
                    complete
                  </small>
                </button>

                <button
                  type="button"
                  className="quick-card"
                  onClick={() =>
                    openTab('Withdraw')
                  }
                >
                  <span>💸</span>

                  <strong>
                    Withdraw
                  </strong>

                  <small>
                    Withdraw your
                    earnings
                  </small>
                </button>

                <button
                  type="button"
                  className="quick-card"
                  onClick={() =>
                    openTab('Referrals')
                  }
                >
                  <span>🤝</span>

                  <strong>
                    Refer Friends
                  </strong>

                  <small>
                    Earn affiliate
                    rewards
                  </small>
                </button>
              </div>
            </section>
          </>
        )}

        {/* TASKS */}

        {activeTab === 'Tasks' && (
          <section>
            <div className="page-heading">
              <p className="eyebrow">
                EARN REWARDS
              </p>

              <h2>
                Available Tasks
              </h2>

              <p>
                Complete tasks and submit
                proof for review.
              </p>
            </div>

            {tasksLoading ? (
              <div className="empty-state">
                <h3>
                  Loading tasks...
                </h3>
              </div>
            ) : tasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  📝
                </div>

                <h3>
                  No tasks available
                </h3>

                <p>
                  Check back later for
                  new tasks.
                </p>
              </div>
            ) : (
              <div className="task-list">
                {tasks.map((task) => (
                  <div
                    className="task-card"
                    key={task.id}
                  >
                    <div className="task-card-top">
                      <div className="task-icon">
                        📝
                      </div>

                      <span className="task-status">
                        Available
                      </span>
                    </div>

                    <h3>
                      {task.title}
                    </h3>

                    <p>
                      {task.description}
                    </p>

                    <div className="task-footer">
                      <strong>
                        ₦
                        {Number(
                          task.reward
                        ).toLocaleString(
                          'en-NG'
                        )}
                      </strong>

                      <button
                        type="button"
                        onClick={() =>
                          alert(
                            'Proof submission form is the next step.'
                          )
                        }
                      >
                        View Task
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* WITHDRAW */}

        {activeTab === 'Withdraw' && (
          <section>
            <div className="page-heading">
              <p className="eyebrow">
                YOUR MONEY
              </p>

              <h2>
                Withdraw Funds
              </h2>

              <p>
                Choose which balance you
                want to withdraw from.
              </p>
            </div>

            <div className="withdraw-wallet-grid">
              <button
                type="button"
                className="withdraw-wallet task-withdraw"
                onClick={() =>
                  alert(
                    'Task Balance withdrawal form coming next.'
                  )
                }
              >
                <span>📝</span>

                <div>
                  <small>
                    Task Balance
                  </small>

                  <strong>
                    ₦
                    {taskBalance.toLocaleString(
                      'en-NG',
                      {
                        minimumFractionDigits: 2,
                      }
                    )}
                  </strong>
                </div>

                <b>
                  Withdraw →
                </b>
              </button>

              <button
                type="button"
                className="withdraw-wallet affiliate-withdraw"
                onClick={() =>
                  alert(
                    'Affiliate Balance withdrawal form coming next.'
                  )
                }
              >
                <span>🤝</span>

                <div>
                  <small>
                    Affiliate Balance
                  </small>

                  <strong>
                    ₦
                    {affiliateBalance.toLocaleString(
                      'en-NG',
                      {
                        minimumFractionDigits: 2,
                      }
                    )}
                  </strong>
                </div>

                <b>
                  Withdraw →
                </b>
              </button>
            </div>
          </section>
        )}

        {/* HISTORY */}

        {activeTab === 'History' && (
          <section>
            <div className="page-heading">
              <p className="eyebrow">
                TRANSACTIONS
              </p>

              <h2>
                Withdrawal History
              </h2>
            </div>

            <div className="empty-state">
              <div className="empty-icon">
                📜
              </div>

              <h3>
                No withdrawals yet
              </h3>

              <p>
                Your withdrawal requests
                will appear here.
              </p>
            </div>
          </section>
        )}

        {/* REFERRALS */}

        {activeTab === 'Referrals' && (
          <section>
            <div className="page-heading">
              <p className="eyebrow">
                AFFILIATE PROGRAM
              </p>

              <h2>
                Refer & Earn
              </h2>

              <p>
                Invite people and earn
                affiliate rewards.
              </p>
            </div>

            <div className="referral-hero">
              <div className="referral-icon">
                🤝
              </div>

              <h2>
                Grow your earnings
              </h2>

              <p>
                Your referral system will
                be connected to Supabase
                next.
              </p>

              <div className="referral-code-box">
                {profile?.referral_code ||
                  'Generating...'}
              </div>
            </div>
          </section>
        )}

        {/* PROFILE */}

        {activeTab === 'Profile' && (
          <section>
            <div className="page-heading">
              <p className="eyebrow">
                ACCOUNT
              </p>

              <h2>
                My Profile
              </h2>
            </div>

            <div className="profile-card">
              <div className="profile-avatar">
                {(
                  profile?.full_name ||
                  'U'
                )
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <h2>
                {profile?.full_name ||
                  'User'}
              </h2>

              <p>
                {session.user.email}
              </p>

              <div className="profile-row">
                <span>
                  Phone
                </span>

                <strong>
                  {profile?.phone ||
                    'Not added'}
                </strong>
              </div>

              <div className="profile-row">
                <span>
                  Referral Code
                </span>

                <strong>
                  {profile?.referral_code ||
                    '—'}
                </strong>
              </div>

              <div className="profile-row">
                <span>
                  Account Status
                </span>

                <strong>
                  {profile?.is_active
                    ? 'Active'
                    : 'Pending'}
                </strong>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* MOBILE NAVIGATION */}

      <nav className="bottom-nav">
        <button
          type="button"
          className={
            activeTab === 'Dashboard'
              ? 'active'
              : ''
          }
          onClick={() =>
            openTab('Dashboard')
          }
        >
          <span>🏠</span>
          <small>
            Home
          </small>
        </button>

        <button
          type="button"
          className={
            activeTab === 'Tasks'
              ? 'active'
              : ''
          }
          onClick={() =>
            openTab('Tasks')
          }
        >
          <span>📝</span>
          <small>
            Tasks
          </small>
        </button>

        <button
          type="button"
          className={
            activeTab === 'Withdraw'
              ? 'active'
              : ''
          }
          onClick={() =>
            openTab('Withdraw')
          }
        >
          <span>💸</span>
          <small>
            Withdraw
          </small>
        </button>

        <button
          type="button"
          className={
            activeTab === 'Profile'
              ? 'active'
              : ''
          }
          onClick={() =>
            openTab('Profile')
          }
        >
          <span>👤</span>
          <small>
            Profile
          </small>
        </button>
      </nav>
    </div>
  )
}

export default App
