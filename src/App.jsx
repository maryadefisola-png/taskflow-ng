import { useEffect, useState } from "react"
import { BrowserRouter } from "react-router-dom"
import { supabase } from "./supabase"

function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [depositAmount, setDepositAmount] = useState("")
  const [depositLoading, setDepositLoading] = useState(false)
  const [message, setMessage] = useState("")

  // -----------------------------------------
  // LOAD USER + PROFILE
  // -----------------------------------------

  const loadProfile = async (currentUser) => {
    if (!currentUser) {
      setProfile(null)
      return
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .single()

    if (error) {
      console.error("Profile error:", error)
      return
    }

    setProfile(data)
  }

  // -----------------------------------------
  // AUTH
  // -----------------------------------------

  useEffect(() => {
    let mounted = true

    const initialize = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!mounted) return

      if (session?.user) {
        setUser(session.user)
        await loadProfile(session.user)
      }

      setLoading(false)
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

  // -----------------------------------------
  // VERIFY PAYMENT FROM URL
  // -----------------------------------------

  useEffect(() => {
    const verifyPayment = async () => {
      const params = new URLSearchParams(
        window.location.search
      )

      const reference =
        params.get("reference") ||
        params.get("trxref")

      if (!reference) {
        return
      }

      setMessage("Verifying payment...")

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.access_token) {
          setMessage(
            "Please log in again to verify your payment."
          )
          return
        }

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
          "Payment verification response:",
          data
        )

        if (error) {
          console.error(
            "Verification error:",
            error
          )

          setMessage(
            "Payment verification failed. Please try again."
          )

          return
        }

        if (!data?.status) {
          setMessage(
            data?.message ||
              "Payment could not be verified."
          )

          return
        }

        setMessage(
          data?.message ||
            "Payment verified successfully."
        )

        // -------------------------------------
        // IMPORTANT:
        // REFRESH BALANCE AFTER CREDIT
        // -------------------------------------

        await loadProfile(session.user)

        // Remove Paystack reference from URL
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
          "Something went wrong while verifying payment."
        )
      }
    }

    if (user) {
      verifyPayment()
    }
  }, [user])

  // -----------------------------------------
  // INITIALIZE DEPOSIT
  // -----------------------------------------

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
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setMessage(
          "Your session has expired. Please log in again."
        )
        return
      }

      const {
        data,
        error,
      } = await supabase.functions.invoke(
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
        "Initialize payment response:",
        data
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
        setMessage(
          data?.message ||
            "Unable to initialize payment."
        )

        return
      }

      // -------------------------------------
      // SEND USER TO PAYSTACK
      // -------------------------------------

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

  // -----------------------------------------
  // LOGOUT
  // -----------------------------------------

  const logout = async () => {
    await supabase.auth.signOut()

    setUser(null)
    setProfile(null)
  }

  // -----------------------------------------
  // LOADING
  // -----------------------------------------

  if (loading) {
    return (
      <div
        style={{
          padding: 40,
          textAlign: "center",
        }}
      >
        Loading...
      </div>
    )
  }

  // -----------------------------------------
  // NOT LOGGED IN
  // -----------------------------------------

  if (!user) {
    return (
      <BrowserRouter>
        <div
          style={{
            padding: 40,
            maxWidth: 500,
            margin: "0 auto",
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

  // -----------------------------------------
  // DASHBOARD
  // -----------------------------------------

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
                }
              )}
            </h2>
          </div>

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
            style={{
              width: "100%",
              padding: 12,
              marginBottom: 12,
              boxSizing:
                "border-box",
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
