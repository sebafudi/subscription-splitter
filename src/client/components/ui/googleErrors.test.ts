import { describe, expect, it } from 'vitest'
import { ApiError, SignedOutError } from '../../api'
import {
  GOOGLE_CONNECTION_FAILURE,
  googleReturnNotice,
  loginUrlWithoutQuery,
  startFailureMessage,
} from './googleErrors'

const DID_NOT_FINISH = 'Google sign-in did not finish. Try again, or sign in with your email.'

describe('googleReturnNotice', () => {
  it('reads a cancelled consent as a status line rather than an alert', () => {
    expect(googleReturnNotice('access_denied')).toEqual({
      tone: 'status',
      message: 'Google sign-in was cancelled. Sign in with your email, or try Google again.',
    })
  })

  it.each(['state_not_found', 'state_invalid', 'state_mismatch'])(
    'gives %s the one expired-link sentence',
    (code) => {
      expect(googleReturnNotice(code)).toEqual({
        tone: 'alert',
        message: 'This sign-in link has expired. Start again from this page.',
      })
    },
  )

  it('refuses a matched password account without confirming it exists', () => {
    expect(googleReturnNotice('account_not_linked')).toEqual({
      tone: 'alert',
      message:
        'This Google account cannot be used here. Sign in with your email and password instead.',
    })
  })

  it('falls back to the did-not-finish sentence for a code it does not know', () => {
    expect(googleReturnNotice('invalid_grant')).toEqual({ tone: 'alert', message: DID_NOT_FINISH })
  })

  it('says nothing on an ordinary visit', () => {
    expect(googleReturnNotice(null)).toBeNull()
    expect(googleReturnNotice(undefined)).toBeNull()
    expect(googleReturnNotice('')).toBeNull()
  })
})

describe('startFailureMessage', () => {
  it('takes the did-not-finish sentence for a response that arrived and refused', () => {
    expect(startFailureMessage(new ApiError(404, 'not found'))).toBe(DID_NOT_FINISH)
    expect(startFailureMessage(new ApiError(500, 'server error'))).toBe(DID_NOT_FINISH)
    expect(startFailureMessage(new SignedOutError())).toBe(DID_NOT_FINISH)
  })

  it('reserves the connection sentence for a request that never reached the server', () => {
    expect(startFailureMessage(new TypeError('Failed to fetch'))).toBe(GOOGLE_CONNECTION_FAILURE)
    expect(startFailureMessage('something else')).toBe(GOOGLE_CONNECTION_FAILURE)
  })

  it('does not reuse the save-path connection sentence', () => {
    expect(GOOGLE_CONNECTION_FAILURE).toBe(
      'Could not reach Google. Check your connection and try again.',
    )
  })
})

describe('loginUrlWithoutQuery', () => {
  it('drops the whole query rather than the error key alone, so Google\'s own description text goes with it', () => {
    expect(loginUrlWithoutQuery('https://example.com/?error=access_denied&described=No%20thanks')).toBe(
      '/',
    )
  })

  it('cleans a return that carries a description with no code beside it', () => {
    expect(loginUrlWithoutQuery('https://example.com/?described=whatever')).toBe('/')
  })

  it('keeps the path and the fragment', () => {
    expect(loginUrlWithoutQuery('https://example.com/app?error=state_mismatch#top')).toBe('/app#top')
  })

  it('leaves a clean url alone so no history entry is written', () => {
    expect(loginUrlWithoutQuery('https://example.com/')).toBeNull()
    expect(loginUrlWithoutQuery('https://example.com/#top')).toBeNull()
  })
})
