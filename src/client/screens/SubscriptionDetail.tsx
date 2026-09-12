import { useCallback, useEffect, useState } from 'react'
import { formatMoney } from '../../domain/money'
import {
  ApiError,
  SignedOutError,
  getSummary,
  listBreakMonths,
  listMembers,
  listPrices,
  type Member,
  type PriceEntry,
  type Subscription,
  type Summary,
} from '../api'
import { BreakMonths } from '../components/BreakMonths'
import { MemberForm } from '../components/MemberForm'
import { MemberList } from '../components/MemberList'
import { PriceHistory } from '../components/PriceHistory'

type Props = {
  subscription: Subscription
  onBack: () => void
  onSignedOut: () => void
}

type Loaded = {
  summary: Summary
  members: Member[]
  prices: PriceEntry[]
  breakMonths: string[]
}

type State =
  | { status: 'loading' }
  | { status: 'ready'; data: Loaded }
  | { status: 'error'; message: string }
  /** Only reachable for a subscription created before the owner became part of every create. */
  | { status: 'no-owner'; message: string }

export function SubscriptionDetail({ subscription, onBack, onSignedOut }: Props) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [editing, setEditing] = useState<Member | null>(null)

  const load = useCallback(async () => {
    // A reload after an edit keeps the figures already on screen rather than
    // collapsing the layout back to the loading state.
    setState((current) => (current.status === 'ready' ? current : { status: 'loading' }))
    try {
      const [summary, members, prices, breakMonths] = await Promise.all([
        getSummary(subscription.id),
        listMembers(subscription.id),
        listPrices(subscription.id),
        listBreakMonths(subscription.id),
      ])
      setState({ status: 'ready', data: { summary, members, prices, breakMonths } })
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
        message: error instanceof ApiError ? error.message : 'Could not load this subscription.',
      })
    }
  }, [subscription.id, onSignedOut])

  useEffect(() => {
    void load()
  }, [load])

  const header = (
    <header className="detail-header">
      <button type="button" onClick={onBack}>
        Back to subscriptions
      </button>
      <h2>{subscription.name}</h2>
      <p className="row-detail">
        {subscription.currency}, {subscription.timeZone}, starting {subscription.startMonth}
      </p>
    </header>
  )

  if (state.status === 'loading') {
    return (
      <main className="screen">
        {header}
        <div className="card-row">
          {['Owed to you now', 'Per person this month', 'Your share this month', 'Collected this month', 'Active participants'].map(
            (label) => (
              <div className="card" key={label}>
                <span className="card-label">{label}</span>
                <span className="card-value">—</span>
              </div>
            ),
          )}
        </div>
        <p role="status">Loading this month's figures…</p>
      </main>
    )
  }

  if (state.status === 'error') {
    return (
      <main className="screen">
        {header}
        <p role="alert" className="field-error">
          {state.message}
        </p>
        <button type="button" onClick={() => void load()}>
          Try again
        </button>
      </main>
    )
  }

  if (state.status === 'no-owner') {
    return (
      <main className="screen">
        {header}
        <p role="alert" className="field-error">
          {state.message}
        </p>
      </main>
    )
  }

  const { summary, members, prices, breakMonths } = state.data
  const owner = members.find((member) => member.isOwner)
  const money = (minor: number) => formatMoney(minor, summary.locale, summary.currency)

  return (
    <main className="screen">
      {header}

      <div className="card-row">
        <div className="card">
          <span className="card-label">Owed to you now</span>
          <span className="card-value">{money(summary.owedToYouNow)}</span>
        </div>
        <div className="card">
          <span className="card-label">Per person this month</span>
          <span className="card-value">{money(summary.currentPerPersonShare)}</span>
        </div>
        <div className="card">
          <span className="card-label">Your share this month</span>
          <span className="card-value">{money(summary.ownerShareThisMonth)}</span>
        </div>
        <div className="card">
          <span className="card-label">Collected this month</span>
          <span className="card-value">
            {money(summary.collectedThisMonth)} of {money(summary.expectedThisMonth)}
          </span>
        </div>
        <div className="card">
          <span className="card-label">Active participants</span>
          <span className="card-value">{summary.currentActiveCount}</span>
        </div>
      </div>

      <p className="row-detail">
        {summary.currentMonth} costs {money(summary.currentMonthly)}. Your net cost since the plan started is{' '}
        <strong>{money(summary.ownerNetCost)}</strong>, against a plan total of {money(summary.totalPlanCost)}.
        {owner && ` You are on this plan as ${owner.name}.`}
      </p>

      <MemberList
        subscriptionId={subscription.id}
        members={members}
        summary={summary}
        onEdit={setEditing}
        onChanged={() => {
          setEditing(null)
          void load()
        }}
        onSignedOut={onSignedOut}
      />

      <MemberForm
        key={editing?.id ?? 'new'}
        subscriptionId={subscription.id}
        startMonth={subscription.startMonth}
        editing={editing}
        onSaved={() => {
          setEditing(null)
          void load()
        }}
        onCancelEdit={() => setEditing(null)}
        onSignedOut={onSignedOut}
      />

      <PriceHistory
        subscriptionId={subscription.id}
        prices={prices}
        currency={summary.currency}
        locale={summary.locale}
        onChanged={() => void load()}
        onSignedOut={onSignedOut}
      />

      <BreakMonths
        subscriptionId={subscription.id}
        breakMonths={breakMonths}
        onChanged={() => void load()}
        onSignedOut={onSignedOut}
      />
    </main>
  )
}
