/**
 * One display map per form, from the wire field name to the label the user
 * reads. A wire name with no entry never reaches the screen: the form shows it
 * as the generic error line instead.
 */

export type FieldLabels = Record<string, string>

export const subscriptionFieldLabels: FieldLabels = {
  name: 'Name',
  currency: 'Currency',
  locale: 'Locale',
  time_zone: 'Time zone',
  start_month: 'First month',
  owner_name: 'Your name on this plan',
}

export const participantFieldLabels: FieldLabels = {
  name: 'Name',
  active_ranges: 'Active months',
  joined_month: 'From',
  left_month: 'To',
  archived: 'Archived',
}

export const priceFieldLabels: FieldLabels = {
  effective_from: 'Effective from',
  amount: 'Amount per month',
}

export const breakMonthFieldLabels: FieldLabels = {
  month: 'Month',
}

export const paymentFieldLabels: FieldLabels = {
  member_id: 'From',
  date: 'Date received',
  amount: 'Amount',
  kind: 'Kind',
  note: 'Note',
}

export const scheduleFieldLabels: FieldLabels = {
  member_id: 'From',
  amount: 'Amount each month',
  start_month: 'First month',
  end_month: 'Last month',
}

/**
 * Resolves a wire name against a form's map. A nested path such as
 * `active_ranges.0.joined_month` falls back to its last segment, which is the
 * field the user actually sees. Returns undefined when the form has no label
 * for the name, which is the signal to show the generic error instead.
 */
export function labelFor(labels: FieldLabels, wireName: string): string | undefined {
  if (labels[wireName]) return labels[wireName]
  const lastSegment = wireName.split('.').pop()
  return lastSegment ? labels[lastSegment] : undefined
}

/**
 * The one transform allowed on a server field message. The server owns the
 * sentence and its rules open with the wire name, so when the message starts
 * with that name the leading token becomes the field's label and the rest is
 * untouched. Anything else is shown exactly as the server wrote it: no per-rule
 * copy lives in the client.
 */
export function messageWithLabel(labels: FieldLabels, wireName: string, message: string): string {
  const label = labelFor(labels, wireName)
  if (!label) return message
  const lastSegment = wireName.split('.').pop()
  for (const token of lastSegment && lastSegment !== wireName ? [wireName, lastSegment] : [wireName]) {
    if (message.startsWith(`${token} `)) return `${label}${message.slice(token.length)}`
  }
  return message
}
