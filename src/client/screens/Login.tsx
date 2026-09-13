import { useEffect, useRef, useState } from 'react'
import { ApiError, signIn, startGoogleSignIn } from '../api'
import { GoogleMark } from '../components/GoogleMark'
import { Wordmark } from '../components/Wordmark'
import { Field } from '../components/ui/Field'
import { CONNECTION_FAILURE, FormAlert } from '../components/ui/FormAlert'
import {
  googleReturnNotice,
  loginUrlWithoutQuery,
  startFailureMessage,
  type GoogleNoticeTone,
} from '../components/ui/googleErrors'

type Props = {
  onSignedIn: () => void
  googleEnabled: boolean
}

type Notice = {
  tone: GoogleNoticeTone
  message: string
  /** A password refusal lands on the email field; a Google outcome on the message itself. */
  focusTarget: 'email' | 'message'
  /** Distinguishes one refusal from the next, so a repeated failure still moves focus. */
  attempt: number
}

export function Login({ onSignedIn, googleEnabled }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [notice, setNotice] = useState<Notice | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [startingGoogle, setStartingGoogle] = useState(false)
  const [returnRead, setReturnRead] = useState(false)
  const emailField = useRef<HTMLInputElement>(null)
  const alertLine = useRef<HTMLParagraphElement>(null)
  const statusLine = useRef<HTMLParagraphElement>(null)

  const busy = submitting || startingGoogle

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('error')
    const outcome = googleReturnNotice(code)
    if (outcome) setNotice({ ...outcome, focusTarget: 'message', attempt: 1 })
    setReturnRead(true)
  }, [])

  // Runs in the commit after the one that paints the message, so the code is read
  // before the query it came from is dropped.
  useEffect(() => {
    if (!returnRead) return
    const cleaned = loginUrlWithoutQuery(window.location.href)
    if (cleaned) window.history.replaceState(null, '', cleaned)
  }, [returnRead])

  useEffect(() => {
    if (!notice) return
    if (notice.focusTarget === 'email') emailField.current?.focus()
    else (notice.tone === 'status' ? statusLine : alertLine).current?.focus()
  }, [notice])

  function refuse(message: string, tone: GoogleNoticeTone, focusTarget: Notice['focusTarget']) {
    setNotice((previous) => ({ tone, message, focusTarget, attempt: (previous?.attempt ?? 0) + 1 }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    setNotice(null)
    setSubmitting(true)
    try {
      await signIn(email, password)
      onSignedIn()
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.status === 401
            ? 'Email or password is not right. Try again.'
            : error.message
          : CONNECTION_FAILURE
      refuse(message, 'alert', 'email')
    } finally {
      setSubmitting(false)
    }
  }

  // Stays busy on success: the browser is leaving, and re-enabling would flash the
  // form back to life under the navigation.
  async function handleGoogle() {
    if (busy) return
    setNotice(null)
    setStartingGoogle(true)
    try {
      const { url } = await startGoogleSignIn()
      window.location.assign(url)
    } catch (error) {
      setStartingGoogle(false)
      refuse(startFailureMessage(error), 'alert', 'message')
    }
  }

  return (
    <main className="login">
      <div className={notice?.tone === 'alert' ? 'login-block panel-invalid' : 'login-block'}>
        <span className="login-wordmark t-title">
          <Wordmark size={28} />
        </span>
        <p className="t-body soft">Sign in to your ledger.</p>

        <form onSubmit={handleSubmit} noValidate aria-busy={busy || undefined}>
          <FormAlert message={notice?.tone === 'alert' ? notice.message : null} ref={alertLine} />

          {/*
            A cancelled sign-in is not a failure, so it gets its own live region in
            the same position rather than the red rule of 3.8. Both regions stay in
            the tree, because one inserted as it gains text announces unreliably.
          */}
          <div role="status" className="alert-region">
            {notice?.tone === 'status' && (
              <p className="login-status t-body" tabIndex={-1} ref={statusLine}>
                {notice.message}
              </p>
            )}
          </div>

          <Field id="email" label="Email">
            {(control) => (
              <input
                {...control}
                type="email"
                autoComplete="username"
                required
                disabled={busy}
                ref={emailField}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            )}
          </Field>

          <Field id="password" label="Password">
            {(control) => (
              <input
                {...control}
                type="password"
                autoComplete="current-password"
                required
                disabled={busy}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            )}
          </Field>

          {/*
            The labels never change and both buttons stay focusable. What stops a
            second press is the guard at the top of each handler, which the buttons
            announce with aria-disabled.
          */}
          <div className="login-actions">
            <button
              type="submit"
              className="btn-primary login-submit"
              aria-busy={submitting || undefined}
              aria-disabled={busy || undefined}
            >
              Sign in
            </button>

            {googleEnabled && (
              <button
                type="button"
                className="btn-quiet login-google"
                onClick={handleGoogle}
                aria-busy={startingGoogle || undefined}
                aria-disabled={busy || undefined}
              >
                <GoogleMark />
                Continue with Google
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  )
}
