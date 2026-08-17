import { useState } from 'react'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('Dashboard')

  const [balance, setBalance] = useState(() => {
    const savedBalance = localStorage.getItem('taskflow_balance')
    return savedBalance ? Number(savedBalance) : 0
  })

  const [completedTasks, setCompletedTasks] = useState(() => {
    const savedTasks = localStorage.getItem('taskflow_completed_tasks')
    return savedTasks ? JSON.parse(savedTasks) : []
  })

  const [bankName, setBankName] = useState('')
  const [accountName, setAccountName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')

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

    setBalance(newBalance)

    localStorage.setItem('taskflow_balance', newBalance)

    alert(
      `Withdrawal request submitted for ₦${amount.toFixed(
        2
      )}. Your request is pending.`
    )

    setWithdrawAmount('')
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

          <button onClick={() => setActiveTab('Referrals')}>
            Referrals
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

              <strong>₦0.00</strong>

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

              <p>Enter your bank details below.</p>

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
                    setAccountNumber(
                      e.target.value.replace(/\D/g, '')
                    )
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

        {activeTab === 'Referrals' && (
          <section className="balance-card">
            <h2>Referrals</h2>

            <p>Invite friends and earn rewards.</p>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
