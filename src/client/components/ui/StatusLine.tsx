import { useEffect, useState } from 'react'

const FADE_OUT_MS = 200

type Props = {
  /** Null when idle. `useSectionStatus` owns the sentence and its four second life. */
  message: string | null
}

/**
 * Every successful create, edit, delete and toggle confirms itself here, at
 * the right end of its section's heading row. The live region is always in the
 * tree and only its contents change.
 *
 * The sentence outlives its prop by the length of the fade so the dismissal is
 * seen rather than cut; under reduced motion it leaves at once.
 */
export function StatusLine({ message }: Props) {
  const [shown, setShown] = useState(message)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (message !== null) {
      setShown(message)
      setLeaving(false)
      return
    }
    if (shown === null) return
    setLeaving(true)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = setTimeout(
      () => {
        setShown(null)
        setLeaving(false)
      },
      reduced ? 0 : FADE_OUT_MS,
    )
    return () => clearTimeout(timer)
  }, [message, shown])

  return (
    <div role="status" className="alert-region">
      {shown && (
        <span className={leaving ? 'status-line status-line-leaving t-small' : 'status-line t-small'}>
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
            <path
              d="M1.5 6.5 4.5 9.5 10.5 3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {shown}
        </span>
      )}
    </div>
  )
}
