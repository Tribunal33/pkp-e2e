# Submission wizard: "Save" in a file's "Edit" panel with no component chosen shows "An unexpected error has occurred"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: none (code; no foreign key there)
- **Introduced** the unchecked save, which 3.3 stores silently: `pkp/pkp-lib#6292` for `pkp/pkp-lib#6057` · [5f383f87c3](https://github.com/pkp/pkp-lib/commit/5f383f87c30496e3de612aeb1bb2f4f5f80f4629) · 2020-10-19 · Nate Wright (NateWr). The server error, from 3.4 on: `pkp/pkp-lib#8296` for `pkp/pkp-lib#6093` · [b9e93cca93](https://github.com/pkp/pkp-lib/commit/b9e93cca930f570ea88d21bfc1a40ca71a4db32b) · 2022-09-27 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U36 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U36-submission-files.md#a11)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

The app fails on the server when an author, in the submission wizard's
"Upload Files" step, presses "Other" on a file's row and then "Save" in
the "Edit {file name}" panel without choosing a component. The notice
"An unexpected error has occurred. Please reload the page and try
again." appears, the panel stays open and nothing is saved. The author
expects a message asking for a component, or no save until one is
chosen.

The file stays in the list without a component, and reloading the page,
as the notice advises, changes nothing.

Every file an author adds on "Upload Files" starts without a component,
unless the journal or press has only one component enabled, which is
then filled in. A preprint server has no such panel.

## Impact

- **Lost**: nothing. The author is told of an error but not what to do,
  and each such "Save" writes a database error to the server's log.
- **Who**: any author (or editor submitting) on a journal or a press
  with more than one component, which every install has by default.
  They meet it by pressing "Save" in the panel before choosing a
  component; the panel opens with none chosen.
- **Way round**: choose a component in the panel and press "Save", or
  close the panel and press a component's name on the file's row.

Low: the task gets done once a component is chosen; the fault is a
server error where a message should ask for one.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS (the journal
  `publicknowledge`) or OMP (the press `publicknowledge`).
- Any small file on your computer; the steps call it `u36a-notes.txt`.

Steps:

1. Sign in as the author `ccorino` (password `ccorinoccorino`) on OJS,
   or `aclark` (`aclarkaclark`) on OMP.
2. Open "Make a Submission"
   (`/index.php/publicknowledge/en/submission`). Choose "English" under
   "Submission Language", type the title "u36a no component", choose
   "Articles" under "Section" (on a press, "Monograph" under "Submission
   Type"), tick "Yes, my submission meets all of these requirements."
   and "Yes, I agree to have my data collected and stored according to
   the privacy statement.", and press "Begin Submission". [On 3.5 the
   wizard opens on "Details": press "Continue" in the footer to reach
   "Upload Files".]
3. On "Upload Files", press "Add File" and pick `u36a-notes.txt`. Its
   row reads "What kind of file is this?" with the links "Article Text"
   and "Other" ("Book Manuscript", "Chapter Manuscript" and "Other" on a
   press).
4. Press "Other" on the row. A side panel "Edit u36a-notes.txt" opens
   with "What kind of file is this?", the hint "Choose the option that
   best describes this file." and one radio button per component, none
   chosen.
5. Press "Save" without choosing a radio button.

**Expected**: the panel asks for a component under "What kind of file is
this?", or "Save" does nothing until one is chosen. No request fails.

**Observed**: the notice "An unexpected error has occurred. Please
reload the page and try again." appears. The panel stays open and shows
no message of its own. After a reload the row still reads "What kind of
file is this?". The save answers 500, and the server log carries the
same error line:

```
PUT /index.php/publicknowledge/api/v1/submissions/21/files/46?stageId=1   (sent as POST with X-Http-Method-Override: PUT)
genreId=0

500 {"error":"SQLSTATE[23503]: Foreign key violation: 7 ERROR: insert or update on table \"submission_files\" violates foreign key constraint \"submission_files_genre_id_foreign\"\nDETAIL: Key (genre_id)=(0) is not present in table \"genres\". …"}
```

The "Edit" button on the same row opens the same panel (both emit the
same `edit` event in `SubmissionFilesListItem.vue`); the walk took
"Other" only.

Control: in the same panel, choosing "Research Instrument" ("Prospectus"
on a press) and pressing "Save" closes the panel, and the row shows the
component as a badge.

## Cause

The submission file API stores a `genreId` without checking that it is a
genre. `PKP\submissionFile\Repository::validate()`
(`lib/pkp/classes/submissionFile/Repository.php`) runs the schema's
rules, and `schemas/submissionFile.json` only says `genreId` is an
integer. `PKPSubmissionFileController::edit()` then calls
`Repository::edit()`, whose `$this->dao->update()` writes `genre_id = 0`.
The database refuses it, because `submission_files.genre_id` is a
foreign key to `genres`. The route runner's `catch (Throwable
$exception)` in `PKP\handler\APIHandler`
(`lib/pkp/classes/handler/APIHandler.php`) turns the exception into the
500 whose `error` is the exception's message. That catch-all is shared
by every API route and is not this report's subject.

The 0 comes from the panel's form. `PKPSubmissionFileForm`
(`lib/pkp/classes/components/forms/submission/PKPSubmissionFileForm.php`,
line 47) gives its `genreId` radio field `'value' => 0`, which matches no
option. `SubmissionFilesListPanel.vue` `edit()` replaces that value only
when the file has a component (`item[field.name] != null`). So for a
file without one, "Save" sends `genreId=0`.

The form and the API came with the submission files refactor
(`pkp/pkp-lib#6057`, 2020), which already sent the 0 and stored it
unchecked. The foreign key came in 3.4 (`pkp/pkp-lib#6093`), whose
upgrade also sets to null every `genre_id` that matches no genre. From
then on the unchecked 0 is a server error.

