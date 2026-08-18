import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [tasksLoading, setTasksLoading] = useState(false)
  const [error, setError] = useState('')
  const [activePage, setActivePage] = useState('Dashboard')

  const [selectedTask, setSelectedTask] = useState(null)
  const [proof, setProof] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')

  const [authMode, setAuthMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    loadAccount()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null

        setUser(currentUser)

        if (currentUser) {
          await loadProfile(currentUser)
          await loadTasks()
        } else {
          setProfile(null)
          setTasks([])
        }

        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const loadAccount = async () => {
    setLoading(true)
    setError('')

    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      setError(userError.message)
      setLoading(false)
      return
    }

    setUser(currentUser)

    if (currentUser) {
      await loadProfile(currentUser)
      await loadTasks()
    }

    setLoading(false)
  }

  const loadProfile = async (currentUser) => {
    const { data, error: profileError } = await supabase
      .from('profiles')
      .select(
        'id, full_name, task_balance, affiliate_balance, is_active'
      )
      .eq('id', currentUser.id)
      .single()

    if (profileError) {
      console.error('Profile error:', profileError.message)
      setProfile(null)
    } else {
      setProfile(data)
    }
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
      setMessageType('error')
    } else {
      setTasks(data || [])
    }

    setTasksLoading(false)
  }

  const handleAuth = async (event) => {
    event.preventDefault()

    setAuthLoading(true)
    setAuthError('')
    setAuthMessage('')

    const cleanEmail = email.trim().toLowerCase()

    if (!cleanEmail || !password) {
      setAuthError('Please enter your email and password.')
      setAuthLoading(false)
      return
    }

    if (authMode === 'signup' && !fullName.trim()) {
      setAuthError('Please enter your full name.')
      setAuthLoading(false)
      return
    }

    try {
      if (authMode === 'login') {
        const { error: loginError } =
          await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          })

        if (loginError) {
          setAuthError(loginError.message)
        }
      } else {
        const { data, error: signupError } =
          await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: {
                full_name: fullName.trim(),
              },
            },
          })

        if (signupError) {
          setAuthError(signupError.message)
        } else if (data.session) {
          setAuthMessage(
            'Account created successfully.'
          )
        } else {
          setAuthMessage(
            'Account created. Please check your email to confirm your account before logging in.'
          )
          setAuthMode('login')
        }
      }
    } catch (err) {
      setAuthError(
        err?.message ||
          'Something went wrong. Please try again.'
      )
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setTasks([])
    setActivePage('Dashboard')
  }

  const openTaskSubmission = (task) => {
    setMessage('')
    setProof('')
    setSelectedTask(task)
  }

  const closeTaskSubmission = () => {
    setSelectedTask(null)
    setProof('')
    setSubmitting(false)
  }

  const submitProof = async (event) => {
    event.preventDefault()

    if (!selectedTask || !user) {
      return
    }

    const cleanProof = proof.trim()

    if (!cleanProof) {
      setMessage(
        'Please enter your proof before submitting.'
      )
      setMessageType('error')
      return
    }

    setSubmitting(true)
    setMessage('')

    try {
      const { error: submissionError } = await supabase
        .from('task_submissions')
        .insert({
          user_id: user.id,
          task_id: selectedTask.id,
          proof: cleanProof,
          status: 'Pending',
          reward: Number(selectedTask.reward),
        })

      if (submissionError) {
        console.error(
          'Task submission error:',
          submissionError
        )

        if (submissionError.code === '23505') {
          setMessage(
            'You have already submitted this task.'
          )
        } else {
          setMessage(
            `Submission failed: ${submissionError.message}`
          )
        }

        setMessageType('error')
        return
      }

      const submittedTaskTitle = selectedTask.title

      setSelectedTask(null)
      setProof('')

      setMessage(
        `Success! Your proof for "${submittedTaskTitle}" has been submitted and is waiting for review.`
      )
      setMessageType('success')

      await loadTasks()
    } catch (err) {
      console.error(
        'Unexpected submission error:',
        err
      )

      setMessage(
        'Something went wrong while submitting your proof. Please try again.'
      )
      setMessageType('error')
    } finally {
      setSubmitting(false)
    }
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
            <h2>
              {authMode === 'login'
                ? 'Welcome back'
                : 'Create your account'}
            </h2>

            <p>
              {authMode === 'login'
                ? 'Log in to access your dashboard.'
                : 'Create your TaskFlow NG account.'}
            </p>
          </div>

          {authError && (
            <div className="form-error">
              {authError}
            </div>
          )}

          {authMessage && (
            <div className="form-message">
              {authMessage}
            </div>
          )}

          <form onSubmit={handleAuth}>

            {authMode === 'signup' && (
              <div className="form-group">
                <label>Full Name</label>

                <input
                  type="text"
                  value={fullName}
                  onChange={(e) =>
                    setFullName(e.target.value)
                  }
                  placeholder="Enter your full name"
                  autoComplete="name"
                  disabled={authLoading}
                />
              </div>
            )}

            <div className="form-group">
              <label>Email Address</label>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="Enter your email"
                autoComplete="email"
                disabled={authLoading}
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>

              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="Enter your password"
                autoComplete={
                  authMode === 'login'
                    ? 'current-password'
                    : 'new-password'
                }
                disabled={authLoading}
                required
              />
            </div>

            <button
              type="submit"
              className="primary-button"
              disabled={authLoading}
            >
              {authLoading
                ? 'Please wait...'
                : authMode === 'login'
                ? 'Log In'
                : 'Create Account'}
            </button>
          </form>

          <div
            style={{
              textAlign: 'center',
              marginTop: '18px',
            }}
          >
            <p
              style={{
                marginBottom: '8px',
              }}
            >
              {authMode === 'login'
                ? "Don't have an account?"
                : 'Already have an account?'}
            </p>

            <button
              type="button"
              className="outline-button"
              style={{
                width: '100%',
              }}
              onClick={() => {
                setAuthMode(
                  authMode === 'login'
                    ? 'signup'
                    : 'login'
                )
                setAuthError('')
                setAuthMessage('')
              }}
              disabled={authLoading}
            >
              {authMode === 'login'
                ? 'Create an Account'
                : 'Back to Login'}
            </button>
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

  const displayName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    'TaskFlow User'

  return (
    <div className="app">

      <header className="topbar">

        <div className="topbar-left">
          <div className="tf-logo small">
            TF
          </div>

          <div>
            <h1>TaskFlow NG</h1>
            <span>Rewards Dashboard</span>
          </div>
        </div>

        <div className="topbar-right">

          <div className="avatar">
            {displayName
             
