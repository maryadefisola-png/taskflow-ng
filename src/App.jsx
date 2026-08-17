import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [tasks, setTasks] = useState([])
  const [withdrawals, setWithdrawals] = useState([])

  const [loading, setLoading] = useState(true)
  const [tasksLoading, setTasksLoading] = useState(false)
  const [withdrawalsLoading, setWithdrawalsLoading] =
    useState(false)

  const [error, setError] = useState('')
  const [activePage, setActivePage] =
    useState('Dashboard')

  // =========================
  // TASK PROOF
  // =========================

  const [selectedTask, setSelectedTask] =
    useState(null)

  const [proof, setProof] = useState('')
  const [submitting, setSubmitting] =
    useState(false)

  // =========================
  // GENERAL MESSAGE
  // =========================

  const [message, setMessage] = useState('')

  // =========================
  // WITHDRAWAL
  // =========================

  const [withdrawalBalanceType, setWithdrawalBalanceType] =
    useState('task')

  const [withdrawAmount, setWithdrawAmount] =
    useState('')

  const [bankName, setBankName] = useState('')
  const [accountName, setAccountName] =
    useState('')
  const [accountNumber, setAccountNumber] =
    useState('')

  const [withdrawing, setWithdrawing] =
    useState(false)

  // =========================
  // AUTH STATE
  // =========================

  useEffect(() => {
    loadAccount()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (user) {
      loadTasks()
      loadWithdrawals()
    }
  }, [user])

  // =========================
  // LOAD ACCOUNT
  // =========================

  const loadAccount = async () => {
    setLoading(true)
    setError('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      setError(userError.message)
      setLoading(false)
      return
    }

    if (!user) {
      setLoading(false)
      return
    }

    setUser(user)

    const {
      data,
      error: profileError,
    } = await supabase
      .from('profiles')
      .select(
        'id, full_name, task_balance, affiliate_balance, is_active'
      )
      .eq('id', user.id)
      .single()

    if (profileError) {
      setError(profileError.message)
    } else {
      setProfile(data)
    }

    setLoading(false)
  }

  // =========================
  // LOAD TASKS
  // =========================

  const loadTasks = async () => {
    setTasksLoading(true)
    setMessage('')

    const {
      data,
      error: tasksError,
    } = await supabase
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
    } else {
      setTasks(data || [])
    }

    setTasksLoading(false)
  }

  // =========================
  // LOAD WITHDRAWALS
  // =========================

  const loadWithdrawals = async () => {
    setWithdrawalsLoading(true)

    const {
      data,
      error: withdrawalError,
    } = await supabase
      .from('withdrawals')
      .select(
        'id, amount, bank_name, account_number, account_name, payment_reference, status, balance_type, created_at'
      )
      .eq('user_id', user.id)
      .order('created_at', {
        ascending: false,
      })

    if (withdrawalError) {
      setMessage(withdrawalError.message)
    } else {
      setWithdrawals(data || [])
    }

    setWithdrawalsLoading(false)
  }

  // =========================
  // SUBMIT TASK PROOF
  // =========================

  const submitProof = async (event) => {
    event.preventDefault()

    if (!selectedTask) return

    const cleanProof = proof.trim()

    if (!cleanProof) {
      setMessage('Please enter your proof.')
      return
    }

    setSubmitting(true)
    setMessage('')

    const {
      error: submissionError,
    } = await supabase
      .from('task_submissions')
      .insert({
        user_id: user.id,
        task_id: selectedTask.id,
        proof: cleanProof,
        status: 'Pending',
        reward: selectedTask.reward,
      })

    if (submissionError) {
      if (
        submissionError.code === '23505'
      ) {
        setMessage(
          'You have already submitted this task.'
        )
      } else {
        setMessage(
          submissionError.message
        )
      }

      setSubmitting(false)
      return
    }

    setMessage(
      'Proof submitted successfully. Your submission is now pending review.'
    )

    setProof('')
    setSelectedTask(null)
    setSubmitting(false)
  }

  // =========================
  // WITHDRAWAL
  // =========================

  const handleWithdrawal = async (event) => {
    event.preventDefault()

    setMessage('')

    const amount = Number(withdrawAmount)

    if (!amount || amount <= 0) {
      setMessage(
        'Please enter a valid withdrawal amount.'
      )
      return
    }

    if (amount < 100) {
      setMessage(
        'Minimum withdrawal amount is ₦100.'
      )
      return
    }

    if (!bankName.trim()) {
      setMessage('Please enter your bank name.')
      return
    }

    if (!accountName.trim()) {
      setMessage(
        'Please enter your account name.'
      )
      return
    }

    if (!/^\d{10}$/.test(accountNumber)) {
      setMessage(
        'Account number must contain exactly 10 digits.'
      )
      return
    }

    const availableBalance =
      withdrawalBalanceType === 'task'
        ? Number(profile?.task_balance ?? 0)
        : Number(
            profile?.affiliate_balance ?? 0
          )

    if (amount > availableBalance) {
      setMessage(
        'Insufficient balance in the selected wallet.'
      )
      return
    }

    setWithdrawing(true)

    const {
      data,
      error: withdrawalError,
    } = await supabase.rpc(
      'request_withdrawal',
      {
        p_balance_type:
          withdrawalBalanceType,

        p_amount: amount,

        p_bank_name:
          bankName.trim(),

        p_account_name:
          accountName.trim(),

        p_account_number:
          accountNumber,
      }
    )

    if (withdrawalError) {
      setMessage(
        withdrawalError.message
      )
      setWithdrawing(false)
      return
    }

    if (!data) {
      setMessage(
        'Withdrawal request could not be created.'
      )
      setWithdrawing(false)
      return
    }

    setMessage(
      'Withdrawal request submitted successfully. It is now pending review.'
    )

    setWithdrawAmount('')
    setBankName('')
    setAccountName('')
    setAccountNumber('')

    await loadAccount()
    await loadWithdrawals()

    setWithdrawing(false)
  }

  // =========================
  // LOGOUT
  // =========================

  const handleLogout = async () => {
    await supabase.auth.signOut()

    setUser(null)
    setProfile(null)
    setActivePage('Dashboard')
  }

  // =========================
  // FORMAT MONEY
  // =========================

  const formatMoney = (value) => {
    return Number(value || 0).toLocaleString(
      'en-NG',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )
  }

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loading-content">
          <div className="tf-logo">
            TF
          </div>

          <h2>TaskFlow NG</h2>

          <p>
            Loading your account...
          </p>
        </div>
      </div>
    )
  }

  // =========================
  // NOT LOGGED IN
  // =========================

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

              <p>
                Tasks. Rewards. Growth.
              </p>
            </div>
          </div>

          <div className="auth-heading">
            <h2>
              Welcome to TaskFlow NG
            </h2>

            <p>
              Please log in to access your dashboard.
            </p>
          </div>

        </div>
      </div>
    )
  }

  // =========================
  // ERROR
  // =========================

  if (error) {
    return (
      <div className="loading-page">
        <div className="loading-content">

          <div className="tf-logo">
            TF
          </div>

          <h2>
            Something went wrong
          </h2>

          <p>{error}</p>

        </div>
      </div>
    )
  }

  // =========================
  // BALANCES
  // =========================

  const taskBalance = Number(
    profile?.task_balance ?? 0
  )

  const affiliateBalance = Number(
    profile?.affiliate_balance ?? 0
  )

  const totalBalance =
    taskBalance + affiliateBalance

  const selectedBalance =
    withdrawalBalanceType === 'task'
      ? taskBalance
      : affiliateBalance

  const fullName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    'TaskFlow User'

  // =========================
  // APP
  // =========================

  return (
    <div className="app">

      {/* =========================
          TOPBAR
      ========================= */}

      <header className="topbar">

        <div className="topbar-left">

          <div className="tf-logo small">
            TF
          </div>

          <div>
            <h1>
              TaskFlow NG
            </h1>

            <span>
              Rewards Dashboard
            </span>
          </div>

        </div>

        <div className="topbar-right">

          <button
            className="profile-button"
            onClick={() =>
              setActivePage('Profile')
            }
          >

            <div className="avatar">
              {fullName
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="profile-button-text">

              <strong>
                {fullName}
              </strong>

              <span>
                {user.email}
              </span>

            </div>

          </button>

        </div>

      </header>

      {/* =========================
          MAIN
      ========================= */}

      <main className="dashboard-container">

        {/* =========================
            DASHBOARD
        ========================= */}

        {activePage === 'Dashboard' && (
          <>

            <div className="dashboard-heading">

              <div>

                <span className="section-label">
                  OVERVIEW
                </span>

                <h2>
                  Welcome back,{' '}
                  {fullName.split(' ')[0]} 👋
                </h2>

                <p>
                  Here's an overview of your
                  TaskFlow NG earnings.
                </p>

              </div>

            </div>

            {/* TOTAL BALANCE */}

            <div className="balance-overview">

              <div className="balance-overview-content">

                <span>
                  TOTAL BALANCE
                </span>

                <h2>
                  ₦{formatMoney(totalBalance)}
                </h2>

                <p>
                  Your combined Task and
                  Affiliate balance
                </p>

              </div>

              <div className="balance-mark">
                ₦
              </div>

            </div>

            {/* WALLETS */}

            <div className="wallet-grid">

              <div className="wallet-card">

                <div className="wallet-card-header">

                  <div className="wallet-symbol task">
                    T
                  </div>

                  Task Balance

                </div>

                <h3>
                  ₦{formatMoney(taskBalance)}
                </h3>

                <p>
                  Earned from completed tasks
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
                  ₦{formatMoney(
                    affiliateBalance
                  )}
                </h3>

                <p>
                  Earned from referrals
                </p>

              </div>

            </div>

            {/* QUICK ACTIONS */}

            <section className="dashboard-section">

              <div className="section-title-row">

                <h3>
                  Quick Actions
                </h3>

              </div>

              <div className="action-grid">

                <button
                  className="action-card"
                  onClick={() =>
                    setActivePage('Tasks')
                  }
                >

                  <div className="action-icon">
                    T
                  </div>

                  <div>

                    <strong>
                      Complete Tasks
                    </strong>

                    <span>
                      Earn money by completing
                      available tasks.
                    </span>

                  </div>

                  <b>
                    →
                  </b>

                </button>

                <button
                  className="action-card"
                  onClick={() =>
                    setActivePage('Wallet')
                  }
                >

                  <div className="action-icon">
                    W
                  </div>

                  <div>

                    <strong>
                      Withdraw
                    </strong>

                    <span>
                      Withdraw from your
                      available balance.
                    </span>

                  </div>

                  <b>
                    →
                  </b>

                </button>

                <button
                  className="action-card"
                  onClick={() =>
                    setActivePage('Referrals')
                  }
                >

                  <div className="action-icon">
                    R
                  </div>

                  <div>

                    <strong>
                      Refer & Earn
                    </strong>

                    <span>
                      Invite people and earn
                      affiliate rewards.
                    </span>

                  </div>

                  <b>
                    →
                  </b>

                </button>

              </div>

            </section>

          </>
        )}

        {/* =========================
            TASKS
        ========================= */}

        {activePage === 'Tasks' && (
          <>

            <div className="page-heading">

              <span className="section-label">
                EARN
              </span>

              <h2>
                Available Tasks
              </h2>

              <p>
                Complete tasks and submit
                proof for review.
              </p>

            </div>

            {message && (
              <div className="form-message">
                {message}
              </div>
            )}

            {tasksLoading ? (

              <div className="empty-card large">

                <strong>
                  Loading tasks...
                </strong>

                <span>
                  Getting available tasks
                  from TaskFlow NG.
                </span>

              </div>

            ) : tasks.length === 0 ? (

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
                        {task.task_type ||
                          'Task'}
                      </span>

                    </div>

                    <h3>
                      {task.title}
                    </h3>

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
                          {formatMoney(
                            task.reward
                          )}
                        </strong>

                      </div>

                      <button
                        className="primary-button small-button"
                        onClick={() =>
                          setSelectedTask(task)
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
        )}

        {/* =========================
            WALLET
        ========================= */}

        {activePage === 'Wallet' && (
          <>

            <div className="page-heading">

              <span className="section-label">
                WALLET
              </span>

              <h2>
                Withdraw Funds
              </h2>

              <p>
                Choose which balance you want
                to withdraw from.
              </p>

            </div>

            {message && (
              <div className="form-message">
                {message}
              </div>
            )}

            {/* BALANCE CHOICE */}

            <div className="withdraw-choice-grid">

              <button
                className="withdraw-choice"
                style={{
                  borderColor:
                    withdrawalBalanceType ===
                    'task'
                      ? '#173f8a'
                      : '',
                  boxShadow:
                    withdrawalBalanceType ===
                    'task'
                      ? '0 0 0 3px rgba(23,63,138,0.08)'
                      : '',
                }}
                onClick={() =>
                  setWithdrawalBalanceType(
                    'task'
                  )
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
                    ₦{formatMoney(taskBalance)}
                  </strong>

                </div>

                <b>
                  {withdrawalBalanceType ===
                  'task'
                    ? '✓'
                    : '→'}
                </b>

              </button>

              <button
                className="withdraw-choice"
                style={{
                  borderColor:
                    withdrawalBalanceType ===
                    'affiliate'
                      ? '#17734d'
                      : '',
                  boxShadow:
                    withdrawalBalanceType ===
                    'affiliate'
                      ? '0 0 0 3px rgba(23,115,77,0.08)'
                      : '',
                }}
                onClick={() =>
                  setWithdrawalBalanceType(
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
                    {formatMoney(
                      affiliateBalance
                    )}
                  </strong>

                </div>

                <b>
                  {withdrawalBalanceType ===
                  'affiliate'
                    ? '✓'
                    : '→'}
                </b>

              </button>

            </div>

            {/* WITHDRAW FORM */}

            <section
              className="dashboard-section"
            >

              <div className="withdraw-card">

                <div className="section-title-row">

                  <div>

                    <span className="section-label">
                      SELECTED WALLET
                    </span>

                    <h3>
                      {withdrawalBalanceType ===
                      'task'
                        ? 'Task Balance'
                        : 'Affiliate Balance'}
                    </h3>

                  </div>

                  <strong>
                    ₦
                    {formatMoney(
                      selectedBalance
                    )}
                  </strong>

                </div>

                <form
                  onSubmit={handleWithdrawal}
                >

                  <label>
                    Bank Name
                  </label>

                  <input
                    type="text"
                    placeholder="Enter your bank name"
                    value={bankName}
                    onChange={(e) =>
                      setBankName(
                        e.target.value
                      )
                    }
                  />

                  <label>
                    Account Name
                  </label>

                  <input
                    type="text"
                    placeholder="Enter account name"
                    value={accountName}
                    onChange={(e) =>
                      setAccountName(
                        e.target.value
                      )
                    }
                  />

                  <label>
                    Account Number
                  </label>

                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength="10"
                    placeholder="10-digit account number"
                    value={accountNumber}
                    onChange={(e) =>
                      setAccountNumber(
                        e.target.value.replace(
                          /\D/g,
                          ''
                        )
                      )
                    }
                  />

                  <label>
                    Withdrawal Amount
                  </label>

                  <input
                    type="number"
                    min="100"
                    step="0.01"
                    placeholder="Minimum ₦100"
                    value={withdrawAmount}
                    onChange={(e) =>
                      setWithdrawAmount(
                        e.target.value
                      )
                    }
                  />

                  <button
                    type="submit"
                    className="primary-button"
                    disabled={withdrawing}
                  >
                    {withdrawing
                      ? 'Submitting...'
                      : 'Submit Withdrawal'}
                  </button>

                </form>

              </div>

            </section>

            {/* HISTORY */}

            <section
              className="dashboard-section"
            >

              <div className="section-title-row">

                <h3>
                  Withdrawal History
                </h3>

              </div>

              {withdrawalsLoading ? (

                <div className="empty-card">
                  <strong>
                    Loading history...
                  </strong>
                </div>

              ) : withdrawals.length === 0 ? (

                <div className="empty-card">
                  <strong>
                    No withdrawals yet
                  </strong>

                  <span>
                    Your withdrawal requests
                    will appear here.
                  </span>
                </div>

              ) : (

                <div className="mini-task-list">

                  {withdrawals.map(
                    (withdrawal) => (

                      <div
                        className="mini-task"
                        key={withdrawal.id}
                      >

                        <div className="mini-task-icon">
                          ₦
                        </div>

                        <div className="mini-task-info">

                          <strong>
                            ₦
                            {formatMoney(
                              withdrawal.amount
                            )}
                          </strong>

                          <span>
                            {withdrawal.balance_type ===
                            'affiliate'
                              ? 'Affiliate Balance'
                              : 'Task Balance'}{' '}
                            •{' '}
                            {new Date(
                              withdrawal.created_at
                            ).toLocaleDateString(
                              'en-NG'
                            )}
                          </span>

                        </div>

                        <strong>
                          {withdrawal.status}
                        </strong>

                      </div>

                    )
                  )}

                </div>

              )}

            </section>

          </>
        )}

        {/* =========================
            REFERRALS
        ========================= */}

        {activePage === 'Referrals' && (
          <>

            <div className="page-heading">

              <span className="section-label">
                GROW
              </span>

              <h2>
                Refer & Earn
              </h2>

              <p>
                Invite people and earn
                affiliate rewards.
              </p>

            </div>

            <div className="referral-card">

              <span>
                YOUR REFERRAL PROGRAM
              </span>

              <h2>
                Coming Soon
              </h2>

              <p>
                Your referral system will be
                connected to your unique referral
                code and affiliate rewards.
              </p>

            </div>

          </>
        )}

        {/* =========================
            PROFILE
        ========================= */}

        {activePage === 'Profile' && (
          <>

            <div className="page-heading">

              <span className="section-label">
                ACCOUNT
              </span>

              <h2>
                My Profile
              </h2>

              <p>
                Manage your TaskFlow NG account.
              </p>

            </div>

            <div className="profile-card">

              <div className="large-avatar">
                {fullName
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <h2>
                {fullName}
              </h2>

              <p>
                {user.email}
              </p>

              <div className="profile-details">

                <div>
                  <span>
                    Full Name
                  </span>

                  <strong>
                    {fullName}
                  </strong>
                </div>

                <div>
                  <span>
                    Email
                  </span>

                  <strong>
                    {user.email}
                  </strong>
                </div>

                <div>
                  <span>
                    Task Balance
                  </span>

                  <strong>
                    ₦{formatMoney(taskBalance)}
                  </strong>
                </div>

                <div>
                  <span>
                    Affiliate Balance
                  </span>

                  <strong>
                    ₦
                    {formatMoney(
                      affiliateBalance
                    )}
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
            TASK PROOF MODAL
        ========================= */}

        {selectedTask && (

          <div
            className="auth-page"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
              background:
                'rgba(23, 32, 51, 0.45)',
            }}
          >

            <div className="auth-card">

              <div className="auth-heading">

                <h2>
                  Submit Proof
                </h2>

                <p>
                  {selectedTask.title}
                </p>

              </div>

              <form
                onSubmit={submitProof}
              >

                <label>
                  Proof of Completion
                </label>

                <textarea
                  value={proof}
                  onChange={(e) =>
                    setProof(
                      e.target.value
                    )
                  }
                  placeholder="Describe what you completed or paste your proof link here..."
                  rows="6"
                  style={{
                    width: '100%',
                    border:
                      '1px solid #dfe3ea',
                    borderRadius: '11px',
                    padding: '13px 14px',
                    resize: 'vertical',
                    outline: 'none',
                    font: 'inherit',
                  }}
                />

                <button
                  type="submit"
                  className="primary-button"
                  disabled={submitting}
                >
                  {submitting
                    ? 'Submitting...'
                    : 'Submit for Review'}
                </button>

                <button
                  type="button"
                  className="outline-button"
                  style={{
                    width: '100%',
                    marginTop: '10px',
                  }}
                  onClick={() => {
                    setSelectedTask(null)
                    setProof('')
                  }}
                >
                  Cancel
                </button>

              </form>

            </div>

          </div>

        )}

        {/* =========================
            MOBILE NAV
        ========================= */}

        <nav className="bottom-nav">

          <button
            className={
              activePage === 'Dashboard'
                ? 'active'
                : ''
            }
            onClick={() =>
              setActivePage('Dashboard')
            }
          >
            <span>
              ⌂
            </span>

            Home
          </button>

          <button
            className={
              activePage === 'Tasks'
                ? 'active'
                : ''
            }
            onClick={() =>
              setActivePage('Tasks')
            }
          >
            <span>
              ✓
            </span>

            Tasks
          </button>

          <button
            className={
              activePage === 'Wallet'
                ? 'active'
                : ''
            }
            onClick={() =>
              setActivePage('Wallet')
            }
          >
            <span>
              ₦
            </span>

            Wallet
          </button>

          <button
            className={
              activePage === 'Profile'
                ? 'active'
                : ''
            }
            onClick={() =>
              setActivePage('Profile')
            }
          >
            <span>
              ☰
            </span>

            More
          </button>

        </nav>

      </main>

    </div>
  )
}

export default App
