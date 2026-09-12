import { CRITERIA } from "./criteria.js";
import type { CriterionResult, Review } from "./schema.js";

export type Verdict = "pass" | "fail";

export type ErrorReason =
  | "missing_credential"
  | "no_object_generated"
  | "schema_invalid"
  | "provider_error";

export interface ReviewUsage {
  readonly promptTokens?: number;
  readonly completionTokens?: number;
  readonly totalTokens?: number;
  readonly cost?: number;
}

export interface TruncationInfo {
  readonly truncated: boolean;
  readonly originalBytes: number;
  readonly includedBytes: number;
}

export type ReviewOutcome =
  | {
      status: Verdict;
      review: Review;
      usage?: ReviewUsage;
      model: string;
      truncation: TruncationInfo;
    }
  | { status: "error"; reason: ErrorReason; detail: string };

const PASS_THRESHOLD = 6;

function criterionResults(review: Review): CriterionResult[] {
  return CRITERIA.map((criterion) => review[criterion.key]);
}

/**
 * Recomputes the verdict from the five criterion scores and finding severities.
 * The model's own `overall` field is never consulted, whether present, contradictory or null.
 */
export function deriveVerdict(review: Review): Verdict {
  const results = criterionResults(review);
  const anyBelowThreshold = results.some((result) => result.score < PASS_THRESHOLD);
  const anyBlockingFinding = results.some((result) =>
    result.findings.some((finding) => finding.severity === "blocking"),
  );
  return anyBelowThreshold || anyBlockingFinding ? "fail" : "pass";
}
