import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export default function TestSupabase() {
  const [result, setResult] = useState('Testing...')
  
  useEffect(() => {
    async function test() {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          setResult('ERROR: ' + error.message)
          return
        }

        setResult(
          data.session
            ? 'SUCCESS: Supabase connected and a session exists.'
            : 'SUCCESS: Supabase connected, but no session exists.'
        )
      } catch (err) {
        setResult('ERROR: ' + err.message)
      }
    }

    test()
  }, [])

  return (
    <div style={{
      padding: '30px',
      fontFamily: 'Arial',
      fontSize: '20px'
    }}>
      <h1>TaskFlow Supabase Test</h1>
      <p>{result}</p>
    </div>
  )
}
