import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, SignedOutError, deleteSubscription, patchSubscription } from './api'

type Call = { path: string; init: RequestInit }

/** Stands in for the one `fetch` every request in this module goes through. */
function stubFetch(response: Response): Call[] {
  const calls: Call[] = []
  vi.stubGlobal('fetch', (path: string, init: RequestInit) => {
    calls.push({ path, init })
    return Promise.resolve(response)
  })
  return calls
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('patchSubscription', () => {
  it('sends the changed settings as the body and returns the updated row', async () => {
    const updated = { id: 'sub_1', name: 'Streaming plan' }
    const calls = stubFetch(json(200, updated))

    await expect(patchSubscription('sub_1', { name: 'Streaming plan' })).resolves.toEqual(updated)

    expect(calls).toHaveLength(1)
    expect(calls[0]?.path).toBe('/api/subscriptions/sub_1')
    expect(calls[0]?.init.method).toBe('PATCH')
    expect(calls[0]?.init.body).toBe('{"name":"Streaming plan"}')
  })

  it('raises the refused field beside the server sentence', async () => {
    stubFetch(json(400, { error: 'currency cannot change while prices are recorded', field: 'currency' }))

    await expect(patchSubscription('sub_1', { currency: 'EUR' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      field: 'currency',
    })
  })
})

describe('deleteSubscription', () => {
  it('sends one DELETE and resolves on the empty 204', async () => {
    const calls = stubFetch(new Response(null, { status: 204 }))

    await expect(deleteSubscription('sub_1')).resolves.toBeUndefined()

    expect(calls).toHaveLength(1)
    expect(calls[0]?.path).toBe('/api/subscriptions/sub_1')
    expect(calls[0]?.init.method).toBe('DELETE')
  })

  it('raises the non-disclosing 404 as an ApiError', async () => {
    stubFetch(json(404, { error: 'not found' }))

    const failure = await deleteSubscription('sub_gone').catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(ApiError)
    expect((failure as ApiError).status).toBe(404)
  })

  it('raises a signed-out session before it reads a body', async () => {
    stubFetch(new Response(null, { status: 401 }))

    await expect(deleteSubscription('sub_1')).rejects.toBeInstanceOf(SignedOutError)
  })
})
