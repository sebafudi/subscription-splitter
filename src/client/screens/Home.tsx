import { useEffect, useState } from 'react'
import { SignedOutError, listSubscriptions, signOut, type SessionUser, type Subscription } from '../api'
import { SubscriptionForm } from './SubscriptionForm'

type Props = {
  user: SessionUser
  onSelect: (subscription: Subscription) => void
  onSignedOut: () => void
}

export function Home({ user, onSelect, onSignedOut }: Props) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listSubscriptions()
      .then((rows) => {
        if (!cancelled) setSubscriptions(rows)
      })
      .catch((error) => {
        if (cancelled) return
        if (error instanceof SignedOutError) {
          onSignedOut()
          return
        }
        setLoadError('Could not load subscriptions.')
      })
    return () => {
      cancelled = true
    }
  }, [onSignedOut])

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
                <button type="button" className="link-row" onClick={() => onSelect(subscription)}>
                  <strong>{subscription.name}</strong>, {subscription.currency}, starting {subscription.startMonth}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SubscriptionForm
          onCreated={(created) => setSubscriptions((rows) => [...rows, created])}
          onSignedOut={onSignedOut}
        />
      </section>
    </main>
  )
}
