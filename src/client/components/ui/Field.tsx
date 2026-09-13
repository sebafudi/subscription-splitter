import type { ReactNode } from 'react'

/** The attributes a field's control must carry so its label, hint and error reach a screen reader. */
export type ControlAttributes = {
  id: string
  'aria-describedby'?: string
  'aria-invalid'?: 'true'
}

type Props = {
  /** Also the control's id, so the label points at it. */
  id: string
  label: string
  /** Sits under the label and stays visible; the ISO form of a month or date belongs here. */
  hint?: string
  /** One sentence, never prefixed with the wire name. */
  error?: string
  /** A field spans both columns of a panel's grid unless it is half of a declared pair. */
  span?: boolean
  children: (control: ControlAttributes) => ReactNode
}

export function Field({ id, label, hint, error, span = true, children }: Props) {
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')

  return (
    <div className={span ? 'field field-span' : 'field'}>
      <label htmlFor={id}>{label}</label>
      {hint && (
        <span className="field-hint t-small soft" id={hintId}>
          {hint}
        </span>
      )}
      {children({
        id,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? 'true' : undefined,
      })}
      {error && (
        <span className="field-error t-small" id={errorId}>
          {error}
        </span>
      )}
    </div>
  )
}
