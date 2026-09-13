import { useEffect, useState } from 'react'
import { getAuthConfig, getMe, signOut, type SessionUser, type Subscription } from './api'
import { AppBar } from './components/AppBar'
import { Login } from './screens/Login'
import { Home } from './screens/Home'
import { SubscriptionDetail } from './screens/SubscriptionDetail'

export function App() {
  const [user, setUser] = useState<SessionUser | null | 'loading'>('loading')
  // One navigation step, so the selected subscription is held here rather than
  // behind a router. Holding the object, not the id, means the detail screen
  // has the name and the first month to show before the summary arrives.
  const [selected, setSelected] = useState<Subscription | null>(null)
  // One-shot: set when a deletion sends the user back, consumed by Home as it mounts.
  const [announceDeleted, setAnnounceDeleted] = useState(false)
  // Read once beside the session and held here, so a later sign-out repaints the
  // login screen with its final action row rather than asking again.
  const [googleEnabled, setGoogleEnabled] = useState(false)

  useEffect(() => {
    Promise.all([getMe(), getAuthConfig()]).then(([me, config]) => {
      setGoogleEnabled(config.google)
      setUser(me)
    })
  }, [])

  if (user === 'loading') {
    return (
      <>
        <AppBar />
        <main className="column page">
          <div className="skeleton skeleton-session" aria-hidden="true" />
          <p role="status" className="sr-only">
            Loading your session
          </p>
        </main>
      </>
    )
  }

  if (!user) {
    return <Login googleEnabled={googleEnabled} onSignedIn={() => getMe().then(setUser)} />
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
        onUpdated={setSelected}
        onDeleted={() => {
          // Nothing deleted is held anywhere: the object goes before Home remounts and refetches.
          setSelected(null)
          setAnnounceDeleted(true)
        }}
      />
    )
  }

  return (
    <Home
      email={user.email}
      onSelect={setSelected}
      onSignOut={handleSignOut}
      onSignedOut={signedOut}
      announceDeleted={announceDeleted}
      onAnnounced={() => setAnnounceDeleted(false)}
    />
  )
}
