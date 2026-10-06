# Suite performance, round 2, 2026-09-14

Model: claude-fable-5-1.

The first round (`2026-09-14-suite-performance.md`) was measured on the
Mac. This round was explored and first measured on GitHub's 4-vCPU
`ubuntu-latest` runners while the Mac was busy, then measured definitively
on the Mac once it was free. Every branch here sits on top of
`perf-pkplib-ci`, that is `main` plus the pkp-lib installer patch applied
to `lib/pkp` before the run (the maintainer is taking that patch upstream
this week, so it counts as given). The goal was the OJS suite from about
22 minutes on CI to 15.

The short version: on an idle machine round 2 takes **29% off the OJS
suite at 4 workers** (563 → 402 s), 16% off OMP and 21% off OPS; the CI
runners could not show it, because the VM a run lands on moves the same
commit by ±15%, and the CI averages came out at −5%. Measure performance
locally; use CI for green or red.

**Decision (2026-09-14 evening):** the cheap seeded hashes, the session
endpoint and the six test-side commits are merged to `main`; the
persistent-connection change goes upstream with the installer PR as an
undocumented setting (its patch stays next to this report; the test
config already sets the key), the context cache is parked on
`perf-round2-n1`.

## The definitive numbers (the Mac, idle)

Fresh install before every run, `--retries=1` as on CI, the three pkp-lib
patches applied to the checkouts per condition and reverted after, the
profile reporter on. "Base" is `main` plus the installer patch;
"round 2" is `perf-round2` (its code plus the persistent-connection
patch); "+ cache" adds the context-cache patch (`perf-round2-n1`).

| suite | workers | base | round 2 | + cache |
|---|---|---|---|---|
| OJS | 4 (the CI regime) | 563 s | **402 s (−29%)** | 389 s (−31%) |
| OJS | 8 | 388 s* | 311 s (−20%) | 308 s (−21%) |
| OJS parallel project | 8 | 335 s span, 2,605 s summed | 262 s, 2,004 s (−23%) | 261 s, 1,951 s (−25%) |
| OMP | 8 | 328 s | 276 s (−16%) | — |
| OPS | 8 | 194 s | 154 s (−21%) | — |

\* The base run at 8 workers went red on U24 S14 in both attempts, so its
serial and solo projects did not run; 388 s is the measured 346 s plus the
43 s those projects took in the round-2 run. The parallel-project row is
the clean comparison at 8 workers. U24 S14 reads the base journal's
"Declined" count, deletes a submission and expects the count one lower,
while other tests decline submissions on the same journal in between
("4 Declined" for 1, then "3" for 4): a shared-count flake at 8 workers
that passes at 4 and on CI. It is on `main`, not on the branches, and
belongs in the flake queue.

Settled here too: **U21 is faster, not slower**, 206 → 113 s at 4 workers
(S3 67 → 5.6 s through `page.clock`, every other scenario 1–4 s quicker
from the cheaper sign-in), so the +13% CI reading was the VM. The
context-cache patch is worth a further 3% locally (dashboard load 883 →
826 ms), where Postgres round trips are cheap; on a runner with Postgres
in a service container it should be worth more.

## Each item alone (the Mac, OJS, 4 workers)

Seven more runs, each round-2 item on its own on top of the base, fresh
install every time, `--retries=1`. "Span" is the parallel project's wall,
"summed" the sum of the passed tests' durations (retried attempts
excluded); the percentage is against the mean of the two base runs (540 s
span). The afternoon runs (test-side, session, hashes) shared the machine
with a busy editor; the evening ones (persistent, cache, control) had it
quiet, and single runs here carry about ±5%.

| condition | wall | span | summed | vs base span |
|---|---|---|---|---|
| base, 16:25 (one flaky retry) | 627 s | 567 s | 1,915 s | |
| base control, 19:36 | 574 s | 513 s | 2,016 s | |
| persistent connection only | 469 s | 411 s | 1,624 s | **−24%** |
| cheap seeded hashes only | 512 s | 461 s | 1,816 s | **−15%** |
| context cache only | 541 s | 481 s | 1,896 s | −11% |
| test-side only | 545 s | 486 s | 1,908 s | −10% |
| session endpoint only | 548 s | 489 s | 1,925 s | −10% |

The items overlap, which is why they add up to far more than the combined
branch's −29%: the persistent connection cheapens every request, including
the seeding and sign-in requests the other three shorten. For picking:
the persistent connection is the biggest single item and the smallest
change (five lines in pkp-lib plus one config key); the cheap hashes are
second and purely harness-side; the context cache, the test-side commits
and the session endpoint are each worth about a tenth alone and share
ground. The single-lever branches are `perf-r2-session` and `perf-r2-hash`
(local), `perf-testside-ci`, and the base with one patch each.

