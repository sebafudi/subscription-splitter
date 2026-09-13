/**
 * The server's refusal to delete a price names the months that would lose their
 * price and then tells an API caller to repeat the request with a flag. That
 * last sentence is developer-facing and carries nothing the organizer can act
 * on, so it is the one thing dropped; every other word is the server's own.
 *
 * The split depends on the server ending its sentences with a full stop. When
 * that assumption does not hold the filter can leave nothing at all, so an empty
 * result falls back to the untransformed message: the organizer reads the
 * server's own words, instruction included, rather than a bare question.
 */
export function withoutApiInstruction(message: string): string {
  const organizerFacing = message
    .split(/(?<=\.)\s+/)
    .filter((sentence) => !sentence.includes('confirm=true'))
    .join(' ')
    .trim()
  return organizerFacing === '' ? message.trim() : organizerFacing
}
