import { z } from 'zod'
import { isCalendarDate } from '../../domain/months'

const memberId = z.string().trim().min(1, 'member_id must not be empty')

/**
 * The database CHECK is a `GLOB` pattern that still admits `2026-00-10`,
 * `2026-19-10` and every impossible day of a real month, `2026-02-30` among
 * them. The domain's `isCalendarDate` is what closes that gap, so every write
 * passes through it.
 */
const paymentDate = z
  .string()
  .refine(isCalendarDate, 'date must be a real calendar date in YYYY-MM-DD form')

/**
 * A positive amount is the contract, not an oversight: a correction is an edit
 * or a delete, never a negative row, so there is no refund record to express.
 */
const amount = z
  .number()
  .int('amount must be a whole number of minor units')
  .positive('amount must be a positive number of minor units')

const note = z.string().trim().max(500, 'note must be 500 characters or fewer')

/** `kind` on the wire and in the domain; only the column is `tag`, mapped in the repository. */
const kind = z.enum(['manual', 'annual'])

/**
 * Shape only. The start-month rule needs the subscription's own first month,
 * so it lives in the domain's `validatePaymentDate` and the route runs it after
 * this schema, turning its message into the same 400 shape.
 */
export const createPaymentSchema = z
  .object({
    member_id: memberId,
    date: paymentDate,
    amount,
    note: note.default(''),
    kind: kind.default('manual'),
  })
  .strict()

/**
 * A non-empty subset of the same four fields, with no defaults: an absent key
 * means the stored value stands, rather than being reset to the create-time
 * default.
 */
export const patchPaymentSchema = z
  .object({ member_id: memberId, date: paymentDate, amount, note, kind })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'patch body must not be empty')

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>
export type PatchPaymentInput = z.infer<typeof patchPaymentSchema>
