Analyzed repository: honojs/hono, commit edd138ee3049749190de3dcd7e32d7bcbf224e41 (upstream tag/version as reported by `git describe --tags`: v4.13.7-7-gedd138ee)

This is an analysis of an external open-source project (Hono, a TypeScript web framework), kept as a separate reference target from the subscription-splitter application. The clone lives at `/Users/sebastian.f/Projects/10xDevs/analysis/hono` and is not part of this repository. This is a refactoring PLAN and verification, not an implementation - no production code was modified.

# 03: Anti-corruption layer analysis

## Step 0: Context

`README.md:22` declares interchangeability directly: "It works on any JavaScript runtime: Cloudflare Workers, Fastly Compute, Deno, Bun, Vercel, AWS Lambda, Lambda@Edge, and Node.js... The same code runs on all platforms." This is an explicit claim that platform-specific detail must not leak into the code an app author writes. `package.json`'s `dependencies` field is empty; all packages that could carry platform-specific shapes (`wrangler`, `bun-types`, `@hono/node-server`, etc.) are `devDependencies`, used only for this repository's own build/test tooling, never shipped to a consuming app. Layers, per `01-domain-distillation.md`: core (`context.ts`/`request.ts`/`hono-base.ts`/`compose.ts`/`router.ts`), middleware/helpers, and adapters (`src/adapter/*`, one directory per runtime).

## Step 1: Candidate leaky dependencies identified

Two categories of "external dependency" apply to this codebase, since it has zero third-party runtime dependencies of its own (verified in `01-domain-distillation.md`):

1. **Platform-specific event/type shapes** the 9 adapters must each understand (AWS Lambda's event object, CloudFront's request/response shapes for `lambda-edge`, etc.) - these are the closest analogue to "an external library" in a zero-dependency codebase, since each adapter effectively hand-rolls its own small type definitions for its platform rather than depending on an npm types package.
2. **The standard `Request`/`Response`/`Headers` objects themselves** - not a corruption risk by design (see Step 2), but checked here as the control case: does anything reconstruct or wrap them inconsistently across layers?

For (1), every adapter's platform-specific surface was checked for files outside its own directory that reference it:

- `src/adapter/aws-lambda/types.ts` hand-declares `CognitoIdentity`, `ClientContext`, `ClientContextClient`, `ClientContextEnv` and related interfaces (read directly, lines 1-20) rather than importing them from an `@types/aws-lambda` package - `package.json` has no such dependency at all.
- `src/adapter/lambda-edge/handler.ts` similarly works with CloudFront-shaped event objects specific to that adapter.
- `src/adapter/cloudflare-pages/handler.ts` uses an `eventContext` shape (`waitUntil`, `passThroughOnException`, `env`) specific to the Cloudflare Pages Functions API.

## Step 2: Classification and choice

