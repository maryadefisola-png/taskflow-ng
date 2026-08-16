import { useState } from 'react'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('Dashboard')

  const tasks = [
    {
      id: 1,
      title: 'Daily Check-in',
      description: 'Complete your daily check-in.',
      reward: '₦50',
    },
    {
      id: 2,
      title: 'App Review',
      description: 'Review an app and share your feedback.',
      reward: '₦100',
    },
    {
      id: 3,
      title: 'Social Task',
      description: 'Complete a simple social media task.',
      reward: '₦150',
    },
  ]

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
              <strong>₦0.00</strong>
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

            {tasks.map((task) => (
              <div className="task-card" key={task.id}>
                <h3>{task.title}</h3>
                <p>{task.description}</p>
                <strong>{task.reward}</strong>

                <button
                  onClick={() => alert(`${task.title} selected!`)}
                >
                  Start Task
                </button>
              </div>
            ))}
          </section>
        )}

        {activeTab === 'Withdraw' && (
          <section>
            <h2>Withdraw</h2>
            <p>Your withdrawal balance is ₦0.00.</p>
          </section>
        )}

        {activeTab === 'Referrals' && (
          <section>
            <h2>Referrals</h2>
            <p>Invite friends and earn rewards.</p>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
