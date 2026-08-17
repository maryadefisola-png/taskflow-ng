import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import './App.css'

const ADMIN_EMAIL = 'admin@taskflow.ng'

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [tasks, setTasks] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [withdrawals, setWithdrawals] = useState([])

  const [activeTab, setActiveTab] = useState('Dashboard')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
  })

  const [selectedTask, setSelectedTask] = useState(null)
  const [proof, setProof] = useState('')

  const [withdrawSource, setWithdrawSource] = useState('task')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountName, setAccountName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')

  const [referralCode, setReferralCode] = useState('')
  const [referrals, setReferrals] = useState([])

  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [newTaskReward, setNewTaskReward] = useState('')

  const user = session?.user || null
  const isAdmin =
    user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()

  /*
   * =========================
   * INITIAL AUTH
   * =========================
   */

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!mounted) return

      setSession(session)
      setLoading(false)
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  /*
   * =========================
   * LOAD USER DATA
   * =========================
   */

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setTasks([])
      setSubmissions([])
      setWithdrawals([])
      return
    }

    loadUserData()
  }, [user])

  async function loadUserData() {
    setLoading(true)
    setError('')

    try {
      const [
        profileResult,
        tasksResult,
        submissionsResult,
        withdrawalsResult,
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single(),

        supabase
          .from('tasks')
          .select('*')
          .eq('is_active', true)
          .order('created_at', {
            ascending: false,
          }),

        supabase
          .from('task_submissions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', {
            ascending: false,
          }),

        supabase
          .from('withdrawals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', {
            ascending: false,
          }),
      ])

      if (profileResult.error) {
        throw profileResult.error
      }

      if (tasksResult.error) {
        throw tasksResult.error
      }

      if (submissionsResult.error) {
        throw submissionsResult.error
      }

      if (withdrawalsResult.error) {
        throw withdrawalsResult.error
      }

      setProfile(profileResult.data)
      setTasks(tasksResult.data || [])
      setSubmissions(submissionsResult.data || [])
      setWithdrawals(withdrawalsResult.data || [])

      setReferralCode(
        profileResult.data?.referral_code || ''
      )
    } catch (err) {
      console.error(err)
      setError(
        err.message ||
          'Unable to load your TaskFlow account.'
      )
    } finally {
      setLoading(false)
    }
  }

  /*
   * =========================
   * AUTH
   * =========================
   */

  async function handleAuth(event) {
    event.preventDefault()

    setError('')
    setMessage('')

    const email = authForm.email.trim()
    const password = authForm.password.trim()

    if (!email || !password) {
      setError(
        'Please enter your email and password.'
      )
      return
    }

    if (authMode === 'signup') {
      if (!authForm.name.trim()) {
        setError('Please enter your full name.')
        return
      }

      if (password.length < 6) {
        setError(
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
              full_name: authForm.name.trim(),
              phone: authForm.phone.trim(),
            },
          },
        })

      if (error) {
        setError(error.message)
        return
      }

      if (data.session) {
        setMessage(
          'Account created successfully.'
        )
      } else {
        setMessage(
          'Account created. Check your email if confirmation is required.'
        )
      }

      setAuthForm({
        name: '',
        email: '',
        password: '',
        phone: '',
      })

      return
    }

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      })

    if (error) {
      setError(error.message)
      return
    }

    setMessage('Login successful.')
  }

  async function handleLogout() {
    await supabase.auth.signOut()

    setSession(null)
    setProfile(null)
    setActiveTab('Dashboard')
  }

  /*
   * =========================
   * TASKS
   * =========================
   */

  function hasSubmitted(taskId) {
    return submissions.some(
      (submission) =>
        submission.task_id === taskId
    )
  }

  function getSubmission(taskId) {
    return submissions.find(
      (submission) =>
        submission.task_id === taskId
    )
  }

  function openTask(task) {
    setSelectedTask(task)
    setProof('')
    setError('')
    setMessage('')
  }

  function closeTask() {
    setSelectedTask(null)
    setProof('')
  }

  async function submitTaskProof(event) {
    event.preventDefault()

    if (!selectedTask) return

    setError('')
    setMessage('')

    if (!proof.trim()) {
      setError(
        'Please enter your proof before submitting.'
      )
      return
    }

    if (hasSubmitted(selectedTask.id)) {
      setError(
        'You have already submitted this task.'
      )
      return
    }

    const { error } =
      await supabase
        .from('task_submissions')
        .insert({
          user_id: user.id,
          task_id: selectedTask.id,
          proof: proof.trim(),
          status: 'pending',
          reward: selectedTask.reward,
        })

    if (error) {
      setError(error.message)
      return
    }

    setMessage(
      'Your proof has been submitted and is pending review.'
    )

    closeTask()

    await loadUserData()
  }

  /*
   * =========================
   * WITHDRAWAL
   * =========================
   */

  const taskBalance =
    Number(profile?.task_balance || 0)

  const affiliateBalance =
    Number(profile?.affiliate_balance || 0)

  const totalBalance =
    taskBalance + affiliateBalance

  const selectedBalance =
    withdrawSource === 'task'
      ? taskBalance
      : affiliateBalance

  async function handleWithdraw(event) {
    event.preventDefault()

    setError('')
    setMessage('')

    const amount = Number(withdrawAmount)

    if (
      !bankName.trim() ||
      !accountName.trim() ||
      !accountNumber.trim() ||
      !amount
    ) {
      setError(
        'Please fill in all withdrawal details.'
      )
      return
    }

    if (accountNumber.length !== 10) {
      setError(
        'Account number must contain 10 digits.'
      )
      return
    }

    if (amount < 100) {
      setError(
        'Minimum withdrawal amount is ₦100.'
      )
      return
    }

    if (amount > selectedBalance) {
      setError(
        'Insufficient balance in the selected wallet.'
      )
      return
    }

    const { error } =
      await supabase
        .from('withdrawals')
        .insert({
          user_id: user.id,
          amount,
          bank_name: bankName.trim(),
          account_name: accountName.trim(),
          account_number: accountNumber.trim(),
          status: 'pending',
        })

    if (error) {
      setError(error.message)
      return
    }

    setMessage(
      'Withdrawal request submitted successfully.'
    )

    setWithdrawAmount('')
    setBankName('')
    setAccountName('')
    setAccountNumber('')

    await loadUserData()
    setActiveTab('History')
  }

  /*
   * =========================
   * PROFILE
   * =========================
   */

  async function saveProfile(event) {
    event.preventDefault()

    setError('')
    setMessage('')

    const { error } =
      await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
        })
        .eq('id', user.id)

    if (error) {
      setError(error.message)
      return
    }

    setMessage(
      'Profile updated successfully.'
    )

    await loadUserData()
  }

  /*
   * =========================
   * REFERRAL
   * =========================
   */

  const referralLink =
    `${window.location.origin}?ref=${referralCode}`

  async function copyReferralLink() {
    try {
      await navigator.clipboard.writeText(
        referralLink
      )

      setMessage(
        'Referral link copied.'
      )
    } catch {
      setError(
        'Unable to copy the referral link.'
      )
    }
  }

  /*
   * =========================
   * ADMIN
   * =========================
   */

  async function addTask(event) {
    event.preventDefault()

    setError('')
    setMessage('')

    const reward = Number(newTaskReward)

    if (
      !newTaskTitle.trim() ||
      !newTaskDescription.trim() ||
      !reward
    ) {
      setError(
        'Please complete all task fields.'
      )
      return
    }

    const { error } =
      await supabase
        .from('tasks')
        .insert({
          title: newTaskTitle.trim(),
          description:
            newTaskDescription.trim(),
          reward,
          is_active: true,
          task_type: 'general',
          verification_method: 'text',
        })

    if (error) {
      setError(error.message)
      return
    }

    setNewTaskTitle('')
    setNewTaskDescription('')
    setNewTaskReward('')

    setMessage(
      'Task created successfully.'
    )

    await loadUserData()
  }

  async function updateSubmissionStatus(
    submission,
    status
  ) {
    setError('')
    setMessage('')

    const { error } =
      await supabase
        .from('task_submissions')
        .update({
          status,
        })
        .eq('id', submission.id)

    if (error) {
      setError(error.message)
      return
    }

    setMessage(
      `Submission marked as ${status}.`
    )

    await loadUserData()
  }

  async function updateWithdrawalStatus(
    withdrawal,
    status
  ) {
    setError('')
    setMessage('')

    const { error } =
      await supabase
        .from('withdrawals')
        .update({
          status,
        })
        .eq('id', withdrawal.id)

    if (error) {
      setError(error.message)
      return
    }

    setMessage(
      `Withdrawal marked as ${status}.`
    )

    await loadUserData()
  }

  /*
   * =========================
   * LOADING
   * =========================
   */

  if (loading && !session) {
    return (
      <div className="app loading-page">
        <div className="loading-content">
          <div className="tf-logo">
            TF
          </div>

          <h2>TaskFlow NG</h2>

          <p>Loading...</p>
        </div>
      </div>
    )
  }

  /*
   * =========================
   * LOGIN
   * =========================
   */

  if (!user) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">
            <div className="tf-logo">
              TF
            </div>

            <div>
              <h1>TaskFlow NG</h1>
              <p>Tasks • Rewards • Earnings</p>
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
                ? 'Log in to continue to your TaskFlow account.'
                : 'Create an account to start completing tasks.'}
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
                setError('')
                setMessage('')
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
                setError('')
                setMessage('')
              }}
            >
              Sign Up
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
                  onChange={(e) =>
                    setAuthForm({
                      ...authForm,
                      name: e.target.value,
                    })
                  }
                />

                <label>Phone Number</label>

                <input
                  type="tel"
                  placeholder="Enter your phone number"
                  value={authForm.phone}
                  onChange={(e) =>
                    setAuthForm({
                      ...authForm,
                      phone: e.target.value,
                    })
                  }
                />
              </>
            )}

            <label>Email Address</label>

            <input
              type="email"
              placeholder="you@example.com"
              value={authForm.email}
              onChange={(e) =>
                setAuthForm({
                  ...authForm,
                  email: e.target.value,
                })
              }
            />

            <label>Password</label>

            <input
              type="password"
              placeholder="Minimum 6 characters"
              value={authForm.password}
              onChange={(e) =>
                setAuthForm({
                  ...authForm,
                  password: e.target.value,
                })
              }
            />

            {error && (
              <div className="form-error">
                {error}
              </div>
            )}

            {message && (
              <div className="form-message">
                {message}
              </div>
            )}

            <button
              type="submit"
              className="primary-button"
            >
              {authMode === 'login'
                ? 'Login to TaskFlow'
                : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  /*
   * =========================
   * ADMIN
   * =========================
   */

  if (
    isAdmin &&
    activeTab === 'Admin'
  ) {
    return (
      <div className="app">
        <header className="topbar">
          <div className="topbar-left">
            <div className="tf-logo small">
              TF
            </div>

            <div>
              <h1>TaskFlow NG</h1>
              <span>Administration</span>
            </div>
          </div>

          <button
            className="outline-button"
            onClick={() =>
              setActiveTab('Dashboard')
            }
          >
            Back to Dashboard
          </button>
        </header>

        <main className="dashboard-container">
          <div className="dashboard-heading">
            <div>
              <span className="section-label">
                ADMINISTRATION
              </span>

              <h2>Control Center</h2>

              <p>
                Manage tasks, submissions and
                withdrawal requests.
              </p>
            </div>
          </div>

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          {message && (
            <div className="form-message">
              {message}
            </div>
          )}

          <section className="wallet-grid">
            <div className="wallet-card">
              <div className="wallet-card-header">
                <div className="wallet-symbol task">
                  ₦
                </div>

                Total User Task Balance
              </div>

              <h3>
                ₦{taskBalance.toFixed(2)}
              </h3>
            </div>

            <div className="wallet-card">
              <div className="wallet-card-header">
                <div className="wallet-symbol affiliate">
                  ₦
                </div>

                Total Affiliate Balance
              </div>

              <h3>
                ₦{affiliateBalance.toFixed(2)}
              </h3>
            </div>
          </section>

          <section className="dashboard-section">
            <div className="section-title-row">
              <h3>Create Task</h3>
            </div>

            <div className="profile-card">
              <form onSubmit={addTask}>
                <label>Task Title</label>

                <input
                  value={newTaskTitle}
                  onChange={(e) =>
                    setNewTaskTitle(
                      e.target.value
                    )
                  }
                  placeholder="Example: Daily Check-in"
                />

                <label>Description</label>

                <input
                  value={newTaskDescription}
                  onChange={(e) =>
                    setNewTaskDescription(
                      e.target.value
                    )
                  }
                  placeholder="Task instructions"
                />

                <label>Reward</label>

                <input
                  type="number"
                  min="1"
                  value={newTaskReward}
                  onChange={(e) =>
                    setNewTaskReward(
                      e.target.value
                    )
                  }
                  placeholder="50"
                />

                <button
                  type="submit"
                  className="primary-button"
                >
                  Create Task
                </button>
              </form>
            </div>
          </section>

          <section className="dashboard-section">
            <div className="section-title-row">
              <h3>Task Submissions</h3>
            </div>

            {submissions.length === 0 ? (
              <div className="empty-card">
                <strong>
                  No submissions yet.
                </strong>

                <span>
                  User task submissions will appear
                  here.
                </span>
              </div>
            ) : (
              submissions.map(
                (submission) => (
                  <div
                    className="wallet-card"
                    key={submission.id}
                    style={{
                      marginBottom: '12px',
                    }}
                  >
                    <strong>
                      Submission
                    </strong>

                    <p>
                      Proof: {submission.proof}
                    </p>

                    <p>
                      Reward: ₦
                      {Number(
                        submission.reward || 0
                      ).toFixed(2)}
                    </p>

                    <p>
                      Status:{' '}
                      {submission.status}
                    </p>

                    {submission.status ===
                      'pending' && (
                      <div
                        style={{
                          display: 'flex',
                          gap: '10px',
                          marginTop: '15px',
                        }}
                      >
                        <button
                          className="outline-button"
                          onClick={() =>
                            updateSubmissionStatus(
                              submission,
                              'approved'
                            )
                          }
                        >
                          Approve
                        </button>

                        <button
                          className="danger-button"
                          onClick={() =>
                            updateSubmissionStatus(
                              submission,
                              'rejected'
                            )
                          }
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                )
              )
            )}
          </section>

          <section className="dashboard-section">
            <div className="section-title-row">
              <h3>Withdrawal Requests</h3>
            </div>

            {withdrawals.length === 0 ? (
              <div className="empty-card">
                <strong>
                  No withdrawal requests.
                </strong>
              </div>
            ) : (
              withdrawals.map(
                (withdrawal) => (
                  <div
                    className="wallet-card"
                    key={withdrawal.id}
                    style={{
                      marginBottom: '12px',
                    }}
                  >
                    <h3>
                      ₦
                      {Number(
                        withdrawal.amount
                      ).toFixed(2)}
                    </h3>

                    <p>
                      Bank:{' '}
                      {withdrawal.bank_name}
                    </p>

                    <p>
                      Account:{' '}
                      {withdrawal.account_name}
                    </p>

                    <p>
                      Status:{' '}
                      {withdrawal.status}
                    </p>

                    {withdrawal.status ===
                      'pending' && (
                      <div
                        style={{
                          display: 'flex',
                          gap: '10px',
                          marginTop: '15px',
                        }}
                      >
                        <button
                          className="outline-button"
                          onClick={() =>
                            updateWithdrawalStatus(
                              withdrawal,
                              'approved'
                            )
                          }
                        >
                          Approve
                        </button>

                        <button
                          className="danger-button"
                          onClick={() =>
                            updateWithdrawalStatus(
                              withdrawal,
                              'rejected'
                            )
                          }
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                )
              )
            )}
          </section>
        </main>
      </div>
    )
  }

  /*
   * =========================
   * MAIN APP
   * =========================
   */

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
              Your rewards workspace
            </span>
          </div>
        </div>

        <div className="topbar-right">
          <button
            className="profile-button"
            onClick={() =>
              setActiveTab('Profile')
            }
          >
            <div className="avatar">
              {(profile?.full_name ||
                'U')
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="profile-button-text">
              <strong>
                {profile?.full_name ||
                  'User'}
              </strong>

              <span>
                {user.email}
              </span>
            </div>
          </button>

          <button
            className="icon-button"
            onClick={handleLogout}
            title="Log out"
          >
            ↪
          </button>
        </div>
      </header>

      <main className="dashboard-container">
        {error && (
          <div
            className="form-error"
            style={{
              marginBottom: '15px',
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            className="form-message"
            style={{
              marginBottom: '15px',
            }}
          >
            {message}
          </div>
        )}

        {activeTab === 'Dashboard' && (
          <>
            <div className="dashboard-heading">
              <div>
                <span className="section-label">
                  ACCOUNT OVERVIEW
                </span>

                <h2>
                  Good to see you,{' '}
                  {profile?.full_name?.split(
                    ' '
                  )[0] || 'there'}.
                </h2>

                <p>
                  Here's an overview of your
                  TaskFlow account.
                </p>
              </div>

              <button
                className="outline-button"
                onClick={() =>
                  setActiveTab('Tasks')
                }
              >
                View Available Tasks
              </button>
            </div>

            <section className="balance-overview">
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
            </section>

            <section className="wallet-grid">
              <div className="wallet-card">
                <div className="wallet-card-header">
                  <div className="wallet-symbol task">
                    T
                  </div>

                  Task Balance
                </div>

                <h3>
                  ₦{taskBalance.toFixed(2)}
                </h3>

                <p>
                  Earnings from approved tasks
                </p>
              </div>

              <div className="wallet-card">
                <div className="wallet-card-header">
                  <div className="wallet-symbol affiliate">
                    A
                  </div>

                  Affiliate Balance
                </div>

                <h3>
                  ₦
                  {affiliateBalance.toFixed(
                    2
                  )}
                </h3>

                <p>
                  Earnings from referrals
                </p>
              </div>
            </section>

            <section className="dashboard-section">
              <div className="section-title-row">
                <h3>
                  What would you like to do?
                </h3>
              </div>

              <div className="action-grid">
                <button
                  className="action-card"
                  onClick={() =>
                    setActiveTab('Tasks')
                  }
                >
                  <div className="action-icon">
                    T
                  </div>

                  <div>
                    <strong>
                      Complete a task
                    </strong>

                    <span>
                      Earn money by completing
                      available tasks.
                    </span>
                  </div>

                  <b>→</b>
                </button>

                <button
                  className="action-card"
                  onClick={() =>
                    setActiveTab('Withdraw')
                  }
                >
                  <div className="action-icon">
                    ₦
                  </div>

                  <div>
                    <strong>
                      Withdraw funds
                    </strong>

                    <span>
                      Request a withdrawal from
                      either wallet.
                    </span>
                  </div>

                  <b>→</b>
                </button>

                <button
                  className="action-card"
                  onClick={() =>
                    setActiveTab('Referrals')
                  }
                >
                  <div className="action-icon">
                    +
                  </div>

                  <div>
                    <strong>
                      Refer & earn
                    </strong>

                    <span>
                      Invite others and earn
                      affiliate rewards.
                    </span>
                  </div>

                  <b>→</b>
                </button>
              </div>
            </section>

            <section className="dashboard-section">
              <div className="section-title-row">
                <h3>
                  Available right now
                </h3>

                <button
                  className="text-button"
                  onClick={() =>
                    setActiveTab('Tasks')
                  }
                >
                  View all
                </button>
              </div>

              {tasks.length === 0 ? (
                <div className="empty-card">
                  <strong>
                    No tasks available
                  </strong>

                  <span>
                    Check back later for new
                    opportunities.
                  </span>
                </div>
              ) : (
                <div className="mini-task-list">
                  {tasks
                    .slice(0, 3)
                    .map((task) => (
                      <button
                        className="mini-task"
                        key={task.id}
                        onClick={() =>
                          openTask(task)
                        }
                      >
                        <div className="mini-task-icon">
                          T
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
                          +₦
                          {Number(
                            task.reward
                          ).toFixed(0)}
                        </strong>
                      </button>
                    ))}
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === 'Tasks' && (
          <>
            <div className="page-heading">
              <span className="section-label">
                EARNINGS
              </span>

              <h2>Available Tasks</h2>

              <p>
                Complete a task and submit proof
                for review.
              </p>
            </div>

            {tasks.length === 0 ? (
              <div className="empty-card large">
                <strong>
                  No tasks available
                </strong>

                <span>
                  New tasks will appear here.
                </span>
              </div>
            ) : (
              <div className="task-list">
                {tasks.map((task, index) => {
                  const submission =
                    getSubmission(task.id)

                  return (
                    <div
                      className="real-task-card"
                      key={task.id}
                    >
                      <div className="task-card-heading">
                        <div className="task-number">
                          {index + 1}
                        </div>

                        {task.task_type ||
                          'Task'}
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
                            ₦
                            {Number(
                              task.reward
                            ).toFixed(2)}
                          </strong>
                        </div>

                        {submission ? (
                          <span
                            style={{
                              fontSize:
                                '12px',
                              fontWeight: 700,
                            }}
                          >
                            {submission.status ===
                            'pending'
                              ? 'Pending Review'
                              : submission.status ===
                                'approved'
                              ? 'Approved ✓'
                              : 'Rejected'}
                          </span>
                        ) : (
                          <button
                            className="outline-button"
                            onClick={() =>
                              openTask(task)
                            }
                          >
                            Open Task
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'Withdraw' && (
          <>
            <div className="page-heading">
              <span className="section-label">
                PAYOUT
              </span>

              <h2>Withdraw Funds</h2>

              <p>
                Choose which balance you want to
                withdraw from.
              </p>
            </div>

            <div className="withdraw-choice-grid">
              <button
                className="withdraw-choice"
                onClick={() =>
                  setWithdrawSource('task')
                }
              >
                <div className="wallet-symbol task">
                  T
                </div>

                <div>
                  <span>
                    Task Balance
                  </span>

                  <strong>
                    ₦
                    {taskBalance.toFixed(
                      2
                    )}
                  </strong>
                </div>

                <b>
                  {withdrawSource === 'task'
                    ? '✓'
                    : '→'}
                </b>
              </button>

              <button
                className="withdraw-choice"
                onClick={() =>
                  setWithdrawSource(
                    'affiliate'
                  )
                }
              >
                <div className="wallet-symbol affiliate">
                  A
                </div>

                <div>
                  <span>
                    Affiliate Balance
                  </span>

                  <strong>
                    ₦
                    {affiliateBalance.toFixed(
                      2
                    )}
                  </strong>
                </div>

                <b>
                  {withdrawSource ===
                  'affiliate'
                    ? '✓'
                    : '→'}
                </b>
              </button>
            </div>

            <section
              className="dashboard-section"
              style={{
                maxWidth: '650px',
              }}
            >
              <div className="profile-card">
                <div className="wallet-card-header">
                  Withdrawing from
                </div>

                <h2
                  style={{
                    marginTop: '10px',
                  }}
                >
                  {withdrawSource ===
                  'task'
                    ? 'Task Balance'
                    : 'Affiliate Balance'}
                </h2>

                <h3>
                  ₦
                  {selectedBalance.toFixed(
                    2
                  )}
                </h3>

                <form
                  onSubmit={handleWithdraw}
                >
                  <label>
                    Bank Name
                  </label>

                  <input
                    value={bankName}
                    onChange={(e) =>
                      setBankName(
                        e.target.value
                      )
                    }
                    placeholder="Example: Opay"
                  />

                  <label>
                    Account Name
                  </label>

                  <input
                    value={accountName}
                    onChange={(e) =>
                      setAccountName(
                        e.target.value
                      )
                    }
                    placeholder="Account holder name"
                  />

                  <label>
                    Account Number
                  </label>

                  <input
                    inputMode="numeric"
                    maxLength="10"
                    value={accountNumber}
                    onChange={(e) =>
                      setAccountNumber(
                        e.target.value.replace(
                          /\D/g,
                          ''
                        )
                      )
                    }
                    placeholder="10-digit account number"
                  />

                  <label>
                    Amount
                  </label>

                  <input
                    type="number"
                    min="100"
                    value={withdrawAmount}
                    onChange={(e) =>
                      setWithdrawAmount(
                        e.target.value
                      )
                    }
                    placeholder="Minimum ₦100"
                  />

                  <button
                    type="submit"
                    className="primary-button"
                  >
                    Submit Withdrawal
                  </button>
                </form>
              </div>
            </section>
          </>
        )}

        {activeTab === 'History' && (
          <>
            <div className="page-heading">
              <span className="section-label">
                ACTIVITY
              </span>

              <h2>Withdrawal History</h2>

              <p>
                Track your withdrawal requests.
              </p>
            </div>

            {withdrawals.length === 0 ? (
              <div className="empty-card large">
                <strong>
                  No withdrawals yet
                </strong>

                <span>
                  Your withdrawal history will
                  appear here.
                </span>
              </div>
            ) : (
              <div>
                {withdrawals.map(
                  (withdrawal) => (
                    <div
                      className="wallet-card"
                      key={withdrawal.id}
                      style={{
                        marginBottom: '12px',
                      }}
                    >
                      <div className="wallet-card-header">
                        Withdrawal
                      </div>

                      <h3>
                        ₦
                        {Number(
                          withdrawal.amount
                        ).toFixed(2)}
                      </h3>

                      <p>
                        {withdrawal.bank_name}{' '}
                        •{' '}
                        {withdrawal.account_name}
                      </p>

                      <p>
                        Status:{' '}
                        <strong>
                          {
                            withdrawal.status
                          }
                        </strong>
                      </p>
                    </div>
                  )
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'Referrals' && (
          <>
            <div className="page-heading">
              <span className="section-label">
                AFFILIATE PROGRAM
              </span>

              <h2>Refer & Earn</h2>

              <p>
                Invite people and earn from
                successful referrals.
              </p>
            </div>

            <div className="referral-card">
              <span>
                YOUR REFERRAL CODE
              </span>

              <h2>
                {referralCode ||
                  'Generating...'}
              </h2>

              <p>
                Share your referral link with
                people you know.
              </p>

              <input
                value={referralLink}
                readOnly
              />

              <button
                className="primary-button"
                onClick={
                  copyReferralLink
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

                  <h3>
                    {referrals.length}
                  </h3>

                  <p>
                    Successful referrals
                  </p>
                </div>

                <div className="wallet-card">
                  <div className="wallet-card-header">
                    Affiliate Balance
                  </div>

                  <h3>
                    ₦
                    {affiliateBalance.toFixed(
                      2
                    )}
                  </h3>

                  <p>
                    Referral earnings
                  </p>
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === 'Profile' && (
          <>
            <div className="page-heading">
              <span className="section-label">
                ACCOUNT
              </span>

              <h2>My Profile</h2>

              <p>
                Manage your TaskFlow account
                information.
              </p>
            </div>

            <div className="profile-card">
              <div className="large-avatar">
                {(profile?.full_name ||
                  'U')
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <h2>
                {profile?.full_name ||
                  'User'}
              </h2>

              <p>{user.email}</p>

              <form
                onSubmit={saveProfile}
              >
                <label>
                  Full Name
                </label>

                <input
                  value={
                    profile?.full_name ||
                    ''
                  }
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      full_name:
                        e.target.value,
                    })
                  }
                />

                <label>
                  Phone Number
                </label>

                <input
                  value={
                    profile?.phone || ''
                  }
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      phone:
                        e.target.value,
                    })
                  }
                  placeholder="Enter phone number"
                />

                <button
                  type="submit"
                  className="primary-button"
                >
                  Save Profile
                </button>
              </form>
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
            setActiveTab('Dashboard')
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
          onClick={() =>
            setActiveTab('Tasks')
          }
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
            setActiveTab('Withdraw')
          }
        >
          <span>₦</span>
          Withdraw
        </button>

        <button
          className={
            activeTab === 'Profile'
              ? 'active'
              : ''
          }
          onClick={() =>
            setActiveTab('Profile')
          }
        >
          <span>●</span>
          Profile
        </button>
      </nav>

      {/* =========================
          TASK PROOF MODAL
      ========================= */}

      {selectedTask && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background:
              'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 100,
          }}
        >
          <div
            className="profile-card"
            style={{
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div className="section-title-row">
              <div>
                <span className="section-label">
                  TASK
                </span>

                <h3>
                  {selectedTask.title}
                </h3>
              </div>

              <button
                className="icon-button"
                onClick={closeTask}
              >
                ×
              </button>
            </div>

            <p>
              {selectedTask.description}
            </p>

            <div className="wallet-card">
              <span className="section-label">
                REWARD
              </span>

              <h3>
                ₦
                {Number(
                  selectedTask.reward
                ).toFixed(2)}
              </h3>
            </div>

            <form
              onSubmit={submitTaskProof}
            >
              <label>
                Proof of Completion
              </label>

              <textarea
                value={proof}
                onChange={(e) =>
                  setProof(e.target.value)
                }
                placeholder="Enter the proof requested for this task..."
                rows="6"
                style={{
                  width: '100%',
                  border:
                    '1px solid #dfe3ea',
                  borderRadius: '11px',
                  padding: '13px',
                  resize: 'vertical',
                }}
              />

              <p
                style={{
                  color: '#8992a2',
                  fontSize: '12px',
                  lineHeight: 1.5,
                }}
              >
                Your submission will be reviewed
                before the reward is added to
                your balance.
              </p>

              <button
                type="submit"
                className="primary-button"
              >
                Submit Proof
              </button>

              <button
                type="button"
                className="outline-button"
                style={{
                  width: '100%',
                  marginTop: '10px',
                }}
                onClick={closeTask}
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
