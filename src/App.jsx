import { useState } from 'react'
import './App.css'

function App() {
  const [loggedIn, setLoggedIn] = useState(false)

  return (
    <div className="app">
      <header className="navbar">
        <h1>TaskFlow NG</h1>
        {loggedIn && (
          <button className="logout-btn" onClick={() => setLoggedIn(false)}>
            Log Out
          </button>
        )}
      </header>

      {!loggedIn ? (
        <main className="hero">
          <div className="hero-card">
            <span className="badge">🇳🇬 TaskFlow NG</span>

            <h2>Complete Tasks.<br />Earn Rewards.</h2>

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
        <main className="dashboard">
          <div className="welcome">
            <span>Welcome back 👋</span>
            <h2>Your Dashboard</h2>
            <p>Track your earnings and rewards in one place.</p>
          </div>
<nav className="dashboard-nav">
  <button className="nav-item active">Dashboard</button>
  <button className="nav-item">Tasks</button>
  <button className="nav-item">Withdraw</button>
  <button className="nav-item">Referrals</button>
</nav>
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
      )}
    </div>
  )
}

export default App
