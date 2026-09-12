import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseArgs, runCli } from "../src/cli.js";
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

describe("parseArgs", () => {
  it("parses a positional diff path and an --out flag regardless of order", () => {
    expect(parseArgs(["a.diff", "--out", "out.md"])).toEqual({
      diffPath: "a.diff",
      outPath: "out.md",
    });
    expect(parseArgs(["--out", "out.md", "a.diff"])).toEqual({
      diffPath: "a.diff",
      outPath: "out.md",
    });
  });

  it("leaves both paths undefined when neither is given", () => {
    expect(parseArgs([])).toEqual({ diffPath: undefined, outPath: undefined });
  });
});

describe("the CLI entry point, run as a real subprocess", () => {
  it("reads the diff from a file path, writes --out, and exits 3 with no credential", () => {
    const dir = mkdtempSync(join(tmpdir(), "reviewer-cli-test-"));
    const diffPath = join(dir, "sample.diff");
    const outPath = join(dir, "comment.md");
    writeFileSync(diffPath, "diff --git a/x b/x\n+change\n", "utf8");

    const tsxBin = join(fileURLToPath(new URL("../node_modules/.bin/", import.meta.url)), "tsx");
    const cliPath = fileURLToPath(new URL("../src/cli.ts", import.meta.url));

    const env: NodeJS.ProcessEnv = { ...process.env, PR_TITLE: "t", PR_BODY: "b" };
    delete env.OPENROUTER_API_KEY;

    let exitCode = 0;
    try {
      execFileSync(tsxBin, [cliPath, diffPath, "--out", outPath], { env, stdio: "pipe" });
    } catch (error) {
      exitCode = (error as { status?: number }).status ?? -1;
    }

    expect(exitCode).toBe(3);
    const comment = readFileSync(outPath, "utf8");
    expect(comment.startsWith("<!-- ai-code-review -->")).toBe(true);
    expect(comment).toContain("missing_credential");

    rmSync(dir, { recursive: true, force: true });
  });
});
