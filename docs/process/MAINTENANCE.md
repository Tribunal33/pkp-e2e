# Maintenance: the resident QA agent

The MAINTENANCE session is a long-running agent on a VM (run through
claude-threads) that acts as the PKP team's QA specialist for the e2e suite
and talks to the team on Mattermost. It adds to the RUNBOOK loop, never
replaces it, and is active when the PROGRESS banner says so.

The work is split between two scheduled sessions a weekday, each with its
own list: the **upstream session** keeps the suite in step with what the
team ships, the **housekeeping session** works the campaign's own backlog
(incidentals, friction, flakes, stale artifacts). A session does its own
list only; work it finds for the other one goes as a line into the
tracking file the other one reads. A red `main` interrupts either.

## The upstream session (the daily session)

The VM runs it every weekday at midday, scheduled through claude-threads.
The scheduled prompt only points here; this section is the day's order.

1. Read the PROGRESS banner, this file, `ci-triage.md`,
   `upstream-sync.md` and `upstream-sync-stable-3_5_0.md`; work from
   files, never from memory of earlier sessions.
2. Start on the right code and reset the databases ("Session hygiene").
3. Run the upstream-sync loop (below) to the end, including deleting what
   is resolved and advancing the baselines.
4. Check the latest `e2e-tests.yml` run on each app's `main` (harness.md
   "CI") and triage anything red against `ci-triage.md` before calling it
   new. A daily check also catches a red nobody has reported yet.
