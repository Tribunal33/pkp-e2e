# Pressing "Add Note" with nothing typed posts an empty note on a submission or a file

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code: read, not walked)
  - 3.3: OJS, OMP, OPS (code: read, not walked)
- **Introduced** not traced; present since at least [a35065462a](https://github.com/pkp/omp/commit/a35065462a7cbf6afe22381e4527e2a82d3def1d) (2010-05-17)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U36 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U36-submission-files.md#a10), spec U38 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U38-submission-activity-log-and-notes.md#a2)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

Notes can be written in two places: the "Notes" tab of a submission's
"Activity Log & Notes" window, and the "Notes" tab of a file's "More
Information" window. In both, pressing "Add Note" with the box empty
posts a note with no text. The page shows "Note posted.", the list
gains a note with only the writer's name, the date and "Delete", and
the window's "History" tab gains "Posted new note.". The writer
expects to be told to type a note. A box holding only spaces posts the
same empty note.

## Impact

- **Lost.** Nothing. An empty note and a "Posted new note." line are
  added to the record. Posting a note notifies nobody but the writer
  (the "Note posted." notice) and sends no email. Everyone who opens
  the same tab later sees the empty note.
- **Who.** In the submission's window: the Journal, Press or Preprint
  Server Manager, the editors and section editors, and a Site
  Administrator. In a file's window, the same roles, and also the
  Copyeditor, Layout Editor, Proofreader and other assistant roles
  assigned to the file's stage. Authors and reviewers are never offered
  either window.
- **Way round.** Delete the empty note with its "Delete". The
  "Posted new note." line stays in "History" after the note is
  deleted. Nothing gets worse with time.

Low: the real note can still be typed and posted afterwards.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, freshly loaded, in any of the
  three apps. Nothing else is needed. The submissions used are OJS 4,
  "Computer Skill Requirements for New and Existing Teachers:
  Implications for Policy and Practice"; OMP 3, "The Political Economy
  of Workplace Injury in Canada"; OPS 1, "The influence of lactation on
  the quantity and quality of cashmere production".

The submission's notes:

1. Sign in as `dbarnes`.
2. Open the submission
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=4`;
   3 on the press, 1 on the preprint server).
3. Press "Activity Log" in the header. The window "Activity Log &
   Notes" opens on "History".
4. Open "Notes". It reads "There are no notes to display."
5. Leave the "Add Note" box empty and press "Add Note".
6. Open "History".

A file's notes:

7. Close the window. On the journal and the press, in "Submission
   Files", press the "More Actions" button on the file's row
   ("Computer Skill Requirements … Practice.pdf"; "chapter1.pdf" on
   the press) and choose "More Information". On the preprint server,
   open "Galleys" under "Preprint" in the side menu, and choose "More
   Information" in the "PDF" row's menu [3.5: that menu offers only
   "Edit", "Change File" and "Delete", so steps 7 to 10 do not apply
   to a preprint server there].
8. Open "Notes" in the window "Information Center: {file name}"
   [on the preprint server the title carries the galley's label:
   "Information Center: PDF"]. It reads "There are no notes to
   display."
9. Leave the box empty and press "Add Note".
10. Open "History".

**Expected:** at steps 5 and 9 the note is refused with "This field is
required." at the box. A box holding only spaces is refused too, with
the page notice "This field is required.". Either way no note is added
and "History" gains nothing.

**Observed:** at steps 5 and 9 the notice "Note posted." appears and
the list shows one note reading only "Daniel Barnes 2026-09-30 11:01
PM" and "Delete", with no text. At steps 6 and 10 the top line of
"History" reads "2026-09-30", "Daniel Barnes", "Posted new note.". The
save answered success:

```
POST /index.php/publicknowledge/$$$call$$$/information-center/submission-information-center/save-note?submissionId=4
→ 200 {"status":true,"content":"", … "events":[{"name":"dataChanged"},{"name":"noteAdded", …}]}
```

The file's window sends the same request to
`…/file-information-center/save-note` with the same answer, and the
`notes` table holds a row with empty `contents` for each. Typing three
spaces and pressing "Add Note" gives the same empty note, since the
request trims the text before it is stored. A note with text posts and
shows as expected.

## Cause

The shared note form has no check on the note text.
`PKP\controllers\informationCenter\form\NewNoteForm` (pkp-lib
`controllers/informationCenter/form/NewNoteForm.php`) adds only
`FormValidatorPost` and `FormValidatorCSRF` in its constructor (lines
33–34). `readInputData()` reads `newNote`, and `execute()` stores it
with `Note::create()` whatever it holds. So in
`SubmissionInformationCenterHandler::saveNote()` and
`FileInformationCenterHandler::saveNote()`, `$notesForm->validate()`
passes for any POST with a valid CSRF token, and the handler writes the note,
logs `SUBMISSION_LOG_NOTE_POSTED` ("Posted new note.") and raises
"Note posted.".

No version of the note form that could be read checks the text. In
OMP, `InformationCenterNotesForm` in
[a35065462a](https://github.com/pkp/omp/commit/a35065462a7cbf6afe22381e4527e2a82d3def1d)
(2010-05-17, the first commit with it under `controllers/`) adds only
`FormValidatorPost`. `NewNoteForm` replaced it in
[3eac28363b](https://github.com/pkp/omp/commit/3eac28363b3eb8b2bc1ebe301d94ceb1373696a6)
(2011, "Refactor information center") with the same single check, and
moved to pkp-lib unchanged in
[002fb605a8](https://github.com/pkp/pkp-lib/commit/002fb605a8ec5627b717dccf81fbc887a6baf52f)
(2013). The template's `{fbvElement type="textarea" id="newNote"}` was
never marked required. The form's history before a35065462a was not
followed.

Reach:

- Both subclasses, `NewSubmissionNoteForm` (the "Activity Log & Notes"
  window) and `NewFileNoteForm` (a file's or galley's "More
  Information"), inherit the gap. They are the only subclasses in
  pkp-lib and the three apps.
- Posting a note notifies only the writer: `saveNote()` creates a
  one-off notice for the current user and an event log entry, and sends
  no email (read in the code).
- Discussions are not affected. Their messages go through the tasks
  API, whose `AddNote` request requires `contents` (read in the code).
- Stored data: empty notes already posted stay in the list until
  someone deletes them. Nothing reads a note's text but the list, so no
  repair is needed.

## Proposed fix

A proposal, tried on `main` as
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/empty-note-posted/fix.diff),
applied to OJS, OMP and OPS. With the fix, "Add Note" with the box
empty sends nothing: the box is marked and "This field is required."
shows under it, in both windows. A box holding only spaces passes the
page's own check, since that check does not trim. The server refuses
it, and the page notice "This field is required." appears. Neither adds
a note or a "History" line. A note with text posts with "Note posted."
as before.

Recommended: make the text required in `NewNoteForm`, the base class
both note windows share, with the form validator every legacy form
uses:

```diff
         parent::__construct('controllers/informationCenter/notes.tpl');

+        $this->addCheck(new \PKP\form\validation\FormValidator($this, 'newNote', 'required', 'validator.required'));
         $this->addCheck(new \PKP\form\validation\FormValidatorPost($this));
```

`FormValidator` also registers the field in `cssValidation`, so the
form builder gives the text box the `required` class and the page's
form script refuses an empty box before sending. The server check trims the value, so it also
refuses a box of spaces. `UserEmailForm` and the other legacy forms
make their required text fields required the same way. The message
reuses the existing key `validator.required` ("This field is
required."), so no new string needs translating.

**Alternatives:**

- `required=true` on the `fbvElement` in `newNoteForm.tpl` alone. This
  stops the empty box on screen, but a box of spaces, or any request
  sent without the page's script, still posts an empty note.
- A check in each handler's `saveNote()`. That puts the rule in two
  places instead of in the form that owns the field.

**What goes with it:**

- The handlers stay as they are. A refused note answers
  `{"status":false}`, as a failed check always has in `saveNote()`, and
  `Form::validate()` raises the page notice with the field's message.
  Most pkp-lib grid handlers answer a failed `validate()` the same way
  (`GenreGridHandler`, `AnnouncementTypeGridHandler`,
  `NavigationMenuItemsGridHandler`, the `Manage*FilesGridHandler`s), and
  rely on the page's own check for the message at the field. Sending the
  form back with its error (`new JSONMessage(true, $notesForm->fetch($request))`,
  as `UserGroupGridHandler` does) would put the message at the box for
  a box of spaces too. It is not recommended here: the note form fetches
  `notes.tpl`, the whole tab with the note list, which would replace the
  form element alone.
- Backport: the diff applies as written to `stable-3_5_0` and
  `stable-3_4_0` (checked with `patch --dry-run`). On `stable-3_3_0`
  the file is `NewNoteForm.inc.php`, and the added line names the
  validator without its namespace (`new FormValidator(...)`, as
  `FormValidatorPost` is named there). The key is in
  `locale/en_US/common.po` there.
- Guard: an end-to-end check that presses "Add Note" with the box empty
  in each window and expects the message and no new note. A pkp-lib
  unit test would need a request that passes the POST and CSRF checks
  too.

Small: one line in one shared class, and a test.

## Evidence

- Kept script, which takes the Steps and then tries two more inputs in
  both windows (a box of three spaces, then a note with text), on an
  install loaded from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/empty-note-posted/walk.js),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/empty-note-posted/walk.js`
  (on `stable-3_5_0` with `PKP_E2E_LINE=stable-3_5_0` in front).
- The fix, tried 2026-09-30 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/empty-note-posted/fix.diff ojs omp ops`,
  the dataset reloaded, walk.js, then
  `node bin/try-fix.js revert ojs omp ops`. Without the fix, the three
  spaces posted a second empty note, and the note with text posted
  normally. With the fix, the spaces were refused, and the note with
  text posted normally. No request failed and no page script failed in either
  walk.
- Walked 2026-09-30 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`:
  - main: OJS bade233f73 (lib/pkp 2e377d27fc), OMP 3b0ecf794 and OPS
    c8af945bb7 (lib/pkp 3dc90c81a6). `NewNoteForm` is the same in both
    lib/pkp commits.
  - stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00, OPS cf4fce69bd (lib/pkp
    a9c76aed62). The same results as on `main` in both windows on OJS
    and OMP and in the submission's window on OPS. `NewNoteForm`, the
    template and both `saveNote()` handlers read as on `main`.
  - Not database-dependent: no column length, type or ordering is
    involved. MySQL not checked.
- 3.4, code: pkp-lib `stable-3_4_0` (df13621c2d),
  `controllers/informationCenter/form/NewNoteForm.php` (the same two
  checks, lines 34–35), `templates/controllers/informationCenter/newNoteForm.tpl`
  (the box not required), and both handlers' `saveNote()`. The
  workflow's "Activity Log" link to `SubmissionInformationCenterHandler`
  is built in pkp-lib's `PKPWorkflowHandler` for all three apps (OJS
  9571d8fde7, OMP 0aec65441, OPS acd8ae704b).
