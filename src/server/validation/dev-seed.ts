import { z } from 'zod'

/** One declared schema for the dev-seed body, shared by the route and exercised directly by a unit test. */
export const seedRequestSchema = z
  .object({
    email: z.string().trim().min(1, 'email must not be empty'),
    password: z.string().min(1, 'password must not be empty'),
    name: z.string().trim().min(1, 'name must not be empty'),
  })
  .strict()

export type SeedRequestInput = z.infer<typeof seedRequestSchema>