## The new baseline against the persistent connection

After the decision, three more runs on the Mac (OJS, 4 workers, fresh
installs, the installer patch applied): `main` with items 1–3 merged,
the same plus the persistent-connection patch and `persistent = On`, and
the baseline again as a control.

| condition | wall |
|---|---|
| new baseline | 537 s |
| new baseline + persistent connection | **454 s (−15%)** |
| new baseline, control | 535 s |

The evening machine ran about 12% slower than at 15:00 (the same
combination measured 402 s then), so compare within this table only. The
patch is worth a sixth of the suite on top of everything merged; it goes
upstream with the installer PR as an undocumented setting.

## Everything in (2026-09-15)

Both pkp-lib changes were merged upstream on 2026-09-15 (`2eb00ced8` the
installer fix, `77b76d766` the persistent connection, documented in the
config templates by the team) and the app tips point at them, so from here
every run carries the whole of rounds 1 and 2.

| suite | workers | 13 Sep baseline | everything in | |
|---|---|---|---|---|
| OJS | 4 | 705 s | **423 s** | −40%, all green |
| OJS | 8 | 578 s | **328 s** (parallel span 282 s) | −43%, three retried flakes inside |
| OMP | 8 | 565 s | parallel project 408 s | see below |
| OPS | 8 | 253 s | parallel project 207 s | see below |

OMP and OPS went red locally on U40 S3 (the author's publication save
never posts) in both attempts, so their serial and solo projects did not
run and the table gives the parallel project's span; OJS's U40 S3 passes.
The same commits are green on CI, the test fails alone locally with the
persistent connection on and off alike, and the UI bundles were rebuilt
with the update, so the cause is a local difference (PHP 8.4 here, 8.3 on
the runner, is the first thing to check) and belongs to the maintenance
session, not to this round.

CI at the same tips, one dispatch sample (run 34949343760): OJS parallel
summed 3,468 s against yesterday's 4,237 / 4,264 / 3,402 s; OMP 16.2 min;
OPS 9.4 min; the OJS wall not comparable because U28 S10 failed both
attempts and skipped the tail.

## The CI numbers

Runner-to-runner variance decides how these read: the unchanged base
commit ran at 21.8, 22.4 and 17.1 minutes (summed test time 4,237 / 4,264
/ 3,402 s), and the round-2 commit at 17.0, 19.9, 19.5 and 18.2 minutes,
each pair of runs a uniform shift in every spec file. One sample cannot
resolve anything under about 20%, so the table gives every sample, and
the per-file ratio between two runs is the tool that separates a change
from a slow VM: a real change shows up in the files that exercise it, a
slow VM slows every file alike.

OJS, 4 workers, the Playwright step only (pre-test steps are under two
minutes and cached; they are not part of this round). "Summed" is the sum
of the parallel project's test durations.

| branch | suite wall | summed | what it adds |
|---|---|---|---|
| `perf-pkplib-ci` (the base) | 21.8 / 22.4 / 17.1 min | 4,237 / 4,264 / 3,402 s | the installer patch |
| `perf-testside-ci` | 17.9 min | 3,726 s (−12%) | the six test-side commits |
| `perf-ci-workers6` | 19.7 min | 5,236 s | 6 workers (per-test +23%, throughput up) |
| `perf-ci-persistent` | 20.6 min | 4,041 s (−5%) | pkp-lib patch: persistent PDO connection |
| `perf-auth` | 22.1 min | 4,289 s | session endpoint + cheap seeded hashes (see below) |
| `perf-ci-opcache` | 21.9 min | 4,246 s | opcache for `php -S`: nothing, dropped |
| **`perf-round2`** | **17.0 / 19.9 / 19.5 / 18.2 min** | **3,497 / 3,984 / 3,912 / 3,753 s** | test-side + auth + persistent |
| `perf-round2-n1` | 18.2 min | 3,667 s | round 2 + the context-cache patch |
| `perf-round2-w6` | 19.0 min | 5,201 s | round 2 at 6 workers |

OMP and OPS from the same runs, suite wall in minutes:

| branch | OMP | OPS |
|---|---|---|
| base | 19.6 / 15.2 / 19.3 | 10.2 / 10.1 / 10.3 |
| test-side | 19.3 | 10.7 |
| round 2 | 17.3 / 16.4 / 12.9 / 11.6 | 8.1 / 8.9 / 8.4 / 9.2 |
| round 2 + context cache | 15.9 | 8.5 |
| round 2, 6 workers | 15.7 | 9.1 |

