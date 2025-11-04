import { useState } from 'react'
import { supabase } from '../lib/supabase'

const formStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  padding: '2rem',
  borderRadius: '1rem',
  backgroundColor: '#ffffff',
  maxWidth: '26rem',
  width: '100%',
  boxShadow: '0 20px 45px rgba(15, 23, 42, 0.1)'
}

const buttonStyles: React.CSSProperties = {
  backgroundColor: '#2563eb',
  color: '#fff',
  padding: '0.75rem 1rem',
  border: 'none',
  borderRadius: '0.75rem',
  fontWeight: 600,
  fontSize: '1rem'
}

const toggleStyles: React.CSSProperties = {
  fontSize: '0.9rem',
  color: '#475569',
  textAlign: 'center'
}

export function AuthForm () {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({ email, password })
        if (signUpError) throw signUpError
        setMessage('Check your inbox for a confirmation email to finish signing up.')
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to authenticate')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={formStyles}>
      <div>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '2rem' }}>Ticketing App</h1>
        <p style={{ margin: 0, color: '#64748b' }}>Ticketing made simple.</p>
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <span style={{ fontWeight: 600 }}>Email</span>
        <input
          type="email"
          value={email}
          onChange={event => setEmail(event.target.value)}
          placeholder="you@company.com"
          required
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '0.75rem',
            border: '1px solid #cbd5f5'
          }}
        />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <span style={{ fontWeight: 600 }}>Password</span>
        <input
          type="password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          placeholder="••••••••"
          required
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '0.75rem',
            border: '1px solid #cbd5f5'
          }}
        />
      </label>

      {error && <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>}
      {message && <p style={{ color: '#16a34a', margin: 0 }}>{message}</p>}

      <button type="submit" disabled={loading} style={{ ...buttonStyles, opacity: loading ? 0.7 : 1 }}>
        {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
      </button>

      <p style={toggleStyles}>
        {mode === 'signin' ? (
          <>Need an account?{' '}
            <button type="button" onClick={() => setMode('signup')} style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer' }}>
              Sign up
            </button>
          </>
        ) : (
          <>Already registered?{' '}
            <button type="button" onClick={() => setMode('signin')} style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer' }}>
              Sign in
            </button>
          </>
        )}
      </p>
    </form>
  )
}
