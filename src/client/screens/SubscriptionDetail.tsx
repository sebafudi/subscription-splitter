import { useCallback, useEffect, useState } from 'react'
import { formatMoney } from '../../domain/money'
import {
  ApiError,
  SignedOutError,
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
import { AppBar } from '../components/AppBar'
import { BreakMonths } from '../components/BreakMonths'
import { MemberList } from '../components/MemberList'
import { PaymentList } from '../components/PaymentList'
import { PriceHistory } from '../components/PriceHistory'
import { RecurringSection } from '../components/RecurringSection'
import { DETAIL_SECTIONS, type SectionDescriptor } from '../components/sections'
import { CONNECTION_FAILURE } from '../components/ui/FormAlert'
import { SectionAlert } from '../components/ui/SectionAlert'
import { SectionHeader } from '../components/ui/SectionHeader'
import { SectionIndex } from '../components/ui/SectionIndex'

type Props = {
  subscription: Subscription
  email: string
  onBack: () => void
  onSignOut: () => void
  onSignedOut: () => void
}

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

export function SubscriptionDetail({ subscription, email, onBack, onSignOut, onSignedOut }: Props) {
  const [state, setState] = useState<State>({ status: 'loading' })

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

          {DETAIL_SECTIONS.map((section) => (
            <SkeletonSection key={section.id} section={section} />
          ))}

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

        <MemberList
          subscriptionId={subscription.id}
          startMonth={subscription.startMonth}
          members={members}
          summary={summary}
          timeZone={subscription.timeZone}
          onChanged={() => void load()}
          onSignedOut={onSignedOut}
        />

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
