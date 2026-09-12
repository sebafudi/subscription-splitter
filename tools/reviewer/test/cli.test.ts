import { describe, expect, it } from "vitest";
import { runCli } from "../src/cli.js";
import { CRITERIA } from "../src/criteria.js";

function validReview(scores: number[]) {
  const review: Record<string, unknown> = { summary: "s", overall: "pass" };
  CRITERIA.forEach((criterion, index) => {
    review[criterion.key] = { score: scores[index], rationale: "r", findings: [] };
  });
  return review;
}

function mockModel(text: string) {
  return {
    specificationVersion: "v4" as const,
    provider: "test",
    modelId: "test-model",
    supportedUrls: {},
    async doGenerate() {
      return {
        content: [{ type: "text" as const, text }],
        finishReason: { unified: "stop" as const, raw: undefined },
        usage: {
          inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
          outputTokens: { total: 10, text: 10, reasoning: undefined },
        },
        warnings: [],
      };
    },
    async doStream() {
      throw new Error("not used");
    },
  };
}

describe("runCli", () => {
  it("exits 0 for a pass outcome", async () => {
    const model = mockModel(JSON.stringify(validReview([9, 9, 9, 9, 9])));
    const result = await runCli({ title: "t", body: "b", diff: "d" }, { model });
    expect(result.exitCode).toBe(0);
  });

  it("exits 1 for a fail outcome", async () => {
    const model = mockModel(JSON.stringify(validReview([2, 9, 9, 9, 9])));
    const result = await runCli({ title: "t", body: "b", diff: "d" }, { model });
    expect(result.exitCode).toBe(1);
  });

  it("exits 2 for an error the reviewer could not have avoided", async () => {
    const model = mockModel("not json");
    const result = await runCli({ title: "t", body: "b", diff: "d" }, { model });
    expect(result.exitCode).toBe(2);
  });

  it("exits 3 when the error reason is missing_credential", async () => {
    const originalEnv = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    try {
      const result = await runCli({ title: "t", body: "b", diff: "d" }, {});
      expect(result.exitCode).toBe(3);
    } finally {
      if (originalEnv !== undefined) process.env.OPENROUTER_API_KEY = originalEnv;
    }
  });

  it("writes the rendered comment to the output the caller supplies", async () => {
    const model = mockModel(JSON.stringify(validReview([9, 9, 9, 9, 9])));
    const result = await runCli({ title: "t", body: "b", diff: "d" }, { model });
    expect(result.comment.startsWith("<!-- ai-code-review -->")).toBe(true);
  });
});