Reach:

- The submission wizard's "Edit {file name}" panel on OJS and OMP, for a
  file with no component (on screen, `main` and 3.5). It is the only
  user of `PKPSubmissionFileForm` (`PKPSubmissionHandler`, checked in
  the code).
- How a file gets no component: the wizard's upload sends no `genreId`,
  and `PKPSubmissionFileController::add()` fills an empty one only when
  the context has exactly one enabled genre. The default dataset's
  journal and press have nine and thirteen in the panel (on screen).
- Any API client. `PUT …/submissions/{id}/files/{fileId}` with a
  `genreId` that is no genre answers 500 instead of 400. `POST
  …/files` does the same for a non-zero one; a 0 or empty one is filled
  by `add()` in a one-genre context and otherwise fails like the `PUT`.
  `MediaFilesController`, `EditMediaFile`, `jats\Repository` and
  `bodyText\Repository` call the same `validate()`, so the fix covers
  them (checked in the code, not driven).

## Proposed fix

Check the genre in `Repository::validate()`, the place every caller
passes through, so a `genreId` that is not one of the context's genres
is refused with a message on the field. A file sent with no `genreId`
is left alone. The legacy upload form already
makes this check, with the same DAO call and the same message
(`SubmissionFilesUploadForm::validate()`, `GenreDAO::getById($genreId,
$context->getId())`, `submission.upload.noGenre`). The diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-file-edit-save-no-component-server-error/fix.diff):

```diff
--- a/lib/pkp/classes/submissionFile/Repository.php
+++ b/lib/pkp/classes/submissionFile/Repository.php
@@ -42,6 +42,7 @@
 use PKP\security\Validation;
 use PKP\services\PKPSchemaService;
 use PKP\stageAssignment\StageAssignment;
+use PKP\submission\GenreDAO;
 use PKP\submission\reviewRound\ReviewRoundDAO;
 use PKP\submissionFile\exceptions\UnableToCreateFileContentException;
 use PKP\submissionFile\maps\Schema;
@@ -174,6 +175,19 @@
                             'createdAt',
                             __('api.files.400.notAllowedCreatedAt')
                         );
+                }
+            });
+        }
+
+        // Make sure that a genre is one of the context's genres
+        if (isset($props['genreId'])) {
+            $validator->after(function ($validator) use ($props) {
+                if ($validator->errors()->get('genreId')) {
+                    return;
+                }
+                $genreDao = DAORegistry::getDAO('GenreDAO'); /** @var GenreDAO $genreDao */
+                if (!$genreDao->getById($props['genreId'], $this->request->getContext()?->getId())) {
+                    $validator->errors()->add('genreId', __('submission.upload.noGenre'));
                 }
             });
         }
```

Tried on `main`, OJS and OMP: step 5 now answers 400, the panel shows
"Missing or invalid component!" under "What kind of file is this?" with
the form's "Please correct one error.", and no server error is logged.
Four saves behaved the same with the fix applied and after it was
reverted: a file added with no component is stored, the row's component
link saves, "Other" with a component chosen saves, and "Edit" with
another component chosen changes it.

**Alternatives**

