import { CRITERIA } from "./criteria.js";
import type { Review } from "./schema.js";
import type { ReviewOutcome } from "./verdict.js";

export const COMMENT_MARKER = "<!-- ai-code-review -->";

function renderScoreTable(review: Review): string {
  const rows = CRITERIA.map((criterion) => {
    const result = review[criterion.key];
    return `| ${criterion.title} (\`${criterion.key}\`) | ${result.score} |`;
  });
  return ["| Criterion | Score |", "|---|---|", ...rows].join("\n");
}

function renderFindings(review: Review): string {
  const sections: string[] = [];
  for (const criterion of CRITERIA) {
    const result = review[criterion.key];
    if (result.findings.length === 0) continue;
    const lines = result.findings.map((finding) => {
      const location = finding.line !== null ? `${finding.file}:${finding.line}` : finding.file;
      return `- **${finding.severity}** ${location} - ${finding.message}`;
    });
    sections.push(`**${criterion.title}**\n${lines.join("\n")}`);
  }
  return sections.length > 0 ? sections.join("\n\n") : "No findings.";
}

function renderTruncationNote(outcome: Extract<ReviewOutcome, { status: "pass" | "fail" }>): string {
  if (!outcome.truncation.truncated) return "";
  return (
    `\n\n> The diff was truncated: showing ${outcome.truncation.includedBytes} of ` +
    `${outcome.truncation.originalBytes} bytes.`
  );
}

/**
 * Renders a review outcome as the markdown comment body. Always begins with the hidden marker the
 * workflow's upsert step matches on.
 */
export function renderComment(outcome: ReviewOutcome): string {
  if (outcome.status === "error") {
    return (
      `${COMMENT_MARKER}\n\n` +
      `## AI review: error\n\n` +
      `No verdict was produced. Reason: \`${outcome.reason}\`.\n\n` +
      `${outcome.detail}\n`
    );
  }

  const verdictLabel = outcome.status === "pass" ? "passed" : "failed";
  return (
    `${COMMENT_MARKER}\n\n` +
    `## AI review: ${verdictLabel}\n\n` +
    `${outcome.review.summary}\n\n` +
    `${renderScoreTable(outcome.review)}\n\n` +
    `### Findings\n\n${renderFindings(outcome.review)}\n\n` +
    `Model: \`${outcome.model}\`` +
    `${renderTruncationNote(outcome)}\n`
  );
}
