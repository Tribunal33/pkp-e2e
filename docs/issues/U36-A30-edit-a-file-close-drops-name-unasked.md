# Closing "Edit a file" without "Save" drops a changed file name without asking

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/ui-library#885` and `pkp/pkp-lib#12622` for `pkp/pkp-lib#12584` · [881503b4f9](https://github.com/pkp/ui-library/commit/881503b4f986ddc06a50553a0726bd0cf3347758) and [de26641811](https://github.com/pkp/pkp-lib/commit/de2664181146787103afbf094a8d6c8105bbe7b6) · 2026-05-28 · Blesilda Biazon (blesildaramirez)
- **Upstream** none found (2026-10-15)
- **Tracked in** spec U36 [A30](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U36-submission-files.md#a30) (the format file's window: spec U73 [Rule 11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U73-publication-formats-proof-terms.md))
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An editor chooses "Update File Details" in a file's menu on a workflow
file list. The window "Edit a file" opens, and the editor changes the
file's name. The editor then leaves without pressing "Save", by
pressing the window's "Close", clicking the shaded page beside the
window, or reloading the page. In 3.5 each of these first asked "The
data on this form has changed. Do you wish to continue without
saving?", or for a reload, the browser's leave-page question. Now
nothing asks. The window closes at once, the typed name goes with it,
and the list keeps the old name.

On a press, the "Edit a file" window that opens with "Edit" on a
publication format's file does the same.

## Impact

- **Lost:** whatever was typed in the window and not saved, and nobody
  is told. That is the name, and also a revision's "Summary of Changes
  (Amendment Notice)" or a supplementary file's description and other
  boxes, which belong to the same form. The list shows the old name at
  once, but a dropped summary shows only when the window is opened
  again.
- **Who:** editors, section editors and managers of a journal or press
  who close the window instead of pressing "Save". Only this window
  lost the question: the change that dropped it moved no other form.
  It ships with the next release unless fixed, since 3.5 still asks.
- **Way round:** press "Save" before leaving.

Low: only one window's unsaved typing is lost. A changed name shows the
loss at once, and an amendment notice is normally written when the
revision is uploaded, in the upload wizard, not in this window. It
would be medium if editors often write or rewrite the amendment notice
in "Edit a file".

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` or OMP `main`.
- For the publication format's file (OMP): the dataset's book 4 has
  only a remotely hosted "PDF" format with no file, so steps 8–10 add a
  format and a file.

"Edit a file" on a file list:

1. Sign in as `dbarnes`.
2. Open the submission. On OJS this is submission 4, "Computer Skill
   Requirements for New and Existing Teachers: Implications for Policy
   and Practice" (Submissions › "View"). On OMP it is submission 3, "The
   Political Economy of Workplace Injury in Canada". `dbarnes` is not
   assigned to it, so it is listed under "Active submissions", not
   "Assigned to me" (or open
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=3`).
3. In "Submission Files", open "More Actions" on the file's row
   ("Computer Skill Requirements for New and Existing Teachers:
   Implications for Policy and Practice.pdf"; on OMP "chapter1.pdf") and
   choose "Update File Details" (3.5: "Edit"). The window "Edit a file"
   opens.
4. Add " hkk30" to the end of "Name the file (e.g., Manuscript; Table
   1)" and press Tab.
5. Press the window's "Close" (top left).
6. Open "Update File Details" again, change the name the same way, and
   click the shaded page to the left of the window.
7. Open "Update File Details" again, change the name, and reload the
   page with the window open.

"Edit a file" on a publication format's file (OMP, `dbarnes`, book 4
"How Canadians Communicate: Contexts of Canadian Popular Culture"):

8. Open the book's "Publication" › "Publication Formats".
9. Press "Add publication format", name it "EPUB hkk30" and press "OK".
10. On the "EPUB hkk30" row press "Change File", which also adds a
    format's first file. In the upload window choose the component "Book
    Manuscript", upload a PDF named "hkk30.pdf", then press "Continue",
    "Continue" and "Complete".
11. On the file row "hkk30.pdf" press "Edit". The window "Edit a file"
    opens on its tab "Edit Metadata". Add " hkk30" to the name, press
    Tab, then press the window's "Close".

**Expected** (as on 3.5): steps 5, 6 and 11 ask

```
The data on this form has changed. Do you wish to continue without saving?
```

"Cancel" keeps the window open with the typed name. "OK" closes it, and
the list keeps the old name. Step 7 raises the browser's leave-page
question.

**Observed**: no step asks. The window closes at once, or in step 7 the
page reloads at once. The list shows the old name, at once and after a
reload, and "Update File Details" reopens on the old name.