- Changing the form's `'value' => 0` to `null` alone. Read in the code,
  not tried: `convertStringsToSchema()` turns the empty value into null,
  so the API is expected to store null and answer 200, and the panel to
  close having saved nothing. Any other client would still get the 500.
- Disabling "Save" in the panel until a component is chosen: a change to
  the shared form component for one form, and the API stays unchecked.

**What goes with it**

- What the check accepts: any genre of the request's context, a
  disabled or a dependent one included (`GenreDAO::getById()` filters by
  neither), and it refuses an id outside that context. The legacy form
  does the same; narrowing it to the genres the panel offers is the
  team's call. With no request context (a command-line tool),
  `getById()` matches by id alone.
- A friendlier text than "Missing or invalid component!" for this panel
  ("Choose a component.") is the team's call.
- No stored data to repair on 3.4 and later.
- Backport: `fix.diff` applies to 3.5 (checked with `git apply
  --check`, not walked). On 3.4 the check itself carries over unchanged,
  but the import hunk does not apply (the neighbouring `use` lines
  differ there) and the `use PKP\submission\GenreDAO;` line is placed
  by hand.
- Guard: pkp-lib has no test for this repository yet; a new
  `lib/pkp/tests/classes/submissionFile/RepositoryTest.php` calling
  `validate()` with `genreId` 0 would have caught it. This campaign's
  own e2e scenario is a **Planned** item in spec U36.

Small: one check in the shared repository, following the legacy upload
form, and a unit test.

## Evidence

- The script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-file-edit-save-no-component-server-error/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-file-edit-save-no-component-server-error/lib.js))
  takes steps 1–5 on OJS and OMP, then reloads and reads the row and the
  file's stored `genre_id`. With `MODE=neighbour` it takes the four
  saves a fix must leave alone. At step 2 it takes the first choice of
  each unanswered radio group, which the Steps name. Each run starts from an install freshly
  loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/wizard-file-edit-save-no-component-server-error/walk.js`
  (`MODE=neighbour` in front for the neighbour check,
  `PKP_E2E_LINE=stable-3_5_0` for 3.5).
- The walks ran in Chromium on PostgreSQL; MySQL not checked (it has the
  same foreign key). Datasets: pkp/datasets c657990 (2026-10-01). On
  `main` and 3.5, OJS and OMP both sent `genreId=0`, got 500 with the
  foreign key violation, showed the notice and kept the panel open; the
  stored `genre_id` stayed null. The script generates `u36a-notes.txt`.
- OPS was not walked: its wizard's "Upload Files" step holds a galley
  table instead of the panel.
- Branch tips. `main`: OJS b84f8e2e44, OMP 3b0ecf794; pkp-lib ddd8ab243a
  (OJS) and 3dc90c81a6 (OMP); ui-library 64d67363 (OJS) and 280f98c5
  (OMP). 3.5: OJS 091fb65453, OMP 9c5e24246; pkp-lib cf3f984335;
  ui-library d4e01883. 3.4: OJS 75cc2d488b, OMP 0aec65441; pkp-lib
  32b0f4b4af. 3.3: OJS ac77c9fb35, OMP 8e72fc883; pkp-lib f6ab331645.
- Code reads. 3.5: `PKPSubmissionFileForm.php` (`'value' => 0`),
  `submissionFile/Repository.php` (no genre check) and
  `SubmissionFilesMigration.php` (the foreign key), as on `main`. 3.4:
  the same three files, with the form built in
  `pages/submission/PKPSubmissionHandler.php` and the edit in
  `api/v1/submissions/PKPSubmissionFileHandler.php`. 3.3: the form has
  the same 0 and is built by `PKPSubmissionSubmitStep2Form`;
  `PKPSubmissionFileService::validate()` has no genre check and
  `SubmissionFilesMigration.inc.php` declares `genre_id` with no foreign
  key, so the 0 is stored and no error is raised.
- Introduced: `PKPSubmissionFileForm`'s `'value' => 0` and the API's
  validation both date from 5f383f87c3 (the blame's e3f570bc37 only
  reformatted the form); `git log -S"foreign('genre_id')"` on the
  migrations leads to b9e93cca93 for `submission_files`.
- Upstream searches (pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ui-library):
  the constraint's name, "genre_id foreign key", `PKPSubmissionFileForm`,
  "What kind of file is this", "genreId validation" and the symptom's
  words. `pkp/pkp-lib#6741` (closed) is about showing a plugin's
  validation errors on upload, not this fault.
- Not driven: the "Edit" button on a file without a component, a client
  other than the panel, and the `null` alternative.
