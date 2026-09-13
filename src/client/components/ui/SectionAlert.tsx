type Props = {
  /** Null when idle. */
  message: string | null
  onDismiss: () => void
  /** Home's load failure offers a quiet "Try again" in place of Dismiss; every other use takes the default. */
  dismissLabel?: string
  dismissVariant?: 'link' | 'quiet'
}

/**
 * The home for an error raised outside any disclosure panel: a refused delete,
 * a failed archive or unarchive, a failed unskip, a failed tile toggle, a
 * failed list load. It never carries an error raised inside a panel, which
 * stays in that panel's own alert.
 *
 * The live region is always in the tree and only its contents change.
 */
export function SectionAlert({
  message,
  onDismiss,
  dismissLabel = 'Dismiss',
  dismissVariant = 'link',
}: Props) {
  return (
    <div role="alert" className="alert-region">
      {message && (
        <p className="section-alert t-body">
          <span>{message}</span>
          <button
            type="button"
            className={dismissVariant === 'quiet' ? 'btn-quiet' : 'btn-link t-small'}
            onClick={onDismiss}
          >
            {dismissLabel}
          </button>
        </p>
      )}
    </div>
  )
}
