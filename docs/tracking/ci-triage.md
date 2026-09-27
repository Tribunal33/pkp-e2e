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
the fix lands. A regression only the stable line shows (MAINTENANCE "The
stable line") names `stable-3_5_0` in its Apps cell and is re-run on that
line's fleet.

| Commit / PR | Surface | Apps | Reproduction | Reported | Note (one line) |
|-------------|---------|------|--------------|----------|-----------------|
| pkp/pkp-lib#13288 (merge `f38c4a4a10`, 2026-09-27, for issue pkp/pkp-lib#13286) | Upload wizard "Cancel" after a revision: (1) a second pick on step 1, then "Cancel", leaves the abandoned first pick as the file (`status:true`); (2) the same file revised in two tabs by one person: the second "Cancel" answers `status:false`, the window stays open, the file keeps the upload cancelled in the other tab | OJS OMP OPS (shared lib/pkp; (2) driven on OJS) | `checks/sync/pkp-lib-13288/cancel-picks.js` MODE=s1 / s1g / s2; fixed when `result-s1-<app>.json` `afterCancel` reads the original `article.pdf` and `result-s2-ojs.json` `cancelA` answers `status:true` | 2026-09-27 (thread + DMs to @beaug, @jarda.kotesovec) | Report: `docs/reports/2026-09-27-pkp-lib-13288.md`; U36 A23 (the second pick), A24 (two tabs). Regression: at lib/pkp `1ad4a14bb2` both restored `article.pdf` (`.reports/sync/s27before-13286/`). Cause: one session key per file, overwritten by every upload and removed by the first cancel; the restore ignores the posted `originalFile`. Minor. The #13286 fix itself holds (renamed file restored, the old row deleted). |
| pkp/pkp-lib#13397 (`aa077419e3`, 2026-09-26, for issue pkp/pkp-lib#13376) | "Invite to a role" email to a new user: on a journal or press whose primary language differs from the site's, a manager working in the site's language sends "Dear <email address>," although names were typed in both languages (also: names typed only in a second language are not used) | OJS OMP OPS (driven on OMP, OJS control) | `checks/sync/pkp-lib-13376/greeting.js` `RR_LEGS=a,b,s1,s2e,s2f`; fixed when leg `s2e` greets by name | 2026-09-27 (thread + DMs to @beaug, @jarda.kotesovec) | Report: `docs/reports/2026-09-27-pkp-lib-13376.md`; U06 A10. Intention gap, not a regression (every newcomer was greeted by address before). Cause: the names are copied onto the recipient for one locale only, `setData()` reads the name in the request's locale. Minor. 3.5 backport #13382 in no app pointer yet. |
| pkp/pkp-lib#12798 (pkp-lib#12959 `8240fbe6cc` + #13398 `1ad4a14bb2`, 2026-09-25) | The decision page "Move to Review" opens is headed "Move to Submission" on every submission, after a review round too (`record.tpl` calls `getLabel()` without the submission); the decisions API labels a recorded decision from the current rounds | OJS OMP | `checks/U32/K4/k4.js` (records the h1, breadcrumb and title); `checks/sync/pkp-lib-12798/decisions-label.js`; fixed when the h1 reads "Move to Review" after a round | 2026-09-26 (thread + DMs to @beaug, @jarda.kotesovec) | Report: `docs/reports/2026-09-26-pkp-lib-12798.md`; U32 A13. Minor. U32 S7/S9 were red on CI from 2026-09-26 00:31 until the maintainer's call the same day: the tests accept either heading and read the destination from the breadcrumb ("Move to Review"), `openDecision` (OJS `CopyeditingStagePages.js`) and `startMoveToReview` (OMP); restore the exact heading when the fix lands. Still reproduces 2026-09-27 at ojs `72b85f4ba0` / pkp-lib `26ae6431b5` (`.reports/sync/s27-12798/s1-ojs.json`: the recorded "Move to Review" relabelled "Move to Submission" once the round is cancelled). |
| pkp/pkp-lib#13181 (commits `4d9ec3cbd0`, `aeac6f75cf`, 2026-09-16; no PR page) | Email-change links, (2) of the report (its (1), the site-level landing, risk accepted 2026-09-25 as U03 A18): a pending request's "reject" link in the shape mailed before the change (`{journal}/invitation/decline`), one-language journal on a two-language site: "Confirm Decline Invitation" ends in a blank GET 500, request still pending | OJS OMP OPS · stable-3_5_0 too | `checks/sync/pkp-lib-13181/emailchange-links.js`; fixed when `s4.chain` ends on the Contact tab with `s4.stillPending` 0 (the `s3` landings are (1), accepted) | 2026-09-17 (thread + DMs to @beaug, @jarda.kotesovec) | Report: `docs/reports/2026-09-17-pkp-lib-13181.md`. Cause: the email-change invitation is created without a journal (`BaseProfileForm::execute()`), so the new `Invitation::getContextPath()` answers `index` for it; the decline form's address takes the site path while its language segment follows the served journal. Weight minor (1) and low, transitional (2). Register entry in U03 for (1): A18, risk accepted by @jarda.kotesovec 2026-09-25 after @asmecher closed #13181 as "OK with the current behaviour" (2026-09-18); the row now tracks (2) alone. Reproduced three times 2026-09-17 on OJS `c0ca4b3caf` / pkp-lib `efbba94ae7`, twice on a freshly reset database (`.reports/sync/s17-13181/`, `s17-13181b/`). **2026-09-18**: OMP (`c6a132892`) and OPS (`4bb66b1469`) received the change with lib/pkp `1bcd4dd55f` and show both findings as OJS (`7c8d69af3e`) does, kept script on databases reset that morning (`.reports/sync/s18-13181-{ojs,omp,ops}/`); U03 A18 now covers the three apps, A3 and A1 retired (the same change fixed them, `checks/sync/pkp-lib-13181/a1-a3-redrive.js`). **3.5 shows it too**, at ojs `63c7e555cc` / lib/pkp `9ce915e07e` (twins `ac6b031624`, `78d439c8b8`; the kept script on the line's fresh OJS fleet, `.reports/sync-3_5/s18-13181-ojs/`: both landings `index/en/user/profile#contact`, `s4.chain` ending in GET 500, `stillPending` 1); the report carries the update. Still reproduces 2026-09-21 on `main` at ojs `cc81df882a` / pkp-lib `63945bbd82` (`.reports/sync/s21-13181/`: both landings `index/en/user/profile#contact`, `s4.chain` ending in GET 500, `stillPending` 1) and on the line at ojs `769450f2d4` / lib/pkp `6acb1be2eb` (`.reports/sync-3_5/s21-13181-ojs/`, the same three reads). Still reproduces 2026-09-22 on `main` at ojs `38781720df` / pkp-lib `f8bacd7658` (`.reports/sync/s22-13181/`: both landings `index/en/user/profile#contact`, `s4.chain` ending in GET 500, `stillPending` 1); the line's tips unchanged since 2026-09-21, not re-run there. Still reproduces 2026-09-23 at ojs `802202cb3e` / pkp-lib `5af3b39336` (`.reports/sync/s23-13181/`: the same three reads); the line unchanged, not re-run. Still reproduces 2026-09-24 at ojs `71bb244152` / pkp-lib `25182919bf` (`.reports/sync/s24-13181/`: both landings `index/en/user/profile#contact`, `s4.chain` ending in GET 500, `stillPending` 1; issue #13181 closed upstream, the behaviour unchanged); the line's new tip carries no #13181 change, not re-run. Still reproduces 2026-09-27 at ojs `72b85f4ba0` / pkp-lib `26ae6431b5` (`.reports/sync/s27-13181/`: `s4.chain` ending in GET 500, `stillPending` 1); the line unchanged, not re-run. |
| pkp/ojs#5813 (`325931a71c`, 2026-09-21: `plugins/generic/jatsTemplate` `c1c0e5379f..1065bb02ae` for pkp/pkp-lib#12356; tracking issue pkp/pkp-lib#13378, filed 2026-09-22 from the report, abstract only) | Default JATS XML (the Publication › "JATS XML" page, its download, `GET …/publications/{pid}/jats`, the OAI-PMH `jats` record): an abstract that names tags as text with a matching close tag ("write <i>species names</i>", "<p>text</p>") comes out with the names turned into markup and the sentence split into paragraphs | OJS (the plugin ships in OJS alone) · stable-3_5_0 too (titles) | `checks/sync/ojs-5813/default-jats.js`; fixed when `after-literal2.xml`'s `<abstract>` holds one `<p>` with `&lt;i&gt;species names&lt;/i&gt;` as text | 2026-09-22 (thread + DMs to @beaug, @jarda.kotesovec) | Report: `docs/reports/2026-09-22-ojs-5813.md`. Cause: `JatsHelper::htmlToJatsContent()` decodes entities before re-escaping, so a literal `&lt;i&gt;` and a real `<i>` meet `convertEscapedTags()` as the same string; the deleted `htmlAbstractToJats.xsl` parsed with `loadHTML()` where an entity is text. Minor (narrow input, output only, DTD-valid so silent). Reproduced 2026-09-22 by rr14 and re-held on a freshly reset OJS the same day (`.reports/sync/rr14/after-literal2.xml`, records `.reports/sync/s22-5813-fresh/`); the "before" is the deleted stylesheet run standalone on the same stored string (`rr14/before-literal2.xml`), no live pre-change fleet. Not on the stable line's plugin (predates the path). Still reproduces 2026-09-23 at ojs `802202cb3e` (plugin pointer unchanged; `rr14/after-literal2.xml` rewritten 12:12, records `.reports/sync/s23-5813/`). 2026-09-24: the script made portable (its input now kept beside it as `checks/sync/ojs-5813/abstracts.json`, outputs in the kit's `.reports/sync/<PROBE_AGENT>/`); still reproduces at ojs `71bb244152` (`.reports/sync/s24-5813/after-literal2.xml`: four `<p>` with `<italic>species names</italic>`; issue pkp/ojs#5813 closed upstream, the plugin pointer unchanged). Delete when the plugin's fix lands. **2026-09-25**: titles too (the same helper builds article-title, subtitle and the translated ones: "The <i>species</i> element" typed in "Title & Abstract" comes out as `<italic>`), on `main` since jatsTemplate `be30f06` (2026-07-08, before this change); **3.5 shows it in titles** since pkp/ojs#5827 (`4a76983529`) at ojs `a3dc3b54ff` (3.5's JATS has no abstract), `checks/sync/ojs-5827/titles.js` `RR16_ONLY=s1` on both (`.reports/sync/s25-5827-main/`, `.reports/sync-3_5/s25-5827-fresh/`); report updated, one report. Still reproduces 2026-09-27 at ojs `72b85f4ba0` (`.reports/sync/s27-5813/after-literal2.xml`: four `<p>`, `<italic>species names</italic>`). |
| pkp/pkp-lib#13369 (`5af3b39336`, 2026-09-22, for issue pkp/pkp-lib#13291) | Review API `PUT …/reviewAssignments/{id}/review`: on a journal with no competing-interests policy, `"competingInterests": ""` (or `null`) answers 200 instead of the issue's 422 and records a declaration (`competingInterestsDeclared` true, a log entry, "No competing interests were disclosed." in Review Details); text is refused as asked | OJS OMP (OMP since its pointer reached `25182919bf`, 2026-09-24; OPS has no review) | `checks/sync/pkp-lib-13291/ci.js`; fixed when `result-ojs.json` `.s1.putEmpty.status` is 422 and `.s1.after.competingInterestsDeclared` false | 2026-09-23 (thread + DMs to @beaug, @jarda.kotesovec) | Report: `docs/reports/2026-09-23-pkp-lib-13369.md`. Intention gap. Cause: `TrimStrings` + `ConvertEmptyStringsToNull` make `""` null and Laravel skips the non-implicit policy closure on null under `nullable`. Minor (API only until the #13282 UI lands). Found by rr15, held twice on freshly reset OJS (`.reports/sync/s23-13291-fresh/`, `s23-13291-fresh2/`); "before" by the pre-change `EditReview::validated()` whitelist and the issue's words, not driven. Not on the stable line. 2026-09-24: OMP now carries it (lib/pkp `25182919bf`) and shows the same, the script extended to OMP (no recommendation select there): `putEmpty` 200, `competingInterestsDeclared` true, one log entry, text 422 on both apps (`.reports/sync/s24-13291/result-{ojs,omp}.json`); the script's "View changes" read finds no link on either app (its `s3` selector, not the finding). Still reproduces 2026-09-27 on OJS and OMP at pkp-lib `26ae6431b5` / `17a1f01fed` (`.reports/sync/s27-13291/result-{ojs,omp}.json`: `putEmpty` 200, `competingInterestsDeclared` true). |
| pkp/ojs#5827 (`4a76983529`, 2026-09-24, `stable-3_5_0` only: `plugins/generic/jatsTemplate` `14f51fa667..26c6ca0aa2` for pkp/pkp-lib#12414) | Default JATS XML titles (Publication › "JATS XML", `GET …/publications/{pid}/jats`): a title, subtitle or translated title stored with a bare "<" before a character ("Effects at p<0.05 in small trials", written through the REST API) comes out cut off at the "<" ("Effects at p") | stable-3_5_0 (OJS; `main` does not show it) | `checks/sync/ojs-5827/titles.js` with `PKP_E2E_LINE=stable-3_5_0` and `RR16_ONLY=s2`; fixed when `s2-jats.xml`'s article-title reads `Effects at p&lt;0.05 in small trials` | 2026-09-25 (thread + DMs to @beaug, @jarda.kotesovec) | Report: `docs/reports/2026-09-25-ojs-5827-stable-3_5_0.md`. Cause: the backported `JatsHelper::htmlToJatsElement()` starts with `strip_tags()`, which reads "<0.05 …" as a tag; `main`'s helper runs `PKPString::stripUnsafeHtml()` first (its line 90), which the backport left out. Minor (API-written titles only; the editor stores `&lt;`). Found by rr16, held on a freshly reset line OJS (`.reports/sync-3_5/s25-5827-fresh/`); `main` driven, whole (`.reports/sync/s25-5827-main/`); "before" offline (`.reports/sync-3_5/rr16/cli-before-after.txt`). |

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
  the tips, (a) and (b) stay open. Again 2026-09-25 (U50 session, Mac, reset database, auto workers): OMP U40 S6 red in the OMP final, green alone (`.reports/U50/final-run-omp.log`, `alone-omp-reds.log`). Again 2026-09-25 (U51 session, Mac, reset database, auto workers): OMP U40 S6 red in the OMP final, green alone (`.reports/U51/final-run-omp.log`, `alone-omp-reds.log`).
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
  time on a journal. **Watch condition**: reds on CI.
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
- **A wizard rich-text fill lost to a re-render under load** (U21 S3,
  OPS, local). The Autosave bullet types "Autosave check" into the Title
  box and reads it back; in the 2026-09-12 U21 revision's first OPS final
  run, started while the OJS final was still running (two full suites at
  eight workers each on 10 cores), the box read the seeded title again
  for the whole 10 s wait, so the fill was overwritten by the form's own
  re-render; green alone (1.1 min) and never seen with one suite running.
  Finals now run one app at a time. **Watch condition**: a red with one
  suite running or at CI's four workers; then anchor the fill on the
  editor's settled state before typing.
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
  holds 257 bytes from 12:43). **Next step**: keep the earlier passes'
  server logs (append, or one folder per pass), then read the next
  sighting's `[harness] php -S died` line.
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
  32.2 s, `.reports/U41/rerun-ojs-serial.log`).
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
  push is CI's. Again 2026-09-24 in the U39 session's OPS final and red alone once more; serial 10 and solo 2 green alone (`.reports/U39/final-run-ops.log`, `alone-ops-U40S1-U49S6.log`). Again 2026-09-24 in the U44 session's OPS final on a reset database at auto workers, the only red of 215; serial and solo 13 green alone (`.reports/U44/final-run-ops.log`, `alone-ops-serial-solo.log`). Again 2026-09-25 in the U48 session's OPS final on a reset database at four workers, the only red of 243; serial and solo 13 green alone (`.reports/U48/final-run-ops.log`, `serial-solo-ops.log`). Again 2026-09-25 (U50 session): red in the OPS final and red alone, as before (`.reports/U50/final-run-ops.log`, `alone-ops-reds.log`). Again 2026-09-25 (U51 session): red in the OPS final and red alone, as before (`.reports/U51/final-run-ops.log`, `alone-ops-reds.log`). Again 2026-09-26 (U53 session, Mac, reset databases, auto workers): red in the OPS final beside U14 S5 and red alone, as before (`.reports/U53/final-run-ops.log`, `alone-ops-reds.log`). Again 2026-09-26 (U54 session, Mac, reset database, auto workers): red in the OPS final beside U14 S5 and red alone; serial and solo 17 green alone (`.reports/U54/final-run-ops.log`, `alone-ops-reds.log`, `alone-ops-serial-solo.log`). Again 2026-09-26 in the U55 session's OPS final on a reset database at auto workers, beside U14 S5 and the U18 `rss.xmp` class; serial 16 and solo 5 green alone (`.reports/U55/final-run-ops.log`, `alone-ops-{serial,solo}.log`). Again 2026-09-26 (U56 session, Mac, sync baselines, reset database): red in the OPS final and red alone; serial 15 and solo 8 green alone (`.reports/U56/final-run-ops.log`, `alone-ops-reds.log`). Again 2026-09-26 in the U60 session's OPS final (reset database, auto workers), beside the four U18 reds; serial 15 green alone (`.reports/U60/final-run-ops.log`, `alone-ops-serial.log`). Again 2026-09-27 (U61 session, Mac, reset database, auto workers): red in the OPS final beside the U18 four, U14 S5 and U54 S3; serial 21 and solo 21 green alone (`.reports/U61/final-run-ops.log`, `alone-ops-{serial,solo}.log`). Again 2026-09-27 (U62 session, Mac, reset database, auto workers): in the OPS final and red alone; serial 23 and solo 24 green alone (`.reports/U62/final-run-ops.log`, `alone-ops-reds.log`, `alone-ops-{serial,solo}.log`). Again 2026-09-28 (U68 session, Mac, reset database, auto workers): red in the OPS final, not re-run (`.reports/U68/final-run-ops.log`).
