import { useEffect, useRef, useState } from "react"
import { BrowserRouter } from "react-router-dom"
import { supabase } from "./supabase"

function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)

  const [depositAmount, setDepositAmount] = useState("")
  const [depositLoading, setDepositLoading] = useState(false)

  const [message, setMessage] = useState("")

  const verificationStarted = useRef(false)

  // =====================================================
  // LOAD PROFILE
  // =====================================================

  const loadProfile = async (currentUser) => {
    if (!currentUser) {
      setProfile(null)
      return null
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .single()

    if (error) {
      console.error("PROFILE ERROR:", error)
      return null
    }

    console.log("PROFILE LOADED:", data)

    setProfile(data)

    return data
  }

  // =====================================================
  // AUTH INITIALIZATION
  // =====================================================

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        console.log(
          "CHECKING SUPABASE SESSION..."
        )

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        console.log(
          "INITIAL SESSION:",
          session
        )

        if (error) {
          console.error(
            "GET SESSION ERROR:",
            error
          )
        }

        if (!mounted) return

        if (session?.user) {
          console.log(
            "USER SESSION FOUND:",
            session.user.id
          )

          setUser(session.user)

          await loadProfile(
            session.user
          )
        } else {
          console.log(
            "NO SUPABASE SESSION FOUND"
          )

          setUser(null)
          setProfile(null)
        }
      } catch (error) {
        console.error(
          "AUTH INITIALIZATION ERROR:",
          error
        )
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return

        console.log(
          "AUTH EVENT:",
          _event,
          session
        )

        if (session?.user) {
          setUser(session.user)

          await loadProfile(
            session.user
          )
        } else {
          setUser(null)
          setProfile(null)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // =====================================================
  // VERIFY PAYSTACK PAYMENT
  //
  // IMPORTANT:
  // This does NOT depend on `user` state.
  // It directly checks the Supabase session first.
  // =====================================================

  useEffect(() => {
    let cancelled = false

    const verifyPayment = async () => {
      if (
        verificationStarted.current
      ) {
        return
      }

      const params =
        new URLSearchParams(
          window.location.search
        )

      const reference =
        params.get("reference") ||
        params.get("trxref")

      console.log(
        "CURRENT URL:",
        window.location.href
      )

      console.log(
        "PAYSTACK REFERENCE:",
        reference
      )

      if (!reference) {
        return
      }

      verificationStarted.current = true

      setMessage(
        "Payment returned successfully. Checking your payment..."
      )

      try {
        // =================================================
        // GET CURRENT SESSION
        // =================================================

        let {
          data: { session },
          error: sessionError,
        } =
          await supabase.auth.getSession()

        console.log(
          "SESSION BEFORE PAYMENT VERIFICATION:",
          session
        )

        if (sessionError) {
          console.error(
            "SESSION ERROR:",
            sessionError
          )
        }

        // =================================================
        // TRY REFRESH IF SESSION IS MISSING
        // =================================================

        if (
          !session?.access_token
        ) {
          console.log(
            "NO SESSION. TRYING SESSION REFRESH..."
          )

          const {
            data: refreshData,
            error: refreshError,
          } =
            await supabase.auth.refreshSession()

          console.log(
            "REFRESH RESULT:",
            refreshData
          )

          if (refreshError) {
            console.error(
              "REFRESH ERROR:",
              refreshError
            )
          }

          session =
            refreshData?.session ||
            null
        }

        // =================================================
        // STILL NO SESSION
        // =================================================

        if (
          !session?.access_token ||
          !session?.user
        ) {
          console.error(
            "NO VALID SESSION AFTER REFRESH"
          )

          setMessage(
            "Your login session could not be restored after Paystack returned. Please log in again, then contact support before making another payment."
          )

          return
        }

        console.log(
          "SESSION RESTORED:",
          session.user.id
        )

        // =================================================
        // UPDATE USER STATE
        // =================================================

        if (!cancelled) {
          setUser(session.user)

          await loadProfile(
            session.user
          )
        }

        // =================================================
        // CALL VERIFY-PAYMENT
        // =================================================

        console.log(
          "CALLING VERIFY-PAYMENT WITH:",
          reference
        )

        const {
          data,
          error,
        } =
          await supabase.functions.invoke(
            "verify-payment",
            {
              body: {
                reference,
              },
            }
          )

        console.log(
          "VERIFY PAYMENT RESPONSE:",
          data
        )

        console.log(
          "VERIFY PAYMENT ERROR:",
          error
        )

        // =================================================
        // EDGE FUNCTION ERROR
        // =================================================

        if (error) {
          console.error(
            "VERIFY PAYMENT FUNCTION ERROR:",
            error
          )

          setMessage(
            "Payment verification failed. Please check your payment status before trying again."
          )

          return
        }

        // =================================================
        // SERVER SAID PAYMENT FAILED
        // =================================================

        if (!data?.status) {
          console.error(
            "PAYMENT VERIFICATION FAILED:",
            data
          )

          setMessage(
            data?.message ||
              "Payment could not be verified."
          )

          return
        }

        // =================================================
        // SUCCESS
        // =================================================

        console.log(
          "PAYMENT VERIFIED SUCCESSFULLY:",
          data
        )

        setMessage(
          data?.message ||
            "Payment verified and balance credited successfully."
        )

        // =================================================
        // LOAD PROFILE AGAIN
        // =================================================

        await loadProfile(
          session.user
        )

        // =================================================
        // LOAD PROFILE ONE MORE TIME
        // =================================================

        setTimeout(async () => {
          console.log(
            "REFRESHING PROFILE AFTER PAYMENT..."
          )

          await loadProfile(
            session.user
          )
        }, 1000)

        // =================================================
        // REMOVE PAYSTACK REFERENCE FROM URL
        // =================================================

        const cleanUrl =
          window.location.origin +
          window.location.pathname

        window.history.replaceState(
          {},
          document.title,
          cleanUrl
        )
      } catch (error) {
        console.error(
          "PAYMENT VERIFICATION EXCEPTION:",
          error
        )

        setMessage(
          "Something went wrong while verifying your payment."
        )
      }
    }

    verifyPayment()

    return () => {
      cancelled = true
    }
  }, [])

  // =====================================================
  // LOGIN
  // =====================================================

  const login = async (e) => {
    e.preventDefault()

    setMessage("")

    if (!email.trim()) {
      setMessage(
        "Please enter your email."
      )
      return
    }

    if (!password) {
      setMessage(
        "Please enter your password."
      )
      return
    }

    setLoginLoading(true)

    try {
      console.log(
        "SIGNING IN..."
      )

      const {
        data,
        error,
      } =
        await supabase.auth.signInWithPassword(
          {
            email:
              email.trim(),
            password,
          }
        )

      console.log(
        "LOGIN RESULT:",
        data
      )

      if (error) {
        console.error(
          "LOGIN ERROR:",
          error
        )

        setMessage(
          error.message ||
            "Unable to log in."
        )

        return
      }

      if (!data?.user) {
        setMessage(
          "Login was not completed."
        )

        return
      }

      setUser(data.user)

      await loadProfile(
        data.user
      )

      setMessage(
        "Logged in successfully."
      )
    } catch (error) {
      console.error(
        "LOGIN EXCEPTION:",
        error
      )

      setMessage(
        "Unable to log in."
      )
    } finally {
      setLoginLoading(false)
    }
  }

  // =====================================================
  // INITIALIZE DEPOSIT
  // =====================================================

  const initializeDeposit = async () => {
    setMessage("")

    const amount =
      Number(depositAmount)

    if (
      !Number.isFinite(amount) ||
      amount < 1000
    ) {
      setMessage(
        "Minimum deposit is ₦1,000."
      )

      return
    }

    if (!user) {
      setMessage(
        "Please log in first."
      )

      return
    }

    setDepositLoading(true)

    try {
      const {
        data: {
          session,
        },
        error:
          sessionError,
      } =
        await supabase.auth.getSession()

      console.log(
        "SESSION BEFORE INITIALIZE:",
        session
      )

      if (
        sessionError ||
        !session?.access_token
      ) {
        console.error(
          "SESSION ERROR:",
          sessionError
        )

        setMessage(
          "Your login session has expired. Please log in again."
        )

        return
      }

      console.log(
        "INITIALIZING PAYMENT:",
        {
          email:
            user.email,
          amount,
        }
      )

      const {
        data,
        error,
      } =
        await supabase.functions.invoke(
          "initialize-payment",
          {
            body: {
              email:
                user.email,
              amount,
            },
          }
        )

      console.log(
        "INITIALIZE PAYMENT RESPONSE:",
        data
      )

      console.log(
        "INITIALIZE PAYMENT ERROR:",
        error
      )

      if (error) {
        console.error(
          "INITIALIZE PAYMENT ERROR:",
          error
        )

        setMessage(
          "Unable to initialize payment."
        )

        return
      }

      if (
        !data?.status ||
        !data?.data?.authorization_url
      ) {
        console.error(
          "INVALID INITIALIZE RESPONSE:",
          data
        )

        setMessage(
          data?.message ||
            "Unable to initialize payment."
        )

        return
      }

      // =================================================
      // RESET VERIFICATION FLAG
      // =================================================

      verificationStarted.current =
        false

      // =================================================
      // REDIRECT TO PAYSTACK
      // =================================================

      console.log(
        "REDIRECTING TO PAYSTACK:",
        data.data.authorization_url
      )

      window.location.href =
        data.data.authorization_url
    } catch (error) {
      console.error(
        "DEPOSIT ERROR:",
        error
      )

      setMessage(
        "Unable to initialize payment."
      )
    } finally {
      setDepositLoading(false)
    }
  }

  // =====================================================
  // LOGOUT
  // =====================================================

  const logout = async () => {
    await supabase.auth.signOut()

    setUser(null)
    setProfile(null)

    setMessage(
      "You have been logged out."
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
          justifyContent:
            "center",
          alignItems: "center",
          fontFamily:
            "Arial, sans-serif",
        }}
      >
        Loading...
      </div>
    )
  }

  // =====================================================
  // LOGIN SCREEN
  // =====================================================

  if (!user) {
    return (
      <BrowserRouter>
        <div
          style={{
            minHeight: "100vh",
            padding: 20,
            boxSizing:
              "border-box",
            fontFamily:
              "Arial, sans-serif",
            display: "flex",
            justifyContent:
              "center",
            alignItems:
              "center",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              border:
                "1px solid #ddd",
              borderRadius: 16,
              padding: 25,
              boxSizing:
                "border-box",
            }}
          >
            <h1>
              TaskFlow NG
            </h1>

            <p>
              Login to your account
            </p>

            <form
              onSubmit={login}
            >
              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value
                  )
                }
                placeholder="Email"
                autoComplete="email"
                style={{
                  width:
                    "100%",
                  padding: 14,
                  marginBottom: 12,
                  boxSizing:
                    "border-box",
                  fontSize: 16,
                }}
              />

              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                placeholder="Password"
                autoComplete="current-password"
                style={{
                  width:
                    "100%",
                  padding: 14,
                  marginBottom: 12,
                  boxSizing:
                    "border-box",
                  fontSize: 16,
                }}
              />

              <button
                type="submit"
                disabled={
                  loginLoading
                }
                style={{
                  width:
                    "100%",
                  padding: 14,
                  fontSize: 16,
                }}
              >
                {loginLoading
                  ? "Logging in..."
                  : "Login"}
              </button>
            </form>

            {message && (
              <div
                style={{
                  marginTop: 20,
                  padding: 15,
                  borderRadius: 10,
                  background:
                    "#f3f3f3",
                  lineHeight: 1.5,
                }}
              >
                {message}
              </div>
            )}
          </div>
        </div>
      </BrowserRouter>
    )
  }

  // =====================================================
  // DASHBOARD
  // =====================================================

  return (
    <BrowserRouter>
      <div
        style={{
          minHeight:
            "100vh",
          padding: 20,
          maxWidth: 700,
          margin:
            "0 auto",
          fontFamily:
            "Arial, sans-serif",
        }}
      >
        {/* HEADER */}

        <div
          style={{
            display:
              "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            marginBottom: 30,
          }}
        >
          <h1>
            TaskFlow NG
          </h1>

          <button
            onClick={logout}
          >
            Logout
          </button>
        </div>

        {/* BALANCES */}

        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: 15,
            marginBottom:
              30,
          }}
        >
          <div
            style={{
              border:
                "1px solid #ddd",
              borderRadius:
                12,
              padding: 20,
            }}
          >
            <p>
              Task Balance
            </p>

            <h2>
              ₦
              {Number(
                profile?.task_balance ||
                  0
              ).toLocaleString(
                "en-NG",
                {
                  minimumFractionDigits:
                    2,
                  maximumFractionDigits:
                    2,
                }
              )}
            </h2>
          </div>

          <div
            style={{
              border:
                "1px solid #ddd",
              borderRadius:
                12,
              padding: 20,
            }}
          >
            <p>
              Affiliate Balance
            </p>

            <h2>
              ₦
              {Number(
                profile?.affiliate_balance ||
                  0
              ).toLocaleString(
                "en-NG",
                {
                  minimumFractionDigits:
                    2,
                  maximumFractionDigits:
                    2,
                }
              )}
            </h2>
          </div>
        </div>

        {/* DEPOSIT */}

        <div
          style={{
            border:
              "1px solid #ddd",
            borderRadius:
              12,
            padding: 20,
            marginBottom:
              20,
          }}
        >
          <h2>
            Deposit
          </h2>

          <p>
            Minimum deposit:
            {" "}
            ₦1,000
          </p>

          <input
            type="number"
            min="1000"
            step="100"
            value={
              depositAmount
            }
            onChange={(e) =>
              setDepositAmount(
                e.target.value
              )
            }
            placeholder="Enter amount"
            disabled={
              depositLoading
            }
            style={{
              width:
                "100%",
              padding: 12,
              marginBottom:
                12,
              boxSizing:
                "border-box",
              fontSize: 16,
            }}
          />

          <button
            onClick={
              initializeDeposit
            }
            disabled={
              depositLoading
            }
            style={{
              width:
                "100%",
              padding: 14,
              fontSize: 16,
              cursor:
                depositLoading
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {depositLoading
              ? "Processing..."
              : "Deposit"}
          </button>
        </div>

        {/* MESSAGE */}

        {message && (
          <div
            style={{
              padding: 15,
              borderRadius: 10,
              background:
                "#f3f3f3",
              marginTop: 20,
              lineHeight:
                1.5,
            }}
          >
            {message}
          </div>
        )}

        {/* USER */}

        <div
          style={{
            marginTop: 30,
            fontSize: 14,
          }}
        >
          <p>
            Logged in as:
          </p>

          <strong>
            {user.email}
          </strong>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App
