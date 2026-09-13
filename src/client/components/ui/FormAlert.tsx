import type { Ref } from 'react'

type Props = {
  /** Null when idle. The live region stays in the tree either way, so announcements are reliable. */
  message: string | null
  /** Lets a form move focus here when a submit fails with no invalid field to land on. */
  ref?: Ref<HTMLParagraphElement>
}

/**
 * The whole-form half of the validation convention: one alert at the top of a
 * panel. The panel itself takes the red left rule while this has text.
 *
 * The `role="alert"` wrapper is always rendered and never hidden, because a
 * live region inserted at the moment it gains text is announced unreliably.
 * Only the styled sentence inside it comes and goes.
 */
export function FormAlert({ message, ref }: Props) {
  return (
    <div role="alert" className="alert-region">
      {message && (
        <p className="form-alert t-body" tabIndex={-1} ref={ref}>
          {message}
        </p>
      )}
    </div>
  )
}

/** Network failure copy, shared by every form and every section alert. */
export const CONNECTION_FAILURE = 'Could not save. Check your connection and try again.'