- **OJS U45 S6's DOI row expander blocked by the list header** (OJS,
  once, 2026-09-27). In the U64 session's OJS final (reset database,
  auto workers) the "Show more details about <id>" click in
  `DoisPage.expand` retried until the 300 s timeout because an `<li>` of
  the DOI list panel's header intercepted the pointer; green alone in
  11 s (`.reports/U64/final-run-ojs.log`, `alone-ojs-reds2.log`).
  **Watch condition**: a second red at the same click.
- **OPS U09 S4's Custom Block Manager row missing from the plugins grid**
  (OPS, once, 2026-09-27). In the U64 session's OPS final (reset
  database, auto workers) `tr.gridRow[id$="-row-customblockmanagerplugin"]`
  was not found within 30 s (`CustomContentPages.js:450`); green alone
  (`.reports/U64/final-run-ops.log`, `alone-ops-reds.log`). **Watch
  condition**: a second red at the same row wait.
- **OMP U16 S8's "Browse" block marks no category** (OMP, once,
  2026-09-27). In the U70 session's OMP final (reset database, auto
  workers) the block on the "Science" category page listed no marked
  entry where "Science" is expected (`U16-categories.spec.js:636`,
  `markedNames()` `[]`); green alone in 11 s (`.reports/U70/final-run-omp.log`,
  `alone-omp-U16S8.log`). **Watch condition**: a second red at the same
  read.
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
  download read) is the next daily session's. Again 2026-09-26 (U56 session, Mac, checkouts at the day's sync baselines, reset databases, auto workers): red in all three finals and red alone, 4 per app (`.reports/U56/final-run-{ojs,omp,ops}.log`, `alone-<app>-reds.log`). Again 2026-09-26 (U60 session, Mac, the same baselines, reset databases, auto workers): 4 per app in all three finals, not re-run alone (`.reports/U60/final-run-{ojs,omp,ops}.log`). Again 2026-09-27 (U61 session, Mac, reset databases, auto workers): 4 per app in all three finals; serial and solo green alone on each app (`.reports/U61/final-run-{ojs,omp,ops}.log`, `alone-<app>-{serial,solo}.log`). Again 2026-09-27 (U62 session, Mac, reset databases, auto workers): 4 per app in all three finals, not re-run alone (`.reports/U62/final-run-{ojs,omp,ops}.log`). Again 2026-09-28 (U68 session, Mac, reset databases, auto workers): 4 per app in all three finals, not re-run; serial and solo green in all three (`.reports/U68/final-run-{ojs,omp,ops}.log`).
