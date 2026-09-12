import { z } from "zod";
import { CRITERIA } from "./criteria.js";

export const findingSchema = z.object({
  file: z.string(),
  line: z.number().int().nullable(),
  severity: z.enum(["blocking", "major", "minor"]),
  message: z.string(),
});

export type Finding = z.infer<typeof findingSchema>;

export const criterionResultSchema = z.object({
  score: z.number().int().min(1).max(10),
  rationale: z.string(),
  findings: z.array(findingSchema),
});

export type CriterionResult = z.infer<typeof criterionResultSchema>;

const criterionShape = Object.fromEntries(
  CRITERIA.map((criterion) => [criterion.key, criterionResultSchema]),
) as Record<(typeof CRITERIA)[number]["key"], typeof criterionResultSchema>;

export const reviewSchema = z.object({
  ...criterionShape,
  summary: z.string(),
  overall: z.enum(["pass", "fail"]).nullable(),
});

export type Review = z.infer<typeof reviewSchema>;
