import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { CRITERIA } from "../src/criteria.js";
import { reviewDiff } from "../src/review.js";

function usage() {
  return {
    inputTokens: { total: 100, noCache: 100, cacheRead: undefined, cacheWrite: undefined },
    outputTokens: { total: 50, text: 50, reasoning: undefined },
  };
}

function validReviewJson(scores: number[]) {
  const review: Record<string, unknown> = { summary: "Summary text.", overall: "pass" };
  CRITERIA.forEach((criterion, index) => {
    review[criterion.key] = {
      score: scores[index],
      rationale: "Because of the diff.",
      findings: [],
    };
  });
  return JSON.stringify(review);
}

function mockModelReturningText(text: string) {
  return new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: "text", text }],
      finishReason: { unified: "stop", raw: undefined },
      usage: usage(),
      warnings: [],
    }),
  });
}

function mockModelRejecting(error: unknown) {
  return new MockLanguageModelV4({
    doGenerate: async () => {
      throw error;
    },
  });
}

const baseInput = { title: "Fix rounding bug", body: "Fixes the residual allocation.", diff: "diff --git a/x b/x\n+fix" };

describe("reviewDiff", () => {
  it("returns pass when the mock model returns high scores", async () => {
    const model = mockModelReturningText(validReviewJson([9, 9, 9, 9, 9]));
    const outcome = await reviewDiff(baseInput, { model });
    expect(outcome.status).toBe("pass");
  });

  it("returns fail when the mock model returns a low score", async () => {
    const model = mockModelReturningText(validReviewJson([3, 9, 9, 9, 9]));
    const outcome = await reviewDiff(baseInput, { model });
    expect(outcome.status).toBe("fail");
  });

  it("never throws and returns status error for unparseable model output", async () => {
    const model = mockModelReturningText("this is not json at all {{{");
    const outcome = await reviewDiff(baseInput, { model });
    expect(outcome.status).toBe("error");
    if (outcome.status === "error") {
      expect(outcome.reason).toBe("no_object_generated");
    }
  });

  it("returns status error with reason schema_invalid for valid JSON violating the schema", async () => {
    const badReview = JSON.parse(validReviewJson([9, 9, 9, 9, 9]));
    badReview[CRITERIA[0]!.key].score = 12; // out of range
    const model = mockModelReturningText(JSON.stringify(badReview));
    const outcome = await reviewDiff(baseInput, { model });
    expect(outcome.status).toBe("error");
    if (outcome.status === "error") {
      expect(outcome.reason).toBe("schema_invalid");
    }
  });

  it("returns status error with reason schema_invalid for JSON missing a criterion key", async () => {
    const badReview = JSON.parse(validReviewJson([9, 9, 9, 9, 9]));
    delete badReview[CRITERIA[0]!.key];
    const model = mockModelReturningText(JSON.stringify(badReview));
    const outcome = await reviewDiff(baseInput, { model });
    expect(outcome.status).toBe("error");
    if (outcome.status === "error") {
      expect(outcome.reason).toBe("schema_invalid");
    }
  });

  it("returns status error with reason provider_error when the model call rejects", async () => {
    const model = mockModelRejecting(new Error("network exploded"));
    const outcome = await reviewDiff(baseInput, { model });
    expect(outcome.status).toBe("error");
    if (outcome.status === "error") {
      expect(outcome.reason).toBe("provider_error");
    }
  });

  it("returns status error with reason missing_credential when no model is injected and no credential is set", async () => {
    const originalEnv = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    try {
      const outcome = await reviewDiff(baseInput, {});
      expect(outcome.status).toBe("error");
      if (outcome.status === "error") {
        expect(outcome.reason).toBe("missing_credential");
      }
    } finally {
      if (originalEnv !== undefined) process.env.OPENROUTER_API_KEY = originalEnv;
    }
  });

  it("derives a verdict rather than an error when the model's overall is null", async () => {
    const review = JSON.parse(validReviewJson([9, 9, 9, 9, 9]));
    review.overall = null;
    const model = mockModelReturningText(JSON.stringify(review));
    const outcome = await reviewDiff(baseInput, { model });
    expect(outcome.status).toBe("pass");
  });

  it("truncates a diff over maxDiffBytes before sending it to the model", async () => {
    const model = mockModelReturningText(validReviewJson([9, 9, 9, 9, 9]));
    const bigDiff = "x".repeat(5000);
    const outcome = await reviewDiff({ ...baseInput, diff: bigDiff, maxDiffBytes: 100 }, { model });
    expect(outcome.status).toBe("pass");
    expect(model.doGenerateCalls.length).toBe(1);
  });
});