The format's own "Edit" window (tabs "Edit", "Metadata") still asks the
question when its name is changed and "Close" is pressed.

## Cause

`pkp/pkp-lib#12584` replaced the legacy form in
`lib/pkp/templates/controllers/wizard/fileUpload/form/submissionFileMetadataForm.tpl`
(an `AjaxFormHandler` over a `<form>`) with the Vue component
`FileMetadataForm.vue` (`lib/ui-library/src/managers/FileManager/modals/`),
mounted as its own Vue app with `pkp.pkpCreateVueApp()`. The template is
fetched by `PKPManageFileApiHandler::editMetadataTab()`, the shared
entry behind "Update File Details" (`editMetadata()` delegates to it)
and behind the format file's "Edit Metadata" tab. The upload wizard's
step 2 renders it too. The change moved no other form: this template
is the only one whose legacy form it replaced.

The legacy form owned the questions. `FormHandler`
(`lib/pkp/js/controllers/form/FormHandler.js`) sets `formChangesTracked`
on a change and answers the window's `containerClose` event in
`containerCloseHandler()` with
`confirm(pkp.localeKeys['form.dataHasChanged'])`. Its `formChanged`
event registers the form with `SiteHandler`, whose `beforeunload`
handler asks before the page is left.

The window still asks the form. `AjaxModalWrapper.vue` registers a close
callback that triggers `containerClose` on the first `<form>` of its
content, and closes unless `closePermitted` comes back `false`. That
form is now `FileMetadataForm`'s `PkpForm`, which has no
`containerClose` handler, so `closePermitted` stays `true`.
`FileMetadataForm.vue` tracks no change at all: it does not use
`useFormChanged()`, the composable the Vue forms use for both
questions, and nothing registers a `beforeunload` listener for it.

Reach:

- "Update File Details" on every workflow file list of OJS and OMP
  (walked on "Submission Files"; the other lists use the same
  `editMetadataTab()` in the code).
- OMP's format file "Edit" › "Edit Metadata" (walked).
- Every box of the form, not only the name: a revision's "Summary of
  Changes (Amendment Notice)", a supplementary file's description,
  creator and the rest, an artwork file's caption and credit (in the
  code).
- OMP's format file window with an "Identifiers" tab (shown when a
  publisher ID or an identifier plugin is enabled for files): on 3.5,
  switching tabs with a changed name asked, through
  `TabHandler.tabsBeforeActivate()`. It cannot now, since that check
  asks only a form with a legacy handler (in the code; not walked).
- The upload wizard's step 2 ("2. Review Details"): its "Close" sends
  `containerClose` to step 1's upload form, which comes first in the
  window. So "Close" on step 2 does not ask about a changed name, with
  or without the fix (walked on `main`). A reload with a changed name on step 2 asked on 3.5
  through the legacy form and no longer does (in the code).

## Proposed fix

Give `FileMetadataForm.vue` the change tracking the legacy form had. Use
`useFormChanged(form, [], {warnOnClose: true})` for the browser's
leave-page question. Answer the window's legacy `containerClose` event
on the form's container with the same `confirm()` that
`FormHandler.containerCloseHandler()` uses. Reset the tracked state on
"Save" and "Cancel" so neither asks
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/edit-a-file-close-drops-name-unasked/fix.diff)):

```diff
+import {useFormChanged} from '@/composables/useFormChanged';
+import {t} from '@/utils/i18n';
 …
 const {form, set} = useFileMetadataForm(props);
+const {hasStateChanged, setInitialState} = useFormChanged(form, [], {
+	warnOnClose: true,
+});
 
 function onSuccess(r) {
+	setInitialState();
 …
 function onCancel() {
+	setInitialState();
 	props.onCancelled?.();
 }
 …
 	if (!$container.length) return;
 
+	$container.on(
+		'containerClose.submissionFileMetadata',
+		(event, informationObject) => {
+			if (hasStateChanged() && !confirm(t('form.dataHasChanged'))) {
+				if (informationObject) {
+					informationObject.closePermitted = false;
+				}
+			}
+		},
+	);
```

The `containerClose` bridge follows the one the component already has
for the wizard: `wizardAdvanceRequested.submissionFileMetadata`, bound
on the same container and removed in `onBeforeUnmount()`. The bridge is
needed because the component runs in its own Vue app. There,
`useFormChanged()` cannot inject the window's `registerCloseCallback`,
so only its `beforeunload` half works; its `inject()` calls find no
provider, which Vue reports as a warning in development builds only.
The answer must be synchronous, because `AjaxModalWrapper` reads
`closePermitted` straight after the trigger. So the fix uses a native
`confirm()`, as the legacy form did, rather than
`useModal().openDialog()`.

