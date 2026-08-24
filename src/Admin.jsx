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
        // ADMIN CHECK
        //
        // This supports either:
        // role = "admin"
        //
        // or
        //
        // is_admin = true
        // -----------------------------------------------

        const isAdmin =
          adminProfile?.role === "admin" ||
          adminProfile?.is_admin === true

        if (!isAdmin) {
          if (mounted) {
            setMessage(
              "Access denied. This account is not an administrator."
            )
          }

          return
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
          <h2>Loading Admin Dashboard...</h2>
        </div>
      </div>
    )
  }

  // =====================================================
  // ACCESS DENIED
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
        {/* HEADER */}

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

        {/* ADMIN EMAIL */}

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
                borderCollapse:
                  "collapse",
                minWidth: 700,
              }}
            >
              <thead>
                <tr>
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
                          (profile.is_admin
                            ? "admin"
                            : "user")}
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