- **Profile save response not seen in 30 s** (U03 S5, "cancel, and
  reject, an email change", OPS, once: 2026-09-23, the U36 session's OPS
  final on a reset database on the Mac at auto workers,
  `.reports/U36/final-run-ops.log`). `ProfilePage.waitForSave()`
  (`page.waitForResponse` on the tab's save POST) timed out at 30 s;
  green alone (`.reports/U36/alone-ops-U03S5.log`). Watch condition: a
  second sighting; then the error context says whether the save was
  never sent or answered before the wait was armed.
- **"Cancel upload" on a throttled upload** (U36 S9, OJS and OMP:
  2026-09-24, the U08 harness regression re-runs on the VM at auto
  workers while three test authors ran suites on the same fleets,
  `.reports/U08/harness/regression.log`). Red in the OJS suite run with
  the new context builder and with the old one, green alone on both; on
  OMP red once alone, then green twice. Lean: the 243-byte fixture
  finishes uploading before "Cancel upload" is pressed. Watch condition:
  a sighting in a final or on CI; then give the test a fixture large
  enough to outlast the press. Tripped the same day: the U08 OJS final
  on a reset database at auto workers, red beside U14 S5 on the same
  read (the reloaded panel not empty), green alone
  (`.reports/U08/final-run-ojs-attempt1.log`, `alone-ojs-reds.log`).
  The lean did not hold: with the throttle slowed from 4 KB/s to 64
  bytes/s the test went red 3 of 3 alone on OJS and 2 of 3 on OMP
  (`.reports/U08/u36s9-fix-{ojs,omp}.log`; change reverted), so a slower
  upload makes the file land more often, which points at "Cancel upload"
  not stopping an upload already sent rather than at a fast fixture.
  Next: a diagnostic read of the upload request and the file list
  around the press before any test change (possibly a U36 finding).
  Also red once in the OMP final at the merged tips of pkp-lib#13359
  (2026-09-24, reset database, eight workers,
  `.reports/pr13359/merge-omp.log`, error context kept beside it: the
  reloaded panel still lists `article.pdf`); green alone right after.
  Again 2026-09-24 in the PR review of pkp-lib#13263 (companion
  `i13263`): OMP and OJS finals on reset databases at eight workers,
  beside U14 S5 on both, green alone on both
  (`.reports/i13263/final-run-{omp,ojs}.log`, `alone-{omp,ojs}-reds.log`).
  Again 2026-09-24 in the U10 session's OJS final on a reset database at
  eight workers, beside U14 S5, and in its second OMP final, the only red
  of 350; green alone on both (`.reports/U10/final-run-ojs-attempt1.log`,
  `final-run-omp-attempt2.log`, `alone-ojs-reds.log`, `alone-omp-reds-2.log`). Again 2026-09-25 (U13 session, VM): OMP, beside U14 S5 in the OMP final on a reset database, green alone (`.reports/U13/final-run-omp.log`, `alone-omp-reds.log`). 2026-09-25: red in the same guard run beside U30 S4, green alone (`.reports/sync/s25/guard/ojs-reds-alone.log`). Again 2026-09-25 (U51 session, Mac, reset database, auto workers): OJS, beside U14 S5 in the OJS final, green alone (`.reports/U51/final-run-ojs.log`, `alone-ojs-reds.log`). Again 2026-09-27 (U62 session, Mac, reset database, auto workers): OJS, beside U14 S5 in the OJS final, green alone (`.reports/U62/final-run-ojs.log`, `alone-ojs-reds.log`). **On CI 2026-09-27**: push run 36322740739 at `948868b`, OMP shard 3/3 red on both attempts at line 898 (the reloaded panel's empty-state "Upload File" never shows; the job failed on it), OMP at `3cd59e9443`; the diagnostic read above is still owed. Again 2026-09-27 (U75 session, VM, reset database, auto workers): OJS, the only red of 581 in the OJS final at the same line (the reloaded panel's "Upload File" never shows), green alone (`.reports/U75/final-run-ojs.log`, `alone-ojs-U36S9.log`).
