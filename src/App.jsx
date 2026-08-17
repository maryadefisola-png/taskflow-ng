import { useState } from 'react'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('Dashboard')

  const [balance, setBalance] = useState(() => {
    const saved = localStorage.getItem('taskflow_balance')
    return saved ? Number(saved) : 0
  })

  const [completedTasks, setCompletedTasks] = useState(() => {
    const saved = localStorage.getItem('taskflow_completed_tasks')
    return saved ? JSON.parse(saved) : []
  })

  const [withdrawals, setWithdrawals] = useState(() => {
    const saved = localStorage.getItem('taskflow_withdrawals')
    return saved ? JSON.parse(saved) : []
  })

  const [referrals, setReferrals] = useState(() => {
    const saved = localStorage.getItem('taskflow_referrals')
    return saved ? Number(saved) : 0
  })

  const [referralBalance, setReferralBalance] = useState(() => {
    const saved = localStorage.getItem('taskflow_referral_balance')
    return saved ? Number(saved) : 0
  })

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

  const [bankName, setBankName] = useState('')
  const [accountName, setAccountName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')

  const referralCode = 'TASKFLOW2026'
  const referralLink = `${window.location.origin}?ref=${referralCode}`

  const tasks = [
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

  const completeTask = (task) => {
    if (completedTasks.includes(task.id)) {
      alert('You have already completed this task.')
      return
    }

    const newBalance = balance + task.reward
    const newCompletedTasks = [...completedTasks, task.id]

    setBalance(newBalance)
    setCompletedTasks(newCompletedTasks)

    localStorage.setItem('taskflow_balance', newBalance)
    localStorage.setItem(
      'taskflow_completed_tasks',
      JSON.stringify(newCompletedTasks)
    )

    alert(`Task completed! You earned ₦${task.reward}.`)
  }

  const handleWithdraw = (event) => {
    event.preventDefault()

    const amount = Number(withdrawAmount)

    if (!bankName || !accountName || !accountNumber || !amount) {
      alert('Please fill in all withdrawal details.')
      return
    }

    if (accountNumber.length !== 10) {
      alert('Please enter a valid 10-digit account number.')
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

    const newWithdrawals = [newWithdrawal, ...withdrawals]

    setBalance(newBalance)
    setWithdrawals(newWithdrawals)

    localStorage.setItem('taskflow_balance', newBalance)
    localStorage.setItem(
      'taskflow_withdrawals',
      JSON.stringify(newWithdrawals)
    )

    setBankName('')
    setAccountName('')
    setAccountNumber('')
    setWithdrawAmount('')

    alert(`Withdrawal request submitted for ₦${amount.toFixed(2)}.`)

    setActiveTab('History')
  }

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      alert('Referral link copied!')
    } catch {
      alert('Copy failed. Please copy the link manually.')
    }
  }

  const simulateReferral = () => {
    const reward = 50

    const newReferrals = referrals + 1
    const newReferralBalance = referralBalance + reward

    setReferrals(newReferrals)
    setReferralBalance(newReferralBalance)

    localStorage.setItem('taskflow_referrals', newReferrals)
    localStorage.setItem(
      'taskflow_referral_balance',
      newReferralBalance
    )

    alert(`New referral added! You earned ₦${reward}.`)
  }

  const saveProfile = () => {
    localStorage.setItem('taskflow_profile', JSON.stringify(profile))
    setEditingProfile(false)
    alert('Profile saved successfully!')
  }

  const updateProfile = (field, value) => {
    setProfile({
      ...profile,
      [field]: value,
    })
  }

  return (
    <div className="app">
      <header className="navbar">
        <h1>TaskFlow NG</h1>

        <button
          className="logout-btn"
          onClick={() => alert('Logged out')}
        >
          Log Out
        </button>
      </header>

      <main className="main-content">
        <h2>Welcome back 👋</h2>

        <p>Your Dashboard</p>

        <p>Track your earnings and rewards in one place.</p>

        <nav className="tabs">
          <button onClick={() => setActiveTab('Dashboard')}>
            Dashboard
          </button>

          <button onClick={() => setActiveTab('Tasks')}>
            Tasks
          </button>

          <button onClick={() => setActiveTab('Withdraw')}>
            Withdraw
          </button>

          <button onClick={() => setActiveTab('History')}>
            History
          </button>

          <button onClick={() => setActiveTab('Referrals')}>
            Referrals
          </button>

          <button onClick={() => setActiveTab('Profile')}>
            Profile
          </button>
        </nav>

        {activeTab === 'Dashboard' && (
          <section>
            <div className="balance-card">
              <h3>Task Balance</h3>

              <strong>₦{balance.toFixed(2)}</strong>

              <p>From completed tasks</p>
            </div>

            <div className="balance-card">
              <h3>Affiliate Balance</h3>

              <strong>₦{referralBalance.toFixed(2)}</strong>

              <p>From referrals</p>
            </div>
          </section>
        )}

        {activeTab === 'Tasks' && (
          <section className="tasks-section">
            <h2>Available Tasks</h2>

            {tasks.map((task) => {
              const completed = completedTasks.includes(task.id)

              return (
                <div className="task-card" key={task.id}>
                  <h3>{task.title}</h3>

                  <p>{task.description}</p>

                  <strong>₦{task.reward}</strong>

                  <button
                    onClick={() => completeTask(task)}
                    disabled={completed}
                  >
                    {completed ? 'Completed ✓' : 'Complete Task'}
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

              <strong>₦{balance.toFixed(2)}</strong>
            </div>

            <div className="withdraw-card">
              <h2>Withdraw Funds</h2>

              <form onSubmit={handleWithdraw}>
                <label>Bank Name</label>

                <input
                  type="text"
                  placeholder="Enter bank name"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />

                <label>Account Name</label>

                <input
                  type="text"
                  placeholder="Enter account name"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                />

                <label>Account Number</label>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength="10"
                  placeholder="10-digit account number"
                  value={accountNumber}
                  onChange={(e) =>
                    setAccountNumber(e.target.value.replace(/\D/g, ''))
                  }
                />

                <label>Withdrawal Amount</label>

                <input
                  type="number"
                  min="100"
                  placeholder="Minimum ₦100"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
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
                <p>No withdrawals yet.</p>
              </div>
            ) : (
              withdrawals.map((withdrawal) => (
                <div
                  className="withdrawal-card"
                  key={withdrawal.id}
                >
                  <h3>₦{withdrawal.amount.toFixed(2)}</h3>

                  <p>
                    <strong>Bank:</strong> {withdrawal.bankName}
                  </p>

                  <p>
                    <strong>Account:</strong> {withdrawal.accountName}
                  </p>

                  <p>
                    <strong>Account Number:</strong>{' '}
                    {withdrawal.accountNumber}
                  </p>

                  <p>
                    <strong>Date:</strong> {withdrawal.date}
                  </p>

                  <span className="pending-status">
                    {withdrawal.status}
                  </span>
                </div>
              ))
            )}
          </section>
        )}

        {activeTab === 'Referrals' && (
          <section className="referral-section">
            <div className="balance-card">
              <h2>Refer & Earn</h2>

              <p>
                Invite friends to TaskFlow NG and earn rewards.
              </p>

              <h3>Your Referral Code</h3>

              <div className="referral-code">
                {referralCode}
              </div>

              <h3>Your Referral Link</h3>

              <input
                type="text"
                value={referralLink}
                readOnly
              />

              <button onClick={copyReferralLink}>
                Copy Referral Link
              </button>
            </div>

            <div className="balance-card">
              <h3>Total Referrals</h3>

              <strong>{referrals}</strong>

              <p>People who joined using your referral.</p>
            </div>

            <div className="balance-card">
              <h3>Referral Earnings</h3>

              <strong>₦{referralBalance.toFixed(2)}</strong>

              <p>Earned from successful referrals.</p>
            </div>

            <div className="balance-card">
              <h3>Demo Testing</h3>

              <p>
                Use this button only to test the referral reward system.
              </p>

              <button onClick={simulateReferral}>
                Simulate Referral +₦50
              </button>
            </div>
          </section>
        )}

        {activeTab === 'Profile' && (
          <section className="profile-section">
            <div className="profile-card">
              <div className="profile-avatar">
                {profile.name.charAt(0).toUpperCase()}
              </div>

              <h2>{profile.name}</h2>

              <p>{profile.email}</p>
            </div>

            <div className="profile-card">
              <h2>My Profile</h2>

              {editingProfile ? (
                <>
                  <label>Full Name</label>

                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) =>
                      updateProfile('name', e.target.value)
                    }
                  />

                  <label>Email</label>

                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) =>
                      updateProfile('email', e.target.value)
                    }
                  />

                  <label>Phone Number</label>

                  <input
                    type="tel"
                    placeholder="Enter phone number"
                    value={profile.phone}
                    onChange={(e) =>
                      updateProfile('phone', e.target.value)
                    }
                  />

                  <button onClick={saveProfile}>
                    Save Profile
                  </button>
                </>
              ) : (
                <>
                  <p>
                    <strong>Full Name:</strong> {profile.name}
                  </p>

                  <p>
                    <strong>Email:</strong> {profile.email}
                  </p>

                  <p>
                    <strong>Phone:</strong>{' '}
                    {profile.phone || 'Not added'}
                  </p>

                  <p>
                    <strong>User ID:</strong> TF-
                    {profile.name
                      .replace(/\s/g, '')
                      .slice(0, 6)
                      .toUpperCase() || 'USER'}
                  </p>

                  <button onClick={() => setEditingProfile(true)}>
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
