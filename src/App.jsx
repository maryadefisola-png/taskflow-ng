import { useState } from 'react'
import './App.css'

const ADMIN_EMAIL = 'admin@taskflow.ng'

function App() {
  // =========================
  // AUTH
  // =========================

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

  // =========================
  // NAVIGATION
  // =========================

  const [activeTab, setActiveTab] = useState('Dashboard')

  // =========================
  // BALANCE
  // =========================

  const [balance, setBalance] = useState(() => {
    const saved = localStorage.getItem('taskflow_balance')
    return saved ? Number(saved) : 0
  })

  // =========================
  // TASKS
  // =========================

  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('taskflow_tasks')

    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 1,
            title: 'Daily Check-in',
            description: 'Complete your daily check-in.',
            reward: 50,
          },
          {
            id: 2,
            title: 'App Review',
            description: 'Review an app and share your feedback.',
            reward: 100,
          },
          {
            id: 3,
            title: 'Social Task',
            description: 'Complete a simple social media task.',
            reward: 150,
          },
        ]
  })

  const [completedTasks, setCompletedTasks] = useState(() => {
    const saved = localStorage.getItem('taskflow_completed_tasks')
    return saved ? JSON.parse(saved) : []
  })

  // =========================
  // WITHDRAWALS
  // =========================

  const [withdrawals, setWithdrawals] = useState(() => {
    const saved = localStorage.getItem('taskflow_withdrawals')
    return saved ? JSON.parse(saved) : []
  })

  // =========================
  // REFERRALS
  // =========================

  const [referrals, setReferrals] = useState(() => {
    const saved = localStorage.getItem('taskflow_referrals')
    return saved ? Number(saved) : 0
  })

  const [referralBalance, setReferralBalance] = useState(() => {
    const saved = localStorage.getItem(
      'taskflow_referral_balance'
    )

    return saved ? Number(saved) : 0
  })

  // =========================
  // PROFILE
  // =========================

  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('taskflow_profile')

    return saved
      ? JSON.parse(saved)
      : {
          name: 'TaskFlow User',
          email: 'user@example.com',
          phone: '',
        }
  })

  const [editingProfile, setEditingProfile] = useState(false)

  // =========================
  // WITHDRAW FORM
  // =========================

  const [bankName, setBankName] = useState('')
  const [accountName, setAccountName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')

  // =========================
  // ADMIN FORM
  // =========================

  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDescription, setNewTaskDescription] =
    useState('')
  const [newTaskReward, setNewTaskReward] = useState('')

  const referralCode = 'TASKFLOW2026'
  const referralLink =
    `${window.location.origin}?ref=${referralCode}`

  const isAdmin =
    user && user.email.toLowerCase() === ADMIN_EMAIL

  // =========================
  // AUTH FUNCTIONS
  // =========================

  const handleAuthChange = (field, value) => {
    setAuthForm({
      ...authForm,
      [field]: value,
    })

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

      setProfile({
        name,
        email,
        phone: '',
      })

      setAuthForm({
        name: '',
        email: '',
        password: '',
      })

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
  // TASK FUNCTIONS
  // =========================

  const completeTask = (task) => {
    if (completedTasks.includes(task.id)) {
      alert('You have already completed this task.')
      return
    }

    const newBalance = balance + Number(task.reward)

    const newCompletedTasks = [
      ...completedTasks,
      task.id,
    ]

    setBalance(newBalance)
    setCompletedTasks(newCompletedTasks)

    localStorage.setItem(
      'taskflow_balance',
      newBalance
    )

    localStorage.setItem(
      'taskflow_completed_tasks',
      JSON.stringify(newCompletedTasks)
    )

    alert(
      `Task completed! You earned ₦${task.reward}.`
    )
  }

  // =========================
  // WITHDRAWAL
  // =========================

  const handleWithdraw = (event) => {
    event.preventDefault()

    const amount = Number(withdrawAmount)

    if (
      !bankName ||
      !accountName ||
      !accountNumber ||
      !amount
    ) {
      alert('Please fill in all withdrawal details.')
      return
    }

    if (accountNumber.length !== 10) {
      alert(
        'Please enter a valid 10-digit account number.'
      )
      return
    }

    if (amount < 100) {
      alert('Minimum withdrawal amount is ₦100.')
      return
    }

    if (amount > balance) {
      alert('Insufficient balance.')
      return
    }

    const newBalance = balance - amount

    const newWithdrawal = {
      id: Date.now(),
      amount,
      bankName,
      accountName,
      accountNumber,
      status: 'Pending',
      date: new Date().toLocaleString(),
    }

    const newWithdrawals = [
      newWithdrawal,
      ...withdrawals,
    ]

    setBalance(newBalance)
    setWithdrawals(newWithdrawals)

    localStorage.setItem(
      'taskflow_balance',
      newBalance
    )

    localStorage.setItem(
      'taskflow_withdrawals',
      JSON.stringify(newWithdrawals)
    )

    setBankName('')
    setAccountName('')
    setAccountNumber('')
    setWithdrawAmount('')

    alert(
      `Withdrawal request submitted for ₦${amount.toFixed(
        2
      )}.`
    )

    setActiveTab('History')
  }

  // =========================
  // REFERRALS
  // =========================

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(
        referralLink
      )

      alert('Referral link copied!')
    } catch {
      alert(
        'Copy failed. Please copy the link manually.'
      )
    }
  }

  const simulateReferral = () => {
    const reward = 50

    const newReferrals = referrals + 1
    const newReferralBalance =
      referralBalance + reward

    setReferrals(newReferrals)
    setReferralBalance(newReferralBalance)

    localStorage.setItem(
      'taskflow_referrals',
      newReferrals
    )

    localStorage.setItem(
      'taskflow_referral_balance',
      newReferralBalance
    )

    alert(
      `New referral added! You earned ₦${reward}.`
    )
  }

  // =========================
  // PROFILE
  // =========================

  const updateProfile = (field, value) => {
    setProfile({
      ...profile,
      [field]: value,
    })
  }

  const saveProfile = () => {
    localStorage.setItem(
      'taskflow_profile',
      JSON.stringify(profile)
    )

    const updatedUser = {
      name: profile.name,
      email: profile.email,
    }

    localStorage.setItem(
      'taskflow_user',
      JSON.stringify(updatedUser)
    )

    setUser(updatedUser)
    setEditingProfile(false)

    alert('Profile saved successfully!')
  }

  // =========================
  // ADMIN FUNCTIONS
  // =========================

  const addTask = (event) => {
    event.preventDefault()

    const reward = Number(newTaskReward)

    if (
      !newTaskTitle.trim() ||
      !newTaskDescription.trim() ||
      !reward
    ) {
      alert('Please complete all task fields.')
      return
    }

    if (reward <= 0) {
      alert('Reward must be greater than ₦0.')
      return
    }

    const newTask = {
      id: Date.now(),
      title: newTaskTitle.trim(),
      description: newTaskDescription.trim(),
      reward,
    }

    const updatedTasks = [...tasks, newTask]

    setTasks(updatedTasks)

    localStorage.setItem(
      'taskflow_tasks',
      JSON.stringify(updatedTasks)
    )

    setNewTaskTitle('')
    setNewTaskDescription('')
    setNewTaskReward('')

    alert('New task added successfully!')
  }

  const deleteTask = (taskId) => {
    const updatedTasks = tasks.filter(
      (task) => task.id !== taskId
    )

    setTasks(updatedTasks)

    localStorage.setItem(
      'taskflow_tasks',
      JSON.stringify(updatedTasks)
    )
  }

  const updateWithdrawalStatus = (
    withdrawalId,
    status
  ) => {
    const updatedWithdrawals = withdrawals.map(
      (withdrawal) =>
        withdrawal.id === withdrawalId
          ? {
              ...withdrawal,
              status,
            }
          : withdrawal
    )

    setWithdrawals(updatedWithdrawals)

    localStorage.setItem(
      'taskflow_withdrawals',
      JSON.stringify(updatedWithdrawals)
    )
  }

  // =========================
  // LOGIN SCREEN
  // =========================

  if (!user) {
    return (
      <div className="app">
        <div className="auth-container">
          <div className="auth-card">
            <h1>TaskFlow NG</h1>

            <p className="auth-subtitle">
              Earn rewards by completing tasks.
            </p>

            <div className="auth-tabs">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login')
                  setAuthError('')
                }}
              >
                Login
              </button>

              <button
                type="button"
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
                    onChange={(e) =>
                      handleAuthChange(
                        'name',
                        e.target.value
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
                placeholder="Enter your password"
                value={authForm.password}
                onChange={(e) =>
                  handleAuthChange(
                    'password',
                    e.target.value
                  )
                }
              />

              {authError && (
                <p className="auth-error">
                  {authError}
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

            <p className="demo-note">
              Prototype authentication only. Connect
              secure backend authentication before using
              real accounts or money.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // =========================
  // ADMIN DASHBOARD
  // =========================

  if (isAdmin && activeTab === 'Admin') {
    const pendingWithdrawals =
      withdrawals.filter(
        (withdrawal) =>
          withdrawal.status === 'Pending'
      ).length

    const totalRewards = completedTasks.length

    return (
      <div className="app">
        <header className="navbar">
          <h1>TaskFlow NG Admin</h1>

          <button
            className="logout-btn"
            onClick={handleLogout}
          >
            Log Out
          </button>
        </header>

        <main className="main-content">
          <h2>Admin Dashboard 🛠️</h2>

          <p>Manage TaskFlow NG.</p>

          <button
            onClick={() =>
              setActiveTab('Dashboard')
            }
          >
            Back to Dashboard
          </button>

          <div className="admin-grid">
            <div className="balance-card">
              <h3>Available User Balance</h3>

              <strong>
                ₦{balance.toFixed(2)}
              </strong>
            </div>

            <div className="balance-card">
              <h3>Tasks Completed</h3>

              <strong>{totalRewards}</strong>
            </div>

            <div className="balance-card">
              <h3>Total Referrals</h3>

              <strong>{referrals}</strong>
            </div>

            <div className="balance-card">
              <h3>Pending Withdrawals</h3>

              <strong>
                {pendingWithdrawals}
              </strong>
            </div>
          </div>

          <div className="admin-card">
            <h2>Create New Task</h2>

            <form onSubmit={addTask}>
              <label>Task Title</label>

              <input
                type="text"
                placeholder="Example: Watch a video"
                value={newTaskTitle}
                onChange={(e) =>
                  setNewTaskTitle(e.target.value)
                }
              />

              <label>Description</label>

              <input
                type="text"
                placeholder="Describe the task"
                value={newTaskDescription}
                onChange={(e) =>
                  setNewTaskDescription(
                    e.target.value
                  )
                }
              />

              <label>Reward</label>

              <input
                type="number"
                min="1"
                placeholder="Reward in Naira"
                value={newTaskReward}
                onChange={(e) =>
                  setNewTaskReward(e.target.value)
                }
              />

              <button type="submit">
                Add Task
              </button>
            </form>
          </div>

          <div className="admin-card">
            <h2>Manage Tasks</h2>

            {tasks.map((task) => (
              <div
                className="admin-task"
                key={task.id}
              >
                <div>
                  <h3>{task.title}</h3>

                  <p>{task.description}</p>

                  <strong>
                    ₦{task.reward}
                  </strong>
                </div>

                <button
                  onClick={() =>
                    deleteTask(task.id)
                  }
                >
                  Delete
                </button>
              </div>
            ))}
          </div>

          <div className="admin-card">
            <h2>Withdrawal Requests</h2>

            {withdrawals.length === 0 ? (
              <p>No withdrawal requests.</p>
            ) : (
              withdrawals.map((withdrawal) => (
                <div
                  className="admin-withdrawal"
                  key={withdrawal.id}
                >
                  <h3>
                    ₦
                    {withdrawal.amount.toFixed(
                      2
                    )}
                  </h3>

                  <p>
                    <strong>Bank:</strong>{' '}
                    {withdrawal.bankName}
                  </p>

                  <p>
                    <strong>Account:</strong>{' '}
                    {withdrawal.accountName}
                  </p>

                  <p>
                    <strong>Status:</strong>{' '}
                    {withdrawal.status}
                  </p>

                  {withdrawal.status ===
                    'Pending' && (
                    <div className="admin-actions">
                      <button
                        onClick={() =>
                          updateWithdrawalStatus(
                            withdrawal.id,
                            'Approved'
                          )
                        }
                      >
                        Approve
                      </button>

                      <button
                        onClick={() =>
                          updateWithdrawalStatus(
                            withdrawal.id,
                            'Rejected'
                          )
                        }
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    )
  }

  // =========================
  // MAIN USER APP
  // =========================

  return (
    <div className="app">
      <header className="navbar">
        <h1>TaskFlow NG</h1>

        <button
          className="logout-btn"
          onClick={handleLogout}
        >
          Log Out
        </button>
      </header>

      <main className="main-content">
        <h2>
          Welcome back, {profile.name} 👋
        </h2>

        <p>Your Dashboard</p>

        <p>
          Track your earnings and rewards in one place.
        </p>

        <nav className="tabs">
          <button
            onClick={() =>
              setActiveTab('Dashboard')
            }
          >
            Dashboard
          </button>

          <button
            onClick={() =>
              setActiveTab('Tasks')
            }
          >
            Tasks
          </button>

          <button
            onClick={() =>
              setActiveTab('Withdraw')
            }
          >
            Withdraw
          </button>

          <button
            onClick={() =>
              setActiveTab('History')
            }
          >
            History
          </button>

          <button
            onClick={() =>
              setActiveTab('Referrals')
            }
          >
            Referrals
          </button>

          <button
            onClick={() =>
              setActiveTab('Profile')
            }
          >
            Profile
          </button>

          {isAdmin && (
            <button
              onClick={() =>
                setActiveTab('Admin')
              }
            >
              Admin
            </button>
          )}
        </nav>

        {activeTab === 'Dashboard' && (
          <section>
            <div className="balance-card">
              <h3>Task Balance</h3>

              <strong>
                ₦{balance.toFixed(2)}
              </strong>

              <p>From completed tasks</p>
            </div>

            <div className="balance-card">
              <h3>Affiliate Balance</h3>

              <strong>
                ₦{referralBalance.toFixed(2)}
              </strong>

              <p>From referrals</p>
            </div>
          </section>
        )}

        {activeTab === 'Tasks' && (
          <section className="tasks-section">
            <h2>Available Tasks</h2>

            {tasks.map((task) => {
              const completed =
                completedTasks.includes(task.id)

              return (
                <div
                  className="task-card"
                  key={task.id}
                >
                  <h3>{task.title}</h3>

                  <p>{task.description}</p>

                  <strong>
                    ₦{task.reward}
                  </strong>

                  <button
                    onClick={() =>
                      completeTask(task)
                    }
                    disabled={completed}
                  >
                    {completed
                      ? 'Completed ✓'
                      : 'Complete Task'}
                  </button>
                </div>
              )
            })}
          </section>
        )}

        {activeTab === 'Withdraw' && (
          <section className="withdraw-section">
            <div className="balance-card">
              <h3>Available Balance</h3>

              <strong>
                ₦{balance.toFixed(2)}
              </strong>
            </div>

            <div className="withdraw-card">
              <h2>Withdraw Funds</h2>

              <form
                onSubmit={handleWithdraw}
              >
                <label>Bank Name</label>

                <input
                  type="text"
                  placeholder="Enter bank name"
                  value={bankName}
                  onChange={(e) =>
                    setBankName(e.target.value)
                  }
                />

                <label>Account Name</label>

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
                  placeholder="Minimum ₦100"
                  value={withdrawAmount}
                  onChange={(e) =>
                    setWithdrawAmount(
                      e.target.value
                    )
                  }
                />

                <button type="submit">
                  Submit Withdrawal
                </button>
              </form>
            </div>
          </section>
        )}

        {activeTab === 'History' && (
          <section className="history-section">
            <h2>Withdrawal History</h2>

            {withdrawals.length === 0 ? (
              <div className="balance-card">
                <p>
                  No withdrawals yet.
                </p>
              </div>
            ) : (
              withdrawals.map(
                (withdrawal) => (
                  <div
                    className="withdrawal-card"
                    key={withdrawal.id}
                  >
                    <h3>
                      ₦
                      {withdrawal.amount.toFixed(
                        2
                      )}
                    </h3>

                    <p>
                      <strong>
                        Bank:
                      </strong>{' '}
                      {withdrawal.bankName}
                    </p>

                    <p>
                      <strong>
                        Account:
                      </strong>{' '}
                      {withdrawal.accountName}
                    </p>

                    <p>
                      <strong>
                        Account Number:
                      </strong>{' '}
                      {
                        withdrawal.accountNumber
                      }
                    </p>

                    <p>
                      <strong>
                        Date:
                      </strong>{' '}
                      {withdrawal.date}
                    </p>

                    <span className="pending-status">
                      {withdrawal.status}
                    </span>
                  </div>
                )
              )
            )}
          </section>
        )}

        {activeTab === 'Referrals' && (
          <section className="referral-section">
            <div className="balance-card">
              <h2>Refer & Earn</h2>

              <p>
                Invite friends to TaskFlow NG
                and earn rewards.
              </p>

              <h3>
                Your Referral Code
              </h3>

              <div className="referral-code">
                {referralCode}
              </div>

              <h3>
                Your Referral Link
              </h3>

              <input
                type="text"
                value={referralLink}
                readOnly
              />

              <button
                onClick={copyReferralLink}
              >
                Copy Referral Link
              </button>
            </div>

            <div className="balance-card">
              <h3>
                Total Referrals
              </h3>

              <strong>
                {referrals}
              </strong>

              <p>
                People who joined using
                your referral.
              </p>
            </div>

            <div className="balance-card">
              <h3>
                Referral Earnings
              </h3>

              <strong>
                ₦
                {referralBalance.toFixed(
                  2
                )}
              </strong>

              <p>
                Earned from successful
                referrals.
              </p>
            </div>

            <div className="balance-card">
              <h3>
                Demo Testing
              </h3>

              <p>
                Use this button only to
                test referrals.
              </p>

              <button
                onClick={simulateReferral}
              >
                Simulate Referral +₦50
              </button>
            </div>
          </section>
        )}

        {activeTab === 'Profile' && (
          <section className="profile-section">
            <div className="profile-card">
              <div className="profile-avatar">
                {profile.name
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <h2>
                {profile.name}
              </h2>

              <p>
                {profile.email}
              </p>
            </div>

            <div className="profile-card">
              <h2>My Profile</h2>

              {editingProfile ? (
                <>
                  <label>
                    Full Name
                  </label>

                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) =>
                      updateProfile(
                        'name',
                        e.target.value
                      )
                    }
                  />

                  <label>
                    Email
                  </label>

                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) =>
                      updateProfile(
                        'email',
                        e.target.value
                      )
                    }
                  />

                  <label>
                    Phone Number
                  </label>

                  <input
                    type="tel"
                    placeholder="Enter phone number"
                    value={profile.phone}
                    onChange={(e) =>
                      updateProfile(
                        'phone',
                        e.target.value
                      )
                    }
                  />

                  <button
                    onClick={saveProfile}
                  >
                    Save Profile
                  </button>
                </>
              ) : (
                <>
                  <p>
                    <strong>
                      Full Name:
                    </strong>{' '}
                    {profile.name}
                  </p>

                  <p>
                    <strong>
                      Email:
                    </strong>{' '}
                    {profile.email}
                  </p>

                  <p>
                    <strong>
                      Phone:
                    </strong>{' '}
                    {profile.phone ||
                      'Not added'}
                  </p>

                  <p>
                    <strong>
                      User ID:
                    </strong>{' '}
                    TF-
                    {profile.name
                      .replace(
                        /\s/g,
                        ''
                      )
                      .slice(0, 6)
                      .toUpperCase() ||
                      'USER'}
                  </p>

                  <button
                    onClick={() =>
                      setEditingProfile(
                        true
                      )
                    }
                  >
                    Edit Profile
                  </button>
                </>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
