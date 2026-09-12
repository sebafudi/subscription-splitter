import { describe, expect, it } from "vitest";
import { DEFAULT_MODEL_ID, MissingCredentialError, resolveModel } from "../src/model.js";

describe("resolveModel", () => {
  it("raises a named configuration error when OPENROUTER_API_KEY is absent", () => {
    expect(() => resolveModel({})).toThrow(MissingCredentialError);
  });

  it("raises the same error when OPENROUTER_API_KEY is an empty string", () => {
    expect(() => resolveModel({ OPENROUTER_API_KEY: "" })).toThrow(MissingCredentialError);
  });

  it("resolves a model when the credential is present", () => {
    const model = resolveModel({ OPENROUTER_API_KEY: "sk-or-v1-test" });
    expect(model).toBeDefined();
    expect(model.modelId).toBeTruthy();
  });

  it("uses REVIEWER_MODEL from the environment when set", () => {
    const model = resolveModel({
      OPENROUTER_API_KEY: "sk-or-v1-test",
      REVIEWER_MODEL: "openai/gpt-5-mini",
    });
    expect(model.modelId).toBe("openai/gpt-5-mini");
  });

  it("falls back to DEFAULT_MODEL_ID when REVIEWER_MODEL is unset", () => {
    const model = resolveModel({ OPENROUTER_API_KEY: "sk-or-v1-test" });
    expect(model.modelId).toBe(DEFAULT_MODEL_ID);
  });
});
