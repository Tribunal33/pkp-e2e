# CI triage — known problems & failing tests

Known-red tests on `main`, confirmed upstream regressions awaiting a fix,
the flake classes that mimic regressions, and the companion branches
waiting on app PRs. MAINTENANCE "Standing duties"
and "A developer's PR fails the suite" say what to do with them.

**Where to look.** Besides this repo's `e2e` workflow, every app repo runs
the suite through its thin hook on every push to its `main`. The latest run
on `pkp/<app>` Actions (main branch) is the authoritative answer to "is the
app's tip red?", and its head SHA is the commit to reproduce against.
`gh run view -R pkp/<app> <run> --log-failed` names the failed tests and
`gh run download -R pkp/<app> <run>` fetches the Playwright artifacts
(error contexts and `.server-logs/`) since 2026-09-12, when the bot's
token was reissued under the pkp org's 366-day lifetime cap for
fine-grained tokens; should it lapse again (`gh -R pkp/<app>` answers
403), run and job metadata stay reachable unauthenticated through the
public REST API and per-test detail comes from a local reproduction at
the head SHA. A local reproduction is still the evidence for a verdict;
the log only says where to look.

## Open — known-red tests on `main`

| ID | Signature (what CI shows) | Apps | Canonical entry | Status | First seen / last confirmed |
|----|---------------------------|------|-----------------|--------|-----------------------------|

## Open regressions — confirmed upstream regressions awaiting a fix

