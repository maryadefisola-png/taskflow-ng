import { useEffect, useState } from 'react'
import './App.css'
import { supabase } from './supabase.js'

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Dashboard')
  const [menuOpen, setMenuOpen] = useState(false)

  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
  })
  const [authError, setAuthError] = useState('')
  const [authMessage, setAuthMessage] = useState('')

  const [tasks, setTasks] = useState([])
  const [tasksLoading, setTasksLoading] = useState(false)

  const taskBalance = Number(profile?.task_balance || 0)
  const affiliateBalance = Number(
    profile?.affiliate_balance || 0
  )

  const totalBalance =
    taskBalance + affiliateBalance

  useEffect(() => {
    const initialise = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      setSession(session)

      if (session?.user) {
        await loadProfile(session.user.id)
      }

      setLoading(false)
    }

    initialise()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
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
      subscription.unsubscribe()
    }
  }, [])

  const loadProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error(error)
      return
    }

    setProfile(data)
  }

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
      console.error(error)
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

  const handleAuthChange = (field, value) => {
    setAuthForm((current) => ({
      ...current,
      [field]: value,
    }))

    setAuthError('')
    setAuthMessage('')
  }

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
          'Account created. Check your email to continue.'
        )
      }

      setAuthForm({
        name: '',
        phone: '',
        email: '',
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
    setActiveTab('Dashboard')
  }

  const openTab = (tab) => {
    setActiveTab(tab)
    setMenuOpen(false)

    if (tab === 'Tasks') {
      loadTasks()
    }
  }

  const formatMoney = (amount) =>
    `₦${Number(amount).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
    })}`

  if (loading) {
    return (
      <div className="app loading-page">
        <div className="loading-content">
          <div className="tf-logo">
            TF
          </div>
          <h2>TaskFlow NG</h2>
          <p>Loading your account...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="app auth-page">
        <div className="auth-card">
          <div className="auth-brand">
            <div className="tf-logo">
              TF
            </div>

            <div>
              <h1>TaskFlow NG</h1>
              <p>
                Tasks. Rewards. Growth.
              </p>
            </div>
          </div>

          <div className="auth-heading">
            <h2>
              {authMode === 'login'
                ? 'Welcome back'
                : 'Create your account'}
            </h2>

            <p>
              {authMode === 'login'
                ? 'Log in to continue to your dashboard.'
                : 'Join TaskFlow NG and start earning rewards.'}
            </p>
          </div>

          <div className="auth-switch">
            <button
              type="button"
              className={
                authMode === 'login'
                  ? 'selected'
                  : ''
              }
              onClick={() =>
                setAuthMode('login')
              }
            >
              Login
            </button>

            <button
              type="button"
              className={
                authMode === 'signup'
                  ? 'selected'
                  : ''
              }
              onClick={() =>
                setAuthMode('signup')
              }
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuth}>
            {authMode === 'signup' && (
              <>
                <label>Full Name</label>

                <input
                  value={authForm.name}
                  placeholder="Your full name"
                  onChange={(e) =>
                    handleAuthChange(
                      'name',
                      e.target.value
                    )
                  }
                />

                <label>Phone Number</label>

                <input
                  value={authForm.phone}
                  placeholder="08012345678"
                  onChange={(e) =>
                    handleAuthChange(
                      'phone',
                      e.target.value
                    )
                  }
                />
              </>
            )}

            <label>Email Address</label>

            <input
              type="email"
              value={authForm.email}
              placeholder="you@example.com"
              onChange={(e) =>
                handleAuthChange(
                  'email',
                  e.target.value
                )
              }
            />

            <label>Password</label>

            <input
              type="password"
              value={authForm.password}
              placeholder="Enter your password"
              onChange={(e) =>
                handleAuthChange(
                  'password',
                  e.target.value
                )
              }
            />

            {authError && (
              <div className="form-error">
                {authError}
              </div>
            )}

            {authMessage && (
              <div className="form-message">
                {authMessage}
              </div>
            )}

            <button
              className="primary-button"
              type="submit"
            >
              {authMode === 'login'
                ? 'Log In'
                : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <div className="tf-logo small">
            TF
          </div>

          <div>
            <h1>TaskFlow NG</h1>
            <span>
              Earn more. Do more.
            </span>
          </div>
        </div>

        <div className="topbar-right">
          <button
            className="icon-button"
            type="button"
            onClick={() =>
              alert(
                'Notifications will appear here.'
              )
            }
          >
            <span>♢</span>
          </button>

          <button
            className="profile-button"
            type="button"
            onClick={() =>
              openTab('Profile')
            }
          >
            <div className="avatar">
              {(
                profile?.full_name ||
                'U'
              )
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="profile-button-text">
              <strong>
                {profile?.full_name ||
                  'User'}
              </strong>

              <span>My account</span>
            </div>
          </button>

          <button
            className="menu-button"
            type="button"
            onClick={() =>
              setMenuOpen(!menuOpen)
            }
          >
            ☰
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="menu-panel">
          <div className="menu-panel-title">
            Menu
          </div>

          {[
            'Dashboard',
            'Tasks',
            'Withdraw',
            'History',
            'Referrals',
            'Profile',
          ].map((item) => (
            <button
              key={item}
              type="button"
              className={
                activeTab === item
                  ? 'menu-link active'
                  : 'menu-link'
              }
              onClick={() =>
                openTab(item)
              }
            >
              {item}
            </button>
          ))}

          <div className="menu-divider" />

          <button
            type="button"
            className="menu-link logout-link"
            onClick={handleLogout}
          >
            Log Out
          </button>
        </div>
      )}

      <main className="dashboard-container">
        {activeTab === 'Dashboard' && (
          <>
            <section className="dashboard-heading">
              <div>
                <span className="section-label">
                  DASHBOARD
                </span>

                <h2>
                  Good to see you,{' '}
                  {(
                    profile?.full_name ||
                    'there'
                  ).split(' ')[0]}
                  .
                </h2>

                <p>
                  Here's an overview of
                  your TaskFlow account.
                </p>
              </div>

              <button
                type="button"
                className="outline-button"
                onClick={() =>
                  openTab('Tasks')
                }
              >
                Find Tasks
              </button>
            </section>

            <section className="balance-overview">
              <div className="balance-overview-content">
                <span>
                  TOTAL AVAILABLE BALANCE
                </span>

                <h2>
                  {formatMoney(
                    totalBalance
                  )}
                </h2>

                <p>
                  Available across your
                  Task and Affiliate
                  wallets
                </p>
              </div>

              <div className="balance-mark">
                ₦
              </div>
            </section>

            <section className="wallet-grid">
              <div className="wallet-card">
                <div className="wallet-card-header">
                  <div className="wallet-symbol task">
                    T
                  </div>

                  <span>
                    Task Balance
                  </span>
                </div>

                <h3>
                  {formatMoney(
                    taskBalance
                  )}
                </h3>

                <p>
                  Earnings from completed
                  tasks
                </p>
              </div>

              <div className="wallet-card">
                <div className="wallet-card-header">
                  <div className="wallet-symbol affiliate">
                    A
                  </div>

                  <span>
                    Affiliate Balance
                  </span>
                </div>

                <h3>
                  {formatMoney(
                    affiliateBalance
                  )}
                </h3>

                <p>
                  Earnings from referrals
                </p>
              </div>
            </section>

            <section className="dashboard-section">
              <div className="section-title-row">
                <div>
                  <span className="section-label">
                    GET STARTED
                  </span>

                  <h3>
                    What would you like
                    to do?
                  </h3>
                </div>
              </div>

              <div className="action-grid">
                <button
                  type="button"
                  onClick={() =>
                    openTab('Tasks')
                  }
                  className="action-card"
                >
                  <div className="action-icon">
                    T
      </
