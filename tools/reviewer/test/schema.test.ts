import { describe, expect, it } from "vitest";
import { CRITERIA } from "../src/criteria.js";
import { reviewSchema } from "../src/schema.js";

const FIRST_KEY = CRITERIA[0]!.key;

function validReview() {
  const review: Record<string, unknown> = {
    summary: "Looks fine overall.",
    overall: "pass",
  };
  for (const criterion of CRITERIA) {
    review[criterion.key] = {
      score: 8,
      rationale: "Clear and correct.",
      findings: [
        {
          file: "src/domain/split.ts",
          line: 12,
          severity: "minor",
          message: "Consider a comment.",
        },
      ],
    };
  }
  return review;
}

describe("reviewSchema", () => {
  it("accepts a well-formed review", () => {
    const result = reviewSchema.safeParse(validReview());
    expect(result.success).toBe(true);
  });

  it("rejects a score of 0", () => {
    const review = validReview();
    (review[FIRST_KEY] as Record<string, unknown>).score = 0;
    const result = reviewSchema.safeParse(review);
    expect(result.success).toBe(false);
  });

  it("rejects a score of 11", () => {
    const review = validReview();
    (review[FIRST_KEY] as Record<string, unknown>).score = 11;
    const result = reviewSchema.safeParse(review);
    expect(result.success).toBe(false);
  });

  it("rejects a review missing a criterion key", () => {
    const review = validReview();
    delete review[FIRST_KEY];
    const result = reviewSchema.safeParse(review);
    expect(result.success).toBe(false);
  });

  it("rejects an unknown finding severity", () => {
    const review = validReview();
    (review[FIRST_KEY] as { findings: unknown[] }).findings = [
      { file: "a.ts", line: null, severity: "catastrophic", message: "bad" },
    ];
    const result = reviewSchema.safeParse(review);
    expect(result.success).toBe(false);
  });

  it("accepts a review whose overall is null", () => {
    const review = validReview();
    review.overall = null;
    const result = reviewSchema.safeParse(review);
    expect(result.success).toBe(true);
  });

  it("accepts a finding with a null line", () => {
    const review = validReview();
    (review[FIRST_KEY] as { findings: unknown[] }).findings = [
      { file: "a.ts", line: null, severity: "blocking", message: "bad" },
    ];
    const result = reviewSchema.safeParse(review);
    expect(result.success).toBe(true);
  });
});
