# Test suite principles

The contract every test-writing session follows, and the design record a
harness rebuild would start from. Paths are relative to the pkp-e2e repo
root. Test files cite these rules by ID (A8, D9, M1…), so the IDs are stable.

**Two terms.** A *scenario builder* is one of the PHP classes behind
`/api/v1/_test/*` (`PKPBootstrapSeeder`, `PKP*ScenarioBuilder`,
`ContextFactory` and their app subclasses). A *seed tag* is the unique
per-test token described in `patterns.md`.

**Scope.** Tests assert behavior through the screens, as the Frame
(`briefs/frame.md`) says: a test drives the UI as a signed-in
role, including navigating straight to a URL, and never asserts against a
request the application's own screens would not send. The `/api/v1/_test/*`
endpoints are harness plumbing for reaching a starting state (A4), never the
behavior under test.

## Architecture principles (A1–A9)

- **A1 — The isolation unit is the submission.** Tests create their own
  submissions through the scenario endpoint and never touch anyone else's.
  The base journal `publicknowledge` is read-only: no test changes its
  settings, sections, categories, issues, or the 18 seeded users. A test that
  needs journal-level changes creates a **scratch journal** with a unique
  path.
- **A2 — Scenario builders must be accurate.** A seeded scenario leaves the
  same database state, fires the same hooks, and produces the same
  notifications as a user doing the equivalent through the UI or REST API.
  Any builder change needs a parity entry in `docs/tracking/parity-ledger.md`
  before it merges.
- **A3 — Builders stay small.** Extend a builder only when several tests need
  the same state. A one-off state is reached by driving the UI in the test
  that needs it. The scenario schema should stay small enough to hold in your
  head. When in doubt, do not extend.
- **A4 — Seed through the endpoint, drive the UI only for the behavior under
  test.**
- **A5 — No hard-coded waits.** Use auto-waiting and web-first assertions. If
  an animation or debounce timer causes flakiness, shorten it at the source
  under test mode instead of sleeping. The harness already disables
  animations globally (`harness.md`).
- **A6 — Group assertions per scenario.** One seeded scenario can support
  several related assertions. Do not pay the seeding cost per assertion, and
  do not build mega-tests that hide which behavior failed. One coherent
  behavior per test.
- **A7 — Tests are independent.** Any order, parallel workers. No test depends
  on another or leaves state that affects one. A test that changes a shared
  singleton (site settings) restores it in the test. What cannot be isolated
  runs in the serial project with a note saying why. **Never enrol a shared
  seeded user in a new role.** Roles are global and leak into unrelated
  suites (this broke the build once). Use throwaway users for any
  role-changing probe.
- **A8 — Mailpit is shared** across workers and fleets, and this install has
  no Mailpit tags. The only real scoping is a unique throwaway recipient
  address that names the app and the test (`u53top-omp@mail.test`). The
  `contains` filter is a content marker, a supplement, never a substitute.
  Pair every negative assertion with a positive control taken the same
  way, which also bounds the wait. The full rules and the API are in `scenarios.md`.
- **A9 — Operations that scan globally run serially.** Scheduled tasks,
  site-level plugin toggles, site-settings changes, cache clears, queue
  drains: serial project only (`apps/<app>/playwright/tests/serial/`), which
  depends on the parallel projects and runs alone at the end.

## Organization

Tests are organized by feature: one spec file (or a small set) per feature,
named after the spec (`U<nn>-<feature>.spec.js`). The feature list and
scenario counts live in `docs/tracking/PROGRESS.md`. Placement: genuinely
app-agnostic infrastructure goes in `shared/playwright/`; every feature suite
goes in its own app's `apps/<app>/playwright/tests/`. Folders stay flat until
25 to 30 spec files make natural clusters obvious.

## Multi-app conventions (M1–M6)

What gets tested per app is decided by the RUNBOOK's multi-app rules. These
are the authoring conventions:

- **M1 — Per-app suites, derived from the spec.** The spec lists common
  scenarios first, then app-specific ones. Each app's suite implements every
  common scenario in that app's own context (its roles, users, stages and
  vocabulary, not an OJS transplant) plus its own specifics, in that app's
  tree. Duplication between app suites is acceptable: the spec is the
  maintained artifact, so do not build sharing machinery. A test may name its
  own app's seeded users and stages directly.
- **M2 — The shared tree gates on capabilities, never on app names.** Code
  under `shared/playwright/` uses `appContext.hasReviewStage` and the like,
  and resolves personas through `appContext.seed.actors` (archetype to
  username, or null). Capability names are canonical in GLOSSARY Part II
  section 2 (`docs/specs/GLOSSARY.md`): add the glossary row first, then the
  same key in all three `app.context.js` files.
- **M3 — Never write a test that asserts a 🐞 finding** (that freezes the
  defect as the contract), and **never a test that demonstrates a potential
  security concern**. These repos are public; the finding goes to the
  private security repo (RUNBOOK "What goes where") and the suite stays
  silent until the fix ships. A claim parked on an open ❓ is not a coverage
  gap. Each suite's file header says what it deliberately does not cover.
