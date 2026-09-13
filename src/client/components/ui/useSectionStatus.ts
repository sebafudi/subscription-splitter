import { useCallback, useEffect, useRef, useState } from 'react'

const DISMISS_AFTER_MS = 4000

type Confirmation = {
  /** The success sentence, for example "Payment recorded". */
  message: string
  /** The entry that was just created or edited, or null when nothing is highlighted. */
  highlightedId: string | null
}

/**
 * One per section. The status line's sentence and the just-changed row's
 * highlight share a single timer, because under reduced motion the row holds
 * `--green-tint` for exactly as long as the sentence stands rather than running
 * its own fade. Firing another action in the section replaces both at once.
 */
export function useSectionStatus() {
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stopTimer = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  useEffect(() => stopTimer, [stopTimer])

  const clear = useCallback(() => {
    stopTimer()
    setConfirmation(null)
  }, [stopTimer])

  const confirm = useCallback(
    (message: string, highlightedId: string | null = null) => {
      stopTimer()
      setConfirmation({ message, highlightedId })
      timer.current = setTimeout(() => setConfirmation(null), DISMISS_AFTER_MS)
    },
    [stopTimer],
  )

  return {
    message: confirmation?.message ?? null,
    highlightedId: confirmation?.highlightedId ?? null,
    confirm,
    clear,
  }
}