One row per regression the sync loop confirmed on reset databases and
reported to the team (MAINTENANCE step 5), in territory no shipped suite
reds on. Re-checked against the new tips every sync (step 6) by re-running
its kept reproduction under `shared/playwright/checks/sync/`; deleted when
the fix lands (for a shared fix, its merge into pkp-lib or ui-library
`main`; MAINTENANCE step 6). A regression only the stable line shows (MAINTENANCE "The
stable line") names `stable-3_5_0` in its Apps cell and is re-run on that
line's fleet.

| Commit / PR | Surface | Apps | Reproduction | Reported | Note (one line) |
|-------------|---------|------|--------------|----------|-----------------|
| pkp/pkp-lib `07b19290b4` (#13073, 2026-07-23, for issue pkp/pkp-lib#12994; OJS half pkp/ojs#5688 open) | The 3.5 → `main` upgrade never runs `I12994_CompetingInterestsDeclared` (in no app's `upgrade.xml`): on an upgraded site whose "Reviewer Guidance" has a "Competing Interests" text, a reviewer's accept (`saveStep` step 1) and decline (`saveDeclineReview`) answer 500 (SQLSTATE 42703, no column), and the editor's "Modify Review" shows the SQL error | OJS OMP (upgraded installs; OPS lacks the column, no review) | `checks/sync/upgrade-3_5/walk.js` on the 3.5 dataset upgraded to `main` (`PKP_E2E_DATASET_BRANCH=stable-3_5_0 npm run fleet-prep -- --feature sync-ds --dataset 1 --reset --apps ojs`); `ci-declared.js` (scratch journals); fixed when the fleet-prep column comparison names no `competing_interests_declared` and jjanssen reaches step 2 | 2026-10-01 (thread, @beaug) | Report: `docs/reports/2026-10-01-pkp-lib-12994.md`. High. No register entry: the upgrader is out of scope (FEATURE-MAP Q1). Also named there: `I11702_ExtendTasks` leaves `edit_tasks.status` (harmless). |
| pkp/pkp-lib#13414 (`2e377d27fc`, merge `887ad73d6c`, 2026-09-30, for issue pkp/pkp-lib#13412; 3.5 #13413 `a9c76aed62`) | Users XML import: a file first imported on a 3.5.0 release (ended roles stored with the import day as start) and imported again after the update adds each ended role a second time, silently; Editorial History lists "2026 – 2020, 2018 – 2020" | OJS OMP · stable-3_5_0 too (walked there; `main` by code, the row comes from 3.5) | `checks/sync/pkp-lib-13412/legacy-reimport.js` (`PHASE=first` at lib/pkp `d3216eed72`, `PHASE=again` at the tip, `PKP_E2E_LINE=stable-3_5_0`); fixed when `again` leaves one "Section editor" row per user | 2026-10-01 (thread, @beaug) | Report: `docs/reports/2026-10-01-pkp-lib-13414.md`; U63 register. Low. Control at `8809a197de` (before #13412): nothing added. Fix tried (`fix.diff` in the same folder). |
| pkp/pkp-lib `fab29cfeca` (2026-09-28, issue pkp/pkp-lib#13370; 3.5 twin since 2026-09-24) | With "Present a masthead based on user enrollments" off (every upgraded context), "Invite to a role" still offers "Appear on the masthead" and mails "Your name will appear in the <journal>'s masthead as a …", "Edit user" mails "New setting: Appear on the masthead"; a Reviewer invitation promises a listing while "Enable listing of reviewers on the masthead" is off by default | OJS OMP OPS (driven on OJS) · stable-3_5_0 too | `checks/sync/pkp-lib-13370/masthead-promises.js` (`RUN=<id>`, OJS); fixed when the `s1`/`s3` invitation emails and the `s2` email drop the listing promise | 2026-09-29 (thread + DMs to @beaug, @jarda.kotesovec) | Report: `docs/reports/2026-09-29-pkp-lib-13370.md`; U07 A13. Intention gap: only `AboutContextHandler` reads the two settings. Minor. Held on a reset OJS (`.reports/sync/s29hold-13370/`); 3.5 shows it (`.reports/sync-3_5/s29-13370/`). |
| pkp/pkp-lib#13288 (merge `f38c4a4a10`, 2026-09-27, for issue pkp/pkp-lib#13286) | Upload wizard "Cancel" after a revision: (1) a second pick on step 1, then "Cancel", leaves the abandoned first pick as the file (`status:true`); (2) the same file revised in two tabs by one person: the second "Cancel" answers `status:false`, the window stays open, the file keeps the upload cancelled in the other tab | OJS OMP OPS (shared lib/pkp; (2) driven on OJS) | `checks/sync/pkp-lib-13288/cancel-picks.js` MODE=s1 / s1g / s2; fixed when `result-s1-<app>.json` `afterCancel` reads the original `article.pdf` and `result-s2-ojs.json` `cancelA` answers `status:true` | 2026-09-27 (thread + DMs to @beaug, @jarda.kotesovec) | Report: `docs/reports/2026-09-27-pkp-lib-13288.md`; U36 A23 (the second pick), A24 (two tabs). Regression: at lib/pkp `1ad4a14bb2` both restored `article.pdf` (`.reports/sync/s27before-13286/`). Cause: one session key per file, overwritten by every upload and removed by the first cancel; the restore ignores the posted `originalFile`. Minor. The #13286 fix itself holds (renamed file restored, the old row deleted). Still reproduces 2026-09-30 at ojs `7ce98ec09e` / lib/pkp `3dc90c81a6` (`.reports/sync/s30-13288/`: `afterCancel` "rev-one.pdf" on OJS and OMP; `s30-13288s2/`: `cancelA` `status:false`). |
| pkp/pkp-lib#13397 (`aa077419e3`, 2026-09-26, for issue pkp/pkp-lib#13376) | "Invite to a role" email to a new user: on a journal or press whose primary language differs from the site's, a manager working in the site's language sends "Dear <email address>," although names were typed in both languages (also: names typed only in a second language are not used) | OJS OMP OPS (driven on OMP, OJS control) · stable-3_5_0 too | `checks/sync/pkp-lib-13376/greeting.js` `RR_LEGS=a,b,s1,s2e,s2f`; fixed when leg `s2e` greets by name | 2026-09-27 (thread + DMs to @beaug, @jarda.kotesovec) | Report: `docs/reports/2026-09-27-pkp-lib-13376.md`; U06 A10. Intention gap, not a regression (every newcomer was greeted by address before). Cause: the names are copied onto the recipient for one locale only, `setData()` reads the name in the request's locale. Minor. 3.5 shows it too since the backport #13382 (`e4e720a7f6`) reached the pointers: leg `s2e` by address on OJS and OMP at lib/pkp `1fb843f491` (`.reports/sync-3_5/s01-13376/`, 2026-10-01). Still reproduces 2026-09-30 at omp `3b0ecf794` / lib/pkp `3dc90c81a6` (`.reports/sync/s30-13376/`: leg `s2e` greets by address). |
| pkp/pkp-lib#12798 (pkp-lib#12959 `8240fbe6cc` + #13398 `1ad4a14bb2`, 2026-09-25) | The decision page "Move to Review" opens is headed "Move to Submission" on every submission, after a review round too (`record.tpl` calls `getLabel()` without the submission); the decisions API labels a recorded decision from the current rounds | OJS OMP | `checks/U32/K4/k4.js` (records the h1, breadcrumb and title); `checks/sync/pkp-lib-12798/decisions-label.js`; fixed when the h1 reads "Move to Review" after a round | 2026-09-26 (thread + DMs to @beaug, @jarda.kotesovec) | Report: `docs/reports/2026-09-26-pkp-lib-12798.md`; U32 A13. Minor. U32 S7/S9 were red on CI from 2026-09-26 00:31 until the maintainer's call the same day: the tests accept either heading and read the destination from the breadcrumb ("Move to Review"), `openDecision` (OJS `CopyeditingStagePages.js`) and `startMoveToReview` (OMP); restore the exact heading when the fix lands. Still reproduces 2026-09-27 at ojs `72b85f4ba0` / pkp-lib `26ae6431b5` (`.reports/sync/s27-12798/s1-ojs.json`: the recorded "Move to Review" relabelled "Move to Submission" once the round is cancelled). Still reproduces 2026-09-29 at ojs `9d9f116f38` / pkp-lib `fab29cfeca` and 2026-09-30 at ojs `7ce98ec09e` / pkp-lib `3dc90c81a6` (`.reports/sync/s30-12798/s1-ojs.json`: the recorded decision relabelled "Move to Submission"). |
| pkp/pkp-lib#13181 (commits `4d9ec3cbd0`, `aeac6f75cf`, 2026-09-16; no PR page) | Email-change links, (2) of the report (its (1), the site-level landing, risk accepted 2026-09-25 as U03 A18): a pending request's "reject" link in the shape mailed before the change (`{journal}/invitation/decline`), one-language journal on a two-language site: "Confirm Decline Invitation" ends in a blank GET 500, request still pending | OJS OMP OPS · stable-3_5_0 too | `checks/sync/pkp-lib-13181/emailchange-links.js`; fixed when `s4.chain` ends on the Contact tab with `s4.stillPending` 0 (the `s3` landings are (1), accepted) | 2026-09-17 (thread + DMs to @beaug, @jarda.kotesovec) | Report: `docs/reports/2026-09-17-pkp-lib-13181.md`. Cause: the email-change invitation is created without a journal (`BaseProfileForm::execute()`), so the new `Invitation::getContextPath()` answers `index` for it; the decline form's address takes the site path while its language segment follows the served journal. Weight minor (1) and low, transitional (2). Register entry in U03 for (1): A18, risk accepted by @jarda.kotesovec 2026-09-25 after @asmecher closed #13181 as "OK with the current behaviour" (2026-09-18); the row now tracks (2) alone. Reproduced three times 2026-09-17 on OJS `c0ca4b3caf` / pkp-lib `efbba94ae7`, twice on a freshly reset database (`.reports/sync/s17-13181/`, `s17-13181b/`). **2026-09-18**: OMP (`c6a132892`) and OPS (`4bb66b1469`) received the change with lib/pkp `1bcd4dd55f` and show both findings as OJS (`7c8d69af3e`) does, kept script on databases reset that morning (`.reports/sync/s18-13181-{ojs,omp,ops}/`); U03 A18 now covers the three apps, A3 and A1 retired (the same change fixed them, `checks/sync/pkp-lib-13181/a1-a3-redrive.js`). **3.5 shows it too**, at ojs `63c7e555cc` / lib/pkp `9ce915e07e` (twins `ac6b031624`, `78d439c8b8`; the kept script on the line's fresh OJS fleet, `.reports/sync-3_5/s18-13181-ojs/`: both landings `index/en/user/profile#contact`, `s4.chain` ending in GET 500, `stillPending` 1); the report carries the update. Still reproduces 2026-09-21 on `main` at ojs `cc81df882a` / pkp-lib `63945bbd82` (`.reports/sync/s21-13181/`: both landings `index/en/user/profile#contact`, `s4.chain` ending in GET 500, `stillPending` 1) and on the line at ojs `769450f2d4` / lib/pkp `6acb1be2eb` (`.reports/sync-3_5/s21-13181-ojs/`, the same three reads). Still reproduces 2026-09-22 on `main` at ojs `38781720df` / pkp-lib `f8bacd7658` (`.reports/sync/s22-13181/`: both landings `index/en/user/profile#contact`, `s4.chain` ending in GET 500, `stillPending` 1); the line's tips unchanged since 2026-09-21, not re-run there. Still reproduces 2026-09-23 at ojs `802202cb3e` / pkp-lib `5af3b39336` (`.reports/sync/s23-13181/`: the same three reads); the line unchanged, not re-run. Still reproduces 2026-09-24 at ojs `71bb244152` / pkp-lib `25182919bf` (`.reports/sync/s24-13181/`: both landings `index/en/user/profile#contact`, `s4.chain` ending in GET 500, `stillPending` 1; issue #13181 closed upstream, the behaviour unchanged); the line's new tip carries no #13181 change, not re-run. Still reproduces 2026-09-27 at ojs `72b85f4ba0` / pkp-lib `26ae6431b5` (`.reports/sync/s27-13181/`: `s4.chain` ending in GET 500, `stillPending` 1); the line unchanged, not re-run. Still reproduces 2026-09-29 at ojs `9d9f116f38` / pkp-lib `fab29cfeca` (`.reports/sync/s29-13181/`: `s4.chain` ending in GET 500, `stillPending` 1); the line's new tip carries no change to the email-change path, not re-run there. |
| pkp/ojs#5813 (`325931a71c`, 2026-09-21: `plugins/generic/jatsTemplate` `c1c0e5379f..1065bb02ae` for pkp/pkp-lib#12356; tracking issue pkp/pkp-lib#13378, filed 2026-09-22 from the report, abstract only) | Default JATS XML (the Publication › "JATS XML" page, its download, `GET …/publications/{pid}/jats`, the OAI-PMH `jats` record): an abstract that names tags as text with a matching close tag ("write <i>species names</i>", "<p>text</p>") comes out with the names turned into markup and the sentence split into paragraphs | OJS (the plugin ships in OJS alone) · stable-3_5_0 too (titles) | `checks/sync/ojs-5813/default-jats.js`; fixed when `after-literal2.xml`'s `<abstract>` holds one `<p>` with `&lt;i&gt;species names&lt;/i&gt;` as text | 2026-09-22 (thread + DMs to @beaug, @jarda.kotesovec) | Report: `docs/reports/2026-09-22-ojs-5813.md`. Cause: `JatsHelper::htmlToJatsContent()` decodes entities before re-escaping, so a literal `&lt;i&gt;` and a real `<i>` meet `convertEscapedTags()` as the same string; the deleted `htmlAbstractToJats.xsl` parsed with `loadHTML()` where an entity is text. Minor (narrow input, output only, DTD-valid so silent). Reproduced 2026-09-22 by rr14 and re-held on a freshly reset OJS the same day (`.reports/sync/rr14/after-literal2.xml`, records `.reports/sync/s22-5813-fresh/`); the "before" is the deleted stylesheet run standalone on the same stored string (`rr14/before-literal2.xml`), no live pre-change fleet. Not on the stable line's plugin (predates the path). Still reproduces 2026-09-23 at ojs `802202cb3e` (plugin pointer unchanged; `rr14/after-literal2.xml` rewritten 12:12, records `.reports/sync/s23-5813/`). 2026-09-24: the script made portable (its input now kept beside it as `checks/sync/ojs-5813/abstracts.json`, outputs in the kit's `.reports/sync/<PROBE_AGENT>/`); still reproduces at ojs `71bb244152` (`.reports/sync/s24-5813/after-literal2.xml`: four `<p>` with `<italic>species names</italic>`; issue pkp/ojs#5813 closed upstream, the plugin pointer unchanged). Delete when the plugin's fix lands. **2026-09-25**: titles too (the same helper builds article-title, subtitle and the translated ones: "The <i>species</i> element" typed in "Title & Abstract" comes out as `<italic>`), on `main` since jatsTemplate `be30f06` (2026-07-08, before this change); **3.5 shows it in titles** since pkp/ojs#5827 (`4a76983529`) at ojs `a3dc3b54ff` (3.5's JATS has no abstract), `checks/sync/ojs-5827/titles.js` `RR16_ONLY=s1` on both (`.reports/sync/s25-5827-main/`, `.reports/sync-3_5/s25-5827-fresh/`); report updated, one report. Still reproduces 2026-09-27 at ojs `72b85f4ba0` (`.reports/sync/s27-5813/after-literal2.xml`: four `<p>`, `<italic>species names</italic>`). Still reproduces 2026-09-29 at ojs `9d9f116f38` (`.reports/sync/s29-5813/after-literal2.xml`: four `<p>`, `<italic>species names</italic>`). |

## Flake watch — known non-deterministic failure classes

Not regressions. The response is a targeted rerun and a dated tally on
the line (a line keeps its last three); a real investigation starts when the class's watch condition
trips.

- **Decision-wizard timing under load.** U26 S5/S7/S8, U49 S11 and U21 S10
  exceed their waits during full-suite runs and pass in isolation or on
  retry. The mechanism is app-changes row 9: the post-save publication
  refresh remounts workflow components mid-interaction, and under load the
  window widens. The harness mitigates with outcome-keyed retries and
  content-verified saves (U40 S4 on OJS and OPS, U49 S11 on OJS since
  2026-09-01); the fix is upstream. Reported to the team 2026-08-29.
  U26 S6 on OJS joined the list 2026-09-15 (the maintainer's second local
  8-worker run at the merged tips, `.reports/flake-local/run2.log`: the
  new-round wizard's composer mask still up after 30 s), green alone 2 of 2.
  Last incidents: U21 S11 red on OMP with its retry exhausted 2026-09-03 (run
  33745718330), green on the targeted rerun; U40 S6 then U40 S4 red on OMP in
  two consecutive local final runs 2026-09-05 (U29 session, load average ~15
  on 10 cores), green on the third; U40 S4 red on OMP in two of four local final
  runs 2026-09-07 (U21 revision; the first at load ~15 on 10 cores), green
  on the others, and in the second of the U23 revision's local final runs
  2026-09-08. U40 S4 red on OMP in the first of the U26 revision-2 local
  finals 2026-09-12 (load ~16 on 10 cores), green alone; U43 S4 (a click
  hitting the 180 s test timeout) red on OMP in the accepted run 2026-09-13,
  green alone in 12 s; U26 S10 (the decision wizard's "Notify Authors"
  composer read empty for its 20 s wait) and U40 S3 (the "Publication: Title
  & Abstract" heading not found in 30 s) red on OMP in the first U31
  revision local final 2026-09-13 (load over 100 on 10 cores from the
  desktop), both green in the second full run; U40 S4 (the edited abstract not
  found in 30 s) red on OMP in the first U03 revision final 2026-09-13, green
  alone in 5 s and in the second full run; U40 S4 red on OMP in the first
  U06 revision final 2026-09-13, green alone in 5.1 s; U40 S6 (the "This field is required." message not shown in 10 s after the cleared title's "Confirm") red on OMP in the first U35 local final 2026-09-20 (4 workers), green alone in 13.5 s. Sighted 2026-09-23 on the Mac: red in 5 of 5 runs during the U37 harness step on a used OMP database, the file alone and `--repeat-each 3` included, and also with the builders at HEAD (`.reports/U37/harness/rerun-omp-U40-S6-baseline.log`); then red in the U37 OMP final on a reset database at auto workers, the only red of 291 (`.reports/U37/final-run-omp.log`), and green alone right after (`alone-omp-U40S6.log`). Unread whether used-database state or load drives it. Again 2026-09-25 in the U47 session's third OMP final on a reset database at auto workers, green alone (`.reports/U47/final-run-omp.log`, `alone-omp-reds.log`). **Watch condition**: a
  hardened test reds again with retries exhausted.
  **U40 S4 on OMP, mechanism found 2026-09-15** (a retained trace,
  `docs/reports/2026-09-15-flake-investigation.md`): `WorkflowPublicationForm`
  is one component instance for every Publication page, and on a page
  change it re-fetches the form without clearing the one on screen, so
  the previous page's form stays editable until the fetch lands and then
  resets. The test's fill and blur ran on the stale Title & Abstract form
  18 ms before the re-fetch landed; the PUT carried the seeded abstract.
  Patch: `docs/reports/2026-09-15-ui-library-publication-form-key.patch`
  (a fresh component per Publication section; the earlier
  `...-publication-form-clear.patch` kept the instance and cleared the
  form instead); the A/Bs are in the report.
  **Merged upstream 2026-09-15** (ui-library `70b0892042`): a section
  switch mounts a fresh form. Once the sync baselines carry it, the U40
  `blur()` before Save and app-changes row 9 (c) can be revisited.
  The U40 OMP file keeps traces on failure since 2026-09-15.
  **Baselines carry `70b0892042` since 2026-09-16** (sync); the U40 OMP
  `blur()` stays (a harmless commit), app-changes row 9 (c) is closed on
  the tips, (a) and (b) stay open. Again 2026-09-25 (U50 session, Mac, reset database, auto workers): OMP U40 S6 red in the OMP final, green alone (`.reports/U50/final-run-omp.log`, `alone-omp-reds.log`). Again 2026-09-25 (U51 session, Mac, reset database, auto workers): OMP U40 S6 red in the OMP final, green alone (`.reports/U51/final-run-omp.log`, `alone-omp-reds.log`). Again 2026-09-28 (U72 harness step, Mac, used OMP database): OMP U40 S6 red in the U40 regression run, green alone (`.reports/U72/harness/harness-log.md`). Again 2026-09-28 (U69 session, Mac, reset database, auto workers): OMP U40 S6 red in the OMP final, green alone (`.reports/U69/final-run-omp.log`, `alone-reds.log`). Again 2026-09-29 (U74 session, Mac, reset databases, auto workers): OMP U40 S6 red in the OMP final ("This field is required." not shown in 10 s), green alone (`.reports/U74/final-run-omp.log`, `alone-omp-reds.log`).
  **OMP U40 S6 diagnosed 2026-09-30** (housekeeping,
  `.reports/flake-0930/u40s6/`; CI 36529998661 and about ten local reds
  since 2026-09-20): not this class's remount. The second panel open waited
  for the form only, so French was picked before the publication fetch
  landed (A15's stale prefill), and the clear ran on a Title editor not yet
  initialized; under load its style sheets queue behind that fetch on the
  one-request `php -S`, the keys are lost and Confirm sends the English
  title. The OMP test now gates each open on the subtitle and waits for the
  editor (OJS and OPS already did): red 5 of 5 under a fetch-and-CSS hold
  before, 5 of 5 green after; the OMP U40 file 50 of 50 at eight workers.
  **Watch condition**: a U40 S6 red behind the new gates.

- **Reviewer dashboard list under load** (U28 S1/S2, OMP; the roster
  reviewers' whole assignment list). **Fixed 2026-09-26** (`.reports/flake-s26/fixAD/diagnosis.md`):
  `ReviewerPages` `goto`/`selectView`/`expectSettled` wait for the view's
  own `_submissions/reviewerAssignments` answer and `viewCount` for the
  number the separate count fetch fills in (held 3 s: red 3 of 3 before,
  0 of 3 after). **Watch condition**: a U28 list red behind those waits;
  then move the leg to a throwaway reviewer.

- **Error dialog stacking over the Add Reviewer windows** (U31 S4, OMP and
  once OJS). The "Error" dialog's overlay intercepts the window's "Close"
  and the test runs to its five-minute timeout (seen first by the U31 test
  author on 2026-09-06, one re-run). Last incidents: OMP red in a local
  final run and again alone 2026-09-07, green in two full runs earlier that
  day; OJS red in a local final run 2026-09-08 (U23 revision), the first
  time on a journal. **Watch condition**: reds on CI. Again 2026-09-29 (U74 session, Mac, reset databases, auto workers): OJS U31 S4 red in the OJS final beside S2, both at "Reviewers Suggested by Author" not visible in 10 s, not at the dialog; both green alone (`.reports/U74/final-run-ojs.log`, `alone-ojs-reds.log`).
  **Diagnosed 2026-09-30** (housekeeping, `.reports/flake-0930/u31s2s4/`):
  the four CI reds of 09-25..29 (OJS/OMP S2 and S4 at
  `ReviewerSuggestionPages.js:484`) were lost presses, not a slow server:
  the "Files To Be Reviewed" grid and the jQuery-animated "No Files
  Selected" notice push "Add Reviewer" down ~114 px between the
  button-down and the up, so no request goes (the CI server logs hold no
  POST); the U74 Mac read was the suggestions panel drawn only after its
  own fetch. Fixed in the page objects (`waitForLegacyFormSettled` in
  `support/legacy.js`, used by `ReviewerRequestWindow` and 10 other call
  sites on OJS and OMP; `SuggestedReviewersPanel.loaded()`): red 14 of 14
  under a grid-hold lever before, 0 of 18 after; U31 45 of 45 and OJS U27
  90 of 90 at eight workers. Rule in patterns.md "Legacy jQuery flows".
  Left: U31's reads right after a submit still give the panel's refetch
  10 s. **Watch condition**: a U31 red behind the settled window.
- **U01 S8 hangs on a used database** (OJS and once OPS, local only so far). After a
  day's probes, checks and suite runs on one database, "S8: editor
  impersonates a participant from the Participants panel" hit its 4-minute
  timeout twice in a row (the editor's dashboard showed 129 assigned
  submissions); it passed in 8 s right after `reset:ojs` and the final
  run was green. Seen 2026-09-05 (U29 session, `.reports/U29/pw-out-u01s8`
  in git-ignored scratch). A milder OPS sighting 2026-09-13 (U03
  revision, first local final at workers auto, a database reset that
  morning and used by three author runs): the impersonated author's
  workflow window opened but its "Submission {tag}" title was not found in
  10 s, green alone in 11 s (`.reports/U03/final-run-ops-run1-red.log`).
  CI runs on a fresh database, so no CI incident yet. **Watch
  condition**: S8 reds in CI, or a local run on a fresh database reds;
  then bisect the participant panel against submission volume.
- **Reviewer-indicator popover under load** (U23 S9, OJS). The row with
  two reviewers opens the wrong reviewer's popover (Paul instead of Julia)
  during a full-suite run and passes in isolation; the hover target is
  settled before both indicators have rendered. Seen once, 2026-09-04
  (U05 final run, `.reports/U05/final-run-ojs.log`), green alone and on
  the OJS re-run the same day; seen a second time 2026-09-13 (U04 final
  run, `.reports/U04/final-run-ojs-run1-red.log`), green alone in 14.7 s.
  Watch condition tripped 2026-09-13; **hardened 2026-09-14**: the two
  awaiting indicators share one accessible name ("Awaiting Response from
  the reviewer", the reviewer's name lives only inside the opened
  popover) and the submission's review assignments come back in no
  fixed order (`reviewAssignment/Collector.php` has no `ORDER BY`), so
  the class is "unordered same-status indicators", not a render race;
  `EditorialDashboardPage.openActivityPopoverFor()` now waits for the
  row's expected indicator count, opens the candidates in turn and
  returns the popover naming the reviewer (OJS S9's two Julia legs;
  the OMP S9 already tolerated either order). Green alone on OJS and OMP
  (14 s each). Seen 2026-09-15 in the maintainer's first local 8-worker run
  at the merged tips (`.reports/flake-local/run1.log`) at an earlier point:
  the search for the tagged row after the reviewer's accept found nothing
  in 30 s (the hardened opener was not reached); green alone 2 of 2.
  **Watch condition**: a red with the hardened opener.
- **A wizard press swallowed the instant a step becomes current** (U21
  S10 and S12, OJS, CI only). CI run 34215183797 (2026-09-08, pkp-e2e
  `main` at `aa12a61`, a docs-only push) red on both attempts of S12: the
  Continue press issued right after the rail showed "2 Details" fired no
  save and the rail stayed put for the 30 s wait; green on the same tree
  and tips elsewhere. Second incident 2026-09-12, pkp-e2e run 34687878464
  (companion `13274` at the ojs PR ref `75df364d49`): S10 red on both
  attempts (the Review step's "Submit" press opened no confirmation
  dialog, no `/submit` request in the server log; the retry stuck on "2
  Details") and S12 red once on the same "2 Details" wait, green on
  retry; both green locally at the same ref. The ojs PR's own run
  34683529824 (read once the token worked) is the same class: U31 S1 red
  on both attempts and U21 S12 once, all on the "2 Details" wait after
  Continue. Watch condition tripped;
  hardened 2026-09-12: `SubmissionWizardPage.pressUntil()` gives a
  footer press an 8 s window for its outcome and presses again while the
  button is still offered, at most three times, behind `continueTo()`,
  `continueToReview()` and `submitAndConfirm()`. **Watch condition**: a
  hardened press reds again with its retry exhausted. **Seen locally on
  OMP 2026-09-13** (U24 revision session, the first OMP final at four
  workers, `.reports/U24/final-run-omp-attempt1.log`: U21 S6's rail
  still reading "2 Details" for the 44-poll wait on "Contributors" after
  Continue, the one red of 214; the class's first local and first OMP
  sighting, beside U04 S10's OMP entry below).
  **Mechanism found 2026-09-15** (`docs/reports/2026-09-15-flake-investigation.md`):
  the step rail (`Steps.vue`) animates a 500 ms scroll to the page title
  after every step change; under a janky main thread Playwright's
  two-frame stability check passes mid-animation, the mouse-down lands on
  Continue, the animation's final jump moves the page and the mouse-up
  lands in the abstract's editor iframe (Playwright validates only the
  first pointer event of a click). Probe at 6× CPU throttle: 11 of 24
  presses lost on the stock bundle, 0 of 24 with the reduced-motion patch
  (`docs/reports/2026-09-15-ui-library-steps-reduced-motion.patch`, for
  ui-library upstream; the preferred variant replaces the plugin with
  native scrolling and a stylesheet rule, `2026-09-15-native-scroll-*.patch`,
  same result); the harness now passes `reducedMotion` to the
  `asUser` contexts, which it never had. The `pressUntil` retry stays
  until the patch lands. **Merged upstream 2026-09-15** (ui-library
  `393dd28952`/`d5d7017074`, pkp-lib `b262d27b81`, ojs `e0e0275a55`, omp
  `6eb3b935ad`, ops `fb72f079ba`): the plugin is gone and reduced motion
  means an instant jump (decided per call in `useScrollTo` since the
  same-day follow-up: a global `scroll-behavior: smooth` rule broke the
  Cypress suite's own scrolls; verified here at the merged tips: the
  scroll animates without the preference, jumps with it, the throttled
  probe loses 0 of 24 presses, U21 16 of 16). Once the sync
  baselines carry these, `pressUntil()` can go back to a single press.
  **Watch condition**: a lost press at tips carrying the merge.
  **Seen on a footer button
  without the bounded retry 2026-09-15** (sync session, the second OJS
  final at four workers on a reset database,
  `.reports/sync/final-run-ojs-attempt2.log`): U22 S2's "Save for Later"
  press on the Details step, issued right after `continueTo('Details')`
  returned, left the wizard on "Make a Submission: Details" for the 45 s
  wait for the "Saved for Later" heading (the error context shows the
  step still current and the button still offered), one of two reds in
  216. `SubmissionWizardPage.saveForLater()` presses once; the next
  step is the same `pressUntil()` shape behind it. Green alone in 14.1 s right after (`.reports/sync/s15-ojs-reds-alone2.log`) and in the traced third final (229 passed). **Baselines carry the merge since 2026-09-16** (sync: ojs `ae597ff9d9`, omp `0ec98a508`, ops `9ce633ee1d` with pkp-lib `b262d27b81` and ui-library `977e460c`, the per-call reduced-motion follow-up); `pressUntil()` stays as a content-verified bounded retry, which presses again only when a press was lost, so the watch condition above is live and a lost press shows as the retry firing.
- **The Notify window's template body never landing in the editor under
  load** (U41 S3, OJS, once). `PublicationScreen.notifyParticipant()`
  (`apps/ojs/playwright/pages/PublicationMetadataPages.js`, U40's helper,
  U41 S3's positive mail control) selects "Discussion (Submission)", waits
  for the template fetch, then waits 30 s for a TinyMCE editor inside
  `form#notifyForm` that is initialized and non-empty; in the U41 revision
  session's second OJS final at four workers on a reset database
  2026-09-16 (`.reports/U41/final-run-ojs.log`, the one red of 235, the
  13 serial tests skipped behind it) the window was open with the template
  selected and the fetch answered, but the editor's iframe held one empty
  paragraph for the whole wait (the error context). Green alone in 10 s
  right after (`.reports/U41/rerun-ojs-s3.log`), green in the day's first
  OJS final and in every author run. Second sighting 2026-09-16, the U43
  revision's first OJS final at four workers on a reset database (the one
  red of 236, `.reports/U43/final-run-ojs-attempt1.log`, the same
  `waitForFunction` timeout at the same line); third sighting the same
  session's second OJS final on a reset database, from U41 S1's mail
  control through the same helper (`.reports/U43/final-run-ojs.log`, the
  one red of 236, both times green alone right after,
  `rerun-ojs-s3.log` and `rerun-ojs-s1.log`). **Watch condition met, hardened
  2026-09-16** (sync session): `notifyParticipant()` waits 15 s for the
  template in the box and, when that runs out, fires the template
  select's change handler again, awaits its fetch and waits 30 s more (a
  content-verified bounded retry, the pattern above); U41 S1 and S3 green
  alone with it (`.reports/sync/s16-alone-ojs.log`, 11.0 s and 7.9 s).
  **Watch condition**: the hardened helper reds again with its retry
  exhausted.
- **Contributor reorder under load** (U41 S2, OPS; the OJS twin shares the
  code shape). The Cancel leg's "Increase position" press, issued right
  after "Order" while the list re-rendered into ordering mode, left the
  order unchanged for its 10 s wait: locally at four workers 2026-09-09
  (`.reports/sync/final-run-ops.log`) and on CI 2026-09-10 with the retry
  exhausted (pkp-e2e `main` run 34466942823, a docs-only push; the nightly
  34558837065 on the same tree and the newer OPS tip green). Watch
  condition tripped; hardened 2026-09-11: the leg is a content-verified
  bounded retry like the Save leg (re-enter ordering if dropped, wait for
  the row's own arrow, press, pass only when the list shows the move), on
  OPS and OJS. The OMP twin, left without it, red the same way in the
  sync session's OMP final at four workers 2026-09-14
  (`.reports/sync/final-run-omp.log`, the one red of 214; green alone in
  7.7 s) → hardened the same day with the same bounded retry (green
  alone twice). **Watch condition**: a hardened leg reds again with its
  retry exhausted.
- **Review wizard step not advancing on "Accept" under load** (U28 S10,
  OJS; the shared `ReviewerPages.accept()` serves OMP and OPS too). The
  one-click-access leg's accept press left step "2." disabled for its 30 s
  wait during local full runs at four workers: 2026-09-09 (sync session)
  and again 2026-09-11 (sync session, `.reports/sync/final-run-ojs.log`,
  the same `aria-disabled="true"` tab for 63 polls); green in 17 s alone
  both times (2026-09-12 rerun `.reports/sync/u28s10-rerun-0912.log`) and
  on CI at the same tips (run 34354844582). Watch condition tripped;
  hardened 2026-09-12: `accept()` is a content-verified bounded retry
  (press, wait up to 10 s for step 2 to become current, press again while
  the accept button is still offered, at most three presses). **Watch
  condition**: the hardened leg reds again with its retry exhausted.
  **Tripped 2026-09-13** (U05 revision session, the OJS final at four
  workers, `.reports/U05/final-run-ojs.log`: the same `aria-disabled="true"`
  tab for 63 polls after the hardened accept, the one red of 209; green
  alone in 49 s, `.reports/U05/u28s10-rerun-0913.log`); the bounded retry
  did not cover it, so the leg needs a second look. Tripped again the same
  day (U22 revision session, the second OJS final at four workers,
  `.reports/U22/final-run-ojs-attempt2.log`: the same tab, 63 polls, the
  one red of 212), and a third time (U24 revision session, the first OJS
  final at four workers on a reset database,
  `.reports/U24/final-run-ojs-attempt{1,2}.log`: one of two reds in 216,
  in both OJS finals of that session). Green in the sync session's OJS final at four workers 2026-09-14 (229 passed, traces retained).
  The hottest single flake on CI (23 first-attempt reds in nine days,
  `docs/reports/2026-09-15-ci-flake-tally.md`), never with a trace of the
  failing attempt; since 2026-09-15 the U28 file keeps traces on failure
  (`test.use({trace: 'retain-on-failure'})`), so the next CI red carries
  one. The mechanism is not the wizard's scroll animation (a legacy jQuery
  page); read the trace before hardening again.
  **Tripped again 2026-09-15** (sync session, the first OJS final at four workers on a reset database with the perf round-2 harness and `persistent = On`, `.reports/sync/final-run-ojs.log`: the same `aria-disabled="true"` tab for 63 polls after the hardened accept, one of three reds in 216; green alone in 45.9 s, `.reports/sync/s15-ojs-reds-alone.log`). Red again in the second OJS final the same day (`.reports/sync/final-run-ojs-attempt2.log`, one of two reds) and then **red alone** on that used database (`.reports/sync/s15-ojs-reds-alone2.log`, 1.2 min: the reminder-link leg's accept, the `2. Guidelines` tab disabled for 63 polls), the class's first alone red; green in the traced third final on a reset database (229 passed, 17.1 min) so still no trace, and green first try on CI the same day (pkp-e2e run 34952057769, ojs run 34956195225). Next step unchanged: a retained trace of the accept POST from a red run.
  **Sighted again on CI 2026-09-19** (pkp-e2e push run 35436736454 at
  `55bc9d0`, the U32 push: OJS red on U28 S10 on both attempts, 1.7 min
  each, 254 passed and the 15 serial tests behind it did not run; OMP and
  OPS green). Read by the U33 session before its own push run 35474559640.
  Again 2026-09-28 (U65 session, VM, reset databases, auto workers): OJS U28 S10 red in the OJS final, the only red of 600 (the serial and solo passes green), green alone in 45 s (`.reports/U65/final-run-ojs.log`, `alone-reds.log`).
  **Mechanism found and fixed 2026-09-29** (housekeeping,
  `.reports/flake-2026-09-29/u28s10/diagnosis.md`, from three CI traces of
  failed first attempts: ojs 36316939718, pkp-e2e 36381740615 and
  36418555304): the test's own race in the shared page object. The
  wizard's steps are jQuery UI tabs with remote panels, selected when the
  fetch starts; `accept()` counted the privacy box while step 1 was still
  empty, read 0, never ticked it, and every press was refused in the page
  ("This field is required.", no request), so the press-again retry could
  never help; one trace showed the other shape, "Continue to Step #3"
  pressed on the old step-2 form during its re-fetch. `expectStep()` now
  waits for the tab's loading and busy marks to clear and the form to
  attach; `accept()` presses once after step 1 is shown. With step 1 held
  3 s, or step 2's re-fetch and save held: red 10 of 10 before, 0 of 10
  after, each; OJS U28 `--repeat-each 5` at eight workers 80 of 80, every
  other wizard caller on OJS and OMP green once. Rule in patterns.md "UI
  realities". **Watch condition**: a U28 S10 red after the fix.
- **A page-level Escape closing the workflow panel behind a "More
  Actions" menu** (U30 S4, OJS; CI's second family, 15 first-attempt reds
  in five weeks; most local OJS finals at four workers since 2026-09-12;
  read before as "the Author Response table re-rendering"). **Mechanism
  found and fixed 2026-09-26** (`.reports/flake-s26/u30/diagnosis.md`):
  the test opened a row's "More Actions" and pressed Escape on the page;
  headlessui moves focus into the menu two animation frames after the
  click, so an Escape inside that window reaches the workflow panel's
  reka dialog, which closes, and the row button never comes back (the
  U01 S7 race of 2026-09-13, fixed then in one page object only). Held
  with `requestAnimationFrame` delayed 150 ms: red 10 of 10 before, green
  10 of 10 after; U30 35 of 35 at `--repeat-each 5`. `closeMenu(page)` in
  the new `shared/playwright/support/menus.js` presses Escape on the menu
  itself and waits for it to close; U30, OJS FundingPages and
  PublishSchedulePages, OJS U04 S9, OPS U41 S4 and OMP U49 S18 use it;
  `npm run lint:suite` flags every other page-level Escape. U30 S1/S3's
  `gotoAuthor()` reds all predate the roster-rehash fix `cdf9458`. **Watch
  condition**: a U30 red behind `closeMenu`.

- **"Create New Version" dialog's stage select empty under load** (U49
  S4/S6, OJS, OMP and OPS; sightings from 2026-09-15 to 2026-09-24 on
  the VM, the Mac and twice on CI: push run 35126077430 and, on
  2026-09-24, push run 35987189615 at `1cd4325`, OPS shard 1/3 red on
  both attempts, the second dialog's "Publication Stage" with nothing
  checked for the wait for "Author Original (AO)"). **Cause read
  2026-09-24** (the daily session): nothing arrives late inside the
  dialog. `useWorkflowVersionForm()` copies the stage from the store's
  `selectedPublication` once, at mount, and the workflow store empties
  `selectedPublication` each time the menu moves to another version
  (`selectPublicationId()`, run by a pre-flush watch, so before the
  version dialog leaves the page) until that version's GET answers. The
  openers pressed "Create New Version" as soon as the side menu listed
  the new version (the submission refetch), so under load the dialog
  mounted inside that gap and kept an empty stage and no preselected
  "Minor Revision" for good; the hardened 15 s wait for a value could
  never help. Reproduced deterministically with every
  `…/publications/{id}` GET held 6 s on a reset OPS database
  (`.reports/sync/s24b-u49s6/old-delay.log`: red on the first dialog).
  **Fixed the same day**: `WorkflowPage.expectVersionLoaded()` waits
  for the header's contributors line (rendered only once the selected
  publication is back) and the three openers (OPS
  `createNewVersionViaDialog()`, OJS
  `PublishScreen.openCreateVersionDialog()`, OMP
  `openCreateVersionDialog()`) call it before the press; the 15 s value
  wait is gone. Green with the 6 s hold (`fixed-delay.log`) and U49 on
  the three apps on reset databases, first run (OJS 16, OMP 14, OPS 13;
  `u49-<app>.log`). **Watch condition**: any red of this read behind the
  new opener; then read the error context's header for the contributors
  line. Held on the Mac the same day (U42 session): OPS S6 red alone five
  times before the fix reached that tree, a reset database included, and
  green alone after it on the same database
  (`.reports/U42/alone-ops-U49S6-*.log`).
- **CI worker server refusing connections during the login smoke** (OJS
  job, once). The U06 push's run 34773613958 (2026-09-13, `main`) failed
  its OJS job on the shared login smoke alone: `socket hang up` on the
  scenario API and `net::ERR_CONNECTION_REFUSED` at `127.0.0.1:8000`
  on the retry too, so the worker server had died or never answered;
  the OMP and OPS jobs of the same run passed, and the U04 push's run
  34768503126 an hour earlier was green on all three. No local
  counterpart. **Watch condition**: a second CI job lost to a refused
  worker port; then read the job's server log step. **Second sighting
  2026-09-27** (branch `reset-before-serial`, run 36319190019, OJS 3/3,
  the only red of 9 jobs): U03 S2 in the app pass, 30 s into it; the
  scenario API answered, then `page.goto` 5 s later got
  `ERR_CONNECTION_REFUSED` at `127.0.0.1:8002`, and the retry 136 ms
  later `ECONNREFUSED` on the scenario API. The other 168 tests of the
  pass were green, later ones on 8002 included, so the server came back
  (the restart wrapper in `php-server.js`). The server log could not be
  read: every pass starts its servers with `: > <log>`, so the solo
  pass's start emptied the app pass's `server-8002.log` (the artifact
  holds 257 bytes from 12:43). **Diagnosed as a class 2026-09-29**
  (housekeeping, `.reports/flake-2026-09-29/u01s4/diagnosis.md`): U01 S4
  "recover a forgotten password" on all three apps (ojs 36322492229,
  36459832328; pkp-e2e 36414422622 OPS, 36428321161 OMP), each a page
  load with no answer (`ERR_EMPTY_RESPONSE`, a Chrome error page, a load
  timeout) in the first test its server served, green on retry; U01 S1,
  S5, S7 and U03 S1, S11 show the same on CI 2026-09-22..28. A worker
  `php -S` dying, not the test: the known OPcache fault (app-changes row
  18) on other classes, or the JIT CI's setup-php turns on
  (`opcache.jit=1235`; off on the VM; CI PHP 8.3.35 against 8.3.33); 0 red
  in 109 first-test runs here. An induced death gave CI's exact red 8 of 8.
  Now the server logs are appended across a shard's passes with a dated
  `[harness] php -S start`/`died (exit N)` line (`php-server.js`, rotated
  over 20 MB), and a failed test whose server died meanwhile carries a
  `server-crash` annotation, a stderr line and the log excerpt
  (`support/server-crash.js`, the auto fixture `serverCrashWatch`); nothing
  is retried. U01 plus shared `--repeat-each 5` at eight workers 51 of 51
  per app. **Watch condition**: a `server-crash` annotation on CI; read its
  exit code and the request it names. Open for the maintainer: CI without
  the JIT as an experiment. First read with the new logs the same day: push run
  36534260026 (`a110480`, OMP shard 3/3, the run's only red): worker 8103
  died four times in 35 s (exit 139, a segfault, each on a request still
  unanswered), and U20 S8's retry and U21 S8 were refused 0.6 s after the
  last death, inside the restart loop's one-second gap; U21 S8 green on
  its retry. None carried the annotation, since each started after the
  death line was written; the watch now reads back 5 s before a test's
  start (`LOOKBACK_MS`), checked on that log. First annotated sighting the
  same day: push run 36554899964 (`6aaa2e2`, OJS shard 3/3, the run's only
  red): worker 8000 segfaulted (exit 139) at 10:31:02 under U01 S7's
  sign-out (`ERR_EMPTY_RESPONSE`), and the retry, 0.6 s into the restart
  gap, was refused at the Login page, so S7 failed; the `server-crash`
  annotation named both. `php -S` logs a request's path only once it is
  answered, so the crashing request shows as a bare `Accepted` line: the
  path comes from the test's own step in the error context.
  Again 2026-10-01 (CI first attempts, green on retry, all exit 139): OMP
  U03 S6 (pkp-e2e 36919446668, :8100), OMP U03 S10 (36872303797), OPS U12
  S6 @solo (36853975923, 9 s into the solo pass); two deaths went
  unannotated, the test failing on `socket hang up` in the death's own
  second (OJS U03 S6 ojs 36672771134, OJS U12 S4 serial 36872303797): the
  watch read the log before the death line was written.
- **Participants menu still open after the impersonation return** (U01
  S7, OJS, once). In the fourth OJS final of the U05 revision session
  (2026-09-13, four workers, `.reports/U05/final-run-ojs-attempt4.log`)
  the assertion that the Participants panel's menu holds no item after
  "Login As" and the return found two items for 10 s; the only red of
  209, the same test green in the three finals before it. **Tripped the
  same day**: the fifth final, on the same database (used by the two
  finals before it), red on the same assertion alone
  (`.reports/U05/final-run-ojs-attempt5.log`); the assertion is the
  second press of the Editor's own "More Actions" button meant to close
  the menu, so under load the press lands while the panel re-renders and
  the menu stays open. Red again in the sixth final, on a reset database,
  and alone right after it (`.reports/U05/u01s7-rerun-0913.log`), so not
  a used-database class. **Diagnosed and fixed 2026-09-13** (probe record
  `.reports/U05/diag-u01s7.md`): the step is `UsersRolesMenu.close()`
  on the Users & Roles row menu, and the race is the page object's: the
  bundled headlessui MenuButton moves focus into the menu two animation
  frames (23–41 ms) after the click and handles Escape only there, so
  an Escape sent to the page inside that window hits the button and is
  ignored; the suite's open, two expects and close run in about the
  same 20–40 ms, so load tips it. The OJS `close()` and OPS
  `closeMenu()` now press Escape on the menu element itself (focus
  first); green alone on both (`.reports/U05/u01s7-rerun2-0913.log`,
  `.reports/U05/ops-u01-closemenu-0913.log`). **Watch condition**: the
  hardened close reds again.
- **Enroll-reviewer form's "This field is required." not shown under
  load** (U27 S4, OJS, once). In the same 2026-09-13 second OJS final
  (`.reports/U05/final-run-ojs-attempt2.log`, U05 revision session, four
  workers, a used database) the "Add Reviewer" press on the empty
  "Enroll Existing User" form showed no "This field is required." for
  30 s; green alone in 14 s on the same database
  (`.reports/U05/u27s4-rerun-0913.log`). **Watch condition**: a second
  sighting; then retain a trace to see whether the press reached the
  server or the form re-rendered.
- **ORCID connect popup not arriving under load** (U04 S2, OJS, once).
  The `waitForEvent('popup')` after the profile's connect button ran to
  the 60 s test timeout while three suites shared the VM (2026-09-12,
  merge of companion `13274`, `.reports/sync/merge13274-ojs.log`); green
  alone in 5.5 s. **Watch condition**: a second incident, or one at four
  workers alone on the VM. **Tripped 2026-09-23** (U07 feature session):
  OMP this time, in the first OMP final at eight workers with nothing else
  on the VM, the one red of 281 (`waitForEvent('popup')` to the 60 s
  timeout; the failure snapshot is the fixture page, not the user's, so
  it shows nothing; `.reports/U07/final-run-omp-attempt1-red.log`). Owed
  by the next maintenance session: a trace of the popup wait on a
  repeated run.
  CI reds followed (ojs 36144112471 2026-09-25; pkp-e2e 36545452266 OPS
  2026-09-29). **Diagnosed 2026-09-30** (housekeeping,
  `.reports/flake-0930/u04s2/`): not load but the harness: the button's
  `openORCID()` sends the browser straight to `sandbox.orcid.org` (a
  status check, then the window), and the `popup` event waits for that
  window's first response, so a slow ORCID ran the test out (the CI worker
  server got no request after the press). S2 on all three apps now presses
  through `pressOrcidConnect` (`support/orcid.js`), which stubs the ORCID
  hosts in that context only: red 15 of 15 under a 70 s hold on the
  sandbox before, 0 of 30 after; U04 120 of 120 at eight workers. Rule in
  patterns.md parallel lesson 6. **Watch condition**: a U04 red at a press
  that leaves the app.
- **A page load hanging under desktop load** (U04 S6, OMP, once). `page.goto`
  to the scratch press's `/orcid/about` ran to the 60 s test timeout in the
  second U06 revision local final 2026-09-13 (load 15–19 on the Mac from
  the desktop, `.reports/U06/final-run-omp-run2-red.log`); green alone in
  5.4 s. **Watch condition tripped 2026-09-13** (U22 revision session,
  the first OJS final at four workers on the VM,
  `.reports/U22/final-run-ojs-attempt1.log`: U05 S6's `page.goto` of the
  emailed unsubscribe link on worker 8002 ran to the 240 s test timeout,
  the one red of 212; green in the next full run, red the same way in
  the third and the fourth, `.reports/U22/final-run-ojs-attempt{3,4}.log`,
  three of four). The worker
  server's log settles where it hangs: the second `goto` of the link,
  right after the same browser's other tab signed in and was closed,
  never reaches the server (the journal's last request is the closed
  tab's dashboard poll, six seconds earlier), so it is the browser, not
  the app; the OMP incident above was not traced. Two of three OJS
  finals on the VM: the leg wants the closed tab's requests settled (or a
  fresh page) before the `goto`, U05's session to decide. **Seen again
  2026-09-16** (the U41 revision session's first OJS final at four
  workers on a reset database, `.reports/U41/final-run-ojs-attempt1.log`:
  U05 S6 to the 240 s timeout the same way, the one red of 235, the 13
  serial tests skipped behind it; the serial project green alone in
  32.2 s, `.reports/U41/rerun-ojs-serial.log`). **Seen again 2026-09-29** (U66 feature session, the second OJS
  final on a reset database at the new lib/pkp `fab29cfeca`,
  `.reports/U66/final-run-ojs-attempt2.log`: U05 S6 to the 240 s timeout
  the same way, the one red of 612; green alone in the next minute,
  `.reports/U66/alone-ojs-U05S6.log`, then red the same way in the third
  final, `.reports/U66/final-run-ojs.log`, two of two at 8 workers: the
  closed-tab settle is still owed).
  **Diagnosed 2026-09-30** (housekeeping, `.reports/flake-0930/u05s6/`;
  OJS U05 S6 red 2 of 2 in a U66 final 2026-09-29 and on CI ojs
  35922632937): not the `goto` but `otherTab.close()` before it: the tab
  is closed right after the sign-in's commit, the renderer has not taken
  the page in, Chromium loses the close and skips its forced close under
  the debugger, so `close()` waits out the 240 s timeout. Harness fix:
  `closeTab(page)` (`support/tabs.js`, DOMContentLoaded first, a named
  failure at 30 s), used in U05 S6 and the four popups closed right after
  their commit (U08 on all three apps, OMP U73): red 7 of 8 under a 20×
  CPU throttle on the closed tab before, 0 of 24 after; U05+U08 and
  U04+U08+U73 245 of 245 at eight workers. Not this mechanism, unproven:
  CI ojs 35978377116's Profile-heading read and OMP U04 S6's plain `goto`.
  Rule in patterns.md "Auth-style redirects". **Watch condition**: a hung
  `close()` behind `closeTab`, or a second red of either unexplained read.
- **Submission wizard "Continue" not advancing under load** (U04 S10,
  OMP, once). The wizard's rail stayed on "2 Details" for the 20 s wait
  of `SubmissionWizardPages.continueTo()` after the Continue press in the
  first OMP final of the U22 revision session (2026-09-13, four workers
  on the VM, `.reports/U22/final-run-omp-attempt1.log`, the one red of
  210); green in the next full run (`.reports/U22/final-run-omp.log`).
  The same shape as the review wizard's accept leg above, on the
  submission wizard's own rail. **Watch condition**: a second incident;
  then `continueTo()` gets the same content-verified bounded retry.
  **Tripped 2026-09-13** (U24 revision session, the second OMP final at
  four workers, `.reports/U24/final-run-omp-attempt2.log`: U04 S10's rail
  on "2 Details" for the 20 s wait again, the one red of 214; the first
  OMP final of the same session had U21 S6 red on the same rail wait,
  `.reports/U24/final-run-omp-attempt1.log`, dated under the wizard-press
  entry above). **Hardened 2026-09-14**: OMP's `SubmissionWizardPages`
  gained a module-level `pressUntil()` in the OJS shape (an 8 s window
  per press, pressed again while the button is still offered, at most
  three times, then the 30 s wait) behind `continueTo()`, `openReview()`
  and `confirmSubmit()`; OPS's partial 5 s × 3 loop was replaced by the
  same helper on the same three methods. Green alone: OMP U04 S10
  (10.7 s), OMP U21 S6 (20.8 s), OPS U21 S6 (27 s). **Watch condition**:
  a hardened press reds again with its retry exhausted at four workers.
- **Author's save of a new version answered 401 on a used database**
  (U40 S3, OMP, local). After a day of repeats on one database, the
  author's Prefix save on the manager's fresh version got
  `user.authorization.accessibleWorkflowStage` ("You don't currently have
  access to that stage of the workflow") and the test's response wait ran
  out: 9 of 9 red across two bundles (stock and the keyed publication-form
  patch) on 2026-09-15, 6 of 6 green on both right after `reset:omp`, so
  database state, not the build. Not seen on CI (fresh database). **Watch
  condition**: a red on CI or on a reset database; then read which stage
  assignment the author's permission tick lands on.
- **Edit Review window's file checkbox re-ticked under load** (U27 S6,
  OMP, once). In the "Files To Be Reviewed" grid of the Edit Review
  window, the test unticks both files, reads "No Files Selected", then
  `check()`s the first box back: the click landed while the legacy grid
  was re-rendering ("element is not stable" twice before the click) and
  the readback found the box's state unchanged, "Clicking the checkbox
  did not change its state" (2026-09-15, U25 revision's OMP final at four
  workers, `.reports/U25/final-run-omp.log`, error context
  `pw-out-final-omp/U27-reviewer-assignment-Re-4ce6a-…/error-context.md`);
  green alone in 21 s on the same used database. **Watch condition**: a
  second incident; then wait for the grid's reload to settle (the
  `waitForJQueryIdle` helper) between the unticks and the re-tick. Again 2026-09-25 (U50 session, Mac): OJS U27 S6 in the OJS final on a reset database at auto workers ("Clicking the checkbox did not change its state"), green alone (`.reports/U50/final-run-ojs.log`, `alone-ojs-reds.log`).
  **Diagnosed 2026-09-30** (housekeeping, `.reports/flake-0930/u27s6/`;
  tripped by OJS 2026-09-25 and CI omp 36581354102 OMP U28 S4 at
  `ReviewerAssignmentPages.js:183`): the U31 mechanism in the same window:
  the "No Files Selected" notice slides in or out over 250 ms after the
  grid loads and on every box change, moving the boxes ~114 px between the
  button-down and the up (the CI error context: box focused, unticked, no
  save). Today's `waitForLegacyFormSettled` in `openEditReview` closes the
  CI shape; every file-box press now goes through `setEditReviewFile`
  (OJS `ReviewStagePages`, OMP `ReviewerAssignmentPages`), which settles
  before and after: red 6 of 6 under a grid-event lever before, 0 of 14
  after; OJS U27+U28 170 of 170 and OMP U27 95 of 95 at eight workers. The
  09-15 re-tick shape (a press after a box change) went red once in ~70
  lever runs, covered by the same helper, unproven. **Watch condition**: a
  box "did not change its state" behind the helper.
- **Review Details window's star-rating radio not registering the click
  under load** (U27 S9, OMP, once). `ReviewerAssignmentPages.rateReview()`
  (`apps/omp/playwright/pages/ReviewerAssignmentPages.js:352`) `check()`s
  the "5 out of 5 stars" radio in the "Review Details:" window and the
  readback found it unchanged, "Clicking the checkbox did not change its
  state" (2026-09-16, the U49 revision session's first OMP final at four
  workers on a reset database, `.reports/U49/final-run-omp-attempt1.log`,
  the one red of 221 with every U49 test green; error context
  `pw-out-final-omp/U27-reviewer-assignment-Re-ee493-…/error-context.md`);
  green alone in 33 s (`.reports/U49/rerun-omp-u27s9.log`). The same
  symptom as the U27 S6 checkbox entry above, on a legacy window control.
  **Tripped 2026-09-16** (sync session, the OMP final at four workers on a
  reset database at the day's tips, `.reports/sync/final-run-omp.log`:
  the same "Clicking the checkbox did not change its state" on the "5 out
  of 5 stars" radio, the one red of 221); **hardened the same day**:
  `rateReview()` waits for the window's jQuery to go idle, then presses
  and re-checks the radio's state in a bounded retry (at most three
  presses) and asserts it checked before the save is awaited; green alone
  twice (`.reports/sync/s16-rerun-omp-u27s9-{1,2}.log`, 48.8 s and
  47.7 s). **Watch condition**: the hardened press reds again with its
  retry exhausted.
- **New reviewer missing from the Reviewers list under load** (U01 S6,
  OMP, once). After "Create New Reviewer" in the Add Reviewer window, the
  review stage's Reviewers panel did not list the throwaway reviewer's
  name for the 30 s wait (2026-09-15, the U25 revision session's third
  OMP final at four workers on a reset database,
  `.reports/U25/final-run-omp-attempt3.log`, the one red of 216; error
  context `pw-out-final-omp-attempt3/U01-login-and-sessions-…/error-context.md`);
  green alone in 9.1 s on the same used database
  (`.reports/U25/rerun-omp-u01s6.log`). Same family as the reviewer
  dashboard and Add Reviewer classes above: a list fetched again after
  the window closes. **Watch condition**: a second incident; then read
  whether the panel's reload after the window's save is awaited.
  (The 2026-09-17 incident, the "Workflow:" heading not visible in 20 s
  on a reset database, was the roster rehash that signed shared-persona
  sessions out at the start of a run, fixed 2026-09-23 in `UserSeeder`.)
- **Author's Title & Abstract section empty after the manager's publish**
  (U40 S3, OJS, once, local). After the manager published, the author's
  reload fetched the submission and the publication (both 200 in worker
  4's server log, `.reports/flake-local/server-logs-run3/server-8004.log`)
  but the section under "Publication: Title & Abstract" showed neither
  the "This version has been published and can not be edited." notice nor
  the form for 30 s, and no `_components/titleAbstract` request followed
  in 37 s (2026-09-15, `.reports/flake-local/run3.log`,
  `results-run3/U40-*/error-context.md`). The section's items are empty
  while `selectedPublication` is null (`useWorkflowConfigOJS._getItems`);
  green alone 3 of 3 and in the other three runs. The OJS U40 file now
  keeps traces on failure (`test.use({trace: 'retain-on-failure'})`, like
  the OMP one). **Watch condition**: a red with the trace; then read
  whether the publication fetch was aborted by a second `selectPublicationId`.
- **Dashboard heading "(0)" after a reload under load** (U23 S7, OJS,
  once). After `page.reload()` of the sorted address on a scratch journal
  holding 31 submissions the heading read "Active submissions (0)" for the
  whole 30 s wait (2026-09-15, the maintainer's first local 8-worker run
  at the merged tips, `.reports/flake-local/run1.log`; no artefacts kept,
  the next run wiped test-results); green alone 3 of 3. **Watch
  condition**: a second sighting with test-results kept; then read the
  list request the reload issued.
- **OPS U40 S1's undo read red on the Mac only** ("edit the title and
  abstract", `@smoke`; deterministic on the Mac, 2026-09-16/17). After
  `ControlOrMeta+z` in the Title editor the TinyMCE body reads "" instead
  of the restored title (spec line 263): red 3 of 3 for the U11 harness
  agent with and without its change (`.reports/U11/harness/pw-ops-u40-s1-unpatched/`),
  and in both U11 OPS finals on reset databases (`.reports/U11/final-run-ops-attempt1.log`,
  `final-run-ops.log`); the OJS and OMP S1 counterparts green on the Mac,
  and OPS green on CI (35017665886) and on the VM's final at the same tips
  (2026-09-16). A Mac-only class, so an OPS full run on the Mac reads
  146 of 147 by design until it is read; unverified hunch: Meta+z under
  headless Chromium on darwin against the keyed `WorkflowPublicationForm`
  (sync 2026-09-16); red again in the U32 session's OPS final on a reset
  database at four workers, 2026-09-19, the only red of 161
  (`.reports/U32/final-run-ops-attempt1.log`), and in the U33 session's,
  2026-09-20, the only red of 175 (`.reports/U33/final-run-ops.log`), and in the U34 session's the same day, the only red of 164 on a reset database at four workers (`.reports/U34/final-run-ops.log`; the 12 serial and solo tests green alone behind it), and in the U36 session's, 2026-09-23, beside U03 S5, red alone too (`.reports/U36/final-run-ops.log`, `alone-ops-U40S1.log`; serial and solo green alone), and in the U38 session's, 2026-09-24, beside U49 S6, red alone too (`.reports/U38/final-run-ops.log`; serial and solo green alone). **Watch condition**: a red
  of this read on CI or the VM; until then the OPS full green on a Mac
  push is CI's. Again 2026-09-24 in the U39 session's OPS final and red alone once more; serial 10 and solo 2 green alone (`.reports/U39/final-run-ops.log`, `alone-ops-U40S1-U49S6.log`). Again 2026-09-24 in the U44 session's OPS final on a reset database at auto workers, the only red of 215; serial and solo 13 green alone (`.reports/U44/final-run-ops.log`, `alone-ops-serial-solo.log`). Again 2026-09-25 in the U48 session's OPS final on a reset database at four workers, the only red of 243; serial and solo 13 green alone (`.reports/U48/final-run-ops.log`, `serial-solo-ops.log`). Again 2026-09-25 (U50 session): red in the OPS final and red alone, as before (`.reports/U50/final-run-ops.log`, `alone-ops-reds.log`). Again 2026-09-25 (U51 session): red in the OPS final and red alone, as before (`.reports/U51/final-run-ops.log`, `alone-ops-reds.log`). Again 2026-09-26 (U53 session, Mac, reset databases, auto workers): red in the OPS final beside U14 S5 and red alone, as before (`.reports/U53/final-run-ops.log`, `alone-ops-reds.log`). Again 2026-09-26 (U54 session, Mac, reset database, auto workers): red in the OPS final beside U14 S5 and red alone; serial and solo 17 green alone (`.reports/U54/final-run-ops.log`, `alone-ops-reds.log`, `alone-ops-serial-solo.log`). Again 2026-09-26 in the U55 session's OPS final on a reset database at auto workers, beside U14 S5 and the U18 `rss.xmp` class; serial 16 and solo 5 green alone (`.reports/U55/final-run-ops.log`, `alone-ops-{serial,solo}.log`). Again 2026-09-26 (U56 session, Mac, sync baselines, reset database): red in the OPS final and red alone; serial 15 and solo 8 green alone (`.reports/U56/final-run-ops.log`, `alone-ops-reds.log`). Again 2026-09-26 in the U60 session's OPS final (reset database, auto workers), beside the four U18 reds; serial 15 green alone (`.reports/U60/final-run-ops.log`, `alone-ops-serial.log`). Again 2026-09-27 (U61 session, Mac, reset database, auto workers): red in the OPS final beside the U18 four, U14 S5 and U54 S3; serial 21 and solo 21 green alone (`.reports/U61/final-run-ops.log`, `alone-ops-{serial,solo}.log`). Again 2026-09-27 (U62 session, Mac, reset database, auto workers): in the OPS final and red alone; serial 23 and solo 24 green alone (`.reports/U62/final-run-ops.log`, `alone-ops-reds.log`, `alone-ops-{serial,solo}.log`). Again 2026-09-28 (U68 session, Mac, reset database, auto workers): red in the OPS final, not re-run (`.reports/U68/final-run-ops.log`). Again 2026-09-28 (U72 session, Mac, reset database, auto workers), red in the OPS final (`.reports/U72/final-run-ops.log`). Again 2026-09-28 (U73 session, Mac, reset database, auto workers): red in the OPS final and red alone; serial and solo green in the final (`.reports/U73/final-run-ops.log`, `alone-reds.log`). Again 2026-09-28 (U69 session, Mac, reset database, auto workers): red in the OPS final; serial and solo green in the final (`.reports/U69/final-run-ops.log`). Again 2026-09-29 (U74 session, Mac, reset databases, auto workers): red in the OPS final and red alone (`.reports/U74/final-run-ops.log`, `alone-ops-reds.log`); serial and solo green in the final.
- **U45 S6/S8's DOI row expander blocked by the "Bulk Actions" menu**
  (OJS 2026-09-27, OMP 2026-09-28, Mac finals; the `<li>` "from
  `listPanel__header`" that intercepted the click is the menu's item).
  **Fixed 2026-09-28** (`.reports/flake-s28/u45-expand/diagnosis.md`):
  the ui-library `Dropdown` closes only by a blur timer, and a window
  answered within a second of a press longer than 100 ms hands the focus
  back to the still-open item, so the menu stays over the first rows (an
  app defect, U45's register; app-changes row 21).
  `DoisPage.chooseBulkAction` waits for the menu's items to be gone once
  the window is visible (and the U45 K3 check script). A 200 ms press: red
  10/10 on OJS and 10/10 on OMP before, 0/10 each after; U45
  `--repeat-each 5` at eight workers green 80/80 OJS, 60/60 OMP, 65/65
  OPS. Rule in patterns.md pitfall 3. **Watch condition**: a row click
  intercepted by a menu item behind the wait.
- **OPS U09 S4's Custom Block Manager row missing from the plugins grid**
  (OPS, once, 2026-09-27). In the U64 session's OPS final (reset
  database, auto workers) `tr.gridRow[id$="-row-customblockmanagerplugin"]`
  was not found within 30 s (`CustomContentPages.js:450`); green alone
  (`.reports/U64/final-run-ops.log`, `alone-ops-reds.log`). **Watch
  condition**: a second red at the same row wait.
- **OJS U18 S4 and S6 waits on the plugins grid** (OJS, once,
  2026-09-28). In the U72 session's OJS final (Mac, reset database, auto
  workers) S4's `pressOk()` saw no `manage` POST answer in 30 s
  (`WebFeedPages.js:586`) and S6's `tr.gridRow[id$="-row-webfeedplugin"]`
  was not found (`WebFeedPages.js:421`); both green alone
  (`.reports/U72/final-run-ojs.log`, `alone-reds.log`). Kin of the OPS
  U09 S4 plugins-grid row wait above. **Watch condition**: a second red
  at either wait.
- **OPS U75 S2's relation DOI box missing** (OPS, once, 2026-09-28). In
  the U72 session's OPS final (Mac, reset database, auto workers)
  `relations.doiBox()` was not found where it should read the
  "elsewhere" DOI (`U75-preprint-relations.spec.js:287`); green alone in
  10.5 s (`.reports/U72/final-run-ops.log`, `alone-reds.log`).
  **Watch condition**: a second red at the same read.
- **OJS U20 S8's Google Analytics "Settings" window answering "Error"**
  (OJS, once on CI, 2026-09-28). On push run 36371844559 at `f8e211f`
  (OJS shard 3/3) the plugin's "Settings" opened the "An unexpected error
  has occurred." window on both attempts, so `#gaSettingsForm`'s
  `googleAnalyticsSiteId` box never came (`GoogleAnalyticsWindow`,
  `SearchEngineMetadataPages.js:522`); the job log carries no PHP error. App
  commits identical to the green run 36369222355; green locally at
  `f8e211f`, green on the shard's rerun (attempt 2), and the scheduled run
  36374699873 on the same commit green on every job
  (`.reports/U72/ci-36371844559/`). **Watch condition**: a second red at
  the same window; then capture the server log of that request.
- **OMP U16 S8's "Browse" block marks no category** (OMP, once,
  2026-09-27). In the U70 session's OMP final (reset database, auto
  workers) the block on the "Science" category page listed no marked
  entry where "Science" is expected (`U16-categories.spec.js:636`,
  `markedNames()` `[]`); green alone in 11 s (`.reports/U70/final-run-omp.log`,
  `alone-omp-U16S8.log`). **Watch condition**: a second red at the same
  read. **Tripped 2026-09-28** (U73 session, Mac, checkouts at the 09-27
  baselines, reset database, auto workers): red in the OMP final at the
  same read (`markedNames()` `[]` after the "Science" link), red once more
  alone with `--no-deps`, then green alone three times with
  `--repeat-each 3` (`.reports/U73/final-run-omp.log`, `alone-reds.log`,
  `alone-omp-U16S8-r3.log`); the read is taken right after the URL
  assertion, so an unwaited read of the new page is the lead. **Fixed
  2026-09-29** (housekeeping, `.reports/flake-2026-09-29/u16s8/diagnosis.md`):
  the test's own race. The mark is the theme's CSS on the server's
  `li.current`, and the theme's stylesheet is a PHP request fetched on every
  page while the body is already visible; the link's `click()` and the
  `toHaveURL` do not wait for `load`, so `getComputedStyle` read no bar.
  `BrowseBlock.markedNames()`, `look()` and `flatEntries()` now wait for
  `BasePage.stylesApplied()` (the `load` state), which also covers the same
  read in OJS and OPS U16. With the stylesheet held 3 s: red 10 of 10
  before, 0 of 10 after; OMP U16 `--repeat-each 5` at eight workers green,
  OJS and OPS U16 green once. Rule in patterns.md "Parallel-load lessons"
  16. **Watch condition**: a `markedNames()` red after `stylesApplied()`.
- **U18 feed download named `rss.xmp` on the Mac** (U18 S1, S3, S7, S8,
  all three apps; deterministic on the Mac, 2026-09-26). The RDF feed's
  download comes out as `rss.xmp` where `WebFeedPages.js` expects
  `W.downloadName` `rss.rdf` (OJS spec line 276, and the same read in S3,
  S7, S8): red in all three U55 finals on reset databases at auto workers
  and red alone right after, 4 of 16 on each app
  (`.reports/U55/final-run-{ojs,omp,ops}.log`, `alone-<app>-reds.log`).
  U18 shipped from the VM with its finals green, and its CI push run
  36211491859 was red only on U32, so a Mac-only class like OPS U40 S1.
  Unverified hunch: headless Chromium on darwin picks the extension for
  the feed's RDF content type from the OS type table, where the VM and CI
  keep the server's name. Watch condition: a red on CI or the VM; until
  then a Mac full run reads four reds per app and skips the serial and
  solo projects, which need their own `--no-deps` run. Not driven by the
  U55 feature session that logged it; the fix (the expectation or the
  download read) is the next daily session's. Again 2026-09-26 (U56 session, Mac, checkouts at the day's sync baselines, reset databases, auto workers): red in all three finals and red alone, 4 per app (`.reports/U56/final-run-{ojs,omp,ops}.log`, `alone-<app>-reds.log`). Again 2026-09-26 (U60 session, Mac, the same baselines, reset databases, auto workers): 4 per app in all three finals, not re-run alone (`.reports/U60/final-run-{ojs,omp,ops}.log`). Again 2026-09-27 (U61 session, Mac, reset databases, auto workers): 4 per app in all three finals; serial and solo green alone on each app (`.reports/U61/final-run-{ojs,omp,ops}.log`, `alone-<app>-{serial,solo}.log`). Again 2026-09-27 (U62 session, Mac, reset databases, auto workers): 4 per app in all three finals, not re-run alone (`.reports/U62/final-run-{ojs,omp,ops}.log`). Again 2026-09-28 (U68 session, Mac, reset databases, auto workers): 4 per app in all three finals, not re-run; serial and solo green in all three (`.reports/U68/final-run-{ojs,omp,ops}.log`). Again 2026-09-28 (U72 session, Mac, reset databases, auto workers): S1, S3, S7, S8 red in all three finals (`.reports/U72/final-run-{ojs,omp,ops}.log`). Again 2026-09-28 (U73 session, Mac, reset databases, auto workers): 4 per app in all three finals; serial and solo green in all three (`.reports/U73/final-run-{ojs,omp,ops}.log`). Again 2026-09-28 (U69 harness regression, Mac, used databases): S1, S3, S7, S8 red alone on each app, `rss.xmp` (`.reports/U69/harness/pw-{ojs,omp,ops}-U18.log`). Again 2026-09-28 (U69 session, Mac, reset databases, auto workers): S1, S3, S7, S8 red in all three finals; serial and solo green in all three (`.reports/U69/final-run-{ojs,omp,ops}.log`). Again 2026-09-29 (U74 session, Mac, reset databases, auto workers): S1, S3, S7, S8 red in all three finals; serial and solo green in all three (`.reports/U74/final-run-{ojs,omp,ops}.log`).
- **Profile save response not seen in 30 s** (U03 S5, "cancel, and
  reject, an email change", OPS, once: 2026-09-23, the U36 session's OPS
  final on a reset database on the Mac at auto workers,
  `.reports/U36/final-run-ops.log`). `ProfilePage.waitForSave()`
  (`page.waitForResponse` on the tab's save POST) timed out at 30 s;
  green alone (`.reports/U36/alone-ops-U03S5.log`). Watch condition: a
  second sighting; then the error context says whether the save was
  never sent or answered before the wait was armed.
  **Diagnosed 2026-09-30** (housekeeping, `.reports/flake-0930/u03s5/`):
  the CI red (ojs 36429431746) is the `php -S` worker segfault class
  hitting the "Cancel" save in a pass's first minute, not a press race (0
  of 30 red under press-side levers); `waitForResponse` ignores a failed
  request, hence the bare timeout. `ProfilePage.waitForAnswer()` now fails
  at once with the URL and `net::ERR_…` and says on timeout whether the
  request left (6 methods, every ProfilePage caller). Moved under the
  segfault class; the 2026-09-23 local OPS sighting stays unexplained.
  **Watch condition**: a ProfilePage timeout whose request was answered.
  Again 2026-10-01 (CI), not this condition: OJS U03 S4
  (`ProfilePage.js:265`, pkp-e2e 36842671866) and OMP U03 S10 (`:243`,
  36872303797) are form waits whose tab fetch went unanswered (exit 139);
  `open()`/`expectOpen()` still give a bare 30 s timeout there.
- **"Cancel upload" on a throttled upload** (U36 S9, OJS and OMP; local
  finals from 2026-09-24, CI once on both attempts: push run 36322740739,
  OMP shard 3/3; CI tally 6 flaky + 1 failed on OJS). **Fixed
  2026-09-28** (`.reports/flake-s28/u36s9/diagnosis.md`): the test's own
  race over an app defect. The app stores a file whose whole body reached
  the server before the abort; the test lifted the throttle about 10 ms
  after the press (releasing the held body ahead of the abort), and at
  4 KB/s the 636-byte body was out in 0.3 s, which a press under load
  missed. Now the body is held at 64 bytes/s (about 10 s) and the
  throttle stays on through the reload and the empty-panel reads. Under
  a 6× CPU throttle: red 9/10 OJS and 10/10 OMP before, 0/10 after; the
  U36 file `--repeat-each 5` at eight workers 50/50 on each app. Rule in
  patterns.md "Waiting strategy"; the defect underneath is U36's register
  (a cancel pressed after the last byte keeps the file). **Watch
  condition**: an S9 red at the reload read behind the held throttle.
- **Users & Roles "Email" dialog still open after "Send Email"** (U14 S5
  on OJS, OMP and OPS, local finals only; sightings 2026-09-17 to
  2026-09-27, `.reports/flake-s26/u14/`, `.reports/workers-8core/invalid-concurrent/run-ojs-w8.log`;
  no CI sighting: every CI red of S5 is the Tasks-row class below).
  **Fixed 2026-09-28** (`.reports/flake-s28/u14s5-email/diagnosis.md`):
  the control mail's Body was typed while TinyMCE was still fetching its
  content style sheets, whose arrival loads the empty start content over
  the text; the server refused the empty Body (200, `"status": false`,
  an `alert()`), so the window never closed. The shared
  `EmailUserWindow.expectOpen()` now waits for the open form's own editor
  to be `initialized` and `sendAndExpectSent()` fails on a refused send;
  OJS `UsersPage.sendEmail` and the OMP and OPS `sendControlEmail` use it.
  Lever `PLAYWRIGHT_HOLD_URL`/`PLAYWRIGHT_HOLD_MS` on the two style sheets:
  red 12 of 12 before, 0 of 12 after; the U14 file green `--repeat-each 5`
  at eight workers (65 + 40 + 40), U53 app and `@solo` green once. Rule in
  patterns.md "UI realities" (the TinyMCE entry). Thirteen Vue-form
  TinyMCE fills of the same shape with no sighting are listed in the
  diagnosis's section 3. **Watch condition**: a send refused with "the
  send was refused" from `sendAndExpectSent()`, or one of the thirteen
  red at its fill.
- **Tasks dialog missing the report's task row: an app defect, not a
  race** (U14 S5, S12, S13 on OJS, OMP and OPS; 29 first-attempt reds on
  CI in five weeks, red in nearly every local final since 2026-09-17,
  always green alone). **Mechanism found 2026-09-26**
  (`.reports/flake-s26/u14/diagnosis.md`): lib/pkp
  `UserCommentController::delete()` deletes notifications with one
  `whereIn(assoc_type)->whereIn(assoc_id)` over the comment's id and its
  report ids, no journal condition, so deleting comment N removes the
  report task of report N anywhere (pkp/pkp-lib#12407, `677b737d20`,
  2026-03-04). A reset database lines comment and report numbers up, and
  U14's parallel tests delete comments while others read report tasks.
  Two-journal probe on all three apps: the task deleted 4 of 4, kept 3 of
  3 without the collision; with the numbers far apart, 0 reds in 210 U14
  tests. U14 register entry (A11); reported 2026-09-26 (thread + DMs;
  the write-up deleted 2026-09-27 once the fix merged); kept check `checks/U14/delete-tasks/collide.js`
  (fixed when `MODE=collide` leaves A's task). The tests are right and
  stay as they are. Again 2026-09-27 (U52 session's finals, VM, reset
  databases, auto workers): S5 red on all three apps, green alone on each
  (`.reports/U52/alone-status.log`). `TasksPanel.openTask()` now fails in 10 s on a
  missing row instead of the 8-minute test timeout. Harness alternative,
  not applied (maintainer's call, like app-changes row 18): at cold
  bootstrap, insert and delete a block of placeholder reports through the
  query builder so report numbers start above any comment number a run
  reaches. Also from the code only: `deleteReports()` passes a list
  inside a list to `withReportIds()` (no screen sends it). **Watch
  condition**: the upstream fix lands; then the class should vanish.
  **Fix landed 2026-09-27** on pkp-lib `main` (`26ae6431b5`, separate
  deletes for the comment's task and its reports' tasks). OJS carries
  it since ojs `72b85f4ba0` (lib/pkp `26ae6431b5`): `collide.js` leaves
  A's task on OJS, still takes it on OMP and OPS (lib/pkp `17a1f01fed`),
  2026-09-27 (`.reports/sync/s27/u14collide-<app>-*.log`); the day's finals on reset databases: OJS S5 green, OMP and OPS S5 red, green alone (`.reports/s27/final-run-<app>.log`). Since the same day a whole-suite `test:<app>`
  resets the fleet before the app pass, so local finals run on the
  colliding numbering every time (H3RESET2: OPS S5 the only red of 379)
  until the pointers move; then re-run `collide.js` and retire the entry.
  A second read in S5 red twice in the diagnosis runs: OJS line 738, the
  "Email" window still open 30 s after "Send Email" (its own entry, "Users & Roles \"Email\" dialog still open"). Again 2026-09-28 (U68 session, Mac, reset databases, auto workers): S5 red in the OMP and OPS finals, green alone on each (`.reports/U68/final-run-{omp,ops}.log`, `alone-reds.log`). Again 2026-09-28 (U72 session, Mac): OJS U14 S5 red in the OJS final at the report row count, green alone (`.reports/U72/final-run-ojs.log`, `alone-reds.log`). Again 2026-09-28 (U65 session, VM, reset databases, auto workers): OMP U14 S5 red in the OMP final at the report row count, green alone (`.reports/U65/final-run-omp.log`, `alone-reds.log`). Again 2026-09-28 (U69 session, Mac, reset databases, auto workers): S5 red in the OMP and OPS finals, green alone on both (`.reports/U69/final-run-{omp,ops}.log`, `alone-reds.log`). Again 2026-09-29 (U74 session, Mac, reset databases, auto workers): OMP U14 S5 red in the OMP final (the Tasks dialog's row count 0 of 1 in 10 s), green alone (`.reports/U74/final-run-omp.log`, `alone-omp-reds.log`). **2026-09-29 (daily session, VM)**: OMP and OPS now carry the fix (lib/pkp `fab29cfeca` at omp `480045c32`, ops `5da5bc48ad`); `collide.js` leaves A's task on both, `MODE=collide` and `control` (`.reports/sync/s29-u14-*.log`); the day's finals on reset databases, auto workers: U14 S5 green on all three apps (`.reports/s29/final-run-<app>.log`); U14 A11 retired. Not deleted yet: the 2026-09-28 OJS sighting (U72, Mac) came after OJS carried the fix, so the entry is deleted after a week with no sighting on a checkout that carries it; a sighting there reopens the diagnosis.

- **Review-forms reads under load** (U29 S4, S7, S9, OJS). S9's
  recommendation options were read before the step-3 tab's content
  arrived: **fixed 2026-09-26** (`.reports/flake-s26/fixAD/diagnosis.md`), `continueToStep3` waits for
  `#reviewStep3Form` (tab held 3 s: red 3 of 3 before, 0 of 5 after);
  S7's `rowCounts` already waits for its cells (no red under a 2 s grid
  hold). S9's order read (:738/:759, the recommendations list has no
  ORDER BY) is fix list B's (`.reports/flake-s26/fixlist-B.md`).
  **Watch condition**: a U29 red outside the order read.

- **A `php -S` worker segfault** (once, OJS run 33106002377, 2026-08-27,
  in-flight request most likely `GET /api/v1/_submissions/viewsCount`).
  The cascade it used to cause is fixed by the server restart loop
  (harness.md "Runtime model"), so a recurrence now costs one test. It was
  never pinned; if it recurs, add core-dump capture to CI before
  diagnosing.
  Pinned on OMP 2026-09-25 (app-changes row 18): PHP 8.3's OPcache
  inheritance-cache bug php-src GH-20469 (fixed in 8.4.23+), the first
  category page in a process that loaded `APP\publication\Publication`
  first; this OJS case may be the same bug, unproven.
  **Diagnosed 2026-09-30** (housekeeping, `.reports/flake-0930/segv/`;
  report `docs/reports/2026-09-30-php-gh20469-segfaults.md`): GH-20469 is
  confirmed for two class families on all three apps
  (`APP\submission\Submission`, `APP\publication\Publication`): a process
  dies on the first request that reaches the PKP parent first once an
  earlier request came in through the APP class (`getDAO(): DAO` typed
  returns); OPcache off removes it, JIT does not matter. It explains the
  11–13 OMP crashes the U16/U65 suites absorb in every 8.3.35 run (none on
  the PHP 8.4.26 branch run 36692593423) and one of the ten annotated CI
  deaths (36554816184 OMP :8103, U65 S4); the other nine show no
  parent-first request in 4,254 traced requests and did not reproduce
  (open: consistent with a CI-only fault, unproven). Proposed pkp-lib
  workaround (two `class_exists()` preloads in `lib/pkp/includes/bootstrap.php`,
  the 14a478bc53 precedent) proven through `auto_prepend_file`: class
  pairs 15 of 6,090 crashing to 0, OMP category and statistics pages 5 of
  5 to 0. Harness proposals not applied (diagnosis §6): a request-start
  log line, core dumps with a gdb backtrace on CI, the runner's CPU in the
  log, a no-JIT arm. **Watch condition**: an annotated death not in the
  two families; then take the proposals.
  **Tripped 2026-10-01** (housekeeping 2026-10-02,
  `.reports/hk02/flake-watch.md`): ten annotated or logged exit-139
  deaths on CI 09-30..10-01, none in the two families as far as the logs
  show (OJS U01 S4/S7, U03 S4/S6, U12 S4; OPS U12 S6 @solo; OMP U03
  S6/S10, U01 S4, U61 S5), each 9-63 s after its process started (174-439
  requests), where the in-family U65 deaths came after 10-12 min; the
  proposals are taken, the no-JIT arm first (diagnosis
  `.reports/flake-1002/segv/`).
  **Proposals taken 2026-10-02** (`.reports/flake-1002/segv/diagnosis.md`):
  every suite server writes a request-start line (`request-begin.php`), so
  a death names its request, pid and process age; CI keeps core dumps
  with gdb backtraces, the runner's CPU and PHP settings in the log, a
  deaths step and a `server-deaths-<app>-<n>` artifact (`bin/ci-cores.js`,
  `bin/server-deaths.js`); `run-app.yml` takes `php_ini_values`
  (`node bin/ci.js dispatch --php-ini-values …`, empty by default). The
  crash watch waits up to 5 s for the death line after a dropped
  connection (red 3 of 3 unannotated before, annotated 3 of 3 after,
  under an induced death) and drops a previous run's death; ProfilePage's
  tab waits fail at once on a dropped request (5 of 5 bare 30 s timeouts
  before, about 4 s after). One out-of-family death reproduced locally at
  CI's ini (1 in about 40 fresh-server runs with the tracing JIT, 0 in 10
  without): OPS U12 S6 @solo, 12 s into the process, the core in
  `zend_objects_store_del` called from JIT-compiled code at
  `PKPRouter::getRequestedContextPath`. CI arms, two runs each: JIT on 12
  deaths, JIT off 14, every one GH-20469 by its backtrace (U16 category
  pages, U65 statistics), none of the new kind, so the arms do not tell
  the JIT apart yet; the JIT stays on, a flip to off is the maintainer's
  call. **Watch condition**: a death whose backtrace is not GH-20469;
  then read whether it died in JIT code.
- **Manage Emails template window gone before its "Saved" read** (U34 S7,
  OJS and OMP, CI). The nightly pkp-e2e run 35558115088 (2026-09-21, `main`
  at `735bb76`, the same tree and the same app tips as the green push run
  35534810553 seven hours earlier) red on U34 S7 on both attempts on OJS
  and on OMP: `ManageEmailsPage.save()` awaited the `POST …/emailTemplates`
  200 and then waited 30 s for a `[role="status"]` reading "Saved" inside
  the "Add Email Template" window, and the error context shows the window
  gone and the mailable's "Templates" list already holding the new
  template. Mechanism: `ManageEmailsPage.vue` `templateSaved()` runs
  `setTimeout(() => closeSideModal(EditTemplateModal), 1000)`, so the
  status lives one second after the save; the "Edit" of the default
  template through the same helper passed each time (the read landed
  inside the second), the "Add Template" one did not. Green alone on the
  VM at the same tips before any change (`.reports/sync/s21-u34s7-ojs-alone1.log`,
  15.4 s). **Hardened 2026-09-21** (sync session): `save()` in both
  `DecisionSettingsPages.js` no longer reads the status; it waits up to
  5 s for the window to close on its own and presses "Close" only when it
  is still open, and `addTemplate()` asserts the new template in the
  mailable's list; S7 green alone on OJS (20.1 s) and OMP (22.3 s),
  `.reports/sync/s21-u34s7-{ojs-alone2,omp-alone1}.log`. **Watch
  condition**: the hardened save reds again.
- **A wizard rich-text fill lost before its editor has loaded** (U21 S3,
  OMP on CI in nightly 35558115088 and push 36320351712, OPS on the Mac
  2026-09-24; the former "wizard rich-text fill lost to a re-render" and
  "autosave not firing within its 100 s wait" entries, one class).
  **Fixed 2026-09-28** (`.reports/flake-s28/u21s3-autosave/diagnosis.md`):
  the title was typed while TinyMCE was still fetching
  `content_oneline.css`; on its arrival the box put the seeded title back
  and only then bound its v-model, so the typed text passed the read-back,
  vanished, and the autosave timer found nothing to save (nothing pauses
  it on focus). `waitForEditorReady()` (new
  `shared/playwright/support/richtext.js`) now guards the rich-text fills
  of the three wizards' page objects and OPS `PublicationPages` and
  `ContributorPages`. Lever `PLAYWRIGHT_HOLD_URL='content_oneline\.css'`,
  4 s: red 12/12 before, 0/12 after; U21 `--repeat-each 5` at eight
  workers 75/75 OJS, 80/80 OMP, 80/80 OPS; the 13 other caller files green
  once. Unguarded fills of the same shape with no sighting (the reviewer
  comment boxes, in-spec task-form fills) are listed in the diagnosis.
  **Watch condition**: a rich-text value lost behind the ready wait.
- **"Add Reviewer" search never rendered** (U28 S11, OJS, once). In
  the U42 session's OJS final on a reset database at auto workers on the
  Mac (2026-09-24, `.reports/U42/final-run-ojs.log`), "read an earlier
  round's review" waited 30 s in `addReviewer()` for the "Add Reviewer"
  window's `.listPanel--selectReviewer` search box, which never appeared;
  green alone right after (`.reports/U42/alone-ojs-U28S11.log`). First
  sighting. **Watch condition**: a second sighting; then read the
  window's list fetch in the trace (`pw-out-final-ojs/…U28…/trace.zip`).
- **A success toast read only after the action's own waits** (U35 S2,
  OJS, CI, once). The nightly pkp-e2e run 35683638739 (2026-09-22, `main`
  at `66021a2`) red on OJS U35 S2 on the first attempt (37.3 s): after
  the "Assign Participant" window's `okAndClose()` (the save response,
  jQuery idle, the window hidden) the 30 s wait for the "User added as a
  stage participant." toast found nothing; green on the retry (55.3 s),
  so the job passed and no artifact was kept. Mechanism: a toast lives
  5 s (`Page.vue` `expire: Date.now() + 5000`), so when the action's
  waits outlive it under load the read starts after the toast is gone;
  the same test's S8 already armed its toast waits before the action.
  **Hardened 2026-09-22** (sync session): `expectToastDuring(page, text,
  action)` in the shared `NotificationsPages.js` arms the toast wait
  before running the action; the twelve read-after-action sites in the
  OJS and OMP U35 suites (the Edit Assignment "OK", the Assign "OK", the
  Notify send) use it; both suites green alone after the change
  (`.reports/sync/s22-u35-{ojs,omp}-alone.log`). The 2026-09-23 U35
  transplant (`ac20788`) replaced those suites with the trial build's,
  whose S2 is another scenario and which read their toasts their own way;
  the class stands, `expectToastDuring` stays in `NotificationsPages.js`
  for the next site that reads a toast after the action. **Watch
  condition**: a U35 toast read reds on CI; then arm it with
  `expectToastDuring` (or the toast never rose: read the save response's
  notification payload).
