export type CellMarkName = 'recorded' | 'assumed' | 'excepted' | 'paused' | 'unpriced'

type Props = {
  name: CellMarkName
  /** Unused: the sentence, not the glyph, carries the meaning (design-spec.md §5). */
  title?: string
}

/**
 * One inline 12x12 mark per name, drawn exactly as `design-spec.md` §5. Every
 * shape is `currentColor`, so the class the caller applies (`mark mark-<name>`)
 * is the only place a colour is chosen. Marks never carry a name of their own:
 * `aria-hidden` and `focusable="false"` keep them out of the accessibility
 * tree, because the cell's own sentence already says what they mean.
 */
export function CellMark({ name }: Props) {
  return (
    <svg
      className={`mark mark-${name}`}
      width={12}
      height={12}
      viewBox="0 0 12 12"
      aria-hidden="true"
      focusable="false"
    >
      {name === 'recorded' && <circle cx={6} cy={6} r={4.5} fill="currentColor" />}
      {name === 'assumed' && (
        <circle cx={6} cy={6} r={4.5} fill="none" stroke="currentColor" strokeWidth={1.5} strokeDasharray="2 2" />
      )}
      {name === 'excepted' && (
        <>
          <circle cx={6} cy={6} r={4.5} fill="none" stroke="currentColor" strokeWidth={1.5} />
          <line x1={2.82} y1={2.82} x2={9.18} y2={9.18} stroke="currentColor" strokeWidth={1.5} />
        </>
      )}
      {name === 'paused' && (
        <>
          <rect x={3} y={1} width={2} height={10} fill="currentColor" />
          <rect x={7} y={1} width={2} height={10} fill="currentColor" />
        </>
      )}
      {name === 'unpriced' && (
        <text
          x={6}
          y={6}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={9}
          fontWeight={600}
          fill="currentColor"
        >
          ?
        </text>
      )}
    </svg>
  )
}
