import { useEffect } from 'react'
import { AuthForm } from './components/AuthForm'
import { Dashboard } from './components/Dashboard'
import { useSupabaseSession } from './hooks/useSupabaseSession'
import { setSession } from './lib/api'

function App () {
  const { session, loading } = useSupabaseSession()

  useEffect(() => {
    setSession(session ?? null)
  }, [session])

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <p style={{ fontSize: '1.1rem', color: '#475569' }}>Loading your workspace…</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <AuthForm />
      </div>
    )
  }

  return <Dashboard session={session} />
}

export default App
