import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import './Admin.css'

function Admin() {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [activeSection, setActiveSection] = useState('Overview')

  const [users, setUsers] = useState([])
  const [tasks, setTasks] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [deposits, setDeposits] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [plans, setPlans] = useState([])
  const [transactions, setTransactions] = useState([])
  const [walletTransactions, setWalletTransactions] = useState([])
  const [auditLogs, setAuditLogs] = useState([])

  const [settings, setSettings] = useState({
    id: null,
    minimum_deposit: 1000,
    minimum_withdrawal: 1000,
    referral_percentage: 25,
  })

  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')

  const [saving, setSaving] = useState(false)

  const [taskModal, setTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    reward: '',
    task_type: 'TASK',
    verification_method: 'screenshot',
    max_completions: '',
    starts_at: '',
    ends_at: '',
    is_active: true,
  })

  const [planModal, setPlanModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)

  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    amount: '',
    duration_days: '',
    benefits: '',
    sort_order: 0,
    is_active: true,
  })

  const showMessage = (text, type = 'success') => {
    setMessage(text)
    setMessageType(type)

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  const clearMessage = () => {
    setMessage('')
  }

  const formatMoney = (amount) => {
    return `₦${Number(amount || 0).toLocaleString('en-NG')}`
  }

  const formatDate = (date) => {
    if (!date) return '-'

    return new Date(date).toLocaleString('en-NG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  const statusClass = (status) => {
    const value = String(status || '').toLowerCase()

    if (
      value === 'approved' ||
      value === 'success' ||
      value === 'successful' ||
      value === 'completed' ||
      value === 'active'
    ) {
      return 'status success'
    }

    if (
      value === 'rejected' ||
      value === 'failed' ||
      value === 'inactive'
    ) {
      return 'status danger'
    }

    return 'status pending'
  }

  // =========================================
  // INITIALIZE ADMIN
  // =========================================

  useEffect(() => {
    initializeAdmin()
  }, [])

  const initializeAdmin = async () => {
    setLoading(true)

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setAuthorized(false)
        setLoading(false)
        return
      }

      const { data, error } = await supabase.rpc('is_admin')

      if (error) {
        console.error('Admin check error:', error)
        setAuthorized(false)
        setLoading(false)
        return
      }

      if (!data) {
        setAuthorized(false)
        setLoading(false)
        return
      }

      setAuthorized(true)

      await loadEverything()
    } catch (error) {
      console.error(error)
      setAuthorized(false)
    } finally {
      setLoading(false)
    }
  }

  // =========================================
  // LOAD DATA
  // =========================================

  const loadEverything = async () => {
    await Promise.all([
      loadUsers(),
      loadTasks(),
      loadSubmissions(),
      loadDeposits(),
      loadWithdrawals(),
      loadPlans(),
      loadSettings(),
      loadTransactions(),
      loadWalletTransactions(),
      loadAuditLogs(),
    ])
  }

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, full_name, phone, task_balance, affiliate_balance, is_active, referral_code, referred_by, created_at, role'
      )
      .order('created_at', {
        ascending: false,
      })

    if (!error) {
      setUsers(data || [])
    }
  }

  const loadTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select(
        'id, title, description, reward, is_active, created_at, task_type, verification_method, max_completions, starts_at, ends_at'
      )
      .order('created_at', {
        ascending: false,
      })

    if (!error) {
      setTasks(data || [])
    }
  }

  const loadSubmissions = async () => {
    const { data, error } = await supabase
      .from('task_submissions')
      .select(
        'id, user_id, task_id, proof, status, reward, created_at'
      )
      .order('created_at', {
        ascending: false,
      })

    if (!error) {
      setSubmissions(data || [])
    }
  }

  const loadDeposits = async () => {
    const { data, error } = await supabase
      .from('deposits')
      .select(
        'id, user_id, amount, payment_reference, status, created_at'
      )
      .order('created_at', {
        ascending: false,
      })

    if (!error) {
      setDeposits(data || [])
    }
  }

  const loadWithdrawals = async () => {
    const { data, error } = await supabase
      .from('withdrawals')
      .select(
        'id, user_id, amount, bank_name, account_number, account_name, payment_reference, status, created_at, balance_type'
      )
      .order('created_at', {
        ascending: false,
      })

    if (!error) {
      setWithdrawals(data || [])
    }
  }

  const loadPlans = async () => {
    const { data, error } = await supabase
      .from('plans')
      .select(
        'id, name, description, amount, duration_days, benefits, is_active, sort_order, created_at, updated_at, created_by'
      )
      .order('sort_order', {
        ascending: true,
      })

    if (!error) {
      setPlans(data || [])
    }
  }

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('platform_settings')
      .select(
        'id, minimum_deposit, minimum_withdrawal, referral_percentage, updated_at'
      )
      .order('id', {
        ascending: true,
      })
      .limit(1)
      .maybeSingle()

    if (!error && data) {
      setSettings(data)
    }
  }

  const loadTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select(
        'id, user_id, type, amount, reference, description, created_at'
      )
      .order('created_at', {
        ascending: false,
      })
      .limit(100)

    if (!error) {
      setTransactions(data || [])
    }
  }

  const loadWalletTransactions = async () => {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select(
        'id, user_id, wallet_type, transaction_type, amount, reference, description, status, created_at'
      )
      .order('created_at', {
        ascending: false,
      })
      .limit(100)

    if (!error) {
      setWalletTransactions(data || [])
    }
  }

  const loadAuditLogs = async () => {
    const { data, error } = await supabase
      .from('admin_audit_logs')
      .select(
        'id, admin_user_id, action, target_table, target_id, details, created_at'
      )
      .order('created_at', {
        ascending: false,
      })
      .limit(100)

    if (!error) {
      setAuditLogs(data || [])
    }
  }

  // =========================================
  // AUDIT
  // =========================================

  const createAuditLog = async (
    action,
    targetTable = null,
    targetId = null,
    details = {}
  ) => {
    const { error } = await supabase.rpc(
      'create_admin_audit_log',
      {
        p_action: action,
        p_target_table: targetTable,
        p_target_id: targetId,
        p_details: details,
      }
    )

    if (error) {
      console.error('Audit log error:', error)
    }
  }

  // =========================================
  // USERS
  // =========================================

  const toggleUserStatus = async (user) => {
    const newStatus = !user.is_active

    const { error } = await supabase
      .from('profiles')
      .update({
        is_active: newStatus,
      })
      .eq('id', user.id)

    if (error) {
      showMessage(
        `Unable to update user: ${error.message}`,
        'error'
      )
      return
    }

    await createAuditLog(
      newStatus
        ? 'Activated user'
        : 'Deactivated user',
      'profiles',
      user.id,
      {
        previous_status: user.is_active,
        new_status: newStatus,
      }
    )

    showMessage(
      newStatus
        ? 'User activated successfully.'
        : 'User deactivated successfully.'
    )

    await loadUsers()
    await loadAuditLogs()
  }

  // =========================================
  // TASKS
  // =========================================

  const resetTaskForm = () => {
    setTaskForm({
      title: '',
      description: '',
      reward: '',
      task_type: 'TASK',
      verification_method: 'screenshot',
      max_completions: '',
      starts_at: '',
      ends_at: '',
      is_active: true,
    })
  }

  const openCreateTask = () => {
    setEditingTask(null)
    resetTaskForm()
    setTaskModal(true)
  }

  const openEditTask = (task) => {
    setEditingTask(task)

    setTaskForm({
      title: task.title || '',
      description: task.description || '',
      reward: task.reward ?? '',
      task_type: task.task_type || 'TASK',
      verification_method:
        task.verification_method || 'screenshot',
      max_completions:
        task.max_completions ?? '',
      starts_at: task.starts_at
        ? task.starts_at.slice(0, 16)
        : '',
      ends_at: task.ends_at
        ? task.ends_at.slice(0, 16)
        : '',
      is_active: Boolean(task.is_active),
    })

    setTaskModal(true)
  }

  const saveTask = async (event) => {
    event.preventDefault()

    const title = taskForm.title.trim()
    const description = taskForm.description.trim()
    const reward = Number(taskForm.reward)

    if (!title) {
      showMessage('Task title is required.', 'error')
      return
    }

    if (!Number.isFinite(reward) || reward < 0) {
      showMessage('Enter a valid task reward.', 'error')
      return
    }

    setSaving(true)

    const payload = {
      title,
      description,
      reward,
      task_type: taskForm.task_type.trim() || 'TASK',
      verification_method:
        taskForm.verification_method.trim() ||
        'screenshot',
      max_completions:
        taskForm.max_completions === ''
          ? null
          : Number(taskForm.max_completions),
      starts_at:
        taskForm.starts_at || null,
      ends_at:
        taskForm.ends_at || null,
      is_active: taskForm.is_active,
    }

    let result

    if (editingTask) {
      result = await supabase
        .from('tasks')
        .update(payload)
        .eq('id', editingTask.id)
    } else {
      result = await supabase
        .from('tasks')
        .insert(payload)
    }

    setSaving(false)

    if (result.error) {
      showMessage(
        `Unable to save task: ${result.error.message}`,
        'error'
      )
      return
    }

    await createAuditLog(
      editingTask ? 'Updated task' : 'Created task',
      'tasks',
      editingTask?.id || null,
      {
        title,
        reward,
      }
    )

    setTaskModal(false)

    showMessage(
      editingTask
        ? 'Task updated successfully.'
        : 'Task created successfully.'
    )

    await loadTasks()
    await loadAuditLogs()
  }

  const toggleTask = async (task) => {
    const { error } = await supabase
      .from('tasks')
      .update({
        is_active: !task.is_active,
      })
      .eq('id', task.id)

    if (error) {
      showMessage(
        `Unable to update task: ${error.message}`,
        'error'
      )
      return
    }

    await createAuditLog(
      task.is_active
        ? 'Deactivated task'
        : 'Activated task',
      'tasks',
      task.id,
      {
        title: task.title,
      }
    )

    showMessage(
      task.is_active
        ? 'Task deactivated.'
        : 'Task activated.'
    )

    await loadTasks()
    await loadAuditLogs()
  }

  const deleteTask = async (task) => {
    const confirmed = window.confirm(
      `Delete "${task.title}"? This cannot be undone.`
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', task.id)

    if (error) {
      showMessage(
        `Unable to delete task: ${error.message}`,
        'error'
      )
      return
    }

    await createAuditLog(
      'Deleted task',
      'tasks',
      task.id,
      {
        title: task.title,
      }
    )

    showMessage('Task deleted successfully.')

    await loadTasks()
    await loadAuditLogs()
  }

  // =========================================
  // SUBMISSIONS
  // =========================================

  const updateSubmissionStatus = async (
    submission,
    newStatus
  ) => {
    const { error } = await supabase
      .from('task_submissions')
      .update({
        status: newStatus,
      })
      .eq('id', submission.id)

    if (error) {
      showMessage(
        `Unable to update submission: ${error.message}`,
        'error'
      )
      return
    }

    await createAuditLog(
      `Changed task submission to ${newStatus}`,
      'task_submissions',
      submission.id,
      {
        user_id: submission.user_id,
        task_id: submission.task_id,
      }
    )

    showMessage(
      `Submission marked ${newStatus}.`
    )

    await loadSubmissions()
    await loadAuditLogs()
  }

  // =========================================
  // WITHDRAWALS
  // =========================================

  const updateWithdrawalStatus = async (
    withdrawal,
    newStatus
  ) => {
    const { error } = await supabase
      .from('withdrawals')
      .update({
        status: newStatus,
      })
      .eq('id', withdrawal.id)

    if (error) {
      showMessage(
        `Unable to update withdrawal: ${error.message}`,
        'error'
      )
      return
    }

    await createAuditLog(
      `Changed withdrawal to ${newStatus}`,
      'withdrawals',
      withdrawal.id,
      {
        user_id: withdrawal.user_id,
        amount: withdrawal.amount,
      }
    )

    showMessage(
      `Withdrawal marked ${newStatus}.`
    )

    await loadWithdrawals()
    await loadAuditLogs()
  }

  // =========================================
  // PLANS
  // =========================================

  const resetPlanForm = () => {
    setPlanForm({
      name: '',
      description: '',
      amount: '',
      duration_days: '',
      benefits: '',
      sort_order: 0,
      is_active: true,
    })
  }

  const openCreatePlan = () => {
    setEditingPlan(null)
    resetPlanForm()
    setPlanModal(true)
  }

  const openEditPlan = (plan) => {
    const benefits = Array.isArray(plan.benefits)
      ? plan.benefits.join('\n')
      : ''

    setEditingPlan(plan)

    setPlanForm({
      name: plan.name || '',
      description: plan.description || '',
      amount: plan.amount ?? '',
      duration_days: plan.duration_days ?? '',
      benefits,
      sort_order: plan.sort_order ?? 0,
      is_active: Boolean(plan.is_active),
    })

    setPlanModal(true)
  }

  const savePlan = async (event) => {
    event.preventDefault()

    const name = planForm.name.trim()
    const amount = Number(planForm.amount)

    if (!name) {
      showMessage('Plan name is required.', 'error')
      return
    }

    if (!Number.isFinite(amount) || amount < 0) {
      showMessage('Enter a valid plan amount.', 'error')
      return
    }

    const benefits = planForm.benefits
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)

    setSaving(true)

    const payload = {
      name,
      description: planForm.description.trim(),
      amount,
      duration_days:
        planForm.duration_days === ''
          ? null
          : Number(planForm.duration_days),
      benefits,
      sort_order: Number(planForm.sort_order) || 0,
      is_active: planForm.is_active,
    }

    let result

    if (editingPlan) {
      result = await supabase
        .from('plans')
        .update(payload)
        .eq('id', editingPlan.id)
    } else {
      const {
        data: {
          user,
        },
      } = await supabase.auth.getUser()

      result = await supabase
        .from('plans')
        .insert({
          ...payload,
          created_by: user?.id || null,
        })
    }

    setSaving(false)

    if (result.error) {
      showMessage(
        `Unable to save plan: ${result.error.message}`,
        'error'
      )
      return
    }

    await createAuditLog(
      editingPlan ? 'Updated plan' : 'Created plan',
      'plans',
      editingPlan?.id || null,
      {
        name,
        amount,
      }
    )

    setPlanModal(false)

    showMessage(
      editingPlan
        ? 'Plan updated successfully.'
        : 'Plan created successfully.'
    )

    await loadPlans()
    await loadAuditLogs()
  }

  const togglePlan = async (plan) => {
    const { error } = await supabase
      .from('plans')
      .update({
        is_active: !plan.is_active,
      })
      .eq('id', plan.id)

    if (error) {
      showMessage(
        `Unable to update plan: ${error.message}`,
        'error'
      )
      return
    }

    await createAuditLog(
      plan.is_active
        ? 'Deactivated plan'
        : 'Activated plan',
      'plans',
      plan.id,
      {
        name: plan.name,
      }
    )

    showMessage(
      plan.is_active
        ? 'Plan deactivated.'
        : 'Plan activated.'
    )

    await loadPlans()
    await loadAuditLogs()
  }

  // =========================================
  // SETTINGS
  // =========================================

  const saveSettings = async (event) => {
    event.preventDefault()

    const minimumDeposit = Number(
      settings.minimum_deposit
    )

    const minimumWithdrawal = Number(
      settings.minimum_withdrawal
    )

    const referralPercentage = Number(
      settings.referral_percentage
    )

    if (
      !Number.isFinite(minimumDeposit) ||
      minimumDeposit < 0
    ) {
      showMessage(
        'Invalid minimum deposit.',
        'error'
      )
      return
    }

    if (
      !Number.isFinite(minimumWithdrawal) ||
      minimumWithdrawal < 0
    ) {
      showMessage(
        'Invalid minimum withdrawal.',
        'error'
      )
      return
    }

    if (
      !Number.isFinite(referralPercentage) ||
      referralPercentage < 0 ||
      referralPercentage > 100
    ) {
      showMessage(
        'Referral percentage must be between 0 and 100.',
        'error'
      )
      return
    }

    setSaving(true)

    let result

    if (settings.id) {
      result = await supabase
        .from('platform_settings')
        .update({
          minimum_deposit: minimumDeposit,
          minimum_withdrawal:
            minimumWithdrawal,
          referral_percentage:
            referralPercentage,
        })
        .eq('id', settings.id)
    } else {
      result = await supabase
        .from('platform_settings')
        .insert({
          minimum_deposit: minimumDeposit,
          minimum_withdrawal:
            minimumWithdrawal,
          referral_percentage:
            referralPercentage,
        })
    }

    setSaving(false)

    if (result.error) {
      showMessage(
        `Unable to save settings: ${result.error.message}`,
        'error'
      )
      return
    }

    await createAuditLog(
      'Updated platform settings',
      'platform_settings',
      settings.id,
      {
        minimum_deposit: minimumDeposit,
        minimum_withdrawal:
          minimumWithdrawal,
        referral_percentage:
          referralPercentage,
      }
    )

    showMessage(
      'Platform settings updated successfully.'
    )

    await loadSettings()
    await loadAuditLogs()
  }

  // =========================================
  // DASHBOARD STATS
  // =========================================

  const activeUsers = users.filter(
    (user) => user.is_active
  ).length

  const activeTasks = tasks.filter(
    (task) => task.is_active
  ).length

  const pendingSubmissions = submissions.filter(
    (item) =>
      String(item.status).toLowerCase() ===
      'pending'
  ).length

  const pendingWithdrawals = withdrawals.filter(
    (item) =>
      String(item.status).toLowerCase() ===
      'pending'
  ).length

  const totalDeposits = deposits.reduce(
    (sum, item) =>
      sum + Number(item.amount || 0),
    0
  )

  const totalWithdrawals = withdrawals.reduce(
    (sum, item) =>
      sum + Number(item.amount || 0),
    0
  )

  // =========================================
  // LOADING
  // =========================================

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-logo">
          TF
        </div>

        <h2>Loading Admin Panel</h2>

        <p>
          Checking your administrator access...
        </p>
      </div>
    )
  }

  // =========================================
  // UNAUTHORIZED
  // =========================================

  if (!authorized) {
    return (
      <div className="admin-loading">
        <div className="admin-denied-icon">
          !
        </div>

        <h2>Access Denied</h2>

        <p>
          This account does not have administrator
          access.
        </p>
      </div>
    )
  }

  // =========================================
  // OVERVIEW
  // =========================================

  const overviewPage = (
    <>
      <div className="admin-page-heading">
        <div>
          <span>ADMIN PANEL</span>

          <h2>
            Overview
          </h2>

          <p>
            Manage TaskFlow NG from one place.
          </p>
        </div>

        <button
          className="admin-refresh-button"
          onClick={loadEverything}
        >
          ↻ Refresh
        </button>
      </div>

      <div className="admin-stat-grid">
        <div className="admin-stat-card">
          <span>USERS</span>
          <strong>{users.length}</strong>
          <small>
            {activeUsers} active
          </small>
        </div>

        <div className="admin-stat-card">
          <span>TASKS</span>
          <strong>{tasks.length}</strong>
          <small>
            {activeTasks} active
          </small>
        </div>

        <div className="admin-stat-card">
          <span>PENDING SUBMISSIONS</span>
          <strong>
            {pendingSubmissions}
          </strong>
          <small>
            Need review
          </small>
        </div>

        <div className="admin-stat-card">
          <span>PENDING WITHDRAWALS</span>
          <strong>
            {pendingWithdrawals}
          </strong>
          <small>
            Need attention
          </small>
        </div>
      </div>

      <div className="admin-stat-grid">
        <div className="admin-money-card">
          <span>TOTAL DEPOSIT RECORDS</span>

          <strong>
            {formatMoney(totalDeposits)}
          </strong>

          <small>
            Recorded deposits
          </small>
        </div>

        <div className="admin-money-card">
          <span>TOTAL WITHDRAWAL REQUESTS</span>

          <strong>
            {formatMoney(totalWithdrawals)}
          </strong>

          <small>
            Requested withdrawals
          </small>
        </div>
      </div>

      <div className="admin-panel-card">
        <div className="admin-card-heading">
          <div>
            <span>QUICK ACTIONS</span>

            <h3>
              Manage Platform
            </h3>
          </div>
        </div>

        <div className="admin-quick-grid">
          <button
            onClick={() =>
              setActiveSection('Tasks')
            }
          >
            <b>✓</b>
            <strong>Manage Tasks</strong>
            <span>
              Create and edit tasks
            </span>
          </button>

          <button
            onClick={() =>
              setActiveSection('Submissions')
            }
          >
            <b>◉</b>
            <strong>Review Proofs</strong>
            <span>
              Review task submissions
            </span>
          </button>

          <button
            onClick={() =>
              setActiveSection('Withdrawals')
            }
          >
            <b>₦</b>
            <strong>Withdrawals</strong>
            <span>
              Review withdrawal requests
            </span>
          </button>

          <button
            onClick={() =>
              setActiveSection('Settings')
            }
          >
            <b>⚙</b>
            <strong>Settings</strong>
            <span>
              Change platform settings
            </span>
          </button>
        </div>
      </div>
    </>
  )

  // =========================================
  // USERS PAGE
  // =========================================

  const usersPage = (
    <>
      <div className="admin-page-heading">
        <div>
          <span>ADMIN</span>

          <h2>Users</h2>

          <p>
            View and manage registered users.
          </p>
        </div>
      </div>

      <div className="admin-table-card">
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Task Balance</th>
                <th>Affiliate</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>
                        {user.full_name ||
                          'Unnamed User'}
                      </strong>

                      <small>
                        {user.id.slice(0, 8)}...
                      </small>
                    </td>

                    <td>
                      {formatMoney(
                        user.task_balance
                      )}
                    </td>

                    <td>
                      {formatMoney(
                        user.affiliate_balance
                      )}
                    </td>

                    <td>
                      <span
                        className={
                          user.is_active
                            ? 'status success'
                            : 'status danger'
                        }
                      >
                        {user.is_active
                          ? 'Active'
                          : 'Inactive'}
                      </span>
                    </td>

                    <td>
                      {formatDate(
                        user.created_at
                      )}
                    </td>

                    <td>
                      <button
                        className={
                          user.is_active
                            ? 'table-button danger'
                            : 'table-button'
                        }
                        onClick={() =>
                          toggleUserStatus(
                            user
                          )
                        }
                      >
                        {user.is_active
                          ? 'Deactivate'
                          : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )

  // =========================================
  // TASKS PAGE
  // =========================================

  const tasksPage = (
    <>
      <div className="admin-page-heading">
        <div>
          <span>ADMIN</span>

          <h2>Tasks</h2>

          <p>
            Create and manage available tasks.
          </p>
        </div>

        <button
          className="admin-primary-button"
          onClick={openCreateTask}
        >
          + Add Task
        </button>
      </div>

      <div className="admin-card-list">
        {tasks.length === 0 ? (
          <div className="admin-empty">
            No tasks created yet.
          </div>
        ) : (
          tasks.map((task) => (
            <div
              className="admin-list-card"
              key={task.id}
            >
              <div className="admin-list-main">
                <div className="admin-list-icon">
                  ✓
                </div>

                <div>
                  <span className="admin-mini-label">
                    {task.task_type || 'TASK'}
                  </span>

                  <h3>{task.title}</h3>

                  <p>
                    {task.description ||
                      'No description'}
                  </p>

                  <strong>
                    Reward: {formatMoney(task.reward)}
                  </strong>
                </div>
              </div>

              <div className="admin-list-actions">
                <span
                  className={
                    task.is_active
                      ? 'status success'
                      : 'status danger'
                  }
                >
                  {task.is_active
                    ? 'Active'
                    : 'Inactive'}
                </span>

                <button
                  className="table-button"
                  onClick={() =>
                    openEditTask(task)
                  }
                >
                  Edit
                </button>

                <button
                  className="table-button"
                  onClick={() =>
                    toggleTask(task)
                  }
                >
                  {task.is_active
                    ? 'Disable'
                    : 'Enable'}
                </button>

                <button
                  className="table-button danger"
                  onClick={() =>
                    deleteTask(task)
                  }
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )

  // =========================================
  // SUBMISSIONS PAGE
  // =========================================

  const submissionsPage = (
    <>
      <div className="admin-page-heading">
        <div>
          <span>ADMIN</span>

          <h2>
            Task Submissions
          </h2>

          <p>
            Review submitted task proofs.
          </p>
        </div>
      </div>

      <div className="admin-card-list">
        {submissions.length === 0 ? (
          <div className="admin-empty">
            No submissions found.
          </div>
        ) : (
          submissions.map((submission) => (
            <div
              className="admin-list-card submission-card"
              key={submission.id}
            >
              <div>
                <span className="admin-mini-label">
                  SUBMISSION
                </span>

                <h3>
                  Reward:{' '}
                  {formatMoney(
                    submission.reward
                  )}
                </h3>

                <p>
                  User:{' '}
                  {submission.user_id.slice(
                    0,
                    12
                  )}
                  ...
                </p>

                <p>
                  Task:{' '}
                  {submission.task_id.slice(
                    0,
                    12
                  )}
                  ...
                </p>

                <p>
                  Submitted:{' '}
                  {formatDate(
                    submission.created_at
                  )}
                </p>

                {submission.proof && (
                  <details className="proof-details">
                    <summary>
                      View submitted proof
                    </summary>

                    <div>
                      {submission.proof}
                    </div>
                  </details>
                )}
              </div>

              <div className="admin-list-actions">
                <span
                  className={statusClass(
                    submission.status
                  )}
                >
                  {submission.status ||
                    'Pending'}
                </span>

                {String(
                  submission.status
                ).toLowerCase() ===
                  'pending' && (
                  <>
                    <button
                      className="table-button success"
                      onClick={() =>
                        updateSubmissionStatus(
                          submission,
                          'Approved'
                        )
                      }
                    >
                      Approve
                    </button>

                    <button
                      className="table-button danger"
                      onClick={() =>
                        updateSubmissionStatus(
                          submission,
                          'Rejected'
                        )
                      }
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )

  // =========================================
  // DEPOSITS PAGE
  // =========================================

  const depositsPage = (
    <>
      <div className="admin-page-heading">
        <div>
          <span>ADMIN</span>

          <h2>Deposits</h2>

          <p>
            View recorded deposit transactions.
          </p>
        </div>
      </div>

      <div className="admin-table-card">
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Amount</th>
                <th>User</th>
                <th>Reference</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>

            <tbody>
              {deposits.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    No deposits found.
                  </td>
                </tr>
              ) : (
                deposits.map((deposit) => (
                  <tr key={deposit.id}>
                    <td>
                      <strong>
                        {formatMoney(
                          deposit.amount
                        )}
                      </strong>
                    </td>

                    <td>
                      {deposit.user_id.slice(
                        0,
                        10
                      )}
                      ...
                    </td>

                    <td>
                      {deposit.payment_reference ||
                        '-'}
                    </td>

                    <td>
                      <span
                        className={statusClass(
                          deposit.status
                        )}
                      >
                        {deposit.status}
                      </span>
                    </td>

                    <td>
                      {formatDate(
                        deposit.created_at
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )

  // =========================================
  // WITHDRAWALS PAGE
  // =========================================

  const withdrawalsPage = (
    <>
      <div className="admin-page-heading">
        <div>
          <span>ADMIN</span>

          <h2>Withdrawals</h2>

          <p>
            Review withdrawal requests.
          </p>
        </div>
      </div>

      <div className="admin-card-list">
        {withdrawals.length === 0 ? (
          <div className="admin-empty">
            No withdrawal requests found.
          </div>
        ) : (
          withdrawals.map((withdrawal) => (
            <div
              className="admin-list-card"
              key={withdrawal.id}
            >
              <div>
                <span className="admin-mini-label">
                  {withdrawal.balance_type ||
                    'BALANCE'}
                </span>

                <h3>
                  {formatMoney(
                    withdrawal.amount
                  )}
                </h3>

                <p>
                  <strong>
                    {withdrawal.account_name}
                  </strong>
                </p>

                <p>
                  {withdrawal.bank_name} •{' '}
                  {withdrawal.account_number}
                </p>

                <p>
                  User:{' '}
                  {withdrawal.user_id.slice(
                    0,
                    12
                  )}
                  ...
                </p>

                <p>
                  {formatDate(
                    withdrawal.created_at
                  )}
                </p>

                <p>
                  Reference:{' '}
                  {withdrawal.payment_reference ||
                    '-'}
                </p>
              </div>

              <div className="admin-list-actions">
                <span
                  className={statusClass(
                    withdrawal.status
                  )}
                >
                  {withdrawal.status}
                </span>

                {String(
                  withdrawal.status
                ).toLowerCase() ===
                  'pending' && (
                  <>
                    <button
                      className="table-button success"
                      onClick={() =>
                        updateWithdrawalStatus(
                          withdrawal,
                          'approved'
                        )
                      }
                    >
                      Approve
                    </button>

                    <button
                      className="table-button danger"
                      onClick={() =>
                        updateWithdrawalStatus(
                          withdrawal,
                          'rejected'
                        )
                      }
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )

  // =========================================
  // PLANS PAGE
  // =========================================

  const plansPage = (
    <>
      <div className="admin-page-heading">
        <div>
          <span>ADMIN</span>

          <h2>Plans</h2>

          <p>
            Manage activation plans shown in the app.
          </p>
        </div>

        <button
          className="admin-primary-button"
          onClick={openCreatePlan}
        >
          + Add Plan
        </button>
      </div>

      <div className="admin-card-list">
        {plans.length === 0 ? (
          <div className="admin-empty">
            No plans created yet.
          </div>
        ) : (
          plans.map((plan) => (
            <div
              className="admin-list-card"
              key={plan.id}
            >
              <div>
                <span className="admin-mini-label">
                  PLAN
                </span>

                <h3>{plan.name}</h3>

                <p>
                  {plan.description ||
                    'No description'}
                </p>

                <strong>
                  {formatMoney(plan.amount)}
                </strong>

                {plan.duration_days && (
                  <p>
                    Duration:{' '}
                    {plan.duration_days} days
                  </p>
                )}

                {Array.isArray(
                  plan.benefits
                ) &&
                  plan.benefits.length > 0 && (
                    <ul className="benefits-list">
                      {plan.benefits.map(
                        (benefit, index) => (
                          <li key={index}>
                            {benefit}
                          </li>
                        )
                      )}
                    </ul>
                  )}
              </div>

              <div className="admin-list-actions">
                <span
                  className={
                    plan.is_active
                      ? 'status success'
                      : 'status danger'
                  }
                >
                  {plan.is_active
                    ? 'Active'
                    : 'Inactive'}
                </span>

                <button
                  className="table-button"
                  onClick={() =>
                    openEditPlan(plan)
                  }
                >
                  Edit
                </button>

                <button
                  className="table-button"
                  onClick={() =>
                    togglePlan(plan)
                  }
                >
                  {plan.is_active
                    ? 'Disable'
                    : 'Enable'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )

  // =========================================
  // SETTINGS PAGE
  // =========================================

  const settingsPage = (
    <>
      <div className="admin-page-heading">
        <div>
          <span>ADMIN</span>

          <h2>Platform Settings</h2>

          <p>
            Control the main TaskFlow NG settings.
          </p>
        </div>
      </div>

      <div className="admin-panel-card">
        <form onSubmit={saveSettings}>
          <div className="settings-grid">
            <div className="admin-form-group">
              <label>
                Minimum Deposit
              </label>

              <input
                type="number"
                min="0"
                value={
                  settings.minimum_deposit
                }
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    minimum_deposit:
                      event.target.value,
                  })
                }
              />

              <small>
                Current minimum deposit amount.
              </small>
            </div>

            <div className="admin-form-group">
              <label>
                Minimum Withdrawal
              </label>

              <input
                type="number"
                min="0"
                value={
                  settings.minimum_withdrawal
                }
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    minimum_withdrawal:
                      event.target.value,
                  })
                }
              />

              <small>
                Current minimum withdrawal amount.
              </small>
            </div>

            <div className="admin-form-group">
              <label>
                Referral Percentage
              </label>

              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={
                  settings.referral_percentage
                }
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    referral_percentage:
                      event.target.value,
                  })
                }
              />

              <small>
                Percentage used by the referral system.
              </small>
            </div>
          </div>

          <button
            type="submit"
            className="admin-primary-button"
            disabled={saving}
          >
            {saving
              ? 'Saving...'
              : 'Save Settings'}
          </button>
        </form>
      </div>
    </>
  )

  // =========================================
  // TRANSACTIONS PAGE
  // =========================================

  const transactionsPage = (
    <>
      <div className="admin-page-heading">
        <div>
          <span>ADMIN</span>

          <h2>Transactions</h2>

          <p>
            Review recorded transaction activity.
          </p>
        </div>
      </div>

      <div className="admin-table-card">
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Amount</th>
                <th>User</th>
                <th>Reference</th>
                <th>Description</th>
                <th>Date</th>
              </tr>
            </thead>

            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>
                      {transaction.type}
                    </td>

                    <td>
                      {formatMoney(
                        transaction.amount
                      )}
                    </td>

                    <td>
                      {transaction.user_id.slice(
                        0,
                        10
                      )}
                      ...
                    </td>

                    <td>
                      {transaction.reference ||
                        '-'}
                    </td>

                    <td>
                      {transaction.description ||
                        '-'}
                    </td>

                    <td>
                      {formatDate(
                        transaction.created_at
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )

  // =========================================
  // WALLET TRANSACTIONS
  // =========================================

  const walletPage = (
    <>
      <div className="admin-page-heading">
        <div>
          <span>ADMIN</span>

          <h2>Wallet Activity</h2>

          <p>
            Review task and affiliate wallet activity.
          </p>
        </div>
      </div>

      <div className="admin-table-card">
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Wallet</th>
                <th>Transaction</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Reference</th>
                <th>Date</th>
              </tr>
            </thead>

            <tbody>
              {walletTransactions.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    No wallet activity found.
                  </td>
                </tr>
              ) : (
                walletTransactions.map(
                  (transaction) => (
                    <tr key={transaction.id}>
                      <td>
                        {transaction.wallet_type}
                      </td>

                      <td>
                        {transaction.transaction_type}
                      </td>

                      <td>
                        {formatMoney(
                          transaction.amount
                        )}
                      </td>

                      <td>
                        <span
                          className={statusClass(
                            transaction.status
                          )}
                        >
                          {transaction.status ||
                            '-'}
                        </span>
                      </td>

                      <td>
                        {transaction.reference ||
                          '-'}
                      </td>

                      <td>
                        {formatDate(
                          transaction.created_at
                        )}
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )

  // =========================================
  // AUDIT LOG PAGE
  // =========================================

  const auditPage = (
    <>
      <div className="admin-page-heading">
        <div>
          <span>ADMIN</span>

          <h2>Audit Logs</h2>

          <p>
            Review important administrator actions.
          </p>
        </div>
      </div>

      <div className="admin-card-list">
        {auditLogs.length === 0 ? (
          <div className="admin-empty">
            No audit logs found.
          </div>
        ) : (
          auditLogs.map((log) => (
            <div
              className="admin-list-card"
              key={log.id}
            >
              <div>
                <span className="admin-mini-label">
                  {log.target_table ||
                    'SYSTEM'}
                </span>

                <h3>
                  {log.action}
                </h3>

                <p>
                  Target:{' '}
                  {log.target_id || '-'}
                </p>

                <p>
                  {formatDate(
                    log.created_at
                  )}
                </p>

                {log.details &&
                  Object.keys(
                    log.details
                  ).length > 0 && (
                    <details className="proof-details">
                      <summary>
                        View details
                      </summary>

                      <pre>
                        {JSON.stringify(
                          log.details,
                          null,
                          2
                        )}
                      </pre>
                    </details>
                  )}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )

  // =========================================
  // SELECT PAGE
  // =========================================

  let page = overviewPage

  if (activeSection === 'Users') {
    page = usersPage
  }

  if (activeSection === 'Tasks') {
    page = tasksPage
  }

  if (activeSection === 'Submissions') {
    page = submissionsPage
  }

  if (activeSection === 'Deposits') {
    page = depositsPage
  }

  if (activeSection === 'Withdrawals') {
    page = withdrawalsPage
  }

  if (activeSection === 'Plans') {
    page = plansPage
  }

  if (activeSection === 'Settings') {
    page = settingsPage
  }

  if (activeSection === 'Transactions') {
    page = transactionsPage
  }

  if (activeSection === 'Wallet') {
    page = walletPage
  }

  if (activeSection === 'Audit Logs') {
    page = auditPage
  }

  // =========================================
  // MAIN ADMIN UI
  // =========================================

  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-logo">
            TF
          </div>

          <div>
            <strong>
              TaskFlow NG
            </strong>

            <span>
              Admin Panel
            </span>
          </div>
        </div>

        <nav className="admin-nav">
          {[
            ['Overview', '⌂'],
            ['Users', '♙'],
            ['Tasks', '✓'],
            ['Submissions', '◉'],
            ['Deposits', '↓'],
            ['Withdrawals', '↑'],
            ['Plans', '◆'],
            ['Transactions', '↔'],
            ['Wallet', '₦'],
            ['Settings', '⚙'],
            ['Audit Logs', '☷'],
          ].map(([name, icon]) => (
            <button
              key={name}
              className={
                activeSection === name
                  ? 'active'
                  : ''
              }
              onClick={() => {
                setActiveSection(name)
                clearMessage()
              }}
            >
              <span>{icon}</span>
              {name}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <button
            onClick={() => {
              window.location.reload()
            }}
          >
            ↻ Refresh
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <span>
              TASKFLOW NG
            </span>

            <strong>
              Administration
            </strong>
          </div>

          <div className="admin-topbar-badge">
            ADMIN
          </div>
        </header>

        <div className="admin-content">
          {message && (
            <div
              className={
                messageType === 'error'
                  ? 'admin-alert error'
                  : 'admin-alert success'
              }
            >
              {message}
            </div>
          )}

          {page}
        </div>
      </main>

      {/* =====================================
          TASK MODAL
      ===================================== */}

      {taskModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-heading">
              <div>
                <span>
                  TASK MANAGEMENT
                </span>

                <h2>
                  {editingTask
                    ? 'Edit Task'
                    : 'Create Task'}
                </h2>
              </div>

              <button
                onClick={() =>
                  setTaskModal(false)
                }
              >
                ✕
              </button>
            </div>

            <form onSubmit={saveTask}>
              <div className="admin-form-group">
                <label>
                  Task Title
                </label>

                <input
                  value={taskForm.title}
                  onChange={(event) =>
                    setTaskForm({
                      ...taskForm,
                      title:
                        event.target.value,
                    })
                  }
                  placeholder="Enter task title"
                  required
                />
              </div>

              <div className="admin-form-group">
                <label>
                  Description
                </label>

                <textarea
                  value={taskForm.description}
                  onChange={(event) =>
                    setTaskForm({
                      ...taskForm,
                      description:
                        event.target.value,
                    })
                  }
                  placeholder="Describe what users need to do"
                  rows="4"
                />
              </div>

              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label>
                    Reward
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={taskForm.reward}
                    onChange={(event) =>
                      setTaskForm({
                        ...taskForm,
                        reward:
                          event.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label>
                    Task Type
                  </label>

                  <input
                    value={taskForm.task_type}
                    onChange={(event) =>
                      setTaskForm({
                        ...taskForm,
                        task_type:
                          event.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label>
                    Verification Method
                  </label>

                  <input
                    value={
                      taskForm.verification_method
                    }
                    onChange={(event) =>
                      setTaskForm({
                        ...taskForm,
                        verification_method:
                          event.target.value,
                      })
                    }
                  />
                </div>

                <div className="admin-form-group">
                  <label>
                    Maximum Completions
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={
                      taskForm.max_completions
                    }
                    onChange={(event) =>
                      setTaskForm({
                        ...taskForm,
                        max_completions:
                          event.target.value,
                      })
                    }
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label>
                    Starts At
                  </label>

                  <input
                    type="datetime-local"
                    value={taskForm.starts_at}
                    onChange={(event) =>
                      setTaskForm({
                        ...taskForm,
                        starts_at:
                          event.target.value,
                      })
                    }
                  />
                </div>

                <div className="admin-form-group">
                  <label>
                    Ends At
                  </label>

                  <input
                    type="datetime-local"
                    value={taskForm.ends_at}
                    onChange={(event) =>
                      setTaskForm({
                        ...taskForm,
                        ends_at:
                          event.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={taskForm.is_active}
                  onChange={(event) =>
                    setTaskForm({
                      ...taskForm,
                      is_active:
                        event.target.checked,
                    })
                  }
                />

                <span>
                  Task is active
                </span>
              </label>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={() =>
                    setTaskModal(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="admin-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : editingTask
                    ? 'Save Changes'
                    : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================
          PLAN MODAL
      ===================================== */}

      {planModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-heading">
              <div>
                <span>
                  PLAN MANAGEMENT
                </span>

                <h2>
                  {editingPlan
                    ? 'Edit Plan'
                    : 'Create Plan'}
                </h2>
              </div>

              <button
                onClick={() =>
                  setPlanModal(false)
                }
              >
                ✕
              </button>
            </div>

            <form onSubmit={savePlan}>
              <div className="admin-form-group">
                <label>
                  Plan Name
                </label>

                <input
                  value={planForm.name}
                  onChange={(event) =>
                    setPlanForm({
                      ...planForm,
                      name:
                        event.target.value,
                    })
                  }
                  placeholder="e.g. Starter Plan"
                  required
                />
              </div>

              <div className="admin-form-group">
                <label>
                  Description
                </label>

                <textarea
                  value={planForm.description}
                  onChange={(event) =>
                    setPlanForm({
                      ...planForm,
                      description:
                        event.target.value,
                    })
                  }
                  rows="3"
                />
              </div>

              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label>
                    Amount
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={planForm.amount}
                    onChange={(event) =>
                      setPlanForm({
                        ...planForm,
                        amount:
                          event.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label>
                    Duration (Days)
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={
                      planForm.duration_days
                    }
                    onChange={(event) =>
                      setPlanForm({
                        ...planForm,
                        duration_days:
                          event.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label>
                  Benefits
                </label>

                <textarea
                  value={planForm.benefits}
                  onChange={(event) =>
                    setPlanForm({
                      ...planForm,
                      benefits:
                        event.target.value,
                    })
                  }
                  placeholder={
                    'One benefit per line'
                  }
                  rows="5"
                />
              </div>

              <div className="admin-form-group">
                <label>
                  Sort Order
                </label>

                <input
                  type="number"
                  value={planForm.sort_order}
                  onChange={(event) =>
                    setPlanForm({
                      ...planForm,
                      sort_order:
                        event.target.value,
                    })
                  }
                />
              </div>

              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={planForm.is_active}
                  onChange={(event) =>
                    setPlanForm({
                      ...planForm,
                      is_active:
                        event.target.checked,
                    })
                  }
                />

                <span>
                  Plan is active
                </span>
              </label>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={() =>
                    setPlanModal(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="admin-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : editingPlan
                    ? 'Save Changes'
                    : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Admin
