import { currentMonth } from '../../../domain/months'
import { formatMonth } from '../../format'
import type { ControlAttributes } from './Field'
import { monthControlBranch, monthOptionRange, supportsMonthInput } from './monthControl'

/** Detection runs once per page load; every control after the first reuses the answer. */
let pickerSupport: boolean | null = null

function detectOnce(): boolean {
  if (pickerSupport === null) pickerSupport = supportsMonthInput()
  return pickerSupport
}

type Props = ControlAttributes & {
  /** A `YYYY-MM` month, or the empty string while the field is clear. */
  value: string
  /** Always a string: `''` when the field is cleared, normalised to `null` at submit by the caller. */
  onChange: (value: string) => void
  required?: boolean
  disabled?: boolean
  /** A `YYYY-MM` lower bound, set only where a server rule gives the field one. */
  min?: string
  /** The leading option of an optional field, naming what empty means ("Still active"). */
  emptyLabel?: string
  /** Labels the fallback options through the month formatter. */
  locale: string
  /** Decides the current year behind the fallback's default range. */
  timeZone: string
  /** Forces a branch instead of the shared detection, for a capture. */
  supportsPicker?: boolean
}

/**
 * The month field: a native month input where the browser has a picker, a
 * native select of named months where it has none. Both branches read and
 * write `.value` only, and the surrounding `Field` supplies the label.
 */
export function MonthField({
  value,
  onChange,
  required = false,
  disabled = false,
  min,
  emptyLabel,
  locale,
  timeZone,
  supportsPicker,
  ...control
}: Props) {
  if (monthControlBranch(supportsPicker ?? detectOnce()) === 'input') {
    return (
      <input
        {...control}
        type="month"
        autoComplete="off"
        required={required}
        disabled={disabled}
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }

  const months = monthOptionRange({
    min,
    value: value || undefined,
    currentMonth: currentMonth(timeZone),
  })

  return (
    <select
      {...control}
      autoComplete="off"
      required={required}
      disabled={disabled}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {required ? (
        <option value="" disabled>
          Choose a month
        </option>
      ) : (
        <option value="">{emptyLabel}</option>
      )}
      {months.map((month) => (
        <option key={month} value={month}>
          {formatMonth(month, locale)}
        </option>
      ))}
    </select>
  )
}
