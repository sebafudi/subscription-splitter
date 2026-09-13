import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";

/**
 * Selected from the live two-model comparison recorded in
 * `evidence/champion/eval-results.md`: the only one of the two candidates that returned `pass` on
 * the clean control instead of a false failure, and the only one that caught the injection probe.
 */
export const DEFAULT_MODEL_ID = "z-ai/glm-5.3-flash";

export class MissingCredentialError extends Error {
  constructor() {
    super("OPENROUTER_API_KEY is missing or empty");
    this.name = "MissingCredentialError";
  }
}

export interface ReviewerEnv {
  readonly OPENROUTER_API_KEY?: string;
  readonly REVIEWER_MODEL?: string;
}

/**
 * The one place that reads the environment. Builds the OpenRouter provider and returns the model
 * to call. `response-healing` stays off, per research.md - it would mask the malformed-output path
 * the unit tests exist to cover.
 */
export function resolveModel(env: ReviewerEnv) {
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new MissingCredentialError();
  }

  const openrouter = createOpenRouter({ apiKey });
  const modelId = env.REVIEWER_MODEL || DEFAULT_MODEL_ID;
  return openrouter(modelId, { usage: { include: true } });
}

export type ResolvedModel = ReturnType<typeof resolveModel>;
export type { LanguageModel };
