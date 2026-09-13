import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'

type Props = {
  /** Matches the opening button's `aria-controls`. */
  id: string
  open: boolean
  /** Repeats the action, for example "Add a participant" or "Edit payment". */
  title: string
  /** Cancel and Escape both run this: it closes the panel and returns focus to the opening button. */
  onCancel: () => void
  /** Set while the panel's alert has text, which gives the panel its red left rule. */
  invalid?: boolean
  children: ReactNode
}

/**
 * Every form on every screen opens here. Open and close animate
 * `grid-template-rows` from `0fr` to `1fr`, which the reduced-motion block
 * collapses to instant.
 *
 * Field values are the caller's to discard: remount the panel's contents with a
 * `key` when it closes, which is what Cancel promises.
 *
 * Escape is handled normally. A native select consumes the key itself while its
 * list is open and the browser exposes no way to observe that popup, so there is
 * no special case for it.
 */
export function DisclosurePanel({ id, open, title, onCancel, invalid = false, children }: Props) {
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const first = panel.current?.querySelector<HTMLElement>(
      'input:not([type="hidden"]), select, textarea, button',
    )
    first?.focus()
  }, [open])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape') return
    event.stopPropagation()
    onCancel()
  }

  return (
    <div className="disclosure" data-open={open}>
      <div className="disclosure-inner" inert={!open}>
        <div
          className={invalid ? 'panel panel-invalid' : 'panel'}
          id={id}
          ref={panel}
          onKeyDown={handleKeyDown}
        >
          <h3>{title}</h3>
          {children}
        </div>
      </div>
    </div>
  )
}