The fix was tried on OJS and OMP, and steps 5, 6, 7 and 11 then gave
the Expected. Several cases still close without a question, as before:

- "Close" with nothing changed, including on a revision whose stored
  "Summary of Changes" loads in the rich-text editor;
- "Save" with a changed name;
- "Cancel" with a changed name;
- the upload wizard's "Close" on step 2.

The fix does not bring back the tab-switch question in the format
file's window with "Identifiers" (Reach).

**Alternatives:**

- Mount `FileMetadataForm` inside the window's own Vue tree instead of a
  separate app, so `useFormChanged()` registers its close callback
  directly. That is the right end state, but it is a larger change to
  how the legacy template mounts the form and to the wizard bridge.
- Teach `AjaxModalWrapper` to ask Vue forms in general. It cannot know
  their state unless each form exposes it, which is what the fix does
  for the one form that needs it.

**What goes with it:** no data repair. The upload wizard's step 2 gets
back the leave-page question on a reload with a changed name. Add a unit
test in ui-library for `FileMetadataForm`: a changed name, a
`containerClose` trigger, and `closePermitted` `false` when `confirm`
answers no.

Small: one component in ui-library, following its own bridge and the
`useFormChanged()` pattern.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/edit-a-file-close-drops-name-unasked/walk.js),
  run on installs freshly loaded from PKP's default test dataset
  (pkp/datasets 7912e09, 2026-10-14), PostgreSQL:
  `MODE=walk node bin/probe.js ojs,omp,ops shared/playwright/checks/issues/edit-a-file-close-drops-name-unasked/walk.js`.
  It takes Steps 1–11 and answers a question "Cancel" first, then "OK".
  After each leave it reads the stored name in
  `submission_file_settings`, and the format's name in
  `publication_format_settings`. No server error and no page script
  error in any run.
- `main`, walked on OJS and OMP: as Observed. OPS, walked: preprint 1's
  workflow has no "Submission Files" list and no "Update File Details".
- 3.5, walked on OJS, OMP and OPS: as Expected. With "OK" the old name
  stayed stored, and the format's own "Edit" window asked as well. The
  3.5 `submissionFileMetadataForm.tpl` still attaches `AjaxFormHandler`
  to a `<form>`.
- 3.4 and 3.3, read in the code: `submissionFileMetadataForm.tpl` on
  `stable-3_4_0` and `stable-3_3_0` (`lib/pkp`) attaches
  `AjaxFormHandler`, whose `containerCloseHandler()` asks. Neither
  branch has a commit for `pkp/pkp-lib#12584`.
- Fix tried with `node bin/try-fix.js apply <fix.diff> ojs omp`, which
  rebuilds the JavaScript.
  - `MODE=nb` (the neighbour cases above) was run with the fix in and
    out. Neither run asked; the saved name was stored and the cancelled
    one dropped.
  - `MODE=summary` (OJS, fix in): submission 13's author `lkumiega`
    uploaded a revision through "Upload revisions" with "Fixed Figure
    2." typed in "Summary of Changes (Amendment Notice)", stored as
    `<p>Fixed Figure 2.</p>`. Then `dbarnes` opened "Update File
    Details" on it in "Revisions Uploaded" and waited for the editor to
    load, which showed the same HTML. "Close" asked nothing, and the
    summary stayed as stored.
- Introduced: `git blame` on `FileMetadataForm.vue` gives 881503b4f9,
  the file's only commit (`pkp/ui-library#885`). The template's switch
  to the component is pkp-lib de26641811 (`pkp/pkp-lib#12622`). The
  later 8a1d89ef changed `useFileMetadataForm.js` beside the component
  (the summary made a single value), not change tracking.
- Tips: `main` ojs 378eced941, omp f4836d4fba, ops 2ece50497f, each
  with lib/pkp b17fadae59 and lib/ui-library 47b565cb; `stable-3_5_0`
  ojs ca763c91cd, omp a70bbb9c4d, ops 44aec6e131, each with lib/pkp
  4045d9241e and lib/ui-library 2576e00a; 3.4 read at lib/pkp
  55c8e406b3, 3.3 at lib/pkp 5e84acd11b.
- Unverified (not walked):
  - the other workflow lists' "Update File Details", which use the same
    template and component;
  - the loss of a changed summary or supplementary box without the fix,
    and the tab switch in the format file's window with "Identifiers";
  - the reload on the wizard's step 2, on 3.5 and with the fix.