- **Users & Roles "Email" dialog still open after "Send Email"** (U14 S5,
  OJS, once: 2026-09-17, the VM's first U14 final at four workers,
  `.reports/U14/final-run-ojs-attempt1.log`). The send request answered
  and the dialog was still counted 30 s later (the test's positive mail
  control, `UsersPage.sendEmail`); green in the second final the same day
  (255 of 255) and in the file's own runs. Watch condition: a second
  sighting; then the error context says whether the form re-rendered
  with a refusal or the close never ran. **Tripped 2026-09-26**: red twice at OJS line 738 in the U14 diagnostician's repeated runs at four workers (`.reports/flake-s26/u14/`); the error-context read (re-rendered with a refusal, or the close never ran) is the next diagnosis. Again 2026-09-27 (U62 session, Mac, reset databases, auto workers): in all three finals, green alone on each (`.reports/U62/final-run-{ojs,omp,ops}.log`, `alone-<app>-reds.log`).
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
  "Email" window still open 30 s after "Send Email" (its own entry, "Users & Roles \"Email\" dialog still open"). Again 2026-09-28 (U68 session, Mac, reset databases, auto workers): S5 red in the OMP and OPS finals, green alone on each (`.reports/U68/final-run-{omp,ops}.log`, `alone-reds.log`).

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
- **Submission wizard autosave not firing within its 100 s wait** (U21
  S3, OMP, CI, once). In the same nightly run 35558115088 the OMP S3
  ("save for later and resume from the emailed link") typed the title on
  the Details step and waited 100 s for the wizard's own timed save
  (`PUT /publications/{id}`) and for the footer's "Saving" flash; neither
  came (`page.waitForResponse` and `page.waitForFunction` both at 100 s,
  the error context showing the wizard still on Details); green on the
  retry (flaky, 1.8 min), so the job passed. A different mechanism from
  the OPS entry above (a fill lost to a re-render): here the timer's save
  never left the page. **Watch condition**: a second sighting; then read
  whether the autosave timer is paused while the title editor has focus.
  **Second sighting 2026-09-24 on the Mac** (OPS, the U42 harness agent's
  U21 regression run at load average 50–72 with probes and another suite's
  agents on the fleets; green alone, `.reports/U42/harness/pw-ops-U21-S3.log`):
  the watch condition has tripped, the read above is due in the next
  maintenance session.
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

