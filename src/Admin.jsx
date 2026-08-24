import { useEffect, useState } from "react"
import { supabase } from "./supabase"

function Admin() {
  const [user, setUser] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")

  // =====================================================
  // LOAD ADMIN DASHBOARD
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

        console.log("ADMIN SESSION:", session)

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

        if (!mounted) return

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
        //
        // This calls the is_admin() PostgreSQL function.
        //
        // Your database function checks:
        //
        // public.admin_users
        //
        // using auth.uid()
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
        // LOAD ALL PROFILES
        //
        // Your RLS policy:
        //
        // Admins can view all profiles
        //
        // uses is_admin()
        // =================================================

        const {
          data: profileData,
          error: profilesError,
        } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", {
            ascending: false,
          })

        console.log(
          "ALL PROFILES:",
          profileData
        )

        if (profilesError) {
          console.error(
            "LOAD PROFILES ERROR:",
            profilesError
          )

          if (mounted) {
            setMessage(
              "Unable to load users. Please check your profiles RLS policy."
            )
          }

          return
        }

        if (mounted) {
          setProfiles(
            profileData || []
          )
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
        "LOGOUT ERROR:",
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
          padding: 20,
          boxSizing: "border-box",
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

  if (message) {
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
            border:
              "1px solid #ddd",
            borderRadius: 16,
            padding: 25,
            boxSizing:
              "border-box",
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

          {user && (
            <button
              onClick={logout}
              style={{
                width: "100%",
                padding: 14,
                marginTop: 10,
                fontSize: 16,
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
        minHeight: "100vh",
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
            justifyContent:
              "space-between",
            alignItems:
              "center",
            gap: 15,
            marginBottom:
              30,
            flexWrap:
              "wrap",
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

        {/* =================================================
            ADMIN ACCOUNT
        ================================================= */}

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
              marginBottom: 8,
            }}
          >
            Logged in as admin:
          </p>

          <strong>
            {user?.email}
          </strong>

          <p
            style={{
              fontSize: 13,
              marginBottom: 0,
              color: "#666",
            }}
          >
            Admin ID:
            {" "}
            {user?.id}
          </p>
        </div>

        {/* =================================================
            SUMMARY
        ================================================= */}

        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 15,
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
              padding: 20,
              background:
                "#fff",
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
              borderRadius:
                12,
              padding: 20,
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
              borderRadius:
                12,
              padding: 20,
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

        {/* =================================================
            USERS
        ================================================= */}

        <div
          style={{
            border:
              "1px solid #ddd",
            borderRadius:
              12,
            padding: 20,
            background:
              "#fff",
            overflowX:
              "auto",
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
                minWidth: 900,
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
                  (profile) => (
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
                        {profile.is_active
                          ? "Active"
                          : "Inactive"}
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
      </div>
    </div>
  )
}

export default Admin
