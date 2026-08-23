import { useEffect, useRef, useState } from "react"
import { BrowserRouter } from "react-router-dom"
import { supabase } from "./supabase"

function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

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
      console.error("Profile error:", error)
      return null
    }

    console.log("PROFILE LOADED:", data)

    setProfile(data)

    return data
  }

  // =====================================================
  // AUTH
  // =====================================================

  useEffect(() => {
    let mounted = true

    const initialize = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!mounted) return

        if (session?.user) {
          setUser(session.user)

          await loadProfile(session.user)
        }
      } catch (error) {
        console.error(
          "Authentication initialization error:",
          error
        )
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initialize()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return

        if (session?.user) {
          setUser(session.user)

          await loadProfile(session.user)
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
  // =====================================================

  useEffect(() => {
    if (!user) return

    if (verificationStarted.current) {
      return
    }

    const verifyPayment = async () => {
      const params = new URLSearchParams(
        window.location.search
      )

      const reference =
        params.get("reference") ||
        params.get("trxref")

      console.log(
        "Paystack URL:",
        window.location.href
      )

      console.log(
        "Paystack reference:",
        reference
      )

      // No Paystack reference means this is
      // a normal dashboard visit.
      if (!reference) {
        return
      }

      verificationStarted.current = true

      setMessage(
        "Payment successful. Verifying and adding funds..."
      )

      try {
        // ---------------------------------------------
        // GET CURRENT SESSION
        // ---------------------------------------------

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (
          sessionError ||
          !session?.access_token
        ) {
          console.error(
            "Session error:",
            sessionError
          )

          setMessage(
            "Your login session expired. Please log in again."
          )

          return
        }

        // ---------------------------------------------
        // CALL VERIFY-PAYMENT
        // ---------------------------------------------

        console.log(
          "Calling verify-payment with:",
          reference
        )

        const {
          data,
          error,
        } = await supabase.functions.invoke(
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

        // ---------------------------------------------
        // HANDLE FUNCTION ERROR
        // ---------------------------------------------

        if (error) {
          console.error(
            "Verification function error:",
            error
          )

          setMessage(
            "Payment verification failed. Please contact support if money was deducted."
          )

          return
        }

        // ---------------------------------------------
        // HANDLE SERVER RESPONSE
        // ---------------------------------------------

        if (!data?.status) {
          console.error(
            "Payment verification unsuccessful:",
            data
          )

          setMessage(
            data?.message ||
              "Payment could not be verified."
          )

          return
        }

        // ---------------------------------------------
        // PAYMENT VERIFIED
        // ---------------------------------------------

        console.log(
          "PAYMENT VERIFIED SUCCESSFULLY:",
          data
        )

        setMessage(
          data?.message ||
            "Payment verified and balance credited successfully."
        )

        // ---------------------------------------------
        // REFRESH PROFILE
        // ---------------------------------------------

        await loadProfile(session.user)

        // ---------------------------------------------
        // WAIT A LITTLE AND LOAD AGAIN
        // This makes sure the UI receives the
        // database value after the RPC finishes.
        // ---------------------------------------------

        setTimeout(async () => {
          await loadProfile(session.user)
        }, 1000)

        // ---------------------------------------------
        // REMOVE PAYSTACK PARAMETERS
        // ---------------------------------------------

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
          "Payment verification exception:",
          error
        )

        setMessage(
          "Something went wrong while verifying the payment."
        )
      }
    }

    verifyPayment()
  }, [user])

  // =====================================================
  // INITIALIZE DEPOSIT
  // =====================================================

  const initializeDeposit = async () => {
    setMessage("")

    const amount = Number(
      depositAmount
    )

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
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (
        sessionError ||
        !session?.access_token
      ) {
        console.error(
          "Session error:",
          sessionError
        )

        setMessage(
          "Your session has expired. Please log in again."
        )

        return
      }

      console.log(
        "Initializing payment:",
        {
          email: user.email,
          amount,
        }
      )

      const {
        data,
        error,
      } = await supabase.functions.invoke(
        "initialize-payment",
        {
          body: {
            email: user.email,
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
          "Initialize payment error:",
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
          "Invalid initialize response:",
          data
        )

        setMessage(
          data?.message ||
            "Unable to initialize payment."
        )

        return
      }

      // ---------------------------------------------
      // RESET VERIFICATION FLAG BEFORE PAYMENT
      // ---------------------------------------------

      verificationStarted.current = false

      // ---------------------------------------------
      // REDIRECT TO PAYSTACK
      // ---------------------------------------------

      console.log(
        "Redirecting to Paystack:",
        data.data.authorization_url
      )

      window.location.href =
        data.data.authorization_url
    } catch (error) {
      console.error(
        "Deposit error:",
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
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div
        style={{
          padding: 40,
          textAlign: "center",
          fontFamily: "Arial, sans-serif",
        }}
      >
        Loading...
      </div>
    )
  }

  // =====================================================
  // NOT LOGGED IN
  // =====================================================

  if (!user) {
    return (
      <BrowserRouter>
        <div
          style={{
            padding: 40,
            maxWidth: 500,
            margin: "0 auto",
            fontFamily: "Arial, sans-serif",
          }}
        >
          <h1>TaskFlow NG</h1>

          <p>
            Please log in to continue.
          </p>
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
          minHeight: "100vh",
          padding: 20,
          maxWidth: 700,
          margin: "0 auto",
          fontFamily:
            "Arial, sans-serif",
        }}
      >
        {/* HEADER */}

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
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
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: 15,
            marginBottom: 30,
          }}
        >
          {/* TASK BALANCE */}

          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
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
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}
            </h2>
          </div>

          {/* AFFILIATE BALANCE */}

          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
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
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}
            </h2>
          </div>
        </div>

        {/* DEPOSIT */}

        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
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
            value={depositAmount}
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
              width: "100%",
              padding: 12,
              marginBottom: 12,
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
              width: "100%",
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
              lineHeight: 1.5,
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
