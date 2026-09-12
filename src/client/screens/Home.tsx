import { useEffect, useState } from 'react'
import { listSubscriptions, signOut, type SessionUser, type Subscription } from '../api'
import { SubscriptionForm } from './SubscriptionForm'

type Props = {
  user: SessionUser
  onSignedOut: () => void
}

export function Home({ user, onSignedOut }: Props) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listSubscriptions()
      .then((rows) => {
        if (!cancelled) setSubscriptions(rows)
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load subscriptions.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSignOut() {
    await signOut()
    onSignedOut()
  }

  return (
    <main className="screen">
      <header className="home-header">
        <p>
          Signed in as <strong>{user.email}</strong>
        </p>
        <button type="button" onClick={handleSignOut}>
          Sign out
        </button>
      </header>

      <section>
        <h2>Subscriptions</h2>
        {loadError && <p role="alert">{loadError}</p>}
        {subscriptions.length === 0 ? (
          <p>No subscriptions yet.</p>
        ) : (
          <ul className="subscription-list">
            {subscriptions.map((subscription) => (
              <li key={subscription.id}>
                <strong>{subscription.name}</strong> — {subscription.currency}, starting {subscription.startMonth}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SubscriptionForm onCreated={(created) => setSubscriptions((rows) => [...rows, created])} />
      </section>
    </main>
  )
}
