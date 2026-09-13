import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, SignedOutError, listSubscriptions, type Subscription } from '../api'
import { AppBar } from '../components/AppBar'
import { DisclosurePanel } from '../components/ui/DisclosurePanel'
import { CONNECTION_FAILURE } from '../components/ui/FormAlert'
import { LedgerEntryButton } from '../components/ui/LedgerEntry'
import { SectionAlert } from '../components/ui/SectionAlert'
import { SectionHeader } from '../components/ui/SectionHeader'
import { StatusLine } from '../components/ui/StatusLine'
import { useSectionStatus } from '../components/ui/useSectionStatus'
import { formatMonth } from '../format'
import { SubscriptionForm } from './SubscriptionForm'

const PANEL_ID = 'new-subscription-panel'
const HEADING_ID = 'home-heading'

type Props = {
  email: string
  onSelect: (subscription: Subscription) => void
  onSignOut: () => void
  onSignedOut: () => void
  /** Set by a deletion that sent the user back here; consumed once and cleared. */
  announceDeleted?: boolean
  onAnnounced?: () => void
}

export function Home({
  email,
  onSelect,
  onSignOut,
  onSignedOut,
  announceDeleted = false,
  onAnnounced,
}: Props) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelAlert, setPanelAlert] = useState<string | null>(null)
  // Remounts the form so a closed panel discards what was typed into it.
  const [formKey, setFormKey] = useState(0)
  const [returnFocus, setReturnFocus] = useState(false)
  const status = useSectionStatus()
  const newButton = useRef<HTMLButtonElement>(null)
  const announced = useRef(false)

  const load = useCallback(() => {
    let cancelled = false
    setLoadError(null)
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
        setLoadError(error instanceof ApiError ? error.message : CONNECTION_FAILURE)
      })
    return () => {
      cancelled = true
    }
  }, [onSignedOut])

  useEffect(() => load(), [load])

  // A deletion leaves no row to land on, so focus goes to the heading that
  // titles the screen and the sentence confirms what happened. The ref makes it
  // once per mount whatever the caller does with the flag afterwards.
  useEffect(() => {
    if (!announceDeleted || announced.current) return
    announced.current = true
    status.confirm('Subscription deleted')
    document.getElementById(HEADING_ID)?.focus()
    onAnnounced?.()
  }, [announceDeleted, status, onAnnounced])

  // The button is absent while the panel is open, so focus returns to it as it remounts.
  useEffect(() => {
    if (!returnFocus) return
    newButton.current?.focus()
    setReturnFocus(false)
  }, [returnFocus])

  function closePanel() {
    setPanelOpen(false)
    setPanelAlert(null)
    setFormKey((key) => key + 1)
    setReturnFocus(true)
  }

  return (
    <>
      <AppBar email={email} onSignOut={onSignOut} />
      <main className="column page">
        <SectionHeader
          id={HEADING_ID}
          title="Your subscriptions"
          level={1}
          rule={false}
          count={subscriptions.length}
          status={<StatusLine message={status.message} />}
          action={
            !panelOpen && (
              <button
                type="button"
                className="btn-primary"
                ref={newButton}
                aria-expanded={panelOpen}
                aria-controls={PANEL_ID}
                onClick={() => {
                  status.clear()
                  setPanelOpen(true)
                }}
              >
                New subscription
              </button>
            )
          }
        >
          <SectionAlert
            message={loadError}
            onDismiss={() => {
              load()
            }}
            dismissLabel="Try again"
            dismissVariant="quiet"
          />
        </SectionHeader>

        <DisclosurePanel
          id={PANEL_ID}
          open={panelOpen}
          title="New subscription"
          onCancel={closePanel}
          invalid={panelAlert !== null}
        >
          <SubscriptionForm
            key={formKey}
            alert={panelAlert}
            onAlert={setPanelAlert}
            onCreated={(created) => {
              setSubscriptions((rows) => [...rows, created])
              closePanel()
              status.confirm('Subscription created', created.id)
            }}
            onCancel={closePanel}
            onSignedOut={onSignedOut}
          />
        </DisclosurePanel>

        {subscriptions.length === 0 ? (
          <p className="home-empty t-body soft">
            No subscriptions yet. Add the first one to start tracking who pays.
          </p>
        ) : (
          <ul className="home-list">
            {subscriptions.map((subscription) => (
              <li key={subscription.id}>
                <LedgerEntryButton
                  primary={subscription.name}
                  figure={`${subscription.currency}, from ${formatMonth(subscription.startMonth, subscription.locale)}`}
                  highlighted={status.highlightedId === subscription.id}
                  onClick={() => onSelect(subscription)}
                />
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  )
}
