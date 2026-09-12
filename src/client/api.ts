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

  constructor(status: number, message: string, field?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.field = field
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
    throw new ApiError(res.status, message, field)
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
