# In the preprint submission wizard, a refused DOI gets an unexpected-error window and no message at the box

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OPS; OJS, OMP (only with the plain language summary setting on; seen in U21 A16 and A20, fix not walked)
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: none (code; no autosaving wizard)
- **Introduced** `pkp/ui-library#241` for `pkp/pkp-lib#7191` · [467034aa4](https://github.com/pkp/ui-library/commit/467034aa4171bca0c46fa9e0e4b8b8dcdaa7cee2) · 2022-10-31 · Alec Smecher (asmecher), PR author; commit by Nate Wright (NateWr)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U75 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U75-preprint-relations.md#a7)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

On the submission wizard's "For Readers" step, an author who ticks "This
preprint has been published elsewhere." and types the DOI as DOIs are
usually written, "10.1234/abcd", presses "Continue". The server refuses
the answer, but the wizard moves on to "Review" and opens a window that
reads only "An unexpected error has occurred. Please reload the page and
try again.". Back on "For Readers" the step still shows the ticked answer
and the typed DOI, with no message under the box, so the author is never
told that the box needs a full web address.

Neither the answer nor the DOI is saved. After the reload the window asks
for, the step shows no answer ticked, "Review" reads "This preprint has
not been published elsewhere.", and "Submit" completes the submission:
the preprint goes to the moderators with no relation at all. Only an
author who guesses the full address ("https://doi.org/10.1234/abcd") gets
the relation saved; the box has no help text that says so.

The same fault shows the same window for every field the server refuses
on a wizard step. On journals and presses that reach is the plain
language summary's, filed under U21 A16 and A20.

## Impact

- **Lost**: the relation the author entered, the "published elsewhere"
  answer and its DOI. The preprint is submitted without it, and nothing
  on the moderator's side says the author gave one.
- **Who**: every author on a preprint server who says, while submitting,
  that the preprint is published elsewhere and writes the DOI without
  "https://doi.org/".
- **Way round**: none on screen for the author. A moderator or manager
  who enters the same DOI in the "Relations" dropdown after submission
  is told "This is not a valid URL.", but only if they know there is a
  relation to enter.

Medium: the input is narrow (an author reporting a published version
while submitting, with the DOI written bare), and the window, though it
names nothing, does warn that something failed. It would be high if no
window appeared: after the reload the relation is lost where nobody
looks, because "Review" then says "not published elsewhere"
([A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U75-preprint-relations.md#a9))
and the unanswered question does not stop "Submit"
([A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U75-preprint-relations.md#a8)).

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OPS `main`.

Steps:

1. Sign in as `ccorino`, an author.
2. Open "Make a Submission" (`/index.php/publicknowledge/en/submission`),
   type the title "u75r3 DOI written on its own", tick the requirements
   and privacy boxes, press "Begin Submission".
3. Press "Continue" until "For Readers".
4. Under "Relation status" choose "This preprint has been published
   elsewhere.", and type "10.1234/u75r3" in "DOI of the published
   preprint".
5. Press "Continue".
6. Press "OK" in the "Error" window.
7. Press "Back".

Submitting after the refusal (the same steps, with a file and an
abstract so that "Submit" is offered):

8. Before step 3, on "Upload Files" add a "Preprint Text" file, and on
   "Details" type an abstract.
9. After step 6, reload the page, as the window says.
10. Open "For Readers", then "Review", and press "Submit" and "Submit"
    in the confirmation.
11. Sign in as `dbarnes`, open the new submission's publication and its
    "Relations" dropdown.

**Expected**: at step 5 the author is kept on (or brought back to) "For
Readers", with "This is not a valid URL." under "DOI of the published
preprint" and the notice "The form was not saved because 1 error(s) were
encountered. Please correct these errors and try again.", as "Relations"
shows for the same value.

**Observed**: the save is refused and the wizard moves on to "Review":

```
PUT …/api/v1/submissions/20/publications/21  → 400
{"vorDoi":["This is not a valid URL."]}

Error
An unexpected error has occurred. Please reload the page and try again.
```

The "Relation status" panel on "Review" reads "This preprint has not
been published elsewhere.", and "Checking your submission" does not
clear. Back on "For Readers" (step 7), "This preprint has been published
elsewhere." is ticked and the box holds "10.1234/u75r3", with no message
under it and the box not marked invalid. The footer reads "Saving" and
both "Save for Later" buttons are disabled; that hang, and the page error
"Cannot read properties of undefined (reading 'url')" logged four
seconds after the refusal, are
[U21 A19's report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U21-A19-wizard-refused-save-hangs-saving.md).

Submitting after the refusal: the reload asks nothing ("Unsaved
Changes" does not open). "For Readers" shows none of the three answers
ticked and no DOI box. "Review" reads "This preprint has not been
published elsewhere.", lists no problem, and "Submit" leads to
"Submission complete". In the submitted preprint's "Relations" dropdown
no answer is ticked.

Control: as `dbarnes`, open submission 1 "The influence of lactation on
the quantity and quality of cashmere production" and its publication;
in the "Relations" dropdown of the publication controls above the
tabs, give the same answer and press "Save": the same 400, and the
dropdown shows "This is not a valid URL." under the box, "Please correct one
error.", and the notice above.

## Cause

Every wizard step saves itself in the background through the autosave
mixin. When the server refuses a save, ui-library's
`SubmissionWizardPage.vue` `autosaveErrored(autosave, xhr, status)`
handles it. By then the mixin's `_sendAutosave()` `onError` has already
set `isDisconnected` and put the payload back into local storage. For any
status other than 0 and 500, `autosaveErrored()` drops that stored
payload (except on a 403), sets `isDisconnected` again, and calls
`this.ajaxErrorCallback({})`: the generic "An unexpected error has
occurred" window. The server's answer, `xhr.responseJSON`, which names
the field and the message, is never read.

The wizard already has what it needs to show it. Each step's form takes
an `errors` map keyed by field name, the wizard's `updateForm(formId,
data)` sets it, and `autosave.id` is the refused form's id. The
"Relations" dropdown uses the same form component: its `Form.vue`
`error()` passes a 400's `responseJSON` through `structuredErrors()` into
the form's `errors` and shows the `form.errors` notice. The wizard's
`validate()`, `submit()` and `cancelSubmission()` read `responseJSON` too,
but into the page-level `errors`, the list "Review" shows, which holds
the saved submission's problems and is rebuilt by every check.

The whole "Relation status" form is refused, so the "published
elsewhere" answer is not saved either. The wizard has moved on to
"Review" before the server answers, because the save is sent after the
step changes. That order is intended and is not a second defect.

Reach (the DOI, and the summary required on OPS, walked; the rest read
in the code and in the U21 walks linked):

- OPS "For Readers": the "License" form's "Other license URL"
  (`licenseUrl`, validated as `url`) is refused and shown the same way.
- `main`, with the plain language summary setting on (off by default):
  the "Details" save of a summary that is required and left empty (OJS,
  OMP, OPS) or runs over the section's word limit (OJS, OPS) gets the
  same generic window
  ([U21 A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U21-A16-plain-summary-over-word-limit-refused.md),
  [U21 A20](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U21-A20-plain-summary-required-refuses-other-saves.md)).
  The summary is a field of "Details", so the fix below shows the
  message there.
- `main`, with the summary required: pkp-lib `Repository::validate()`
  adds `plainLanguageSummary.<locale>` to any publication save that
  lacks the summary, so the "References" form (all three apps) and OPS's
  "Relation status" form are refused naming a field they do not hold
  (U21 A20). No box on those forms can carry the message; the fix keeps
  the window there, and A20's fix removes the refusal itself.
- The autosave mixin has no other user (`lib/ui-library/src`,
  `lib/pkp/js`).

## Proposed fix

In `autosaveErrored()`, when a 400 or 422 names only fields of the
refused form, treat it as Form.vue does: put the errors on that form's
`errors` (not the page-level `errors` that "Review" lists), open the
form's step, and show the `form.errors` notice instead of the generic
window. A refusal that names any field the form does not hold, and
every other status, keeps the window as today. This is a proposal; the
team decides.

The change needs U21 A19's fix (stay connected after a refusal), since
without it the wizard still hangs after the message, and it sits on the
lines that fix rewrites. The linked
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-refused-doi-no-field-message/fix.diff)
therefore holds both, A19's change to `autosave.js` and
`autosaveErrored()` and this report's part, and applies to today's code
as it stands. The diff below is this report's part only, on top of
A19's change: its context line `this.isDisconnected = false;` is A19's.

```diff
--- a/lib/ui-library/src/components/Container/SubmissionWizardPage.vue
+++ b/lib/ui-library/src/components/Container/SubmissionWizardPage.vue
+import {structuredErrors} from '@/composables/useForm';
@@ autosaveErrored(), as U21 A19's fix leaves it: after the 403 return and the payload drop
 			this.isDisconnected = false;
+
+			// Field validation errors on fields of the refused form: show them
+			// there and take the author back to its step, as a form outside the
+			// wizard does (Form.vue error()). A refusal naming any other field
+			// keeps the error dialog.
+			let step;
+			let form;
+			this.steps.forEach((s) => {
+				s.sections.forEach((section) => {
+					if (section.type === 'form' && section.form.id === autosave.id) {
+						step = s;
+						form = section.form;
+					}
+				});
+			});
+			const fieldNames = form ? form.fields.map((field) => field.name) : [];
+			const errors =
+				[400, 422].includes(xhr.status) && xhr.responseJSON
+					? structuredErrors(xhr.responseJSON)
+					: {};
+			const names = Object.keys(errors);
+			if (names.length && names.every((name) => fieldNames.includes(name))) {
+				this.updateForm(autosave.id, {errors});
+				this.openStep(step.id);
+				pkp.eventBus.$emit(
+					'notify',
+					this.t('form.errors', {count: names.length}),
+					'warning',
+				);
+				return;
+			}
+
 			this.ajaxErrorCallback({});
```

Tried on `main` on OPS. With the fix in, step 5 opens no window: the
author is back on "For Readers" with "This is not a valid URL." under the
box (marked invalid), the notice "The form was not saved because 1
error(s) were encountered. …", the footer on "Last saved …" and both
"Save for Later" buttons enabled. No page error is logged. The neighbour
checks: the full address "https://doi.org/10.1234/u75r3" on the same
step is saved and shown on "Review" as "This preprint has been
published.", and the "Relations" control is unchanged, with the fix in
and out. With the summary required, the "Details" save refused for the
empty summary brings the author back to "Details" with the message under
the summary, while the "Relation status" save refused naming
`plainLanguageSummary` still opens the window.

**Alternatives**:

- Show the server's message inside the generic window: the author still
  has to find the box, and the window still says "reload the page",
  which loses the refused change. It is the better choice only for a
  refusal naming a field the form does not hold; there the message
  alone ("This field is required.") would not say which field.
- Stay on "Review" and list the refusal among its problems: "Review"
  checks the saved submission, which never held the refused value, so
  the refusal would have to be merged into its list by hand and would be
  cleared by the next check.
- Validate the address in the browser: covers this box only, and the
  server's rules would have to be copied into the client.

**What goes with it**:

- U21 A19's fix, carried in the linked diff.
- Editing the refused box clears its message, through the form's own
  field handling, and the changed form is saved again when the author
  moves on.
- Whether the box should accept a DOI written on its own is a separate
  question (spec U75 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U75-preprint-relations.md#a4)).
  This fix tells the author what the box wants either way.
- No stored data to repair, no REST API or plugin hook change.
- Backport: `autosaveErrored()` is the same on `stable-3_5_0`, and the
  diff applies there. On `stable-3_4_0` the method differs by a trailing
  comma, but 3.4 has no `@/composables/useForm` and no `this.t`: a 3.4
  backport passes `responseJSON` as it is, as 3.4's `Form.vue` does,
  uses `this.__('form.errors', …)`, and checks 400 only, the one status
  3.4's `Form.vue` handles.
- Guard: a vitest in ui-library: an autosave answered 400 with
  `{"vorDoi":[…]}` sets that form's `errors`, opens its step and opens
  no dialog; one answered 400 naming a field the form does not hold
  opens the dialog.

Small: about thirty lines in one method of one ui-library file,
following Form.vue's handling of the same answer, plus one unit test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-refused-doi-no-field-message/walk.js)
  (it reuses the U21 A19 walk's
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-refused-save-hangs-saving/lib.js)),
  run on an install loaded from the default dataset:
  `node bin/probe.js ops shared/playwright/checks/issues/wizard-refused-doi-no-field-message/walk.js`.
  `MODE=submit` takes the steps "Submitting after the refusal",
  `MODE=neighbour` the full-address wizard save and the "Relations"
  control, and `MODE=pls` a refusal naming a field the refused form does
  not hold (the summary required, "Relation status" answered with a full
  address).
- Tips walked: OPS `main` c8af945bb7 (pkp-lib 3dc90c81a6, ui-library
  280f98c5); OPS `stable-3_5_0` 38b61882d3 (pkp-lib cf3f984335,
  ui-library d4e01883). pkp/datasets e8dafbc (2026-10-02). PostgreSQL.
- The 3.5 walk saw the same 400, window, "Review" panel and empty field
  message; its code read: `autosaveErrored()` is identical to `main`'s,
  and `pages/submission/SubmissionHandler.php` puts `RelationForm` in the
  wizard with `vorDoi` validated as `url` (`schemas/publication.json`).
- 3.4 (code): ui-library `origin/stable-3_4_0` ee684b34 has the same
  `autosaveErrored()`; OPS `upstream/stable-3_4_0` acd8ae704b puts
  `RelationForm` in the wizard (`pages/submission/SubmissionHandler.php`)
  and validates `vorDoi` as `url`; pkp-lib 767353f4fe.
- 3.3 (code): ui-library `origin/stable-3_3_0` 96959f9e has no
  `SubmissionWizardPage`; OPS `upstream/stable-3_3_0` c5532e2161 asks for
  the relation only in the workflow's `RelationForm`, which is a regular
  form and shows field errors.
- Introduced: `git blame` on `autosaveErrored()` stops at 467034aa4,
  which created the method (7f13651e9 later reformatted one line). The
  `licenseUrl` and plain language summary reach is read in the code and
  in the U21 reports linked above, not walked here.
- Unverified: the fix on OJS and OMP (their wizards share the file; not
  walked with it), and a 422 answer (no wizard save returns one today).
