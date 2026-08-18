import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './App.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error, errorInfo) {
    console.error('TaskFlow NG Error:', error)
    console.error('Error Info:', errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            padding: '30px 20px',
            background: '#f8f9fb',
            fontFamily: 'Arial, sans-serif',
            color: '#172033',
          }}
        >
          <h1>TaskFlow NG</h1>

          <h2>Something went wrong</h2>

          <p>
            The app encountered a problem while loading.
          </p>

          <div
            style={{
              marginTop: '20px',
              padding: '15px',
              background: '#fff',
              border: '1px solid #ddd',
              borderRadius: '10px',
              overflowWrap: 'break-word',
            }}
          >
            <strong>Error:</strong>

            <pre
              style={{
                whiteSpace: 'pre-wrap',
                marginTop: '10px',
              }}
            >
              {this.state.error?.message ||
                String(this.state.error)}
            </pre>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

window.addEventListener('error', (event) => {
  console.error('Global error:', event.error)
})

window.addEventListener(
  'unhandledrejection',
  (event) => {
    console.error(
      'Unhandled promise rejection:',
      event.reason
    )
  }
)

ReactDOM.createRoot(
  document.getElementById('root')
).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
