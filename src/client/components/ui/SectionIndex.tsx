import { useEffect, useState } from 'react'
import type { SectionDescriptor } from '../sections'

type Props = {
  sections: SectionDescriptor[]
  /** False while the first load is still running, when no heading exists to observe. */
  ready: boolean
}

/**
 * The height the app bar and this index hold between them, read from the two
 * custom properties the stylesheet derives every other offset from, so the
 * observer's root margin and the headings' `scroll-margin-top` cannot drift.
 */
function stickyStack(): number {
  const root = getComputedStyle(document.documentElement)
  return (
    Number.parseFloat(root.getPropertyValue('--bar-height')) +
    Number.parseFloat(root.getPropertyValue('--index-height'))
  )
}

/**
 * In-page navigation for a column roughly 4200px tall, which is what the detail
 * screen is at 390 with the section a reviewer most wants at the bottom.
 *
 * The current item is the last heading that has reached the visible top, which
 * sits `stickyStack()` below the viewport's own top. An `IntersectionObserver`
 * with that top root margin fires exactly when a heading crosses the line, so
 * scrolling the column costs nothing per frame.
 */
export function SectionIndex({ sections, ready }: Props) {
  const [current, setCurrent] = useState(sections[0]?.id ?? '')

  useEffect(() => {
    if (!ready) return
    const stack = stickyStack()
    const headings = sections
      .map((section) => document.getElementById(section.id))
      .filter((heading): heading is HTMLElement => heading !== null)
    if (headings.length === 0) return

    function pick() {
      let reached = headings[0].id
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= stack + 1) reached = heading.id
      }
      setCurrent(reached)
    }

    pick()
    const observer = new IntersectionObserver(pick, {
      rootMargin: `-${stack}px 0px 0px 0px`,
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
