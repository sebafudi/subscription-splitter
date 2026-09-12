import { describe, expect, it } from "vitest";
import { boundDiff } from "../src/diff.js";

describe("boundDiff", () => {
  it("leaves a small diff byte-identical and reports truncated: false", () => {
    const diff = "diff --git a/a.ts b/a.ts\n+small change\n";
    const result = boundDiff(diff, 1_000);
    expect(result.text).toBe(diff);
    expect(result.truncated).toBe(false);
    expect(result.originalBytes).toBe(Buffer.byteLength(diff, "utf8"));
    expect(result.includedBytes).toBe(Buffer.byteLength(diff, "utf8"));
  });

  it("leaves a diff exactly at the limit untouched", () => {
    const line = "x".repeat(98) + "\n";
    const diff = line.repeat(10);
    const limit = Buffer.byteLength(diff, "utf8");
    const result = boundDiff(diff, limit);
    expect(result.truncated).toBe(false);
    expect(result.text).toBe(diff);
  });

  it("truncates a diff over the limit at a line boundary with both byte counts", () => {
    const lines = Array.from({ length: 200 }, (_, i) => `line ${i} `.padEnd(50, "x"));
    const diff = lines.join("\n") + "\n";
    const maxBytes = 1_000;
    const result = boundDiff(diff, maxBytes);

    expect(result.truncated).toBe(true);
    expect(result.originalBytes).toBe(Buffer.byteLength(diff, "utf8"));
    expect(result.includedBytes).toBeLessThanOrEqual(maxBytes);
    expect(Buffer.byteLength(result.text, "utf8")).toBeLessThanOrEqual(maxBytes + 200);

    // Truncation cuts at a line boundary: every line in the result exists verbatim in the input,
    // up to the marker appended at the end.
    const resultLines = result.text.split("\n").filter((line) => !line.startsWith("[truncated"));
    for (const line of resultLines) {
      if (line.length === 0) continue;
      expect(diff.includes(line)).toBe(true);
    }
  });

  it("appends a marker naming both byte counts when truncated", () => {
    const diff = "a".repeat(500) + "\n" + "b".repeat(500) + "\n";
    const result = boundDiff(diff, 400);
    expect(result.truncated).toBe(true);
    expect(result.text).toMatch(/truncated/i);
    expect(result.text).toContain(String(result.originalBytes));
    expect(result.text).toContain(String(result.includedBytes));
  });

  it("handles a diff whose truncation point falls mid-line by cutting to the prior line boundary", () => {
    const diff = "short\n" + "x".repeat(1000) + "\n" + "tail\n";
    const result = boundDiff(diff, 20);
    expect(result.truncated).toBe(true);
    expect(result.text.startsWith("short\n")).toBe(true);
    expect(result.text).not.toContain("x".repeat(1000));
  });
});
