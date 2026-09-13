import type { Member, MonthStr, Payment, PriceEntry, RecurringSchedule, Summary } from '../domain/types'

export type SessionUser = { id: string; email: string; name: string }

export type Subscription = {
  id: string
  userId: string
  name: string
  currency: string
  locale: string
  timeZone: string
  startMonth: string
  createdAt: string
}

export type CreateSubscriptionInput = {
  name: string
  currency: string
  locale: string
  time_zone: string
  start_month: string
  /** Names the owner member created with the subscription; the server defaults it to `Me`. */
  owner_name?: string
}

export class SignedOutError extends Error {
  constructor() {
    super('signed out')
    this.name = 'SignedOutError'
  }
}

export class ApiError extends Error {
  status: number
  field?: string
  /** Present on the 409 refusing a price delete: the months that would lose their price. */
  months?: string[]

  constructor(status: number, message: string, field?: string, months?: string[]) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.field = field
    this.months = months
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string> | undefined) }
  if (init?.body) headers['content-type'] = 'application/json'

  const res = await fetch(path, { ...init, headers, credentials: 'include' })

  if (res.status === 401) {
    throw new SignedOutError()
  }

  const body = await res.json().catch(() => null)

  if (!res.ok) {
    const message =
      res.status === 429
        ? 'Too many attempts. Wait a moment before trying again.'
        : (body && typeof body === 'object' && typeof (body as { message?: unknown }).message === 'string'
            ? (body as { message: string }).message
            : body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string'
              ? (body as { error: string }).error
              : `request failed with status ${res.status}`)
    const field = body && typeof body === 'object' && typeof (body as { field?: unknown }).field === 'string' ? (body as { field: string }).field : undefined
    const months =
      body && typeof body === 'object' && Array.isArray((body as { months?: unknown }).months)
        ? ((body as { months: string[] }).months)
        : undefined
    throw new ApiError(res.status, message, field, months)
  }

  return body as T
}

/** Returns the signed-in user, or null when there is no session. Never throws for the signed-out case. */
export async function getMe(): Promise<SessionUser | null> {
  try {
    const body = await request<{ user: SessionUser }>('/api/me')
    return body.user
  } catch (error) {
    if (error instanceof SignedOutError) return null
    throw error
  }
}

/** Uses the library's own mounted endpoint directly, so throttling, origin checking and CSRF apply by construction. */
export async function signIn(email: string, password: string): Promise<void> {
  await request('/api/auth/sign-in/email', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }).catch((error) => {
    // A failed sign-in has no session yet, so 401 here is a real credential
    // failure, not a signed-out redirect.
    if (error instanceof SignedOutError) {
      throw new ApiError(401, 'Incorrect email or password.')
    }
    throw error
  })
}

/**
 * Whether this deployment carries Google credentials. A failed read is treated as
 * not configured, so the login screen still paints rather than being thrown away.
 */
export async function getAuthConfig(): Promise<{ google: boolean }> {
  try {
    return await request<{ google: boolean }>('/api/auth-config')
  } catch {
    return { google: false }
  }
}

/**
 * Answers 200 with the authorize url as JSON while also setting a `Location`
 * header, so the caller navigates itself. `errorCallbackURL` is what makes a
 * failure two hops later land on this app's login screen rather than on the
 * library's own error page, so it goes on every call.
 */
export async function startGoogleSignIn(): Promise<{ url: string }> {
  const appRoot = `${window.location.origin}/`
  return request<{ url: string }>('/api/auth/sign-in/social', {
    method: 'POST',
    body: JSON.stringify({ provider: 'google', callbackURL: appRoot, errorCallbackURL: appRoot }),
  })
}

export async function signOut(): Promise<void> {
  // A body-less POST still carries a (possibly empty) body stream once it
  // reaches the router, which then requires a JSON content-type; sending an
  // explicit empty object avoids a spurious 415 from the mounted handler.
  await request('/api/auth/sign-out', { method: 'POST', body: JSON.stringify({}) }).catch((error) => {
    if (error instanceof SignedOutError) return
    throw error
  })
}

