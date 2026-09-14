import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { formatMoney } from '../../domain/money'
import {
  ApiError,
  SignedOutError,
  deleteSubscription,
  getSummary,
  listBreakMonths,
  listMembers,
  listPayments,
  listPrices,
  listSchedules,
  type Member,
  type Payment,
  type PriceEntry,
  type Schedule,
  type Subscription,
  type Summary,
} from '../api'
import { formatMonth } from '../format'
import { MemberCalendar } from '../calendar/MemberCalendar'
import { buildSubscriptionState } from '../calendar/projection'
import { AppBar } from '../components/AppBar'
import { BreakMonths } from '../components/BreakMonths'
import { PaymentList } from '../components/PaymentList'
import { PriceHistory } from '../components/PriceHistory'
import { RecurringSection } from '../components/RecurringSection'
import { SubscriptionSettings } from '../components/SubscriptionSettings'
import { DETAIL_SECTIONS, PARTICIPANTS, type SectionDescriptor } from '../components/sections'
import { ConfirmStrip } from '../components/ui/ConfirmStrip'
import { DisclosurePanel } from '../components/ui/DisclosurePanel'
import { CONNECTION_FAILURE } from '../components/ui/FormAlert'
import { SectionAlert } from '../components/ui/SectionAlert'
import { SectionHeader } from '../components/ui/SectionHeader'
import { SectionIndex } from '../components/ui/SectionIndex'
import { StatusLine } from '../components/ui/StatusLine'
import { useSectionStatus } from '../components/ui/useSectionStatus'
import { currencyLocked, headerActions } from './subscriptionEdits'

const EDIT_PANEL_ID = 'subscription-settings-panel'
const EDIT_BUTTON_ID = 'subscription-edit'
const DELETE_BUTTON_ID = 'subscription-delete'

const DELETION_CONSEQUENCE =
  'Its participants and their active months, prices, skipped months, payments, standing orders and ' +
  "their month marks will be removed. This can't be undone."

type Props = {
  subscription: Subscription
  email: string
  onBack: () => void
  onSignOut: () => void
  onSignedOut: () => void
  /** Hands the PATCH response up to where the subscription is held, so the title and subtitle follow it. */
  onUpdated: (subscription: Subscription) => void
  /** Leaves the detail for Home, which confirms the deletion and refetches its list. */
  onDeleted: () => void
}

/** A failed deletion. `gone` marks the 404, where the only useful action left is leaving the screen. */
type HeaderError = { message: string; gone: boolean }

type Loaded = {
  summary: Summary
  members: Member[]
  prices: PriceEntry[]
  breakMonths: string[]
  payments: Payment[]
  schedules: Schedule[]
}

type State =
  | { status: 'loading' }
  | { status: 'ready'; data: Loaded }
  | { status: 'error'; message: string }
  /** Only reachable for a subscription created before the owner became part of every create. */
  | { status: 'no-owner'; message: string }

