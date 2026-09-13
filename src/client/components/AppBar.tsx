import { Wordmark } from './Wordmark'

type Props = {
  email: string
  /** Absent on Home, where the wordmark marks the current page and does nothing. */
  onHome?: () => void
  onSignOut: () => void
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
        <div className="appbar-right">
          <span className="appbar-email t-small soft">{email}</span>
          <button type="button" className="btn-quiet" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