export async function listSubscriptions(): Promise<Subscription[]> {
  return request<Subscription[]>('/api/subscriptions')
}

export async function createSubscription(input: CreateSubscriptionInput): Promise<Subscription> {
  return request<Subscription>('/api/subscriptions', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/** The five editable settings, each optional; the route refuses an empty body. */
export type PatchSubscriptionInput = Partial<{
  name: string
  currency: string
  locale: string
  time_zone: string
  start_month: string
}>

export async function patchSubscription(
  subscriptionId: string,
  patch: PatchSubscriptionInput,
): Promise<Subscription> {
  return request<Subscription>(`/api/subscriptions/${subscriptionId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

/** Removes the subscription and everything reachable from it; answers 204, so nothing comes back. */
export async function deleteSubscription(subscriptionId: string): Promise<void> {
  await request<null>(`/api/subscriptions/${subscriptionId}`, { method: 'DELETE' })
}

/**
 * The member, price and summary shapes are the domain's own, re-exported here
 * so the screens have one import for everything the API returns and so the
 * client cannot drift from what the server computes.
 */
export type {
  ActiveRange,
  Member,
  MemberSummary,
  MonthStr,
  Payment,
  PriceEntry,
  RecurringSchedule,
  SubscriptionSettings,
  Summary,
} from '../domain/types'

/** Request keys stay snake_case, matching the validation schemas. */
export type ActiveRangeInput = { joined_month: string; left_month: string | null }
export type CreateMemberInput = { name: string; active_ranges: ActiveRangeInput[] }
export type PatchMemberInput = { name?: string; active_ranges?: ActiveRangeInput[]; archived?: boolean }

function membersPath(subscriptionId: string, memberId?: string): string {
  const base = `/api/subscriptions/${subscriptionId}/members`
  return memberId ? `${base}/${memberId}` : base
}

export async function listMembers(subscriptionId: string): Promise<Member[]> {
  return request<Member[]>(membersPath(subscriptionId))
}

export async function createMember(subscriptionId: string, input: CreateMemberInput): Promise<Member> {
  return request<Member>(membersPath(subscriptionId), { method: 'POST', body: JSON.stringify(input) })
}

export async function updateMember(
  subscriptionId: string,
  memberId: string,
  patch: PatchMemberInput,
): Promise<Member> {
  return request<Member>(membersPath(subscriptionId, memberId), { method: 'PATCH', body: JSON.stringify(patch) })
}

export async function deleteMember(subscriptionId: string, memberId: string): Promise<void> {
  await request<null>(membersPath(subscriptionId, memberId), { method: 'DELETE' })
}

export async function listPrices(subscriptionId: string): Promise<PriceEntry[]> {
  return request<PriceEntry[]>(`/api/subscriptions/${subscriptionId}/prices`)
}

export async function createPrice(
  subscriptionId: string,
  effectiveFrom: string,
  amountMinor: number,
): Promise<PriceEntry> {
  return request<PriceEntry>(`/api/subscriptions/${subscriptionId}/prices`, {
    method: 'POST',
    body: JSON.stringify({ effective_from: effectiveFrom, amount: amountMinor }),
  })
}

/** Without `confirm`, deleting the earliest entry is refused with a 409 naming the months it would unprice. */
export async function deletePrice(subscriptionId: string, priceId: string, confirm = false): Promise<void> {
  const query = confirm ? '?confirm=true' : ''
  await request<null>(`/api/subscriptions/${subscriptionId}/prices/${priceId}${query}`, { method: 'DELETE' })
}

export async function listBreakMonths(subscriptionId: string): Promise<MonthStr[]> {
  return request<MonthStr[]>(`/api/subscriptions/${subscriptionId}/break-months`)
}

export async function createBreakMonth(subscriptionId: string, month: string): Promise<void> {
  await request<{ month: string }>(`/api/subscriptions/${subscriptionId}/break-months`, {
    method: 'POST',
    body: JSON.stringify({ month }),
  })
}

export async function deleteBreakMonth(subscriptionId: string, month: string): Promise<void> {
  await request<null>(`/api/subscriptions/${subscriptionId}/break-months/${month}`, { method: 'DELETE' })
}

export async function getSummary(subscriptionId: string): Promise<Summary> {
  return request<Summary>(`/api/subscriptions/${subscriptionId}/summary`)
}

/**
 * What the schedules route returns: the arrangement plus the months marked as
 * not received, so the standing-order section draws its toggles from one read.
 */
export type Schedule = RecurringSchedule & { exceptionMonths: MonthStr[] }

export type PaymentKind = 'manual' | 'annual'

export type CreatePaymentInput = {
  member_id: string
  date: string
  amount: number
  note?: string
  kind?: PaymentKind
}

export type PatchPaymentInput = Partial<CreatePaymentInput>

function paymentsPath(subscriptionId: string, paymentId?: string): string {
  const base = `/api/subscriptions/${subscriptionId}/payments`
  return paymentId ? `${base}/${paymentId}` : base
}

/** `memberId` is resolved through the subscription on the server, so a foreign one is a 404 rather than an empty list. */
export async function listPayments(subscriptionId: string, memberId?: string): Promise<Payment[]> {
  const query = memberId ? `?memberId=${encodeURIComponent(memberId)}` : ''
  return request<Payment[]>(`${paymentsPath(subscriptionId)}${query}`)
}

export async function createPayment(subscriptionId: string, input: CreatePaymentInput): Promise<Payment> {
  return request<Payment>(paymentsPath(subscriptionId), { method: 'POST', body: JSON.stringify(input) })
}

export async function updatePayment(
  subscriptionId: string,
  paymentId: string,
  patch: PatchPaymentInput,
): Promise<Payment> {
  return request<Payment>(paymentsPath(subscriptionId, paymentId), { method: 'PATCH', body: JSON.stringify(patch) })
}

export async function deletePayment(subscriptionId: string, paymentId: string): Promise<void> {
  await request<null>(paymentsPath(subscriptionId, paymentId), { method: 'DELETE' })
}

export type CreateScheduleInput = {
  member_id: string
  amount: number
  start_month: string
  end_month: string | null
}

export type PatchScheduleInput = Partial<CreateScheduleInput>

function schedulesPath(subscriptionId: string, scheduleId?: string): string {
  const base = `/api/subscriptions/${subscriptionId}/schedules`
  return scheduleId ? `${base}/${scheduleId}` : base
}

export async function listSchedules(subscriptionId: string): Promise<Schedule[]> {
  return request<Schedule[]>(schedulesPath(subscriptionId))
}

export async function createSchedule(subscriptionId: string, input: CreateScheduleInput): Promise<Schedule> {
  return request<Schedule>(schedulesPath(subscriptionId), { method: 'POST', body: JSON.stringify(input) })
}

export async function updateSchedule(
  subscriptionId: string,
  scheduleId: string,
  patch: PatchScheduleInput,
): Promise<Schedule> {
  return request<Schedule>(schedulesPath(subscriptionId, scheduleId), { method: 'PATCH', body: JSON.stringify(patch) })
}

export async function deleteSchedule(subscriptionId: string, scheduleId: string): Promise<void> {
  await request<null>(schedulesPath(subscriptionId, scheduleId), { method: 'DELETE' })
}

function exceptionPath(subscriptionId: string, scheduleId: string, month: string): string {
  return `${schedulesPath(subscriptionId, scheduleId)}/exceptions/${month}`
}

/** Both ends of one toggle; each answers 204 whichever state it leaves the month in. */
export async function markMonthNotReceived(
  subscriptionId: string,
  scheduleId: string,
  month: string,
): Promise<void> {
  await request<null>(exceptionPath(subscriptionId, scheduleId, month), { method: 'PUT' })
}

export async function clearMonthNotReceived(
  subscriptionId: string,
  scheduleId: string,
  month: string,
): Promise<void> {
  await request<null>(exceptionPath(subscriptionId, scheduleId, month), { method: 'DELETE' })
}
