import { useEffect, useRef, useState } from 'react'
import { ApiError, signIn } from '../api'
import { Wordmark } from '../components/Wordmark'
import { Field } from '../components/ui/Field'
import { CONNECTION_FAILURE, FormAlert } from '../components/ui/FormAlert'

type Props = {
  onSignedIn: () => void
}

type Failure = {
  message: string
  /** Distinguishes one refusal from the next, so a repeated failure still moves focus. */
  attempt: number
}

export function Login({ onSignedIn }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [failure, setFailure] = useState<Failure | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const emailField = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (failure) emailField.current?.focus()
  }, [failure])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting) return
    setFailure(null)
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
      setFailure((previous) => ({ message, attempt: (previous?.attempt ?? 0) + 1 }))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login">
      <div className={failure ? 'login-block panel-invalid' : 'login-block'}>
        <span className="login-wordmark t-title">
          <Wordmark size={28} />
        </span>
        <p className="t-body soft">Sign in to your ledger.</p>

        <form onSubmit={handleSubmit} noValidate aria-busy={submitting || undefined}>
          <FormAlert message={failure?.message ?? null} />

          <Field id="email" label="Email">
            {(control) => (
              <input
                {...control}
                type="email"
                autoComplete="username"
                required
                disabled={submitting}
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
                disabled={submitting}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            )}
          </Field>

          {/*
            The label never changes and the button stays focusable. What stops a
            second submit is the guard at the top of the handler, which the
            button announces with aria-disabled.
          */}
          <button
            type="submit"
            className="btn-primary login-submit"
            aria-busy={submitting || undefined}
            aria-disabled={submitting || undefined}
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  )
}
