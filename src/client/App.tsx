import { useEffect, useState } from 'react'
import { getMe, signOut, type SessionUser, type Subscription } from './api'
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

  // One sign-out handler serves both signed-in screens, because both carry the app bar.
  async function handleSignOut() {
    await signOut()
    signedOut()
  }

  if (selected) {
    return (
      <SubscriptionDetail
        subscription={selected}
        email={user.email}
        onBack={() => setSelected(null)}
        onSignOut={handleSignOut}
        onSignedOut={signedOut}
      />
    )
  }

  return (
    <Home
      email={user.email}
      onSelect={setSelected}
      onSignOut={handleSignOut}
      onSignedOut={signedOut}
    />
  )
}
