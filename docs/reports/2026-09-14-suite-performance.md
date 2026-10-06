# Suite performance research, 2026-09-13/14

Model: claude-fable-5-1.

One night of measured experiments on this Mac (10 cores: 8 performance, 2
efficiency; Postgres 15; PHP 8.4), every full run on a freshly reset
install, the OJS suite as the yardstick (the longest, the one CI waits
for). Each idea lives on its own `perf/*` branch; `perf/combined` carries
the kept harness changes and `perf/test-side` adds the test-level ones on
top. Numbers are wall-clock seconds of the whole `npx playwright test` run
unless stated.

## The definitive numbers

All runs on this machine, fresh install before each, every run green
(the earlier failing passes are in the flake notes):

| suite | workers | before (main) | `perf/combined` | `perf/test-side` |
|---|---|---|---|---|
| OJS | 8 | 578 s | 396 s (−31%) | 387 s (−33%) |
| OJS | 4 (the CI regime) | 705 s | 574 s (−19%) | 557 s (−21%) |
| OMP | 8 | 565 s (the U15 final, same day) | 342 s (−39%) | — |
| OPS | 8 | 253 s (the U15 final, same day) | 188 s (−26%) | — |

The OJS 8-worker time splits into the parallel project (327 s), the serial
project on 4 workers (32 s) and the solo project (24 s). The baseline's
split was 427 s + 141 s.

GitHub Actions (ubuntu-latest, 4 workers, the branch pushed as
`perf-combined`; "before" is the last `main` run the same evening):

| app | main | perf/combined | change |
|---|---|---|---|
| OJS | 28.6 min | 23.9 min | −16% |
| OMP | 17.9 min | 19.5 min, 1 failure (known U21 wizard-press class, ci-triage), serial tail not run | n/a |
| OPS | 11.2 min | 8.2 min | −27% |

Nothing in the branches is specific to this machine: the changes are
harness code and one upstream fix, and CI runs the same config factory.
The 50% target was not reached at 8 workers; the honest ceiling with what
is safe tonight is around −35% locally and −20% on the 4-vCPU runners,
with the remaining levers listed at the end.

## Where the time went (baseline profile)

A custom reporter recorded every Playwright step of the baseline run
(222 tests, 8 workers, 578 s):

| bucket | summed seconds | share |
|---|---|---|
| all tests, summed | 3,472 | 100% |
| test-API POSTs (seeding) | 1,309 | 37% |
| `expect` waits | 777 | 22% |
| `page.goto` | 642 | 18% |
| clicks | 360 | 10% |
| serial project (1 worker, after everything else) | 141 wall | 24% of wall |

Worker utilisation in the parallel project was 97%, so wall time is summed
test time divided by eight, plus the serial tail. Two things stood out.

**1. Scratch-context seeding was serialized across the fleet.** A context
seed took 2.1 s alone but 7.4 s on average under load, and eight concurrent
seeds finished exactly 2.2 s apart. Cause: `PKPContextService::add()`
resequences every journal row (`UPDATE journals SET seq …`, one statement
per row) before it installs the defaults, and the `_test` controller wraps
the whole build in one transaction, so those row locks were held for the
whole ~2 s build and every other worker's seed queued behind it. 159 seeds
per run waited 1,182 s in total.

**2. The serial project ran 13 tests one at a time**, 141 s for 4% of the
work, while 7 workers idled.

## What was tried

| branch | change | OJS wall, 8 workers | kept |
|---|---|---|---|
| main | baseline | 578 s | — |
| `perf/seed-lock-window` | the context row is created in autocommit mode; the transaction resumes for the rest of the build | parallel part 427 → 355 s | yes |
| `perf/serial-workers` | serial project on 4 workers; `runJobs()` waits for the queue | 398 s | yes, reworked (below) |
| `perf/php-jit` | opcache + tracing JIT for the `php -S` servers | 399 s | no gain, dropped |
| (DB setting) | `synchronous_commit = off` on the test DB | parallel part 379 vs 348 s | slower, dropped |
| (checkout) | upstream pkp-lib fix, user-group installer (below) | 389 s | upstream PR; CI-regime effect below |
| `perf/static-cache` | per-worker memory cache of static files via `context.route` | 379 s, 7 failures, node CPU doubled | dropped |
| `perf/php-server-workers` | `PHP_CLI_SERVER_WORKERS=4` per server | parallel part 324 s (−7%), 5 tests fail | opt-in only, see below |
| (workers) | 10 Playwright workers instead of the 8 P-cores | parallel part 312 vs 328 s | local tuning only, not applied |
| `perf/combined` | seed lock + serial/solo projects + drain wait + HTTP sign-in | 396 s | the deliverable |
| `perf/test-side` | + U21 S3 autosave clock, U27/U30 reload removals, U23 S7 batched seeds, U29 page-object hardening | 387 s | for the maintainer's pick |

