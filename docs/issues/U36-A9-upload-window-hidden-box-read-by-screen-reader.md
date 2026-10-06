# In the upload window, a screen reader reads the hidden "Upload File" box before a component is chosen

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#1176` for `pkp/pkp-lib#988` · [516d3891c8](https://github.com/pkp/pkp-lib/commit/516d3891c8eee4c3c4f6815bd6c95c05d7be04db) · 2016-02-16 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U36 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U36-submission-files.md#a9)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

Step 1 of the upload window shows no upload box until the file's
component ("Article Text" and the like) or a file to revise is chosen
in the drop-downs above it. The box is only moved off screen, so a
screen reader reads it all the same: "Drag and drop a file here to
begin upload", a button "Upload File" and a button "Choose File".

A screen reader user who presses that "Upload File" gets the file
picker, and the chosen file is uploaded and refused. The window shows
"Errors occurred processing this form" and "Missing or invalid
component!" for six seconds and is otherwise as before. The refused
file is discarded.

## Impact

- **Lost.** No data, only the one upload attempt.
- **Who.** Anyone using a screen reader who uploads a file in the
  workflow (a submission, review, revision, copyedited or
  production-ready file, a galley's file) and presses "Upload File"
  before choosing a component. A sighted keyboard user does not meet
  it: Tab skips the hidden button.
- **Way round.** Choose the component first. A screen reader reading
  the window in order meets the text "Article Component*" and then a
  combo box showing "Select article component", both before the hidden
  box. The combo box itself has no name, so a user who moves by Tab
  hears only its current choice.

Low: nothing is lost, the refusal is said on screen, and the upload
goes through once the component is chosen, which the window asks of
everyone. A refusal with no message at all would make it medium.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for the version.
- A screen reader, or the browser's developer tools. In Chrome, the
  accessibility tree is under Elements › Accessibility › "Enable
  full-page accessibility tree".
- Any small file on the computer.

Steps (OJS, OMP):

1. Sign in as `dbarnes`.
2. Open the submission's workflow. It opens on Submission.
   - OJS: submission 4, "Computer Skill Requirements for New and
     Existing Teachers: Implications for Policy and Practice".
   - OMP: submission 3, "The Political Economy of Workplace Injury in
     Canada".
3. Above "Submission Files", press "Upload". The window "Upload
   Submission File" opens on "1. Upload File".
4. Choose nothing. Read the window with the screen reader, or read its
   accessibility tree.
5. Press the hidden "Upload File": with a screen reader, move to the
   button and press it. Without one, run
   `document.querySelector('.pkp_uploader_button').click()` in the
   browser's console. Choose the file in the file picker. The Network
   tab shows the `upload-file` request and its answer.
6. Choose "Article Text" under "Article Component" (OMP: "Book
   Manuscript" under "Submission Component"), and read the window
   again.

On a preprint server (OPS), steps 2 and 3 are: open preprint 1, "The
influence of lactation on the quantity and quality of cashmere
production", choose Publication › "Galleys", press "Add galley", type
"u36k PDF" as the label and press "Save". The window "Upload a File
Ready for Publication" opens. At step 6 choose "Preprint Text" under
"Preprint Component".

**Expected:** at step 4 the window shows the drop-downs and no upload
box, and the screen reader reads the same: nothing of the box, so there
is nothing to press at step 5. At step 6 the box appears on screen and
for the screen reader.

**Observed:** at step 4 the screen shows no box, and the accessibility
tree holds it, after the drop-downs:

```
- text: Drag and drop a file here to begin upload
- button "Upload File"
- button "Choose File"
```

At step 5 the file picker opens and the file is sent. The `upload-file`
request answers 200 with the form again and no uploaded file. Above the
drop-downs the window shows, for six seconds:

```
Errors occurred processing this form
Missing or invalid component!
```

The window is then as at step 4: no file name, no "Change File". The
file is not kept: the submission has the same files as before. Giving
the file to the tree's other entry, "Choose File", ends the same way.

At step 6 the box appears on screen, and the tree reads as at step 4.

## Cause

`FileUploadFormHandler` (pkp-lib,
`js/controllers/wizard/fileUpload/form/FileUploadFormHandler.js`) hides
the upload box with the class that exists to keep text readable for
screen readers. `hideUploader_()`, line 340:

```js
this.$uploader_.addClass('pkp_screen_reader');
```

`.pkp_screen_reader` (`styles/helpers.less`) moves an element off
screen with `position: absolute; left: -2000px` and a 1px `clip`. An
element hidden that way stays in the accessibility tree and stays
operable, which is the opposite of what this box needs while the form
is not ready for it.

516d3891c8 added `setUploaderVisibility_()`, `hideUploader_()` and
`showUploader_()` for `pkp/pkp-lib#988`, "Only show the file uploader
when genre/revision files selected". Before it, the box was always
shown.

The early upload is refused on the server.
`SubmissionFilesUploadForm::validate()` adds `submission.upload.noGenre`
("Missing or invalid component!") on `genreId`, and
`FileUploadWizardHandler::uploadFile()` then returns the form again at
line 427, before `execute()` at line 436, so nothing is stored. The
message does not come with the form: `Form::validate()` creates a
form-error notification, the redrawn form's in-place notification
fetches it, and `NotificationHandler` removes it after 6000 ms.

Reach:

- Every upload window whose step 1 has a drop-down, since all of them
  use this form. Walked: "Submission Files" in OJS and OMP, and a new
  galley in OPS. Read in the code: the windows of the other file lists.
- Not affected: a window that opens with the file to revise already set
  ("Upload revision" on a row), and a reviewer's attachment. They have
  no drop-down, so the box shows at once (code).
- Tab reaches neither entry of the hidden box today. The button carries
  `tabindex="-1"` from `fileUploadContainer.tpl`, and plupload gives
  its own file input ("Choose File") the same.
- [U63 A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U63-A6-upload-file-out-of-keyboard-reach.md)
  proposes removing the button's `tabindex`. If that fix went in
  without this one, Tab would stop on the button while it is off
  screen. This is read from the code; the two fixes were not tried
  together.
- The drop-downs' missing names, which weaken the way round, are a
  different fault, in the form's template:
  [U36-A9-upload-window-drop-downs-unnamed.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U36-A9-upload-window-drop-downs-unnamed.md).

## Proposed fix

Hide the box for everyone: use jQuery's `hide()` and `show()` in the
two methods
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/upload-window-hidden-box-read-by-screen-reader/fix.diff)).