- **Three first sightings in one Mac final set** (U46 session, 2026-09-24,
  reset databases at auto workers, each green alone right after). OJS
  U27 S11 "unassign before, cancel after, reinstate": the reviewer's row
  (`<name> More Actions`) not visible in 10 s, with a 500 on
  `GET …/_submissions/reviewerAssignments?active=true` in the worker log
  a minute before (`.reports/U46/final-run-ojs.log`, `alone-ojs-reds.log`).
  OMP U35 S7 "a role's options": the "Assign Participant" window's
  `filterUserGroupId` select not visible in 30 s
  (`final-run-omp.log`, `alone-omp-reds.log`). OJS U12 S6 "the site's
  announcements" in the `ojs-serial` project run alone after the final:
  the "Announcement type added." notice not found
  (`alone-ojs-serial-solo.log`, `alone-ojs-U12S6.log`). **Watch
  condition**: a second sighting of any; then read its trace. The U12 S6 sightings in the `<app>-serial` projects run alone after the finals (U10, U47, U50, U51, U53 sessions) were the solo project running beside the serial one under a combined `--no-deps` command, now refused by the config (2026-09-26). First sighting the same day of OMP U39 S2 "the Publisher Library on the Settings tab": the 180 s test timeout waiting on a "Press Library" row in the OMP final, green alone (`.reports/U47/final-run-omp.log`, `alone-omp-reds.log`). Again 2026-09-25 (U50 session, Mac): U12 S6 red in the `<app>-serial` project run alone after the finals on all three apps ("Announcement type added." not found), green alone right after on all three (`.reports/U50/alone-{ojs,omp,ops}-serial-solo.log`, `alone2-{ojs,omp,ops}-U12S6.log`). Again 2026-09-25 (U51 session, Mac): OPS U12 S6 red in `ops-serial` run alone after the OPS final ("Announcement type removed." not found), green alone right after (`.reports/U51/alone-ops-serial-solo.log`, `alone2-ops-U12S6.log`). Again 2026-09-26 (U53 session, Mac, reset databases, auto workers): OJS U12 S6 red in `ojs-serial` run alone after the OJS final ("Announcement type added." not found), green alone right after (`.reports/U53/alone-ojs-serial-solo.log`, `alone2-ojs-U12S6.log`).
