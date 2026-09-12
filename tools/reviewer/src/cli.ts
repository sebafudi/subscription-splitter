import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import type { LanguageModel } from "ai";
import { COMMENT_MARKER, renderComment } from "./format.js";
import { reviewDiff, type ReviewInput } from "./review.js";

export interface CliInput {
  readonly title: string;
  readonly body: string;
  readonly diff: string;
}

export interface CliOptions {
  readonly model?: LanguageModel;
}

export interface CliResult {
  readonly exitCode: 0 | 1 | 2 | 3;
  readonly comment: string;
}

/**
 * Runs the review and maps the outcome to the CLI's contract: exit 0 for pass, 1 for fail, 2 for
 * an error the reviewer could not have avoided, and 3 for an error whose reason is
 * missing_credential, since that is a configuration defect an operator must fix rather than a
 * review outcome.
 */
export async function runCli(input: CliInput, options: CliOptions = {}): Promise<CliResult> {
  const reviewInput: ReviewInput = { title: input.title, body: input.body, diff: input.diff };
  const outcome = await reviewDiff(reviewInput, options);
  const comment = renderComment(outcome);

  switch (outcome.status) {
    case "pass":
      return { exitCode: 0, comment };
    case "fail":
      return { exitCode: 1, comment };
    default:
      return {
        exitCode: outcome.reason === "missing_credential" ? 3 : 2,
        comment,
      };
  }
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

export function parseArgs(argv: string[]): { diffPath?: string; outPath?: string } {
  let diffPath: string | undefined;
  let outPath: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out") {
      outPath = argv[i + 1];
      i++;
    } else if (!argv[i]!.startsWith("--")) {
      diffPath = argv[i];
    }
  }
  return { diffPath, outPath };
}

/** Loads `.env` from the current working directory when present. A missing file is not an error. */
function loadDotEnvIfPresent(): void {
  if (existsSync(".env")) {
    process.loadEnvFile(".env");
  }
}

async function main(): Promise<void> {
  loadDotEnvIfPresent();
  const { diffPath, outPath } = parseArgs(process.argv.slice(2));

  try {
    const diff = diffPath ? readFileSync(diffPath, "utf8") : await readStdin();
    const title = process.env.PR_TITLE ?? "";
    const body = process.env.PR_BODY ?? "";

    const result = await runCli({ title, body, diff });

    if (outPath) {
      writeFileSync(outPath, result.comment, "utf8");
    }

    console.log(result.exitCode === 0 ? "pass" : result.exitCode === 1 ? "fail" : "error");
    process.exitCode = result.exitCode;
  } catch (error) {
    // Write a comment even on a crash the reviewer could not have avoided (a bad diff path, an
    // unreadable stdin stream), so a caller that unconditionally reads --out never finds it absent.
    if (outPath) {
      const message = error instanceof Error ? error.message : String(error);
      const fallback =
        `${COMMENT_MARKER}\n\n## AI review: error\n\n` +
        `No verdict was produced. Reason: \`unexpected_failure\`.\n\n${message}\n`;
      writeFileSync(outPath, fallback, "utf8");
    }
    console.error(error);
    process.exitCode = 2;
  }
}

const isMainModule =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 2;
  });
}
