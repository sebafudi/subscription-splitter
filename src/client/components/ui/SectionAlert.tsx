import type { ReactNode, Ref } from 'react'

type Props = {
  /** Null when idle. */
  message: string | null
  onDismiss: () => void
  /** Home's load failure offers a quiet "Try again" in place of Dismiss; every other use takes the default. */
  dismissLabel?: string
  dismissVariant?: 'link' | 'quiet'
  /** A second control beside Dismiss, used by the detail header when the subscription is already gone. */
  action?: ReactNode
  /** Lets a caller move focus here when the action that failed left no button to return to. */
  ref?: Ref<HTMLParagraphElement>
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
  action,
  ref,
}: Props) {
  return (
    <div role="alert" className="alert-region">
      {message && (
        <p className="section-alert t-body" tabIndex={-1} ref={ref}>
          <span>{message}</span>
          {action}
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
