import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div style={{ padding: '40px' }}>
      <h1>TaskFlow NG Test</h1>

      <p>Count: {count}</p>

      <button
        type="button"
        onClick={() => setCount(count + 1)}
        style={{
          padding: '15px 25px',
          fontSize: '18px',
          cursor: 'pointer',
        }}
      >
        CLICK ME
      </button>
    </div>
  )
}

export default App
