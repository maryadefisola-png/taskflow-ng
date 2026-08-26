import { useEffect, useState } from "react"
import { supabase } from "./supabase"

function Admin() {
  const [user, setUser] = useState(null)

  const [profiles, setProfiles] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [tasks, setTasks] = useState([])
  const [settings, setSettings] = useState(null)

  const [loading, setLoading] = useState(true)
  const [pageMessage, setPageMessage] = useState("")

  const [activeSection, setActiveSection] =
    useState("overview")

  const [withdrawalsLoading, setWithdrawalsLoading] =
    useState(false)

  const [tasksLoading, setTasksLoading] =
    useState(false)

  const [settingsLoading, setSettingsLoading] =
    useState(false)

  const [actionLoading, setActionLoading] =
    useState(false)

  const [processingWithdrawal, setProcessingWithdrawal] =
    useState(null)

  const [withdrawalMessage, setWithdrawalMessage] =
    useState("")

  const [taskMessage, setTaskMessage] =
    useState("")

  const [settingsMessage, setSettingsMessage] =
    useState("")

  // =====================================================
  // TASK FORM
  // =====================================================

  const emptyTask = {
    id: null,
    title: "",
    description: "",
    reward: "",
    is_active: true,
    task_type: "",
    verification_method: "",
    max_completions: "",
    starts_at: "",
    ends_at: "",
  }

  const [taskForm, setTaskForm] =
    useState(emptyTask)

  const [editingTask, setEditingTask] =
    useState(false)

  // =====================================================
  // SETTINGS FORM
  // =====================================================

  const [settingsForm, setSettingsForm] =
    useState({
      id: null,
      minimum_deposit: "",
      minimum_withdrawal: "",
      referral_percentage: "",
    })

  // =====================================================
  // FORMAT MONEY
  // =====================================================

  const formatMoney = (value) => {
    return Number(value || 0).toLocaleString(
      "en-NG",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )
  }

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (value) => {
    if (!value) {
      return "—"
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return "—"
    }

    return date.toLocaleString(
      "en-NG",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    )
  }

  // =====================================================
  // DATETIME TO INPUT
  // =====================================================

  const toDateTimeLocal = (value) => {
    if (!value) {
      return ""
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return ""
    }

    const year =
      date.getFullYear()

    const month =
      String(
        date.getMonth() + 1
      ).padStart(2, "0")

    const day =
      String(
        date.getDate()
      ).padStart(2, "0")

    const hours =
      String(
        date.getHours()
      ).padStart(2, "0")

    const minutes =
      String(
        date.getMinutes()
      ).padStart(2, "0")

    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  // =====================================================
  // STATUS STYLE
  // =====================================================

  const getStatusStyle = (status) => {
    const normalized =
      String(
        status || ""
      ).toLowerCase()

    if (normalized === "pending") {
      return {
        background: "#fff3cd",
        color: "#856404",
        border: "1px solid #ffeeba",
      }
    }

    if (
      normalized === "approved" ||
      normalized === "processing"
    ) {
      return {
        background: "#cfe2ff",
        color: "#084298",
        border: "1px solid #b6d4fe",
      }
    }

    if (normalized === "completed") {
      return {
        background: "#d1e7dd",
        color: "#0f5132",
        border: "1px solid #badbcc",
      }
    }

    if (
      normalized === "refunded" ||
      normalized === "rejected" ||
      normalized === "failed" ||
      normalized === "reversed"
    ) {
      return {
        background: "#f8d7da",
        color: "#842029",
        border: "1px solid #f5c2c7",
      }
    }

    return {
      background: "#e2e3e5",
      color: "#41464b",
      border: "1px solid #d3d6d8",
    }
  }

  // =====================================================
  // LOAD PROFILES
  // =====================================================

  const loadProfiles = async () => {
    const {
      data,
      error,
    } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", {
        ascending: false,
      })

    if (error) {
      console.error(
        "LOAD PROFILES ERROR:",
        error
      )

      throw error
    }

    setProfiles(data || [])
  }

  // =====================================================
  // LOAD WITHDRAWALS
  // =====================================================

  const loadWithdrawals = async () => {
    try {
      setWithdrawalsLoading(true)

      const {
        data,
        error,
      } = await supabase
        .from("withdrawals")
        .select("*")
        .order("created_at", {
          ascending: false,
        })

      if (error) {
        console.error(
          "LOAD WITHDRAWALS ERROR:",
          error
        )

        setWithdrawalMessage(
          error.message ||
            "Unable to load withdrawals."
        )

        return
      }

      setWithdrawals(data || [])
    } catch (error) {
      console.error(
        "WITHDRAWALS ERROR:",
        error
      )

      setWithdrawalMessage(
        "Something went wrong while loading withdrawals."
      )
    } finally {
      setWithdrawalsLoading(false)
    }
  }

  // =====================================================
  // LOAD TASKS
  // =====================================================

  const loadTasks = async () => {
    try {
      setTasksLoading(true)

      const {
        data,
        error,
      } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", {
          ascending: false,
        })

      if (error) {
        console.error(
          "LOAD TASKS ERROR:",
          error
        )

        setTaskMessage(
          error.message ||
            "Unable to load tasks."
        )

        return
      }

      setTasks(data || [])
    } catch (error) {
      console.error(
        "TASKS ERROR:",
        error
      )

      setTaskMessage(
        "Something went wrong while loading tasks."
      )
    } finally {
      setTasksLoading(false)
    }
  }

  // =====================================================
  // LOAD SETTINGS
  // =====================================================

  const loadSettings = async () => {
    try {
      setSettingsLoading(true)

      const {
        data,
        error,
      } = await supabase
        .from("platform_settings")
        .select("*")
        .order("id", {
          ascending: true,
        })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error(
          "LOAD SETTINGS ERROR:",
          error
        )

        setSettingsMessage(
          error.message ||
            "Unable to load platform settings."
        )

        return
      }

      setSettings(data || null)

      if (data) {
        setSettingsForm({
          id: data.id,
          minimum_deposit:
            data.minimum_deposit ?? "",
          minimum_withdrawal:
            data.minimum_withdrawal ?? "",
          referral_percentage:
            data.referral_percentage ?? "",
        })
      }
    } catch (error) {
      console.error(
        "SETTINGS ERROR:",
        error
      )

      setSettingsMessage(
        "Something went wrong while loading settings."
      )
    } finally {
      setSettingsLoading(false)
    }
  }

  // =====================================================
  // INITIALIZE ADMIN
  // =====================================================

  useEffect(() => {
    let mounted = true

    const initializeAdmin = async () => {
      try {
        setLoading(true)
        setPageMessage("")

        const {
          data: {
            session,
          },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          console.error(
            "SESSION ERROR:",
            sessionError
          )

          if (mounted) {
            setPageMessage(
              "Unable to check your login session."
            )
          }

          return
        }

        if (!session?.user) {
          if (mounted) {
            setPageMessage(
              "You must be logged in to access the admin page."
            )
          }

          return
        }

        setUser(session.user)

        // =================================================
        // VERIFY ADMIN
        // =================================================

        const {
          data: adminStatus,
          error: adminError,
        } = await supabase.rpc(
          "is_admin"
        )

        console.log(
          "IS ADMIN:",
          adminStatus
        )

        if (adminError) {
          console.error(
            "ADMIN CHECK ERROR:",
            adminError
          )

          if (mounted) {
            setPageMessage(
              "Unable to verify administrator access."
            )
          }

          return
        }

        if (adminStatus !== true) {
          if (mounted) {
            setPageMessage(
              "Access denied. This account is not an administrator."
            )
          }

          return
        }

        // =================================================
        // LOAD EVERYTHING
        // =================================================

        await Promise.all([
          loadProfiles(),
          loadWithdrawals(),
          loadTasks(),
          loadSettings(),
        ])
      } catch (error) {
        console.error(
          "ADMIN INITIALIZATION ERROR:",
          error
        )

        if (mounted) {
          setPageMessage(
            "Something went wrong while loading the admin dashboard."
          )
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAdmin()

    return () => {
      mounted = false
    }
  }, [])

  // =====================================================
  // LOGOUT
  // =====================================================

  const logout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error(
        "LOGOUT ERROR:",
        error
      )
    }

    window.location.href = "/"
  }

  // =====================================================
  // REFRESH EVERYTHING
  // =====================================================

  const refreshDashboard = async () => {
    try {
      await Promise.all([
        loadProfiles(),
        loadWithdrawals(),
        loadTasks(),
        loadSettings(),
      ])
    } catch (error) {
      console.error(
        "REFRESH ERROR:",
        error
      )
    }
  }

  // =====================================================
  // TASK FORM CHANGE
  // =====================================================

  const handleTaskChange = (
    event
  ) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target

    setTaskForm((previous) => ({
      ...previous,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }))
  }

  // =====================================================
  // RESET TASK FORM
  // =====================================================

  const resetTaskForm = () => {
    setTaskForm(
      emptyTask
    )

    setEditingTask(false)
  }

  // =====================================================
  // EDIT TASK
  // =====================================================

  const startEditTask = (
    task
  ) => {
    setTaskMessage("")

    setTaskForm({
      id: task.id,
      title: task.title || "",
      description:
        task.description || "",
      reward:
        task.reward ?? "",
      is_active:
        task.is_active !== false,
      task_type:
        task.task_type || "",
      verification_method:
        task.verification_method || "",
      max_completions:
        task.max_completions ?? "",
      starts_at:
        toDateTimeLocal(
          task.starts_at
        ),
      ends_at:
        toDateTimeLocal(
          task.ends_at
        ),
    })

    setEditingTask(true)

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  // =====================================================
  // SAVE TASK
  // =====================================================

  const saveTask = async (
    event
  ) => {
    event.preventDefault()

    setTaskMessage("")

    if (
      !taskForm.title.trim()
    ) {
      setTaskMessage(
        "Task title is required."
      )

      return
    }

    const reward =
      Number(
        taskForm.reward
      )

    if (
      !Number.isFinite(
        reward
      ) ||
      reward < 0
    ) {
      setTaskMessage(
        "Enter a valid task reward."
      )

      return
    }

    let maxCompletions =
      null

    if (
      taskForm.max_completions !==
        "" &&
      taskForm.max_completions !==
        null
    ) {
      maxCompletions =
        Number(
          taskForm.max_completions
        )

      if (
        !Number.isInteger(
          maxCompletions
        ) ||
        maxCompletions < 1
      ) {
        setTaskMessage(
          "Maximum completions must be a whole number greater than 0."
        )

        return
      }
    }

    if (
      taskForm.starts_at &&
      taskForm.ends_at
    ) {
      const start =
        new Date(
          taskForm.starts_at
        )

      const end =
        new Date(
          taskForm.ends_at
        )

      if (
        end <= start
      ) {
        setTaskMessage(
          "End date/time must be after the start date/time."
        )

        return
      }
    }

    try {
      setActionLoading(true)

      const taskData = {
        title:
          taskForm.title.trim(),

        description:
          taskForm.description.trim() ||
          null,

        reward,

        is_active:
          taskForm.is_active,

        task_type:
          taskForm.task_type.trim() ||
          null,

        verification_method:
          taskForm.verification_method.trim() ||
          null,

        max_completions:
          maxCompletions,

        starts_at:
          taskForm.starts_at
            ? new Date(
                taskForm.starts_at
              ).toISOString()
            : null,

        ends_at:
          taskForm.ends_at
            ? new Date(
                taskForm.ends_at
              ).toISOString()
            : null,
      }

      if (editingTask) {
        const {
          error,
        } = await supabase
          .from("tasks")
          .update(taskData)
          .eq(
            "id",
            taskForm.id
          )

        if (error) {
          throw error
        }

        setTaskMessage(
          "Task updated successfully."
        )
      } else {
        const {
          error,
        } = await supabase
          .from("tasks")
          .insert(
            taskData
          )

        if (error) {
          throw error
        }

        setTaskMessage(
          "Task created successfully."
        )
      }

      resetTaskForm()

      await loadTasks()
    } catch (error) {
      console.error(
        "SAVE TASK ERROR:",
        error
      )

      setTaskMessage(
        error.message ||
          "Unable to save task."
      )
    } finally {
      setActionLoading(false)
    }
  }

  // =====================================================
  // TOGGLE TASK
  // =====================================================

  const toggleTask = async (
    task
  ) => {
    const nextStatus =
      !task.is_active

    const confirmed =
      window.confirm(
        `${nextStatus ? "Activate" : "Deactivate"} this task?\n\n${
          task.title
        }`
      )

    if (!confirmed) {
      return
    }

    try {
      setActionLoading(true)
      setTaskMessage("")

      const {
        error,
      } = await supabase
        .from("tasks")
        .update({
          is_active:
            nextStatus,
        })
        .eq(
          "id",
          task.id
        )

      if (error) {
        throw error
      }

      setTaskMessage(
        `Task ${
          nextStatus
            ? "activated"
            : "deactivated"
        } successfully.`
      )

      await loadTasks()
    } catch (error) {
      console.error(
        "TOGGLE TASK ERROR:",
        error
      )

      setTaskMessage(
        error.message ||
          "Unable to change task status."
      )
    } finally {
      setActionLoading(false)
    }
  }

  // =====================================================
  // DELETE TASK
  // =====================================================

  const deleteTask = async (
    task
  ) => {
    const confirmed =
      window.confirm(
        `Delete this task permanently?\n\n${task.title}\n\nThis action cannot be undone.`
      )

    if (!confirmed) {
      return
    }

    try {
      setActionLoading(true)
      setTaskMessage("")

      const {
        error,
      } = await supabase
        .from("tasks")
        .delete()
        .eq(
          "id",
          task.id
        )

      if (error) {
        throw error
      }

      setTaskMessage(
        "Task deleted successfully."
      )

      if (
        taskForm.id ===
        task.id
      ) {
        resetTaskForm()
      }

      await loadTasks()
    } catch (error) {
      console.error(
        "DELETE TASK ERROR:",
        error
      )

      setTaskMessage(
        error.message ||
          "Unable to delete task."
      )
    } finally {
      setActionLoading(false)
    }
  }

  // =====================================================
  // SETTINGS CHANGE
  // =====================================================

  const handleSettingsChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target

    setSettingsForm(
      (previous) => ({
        ...previous,
        [name]:
          value,
      })
    )
  }

  // =====================================================
  // SAVE SETTINGS
  // =====================================================

  const saveSettings = async (
    event
  ) => {
    event.preventDefault()

    setSettingsMessage("")

    const minimumDeposit =
      Number(
        settingsForm.minimum_deposit
      )

    const minimumWithdrawal =
      Number(
        settingsForm.minimum_withdrawal
      )

    const referralPercentage =
      Number(
        settingsForm.referral_percentage
      )

    if (
      !Number.isFinite(
        minimumDeposit
      ) ||
      minimumDeposit < 0
    ) {
      setSettingsMessage(
        "Enter a valid minimum deposit."
      )

      return
    }

    if (
      !Number.isFinite(
        minimumWithdrawal
      ) ||
      minimumWithdrawal < 0
    ) {
      setSettingsMessage(
        "Enter a valid minimum withdrawal."
      )

      return
    }

    if (
      !Number.isFinite(
        referralPercentage
      ) ||
      referralPercentage < 0 ||
      referralPercentage > 100
    ) {
      setSettingsMessage(
        "Referral percentage must be between 0 and 100."
      )

      return
    }

    try {
      setActionLoading(true)

      const values = {
        minimum_deposit:
          minimumDeposit,

        minimum_withdrawal:
          minimumWithdrawal,

        referral_percentage:
          referralPercentage,

        updated_at:
          new Date().toISOString(),
      }

      let result

      if (
        settingsForm.id !==
        null
      ) {
        result =
          await supabase
            .from(
              "platform_settings"
            )
            .update(values)
            .eq(
              "id",
              settingsForm.id
            )
      } else {
        result =
          await supabase
            .from(
              "platform_settings"
            )
            .insert(values)
      }

      if (result.error) {
        throw result.error
      }

      setSettingsMessage(
        "Platform settings updated successfully."
      )

      await loadSettings()
    } catch (error) {
      console.error(
        "SAVE SETTINGS ERROR:",
        error
      )

      setSettingsMessage(
        error.message ||
          "Unable to update platform settings."
      )
    } finally {
      setActionLoading(false)
    }
  }

  // =====================================================
  // APPROVE WITHDRAWAL
  // =====================================================

  const approveWithdrawal = async (
    withdrawal
  ) => {
    if (
      !withdrawal?.id ||
      processingWithdrawal ===
        withdrawal.id
    ) {
      return
    }

    const status =
      String(
        withdrawal.status ||
          ""
      ).toLowerCase()

    if (
      status !==
      "pending"
    ) {
      setWithdrawalMessage(
        "This withdrawal is no longer pending."
      )

      return
    }

    const confirmed =
      window.confirm(
        `Approve this withdrawal?\n\nAmount: ₦${formatMoney(
          withdrawal.amount
        )}\nAccount: ${
          withdrawal.account_name ||
          "Unknown"
        }\nBank: ${
          withdrawal.bank_name ||
          "Unknown"
        }`
      )

    if (!confirmed) {
      return
    }

    try {
      setProcessingWithdrawal(
        withdrawal.id
      )

      setWithdrawalMessage("")

      // =================================================
      // FIX:
      // PostgreSQL function uses p_withdrawal_id
      // =================================================

      const {
        error,
      } = await supabase.rpc(
        "approve_withdrawal",
        {
          p_withdrawal_id:
            withdrawal.id,
        }
      )

      if (error) {
        throw error
      }

      setWithdrawalMessage(
        "Withdrawal approved successfully."
      )

      await Promise.all([
        loadWithdrawals(),
        loadProfiles(),
      ])
    } catch (error) {
      console.error(
        "APPROVE WITHDRAWAL ERROR:",
        error
      )

      setWithdrawalMessage(
        error.message ||
          "Unable to approve withdrawal."
      )
    } finally {
      setProcessingWithdrawal(
        null
      )
    }
  }

  // =====================================================
  // REFUND WITHDRAWAL
  // =====================================================

  const refundWithdrawal = async (
    withdrawal
  ) => {
    if (
      !withdrawal?.id ||
      processingWithdrawal ===
        withdrawal.id
    ) {
      return
    }

    const status =
      String(
        withdrawal.status ||
          ""
      ).toLowerCase()

    if (
      status !==
      "pending"
    ) {
      setWithdrawalMessage(
        "This withdrawal is no longer pending."
      )

      return
    }

    const reason =
      window.prompt(
        "Enter the reason for rejecting/refunding this withdrawal:"
      )

    if (
      reason === null
    ) {
      return
    }

    const cleanReason =
      reason.trim()

    if (!cleanReason) {
      setWithdrawalMessage(
        "A reason is required."
      )

      return
    }

    const confirmed =
      window.confirm(
        `Reject/refund this withdrawal?\n\nAmount: ₦${formatMoney(
          withdrawal.amount
        )}\nReason: ${cleanReason}`
      )

    if (!confirmed) {
      return
    }

    try {
      setProcessingWithdrawal(
        withdrawal.id
      )

      setWithdrawalMessage("")

      const {
        error,
      } = await supabase.rpc(
        "refund_withdrawal",
        {
          withdrawal_id:
            withdrawal.id,
          reason:
            cleanReason,
        }
      )

      if (error) {
        throw error
      }

      setWithdrawalMessage(
        "Withdrawal rejected/refunded successfully."
      )

      await Promise.all([
        loadWithdrawals(),
        loadProfiles(),
      ])
    } catch (error) {
      console.error(
        "REFUND WITHDRAWAL ERROR:",
        error
      )

      setWithdrawalMessage(
        error.message ||
          "Unable to refund withdrawal."
      )
    } finally {
      setProcessingWithdrawal(
        null
      )
    }
  }

  // =====================================================
  // SUMMARY
  // =====================================================

  const pendingWithdrawals =
    withdrawals.filter(
      (item) =>
        String(
          item.status || ""
        ).toLowerCase() ===
        "pending"
    )

  const pendingWithdrawalAmount =
    pendingWithdrawals.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.amount || 0
        ),
      0
    )

  const totalWithdrawalAmount =
    withdrawals.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.amount || 0
        ),
      0
    )

  const taskBalance =
    profiles.reduce(
      (
        total,
        profile
      ) =>
        total +
        Number(
          profile.task_balance ||
            0
        ),
      0
    )

  const affiliateBalance =
    profiles.reduce(
      (
        total,
        profile
      ) =>
        total +
        Number(
          profile.affiliate_balance ||
            0
        ),
      0
    )

  const activeTasks =
    tasks.filter(
      (task) =>
        task.is_active
    )

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div
        style={{
          minHeight:
            "100vh",
          display:
            "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          fontFamily:
            "Arial, sans-serif",
          padding:
            20,
        }}
      >
        <div
          style={{
            textAlign:
              "center",
          }}
        >
          <h2>
            Loading Admin Dashboard...
          </h2>

          <p>
            Checking administrator access...
          </p>
        </div>
      </div>
    )
  }

  // =====================================================
  // ACCESS DENIED
  // =====================================================

  if (pageMessage) {
    return (
      <div
        style={{
          minHeight:
            "100vh",
          display:
            "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          padding:
            20,
          background:
            "#fafafa",
          fontFamily:
            "Arial, sans-serif",
        }}
      >
        <div
          style={{
            width:
              "100%",
            maxWidth:
              500,
            background:
              "#fff",
            border:
              "1px solid #ddd",
            borderRadius:
              16,
            padding:
              25,
          }}
        >
          <h1>
            TaskFlow NG
          </h1>

          <h2>
            Admin Access
          </h2>

          <div
            style={{
              padding:
                15,
              marginTop:
                20,
              background:
                "#f3f3f3",
              borderRadius:
                10,
            }}
          >
            {pageMessage}
          </div>

          <button
            onClick={() => {
              window.location.href =
                "/"
            }}
            style={{
              width:
                "100%",
              marginTop:
                20,
              padding:
                14,
              cursor:
                "pointer",
            }}
          >
            Return to Login
          </button>

          {user && (
            <button
              onClick={
                logout
              }
              style={{
                width:
                  "100%",
                marginTop:
                  10,
                padding:
                  14,
                cursor:
                  "pointer",
              }}
            >
              Logout
            </button>
          )}
        </div>
      </div>
    )
  }

  // =====================================================
  // SHARED CARD STYLE
  // =====================================================

  const cardStyle = {
    background:
      "#fff",
    border:
      "1px solid #ddd",
    borderRadius:
      12,
    padding:
      20,
  }

  const inputStyle = {
    width:
      "100%",
    padding:
      "11px 12px",
    border:
      "1px solid #ccc",
    borderRadius:
      8,
    boxSizing:
      "border-box",
    fontSize:
      15,
  }

  const labelStyle = {
    display:
      "block",
    marginBottom:
      6,
    fontWeight:
      "bold",
    fontSize:
      14,
  }

  const primaryButton = {
    padding:
      "11px 16px",
    border:
      "none",
    borderRadius:
      8,
    background:
      "#111",
    color:
      "#fff",
    cursor:
      "pointer",
    fontWeight:
      "bold",
  }

  const secondaryButton = {
    padding:
      "10px 14px",
    border:
      "1px solid #ccc",
    borderRadius:
      8,
    background:
      "#fff",
    color:
      "#111",
    cursor:
      "pointer",
  }

  // =====================================================
  // DASHBOARD
  // =====================================================

  return (
    <div
      style={{
        minHeight:
          "100vh",
        background:
          "#fafafa",
        fontFamily:
          "Arial, sans-serif",
        padding:
          20,
        boxSizing:
          "border-box",
      }}
    >
      <div
        style={{
          maxWidth:
            1400,
          margin:
            "0 auto",
        }}
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <div
          style={{
            display:
              "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            flexWrap:
              "wrap",
            gap:
              15,
            marginBottom:
              20,
          }}
        >
          <div>
            <h1
              style={{
                margin:
                  "0 0 5px",
              }}
            >
              TaskFlow NG
            </h1>

            <p
              style={{
                margin:
                  0,
                color:
                  "#666",
              }}
            >
              Admin Dashboard
            </p>
          </div>

          <button
            onClick={
              logout
            }
            style={
              secondaryButton
            }
          >
            Logout
          </button>
        </div>

        {/* =================================================
            NAVIGATION
        ================================================= */}

        <div
          style={{
            display:
              "flex",
            flexWrap:
              "wrap",
            gap:
              8,
            marginBottom:
              25,
          }}
        >
          {[
            ["overview", "Overview"],
            ["users", "Users"],
            ["tasks", "Tasks"],
            ["settings", "App Settings"],
            ["withdrawals", "Withdrawals"],
          ].map(
            (item) => (
              <button
                key={
                  item[0]
                }
                onClick={() =>
                  setActiveSection(
                    item[0]
                  )
                }
                style={{
                  padding:
                    "11px 16px",
                  borderRadius:
                    8,
                  border:
                    "1px solid #ccc",
                  background:
                    activeSection ===
                    item[0]
                      ? "#111"
                      : "#fff",
                  color:
                    activeSection ===
                    item[0]
                      ? "#fff"
                      : "#111",
                  cursor:
                    "pointer",
                  fontWeight:
                    activeSection ===
                    item[0]
                      ? "bold"
                      : "normal",
                }}
              >
                {item[1]}

                {item[0] ===
                  "withdrawals" &&
                  pendingWithdrawals.length >
                    0 && (
                    <span
                      style={{
                        marginLeft:
                          7,
                        background:
                          "#dc3545",
                        color:
                          "#fff",
                        padding:
                          "2px 7px",
                        borderRadius:
                          20,
                        fontSize:
                          11,
                      }}
                    >
                      {
                        pendingWithdrawals.length
                      }
                    </span>
                  )}
              </button>
            )
          )}

          <button
            onClick={
              refreshDashboard
            }
            style={
              secondaryButton
            }
          >
            Refresh
          </button>
        </div>

        {/* =================================================
            ADMIN ACCOUNT
        ================================================= */}

        <div
          style={{
            ...cardStyle,
            marginBottom:
              20,
          }}
        >
          <strong>
            Admin:
          </strong>{" "}
          {user?.email}

          <div
            style={{
              marginTop:
                6,
              fontSize:
                12,
              color:
                "#666",
              wordBreak:
                "break-all",
            }}
          >
            {user?.id}
          </div>
        </div>

        {/* =================================================
            OVERVIEW
        ================================================= */}

        {activeSection ===
          "overview" && (
          <>
            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(190px, 1fr))",
                gap:
                  15,
                marginBottom:
                  20,
              }}
            >
              <div
                style={
                  cardStyle
                }
              >
                <p>
                  Total Users
                </p>

                <h2>
                  {
                    profiles.length
                  }
                </h2>
              </div>

              <div
                style={
                  cardStyle
                }
              >
                <p>
                  Total Task Balance
                </p>

                <h2>
                  ₦
                  {formatMoney(
                    taskBalance
                  )}
                </h2>
              </div>

              <div
                style={
                  cardStyle
                }
              >
                <p>
                  Total Affiliate Balance
                </p>

                <h2>
                  ₦
                  {formatMoney(
                    affiliateBalance
                  )}
                </h2>
              </div>

              <div
                style={
                  cardStyle
                }
              >
                <p>
                  Total Tasks
                </p>

                <h2>
                  {
                    tasks.length
                  }
                </h2>
              </div>

              <div
                style={
                  cardStyle
                }
              >
                <p>
                  Active Tasks
                </p>

                <h2>
                  {
                    activeTasks.length
                  }
                </h2>
              </div>

              <div
                style={
                  cardStyle
                }
              >
                <p>
                  Pending Withdrawals
                </p>

                <h2>
                  {
                    pendingWithdrawals.length
                  }
                </h2>
              </div>

              <div
                style={
                  cardStyle
                }
              >
                <p>
                  Pending Withdrawal Amount
                </p>

                <h2>
                  ₦
                  {formatMoney(
                    pendingWithdrawalAmount
                  )}
                </h2>
              </div>

              <div
                style={
                  cardStyle
                }
              >
                <p>
                  Total Withdrawal Amount
                </p>

                <h2>
                  ₦
                  {formatMoney(
                    totalWithdrawalAmount
                  )}
                </h2>
              </div>
            </div>

            <div
              style={
                cardStyle
              }
            >
              <h2>
                Quick Management
              </h2>

              <div
                style={{
                  display:
                    "flex",
                  flexWrap:
                    "wrap",
                  gap:
                    10,
                }}
              >
                <button
                  onClick={() =>
                    setActiveSection(
                      "tasks"
                    )
                  }
                  style={
                    primaryButton
                  }
                >
                  Manage Tasks
                </button>

                <button
                  onClick={() =>
                    setActiveSection(
                      "settings"
                    )
                  }
                  style={
                    secondaryButton
                  }
                >
                  App Settings
                </button>

                <button
                  onClick={() =>
                    setActiveSection(
                      "withdrawals"
                    )
                  }
                  style={
                    secondaryButton
                  }
                >
                  Manage Withdrawals
                </button>

                <button
                  onClick={() =>
                    setActiveSection(
                      "users"
                    )
                  }
                  style={
                    secondaryButton
                  }
                >
                  View Users
                </button>
              </div>
            </div>
          </>
        )}

        {/* =================================================
            USERS
        ================================================= */}

        {activeSection ===
          "users" && (
          <div
            style={
              cardStyle
            }
          >
            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                flexWrap:
                  "wrap",
                gap:
                  10,
              }}
            >
              <div>
                <h2>
                  Users
                </h2>

                <p
                  style={{
                    color:
                      "#666",
                  }}
                >
                  {
                    profiles.length
                  }{" "}
                  registered user
                  {profiles.length ===
                  1
                    ? ""
                    : "s"}
                </p>
              </div>

              <button
                onClick={
                  loadProfiles
                }
                style={
                  secondaryButton
                }
              >
                Refresh
              </button>
            </div>

            {profiles.length ===
            0 ? (
              <p>
                No users found.
              </p>
            ) : (
              <div
                style={{
                  overflowX:
                    "auto",
                }}
              >
                <table
                  style={{
                    width:
                      "100%",
                    borderCollapse:
                      "collapse",
                    minWidth:
                      1000,
                  }}
                >
                  <thead>
                    <tr>
                      {[
                        "Name",
                        "User ID",
                        "Task Balance",
                        "Affiliate Balance",
                        "Role",
                        "Status",
                        "Referral Code",
                      ].map(
                        (heading) => (
                          <th
                            key={
                              heading
                            }
                            style={{
                              textAlign:
                                "left",
                              padding:
                                12,
                              borderBottom:
                                "1px solid #ddd",
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {
                              heading
                            }
                          </th>
                        )
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {profiles.map(
                      (
                        profile
                      ) => (
                        <tr
                          key={
                            profile.id
                          }
                        >
                          <td
                            style={{
                              padding:
                                12,
                              borderBottom:
                                "1px solid #eee",
                            }}
                          >
                            {profile.full_name ||
                              "—"}
                          </td>

                          <td
                            style={{
                              padding:
                                12,
                              borderBottom:
                                "1px solid #eee",
                              fontSize:
                                11,
                              wordBreak:
                                "break-all",
                            }}
                          >
                            {
                              profile.id
                            }
                          </td>

                          <td
                            style={{
                              padding:
                                12,
                              borderBottom:
                                "1px solid #eee",
                            }}
                          >
                            ₦
                            {formatMoney(
                              profile.task_balance
                            )}
                          </td>

                          <td
                            style={{
                              padding:
                                12,
                              borderBottom:
                                "1px solid #eee",
                            }}
                          >
                            ₦
                            {formatMoney(
                              profile.affiliate_balance
                            )}
                          </td>

                          <td
                            style={{
                              padding:
                                12,
                              borderBottom:
                                "1px solid #eee",
                            }}
                          >
                            {profile.role ||
                              "user"}
                          </td>

                          <td
                            style={{
                              padding:
                                12,
                              borderBottom:
                                "1px solid #eee",
                            }}
                          >
                            {profile.is_active
                              ? "Active"
                              : "Inactive"}
                          </td>

                          <td
                            style={{
                              padding:
                                12,
                              borderBottom:
                                "1px solid #eee",
                            }}
                          >
                            {profile.referral_code ||
                              "—"}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* =================================================
            TASKS
        ================================================= */}

        {activeSection ===
          "tasks" && (
          <>
            <div
              style={{
                ...cardStyle,
                marginBottom:
                  20,
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  flexWrap:
                    "wrap",
                  gap:
                    10,
                }}
              >
                <div>
                  <h2>
                    {editingTask
                      ? "Edit Task"
                      : "Add New Task"}
                  </h2>

                  <p
                    style={{
                      color:
                        "#666",
                    }}
                  >
                    {editingTask
                      ? "Update the selected task."
                      : "Create a new task for users."}
                  </p>
                </div>

                {editingTask && (
                  <button
                    type="button"
                    onClick={
                      resetTaskForm
                    }
                    style={
                      secondaryButton
                    }
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              {taskMessage && (
                <div
                  style={{
                    padding:
                      12,
                    marginBottom:
                      15,
                    borderRadius:
                      8,
                    background:
                      "#f3f3f3",
                    border:
                      "1px solid #ddd",
                  }}
                >
                  {
                    taskMessage
                  }
                </div>
              )}

              <form
                onSubmit={
                  saveTask
                }
              >
                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(250px, 1fr))",
                    gap:
                      15,
                  }}
                >
                  <div>
                    <label
                      style={
                        labelStyle
                      }
                    >
                      Task Title
                    </label>

                    <input
                      name="title"
                      value={
                        taskForm.title
                      }
                      onChange={
                        handleTaskChange
                      }
                      placeholder="e.g. Follow our Instagram page"
                      style={
                        inputStyle
                      }
                    />
                  </div>

                  <div>
                    <label
                      style={
                        labelStyle
                      }
                    >
                      Reward
                    </label>

                    <input
                      name="reward"
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        taskForm.reward
                      }
                      onChange={
                        handleTaskChange
                      }
                      placeholder="100"
                      style={
                        inputStyle
                      }
                    />
                  </div>

                  <div>
                    <label
                      style={
                        labelStyle
                      }
                    >
                      Task Type
                    </label>

                    <input
                      name="task_type"
                      value={
                        taskForm.task_type
                      }
                      onChange={
                        handleTaskChange
                      }
                      placeholder="social, website, survey..."
                      style={
                        inputStyle
                      }
                    />
                  </div>

                  <div>
                    <label
                      style={
                        labelStyle
                      }
                    >
                      Verification Method
                    </label>

                    <input
                      name="verification_method"
                      value={
                        taskForm.verification_method
                      }
                      onChange={
                        handleTaskChange
                      }
                      placeholder="manual, link, screenshot..."
                      style={
                        inputStyle
                      }
                    />
                  </div>

                  <div>
                    <label
                      style={
                        labelStyle
                      }
                    >
                      Maximum Completions
                    </label>

                    <input
                      name="max_completions"
                      type="number"
                      min="1"
                      step="1"
                      value={
                        taskForm.max_completions
                      }
                      onChange={
                        handleTaskChange
                      }
                      placeholder="Leave blank for unlimited"
                      style={
                        inputStyle
                      }
                    />
                  </div>

                  <div>
                    <label
                      style={
                        labelStyle
                      }
                    >
                      Starts At
                    </label>

                    <input
                      name="starts_at"
                      type="datetime-local"
                      value={
                        taskForm.starts_at
                      }
                      onChange={
                        handleTaskChange
                      }
                      style={
                        inputStyle
                      }
                    />
                  </div>

                  <div>
                    <label
                      style={
                        labelStyle
                      }
                    >
                      Ends At
                    </label>

                    <input
                      name="ends_at"
                      type="datetime-local"
                      value={
                        taskForm.ends_at
                      }
                      onChange={
                        handleTaskChange
                      }
                      style={
                        inputStyle
                      }
                    />
                  </div>

                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap:
                        10,
                      paddingTop:
                        25,
                    }}
                  >
                    <input
                      id="task-active"
                      name="is_active"
                      type="checkbox"
                      checked={
                        taskForm.is_active
                      }
                      onChange={
                        handleTaskChange
                      }
                    />

                    <label
                      htmlFor="task-active"
                    >
                      Task is active
                    </label>
                  </div>
                </div>

                <div
                  style={{
                    marginTop:
                      15,
                  }}
                >
                  <label
                    style={
                      labelStyle
                    }
                  >
                    Description
                  </label>

                  <textarea
                    name="description"
                    value={
                      taskForm.description
                    }
                    onChange={
                      handleTaskChange
                    }
                    rows="5"
                    placeholder="Explain exactly what the user needs to do..."
                    style={{
                      ...inputStyle,
                      resize:
                        "vertical",
                    }}
                  />
                </div>

                <div
                  style={{
                    marginTop:
                      20,
                    display:
                      "flex",
                    gap:
                      10,
                    flexWrap:
                      "wrap",
                  }}
                >
                  <button
                    type="submit"
                    disabled={
                      actionLoading
                    }
                    style={{
                      ...primaryButton,
                      opacity:
                        actionLoading
                          ? 0.6
                          : 1,
                    }}
                  >
                    {actionLoading
                      ? "Saving..."
                      : editingTask
                      ? "Update Task"
                      : "Create Task"}
                  </button>

                  {editingTask && (
                    <button
                      type="button"
                      onClick={
                        resetTaskForm
                      }
                      style={
                        secondaryButton
                      }
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div
              style={
                cardStyle
              }
            >
              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  flexWrap:
                    "wrap",
                  gap:
                    10,
                  marginBottom:
                    15,
                }}
              >
                <div>
                  <h2>
                    Existing Tasks
                  </h2>

                  <p
                    style={{
                      margin:
                        0,
                      color:
                        "#666",
                    }}
                  >
                    {
                      tasks.length
                    }{" "}
                    total task
                    {tasks.length ===
                    1
                      ? ""
                      : "s"}
                  </p>
                </div>

                <button
                  onClick={
                    loadTasks
                  }
                  style={
                    secondaryButton
                  }
                >
                  Refresh
                </button>
              </div>

              {tasksLoading ? (
                <p>
                  Loading tasks...
                </p>
              ) : tasks.length ===
                0 ? (
                <p>
                  No tasks found.
                </p>
              ) : (
                <div
                  style={{
                    overflowX:
                      "auto",
                  }}
                >
                  <table
                    style={{
                      width:
                        "100%",
                      borderCollapse:
                        "collapse",
                      minWidth:
                        1400,
                    }}
                  >
                    <thead>
                      <tr>
                        {[
                          "Title",
                          "Reward",
                          "Type",
                          "Verification",
                          "Max",
                          "Starts",
                          "Ends",
                          "Status",
                          "Actions",
                        ].map(
                          (
                            heading
                          ) => (
                            <th
                              key={
                                heading
                              }
                              style={{
                                textAlign:
                                  "left",
                                padding:
                                  12,
                                borderBottom:
                                  "1px solid #ddd",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {
                                heading
                              }
                            </th>
                          )
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {tasks.map(
                        (
                          task
                        ) => (
                          <tr
                            key={
                              task.id
                            }
                          >
                            <td
                              style={{
                                padding:
                                  12,
                                borderBottom:
                                  "1px solid #eee",
                                maxWidth:
                                  300,
                              }}
                            >
                              <strong>
                                {
                                  task.title
                                }
                              </strong>

                              {task.description && (
                                <div
                                  style={{
                                    marginTop:
                                      5,
                                    fontSize:
                                      12,
                                    color:
                                      "#666",
                                  }}
                                >
                                  {
                                    task.description
                                  }
                                </div>
                              )}
                            </td>

                            <td
                              style={{
                                padding:
                                  12,
                                borderBottom:
                                  "1px solid #eee",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              ₦
                              {formatMoney(
                                task.reward
                              )}
                            </td>

                            <td
                              style={{
                                padding:
                                  12,
                                borderBottom:
                                  "1px solid #eee",
                              }}
                            >
                              {
                                task.task_type ||
                                "—"
                              }
                            </td>

                            <td
                              style={{
                                padding:
                                  12,
                                borderBottom:
                                  "1px solid #eee",
                              }}
                            >
                              {
                                task.verification_method ||
                                "—"
                              }
                            </td>

                            <td
                              style={{
                                padding:
                                  12,
                                borderBottom:
                                  "1px solid #eee",
                              }}
                            >
                              {
                                task.max_completions ??
                                "Unlimited"
                              }
                            </td>

                            <td
                              style={{
                                padding:
                                  12,
                                borderBottom:
                                  "1px solid #eee",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {formatDate(
                                task.starts_at
                              )}
                            </td>

                            <td
                              style={{
                                padding:
                                  12,
                                borderBottom:
                                  "1px solid #eee",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {formatDate(
                                task.ends_at
                              )}
                            </td>

                            <td
                              style={{
                                padding:
                                  12,
                                borderBottom:
                                  "1px solid #eee",
                              }}
                            >
                              <span
                                style={{
                                  padding:
                                    "5px 9px",
                                  borderRadius:
                                    20,
                                  background:
                                    task.is_active
                                      ? "#d1e7dd"
                                      : "#f8d7da",
                                  color:
                                    task.is_active
                                      ? "#0f5132"
                                      : "#842029",
                                  fontSize:
                                    12,
                                  fontWeight:
                                    "bold",
                                }}
                              >
                                {task.is_active
                                  ? "Active"
                                  : "Inactive"}
                              </span>
                            </td>

                            <td
                              style={{
                                padding:
                                  12,
                                borderBottom:
                                  "1px solid #eee",
                              }}
                            >
                              <div
                                style={{
                                  display:
                                    "flex",
                                  gap:
                                    7,
                                  flexWrap:
                                    "wrap",
                                }}
                              >
                                <button
                                  onClick={() =>
                                    startEditTask(
                                      task
                                    )
                                  }
                                  style={
                                    secondaryButton
                                  }
                                >
                                  Edit
                                </button>

                                <button
                                  onClick={() =>
                                    toggleTask(
                                      task
                                    )
                                  }
                                  disabled={
                                    actionLoading
                                  }
                                  style={
                                    secondaryButton
                                  }
                                >
                                  {task.is_active
                                    ? "Deactivate"
                                    : "Activate"}
                                </button>

                                <button
                                  onClick={() =>
                                    deleteTask(
                                      task
                                    )
                                  }
                                  disabled={
                                    actionLoading
                                  }
                                  style={{
                                    padding:
                                      "10px 14px",
                                    border:
                                      "none",
                                    borderRadius:
                                      8,
                                    background:
                                      "#dc3545",
                                    color:
                                      "#fff",
                                    cursor:
                                      "pointer",
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* =================================================
            APP SETTINGS
        ================================================= */}

        {activeSection ===
          "settings" && (
          <div
            style={
              cardStyle
            }
          >
            <h2>
              App Settings
            </h2>

            <p
              style={{
                color:
                  "#666",
              }}
            >
              Change the main financial settings used by the application.
            </p>

            {settingsMessage && (
              <div
                style={{
                  padding:
                    12,
                  marginBottom:
                    15,
                  borderRadius:
                    8,
                  background:
                    "#f3f3f3",
                  border:
                    "1px solid #ddd",
                }}
              >
                {
                  settingsMessage
                }
              </div>
            )}

            {settingsLoading ? (
              <p>
                Loading settings...
              </p>
            ) : (
              <form
                onSubmit={
                  saveSettings
                }
              >
                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(250px, 1fr))",
                    gap:
                      15,
                  }}
                >
                  <div>
                    <label
                      style={
                        labelStyle
                      }
                    >
                      Minimum Deposit
                    </label>

                    <input
                      name="minimum_deposit"
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        settingsForm.minimum_deposit
                      }
                      onChange={
                        handleSettingsChange
                      }
                      style={
                        inputStyle
                      }
                    />
                  </div>

                  <div>
                    <label
                      style={
                        labelStyle
                      }
                    >
                      Minimum Withdrawal
                    </label>

                    <input
                      name="minimum_withdrawal"
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        settingsForm.minimum_withdrawal
                      }
                      onChange={
                        handleSettingsChange
                      }
                      style={
                        inputStyle
                      }
                    />
                  </div>

                  <div>
                    <label
                      style={
                        labelStyle
                      }
                    >
                      Referral Percentage
                    </label>

                    <input
                      name="referral_percentage"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={
                        settingsForm.referral_percentage
                      }
                      onChange={
                        handleSettingsChange
                      }
                      style={
                        inputStyle
                      }
                    />

                    <small
                      style={{
                        display:
                          "block",
                        marginTop:
                          5,
                        color:
                          "#666",
                      }}
                    >
                      Enter a percentage from 0 to 100.
                    </small>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    actionLoading
                  }
                  style={{
                    ...primaryButton,
                    marginTop:
                      20,
                    opacity:
                      actionLoading
                        ? 0.6
                        : 1,
                  }}
                >
                  {actionLoading
                    ? "Saving..."
                    : "Save Settings"}
                </button>
              </form>
            )}
          </div>
        )}

        {/* =================================================
            WITHDRAWALS
        ================================================= */}

        {activeSection ===
          "withdrawals" && (
          <div
            style={
              cardStyle
            }
          >
            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                flexWrap:
                  "wrap",
                gap:
                  10,
                marginBottom:
                  15,
              }}
            >
              <div>
                <h2>
                  Withdrawals
                </h2>

                <p
                  style={{
                    color:
                      "#666",
                  }}
                >
                  Review and manage withdrawal requests.
                </p>
              </div>

              <button
                onClick={
                  loadWithdrawals
                }
                style={
                  secondaryButton
                }
              >
                Refresh
              </button>
            </div>

            {withdrawalMessage && (
              <div
                style={{
                  padding:
                    12,
                  marginBottom:
                    15,
                  borderRadius:
                    8,
                  background:
                    "#f3f3f3",
                  border:
                    "1px solid #ddd",
                }}
              >
                {
                  withdrawalMessage
                }
              </div>
            )}

            {withdrawalsLoading ? (
              <p>
                Loading withdrawals...
              </p>
            ) : withdrawals.length ===
              0 ? (
              <p>
                No withdrawals found.
              </p>
            ) : (
              <div
                style={{
                  overflowX:
                    "auto",
                }}
              >
                <table
                  style={{
                    width:
                      "100%",
                    borderCollapse:
                      "collapse",
                    minWidth:
                      1500,
                  }}
                >
                  <thead>
                    <tr>
                      {[
                        "User",
                        "User ID",
                        "Amount",
                        "Balance Type",
                        "Bank",
                        "Account Number",
                        "Account Name",
                        "Reference",
                        "Date",
                        "Status",
                        "Actions",
                      ].map(
                        (
                          heading
                        ) => (
                          <th
                            key={
                              heading
                            }
                            style={{
                              textAlign:
                                "left",
                              padding:
                                12,
                              borderBottom:
                                "1px solid #ddd",
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {
                              heading
                            }
                          </th>
                        )
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {withdrawals.map(
                      (
                        withdrawal
                      ) => {
                        const status =
                          String(
                            withdrawal.status ||
                              ""
                          ).toLowerCase()

                        const pending =
                          status ===
                          "pending"

                        const processing =
                          processingWithdrawal ===
                          withdrawal.id

                        return (
                          <tr
                            key={
                              withdrawal.id
                            }
                          >
                            <td
                              style={{
                                padding:
                                  12,
                                borderBottom:
                                  "1px solid #eee",
                              }}
                            >
                              {
                                withdrawal.full_name ||
                                "—"
                              }
                            </td>

                            <td
                              style={{
                                padding:
                                  12,
                                borderBottom:
                                  "1px solid #eee",
                                fontSize:
                                  11,
                                wordBreak:
                                  "break-all",
                              }}
                            >
                              {
                                withdrawal.user_id
                              }
                            </td>

                            <td
                              style={{
                                padding:
                                  12,
                                borderBottom:
                                  "1px solid #eee",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              <strong>
                                ₦
                                {formatMoney(
                                  withdrawal.amount
                                )}
                              </strong>
                            </td>

                            <td
                              style={{
                                padding:
                                  12,
                                borderBottom:
                                  "1px solid #eee",
                              }}
                            >
                              {
                                withdrawal.balance_type ||
                                "—"
                              }
                            </td>

                            <td
                              style={{
                                padding:
                                  12,
                                borderBottom:
                                  "1px solid #eee",
                              }}
                            >
                              {
                                withdrawal.bank_name ||
                                "—"
                              }
                            </td>

                            <td
                              style={{
                                padding:
                                  12,
                                borderBottom:
                                  "1px solid #eee",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {
                                withdrawal.account_number ||
                                "—"
                              }
                            </td>

                            <td
                              style={{
                                padding:
                                  12,
                                borderBottom:
                                  "1px solid #eee",
                              }}
                            >
                              {
                                withdrawal.account_name ||
                                "—"
                              }
                            </td>

                            <td
                              style={{
                                padding:
                                  12,
                                borderBottom:
                                  "1px solid #eee",
                                fontSize:
                                  12,
                              }}
                            >
                              {
                                withdrawal.payment_reference ||
                                "—"
                              }
                            </td>

                            <td
                              style={{
                                padding:
                                  12,
                                borderBottom:
                                  "1px solid #eee",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {formatDate(
                                withdrawal.created_at
                              )}
                            </td>

                            <td
                              style={{
                                padding:
                                  12,
                                borderBottom:
                                  "1px solid #eee",
                              }}
                            >
                              <span
                                style={{
                                  display:
                                    "inline-block",
                                  padding:
                                    "5px 9px",
                                  borderRadius:
                                    20,
                                  fontSize:
                                    12,
                                  fontWeight:
                                    "bold",
                                  whiteSpace:
                                    "nowrap",
                                  ...getStatusStyle(
                                    withdrawal.status
                                  ),
                                }}
                              >
                                {
                                  withdrawal.status ||
                                  "Unknown"
                                }
                              </span>
                            </td>

                            <td
                              style={{
                                padding:
                                  12,
                                borderBottom:
                                  "1px solid #eee",
                              }}
                            >
                              {pending ? (
                                <div
                                  style={{
                                    display:
                                      "flex",
                                    flexDirection:
                                      "column",
                                    gap:
                                      7,
                                    minWidth:
                                      140,
                                  }}
                                >
                                  <button
                                    onClick={() =>
                                      approveWithdrawal(
                                        withdrawal
                                      )
                                    }
                                    disabled={
                                      processing
                                    }
                                    style={{
                                      padding:
                                        "10px 12px",
                                      border:
                                        "none",
                                      borderRadius:
                                        7,
                                      background:
                                        "#198754",
                                      color:
                                        "#fff",
                                      fontWeight:
                                        "bold",
                                      cursor:
                                        "pointer",
                                      opacity:
                                        processing
                                          ? 0.6
                                          : 1,
                                    }}
                                  >
                                    {processing
                                      ? "Processing..."
                                      : "Approve"}
                                  </button>

                                  <button
                                    onClick={() =>
                                      refundWithdrawal(
                                        withdrawal
                                      )
                                    }
                                    disabled={
                                      processing
                                    }
                                    style={{
                                      padding:
                                        "10px 12px",
                                      border:
                                        "none",
                                      borderRadius:
                                        7,
                                      background:
                                        "#dc3545",
                                      color:
                                        "#fff",
                                      fontWeight:
                                        "bold",
                                      cursor:
                                        "pointer",
                                      opacity:
                                        processing
                                          ? 0.6
                                          : 1,
                                    }}
                                  >
                                    {processing
                                      ? "Processing..."
                                      : "Reject / Refund"}
                                  </button>
                                </div>
                              ) : (
                                <span
                                  style={{
                                    color:
                                      "#666",
                                    fontSize:
                                      12,
                                  }}
                                >
                                  No action
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      }
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

export default Admin
