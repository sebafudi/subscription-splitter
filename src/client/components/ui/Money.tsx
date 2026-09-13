/**
 * The three money treatments. Each takes a string `formatMoney` already
 * produced: nothing here formats, parses or derives an amount.
 */

type Treatment = 'recorded' | 'assumed'

type MoneyProps = {
  /** A string from `formatMoney`, never a number of minor units. */
  value: string
  /** Recorded money is ink; assumed money is pencil. The two never look the same. */
  treatment?: Treatment
}

export function Money({ value, treatment = 'recorded' }: MoneyProps) {
  return <span className={treatment === 'assumed' ? 'tnum money-assumed' : 'tnum money-recorded'}>{value}</span>
}

/** Which side of settled a balance falls on. The caller reads it off the wire amount. */
export type BalanceState = 'owes' | 'ahead' | 'settled'

type BalanceProps = {
  state: BalanceState
  /** A string from `formatMoney`. Unused when the balance is settled. */
  value: string
}

/**
 * The words carry the sign, so a balance never shows a bare minus.
 */
export function Balance({ state, value }: BalanceProps) {
  if (state === 'settled') {
    return <span className="balance-settled">settled</span>
  }
  return (
    <span className={state === 'owes' ? 'balance-owes' : 'balance-ahead'}>
      {state === 'owes' ? 'owes ' : 'ahead '}
      <span className="tnum">{value}</span>
    </span>
  )
}