Averaged over every sample, round 2's summed test time on CI is 3,786 s
against the base's 3,968 s, −4.6%, and its mean wall 18.7 minutes against
20.4. Per file (averaged the same way) the change is where the profile
said it would be, U27 0.84, U29 0.89, U49 and U04 0.90, U26 0.91, U24/U25
0.92, flat on the base-journal specs (U02, U05, U06, U28 at 1.00–1.02).
The within-run measurements are firmer than the cross-run ones: the
profile shows the prelude 780 → 640 s and the form sign-ins gone, and the
persistent connection is 10 ms of every request. Why the runner shows a
quarter of the Mac's gain is the runner itself: CPU-saturated, every
request three to four times slower, so the fixed waits the round removed
are a smaller share of a test there, and the VM lottery on top. The
15-minute mark on CI was not reached; on today's VMs the same commit lands
anywhere between 17 and 22 minutes.

## Where the runner's time goes

`perf-ci-profile` runs the step reporter and a per-request PHP profiler on
the runner and uploads both (`profile-<app>` artifacts). OJS, 213 tests in
the parallel project, 4,650 s summed:

- **Navigations 1,679 s (36%).** 884 page loads at 1.85 s average; the
  editorial dashboard alone is 278 loads at 2.65 s = 779 s (17% of the
  suite). A dashboard load is the page, the stylesheet through PHP, the
  i18n bundle, `_submissions/assigned`, `viewsCount` and two notification
  polls, all queued on the worker's single-threaded `php -S`.
- **Seeding and sign-in before the first browser action 780 s (17%).**
  162 context seeds at 2.5 s (1.13 s of it CPU, half of that bcrypt at cost
  12 for the seeded users), 335 submission seeds at 0.8 s, 238 form
  sign-ins at 0.5 s plus their login page, 500 profile probes.
- **Expects 1,202 s (26%)**: waiting for the UI after an action, which is
  the API calls behind it.
- **PHP: 13,211 requests, 3,165 s wall, 1,153 s CPU.** The floor per
  request is about 85 ms on the runner (35 ms on the Mac); the biggest
  single endpoint is `_submissions/assigned` at 525 × 818 ms = 430 s, which
  runs 1,055 SQL statements per dashboard load.

The runner is CPU-bound: 4 vCPUs shared by four PHP servers, four
Chromiums and the Playwright process. Every request costs three to four
times what it costs on an idle Mac, and cutting CPU anywhere is wall time
everywhere. That is also why 6 workers gain less than the Mac's 10 did.

## What was tried

### Kept on `perf-round2`

1. **The six test-side commits** from `perf/test-side` (the U21 autosave
   through `page.clock`, U27/U30/U21 reloads and duplicate navigations
   dropped, U23 S7 batched seeds, the rowCounts wait). Alone: OJS 22 → 17.9
   minutes on CI, the single biggest item of the round; U21 alone 206 →
   113 s on the Mac.
2. **`POST /api/v1/_test/session`** (`PKPTestController::session`): the
   app registers the session server-side and answers with the cookie, one
   request instead of the login page plus a bcrypt verify, or the
   three-request liveness probe of the old `.auth` cache. `auth.js` mints a
   state per call and keeps the form as the fallback; the cache, its probe
   and the `reset.js` wipe are gone; `users.md`, `patterns.md` and
   `harness.md` follow. On the runner: 335 mints at 208 ms, zero form
   sign-ins, the prelude 780 → 640 s.
3. **Seeded users hashed at bcrypt cost 4** (`UserSeeder.php`). A seeded
   user is a fixture; the app's cost 12 is 250–350 ms of CPU per user and
   some 400 users are seeded per OJS run. `password_verify` accepts any
   cost, and a real form login rehashes the row at cost 12 (Laravel's
   rehash-on-login), so U01/U02/U03 see the app's own behaviour. Context
   seed CPU on the runner 1,131 → 530 ms.
4. **pkp-lib patch: `[database] persistent = On`**
   (`docs/reports/2026-09-14-pkp-lib-persistent-db-connection.patch`, 5
   lines in `PKPContainer.php`, the test config sets the key). Every
   request opened a new Postgres connection, 16 ms on the Mac, more against
   a Docker service; with `php -S` one process serves one worker for the
   whole run, so the connection is reused. Trivial request 38 → 27 ms, the
   dashboard list 463 → 420 ms in isolation; on CI −5% summed in the
   single-lever run. Upstream shape: this restores the `persistent` switch
   OJS 3.3 had under ADOdb.

