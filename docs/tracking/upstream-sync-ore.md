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
| ojs | `9f18cd1d46` (the branch point, 2026-10-13) | 2026-10-16 | claude (maintainer's workstation session: the branch set up) |
| pkp-lib | `266505ecd8` (the branch point, ojs's pointer) | 2026-10-16 | claude; ui-library `c9889f00` (the branch point, ojs's pointer); ojs `plugins/generic/crossref` `3a9f888d64` (ojs's pointer) |

pkp-e2e `ore` tip: `bb827087` (2026-10-16).

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

- **2026-10-16 — the ore worktrees (Phase 1, asked in the channel by @jarda.kotesovec): no upstream commit read; baselines unchanged.** pkp-e2e `ore` takes `bb827087`, the cherry-pick of `main`'s `5490e211` (fetch-apps' `PKP_E2E_APP_BRANCH`), a harness commit the worktree needs, not a team change. `<clone>-ore` provisioned beside all four slot clones (harness.md "The ore worktree": slots 4 to 7, OJS 12300 / 12600 / 16000 / 16300, `ojs_test_s4`…`s7`), each OJS checkout on pkp `ore` `9f18cd1d46` (lib/pkp `266505ecd8`, ui-library `c9889f00`); reset and U01 on each: 9 passed, four times. Push run of the branch 38878561939 green 3/3; main 38878559463 green 9/9.
- **2026-10-16 — PR review, pkp/pkp-lib#13507 into `ore` (pkp/ojs#5943 spotted by @jarda.kotesovec as running no e2e check): pkp/ojs#5943 (bozana `13507-ore`, head `33bfb2834e`: `87b0ec4048` on the branch point `9f18cd1d46`, then the pointer commit), pkp/pkp-lib#13542 (`b34350ab1b` on `266505ecd8`), pkp/ui-library#1020 (`95e7365005` on `c9889f00`); the crossref plugin pointer moves `3a9f888d64` → `7908654951`, the merge of pkp/crossref-ojs#114 that `main` carries (the plugin has no `ore`). Not merged; baselines not advanced. Companion `13507-ore`, cut from pkp-e2e `ore`.**
  - ojs `87b0ec4048` → `=main c7545a873b` (pkp/ojs#5928, PR review 2026-10-13/14 in three rounds, merged `b05b91497d`; `git range-diff` `=`); pkp-lib `b34350ab1b` → `=main b17fadae59` (pkp/pkp-lib#13508, merged `e9ccf1029d`; `=`); ui-library `95e7365005` → `=main 47b565cb42` (pkp/ui-library#1016, merged `dd86f760dd`; `=`); `33bfb2834e` → pointer bump to those three heads and the crossref merge. The same patches `main` reviewed and merged, each on the exact ore tip: `main`'s verdict stands (`docs/reports/2026-10-13-pkp-lib-13508.md`: the PRs do what the issue asks, nothing left after round 2; A13 retired, Rule 33, no regression, no security weakness).
  - The `main` companion `13507`'s eight commits (`f1c2de1c`…`421e5763`: U45 S13 on OJS reads and closes the "Error" window, `DoisPage.errorDialog()`, the spec fold, the report and its images, the kept `checks/sync/pkp-lib-13508/`) cherry-picked onto `13507-ore` without a conflict. No local drive: the patches are byte-identical to the reviewed ones and the ore worktree does not exist yet (Open above).
  - The ore branch's first own push run, OJS against pkp/ojs `ore` at the tip: run 38871886674, green 3/3 (the branch-point suite with the K-12780 skip is a clean baseline). The companion at the PR head: `node bin/ci.js dispatch --ref 13507-ore --apps ojs --ojs-repo bozana/ojs --ojs-ref 33bfb2834e`, run 38872307202, green 3/3, no flaky line. **Verdict: green at the PR refs; mergeable as far as the suite can tell.** On the merge ping: confirm the merges are the reviewed heads, fast-forward pkp-e2e `ore` to `13507-ore`, advance these baselines, delete the row.
- **2026-10-16 — the branch set up (maintainer's workstation): pkp-e2e `ore` = `2853af70` + `68975b4f` (U03 S4 skipped, K-12780) + `c448707a` (`e2e.yml`: OJS alone against pkp/ojs `ore`, no schedule); `main` `67801894` adds the nightly `ojs-ore` job; pkp/ojs#5944 (into `ore`) makes the hook check PRs into `ore` and run this branch. The ore tips are the branch point still: no ore-only commit on any repo.**
