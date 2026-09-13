import { useEffect, useRef, type KeyboardEvent } from 'react'

type Props = {
  /** For example "Delete Alice? Their payments stay recorded." */
  question: string
  /** "Delete", or "Delete anyway" once the server has named what the deletion would cost. */
  confirmLabel?: string
  onConfirm: () => void
  /** Keep and Escape both run this, and focus returns to the entry's Delete button. */
  onKeep: () => void
}

/**
 * The one destructive confirmation, in place of the entry's action row. It
 * blocks nothing: the rest of the page stays usable while it is open.
 *
 * Focus moves to Keep on open, so the dangerous button is never the one under
 * the cursor's keyboard equivalent.
 */
export function ConfirmStrip({ question, confirmLabel = 'Delete', onConfirm, onKeep }: Props) {
  const keep = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    keep.current?.focus()
  }, [])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape') return
    event.stopPropagation()
    onKeep()
  }

  return (
    <div className="confirm-strip" onKeyDown={handleKeyDown}>
      <span className="t-body">{question}</span>
      <button type="button" className="btn-destructive" onClick={onConfirm}>
        {confirmLabel}
      </button>
      <button type="button" className="btn-quiet" onClick={onKeep} ref={keep}>
        Keep
      </button>
    </div>
  )
}
