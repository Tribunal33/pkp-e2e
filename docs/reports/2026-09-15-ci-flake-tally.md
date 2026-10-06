# CI flake tally, 2026-08-24 .. 2026-09-15

Model: claude-fable-5-1.

Produced for the 2026-09-15 flake investigation
(`2026-09-15-flake-investigation.md`) from `gh run list` / `gh run view
--log` over jardakotesovec/pkp-e2e and the pkp/ojs, pkp/omp, pkp/ops thin
hooks. The per-run listings were dropped from this copy; the raw logs
and the full tables were session scratch.

## Method

- Sources: `gh run list` / `gh run view --log` on jardakotesovec/pkp-e2e (workflow `e2e`: 3 jobs ojs/omp/ops per run, apps at the pkp/<app> `main` tip at run time) and on pkp/ojs, pkp/omp, pkp/ops (workflow `e2e`, the thin hook calling run-app.yml; 1 job per run). All four repos answered through the authenticated `gh` CLI; no fallback needed. Cancelled runs (superseded pushes) and one still-running run were not inspected; one failed run's log was already gone (pkp-e2e 34827806598, perf-ci-profile).
- CI runs `npx playwright test --retries=1` with the `list` reporter, so the log shows the first attempt (`✘`) and the retry (`✓ … (retry #1)` or `✘ … (retry #1)`).
- **flaky** = failed the first attempt, passed the retry; the job stays green. Direct evidence of non-determinism and the primary ranking key.
- **failed** = both attempts failed (job red). A failed incident counts as **intermittent** only when the job had ≤3 failed tests AND either the same repo re-ran the same head SHA green later, or the same test passed in another completed job of the same repo + branch + app both before and after it within ±36 h. Anything else is treated as a probable regression at that ref (every push is a new SHA, so consecutive reds across SHAs are consistent with a regression; red jobs are bimodal: 61 had 1–3 failed tests, 85 had 4+).
- **(exp)** = pkp-e2e run on a non-main branch (the 2026-09-14 `perf-*` experiments with patched pkp-lib, or a companion branch). Counted, shown separately.
- Side effect: the serial/solo projects depend on the parallel project, so one test failing both attempts also leaves 9–12 tests "did not run" in that job.

## Runs inspected

| repo | listed | inspected (logs read) | success | failure | skipped (cancelled / in progress / log gone) |
|---|---|---|---|---|---|
| jardakotesovec/pkp-e2e | 162 | 128 | 95 | 33 | 34 |
| pkp/ojs | 172 | 137 | 90 | 47 | 35 |
| pkp/omp | 60 | 51 | 31 | 20 | 9 |
| pkp/ops | 51 | 49 | 35 | 14 | 2 |

Jobs (app suites) inspected: 621, of which 613 printed a Playwright summary (ojs 263, omp 176, ops 174). 114 red runs; 121 green runs carried at least one flaky test.

## Base rate: how often a completed job carries a flaky test

| app | completed jobs | jobs with ≥1 flaky | share | flaky incidents | red jobs | red, isolated (≤3 failed) | red, cluster (4+) |
|---|---|---|---|---|---|---|---|
| ojs | 263 | 100 | 38% | 119 | 70 | 36 | 34 |
| omp | 176 | 73 | 41% | 92 | 42 | 12 | 30 |
| ops | 174 | 16 | 9% | 16 | 34 | 13 | 21 |

By week (1 = 08-24..08-31, 2 = 09-01..09-07, 3 = 09-08..09-15): ojs 31% → 37% → 43% of jobs with a flaky; omp 23% → 40% → 57%; ops 6% → 13% → 8%. The trend is up; week 3 for omp is inflated by the 09-14 perf-branch runs but main-branch runs show the same direction.

## Ranked: tests by flake score (flaky + intermittent failed), top 32

