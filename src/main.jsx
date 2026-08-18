import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import './App.css'

const root = ReactDOM.createRoot(
  document.getElementById('root')
)

function showError(error) {
  const message =
    error?.message ||
    error?.stack ||
    String(error)

  root.render(
    <div
      style={{
        minHeight: '100vh',
        padding: '30px 20px',
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif',
        background: '#f8f9fb',
        color: '#172033',
      }}
    >
      <h1>TaskFlow NG</h1>

      <h2>App loading error</h2>

      <p>
        Vercel is working, but TaskFlow NG
        encountered this error:
      </p>

      <pre
        style={{
          marginTop: '20px',
          padding: '15px',
          background: '#fff',
          border: '1px solid #ddd',
          borderRadius: '10px',
          whiteSpace: 'pre-wrap',
          overflowWrap: 'break-word',
          textAlign: 'left',
        }}
      >
        {message}
      </pre>
    </div>
  )
}

async function startApp() {
  try {
    const module = await import('./App.jsx')
    const App = module.default

    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
  } catch (error) {
    console.error('TaskFlow NG startup error:', error)
    showError(error)
  }
}

startApp()
