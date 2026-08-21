import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import './App.css'

const WITHDRAWAL_MINIMUM = 1000

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

  // -----------------------------
  // DEPOSIT
  // -----------------------------

  const [depositAmount, setDepositAmount] = useState('')
  const [depositLoading, setDepositLoading] = useState(false)

  // -----------------------------
  // WITHDRAWAL
  // -----------------------------

  const [withdrawalBalanceType, setWithdrawalBalanceType] =
    useState('task')

  const [withdrawalAmount, setWithdrawalAmount] =
    useState('')

  const [bankName, setBankName] = useState('')
  const [accountName, setAccountName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')

  const [withdrawalLoading, setWithdrawalLoading] =
    useState(false)

  const [withdrawalHistory, setWithdrawalHistory] =
    useState([])

  // -----------------------------
  // LOAD ACCOUNT
  // -----------------------------

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
          loadWithdrawalHistory(currentUser.id)

          await verifyReturnedPayment()
        } else {
          setProfile(null)
          setTasks([])
          setWithdrawalHistory([])
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
      loadWithdrawalHistory(currentUser.id)

      await verifyReturnedPayment()
    }

    setLoading(false)
  }

  const loadProfile = async (currentUser) => {
    const { data, error: profileError } =
      await supabase
        .from('profiles')
        .select(
          'id, full_name, task_balance, affiliate_balance, is_active'
        )
        .eq('id', currentUser.id)
        .single()

    if (profileError) {
      console.error(
        'Profile error:',
        profileError.message
      )
      setProfile(null)
    } else {
      setProfile(data)
    }
  }

  const loadTasks = async () => {
    setTasksLoading(true)

    const { data, error: tasksError } =
      await supabase
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

  // -----------------------------
  // VERIFY RETURNED PAYSTACK PAYMENT
  // -----------------------------

  const verifyReturnedPayment = async () => {
    const params = new URLSearchParams(
      window.location.search
    )

    const reference =
      params.get('reference')

    const paymentStatus =
      params.get('payment')

    if (
      paymentStatus !== 'success' ||
      !reference
    ) {
      return
    }

    setMessage(
      'Verifying your payment...'
    )
    setMessageType('success')

    try {
      const {
        data,
        error: verifyError,
      } =
        await supabase.functions.invoke(
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

      const {
        data: {
          user: currentUser,
        },
      } =
        await supabase.auth.getUser()

      if (currentUser) {
        await loadProfile(
          currentUser
        )
      }

      if (
        data.already_processed
      ) {
        setMessage(
          'This payment has already been credited.'
        )
      } else {
        setMessage(
          `Payment successful! ${formatMoney(
            data.amount
          )} has been added to your Task Balance.`
        )
      }

      setMessageType('success')

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

      setMessage(
        err?.message ||
          'We could not verify your payment. Please contact support if money was deducted.'
      )

      setMessageType('error')
    }
  }

  // -----------------------------
  // AUTH
  // -----------------------------

  const handleAuth = async (event) => {
    event.preventDefault()

    setAuthLoading(true)
    setAuthError('')
    setAuthMessage('')

    const cleanEmail =
      email.trim().toLowerCase()

    if (!cleanEmail || !password) {
      setAuthError(
        'Please enter your email and password.'
      )
      setAuthLoading(false)
      return
    }

    if (
      authMode === 'signup' &&
      !fullName.trim()
    ) {
      setAuthError(
        'Please enter your full name.'
      )
      setAuthLoading(false)
      return
    }

    try {
      if (authMode === 'login') {
        const {
          error: loginError,
        } =
          await supabase.auth.signInWithPassword(
            {
              email: cleanEmail,
              password,
            }
          )

        if (loginError) {
          setAuthError(
            loginError.message
          )
        }
      } else {
        const {
          data,
          error: signupError,
        } =
          await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: {
                full_name:
                  fullName.trim(),
              },
            },
          })

        if (signupError) {
          setAuthError(
            signupError.message
          )
        } else if (
          data.session
        ) {
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
    setActivePage('Dashboard')
    setMenuOpen(false)
    setWithdrawalHistory([])
  }

  // -----------------------------
  // DEPOSIT
  // -----------------------------

  const initializeDeposit = async () => {
    if (!user) return

    const amount =
      Number(depositAmount)

    if (
      !Number.isFinite(amount) ||
      amount < 1000
    ) {
      setMessage(
        'Minimum deposit is ₦1,000.'
      )
      setMessageType('error')
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
              email:
                user.email,
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
        !data?.data
          ?.authorization_url
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

      setMessage(
        err?.message ||
          'Unable to start the deposit. Please try again.'
      )

      setMessageType('error')
    } finally {
      setDepositLoading(false)
    }
  }

  // -----------------------------
  // WITHDRAWAL STORAGE
  // -----------------------------

  const withdrawalStorageKey = (
    userId
  ) =>
    `taskflow_test_withdrawals_${userId}`

  const loadWithdrawalHistory = (
    userId
  ) => {
    try {
      const saved =
        localStorage.getItem(
          withdrawalStorageKey(
            userId
          )
        )

      if (!saved) {
        setWithdrawalHistory([])
        return
      }

      const parsed =
        JSON.parse(saved)

      setWithdrawalHistory(
        Array.isArray(parsed)
          ? parsed
          : []
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
      withdrawalStorageKey(
        userId
      ),
      JSON.stringify(history)
    )

    setWithdrawalHistory(
      history
    )
  }

  const generateWithdrawalReference =
    () => {
      const random =
        Math.random()
          .toString(36)
          .substring(2, 9)
          .toUpperCase()

      return `TFW-TEST-${Date.now()}-${random}`
    }

  // -----------------------------
  // TEST WITHDRAWAL
  // -----------------------------

  const submitTestWithdrawal = async (
    event
  ) => {
    event.preventDefault()

    if (!user) {
      setMessage(
        'Please log in before requesting a withdrawal.'
      )
      setMessageType('error')
      return
    }

    const amount =
      Number(
        withdrawalAmount
      )

    const selectedBalance =
      withdrawalBalanceType ===
      'task'
        ? Number(
            profile?.task_balance ??
              0
          )
        : Number(
            profile?.affiliate_balance ??
              0
          )

    const cleanBankName =
      bankName.trim()

    const cleanAccountName =
      accountName.trim()

    const cleanAccountNumber =
      accountNumber.trim()

    if (
      !Number.isFinite(amount) ||
      amount <
        WITHDRAWAL_MINIMUM
    ) {
      setMessage(
        'Minimum withdrawal is ₦1,000.'
      )
      setMessageType('error')
      return
    }

    if (
      amount >
      selectedBalance
    ) {
      setMessage(
        `Insufficient ${
          withdrawalBalanceType ===
          'task'
            ? 'Task'
            : 'Affiliate'
        } Balance.`
      )
      setMessageType('error')
      return
    }

    if (!cleanBankName) {
      setMessage(
        'Please enter the bank name.'
      )
      setMessageType('error')
      return
    }

    if (!cleanAccountName) {
      setMessage(
        'Please enter the account name.'
      )
      setMessageType('error')
      return
    }

    if (
      !/^\d{10}$/.test(
        cleanAccountNumber
      )
    ) {
      setMessage(
        'Account number must contain exactly 10 digits.'
      )
      setMessageType('error')
      return
    }

    setWithdrawalLoading(true)
    setMessage('')

    try {
      const reference =
        generateWithdrawalReference()

      const newWithdrawal = {
        id:
          crypto?.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}`,

        user_id:
          user.id,

        amount,

        bank_name:
          cleanBankName,

        account_name:
          cleanAccountName,

        account_number:
          cleanAccountNumber,

        payment_reference:
          reference,

        status:
          'pending',

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

      setMessage(
        `Test withdrawal request created successfully. Reference: ${reference}`
      )

      setMessageType('success')
    } catch (err) {
      console.error(
        'Test withdrawal error:',
        err
      )

      setMessage(
        'Unable to create the test withdrawal request.'
      )

      setMessageType('error')
    } finally {
      setWithdrawalLoading(false)
    }
  }

  // -----------------------------
  // TASK SUBMISSION
  // -----------------------------

  const openTaskSubmission = (
    task
  ) => {
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

  const handleProofFile = (
    event
  ) => {
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
      setMessage(
        'Please select an image screenshot.'
      )

      setMessageType('error')

      event.target.value = ''
      setProofFile(null)

      return
    }

    const maxSize =
      5 * 1024 * 1024

    if (
      file.size > maxSize
    ) {
      setMessage(
        'Screenshot must be smaller than 5MB.'
      )

      setMessageType('error')

      event.target.value = ''
      setProofFile(null)

      return
    }

    setMessage('')
    setProofFile(file)
  }

  const submitProof = async (
    event
  ) => {
    event.preventDefault()

    if (
      !selectedTask ||
      !user
    ) {
      return
    }

    const cleanProof =
      proof.trim()

    if (
      !cleanProof &&
      !proofFile
    ) {
      setMessage(
        'Please enter proof or upload a screenshot before submitting.'
      )

      setMessageType('error')
      return
    }

    setSubmitting(true)
    setMessage('')

    let uploadedFilePath =
      null

    let screenshotUrl =
      null

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
          error:
            uploadError,
        } =
          await supabase.storage
            .from(
              'task-proofs'
            )
            .upload(
              filePath,
              proofFile,
              {
                cacheControl:
                  '3600',
                upsert:
                  false,
                contentType:
                  proofFile.type,
              }
            )

        if (uploadError) {
          setMessage(
            `Screenshot upload failed: ${uploadError.message}`
          )

          setMessageType(
            'error'
          )

          return
        }

        uploadedFilePath =
          filePath

        const {
          data:
            publicUrlData,
        } =
          supabase.storage
            .from(
              'task-proofs'
            )
            .getPublicUrl(
              filePath
            )

        screenshotUrl =
          publicUrlData
            ?.publicUrl ||
          null
      }

      let finalProof =
        cleanProof

      if (screenshotUrl) {
        if (finalProof) {
          finalProof +=
            `\n\nScreenshot:\n${screenshotUrl}`
        } else {
          finalProof =
            `Screenshot:\n${screenshotUrl}`
        }
      }

      const {
        error:
          submissionError,
      } =
        await supabase
          .from(
            'task_submissions'
          )
          .insert({
            user_id:
              user.id,

            task_id:
              selectedTask.id,

            proof:
              finalProof,

            status:
              'Pending',

            reward:
              Number(
                selectedTask.reward
              ),
          })

      if (
        submissionError
      ) {
        if (
          uploadedFilePath
        ) {
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
          setMessage(
            'You have already submitted this task.'
          )
        } else {
          setMessage(
            `Submission failed: ${submissionError.message}`
          )
        }

        setMessageType(
          'error'
        )

        return
      }

      const title =
        selectedTask.title

      setSelectedTask(null)
      setProof('')
      setProofFile(null)

      setMessage(
        `Success! Your proof for "${title}" has been submitted and is waiting for review.`
      )

      setMessageType(
        'success'
      )

      await loadTasks()
    } catch (err) {
      console.error(
        'Unexpected submission error:',
        err
      )

      if (
        uploadedFilePath
      ) {
        await supabase.storage
          .from(
            'task-proofs'
          )
          .remove([
            uploadedFilePath,
          ])
      }

      setMessage(
        'Something went wrong while submitting your proof. Please try again.'
      )

      setMessageType(
        'error'
      )
    } finally {
      setSubmitting(false)
    }
  }

  // -----------------------------
  // NAVIGATION
  // -----------------------------

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

  // -----------------------------
  // HELPERS
  // -----------------------------

  const formatMoney = (
    amount
  ) => {
    return `₦${Number(
      amount || 0
    ).toLocaleString(
      'en-NG'
    )}`
  }

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
  ) => {
    return (
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
    )
  }

  // -----------------------------
  // LOADING
  // -----------------------------

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

  // -----------------------------
  // AUTH
  // -----------------------------

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
            <h2>
              {authMode ===
              'login'
                ? 'Welcome back'
                : 'Create your account'}
            </h2>

            <p>
              {authMode ===
              'login'
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
            onSubmit={
              handleAuth
            }
          >
            {authMode ===
              'signup' && (
              <div className="form-group">
                <label>
                  Full Name
                </label>

                <input
                  type="text"
                  value={
                    fullName
                  }
                  onChange={(
                    e
                  ) =>
                    setFullName(
                      e.target
                        .value
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
                value={
                  email
                }
                onChange={(
                  e
                ) =>
                  setEmail(
                    e.target
                      .value
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
                value={
                  password
                }
                onChange={(
                  e
                ) =>
                  setPassword(
                    e.target
                      .value
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

          <div
            style={{
              textAlign:
                'center',
              marginTop:
                '18px',
            }}
          >
            <p
              style={{
                marginBottom:
                  '8px',
              }}
            >
              {authMode ===
              'login'
                ? "Don't have an account?"
                : 'Already have an account?'}
            </p>

            <button
              type="button"
              className="outline-button"
              style={{
                width:
                  '100%',
              }}
              onClick={() => {
                setAuthMode(
                  authMode ===
                    'login'
                    ? 'signup'
                    : 'login'
                )

                setAuthError(
                  ''
                )

                setAuthMessage(
                  ''
                )
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

  // -----------------------------
  // PROFILE DATA
  // -----------------------------

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

          <p>
            {error}
          </p>
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

  const initials =
    getInitials(
      displayName
    )

  // -----------------------------
  // DASHBOARD
  // -----------------------------

  const dashboardPage = (
    <>
      <div className="dashboard-heading">
        <div>
          <span className="section-label">
            DASHBOARD
          </span>

          <h2>
            Welcome,{' '}
            {
              displayName.split(
                ' '
              )[0]
            }
          </h2>

          <p>
            Manage your tasks,
            rewards and
            earnings.
          </p>
        </div>

        <button
          className="outline-button"
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
            Your combined
            Task and
            Affiliate balance
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

            Task Balance
          </div>

          <h3>
            {formatMoney(
              taskBalance
            )}
          </h3>

          <p>
            Rewards earned
            from completed
            tasks
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
            {formatMoney(
              affiliateBalance
            )}
          </h3>

          <p>
            Earnings from
            your referrals
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
                Earn rewards by
                completing
                available tasks.
              </span>
            </div>

            <b>
              ›
            </b>
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
                Invite people
                and grow your
                affiliate
                earnings.
              </span>
            </div>

            <b>
              ›
            </b>
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
                Add funds
                securely to your
                account.
              </span>
            </div>

            <b>
              ›
            </b>
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
                Create a test
                withdrawal
                request.
              </span>
            </div>

            <b>
              ›
            </b>
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
              Please wait while
              we load available
              tasks.
            </span>
          </div>
        ) : tasks.length ===
          0 ? (
          <div className="empty-card">
            <strong>
              No tasks available
            </strong>

            <span>
              New tasks will
              appear here when
              they are published.
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

  // -----------------------------
  // TASKS
  // -----------------------------

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
          Complete tasks and
          submit proof to earn
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
          style={{
            marginBottom:
              '18px',
          }}
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
            Please wait while
            we load available
            tasks.
          </span>
        </div>
      ) : tasks.length ===
        0 ? (
        <div className="empty-card large">
          <strong>
            No tasks available
          </strong>

          <span>
            Check back later
            for new earning
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
                  {
                    task.title
                  }
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

  // -----------------------------
  // REFERRAL
  // -----------------------------

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
          Invite friends and earn
          from your referrals.
        </p>
      </div>

      <div className="referral-card">
        <span>
          YOUR REFERRAL CODE
        </span>

        <h2>
          TASKFLOW2026
        </h2>

        <p>
          Share your referral
          code with friends who
          join TaskFlow NG.
          Your affiliate
          earnings will appear
          in your Affiliate
          Balance.
        </p>

        <button
          className="primary-button small-button"
          onClick={() => {
            navigator.clipboard
              ?.writeText(
                'TASKFLOW2026'
              )
              .then(() => {
                setMessage(
                  'Referral code copied successfully.'
                )

                setMessageType(
                  'success'
                )
              })
              .catch(() => {
                setMessage(
                  'Copy failed. Please copy the code manually.'
                )

                setMessageType(
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

  // -----------------------------
  // DEPOSIT PAGE
  // -----------------------------

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
          Add funds securely
          through Paystack.
        </p>
      </div>

      <div className="profile-card">
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
            Your current Task
            and Affiliate
            balance.
          </p>
        </div>

        <div
          className="form-group"
          style={{
            marginTop:
              '24px',
          }}
        >
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
            onChange={(
              e
            ) =>
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
            Minimum deposit:
            ₦1,000
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
            style={{
              marginTop:
                '15px',
            }}
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
          style={{
            marginTop:
              '18px',
          }}
        >
          {depositLoading
            ? 'Opening Paystack...'
            : 'Deposit with Paystack'}
        </button>
      </div>
    </>
  )

  // -----------------------------
  // WITHDRAWAL PAGE
  // -----------------------------

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
          Create a test
          withdrawal request.
        </p>
      </div>

      <div
        className="form-message"
        style={{
          marginBottom:
            '18px',
        }}
      >
        <strong>
          TEST MODE
        </strong>

        <br />

        This withdrawal
        form does not send
        real money or change
        your actual balance.
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

      <div
        className="profile-card"
        style={{
          marginTop:
            '20px',
        }}
      >
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
              min={
                WITHDRAWAL_MINIMUM
              }
              step="100"
              value={
                withdrawalAmount
              }
              onChange={(
                e
              ) =>
                setWithdrawalAmount(
                  e.target
                    .value
                )
              }
              placeholder="Enter amount"
              disabled={
                withdrawalLoading
              }
            />

            <small>
              Minimum withdrawal:
              ₦1,000
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
              onChange={(
                e
              ) =>
                setBankName(
                  e.target
                    .value
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
              onChange={(
                e
              ) =>
                setAccountName(
                  e.target
                    .value
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
              onChange={(
                e
              ) =>
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
              style={{
                marginTop:
                  '15px',
              }}
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
            style={{
              marginTop:
                '18px',
            }}
          >
            {withdrawalLoading
              ? 'Creating Test Request...'
              : 'Submit Test Withdrawal'}
          </button>
        </form>
      </div>

      <div
        className="dashboard-section"
        style={{
          marginTop:
            '24px',
        }}
      >
        <div className="section-title-row">
          <h3>
            Withdrawal History
          </h3>
        </div>

        {withdrawalHistory.length ===
        0 ? (
          <div className="empty-card">
            <strong>
              No withdrawal
              requests yet
            </strong>

            <span>
              Your test withdrawal
              requests will
              appear here.
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
                  style={{
                    cursor:
                      'default',
                  }}
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

                  <strong
                    style={{
                      textTransform:
                        'capitalize',
                    }}
                  >
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

  // -----------------------------
  // PROFILE
  // -----------------------------

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
          View your TaskFlow NG
          account information.
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

  // -----------------------------
  // PAGE ROUTING
  // -----------------------------

  let pageContent =
    dashboardPage

  if (
    activePage ===
    'Tasks'
  ) {
    pageContent =
      tasksPage
  }

  if (
    activePage ===
    'Referral'
  ) {
    pageContent =
      referralPage
  }

  if (
    activePage ===
    'Deposit'
  ) {
    pageContent =
      depositPage
  }

  if (
    activePage ===
    'Withdraw'
  ) {
    pageContent =
      withdrawPage
  }

  if (
    activePage ===
    'Profile'
  ) {
    pageContent =
      profilePage
  }

  // -----------------------------
  // MAIN UI
  // -----------------------------

  return (
    <div className="app">
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
    </
