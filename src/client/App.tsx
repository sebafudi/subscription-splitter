import { useEffect, useState } from 'react'
import { getMe, type SessionUser, type Subscription } from './api'
import { Login } from './screens/Login'
import { Home } from './screens/Home'
import { SubscriptionDetail } from './screens/SubscriptionDetail'

export function App() {
  const [user, setUser] = useState<SessionUser | null | 'loading'>('loading')
  // One navigation step, so the selected subscription is held here rather than
  // behind a router. Holding the object, not the id, means the detail screen
  // has the name and the first month to show before the summary arrives.
  const [selected, setSelected] = useState<Subscription | null>(null)

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

  function signedOut() {
    setSelected(null)
    setUser(null)
  }

  if (selected) {
    return (
      <SubscriptionDetail
        subscription={selected}
        onBack={() => setSelected(null)}
        onSignedOut={signedOut}
      />
    )
  }

  return <Home user={user} onSelect={setSelected} onSignedOut={signedOut} />
}