Run-to-run noise on the parallel project is about ±5 s (three runs of one
configuration: 347.5, 350.2, 345.8 s).

### Kept, with the evidence

- **Seed lock window** (`shared/php/classes/testing/PKPContextScenarioBuilder.php`).
  The parse phase already refuses every spec error before the first write,
  so creating the context outside the transaction costs the rollback only
  for an unexpected failure inside the core service. Eight concurrent seeds
  now all finish in 2.4 s.
- **Serial project on 4 workers, plus a `solo` project** (`config-factory.js`).
  The serial project's contract is "after the parallel project" (patterns.md
  lesson 7), not "one test at a time": its specs seed their own scratch
  contexts and the queue's pop is `FOR UPDATE SKIP LOCKED`. Two things had
  to follow. First, `runJobs()` now waits until the queue is empty,
  reserved jobs included, through a new `GET _test/jobs` (the jobs tool's
  `total` and `list` count unreserved jobs only, and a job released with a
  retry delay is not waited for). Second, a test that asserts "still
  nothing, until the jobs run" cannot share the queue with other tests'
  drains at all: U15 S5 and U04 S4 in every app carry `@solo` in their
  title and run alone in `<app>-solo` after the serial project. Eight
  serial workers were slower than four (13 tests, 259 s summed against
  120 s: the runners contend).
- **HTTP sign-in for the auth cache** (`shared/playwright/support/auth.js`).
  The login page for the CSRF token, then the form post, cookies taken as
  the storage state; the browser login stays as the fallback. Profile said
  272 login-page navigations and 189 s of sign-in clicks per OJS run; the
  measured gain on three login-heavy specs was only 61.6 → 59.6 s, so this
  is a small, harmless one.

### Dropped, with the evidence

- **opcache / JIT.** `php -S` is the CLI SAPI, where opcache is off by
  default. Turning it on changed nothing measurable (PHP 8.4 compiles this
  code base fast enough); the JIT took a context seed from 2.3 to 2.1 s in
  isolation and the suite from 398.5 to 398.6 s.
- **`synchronous_commit = off`.** Seeds 2.3 → 2.1 s alone, the suite
  slower. The DB is not the bottleneck: Postgres was active for 180 s of a
  whole run (`pg_stat_database.active_time`) against 868 s of PHP CPU and
  1,983 s of PHP wall.
- **Static-file cache.** Every fresh context re-downloads the bundles,
  styles and fonts through the worker's single-threaded `php -S` (70% of
  requests by count). Serving repeats from a per-worker memory map via
  `context.route` cut the requests (211 → 131 for one spec) but the route
  hop through the driver cost more than it saved, and seven tests failed on
  the changed asset timing.
- **PHP request workers.** The biggest remaining lever on paper: a page's
  document and its API burst stop queuing on one process; two specs on one
  worker 58 → 43 s, the parallel project 346 → 324 s. But five tests fail
  even when run alone with it (U03 S2 lost rename, U06 S2 invitation
  acceptance, U28 S10 one-click access, U49 S4/S6 the new-version dialog's
  preselected stage), all passing with one worker, and the set is
  intermittent (U03 S2 passed once alone). For U49 S4 the passing and
  failing traces show the same request order, so the race sits in the
  workflow page's client state, not the server (traces kept in
  `.reports/perf-2026-09-13/`). Concurrent requests inside one
  session expose ordering or last-writer-wins races, in the app or in the
  tests. Production serves concurrent requests, so these deserve a look on
  their own; the branch keeps the variable as an opt-in switch. It is also
  a cheap way to shake out app concurrency bugs.

## OJS-side findings (upstream candidates, smallest first)

