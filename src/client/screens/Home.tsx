import { useEffect, useState } from 'react'
import { SignedOutError, listSubscriptions, type Subscription } from '../api'
import { AppBar } from '../components/AppBar'
import { SubscriptionForm } from './SubscriptionForm'

type Props = {
  email: string
  onSelect: (subscription: Subscription) => void
  onSignOut: () => void
  onSignedOut: () => void
}

export function Home({ email, onSelect, onSignOut, onSignedOut }: Props) {
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

  return (
    <>
      <AppBar email={email} onSignOut={onSignOut} />
      <main className="screen">
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
    </>
  )
}