export function SubscriptionDetail({
  subscription,
  email,
  onBack,
  onSignOut,
  onSignedOut,
  onUpdated,
  onDeleted,
}: Props) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelAlert, setPanelAlert] = useState<string | null>(null)
  // Remounts the form so a closed panel discards what was typed into it.
  const [formKey, setFormKey] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [headerError, setHeaderError] = useState<HeaderError | null>(null)
  const [focusTarget, setFocusTarget] = useState<string | null>(null)
  const [focusAlert, setFocusAlert] = useState(false)
  const status = useSectionStatus()
  const alertLine = useRef<HTMLParagraphElement>(null)

  const load = useCallback(async () => {
    // A reload after an edit keeps the figures already on screen rather than
    // collapsing the layout back to the loading state.
    setState((current) => (current.status === 'ready' ? current : { status: 'loading' }))
    try {
      const [summary, members, prices, breakMonths, payments, schedules] = await Promise.all([
        getSummary(subscription.id),
        listMembers(subscription.id),
        listPrices(subscription.id),
        listBreakMonths(subscription.id),
        listPayments(subscription.id),
        listSchedules(subscription.id),
      ])
      setState({ status: 'ready', data: { summary, members, prices, breakMonths, payments, schedules } })
    } catch (error) {
      if (error instanceof SignedOutError) {
        onSignedOut()
        return
      }
      if (error instanceof ApiError && error.status === 409) {
        setState({ status: 'no-owner', message: error.message })
        return
      }
      setState({
        status: 'error',
        message: error instanceof ApiError ? error.message : CONNECTION_FAILURE,
      })
    }
  }, [subscription.id, onSignedOut])

  useEffect(() => {
    void load()
  }, [load])

  // The two header buttons are absent while a panel or the strip is open, so
  // focus returns to them as the row remounts rather than before it exists.
  useEffect(() => {
    if (!focusTarget) return
    document.getElementById(focusTarget)?.focus()
    setFocusTarget(null)
  }, [focusTarget])

  useEffect(() => {
    if (!focusAlert) return
    alertLine.current?.focus()
    setFocusAlert(false)
  }, [focusAlert])

  const actions = headerActions(state.status)
  // The lock is read off the loaded lists, which is why Edit waits for the first load to settle.
  const locked = state.status === 'ready' ? currencyLocked(state.data) : false

  // The domain's own state, assembled once from the six collections this screen
  // already holds, so every strip and every cell answers from one shape rather
  // than each rebuilding it. A re-render that changes no record costs nothing.
  const calendarState = useMemo(
    () =>
      state.status === 'ready'
        ? buildSubscriptionState({
            subscription,
            members: state.data.members,
            prices: state.data.prices,
            breakMonths: state.data.breakMonths,
            payments: state.data.payments,
            schedules: state.data.schedules,
          })
        : null,
    [state, subscription],
  )

  function closePanel() {
    setPanelOpen(false)
    setPanelAlert(null)
    setFormKey((key) => key + 1)
    setFocusTarget(EDIT_BUTTON_ID)
  }

  function keepSubscription() {
    setConfirming(false)
    setFocusTarget(DELETE_BUTTON_ID)
  }

  /**
   * The one irreversible action on this screen. On success the screen is left
   * behind, so nothing here is reset; on failure the strip closes and the
   * header alert takes the server's own words.
   */
  async function handleDelete() {
    if (deleting) return
    setDeleting(true)
    try {
      await deleteSubscription(subscription.id)
      onDeleted()
    } catch (err) {
      if (err instanceof SignedOutError) {
        onSignedOut()
        return
      }
      setDeleting(false)
      setConfirming(false)
      setHeaderError({
        message: err instanceof ApiError ? err.message : CONNECTION_FAILURE,
        gone: err instanceof ApiError && err.status === 404,
      })
      setFocusAlert(true)
    }
  }

  const bar = <AppBar email={email} onHome={onBack} onSignOut={onSignOut} />

  const header = (
    <header className="detail-head">
      <button type="button" className="btn-link t-small" onClick={onBack}>
        All subscriptions
      </button>
      <h1>{subscription.name}</h1>
      <p className="t-small soft">
        {subscription.currency}, {subscription.timeZone}, from{' '}
        {formatMonth(subscription.startMonth, subscription.locale)}
      </p>

      <div className="detail-actions">
        {!panelOpen && !confirming && (
          <>
            <button
              type="button"
              id={EDIT_BUTTON_ID}
              className="btn-link t-small"
              aria-disabled={!actions.edit || undefined}
              aria-expanded={panelOpen}
              aria-controls={EDIT_PANEL_ID}
              onClick={() => {
                if (!actions.edit) return
                status.clear()
                setPanelOpen(true)
              }}
            >
              Edit subscription
            </button>
            <button
              type="button"
              id={DELETE_BUTTON_ID}
              className="btn-link t-small"
              aria-disabled={!actions.remove || undefined}
              onClick={() => {
                if (!actions.remove) return
                status.clear()
                setConfirming(true)
              }}
            >
              Delete subscription
            </button>
          </>
        )}
        <StatusLine message={status.message} />
      </div>

      <SectionAlert
        ref={alertLine}
        message={headerError?.message ?? null}
        onDismiss={() => setHeaderError(null)}
        action={
          headerError?.gone ? (
            <button type="button" className="btn-link t-small" onClick={onBack}>
              All subscriptions
            </button>
          ) : undefined
        }
      />

      <DisclosurePanel
        id={EDIT_PANEL_ID}
        open={panelOpen}
        title="Edit subscription"
        onCancel={closePanel}
        invalid={panelAlert !== null}
      >
        <SubscriptionSettings
          key={formKey}
          subscription={subscription}
          currencyLocked={locked}
          alert={panelAlert}
          onAlert={setPanelAlert}
          onSaved={(updated) => {
            closePanel()
            setHeaderError(null)
            onUpdated(updated)
            status.confirm('Changes saved')
            void load()
          }}
          onUnchanged={closePanel}
          onCancel={closePanel}
          onSignedOut={onSignedOut}
        />
      </DisclosurePanel>

      {confirming && (
        <ConfirmStrip
          question={`Delete ${subscription.name}?`}
          consequence={DELETION_CONSEQUENCE}
          confirmLabel="Delete subscription"
          busy={deleting}
          onConfirm={() => void handleDelete()}
          onKeep={keepSubscription}
        />
      )}
    </header>
  )

  if (state.status === 'error' || state.status === 'no-owner') {
    return (
      <>
        {bar}
        <main className="column page">
          {header}
          <div className="detail-alert">
            <SectionAlert
              message={state.message}
              onDismiss={state.status === 'error' ? () => void load() : onBack}
              dismissLabel={state.status === 'error' ? 'Try again' : 'All subscriptions'}
              dismissVariant={state.status === 'error' ? 'quiet' : 'link'}
            />
          </div>
        </main>
      </>
    )
  }

  if (state.status === 'loading') {
    return (
      <>
        {bar}
        <main className="column page">
          {header}

          <p className="t-small soft summary-label">Owed to you now</p>
          <div className="skeleton skeleton-figure" aria-hidden="true" />
          <dl className="ledger-line">
            {['Per person this month', 'Your share this month', 'Collected this month', 'Active participants'].map(
              (label) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>
                    <span className="skeleton skeleton-cell" aria-hidden="true" />
                  </dd>
                </div>
              ),
            )}
          </dl>
          <div className="skeleton skeleton-sentence" aria-hidden="true" />

          <SectionIndex sections={DETAIL_SECTIONS} ready={false} />

          {DETAIL_SECTIONS.map((section) =>
            section.id === PARTICIPANTS.id ? (
              <SkeletonCalendarSection key={section.id} section={section} />
            ) : (
              <SkeletonSection key={section.id} section={section} />
            ),
          )}

          <p role="status" className="sr-only">
            Loading this subscription
          </p>
        </main>
      </>
    )
  }

  const { summary, members, prices, breakMonths, payments, schedules } = state.data
  const owner = members.find((member) => member.isOwner)
  const money = (minor: number) => formatMoney(minor, summary.locale, summary.currency)

  /**
   * Exactly what `memberMonthStatus` reads, assembled from the subscription this
   * screen already holds and the break months it already lists. `MemberSummary`
   * carries neither, and nothing here is fabricated to satisfy the type: the
   * parameter is narrowed to these two fields for this caller (decision D-008).
   */
  const monthInputs = {
    settings: {
      startMonth: subscription.startMonth,
      currency: subscription.currency,
      locale: subscription.locale,
      timeZone: subscription.timeZone,
    },
    breakMonths,
  }

  return (
    <>
      {bar}
      <main className="column page">
        {header}

        <p className="t-small soft summary-label">Owed to you now</p>
        {/* Whether the amount is above zero is read off the figure already on screen; nothing is computed. */}
        <p className={summary.owedToYouNow > 0 ? 't-figure tnum figure-owed' : 't-figure tnum'}>
          {money(summary.owedToYouNow)}
        </p>

        <dl className="ledger-line tnum">
          <div>
            <dt>Per person this month</dt>
            <dd>{money(summary.currentPerPersonShare)}</dd>
          </div>
          <div>
            <dt>Your share this month</dt>
            <dd>{money(summary.ownerShareThisMonth)}</dd>
          </div>
          <div>
            <dt>Collected this month</dt>
            <dd>
              {money(summary.collectedThisMonth)} of {money(summary.expectedThisMonth)}
            </dd>
          </div>
          <div>
            <dt>Active participants</dt>
            <dd>{summary.currentActiveCount}</dd>
          </div>
        </dl>

        <p className="summary-sentence tnum">
          {formatMonth(summary.currentMonth, summary.locale)} costs {money(summary.currentMonthly)}. Your net
          cost since the plan started is {money(summary.ownerNetCost)}, against a plan total of{' '}
          {money(summary.totalPlanCost)}.{owner && ` You are on this plan as ${owner.name}.`}
        </p>

        <SectionIndex sections={DETAIL_SECTIONS} ready />

        {calendarState && (
        <MemberCalendar
          subscriptionId={subscription.id}
          startMonth={subscription.startMonth}
          members={members}
          summary={summary}
          timeZone={subscription.timeZone}
          state={calendarState}
          payments={payments}
          schedules={schedules}
          onChanged={() => void load()}
          onSignedOut={onSignedOut}
        />
        )}

        <PriceHistory
          subscriptionId={subscription.id}
          prices={prices}
          currency={summary.currency}
          locale={summary.locale}
          startMonth={subscription.startMonth}
          timeZone={subscription.timeZone}
          onChanged={() => void load()}
          onSignedOut={onSignedOut}
        />

        <BreakMonths
          subscriptionId={subscription.id}
          breakMonths={breakMonths}
          locale={summary.locale}
          startMonth={subscription.startMonth}
          timeZone={subscription.timeZone}
          onChanged={() => void load()}
          onSignedOut={onSignedOut}
        />

        <PaymentList
          subscriptionId={subscription.id}
          payments={payments}
          members={members}
          currency={summary.currency}
          locale={summary.locale}
          startMonth={subscription.startMonth}
          onChanged={() => void load()}
          onSignedOut={onSignedOut}
        />

        <RecurringSection
          subscriptionId={subscription.id}
          schedules={schedules}
          members={members}
          monthInputs={monthInputs}
          currentMonth={summary.currentMonth}
          currency={summary.currency}
          locale={summary.locale}
          startMonth={subscription.startMonth}
          timeZone={subscription.timeZone}
          onChanged={() => void load()}
          onSignedOut={onSignedOut}
        />
      </main>
    </>
  )
}