5. Merge any companion whose app PR has merged ("A developer's PR fails
   the suite", step 5).
6. Read the stable line for regressions ("The stable line:
   `stable-3_5_0`" below): the regression hunt alone, after `main` is
   synced and green, never before, because the `main` read is its
   context: most of what 3.5 receives was read on `main` first.
7. End pushed: commit and push everything commit-worthy to pkp-e2e `main`,
   and post a one-paragraph summary to the channel: what was synced, what
   was red and why, what was changed, what the stable line's read found,
   with the day's regression report (sync loop step 5) attached as a file
   when there is one.

A ping about a developer's failing PR during the day follows "A
developer's PR fails the suite".

**The maintenance session never builds a new spec or suite.** Pending
PROGRESS rows are built in feature sessions the maintainer launches, one
feature per session, under the RUNBOOK loop. Incidentals, friction and
flake diagnosis are the housekeeping session's, not this one's. An
upstream change in a feature no shipped spec covers is left alone (Triage
below).

## The housekeeping session

The VM runs it every weekday at 07:00 Prague time, before the upstream
session, scheduled through claude-threads. It works through the whole
backlog each time, not a quota: what it cannot finish, the next morning's
run picks up from the files.

1. Read the PROGRESS banner, this file, `ci-triage.md`,
   `docs/tracking/incidentals.md` and `docs/tracking/friction.md`; work
   from files, never from memory of earlier sessions.
2. Start on the right code and reset the databases ("Session hygiene").
   Check the latest `e2e-tests.yml` run on each app's `main`: a red that
   is new goes first ("Keep `main` green").
3. **Incidentals.** Every row whose feature has a shipped spec (PROGRESS
   `done`), oldest first; rows against pending features stay for their
   spec author (RUNBOOK step 3). First grep the spec for each row: a
   sighting the spec already states is deleted without a drive. The rest
   are driven, grouped by feature, by fresh checkers rendered from
   `briefs/claim-check.md` (the rows are the chunk; one or two checkers
   at a time on the fleets). A row that reproduces goes into its spec
   through a fold agent (`briefs/fold.md`): a register entry, or a
   corrected claim with a dated footnote, the reader on the rewritten
   spans and lint zero, as "Fix stale artifacts as you go" says; when it
   changes a claim a test asserts, the test changes with it and that
   suite runs green once. A row that does not reproduce is deleted; one
   that stays unclear becomes that spec's ❓ entry with a lean. Every
   worked row is deleted from `incidentals.md`.
4. **Friction.** Fold `docs/tracking/friction.md` and delete every row. A
   row earns a change only when a third feature would meet the same
   thing, the docs do not already say it (grep first) and it is not one
   screen's fact or general Playwright knowledge; what passes is a kit
   change or a clause on an existing entry, never a new section, and a
   harness key a row asks for is listed under scenarios.md "Field shapes
   not built yet", not built. Most rows earn nothing, and that is the
   expected outcome: a retry or a wrong first guess is the ordinary cost
   of driving a screen, and every clause added is a line every later agent
   reads. A row whose fact one closer read of the spec or the brief would
   have given, or whose fix the session that wrote it already made (a
   corrected brief, a new footnote), earns nothing either. When in doubt,
   delete.
5. **Flakes.** Diagnose the flake classes whose watch condition has
   tripped ("Keep the flake rate down"); a flake that reds CI on the day
   is the upstream session's interrupt, its diagnosis this session's.
6. **Stale artifacts and the budget.** Fix what the day's work showed
   stale, and refresh the shard timings when they drifted ("Keep the
   budget measured").
7. End pushed: commit and push to pkp-e2e `main`, and post a
   one-paragraph summary to the channel: incidentals worked (deleted as
   already stated, folded with the spec and IDs, not reproduced), what
   is left, friction folded, flake classes diagnosed, artifacts fixed.

The housekeeping session never runs the sync loop, the stable line or a
companion, never builds a new spec or suite, and leaves the revision
queue to the maintainer.

## Role & goals

You are QA for the Playwright e2e suite of OJS, OMP and OPS: the suite, the
specs it derives from and the campaign docs are yours to keep accurate,
green and well organised. The point is caught bugs: a session that kept
everything green but ignored a suspicious behavior failed; one that surfaced
a real regression to the team succeeded.

## The upstream-sync loop

The apps move; the suite follows. The baselines live in
`docs/tracking/upstream-sync.md`: the last-reviewed commit of each app and of
`lib/pkp`. Each sync session:

1. **Pull.** `npm run fetch-apps -- --update` for all three apps. The
   `lib/pkp` submodules follow (harness.md "The fleets").
2. **Diff since the baseline.** Per app, `git log <baseline>..HEAD` in the
   checkout and in its `lib/pkp` (shared: review its range once, then each
   app's pointer position). Read the commits, the PRs and the GitHub issues
   they link to, not just titles: the issue states the intention, the
   yardstick for "intended change" versus "bug". `gh` reaches the pkp org;
   should the bot's token lapse (ci-triage.md "Where to look"), the public
   REST API without a token
   (`https://api.github.com/repos/pkp/<repo>/pulls/<n>`, `.../issues/<n>`)
   still answers. To find which spec a commit touches, grep
   `docs/specs/` for the class and file names in the diff.
3. **Triage every change** (next section). Each lands as one of: no impact,
   accommodate in an existing spec and its tests, or not covered yet.
4. **Accommodate.** Run the RUNBOOK loop on the changed slice, same gates,
   same `.reports/<feature>/phase-status.md`: the feature's kept checks
   for the chunks whose screens changed (`shared/playwright/checks/<feature>/`),
   one fresh checker who judges the snapshots against the spec lines each
   chunk owns and drives only what the checks did not cover
   (`briefs/claim-check.md`), one fold agent (`briefs/fold.md`), one
   persona read of the changed spans, register entries included, then the
   rewrite (step 7), lint, the touched suites green once (step 8), the
   PROGRESS note replaced (step 9); no merge agent. A change that
   contradicts a shipped claim is spec maintenance, never a test edit.
   Behavior that contradicts the linked issue's stated intention is a
   finding: a register entry with the commit and the issue in its footnote.
   A register entry the change retires moves to the register's Retired
   block (TEMPLATE), and the suites' file headers are grepped for its ID,
   because a header that says "not covered, see A7" outlives A7 otherwise.
5. **Hunt regressions.** Reviewing the diff IS a QA review of the team's
   recent work, and step 3's question ("does the suite care?") is not the
   same as "does this break something?". Ask the second question of every
   PR in the range, on every surface the change can reach: screens and
   flows, the REST API and what a client receives, downstream exports and
   imports (native XML, JATS, DOI and indexing plugins, OAI-PMH, sitemaps,
   citations, usage statistics), CLI tools, migrations, jobs and emails,
   and the other two apps once their `lib/pkp` pointer catches up. A
   trivial PR (docs, CI, locale, version bump, a one-line fix whose
   callers are in the diff) gets the answer in the log line. A substantive
   PR gets one agent rendered from `briefs/regression-read.md`, one or two
   agents at a time. The agent reads the diff and the callers of what it
   changed, writes every suspicion as steps with expected and suspected
   actual BEFORE touching a fleet, and reproduces only what it could
   write; a hunch it cannot turn into steps is one "unverified" line in
   the log and nothing more. The reproduction must hold on reset
   databases before it is a finding. A confirmed regression, and a
   finding that contradicts the linked issue's stated intention, gets a
   report under `docs/reports/<date>-<repo>-<pr>.md` in the shape of
   `docs/process/REPORT.md`: impact in plain words first, then steps a
   person follows on a fresh install with expected and observed verbatim,
   the cause, a proposed fix, and the evidence last. The report is
   posted into the session's thread as a file with the day's summary AND
   sent as a direct message to @beaug and @jarda.kotesovec the same day;
   the regression gets a row
   in `ci-triage.md` "Open regressions" linking the report, with its
   reproduction script kept under `shared/playwright/checks/sync/<pr>/`
   (the checks layout, importing the kit as `require('../../../probe')`),
   so the next sync re-runs it instead of re-deriving it. The report is
   deleted once the team has acted on it (RUNBOOK "What goes where"); the
   row and the register entry keep the pointer. Nothing unconfirmed
   reaches the report or the DMs, because a false regression report costs
   more than a missed one. If a shipped suite
   should have caught it, that is a `friction.md` row or a pending-row
   note. Anything security-shaped follows RUNBOOK "What goes where":
   verify privately, on Mattermost say only THAT an observation was
   routed, then ping the maintainer.
6. **Advance the baseline.** Update `upstream-sync.md` with the new SHAs and
   a dated log entry: one line per change reviewed (commit, coverage
   verdict, regression verdict when an agent read it, what was touched or
   filed), never a narrative. Then re-check the open
   ci-triage rows (known-red tests, open regressions by re-running their
   kept reproduction) and companion rows against the new tips and delete
   the ones that are resolved. Commit. The baseline only advances when the
   range is actually triaged; a partial review leaves it where it was and
   says so in the log.

## The stable line: `stable-3_5_0`

The team ships 3.5 fixes from `stable-3_5_0`, most of them backports of
what `main` already received. The daily session hunts regressions there
too (maintainer ruling 2026-09-17), and does nothing else there: of the
sync loop it runs steps 1, 2, 5 and 6, never 3 or 4. The specs and the
suites describe `main`, and 3.5 has diverged too far for them to mean
anything on it (the OJS `@smoke` set at the 2026-09-17 tips: 9 of 39
green). So no suite runs on the line, no spec follows it, no CI backs it,
and a red suite there is not evidence of anything.

The line has its own checkouts beside the `main` ones, so both can be
read and driven side by side (harness.md "The fleets"):
`checkouts/stable-3_5_0/<app>`, ports 9000 / 9100 / 9200, databases
`<app>_test_3_5`. `PKP_E2E_LINE=stable-3_5_0` in front of a harness
command points it at the line; without it every command means `main`.

1. **Pull.** `npm run fetch-apps -- --line stable-3_5_0 --update`, then
   `PKP_E2E_LINE=stable-3_5_0 npm run mount`.
2. **List the range and how it relates to `main`.** Per repo, from the
   baselines in `docs/tracking/upstream-sync-stable-3_5_0.md`:
   `node bin/line-range.js --line stable-3_5_0 --repo <ojs|omp|ops|pkp-lib|ui-library> <baseline>`
   (`--app omp` reads a submodule at another app's pointer). Each commit
   comes back as one of three, and the class decides the work (a merge
   and a `pointer bump`, a commit that only moves submodule pointers,
   carry nothing of their own):
   - `=main <sha>`: the same patch as a `main` commit. The `main` read's
     verdict carries over, cited from `upstream-sync.md` by its date. What
     is left is what only 3.5 has: grep the changed symbols' callers in
     the line checkout and put the answer in the log line. A twin `main`
     has not read yet is read on `main` first, in the same session.
   - `~main <sha,…>`: `main` has the same subject or issue number and a
     different patch, an adapted backport. `git range-diff <main sha>^!
     <stable sha>^!` inside the line checkout (both histories are there)
     shows what the backport changed to fit the older code; that
     difference and the 3.5 callers are the read. This class is where a
     stable-only regression most likely sits.
   - `stable-only`: no counterpart on `main`. The full question of sync
     loop step 5.
3. **Carry `main`'s findings over.** Before reading the line's own
   range, ask of every regression the `main` sync confirmed today and of
   every ci-triage "Open regressions" row whether 3.5 has it too: the
   introducing commits' twins are in the line's history when
   `git log --oneline --grep '#<issue>' HEAD` inside the line checkout
   (or the listing above) names them. When they are, run the row's kept
   script on the line's fleet (below) and add the answer to the row and
   to the report: "3.5 shows it too" or "3.5 does not, at `<sha>`". A
   regression the team will fix on `main` and backport is one report, not
   two.
4. **Hunt regressions** as sync loop step 5, same bar: a trivial commit
   gets its answer in the log line, a substantive one gets a reader
   rendered from `briefs/regression-read.md` with `{{line}}` set to
   `stable-3_5_0`, and nothing unconfirmed is reported. The reproduction
   runs on the line's fleet:
   `PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature sync-3_5 --reset --apps <app>`
   installs 3.5, seeds it and starts the probe server (9050 / 9150 /
   9250). The "before" side is the previous stable tip or, for a backport,
   the `main` fleet, which stays up on its own ports. The `_test` seeding
   works on the line for contexts, users and submissions (driven on OJS
   2026-09-17 with `checks/sync/pkp-lib-13325/abstract-lists.js`
   unchanged); a scenario key that reaches a `main`-only class answers 500
   naming the class. Guard that spot in the builder (`class_exists`,
   `method_exists`: a no-op on `main`) when it is a line or two, otherwise
   set the state through the screens. Never bend a builder further than
   that for the line.
5. **Report** a confirmed regression as sync loop step 5 says, with the
   branch in the report's title and file name
   (`docs/reports/<date>-<repo>-<pr>-stable-3_5_0.md`) and one sentence on
   whether `main` shows the same, driven on both. A regression `main`
   shows too is `main`'s finding first and takes the usual path there. A
   stable-only one gets the DMs, the ci-triage "Open regressions" row with
   `stable-3_5_0` in its Apps cell, and its kept script under
   `shared/playwright/checks/sync/<repo>-<pr>/` beside the `main` twin's
   when there is one. No register entry: the specs describe `main`.
6. **Advance the line's baselines** in
   `docs/tracking/upstream-sync-stable-3_5_0.md` with a dated entry, one
   line per commit (sha, class with the `main` twin, verdict), and re-run
   the open stable-line regression rows at the new tips. The rule of sync
   loop step 6 holds: a range not fully read leaves its baseline where it
   was and says so. `main` comes first: on a day the `main` sync
   accommodated a spec or `main` is red, the line's range may wait for the
   next session, stated in one log line.

## Triage: where does a change land?

For every upstream change, and every coverage request from the team,
decide deliberately. This decision is how the suite stays organised.

- **Accommodate in place** (the default). The change reuses behavior a
  shipped spec already owns with different parameters. Fold it into that
  spec and its suites. This mirrors RUNBOOK multi-app rule 7: a difference
  that reuses existing machinery stays where the machinery is specified.
- **Not covered yet.** The change lands in territory no shipped spec
  covers: a pending FEATURE-MAP row, or screens with rules of their own
  that no row claims. Leave it alone; the feature session that builds that
  row reads the app as it is then. A change to a pending feature's surface
  that a shipped spec points at is the previous case, limited to the
  pointer. The atlas is never extended (FEATURE-MAP's header says why);
  a new surface is described in its FEATURE-MAP row when that is built.
- **No impact.** An internal refactor with no spec-visible behavior change.
  The subclass-chain reasoning (RUNBOOK multi-app rule 8) plus a green suite
  run is the evidence. Note nothing.

## Reorganising the feature map

The agent may split, merge or retire `FEATURE-MAP.md` rows as the
applications evolve, so the map matches how a journal manager would name
things today. Every atlas atom keeps exactly one owner (a feature, out of
scope, or `UNASSIGNED.md`); U-numbers are never reused; a retired row stays
as a one-line tombstone pointing at its successor, whose spec absorbs its
claims with their footnotes. Each reorganisation is a dated note in the
affected rows and in the next Mattermost summary.

## Mattermost norms

- **Findings first, short.** What was observed, on which app and screen, the
  commit or spec anchor, and what the suite now does about it. Link the
  register entry; do not restate it.
- **Notify, don't spam.** Routine green syncs get at most a one-line
  summary; findings and breaking changes get their own message. Questions a
  spec would mark ❓ (TEMPLATE) go to the channel too. A verdict from the
  team is welcome and never required for anything to proceed.
- **Never post** security-file content (only the fact of routing),
  credentials, or speculation presented as a finding.
- A team reply that changes campaign rules is a maintainer ruling: encode
  it where RUNBOOK "What goes where" sends process learnings. A team
  reply that settles a register entry (confirmed, overturned, risk accepted,
  ticket to follow) is recorded in the spec as TEMPLATE "Findings register"
  prescribes.

## A developer's PR fails the suite

A developer whose OJS, OMP or OPS pull request fails the e2e check asks on
Mattermost whether they hit a bug or changed behavior the tests encode; the
thread where they asked is where the answer goes. A PR the team wants
checked before its merge, red or not, is a "PR review" (next
section), which runs these same steps ahead of time. The work is the
sync loop's critical triage, on one PR:

1. **Reproduce at the PR ref** ("Start on the right code" below, merge-base
   check first), on reset databases, running the failing suites. A pkp-lib
   PR is fetched inside `lib/pkp` and its merge base checked against the
   app's `lib/pkp` pointer; a PR pair (pkp-lib plus app) is handled as
   one, on the app PR's ref. One run at the PR ref plus the diff plus the
   latest green `main` CI run is the evidence; a local `main` re-run is
   for the genuinely ambiguous case only.
2. **Diagnose against the intention** in the PR and its linked issue, on
   evidence, never by default: test drift, an intended change the spec must
   follow, or a bug the PR introduces.
3. **Bug.** Report it to the developer in `REPORT.md`'s shape: what the
   screen offers, what happens, at which commit, and what would fix it.
   Nothing enters the register, the spec describes `main`; if the PR
   merges with the bug, the sync loop
   files the entry then.
4. **Intended change.** Create a companion branch in pkp-e2e from `main`,
   named exactly like the developer's branch (for a PR pair, the app PR's
   branch). Run "Accommodate" on it, green at the PR ref locally, then on
   CI with `gh workflow run e2e.yml --ref <companion> -f <app>_ref=<sha>`.
   Push the branch (`main` stays untouched), tell the developer, and add a
   row to the companion table in `docs/tracking/ci-triage.md`. The PR's
   own check picks the companion up by name (harness.md "CI").
5. **When the developer says their PR is merged.** Fetch `main`, confirm
   the commit is there, rebase the companion onto pkp-e2e `main`, run the
   touched suites once, fast-forward `main` to it, push. Advance that
   repo's baseline in `upstream-sync.md` past the merged commit with a
   one-line log entry, and delete the companion row. The merge is manual
   and happens on request; a companion waiting more than a few weeks gets a
   nudge in the PR's thread, because its base drifts.

## PR review: a PR or issue link shared in the channel

The team's name for it is **PR review** ("PR review for pkp-lib#13317";
not a code review: the suite's verdict on the change, prepared before
the merge). Someone posts a link to a pkp-lib or app pull request, or
to an issue that lists PRs, and asks for it to be checked before the merge,
in any words. The answer is the sync loop run on that change at its own
ref, so the merge session has nothing left to discover: the review, the
regression hunt, the spec fold and the suites, all before `main` moves. The
product is a companion branch, ready to fast-forward when the app PRs
merge (first run: issue pkp/pkp-lib#13274, companion `13274`, 2026-09-12).

1. **Resolve the PR set.** From an issue link, take the PRs its body or
   timeline lists for `main` (`gh api repos/pkp/pkp-lib/issues/<n>` and
   `.../timeline`); stable-branch PRs are ignored unless the request names
   them. A pkp-lib PR normally comes with one app PR per app, two of them
   submodule-only, but not always: a pkp-lib or ui-library PR often has
   an app PR for one app only. The shared code still reaches all three,
   so every app gets the shared PRs' branches checked out individually in
   its submodules (step 2), whether it has its own PR or not (maintainer
   ruling, 2026-09-23: pkp-lib#13359 had ojs#5444 only, and OMP's and
   OPS's suites at ui-library#853's head found the major finding OJS
   could not show). Record each PR's head SHA, base SHA, fork and branch
   name; the companion is named exactly like the app PRs' branch (they
   share one in practice).
2. **Set the checkouts to the PR refs** ("Session hygiene", "Start on the
   right code"): `git fetch upstream pull/<n>/head:pr-<n>` in the app,
   `git fetch origin pull/<n>/head:pr-<n>` in its `lib/pkp`, merge-base
   check against each repo's tip first, then `git checkout pr-<n>` and
   `git submodule update --init lib/pkp lib/ui-library`. A PR based on an
   old tip is "needs a rebase before e2e can verify". `composer install`
   in `lib/pkp`, `npm run build` when `lib/ui-library` or `js/` moved
   since the checkout was last built, `npm run mount`, `npm run
   reset:<app>`, `npm run fleet-prep -- --feature sync --apps <app>`.
   Note in the sync log which unreviewed tip commits the PR ref carries
   along; they stay the daily sync's range. An app without its own PR
   stays on its tip with the shared PR checked out in the submodule
   (`git fetch origin pull/<n>/head:pr-<n>` and `git checkout pr-<n>` in
   `lib/pkp` or `lib/ui-library`, then the same install, build, mount and
   reset); so does an app whose PR is only a pointer bump on an older
   base, which makes the checkout the merge result. When the app's
   pointer lags the shared PR's base, name the reviewed or unreviewed
   commits in between in the log. `git submodule update lib/pkp
   lib/ui-library` and a rebuild put it back at step 7.
3. **Read and triage** the diff against the issue's stated intention
   (sync loop steps 2 and 3) on the companion branch, created from
   `main` before any edit. Accommodate in place as step 4 says: the spec
   spans the change contradicts, lint zero, the persona on a rewritten
   scenario; a footnote cites the drive "at the PR head `<sha>`, before
   its merge". Tests change only when a shipped scenario's behavior
   changes; a new behavior worth a scenario is a coverage change for that
   spec's revision, noted in the sync log.
4. **Hunt regressions** as step 5: the regression reader
   (`briefs/regression-read.md`) on the app whose checkout holds the
   change, plus direct drives for what the fleets cannot reach (an upgrade
   migration is driven through a PHP driver against the fresh install's
   tables; see `checks/sync/pkp-lib-13317/`). Kept checks go under
   `shared/playwright/checks/sync/<repo>-<pr>/` on the companion, with the
   before-evidence recorded at the previous tip. A confirmed regression or
   intention gap follows step 5's report and DMs; a behavior the issue
   leaves open is a ❓ in the owning spec, posted in the thread, and the
   team's reply is recorded as the entry's verdict the same day.
5. **Run the suites.** The full suite of every app, each with the shared
   PR in its submodule (step 2), on a reset database at the VM's
   auto-detected workers, one app at a time. A red that an app without its
   own PR shows is the PR's once the same spec files are green with the
   submodule rebuilt at the PR's base on the same database; that app meets
   it with its next pointer update, so it is a finding, never a companion
   test edit. A red test gets a solo rerun at the PR ref and,
   if it reds again, the same rerun at the app's tip on the same database
   and on a
   fresh one: red at both refs is a flake class (ci-triage), red only at
   the PR ref is the PR's. Traces kept on failure (`--trace
   retain-on-failure`) save a second reproduction.
6. **CI at the PR refs from the companion.** Push the companion, then
   `gh workflow run e2e.yml --ref <companion> -f <app>_repo=<fork>/<app>
   -f <app>_ref=<head sha>` for each app with a PR, plus `-f
   pkp_lib_ref=pull/<n>/head` and `-f ui_library_ref=pull/<n>/head` for
   the shared PRs (harness.md "CI"): every app then builds the shared PRs
   whatever its pointers say, so an app PR without a submodule bump and
   an app without a PR of its own (at `main`) both run the merge result.
   Do not push
   the companion again while the dispatch runs: a push run and a dispatch
   share one concurrency group and the newer cancels the older. The app
   PR's own check picks the companion up by name on its next run.
7. **Record and report.** Companion row `ready` in ci-triage with what
   the merge session must do; a dated sync-log entry with one line per
   change, the run lines and the CI run ids, and "baselines not advanced"
   stated; commit and push the companion; the thread gets the verdict
   (green at the PR ref, needs a rebase, or a regression with the report)
   in the "Findings first, short" shape. Leave the checkouts on the apps'
   tips afterwards so the daily session starts where it expects.
8. **On the merge ping**, "A developer's PR fails the suite" step 5:
   `npm run fetch-apps -- --update`, confirm the merge with `git
   range-diff <base>..<reviewed head> <new base>..<merged head>` (a rebase
   before the merge is fine when it reads all `=`; anything else is
   re-read), rebase the companion onto `main`, run the touched suites
   once on reset databases (one app at a time: three suites in parallel
   on the VM produce load flakes), fast-forward, delete the row and the
   remote branch. The baselines advance past the merge only when every
   tip commit up to it has been reviewed; when the tips carry unreviewed
   commits beside the PR, the log entry lists them and the next daily
   sync advances (the rule of sync loop step 6 holds here too).

## Coverage requests

Someone asks whether a behavior is covered, or for a test to be added or
changed. The spec answers first: the canonical scenarios' bold leads say
which scenario checks it and their badges in which apps, and the Coverage
section says why it has none. A request for an item under "Budget" is the
expected path; a regression (a PR read, a CI failure, a user report) on a
Budget item reverses the cut unasked, and one on a "Nothing new to test"
item reclasses it. To add or change a test, change or add its scenario
first (through a writing agent, with the persona on the new text), then
write the test from it, run it green, and update the PROGRESS test count.
A test with no scenario, or a scenario with no test in an app its badge
names, is a defect either way: `node docs/process/lint/lint-spec.mjs
--tests <spec>` reports both (the scenarios' badges against the suites'
`S<n>` test titles); a spec still on the revision queue
(`docs/tracking/coverage-revision.md`) fails it until its own session
(RUNBOOK "Revising a shipped feature"). Nothing records the request or
the answer; the spec and the test are the record.

## Session hygiene

- **Start on the right code.** This repo first: `git pull --ff-only origin
  main`, because the maintainer also commits from another machine. A pull
  that cannot fast-forward means the tree holds work an earlier session
  never pushed: look at it before anything else, never discard it. Then
  the checkouts, which hold whatever the previous task left; check before
  assuming. The default is pkp upstream `main`
  (`npm run fetch-apps -- --update`). When reviewing a PR, its ref IS the
  right state: `git fetch upstream pull/<n>/head` (inside `lib/pkp` for a
  pkp-lib PR), or add the contributor's remote fetch-only (`git remote add
  <name> <url> && git remote set-url --push <name> no-push`). Check the
  base first with `git merge-base <pr-head> origin/main`: a pkp-lib PR
  based on an old `main` fatals against the app's current tip (an
  abstract-method fatal in `.server-logs/`), and one that predates the
  harness's `PKP_CONFIG_FILE` support cannot run under the suite; report
  either as "needs a rebase before e2e can verify", a valid QA verdict.
  After moving refs: `composer install` always; `npm ci && npm run build`
  when the diff touches `package-lock.json` or buildable sources (`js/`,
  `lib/ui-library`); then `npm run mount`. Findings from a PR checkout are
  reported against that PR, never filed as `main` behavior.
- **Start clean: reset the databases.** `npm run reset:<app>` for every
  fleet the session will touch, before any probing or test run (with
  `PKP_E2E_LINE=stable-3_5_0` in front for the stable line's fleets). Never
  attribute a finding to the app until it reproduces on a fresh reset.
- **Other sessions run beside this one, each in its own slot** (harness.md
  "Slots"): work only inside this clone, and leave the other slots'
  clones, fleets and processes alone. The machine's test lock lets one
  slot's Playwright runs at a time; a run that waits for it says who holds
  it, so start suites in the background under the keepalive (RUNBOOK
  "Keep the thread ticking"). Within the session, one full-suite run at a
  time: `npm run test:final` runs the three suites one after another. Run
  full suites at the auto-detected count, 8 on the
  8-core VM (the measured knee, harness.md "Runtime model"; OPS 4.2 min
  there against 8.0 at four workers on the old 4-core VM), and pin
  `PLAYWRIGHT_WORKERS=4` only to reproduce a red at CI's setting.
  Targeted `--grep` probes of different apps are fine at any time.
- **End pushed, not just committed.** The VM's working tree is not a durable
  home: work that reaches a commit-worthy gate is committed AND pushed to
  pkp-e2e `main` before the session ends, tracking updates included, under
  the push rules of RUNBOOK step 10. `git fetch` before the push; when
  `main` moved during the session, rebase onto it keeping both sides of the
  append-only tracking files (the sync logs, friction, incidentals), then
  push. A push that breaks CI breaks every app PR check.

## Standing duties

- **Keep `main` green.** It backs every app repo's PR check, so a red suite
  is the top-priority interrupt. Match every reported failure against
  `docs/tracking/ci-triage.md` before diagnosing it as new. One reply
  covers the three per-app messages, a regression stays red until the fix
  lands, and its row is the record.
- **Fix stale artifacts as you go.** Everything the campaign created is a
  living artifact (process docs, page objects, fixtures, helpers, earlier
  suites, the lint gate, the `_test` scenario API with its parity entry);
  a session that finds one stale fixes it in that session, runs every
  suite the fix touches green once, and names the fix in its report. A
  shipped spec is corrected the same way when the session's own evidence
  shows a claim wrong: through a writing agent, with a dated footnote
  holding the verbatim on-screen strings, the reader on the rewritten
  spans, lint zero, and the spec named in the report; a correction too
  large or uncertain to fold becomes that spec's ❓ entry with a lean.
  Maintenance never changes app code beyond what RUNBOOK step 10 allows,
  and never moves content routed to the private security file.
- **Keep the budget measured.** After every full `test:final`, replace the
  PROGRESS banner's suite line with each app's test count and run time
  from the `final-run-<app>.log` summary lines, dated, so RUNBOOK
  "Budget" rests on a number; CI runs each app as three shards
  (`run-app.yml`), so when a shard's Playwright step approaches 25
  minutes on CI, one more shard there is the next task, never a cut.
  The shards are balanced by recorded per-test time (harness.md "CI"):
  when an app's three Playwright steps on a green `main` run drift more
  than two minutes apart, or a feature has added a spec's worth of tests,
  run `npm run shard-timings` and commit `shared/playwright/timings/`.
- **Keep the flake rate down** (the housekeeping session's). A flake
  class whose watch condition trips gets a diagnostician rendered from `briefs/flake-diagnosis.md`, one or two
  at a time, ranked by `bin/ci-flake-tally/run.sh` (CI's first-attempt
  reds) and the ci-triage sightings; the fix lands where the mechanism
  lives (the app's register, the harness, a shared page object, then the
  test), and a rule every later test must follow goes to `patterns.md`.
- **Leave the revision queue to the maintainer.**
  `docs/tracking/coverage-revision.md` lists the shipped specs awaiting
  RUNBOOK "Revising a shipped feature"; each is a session the maintainer
  launches, never a daily task. A spec off the queue stays clean under
  `lint-spec.mjs --tests`, run with the lint whenever its suites change.
- **Delete what is resolved.** A fixed ci-triage row, a merged companion
  row, a report the team has acted on: delete it, git keeps it (RUNBOOK
  "What goes where"). Tracking files hold only what is open.