```diff
 			hideUploader_ = function() {
-		this.$uploader_.addClass('pkp_screen_reader');
+		this.$uploader_.hide();
 	};
...
 			showUploader_ = function() {
-		this.$uploader_.removeClass('pkp_screen_reader');
+		this.$uploader_.show();
 		// Reset the button position
```

`display: none` takes the box out of the accessibility tree and out of
the tab order. The legacy handlers hide elements this way elsewhere
(`NotificationHandler`, `EditorialActionsHandler`). This handler is the
only legacy JavaScript (pkp-lib's and the apps' `js/`) that puts
`pkp_screen_reader` on an element.

plupload copes with the hidden box. The constructor attaches plupload
first, while the box still has its size, and only then calls
`setUploaderVisibility_()`. `showUploader_()` already calls plupload's
`refresh()`, which puts plupload's file input back over the button once
the box is shown.

Tried on `main`, all three apps. Before a choice the box is gone from
the accessibility tree; after the component is chosen it is on screen
and in the tree. The rest of step 1 gave the same results with the fix
applied and without it: choosing a file to revise shows the box and
sets the component, a mouse click on "Upload File" opens one file
picker, the file goes up under the chosen component, the box names it
with "Change File", and "Continue" opens "2. Review Details".

The server's refusal and its six-second message stay as they are, on
purpose: with the fix no screen offers an upload without a component,
and the check still guards a request sent another way.

**Alternatives:**

