import { z } from 'zod'

const name = z.string().trim().min(1, 'name must not be empty')

const currency = z.string().regex(/^[A-Z]{3}$/, 'currency must be a three-letter uppercase ISO code')

const locale = z.string().refine((value) => {
  try {
    new Intl.Locale(value)
    return true
  } catch {
    return false
  }
}, 'locale must be a valid BCP-47 tag')

const timeZone = z.string().refine((value) => {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: value })
    return true
  } catch {
    return false
  }
}, 'time_zone must be a valid IANA time zone')

const startMonth = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'start_month must be in YYYY-MM format with a valid month')

/** One declared schema for subscription creation, shared by the route and exercised directly by a unit test. */
export const createSubscriptionSchema = z
  .object({
    name,
    currency: currency.default('PLN'),
    locale: locale.default('pl-PL'),
    time_zone: timeZone.default('Europe/Warsaw'),
    start_month: startMonth,
  })
  .strict()

/** Accepts a non-empty subset of the create fields; rejects an empty body and any unknown key. */
export const patchSubscriptionSchema = z
  .object({ name, currency, locale, time_zone: timeZone, start_month: startMonth })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'patch body must not be empty')

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>
export type PatchSubscriptionInput = z.infer<typeof patchSubscriptionSchema>
