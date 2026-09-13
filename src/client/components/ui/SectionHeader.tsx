import type { ReactNode } from 'react'

type Props = {
  /** The heading's id, so the section's `aria-labelledby` and the section index both point at it. */
  id: string
  title: string
  /** 1 on Home, whose heading titles the screen; 2 for every section on the detail screen. */
  level?: 1 | 2
  /** The 2px opening rule. Home's heading opens no section and carries none. */
  rule?: boolean
  /**
   * The number of entries the list under this heading is rendering. Omitted
   * where a count could not agree with the rows beneath it.
   */
  count?: number
  subtitle?: ReactNode
  /** The section's status line, first in the right-hand group. */
  status?: ReactNode
  /** The section's primary action, second in the group and absent while its panel is open. */
  action?: ReactNode
  /** A refusal sentence or a load alert, directly under the heading row. */
  children?: ReactNode
}

/**
 * Every section opens the same way: a heavy rule, the heading with its count,
 * an optional subtitle, and the status line and primary action at the right
 * end. Below 640px the three take their own lines in that order.
 *
 * The heading carries `tabindex="-1"` because focus lands here after a delete
 * removes the row that held it.
 */
export function SectionHeader({
  id,
  title,
  level = 2,
  rule = true,
  count,
  subtitle,
  status,
  action,
  children,
}: Props) {
  const Heading = level === 1 ? 'h1' : 'h2'

  return (
    <div className={rule ? 'section-open' : 'section-open section-open-flush'}>
      <div className="section-heading-row">
        <Heading id={id} tabIndex={-1}>
          {title}
          {count !== undefined && <span className="heading-count"> ({count})</span>}
        </Heading>
        <div className="section-heading-end">
          {status}
          {action}
        </div>
      </div>
      {subtitle && <p className="section-subtitle t-small soft">{subtitle}</p>}
      {children}
    </div>
  )
}
