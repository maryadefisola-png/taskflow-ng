import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

function App() {
const [user, setUser] = useState(null)
const [profile, setProfile] = useState(null)
const [tasks, setTasks] = useState([])
const [withdrawals, setWithdrawals] = useState([])

const [loading, setLoading] = useState(true)
const [tasksLoading, setTasksLoading] = useState(false)
const [withdrawalsLoading, setWithdrawalsLoading] = useState(false)

const [error, setError] = useState('')
const [message, setMessage] = useState('')

const [activePage, setActivePage] = useState('Dashboard')

const [selectedTask, setSelectedTask] = useState(null)
const [proof, setProof] = useState('')
const [submitting, setSubmitting] = useState(false)

const [withdrawAmount, setWithdrawAmount] = useState('')
const [bankName, setBankName] = useState('')
const [accountNumber, setAccountNumber] = useState('')
const [accountName, setAccountName] = useState('')
const [withdrawSubmitting, setWithdrawSubmitting] = useState(false)

const MIN_WITHDRAWAL = 1000

useEffect(() => {
loadAccount()

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

useEffect(() => {
if (user) {
loadTasks()
loadWithdrawals()
}
}, [user])

const loadAccount = async () => {
setLoading(true)
setError('')

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

const { data, error: profileError } = await supabase
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

const loadTasks = async () => {
setTasksLoading(true)

const { data, error: tasksError } = await supabase
  .from('tasks')
  .select(
    'id, title, description, reward, task_type, verification_method, max_completions, starts_at, ends_at'
  )
  .eq('is_active', true)
  .order('created_at', {
    ascending: false,
  })

if (tasksError) {
  setMessage(tasksError.message)
} else {
  setTasks(data || [])
}

setTasksLoading(false)

}

const loadWithdrawals = async () => {
setWithdrawalsLoading(true)

const { data, error: withdrawalError } = await supabase
  .from('withdrawals')
  .select(
    'id, amount, bank_name, account_number, account_name, payment_reference, status, created_at'
  )
  .eq('user_id', user.id)
  .order('created_at', {
    ascending: false,
  })

if (withdrawalError) {
  setMessage(withdrawalError.message)
} else {
  setWithdrawals(data || [])
}

setWithdrawalsLoading(false)

}

const submitProof = async (event) => {
event.preventDefault()

if (!selectedTask) return

const cleanProof = proof.trim()

if (!cleanProof) {
  setMessage('Please enter your proof.')
  return
}

setSubmitting(true)
setMessage('')

const { error: submissionError } = await supabase
  .from('task_submissions')
  .insert({
    user_id: user.id,
    task_id: selectedTask.id,
    proof: cleanProof,
    status: 'Pending',
    reward: selectedTask.reward,
  })

if (submissionError) {
  if (submissionError.code === '23505') {
    setMessage(
      'You have already submitted this task.'
    )
  } else {
    setMessage(submissionError.message)
  }

  setSubmitting(false)
  return
}

setMessage(
  'Proof submitted successfully. Your submission is now pending review.'
)

setProof('')
setSelectedTask(null)
setSubmitting(false)

}

const submitWithdrawal = async (event) => {
event.preventDefault()

setMessage('')

const amount = Number(withdrawAmount)
const taskBalance = Number(profile?.task_balance ?? 0)
const affiliateBalance = Number(
  profile?.affiliate_balance ?? 0
)

const totalBalance = taskBalance + affiliateBalance

if (!bankName.trim()) {
  setMessage('Please enter your bank name.')
  return
}

if (!accountNumber.trim()) {
  setMessage('Please enter your account number.')
  return
}

if (!accountName.trim()) {
  setMessage('Please enter the account name.')
  return
}

if (!amount || amount <= 0) {
  setMessage('Please enter a valid withdrawal amount.')
  return
}

if (amount < MIN_WITHDRAWAL) {
  setMessage(
    `Minimum withdrawal amount is ₦${MIN_WITHDRAWAL.toLocaleString(
      'en-NG'
    )}.`
  )
  return
}

if (amount > totalBalance) {
  setMessage(
    'You do not have enough available balance for this withdrawal.'
  )
  return
}

setWithdrawSubmitting(true)

const { error: withdrawalError } = await supabase
  .from('withdrawals')
  .insert({
    user_id: user.id,
    amount,
    bank_name: bankName.trim(),
    account_number: accountNumber.trim(),
    account_name: accountName.trim(),
    status: 'pending',
  })

if (withdrawalError) {
  setMessage(withdrawalError.message)
  setWithdrawSubmitting(false)
  return
}

setWithdrawAmount('')
setBankName('')
setAccountNumber('')
setAccountName('')

setMessage(
  'Withdrawal request submitted successfully. It is now pending review.'
)

await loadWithdrawals()

setWithdrawSubmitting(false)

}

const formatMoney = (value) => {
return Number(value || 0).toLocaleString('en-NG', {
minimumFractionDigits: 2,
maximumFractionDigits: 2,
})
}

const formatDate = (value) => {
if (!value) return ''

return new Date(value).toLocaleString('en-NG', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

}

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

    {activePage === 'Dashboard' && (
      <>
        <div className="dashboard-heading">
          <div>
            <span className="section-label">
              OVERVIEW
            </span>

            <h2>
              Welcome back,{' '}
              {fullName.split(' ')[0]} 👋
            </h2>

            <p>
              Here's an overview of your TaskFlow
              NG earnings.
            </p>
          </div>
        </div>

        <div className="balance-overview">
          <div className="balance-overview-content">
            <span>TOTAL BALANCE</span>

            <h2>
              ₦{formatMoney(totalBalance)}
            </h2>

            <p>
              Your combined Task and Affiliate
              balance
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
              ₦{formatMoney(taskBalance)}
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
              ₦{formatMoney(affiliateBalance)}
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

            <button
              className="action-card"
              onClick={() =>
                setActivePage('Tasks')
              }
            >
              <div className="action-icon">
                T
              </div>

              <div>
                <strong>
                  Complete Tasks
                </strong>

                <span>
                  Earn money by completing
                  available tasks.
                </span>
              </div>

              <b>→</b>
            </button>

            <button
              className="action-card"
              onClick={() =>
                setActivePage('Wallet')
              }
            >
              <div className="action-icon">
                W
              </div>

              <div>
                <strong>
                  Withdraw
                </strong>

                <span>
                  Withdraw from your
                  available balance.
                </span>
              </div>

              <b>→</b>
            </button>

            <button
              className="action-card"
              onClick={() =>
                setMessage(
                  'Refer & Earn will be available in the next section.'
                )
              }
            >
              <div className="action-icon">
                R
              </div>

              <div>
                <strong>
                  Refer & Earn
                </strong>

                <span>
                  Invite people and earn
                  affiliate rewards.
                </span>
              </div>

              <b>→</b>
            </button>

          </div>
        </section>
      </>
    )}

    {activePage === 'Tasks' && (
      <>
        <div className="page-heading">
          <span className="section-label">
            EARN
          </span>

          <h2>Available Tasks</h2>

          <p>
            Complete tasks and submit proof for
            review.
          </p>
        </div>

        {message && (
          <div className="form-message">
            {message}
          </div>
        )}

        {tasksLoading ? (
          <div className="empty-card large">
            <strong>
              Loading tasks...
            </strong>

            <span>
              Getting available tasks from
              TaskFlow NG.
            </span>
          </div>
        ) : tasks.length === 0 ? (
          <div className="empty-card large">
            <strong>
              No tasks available
            </strong>

            <span>
              Check back later for new
              opportunities.
            </span>
          </div>
        ) : (
          <div className="task-list">
            {tasks.map((task, index) => (
              <div
                className="real-task-card"
                key={task.id}
              >
                <div className="task-card-heading">
                  <div className="task-number">
                    {index + 1}
                  </div>

                  <span>
                    {task.task_type ||
                      'Task'}
                  </span>
                </div>

                <h3>{task.title}</h3>

                <p>
                  {task.description}
                </p>

                <div className="task-card-bottom">
                  <div>
                    <small>
                      REWARD
                    </small>

                    <strong>
                      ₦
                      {formatMoney(
                        task.reward
                      )}
                    </strong>
                  </div>

                  <button
                    className="primary-button small-button"
                    onClick={() =>
                      setSelectedTask(
                        task
                      )
                    }
                  >
                    Submit Proof
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    )}

    {activePage === 'Wallet' && (
      <>
        <div className="page-heading">
          <span className="section-label">
            WALLET
          </span>

          <h2>Withdraw Funds</h2>

          <p>
            Request a withdrawal from your
            available TaskFlow NG balance.
          </p>
        </div>

        {message && (
          <div className="form-message">
            {message}
          </div>
        )}

        <div className="balance-overview">
          <div className="balance-overview-content">
            <span>AVAILABLE BALANCE</span>

            <h2>
              ₦{formatMoney(totalBalance)}
            </h2>

            <p>
              Minimum withdrawal:
              ₦{MIN_WITHDRAWAL.toLocaleString(
                'en-NG'
              )}
            </p>
          </div>

          <div className="balance-mark">
            ₦
          </div>
        </div>

        <div className="profile-card">
          <h2>Bank Details</h2>

          <p>
            Enter the bank account you want
            your withdrawal sent to.
          </p>

          <form onSubmit={submitWithdrawal}>

            <label>Bank Name</label>

            <input
              value={bankName}
              onChange={(e) =>
                setBankName(e.target.value)
              }
              placeholder="e.g. Opay, Moniepoint, UBA"
            />

            <label>Account Number</label>

            <input
              value={accountNumber}
              onChange={(e) =>
                setAccountNumber(
                  e.target.value.replace(
                    /\D/g,
                    ''
                  )
                )
              }
              placeholder="Enter account number"
              inputMode="numeric"
              maxLength="10"
            />

            <label>Account Name</label>

            <input
              value={accountName}
              onChange={(e) =>
                setAccountName(e.target.value)
              }
              placeholder="Enter account name"
            />

            <label>Withdrawal Amount</label>

            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) =>
                setWithdrawAmount(
                  e.target.value
                )
              }
              placeholder={`Minimum ₦${MIN_WITHDRAWAL}`}
              min={MIN_WITHDRAWAL}
              max={totalBalance}
            />

            <button
              type="submit"
              className="primary-button"
              disabled={withdrawSubmitting}
            >
              {withdrawSubmitting
                ? 'Submitting...'
                : 'Request Withdrawal'}
            </button>

          </form>
        </div>

        <section className="dashboard-section">

          <div className="section-title-row">
            <h3>Withdrawal History</h3>
          </div>

          {withdrawalsLoading ? (
            <div className="empty-card">
              <strong>
                Loading withdrawal history...
              </strong>
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="empty-card">
              <strong>
                No withdrawals yet
              </strong>

              <span>
                Your withdrawal requests will
                appear here.
              </span>
            </div>
          ) : (
            <div className="mini-task-list">

              {withdrawals.map(
                (withdrawal) => (
                  <div
                    className="mini-task"
                    key={withdrawal.id}
                  >
                    <div className="mini-task-icon">
                      ₦
                    </div>

                    <div className="mini-task-info">
                      <strong>
                        ₦
                        {formatMoney(
                          withdrawal.amount
                        )}
                      </strong>

                      <span>
                        {withdrawal.bank_name}{' '}
                        ••••
                        {String(
                          withdrawal.account_number ||
                            ''
                        ).slice(-4)}
                      </span>

                      <span>
                        {formatDate(
                          withdrawal.created_at
                        )}
                      </span>
                    </div>

                    <strong>
                      {withdrawal.status}
                    </strong>
                  </div>
                )
              )}

            </div>
          )}

        </section>
      </>
    )}

    {selectedTask && (
      <div
        className="auth-page"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          background:
            'rgba(23, 32, 51, 0.45)',
        }}
      >
        <div className="auth-card">

          <div className="auth-heading">
            <h2>
              Submit Proof
            </h2>

            <p>
              {selectedTask.title}
            </p>
          </div>

          <form onSubmit={submitProof}>

            <label>
              Proof of Completion
            </label>

            <textarea
              value={proof}
              onChange={(e) =>
                setProof(
                  e.target.value
                )
              }
              placeholder="Describe what you completed or paste your proof link here..."
              rows="6"
              style={{
                width: '100%',
                border:
                  '1px solid #dfe3ea',
                borderRadius: '11px',
                padding: '13px 14px',
                resize: 'vertical',
                outline: 'none',
              }}
            />

            <button
              type="submit"
              className="primary-button"
              disabled={submitting}
            >
              {submitting
                ? 'Submitting...'
                : 'Submit for Review'}
            </button>

            <button
              type="button"
              className="outline-button"
              style={{
                width: '100%',
                marginTop: '10px',
              }}
              onClick={() => {
                setSelectedTask(null)
                setProof('')
              }}
            >
              Cancel
            </button>

          </form>
        </div>
      </div>
    )}

    <nav className="bottom-nav">

      <button
        className={
          activePage === 'Dashboard'
            ? 'active'
            : ''
        }
        onClick={() =>
          setActivePage('Dashboard')
        }
      >
        <span>⌂</span>
        Home
      </button>

      <button
        className={
          activePage === 'Tasks'
            ? 'active'
            : ''
        }
        onClick={() =>
          setActivePage('Tasks')
        }
      >
        <span>✓</span>
        Tasks
      </button>

      <button
        className={
          activePage === 'Wallet'
            ? 'active'
            : ''
        }
        onClick={() =>
          setActivePage('Wallet')
        }
      >
        <span>₦</span>
        Wallet
      </button>

      <button
        onClick={() =>
          setMessage(
            'More features will be added here.'
          )
        }
      >
        <span>☰</span>
        More
      </button>

    </nav>

  </main>
</div>

)
}

export default App