- 3.3, code: pkp-lib `stable-3_3_0` (d446601ebe),
  `controllers/informationCenter/form/NewNoteForm.inc.php` (only
  `FormValidatorPost` and `FormValidatorCSRF`), the same template and
  handlers, and `PKPWorkflowHandler.inc.php` for all three apps (OJS
  9fdb9bcf9a, OMP 8e72fc883, OPS c5532e2161). Which 3.4 and 3.3 file
  lists and galley lists offer "More Information" was not checked. The
  submission's window is enough to count all three apps as affected on
  both versions.
- Introduced: `git log --follow` and `git blame` on pkp-lib's
  `NewNoteForm.php` lead to the move from OMP in 002fb605a8 (2013). In
  OMP, `NewNoteForm.inc.php` was added by 3eac28363b (2011-01-12, "Refactor
  information center"), and its predecessor `InformationCenterNotesForm`
  checked only the POST at the parent commit and in a35065462a
  (2010-05-17), the oldest version read. `git log -S` finds no `newNote`
  check ever added or removed in either repository.
- The fix is the one tried; it did not change after the trial.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library
  searched 2026-09-30 for "empty note", "blank note", "add note" empty,
  "information center" note, `NewNoteForm` and `saveNote`. The nearest
  candidates were other faults: `pkp/pkp-lib#756` (an error notice
  after correcting an empty discussion note) and
  `pkp/pkp-lib#2838` (a fatal error adding a note, 2017).
- Unverified: whether an empty note shows differently in any other
  place that lists notes (none found in the code).
