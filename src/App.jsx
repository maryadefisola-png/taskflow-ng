import { useState } from 'react'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('Dashboard')
  const [menuOpen, setMenuOpen] = useState(false)

  // Temporary display values.
  // We will connect these to Supabase next.
  const taskBalance = 0
  const affiliateBalance = 0
  const totalBalance = taskBalance + affiliateBalance

  const menuItems = [
    { name: 'Dashboard', icon: '🏠' },
    { name: 'Tasks', icon: '📝' },
    { name: 'Withdraw', icon: '💸' },
    { name: 'History', icon: '📜' },
    { name: 'Referrals', icon: '🤝' },
    { name: 'Profile', icon: '👤' },
  ]

  const openTab = (tab) => {
    setActiveTab(tab)
    setMenuOpen(false)
  }

  return (
    <div className="app">
      {/* =========================
          HEADER
      ========================= */}
      <header className="navbar">
        <div className="brand">
          <div className="brand-logo">TF</div>

          <div>
            <h1>TaskFlow NG</h1>
            <span>Earn. Complete. Grow.</span>
          </div>
        </div>

        <button
          type="button"
          className="menu-button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Open menu"
        >
          ☰
        </button>
      </header>

      {/* =========================
          SIDE MENU
      ========================= */}
      {menuOpen && (
        <>
          <div
            className="menu-overlay"
            onClick={() => setMenuOpen(false)}
          />

          <aside className="side-menu">
            <div className="side-menu-header">
              <div className="brand-logo">TF</div>

              <div>
                <strong>TaskFlow NG</strong>
                <small>Account Menu</small>
              </div>

              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="close-menu"
              >
                ×
              </button>
            </div>

            <nav>
              {menuItems.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  className={
                    activeTab === item.name
                      ? 'menu-item active'
                      : 'menu-item'
                  }
                  onClick={() => openTab(item.name)}
                >
                  <span>{item.icon}</span>
                  {item.name}
                </button>
              ))}
            </nav>

            <div className="menu-bottom">
              <button
                type="button"
                className="menu-item"
                onClick={() => alert('Settings coming soon.')}
              >
                <span>⚙️</span>
                Settings
              </button>

              <button
                type="button"
                className="menu-item logout-menu"
                onClick={() => alert('Logout will be connected to Supabase next.')}
              >
                <span>🚪</span>
                Log Out
              </button>
            </div>
          </aside>
        </>
      )}

      {/* =========================
          MAIN
      ========================= */}
      <main className="main-content">
        {/* =========================
            DASHBOARD
        ========================= */}
        {activeTab === 'Dashboard' && (
          <>
            <section className="welcome-section">
              <div>
                <p className="eyebrow">YOUR DASHBOARD</p>

                <h2>Welcome back 👋</h2>

                <p>
                  Complete tasks, earn rewards and grow your
                  balance.
                </p>
              </div>
            </section>

            {/* TOTAL BALANCE */}
            <section className="total-balance-card">
              <div>
                <span className="balance-label">
                  TOTAL BALANCE
                </span>

                <h2>
                  ₦{totalBalance.toLocaleString('en-NG', {
                    minimumFractionDigits: 2,
                  })}
                </h2>

                <p>Available across your two wallets</p>
              </div>

              <div className="balance-icon">
                ₦
              </div>
            </section>

            {/* TWO BALANCES */}
            <section className="balance-grid">
              <div className="wallet-card task-wallet">
                <div className="wallet-top">
                  <div className="wallet-icon">
                    📝
                  </div>

                  <span>Task Wallet</span>
                </div>

                <h3>
                  ₦{taskBalance.toLocaleString('en-NG', {
                    minimumFractionDigits: 2,
                  })}
                </h3>

                <p>Earned from completed tasks</p>
              </div>

              <div className="wallet-card affiliate-wallet">
                <div className="wallet-top">
                  <div className="wallet-icon">
                    🤝
                  </div>

                  <span>Affiliate Wallet</span>
                </div>

                <h3>
                  ₦{affiliateBalance.toLocaleString('en-NG', {
                    minimumFractionDigits: 2,
                  })}
                </h3>

                <p>Earned from referrals</p>
              </div>
            </section>

            {/* QUICK ACTIONS */}
            <section className="quick-actions">
              <div className="section-heading">
                <h2>Quick Actions</h2>
                <span>Get started</span>
              </div>

              <div className="quick-grid">
                <button
                  type="button"
                  onClick={() => openTab('Tasks')}
                  className="quick-card"
                >
                  <span>📝</span>
                  <strong>View Tasks</strong>
                  <small>Find tasks to complete</small>
                </button>

                <button
                  type="button"
                  onClick={() => openTab('Withdraw')}
                  className="quick-card"
                >
                  <span>💸</span>
                  <strong>Withdraw</strong>
                  <small>Withdraw your earnings</small>
                </button>

                <button
                  type="button"
                  onClick={() => openTab('Referrals')}
                  className="quick-card"
                >
                  <span>🤝</span>
                  <strong>Refer Friends</strong>
                  <small>Earn affiliate rewards</small>
                </button>
              </div>
            </section>

            {/* RECENT ACTIVITY */}
            <section className="activity-card">
              <div className="section-heading">
                <h2>Recent Activity</h2>
                <button
                  type="button"
                  onClick={() => openTab('History')}
                >
                  View all
                </button>
              </div>

              <div className="empty-state">
                <div className="empty-icon">📊</div>

                <h3>No activity yet</h3>

                <p>
                  Your completed tasks and transactions will
                  appear here.
                </p>
              </div>
            </section>
          </>
        )}

        {/* =========================
            TASKS
        ========================= */}
        {activeTab === 'Tasks' && (
          <section>
            <div className="page-heading">
              <p className="eyebrow">EARN REWARDS</p>
              <h2>Available Tasks</h2>

              <p>
                Complete tasks and submit proof for review.
              </p>
            </div>

            <div className="task-list">
              <div className="task-card">
                <div className="task-card-top">
                  <div className="task-icon">✓</div>

                  <span className="task-status">
                    Available
                  </span>
                </div>

                <h3>Daily Check-in</h3>

                <p>
                  Complete your daily check-in and submit
                  your proof.
                </p>

                <div className="task-footer">
                  <strong>₦50</strong>

                  <button
                    type="button"
                    onClick={() =>
                      alert(
                        'Task proof submission will be connected next.'
                      )
                    }
                  >
                    View Task
                  </button>
                </div>
              </div>

              <div className="task-card">
                <div className="task-card-top">
                  <div className="task-icon">⭐</div>

                  <span className="task-status">
                    Available
                  </span>
                </div>

                <h3>App Review</h3>

                <p>
                  Review an app and submit your proof of
                  completion.
                </p>

                <div className="task-footer">
                  <strong>₦100</strong>

                  <button
                    type="button"
                    onClick={() =>
                      alert(
                        'Task proof submission will be connected next.'
                      )
                    }
                  >
                    View Task
                  </button>
                </div>
              </div>

              <div className="task-card">
                <div className="task-card-top">
                  <div className="task-icon">🚀</div>

                  <span className="task-status">
                    Available
                  </span>
                </div>

                <h3>Social Task</h3>

                <p>
                  Complete the assigned social task and
                  submit proof.
                </p>

                <div className="task-footer">
                  <strong>₦150</strong>

                  <button
                    type="button"
                    onClick={() =>
                      alert(
                        'Task proof submission will be connected next.'
                      )
                    }
                  >
                    View Task
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* =========================
            WITHDRAW
        ========================= */}
        {activeTab === 'Withdraw' && (
          <section>
            <div className="page-heading">
              <p className="eyebrow">YOUR MONEY</p>
              <h2>Withdraw Funds</h2>

              <p>
                Choose which balance you want to withdraw
                from.
              </p>
            </div>

            <div className="withdraw-wallet-grid">
              <button
                type="button"
                className="withdraw-wallet task-withdraw"
                onClick={() =>
                  alert(
                    'Task Balance withdrawal form will be connected next.'
                  )
                }
              >
                <span>📝</span>

                <div>
                  <small>Task Balance</small>

                  <strong>
                    ₦
                    {taskBalance.toLocaleString('en-NG', {
                      minimumFractionDigits: 2,
                    })}
                  </strong>
                </div>

                <b>Withdraw →</b>
              </button>

              <button
                type="button"
                className="withdraw-wallet affiliate-withdraw"
                onClick={() =>
                  alert(
                    'Affiliate Balance withdrawal form will be connected next.'
                  )
                }
              >
                <span>🤝</span>

                <div>
                  <small>Affiliate Balance</small>

                  <strong>
                    ₦
                    {affiliateBalance.toLocaleString(
                      'en-NG',
                      {
                        minimumFractionDigits: 2,
                      }
                    )}
                  </strong>
                </div>

                <b>Withdraw →</b>
              </button>
            </div>

            <div className="info-card">
              <span>ℹ️</span>

              <div>
                <strong>Withdrawal information</strong>

                <p>
                  Select one of your two balances above.
                  Your withdrawal will be deducted from
                  the selected balance only.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* =========================
            HISTORY
        ========================= */}
        {activeTab === 'History' && (
          <section>
            <div className="page-heading">
              <p className="eyebrow">TRANSACTIONS</p>
              <h2>Withdrawal History</h2>

              <p>
                Track the status of your withdrawal
                requests.
              </p>
            </div>

            <div className="empty-state large-empty">
              <div className="empty-icon">📜</div>

              <h3>No withdrawals yet</h3>

              <p>
                Your withdrawal requests will appear here.
              </p>
            </div>
          </section>
        )}

        {/* =========================
            REFERRALS
        ========================= */}
        {activeTab === 'Referrals' && (
          <section>
            <div className="page-heading">
              <p className="eyebrow">AFFILIATE PROGRAM</p>
              <h2>Refer & Earn</h2>

              <p>
                Invite people and earn affiliate rewards.
              </p>
            </div>

            <div className="referral-hero">
              <div className="referral-icon">🤝</div>

              <h2>Grow your earnings</h2>

              <p>
                Share your referral link and earn rewards
                from eligible referrals.
              </p>

              <div className="referral-code-box">
                TASKFLOW2026
              </div>

              <button
                type="button"
                onClick={() =>
                  alert(
                    'Referral link copying will be connected next.'
                  )
                }
              >
                Copy Referral Link
              </button>
            </div>

            <div className="balance-grid">
              <div className="wallet-card affiliate-wallet">
                <div className="wallet-top">
                  <div className="wallet-icon">👥</div>
                  <span>Total Referrals</span>
                </div>

                <h3>0</h3>

                <p>Successful referrals</p>
              </div>

              <div className="wallet-card affiliate-wallet">
                <div className="wallet-top">
                  <div className="wallet-icon">💰</div>
                  <span>Affiliate Earnings</span>
                </div>

                <h3>
                  ₦
                  {affiliateBalance.toLocaleString(
                    'en-NG',
                    {
                      minimumFractionDigits: 2,
                    }
                  )}
                </h3>

                <p>Your referral earnings</p>
              </div>
            </div>
          </section>
        )}

        {/* =========================
            PROFILE
        ========================= */}
        {activeTab === 'Profile' && (
          <section>
            <div className="page-heading">
              <p className="eyebrow">ACCOUNT</p>
              <h2>My Profile</h2>

              <p>
                Manage your TaskFlow NG account.
              </p>
            </div>

            <div className="profile-card">
              <div className="profile-avatar">
                U
              </div>

              <h2>TaskFlow User</h2>

              <p>Connect your account to Supabase</p>

              <div className="profile-row">
                <span>Account status</span>
                <strong>Not connected</strong>
              </div>

              <div className="profile-row">
                <span>Referral code</span>
                <strong>TASKFLOW2026</strong>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* =========================
          MOBILE BOTTOM NAV
      ========================= */}
      <nav className="bottom-nav">
        <button
          type="button"
          className={
            activeTab === 'Dashboard' ? 'active' : ''
          }
          onClick={() => openTab('Dashboard')}
        >
          <span>🏠</span>
          <small>Home</small>
        </button>

        <button
          type="button"
          className={activeTab === 'Tasks' ? 'active' : ''}
          onClick={() => openTab('Tasks')}
        >
          <span>📝</span>
          <small>Tasks</small>
        </button>

        <button
          type="button"
          className={
            activeTab === 'Withdraw' ? 'active' : ''
          }
          onClick={() => openTab('Withdraw')}
        >
          <span>💸</span>
          <small>Withdraw</small>
        </button>

        <button
          type="button"
          className={
            activeTab === 'Profile' ? 'active' : ''
          }
          onClick={() => openTab('Profile')}
        >
          <span>👤</span>
          <small>Profile</small>
        </button>
      </nav>
    </div>
  )
}

export default App