- **M4 — Absence tests** assert that the surface is not offered AND pair
  every negative with a positive control taken the same way. An absence
  assertion against an asynchronously filtered list must be bounded by that
  filter's own response.
- **M5 — Attribute failures by the seed tag** carried in the test's own data,
  never by row id. Parallel writers make ids unstable.
- **M6 — Breadth is the spec's decision, depth is the test's.** A suite
  implements the spec's scenarios and invents none; a state without a
  scenario is recorded under the spec's Coverage "Left out" list, not
  covered by a test on the author's initiative. Inside a scenario the test goes deep:
  every absence claim is asserted with a settled, auto-waited read and a
  positive control; every "nothing happens" is bounded by the response or
  mail that would have carried the effect; the other side's effect is
  read. A contradiction with the spec is a finding (RUNBOOK step 8), never
  a skipped assertion.

## Scenario-endpoint design record (D1–D9)

The implementation may be rebuilt from scratch. These decisions must survive
any rebuild; each was earned by a concrete failure. D6 and D7 deliberately
repeat facts documented elsewhere, so that this section stands alone if
everything else is scratched.

- **D1 — A test-only API namespace** (`/api/v1/_test/*`) gated by a
  shared-secret header whose key comes from the *environment*: never a config
  default, never present in production. The key must actually reach PHP's
  environment under the server manager in use. This silently failed once and
  broke all seeding.
- **D2 — Declarative, end-state scenarios.** A seed request describes the
  state the test needs, and the builder walks the application to it. Tests
  never script the journey to their starting point.
- **D3 — Builders call the real application services**: the same
  repositories, hooks, mails and notifications the UI path uses, never
  hand-mirrored side effects. A mirrored `publish()` once normalized away a
  real cross-app permission difference; mirrored submissions lacked the
  notification rows real ones create. Any deliberate deviation gets a parity
  entry reviewed before merge.
- **D4 — Failure hygiene.** A failed build must not leave half-created state
  (roll back, or tag it as an orphan). An unsupported spec key must throw,
  never be silently dropped. A silently ignored reviewer block once cost a
  real investigation.
- **D5 — Cross-app schema.** An app-neutral core (`context`, not `journal`)
  with app-specific concepts as declared overlay properties. Shared builder
  code touches an app-only service only when gated on that app's overlay
  key, and never hard-codes a workflow stage id (a hard-coded initial stage
  once made every seeded OPS submission invisible). Per-app subclasses own
  the specifics.
- **D6 — Identity roster.** Role-keyed usernames (`manager.maya`,
  `editor.diana`, …), a deterministic password rule (the username doubled;
  mind the client-side maxlength on login), and one archetype map per app
  resolving archetype to username or null.
- **D7 — Harness facts worth keeping.** A per-user storage-state auth cache
  with a liveness probe; an `asUser()` fixture; a config factory
  parameterized by base port so fleets run side by side with per-worker port
  offsets; Postgres test databases (Postgres strictness reproduces defects
  MySQL hides); a reset tool that forces a cold bootstrap.
- **D8 — Database-driver agnostic.** Harness code runs against all supported
  databases: app services and the query builder only, no raw driver-specific
  SQL. The single permitted driver dispatch is the reset tool's
  drop-and-recreate step. The local fleets choose Postgres; nothing may
  depend on it.
- **D9 — Never reach a state by editing the running configuration.** A
  config-dependent state (an expired invitation, a lapsed subscription) gets
  a schema key that produces it for that one entity. Editing
  `config.test.inc.php` mid-run is global across workers and fleets. Where
  the app offers no service call (it only stamps expiry forward), the builder
  may write the stored value directly, but the window stays the
  application's: read back what the app wrote and shift from there, so the
  seed still means "expired" when the configured window changes.
  A config-dependent behavior with no per-entity switch at all (email
  validation, the spam checks) is tested against the fixed
  validation-variant server described in `harness.md`, never by editing
  config.

Per-feature scenario keys are documented as they land in `scenarios.md`, with
their parity rationale in `docs/tracking/parity-ledger.md`.

## Bootstrap data policy

The base seed is `apps/<app>/playwright/fixtures/bootstrap.js`: the journal
`publicknowledge`, 18 users, sections, categories and issues, documented in
`users.md`. The base context keeps the install defaults, and every shipped
spec was verified against them. The configured half of a feature is
covered on scratch contexts: each setting a spec lists is probed at both
ends, and its non-default end is a classed Coverage row that gets a
scenario when a user meets it in ordinary use (TEMPLATE "Coverage"), seeded through
the scenario API's passthrough keys (scenarios.md "Configuring a scratch
context"), never by driving a settings screen in a test. A bootstrap change, should one ever be needed,
requires checking every implemented spec against the new defaults,
deliberately, not casually.
