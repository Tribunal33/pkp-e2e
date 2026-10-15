# Catalog "Add Entry" refuses "Save" with no book chosen, showing only "Please correct these errors" and never saying why

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/omp#812` for `pkp/pkp-lib#5865` · [6a4168a7b](https://github.com/pkp/omp/commit/6a4168a7b46230ff556f495553e9d127d8473b39) · 2020-05-13 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-15)
- **Tracked in** spec U70 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U70-catalog-management.md#a5)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

Update 2026-10-15: `pkp/pkp-lib#13493` (merged 2026-10-13 as
[36271ccef3](https://github.com/pkp/pkp-lib/commit/36271ccef351f48f6b584e50f1bb51d86937c6aa))
made an unauthenticated ORCID iD on `main` a warning instead of a
publishing requirement; 3.5 already treated it as a warning. "Add
Entry" now adds a book whose contributor has such an iD, so this report
now covers only the refusal with no book chosen.

## Summary

An editor opens the Catalog page's "Add Entry" and presses "Save" with
nothing typed and no book chosen. The page shows only "The form was not
saved because 1 error(s) were encountered. Please correct these errors
and try again." for about five seconds, and nothing in the panel is
marked. The editor expected the "Find monographs to add to the
catalog" field to be marked with the reason.

No data is lost, and the editor can guess the reason. The fix is
medium because it spans the OMP endpoint and the ui-library panel.

## Impact

- **Lost**: the reason for the refusal, and the moment spent looking
  for it.
- **Who**: press managers and Press editors on Content › "Catalog" ›
  "Add Entry", whenever "Save" is pressed before a book is chosen.
- **Way round**: choose a book, then press "Save".

Low: the refusal is correct and its reason is easy to guess; it would be
medium if a plugin that adds a publishing requirement were in use, since
the same blank notice would then refuse a chosen book with no way to
tell why (read in the code; no such plugin was walked).

## Steps to reproduce

Preconditions:

- The default dataset, OMP `main`. Nothing beyond it.

1. Sign in as `dbarnes`.
2. Open Content › "Catalog" (`/index.php/publicknowledge/en/manageCatalog`).
3. Press "Add Entry".
4. Type nothing in "Find monographs to add to the catalog" and press
   "Save".

**Expected:** the panel marks the box with the server's reason, "You
must provide one or more submission ids to be added to the catalog.".

**Observed:** the top-right notice reads "The form was not saved because
1 error(s) were encountered. Please correct these errors and try
again." and disappears after about five seconds. The panel stays open
with nothing marked and "Save" still enabled. The server's answer holds
the reason:

```
PUT /index.php/publicknowledge/api/v1/_submissions/addToCatalog   (submissionIds=)
400 {"error":"You must provide one or more submission ids to be added to the catalog."}
```

Control: in a newly opened panel, choosing "Mobile Learning:
Transforming the Delivery of Education and Training" and pressing "Save"
adds the book and closes the panel.

## Cause

OMP's `BackendSubmissionsController::addToCatalog()`
(`api/v1/_submissions/BackendSubmissionsController.php`, lines 161–210)
is the endpoint of the "Add Entry" form, whose only field is
`submissionIds`. Its refusals are keyed by names that are not that
field. With no IDs it answers `{"error": …}` (lines 165–168 and
173–176). Its 404 for an unknown ID (`submissionsNotFound`) uses
`error` too, but `Form.vue` shows a 403 or 404 `error` as a notice,
which is right for it, and the fix leaves it alone. When `Repo::publication()->validatePublish()` lists unmet
requirements for a chosen book, it returns that list as it is
(lines 197–199), keyed by requirement.

ui-library's `Form.vue` `error()` treats a 400 as field errors. It
shows the `form.errors` notice with the number of keys and stores the
keys as the form's `errors`. A form draws an error only under the field
of the same name, so these keys mark nothing. `removeError()` runs only
for a field that changes, so they would never clear either.

On 3.4 and 3.3 (code) the panel binds its form inside its own
`<modal>`, so the errors reach the form. Its footer then says "Please correct 2 errors." (the keys `error` and `errorMessage`)
with no reason on screen; the reason is only in the footer's hidden
list for screen readers. "Save" stays disabled until the page is
reloaded. No version showed the reason on screen.

On `main` and 3.5 the panel's form receives no errors at all, so even
the footer is gone. Since the side modal migration (`pkp/ui-library#366`,
[76ca2af2](https://github.com/pkp/ui-library/commit/76ca2af23931b0072c2bb3884951059056e6bbd4),
2024-07-02, Jarda Kotěšovec (jardakotesovec)), `CatalogListPanel.vue`
`openAddEntryForm()` hands the side modal `this.addEntryForm`, the
object as it is at that moment. `setAddEntryForm()` builds a new object
and emits it to the page container, so the modal keeps the old one and
never sees `errors`. Field values still reach it because `Form.vue`
`fieldChanged()` edits the field objects that both copies share. The
same migration changed `InstitutionsListPanel` `updateForm()` from
copy-and-emit to editing its `activeForm` in place, for this reason;
`CatalogListPanel` was not changed the same way.

Reach:

- The refusals the panel can meet on `main`: no book chosen (walked),
  and any requirement a plugin adds through the
  `Publication::validatePublish` hook (none in OMP's own plugins; code).
  `validatePublish()` itself checks only for a declined book, and on
  3.5 also for a book before the review stage. The field's search never
  offers such a book, since `AddEntryForm` asks only for Copyediting
  and Production books that are queued or scheduled.
- Two other side modals receive a container's form the same way and
  would not show a server's field errors either: the user report
  export (`StatsUsersPage.vue`, `UserExportModal`) and the submission
  wizard's reconfigure window (`SubmissionWizardPage.vue`,
  `ReconfigureSubmissionModal`). Read in the code only.

## Proposed fix

Answer the refusal under the form's field, and let the panel's form
receive it
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/add-entry-refusal-no-reason/fix.diff)):

```diff
--- a/api/v1/_submissions/BackendSubmissionsController.php
+++ b/api/v1/_submissions/BackendSubmissionsController.php
             return response()->json([
-                'error' => __('api.submissions.400.submissionIdsRequired'),
+                'submissionIds' => [__('api.submissions.400.submissionIdsRequired')],
             ], Response::HTTP_BAD_REQUEST);
 ...
             if (!empty($errors)) {
-                return response()->json($errors, Response::HTTP_BAD_REQUEST);
+                return response()->json([
+                    'submissionIds' => array_values($errors),
+                ], Response::HTTP_BAD_REQUEST);
             }
--- a/lib/ui-library/src/components/ListPanel/submissions/CatalogListPanel.vue
+++ b/lib/ui-library/src/components/ListPanel/submissions/CatalogListPanel.vue
 		openAddEntryForm() {
 			const {openSideModal} = useModal();
 
+			// The side modal keeps this object, so setAddEntryForm() updates it in place
+			this.activeAddEntryForm = {...this.addEntryForm, errors: {}};
 			openSideModal(CatalogEditModal, {
-				activeForm: this.addEntryForm,
+				activeForm: this.activeAddEntryForm,
 ...
 		setAddEntryForm(formId, data) {
-			let addEntryForm = {...this.addEntryForm};
-			Object.keys(data).forEach(function (key) {
-				addEntryForm[key] = data[key];
+			if (!this.activeAddEntryForm) {
+				return;
+			}
+			Object.keys(data).forEach((key) => {
+				this.activeAddEntryForm[key] = data[key];
 			});
-			this.$emit('set', this.id, {addEntryForm});
 		},
```

The diff also changes the second, identical `submissionIdsRequired`
answer and adds `activeAddEntryForm: null` to `data()`.

- The server half follows `PKPEmailController`, which refuses its form
  under the form's field (`'userGroupIds' => [...]`). Its second change
  covers a requirement a plugin adds, the one refusal of a chosen book
  left on `main`, so that it too reaches the box.
- The panel half follows `InstitutionsListPanel` and
  `HighlightsListPanel`, which keep the side modal's form in local data
  and update it in place. Unlike them, the copy here is shallow on
  purpose. `closeAddEntryForm()` clears the chosen books on the
  container's field objects, and chosen books come back on reopening
  because those objects are shared; a `cloneDeep` would break both.
- Dropping the `$emit('set', …)` loses nothing, although ui-library
  [c6bf04ac](https://github.com/pkp/ui-library/commit/c6bf04ac01ba71fff940e78637d09b25636a4053)
  (`pkp/pkp-lib#9313`) last fixed that line. The container's
  `addEntryForm` is read only by `openAddEntryForm()` and
  `closeAddEntryForm()`, and its fields stay shared.

With both halves the box shows the reason. "Save" stays disabled until
the choice changes, and choosing or removing a book clears the message.
Each opening of the panel starts with no message.

Tried on OMP `main`. Step 4 marked the box with "You must provide one
or more submission ids to be added to the catalog.", the footer read
"Please correct one error." and "Save" was disabled. Choosing book 13
after the refusal cleared the message, and "Save" published it and
closed the panel. Two checks came out the same with and without the
fix: the workflow's "Catalog Entry" form still marked a "URL Path" of
"my book" at its box, and "Add Entry" with book 13 chosen published it.

**Alternatives:**

- Only the server half: on `main` and 3.5 nothing changes on screen,
  because the panel never receives the errors. On 3.4 and 3.3 it would
  be enough.
- Only the panel half: the footer would say "Please correct one
  error." with no field marked, and "Save" would stay disabled for the
  rest of the visit, as on 3.4.
- Let `Form.vue` `error()` show, in the notice, the messages of keys
  that match no field, and keep them out of `errors`. This covers every
  form whose endpoint answers this way, but the message would pass in
  five seconds instead of staying at the box, and it changes every
  form. Worth doing on its own.

**What goes with it:**

- The answer of `_submissions/addToCatalog` changes shape. It is a
  private backend endpoint whose only caller is this panel.
- Requirement messages do not name the book. Naming it for several
  chosen books needs a new locale string; not part of this fix.
- No stored data to repair.
- Backport: 3.5 has the same code, and both halves apply. 3.4 and 3.3
  need only the server half, written with `withJson()` in their Slim
  handler (`BackendSubmissionsHandler`).
- The user export and the reconfigure window above would need the
  same in-place update. They are left out, since no refusal of theirs
  was walked.
- Guard: an e2e check that "Add Entry" › "Save" with nothing chosen
  marks the box.

Medium: two repos, the OMP controller and the ui-library panel, a few
lines each, with a test.

## Evidence

- Kept script:
  [shared/playwright/checks/issues/add-entry-refusal-no-reason/walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/add-entry-refusal-no-reason/walk.js)
  with
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/add-entry-refusal-no-reason/lib.js).
  It takes Steps 1–4 as `dbarnes` on an install freshly loaded from the
  default dataset. `MODE=neighbour` runs the two checks of the fix's
  trial, `MODE=recover` the choose-after-refusal check. Run:
  `PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/add-entry-refusal-no-reason/walk.js`.
  The fix is tried with `node bin/try-fix.js apply shared/playwright/checks/issues/add-entry-refusal-no-reason/fix.diff omp`
  (and `revert`).
- ORCID control (the case that left): the same script then turns ORCID
  on, gives book 7's first contributor an unauthenticated iD, and "Add
  Entry" publishes book 7 with no notice, on `main` and 3.5.
- Branch tips: OMP `main` f4836d4fba (lib/pkp b17fadae59, which
  carries 36271ccef3; lib/ui-library 47b565cb); OMP `stable-3_5_0`
  a70bbb9c4d (lib/pkp 4045d9241e, lib/ui-library 2576e00a); OMP
  `stable-3_4_0` 0aec65441f (lib/pkp 55c8e406b3, lib/ui-library
  ee684b34); OMP `stable-3_3_0` 8e72fc8836 (lib/pkp 5e84acd11b,
  lib/ui-library 96959f9e). Default dataset from pkp/datasets 7912e09
  (2026-10-14), PostgreSQL. No server error or script error was
  recorded on any walk; the browser logged only the refusal's 400.
- `main`, code read: pkp-lib `Repository::validatePublish()` checks only
  a declined book and calls the hook; the ORCID checks are in
  `validatePublishWarnings()`.
- 3.5, walked; code read: `validatePublish()` checks a declined book
  and the review stage, and ORCID problems are warnings there too
  (`pkp/pkp-lib#13283`, 29b76297a3); `addToCatalog()` and
  `setAddEntryForm()` are as on `main`.
- 3.4 and 3.3, code only: OMP `BackendSubmissionsHandler::addToCatalog()`
  answers `withJsonError('api.submissions.400.submissionIdsRequired')`,
  that is `{"error": key, "errorMessage": text}`, and returns
  `validatePublish()`'s list as it is. `CatalogListPanel.vue` binds the
  form inside its own `<modal>`, `Form.vue` `error()` stores the
  errors, and `FormPage.vue` shows `FormErrors` (the reasons only in its
  `-screenReader` list) and disables "Save" while any error is held.
- Introduced: `git log -S submissionIdsRequired` on OMP finds the
  endpoint's first version in 6a4168a7b (`pkp/omp#812`), which already
  answered `withJsonError()` and the raw requirement list; the keys are
  unchanged on `main`. `pkp/pkp-lib#9313` (script errors in the same
  panel) is a different fault.
- Upstream: pkp/pkp-lib, pkp/omp and pkp/ui-library searched on
  2026-10-15 for `addToCatalog`, `submissionIdsRequired`,
  `CatalogListPanel`, "Add Entry" with catalog and error, and side modal
  form errors; nothing matched the fault.
- Unverified: a requirement added through the `Publication::validatePublish`
  hook, and the fix's server half for it, were not walked or tried.
