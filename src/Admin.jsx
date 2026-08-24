import { useEffect, useState } from "react"
import { supabase } from "./supabase"

function Admin() {
  const [user, setUser] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
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
        setAuthorized(false)

        // -----------------------------------------------
        // GET CURRENT SESSION
        // -----------------------------------------------

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

        // -----------------------------------------------
        // USER NOT LOGGED IN
        // -----------------------------------------------

        if (!session?.user) {
          if (mounted) {
            setMessage(
              "You must be logged in to access the admin page."
            )
          }

          return
        }

        if (!mounted) return

        setUser(session.user)

        console.log(
          "ADMIN USER ID:",
          session.user.id
        )

        console.log(
          "ADMIN USER EMAIL:",
          session.user.email
        )

        // -----------------------------------------------
        // LOAD CURRENT USER PROFILE
        // -----------------------------------------------

        const {
          data: adminProfile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single()

        console.log(
          "ADMIN PROFILE:",
          adminProfile
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

        // -----------------------------------------------
        // CHECK ADMIN ROLE
        // -----------------------------------------------

        if (
          adminProfile?.role !== "admin"
        ) {
          console.warn(
            "ADMIN ACCESS DENIED:",
            adminProfile?.role
          )

          if (mounted) {
            setMessage(
              "Access denied. This account is not an administrator."
            )
          }

          return
        }

        console.log(
          "ADMIN ACCESS GRANTED"
        )

        // -----------------------------------------------
        // USER IS ADMIN
        // -----------------------------------------------

        if (mounted) {
          setAuthorized(true)
        }

        // -----------------------------------------------
        // LOAD ALL PROFILES
        // -----------------------------------------------

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

          if (mounted) {
            setMessage(
              "Unable to load users."
            )
          }

          return
        }

        console.log(
          "ALL PROFILES:",
          data
        )

        if (mounted) {
          setProfiles(data || [])
        }
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
        "ADMIN LOGOUT ERROR:",
        error
      )
    }

    window.location.href = "/"
  }

  // =====================================================
  // FORMAT MONEY
  // =====================================================

  const formatMoney = (value) => {
    return Number(
      value || 0
    ).toLocaleString(
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
          fontFamily:
            "Arial, sans-serif",
        }}
      >
        <div
          style={{
            textAlign: "center",
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
  // ACCESS DENIED / NOT LOGGED IN
  // =====================================================

  if (!authorized) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
          boxSizing: "border-box",
          fontFamily:
            "Arial, sans-serif",
          background: "#fafafa",
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
            {message ||
              "You do not have permission to access this page."}
          </div>

          {user ? (
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
          ) : (
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
        minHeight: "100vh",
        padding: 20,
        boxSizing: "border-box",
        fontFamily:
          "Arial, sans-serif",
        background: "#fafafa",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        {/* HEADER */}

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
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
              padding:
                "10px 18px",
              fontSize: 15,
            }}
          >
            Logout
          </button>
        </div>

        {/* ADMIN EMAIL */}

        <div
          style={{
            border:
              "1px solid #ddd",
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

          <p
            style={{
              marginBottom: 0,
              marginTop: 10,
            }}
          >
            Role: <strong>admin</strong>
          </p>
        </div>

        {/* SUMMARY */}

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
              border:
                "1px solid #ddd",
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
              border:
                "1px solid #ddd",
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
                  (
                    total,
                    item
                  ) =>
                    total +
                    Number(
                      item.task_balance ||
                        0
                    ),
                  0
                )
              )}
            </h2>
          </div>

          {/* AFFILIATE BALANCE */}

          <div
            style={{
              border:
                "1px solid #ddd",
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
                  (
                    total,
                    item
                  ) =>
                    total +
                    Number(
                      item.affiliate_balance ||
                        0
                    ),
                  0
                )
              )}
            </h2>
          </div>
        </div>

        {/* USERS */}

        <div
          style={{
            border:
              "1px solid #ddd",
            borderRadius: 12,
            padding: 20,
            background: "#fff",
            overflowX: "auto",
          }}
        >
          <h2>
            Users
          </h2>

          {profiles.length ===
          0 ? (
            <p>
              No users found.
            </p>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse:
                  "collapse",
                minWidth: 700,
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign:
                        "left",
                      padding: 12,
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
                      padding: 12,
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
                      padding: 12,
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
                      padding: 12,
                      borderBottom:
                        "1px solid #ddd",
                    }}
                  >
                    Role
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

                      <td
                        style={{
                          padding: 12,
                          borderBottom:
                            "1px solid #eee",
                        }}
                      >
                        {profile.role ||
                          "user"}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default Admin
