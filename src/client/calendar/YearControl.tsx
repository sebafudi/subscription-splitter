import { CellMark, type CellMarkName } from './CellMark'

export type YearRange = { first: number; last: number }
export type LaterYearPayments = { year: number; count: number }

type Props = {
  year: number
  range: YearRange
  /** Unused today: the range sentence and legend carry no locale-formatted date. Kept for the contract. */
  locale: string
  /** Years strictly after `year` that hold at least one manual receipt, ascending. */
  futureYears: LaterYearPayments[]
  onSelectYear: (year: number) => void
}

const LEGEND: { name: CellMarkName; phrase: string }[] = [
  { name: 'recorded', phrase: 'recorded' },
  { name: 'assumed', phrase: 'assumed from a standing order' },
  { name: 'paused', phrase: 'plan paused' },
  { name: 'unpriced', phrase: 'no price' },
  { name: 'excepted', phrase: 'marked not received' },
]

/**
 * The `‹`/`›` buttons, the year select and the range sentence
 * (`design-spec.md` §3), plus the legend that shares the section with them.
 * Never moves focus itself: a click or change leaves focus on the control the
 * reader used.
 */
export function YearControl({ year, range, futureYears, onSelectYear }: Props) {
  const atFirst = year <= range.first
  const atLast = year >= range.last
  const years: number[] = []
  for (let candidate = range.first; candidate <= range.last; candidate += 1) {
    years.push(candidate)
  }

  return (
    <div className="calendar-year-control">
      <div className="calendar-year-row">
        <button
          type="button"
          className="btn-quiet"
          aria-label="Previous year"
          aria-disabled={atFirst || undefined}
          onClick={() => {
            if (atFirst) return
            onSelectYear(year - 1)
          }}
        >
          ‹
        </button>
        <label className="sr-only" htmlFor="year-select">
          Year
        </label>
        <select id="year-select" value={year} onChange={(event) => onSelectYear(Number(event.target.value))}>
          {years.map((candidate) => (
            <option key={candidate} value={candidate}>
              {candidate}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn-quiet"
          aria-label="Next year"
          aria-disabled={atLast || undefined}
          onClick={() => {
            if (atLast) return
            onSelectYear(year + 1)
          }}
        >
          ›
        </button>
        <p className="calendar-year-range t-small soft">
          Showing Jan to Dec {year}.{' '}
          {futureYears.map(({ year: laterYear, count }) => (
            <button
              key={laterYear}
              type="button"
              className="btn-link"
              onClick={() => onSelectYear(laterYear)}
            >
              {laterYear} holds {count} payment{count === 1 ? '' : 's'}.
            </button>
          ))}
        </p>
      </div>
      <p className="calendar-legend t-small soft">
        {LEGEND.map(({ name, phrase }) => (
          <span key={name} className="calendar-legend-item">
            <CellMark name={name} /> {phrase}
          </span>
        ))}
        <span className="calendar-legend-item">
          <span className="calendar-legend-hatch" /> not on the plan
        </span>
      </p>
    </div>
  )
}
