import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import './App.css'

const DEPOSIT_MINIMUM = 1000
const WITHDRAWAL_MINIMUM = 1000
const REFERRAL_CODE = 'TASKFLOW2026'

function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [tasksLoading, setTasksLoading] = useState(false)
  const [error, setError] = useState('')
  const [activePage, setActivePage] = useState('Dashboard')
  const [menuOpen, setMenuOpen] = useState(false)

  // Auth
  const [authMode, setAuthMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [authError, setAuthError] = useState('')

  // Global messages
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')

  // Deposit
  const [depositAmount, setDepositAmount] = useState('')
  const [depositLoading, setDepositLoading] = useState(false)

  // Withdrawal
  const [withdrawalBalanceType, setWithdrawalBalanceType] =
    useState('task')
  const [withdrawalAmount, setWithdrawalAmount] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountName, setAccountName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [withdrawalLoading, setWithdrawalLoading] = useState(false)
  const [withdrawalHistory, setWithdrawalHistory] = useState([])

  // Tasks
  const [selectedTask, setSelectedTask] = useState(null)
  const [proof, setProof] = useState('')
  const [proofFile, setProofFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // --------------------------------------------------
  // INITIAL ACCOUNT LOAD
  // --------------------------------------------------

  useEffect(() => {
    loadAccount()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null

      setUser(currentUser)

      if (currentUser) {
        await loadProfile(currentUser)
        await loadTasks()
        loadWithdrawalHistory(currentUser.id)
      } else {
        setProfile(null)
        setTasks([])
        setWithdrawalHistory([])
      }

      setLoading(false)
    })

    return () => subscription.unsubscribe()
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
      loadWithdrawalHistory(currentUser.id)

      // Check whether the user has just returned from Paystack.
      await verifyReturnedPayment()
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
      setError(profileError.message)
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
      .order('created_at', { ascending: false })

    if (tasksError) {
      console.error('Tasks error:', tasksError.message)
      showMessage(tasksError.message, 'error')
    } else {
      setTasks(data || [])
    }

    setTasksLoading(false)
  }

  // --------------------------------------------------
  // PAYSTACK PAYMENT VERIFICATION
  // --------------------------------------------------

  const verifyReturnedPayment = async () => {
    const params = new URLSearchParams(
      window.location.search
    )

    // Paystack normally returns "reference".
    // trxref is supported as a fallback.
    const reference =
      params.get('reference') ||
      params.get('trxref')

    if (!reference) {
      return
    }

    showMessage(
      'Verifying your payment...',
      'success'
    )

    try {
      const {
        data,
        error: verifyError,
      } = await supabase.functions.invoke(
        'verify-payment',
        {
          body: {
            reference,
          },
        }
      )

      if (verifyError) {
        throw new Error(
          verifyError.message
        )
      }

      if (!data?.status) {
        throw new Error(
          data?.message ||
            'Payment verification failed.'
        )
      }

      // Refresh profile so the newly credited
      // Task Balance appears immediately.
      const {
        data: {
          user: currentUser,
        },
      } = await supabase.auth.getUser()

      if (currentUser) {
        await loadProfile(currentUser)
      }

      if (data.already_processed) {
        showMessage(
          'This payment has already been credited.',
          'success'
        )
      } else {
        showMessage(
          `Payment successful! ${formatMoney(
            data.amount
          )} has been added to your Task Balance.`,
          'success'
        )
      }

      // Remove Paystack parameters from the URL
      // after verification.
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      )
    } catch (err) {
      console.error(
        'Payment verification error:',
        err
      )

      showMessage(
        err?.message ||
          'We could not verify your payment. Please contact support if money was deducted.',
        'error'
      )
    }
  }

  // --------------------------------------------------
  // AUTH
  // --------------------------------------------------

  const handleAuth = async (event) => {
    event.preventDefault()

    setAuthLoading(true)
    setAuthError('')
    setAuthMessage('')

    const cleanEmail = email.trim().toLowerCase()

    if (!cleanEmail || !password) {
      setAuthError(
        'Please enter your email and password.'
      )
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
          setAuthMessage(
            'Account created successfully.'
          )
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
    setWithdrawalHistory([])
    setActivePage('Dashboard')
    setMenuOpen(false)
  }

  // --------------------------------------------------
  // DEPOSIT
  // --------------------------------------------------

  const initializeDeposit = async () => {
    if (!user) return

    const amount = Number(depositAmount)

    if (
      !Number.isFinite(amount) ||
      amount < DEPOSIT_MINIMUM
    ) {
      showMessage(
        'Minimum deposit is ₦1,000.',
        'error'
      )
      return
    }

    setDepositLoading(true)
    setMessage('')

    try {
      const {
        data,
        error: functionError,
      } =
        await supabase.functions.invoke(
          'initialize-payment',
          {
            body: {
              email: user.email,
              amount,
            },
          }
        )

      if (functionError) {
        throw new Error(
          functionError.message
        )
      }

      if (
        !data?.status ||
        !data?.data?.authorization_url
      ) {
        throw new Error(
          data?.message ||
            'Unable to initialize payment.'
        )
      }

      window.location.href =
        data.data.authorization_url
    } catch (err) {
      console.error(
        'Deposit error:',
        err
      )

      showMessage(
        err?.message ||
          'Unable to start the deposit. Please try again.',
        'error'
      )
    } finally {
      setDepositLoading(false)
    }
  }

  // --------------------------------------------------
  // WITHDRAWAL HISTORY
  // --------------------------------------------------

  const withdrawalStorageKey = (userId) =>
    `taskflow_test_withdrawals_${userId}`

  const loadWithdrawalHistory = (userId) => {
    try {
      const saved = localStorage.getItem(
        withdrawalStorageKey(userId)
      )

      if (!saved) {
        setWithdrawalHistory([])
        return
      }

      const parsed = JSON.parse(saved)

      setWithdrawalHistory(
        Array.isArray(parsed) ? parsed : []
      )
    } catch (err) {
      console.error(
        'Withdrawal history error:',
        err
      )
      setWithdrawalHistory([])
    }
  }

  const saveWithdrawalHistory = (
    userId,
    history
  ) => {
    localStorage.setItem(
      withdrawalStorageKey(userId),
      JSON.stringify(history)
    )

    setWithdrawalHistory(history)
  }

  const generateWithdrawalReference = () => {
    const random = Math.random()
      .toString(36)
      .substring(2, 9)
      .toUpperCase()

    return `TFW-TEST-${Date.now()}-${random}`
  }

  // --------------------------------------------------
  // TEST WITHDRAWAL
  // --------------------------------------------------

  const submitTestWithdrawal = async (event) => {
    event.preventDefault()

    if (!user) {
      showMessage(
        'Please log in before requesting a withdrawal.',
        'error'
      )
      return
    }

    const amount = Number(withdrawalAmount)

    const selectedBalance =
      withdrawalBalanceType === 'task'
        ? Number(profile?.task_balance ?? 0)
        : Number(
            profile?.affiliate_balance ?? 0
          )

    const cleanBankName =
      bankName.trim()

    const cleanAccountName =
      accountName.trim()

    const cleanAccountNumber =
      accountNumber.trim()

    if (
      !Number.isFinite(amount) ||
      amount < WITHDRAWAL_MINIMUM
    ) {
      showMessage(
        'Minimum withdrawal is ₦1,000.',
        'error'
      )
      return
    }

    if (amount > selectedBalance) {
      showMessage(
        `Insufficient ${
          withdrawalBalanceType === 'task'
            ? 'Task'
            : 'Affiliate'
        } Balance.`,
        'error'
      )
      return
    }

    if (!cleanBankName) {
      showMessage(
        'Please enter the bank name.',
        'error'
      )
      return
    }

    if (!cleanAccountName) {
      showMessage(
        'Please enter the account name.',
        'error'
      )
      return
    }

    if (
      !/^\d{10}$/.test(
        cleanAccountNumber
      )
    ) {
      showMessage(
        'Account number must contain exactly 10 digits.',
        'error'
      )
      return
    }

    setWithdrawalLoading(true)

    try {
      const reference =
        generateWithdrawalReference()

      const newWithdrawal = {
        id: crypto?.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}`,
        user_id: user.id,
        amount,
        bank_name: cleanBankName,
        account_name: cleanAccountName,
        account_number:
          cleanAccountNumber,
        payment_reference:
          reference,
        status: 'pending',
        balance_type:
          withdrawalBalanceType,
        created_at:
          new Date().toISOString(),
        test_mode: true,
      }

      const updatedHistory = [
        newWithdrawal,
        ...withdrawalHistory,
      ]

      saveWithdrawalHistory(
        user.id,
        updatedHistory
      )

      setWithdrawalAmount('')
      setBankName('')
      setAccountName('')
      setAccountNumber('')

      showMessage(
        `Withdrawal request created successfully. Reference: ${reference}`,
        'success'
      )
    } catch (err) {
      console.error(
        'Withdrawal error:',
        err
      )

      showMessage(
        'Unable to create the withdrawal request.',
        'error'
      )
    } finally {
      setWithdrawalLoading(false)
    }
  }

  // --------------------------------------------------
  // TASK SUBMISSION
  // --------------------------------------------------

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
    const file =
      event.target.files?.[0]

    if (!file) {
      setProofFile(null)
      return
    }

    if (
      !file.type.startsWith(
        'image/'
      )
    ) {
      showMessage(
        'Please select an image screenshot.',
        'error'
      )
      event.target.value = ''
      setProofFile(null)
      return
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      showMessage(
        'Screenshot must be smaller than 5MB.',
        'error'
      )
      event.target.value = ''
      setProofFile(null)
      return
    }

    setMessage('')
    setProofFile(file)
  }

  const submitProof = async (event) => {
    event.preventDefault()

    if (!selectedTask || !user) return

    const cleanProof =
      proof.trim()

    if (
      !cleanProof &&
      !proofFile
    ) {
      showMessage(
        'Please enter proof or upload a screenshot before submitting.',
        'error'
      )
      return
    }

    setSubmitting(true)
    setMessage('')

    let uploadedFilePath = null
    let screenshotUrl = null

    try {
      if (proofFile) {
        const fileExtension =
          proofFile.name
            .split('.')
            .pop()
            ?.toLowerCase() ||
          'jpg'

        const safeFileName =
          `${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 10)}.${fileExtension}`

        const filePath =
          `${user.id}/${safeFileName}`

        const {
          error: uploadError,
        } =
          await supabase.storage
            .from('task-proofs')
            .upload(
              filePath,
              proofFile,
              {
                cacheControl:
                  '3600',
                upsert: false,
                contentType:
                  proofFile.type,
              }
            )

        if (uploadError) {
          throw new Error(
            `Screenshot upload failed: ${uploadError.message}`
          )
        }

        uploadedFilePath =
          filePath

        const {
          data: publicUrlData,
        } =
          supabase.storage
            .from(
              'task-proofs'
            )
            .getPublicUrl(
              filePath
            )

        screenshotUrl =
          publicUrlData?.publicUrl ||
          null
      }

      let finalProof =
        cleanProof

      if (screenshotUrl) {
        finalProof += finalProof
          ? `\n\nScreenshot:\n${screenshotUrl}`
          : `Screenshot:\n${screenshotUrl}`
      }

      const {
        error: submissionError,
      } =
        await supabase
          .from(
            'task_submissions'
          )
          .insert({
            user_id: user.id,
            task_id:
              selectedTask.id,
            proof: finalProof,
            status: 'Pending',
            reward: Number(
              selectedTask.reward
            ),
          })

      if (submissionError) {
        if (uploadedFilePath) {
          await supabase.storage
            .from(
              'task-proofs'
            )
            .remove([
              uploadedFilePath,
            ])
        }

        if (
          submissionError.code ===
          '23505'
        ) {
          throw new Error(
            'You have already submitted this task.'
          )
        }

        throw new Error(
          `Submission failed: ${submissionError.message}`
        )
      }

      const title =
        selectedTask.title

      closeTaskSubmission()

      showMessage(
        `Success! Your proof for "${title}" has been submitted and is waiting for review.`,
        'success'
      )

      await loadTasks()
    } catch (err) {
      console.error(
        'Task submission error:',
        err
      )

      if (uploadedFilePath) {
        await supabase.storage
          .from(
            'task-proofs'
          )
          .remove([
            uploadedFilePath,
          ])
      }

      showMessage(
        err?.message ||
          'Something went wrong while submitting your proof.',
        'error'
      )
    } finally {
      setSubmitting(false)
    }
  }

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  const showMessage = (
    text,
    type = 'success'
  ) => {
    setMessage(text)
    setMessageType(type)
  }

  const formatMoney = (
    amount
  ) =>
    `₦${Number(
      amount || 0
    ).toLocaleString(
      'en-NG'
    )}`

  const formatDate = (
    date
  ) => {
    if (!date) return '-'

    return new Date(
      date
    ).toLocaleString(
      'en-NG',
      {
        dateStyle:
          'medium',
        timeStyle:
          'short',
      }
    )
  }

  const getInitials = (
    name
  ) =>
    name
      ?.split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(
        (word) =>
          word[0]?.toUpperCase()
      )
      .join('') ||
    'TF'

  const goTo = (
    page
  ) => {
    setActivePage(page)
    setMenuOpen(false)
    setMessage('')

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loading-content">
          <div className="tf-logo">
            TF
          </div>

          <h2>
            TaskFlow NG
          </h2>

          <p>
            Loading your account...
          </p>
        </div>
      </div>
    )
  }

  // --------------------------------------------------
  // AUTH SCREEN
  // --------------------------------------------------

  if (!user) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">
            <div className="tf-logo">
              TF
            </div>

            <div>
              <h1>
                TaskFlow NG
              </h1>

              <p>
                Tasks. Rewards. Growth.
              </p>
            </div>
          </div>

          <div className="auth-heading">
            <span className="section-label">
              {authMode === 'login'
                ? 'WELCOME BACK'
                : 'GET STARTED'}
            </span>

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

          <form
            onSubmit={handleAuth}
          >
            {authMode === 'signup' && (
              <div className="form-group">
                <label>
                  Full Name
                </label>

                <input
                  type="text"
                  value={fullName}
                  onChange={(e) =>
                    setFullName(
                      e.target.value
                    )
                  }
                  placeholder="Enter your full name"
                  autoComplete="name"
                  disabled={
                    authLoading
                  }
                />
              </div>
            )}

            <div className="form-group">
              <label>
                Email Address
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value
                  )
                }
                placeholder="Enter your email"
                autoComplete="email"
                disabled={
                  authLoading
                }
                required
              />
            </div>

            <div className="form-group">
              <label>
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                placeholder="Enter your password"
                autoComplete={
                  authMode ===
                  'login'
                    ? 'current-password'
                    : 'new-password'
                }
                disabled={
                  authLoading
                }
                required
              />
            </div>

            <button
              type="submit"
              className="primary-button"
              disabled={
                authLoading
              }
            >
              {authLoading
                ? 'Please wait...'
                : authMode ===
                  'login'
                ? 'Log In'
                : 'Create Account'}
            </button>
          </form>

          <div className="auth-switch">
            <p>
              {authMode ===
              'login'
                ? "Don't have an account?"
                : 'Already have an account?'}
            </p>

            <button
              type="button"
              className="outline-button"
              onClick={() => {
                setAuthMode(
                  authMode ===
                    'login'
                    ? 'signup'
                    : 'login'
                )
                setAuthError('')
                setAuthMessage('')
              }}
              disabled={
                authLoading
              }
            >
              {authMode ===
              'login'
                ? 'Create an Account'
                : 'Back to Login'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --------------------------------------------------
  // PROFILE DATA
  // --------------------------------------------------

  if (
    error &&
    !profile
  ) {
    return (
      <div className="loading-page">
        <div className="loading-content">
          <div className="tf-logo">
            TF
          </div>

          <h2>
            Something went wrong
          </h2>

          <p>
            {error}
          </p>

          <button
            className="primary-button"
            onClick={() =>
              window.location.reload()
            }
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const taskBalance =
    Number(
      profile?.task_balance ??
        0
    )

  const affiliateBalance =
    Number(
      profile?.affiliate_balance ??
        0
    )

  const totalBalance =
    taskBalance +
    affiliateBalance

  const displayName =
    profile?.full_name ||
    user.user_metadata
      ?.full_name ||
    'TaskFlow User'

  const firstName =
    displayName.split(' ')[0]

  const initials =
    getInitials(
      displayName
    )

  // --------------------------------------------------
  // DASHBOARD
  // --------------------------------------------------

  const dashboardPage = (
    <>
      <div className="dashboard-heading">
        <div>
          <span className="section-label">
            DASHBOARD
          </span>

          <h2>
            Welcome, {firstName}
          </h2>

          <p>
            Manage your tasks, rewards and earnings.
          </p>
        </div>

        <button
          className="outline-button desktop-only"
          onClick={() =>
            goTo('Tasks')
          }
        >
          View Tasks
        </button>
      </div>

      <div className="balance-overview">
        <div className="balance-overview-content">
          <span>
            TOTAL BALANCE
          </span>

          <h2>
            {formatMoney(
              totalBalance
            )}
          </h2>

          <p>
            Your combined Task and Affiliate balance
          </p>
        </div>

        <div className="balance-mark">
          ₦
        </div>
      </div>

      <div className="wallet-grid">
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
            Rewards earned from completed tasks
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
            Earnings from your referrals
          </p>
        </div>
      </div>

      <div className="dashboard-section">
        <div className="section-title-row">
          <h3>
            Quick Actions
          </h3>
        </div>

        <div className="action-grid">
          <button
            className="action-card"
            onClick={() =>
              goTo('Tasks')
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
                Earn rewards by completing available
                tasks.
              </span>
            </div>

            <b>›</b>
          </button>

          <button
            className="action-card"
            onClick={() =>
              goTo('Referral')
            }
          >
            <div className="action-icon">
              R
            </div>

            <div>
              <strong>
                Refer Friends
              </strong>

              <span>
                Invite people and grow your affiliate
                earnings.
              </span>
            </div>

            <b>›</b>
          </button>

          <button
            className="action-card"
            onClick={() =>
              goTo('Deposit')
            }
          >
            <div className="action-icon">
              ₦
            </div>

            <div>
              <strong>
                Deposit
              </strong>

              <span>
                Add funds securely to your account.
              </span>
            </div>

            <b>›</b>
          </button>

          <button
            className="action-card"
            onClick={() =>
              goTo('Withdraw')
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
                Request a withdrawal from your balance.
              </span>
            </div>

            <b>›</b>
          </button>
        </div>
      </div>

      <div className="dashboard-section">
        <div className="section-title-row">
          <h3>
            Available Tasks
          </h3>

          <button
            className="text-button"
            onClick={() =>
              goTo('Tasks')
            }
          >
            View all
          </button>
        </div>

        {tasksLoading ? (
          <div className="empty-card">
            <strong>
              Loading tasks...
            </strong>

            <span>
              Please wait while we load available
              tasks.
            </span>
          </div>
        ) : tasks.length === 0 ? (
          <div className="empty-card">
            <strong>
              No tasks available
            </strong>

            <span>
              New tasks will appear here when they
              are published.
            </span>
          </div>
        ) : (
          <div className="mini-task-list">
            {tasks
              .slice(0, 3)
              .map(
                (
                  task,
                  index
                ) => (
                  <button
                    key={
                      task.id
                    }
                    className="mini-task"
                    onClick={() =>
                      openTaskSubmission(
                        task
                      )
                    }
                  >
                    <div className="mini-task-icon">
                      {index +
                        1}
                    </div>

                    <div className="mini-task-info">
                      <strong>
                        {
                          task.title
                        }
                      </strong>

                      <span>
                        {task.description ||
                          'Complete this task and submit your proof.'}
                      </span>
                    </div>

                    <strong>
                      {formatMoney(
                        task.reward
                      )}
                    </strong>
                  </button>
                )
              )}
          </div>
        )}
      </div>
    </>
  )

  // --------------------------------------------------
  // TASKS PAGE
  // --------------------------------------------------

  const tasksPage = (
    <>
      <div className="page-heading">
        <span className="section-label">
          TASK CENTER
        </span>

        <h2>
          Available Tasks
        </h2>

        <p>
          Complete tasks and submit proof to earn
          rewards.
        </p>
      </div>

      {message && (
        <div
          className={
            messageType ===
            'error'
              ? 'form-error'
              : 'form-message'
          }
        >
          {message}
        </div>
      )}

      {tasksLoading ? (
        <div className="empty-card large">
          <strong>
            Loading tasks...
          </strong>

          <span>
            Please wait while we load available
            tasks.
          </span>
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty-card large">
          <strong>
            No tasks available
          </strong>

          <span>
            Check back later for new earning
            opportunities.
          </span>
        </div>
      ) : (
        <div className="task-list">
          {tasks.map(
            (
              task,
              index
            ) => (
              <div
                className="real-task-card"
                key={
                  task.id
                }
              >
                <div className="task-card-heading">
                  <div className="task-number">
                    {index +
                      1}
                  </div>

                  <span>
                    {task.task_type ||
                      'TASK'}
                  </span>
                </div>

                <h3>
                  {task.title}
                </h3>

                <p>
                  {task.description ||
                    'Complete this task and submit your proof for review.'}
                </p>

                <div className="task-card-bottom">
                  <div>
                    <small>
                      REWARD
                    </small>

                    <strong>
                      {formatMoney(
                        task.reward
                      )}
                    </strong>
                  </div>

                  <button
                    className="primary-button small-button"
                    onClick={() =>
                      openTaskSubmission(
                        task
                      )
                    }
                  >
                    Submit Proof
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </>
  )

  // --------------------------------------------------
  // REFERRAL PAGE
  // --------------------------------------------------

  const referralPage = (
    <>
      <div className="page-heading">
        <span className="section-label">
          AFFILIATE
        </span>

        <h2>
          Refer & Earn
        </h2>

        <p>
          Invite friends and grow your affiliate
          earnings.
        </p>
      </div>

      <div className="referral-card">
        <div className="referral-icon">
          R
        </div>

        <span>
          YOUR REFERRAL CODE
        </span>

        <h2>
          {REFERRAL_CODE}
        </h2>

        <p>
          Share your referral code with friends who
          join TaskFlow NG. Your affiliate earnings
          will appear in your Affiliate Balance.
        </p>

        <div className="referral-code-box">
          {REFERRAL_CODE}
        </div>

        <button
          className="primary-button small-button"
          onClick={() => {
            navigator.clipboard
              ?.writeText(
                REFERRAL_CODE
              )
              .then(() => {
                showMessage(
                  'Referral code copied successfully.',
                  'success'
                )
              })
              .catch(() => {
                showMessage(
                  'Copy failed. Please copy the code manually.',
                  'error'
                )
              })
          }}
        >
          Copy Referral Code
        </button>

        {message && (
          <div
            className={
              messageType ===
              'error'
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

  // --------------------------------------------------
  // DEPOSIT PAGE
  // --------------------------------------------------

  const depositPage = (
    <>
      <div className="page-heading">
        <span className="section-label">
          DEPOSIT
        </span>

        <h2>
          Fund Your Account
        </h2>

        <p>
          Add funds securely through Paystack.
        </p>
      </div>

      <div className="profile-card deposit-card">
        <div className="balance-overview-content">
          <span>
            CURRENT BALANCE
          </span>

          <h2>
            {formatMoney(
              totalBalance
            )}
          </h2>

          <p>
            Your current Task and Affiliate balance.
          </p>
        </div>

        <div className="deposit-benefits">
          <div>
            <span>✓</span>
            Secure payment
          </div>

          <div>
            <span>✓</span>
            Fast processing
          </div>

          <div>
            <span>✓</span>
            Paystack protected
          </div>
        </div>

        <div className="form-group">
          <label>
            Deposit Amount
          </label>

          <input
            type="number"
            min="1000"
            step="100"
            value={
              depositAmount
            }
            onChange={(e) =>
              setDepositAmount(
                e.target.value
              )
            }
            placeholder="Enter amount"
            disabled={
              depositLoading
            }
          />

          <small>
            Minimum deposit: ₦1,000
          </small>
        </div>

        {message && (
          <div
            className={
              messageType ===
              'error'
                ? 'form-error'
                : 'form-message'
            }
          >
            {message}
          </div>
        )}

        <button
          className="primary-button"
          onClick={
            initializeDeposit
          }
          disabled={
            depositLoading
          }
        >
          {depositLoading
            ? 'Opening Paystack...'
            : 'Deposit with Paystack'}
        </button>
      </div>
    </>
  )

  // --------------------------------------------------
  // WITHDRAW PAGE
  // --------------------------------------------------

  const withdrawPage = (
    <>
      <div className="page-heading">
        <span className="section-label">
          WITHDRAWAL
        </span>

        <h2>
          Withdraw Funds
        </h2>

        <p>
          Choose a balance and submit your withdrawal
          request.
        </p>
      </div>

      <div className="form-message notice">
        <strong>
          TEST MODE
        </strong>

        <br />

        This withdrawal form is currently for design
        and testing. It does not send real money or
        change your actual balance.
      </div>

      <div className="withdraw-choice-grid">
        <button
          type="button"
          className={`withdraw-choice ${
            withdrawalBalanceType ===
            'task'
              ? 'active'
              : ''
          }`}
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
              {formatMoney(
                taskBalance
              )}
            </strong>
          </div>

          <b>
            {withdrawalBalanceType ===
            'task'
              ? '✓'
              : '›'}
          </b>
        </button>

        <button
          type="button"
          className={`withdraw-choice ${
            withdrawalBalanceType ===
            'affiliate'
              ? 'active'
              : ''
          }`}
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
              {formatMoney(
                affiliateBalance
              )}
            </strong>
          </div>

          <b>
            {withdrawalBalanceType ===
            'affiliate'
              ? '✓'
              : '›'}
          </b>
        </button>
      </div>

      <div className="profile-card">
        <form
          onSubmit={
            submitTestWithdrawal
          }
        >
          <div className="form-group">
            <label>
              Withdrawal Amount
            </label>

            <input
              type="number"
              min="1000"
              step="100"
              value={
                withdrawalAmount
              }
              onChange={(e) =>
                setWithdrawalAmount(
                  e.target.value
                )
              }
              placeholder="Enter amount"
              disabled={
                withdrawalLoading
              }
            />

            <small>
              Minimum withdrawal: ₦1,000
            </small>
          </div>

          <div className="form-group">
            <label>
              Bank Name
            </label>

            <input
              type="text"
              value={
                bankName
              }
              onChange={(e) =>
                setBankName(
                  e.target.value
                )
              }
              placeholder="Enter bank name"
              disabled={
                withdrawalLoading
              }
            />
          </div>

          <div className="form-group">
            <label>
              Account Name
            </label>

            <input
              type="text"
              value={
                accountName
              }
              onChange={(e) =>
                setAccountName(
                  e.target.value
                )
              }
              placeholder="Enter account name"
              disabled={
                withdrawalLoading
              }
            />
          </div>

          <div className="form-group">
            <label>
              Account Number
            </label>

            <input
              type="text"
              inputMode="numeric"
              maxLength={10}
              value={
                accountNumber
              }
              onChange={(e) =>
                setAccountNumber(
                  e.target.value
                    .replace(
                      /\D/g,
                      ''
                    )
                    .slice(
                      0,
                      10
                    )
                )
              }
              placeholder="10-digit account number"
              disabled={
                withdrawalLoading
              }
            />
          </div>

          {message && (
            <div
              className={
                messageType ===
                'error'
                  ? 'form-error'
                  : 'form-message'
              }
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={
              withdrawalLoading
            }
          >
            {withdrawalLoading
              ? 'Creating Request...'
              : 'Submit Withdrawal Request'}
          </button>
        </form>
      </div>

      <div className="dashboard-section">
        <div className="section-title-row">
          <h3>
            Withdrawal History
          </h3>
        </div>

        {withdrawalHistory.length ===
        0 ? (
          <div className="empty-card">
            <strong>
              No withdrawal requests yet
            </strong>

            <span>
              Your withdrawal requests will appear
              here.
            </span>
          </div>
        ) : (
          <div className="mini-task-list">
            {withdrawalHistory.map(
              (
                withdrawal
              ) => (
                <div
                  className="mini-task"
                  key={
                    withdrawal.id
                  }
                >
                  <div className="mini-task-icon">
                    ₦
                  </div>

                  <div className="mini-task-info">
                    <strong>
                      {formatMoney(
                        withdrawal.amount
                      )}
                    </strong>

                    <span>
                      {
                        withdrawal.balance_type
                      }{' '}
                      •{' '}
                      {
                        withdrawal.bank_name
                      }
                      <br />
                      {
                        withdrawal.account_number
                      }
                      <br />
                      {
                        withdrawal.payment_reference
                      }
                      <br />
                      {formatDate(
                        withdrawal.created_at
                      )}
                    </span>
                  </div>

                  <strong className="status-text">
                    {
                      withdrawal.status
                    }
                  </strong>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </>
  )

  // --------------------------------------------------
  // PROFILE PAGE
  // --------------------------------------------------

  const profilePage = (
    <>
      <div className="page-heading">
        <span className="section-label">
          ACCOUNT
        </span>

        <h2>
          My Profile
        </h2>

        <p>
          View your TaskFlow NG account information.
        </p>
      </div>

      <div className="profile-card">
        <div className="large-avatar">
          {initials}
        </div>

        <h2>
          {displayName}
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
              {displayName}
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
              {formatMoney(
                taskBalance
              )}
            </strong>
          </div>

          <div>
            <span>
              Affiliate Balance
            </span>

            <strong>
              {formatMoney(
                affiliateBalance
              )}
            </strong>
          </div>

          <div>
            <span>
              Account Status
            </span>

            <strong>
              {profile?.is_active
                ? 'Active'
                : 'Inactive'}
            </strong>
          </div>
        </div>

        <button
          className="danger-button"
          onClick={
            handleLogout
          }
        >
          Log Out
        </button>
      </div>
    </>
  )

  // --------------------------------------------------
  // PAGE ROUTING
  // --------------------------------------------------

  let pageContent =
    dashboardPage

  if (
    activePage ===
    'Tasks'
  ) {
    pageContent =
      tasksPage
  } else if (
    activePage ===
    'Referral'
  ) {
    pageContent =
      referralPage
  } else if (
    activePage ===
    'Deposit'
  ) {
    pageContent =
      depositPage
  } else if (
    activePage ===
    'Withdraw'
  ) {
    pageContent =
      withdrawPage
  } else if (
    activePage ===
    'Profile'
  ) {
    pageContent =
      profilePage
  }

  // --------------------------------------------------
  // MAIN APP
  // --------------------------------------------------

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <button
            className="brand-button"
            onClick={() =>
              goTo(
                'Dashboard'
              )
            }
          >
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
          </button>
        </div>

        <div className="topbar-right">
          <button
            className="profile-button"
            onClick={() =>
              goTo(
                'Profile'
              )
            }
          >
            <div className="avatar">
              {initials}
            </div>

            <div className="profile-button-text">
              <strong>
                {displayName}
              </strong>

              <span>
                My Profile
              </span>
            </div>
          </button>

          <button
            className="menu-button"
            onClick={() =>
              setMenuOpen(
                (value) =>
                  !value
              )
            }
            aria-label="Open menu"
          >
            ☰
          </button>
        </div>
      </header>

      <div className="app-layout">
        <aside
          className={`sidebar ${
            menuOpen
              ? 'sidebar-open'
              : ''
          }`}
        >
          <nav className="sidebar-nav">
            <button
              className={
                activePage ===
                'Dashboard'
                  ? 'nav-item active'
                  : 'nav-item'
              }
              onClick={() =>
                goTo(
                  'Dashboard'
                )
              }
            >
              <span>
                ⌂
              </span>
              Dashboard
            </button>

            <button
              className={
                activePage ===
                'Tasks'
                  ? 'nav-item active'
                  : 'nav-item'
              }
              onClick={() =>
                goTo(
                  'Tasks'
                )
              }
            >
              <span>
                ✓
              </span>
              Tasks
            </button>

            <button
              className={
                activePage ===
                'Referral'
                  ? 'nav-item active'
                  : 'nav-item'
              }
              onClick={() =>
                goTo(
                  'Referral'
                )
              }
            >
              <span>
                ↗
              </span>
              Refer & Earn
            </button>

            <button
              className={
                activePage ===
                'Deposit'
                  ? 'nav-item active'
                  : 'nav-item'
              }
              onClick={() =>
                goTo(
                  'Deposit'
                )
              }
            >
              <span>
                +
              </span>
              Deposit
            </button>

            <button
              className={
                activePage ===
                'Withdraw'
                  ? 'nav-item active'
                  : 'nav-item'
              }
              onClick={() =>
                goTo(
                  'Withdraw'
                )
              }
            >
              <span>
                ↓
              </span>
              Withdraw
            </button>
          </nav>

          <div className="sidebar-bottom">
            <button
              className={
                activePage ===
                'Profile'
                  ? 'nav-item active'
                  : 'nav-item'
              }
              onClick={() =>
                goTo(
                  'Profile'
                )
              }
            >
              <span>
                ●
              </span>
              My Profile
            </button>

            <button
              className="nav-item logout-nav"
              onClick={
                handleLogout
              }
            >
              <span>
                ↪
              </span>
              Log Out
            </button>
          </div>
        </aside>

        {menuOpen && (
          <div
            className="sidebar-overlay"
            onClick={() =>
              setMenuOpen(
                false
              )
            }
          />
        )}

        <main className="main-content">
          {message &&
            activePage !==
              'Tasks' &&
            activePage !==
              'Deposit' &&
            activePage !==
              'Withdraw' &&
            activePage !==
              'Referral' && (
              <div
                className={
                  messageType ===
                  'error'
                    ? 'form-error global-message'
                    : 'form-message global-message'
                }
              >
                {message}
              </div>
            )}

          {pageContent}
        </main>
      </div>

      {/* TASK SUBMISSION MODAL */}

      {selectedTask && (
        <div
          className="modal-backdrop"
          onClick={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeTaskSubmission()
            }
          }}
        >
          <div className="task-modal">
            <div className="modal-header">
              <div>
                <span className="section-label">
                  SUBMIT TASK
                </span>

                <h2>
                  {
                    selectedTask.title
                  }
                </h2>
              </div>

              <button
                className="modal-close"
                onClick={
                  closeTaskSubmission
                }
              >
                ×
              </button>
            </div>

            <div className="modal-reward">
              <span>
                Task Reward
              </span>

              <strong>
                {formatMoney(
                  selectedTask.reward
                )}
              </strong>
            </div>

            {selectedTask.description && (
              <div className="modal-task-description">
                <strong>
                  Task Instructions
                </strong>

                <p>
                  {
                    selectedTask.description
                  }
                </p>
              </div>
            )}

            <form
              onSubmit={
                submitProof
              }
            >
              <div className="form-group">
                <label>
                  Proof / Details
                </label>

                <textarea
                  value={
                    proof
                  }
                  onChange={(e) =>
                    setProof(
                      e.target.value
                    )
                  }
                  placeholder="Enter your proof or explain how you completed the task..."
                  rows="5"
                  disabled={
                    submitting
                  }
                />
              </div>

              <div className="form-group">
                <label>
                  Screenshot Proof
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={
                    handleProofFile
                  }
                  disabled={
                    submitting
                  }
                />

                <small>
                  Optional. Maximum size: 5MB.
                </small>

                {proofFile && (
                  <div className="selected-file">
                    ✓{' '}
                    {
                      proofFile.name
                    }
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="outline-button"
                  onClick={
                    closeTaskSubmission
                  }
                  disabled={
                    submitting
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    submitting
                  }
                >
                  {submitting
                    ? 'Submitting...'
                    : 'Submit Proof'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
