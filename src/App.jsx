import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      setUser(user)
      setLoading(false)
    }

    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
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

  return (
    <div className="app">
      <main className="dashboard-container">
        <div className="dashboard-heading">
          <div>
            <span className="section-label">
              TASKFLOW NG
            </span>

            <h2>
              {user
                ? 'Welcome back 👋'
                : 'Welcome to TaskFlow NG'}
            </h2>

            <p>
              {user
                ? user.email
                : 'Your real rewards platform is connecting.'}
            </p>
          </div>
        </div>

        <div className="balance-overview">
          <div className="balance-overview-content">
            <span>TOTAL BALANCE</span>
            <h2>₦0.00</h2>
            <p>Your real wallet balance</p>
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

            <h3>₦0.00</h3>
            <p>Earned from completed tasks</p>
          </div>

          <div className="wallet-card">
            <div className="wallet-card-header">
              <div className="wallet-symbol affiliate">
                A
              </div>
              Affiliate Balance
            </div>

            <h3>₦0.00</h3>
            <p>Earned from referrals</p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
