import { z } from 'zod'
import { monthValue } from './prices'

const memberId = z.string().trim().min(1, 'member_id must not be empty')

const amount = z
  .number()
  .int('amount must be a whole number of minor units')
  .positive('amount must be a positive number of minor units')

/** Every column of the row, which is also every field a patch may name. */
const scheduleFields = {
  member_id: memberId,
  amount,
  start_month: monthValue,
  end_month: monthValue.nullable(),
}

/** An absent end month is the open-ended arrangement, so it defaults to null rather than being required. */
export const createScheduleSchema = z
  .object({ ...scheduleFields, end_month: monthValue.nullable().default(null) })
  .strict()
  .refine((value) => value.end_month === null || value.end_month >= value.start_month, {
    message: 'end_month must not precede start_month',
    path: ['end_month'],
  })

/**
 * A non-empty subset of the same four fields, `member_id` included: an
 * arrangement entered against the wrong participant is an ordinary correction
 * and the payments patch already allows that move. A null `end_month` reopens
 * an arrangement.
 *
 * The ordering rule is deliberately absent here. A patch carrying only one of
 * the two months has to be judged against the stored value of the other, so the
 * route applies the rule to the merged row; a schema over a partial body could
 * only see half of it. The overlap and start-month rules are route rules for
 * the same reason: they need rows and a subscription this schema cannot see.
 */
export const patchScheduleSchema = z
  .object(scheduleFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'patch body must not be empty')

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>
export type PatchScheduleInput = z.infer<typeof patchScheduleSchema>
