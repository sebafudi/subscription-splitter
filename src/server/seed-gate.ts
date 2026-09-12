/**
 * Pure gate check for the seed route (decision D-005): the route is
 * registered unconditionally, so both the flag and the token are checked
 * inside the handler, and both failures answer 404 identically. Extracted so
 * the "flag off" branch has a unit test: the integration test pool fixes one
 * set of environment bindings for the whole run, so SEED_ENABLED cannot be
 * varied per test at that layer.
 */
export function isSeedRequestAllowed(
  seedEnabled: string | undefined,
  expectedToken: string,
  providedToken: string | null,
): boolean {
  if (seedEnabled !== 'true') return false
  return timingSafeEqual(providedToken ?? '', expectedToken)
}

function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder()
  const bytesA = encoder.encode(a)
  const bytesB = encoder.encode(b)
  if (bytesA.length !== bytesB.length) return false
  let mismatch = 0
  for (let i = 0; i < bytesA.length; i += 1) {
    mismatch |= bytesA[i] ^ bytesB[i]
  }
  return mismatch === 0
}
