# "Add Note" with an empty box posts a note with no text, on a file's "Notes" and in "Activity Log & Notes"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** not traced; present since at least [002fb605a8](https://github.com/pkp/pkp-lib/commit/002fb605a8ec5627b717dccf81fbc887a6baf52f) (2013-03-28), which brought the form into pkp-lib with no check on the text
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U36 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U36-submission-files.md#a10), spec U38 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U38-submission-activity-log-and-notes.md#a2)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

Pressing "Add Note" with the box empty posts a note with no text. It
happens in a file's "More Information" › "Notes" and in the
submission's "Activity Log & Notes" › "Notes". The message "Note
posted." appears, the list gains a note that shows only its writer, its
date and "Delete", and "History" gains "Posted new note.". An empty note
is expected to be refused.

The empty note stays in the list until an editor deletes it. The
"History" line stays whatever happens.

Only the editorial team sees either: neither window opens for an author
or a reviewer, and adding a note sends no email. On a preprint server
before `main`, a galley has no "More Information", so only "Activity Log
& Notes" shows the fault there.

## Impact

- **Lost**: nothing.
- **Who**: anyone who can add a note, by pressing "Add Note" before
  typing. On a file's "Notes" that is the editors and the assistant
  roles (Copyeditor, Layout Editor and the others). "Activity Log &
  Notes" opens for editors only, so an assistant cannot add a note
  there.
- **Way round**: "Delete" on the empty note. Managers and editors see
  "Delete" on every note, whoever wrote it. An assistant sees it on no
  note, so an assistant who posts an empty note needs an editor to
  remove it.

Low: nobody's work is blocked, and what is left behind is an empty
entry that only the editorial team sees.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, or the one for `stable-3_5_0`
  on a 3.5 install: OJS, OMP or OPS (the context `publicknowledge`).
  The submissions and files the steps name are the same in both.
  Nothing else.

A file's notes:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. Open submission 4, "Computer Skill Requirements for New and Existing
   Teachers: Implications for Policy and Practice"
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=4`).
   On a press open submission 3, "The Political Economy of Workplace
   Injury in Canada". On a preprint server open submission 1, "The
   influence of lactation on the quantity and quality of cashmere
   production", and press "Galleys" in the side menu.
3. In "Submission Files", open the menu at the end of the file's row
   (on a press the row `chapter1.pdf`, on a preprint server the galley
   "PDF") and choose "More Information". [On 3.5 a preprint's galley
   menu has no "More Information", which `main` added: go on at step
   7.]
4. In the window "Information Center: …", open "Notes". It reads "There
   are no notes to display.".
5. Leave the "Add Note" box empty and press "Add Note".
6. Open "History".

The submission's notes:

7. Close the window. In the submission's header press "Activity Log".
8. In "Activity Log & Notes", open "Notes". It reads "There are no
   notes to display.".
9. Leave the "Add Note" box empty and press "Add Note".
10. Open "History".

**Expected**: at steps 5 and 9 the note is refused with a message at the
box, and nothing is added to "Notes" or to "History".

**Observed**: at steps 5 and 9 the message "Note posted." appears and
"Notes" lists a note reading only "Daniel Barnes", its date and time
and "Delete", with no text under it. At steps 6 and 10 the top line of
"History" reads "Daniel Barnes" and "Posted new note.". The save the
browser sends carries an empty text and is answered as a success:

```
POST …/$$$call$$$/information-center/file-information-center/save-note?submissionId=4&submissionFileId=17&stageId=1
csrfToken=…&newNote=&submitFormButton=
200, a JSON answer with "status": true and the events "dataChanged" and "noteAdded"
```

Control: with text typed in the box, "Add Note" posts a note with that
text in both windows, and its "Delete" removes it.

## Cause

`PKP\controllers\informationCenter\form\NewNoteForm::__construct()`
(`lib/pkp/controllers/informationCenter/form/NewNoteForm.php`, lines 29
to 35) adds two checks, `FormValidatorPost` and `FormValidatorCSRF`, and
none on the `newNote` field. So `validate()` passes for an empty text,
and `execute()` (from line 108) creates the note: the `Note::create`
call at line 115 takes `'contents' => $this->getData('newNote')`, here
an empty string.

Both windows use this form through a subclass that only names what the
note belongs to: `NewFileNoteForm` in
`FileInformationCenterHandler::saveNote()` and `NewSubmissionNoteForm`
in `SubmissionInformationCenterHandler::saveNote()`. After `validate()`
each handler writes the "Posted new note." log entry and the "Note
posted." notification, so the empty note is logged and announced like
any other.

The browser does not stop the click either. The legacy forms take their
in-browser rules from the form's checks (`FormValidator`'s constructor
fills `$form->cssValidation`, which `FormBuilderVocabulary` turns into
the box's `required` class), and with no check the box has no rule.

Reach:

- A file's "More Information" › "Notes" on a journal and a press, and a
  galley's on a preprint server (walked).
- The submission's "Activity Log & Notes" › "Notes" on all three
  (walked).
- A journal's galley "More Information" on `main` opens the same file
  window (code; not walked).
- A box holding only spaces: `PKPRequest::getUserVars()` trims every
  request value, so it reaches the form as an empty text too (code; not
  walked).
- Stored data: each empty note leaves a row in `notes` with empty `contents`
  and a row in `event_log` (read in the database after the walk).

## Proposed fix

Add the missing check to the shared form, so both windows and both
subclasses are covered
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/add-note-empty-box-posts-empty-note/fix.diff)):

```diff
--- a/lib/pkp/controllers/informationCenter/form/NewNoteForm.php
+++ b/lib/pkp/controllers/informationCenter/form/NewNoteForm.php
@@ -30,6 +30,7 @@
     {
         parent::__construct('controllers/informationCenter/notes.tpl');
 
+        $this->addCheck(new \PKP\form\validation\FormValidator($this, 'newNote', 'required', 'validator.required'));
         $this->addCheck(new \PKP\form\validation\FormValidatorPost($this));
         $this->addCheck(new \PKP\form\validation\FormValidatorCSRF($this));
     }