/**
 * The Participants section on first load: the same opening as every other
 * section, then per expected participant a name bar, a cells bar and a
 * twelve-column row of empty cells (`design-spec.md` §9). The year control and
 * legend are not drawn, because neither exists until the range is known.
 */
function SkeletonCalendarSection({ section }: { section: SectionDescriptor }) {
  return (
    <section aria-labelledby={section.id}>
      <SectionHeader
        id={section.id}
        title={section.title}
        subtitle={section.subtitle}
        action={
          <button type="button" className="btn-primary" aria-disabled="true">
            {section.action}
          </button>
        }
      />
      <div className="calendar-blocks" aria-hidden="true">
        {[0, 1].map((position) => (
          <div key={position} className="calendar-block">
            <span className="skeleton skeleton-calendar-name" />
            <span className="skeleton skeleton-calendar-line" />
            <div className="skeleton-calendar-strip">
              {Array.from({ length: 12 }, (_, month) => (
                <span key={month} className="skeleton-calendar-cell" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/**
 * A section on first load: its heading and subtitle are there, its count is
 * blank because nothing has been counted yet, its action is disabled but still
 * focusable, and two static bars stand in for the entries. Nothing shimmers and
 * nothing is announced.
 */
function SkeletonSection({ section }: { section: SectionDescriptor }) {
  return (
    <section aria-labelledby={section.id}>
      <SectionHeader
        id={section.id}
        title={section.title}
        subtitle={section.subtitle}
        action={
          <button type="button" className="btn-primary" aria-disabled="true">
            {section.action}
          </button>
        }
      />
      <ul className="entry-list">
        {[0, 1].map((position) => (
          <li key={position}>
            <div className="entry" aria-hidden="true">
              <span className="entry-primary skeleton skeleton-entry-primary" />
              <span className="entry-secondary skeleton skeleton-entry-secondary" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
