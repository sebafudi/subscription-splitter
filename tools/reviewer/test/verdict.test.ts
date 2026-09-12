import { describe, expect, it } from "vitest";
import { CRITERIA } from "../src/criteria.js";
import type { CriterionResult, Review } from "../src/schema.js";
import { deriveVerdict } from "../src/verdict.js";

const THIRD_KEY = CRITERIA[2]!.key;
const FIRST_KEY = CRITERIA[0]!.key;

function reviewWithScores(scores: number[], overall: Review["overall"] = null): Review {
  const review: Record<string, unknown> = { summary: "s", overall };
  CRITERIA.forEach((criterion, index) => {
    review[criterion.key] = {
      score: scores[index],
      rationale: "r",
      findings: [],
    };
  });
  return review as Review;
}

function criterionByKey(review: Review, key: string): CriterionResult {
  return (review as unknown as Record<string, CriterionResult>)[key]!;
}

describe("deriveVerdict", () => {
  it("returns fail for a 5 among four 10s", () => {
    expect(deriveVerdict(reviewWithScores([5, 10, 10, 10, 10]))).toBe("fail");
  });

  it("returns fail for five 10s with one blocking finding", () => {
    const review = reviewWithScores([10, 10, 10, 10, 10]);
    (criterionByKey(review, THIRD_KEY).findings as unknown[]) = [
      { file: "a.ts", line: 1, severity: "blocking", message: "bad" },
    ];
    expect(deriveVerdict(review)).toBe("fail");
  });

  it("returns pass for five 6s with only minor findings", () => {
    const review = reviewWithScores([6, 6, 6, 6, 6]);
    (criterionByKey(review, FIRST_KEY).findings as unknown[]) = [
      { file: "a.ts", line: 1, severity: "minor", message: "nit" },
    ];
    expect(deriveVerdict(review)).toBe("pass");
  });

  it("returns fail for a score of 5, the boundary just below 6", () => {
    expect(deriveVerdict(reviewWithScores([5, 6, 6, 6, 6]))).toBe("fail");
  });

  it("returns pass for a score of 6, the boundary itself", () => {
    expect(deriveVerdict(reviewWithScores([6, 6, 6, 6, 6]))).toBe("pass");
  });

  it("ignores a model overall that contradicts the scores", () => {
    const review = reviewWithScores([3, 10, 10, 10, 10], "pass");
    expect(deriveVerdict(review)).toBe("fail");
  });

  it("returns a derived verdict rather than an error when overall is null", () => {
    const review = reviewWithScores([10, 10, 10, 10, 10], null);
    expect(deriveVerdict(review)).toBe("pass");
  });
});
