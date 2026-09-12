import { describe, expect, it } from "vitest";
import { CRITERIA } from "../src/criteria.js";
import type { Review } from "../src/schema.js";
import type { ReviewOutcome } from "../src/verdict.js";
import { renderComment } from "../src/format.js";

const MARKER = "<!-- ai-code-review -->";

function review(overrides: Partial<Record<string, unknown>> = {}): Review {
  const base: Record<string, unknown> = { summary: "All good.", overall: "pass" };
  CRITERIA.forEach((criterion) => {
    base[criterion.key] = {
      score: 9,
      rationale: "Solid.",
      findings: [],
    };
  });
  return { ...base, ...overrides } as Review;
}

describe("renderComment", () => {
  it("starts with the hidden marker for a pass outcome", () => {
    const outcome: ReviewOutcome = {
      status: "pass",
      review: review(),
      model: "deepseek/deepseek-v3.2",
      truncation: { truncated: false, originalBytes: 10, includedBytes: 10 },
    };
    expect(renderComment(outcome).startsWith(MARKER)).toBe(true);
  });

  it("starts with the hidden marker for a fail outcome", () => {
    const outcome: ReviewOutcome = {
      status: "fail",
      review: review(),
      model: "deepseek/deepseek-v3.2",
      truncation: { truncated: false, originalBytes: 10, includedBytes: 10 },
    };
    expect(renderComment(outcome).startsWith(MARKER)).toBe(true);
  });

  it("starts with the hidden marker for an error outcome", () => {
    const outcome: ReviewOutcome = {
      status: "error",
      reason: "provider_error",
      detail: "boom",
    };
    expect(renderComment(outcome).startsWith(MARKER)).toBe(true);
  });

  it("renders a truncation note when the diff was bounded", () => {
    const outcome: ReviewOutcome = {
      status: "pass",
      review: review(),
      model: "deepseek/deepseek-v3.2",
      truncation: { truncated: true, originalBytes: 200000, includedBytes: 96000 },
    };
    const comment = renderComment(outcome);
    expect(comment).toMatch(/truncat/i);
    expect(comment).toContain("96000");
    expect(comment).toContain("200000");
  });

  it("never includes a credential-shaped value", () => {
    const outcome: ReviewOutcome = {
      status: "error",
      reason: "missing_credential",
      detail: "OPENROUTER_API_KEY is missing or empty",
    };
    const comment = renderComment(outcome);
    expect(comment).not.toMatch(/sk-or-v1-[a-z0-9]+/i);
  });

  it("renders the five-row score table and the model identifier for a pass outcome", () => {
    const outcome: ReviewOutcome = {
      status: "pass",
      review: review(),
      model: "openai/gpt-5-mini",
      truncation: { truncated: false, originalBytes: 10, includedBytes: 10 },
    };
    const comment = renderComment(outcome);
    for (const criterion of CRITERIA) {
      expect(comment).toContain(criterion.key);
    }
    expect(comment).toContain("openai/gpt-5-mini");
  });
});
