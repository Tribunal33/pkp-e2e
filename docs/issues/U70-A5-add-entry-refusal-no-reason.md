# Catalog "Add Entry" refuses a book with only "Please correct these errors" and never says why

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP (nothing chosen only; there an unauthenticated ORCID iD does not stop publishing)
  - 3.4: OMP (code; nothing chosen only)
  - 3.3: OMP (code; nothing chosen only)
- **Introduced** `pkp/omp#812` for `pkp/pkp-lib#5865` · [6a4168a7b](https://github.com/pkp/omp/commit/6a4168a7b46230ff556f495553e9d127d8473b39) · 2020-05-13 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U70 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U70-catalog-management.md#a5)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

On a press with ORCID turned on, an editor chooses a book in the Catalog
page's "Add Entry" and presses "Save". When one of the book's
contributors has an unauthenticated ORCID iD, the book is not added, and
the page shows only "The form was not saved because 1 error(s) were
encountered. Please correct these errors and try again." for about five
seconds. Nothing in the panel is marked, so the editor cannot tell why
the book was refused, or which book when several were chosen.

The same blank refusal answers "Save" with no book chosen, on every
press and version; there the editor can guess the reason. The book's own
workflow names the ORCID reason in its "Publish" window.

## Impact

- **Lost**: the reason for the refusal, and the time spent looking for
  it. With several books chosen, none is added.
- **Who**: press managers and Press editors on Content › "Catalog" ›
  "Add Entry". The ORCID refusal needs ORCID turned on (off by default)
  and a contributor whose iD is unauthenticated or entered twice.
- **Way round**: open the book's workflow and press "Publish". Its
  "Schedule For Publication" window lists the unmet requirement.

Low: the refusal is correct and the workflow gives its reason; it would
be medium if unauthenticated iDs were common on presses with ORCID on,
which this report did not measure.

## Steps to reproduce

Preconditions:

- The default dataset, OMP `main`. Book 7, "Accessible Elements:
  Teaching Science Online and at a Distance", is in Copyediting and
  unpublished. Its first contributor is Dietmar Kennepohl
  (dkennepohl@mailinator.com).
- For steps 5–8 only:
  - ORCID turned on, as `dbarnes`: Settings › Users & Roles › "ORCID",
    tick "Enable ORCID functionality", "ORCID API" "Member Sandbox",
    any "Client ID" and "Client Secret", "Save".
  - Dietmar Kennepohl's ORCID iD on book 7 is unauthenticated: the
    state ORCID leaves when an author authenticated the iD and the
    access token later expired or was revoked. Only ORCID creates it,
    so it is set with SQL:

    ```sql
    INSERT INTO author_settings (author_id, locale, setting_name, setting_value)
    SELECT a.author_id, '', v.setting_name, v.setting_value
    FROM authors a
    JOIN submissions s ON s.current_publication_id = a.publication_id
    CROSS JOIN (
      SELECT 'orcid' AS setting_name, 'https://sandbox.orcid.org/0000-0002-1825-0097' AS setting_value
      UNION ALL SELECT 'orcidIsVerified', '1'
    ) v
    WHERE s.submission_id = 7
      AND a.email = 'dkennepohl@mailinator.com';
    ```

Nothing chosen:

1. Sign in as `dbarnes`.
2. Open Content › "Catalog" (`/index.php/publicknowledge/en/manageCatalog`).
3. Press "Add Entry".
4. Type nothing in "Find monographs to add to the catalog" and press
   "Save".

A book with an unauthenticated ORCID iD:

5. Reload the Catalog page and press "Add Entry".
6. Type `Accessible` and click "Accessible Elements: Teaching Science
   Online and at a Distance".
7. Press "Save". [On 3.5 an unauthenticated iD is only a warning, so
   this step publishes the book.]
8. Open submission 7, choose "Title & Abstract" under "Publication",
   and press "Publish".

**Expected:** at step 4 the panel marks the box with the server's
reason, "You must provide one or more submission ids to be added to the
catalog.". At step 7 it marks the box with "Unauthenticated ORCiDs for
contributors detected.".

**Observed:** at steps 4 and 7 the top-right notice reads "The form was
not saved because 1 error(s) were encountered. Please correct these
errors and try again." and disappears after about five seconds. The
panel stays open with nothing marked and "Save" still enabled. Book 7
stays unpublished. The server's answers hold the reasons:

```
PUT /index.php/publicknowledge/api/v1/_submissions/addToCatalog   (step 4: submissionIds=)
400 {"error":"You must provide one or more submission ids to be added to the catalog."}

PUT /index.php/publicknowledge/api/v1/_submissions/addToCatalog   (step 7: submissionIds[]=7)
400 {"hasUnauthenticatedOrcid":"Unauthenticated ORCiDs for contributors detected."}
```

At step 8 the "Schedule For Publication" window reads "The following
requirements must be met before this can be published. Unauthenticated
ORCiDs for contributors detected." and offers no "Publish" button.

## Cause

OMP's `BackendSubmissionsController::addToCatalog()`
(`api/v1/_submissions/BackendSubmissionsController.php`, lines 161–210)
is the endpoint of the "Add Entry" form, whose only field is
`submissionIds`. Its refusals are keyed by names that are not that
field. With no IDs it answers `{"error": …}` (lines 165–168 and
173–176). When `Repo::publication()->validatePublish()` lists unmet
requirements, it returns that list as it is (lines 197–199), keyed by
requirement.

ui-library's `Form.vue` `error()` treats a 400 as field errors. It
shows the `form.errors` notice with the number of keys and stores the
keys as the form's `errors`. A form draws an error only under the field
of the same name, so these keys mark nothing. `removeError()` runs only
for a field that changes, so they would never clear either.

That is what 3.4 and 3.3 show (code): the errors reach the panel's
form, which keeps the panel inside its own `<modal>`. Its footer then
says "Please correct 2 errors." (the keys `error` and `errorMessage`)
with no reason on screen; the reason is only in the footer's hidden
list for screen readers. "Save" stays disabled until the page is
reloaded. No version showed the reason on screen, so this is a defect,
not a regression.

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
  an unauthenticated ORCID iD (walked), the same iD on two contributors
  (`hasDuplicateOrcids`, code), and any requirement a plugin adds
  through the `Publication::validatePublish` hook (none in OMP's own
  plugins). A declined book, and on 3.5 a book before the review stage,
  are never suggested: `AddEntryForm` asks only for Copyediting and
  Production books that are queued or scheduled.
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
  under the form's field (`'userGroupIds' => [...]`).
- The panel half follows `InstitutionsListPanel` and
  `HighlightsListPanel`, which keep the side modal's form in local data
  and update it in place. Unlike them, the copy here is shallow on
  purpose. `closeAddEntryForm()` clears the chosen books on the
  container's field objects, and chosen books come back on reopening
  because those objects are shared; a `cloneDeep` would break both.
- Dropping the `$emit('set', …)` loses nothing, although it is the line
  c6bf04ac (`pkp/pkp-lib#9313`) last fixed. The container's
  `addEntryForm` is read only by `openAddEntryForm()` and
  `closeAddEntryForm()`, and its fields stay shared.

With both halves the box shows the reason. "Save" stays disabled until
the choice changes, and choosing or removing a book clears the message.
Each opening of the panel starts with no message.

Tried on OMP `main`. Steps 4 and 7 marked the box with "You must
provide one or more submission ids to be added to the catalog." and
"Unauthenticated ORCiDs for contributors detected.", the footer read
"Please correct one error." and "Save" was disabled. Choosing book 13
after the empty refusal cleared the message, and "Save" published it
and closed the panel. Two checks came out the same with and without the
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
  It takes Steps 1–8 as `dbarnes` on an install freshly loaded from the
  default dataset, turning ORCID on through the "ORCID" tab before
  step 5. `MODE=neighbour` runs the two checks, `MODE=recover` the
  choose-after-refusal check. Run:
  `PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/add-entry-refusal-no-reason/walk.js`.
- The SQL precondition copies what
  `PKP\orcid\actions\VerifyIdentityWithOrcid::setIdentityData()` stores
  for a contributor (`orcid`, `orcidIsVerified`, locale `''`), without
  the four token fields that `PKP\orcid\OrcidManager::removeOrcidAccessToken()`
  clears and keeping `orcidIsVerified`, which it does not clear.
  `validatePublish()` reads only `orcid` and `orcidAccessToken`; the
  `orcidIsVerified` row is there because the integration leaves it.
- Branch tips: OMP `main` 3b0ecf794c (lib/pkp 3dc90c81a6,
  lib/ui-library 280f98c5); OMP `stable-3_5_0` 9c5e24246c
  (lib/ui-library d4e01883); OMP `stable-3_4_0` 0aec65441f (lib/pkp
  767353f4fe, lib/ui-library ee684b34); OMP `stable-3_3_0` 8e72fc8836
  (lib/pkp ac3fa73402, lib/ui-library 96959f9e). Default dataset from
  pkp/datasets 566bb1f (2026-10-03), PostgreSQL. No server error or
  script error was recorded on any walk.
- 3.5, walked; code read: 3.5's `validatePublish()` checks a declined
  book and the review stage and reports ORCID problems from
  `validatePublishWarnings()`; `addToCatalog()` and `setAddEntryForm()`
  are as on `main`, and `CatalogEditModal.vue` comes from
  `pkp/ui-library#366`.
- 3.4 and 3.3, code only: OMP `BackendSubmissionsHandler::addToCatalog()`
  answers `withJsonError('api.submissions.400.submissionIdsRequired')`,
  that is `{"error": key, "errorMessage": text}`, and returns
  `validatePublish()`'s list as it is. `CatalogListPanel.vue` binds the
  form inside its own `<modal>`, `Form.vue` `error()` stores the
  errors, and `FormPage.vue` shows `FormErrors` (the reasons only in its
  `-screenReader` list) and disables "Save" while any error is held.
  `validatePublish()` there checks only a declined book and the review
  stage, neither reachable from the panel. ORCID was a separate plugin
  on those versions; whether it adds a requirement was not read.
- Introduced: `git log -S submissionIdsRequired` on OMP finds the
  endpoint's first version in 6a4168a7b (`pkp/omp#812`), which already
  answered `withJsonError()` and the raw requirement list; the keys are
  unchanged on `main`. `pkp/pkp-lib#9313` (script errors in the same
  panel) is a different fault.
- Unverified: duplicate ORCID iDs and plugin requirements were read in
  the code, not walked.
