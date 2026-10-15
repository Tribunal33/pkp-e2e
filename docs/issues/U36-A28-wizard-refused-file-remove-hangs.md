# Submission wizard: a file "Remove" the server refuses leaves the window spinning with no message

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP (a preprint server's wizard has no "Files" panel)
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** `pkp/ui-library#118` for `pkp/pkp-lib#6057` · [5cf37c989a](https://github.com/pkp/ui-library/commit/5cf37c989afe79c2a401b09c2d6c97e41ad1f4d5) · 2020-10-19 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-15)
- **Tracked in** spec U36 [A28](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U36-submission-files.md#a28)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

In the submission wizard's "Files" panel, an author presses "Remove"
and then "Yes" on a file the server refuses to remove: one already
removed in another tab of the same browser, or any file once the author
has been signed out. The "Remove" window stays open with a spinner
beside "No" that never stops, and the file stays listed. Nothing says
that the file was not removed, or why. Only "No" closes the window; on
3.5, where "Yes" and "No" stay greyed out, only the keyboard's Escape
does.

Choosing the file's type under "What kind of file is this?" on such a
row ("Article Text", or "Book Manuscript" on a press) fails the same
way: the choice is not saved, the row asks "What kind of file is
this?" again, and no message appears.

## Impact

- **Lost**: nothing on the panel: the refused removal and type choice
  leave the server as it was. A signed-out author is not told they are
  signed out until the wizard's next save of another step, which is
  refused with "An unexpected error has occurred. Please reload the
  page and try again."; the wizard keeps that change in the browser
  (read in the code, not walked).
- **Who**: anyone making a submission whose session ends while the
  wizard is open, or who has the same draft open in two tabs.
- **Way round**: close the window ("No"; Escape on 3.5; the window's
  "Close" on 3.4 and 3.3) and reload: the panel then lists only the
  stored files, or the sign-in page opens.

Low: nothing is lost and a reload sets the page straight, but the
spinner that keeps turning looks like work in progress, so the author
is never told that the removal failed.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`.
- Two small files on the computer: `article.pdf` and `notes.md`.

Removed in another tab:

1. Sign in as `zzedd` (password `zzeddzzedd`), an author.
2. Open `/index.php/publicknowledge/en/submission` ("Make a
   Submission"): type the title "hkk28 refused remove", choose a
   "Submission Language" (on OJS also a "Section"; on OMP leave the
   work type as it is), tick the checklist and privacy boxes, and press
   "Begin Submission". [3.5: the wizard opens on "Details"; press
   "Continue".]
3. On "Upload Files", press "Add File" and choose `article.pdf`, then
   "Add File" again and choose `notes.md`. Both rows ask "What kind of
   file is this?".
4. Open the wizard's address (`…/submission?id=…`) in a second tab of
   the same browser and go to "Upload Files" [3.5: press "Continue"
   from "Details"]. Press "Remove" on "article.pdf" and "Yes", then the
   same on "notes.md". Both rows go.
5. Back in the first tab, press "Remove" on "article.pdf", then "Yes".
6. Press "Yes" again. [3.5: "Yes" is greyed out; skip this step.]
7. Press "No". [3.5: "No" is greyed out too; press Escape.]
8. On the "notes.md" row, press "Article Text" ("Book Manuscript" on a
   press).
9. Reload the page.

Signed out in another tab:

10. Press "Add File" and choose `article.pdf`.
11. In the second tab, open `/index.php/publicknowledge/en/login/signOut`
    (the sign-out address); it lands on "Login".
12. In the first tab, press "Remove" on "article.pdf", then "Yes", then
    "No" [3.5: Escape].
13. On the "article.pdf" row, press "Article Text" ("Book Manuscript").

**Expected**: at steps 5, 8, 12 and 13 a message that the action
failed and why, as the server says it, and the "Remove" window closed.

**Observed**: at step 5 the browser's network panel shows the removal
as a `POST` with the header `X-Http-Method-Override: DELETE`, refused:

```
POST /api/v1/submissions/{id}/files/{fileId}?stageId=1   (X-Http-Method-Override: DELETE)  →  401
{"error":"user.authorization.submissionFile","errorMessage":"The current user is not authorized to access the specified submission file."}
```

The "Remove" window stays open with "Are you sure you want to remove
this file?", "Yes", "No" and a turning spinner, at once and 2 s later;
both rows stay listed; nothing else shows. Step 6 sends the same
request, gets the same answer and leaves the same screen. Step 7
closes the window. At step 8 the type choice (a `POST` with
`X-Http-Method-Override: PUT`) gets the same 401, and the row asks
"What kind of file is this?" again, with no message. Step 9 shows the
empty panel.

At step 12 the request answers `403 {"error":"The form could not be
submitted. You may have been logged out. Please reload the page and
try again."}`, and the window stays open with its spinner, 5 s later
too. At step 13 the type choice gets the same 403 and no message. The
browser's console logs only the failed requests; no script error.

On 3.5 the same requests are refused the same way, and "Yes" and "No"
stay greyed out from the first "Yes", so only Escape closes the
window.

## Cause

The two requests name an error handler that does not exist. In
ui-library, `SubmissionFilesListPanel.vue` `remove()` (lib/ui-library
`src/components/ListPanel/submissionFiles/SubmissionFilesListPanel.vue`
line 272) and `SubmissionFilesListItem.vue` `setGenre()` (line 228)
both pass `error: this.ajaxErrorCallback` to `$.ajax()`.
`ajaxErrorCallback()` is defined by the `ajaxError` mixin
(`src/mixins/ajaxError.js`), which opens an "Error" window with the
server's `errorMessage` (or its `error`). Neither component includes
the mixin: the panel's mixins are `[dialog]` alone, and the row has
none. So `error` is `undefined`, jQuery has no handler to call, and
the refusal is dropped. The panel and the row have named the handler
without the mixin since they were added.

Only the success paths change the screen, so a refusal leaves it as it
was mid-request. `remove()` closes its window only in `success`, and
the window shows its spinner from the press of "Yes" (`DialogBody.vue`
`fireCallback()`), so it spins until "No". `setGenre()` clears its
spinner in `complete`, so the row goes back to its question. The row's
"Edit" › "Save" goes through the form component instead (`Form.vue`
`error()`), which shows a notice: "An unexpected error has occurred.
Please reload the page and try again." for the 401, the server's
message for the 403.

Reach:

- Two more components name `ajaxErrorCallback` without the mixin:
  `ManageEmailsPage.vue`, the email templates page
  (`ManagementHandler::manageEmails()`; resetting all templates,
  removing one, loading one), and `DoiListItem.vue` (reloading an item
  after a DOI edit, where the call would throw). Checked in the code
  only.
- The other twenty-two components that name it include the mixin
  directly, through `fetch`, or through the page they extend.

## Proposed fix

Include the `ajaxError` mixin in both components, as the other list
panels and rows that send their own requests do
(`HighlightsListPanel.vue`, `ContributorsListPanel.vue`,
`CatalogListItem.vue`)
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-refused-file-remove-hangs/fix.diff)):

```diff
--- a/lib/ui-library/src/components/ListPanel/submissionFiles/SubmissionFilesListPanel.vue
+import ajaxError from '@/mixins/ajaxError';
 import dialog from '@/mixins/dialog.js';
 …
-	mixins: [dialog],
+	mixins: [ajaxError, dialog],
--- a/lib/ui-library/src/components/ListPanel/submissionFiles/SubmissionFilesListItem.vue
+import ajaxError from '@/mixins/ajaxError';
 …
+	mixins: [ajaxError],
```

On `main` and 3.5 the "Error" window takes the place of the "Remove"
window (both open through the same modal store, which holds one
dialog), so `remove()` itself needs no change. The panel keeps
`dialog` beside `ajaxError`, which already includes it: harmless, and
it leaves the panel's own use of `openDialog()` visible.

Tried on `main` (OJS, OMP). At steps 5 and 8 an "Error" window reads
"The current user is not authorized to access the specified
submission file." with "OK", in place of the spinning "Remove" window;
at steps 12 and 13 it reads "The form could not be submitted. You may
have been logged out. Please reload the page and try again.". "OK"
closes it. A removal and a type choice the server accepts (both
answering 200) close the window, drop the row or show the type, and
open no window, the same with and without the patch.

With the fix, the row of the file removed in the other tab stays
listed after "OK" until a reload. Dropping it would need the panel to
tell "already gone" from other refusals, which the 401 does not say;
the message's "Please reload" covers it.

**Alternatives**

- Close the "Remove" window in a `complete` callback and leave the
  error silent: the window would close, but the author would still
  not learn that the file is still there, or that they were signed out.
- Move both requests to `useFetch` and `openDialogNetworkError()`, as
  newer code does: the better long-term shape, but a rewrite of two
  components for what one import fixes.

**What goes with it**

- `ManageEmailsPage.vue` and `DoiListItem.vue` lack the same mixin and
  take the same two lines; they are left out of the diff because their
  screens were not walked here.
- The fix proposed in the report on "Cancel upload" after the file has
  been sent
  ([U36-A25](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U36-A25-cancel-upload-after-sent-keeps-file.md))
  adds the same mixin to the panel; whichever lands first, the other
  drops that line.
- Backport: on 3.5 the diff's two lines apply as they are. On 3.4 and
  3.3, `openDialog()` opens windows through vue-js-modal's
  `$modal.show()`, which stacks them, so the "Remove" window would stay
  under the "Error" window: the backport also closes it in the error
  handler (`$modal.hide('remove')`). 3.4 and 3.3 were not tried.
- Guard: an e2e test that removes a file in a second tab and presses
  "Remove" in the first, or a component test that makes the request
  fail and expects the "Error" window.

Small: two lines in each of two components, no stored data, API or
plugin hook touched, and a test; tried.

## Evidence

- The kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-refused-file-remove-hangs/walk.js)
  with its [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-refused-file-remove-hangs/lib.js)
  takes the Steps on OJS and OMP; its header names the commands
  (`MODE=nb`: a type choice and a removal the server accepts, for the
  trial).
- Walked 2026-10-15 on `main` and `stable-3_5_0`, OJS and OMP, each on
  an install freshly loaded from PKP's default test dataset (pkp/datasets
  7912e09, 2026-10-14), on PostgreSQL. OPS was not walked: its dataset
  has no `zzedd`.
