import { useEffect, useState } from "react"
import { supabase } from "./supabase"

function Admin() {
  const [user, setUser] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")

  // =====================================================
  // LOAD ADMIN
  // =====================================================

  useEffect(() => {
    let mounted = true

    const initializeAdmin = async () => {
      try {
        setLoading(true)
        setMessage("")

        console.log("====================================")
        console.log("ADMIN DASHBOARD INITIALIZING")
        console.log("====================================")

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

        console.log(
          "ADMIN SESSION ERROR:",
          sessionError
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
        // CHECK LOGIN
        // =================================================

        if (!session?.user) {
          console.log(
            "NO LOGGED-IN USER FOUND"
          )

          if (mounted) {
            setMessage(
              "You must be logged in to access the admin page."
            )
          }

          return
        }

        if (!mounted) return

        // =================================================
        // LOG USER INFORMATION
        // =================================================

        console.log(
          "LOGGED IN ADMIN USER ID:",
          session.user.id
        )

        console.log(
          "LOGGED IN ADMIN EMAIL:",
          session.user.email
        )

        setUser(session.user)

        // =================================================
        // LOAD CURRENT USER PROFILE
        // =================================================

        console.log(
          "LOADING ADMIN PROFILE..."
        )

        const {
          data: adminProfile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single()

        // =================================================
        // ADMIN PROFILE DEBUG
        // =================================================

        console.log(
          "ADMIN PROFILE RESULT:",
          adminProfile
        )

        console.log(
          "ADMIN PROFILE ERROR:",
          profileError
        )

        if (profileError) {
          console.error(
            "ADMIN PROFILE ERROR:",
            profileError
          )

          if (mounted) {
            setMessage(
              "Unable to load your admin profile."
            )
          }

          return
        }

        // =================================================
        // ADMIN CHECK
        // =================================================

        const isAdmin =
          adminProfile?.role === "admin" ||
          adminProfile?.is_admin === true

        console.log(
          "ADMIN PROFILE ROLE:",
          adminProfile?.role
        )

        console.log(
          "ADMIN PROFILE IS_ADMIN:",
          adminProfile?.is_admin
        )

        console.log(
          "FRONTEND ADMIN CHECK:",
          isAdmin
        )

        if (!isAdmin) {
          console.error(
            "ACCESS DENIED: USER IS NOT ADMIN"
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
        // LOAD ALL PROFILES
        // =================================================

        console.log(
          "LOADING ALL PROFILES..."
        )

        const {
          data,
          error,
        } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", {
            ascending: false,
          })

        // =================================================
        // ALL PROFILES DEBUG
        // =================================================

        console.log(
          "ALL PROFILES RESULT:",
          data
        )

        console.log(
          "ALL PROFILES ERROR:",
          error
        )

        if (error) {
          console.error(
            "LOAD PROFILES ERROR:",
            error
          )

          if (mounted) {
            setMessage(
              "Unable to load users."
            )
          }

          return
        }

        console.log(
          "NUMBER OF PROFILES:",
          data?.length || 0
        )

        if (mounted) {
          setProfiles(data || [])
        }

        console.log(
          "===================================="
        )

        console.log(
          "ADMIN DASHBOARD LOADED SUCCESSFULLY"
        )

        console.log(
          "===================================="
        )
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
    console.log(
      "ADMIN LOGGING OUT..."
    )

    await supabase.auth.signOut()

    window.location.href = "/"
  }

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
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div>
          <h2>
            Loading Admin Dashboard...
          </h2>
        </div>
      </div>
    )
  }

  // =====================================================
  // ACCESS DENIED / NOT LOGGED IN
  // =====================================================

  if (
    message &&
    !user
  ) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
          boxSizing: "border-box",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 500,
            border: "1px solid #ddd",
            borderRadius: 16,
            padding: 25,
            boxSizing: "border-box",
            background: "#fff",
          }}
        >
          <h1>
            TaskFlow NG
          </h1>

          <h2>
            Admin
          </h2>

          <div
            style={{
              marginTop: 20,
              padding: 15,
              borderRadius: 10,
              background: "#f3f3f3",
              lineHeight: 1.5,
            }}
          >
            {message}
          </div>

          <button
            onClick={() => {
              window.location.href = "/"
            }}
            style={{
              width: "100%",
              padding: 14,
              marginTop: 20,
              fontSize: 16,
            }}
          >
            Return to Login
          </button>
        </div>
      </div>
    )
  }

  // =====================================================
  // ACCESS DENIED FOR LOGGED-IN USER
  // =====================================================

  if (
    message &&
    user &&
    profiles.length === 0
  ) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: 20,
          boxSizing: "border-box",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 600,
            margin: "50px auto",
            border: "1px solid #ddd",
            borderRadius: 16,
            padding: 25,
            background: "#fff",
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
              marginTop: 20,
              padding: 15,
              borderRadius: 10,
              background: "#f3f3f3",
              lineHeight: 1.5,
            }}
          >
            {message}
          </div>

          <button
            onClick={logout}
            style={{
              width: "100%",
              padding: 14,
              marginTop: 20,
              fontSize: 16,
            }}
          >
            Logout
          </button>
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
        minHeight: "100vh",
        padding: 20,
        boxSizing: "border-box",
        fontFamily: "Arial, sans-serif",
        background: "#fafafa",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 15,
            marginBottom: 30,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                marginBottom: 5,
              }}
            >
              TaskFlow NG
            </h1>

            <p
              style={{
                marginTop: 0,
              }}
            >
              Admin Dashboard
            </p>
          </div>

          <button
            onClick={logout}
            style={{
              padding: "10px 18px",
              fontSize: 15,
            }}
          >
            Logout
          </button>
        </div>

        {/* =================================================
            ADMIN EMAIL
        ================================================= */}

        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 20,
            background: "#fff",
            marginBottom: 20,
          }}
        >
          <p
            style={{
              marginTop: 0,
            }}
          >
            Logged in as admin:
          </p>

          <strong>
            {user?.email}
          </strong>
        </div>

        {/* =================================================
            SUMMARY
        ================================================= */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 15,
            marginBottom: 25,
          }}
        >

          {/* TOTAL USERS */}

          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 20,
              background: "#fff",
            }}
          >
            <p>
              Total Users
            </p>

            <h2>
              {profiles.length}
            </h2>
          </div>

          {/* TASK BALANCE */}

          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 20,
              background: "#fff",
            }}
          >
            <p>
              Task Balance
            </p>

            <h2>
              ₦
              {formatMoney(
                profiles.reduce(
                  (total, item) =>
                    total +
                    Number(
                      item.task_balance || 0
                    ),
                  0
                )
              )}
            </h2>
          </div>

          {/* AFFILIATE BALANCE */}

          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 20,
              background: "#fff",
            }}
          >
            <p>
              Affiliate Balance
            </p>

            <h2>
              ₦
              {formatMoney(
                profiles.reduce(
                  (total, item) =>
                    total +
                    Number(
                      item.affiliate_balance || 0
                    ),
                  0
                )
              )}
            </h2>
          </div>
        </div>

        {/* =================================================
            USERS
        ================================================= */}

        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 20,
            background: "#fff",
            overflowX: "auto",
          }}
        >
          <h2>
            Users
          </h2>

          {profiles.length === 0 ? (
            <p>
              No users found.
            </p>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 700,
              }}
            >
              <thead>
                <tr>

                  {/* USER ID */}

                  <th
                    style={{
                      textAlign: "left",
                      padding: 12,
                      borderBottom:
                        "1px solid #ddd",
                    }}
                  >
                    User ID
                  </th>

                  {/* FULL NAME */}

                  <th
                    style={{
                      textAlign: "left",
                      padding: 12,
                      borderBottom:
                        "1px solid #ddd",
                    }}
                  >
                    Name
                  </th>

                  {/* TASK BALANCE */}

                  <th
                    style={{
                      textAlign: "left",
                      padding: 12,
                      borderBottom:
                        "1px solid #ddd",
                    }}
                  >
                    Task Balance
                  </th>

                  {/* AFFILIATE BALANCE */}

                  <th
                    style={{
                      textAlign: "left",
                      padding: 12,
                      borderBottom:
                        "1px solid #ddd",
                    }}
                  >
                    Affiliate Balance
                  </th>

                  {/* ROLE */}

                  <th
                    style={{
                      textAlign: "left",
                      padding: 12,
                      borderBottom:
                        "1px solid #ddd",
                    }}
                  >
                    Role
                  </th>

                  {/* ACTIVE */}

                  <th
                    style={{
                      textAlign: "left",
                      padding: 12,
                      borderBottom:
                        "1px solid #ddd",
                    }}
                  >
                    Active
                  </th>

                </tr>
              </thead>

              <tbody>

                {profiles.map(
                  (profile) => (
                    <tr
                      key={
                        profile.id
                      }
                    >

                      {/* USER ID */}

                      <td
                        style={{
                          padding: 12,
                          borderBottom:
                            "1px solid #eee",
                          fontSize: 13,
                        }}
                      >
                        {profile.id}
                      </td>

                      {/* NAME */}

                      <td
                        style={{
                          padding: 12,
                          borderBottom:
                            "1px solid #eee",
                        }}
                      >
                        {profile.full_name ||
                          "—"}
                      </td>

                      {/* TASK BALANCE */}

                      <td
                        style={{
                          padding: 12,
                          borderBottom:
                            "1px solid #eee",
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
                          padding: 12,
                          borderBottom:
                            "1px solid #eee",
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
                          padding: 12,
                          borderBottom:
                            "1px solid #eee",
                        }}
                      >
                        {profile.role ||
                          (profile.is_admin
                            ? "admin"
                            : "user")}
                      </td>

                      {/* ACTIVE */}

                      <td
                        style={{
                          padding: 12,
                          borderBottom:
                            "1px solid #eee",
                        }}
                      >
                        {profile.is_active
                          ? "Yes"
                          : "No"}
                      </td>

                    </tr>
                  )
                )}

              </tbody>
            </table>
          )}
        </div>

        {/* =================================================
            DEBUG MESSAGE
        ================================================= */}

        {message && (
          <div
            style={{
              marginTop: 20,
              padding: 15,
              borderRadius: 10,
              background: "#f3f3f3",
              lineHeight: 1.5,
            }}
          >
            {message}
          </div>
        )}

      </div>
    </div>
  )
}

export default Admin
