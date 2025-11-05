import { AuthForm } from './components/AuthForm'
import { Dashboard } from './components/Dashboard'
import { useSupabaseSession } from './hooks/useSupabaseSession'

function App () {
  const { session, loading } = useSupabaseSession()

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
