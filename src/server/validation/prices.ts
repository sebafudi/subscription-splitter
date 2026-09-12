import { z } from 'zod'

/**
 * The same month rule the other validation modules apply. The database CHECK is
 * a `GLOB` pattern that still admits `2026-00` and `2026-13` through `2026-19`,
 * so this is what closes the gap, including for a month that arrives in a path
 * parameter rather than in a body.
 */
export const monthValue = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month must be in YYYY-MM format with a valid month')

/**
 * A positive amount is the contract, not an oversight: a month that costs
 * nothing is a break month, and the two are kept apart because they differ in
 * whether a standing order counts as received.
 */
export const createPriceSchema = z
  .object({
    effective_from: monthValue,
    amount: z
      .number()
      .int('amount must be a whole number of minor units')
      .positive('amount must be a positive number of minor units'),
  })
  .strict()

export const createBreakMonthSchema = z.object({ month: monthValue }).strict()

export type CreatePriceInput = z.infer<typeof createPriceSchema>
export type CreateBreakMonthInput = z.infer<typeof createBreakMonthSchema>
