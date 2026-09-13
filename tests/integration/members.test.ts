import { SELF, env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { signedInCookie as signedInCookieWithPrefix } from './accounts'

/** This file's slice of the rate limiter's client-address space; see `accounts.ts`. */
function signedInCookie(testId: string, email: string): Promise<string> {
  return signedInCookieWithPrefix('10.3.0', testId, email)
}

type ActiveRangeBody = { joinedMonth: string; leftMonth: string | null }
type MemberBody = {
  id: string
  name: string
  isOwner: boolean
  archived: boolean
  activeRanges: ActiveRangeBody[]
}

const planBody = {
  name: 'Family plan',
  currency: 'PLN',
  locale: 'pl-PL',
  time_zone: 'Europe/Warsaw',
  start_month: '2026-01',
}

function jsonHeaders(cookie: string): Record<string, string> {
  return { 'content-type': 'application/json', cookie }
}

function membersUrl(subscriptionId: string, memberId?: string): string {
  const base = `http://example.com/api/subscriptions/${subscriptionId}/members`
  return memberId ? `${base}/${memberId}` : base
}

async function createPlan(cookie: string, overrides: Record<string, unknown> = {}): Promise<{ id: string }> {
  const res = await SELF.fetch('http://example.com/api/subscriptions', {
    method: 'POST',
    headers: jsonHeaders(cookie),
    body: JSON.stringify({ ...planBody, ...overrides }),
  })
  expect(res.status).toBe(201)
  return res.json<{ id: string }>()
}

async function listMembers(cookie: string, subscriptionId: string): Promise<MemberBody[]> {
  const res = await SELF.fetch(membersUrl(subscriptionId), { headers: { cookie } })
  expect(res.status).toBe(200)
  return res.json<MemberBody[]>()
}

function postMember(cookie: string, subscriptionId: string, body: unknown): Promise<Response> {
  return SELF.fetch(membersUrl(subscriptionId), {
    method: 'POST',
    headers: jsonHeaders(cookie),
    body: JSON.stringify(body),
  })
}

function patchMember(cookie: string, subscriptionId: string, memberId: string, body: unknown): Promise<Response> {
  return SELF.fetch(membersUrl(subscriptionId, memberId), {
    method: 'PATCH',
    headers: jsonHeaders(cookie),
    body: JSON.stringify(body),
  })
}

async function createMember(cookie: string, subscriptionId: string, body: unknown): Promise<MemberBody> {
  const res = await postMember(cookie, subscriptionId, body)
  expect(res.status).toBe(201)
  return res.json<MemberBody>()
}

describe('the owner member every subscription is created with', () => {
  it('creates exactly one owner member, named Me by default, whose single open range starts at the first month', async () => {
    const cookie = await signedInCookie('1', 'members-owner-default@example.com')
    const plan = await createPlan(cookie)

    const members = await listMembers(cookie, plan.id)
    expect(members).toHaveLength(1)
    expect(members[0].isOwner).toBe(true)
    expect(members[0].name).toBe('Me')
    expect(members[0].archived).toBe(false)
    expect(members[0].activeRanges).toEqual([{ joinedMonth: '2026-01', leftMonth: null }])
  })

  it('names the owner member from owner_name when the create body carries one', async () => {
    const cookie = await signedInCookie('2', 'members-owner-named@example.com')
    const plan = await createPlan(cookie, { owner_name: 'Organizer' })

    const members = await listMembers(cookie, plan.id)
    expect(members).toHaveLength(1)
    expect(members[0].name).toBe('Organizer')
  })

  it('carries the owner opening range along when a subscription PATCH moves the first month', async () => {
    const cookie = await signedInCookie('3', 'members-start-month-shift@example.com')
    const plan = await createPlan(cookie)

    const patchRes = await SELF.fetch(`http://example.com/api/subscriptions/${plan.id}`, {
      method: 'PATCH',
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ start_month: '2026-05' }),
    })
    expect(patchRes.status).toBe(200)

    const getRes = await SELF.fetch(`http://example.com/api/subscriptions/${plan.id}`, { headers: { cookie } })
    const stored = await getRes.json<{ startMonth: string }>()
    expect(stored.startMonth).toBe('2026-05')

    const members = await listMembers(cookie, plan.id)
    expect(members[0].activeRanges).toEqual([{ joinedMonth: '2026-05', leftMonth: null }])
  })

  it('refuses a second owner with 409 and leaves the existing owner in place', async () => {
    const cookie = await signedInCookie('4', 'members-second-owner@example.com')
    const plan = await createPlan(cookie)

    const res = await postMember(cookie, plan.id, {
      name: 'Pretender',
      is_owner: true,
      active_ranges: [{ joined_month: '2026-02' }],
    })
    expect(res.status).toBe(409)

    const members = await listMembers(cookie, plan.id)
    expect(members.filter((member) => member.isOwner)).toHaveLength(1)
    expect(members.find((member) => member.isOwner)?.name).toBe('Me')
  })

  it('refuses deleting the owner with 409, deletes an ordinary member with 204 and 404s the following read', async () => {
    const cookie = await signedInCookie('5', 'members-delete-owner@example.com')
    const plan = await createPlan(cookie)
    const owner = (await listMembers(cookie, plan.id))[0]

    const deleteOwnerRes = await SELF.fetch(membersUrl(plan.id, owner.id), {
      method: 'DELETE',
      headers: { cookie },
    })
    expect(deleteOwnerRes.status).toBe(409)
    expect(await listMembers(cookie, plan.id)).toHaveLength(1)

    const member = await createMember(cookie, plan.id, {
      name: 'Ada',
      active_ranges: [{ joined_month: '2026-01' }],
    })

    const deleteRes = await SELF.fetch(membersUrl(plan.id, member.id), { method: 'DELETE', headers: { cookie } })
    expect(deleteRes.status).toBe(204)

    const afterRes = await SELF.fetch(membersUrl(plan.id, member.id), { headers: { cookie } })
    expect(afterRes.status).toBe(404)
  })
})