- Not walked on 3.5: step 8 (the type choice refused with 401), since
  that run could not close the window at step 7; step 13 (the same
  choice refused with 403) was walked, with the same silent result as
  on `main`.
- The fix trial: `node bin/try-fix.js apply
  shared/playwright/checks/issues/wizard-refused-file-remove-hangs/fix.diff
  ojs omp`, the script, `MODE=nb` with the patch in and after `node
  bin/try-fix.js revert …`, each on a freshly loaded dataset.
- Code reads. `main` (ui-library 47b565cb): `src/mixins/ajaxError.js`,
  `src/mixins/dialog.js`, `src/stores/modalStore.js` `openDialog()`
  (replaces the open dialog's props), `ModalManager.vue` (the dialog
  keyed by its props), `DialogBody.vue` `fireCallback()`, `Form.vue`
  `error()`, `src/mixins/autosave.js` and `SubmissionWizardPage.vue`
  `autosaveErrored()` (a 403 keeps the change in local storage and
  shows `common.unknownError`); every `.vue` file naming
  `ajaxErrorCallback` and its mixins or `extends` chain. 3.5
  (ui-library 2576e00a): the same two components, line for line;
  `Dialog.vue` disables its buttons while `isLoading` (lines 66, 190).
  3.4 (`origin/stable-3_4_0`, ee684b341b): the panel's `mixins:
  [dialog]` (line 79) and `error: this.ajaxErrorCallback` (line 248),
  the row's (line 222); `src/mixins/dialog.js` `openDialog()` calls
  `$modal.show()`; `Dialog.vue` greys its buttons while loading and
  keeps a header "Close" (lines 9, 28); the global mixin of
  `src/main.js` does not define the handler. 3.3
  (`origin/stable-3_3_0`, 96959f9ed4): the panel's `mixins: [modal]`
  (line 78) and `error: self.ajaxErrorCallback` (line 491), the row's
  (line 274); `Dialog.vue` the same greyed buttons and header close
  (lines 10, 21, 27); the panel sits in lib/pkp
  `templates/submission/form/step2.tpl`.
- Introduced: `git log -S ajaxError` on the two files finds only
  5cf37c98, their first commit, which already named
  `ajaxErrorCallback` with the `modal` mixin alone; `git blame` gives
  467034aa4 (2022, `remove()` rewritten with the same handler) and
  997480bb6 (2023, `mixins: [dialog]`), neither of which dropped a
  mixin.
- Upstream search (pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ui-library):
  "remove file submission wizard error", "remove file spinner",
  "remove file \"not authorized\" submission wizard", "remove file
  dialog spinner", "file genre component error message submission
  files", `ajaxErrorCallback`, `SubmissionFilesListPanel`, "ajaxError
  mixin missing". Read and not the same fault: `pkp/pkp-lib#10050`
  (the wizard's autosave error handler), `pkp/pkp-lib#6741` (upload
  validation errors), `pkp/pkp-lib#13286` (a cancelled revision
  upload).
- Not driven: `ManageEmailsPage.vue` and `DoiListItem.vue`; a session
  that expires on its own (the walk signs out in the second tab, which
  the server answers the same way, 403); what a signed-out author's
  next save shows (code only).
- Tips: OJS `main` 378eced941 and OMP `main` f4836d4fba, each with
  lib/pkp b17fadae59 and ui-library 47b565cb; `stable-3_5_0` OJS
  ca763c91cd and OMP a70bbb9c4, with lib/pkp 4045d9241e and ui-library
  2576e00a; `stable-3_4_0` OJS daf0ca971d, OMP 0aec65441f, lib/pkp
  55c8e406b3, ui-library ee684b341b; `stable-3_3_0` OJS d7d9dd14ec, OMP
  8e72fc8836, lib/pkp 5e84acd11b, ui-library 96959f9ed4.
