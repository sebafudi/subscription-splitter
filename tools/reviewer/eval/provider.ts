import { readFileSync } from "node:fs";
import { reviewDiff } from "../src/review.js";
import { resolveModel } from "../src/model.js";

interface ProviderConfig {
  readonly model: string;
}

interface CallContext {
  readonly vars?: Record<string, unknown>;
}

interface ProviderResponse {
  readonly output: string;
  readonly tokenUsage?: { prompt?: number; completion?: number; total?: number };
  readonly cost?: number;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Puts the real reviewDiff() under evaluation rather than a bare prompt, so the promptfoo matrix
 * and the CI workflow exercise the same code path. Referenced from promptfooconfig.yaml as
 * file://eval/provider.ts, once per model with a distinct config.model.
 */
export default class ReviewerEvalProvider {
  private readonly config: ProviderConfig;

  constructor(options: { config?: ProviderConfig } = {}) {
    this.config = options.config ?? { model: "unknown" };
  }

  id(): string {
    return `reviewer:${this.config.model}`;
  }

  async callApi(_prompt: string, context: CallContext = {}): Promise<ProviderResponse> {
    const vars = context.vars ?? {};
    const diffPath = String(vars.diffPath ?? "");
    const diff = readFileSync(diffPath, "utf8");
    const title = typeof vars.title === "string" ? vars.title : "Fixture pull request";
    const body = typeof vars.body === "string" ? vars.body : "";

    const model = resolveModel({
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
      REVIEWER_MODEL: this.config.model,
    });

    const outcome = await reviewDiff({ title, body, diff }, { model });

    const usage = outcome.status === "error" ? undefined : outcome.usage;
    const cost = usage?.cost;

    return {
      output: JSON.stringify(outcome),
      tokenUsage: {
        prompt: usage?.promptTokens,
        completion: usage?.completionTokens,
        total: usage?.totalTokens,
      },
      cost,
      metadata: { outcome, tokenUsage: usage, cost },
    };
  }
}
