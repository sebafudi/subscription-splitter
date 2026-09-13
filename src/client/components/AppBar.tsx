import { Wordmark } from './Wordmark'

type Props = {
  /** Absent while the session is still loading, when the bar carries the wordmark alone. */
  email?: string
  /** Absent on Home, where the wordmark marks the current page and does nothing. */
  onHome?: () => void
  onSignOut?: () => void
}

export function AppBar({ email, onHome, onSignOut }: Props) {
  return (
    <header className="appbar">
      <div className="column">
        <button
          type="button"
          className="appbar-mark"
          aria-current={onHome ? undefined : 'page'}
          onClick={() => onHome?.()}
        >
          <Wordmark />
        </button>
        {email && onSignOut && (
          <div className="appbar-right">
            <span className="appbar-email t-small soft">{email}</span>
            <button type="button" className="btn-quiet" onClick={onSignOut}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
