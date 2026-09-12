import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CRITERIA } from "../src/criteria.js";

const configPath = fileURLToPath(new URL("../eval/promptfooconfig.yaml", import.meta.url));

describe("promptfoo evaluation configuration", () => {
  it("names every criterion key as the expected criterion of at least one fixture", () => {
    const configText = readFileSync(configPath, "utf8");
    const expectedCriterionLines = configText
      .split("\n")
      .filter((line) => line.trim().startsWith("expectedCriterion:"))
      .map((line) => line.split(":")[1]!.trim());

    for (const criterion of CRITERIA) {
      expect(expectedCriterionLines).toContain(criterion.key);
    }
  });

  it("references all seven fixture files", () => {
    const configText = readFileSync(configPath, "utf8");
    const fixtures = [
      "clean.diff",
      "money-rounding-bug.diff",
      "ownership-bypass.diff",
      "missing-migration.diff",
      "break-month-liability.diff",
      "untested-risk-change.diff",
      "prompt-injection.diff",
    ];
    for (const fixture of fixtures) {
      expect(configText).toContain(fixture);
    }
  });
});
