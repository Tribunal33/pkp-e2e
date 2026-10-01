# Native XML export list: no "Stages" filter finds published submissions

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#12881` for `pkp/pkp-lib#12799` · [d52aa4c84b](https://github.com/pkp/pkp-lib/commit/d52aa4c84b740ec537b13141f88401e8d2e4cdc4) · 2026-06-09 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U63 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a10)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A manager opens the Native XML Plugin's export list and presses "Filters"
to narrow it by stage. Published submissions now move to a stage of
their own, "Done", and the "Stages" group has no button for it. So no
stage lists them: "Production" lists only the work still in production,
and with every stage pressed the published submissions are still
missing, apart from any an editor has sent back to the workflow. Before,
"Production" listed them.

Nothing is lost: the unfiltered list still holds every submission, and
the search box finds a published one by its title. But a manager can no
longer list the published work on its own. The PubMed export on a
journal and the ONIX 3.0 export on a press use the same list and
filters.

Only `main` has the Done stage, so no released version shows this yet.
It reaches every site with the next release, whose upgrade moves the
published submissions into Done.

## Impact

- **Lost**: no data and no export. The published submissions are left
  out of every stage filter without a word on screen.
- **Who**: managers and editors who export from Tools › Import/Export,
  every time they filter by stage. The list shows 100 submissions at a
  time, so the larger the journal, the more pages they look through to
  pick out its published work.
- **Way round**: export from the unfiltered list, or find each published
  submission with the search box.

Low: the export still gets done. A large journal that must export all
its published work and nothing else would justify medium, since it can
only page through the whole list.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, `publicknowledge`. Its published
  submissions are, on OJS, 1 "Signalling Theory Dividends" and 17
  "Antimicrobial, heavy metal resistance and plasmid profile of coliforms
  …"; on OMP, 5 "Bomb Canada and Other Unkind Remarks in the American
  Media" and 14 "From Bricks to Brains: The Embodied Cognitive Science of
  LEGO Robots"; on OPS, 2, 3 and 5 to 19.

Steps:

1. Sign in as `dbarnes`.
2. Open Tools › Import/Export › "Native XML Plugin"
   (`/index.php/publicknowledge/en/management/importexport/plugin/NativeImportExportPlugin`).
3. Press the "Export Articles" tab ("Export" on a press, "Export
   Preprints" on a preprint server). The list holds every submission:
   20 on OJS, 18 on OMP, 19 on OPS.
4. Press "Filters".
5. Under "Stages", press "Production".
6. Press each of the other stages under "Stages" as well: "Submission",
   "Review", "Copyediting" on OJS; "Submission", "Internal Review",
   "External Review", "Copyediting" on OMP. OPS offers no other stage.

**Expected**: the "Stages" group offers the stage the published
submissions are in, and pressing it lists them. With every stage
pressed, the list holds every submission again.

**Observed**: "Stages" offers only the editorial stages (OJS
"Submission", "Review", "Copyediting", "Production"; OMP adds "Internal
Review" and "External Review"; OPS "Production" alone). "Production"
lists only the submissions still in production: OJS 5, 6, 9 and 15; OMP
4; OPS 1 and 4. With every stage pressed the list holds 18 of OJS's 20
submissions, 16 of OMP's 18 and 2 of OPS's 19, and none of them is
published. No request fails and no message is shown.

## Cause

`pkp/pkp-lib#12799` gave published submissions a stage of their own,
`WORKFLOW_STAGE_ID_DONE` (6). The `ApplyDoneWorkflowStage` listener
moves a submission there when a Version of Record is published, and the
upgrade migration `I12799_MovePublishedSubmissionsToDone` moves every
already published submission there. Before that change a published
submission stayed in `WORKFLOW_STAGE_ID_PRODUCTION` (5). The same change
adds `ReturnToWorkflow` and `ReturnToDone`, so Done holds the published
submissions that have not been sent back to the workflow; one sent back
sits in an editorial stage and its filter finds it.

The export list is `APP\components\listPanels\SubmissionsListPanel`.
`PKPSubmissionsListPanel::getConfig()`
(`lib/pkp/classes/components/listPanels/PKPSubmissionsListPanel.php`,
line 122) builds the "Stages" group from `$this->getWorkflowStages()`
alone. Each app's `SubmissionsListPanel::getWorkflowStages()` lists only
the editorial stages, ending with Production. Each button sends
`stageIds=<n>` to `GET /api/v1/submissions`, which filters on
`submissions.stage_id`, so no button ever matches stage 6. The API
itself answers `stageIds=6` correctly; the dashboard's "Published" view
uses it.

The reach:

- The Native XML Plugin's export list on all three apps: walked.
- The PubMed export list on OJS and the ONIX 3.0 export list on OMP
  build the same panel with the same filters: checked in the code, not
  walked.
- No other screen builds this panel's stage filters, which come from
  the apps' hard-coded `getWorkflowStages()` arrays: checked in the code.
- Other screens list stages through `Application::getApplicationStages()`
  (editorial statistics' active submissions by stage, stage assignments,
  tasks). They leave Done out on purpose, since Done has no assignments:
  checked in the code.

## Proposed fix

Add the stages outside the editorial workflow to the "Stages" group in
`PKPSubmissionsListPanel::getConfig()`, after the app's own stages. The
labels come from `Application::getWorkflowStageName()`, so the new
button reads "Done", the name the app already gives stage 6
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/export-list-stages-skip-published/fix.diff)):

