# Upstream sync, the ore branch — last-read `ore` commits

The last commit of each repo's `ore` branch the daily session has read
and carried into the pkp-e2e `ore` branch (`docs/process/MAINTENANCE.md`
"The ore branch"). `ore` is the branch the ORE project runs OJS from in
production until the 3.6 stable release; OJS only, temporary. The
pkp-e2e `ore` branch is its suite, cut from `main` at `2853af70` (the
daily sync of 2026-10-14, which reviewed the three branch-point tips
below) plus the U03 S4 skip of `68975b4f`. `main`'s baselines are in
`upstream-sync.md`.

## Baselines

| Repo | Last-read commit | Date | Read by |
|------|------------------|------|---------|
| ojs | `61ddd345bd` (the merge of pkp/ojs#5943) | 2026-10-16 | claude (daily maintenance session; before it `9f18cd1d46`, the branch point, 2026-10-13) |
| pkp-lib | `6123e3c449` (the merge of pkp/pkp-lib#13542; ojs at its head `b34350ab1b`, the same tree) | 2026-10-16 | claude (daily maintenance session; before it `266505ecd8`, the branch point); ui-library `103b834dd5` (the merge of pkp/ui-library#1020; ojs at its head `95e7365005`, the same tree; before it `c9889f00`, the branch point); ojs `plugins/generic/crossref` `7908654951` (the merge of pkp/crossref-ojs#114, as on `main`; before it `3a9f888d64`) |

pkp-e2e `ore` tip: `a6fe34b5` (2026-10-16, companion `13507-ore` fast-forwarded).

## Open

- Phase 1 of the set-up (plan of 2026-10-16), the rest of it:
  `bin/line-range.js --branch ore`, `bin/report-models.mjs` reading
  `docs/reports/ore/`, REPORT.md "Affects" with an `ore` sub-item and
  the ten open regressions marked for it. Done 2026-10-16: the ore
  worktree beside each slot clone (harness.md "The ore worktree": slot
  number n+4, fetch-apps' `PKP_E2E_APP_BRANCH=ore`, `bin/slot.js`
  counting it with its slot).

## Read log

_Newest first; one entry per read: the date and the range per repo, then
one line per commit (sha → `=main <sha>` with the date of the `main` read /
`~main <sha>` with what the backport changed / `ore-only`; the verdict;
what the pkp-e2e `ore` branch took)._

- **2026-10-16 (daily session, VM s2) — ojs `9f18cd1d46..61ddd345bd` (3: `90ab974b52`, then pkp/ojs#5943 `87b0ec4048`, `33bfb2834e` and its merge), pkp-lib `266505ecd8..6123e3c449` (pkp/pkp-lib#13542), ui-library `c9889f00..103b834dd5` (pkp/ui-library#1020); the crossref plugin pointer `3a9f888d64..7908654951`. Read in full; baselines advanced. Companion `13507-ore` merged into pkp-e2e `ore`.**
  - ojs `90ab974b52` (Jarda Kotěšovec, "e2e hook on ore: check pull requests into ore and run the pkp-e2e ore suite", pkp/ojs#5944) → `ore-only`, `.github/workflows/e2e-tests.yml` alone: no impact on the suite, no regression, no security impact. Its first hook run, pkp/ojs 38879911542 at `90ab974b52`, green.
  - pkp/ojs#5943 + pkp/pkp-lib#13542 + pkp/ui-library#1020 merged 10:24 UTC as `61ddd345bd`, `6123e3c449`, `103b834dd5`: each merge's tree is the reviewed head's (ojs `33bfb2834e` plus `90ab974b52`, pkp-lib `b34350ab1b`, ui-library `95e7365005`), each `=main` (PR review below), so its verdict stands. The companion `13507-ore` rebased onto pkp-e2e `ore` over `bb827087` (`range-diff` "=" on all eight commits) and fast-forwarded: `ore` at `a6fe34b5`; the branch and its ci-triage row deleted.
  - `main`'s findings carried over: the `main` sync confirmed no regression today. The ci-triage "Open regressions" rows' introducing commits are ancestors of the ore `lib/pkp` (`266505ecd8`, `151e6e9d69`, `3407fc5bc0`, `cb32f21f94`, `2e377d27fc`, `fab29cfeca`, `f38c4a4a10`, `8240fbe6cc`, `4d9ec3cbd0`, `aeac6f75cf`; `1ad4a14bb2` not found there by that abbreviation); their kept scripts not run on ore today (Open above: the ten open regressions marked for ore).
  - Gate: the push run of pkp-e2e `ore` at `a6fe34b5`, [38887385454](https://github.com/jardakotesovec/pkp-e2e/actions/runs/38887385454): OJS green 3/3.

- **2026-10-16 — the ore worktrees (Phase 1, asked in the channel by @jarda.kotesovec): no upstream commit read; baselines unchanged.** pkp-e2e `ore` takes `bb827087`, the cherry-pick of `main`'s `5490e211` (fetch-apps' `PKP_E2E_APP_BRANCH`), a harness commit the worktree needs, not a team change. `<clone>-ore` provisioned beside all four slot clones (harness.md "The ore worktree": slots 4 to 7, OJS 12300 / 12600 / 16000 / 16300, `ojs_test_s4`…`s7`), each OJS checkout on pkp `ore` `9f18cd1d46` (lib/pkp `266505ecd8`, ui-library `c9889f00`); reset and U01 on each: 9 passed, four times. Push run of the branch 38878561939 green 3/3; main 38878559463 green 9/9.
- **2026-10-16 — PR review, pkp/pkp-lib#13507 into `ore` (pkp/ojs#5943 spotted by @jarda.kotesovec as running no e2e check): pkp/ojs#5943 (bozana `13507-ore`, head `33bfb2834e`: `87b0ec4048` on the branch point `9f18cd1d46`, then the pointer commit), pkp/pkp-lib#13542 (`b34350ab1b` on `266505ecd8`), pkp/ui-library#1020 (`95e7365005` on `c9889f00`); the crossref plugin pointer moves `3a9f888d64` → `7908654951`, the merge of pkp/crossref-ojs#114 that `main` carries (the plugin has no `ore`). Not merged; baselines not advanced. Companion `13507-ore`, cut from pkp-e2e `ore`.**
  - ojs `87b0ec4048` → `=main c7545a873b` (pkp/ojs#5928, PR review 2026-10-13/14 in three rounds, merged `b05b91497d`; `git range-diff` `=`); pkp-lib `b34350ab1b` → `=main b17fadae59` (pkp/pkp-lib#13508, merged `e9ccf1029d`; `=`); ui-library `95e7365005` → `=main 47b565cb42` (pkp/ui-library#1016, merged `dd86f760dd`; `=`); `33bfb2834e` → pointer bump to those three heads and the crossref merge. The same patches `main` reviewed and merged, each on the exact ore tip: `main`'s verdict stands (`docs/reports/2026-10-13-pkp-lib-13508.md`: the PRs do what the issue asks, nothing left after round 2; A13 retired, Rule 33, no regression, no security weakness).
  - The `main` companion `13507`'s eight commits (`f1c2de1c`…`421e5763`: U45 S13 on OJS reads and closes the "Error" window, `DoisPage.errorDialog()`, the spec fold, the report and its images, the kept `checks/sync/pkp-lib-13508/`) cherry-picked onto `13507-ore` without a conflict. No local drive: the patches are byte-identical to the reviewed ones and the ore worktree does not exist yet (Open above).
  - The ore branch's first own push run, OJS against pkp/ojs `ore` at the tip: run 38871886674, green 3/3 (the branch-point suite with the K-12780 skip is a clean baseline). The companion at the PR head: `node bin/ci.js dispatch --ref 13507-ore --apps ojs --ojs-repo bozana/ojs --ojs-ref 33bfb2834e`, run 38872307202, green 3/3, no flaky line. **Verdict: green at the PR refs; mergeable as far as the suite can tell.** On the merge ping: confirm the merges are the reviewed heads, fast-forward pkp-e2e `ore` to `13507-ore`, advance these baselines, delete the row.
- **2026-10-16 — the branch set up (maintainer's workstation): pkp-e2e `ore` = `2853af70` + `68975b4f` (U03 S4 skipped, K-12780) + `c448707a` (`e2e.yml`: OJS alone against pkp/ojs `ore`, no schedule); `main` `67801894` added a nightly `ojs-ore` job, removed the same day as redundant (the hook run and the branch's push run test the two tips whenever either moves; the daily step dispatches otherwise); pkp/ojs#5944 (into `ore`) makes the hook check PRs into `ore` and run this branch. The ore tips are the branch point still: no ore-only commit on any repo.**