- **U02 S6's consent line read on screen before anything is ticked**
  (OPS, CI once 2026-09-24). **Fixed 2026-09-26** (`.reports/flake-s26/fixC/diagnosis.md`): the one-shot
  `boundingBox()` read raced the theme's style sheet; the page object's
  `expectConsentLineOnScreen()` polls (style sheet held 3 s: red 4 of 4
  before, green 4 of 4 after). **Watch condition**: a red of the polled
  read.

- **OPS U08 S2 reading manager.maya's Tasks count** (order-dependent:
  OPS U40 S1, U41 S1/S3, U42 S1, U43 S1 and OMP U42 S1 opened their
  mailbox-control discussions as maya on `publicknowledge`). **Fixed
  2026-09-26** (`.reports/flake-s26/fixAD/diagnosis.md`): U08 S2 reads the count as any number, the controls
  run on a scratch server or press of the test's own
  (`PublicationPages.sendMailControl`, OPS). **Watch condition**: a
  roster persona's task count asserted again.

- **OMP U10 S1's style-sheet buttons read before "Remove" renders**
  (OMP, 2026-09-25). **Fixed 2026-09-26** (`.reports/flake-s26/fixC/diagnosis.md`): `UploadBox` returns
  auto-waiting button locators and `expectUploadOffered()` (the upload's
  answer handled 1.5 s late: red 4 of 4 before, green 4 of 4 after), on
  every U10 caller of the three apps. **Watch condition**: a red behind
  the new readers.
  Again 2026-09-30 (CI ojs 36668070912, OJS U10 S2, green on retry) at a
  site the fix does not cover: the favicon's `choose()`
  (`AppearancePages.js:241`) returns on the `temporaryFiles` answer, the
  save then went out without the file and the home page had no favicon
  link (spec :430); lead: `UploadBox.choose()` waits for the box's own
  preview before returning.

