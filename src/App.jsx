import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        setError(userError.message)
        setLoading(false)
        return
      }

      if (!user) {
        setLoading(false)
        return
      }

      setUser(user)

      const { data, error: profileError } =
        await supabase
          .from('profiles')
          .select(
            'id, full_name, task_balance, affiliate_balance, is_active'
          )
          .eq('id', user.id)
          .single()

      if (profileError) {
        setError(profileError.message)
      } else {
        setProfile(data)
      }

      setLoading(false)
    }

    loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session?.user) {
          setUser(null)
          setProfile(null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loading-content">
          <div className="tf-logo">TF</div>
          <h2>TaskFlow NG</h2>
          <p>Loading your account...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">
            <div className="tf-logo">TF</div>

            <div>
              <h1>TaskFlow NG</h1>
              <p>Tasks. Rewards. Growth.</p>
            </div>
          </div>

          <div className="auth-heading">
            <h2>Welcome to TaskFlow NG</h2>
            <p>
              Please log in to access your dashboard.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="loading-page">
        <div className="loading-content">
          <div className="tf-logo">TF</div>

          <h2>Something went wrong</h2>

          <p>{error}</p>
        </div>
      </div>
    )
  }

  const taskBalance = Number(
    profile?.task_balance ?? 0
  )

  const affiliateBalance = Number(
    profile?.affiliate_balance ?? 0
  )

  const totalBalance =
    taskBalance + affiliateBalance

  const fullName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    'TaskFlow User'

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <div className="tf-logo small">TF</div>

          <div>
            <h1>TaskFlow NG</h1>
            <span>Rewards Dashboard</span>
          </div>
        </div>

        <div className="topbar-right">
          <div className="avatar">
            {fullName.charAt(0).toUpperCase()}
          </div>

          <div className="profile-button-text">
            <strong>{fullName}</strong>
            <span>{user.email}</span>
          </div>
        </div>
      </header>

      <main className="dashboard-container">
        <div className="dashboard-heading">
          <div>
            <span className="section-label">
              OVERVIEW
            </span>

            <h2>
              Welcome back, {fullName.split(' ')[0]} 👋
            </h2>

            <p>
              Here's an overview of your TaskFlow NG
              earnings.
            </p>
          </div>
        </div>

        <div className="balance-overview">
          <div className="balance-overview-content">
            <span>TOTAL BALANCE</span>

            <h2>
              ₦{totalBalance.toLocaleString(
                'en-NG',
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
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

              Task Balance
            </div>

            <h3>
              ₦{taskBalance.toLocaleString(
                'en-NG',
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}
            </h3>

            <p>
              Earned from completed tasks
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
              ₦{affiliateBalance.toLocaleString(
                'en-NG',
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}
            </h3>

            <p>
              Earned from referrals
            </p>
          </div>
        </div>

        <section className="dashboard-section">
          <div className="section-title-row">
            <h3>Quick Actions</h3>
          </div>

          <div className="action-grid">
            <button className="action-card">
              <div className="action-icon">
                T
              </div>

              <div>
                <strong>Complete Tasks</strong>
                <span>
                  Earn money by completing available
                  tasks.
                </span>
              </div>

              <b>→</b>
            </button>

            <button className="action-card">
              <div className="action-icon">
                W
              </div>

              <div>
                <strong>Withdraw</strong>
                <span>
                  Withdraw from your available
                  balance.
                </span>
              </div>

              <b>→</b>
            </button>

            <button className="action-card">
              <div className="action-icon">
                R
              </div>

              <div>
                <strong>Refer & Earn</strong>
                <span>
                  Invite people and earn affiliate
                  rewards.
                </span>
              </div>

              <b>→</b>
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
