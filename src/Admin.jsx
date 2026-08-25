import { useEffect, useState } from "react"
import { supabase } from "./supabase"

function Admin() {
  const [user, setUser] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [withdrawals, setWithdrawals] = useState([])

  const [loading, setLoading] = useState(true)
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false)

  const [message, setMessage] = useState("")
  const [withdrawalMessage, setWithdrawalMessage] = useState("")

  const [processingWithdrawal, setProcessingWithdrawal] =
    useState(null)

  const [activeSection, setActiveSection] =
    useState("overview")

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
      return value
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
      setWithdrawalMessage("")

      const {
        data,
        error,
      } = await supabase
        .from("withdrawals")
        .select("*")
        .order("created_at", {
          ascending: false,
        })

      console.log(
        "WITHDRAWALS:",
        data
      )

      console.log(
        "WITHDRAWALS ERROR:",
        error
      )

      if (error) {
        console.error(
          "LOAD WITHDRAWALS ERROR:",
          error
        )

        setWithdrawalMessage(
          "Unable to load withdrawals. Please check the withdrawals table RLS policy."
        )

        return
      }

      setWithdrawals(data || [])
    } catch (error) {
      console.error(
        "WITHDRAWALS LOAD ERROR:",
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
  // REFRESH DASHBOARD DATA
  // =====================================================

  const refreshDashboard = async () => {
    try {
      setWithdrawalMessage("")

      await Promise.all([
        loadProfiles(),
        loadWithdrawals(),
      ])
    } catch (error) {
      console.error(
        "REFRESH DASHBOARD ERROR:",
        error
      )

      setMessage(
        "Unable to refresh dashboard data."
      )
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
        setMessage("")

        // =================================================
        // GET CURRENT SESSION
        // =================================================

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        console.log(
          "ADMIN SESSION:",
          session
        )

        if (sessionError) {
          console.error(
            "ADMIN SESSION ERROR:",
            sessionError
          )

          if (mounted) {
            setMessage(
              "Unable to check your login session."
            )
          }

          return
        }

        // =================================================
        // NO LOGIN SESSION
        // =================================================

        if (!session?.user) {
          console.log(
            "NO ADMIN SESSION FOUND"
          )

          if (mounted) {
            setMessage(
              "You must be logged in to access the admin page."
            )
          }

          return
        }

        if (!mounted) {
          return
        }

        setUser(session.user)

        console.log(
          "ADMIN USER:",
          session.user.id
        )

        console.log(
          "ADMIN EMAIL:",
          session.user.email
        )

        // =================================================
        // CHECK ADMIN STATUS
        // =================================================

        const {
          data: adminStatus,
          error: adminError,
        } = await supabase.rpc(
          "is_admin"
        )

        console.log(
          "IS ADMIN RESULT:",
          adminStatus
        )

        console.log(
          "IS ADMIN ERROR:",
          adminError
        )

        if (adminError) {
          console.error(
            "ADMIN CHECK ERROR:",
            adminError
          )

          if (mounted) {
            setMessage(
              "Unable to verify administrator access."
            )
          }

          return
        }

        // =================================================
        // NOT ADMIN
        // =================================================

        if (adminStatus !== true) {
          console.log(
            "ACCESS DENIED"
          )

          if (mounted) {
            setMessage(
              "Access denied. This account is not an administrator."
            )
          }

          return
        }

        console.log(
          "ADMIN ACCESS CONFIRMED"
        )

        // =================================================
        // LOAD DASHBOARD
        // =================================================

        await Promise.all([
          loadProfiles(),
          loadWithdrawals(),
        ])
      } catch (error) {
        console.error(
          "ADMIN INITIALIZATION ERROR:",
          error
        )

        if (mounted) {
          setMessage(
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
  // APPROVE WITHDRAWAL
  // =====================================================

  const approveWithdrawal = async (
    withdrawal
  ) => {
    if (!withdrawal?.id) {
      return
    }

    if (
      processingWithdrawal ===
      withdrawal.id
    ) {
      return
    }

    const currentStatus =
      String(
        withdrawal.status || ""
      ).toLowerCase()

    if (
      currentStatus !==
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
        }\n\nThis will execute the secured approve_withdrawal function.`
      )

    if (!confirmed) {
      return
    }

    try {
      setProcessingWithdrawal(
        withdrawal.id
      )

      setWithdrawalMessage("")

      console.log(
        "APPROVING WITHDRAWAL:",
        withdrawal.id
      )

      const {
        data,
        error,
      } = await supabase.rpc(
        "approve_withdrawal",
        {
          withdrawal_id:
            withdrawal.id,
        }
      )

      console.log(
        "APPROVE RESULT:",
        data
      )

      console.log(
        "APPROVE ERROR:",
        error
      )

      if (error) {
        console.error(
          "APPROVE WITHDRAWAL ERROR:",
          error
        )

        setWithdrawalMessage(
          error.message ||
            "Unable to approve withdrawal."
        )

        return
      }

      setWithdrawalMessage(
        "Withdrawal approved successfully."
      )

      // Refresh everything because
      // approval may affect withdrawal
      // status and user balances.
      await Promise.all([
        loadWithdrawals(),
        loadProfiles(),
      ])
    } catch (error) {
      console.error(
        "APPROVE WITHDRAWAL EXCEPTION:",
        error
      )

      setWithdrawalMessage(
        error?.message ||
          "Something went wrong while approving the withdrawal."
      )
    } finally {
      setProcessingWithdrawal(
        null
      )
    }
  }

  // =====================================================
  // REFUND / REJECT WITHDRAWAL
  // =====================================================

  const refundWithdrawal = async (
    withdrawal
  ) => {
    if (!withdrawal?.id) {
      return
    }

    if (
      processingWithdrawal ===
      withdrawal.id
    ) {
      return
    }

    const currentStatus =
      String(
        withdrawal.status || ""
      ).toLowerCase()

    if (
      currentStatus !==
      "pending"
    ) {
      setWithdrawalMessage(
        "This withdrawal is no longer pending and cannot be refunded from this action."
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
        "A refund/rejection reason is required."
      )

      return
    }

    const confirmed =
      window.confirm(
        `Reject/refund this withdrawal?\n\nAmount: ₦${formatMoney(
          withdrawal.amount
        )}\nReason: ${cleanReason}\n\nThe secured refund_withdrawal function will be called and the user's balance should be restored according to your database function.`
      )

    if (!confirmed) {
      return
    }

    try {
      setProcessingWithdrawal(
        withdrawal.id
      )

      setWithdrawalMessage("")

      console.log(
        "REFUNDING WITHDRAWAL:",
        withdrawal.id
      )

      const {
        data,
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

      console.log(
        "REFUND RESULT:",
        data
      )

      console.log(
        "REFUND ERROR:",
        error
      )

      if (error) {
        console.error(
          "REFUND WITHDRAWAL ERROR:",
          error
        )

        setWithdrawalMessage(
          error.message ||
            "Unable to refund withdrawal."
        )

        return
      }

      setWithdrawalMessage(
        "Withdrawal rejected/refunded successfully. User balance has been refreshed."
      )

      await Promise.all([
        loadWithdrawals(),
        loadProfiles(),
      ])
    } catch (error) {
      console.error(
        "REFUND WITHDRAWAL EXCEPTION:",
        error
      )

      setWithdrawalMessage(
        error?.message ||
          "Something went wrong while refunding the withdrawal."
      )
    } finally {
      setProcessingWithdrawal(
        null
      )
    }
  }

  // =====================================================
  // WITHDRAWAL COUNTS
  // =====================================================

  const pendingWithdrawals =
    withdrawals.filter(
      (withdrawal) =>
        String(
          withdrawal.status || ""
        ).toLowerCase() ===
        "pending"
    )

  const approvedWithdrawals =
    withdrawals.filter(
      (withdrawal) =>
        String(
          withdrawal.status || ""
        ).toLowerCase() ===
          "approved" ||
        String(
          withdrawal.status || ""
        ).toLowerCase() ===
          "processing"
    )

  const completedWithdrawals =
    withdrawals.filter(
      (withdrawal) =>
        String(
          withdrawal.status || ""
        ).toLowerCase() ===
        "completed"
    )

  const refundedWithdrawals =
    withdrawals.filter(
      (withdrawal) => {
        const status =
          String(
            withdrawal.status || ""
          ).toLowerCase()

        return (
          status ===
            "refunded" ||
          status ===
            "rejected" ||
          status ===
            "failed" ||
          status ===
            "reversed"
        )
      }
    )

  const pendingWithdrawalAmount =
    pendingWithdrawals.reduce(
      (
        total,
        withdrawal
      ) =>
        total +
        Number(
          withdrawal.amount || 0
        ),
      0
    )

  const totalWithdrawalAmount =
    withdrawals.reduce(
      (
        total,
        withdrawal
      ) =>
        total +
        Number(
          withdrawal.amount || 0
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

  // =====================================================
  // STATUS DISPLAY
  // =====================================================

  const getStatusStyle = (
    status
  ) => {
    const normalized =
      String(
        status || ""
      ).toLowerCase()

    if (
      normalized ===
        "pending"
    ) {
      return {
        background:
          "#fff3cd",
        color:
          "#856404",
        border:
          "1px solid #ffeeba",
      }
    }

    if (
      normalized ===
        "approved" ||
      normalized ===
        "processing"
    ) {
      return {
        background:
          "#cfe2ff",
        color:
          "#084298",
        border:
          "1px solid #b6d4fe",
      }
    }

    if (
      normalized ===
      "completed"
    ) {
      return {
        background:
          "#d1e7dd",
        color:
          "#0f5132",
        border:
          "1px solid #badbcc",
      }
    }

    if (
      normalized ===
        "refunded" ||
      normalized ===
        "rejected" ||
      normalized ===
        "failed" ||
      normalized ===
        "reversed"
    ) {
      return {
        background:
          "#f8d7da",
        color:
          "#842029",
        border:
          "1px solid #f5c2c7",
      }
    }

    return {
      background:
        "#e2e3e5",
      color:
        "#41464b",
      border:
        "1px solid #d3d6d8",
    }
  }

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
          justifyContent:
            "center",
          alignItems:
            "center",
          fontFamily:
            "Arial, sans-serif",
          padding: 20,
          boxSizing:
            "border-box",
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

  if (message) {
    return (
      <div
        style={{
          minHeight:
            "100vh",
          display:
            "flex",
          justifyContent:
            "center",
          alignItems:
            "center",
          padding: 20,
          boxSizing:
            "border-box",
          fontFamily:
            "Arial, sans-serif",
          background:
            "#fafafa",
        }}
      >
        <div
          style={{
            width:
              "100%",
            maxWidth:
              500,
            border:
              "1px solid #ddd",
            borderRadius:
              16,
            padding:
              25,
            boxSizing:
              "border-box",
            background:
              "#fff",
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
              marginTop:
                20,
              padding:
                15,
              borderRadius:
                10,
              background:
                "#f3f3f3",
              lineHeight:
                1.5,
            }}
          >
            {message}
          </div>

          <button
            onClick={() => {
              window.location.href =
                "/"
            }}
            style={{
              width:
                "100%",
              padding:
                14,
              marginTop:
                20,
              fontSize:
                16,
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
                padding:
                  14,
                marginTop:
                  10,
                fontSize:
                  16,
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
  // DASHBOARD
  // =====================================================

  return (
    <div
      style={{
        minHeight:
          "100vh",
        padding:
          20,
        boxSizing:
          "border-box",
        fontFamily:
          "Arial, sans-serif",
        background:
          "#fafafa",
      }}
    >
      <div
        style={{
          maxWidth:
            1300,
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
            gap:
              15,
            marginBottom:
              20,
            flexWrap:
              "wrap",
          }}
        >
          <div>
            <h1
              style={{
                marginBottom:
                  5,
              }}
            >
              TaskFlow NG
            </h1>

            <p
              style={{
                marginTop:
                  0,
                marginBottom:
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
            style={{
              padding:
                "10px 18px",
              fontSize:
                15,
              cursor:
                "pointer",
            }}
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
            gap:
              10,
            flexWrap:
              "wrap",
            marginBottom:
              25,
          }}
        >
          <button
            onClick={() =>
              setActiveSection(
                "overview"
              )
            }
            style={{
              padding:
                "12px 18px",
              borderRadius:
                8,
              border:
                "1px solid #ccc",
              background:
                activeSection ===
                "overview"
                  ? "#111"
                  : "#fff",
              color:
                activeSection ===
                "overview"
                  ? "#fff"
                  : "#111",
              cursor:
                "pointer",
            }}
          >
            Overview
          </button>

          <button
            onClick={() =>
              setActiveSection(
                "withdrawals"
              )
            }
            style={{
              padding:
                "12px 18px",
              borderRadius:
                8,
              border:
                "1px solid #ccc",
              background:
                activeSection ===
                "withdrawals"
                  ? "#111"
                  : "#fff",
              color:
                activeSection ===
                "withdrawals"
                  ? "#fff"
                  : "#111",
              cursor:
                "pointer",
            }}
          >
            Withdrawals
            {pendingWithdrawals.length >
              0 && (
              <span
                style={{
                  marginLeft:
                    8,
                  background:
                    "#dc3545",
                  color:
                    "#fff",
                  borderRadius:
                    20,
                  padding:
                    "2px 7px",
                  fontSize:
                    12,
                }}
              >
                {
                  pendingWithdrawals.length
                }
              </span>
            )}
          </button>

          <button
            onClick={() =>
              setActiveSection(
                "users"
              )
            }
            style={{
              padding:
                "12px 18px",
              borderRadius:
                8,
              border:
                "1px solid #ccc",
              background:
                activeSection ===
                "users"
                  ? "#111"
                  : "#fff",
              color:
                activeSection ===
                "users"
                  ? "#fff"
                  : "#111",
              cursor:
                "pointer",
            }}
          >
            Users
          </button>

          <button
            onClick={
              refreshDashboard
            }
            style={{
              padding:
                "12px 18px",
              borderRadius:
                8,
              border:
                "1px solid #ccc",
              background:
                "#fff",
              cursor:
                "pointer",
            }}
          >
            Refresh
          </button>
        </div>

        {/* =================================================
            ADMIN ACCOUNT
        ================================================= */}

        <div
          style={{
            border:
              "1px solid #ddd",
            borderRadius:
              12,
            padding:
              20,
            background:
              "#fff",
            marginBottom:
              20,
          }}
        >
          <p
            style={{
              marginTop:
                0,
              marginBottom:
                8,
            }}
          >
            Logged in as admin:
          </p>

          <strong>
            {user?.email}
          </strong>

          <p
            style={{
              fontSize:
                13,
              marginBottom:
                0,
              color:
                "#666",
            }}
          >
            Admin ID:
            {" "}
            {user?.id}
          </p>
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
                  25,
              }}
            >

              {/* TOTAL USERS */}

              <div
                style={{
                  border:
                    "1px solid #ddd",
                  borderRadius:
                    12,
                  padding:
                    20,
                  background:
                    "#fff",
                }}
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

              {/* TASK BALANCE */}

              <div
                style={{
                  border:
                    "1px solid #ddd",
                  borderRadius:
                    12,
                  padding:
                    20,
                  background:
                    "#fff",
                }}
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

              {/* AFFILIATE BALANCE */}

              <div
                style={{
                  border:
                    "1px solid #ddd",
                  borderRadius:
                    12,
                  padding:
                    20,
                  background:
                    "#fff",
                }}
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

              {/* PENDING WITHDRAWALS */}

              <div
                style={{
                  border:
                    "1px solid #ddd",
                  borderRadius:
                    12,
                  padding:
                    20,
                  background:
                    "#fff",
                }}
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

              {/* PENDING AMOUNT */}

              <div
                style={{
                  border:
                    "1px solid #ddd",
                  borderRadius:
                    12,
                  padding:
                    20,
                  background:
                    "#fff",
                }}
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

              {/* TOTAL WITHDRAWALS */}

              <div
                style={{
                  border:
                    "1px solid #ddd",
                  borderRadius:
                    12,
                  padding:
                    20,
                  background:
                    "#fff",
                }}
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

            {/* WITHDRAWAL STATUS SUMMARY */}

            <div
              style={{
                border:
                  "1px solid #ddd",
                borderRadius:
                  12,
                padding:
                  20,
                background:
                  "#fff",
                marginBottom:
                  25,
              }}
            >
              <h2>
                Withdrawal Summary
              </h2>

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(160px, 1fr))",
                  gap:
                    15,
                }}
              >
                <div>
                  <strong>
                    Pending
                  </strong>

                  <div>
                    {
                      pendingWithdrawals.length
                    }
                  </div>
                </div>

                <div>
                  <strong>
                    Approved / Processing
                  </strong>

                  <div>
                    {
                      approvedWithdrawals.length
                    }
                  </div>
                </div>

                <div>
                  <strong>
                    Completed
                  </strong>

                  <div>
                    {
                      completedWithdrawals.length
                    }
                  </div>
                </div>

                <div>
                  <strong>
                    Refunded / Failed
                  </strong>

                  <div>
                    {
                      refundedWithdrawals.length
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* RECENT WITHDRAWALS */}

            <div
              style={{
                border:
                  "1px solid #ddd",
                borderRadius:
                  12,
                padding:
                  20,
                background:
                  "#fff",
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
                  gap:
                    10,
                  flexWrap:
                    "wrap",
                }}
              >
                <h2>
                  Recent Withdrawals
                </h2>

                <button
                  onClick={() =>
                    setActiveSection(
                      "withdrawals"
                    )
                  }
                  style={{
                    padding:
                      "9px 14px",
                    cursor:
                      "pointer",
                  }}
                >
                  Manage Withdrawals
                </button>
              </div>

              {withdrawals.length ===
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
                        700,
                    }}
                  >
                    <thead>
                      <tr>
                        <th
                          style={{
                            textAlign:
                              "left",
                            padding:
                              12,
                            borderBottom:
                              "1px solid #ddd",
                          }}
                        >
                          User
                        </th>

                        <th
                          style={{
                            textAlign:
                              "left",
                            padding:
                              12,
                            borderBottom:
                              "1px solid #ddd",
                          }}
                        >
                          Amount
                        </th>

                        <th
                          style={{
                            textAlign:
                              "left",
                            padding:
                              12,
                            borderBottom:
                              "1px solid #ddd",
                          }}
                        >
                          Status
                        </th>

                        <th
                          style={{
                            textAlign:
                              "left",
                            padding:
                              12,
                            borderBottom:
                              "1px solid #ddd",
                          }}
                        >
                          Date
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {withdrawals
                        .slice(
                          0,
                          10
                        )
                        .map(
                          (
                            withdrawal
                          ) => (
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
                                {withdrawal.full_name ||
                                  withdrawal.user_id ||
                                  "—"}
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
                                  withdrawal.amount
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
                                    ...getStatusStyle(
                                      withdrawal.status
                                    ),
                                  }}
                                >
                                  {withdrawal.status ||
                                    "Unknown"}
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
                                {formatDate(
                                  withdrawal.created_at
                                )}
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
            WITHDRAWALS
        ================================================= */}

        {activeSection ===
          "withdrawals" && (
          <div
            style={{
              border:
                "1px solid #ddd",
              borderRadius:
                12,
              padding:
                20,
              background:
                "#fff",
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
                gap:
                  15,
                flexWrap:
                  "wrap",
                marginBottom:
                  15,
              }}
            >
              <div>
                <h2
                  style={{
                    marginBottom:
                      5,
                  }}
                >
                  Withdrawals
                </h2>

                <p
                  style={{
                    marginTop:
                      0,
                    color:
                      "#666",
                  }}
                >
                  Review and manage user withdrawal requests.
                </p>
              </div>

              <button
                onClick={
                  loadWithdrawals
                }
                disabled={
                  withdrawalsLoading
                }
                style={{
                  padding:
                    "10px 15px",
                  cursor:
                    withdrawalsLoading
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {withdrawalsLoading
                  ? "Refreshing..."
                  : "Refresh Withdrawals"}
              </button>
            </div>

            {/* WITHDRAWAL MESSAGE */}

            {withdrawalMessage && (
              <div
                style={{
                  marginBottom:
                    20,
                  padding:
                    14,
                  borderRadius:
                    10,
                  background:
                    "#f3f3f3",
                  border:
                    "1px solid #ddd",
                  lineHeight:
                    1.5,
                }}
              >
                {withdrawalMessage}
              </div>
            )}

            {/* WITHDRAWAL SUMMARY */}

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(170px, 1fr))",
                gap:
                  12,
                marginBottom:
                  20,
              }}
            >
              <div
                style={{
                  padding:
                    15,
                  borderRadius:
                    10,
                  background:
                    "#fff3cd",
                  border:
                    "1px solid #ffeeba",
                }}
              >
                <div
                  style={{
                    fontSize:
                      13,
                  }}
                >
                  Pending
                </div>

                <strong
                  style={{
                    fontSize:
                      22,
                  }}
                >
                  {
                    pendingWithdrawals.length
                  }
                </strong>
              </div>

              <div
                style={{
                  padding:
                    15,
                  borderRadius:
                    10,
                  background:
                    "#fff3cd",
                  border:
                    "1px solid #ffeeba",
                }}
              >
                <div
                  style={{
                    fontSize:
                      13,
                  }}
                >
                  Pending Amount
                </div>

                <strong
                  style={{
                    fontSize:
                      20,
                  }}
                >
                  ₦
                  {formatMoney(
                    pendingWithdrawalAmount
                  )}
                </strong>
              </div>

              <div
                style={{
                  padding:
                    15,
                  borderRadius:
                    10,
                  background:
                    "#d1e7dd",
                  border:
                    "1px solid #badbcc",
                }}
              >
                <div
                  style={{
                    fontSize:
                      13,
                  }}
                >
                  Completed
                </div>

                <strong
                  style={{
                    fontSize:
                      22,
                  }}
                >
                  {
                    completedWithdrawals.length
                  }
                </strong>
              </div>

              <div
                style={{
                  padding:
                    15,
                  borderRadius:
                    10,
                  background:
                    "#f8d7da",
                  border:
                    "1px solid #f5c2c7",
                }}
              >
                <div
                  style={{
                    fontSize:
                      13,
                  }}
                >
                  Refunded / Failed
                </div>

                <strong
                  style={{
                    fontSize:
                      22,
                  }}
                >
                  {
                    refundedWithdrawals.length
                  }
                </strong>
              </div>
            </div>

            {/* WITHDRAWAL TABLE */}

            {withdrawalsLoading &&
            withdrawals.length ===
              0 ? (
              <div
                style={{
                  padding:
                    30,
                  textAlign:
                    "center",
                }}
              >
                Loading withdrawals...
              </div>
            ) : withdrawals.length ===
              0 ? (
              <div
                style={{
                  padding:
                    30,
                  textAlign:
                    "center",
                  border:
                    "1px dashed #ccc",
                  borderRadius:
                    10,
                }}
              >
                No withdrawal requests found.
              </div>
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

                      <th
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
                        User Name
                      </th>

                      <th
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
                        User ID
                      </th>

                      <th
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
                        Amount
                      </th>

                      <th
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
                        Balance Type
                      </th>

                      <th
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
                        Bank
                      </th>

                      <th
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
                        Account Number
                      </th>

                      <th
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
                        Account Name
                      </th>

                      <th
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
                        Reference
                      </th>

                      <th
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
                        Date
                      </th>

                      <th
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
                        Status
                      </th>

                      <th
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
                        Actions
                      </th>

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

                        const isPending =
                          status ===
                          "pending"

                        const isProcessing =
                          processingWithdrawal ===
                          withdrawal.id

                        return (
                          <tr
                            key={
                              withdrawal.id
                            }
                          >

                            {/* USER NAME */}

                            <td
                              style={{
                                padding:
                                  12,
                                borderBottom:
                                  "1px solid #eee",
                                verticalAlign:
                                  "top",
                              }}
                            >
                              <strong>
                                {withdrawal.full_name ||
                                  "—"}
                              </strong>
                            </td>

                            {/* USER ID */}

                            <td
                              style={{
                                padding:
                                  12,
                                borderBottom:
                                  "1px solid #eee",
                                verticalAlign:
                                  "top",
                                fontSize:
                                  11,
                                maxWidth:
                                  180,
                                wordBreak:
                                  "break-all",
                              }}
                            >
                              {
                                withdrawal.user_id
                              }
                            </td>

                            {/* AMOUNT */}

                            <td
                              style={{
                                padding:
                                  12,
                                borderBottom:
                                  "1px solid #eee",
                                verticalAlign:
                                  "top",
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

                            {/* BALANCE TYPE */}

                            <td
                              style={{
                                padding:
                                  12,
                                borderBottom:
                                  "1px solid #eee",
                                verticalAlign:
                                  "top",
                              }}
                            >
                              {withdrawal.balance_type ||
                                "—"}
                            </td>

                            {/* BANK */}

                            <td
                              style={{
                                padding:
                                  12,
                                borderBottom:
                                  "1px solid #eee",
                                verticalAlign:
                                  "top",
                              }}
                            >
                              {withdrawal.bank_name ||
                                "—"}
                            </td>

                            {/* ACCOUNT NUMBER */}

                            <td
                              style={{
                                padding:
                                  12,
                                borderBottom:
                                  "1px solid #eee",
                                verticalAlign:
                                  "top",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {withdrawal.account_number ||
                                "—"}
                            </td>

                            {/* ACCOUNT NAME */}

                            <td
                              style={{
                                padding:
                                  12,
                                borderBottom:
                                  "1px solid #eee",
                                verticalAlign:
                                  "top",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {withdrawal.account_name ||
                                "—"}
                            </td>

                            {/* REFERENCE */}

                            <td
                              style={{
                                padding:
                                  12,
                                borderBottom:
                                  "1px solid #eee",
                                verticalAlign:
                                  "top",
                                fontSize:
                                  12,
                                maxWidth:
                                  180,
                                wordBreak:
                                  "break-word",
                              }}
                            >
                              {withdrawal.payment_reference ||
                                "—"}
                            </td>

                            {/* DATE */}

                            <td
                              style={{
                                padding:
                                  12,
                                borderBottom:
                                  "1px solid #eee",
                                verticalAlign:
                                  "top",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {formatDate(
                                withdrawal.created_at
                              )}
                            </td>

                            {/* STATUS */}

                            <td
                              style={{
                                padding:
                                  12,
                                borderBottom:
                                  "1px solid #eee",
                                verticalAlign:
                                  "top",
                              }}
                            >
                              <span
                                style={{
                                  display:
                                    "inline-block",
                                  padding:
                                    "6px 10px",
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
                                {withdrawal.status ||
                                  "Unknown"}
                              </span>
                            </td>

                            {/* ACTIONS */}

                            <td
                              style={{
                                padding:
                                  12,
                                borderBottom:
                                  "1px solid #eee",
                                verticalAlign:
                                  "top",
                              }}
                            >
                              {isPending ? (
                                <div
                                  style={{
                                    display:
                                      "flex",
                                    flexDirection:
                                      "column",
                                    gap:
                                      8,
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
                                      isProcessing
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
                                        isProcessing
                                          ? "not-allowed"
                                          : "pointer",
                                      opacity:
                                        isProcessing
                                          ? 0.6
                                          : 1,
                                    }}
                                  >
                                    {isProcessing
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
                                      isProcessing
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
                                        isProcessing
                                          ? "not-allowed"
                                          : "pointer",
                                      opacity:
                                        isProcessing
                                          ? 0.6
                                          : 1,
                                    }}
                                  >
                                    {isProcessing
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
                                      13,
                                  }}
                                >
                                  No action available
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

        {/* =================================================
            USERS
        ================================================= */}

        {activeSection ===
          "users" && (
          <div
            style={{
              border:
                "1px solid #ddd",
              borderRadius:
                12,
              padding:
                20,
              background:
                "#fff",
              overflowX:
                "auto",
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
                gap:
                  15,
                flexWrap:
                  "wrap",
                marginBottom:
                  15,
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
                  {profiles.length} user
                  {profiles.length ===
                  1
                    ? ""
                    : "s"} registered.
                </p>
              </div>

              <button
                onClick={
                  loadProfiles
                }
                style={{
                  padding:
                    "10px 15px",
                  cursor:
                    "pointer",
                }}
              >
                Refresh Users
              </button>
            </div>

            {profiles.length ===
            0 ? (
              <p>
                No users found.
              </p>
            ) : (
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

                    <th
                      style={{
                        textAlign:
                          "left",
                        padding:
                          12,
                        borderBottom:
                          "1px solid #ddd",
                      }}
                    >
                      Name
                    </th>

                    <th
                      style={{
                        textAlign:
                          "left",
                        padding:
                          12,
                        borderBottom:
                          "1px solid #ddd",
                      }}
                    >
                      User ID
                    </th>

                    <th
                      style={{
                        textAlign:
                          "left",
                        padding:
                          12,
                        borderBottom:
                          "1px solid #ddd",
                      }}
                    >
                      Task Balance
                    </th>

                    <th
                      style={{
                        textAlign:
                          "left",
                        padding:
                          12,
                        borderBottom:
                          "1px solid #ddd",
                      }}
                    >
                      Affiliate Balance
                    </th>

                    <th
                      style={{
                        textAlign:
                          "left",
                        padding:
                          12,
                        borderBottom:
                          "1px solid #ddd",
                      }}
                    >
                      Role
                    </th>

                    <th
                      style={{
                        textAlign:
                          "left",
                        padding:
                          12,
                        borderBottom:
                          "1px solid #ddd",
                      }}
                    >
                      Status
                    </th>

                    <th
                      style={{
                        textAlign:
                          "left",
                        padding:
                          12,
                        borderBottom:
                          "1px solid #ddd",
                      }}
                    >
                      Referral Code
                    </th>

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

                        {/* NAME */}

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

                        {/* ID */}

                        <td
                          style={{
                            padding:
                              12,
                            borderBottom:
                              "1px solid #eee",
                            fontSize:
                              12,
                            maxWidth:
                              220,
                            wordBreak:
                              "break-all",
                          }}
                        >
                          {profile.id}
                        </td>

                        {/* TASK BALANCE */}

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
                            profile.task_balance
                          )}
                        </td>

                        {/* AFFILIATE BALANCE */}

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
                            profile.affiliate_balance
                          )}
                        </td>

                        {/* ROLE */}

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

                        {/* ACTIVE STATUS */}

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
                              background:
                                profile.is_active
                                  ? "#d1e7dd"
                                  : "#f8d7da",
                              color:
                                profile.is_active
                                  ? "#0f5132"
                                  : "#842029",
                              fontSize:
                                12,
                              fontWeight:
                                "bold",
                            }}
                          >
                            {profile.is_active
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        {/* REFERRAL CODE */}

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
            )}
          </div>
        )}

      </div>
    </div>
  )
}

export default Admin