- **The OJS publish panel confirmed before its "Issue Assignment" is
  filled** (U13 S3 "an older version beside the current one"; CI's top
  first-attempt flake, 25 in about 40 OJS shard runs, always green on the
  traced retry; red in and alone on the Mac at the older baselines).
  **Mechanism found and fixed 2026-09-26** (`.reports/flake-s26/u13s3/diagnosis.md`):
  a later version opens "Review Publishing Details" too (it starts
  QUEUED), whose required "Issue Assignment" mounts empty and is filled
  only when the panel's own `issueAssignmentStatus` GET answers; a
  "Confirm" pressed before that is refused inside the page ("This field
  is required.", no request) and the confirmation never opens. Held
  deterministically by delaying that GET (red 7 of 7 before, green 8 of 8
  after). `PublicationScreen.pressPublish()` / `awaitPublishPanelSettled()`
  (OJS `PublicationMetadataPages.js`) now return the panel only with the
  answer and its preselected radio in; `openPublishPanel()`, `publish()`,
  `PublishSchedulePages.openPublishPanelExpectingIssueFields()` and the
  U13, U18, U20 helpers go through it (OMP and OPS panels have no issue
  field). **Watch condition**: a red at the confirmation wait behind the
  settled panel.

- **U09 S6's formatted box stuck under TinyMCE's "Loading..." throbber:
  an app defect, not a race** (OPS 2026-09-25, the box holding "Welc";
  OPS 2026-09-27 on the VM, the custom block's English box, the click
  intercepted until the 180 s timeout; the same code on OJS and OMP).
  **Mechanism found 2026-09-28** (`.reports/flake-s28/u09s6-throbber/diagnosis.md`):
  in a legacy window with a second form language, pkp's `deactivate`
  handler (`SiteHandler.js`) calls `getContent()` on the French editor
  before it has loaded; the error ends the English editor's start-up
  after `initialized` and before the throbber is hidden, so the box never
  takes input (U09's register, crash: script). Lever
  `PLAYWRIGHT_IFRAME_HOLD='-fr_CA-'` with `PLAYWRIGHT_IFRAME_HOLD_MS=3000`:
  stuck 12/12 on the probe servers, 0/12 with the handler guarded in the
  page (the upstream fix's shape); S6 red 4/4 OJS, 4/4 OPS, 2/2 OMP under
  it. No workaround (it would hide the defect): `RichTextBox` now fails
  within 30 s naming the stuck editor; the U09 file `--repeat-each 5` at
  eight workers green 35/35 per app. **Watch condition**: a red naming a
  stuck editor is this defect (rerun); delete the entry when the handler
  is guarded upstream.
- **Two contexts adding French at the same moment: one save answers 500**
  (found 2026-09-26 by the C fixer, 5 of 42 concurrent French
  scratch-context seedings on OJS and OPS, `.reports/flake-s26/fixC/diagnosis.md`
  block fixC-1): `Locale::installLocale()` →
  `installEmailTemplateLocaleData()` deletes and re-inserts the site-wide
  default email data with no transaction, so two concurrent installs of
  one locale meet a unique violation on `email_templates_default_data`.
  An app race that a person meets only when two managers add the same
  language at once; for the suite, a flake source whenever parallel tests
  seed French contexts. The spec holds it as U57 *Languages & locales*
  A6 ([U57](../specs/U57-languages-and-locales.md#a6)). Maintainer's call 2026-09-26: not a realistic problem for
  a journal; handle it on the test side, and take it upstream only if it
  keeps firing with no reasonable test-side fix. **Watch condition**: a
  French-context seed or save red with that 500 on CI; then install French
  once at bootstrap, before the parallel project, so later French
  contexts never race the first install. Sighted locally 2026-09-27 in
  the U57 OPS test author's run (S5 and S7 ticking French in one second,
  S7 500): every on-screen "Forms"/"Submissions" tick re-installs the
  email data, so a bootstrap install alone would not cover it; U57's S5
  and S7 run in one serial group in each app since.

- **Order asserted on lists the app does not order** (settled
  2026-09-26 as one class: OPS U13 S1/S10 keywords, OMP U10 S5 masthead,
  OMP U08 S4 "renamed item last", OJS U35 S2 role list, U05 S7's Tasks
  pair, OJS U18 S5, U29 S9 and the unsighted sites of
  `.reports/flake-s26/fixlist-B.md`). PostgreSQL returns unordered or tied
  rows in storage order, which parallel writes change; a non-HOT update
  moving one row flips each sighted read deterministically (red 4 of 4,
  green 4 of 4 after, `.reports/flake-s26/fixB/diagnosis.md`). The tests
  compare sets (`shared/playwright/support/order.js`); eleven specs that
  claimed an order the query does not give were corrected (U08, U09,
  U12, U13, U18, U28, U29, U35, U42, U54, U55; new U13 A11 🐞: keywords
  lose the typed order on every save); galley seeds carry `seq`.
  **Watch condition**: a position read on a list whose query has no
  unique ORDER BY. **Sighted 2026-09-27** (first in the U61 session's OPS final): OPS U54 S3 "create a role" red at `RolesTab.openRowActions` because the new "Data editor" landed as the Roles list's first row, which carries no "Settings" arrow (U54 A1, A13). The diagnosis is the next daily session's. Again 2026-09-27 (U63 session's OMP final, Mac, reset database, auto workers): OMP U54 S6 "remove a role", "Spare desk" the first row, green alone (`.reports/U63/final-run-omp.log`, `alone-omp-reds.log`). Again 2026-09-27 (U58 session's OMP final, VM, reset database, auto workers): OMP U54 S3 "create a role", "Data editor" the first row, green alone (`.reports/U58/final-run-omp.log`, `alone-reds.log`). Again 2026-09-27 (U71 session's OMP and OPS finals, VM slot s1, reset databases, auto workers): U54 S3 on both, "Data editor" the first row, green alone on both (`.reports/U71/final-run-omp.log`, `final-run-ops.log`, `alone-omp-U54S3-U14S5.log`, `alone-ops-U54S3-U14S5.log`). Again 2026-09-28 (U59 session's OPS final, VM, reset databases, auto workers): red, green alone (`.reports/U59/alone-reds.log`). **Diagnosed 2026-09-29** (housekeeping, `.reports/flake-2026-09-29/u54s3/diagnosis.md`): an app defect, U54 A1 set off by A13. The grid keys each page's rows 0…n−1 and adds no "Edit"/"Remove" to row id 0, and PostgreSQL stores a new role wherever its free space map offers room, often before the context's own roles on a used database; CI's six OJS S3 first-attempt reds of 2026-09-28 were all shard 1/3. U54 S3–S6 now run through `replayWhenFirstRow()` (a fresh scratch context only when the role opened is the list's first row, at most three attempts, an `app-defect` annotation), app-changes row 22. With a storage lever: red 10 of 10 before, 0 of 10 after; the three U54 files `--repeat-each 5` at eight workers green (35 + 40 + 35). **Watch condition**: a U54 red naming `FirstRowError` with its three attempts spent. Sighted and fixed 2026-09-29 (housekeeping, `.reports/flake-2026-09-29/u65s7/diagnosis.md`): OJS U65 S7 "downloading the reports", red on the first attempt of five CI runs on 2026-09-28 (pkp-e2e 36461456234, 36483369298, 36489553910, 36462286731; ojs 36475766741), compared the second "Review Report" download with the first line for line; the report orders by submission title only, so "Marsh survey"'s two reviewer lines swapped between requests (spec Rule 21: "in no set order"). The test now compares the headers, the title sequence and the lines as a sorted set: under a row-rewrite lever red 10 of 10 before, 0 of 10 after; the OJS U65 file `--repeat-each 5` at eight workers 40 of 40.

- **OPS U61 S4 "deleting the stored copies": the header read took the
  admin's unread-task count** (CI push run 36289097857 at `b57a99c`,
  2026-09-27, shard ops 3/3, red on the first attempt and the retry): the
  before/after `look()` of the server's home page compared the header's
  text, which ends with the user menu's task count ("admin 134" then
  "admin 139"), raised by queued work finishing between the reads. Fixed
  the same day in all three apps' U61 suites (the trailing count is left
  out of the read; S4 green alone on each). **Watch condition**: a U61 S4
  red on the header again.
- **OMP U27 S9 and S16** (first sightings, the Escape sweep's runs
  2026-09-26, `.reports/flake-s26/esc/diagnosis.md`): S9 red 2 of 8 at
  HEAD under an animation-frame hold, lead: `openRowMenu()` returns
  `getByRole('menu').last()`, which can be the first row's menu still
  closing; S16 once in 95, the Review Details window showing "-" for both
  reviewer comments. **Watch condition**: a sighting in a final or on CI. First final sighting 2026-09-29 (U74 session, Mac, reset databases, auto workers): S9 red in the OMP final ("Modify Review" in the Review Details window not enabled in 20 s), green alone right after (`.reports/U74/final-run-omp.log`, `alone-omp-reds.log`); the watch condition is tripped, the trace read is the daily session's.
  **Diagnosed 2026-09-29** (housekeeping, `.reports/flake-2026-09-29/u27s9/diagnosis.md`).
  S16 fixed, the test's own race: the reviewer's step-3 comment boxes were
  typed before TinyMCE was `initialized`, and the editors' late content
  style sheets put the empty start value back, so the review went in with
  no comments ("-" for both). OMP `completeReview()`/`openModifyReview()`
  and the same-shape OMP `completeReviewAsReviewer`, OMP U23
  `submitAcceptedReview` and OJS `performReview` now wait for the editor.
  With the two style sheets held 4 s: red 11 of 12 before, 0 of 12 after;
  OMP U27 `--repeat-each 5` at eight workers 95 of 95 twice, OJS U27 90 of
  90, OMP U23 75 of 75, every other caller green once. S9's "Modify Review
  not enabled" did not reproduce in 45 runs under four levers (the
  `openRowMenu().last()` lead ruled out); `openReadReview()` now records
  the Review Details window's two loads, so the next red names the pending
  or failed one. **Watch condition**: an S9 red at "Modify Review"; read
  the recorded loads, `error-context.md` and the worker's server log.

- **OPS U39 S2 "the Publisher Library on the Settings tab": the row's "Edit" link
  never shows** (`LibraryList.openStrip`, `LibraryPages.js:352`, 30 s on
  the "Journal guide" row's controls). Sighted 2026-09-27 (U63 session's
  OPS final, Mac, reset database, auto workers), green alone
  (`.reports/U63/final-run-ops.log`, `alone-ops-reds.log`). Tripped on CI
  2026-09-29 on all three apps (pkp-e2e 36579748471 OMP `:352`,
  36593351856 OPS `:393`, 36596209937 OJS `:360`). **Diagnosed 2026-09-30**
  (housekeeping, `.reports/flake-0930/u39s2/`): the download link's
  two-second timer also fires a `fetch-grid`, whose redraw closed the
  strip the test had just opened (or left the link at `href="#"`);
  `LibraryList.download()` now returns after the redraw (15 other call
  sites get it): red 15 of 15 under a redraw-hold lever before, 15 of 15
  green after; the U39 file 70 of 70 at eight workers. Rule in patterns.md
  pitfall 10. **Watch condition**: a U39 red after a download.

- **OJS U34 S2 "the composer": the template search's "searching" state
  never seen** (`page.waitForSelector('.composer__templates__searching')`,
  `U34-editorial-decision-recording.spec.js:540`, 30 s after the CC field
  is cleared and "Sent to Review" typed into the template search). Lead:
  the state is transient, so a search that answers before the wait
  attaches leaves nothing to see. Sighted 2026-09-27 (U71 session's OJS
  final, VM slot s1, reset database, auto workers), the only red of 574,
  green alone (`.reports/U71/final-run-ojs.log`, `alone-ojs-U34S2.log`).
  **Watch condition**: a second sighting; then key the wait to the
  search's response instead of the transient class.


- **Eight first sightings in one Mac final set** (U74 session, 2026-09-29,
  reset databases at auto workers, each green alone right after,
  `.reports/U74/final-run-{omp,ojs}.log`, `alone-{omp,ojs}-reds.log`).
  OMP U28 S14 "left behind when the submission moves on": a
  `page.waitForResponse` not answered in 30 s. OMP U34 S8 "decline in
  French": the composer's `.composer__loadingTemplateMask` still there
  after 30 s. OMP U37 S4 "a task: begun, started, closed, overdue": the
  "Check the proofs" window's "Saved" status not visible in 30 s. OMP U37
  S11 "reviewers and the Author on a review stage": the "Review Tasks &
  Discussions" list still "Loading" after 30 s. OMP U38 S3 "file lines and
  "Download"": the side panel's history table not visible in 30 s. OJS
  U20 S5 ""Description" and "Custom Tags"": the search-indexing
  form's saved status not visible in 30 s. OJS U31 S2 (with S4, the
  error-dialog entry): "Reviewers Suggested by Author" not visible in
  10 s. OJS U47 S3 "edit and delete media files": a `page.waitForResponse`
  not answered in 30 s, then the page closed under it. All are waits on
  a server answer under eight workers after a long session on the Mac.
  **Watch condition**: a second sighting of any, or one on CI or the VM;
  then read its trace.

- **OMP U71 S3's absence read matching a file number inside another row**
  ("On to External Review, and back by 'Cancel Review Round'", spec
  :414, the "Files for Review" row for the internal-review file counted 1,
  expected 0). CI's top first-attempt flake from 2026-09-28 to 09-29: 18
  reds, green on retry, on almost every pkp-e2e push and omp 36618354774.
  Diagnosed 2026-09-30 (housekeeping, `.reports/flake-0930/u71s3/`):
  order dependence, not timing: `panelRow(title, number)` was a `hasText`
  substring filter, and the one row left (the revised file's copy, named
  `revu71s3…`) carried the number's digits in its name; fresh CI installs
  handed out id 71 in 16 of the 18 sightings. Fixed in
  `InternalReviewPages.js` (`panelRowNumbered`, the number's own cell,
  exact; `panelRow` refuses a bare number) with a positive control in S3;
  red 9 of 10 under an id-steering lever before, 0 of 15 after, the U71
  file 45 of 45 at eight workers. Rule in patterns.md pitfall 15.
  **Watch condition**: a U71 red at a numbered row read.

- **First sightings in CI runs of 2026-09-30** (U06 revision branch run
  36664968208 and the housekeeping branch, each green on its retry). OMP U03 S4 "change
  the email address by confirming the emailed link"
  (`U03-user-profile.spec.js:601`): after the link, `ProfilePage.expectOpen`
  found the heading but no `form#contactForm` in 30 s. The attempt carries `server-crash.txt` (exit 139): the segfault class (U03 S5 diagnosis 2026-09-30). OPS U60 S11 "Site
  style sheet" @solo (`serial/U60-site-settings.spec.js:797`): the site
  page's stylesheet list held the theme's sheets but not the uploaded
  site sheet. And OJS U12 S6 "the site's announcements" @solo in the
  housekeeping branch run 36698118029 (`AnnouncementsPages.js:783`, the
  save's POST not seen in 30 s; unlike the entry above, a CI run with the
  solo project alone). **Watch condition**: a second sighting of any;
  then read its error context and the worker's server log.
  Second sightings 2026-10-01: OJS U03 S4 (pkp-e2e 36842671866) and OPS
  U12 S6 @solo (36853975923), both exit-139 deaths, as were the 09-30 OMP
  U03 S4 and OJS U12 S6 (36698118029 `server-crash.txt`): both move under
  the segfault class. OPS U60 S11 stays open on its own condition.

- **The "Review Files" window's row box outside the viewport** (U34 S3,
  OJS, CI once): ojs 36668070912 (2026-09-30, a PR run on pkp-e2e
  `main`), `DecisionWizardPages.js:901` `check({force: true})` "Element
  is outside of the viewport" right after `openAttachSource('Attach
  Review Files', 'Review Files')`; the error context shows the window
  open, its box unticked and "Attach Selected" disabled; green on retry.
  Lead: the side window still sliding in (a forced check skips the
  stability wait). **Watch condition**: a second sighting; then read the
  retry's trace for the window's transition.

## Companion branches — pkp-e2e branches waiting on app PRs

One row per branch prepared for a developer's open OJS, OMP or OPS pull
request (MAINTENANCE "A developer's PR fails the suite"), named exactly
like the developer's branch. State: `investigating` (reproducing, no
verdict yet) · `ready` (pushed, green at the PR ref, developer told) ·
`merged` (only while the sync line is written; then the row is deleted).

| App PR | Branch | State | Since | Note (one line) |
|--------|--------|-------|-------|-----------------|
