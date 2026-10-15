# Editor's refused "Confirm" in "Review Publishing Details" opens a blank copy of the panel that keeps coming back

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: none (no "Review Publishing Details" panel)
  - 3.4: none (code; no "Review Publishing Details" panel)
  - 3.3: none (code; no "Review Publishing Details" panel)
- **Introduced** `pkp/ui-library#621` for `pkp/pkp-lib#11296`, `pkp/pkp-lib#11366`, `pkp/pkp-lib#11387` · [68972cca81](https://github.com/pkp/ui-library/commit/68972cca811525acfde402dfb675ed2053fd0a9c) · 2025-06-10 · Blesilda Ramirez (blesildaramirez)
- **Upstream** none found (2026-10-15)
- **Tracked in** spec U49 [OJS5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U49-publish-schedule-and-versions.md#ojs5)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

When an editor presses "Confirm" in a journal's "Review Publishing
Details" panel and the server refuses the save, a second, blank copy
of the panel opens over the one they filled in. "Cancel" seems to close
both, but the next "Schedule For Publication" on the same page opens
two blank panels, the copy on top.

The editor expected to stay in the panel they filled in, with the
reason for the refusal shown. A passing notice counts "1 error(s)" and
names nothing, and a "Confirm" in the copy is refused again and adds a
third panel.

Today a journal meets it when it requires a plain language summary:
that requirement refuses every save from this panel, a separate fault
([pkp-e2e#323](https://github.com/jardakotesovec/pkp-e2e/issues/323)).

## Impact

- **Lost:** no data. The editor's choices are hidden under the copy,
  and the copies stay until the page is reloaded.
- **Who:** an editor publishing or scheduling an article from "Review
  Publishing Details" when the server refuses that save.
- **Way round:** reloading the workflow page clears the copies. To
  publish while the summary is required, someone who manages the
  journal's settings (`dbarnes` in the dataset) first sets the plain
  language summary back to not required; a summary saved on "Title &
  Abstract" does not help (pkp-e2e#323).

Low: the copies mislead and pile up, but the publish was refused anyway
and nothing is lost. A refusal the editor could correct inside the
panel, such as a field error, would make it medium, since the copy
hides the field's error and the choices.

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main`. Its publication 6 (submission 5)
  has no Publication Stage, which is why step 5 opens the panel.
- The journal requires a plain language summary (the dataset leaves it
  off).

Steps:

1. Sign in as `dbarnes`.
2. Settings › Workflow › "Submission" › "Metadata": tick "Enable plain
   language summary metadata", choose "Require the author to provide a
   plain language summary before accepting their submission.", "Save".
3. Open "Genetic transformation of forest trees" (ID 5, Production)
   from the dashboard.
4. "Publication" › "Title & Abstract".
5. Press "Schedule For Publication". The "Review Publishing Details"
   panel opens.
6. "Publication Stage": "Version of Record (VoR)"; "Revision
   Significance": "Major Revision"; "Assign To Current/Back Issue";
   "Issue": "Vol. 1 No. 2 (2014)".
7. Press "Confirm".
8. Press "Cancel" once.
9. Press "Schedule For Publication" again.

**Expected:** after step 7 the editor stays in the one panel, with the
choices of step 6 and the refusal's reason shown. Step 8 closes it, and
step 9 opens one panel.

**Observed:** after step 7 the notice

```
The form was not saved because 1 error(s) were encountered. Please correct these errors and try again.
```

shows for a moment, and a second "Review Publishing Details" panel
opens over the first: "Publication Stage", "Revision Significance" and
"Issue" empty, "Assign To Current/Back Issue" checked, "Update Type"
"New Version". The first panel underneath still holds the choices of
step 6. Neither panel marks a field. The panel's save answered:

```
PUT /index.php/publicknowledge/api/v1/submissions/5/publications/6 → 400
{"plainLanguageSummary":{"en":["This field is required."]}}
```

After step 8 no panel shows. Step 9 opens two "Review Publishing
Details" panels, one over the other, both blank.

Filling the copy after step 7 with the choices of step 6 and pressing
its "Confirm" is refused the same way and opens a third panel, blank,
over the two filled ones.

A "Confirm" with an empty "Publication Stage", "Revision Significance"
or "Issue" is refused in the browser, sends nothing, and stays in the
one panel with "This field is required." under the field.

## Cause

ui-library `useWorkflowVersionForm()`
(`src/pages/workflow/composables/useWorkflowVersionForm.js`),
`handleVersionSubmission()`, calls the caller's `onSubmitFn` after the
save whether or not it succeeded. The `if (isSuccess.value)` block
holds `closeDialog(false)` and, outside publish mode, the navigation to
the saved version; the `onSubmitFn` call comes after the block:

```js
await fetch();
await store.triggerDataChange();

if (isSuccess.value) {
	closeDialog(false);
	if (!modeState.isPublishMode) {
		// go to the new or updated version's page
	}
}

if (typeof onSubmitFn === 'function') {
	onSubmitFn(store.selectedPublication);
}
```

The one caller that passes `onSubmitFn` is
`WorkflowVersionSideModal.vue`, the "Review Publishing Details" panel.
`useWorkflowActions.js` `workflowAssignPublicationStage()` opens it
with `onSubmitFn` set to a callback that re-enters
`workflowAssignToIssueAndScheduleForPublication()`. That function opens
the panel when the version has no `versionStage`, or its status is
neither ready-to-publish nor ready-to-schedule. A refused save leaves
the stored version as it was, so the condition still holds and a new
panel opens in the next side panel level, its fields read from the
stored version.

"Cancel" calls `closeSideModal(WorkflowVersionSideModal)`
(`stores/modalStore.js`), which closes the first open level holding
that component: the first panel. The copy, one level up, disappears
only because `ModalManager.vue` draws each level inside the one below.
`closeSideModalById()` does not close the levels above, so the copy
stays marked open. The next "Schedule For Publication" fills the freed
level with a new panel, and the copy shows again inside it.

The refusal's reason shows nowhere: the panel is built with
`showErrorFooter: false`, and the summary field the server names is not
in the panel. That part belongs to
[pkp-e2e#323](https://github.com/jardakotesovec/pkp-e2e/issues/323).

Reach:

- A 400 from `Repo::publication()->validate()` opens the copy (on
  screen: the plain language summary requirement; code: any rule a
  plugin adds through the `Publication::validate` hook).
  `PKPSubmissionController::editPublication()`'s other 400, for a
  property the API may not write (`getWriteDisabledErrors()`), is not
  reached: the panel sends none (code).
- A 403 from `editPublication()` or a server error: `useFetch` hands
  only 400 and 422 back to the form, so an "Error" dialog opens and the
  copy opens beside it (code).
- A version that was published and then unpublished keeps its stage
  but loses the ready status, so the panel opens for it too; a refused
  save there opens a copy with the stored stage and significance filled
  in (code).
- Each refused "Confirm" adds a panel (on screen, the third); the side
  panel store has five levels, and a sixth open does nothing (code).
- "Create New Version" and "Send to Text Editor" use the same composable
  without `onSubmitFn` and are not touched (code).
- OMP and OPS: their "Schedule For Publication" and "Post" open the
  confirmation window directly; the action that opens this panel is in
  `workflowConfigEditorialOJS.js` only (code).

## Proposed fix

Call `onSubmitFn` only after a successful save, beside `closeDialog`,
in `useWorkflowVersionForm()`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/refused-publish-confirm-opens-blank-panel/fix.diff)):

```diff
 					goToPublicationPage(store, {publicationId: targetPublicationId});
 				}
 			}
-		}
 
-		if (typeof onSubmitFn === 'function') {
-			onSubmitFn(store.selectedPublication);
+			// Only a saved version moves the flow on; a refused save keeps
+			// this form open with its values and the server's errors.
+			if (typeof onSubmitFn === 'function') {
+				onSubmitFn(store.selectedPublication);
+			}
 		}
```

A refused save then returns its errors to the form, which marks the
fields it holds and keeps the editor's choices, as the panel already
does for a field left empty. No copy opens, so none is left behind. The
success path is unchanged: `closeDialog` closes the panel and the
callback opens the confirmation window. The composable is the layer
that knows whether the save succeeded, so every caller is covered, as
`closeDialog` already is.

Tried on `main` for steps 1 to 8: with the fix, step 7 leaves one panel
open with "Version of Record (VoR)", "Major Revision" and "Vol. 1 No. 2
(2014)" kept and the same notice, and step 8 closes it. Without the
summary requirement, the same "Confirm" still saves and opens the
"Schedule For Publication" window ("…Are you sure you want to publish
this?"), with the fix in and out.

**Alternatives:**

- Have the callback in `workflowAssignPublicationStage()` check that
  the publication now has a stage: a refused save of a version that
  already had a stage would pass that check, and the composable would
  still call back on a refusal for the next caller.
- Close the first panel before the callback reopens it: the editor
  would still lose their choices.
- Make `closeSideModalById()` close the levels above the one it closes:
  worth doing for the stale copy, but the copy should not open at all.

**What goes with it:**

- With the fix, a refusal of a field the panel does not hold still
  shows only the passing notice. Telling the editor which field caused
  it is pkp-e2e#323's fix, or `showErrorFooter: true`, which lists the
  error in the panel's footer.
- No data repair (a refused save stores nothing) and no backport.
- Guard: a unit test of `useWorkflowVersionForm` in ui-library whose
  save answers 400 and whose `onSubmitFn` must not be called.

Small: one call moved inside an existing block in one composable, and a
unit test.

## Evidence

- Kept script that takes the Steps through the screens on an install
  loaded from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/refused-publish-confirm-opens-blank-panel/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/refused-publish-confirm-opens-blank-panel/lib.js)),
  run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/refused-publish-confirm-opens-blank-panel/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). `WALK_MODE=copy`
  fills the copy and confirms it (Observed's third panel);
  `WALK_MODE=control` is the same panel and choices without the
  requirement, the check that the fix keeps the success path. The
  script reads every panel's selects and the panel's save request. No
  page script error and no server error in any run.
- The fix was tried with `node bin/try-fix.js apply <fix.diff> ojs`
  (which rebuilds the JavaScript) on steps 1 to 8 and the control, and
  the control again after the revert. Step 9 was added to the script
  after the trial: with the fix no copy opens at step 7, so none is
  left for step 9 (code, not walked with the fix).
- Walked 2026-10-15 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [7912e09](https://github.com/pkp/datasets/commit/7912e09c2191e44b25b6926d1755bc5f2aa00f09)
  (2026-10-14), `ojs/main/pgsql` and `ojs/stable-3_5_0/pgsql`, no
  upgrade needed:
  - main: OJS [378eced941](https://github.com/pkp/ojs/commit/378eced94154d9367f9a6fd02a7fc363400f7f6b)
    (lib/pkp [b17fadae59](https://github.com/pkp/pkp-lib/commit/b17fadae59156c99746754a740caf75b753e0aa1),
    lib/ui-library [47b565cb42](https://github.com/pkp/ui-library/commit/47b565cb4212db54af45b9ea3bf9097a70ea843d)).
  - 3.5: OJS [ca763c91cd](https://github.com/pkp/ojs/commit/ca763c91cda7ac28d679bce0f6c1e25de9eb7c78)
    (lib/pkp [4045d9241e](https://github.com/pkp/pkp-lib/commit/4045d9241ea25d818136a12aaf824bd24f5df1d7),
    lib/ui-library [2576e00afd](https://github.com/pkp/ui-library/commit/2576e00afdefd62878bf50a971831309fd523228)).
    Step 2 cannot be taken: the Metadata settings offer no plain
    language summary. In the code, `workflowAssignToIssueAndScheduleForPublication()`
    opens the "Select an issue" legacy form or the confirmation window;
    there is no `useWorkflowVersionForm.js` and no
    `WorkflowVersionSideModal.vue`.
- Code reads:
  - `main`: ui-library `useWorkflowVersionForm.js`,
    `WorkflowVersionSideModal.vue`, `WorkflowVersionDialogBody.vue`,
    `useWorkflowActions.js` (`workflowAssignPublicationStage`,
    `workflowAssignToIssueAndScheduleForPublication`), `Form.vue`
    (`error`), `FormPage.vue`, `useFetch.js`, `modalStore.js`
    (`openSideModal`, `closeSideModal`, `closeSideModalById`,
    `openDialogNetworkError`), `ModalManager.vue`, the three `workflowConfigEditorial*.js`; pkp-lib
    `PKPSubmissionController::editPublication()`,
    `publication/Repository::validate()` and the publication schema's
    `writeDisabledInApi` properties.
  - 3.4 (code): OJS `upstream/stable-3_4_0`
    [daf0ca971d](https://github.com/pkp/ojs/commit/daf0ca971d7ac1985c2941240a444629adc2dfa4),
    ui-library `origin/stable-3_4_0`
    [ee684b341b](https://github.com/pkp/ui-library/commit/ee684b341bacfcdd330b95073394a1fbf34a1f4f):
    no `src/pages/workflow/`; publishing runs through the
    `templates/workflow/workflow.tpl` page and the legacy assign-to-issue
    and publish forms, with no version panel.
  - 3.3 (code): OJS `upstream/stable-3_3_0`
    [d7d9dd14ec](https://github.com/pkp/ojs/commit/d7d9dd14ec9d08d48b30d55c49cc97d714866b61),
    ui-library `origin/stable-3_3_0`
    [96959f9ed4](https://github.com/pkp/ui-library/commit/96959f9ed4e7357c0eede0179add0e9728e1f708):
    the same as 3.4.
- Introduced: `git blame` on the `onSubmitFn` call names
  [68972cca81](https://github.com/pkp/ui-library/commit/68972cca811525acfde402dfb675ed2053fd0a9c)
  (`pkp/ui-library#621`, "[Versioning]"), which added the composable,
  the panel and the re-entering callback; the save then went to
  `…/version`. [be23860556](https://github.com/pkp/ui-library/commit/be23860556943edc3bc9180282e3377e784fded9)
  (`pkp/ui-library#683`, `pkp/pkp-lib#9295`, continuous publication)
  moved the publish-mode save to `PUT …/publications/{id}` with the
  issue and status, and added the status condition to the reopening.
- Upstream search, 2026-10-15: pkp/pkp-lib, pkp/ojs and pkp/ui-library
  for "Review Publishing Details", the panel opening twice or again,
  "Revision Significance", "Publication Stage" with modal,
  "plain language summary" with publish, `onSubmitFn`,
  `useWorkflowVersionForm` and `WorkflowVersionSideModal`. Only
  `pkp/pkp-lib#12409` (the panel shown for an already established
  version) came up near it, a different fault.
- MySQL not checked; the fault is in the browser code.
- Unverified: the reach's other refusals (a plugin's validation rule,
  a 403, a server error) and the copy for a version that already has a
  stage are read in the code, not walked; so is the page reload that
  clears the copies (the panels are kept in the page's script state).
