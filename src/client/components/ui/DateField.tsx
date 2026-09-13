import type { ControlAttributes } from './Field'

type Props = ControlAttributes & {
  /** A `YYYY-MM-DD` date, or the empty string while the field is clear. */
  value: string
  onChange: (value: string) => void
  required?: boolean
  disabled?: boolean
  /** A `YYYY-MM-DD` lower bound, set only where a server rule gives the field one. */
  min?: string
}

/**
 * The day-precision control. Every browser the product supports implements the
 * date picker, so this one has no fallback branch.
 */
export function DateField({ value, onChange, required = false, disabled = false, min, ...control }: Props) {
  return (
    <input
      {...control}
      type="date"
      autoComplete="off"
      required={required}
      disabled={disabled}
      min={min}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}
