import { useEffect, useState } from 'react'
import type { SectionDescriptor } from '../sections'

type Props = {
  sections: SectionDescriptor[]
  /** False while the first load is still running, when no heading exists to observe. */
  ready: boolean
}

/**
 * The line the current item is measured against: the offset a click actually
 * scrolls a heading to, read from that heading's own `scroll-margin-top`, plus
 * the single pixel that makes a heading just landed by a click count as
 * reached. Reading the landing offset itself is what keeps the observer and the
 * click on the same line, whatever the stylesheet derives that offset from.
 */
function currentItemLine(heading: HTMLElement): number {
  return Number.parseFloat(getComputedStyle(heading).scrollMarginTop) + 1
}

/**
 * In-page navigation for a column roughly 4200px tall, which is what the detail
 * screen is at 390 with the section a reviewer most wants at the bottom.
 *
 * The current item is the last heading whose top has reached
 * `currentItemLine()`. An `IntersectionObserver` with that top root margin fires
 * exactly when a heading crosses the line, so scrolling the column costs nothing
 * per frame.
 */
export function SectionIndex({ sections, ready }: Props) {
  const [current, setCurrent] = useState(sections[0]?.id ?? '')

  useEffect(() => {
    if (!ready) return
    const headings = sections
      .map((section) => document.getElementById(section.id))
      .filter((heading): heading is HTMLElement => heading !== null)
    if (headings.length === 0) return
    const line = currentItemLine(headings[0])

    function pick() {
      let reached = headings[0].id
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= line) reached = heading.id
      }
      setCurrent(reached)
    }

    pick()
    const observer = new IntersectionObserver(pick, {
      rootMargin: `-${line}px 0px 0px 0px`,
      threshold: [0, 1],
    })
    headings.forEach((heading) => observer.observe(heading))
    return () => observer.disconnect()
  }, [sections, ready])

  return (
    <nav className="section-index" aria-label="Sections">
      <ul>
        {sections.map((section) => (
          <li key={section.id}>
            <button
              type="button"
              className="btn-link"
              aria-current={current === section.id ? 'true' : undefined}
              onClick={() => document.getElementById(section.id)?.scrollIntoView({ block: 'start' })}
            >
              {section.title}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
