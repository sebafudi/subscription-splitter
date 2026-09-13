import { useEffect, useState } from 'react'
import type { SectionDescriptor } from '../sections'

type Props = {
  sections: SectionDescriptor[]
  /** False while the first load is still running, when no heading exists to observe. */
  ready: boolean
}

type HeadingPosition = { id: string; top: number }

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

function documentScrolledToEnd(): boolean {
  return window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1
}

/**
 * The last heading whose top has reached `line`, except once the document is
 * scrolled to its end, where the last heading is current wherever it sits. That
 * exception is what makes every item reachable when the final section is
 * shorter than the viewport.
 */
export function currentItemId(
  headings: HeadingPosition[],
  line: number,
  scrolledToEnd: boolean,
): string {
  if (headings.length === 0) return ''
  if (scrolledToEnd) return headings[headings.length - 1].id
  let reached = headings[0].id
  for (const heading of headings) {
    if (heading.top <= line) reached = heading.id
  }
  return reached
}

/**
 * In-page navigation for a column roughly 4200px tall, which is what the detail
 * screen is at 390 with the section a reviewer most wants at the bottom.
 *
 * An `IntersectionObserver` with a top root margin at `currentItemLine()` fires
 * exactly when a heading crosses the line; a passive scroll listener carries the
 * end-of-document case, which no heading crossing announces.
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
      const positions = headings.map((heading) => ({
        id: heading.id,
        top: heading.getBoundingClientRect().top,
      }))
      setCurrent(currentItemId(positions, line, documentScrolledToEnd()))
    }

    pick()
    const observer = new IntersectionObserver(pick, {
      rootMargin: `-${line}px 0px 0px 0px`,
      threshold: [0, 1],
    })
    headings.forEach((heading) => observer.observe(heading))
    window.addEventListener('scroll', pick, { passive: true })
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', pick)
    }
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
