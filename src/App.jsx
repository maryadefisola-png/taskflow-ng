import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [tasksLoading, setTasksLoading] = useState(false)
  const [error, setError] = useState('')
  const [activePage, setActivePage] = useState('Dashboard')

  const [selectedTask, setSelectedTask] = useState(null)
  const [proof, setProof] = useState('')
  const [proofFile, setProofFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')

  const [authMode, setAuthMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [authError, setAuthError] = useState('')

  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    loadAccount()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null

        setUser(currentUser)

        if (currentUser) {
          await loadProfile(currentUser)
          await loadTasks()
        } else {
          setProfile(null)
          setTasks([])
        }

        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const loadAccount = async () => {
    setLoading(true)
    setError('')

    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      setError(userError.message)
      setLoading(false)
      return
    }

    setUser(currentUser)

    if (currentUser) {
      await loadProfile(currentUser)
      await loadTasks()
    }

    setLoading(false)
  }

  const loadProfile = async (currentUser) => {
    const { data, error: profileError } = await supabase
      .from('profiles')
      .select(
        'id, full_name, task_balance, affiliate_balance, is_active'
      )
      .eq('id', currentUser.id)
      .single()

    if (profileError) {
      console.error('Profile error:', profileError.message)
      setProfile(null)
    } else {
      setProfile(data)
    }
  }

  const loadTasks = async () => {
    setTasksLoading(true)

    const { data, error: tasksError } = await supabase
      .from('tasks')
      .select(
        'id, title, description, reward, task_type, verification_method, max_completions, starts_at, ends_at'
      )
      .eq('is_active', true)
      .order('created_at', {
        ascending: false,
      })

    if (tasksError) {
      setMessage(tasksError.message)
      setMessageType('error')
    } else {
      setTasks(data || [])
    }

    setTasksLoading(false)
  }

  const handleAuth = async (event) => {
    event.preventDefault()

    setAuthLoading(true)
    setAuthError('')
    setAuthMessage('')

    const cleanEmail = email.trim().toLowerCase()

    if (!cleanEmail || !password) {
      setAuthError('Please enter your email and password.')
      setAuthLoading(false)
      return
    }

    if (authMode === 'signup' && !fullName.trim()) {
      setAuthError('Please enter your full name.')
      setAuthLoading(false)
      return
    }

    try {
      if (authMode === 'login') {
        const { error: loginError } =
          await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          })

        if (loginError) {
          setAuthError(loginError.message)
        }
      } else {
        const { data, error: signupError } =
          await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: {
                full_name: fullName.trim(),
              },
            },
          })

        if (signupError) {
          setAuthError(signupError.message)
        } else if (data.session) {
          setAuthMessage('Account created successfully.')
        } else {
          setAuthMessage(
            'Account created. Please check your email to confirm your account before logging in.'
          )
          setAuthMode('login')
        }
      }
    } catch (err) {
      setAuthError(
        err?.message ||
          'Something went wrong. Please try again.'
      )
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()

    setUser(null)
    setProfile(null)
    setTasks([])
    setActivePage('Dashboard')
    setMenuOpen(false)
  }

  const openTaskSubmission = (task) => {
    setMessage('')
    setProof('')
    setProofFile(null)
    setSelectedTask(task)
  }

  const closeTaskSubmission = () => {
    setSelectedTask(null)
    setProof('')
    setProofFile(null)
    setSubmitting(false)
  }

  const handleProofFile = (event) => {
    const file = event.target.files?.[0]

    if (!file) {
      setProofFile(null)
      return
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/jpg',
    ]

    if (!allowedTypes.includes(file.type)) {
      setMessage(
        'Please select a JPG, PNG or WEBP image.'
      )
      setMessageType('error')
      event.target.value = ''
      setProofFile(null)
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage(
        'Screenshot is too large. Maximum size is 5MB.'
      )
      setMessageType('error')
      event.target.value = ''
      setProofFile(null)
      return
    }

    setMessage('')
    setProofFile(file)
  }

  const submitProof = async (event) => {
    event.preventDefault()

    if (!selectedTask || !user) {
      return
    }

    const cleanProof = proof.trim()

    if (!cleanProof && !proofFile) {
      setMessage(
        'Please enter your proof or upload a screenshot.'
      )
      setMessageType('error')
      return
    }

    setSubmitting(true)
    setMessage('')

    let uploadedFilePath = null

    try {
      let screenshotUrl = ''

      /*
       * Upload screenshot if the user selected one.
       */
      if (proofFile) {
        const fileExtension =
          proofFile.name.split('.').pop()?.toLowerCase() ||
          'jpg'

        const fileName = `${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 10)}.${fileExtension}`

        const filePath = `${user.id}/${fileName}`

        uploadedFilePath = filePath

        const {
          error: uploadError,
        } = await supabase.storage
          .from('task-proofs')
          .upload(filePath, proofFile, {
            cacheControl: '3600',
            upsert: false,
            contentType: proofFile.type,
          })

        if (uploadError) {
          console.error(
            'Screenshot upload error:',
            uploadError
          )

          setMessage(
            `Screenshot upload failed: ${uploadError.message}`
          )
          setMessageType('error')
          return
        }

        const {
          data: publicUrlData,
        } = supabase.storage
          .from('task-proofs')
          .getPublicUrl(filePath)

        screenshotUrl =
          publicUrlData?.publicUrl || ''
      }

      /*
       * Save the proof and screenshot URL.
       *
       * The existing database has a "proof" text column,
       * so we store the text proof and screenshot URL
       * together in that column.
       */
      let finalProof = cleanProof

      if (screenshotUrl) {
        if (finalProof) {
          finalProof += `\n\nScreenshot: ${screenshotUrl}`
        } else {
          finalProof = `Screenshot: ${screenshotUrl}`
        }
      }

      const {
        error: submissionError,
      } = await supabase
        .from('task_submissions')
        .insert({
          user_id: user.id,
          task_id: selectedTask.id,
          proof: finalProof,
          status: 'Pending',
          reward: Number(selectedTask.reward),
        })

      if (submissionError) {
        console.error(
          'Task submission error:',
          submissionError
        )

        /*
         * If the database submission fails after the
         * screenshot uploaded, remove the screenshot
         * so we don't leave an unused file.
         */
        if (uploadedFilePath) {
          await supabase.storage
            .from('task-proofs')
            .remove([uploadedFilePath])
        }

        if (submissionError.code === '23505') {
          setMessage(
            'You have already submitted this task.'
          )
        } else {
          setMessage(
            `Submission failed: ${submissionError.message}`
          )
        }

        setMessageType('error')
        return
      }

      const submittedTaskTitle = selectedTask.title

      setSelectedTask(null)
      setProof('')
      setProofFile(null)

      setMessage(
        `Success! Your proof for "${submittedTaskTitle}" has been submitted and is waiting for review.`
      )
      setMessageType('success')

      await loadTasks()
    } catch (err) {
      console.error(
        'Unexpected submission error:',
        err
      )

      if (uploadedFilePath) {
        try {
          await supabase.storage
            .from('task-proofs')
            .remove([uploadedFilePath])
        } catch (cleanupError) {
          console.error(
            'Screenshot cleanup error:',
            cleanupError
          )
        }
      }

      setMessage(
        'Something went wrong while submitting your proof. Please try again.'
      )
      setMessageType('error')
    } finally {
      setSubmitting(false)
    }
  }

  const goTo = (page) => {
    setActivePage(page)
    setMenuOpen(false)

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  const formatMoney = (amount) => {
    return `₦${Number(amount || 0).toLocaleString('en-NG')}`
  }

  const getInitials = (name) => {
    return (
      name
        ?.split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase())
        .join('') || 'TF'
    )
  }

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loading-content">
          <div className="tf-logo">TF</div>
          <h2>TaskFlow NG</h2>
          <p>Loading your account...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">
            <div className="tf-logo">TF</div>

            <div>
              <h1>TaskFlow NG</h1>
              <p>Tasks. Rewards. Growth.</p>
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
                ? 'Log in to access your dashboard.'
                : 'Create your TaskFlow NG account.'}
            </p>
          </div>

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

          <form onSubmit={handleAuth}>
            {authMode === 'signup' && (
              <div className="form-group">
                <label>Full Name</label>

                <input
                  type="text"
                  value={fullName}
                  onChange={(e) =>
                    setFullName(e.target.value)
                  }
                  placeholder="Enter your full name"
                  autoComplete="name"
                  disabled={authLoading}
                />
              </div>
            )}

            <div className="form-group">
              <label>Email Address</label>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="Enter your email"
                autoComplete="email"
                disabled={authLoading}
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>

              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="Enter your password"
                autoComplete={
                  authMode === 'login'
                    ? 'current-password'
                    : 'new-password'
                }
                disabled={authLoading}
                required
              />
            </div>

            <button
              type="submit"
              className="primary-button"
              disabled={authLoading}
            >
              {authLoading
                ? 'Please wait...'
                : authMode === 'login'
                ? 'Log In'
                : 'Create Account'}
            </button>
          </form>

          <div
            style={{
              textAlign: 'center',
              marginTop: '18px',
            }}
          >
            <p style={{ marginBottom: '8px' }}>
              {authMode === 'login'
                ? "Don't have an account?"
                : 'Already have an account?'}
            </p>

            <button
              type="button"
              className="outline-button"
              style={{ width: '100%' }}
              onClick={() => {
                setAuthMode(
                  authMode === 'login'
                    ? 'signup'
                    : 'login'
                )
                setAuthError('')
                setAuthMessage('')
              }}
              disabled={authLoading}
            >
              {authMode === 'login'
                ? 'Create an Account'
                : 'Back to Login'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="loading-page">
        <div className="loading-content">
          <div className="tf-logo">TF</div>
          <h2>Something went wrong</h2>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  const taskBalance = Number(
    profile?.task_balance ?? 0
  )

  const affiliateBalance = Number(
    profile?.affiliate_balance ?? 0
  )

  const totalBalance =
    taskBalance + affiliateBalance

  const displayName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    'TaskFlow User'

  const initials = getInitials(displayName)

  const dashboardPage = (
    <>
      <div className="dashboard-heading">
        <div>
          <span className="section-label">
            DASHBOARD
          </span>

          <h2>
            Welcome, {displayName.split(' ')[0]}
          </h2>

          <p>
            Manage your tasks, rewards and earnings.
          </p>
        </div>

        <button
          className="outline-button"
          onClick={() => goTo('Tasks')}
        >
          View Tasks
        </button>
      </div>

      <div className="balance-overview">
        <div className="balance-overview-content">
          <span>TOTAL BALANCE</span>

          <h2>{formatMoney(totalBalance)}</h2>

          <p>
            Your combined Task and Affiliate balance
          </p>
        </div>

        <div className="balance-mark">₦</div>
      </div>

      <div className="wallet-grid">
        <div className="wallet-card">
          <div className="wallet-card-header">
            <div className="wallet-symbol task">
              T
            </div>

            Task Balance
          </div>

          <h3>{formatMoney(taskBalance)}</h3>

          <p>
            Rewards earned from completed tasks
          </p>
        </div>

        <div className="wallet-card">
          <div className="wallet-card-header">
            <div className="wallet-symbol affiliate">
              A
            </div>

            Affiliate Balance
          </div>

          <h3>{formatMoney(affiliateBalance)}</h3>

          <p>
            Earnings from your referrals
          </p>
        </div>
      </div>

      <div className="dashboard-section">
        <div className="section-title-row">
          <h3>Quick Actions</h3>
        </div>

        <div className="action-grid">
          <button
            className="action-card"
            onClick={() => goTo('Tasks')}
          >
            <div className="action-icon">T</div>

            <div>
              <strong>Complete Tasks</strong>

              <span>
                Earn rewards by completing available
                tasks.
              </span>
            </div>

            <b>›</b>
          </button>

          <button
            className="action-card"
            onClick={() => goTo('Referral')}
          >
            <div className="action-icon">R</div>

            <div>
              <strong>Refer Friends</strong>

              <span>
                Invite people and grow your affiliate
                earnings.
              </span>
            </div>

            <b>›</b>
          </button>

          <button
            className="action-card"
            onClick={() => goTo('Withdraw')}
          >
            <div className="action-icon">₦</div>

            <div>
              <strong>Withdraw</strong>

              <span>
                Request a withdrawal from your balance.
              </span>
            </div>

            <b>›</b>
          </button>
        </div>
      </div>

      <div className="dashboard-section">
        <div className="section-title-row">
          <h3>Available Tasks</h3>

          <button
            className="text-button"
            onClick={() => goTo('Tasks')}
          >
            View all
          </button>
        </div>

        {tasksLoading ? (
          <div className="empty-card">
            <strong>Loading tasks...</strong>

            <span>
              Please wait while we load available tasks.
            </span>
          </div>
        ) : tasks.length === 0 ? (
          <div className="empty-card">
            <strong>No tasks available</strong>

            <span>
              New tasks will appear here when they are
              published.
            </span>
          </div>
        ) : (
          <div className="mini-task-list">
            {tasks.slice(0, 3).map((task, index) => (
              <button
                key={task.id}
                className="mini-task"
                onClick={() =>
                  openTaskSubmission(task)
                }
              >
                <div className="mini-task-icon">
                  {index + 1}
                </div>

                <div className="mini-task-info">
                  <strong>{task.title}</strong>

                  <span>
                    {task.description ||
                      'Complete this task and submit your proof.'}
                  </span>
                </div>

                <strong>
                  {formatMoney(task.reward)}
                </strong>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )

  const tasksPage = (
    <>
      <div className="page-heading">
        <span className="section-label">
          TASK CENTER
        </span>

        <h2>Available Tasks</h2>

        <p>
          Complete tasks and submit proof to earn
          rewards.
        </p>
      </div>

      {message && (
        <div
          className={
            messageType === 'error'
              ? 'form-error'
              : 'form-message'
          }
          style={{ marginBottom: '18px' }}
        >
          {message}
        </div>
      )}

      {tasksLoading ? (
        <div className="empty-card large">
          <strong>Loading tasks...</strong>

          <span>
            Please wait while we load available tasks.
          </span>
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty-card large">
          <strong>No tasks available</strong>

          <span>
            Check back later for new earning
            opportunities.
          </span>
        </div>
      ) : (
        <div className="task-list">
          {tasks.map((task, index) => (
            <div
              className="real-task-card"
              key={task.id}
            >
              <div className="task-card-heading">
                <div className="task-number">
                  {index + 1}
                </div>

                <span>
                  {task.task_type || 'TASK'}
                </span>
              </div>

              <h3>{task.title}</h3>

              <p>
                {task.description ||
                  'Complete this task and submit your proof for review.'}
              </p>

              <div className="task-card-bottom">
                <div>
                  <small>REWARD</small>

                  <strong>
                    {formatMoney(task.reward)}
                  </strong>
                </div>

                <button
                  className="primary-button small-button"
                  onClick={() =>
                    openTaskSubmission(task)
                  }
                >
                  Submit Proof
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )

  const referralPage = (
    <>
      <div className="page-heading">
        <span className="section-label">
          AFFILIATE
        </span>

        <h2>Refer & Earn</h2>

        <p>
          Invite friends and earn from your referrals.
        </p>
      </div>

      <div className="referral-card">
        <span>YOUR REFERRAL CODE</span>

        <h2>TASKFLOW2026</h2>

        <p>
          Share your referral code with friends who
          join TaskFlow NG. Your affiliate earnings
          will appear in your Affiliate Balance.
        </p>

        <button
          className="primary-button small-button"
          onClick={() => {
            navigator.clipboard
              ?.writeText('TASKFLOW2026')
              .then(() => {
                setMessage(
                  'Referral code copied successfully.'
                )
                setMessageType('success')
              })
              .catch(() => {
                setMessage(
                  'Copy failed. Please copy the code manually.'
                )
                setMessageType('error')
              })
          }}
        >
          Copy Referral Code
        </button>

        {message && (
          <div
            className={
              messageType === 'error'
                ? 'form-error'
                : 'form-message'
            }
          >
            {message}
          </div>
        )}
      </div>
    </>
  )

  const withdrawPage = (
    <>
      <div className="page-heading">
        <span className="section-label">
          WITHDRAWAL
        </span>

        <h2>Withdraw Funds</h2>

        <p>
          Choose which balance you want to withdraw
          from.
        </p>
      </div>

      <div className="withdraw-choice-grid">
        <button
          className="withdraw-choice"
          onClick={() => {
            setMessage(
              'Withdrawal requests will be available once the withdrawal system is connected.'
            )
            setMessageType('success')
          }}
        >
          <div className="wallet-symbol task">
            T
          </div>

          <div>
            <span>Task Balance</span>

            <strong>
              {formatMoney(taskBalance)}
            </strong>
          </div>

          <b>›</b>
        </button>

        <button
          className="withdraw-choice"
          onClick={() => {
            setMessage(
              'Withdrawal requests will be available once the withdrawal system is connected.'
            )
            setMessageType('success')
          }}
        >
          <div className="wallet-symbol affiliate">
            A
          </div>

          <div>
            <span>Affiliate Balance</span>

            <strong>
              {formatMoney(affiliateBalance)}
            </strong>
          </div>

          <b>›</b>
        </button>
      </div>

      {message && (
        <div
          className={
            messageType === 'error'
              ? 'form-error'
              : 'form-message'
          }
          style={{
            maxWidth: '650px',
            marginTop: '18px',
          }}
        >
          {message}
        </div>
      )}
    </>
  )

  const profilePage = (
    <>
      <div className="page-heading">
        <span className="section-label">
          ACCOUNT
        </span>

        <h2>My Profile</h2>

        <p>
          View your TaskFlow NG account information.
        </p>
      </div>

      <div className="profile-card">
        <div className="large-avatar">
          {initials}
        </div>

        <h2>{displayName}</h2>

        <p>{user.email}</p>

        <div className="profile-details">
          <div>
            <span>Full Name</span>

            <strong>{displayName}</strong>
          </div>

          <div>
            <span>Email</span>

            <strong>{user.email}</strong>
          </div>

          <div>
            <span>Task Balance</span>

            <strong>
              {formatMoney(taskBalance)}
            </strong>
          </div>

          <div>
            <span>Affiliate Balance</span>

            <strong>
              {formatMoney(affiliateBalance)}
            </strong>
          </div>

          <div>
            <span>Account Status</span>

            <strong>
              {profile?.is_active
                ? 'Active'
                : 'Inactive'}
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
  )

  let pageContent = dashboardPage

  if (activePage === 'Tasks') {
    pageContent = tasksPage
  }

  if (activePage === 'Referral') {
    pageContent = referralPage
  }

  if (activePage === 'Withdraw') {
    pageContent = withdrawPage
  }

  if (activePage === 'Profile') {
    pageContent = profilePage
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
            <span>Rewards Dashboard</span>
          </div>
        </div>

        <div className="topbar-right">
          <button
            className="profile-button"
            onClick={() => goTo('Profile')}
          >
            <div className="avatar">
              {initials}
            </div>

            <div className="profile-button-text">
              <strong>{displayName}</strong>

              <span>My Profile</span>
            </div>
          </button>

          <button
            className="menu-button"
            onClick={() =>
              setMenuOpen((value) => !value)
            }
            aria-label="Open menu"
          >
            ☰
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="menu-panel">
          <div className="menu-panel-title">
            Navigation
          </div>

          <button
            className={`menu-link ${
              activePage === 'Dashboard'
                ? 'active'
                : ''
            }`}
            onClick={() => goTo('Dashboard')}
          >
            Dashboard
          </button>

          <button
            className={`menu-link ${
              activePage === 'Tasks'
                ? 'active'
                : ''
            }`}
            onClick={() => goTo('Tasks')}
          >
            Tasks
          </button>

          <button
            className={`menu-link ${
              activePage === 'Referral'
                ? 'active'
                : ''
            }`}
            onClick={() => goTo('Referral')}
          >
            Referral
          </button>

          <button
            className={`menu-link ${
              activePage === 'Withdraw'
                ? 'active'
                : ''
            }`}
            onClick={() => goTo('Withdraw')}
          >
            Withdraw
          </button>

          <button
            className={`menu-link ${
              activePage === 'Profile'
                ? 'active'
                : ''
            }`}
            onClick={() => goTo('Profile')}
          >
            Profile
          </button>

          <div className="menu-divider" />

          <button
            className="menu-link logout-link"
            onClick={handleLogout}
          >
            Log Out
          </button>
        </div>
      )}

      <main className="dashboard-container">
        {pageContent}
      </main>

      <nav className="bottom-nav">
        <button
          className={
            activePage === 'Dashboard'
              ? 'active'
              : ''
          }
          onClick={() => goTo('Dashboard')}
        >
          <span>⌂</span>
          Dashboard
        </button>

        <button
          className={
            activePage === 'Tasks'
              ? 'active'
              : ''
          }
          onClick={() => goTo('Tasks')}
        >
          <span>✓</span>
          Tasks
        </button>

        <button
          className={
            activePage === 'Referral'
              ? 'active'
              : ''
          }
          onClick={() => goTo('Referral')}
        >
          <span>↗</span>
          Referral
        </button>

        <button
          className={
            activePage === 'Profile'
              ? 'active'
              : ''
          }
          onClick={() => goTo('Profile')}
        >
          <span>●</span>
          Profile
        </button>
      </nav>

      {selectedTask && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(23, 32, 51, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 100,
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '500px',
              background: 'white',
              borderRadius: '20px',
              padding: '28px',
              boxShadow:
                '0 25px 70px rgba(23, 32, 51, 0.2)',
              margin: '20px 0',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '15px',
              }}
            >
              <div>
                <span className="section-label">
                  SUBMIT TASK
                </span>

                <h2
                  style={{
                    margin: 0,
                    fontSize: '24px',
                  }}
                >
                  {selectedTask.title}
                </h2>
              </div>

              <button
                className="outline-button"
                onClick={closeTaskSubmission}
                disabled={submitting}
                style={{
                  padding: '7px 11px',
                }}
              >
                ✕
              </button>
            </div>

            <p
              style={{
                color: '#7b8597',
                fontSize: '13px',
                lineHeight: 1.5,
                marginTop: '15px',
              }}
            >
              {selectedTask.description ||
                'Complete the task and provide proof below.'}
            </p>

            <div
              style={{
                background: '#eef8f3',
                color: '#17734d',
                padding: '12px 14px',
                borderRadius: '10px',
                fontWeight: 700,
                marginBottom: '18px',
              }}
            >
              Reward: {formatMoney(selectedTask.reward)}
            </div>

            <form onSubmit={submitProof}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '7px',
                  fontSize: '13px',
                  fontWeight: 700,
                }}
              >
                Your Proof
              </label>

              <textarea
                value={proof}
                onChange={(e) =>
                  setProof(e.target.value)
                }
                placeholder="Enter your proof, link, username, or other verification details..."
                disabled={submitting}
                rows={5}
                style={{
                  width: '100%',
                  resize: 'vertical',
                  border: '1px solid #dfe3ea',
                  borderRadius: '11px',
                  padding: '13px 14px',
                  outline: 'none',
                  font: 'inherit',
                  boxSizing: 'border-box',
                }}
              />

              <div
                style={{
                  marginTop: '16px',
                  marginBottom: '8px',
                }}
              >
                <label
                  htmlFor="proof-screenshot"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 700,
                    marginBottom: '8px',
                  }}
                >
                  Upload Screenshot
                </label>

                <input
                  id="proof-screenshot"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleProofFile}
                  disabled={submitting}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px',
                    border: '1px dashed #cbd2dc',
                    borderRadius: '11px',
                    background: '#f8fafc',
                  }}
                />

                <small
                  style={{
                    display: 'block',
                    color: '#7b8597',
                    marginTop: '7px',
                    fontSize: '12px',
                  }}
                >
                  JPG, PNG or WEBP. Maximum 5MB.
                </small>

                {proofFile && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '10px 12px',
                      background: '#eef8f3',
                      color: '#17734d',
                      borderRadius: '9px',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    ✓ {proofFile.name}
                  </div>
                )}
              </div>

              {message && (
                <div
                  className={
                    messageType === 'error'
                      ? 'form-error'
                      : 'form-message'
                  }
                  style={{
                    marginTop: '14px',
                    marginBottom: '14px',
                  }}
                >
                  {message}
                </div>
              )}

              <button
                type="submit"
                className="primary-button"
                disabled={submitting}
                style={{
                  width: '100%',
                }}
              >
                {submitting
                  ? 'Uploading & Submitting...'
                  : 'Submit Proof'}
              </button>

              <button
                type="button"
                className="outline-button"
                onClick={closeTaskSubmission}
                disabled={submitting}
                style={{
                  width: '100%',
                  marginTop: '10px',
                }}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
