import { SELF, env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'

describe('worker on local D1', () => {
  it('answers the health check', async () => {
    const response = await SELF.fetch('http://example.com/api/health')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
  })

  it('has the D1 binding available with migrations applied', async () => {
    const result = await env.DB.prepare('select 1 as one').first<{ one: number }>()
    expect(result?.one).toBe(1)
  })
})
