import { useEffect, useState } from 'react'
import { getMe, type SessionUser } from './api'
import { Login } from './screens/Login'
import { Home } from './screens/Home'

export function App() {
  const [user, setUser] = useState<SessionUser | null | 'loading'>('loading')

  useEffect(() => {
    getMe().then(setUser)
  }, [])

  if (user === 'loading') {
    return (
      <main className="screen screen-narrow">
        <p>Loading…</p>
      </main>
    )
  }

  if (!user) {
    return <Login onSignedIn={() => getMe().then(setUser)} />
  }

  return <Home user={user} onSignedOut={() => setUser(null)} />
}