1. **`UserGroup\Repository::installSettings()` is quadratic.** For each of
   the 18 default groups it calls `installLocale()` per installed locale,
   which loads and re-saves every group of the context so far: 342 saves
   instead of 36, 9,853 SQL statements per journal creation (612 updates and
   837 exists-checks on `user_group_settings` alone). Moving the two
   `installLocale()` calls after the loop takes a scratch-context seed from
   2.66 s to 0.76 s in isolation; the same code runs when an admin creates a
   journal, press or server. Patch: `2026-09-14-pkp-lib-usergroup-installSettings.patch` next to this
   report (10 lines). On this 10-core machine the
   8-worker suite barely moved with it (CPU headroom); at 4 workers, the CI
   regime: parallel project 480 s against 507 s without it, the same failure set (−5%).
2. **`_submissions/assigned` issues ~1,055 statements for 20 rows** (358 ms
   average under load, 488 calls per run). Two N+1 shapes: URL building
   through `Dispatcher::url` → `PKPPageRouter::_getContextAndLocales()`
   loads the journal by path five times per submission (101 loads per
   call), and `Publication\DAO::fromRow` → `Repository::getVersionString()`
   loads the whole journal per publication to compute a version string (54
   loads). A request-scoped memo removed 30% of the statements but did not
   change the call's wall time on this machine (15 ms of it is DB; the
   statement stream is evenly spread over 370 ms of PHP), so the fix is
   hygiene rather than a measured win here.
3. **`login/signIn` is 390 ms** of which ~280 ms CPU (password hashing and
   the session rotation); expected, listed for completeness.

## Test-side changes on `perf/test-side` (the maintainer's pick)

Built from the redundancy audit, each its own commit, every spec title,
assertion and test boundary untouched:

- **U21 S3** hands the wizard its autosave minute through `page.clock`
  instead of idling on the app's 60 s clock: 70 → 11 s in OJS, the same in
  OMP and OPS.
- **U27** reads the Reviewers panel straight after the Add Reviewer window
  closes at the 8 post-add sites (U31 shows the panel updates live);
  the reload that is itself the assertion and the cross-context refetches
  stay.
- **U30** drops the three `reload()` right before a `gotoEditorial()` to
  the same address.
- **U21** drops two navigations to a settings page the tab already shows.
- **U23 S7** seeds its 28 filler submissions in batches of four, first and
  last still serial (small gain: the worker's server is single-threaded).
- **`ReviewFormsList.rowCounts()`** waits for the row's cell before reading
  it (flaked once tonight).

Not changed, for the maintainer to decide (audit evidence in the session):
the byte-identical cross-app tests on pure lib/pkp screens (U03 S3/S4/S5/S8/S9
and U04 S1/S2/S3: 102 s of OMP, 62 s of OPS), the within-file repeats
(U30 S2⊕S3, U26 S2⊕S15, U29 S6⊕S8, U27 S14⊕S16, U21 S8⊂S7, ~60 s
summed), and the six review-state set-ups walked through the UI that
`createSubmission` seeds (~45 s summed). Merging tests would change the
`S<n>` mapping, so none of that was touched.

## Flake classes seen tonight

- **Local midnight.** The app clock is UTC, the tests' is local: between
  00:00 and 02:00 CEST every "today + N weeks" due-date assertion (U27 S1,
  S7, S8, S12, S20; U28 S10; U29 S1, in OJS and OMP) is a day off. CI runs
  in UTC and never sees it; night runs here do.
- U29 S4 (guidelines typed by the manager missing for the reviewer), U29
  S7 (`rowCounts()` on a half-drawn row, hardened on `perf/test-side`),
  U29 S9 and U23 S9 (green alone) failed once each under load.

## What would get closer to 50%

In order of expected yield at 8 workers, all needing a decision or work
beyond a night:

1. The five request-workers races (−22 s once fixed, and a cleaner app).
2. The cross-app identical tests and the within-file repeats (~30 s).
3. The `_solo` tests' "not until the jobs run" controls: if the spec can
   live without them, the two tests rejoin the serial project (−25 s tail).
4. 10 workers on this machine (−16 s, a local heuristic).
5. Upstream: the installer fix for every seed, and the N+1s in the
   dashboard list.
