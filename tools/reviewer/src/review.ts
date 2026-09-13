import { APICallError, NoObjectGeneratedError, TypeValidationError, generateObject } from "ai";
import type { LanguageModel } from "ai";
import { boundDiff } from "./diff.js";
import { MissingCredentialError, resolveModel } from "./model.js";
import { buildSystemPrompt, buildUserPrompt, generateNonce } from "./prompt.js";
import { reviewSchema } from "./schema.js";
import { deriveVerdict, type ReviewOutcome } from "./verdict.js";

export interface ReviewInput {
  readonly title: string;
  readonly body: string;
  readonly diff: string;
  readonly maxDiffBytes?: number;
}

export interface ReviewOptions {
  readonly model?: LanguageModel;
}

// Reasoning models bill their thinking against this same budget. At 2000 a reasoning model spends
// the whole allowance before emitting a single token of the object, which surfaces as a
// finishReason of "length" and a no_object_generated outcome. 8000 was still too tight: a single
// review was observed spending 5167 tokens on reasoning before 1347 tokens of object, and runs that
// reasoned harder truncated the JSON mid-object. 16000 leaves the object real headroom. Unused
// budget is not charged, so the ceiling costs nothing when a review is short.
export const MAX_OUTPUT_TOKENS = 16000;
const MAX_RETRIES = 1;

function isAuthFailure(error: unknown): boolean {
  return APICallError.isInstance(error) && (error.statusCode === 401 || error.statusCode === 403);
}

/**
 * Bounds the diff, builds the prompts, calls the model once through generateObject and derives
 * the verdict locally. Never throws: every failure becomes an `error` outcome carrying a reason.
 */
export async function reviewDiff(
  input: ReviewInput,
  options: ReviewOptions = {},
): Promise<ReviewOutcome> {
  try {
    const model = options.model ?? resolveModel(process.env);
    const modelId = typeof model === "string" ? model : (model as { modelId?: string }).modelId ?? "unknown";

    const bounded = boundDiff(input.diff, input.maxDiffBytes);
    const nonce = generateNonce();
    const system = buildSystemPrompt(nonce);
    const prompt = buildUserPrompt({ title: input.title, body: input.body, diff: bounded.text }, nonce);

    const result = await generateObject({
      model,
      schema: reviewSchema,
      system,
      prompt,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      maxRetries: MAX_RETRIES,
    });

    const review = result.object;
    const status = deriveVerdict(review);
    const openrouterUsage = (
      result.providerMetadata as { openrouter?: { usage?: { cost?: number } } } | undefined
    )?.openrouter?.usage;

    return {
      status,
      review,
      model: modelId,
      usage: {
        promptTokens: result.usage.inputTokens,
        completionTokens: result.usage.outputTokens,
        totalTokens: result.usage.totalTokens,
        cost: openrouterUsage?.cost,
      },
      truncation: {
        truncated: bounded.truncated,
        originalBytes: bounded.originalBytes,
        includedBytes: bounded.includedBytes,
      },
    };
  } catch (error) {
    if (error instanceof MissingCredentialError || isAuthFailure(error)) {
      return { status: "error", reason: "missing_credential", detail: describeError(error) };
    }
    if (NoObjectGeneratedError.isInstance(error)) {
      const cause = (error as { cause?: unknown }).cause;
      if (TypeValidationError.isInstance(cause)) {
        return { status: "error", reason: "schema_invalid", detail: describeError(error) };
      }
      return { status: "error", reason: "no_object_generated", detail: describeError(error) };
    }
    return { status: "error", reason: "provider_error", detail: describeError(error) };
  }
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