describe('member ownership, across accounts and across one account\'s own subscriptions', () => {
  it('lists a member for the account that created it and hides it from another account on every verb', async () => {
    const cookieA = await signedInCookie('6', 'members-owner-a@example.com')
    const cookieB = await signedInCookie('7', 'members-owner-b@example.com')

    const planA = await createPlan(cookieA)
    await createPlan(cookieB)
    const member = await createMember(cookieA, planA.id, {
      name: 'Ada',
      active_ranges: [{ joined_month: '2026-01' }],
    })

    const listedForA = await listMembers(cookieA, planA.id)
    expect(listedForA.map((row) => row.id)).toContain(member.id)

    const listForB = await SELF.fetch(membersUrl(planA.id), { headers: { cookie: cookieB } })
    expect(listForB.status).toBe(404)

    const postForB = await postMember(cookieB, planA.id, {
      name: 'Intruder',
      active_ranges: [{ joined_month: '2026-01' }],
    })
    expect(postForB.status).toBe(404)

    const getForB = await SELF.fetch(membersUrl(planA.id, member.id), { headers: { cookie: cookieB } })
    expect(getForB.status).toBe(404)

    const patchForB = await patchMember(cookieB, planA.id, member.id, { name: 'Hijacked' })
    expect(patchForB.status).toBe(404)

    const deleteForB = await SELF.fetch(membersUrl(planA.id, member.id), {
      method: 'DELETE',
      headers: { cookie: cookieB },
    })
    expect(deleteForB.status).toBe(404)
  })

  it('refuses a member named through the caller\'s own other subscription on GET, PATCH and DELETE', async () => {
    const cookie = await signedInCookie('8', 'members-wrong-parent@example.com')
    const first = await createPlan(cookie)
    const second = await createPlan(cookie, { name: 'Second plan' })

    const member = await createMember(cookie, first.id, {
      name: 'Ada',
      active_ranges: [{ joined_month: '2026-01' }],
    })

    const getRes = await SELF.fetch(membersUrl(second.id, member.id), { headers: { cookie } })
    expect(getRes.status).toBe(404)

    const patchRes = await patchMember(cookie, second.id, member.id, { name: 'Moved' })
    expect(patchRes.status).toBe(404)

    const deleteRes = await SELF.fetch(membersUrl(second.id, member.id), { method: 'DELETE', headers: { cookie } })
    expect(deleteRes.status).toBe(404)

    const stillThere = await SELF.fetch(membersUrl(first.id, member.id), { headers: { cookie } })
    expect(stillThere.status).toBe(200)
    expect((await stillThere.json<MemberBody>()).name).toBe('Ada')
  })

  // Both routers are mounted at '/' and both register requireSession for
  // '/api/subscriptions/*', so these four would answer 401 even if the members
  // module had forgotten its own registration. They pin the contract callers
  // see; that the module does not lean on a pattern another router owns is
  // proven separately, per router, in `router-isolation.test.ts`.
  it('returns 401 from every member route without a session cookie', async () => {
    const listRes = await SELF.fetch(membersUrl('any-subscription'))
    expect(listRes.status).toBe(401)

    const createRes = await SELF.fetch(membersUrl('any-subscription'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Ada', active_ranges: [{ joined_month: '2026-01' }] }),
    })
    expect(createRes.status).toBe(401)

    const getRes = await SELF.fetch(membersUrl('any-subscription', 'any-member'))
    expect(getRes.status).toBe(401)

    const patchRes = await SELF.fetch(membersUrl('any-subscription', 'any-member'), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Ada' }),
    })
    expect(patchRes.status).toBe(401)

    const deleteRes = await SELF.fetch(membersUrl('any-subscription', 'any-member'), { method: 'DELETE' })
    expect(deleteRes.status).toBe(401)
  })
})

