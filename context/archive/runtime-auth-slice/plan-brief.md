# Runtime-auth slice - plan brief

> Full plan: `context/changes/runtime-auth-slice/plan.md`
> Research: `context/changes/runtime-auth-slice/research.md`

## What and why

Bring the application to life end to end for the first time. An organizer signs in to a seeded
account, sees and creates their own subscription, and is refused every record belonging to another
account. Everything later in the product hangs off the ownership rule and the session lifecycle this
slice establishes, and both of them fail silently when they are wrong.

## Starting point

The scaffold runs a single Worker with a health route, a React client built into assets the same
Worker serves, a D1 binding and both test runners wired. There is no migration, no auth, no
repository and no screen. Decision D-001 already settled the mechanism and a compatibility spike
proved it runs on this runtime.

## Desired end state

Two seeded accounts exist. Signing in from the browser sets a session cookie and lands on a screen
showing the account email, its subscriptions and a form to create one. A reload keeps the session;
signing out ends it and the old cookie is worthless. A second account asking for the first account's
subscription is told it does not exist, for reads and for writes alike.

## Key decisions made

| Decision | Choice | Why | Source |
|---|---|---|---|
| Auth mechanism | Better Auth on the same Worker and D1 binding | Proven by the compatibility spike; brings sessions, origin checks and rate limiting | Decision |
| Where ownership is enforced | In the repository's SQL, filtered by `user_id` | A route cannot forget a check it never makes | Plan |
| Foreign record response | 404, identical to a missing record | Absent and not-yours must be indistinguishable | Research |
| Rate-limit storage | The database, with its own table | The installed library defaults to per-isolate memory, which Workers does not keep | Research |
| Sign-in and sign-out | The library's own mounted endpoints, with no thin wrapper routes | Throttling, origin checking and CSRF live in the router, which only the mounted handler reaches | Review |
| Sign-in throttling numbers | A custom rule for the sign-in path | A built-in rule silently governs sign-in at three attempts in ten seconds and would make any assertion wrong | Review |
| Client address for throttling | Read from the runtime's own client-address header | Otherwise nothing resolves and every caller shares one bucket, so a few failures from anyone lock out both accounts | Review |
| Secure cookie control | One environment variable driving the per-cookie attribute | Per-cookie attributes override everything else, and the library-level switch also renames the cookie | Review |
| Auth schema | Hand-written migration, copied from the spike | The library's generator needs a live connection D1 cannot give a Node process | Decision |
| Account creation | An always-registered seed route that answers 404 unless a flag and a token both match | A route cannot be registered conditionally on a variable in this runtime, and 404 gives no oracle | Review |
| Test order | Test-first for identity and for ownership | Both risks fail silently, so the test has to fail first for the right reason | Plan |

## Scope

**In scope:** the two migrations, the auth module, session middleware, the mounted auth endpoints and
one identity route, the subscriptions repository and its four routes with validation, the gated seed
path, the login and home screens with a create form, and the continuous integration workflow.

**Out of scope:** members, prices, break months, payments, recurring schedules, any money
calculation, a multi-subscription interface, subscription deletion, password reset, email
verification, self-service sign-up, deployment, remote seeding, and the browser end-to-end test.

## Architecture / approach

One Worker, four layers with one direction of travel. Routes validate input and translate results into
status codes; the repository owns every SQL statement and filters each one by `user_id`; the auth
module builds a request-scoped library instance because a D1 binding only exists inside a request;
sign-in and sign-out are the library's own mounted endpoints, so throttling and origin checking are
structural rather than remembered; the client holds no session state of its own and asks the identity
route who is signed in, because the cookie is not readable from script. The ownership rule has exactly one enforcement point, so a leak
would have to be a bug in one file rather than an omission in any of several.

## Phases at a glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Identity | Migrations, auth module, session middleware, the mounted auth endpoints and an identity route, tested first | Throttling counters persist in a database no test resets, so test ordering and per-test client addresses matter |
| 2. The owned resource | Subscriptions table, repository, four routes, validation, ownership tested first | A leak that only shows up through a child path or a wrong status code |
| 3. Seeding the accounts | Gated idempotent seed route, decision D-005, documented setup | A seeding path is an account-creation hole if the gate is weak |
| 4. The first screens | Login, home, create form, sign-out, manual checklist | Safari refuses a Secure cookie over local http, so the environment variable exists and the checklist looks for it |
| 5. The gate | Continuous integration on push and pull request, evidence captured | The install must succeed non-interactively on a clean runner |

**Prerequisites:** the scaffold as committed, decision D-001, and a local `.dev.vars` carrying the auth
secret, the trusted origins and the seed gate. Effort is stated as five phases rather than a duration;
this repository does not record time estimates.

## Open risks and assumptions

- The suite shares one database with no isolation between tests, and the one reset helper would delete
  the tables because the local database is itself a durable object. Tests therefore use per-test
  account emails and per-test client addresses, and the throttling case runs last. A test that ignores
  this will fail in a way that reads like an ownership bug.
- Throttling is proven by the tests as a mechanism but not as per-caller keying, because the test pool
  supplies no client-address header of its own. Whether the deployed runtime always populates that
  header has not been exercised here.
- Safari refuses a `Secure` cookie over plain http even on localhost, while Chrome and Firefox accept
  it. The environment variable exists so local development can opt out; every deployed environment
  leaves it unset and keeps the attribute.
- The sign-in response body is the library's shape rather than one this project chose, which is the
  price of getting the router's protections by construction.

## Success criteria

- Two accounts can sign in, and one cannot see anything belonging to the other, proven by tests and
  by a browser walkthrough.
- A created subscription survives a reload and a fresh request.
- Signing out makes the previous session worthless.