- **OPS U09 S6's custom page body missing "Welcome."** (OPS, once,
  2026-09-25). The public page is server-rendered, so the saved text
  lacked the words; not reproduced in 46 runs (CPU 6×, repeats).
  Hardened 2026-09-26 (`.reports/flake-s26/fixC/diagnosis.md`): `RichTextBox.type()` waits for the editor's
  focus and returns only when the editor holds the typed words.
  **Watch condition**: a red at the typing step; then read its error
  context. **Tripped 2026-09-27** (U75 session, VM, OPS final on a reset database, auto workers, beside U14 S5): red at the typing step, `CustomContentPages.js:151` `RichTextBox.type()` → `body().click()`; the error context shows TinyMCE's "Loading..." throbber (`.tox-throbber`, `aria-busy="true"`) intercepting every click until the 180 s test timeout, so the editor iframe was present but the editor never finished loading; green alone in 9.8 s (`.reports/U75/final-run-ops.log`, `alone-ops-U09S6-U14S5.log`). Next: wait for the throbber to leave before the click, and read why the editor stalls under load.

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
  unique ORDER BY. **Sighted 2026-09-27** (first in the U61 session's OPS final): OPS U54 S3 "create a role" red at `RolesTab.openRowActions` because the new "Data editor" landed as the Roles list's first row, which carries no "Settings" arrow (U54 A1, A13). The diagnosis is the next daily session's. Again 2026-09-27 (U63 session's OMP final, Mac, reset database, auto workers): OMP U54 S6 "remove a role", "Spare desk" the first row, green alone (`.reports/U63/final-run-omp.log`, `alone-omp-reds.log`). Again 2026-09-27 (U58 session's OMP final, VM, reset database, auto workers): OMP U54 S3 "create a role", "Data editor" the first row, green alone (`.reports/U58/final-run-omp.log`, `alone-reds.log`). Again 2026-09-27 (U71 session's OMP and OPS finals, VM slot s1, reset databases, auto workers): U54 S3 on both, "Data editor" the first row, green alone on both (`.reports/U71/final-run-omp.log`, `final-run-ops.log`, `alone-omp-U54S3-U14S5.log`, `alone-ops-U54S3-U14S5.log`).

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
  reviewer comments. **Watch condition**: a sighting in a final or on CI.

- **OPS U39 S2 "the Publisher Library on the Settings tab": the row's "Edit" link
  never shows** (`LibraryList.openStrip`, `LibraryPages.js:352`, 30 s on
  the "Journal guide" row's controls). Sighted 2026-09-27 (U63 session's
  OPS final, Mac, reset database, auto workers), green alone
  (`.reports/U63/final-run-ops.log`, `alone-ops-reds.log`). **Watch
  condition**: a second sighting; then read its trace.

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

## Companion branches — pkp-e2e branches waiting on app PRs

One row per branch prepared for a developer's open OJS, OMP or OPS pull
request (MAINTENANCE "A developer's PR fails the suite"), named exactly
like the developer's branch. State: `investigating` (reproducing, no
verdict yet) · `ready` (pushed, green at the PR ref, developer told) ·
`merged` (only while the sync line is written; then the row is deleted).

| App PR | Branch | State | Since | Note (one line) |
|--------|--------|-------|-------|-----------------|
