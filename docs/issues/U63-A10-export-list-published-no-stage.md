# Export list's "Stages" filters leave out every published submission, with no "Published" stage to pick

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (a published submission stays in "Production")
  - 3.4: none (code; no Done stage)
  - 3.3: none (code; no Done stage)
- **Introduced** `pkp/pkp-lib#12881` for `pkp/pkp-lib#12799` · [d52aa4c84b](https://github.com/pkp/pkp-lib/commit/d52aa4c84b740ec537b13141f88401e8d2e4cdc4) · 2026-06-29 (merged) · Erik Hanson (ewhanson)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U63 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a10)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

In Tools › "Native XML Plugin", the export list's "Filters" panel lists
the workflow stages under "Stages". No stage lists a published
submission: "Production" gives only the unpublished submissions in
production, and every stage pressed at once gives every submission but
the published ones. The dashboard shows them under "Published", which
the export list does not offer.

A manager who wants to export only published work cannot narrow the
list to it, and nothing on screen says that the stage filters leave it
out. They have to pick it out of the full list by hand. Nothing is
lost.

The same list and filters are on OJS's "PubMed XML Export Plugin" and
OMP's "ONIX 3.0 Monograph Export Plugin", tools whose purpose is
exporting published work.

## Impact

- **Lost.** Time. A manager who trusts "Production" to include
  published work sees less than the journal has.
- **Who.** Managers on the export tools, on every journal, press and
  preprint server with published work, once they run the next release.
  No released version is affected: the change behind it is only on
  `main`. When an installation upgrades to that release, the upgrade
  moves its published submissions out of their workflow stage. From
  then on no stage filter lists them.
- **Way round.** Clear the filters and tick the published lines in the
  full list, or search for each title. No other filter narrows to
  published work: "Activity" counts days since the last activity, and
  "Sections" narrows by section. On a large journal this is costly,
  because "Select All" and the export take only the page on screen, 100
  lines of mixed submissions (U63
  [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a11)).
  So each page needs its own ticks and its own export. On a journal,
  "Export Issues" exports whole issues with their articles, which
  covers the published articles that are in an issue.

Medium, not low: the filter gives a wrong answer on a task, and the way
round costs one hand-picked export per page on a large journal. It is
not high, because nothing is lost and the export itself works.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS, OMP or OPS `main`, with its
  journal, press or preprint server `publicknowledge`. Its published
  submissions: on the journal 1 "The Signalling Theory Dividends: A
  Review Of The Literature And Empirical Evidence" and 17
  "Antimicrobial, heavy metal resistance and plasmid profile of
  coliforms isolated from nosocomial infections in a hospital in
  Isfahan, Iran"; on the press 5 "Bomb Canada and Other Unkind Remarks
  in the American Media" and 14 "From Bricks to Brains: The Embodied
  Cognitive Science of LEGO Robots"; on the preprint server 17 of its
  19 preprints (all but 1 and 4).

1. Sign in as `rvaca` (the manager).
2. In the side menu click "Tools"; on the "Import/Export" tab click
   "Native XML Plugin".
3. Open the "Export Articles" tab ("Export" on a press, "Export
   Preprints" on a preprint server). The list holds every submission:
   20 on the journal, 18 on the press, 19 on the preprint server, the
   published ones among them.
4. Click "Filters", then "Production" under "Stages".
5. Click the other stages too: "Submission", "Review" and
   "Copyediting" ("Submission", "Internal Review", "External Review"
   and "Copyediting" on a press; a preprint server offers "Production"
   alone).
6. Click each pressed stage again to clear it.

**Expected:** every submission can be found under one of the "Stages"
filters. A published submission is listed under a stage of its own,
"Published", as the dashboard lists it. With every stage pressed the
list is the full list.

**Observed:** "Stages" offers "Submission", "Review", "Copyediting" and
"Production" on the journal, "Submission", "Internal Review", "External
Review", "Copyediting" and "Production" on the press, and "Production"
alone on the preprint server. No published submission is listed under
any of them:

- after step 4 the journal lists 5, 6, 9 and 15, the press lists 4 "How
  Canadians Communicate: Contexts of Canadian Popular Culture", and the
  preprint server lists 1 "The influence of lactation on the quantity
  and quality of cashmere production" and 4 "Genetic transformation of
  forest trees";
- after step 5 the journal lists 18 of its 20 submissions (all but 1
  and 17) and the press 16 of 18 (all but 5 and 14);
- after step 6 the full list returns, published submissions included.

No request failed and the browser logged no error. Control: the
dashboard's "Published" view (`/index.php/publicknowledge/en/dashboard/editorial?currentViewId=published`)
shows "Published (2)" on the journal and the press and "Published (17)"
on the preprint server, each line with the stage "Published".

## Cause

Since `pkp/pkp-lib#12799`, a submission whose version of record is
published leaves its workflow stage for a stage of its own,
`WORKFLOW_STAGE_ID_DONE` (6). lib/pkp
`classes/observers/listeners/ApplyDoneWorkflowStage.php`, `handle()`,
records a `MoveToDone` decision when a publication of the version of
record is published, and a `ReturnToWorkflow` decision when the last
one is unpublished; other publications do not move the submission. The
upgrade `I12799_MovePublishedSubmissionsToDone` moves every submission
already published. Before this change a published submission stayed in
"Production", which is why 3.5 and older do not show the fault.

The server names stage 6 "Done" (`PKPApplication::getWorkflowStageName()`,
`submission.done`, also the label of the stage entry in
`Schema::getPropertyStages()`). The screens name it "Published": the
dashboard's "Published" view filters on `stageIds
[WORKFLOW_STAGE_ID_DONE]` (`classes/submission/Repository.php`), and
ui-library shows the stage as `submission.stage.published`
(`src/composables/useSubmission.js`, "Done is presented as published
throughout the dashboard").

The export list's filters were not extended. lib/pkp
`classes/components/listPanels/PKPSubmissionsListPanel.php`,
`getConfig()`, builds the "Stages" group (lines 120–123) from
`$this->getWorkflowStages()` alone. Each app's
`APP\components\listPanels\SubmissionsListPanel::getWorkflowStages()`
ends at `WORKFLOW_STAGE_ID_PRODUCTION`. So the list offers no filter
whose `stageIds` value is 6, and every value it offers excludes
published submissions. The submissions API itself accepts
`stageIds=6` (`PKPSubmissionController`, case `stageIds`; the
collector's `whereIn('s.stage_id', …)`), as the dashboard's view shows.

Reach:

- `PKPNativeImportExportPlugin`, OJS's `PubMedExportPlugin` and OMP's
  `Onix30ExportPlugin` are the only users of `SubmissionsListPanel` in
  the three apps (checked in the code; PubMed and ONIX not driven).
  Each drops the first filter group (Overdue, Incomplete) with
  `array_slice($submissionsConfig['filters'], 1)`. The "Stages" group
  is the second, so it is kept, and a filter added to it is kept too.
- Stored data is right: stage 6 is where published submissions belong
  now.

## Proposed fix

A proposal, tried on `main`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/export-list-published-no-stage/fix.diff),
against each app root).

Recommended: add the Done stage to the "Stages" group in the shared
`PKPSubmissionsListPanel::getConfig()`, after the app's own stages:

```diff
             [
                 'heading' => __('settings.roles.stages'),
-                'filters' => $this->getWorkflowStages(),
+                'filters' => [
+                    ...$this->getWorkflowStages(),
+                    // A submission with a published version of record rests in Done,
+                    // which the dashboard presents as "Published" (pkp/pkp-lib#12799).
+                    [
+                        'param' => 'stageIds',
+                        'value' => WORKFLOW_STAGE_ID_DONE,
+                        'title' => __('submission.stage.published'),
+                    ],
+                ],
             ],
```

This covers the three apps and the three tools in one place, and it
keeps the intent of `pkp/pkp-lib#12799`: Done stays outside
`getApplicationStages()` and the apps' workflow stage lists, as
`PKPApplication::getNonWorkflowStages()` has it.

One choice for the team: the label. The fix uses
`submission.stage.published` ("Published"), the word the dashboard and
ui-library show for this stage, so the filter matches the view a
manager already knows. The server's own name, through
`getWorkflowStageName()`, is `submission.done` ("Done"), which no
screen a manager uses shows for this stage. If the team prefers the
server's name, the title becomes
`__(Application::getWorkflowStageName(WORKFLOW_STAGE_ID_DONE))`. Tried on
all three apps: "Stages" ends with "Published", which lists exactly the
published submissions (2 on the journal, 2 on the press, 17 on the
preprint server). Every stage plus "Published" gives the full list.
"Published" combined with a section still narrows to that section. Each
existing stage listed the same lines with the fix as without it.

**Alternatives:**

- The same entry in each app's `SubmissionsListPanel::getWorkflowStages()`:
  three repositories for one rule, and those methods list the workflow
  stages, which Done is not.
- Make "Production" also match Done: each filter entry sends one
  `stageIds` value, so "Production" cannot send both 5 and 6. And a
  version of record can be published from an earlier stage (the comment
  in `Schema::getPropertyStages()`), so Production would be the wrong
  home for some of them.
- A "Published" status filter (`status=3`): since `pkp/pkp-lib#12799`
  only a published version of record moves a submission to Done, so a
  published status no longer means one stage. The dashboard's
  "Published" view reads the stage, and the list should read the same.

**What goes with it:** no data repair, no API or plugin-hook change, no
backport. The guard is an e2e check of the export list's "Published"
filter.

Small: a few lines in one place, reusing a stage value and a label that
already exist, with no API, hook or data change and no work in the
apps.

## Evidence

- Kept script, which takes the Steps and, when the list offers it, the
  "Published" filter (alone, with a section, with every stage), plus the
  dashboard control:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/export-list-published-no-stage/walk.js),
  run with `node bin/probe.js all shared/playwright/checks/issues/export-list-published-no-stage/walk.js`.
  The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/export-list-published-no-stage/fix.diff ojs omp ops`,
  the same walk, then `node bin/try-fix.js revert ojs omp ops`.
- Walked 2026-09-30 on `main` and `stable-3_5_0`, OJS, OMP and OPS, on
  pkp/datasets 38ab955 (2026-09-30), PostgreSQL. MySQL not checked; from
  the code the filter is a plain `whereIn` on `stage_id`, which does not
  depend on the database.
- Tips: `main`: OJS bade233f73, OMP 3b0ecf794c, OPS c8af945bb7;
  pkp-lib 2e377d27fc (OJS) and 3dc90c81a6 (OMP, OPS); ui-library
  280f98c570. `stable-3_5_0`: OJS 92b9a16b48, OMP 3081c9b00d, OPS
  cf4fce69bd; pkp-lib a9c76aed62; ui-library 1a7a47504c.
  `stable-3_4_0`: OJS 9571d8fde7, OMP 0aec65441f, OPS acd8ae704b,
  pkp-lib df13621c2d. `stable-3_3_0`: OJS 9fdb9bcf9a, OMP 8e72fc8836,
  OPS c5532e2161, pkp-lib d446601ebe.
- Code reads: on 3.5, 3.4 and 3.3 lib/pkp has no `WORKFLOW_STAGE_ID_DONE`
  and no `ApplyDoneWorkflowStage` (`classes/core/PKPApplication.php`,
  `.inc.php` on 3.3), and `pkp/pkp-lib#12799` is not in the branches'
  logs, so published submissions keep their stage. The export list is
  the same `SubmissionsListPanel` with a "Production" filter there
  (3.4 `PKPNativeImportExportPlugin.php`, 3.3 OJS
  `NativeImportExportPlugin.inc.php` and
  `classes/components/listPanels/SubmissionsListPanel.inc.php`).
- Introduced: `git blame` of the "Stages" group in
  `PKPSubmissionsListPanel.php` points to e3f570bc37 (2021-04-20, Nate
  Wright), code that was right while published submissions stayed in
  Production. The change that made it wrong is d52aa4c84b, which
  added the Done stage, the listener and the upgrade. It was authored
  2026-06-09 and committed 2026-06-28; the header gives the date its PR
  was merged, 2026-06-29 (UTC).
- Upstream search 2026-09-30, pkp/pkp-lib, pkp/ojs, pkp/omp and
  pkp/ui-library, issues and PRs: "stage filter published export",
  "native export filter published", "SubmissionsListPanel stage",
  "getWorkflowStages", "WORKFLOW_STAGE_ID_DONE", "12799". Nothing about
  the export lists' filters; `pkp/pkp-lib#12799`'s follow-ups
  (`pkp/pkp-lib#13037`, `pkp/pkp-lib#12960`, `pkp/pkp-lib#13109`) touch
  other parts.
- Not driven: the PubMed and ONIX export lists, and "Export Issues" as
  a way round (its articles read in the code,
  `IssueNativeXmlFilter::addArticles()`).