describe('member persistence and range replacement', () => {
  it('returns both ranges of a two-range member on a later, separate request', async () => {
    const cookie = await signedInCookie('9', 'members-persist@example.com')
    const plan = await createPlan(cookie)

    const created = await createMember(cookie, plan.id, {
      name: 'Ada',
      active_ranges: [
        { joined_month: '2026-01', left_month: '2026-03' },
        { joined_month: '2026-06', left_month: null },
      ],
    })

    const getRes = await SELF.fetch(membersUrl(plan.id, created.id), { headers: { cookie } })
    expect(getRes.status).toBe(200)
    const fetched = await getRes.json<MemberBody>()
    expect(fetched.activeRanges).toEqual([
      { joinedMonth: '2026-01', leftMonth: '2026-03' },
      { joinedMonth: '2026-06', leftMonth: null },
    ])
  })

  it('replaces the whole range set on PATCH, leaving no row from the previous edit', async () => {
    const cookie = await signedInCookie('10', 'members-replace-ranges@example.com')
    const plan = await createPlan(cookie)

    const created = await createMember(cookie, plan.id, {
      name: 'Ada',
      active_ranges: [
        { joined_month: '2026-01', left_month: '2026-03' },
        { joined_month: '2026-06', left_month: null },
      ],
    })

    const patchRes = await patchMember(cookie, plan.id, created.id, {
      archived: true,
      active_ranges: [{ joined_month: '2026-02', left_month: '2026-02' }],
    })
    expect(patchRes.status).toBe(200)
    const patched = await patchRes.json<MemberBody>()
    expect(patched.archived).toBe(true)
    expect(patched.activeRanges).toEqual([{ joinedMonth: '2026-02', leftMonth: '2026-02' }])

    const storedRanges = await env.DB.prepare(
      'select joined_month, left_month from active_ranges where member_id = ? order by joined_month asc',
    )
      .bind(created.id)
      .all<{ joined_month: string; left_month: string | null }>()
    expect(storedRanges.results).toEqual([{ joined_month: '2026-02', left_month: '2026-02' }])
  })
})

describe('member validation through the route', () => {
  it('returns 400 naming the field at fault for every shape and range violation', async () => {
    const cookie = await signedInCookie('11', 'members-invalid@example.com')
    const plan = await createPlan(cookie)

    const cases: Array<{ label: string; body: unknown; names: string }> = [
      {
        label: 'a month outside the YYYY-MM range',
        body: { name: 'Ada', active_ranges: [{ joined_month: '2026-13' }] },
        names: 'joined_month',
      },
      {
        label: 'a name that is empty after trimming',
        body: { name: '   ', active_ranges: [{ joined_month: '2026-01' }] },
        names: 'name',
      },
      {
        label: 'an empty range array',
        body: { name: 'Ada', active_ranges: [] },
        names: 'active_ranges',
      },
      {
        label: 'a range that ends before it starts',
        body: { name: 'Ada', active_ranges: [{ joined_month: '2026-05', left_month: '2026-02' }] },
        names: 'active_ranges',
      },
      {
        label: 'two ranges that overlap',
        body: {
          name: 'Ada',
          active_ranges: [
            { joined_month: '2026-01', left_month: '2026-06' },
            { joined_month: '2026-06', left_month: null },
          ],
        },
        names: 'active_ranges',
      },
      {
        label: 'a range beginning before the subscription start month',
        body: { name: 'Ada', active_ranges: [{ joined_month: '2025-12' }] },
        names: 'active_ranges',
      },
      {
        label: 'an unknown key',
        body: { name: 'Ada', active_ranges: [{ joined_month: '2026-01' }], nope: true },
        names: 'nope',
      },
    ]

    for (const testCase of cases) {
      const res = await postMember(cookie, plan.id, testCase.body)
      expect(res.status, testCase.label).toBe(400)
      const error = await res.json<{ error: string; field?: string }>()
      expect(`${error.field ?? ''} ${error.error}`, testCase.label).toContain(testCase.names)
    }
  })

  it('refuses an empty PATCH body with 400', async () => {
    const cookie = await signedInCookie('12', 'members-empty-patch@example.com')
    const plan = await createPlan(cookie)
    const member = await createMember(cookie, plan.id, {
      name: 'Ada',
      active_ranges: [{ joined_month: '2026-01' }],
    })

    const res = await patchMember(cookie, plan.id, member.id, {})
    expect(res.status).toBe(400)
  })
})
