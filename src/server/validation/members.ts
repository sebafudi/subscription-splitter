import { z } from 'zod'

const name = z.string().trim().min(1, 'name must not be empty')

const month = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month must be in YYYY-MM format with a valid month')

/**
 * One whole-month range, both ends inclusive. An omitted `left_month` means
 * the member has not left. The database CHECK is a `GLOB` pattern that still
 * admits `2026-00` and `2026-13` through `2026-19`; this regex is what closes
 * that gap, so every write passes through it.
 */
const activeRange = z
  .object({
    joined_month: month,
    left_month: month.nullable().default(null),
  })
  .strict()

const activeRanges = z.array(activeRange).min(1, 'active_ranges must not be empty')

/**
 * Ordering rules over the set are not expressed here. This schema checks
 * shape; `validateActiveRanges` in `src/domain/members.ts` checks the
 * invariant against the subscription's first month, and the route runs the
 * second after the first, turning its message into the same 400 shape.
 *
 * `is_owner: true` is schema-valid and is refused by the partial unique index
 * in the database, which is what makes a second owner a 409 rather than a 400:
 * the rule is "there is already an owner", not "this field is malformed".
 */
export const createMemberSchema = z
  .object({
    name,
    active_ranges: activeRanges,
    is_owner: z.boolean().default(false),
    archived: z.boolean().default(false),
  })
  .strict()

/**
 * A non-empty subset of the editable fields. Ownership is not one of them:
 * there is exactly one owner and it is created with the subscription, so
 * `is_owner` in a patch body is an unknown key and a 400 like any other.
 * `active_ranges` is a complete replacement set, never a partial edit.
 */
export const patchMemberSchema = z
  .object({ name, active_ranges: activeRanges, archived: z.boolean() })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'patch body must not be empty')

export type CreateMemberInput = z.infer<typeof createMemberSchema>
export type PatchMemberInput = z.infer<typeof patchMemberSchema>
