import { useState } from 'react'
import './App.css'

function App() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [activePage, setActivePage] = useState('dashboard')

  const renderPage = () => {
    if (activePage === 'tasks') {
      return (
        <main className="dashboard">
          <div className="welcome">
            <span>Earn more 💰</span>
            <h2>Available Tasks</h2>
            <p>Complete tasks and grow your Task Balance.</p>
          </div>

          <section className="balance-card">
            <span>Available Balance</span>
            <strong>₦0.00</strong>
            <small>Complete tasks to start earning.</small>
          </section>
        </main>
      )
    }

    if (activePage === 'withdraw') {
      return (
        <main className="dashboard">
          <div className="welcome">
            <span>Get paid 💸</span>
            <h2>Withdraw</h2>
            <p>Withdraw your available earnings.</p>
          </div>

          <section className="balance-card">
            <span>Withdrawable Balance</span>
            <strong>₦0.00</strong>
            <small>Your available withdrawal balance.</small>
          </section>

          <button className="primary-btn" disabled>
            Withdraw Funds
          </button>
        </main>
      )
    }

    if (activePage === 'referrals') {
      return (
        <main className="dashboard">
          <div className="welcome">
            <span>Invite & earn 🤝</span>
            <h2>Referrals</h2>
            <p>Invite friends and earn affiliate rewards.</p>
          </div>

          <section className="balance-card">
            <span>Affiliate Balance</span>
            <strong>₦0.00</strong>
            <small>Your referral earnings will appear here.</small>
          </section>
        </main>
      )
    }

    return (
      <main className="dashboard">
        <div className="welcome">
          <span>Welcome back 👋</span>
          <h2>Your Dashboard</h2>
          <p>Track your earnings and rewards in one place.</p>
        </div>

        <div className="balance-grid">
          <section className="balance-card">
            <span>Task Balance</span>
            <strong>₦0.00</strong>
            <small>From completed tasks</small>
          </section>

          <section className="balance-card">
            <span>Affiliate Balance</span>
            <strong>₦0.00</strong>
            <small>From referrals</small>
          </section>
        </div>
      </main>
    )
  }

  return (
    <div className="app">
      <header className="navbar">
        <h1>TaskFlow NG</h1>

        {loggedIn && (
          <button
            className="logout-btn"
            onClick={() => {
              setLoggedIn(false)
              setActivePage('dashboard')
            }}
          >
            Log Out
          </button>
        )}
      </header>

      {!loggedIn ? (
        <main className="hero">
          <div className="hero-card">
            <span className="badge">🇳🇬 TaskFlow NG</span>

            <h2>
              Complete Tasks.
              <br />
              Earn Rewards.
            </h2>

            <p>
              Complete simple tasks, earn rewards, and grow your balance
              with TaskFlow NG.
            </p>

            <button
              className="primary-btn"
              onClick={() => setLoggedIn(true)}
            >
              Get Started →
            </button>
          </div>
        </main>
      ) : (
        <>
          <nav
  className="dashboard-nav"
  style={{
    position: 'relative',
    zIndex: 1000,
  }}
>
            <button
              className={`nav-item ${
                activePage === 'dashboard' ? 'active' : ''
              }`}
              onClick={() => setActivePage('dashboard')}
            >
              Dashboard
            </button>

            <button
  className="nav-item"
  onClick={() => setActivePage('tasks')}
>
  TEST TASKS
</button>
            <button
              className={`nav-item ${
                activePage === 'withdraw' ? 'active' : ''
              }`}
              onClick={() => setActivePage('withdraw')}
            >
              Withdraw
            </button>

            <button
              className={`nav-item ${
                activePage === 'referrals' ? 'active' : ''
              }`}
              onClick={() => setActivePage('referrals')}
            >
              Referrals
            </button>
          </nav>

          {renderPage()}
        </>
      )}
    </div>
  )
}

export default App
