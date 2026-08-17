import { useState } from 'react'
import './App.css'

const ADMIN_EMAIL = 'admin@taskflow.ng'

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('taskflow_user')
    return saved ? JSON.parse(saved) : null
  })

  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: '',
  })
  const [authError, setAuthError] = useState('')
  const [activeTab, setActiveTab] = useState('Dashboard')

  const [balance] = useState(() => {
    const saved = localStorage.getItem('taskflow_balance')
    return saved ? Number(saved) : 0
  })

  const [referralBalance] = useState(() => {
    const saved = localStorage.getItem(
      'taskflow_referral_balance'
    )
    return saved ? Number(saved) : 0
  })

  const [referrals] = useState(() => {
    const saved = localStorage.getItem('taskflow_referrals')
    return saved ? Number(saved) : 0
  })

  const [completedTasks] = useState(() => {
    const saved = localStorage.getItem(
      'taskflow_completed_tasks'
    )
    return saved ? JSON.parse(saved) : []
  })

  const [tasks] = useState(() => {
    const saved = localStorage.getItem('taskflow_tasks')

    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 1,
            title: 'Daily Check-in',
            description:
              'Complete your daily check-in and submit proof.',
            reward: 50,
          },
          {
            id: 2,
            title: 'App Review',
            description:
              'Review an app and submit your feedback.',
            reward: 100,
          },
          {
            id: 3,
            title: 'Social Task',
            description:
              'Complete a simple social media task.',
            reward: 150,
          },
        ]
  })

  const [profile] = useState(() => {
    const saved = localStorage.getItem('taskflow_profile')

    return saved
      ? JSON.parse(saved)
      : {
          name: user?.name || 'TaskFlow User',
          email: user?.email || 'user@example.com',
          phone: '',
        }
  })

  const totalBalance = balance + referralBalance

  const isAdmin =
    user?.email?.toLowerCase() === ADMIN_EMAIL

  const referralCode = 'TASKFLOW2026'

  const referralLink =
    `${window.location.origin}?ref=${referralCode}`

  // =========================
  // AUTH
  // =========================

  const handleAuthChange = (field, value) => {
    setAuthForm((previous) => ({
      ...previous,
      [field]: value,
    }))

    setAuthError('')
  }

  const handleAuth = (event) => {
    event.preventDefault()

    const email = authForm.email.trim().toLowerCase()
    const password = authForm.password.trim()

    if (!email || !password) {
      setAuthError(
        'Please enter your email and password.'
      )
      return
    }

    if (authMode === 'signup') {
      const name = authForm.name.trim()

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

      const newUser = {
        name,
        email,
      }

      localStorage.setItem(
        'taskflow_user',
        JSON.stringify(newUser)
      )

      localStorage.setItem(
        'taskflow_profile',
        JSON.stringify({
          name,
          email,
          phone: '',
        })
      )

      setUser(newUser)

      setAuthError('')
      return
    }

    const savedUser =
      localStorage.getItem('taskflow_user')

    if (!savedUser) {
      setAuthError(
        'No account found. Please create an account first.'
      )
      return
    }

    const existingUser = JSON.parse(savedUser)

    if (existingUser.email !== email) {
      setAuthError(
        'Email address does not match the saved account.'
      )
      return
    }

    setUser(existingUser)
    setAuthError('')
  }

  const handleLogout = () => {
    localStorage.removeItem('taskflow_user')
    setUser(null)
    setActiveTab('Dashboard')
  }

  // =========================
  // NAVIGATION
  // =========================

  const navigate = (tab) => {
    setActiveTab(tab)
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  // =========================
  // LOGIN SCREEN
  // =========================

  if (!user) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">
            <div className="tf-logo">TF</div>

            <div>
              <h1>TaskFlow NG</h1>
              <p>Tasks • Rewards • Growth</p>
            </div>
          </div>

          <div className="auth-heading">
            <span className="section-label">
              Welcome
            </span>

            <h2>
              {authMode === 'login'
                ? 'Welcome back'
                : 'Create your account'}
            </h2>

            <p>
              {authMode === 'login'
                ? 'Log in to continue to your TaskFlow dashboard.'
                : 'Create an account and start completing tasks.'}
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
              onClick={() => {
                setAuthMode('login')
                setAuthError('')
              }}
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
              onClick={() => {
                setAuthMode('signup')
                setAuthError('')
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
              </>
            )}

            <label>Email Address</label>

            <input
              type="email"
              placeholder="you@example.com"
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
              <div className="form-error">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="primary-button"
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

  // =========================
  // MAIN APP
  // =========================

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <div className="tf-logo small">
            TF
          </div>

          <div>
            <h1>TaskFlow NG</h1>
            <span>Rewards dashboard</span>
          </div>
        </div>

        <div className="topbar-right">
          <button
            className="profile-button"
            onClick={() => navigate('Profile')}
          >
            <div className="avatar">
              {profile.name
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="profile-button-text">
              <strong>{profile.name}</strong>
              <span>My Profile</span>
            </div>
          </button>

          <button
            className="menu-button"
            onClick={() => navigate('Profile')}
          >
            ☰
          </button>
        </div>
      </header>

      <main className="dashboard-container">
        {/* =========================
            DASHBOARD
        ========================= */}

        {activeTab === 'Dashboard' && (
          <>
            <div className="dashboard-heading">
              <div>
                <span className="section-label">
                  Dashboard
                </span>

                <h2>
                  Welcome back,{' '}
                  {profile.name.split(' ')[0]} 👋
                </h2>

                <p>
                  Here's an overview of your
                  TaskFlow activity.
                </p>
              </div>

              <button
                className="outline-button"
                onClick={() => navigate('Tasks')}
              >
                View Tasks
              </button>
            </div>

            {/* TOTAL BALANCE */}

            <div className="balance-overview">
              <div className="balance-overview-content">
                <span>
                  TOTAL AVAILABLE BALANCE
                </span>

                <h2>
                  ₦{totalBalance.toFixed(2)}
                </h2>

                <p>
                  Task earnings + affiliate
                  earnings
                </p>
              </div>

              <div className="balance-mark">
                ₦
              </div>
            </div>

            {/* TWO WALLETS */}

            <div className="wallet-grid">
              <div className="wallet-card">
                <div className="wallet-card-header">
                  <div className="wallet-symbol task">
                    ₦
                  </div>

                  Task Balance
                </div>

                <h3>
                  ₦{balance.toFixed(2)}
                </h3>

                <p>
                  Earnings from completed
                  tasks
                </p>
              </div>

              <div className="wallet-card">
                <div className="wallet-card-header">
                  <div className="wallet-symbol affiliate">
                    ↗
                  </div>

                  Affiliate Balance
                </div>

                <h3>
                  ₦{referralBalance.toFixed(2)}
                </h3>

                <p>
                  Earnings from referrals
                </p>
              </div>
            </div>

            {/* QUICK ACTIONS */}

            <section className="dashboard-section">
              <div className="section-title-row">
                <h3>Quick Actions</h3>
              </div>

              <div className="action-grid">
                <button
                  className="action-card"
                  onClick={() =>
                    navigate('Tasks')
                  }
                >
                  <div className="action-icon">
                    ✓
                  </div>

                  <div>
                    <strong>
                      Complete Tasks
                    </strong>

                    <span>
                      Earn rewards by
                      completing available
                      tasks.
                    </span>
                  </div>

                  <b>›</b>
                </button>

                <button
                  className="action-card"
                  onClick={() =>
                    navigate('Withdraw')
                  }
                >
                  <div className="action-icon">
                    ₦
                  </div>

                  <div>
                    <strong>
                      Withdraw
                    </strong>

                    <span>
                      Withdraw from either
                      wallet.
                    </span>
                  </div>

                  <b>›</b>
                </button>

                <button
                  className="action-card"
                  onClick={() =>
                    navigate('Referrals')
                  }
                >
                  <div className="action-icon">
                    ↗
                  </div>

                  <div>
                    <strong>
                      Refer & Earn
                    </strong>

                    <span>
                      Invite friends and earn
                      affiliate rewards.
                    </span>
                  </div>

                  <b>›</b>
                </button>
              </div>
            </section>

            {/* RECENT TASKS */}

            <section className="dashboard-section">
              <div className="section-title-row">
                <h3>Available Tasks</h3>

                <button
                  className="text-button"
                  onClick={() =>
                    navigate('Tasks')
                  }
                >
                  View all
                </button>
              </div>

              <div className="mini-task-list">
                {tasks
                  .slice(0, 3)
                  .map((task) => (
                    <button
                      className="mini-task"
                      key={task.id}
                      onClick={() =>
                        navigate('Tasks')
                      }
                    >
                      <div className="mini-task-icon">
                        ✓
                      </div>

                      <div className="mini-task-info">
                        <strong>
                          {task.title}
                        </strong>

                        <span>
                          {task.description}
                        </span>
                      </div>

                      <strong>
                        ₦{task.reward}
                      </strong>
                    </button>
                  ))}
              </div>
            </section>

            {/* ACTIVITY */}

            <section className="dashboard-section">
              <div className="section-title-row">
                <h3>Account Overview</h3>
              </div>

              <div className="wallet-grid">
                <div className="wallet-card">
                  <div className="wallet-card-header">
                    Completed Tasks
                  </div>

                  <h3>
                    {completedTasks.length}
                  </h3>

                  <p>
                    Tasks completed by you
                  </p>
                </div>

                <div className="wallet-card">
                  <div className="wallet-card-header">
                    Total Referrals
                  </div>

                  <h3>{referrals}</h3>

                  <p>
                    People referred to
                    TaskFlow
                  </p>
                </div>
              </div>
            </section>
          </>
        )}

        {/* =========================
            TASKS
        ========================= */}

        {activeTab === 'Tasks' && (
          <>
            <div className="page-heading">
              <span className="section-label">
                Earn
              </span>

              <h2>Available Tasks</h2>

              <p>
                Complete tasks and submit proof
                for verification.
              </p>
            </div>

            {tasks.length === 0 ? (
              <div className="empty-card large">
                <strong>
                  No tasks available
                </strong>

                <span>
                  Check back later for new
                  opportunities.
                </span>
              </div>
            ) : (
              <div className="task-list">
                {tasks.map((task, index) => {
                  const completed =
                    completedTasks.includes(
                      task.id
                    )

                  return (
                    <div
                      className="real-task-card"
                      key={task.id}
                    >
                      <div className="task-card-heading">
                        <div className="task-number">
                          {index + 1}
                        </div>

                        <span>
                          {completed
                            ? 'Completed'
                            : 'Available'}
                        </span>
                      </div>

                      <h3>{task.title}</h3>

                      <p>
                        {task.description}
                      </p>

                      <div className="task-card-bottom">
                        <div>
                          <small>
                            REWARD
                          </small>

                          <strong>
                            ₦{task.reward}
                          </strong>
                        </div>

                        <button
                          className={
                            completed
                              ? 'outline-button'
                              : 'primary-button small-button'
                          }
                          disabled={completed}
                        >
                          {completed
                            ? 'Completed ✓'
                            : 'Submit Proof'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* =========================
            WITHDRAW
        ========================= */}

        {activeTab === 'Withdraw' && (
          <>
            <div className="page-heading">
              <span className="section-label">
                Wallet
              </span>

              <h2>Withdraw Funds</h2>

              <p>
                Choose which balance you want
                to withdraw from.
              </p>
            </div>

            <div className="withdraw-choice-grid">
              <button className="withdraw-choice">
                <div className="wallet-symbol task">
                  ₦
                </div>

                <div>
                  <span>
                    Task Balance
                  </span>

                  <strong>
                    ₦{balance.toFixed(2)}
                  </strong>
                </div>

                <b>›</b>
              </button>

              <button className="withdraw-choice">
                <div className="wallet-symbol affiliate">
                  ↗
                </div>

                <div>
                  <span>
                    Affiliate Balance
                  </span>

                  <strong>
                    ₦{referralBalance.toFixed(
                      2
                    )}
                  </strong>
                </div>

                <b>›</b>
              </button>
            </div>
          </>
        )}

        {/* =========================
            REFERRALS
        ========================= */}

        {activeTab === 'Referrals' && (
          <>
            <div className="page-heading">
              <span className="section-label">
                Affiliate
              </span>

              <h2>Refer & Earn</h2>

              <p>
                Invite people to TaskFlow and
                earn affiliate rewards.
              </p>
            </div>

            <div className="referral-card">
              <span>
                YOUR REFERRAL CODE
              </span>

              <h2>{referralCode}</h2>

              <p>
                Your referral link is ready.
                Share it with people you know.
              </p>

              <input
                value={referralLink}
                readOnly
              />

              <button
                className="primary-button"
                onClick={() =>
                  navigator.clipboard.writeText(
                    referralLink
                  )
                }
              >
                Copy Referral Link
              </button>
            </div>

            <section className="dashboard-section">
              <div className="wallet-grid">
                <div className="wallet-card">
                  <div className="wallet-card-header">
                    Total Referrals
                  </div>

                  <h3>{referrals}</h3>

                  <p>
                    Successful referrals
                  </p>
                </div>

                <div className="wallet-card">
                  <div className="wallet-card-header">
                    Affiliate Earnings
                  </div>

                  <h3>
                    ₦{referralBalance.toFixed(
                      2
                    )}
                  </h3>

                  <p>
                    Available affiliate
                    balance
                  </p>
                </div>
              </div>
            </section>
          </>
        )}

        {/* =========================
            PROFILE
        ========================= */}

        {activeTab === 'Profile' && (
          <>
            <div className="page-heading">
              <span className="section-label">
                Account
              </span>

              <h2>My Profile</h2>

              <p>
                Manage your TaskFlow account.
              </p>
            </div>

            <div className="profile-card">
              <div className="large-avatar">
                {profile.name
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <h2>{profile.name}</h2>

              <p>{profile.email}</p>

              <div className="profile-details">
                <div>
                  <span>
                    Full Name
                  </span>

                  <strong>
                    {profile.name}
                  </strong>
                </div>

                <div>
                  <span>Email</span>

                  <strong>
                    {profile.email}
                  </strong>
                </div>

                <div>
                  <span>Phone</span>

                  <strong>
                    {profile.phone ||
                      'Not added'}
                  </strong>
                </div>

                <div>
                  <span>Account Type</span>

                  <strong>
                    {isAdmin
                      ? 'Administrator'
                      : 'User'}
                  </strong>
                </div>
              </div>

              <button
                className="danger-button"
                onClick={handleLogout}
              >
                Log Out
              </button>
            </div>
          </>
        )}

        {/* =========================
            ADMIN
        ========================= */}

        {activeTab === 'Admin' && isAdmin && (
          <>
            <div className="page-heading">
              <span className="section-label">
                Administration
              </span>

              <h2>Admin Dashboard</h2>

              <p>
                Manage TaskFlow NG.
              </p>
            </div>

            <div className="wallet-grid">
              <div className="wallet-card">
                <div className="wallet-card-header">
                  Users
                </div>

                <h3>—</h3>

                <p>
                  Connected to Supabase
                </p>
              </div>

              <div className="wallet-card">
                <div className="wallet-card-header">
                  Tasks
                </div>

                <h3>{tasks.length}</h3>

                <p>
                  Available platform tasks
                </p>
              </div>
            </div>

            <div className="empty-card">
              <strong>
                Admin controls coming next
              </strong>

              <span>
                Task verification and
                withdrawal management will
                be connected to Supabase.
              </span>
            </div>
          </>
        )}
      </main>

      {/* =========================
          MOBILE NAV
      ========================= */}

      <nav className="bottom-nav">
        <button
          className={
            activeTab === 'Dashboard'
              ? 'active'
              : ''
          }
          onClick={() =>
            navigate('Dashboard')
          }
        >
          <span>⌂</span>
          Home
        </button>

        <button
          className={
            activeTab === 'Tasks'
              ? 'active'
              : ''
          }
          onClick={() => navigate('Tasks')}
        >
          <span>✓</span>
          Tasks
        </button>

        <button
          className={
            activeTab === 'Withdraw'
              ? 'active'
              : ''
          }
          onClick={() =>
            navigate('Withdraw')
          }
        >
          <span>₦</span>
          Wallet
        </button>

        <button
          className={
            activeTab === 'Profile'
              ? 'active'
              : ''
          }
          onClick={() =>
            navigate('Profile')
          }
        >
          <span>●</span>
          Profile
        </button>
      </nav>
    </div>
  )
}

export default App