| Candidate | (a) Files/layers reached | (b) Risk/cost to change today | (c) Declared interchangeability? |
|---|---|---|---|
| AWS Lambda's event/context shapes | 1 directory (its own) - checked | Low, if it were leaking (it isn't - see Step 3) | Yes - `README.md:22` names AWS Lambda specifically as one of several interchangeable targets |
| Lambda@Edge / CloudFront shapes | 1 directory (its own) - checked | Low, if it were leaking (it isn't) | Yes - same declaration |
| Cloudflare Pages `eventContext` shape | 1 directory (its own) - checked | Low, if it were leaking (it isn't) | Yes - same declaration |
| Standard `Request`/`Response` (control case) | Used everywhere by design | Not applicable - this is the intended common denominator, not a corruption candidate | Yes, explicitly - "built on Web Standards" is the mechanism that makes interchangeability possible at all |

**Choice: examine the AWS Lambda adapter as the primary boundary** (the richest example, with the most hand-rolled platform-specific type surface of the three), verifying whether its event/context shapes leak into core, into other adapters, or into middleware - and use the validator middleware's schema-library relationship as a second, confirming example of the same architectural pattern applied to a different kind of "external" dependency (a validation library, rather than a platform runtime).

## Step 3: Diagnosis

**AWS Lambda.** `grep -rn "^import" src --include="*.ts" | grep -Ei "aws-lambda"` (excluding `src/adapter/aws-lambda` itself) returns **zero matches** - nothing in `context.ts`, `request.ts`, `hono-base.ts`, `compose.ts`, `router.ts`, any middleware, or any other adapter imports anything from `src/adapter/aws-lambda`. The adapter's own hand-declared types (`CognitoIdentity` etc., `src/adapter/aws-lambda/types.ts:1-20`) exist only inside that one directory.

**Cloudflare-specific types.** `grep -rln "@cloudflare/workers-types" src --include="*.ts"` (excluding `src/adapter/cloudflare-*`) returns **zero matches**.

**The boundary crossing that does exist, and is correctly one-directional.** `src/adapter/aws-lambda/handler.ts` calls `app.fetch(req, { event, requestContext, context })` - i.e. it constructs a standard `Request` from the Lambda event (translation happens inside the adapter, before crossing into core) and passes the platform-specific `event`/`context`/`requestContext` values through only as opaque `env`/`executionCtx` payloads that core never inspects for their AWS-specific shape (core's `Context.env` type is generic, `E['Bindings']`, per `src/context.ts:315` and `src/types.ts`'s `Env` type - it does not know or care that these particular bindings came from Lambda). This is exactly the adapter pattern the ACL concept describes: the adapter is the only place that "knows" the platform's shape, and it hands core only the standardized `Request` plus an opaque bag of environment values.

**No document declares this should be interchangeable and then fails to honor it** - the opposite was found: the declaration ("same code runs on all platforms," `README.md:22`) is honored by the code, not contradicted by it.

**Second example, confirming the pattern elsewhere: the validator middleware and schema libraries.** `src/validator/validator.ts` (read in full, lines 1-40) imports no concrete validation library - its public `ValidationFunction` type (line 14) is a generic `(value, c) => Output | TypedResponse | Promise<...>` signature. The only place a schema library (`zod`) appears anywhere in `src/` is `src/validator/validator.test.ts`, i.e. as an example of a caller supplying one, not as a dependency of the middleware itself. This confirms the same architectural discipline applies beyond runtime adapters: Hono's "port" for validation is a plain function type, and any concrete library is the caller's concern, never the framework's.

## Step 4: ACL design (already in place - documented, not newly designed)

Because no leak was found, this step documents the ACL that already exists rather than designing a new one, per the exercise's allowance that an absent leak is a valid finding:

- **Domain value object**: the standard `Request`/`Response` objects themselves serve this role - core code (`Context`, `HonoRequest`, `compose()`) knows only these Web-standard shapes, never a platform-specific event type.
- **Narrow port**: `Hono.fetch(request: Request, env?, executionCtx?): Response | Promise<Response>` (`src/hono-base.ts:481-487`) is the port - a single, standard-shaped function signature that is the only way into the framework from any runtime.
- **Adapter**: each `src/adapter/<runtime>/handler.ts` is the concrete adapter, translating one specific platform's event shape into a call to that one port, and translating the standard `Response` back into whatever shape the platform expects on the way out. `env`/`executionCtx` are passed through as opaque, generically-typed payloads (`E['Bindings']`, `ExecutionContext`) that core never destructures for platform-specific fields - so even the "escape hatch" for passing platform data through does not leak platform-specific shape into core's own type definitions.

## Step 5: Proof of isolation

`grep`/`ast-grep` for each platform-specific surface, scoped to exclude that platform's own adapter directory, returns zero matches in every case checked:

```
grep -rn "^import" src --include="*.ts" | grep -Ei "aws-lambda|cloudflare|@vercel|netlify|deno\.ns" | grep -v "^src/adapter/"
```
Zero matches (re-verified for this document). This means: replacing or removing the AWS Lambda adapter entirely would touch exactly `src/adapter/aws-lambda/` and nothing else - not `context.ts`, not another adapter, not any middleware, not the router. The same holds for every other adapter checked. The UI-equivalent layer here (the app author's own handler code) receives only the standard `Context`/`Request`/`Response` objects, never a raw platform event - confirmed by `Context`'s public API (`src/context.ts`) having no AWS/Cloudflare/Vercel-specific members at all.

## Step 6: Verification and plan

**Success criterion, run directly**: `grep -rn "^import" src --include="*.ts" | grep -Ei "aws-lambda|cloudflare|@vercel|netlify|deno\.ns" | grep -v "^src/adapter/"` returns files only inside adapter directories (in this case, zero files at all, which trivially satisfies "only ACL/adapter directory"). Files that currently "know" AWS-Lambda-specific shapes: exactly the contents of `src/adapter/aws-lambda/`. Files that would "know" it after any future refactor: unchanged, since no leak exists to remove.

**Phased plan**: none required for remediation, since no leak was found. The recommended action is smaller and purely preventive: add a lint rule or CI check (consistent with this repository's existing convention of PR-gated checks in `.github/workflows/ci.yml`) that fails if any file outside `src/adapter/<name>/` imports a platform-specific package, so that this currently-clean boundary is protected going forward rather than only verified once. This is a test/tooling addition, not a structural code change, and is offered as a suggestion for the planning stage, not designed further here.

## Summary

Hono's own "same code runs on all platforms" claim was checked against three of its most platform-coupled areas - the AWS Lambda, Lambda@Edge, and Cloudflare Pages adapters - and against a second architectural pattern of the same kind, the validator middleware's relationship to schema libraries. In every case, `grep`/`ast-grep` scoped to exclude the relevant adapter or middleware directory returned zero cross-boundary references: no platform-specific type or library import was found living outside its own adapter, and the validator middleware imports no concrete schema library at all. This is a genuine absent-leak finding, not an oversight in the search - the mechanism that prevents leakage is the framework's own core commitment to the standard `Request`/`Response` objects as the only shape core code understands, with `Hono.fetch()` as the single narrow port every adapter calls through. The one recommendation is preventive rather than corrective: add a CI-enforced import-boundary check so this clean separation is protected by tooling rather than only by convention, since nothing today would stop a future PR from introducing exactly this kind of leak.