`flaky (non-exp)` = flaky incidents, with the count outside pkp-e2e experiment branches in parentheses. `determ. failed` = red incidents with no flake signal (regression-period noise; the U21 rows carry the 2026-09-01 A11 affiliation regression, the U27 rows the late-August pkp-lib#13003 breakage).

| # | app | spec | scenario | flaky (non-exp) | interm. failed | determ. failed | first..last flake | dominant error |
|---|---|---|---|---|---|---|---|---|
| 1 | ojs | U28-reviewers-review | reviewer's review › S10: one-click access | 23 (15) | 1 | 0 | 09-06..09-15 | expect(locator).toHaveAttribute(expected) failed |
| 2 | omp | U40-publication-metadata | Publication metadata (U40) › S4: editing a published version warns and reaches readers | 22 (20) | 0 | 8 | 08-29..09-15 | expect(locator).toBeVisible() failed |
| 3 | ojs | U21-submission-wizard | submission wizard › S3: save for later and resume | 11 (11) | 0 | 11 | 08-26..09-04 | expect(locator).toBeVisible() failed |
| 4 | omp | U27-reviewer-assignment | Reviewer assignment & management (U27) › S9: read, rate, mark complete, thank | 8 (6) | 1 | 8 | 09-04..09-14 | locator.check: Clicking the checkbox did not change its state |
| 5 | ojs | U21-submission-wizard | submission wizard › S13: suggest reviewers when asked | 8 (8) | 0 | 10 | 08-27..09-10 | expect(locator).toContainText(expected) failed |
| 6 | ojs | U30-author-response-to-reviews | author response to reviews › S4: revisions requested — the card without a request, and the co-author responds | 8 (7) | 0 | 1 | 09-06..09-13 | Test timeout of 180000ms exceeded (4×), toBeVisible (4×) |
| 7 | omp | U21-submission-wizard | Submission wizard (U21) › S2: fill every step and submit; the acknowledgement arrives | 7 (6) | 0 | 12 | 08-26..09-14 | expect(locator).toContainText(expected) failed |
| 8 | ops | U21-submission-wizard | Submission wizard (U21) › S3: save for later and resume from the emailed link | 6 (6) | 0 | 9 | 08-26..09-11 | expect(locator).toBeVisible() failed |
| 9 | ojs | U21-submission-wizard | submission wizard › S8: a draft outlives the closing | 6 (5) | 0 | 11 | 08-26..09-02 | expect(locator).toContainText(expected) failed |
| 10 | omp | U21-submission-wizard | Submission wizard (U21) › S17: required metadata blocks the submit | 6 (5) | 0 | 0 | 09-08..09-14 | expect(locator).toContainText(expected) failed |
| 11 | omp | U21-submission-wizard | Submission wizard (U21) › S3: save for later and resume from the emailed link | 5 (2) | 0 | 11 | 09-02..09-14 | expect(locator).toBeVisible() failed |
| 12 | ojs | U28-reviewers-review | reviewer's review › S5: save a review for later | 5 (4) | 0 | 1 | 09-09..09-12 | expect(locator).toBeVisible() failed |
| 13 | omp | U21-submission-wizard | Submission wizard (U21) › S10: all contributors are acknowledged | 4 (3) | 1 | 11 | 08-27..09-14 | expect(locator).toContainText(expected) failed |
| 14 | ojs | U21-submission-wizard | submission wizard › S12: closed and restricted sections | 4 (3) | 1 | 10 | 09-08..09-12 | expect(locator).toContainText(expected) failed |
| 15 | ojs | U21-submission-wizard | submission wizard › S6: validation blocks an empty submission | 4 (4) | 0 | 11 | 08-27..09-10 | expect(locator).toContainText(expected) failed |
| 16 | ojs | U49-publish-schedule-and-versions | publish, schedule & versions › S11: schedule into a future issue | 4 (4) | 0 | 12 | 08-29..08-31 | expect(locator).toBeChecked() failed |
| 17 | ojs | U01-login-and-sessions | login & sessions › S6: forced password change at first sign-in | 4 (4) | 0 | 10 | 08-30..09-11 | expect(locator).toBeVisible() failed |
| 18 | ojs | U21-submission-wizard | submission wizard › S10: all contributors are acknowledged | 3 (3) | 1 | 12 | 08-26..09-12 | expect(locator).toContainText(expected) failed |
| 19 | ops | U22-my-submissions | my submissions › S2: resume drafts and the deletion flow up to its confirm dialog | 3 (3) | 1 | 9 | 08-29..09-14 | expect(locator).toBeVisible() failed |
| 20 | omp | U21-submission-wizard | Submission wizard (U21) › S8: a draft outlives the closing and still submits | 3 (3) | 0 | 10 | 08-26..09-07 | expect(locator).toContainText(expected) failed |
| 21 | omp | U21-submission-wizard | Submission wizard (U21) › S14: submit a monograph or an edited volume (OMP1) | 3 (3) | 0 | 11 | 08-26..09-13 | expect(locator).toContainText(expected) failed |
| 22 | ojs | U21-submission-wizard | submission wizard › S2: fill every step and submit @smoke | 3 (3) | 0 | 11 | 08-27..09-02 | expect(locator).toContainText(expected) failed |
| 23 | ojs | U21-submission-wizard | submission wizard › S11: editors learn of the new submission | 3 (2) | 0 | 11 | 08-27..09-10 | expect(locator).toContainText(expected) failed |
| 24 | ojs | U04-orcid-integration | ORCID integration › S9: a completed review is sent to ORCID from the reviewer row | 3 (2) | 0 | 10 | 08-31..09-14 | Test timeout of 180000ms exceeded |
| 25 | omp | U05-notifications-center-and-email-preferences | S4: ticking "Do not send me an email…" keeps the task, stops the email | 3 (3) | 0 | 0 | 09-07..09-14 | expect(locator).toContainText(expected) failed |
| 26 | ops | U41-contributors-and-affiliations | Contributors & affiliations (U41) › S2: reorder and preview the display formats | 2 (2) | 1 | 7 | 08-29..09-10 | expect(locator).toContainText(expected) failed |
| 27 | shared | login (smoke) | login smoke › each seeded persona signs in and reaches a signed-in screen | 2 (2) | 1 | 0 | 08-31..09-13 | apiRequestContext.get: socket hang up / ERR_CONNECTION_REFUSED |
| 28 | omp | U01-login-and-sessions | Login & sessions (U1) › S7: administrator impersonates a user and returns | 2 (2) | 0 | 2 | 08-26..09-11 | expect(locator).toBeVisible() failed |
| 29 | omp | U21-submission-wizard | Submission wizard (U21) › S1: start a submission from the dashboard sidebar | 2 (2) | 0 | 12 | 09-08..09-14 | expect(locator).toContainText(expected) failed |
| 30 | omp | U21-submission-wizard | Submission wizard (U21) › S13: the Reviewer Suggestions step appears when the press asks for it | 2 (1) | 0 | 11 | 09-10..09-14 | expect(locator).toContainText(expected) failed |
| 31 | ojs | U26-review-stage-and-rounds | review stage & rounds › S12: author reads an open review | 2 (2) | 0 | 11 | 08-26..08-27 | expect(locator).toBeVisible() failed |
| 32 | ojs | U26-review-stage-and-rounds | review stage & rounds › S7: cancel a round | 2 (2) | 0 | 10 | 08-27..08-27 | expect(locator).toBeVisible() failed |

47 more tests have exactly 1 flaky or intermittent incident (full list in the detailed section). 79 tests carry a flake signal in total; 367 distinct tests failed at least once in the window (the rest are regression-period reds only).

## Flake classes by error signature (flaky + intermittent incidents, all tests)

| error class | incidents | distinct tests | notes |
|---|---|---|---|
| assertion: toContainText / toHaveText | 97 | 36 | dominated by U21 submission wizard on all three apps (step text after Continue/Save), plus U05 notifications |
| assertion: toBeVisible | 70 | 21 | U40 S4 (omp), U21 S3 (ojs/omp/ops), U28 S5, U01 S6, U22 S2 |
| assertion: toHaveAttribute | 24 | 1 | one test: ojs U28 S10 one-click access, most runs since 2026-09-06 |
| test timeout (180 s / 240 s) | 12 | 7 | U30 S4, U04 S1/S9 (ORCID), U27 S10, U01 S6 |
| action timeout (locator.check / click) | 10 | 2 | omp U27 S9 "Clicking the checkbox did not change its state"; ops U21 S11 |
| no error line captured | 9 | 7 | listing entry without an `Error:` line within the grep window |
| assertion: toBeChecked (state) | 4 | 1 | ojs U49 S11 (08-29..08-31) |
| server: ERR_CONNECTION_REFUSED (php -S down) | 4 | 4 | omp U01 S5, ops U01 S4, ops U04 S1, shared login smoke |
| server: empty response / socket hang up | 3 | 2 | ops U01 scenario, shared login smoke (09-13 main, failed both attempts) |
| assertion: toHaveCount | 3 | 3 | ojs U01 S7, U03 S12, U23 S9 |

Reading: infrastructure-shaped flakes (server refused / hung up, runner shutdown) are a small minority (~7 incidents plus one runner shutdown on the 09-13 nightly). The bulk is application-state timing, concentrated in the submission wizard (U21, 20+ scenarios across three apps) and two single hot spots (ojs U28 S10: 23 flakes in 9 days; omp U40 S4: 22 flakes in 17 days).

## Jobs red for infrastructure / setup reasons (no test failure)

| date | repo | run | app | failed step | evidence |
|---|---|---|---|---|---|
| 08-25 18:13 | pkp-e2e | 32882490231 | ops | Install PHP dependencies | exit 1 (first standalone rewire) |
| 08-25 18:28 | pkp-e2e | 32883958543 | ojs, omp, ops | Run Playwright suite | exit 1 with no test lines (early harness) |
| 08-25 18:29 | omp | 32884098188 | omp | Run Playwright suite | exit 1 with no test lines (early harness) |
| 09-13 03:32 | pkp-e2e | 34735761717 | ojs, omp, ops | (nightly) | "The runner has received a shutdown signal" ~10 min in; all three jobs cancelled; run marked failure |

## Probable regressions (red clusters, no flake signal), for context

Late August was a cascade, not flake: omp/ojs U27 + U26 + U23 + U25 (08-26..09-02, pkp-lib#13003 batch-loading branches and the main pushes carrying them; 150–208 incidents per spec), U43 funding on all three apps (08-29..09-01), U49/U40/U41 on omp/ops main (08-29..09-01), ojs U04 ORCID (08-27..09-02, one test failing every push for 5 days = deterministic), ojs U01/U21/U23/U40/U41 on 09-01..09-02 (the A11 `Author::getAffiliations` null regression: 106 failed per job), and the i13109 branches on 09-07..09-10. Grouped table in the detailed section.