### Measured, not kept, or left to the maintainer

- **The context-cache patch**
  (`docs/reports/2026-09-14-pkp-lib-request-scoped-context-cache.patch`,
  on `perf-round2-n1`; 4 files, +123/−7). A request-scoped memo in
  `ContextDAO::getById()/getByPath()` (flushed by every write path) and
  the publication version string taken from the already-joined
  submission context instead of a submission fetch per row. The dashboard
  list drops from 1,055 to about 470 statements and the responses are
  byte-identical. On the Mac it is a further 3% on top of round 2 (OJS 4
  workers 402 → 389 s, the dashboard load 883 → 826 ms); the CI sample
  landed on a slow VM and showed nothing. Worth an upstream PR on its own
  merits; one caveat to state there: a long-lived CLI process (queue
  worker, scheduler) keeps the memo across jobs.
- **6 workers.** Wall −10% alone (19.7 vs 21.8/22.4) but +23% per test,
  and on round 2 it gained nothing (19.0 vs 17.0/19.9). More flakes under
  contention (OMP U21 S3, U41 S2). Not recommended for the runner.
- **opcache for `php -S`** (`opcache.enable_cli=1`): no gain on the runner
  either (21.9 min), and the round's flakiest OMP run. Dropped.
- **Emulated prepares** (`PDO::ATTR_EMULATE_PREPARES`): a trivial request
  38 → 6 ms in the sandbox, but the app errors under it. Dropped.

## What would reach 15 minutes

The harness and small-patch levers are measured and in; what is left is
test-side and structural, the maintainer's call. One fact frames all of
it: the runner's CPU is the bottleneck, and the VM a run lands on moves
the suite by ±15%, more than any single item below.

1. **Fewer editorial-dashboard loads.** 278 per OJS run at 2.65 s; 144 of
   them are followed straight by a click into a submission. A test that
   deep-links to the workflow page instead saves the list load and its
   four API calls, roughly 1.5 s each, about 200 s summed (5%) if every
   candidate is converted, without changing what the test asserts about
   the workflow page. The dashboard walks that are the test's subject stay.
2. **`PHP_CLI_SERVER_WORKERS=2..4`.** A page's eight requests would no
   longer queue on one PHP process. −7% on the Mac in round 1, but it
   exposes the five client-state races (U03 S2, U06 S2, U28 S10, U49
   S4/S6); the branch `perf/php-server-workers` keeps it opt-in. Once those
   five are fixed as flakes, this is the next harness lever.
3. **U28 S10 on the runner.** It failed its first attempt in six of the
   twelve OJS runs today (never on the Mac), costing a worker 1.4–1.7
   minutes each time, and it lands late enough to stretch the tail. A fix
   for that one test is worth a minute of wall time on its own.
4. **Test count.** The coverage-revision growth (173 → 222 OJS tests since
   2026-09-04) is the remaining multiplier; the earlier note on assertion
   redundancy stands.

## Method notes

- The definitive pass on the Mac: a driver that, per run, checks out the
  branch, mounts the overlays, reverts `lib/pkp`, applies the condition's
  patches, adds or removes `persistent = On` in the test config, resets the
  install and runs with the profile reporter; ten runs back to back, base
  and round 2 interleaved, 14:46–15:41 local (well clear of the midnight
  date window). The driver and the per-run `def4-*.jsonl`/`.log` profiles
  are in `.reports/perf-2026-09-13/` next to `definitive3.sh`; the
  single-lever pass is `definitive5.sh` there. Flakes there:
  U24 S14 (both attempts, base at 8 workers; one attempt in the two round-2
  8-worker runs) and OMP U01 S6 once (a workflow modal not appearing,
  passed on retry).
- A private sandbox for single-request work: a copy of `checkouts/ojs`
  without `.git` and `node_modules`, its own `*_test` database installed
  with `tools/installTest.php`, `php -S` on a free port, `POST
  _test/bootstrap` with the app context's `seed.bootstrap`. The shared
  checkout was never edited while other sessions ran suites on it.
- Per-run logs and profiles: `gh run view <id> --log`, artifacts
  `profile-<app>` from the `perf-ci-profile` branches; the comparison
  scripts (`ci-projects.py`, `ci-files.py`) in the job's tmp dir.
- Flakes seen: U28 S10 (OJS, most runs), OMP U21 S3/S5/S13/S16 (the
  wizard rail class), OMP U27 S9, OMP U03 S12, OMP U41 S2, OPS U01 S4;
  all pre-existing classes, none new to the branches.
