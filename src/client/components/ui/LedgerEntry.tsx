import type { ReactNode } from 'react'

type Props = {
  primary: ReactNode
  secondary?: ReactNode
  /** Right aligned above 640px, under the secondary line and left aligned below it. */
  figure?: ReactNode
  secondaryFigure?: ReactNode
  /** Link-variant buttons, always visible and never revealed on hover. */
  actions?: ReactNode
  /** Set while this row is the one a just-finished action changed. */
  highlighted?: boolean
  /** Replaces the action row in place while a delete is being confirmed. */
  confirm?: ReactNode
  /** Extra content below the row's lines, such as a standing order's month tiles. */
  children?: ReactNode
}

/**
 * The one row shape used by the Home list and every detail section: a primary
 * line, a secondary line, a figure column and a row of actions, closed by a
 * hairline.
 */
export function LedgerEntry({
  primary,
  secondary,
  figure,
  secondaryFigure,
  actions,
  highlighted = false,
  confirm,
  children,
}: Props) {
  return (
    <div className={highlighted ? 'entry entry-highlight' : 'entry'}>
      <span className="entry-primary t-entry">{primary}</span>
      {figure !== undefined && <span className="entry-figure">{figure}</span>}
      {secondary !== undefined && <span className="entry-secondary t-small soft">{secondary}</span>}
      {secondaryFigure !== undefined && (
        <span className="entry-figure entry-figure-secondary t-small soft">{secondaryFigure}</span>
      )}
      {children}
      {confirm ? <div className="entry-confirm">{confirm}</div> : actions && <div className="entry-actions">{actions}</div>}
    </div>
  )
}

type ButtonProps = {
  primary: ReactNode
  figure?: ReactNode
  highlighted?: boolean
  onClick: () => void
}

/**
 * The Home list's variant: the whole row is one native button. It carries no
 * action slot, so no button is ever nested inside another.
 */
export function LedgerEntryButton({ primary, figure, highlighted = false, onClick }: ButtonProps) {
  return (
    <button
      type="button"
      className={highlighted ? 'entry entry-button entry-highlight' : 'entry entry-button'}
      onClick={onClick}
    >
      <span className="entry-primary t-entry">{primary}</span>
      {figure !== undefined && <span className="entry-figure t-small soft">{figure}</span>}
    </button>
  )
}