```diff
             [
                 'heading' => __('settings.roles.stages'),
-                'filters' => $this->getWorkflowStages(),
+                // The editorial stages, then the stages outside the workflow,
+                // such as Done, which holds the published submissions that
+                // have not been sent back to the workflow
+                'filters' => array_merge(
+                    $this->getWorkflowStages(),
+                    array_map(fn (int $stageId) => [
+                        'param' => 'stageIds',
+                        'value' => $stageId,
+                        'title' => __(Application::getWorkflowStageName($stageId)),
+                    ], Application::getNonWorkflowStages())
+                ),
             ],
```

It lives in the shared pkp-lib class, so all three apps and all three
export lists get the button with no change in the apps. It keeps what
`#12799` was for: published work leaves the editorial queues, so
"Production" still lists only the work in production.

Reading the stages from `Application::getNonWorkflowStages()`, as
`getValidStages()` does, is a choice. That method came with
`pkp/pkp-lib#13109` ("Use DONE stage only for auth checks"), and its
sibling's docblock speaks of authorization and workflow access, not of
filters. Today it returns Done alone, so the button is the same either
way. Reusing it means a non-workflow stage added later becomes a list
filter by itself; naming the stage (below) keeps that decision with the
list. The team may prefer either.

The fix was tried on `main` on all three apps. The walk then showed a
"Done" button under "Stages", and with every stage pressed the list held
every submission. "Production" alone still listed only the production
submissions, with the fix in and out.

**Alternatives**:

- Name the stage directly, one entry with `'value' => WORKFLOW_STAGE_ID_DONE`
  and `'title' => __(Application::getWorkflowStageName(WORKFLOW_STAGE_ID_DONE))`,
  as the dashboard's "Published" view names `WORKFLOW_STAGE_ID_DONE` in
  its collector: the same button today, without tying the filter to the
  authorization helper. Not tried as written; it differs from the tried
  diff only in where the stage id comes from.
- Add the Done entry to each app's `SubmissionsListPanel::getWorkflowStages()`:
  three repos for one shared rule.
- Make "Production" send `stageIds` 5 and 6: the panel's filters send
  one value each, and it would undo what `#12799` separated.
- Label the button "Published", the name of the dashboard view that
  lists these submissions (`submission.dashboard.view.published`): just
  as workable; "Done" is the stage's own name in the code. The team's
  call.

**What goes with it**:

- A guard: an e2e scenario that publishes a submission, finds it under
  the export list's Done filter, sends it back to the workflow and finds
  it under that stage instead.

Small: one array in one shared pkp-lib method, following an existing
pattern, plus a test.

## Evidence

- Kept walk: [shared/playwright/checks/issues/export-list-stages-skip-published/walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/export-list-stages-skip-published/walk.js)
  takes the Steps on PKP's default test dataset, loaded fresh, on all
  three apps, and the neighbour check ("Production" alone against the
  submissions in stage 5). Run:
  `npm run fleet-prep -- --feature issues-ir13 --dataset 1 --reset`, then
  `PROBE_FEATURE=issues-ir13 PROBE_AGENT=ir13 node bin/probe.js all shared/playwright/checks/issues/export-list-stages-skip-published/walk.js`;
  3.5 with `PKP_E2E_LINE=stable-3_5_0` in front of both (feature
  `issues-ir13-3_5`, `PROBE_RUN=r35`).
- The fix trial: `node bin/try-fix.js apply shared/playwright/checks/issues/export-list-stages-skip-published/fix.diff ojs omp ops`,
  the walk again, then `revert`.
- The walks ran on PostgreSQL; MySQL not checked.
- Tips: `main` OJS `bade233f73` (pkp-lib `2e377d27fc`), OMP `3b0ecf794`
  and OPS `c8af945bb7` (pkp-lib `3dc90c81a6`); `stable-3_5_0` OJS
  `92b9a16b48`, OMP `3081c9b00`, OPS `cf4fce69bd` (pkp-lib `a9c76aed62`);
  `stable-3_4_0` OJS `9571d8fde7`, OMP `0aec65441`, OPS `acd8ae704b`
  (pkp-lib `df13621c2d`); `stable-3_3_0` OJS `9fdb9bcf9a`, OMP
  `8e72fc883`, OPS `c5532e2161` (pkp-lib `d446601ebe`). The dataset is
  pkp/datasets `38ab955` (2026-09-30).
- 3.5, walked: published submissions are in stage 5 there (OJS 1, 17;
  OMP 5, 14; OPS 2, 3, 5 to 19), and "Production" lists them with the
  rest of production. The code agrees: `stable-3_5_0` pkp-lib defines no
  `WORKFLOW_STAGE_ID_DONE`, and the apps' `getWorkflowStages()` match
  `main`.
- 3.4 and 3.3, code: `classes/core/PKPApplication.php` (3.3:
  `PKPApplication.inc.php`) on pkp-lib `stable-3_4_0` and `stable-3_3_0`
  defines no Done stage, so published submissions stay in Production,
  which the apps' `getWorkflowStages()` offer.
- Introduced: `WORKFLOW_STAGE_ID_DONE` and the listener and migration
  that use it come from `d52aa4c84b` (pkp-lib, 2026-06-09), merged as
  `pkp/pkp-lib#12881` on 2026-06-29. The apps' `SubmissionsListPanel`
  was last changed in 2024 (OJS, OPS) and 2023 (OMP), so `#12799` did
  not touch it in any app. `PKPSubmissionsListPanel` line 122 and the
  apps' `getWorkflowStages()` are unchanged by it; they became wrong when
  the stage was added. `getNonWorkflowStages()` came later
  (`65901c4f7a`, `pkp/pkp-lib#13109`, 2026-09-10).
- Upstream search (2026-10-01): pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library, by the symptom's words (export, filter, stage,
  published, done) and by `getWorkflowStages`, `SubmissionsListPanel` and
  `#12799`.
