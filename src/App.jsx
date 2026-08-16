import { useState } from 'react'

function App() {
  const [activeTab, setActiveTab] = useState('Dashboard')

  return (
    <div className="app">
      <header className="navbar">
        <h1>TaskFlow NG</h1>
        <button className="logout-btn">Log Out</button>
      </header>

      <main className="container">
        <section className="welcome">
          <h2>Welcome back 👋</h2>
          <p>Your Dashboard</p>
          <span>Track your earnings and rewards in one place.</span>
        </section>

        <section className="balance-grid">
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

        <nav className="tabs">
          {['Dashboard', 'Tasks', 'Withdraw', 'Referrals'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={activeTab === tab ? 'active' : ''}
            >
              {tab}
            </button>
          ))}
        </nav>

        <section className="content-card">
          <h2>{activeTab}</h2>

          {activeTab === 'Dashboard' && (
            <p>Welcome to your TaskFlow NG dashboard.</p>
          )}

          {activeTab === 'Tasks' && (
            <p>Your available tasks will appear here.</p>
          )}

          {activeTab === 'Withdraw' && (
            <p>Your withdrawal options will appear here.</p>
          )}

          {activeTab === 'Referrals' && (
            <p>Your referral information will appear here.</p>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