- Keep the class and add `aria-hidden="true"` while hidden. The button
  would stay operable for anything that does not honour the attribute,
  and Tab would reach it once U63 A6's fix is in.
- Show the box always and rely on the refusal. That undoes what
  `pkp/pkp-lib#988` asked for.

**What goes with it:**

- The two lines are the same on 3.5, 3.4 and 3.3 (lines 337 and 347 on
  3.3), so the change applies there.
- It should go in with, or before, U63 A6's fix, so the hidden button
  never becomes a Tab stop.
- Guard: a test, in pkp-e2e's Playwright suites, that step 1's
  accessibility snapshot has no "Upload File" button until a component
  is chosen.

Small: two lines in one handler, and a test.

## Evidence

- No screen reader was run. Every statement about what a screen reader
  reads or announces is taken from the accessibility tree Chromium
  builds, read as Playwright's `ariaSnapshot()`.
- Kept script, run on an install loaded from PKP's default test dataset
  (PostgreSQL; pkp/datasets c657990, 2026-10-01):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/upload-window-hidden-box-read-by-screen-reader/walk.js)
  with
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/upload-window-hidden-box-read-by-screen-reader/lib.js);
  its header gives the commands.
  - The default mode takes steps 1 to 4 and 6. It records the box's
    class, computed style and position, and counts the buttons the tree
    holds by role. Hidden, the box has the classes
    `pkp_controller_fileUpload waiting pkp_screen_reader` and sits at
    `left: -1789px`; the button and plupload's input both carry
    `tabindex="-1"`.
  - `MODE=at` is step 5: the button's own `click()`, a file given to
    the picker, the answer, the message, and the row counts of
    `submission_files`, `files` and `temporary_files` before and after
    (unchanged). It then gives a file to plupload's input ("Choose
    File"): the same answer and message.
  - `MODE=nb` checks the rest of step 1 with the fix applied and
    without it, as the Proposed fix lists.
- The fix was tried on 2026-10-02 on the `main` tips below, applied
  from fix.diff and taken out again. With it the hidden box has
  `display: none`, and the tree holds no "Upload File" and no "Choose
  File" until the choice.
- Introduced: `git blame` on line 340 gives 516d3891c8, whose author is
  Nate Wright. `pkp/pkp-lib#1176`, "Streamline plupload controls",
  carried it; Alec Smecher (asmecher) opened it, and it was merged on
  2016-02-22.
- Code reads:
  - `main`: `SubmissionFilesUploadForm::validate()`,
    `FileUploadWizardHandler::uploadFile()`, `Form::validate()` and
    `NotificationHandler` (`addTimerToNotifications()`), for the
    refusal and its message.
  - 3.5, at the lib/pkp tip below: `hideUploader_()` and
    `.pkp_screen_reader` the same.
  - 3.4 and 3.3: the same two lines in `FileUploadFormHandler.js` and
    the same rule in `styles/helpers.less`, read with `git show` on
    `origin/stable-3_4_0` and `origin/stable-3_3_0` in OJS's `lib/pkp`,
    and at the `lib/pkp` commits that OMP's and OPS's branch tips point
    at.
- Tips:
  - `main`: OJS b84f8e2e44 (lib/pkp ddd8ab243a); OMP 3b0ecf794 and OPS
    c8af945bb7 (lib/pkp 3dc90c81a6).
  - 3.5: OJS 091fb65453, OMP 9c5e24246, OPS 38b61882d3 (lib/pkp
    cf3f984335).
  - 3.4: OJS 75cc2d488b (lib/pkp 32b0f4b4af); OMP 0aec65441 and OPS
    acd8ae704b (lib/pkp df13621c2d).
  - 3.3: OJS ac77c9fb35 (lib/pkp f6ab331645); OMP 8e72fc883 and OPS
    c5532e2161 (lib/pkp d446601ebe).
- Walked: every step on `main` and 3.5, all three apps.
- Unverified: whether a screen reader speaks the six-second message.
  It appears inside the wizard's tab panel, which carries
  `aria-live="polite"`.
