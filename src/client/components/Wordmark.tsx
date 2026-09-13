import { useId } from 'react'

type Props = {
  /** Edge of the square glyph in pixels; the text keeps its own size. */
  size?: number
}

/**
 * The product's identity: the split glyph followed by its name. The glyph is
 * decorative and the text carries the accessible name.
 */
export function Wordmark({ size = 18 }: Props) {
  const clipId = useId()

  return (
    <span className="wordmark">
      <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true" focusable="false">
        <defs>
          <clipPath id={clipId}>
            <rect width="18" height="18" rx="3" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <path d="M0 0h18L0 18z" fill="var(--ink)" />
          <path d="M18 0v18H0z" fill="var(--green)" />
        </g>
      </svg>
      Subscription Splitter
    </span>
  )
}
