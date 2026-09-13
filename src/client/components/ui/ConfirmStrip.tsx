import { useEffect, useRef, type KeyboardEvent } from 'react'

type Props = {
  /** For example "Delete Alice? Their payments stay recorded." */
  question: string
  /** One sentence under the question, naming what else goes; only the subscription deletion uses it. */
  consequence?: string
  /** "Delete", or "Delete anyway" once the server has named what the deletion would cost. */
  confirmLabel?: string
  onConfirm: () => void
  /** Keep and Escape both run this, and focus returns to the entry's Delete button. */
  onKeep: () => void
  /** Set while the request is in flight: both buttons stop responding and the labels stay put. */
  busy?: boolean
}

/**
 * The one destructive confirmation, in place of the entry's action row. It
 * blocks nothing: the rest of the page stays usable while it is open.
 *
 * Focus moves to Keep on open, so the dangerous button is never the one under
 * the cursor's keyboard equivalent.
 */
export function ConfirmStrip({
  question,
  consequence,
  confirmLabel = 'Delete',
  onConfirm,
  onKeep,
  busy = false,
}: Props) {
  const keep = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    keep.current?.focus()
  }, [])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape') return
    event.stopPropagation()
    if (busy) return
    onKeep()
  }

  return (
    <div className="confirm-strip" onKeyDown={handleKeyDown} aria-busy={busy || undefined}>
      <span className="t-body">{question}</span>
      {consequence && <span className="confirm-consequence t-small">{consequence}</span>}
      <button
        type="button"
        className="btn-destructive"
        aria-disabled={busy || undefined}
        onClick={() => {
          if (busy) return
          onConfirm()
        }}
      >
        {confirmLabel}
      </button>
      <button
        type="button"
        className="btn-quiet"
        ref={keep}
        aria-disabled={busy || undefined}
        onClick={() => {
          if (busy) return
          onKeep()
        }}
      >
        Keep
      </button>
    </div>
  )
}