```

This is how the legacy forms with a message box do it:
`EmailReviewerForm` and `UserEmailForm` both add `'message', 'required',
'email.bodyRequired'`. The discussions API holds the same rule for its
notes (`AddNote::rules()`: `'contents' => ['required', …]`).
`validator.required` ("This field is required.") is an existing text.

The one check acts in the browser and on the server. In the browser the
box gets the `required` class, so "Add Note" on an empty box shows
"This field is required." under it and sends nothing. On the server,
`validate()` fails for an empty text and `saveNote()` stores and logs
nothing.

Tried on `main` on the three apps, the browser half only: with the fix,
"Add Note" with the box empty shows "This field is required." under the
box in both windows, sends no save, and adds nothing to "Notes",
"History" or the database. The control reads the same with the fix and
without: a typed note is posted with "Note posted." and a "Posted new
note." line, and its "Delete" removes it with "Note deleted.".

The server half was read in the code, not exercised: with the fix the
screens send no empty save, and no request was sent by hand.
`FormValidator::isValid()` returns `$fieldValue !== ''` for a required
field, on a value `PKPRequest` has already trimmed.

**Alternatives**

- A `required` attribute in `newNoteForm.tpl` alone: stops the click
  in the browser but leaves the server accepting an empty note.
- A check in each handler's `saveNote()`: two places for one rule, and
  no in-browser rule.

**What goes with it**

- No other instance: `NewNoteForm` is the only legacy form that creates
  a note without a check, and its only subclasses are the two above
  (searched `lib/pkp` and the three apps for `Note::create`, `new
  Note(` and `extends NewNoteForm`).
- When the server check refuses, both `saveNote()` methods answer
  `new JSONMessage(false)` with no text, so the screen would show
  nothing. With the fix in, the browser stops an empty save first, so
  that branch is reached only by a request the screens do not send;
  returning the check's message from it is optional.
- Optional: `required=true` on the `fbvFormSection` in
  `newNoteForm.tpl`, so the label carries the asterisk.
- No repair of stored data.
- Backport: the same line fits 3.5 and 3.4. On 3.3 the class is not
  namespaced (`new FormValidator($this, 'newNote', 'required',
  'validator.required')`); the text exists there too. Not tried on the
  older versions.
- Guard: an e2e scenario on the two "Notes" tabs: an empty box is
  refused, nothing is listed, nothing is added to "History".

Small: one line in the shared form, following the pattern of its
sibling forms, and a test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/add-note-empty-box-posts-empty-note/walk.js)
  with
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/add-note-empty-box-posts-empty-note/lib.js).
  It takes the Steps as `dbarnes` on an install loaded from the default
  dataset (pkp/datasets c657990, 2026-10-01; PostgreSQL), and reads the
  `notes` and `event_log` tables before and after:
  `PROBE_FEATURE=issues-u36d PROBE_AGENT=u36d node bin/probe.js all shared/playwright/checks/issues/add-note-empty-box-posts-empty-note/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` and that line's install for 3.5;
  `MODE=neighbour` in front for the control, which types "Checked
  u36d").
- Walked on `main` and on `stable-3_5_0`, OJS, OMP and OPS, 2026-10-02.
  No request failed and no page script failed in any walk. On 3.5 OPS
  the galley's menu offered "Edit", "Change File" and "Delete" only, so
  steps 3 to 6 were not taken there; steps 7 to 10 showed the fault.
  On `main` OPS both windows showed it.
- Fix trial on `main`, three apps:
  `node bin/try-fix.js apply shared/playwright/checks/issues/add-note-empty-box-posts-empty-note/fix.diff ojs omp ops`,
  the walk, the control, `revert`, the control again. Only the browser
  half of the fix was seen; the server-side refusal was read in the
  code (`FormValidator::isValid()`, both `saveNote()` methods) and not
  exercised, since the screens send no empty save with the fix in.
- Tips walked or read. `main`: OJS b84f8e2e44 (lib/pkp ddd8ab243a,
  ui-library 64d67363), OMP 3b0ecf794 and OPS c8af945bb7 (lib/pkp
  3dc90c81a6, ui-library 280f98c5). `stable-3_5_0`: OJS 091fb65453, OMP
  9c5e24246, OPS 38b61882d3 (lib/pkp cf3f984335, ui-library d4e01883).
  `stable-3_4_0`: lib/pkp 32b0f4b4af. `stable-3_3_0`: lib/pkp
  f6ab331645.
- Code reads. 3.5, 3.4 and 3.3: `NewNoteForm`'s constructor adds the
  same two checks and none on `newNote`, and both `saveNote()` methods
  log and announce after `validate()`
  (`controllers/informationCenter/`, `.inc.php` on 3.3). The file
  window is opened there from the file grids' rows
  (`SubmissionFilesGridRow`, `FileInfoCenterLinkAction`), the
  submission's from the workflow header (`PKPWorkflowHandler`). The
  preprint server's galley grid on 3.4 and 3.3 has no such link, so
  only the submission's window applies there.
- Who sees and deletes, read on `main`: `InformationCenterHandler` and
  `FileInformationCenterHandler` open the file window for managers,
  editors, administrators and assistant roles;
  `SubmissionInformationCenterHandler::authorize()` opens the
  submission's for managers and assigned editors only; neither lists
  the author or reviewer roles. `note.tpl` shows "Delete" when the
  person looking is a manager or an editor (`ROLE_ID_MANAGER`,
  `ROLE_ID_SUB_EDITOR`), whoever wrote the note. Both `saveNote()`
  methods send no email; the only notice is the writer's "Note
  posted.".
- Introduced: `git blame` on the constructor leads to reformatting
  commits; `git log --follow -S addCheck` on the file gives 4e80c07345
  (2016, the CSRF check) and 002fb605a8 (2013, "File informtion center
  to PKP-lib", Jason Nugent), where the form arrives with
  `FormValidatorPost` only. Its earlier history in the apps was not
  read.
- Upstream search, 2026-10-02: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library, issues and PRs, for "empty note", "blank note",
  "Add Note" empty, `NewNoteForm`, `NewFileNoteForm`,
  `NewSubmissionNoteForm`, `saveNote`.
- Not driven: an assistant adding a note (the walks ran as the editor
  `dbarnes`), a journal's galley "More Information", a box of spaces
  only, 3.4 and 3.3, MySQL (nothing here depends on the database).
