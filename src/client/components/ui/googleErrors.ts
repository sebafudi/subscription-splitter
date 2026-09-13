/**
 * The return leg from Google and the failure of the call that starts it, as pure
 * functions with no React in them. The four outcome sentences and the connection
 * sentence are fixed by `context/changes/google-sign-in/design-delta.md`.
 */

import { ApiError, SignedOutError } from '../../api'

export type GoogleNoticeTone = 'status' | 'alert'

export type GoogleNotice = {
  tone: GoogleNoticeTone
  message: string
}

/**
 * Deliberately not `CONNECTION_FAILURE` from `FormAlert`, whose sentence is about
 * saving rather than about reaching Google.
 */
export const GOOGLE_CONNECTION_FAILURE = 'Could not reach Google. Check your connection and try again.'

const CANCELLED = 'Google sign-in was cancelled. Sign in with your email, or try Google again.'
const EXPIRED_LINK = 'This sign-in link has expired. Start again from this page.'
const NOT_LINKED = 'This Google account cannot be used here. Sign in with your email and password instead.'
const DID_NOT_FINISH = 'Google sign-in did not finish. Try again, or sign in with your email.'

const STATE_CODES = ['state_not_found', 'state_invalid', 'state_mismatch']

/**
 * Maps the `error` code the callback leaves on the login route to one sentence and
 * its tone. Null when the route carries no code, which is every ordinary visit.
 */
export function googleReturnNotice(code: string | null | undefined): GoogleNotice | null {
  if (!code) return null
  if (code === 'access_denied') return { tone: 'status', message: CANCELLED }
  if (STATE_CODES.includes(code)) return { tone: 'alert', message: EXPIRED_LINK }
  if (code === 'account_not_linked') return { tone: 'alert', message: NOT_LINKED }
  return { tone: 'alert', message: DID_NOT_FINISH }
}

/**
 * A response that arrived and refused takes the did-not-finish sentence; only a
 * request that never reached the server takes the connection sentence.
 */
export function startFailureMessage(error: unknown): string {
  const answered = error instanceof ApiError || error instanceof SignedOutError
  return answered ? DID_NOT_FINISH : GOOGLE_CONNECTION_FAILURE
}

/**
 * The whole query goes rather than one key, because the callback also writes
 * Google's own description text beside the code. Null when there is nothing to
 * remove.
 */
export function loginUrlWithoutQuery(href: string): string | null {
  const url = new URL(href)
  if (url.search === '') return null
  url.search = ''
  return `${url.pathname}${url.hash}`
}
