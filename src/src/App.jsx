import { useState } from 'react'

function App() {
  const [loggedIn, setLoggedIn] = useState(false)

  return (
    <div>
      <h1>TaskFlow NG</h1>

      {!loggedIn ? (
        <main>
          <h2>Welcome to TaskFlow NG</h2>
          <p>Complete tasks, earn rewards, and grow your balance.</p>

          <button onClick={() => setLoggedIn(true)}>
            Get Started
          </button>
        </main>
      ) : (
        <main>
          <h2>Dashboard</h2>

          <section>
            <h3>Task Balance</h3>
            <p>₦0.00</p>
          </section>

          <section>
            <h3>Affiliate Balance</h3>
            <p>₦0.00</p>
          </section>

          <button onClick={() => setLoggedIn(false)}>
            Log Out
          </button>
        </main>
      )}
    </div>
  )
}

export default App
