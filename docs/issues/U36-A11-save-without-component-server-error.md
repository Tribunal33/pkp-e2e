# An author pressing "Save" with no file component chosen in the submission wizard gets an unexpected error

- **Severity** low
- **Effort** small
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code; saved with no component, no error)
- **Introduced** `pkp/pkp-lib#6292` for `pkp/pkp-lib#6057` · [5f383f87c3](https://github.com/pkp/pkp-lib/commit/5f383f87c30496e3de612aeb1bb2f4f5f80f4629) · 2020-10-19 · Nate Wright (NateWr)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U36 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U36-submission-files.md#a11)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

In the submission wizard's "Upload Files" step, each uploaded file's row
asks "What kind of file is this?" and offers the main component as a
link, and "Other". "Other" and the file's "Edit" open a side panel,
"Edit {file name}", with every component as a radio button. Pressing "Save" there without choosing a component makes the app
fail on the server: "An unexpected error has occurred. Please reload the
page and try again." appears, the panel stays open and nothing is saved.
The author expects to be told to choose a component.

Only the submission wizard has this panel. The editorial workflow's
file "Edit" opens a different form with no component choice, and a
preprint server's "Upload Files" step lists galleys instead.

## Impact

- **Lost.** Nothing. The file stays without a component, as it was,
  and reloading, as the message advises, changes nothing.
- **Who.** Anyone making a submission to a journal or press who opens
  "Other" or a file's "Edit" and presses "Save" before choosing a
  component.
- **Way round.** Choose a component and press "Save" again, or use the
  component link on the file's row. Nothing gets worse with time.

Low: a misleading message on a step the author gets past. It would be
medium if the save failed with a component chosen as well.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main` (for OMP `main`, the press),
  freshly loaded. Nothing else is needed: the author starts a new
  submission of their own.

1. Sign in as `amwandenga` (`aclark` on the press).
2. Type the address `/index.php/publicknowledge/en/submission`; the
   page "Make a Submission" opens [after signing in, a dataset author
   lands on the journal's or press's home page, and the walk went on by
   the address].
3. Choose "English", type the title "u36r7 component", leave the
   section at "Articles" (on the press, choose "Monograph: Authors are
   associated with the book as a whole."), tick "Yes, my submission
   meets all of these requirements." and the privacy consent, and press
   "Begin Submission". The wizard opens on "Upload Files" [3.5: it opens
   on "Details"; press "Continue" once].
4. Press "Add File" and choose a small file, "u36r7-notes.md". Its row
   reads "What kind of file is this?" with "Article Text" and "Other"
   ("Book Manuscript", "Chapter Manuscript" and "Other" on the press).
5. Press "Other" on that row. A side panel titled "Edit u36r7-notes.md"
   opens, with a radio button per component and none chosen.
6. Press "Save".
7. Choose "Research Instrument" ("Prospectus" on the press) and press
   "Save".

**Expected:** at step 6 the panel says that a component must be chosen,
at the radio buttons, and nothing is saved. At step 7 the panel closes
and the row shows the component.

**Observed:** at step 6 the page shows the notice "An unexpected error
has occurred. Please reload the page and try again." The panel stays
open with no message at the radio buttons, and the row still reads
"What kind of file is this?". The save request sent `genreId=0` and
answered 500:

```
POST /index.php/publicknowledge/api/v1/submissions/21/files/46?stageId=1   (X-Http-Method-Override: PUT)
genreId=0
→ 500
```

The server log:

```
production.ERROR: SQLSTATE[23503]: Foreign key violation: 7 ERROR:  insert or update on table "submission_files" violates foreign key constraint "submission_files_genre_id_foreign"
DETAIL:  Key (genre_id)=(0) is not present in table "genres".
```

Step 7 works as expected: the panel closes and the row reads
"u36r7-notes.md Research Instrument". It is still that way after a
reload.

## Cause

The submission file API accepts any `genreId` without checking that the
genre exists. `PKPSubmissionFileController::edit()` (pkp-lib
`api/v1/submissions/PKPSubmissionFileController.php`, line 443) checks
the request with `Repo::submissionFile()->validate()` (line 463), then
saves it with `Repo::submissionFile()->edit()` (line 500).
`PKP\submissionFile\Repository::validate()`
(`classes/submissionFile/Repository.php`, line 127) checks only the
schema's types, the required props, the locales, the uploader and the
`assocType`. So a `genreId` of 0, or of a genre that does not exist,
reaches the database. There the `submission_files_genre_id_foreign` key
refuses it, and the request fails with a 500.

The panel sends 0 whenever nothing is chosen. The edit form,
`PKPSubmissionFileForm` (`classes/components/forms/submission/PKPSubmissionFileForm.php`,
line 47), starts its `genreId` radio at `'value' => 0`. ui-library's
`SubmissionFilesListPanel.vue` `edit()` replaces that value only when
the file already has a genre. The field is not marked required, so the
form posts `genreId=0`.

The legacy upload form, `SubmissionFilesUploadForm::validate()`,
refuses a genre that `GenreDAO::getById($genreId, $contextId)` does not
find, with `submission.upload.noGenre` ("Missing or invalid
component!"). `pkp/pkp-lib#6057` moved the wizard's files to the new
API and panel and left that check behind.

On 3.3 the database had no foreign key on `genre_id`. There the same
save stores the file with genre 0 and shows no error: the panel closes
as if a component had been saved, and the row still asks "What kind of
file is this?". The fault is silent on 3.3, not absent. The key came
with `pkp/pkp-lib#6093`
([b9e93cca93](https://github.com/pkp/pkp-lib/commit/b9e93cca930f570ea88d21bfc1a40ca71a4db32b),
3.4), and from then on the same save fails with a server error.

Reach:

- A file's "Edit" in the same panel, when the file has no component
  yet, opens the same form at 0 (read in the code). A file with a
  component opens with it chosen, and "Save" works (seen on screen).
- The row's component links ("Article Text", "Book Manuscript") send a
  genre from the list and save (seen on screen).
- The editorial workflow's file lists open "Edit" as the legacy "Edit a
  file" form (`ManageFileApiHandler` `editMetadata`,
  `SubmissionFilesMetadataForm`), which has no component field, so it
  does not meet the fault (read in the code).
- The other callers of `validate()` have the same gap: the upload
  (`PKPSubmissionFileController::add()`), the media file routes
  (`MediaFilesController::add()`, `EditMediaFile`), JATS and body text
  (`jats\Repository`, `bodyText\Repository`). The screens behind them
  send either no genre or one picked from the context's own list, so no
  screen reaches the gap through them (read in the code). An API client
  that sends another context's genre id gets it stored, because the key
  only checks that the genre exists (read in the code, not driven).
- OPS has no such panel on any version: `SubmissionHandler::getFilesStep()`
  on `main`, 3.5 and 3.4, and the 3.3 step 2 template, build the step from
  the galley list (read in the code).
- Stored data. A genre id that does not exist, 0 included: nothing to
  repair, since the key refuses it from 3.4 on and the 3.4 upgrade's
  `PreflightCheckMigration` nulled such ids. Another context's genre id:
  not checked on any install; this query lists such files:

  ```sql
  SELECT sf.submission_file_id FROM submission_files sf
  JOIN submissions s ON s.submission_id = sf.submission_id
  JOIN genres g ON g.genre_id = sf.genre_id
  WHERE g.context_id <> s.context_id;
  ```

## Proposed fix

A proposal, tried on `main` as
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/save-without-component-server-error/fix.diff),
applied to OJS and OMP. With the fix, "Save" with no component shows the
page notice "The form was not saved because 1 error(s) were
encountered. Please correct these errors and try again." and "Missing
or invalid component!" at the radio buttons. The request answers 400
`{"genreId":["Missing or invalid component!"]}`, and the panel stays
open. Uploading a file, the row's component link, "Save" with a
component chosen, and changing an existing file's component to another
all saved as before.

Recommended: check the genre where the submission file's props are
validated, in `PKP\submissionFile\Repository::validate()`, the way the
legacy upload form does and with its message:

```diff
+        // Make sure that the genre is one of the submission's context
+        if (isset($props['genreId'])) {
+            $validator->after(function ($validator) use ($object, $props) {
+                if ($validator->errors()->get('genreId')) {
+                    return;
+                }
+                $submissionId = $props['submissionId'] ?? $object?->getData('submissionId');
+                $submission = $submissionId ? Repo::submission()->get((int) $submissionId) : null;
+                /** @var \PKP\submission\GenreDAO $genreDao */
+                $genreDao = DAORegistry::getDAO('GenreDAO');
+                if (!$submission || !$genreDao->getById($props['genreId'], $submission->getData('contextId'))) {
+                    $validator->errors()->add('genreId', __('submission.upload.noGenre'));
+                }
+            });
+        }
```

This covers every caller that goes through `validate()`, and gives the
Vue form a field error it already shows. OJS's
`publication\Repository::validate()` checks `sectionId` against the
context the same way. A `genreId` that is missing or null is left alone,
so the upload, which sends none, is unchanged.

`jats\Repository` and `bodyText\Repository` turn any validation error
into an `Exception`, so a bad genre there still ends in a 500, now with
the check's message rather than the database's. Body text never sends a
genre; a JATS upload passes the request's. Answering 400 there is a
change to how those two report validation errors, left out of this fix.

The check accepts any genre of the context, enabled or not, dependent
or not, as the legacy upload form's rule does. That is intended: media
files store dependent genres (the media uploader offers only those), and
the panel re-sends a file's current genre, which may since have been
disabled. Limiting the wizard's files to enabled, non-dependent genres
would be a separate product decision.

**Alternatives:**

- Mark the radio required in `PKPSubmissionFileForm` (`isRequired`, and
  `value` null instead of 0, because ui-library's `Form.vue`
  `validateRequired()` counts the number 0 as filled). The form then refuses before sending, with "This field is
  required.". That fixes only this form: the API still answers 500 to
  any other client. It is a good addition to the fix, not a
  replacement for it.
- Treat 0 as "no genre" in `edit()`, as `SubmissionFilesUploadForm`
  does when it saves. "Save" then closes the panel with nothing chosen,
  which is the 3.3 behaviour and hides the mistake, and any other id
  that does not exist still fails.

**What goes with it:**

- The API change, on `POST submissions/{submissionId}/files`,
  `PUT submissions/{submissionId}/files/{submissionFileId}`,
  `POST submissions/{submissionId}/publications/{publicationId}/mediaFiles`
  and `PUT …/mediaFiles/{submissionFileId}`: a genre id that does not
  exist now gets a 400 with a `genreId` error instead of a 500, and
  another context's genre id gets the same 400 instead of being stored.
  No screen relies on the old answers.
- Backport: the diff applies as written to `stable-3_5_0` (checked with
  `patch --dry-run`). `stable-3_4_0`'s `validate()` has the same shape
  and the same imports (read in the code).
- Guard: an end-to-end test that presses "Save" with no component and
  expects the field error. A pkp-lib unit test of `validate()` would be
  its first for submission files (`tests/classes/` has none), and since
  the check reads a submission and genres it needs the database
  (`DatabaseTestCase`) with genres of two contexts.

Small: the rule and its message already exist in the legacy form; the
test is the larger part.

## Evidence

- Kept script that takes the Steps on OJS and OMP (it skips OPS) on an
  install loaded from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/save-without-component-server-error/walk.js),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/save-without-component-server-error/walk.js`
  (on `stable-3_5_0` with `PKP_E2E_LINE=stable-3_5_0` in front, as its
  header says). `NEIGHBOUR=1` in front adds the paths the fix must leave
  alone: a second upload, the row's component link, and a changed
  component on a file that has one.
- The walk reached "Make a Submission" by its address. The dataset's
  authors land on the journal's or press's home page after signing in.
- The fix, tried 2026-09-30 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/save-without-component-server-error/fix.diff ojs omp`,
  the dataset reloaded, walk.js with `NEIGHBOUR=1`, then
  `node bin/try-fix.js revert ojs omp`. The neighbour paths were also
  walked without the fix, with the same results.
- Walked 2026-09-30 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`:
  - main: OJS bade233f73 (lib/pkp 2e377d27fc), OMP 3b0ecf794 (lib/pkp
    3dc90c81a6); lib/ui-library 280f98c5 in both.
  - stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00 (lib/pkp a9c76aed62,
    lib/ui-library 1a7a4750). Same result as on `main`, and the form,
    the panel's `edit()` and `validate()` read as on `main`.
  - OPS not walked (no such panel).
  - MySQL not checked. InnoDB enforces the same foreign key, so the
    same failure is expected there.
- 3.4, code: `stable-3_4_0` of OJS (9571d8fde7), OMP (0aec65441),
  pkp-lib (df13621c2d) and ui-library (ee684b34):
  `PKPSubmissionFileForm.php` line 51 `'value' => 0`, the panel's
  `edit()` the same, `PKPSubmissionFileHandler::edit()` validating
  through `Repo::submissionFile()->validate()` with no genre check, and
  `SubmissionFilesMigration.php` with the `genre_id` foreign key. OMP's
  `SubmissionHandler` extends `PKPSubmissionHandler`, which builds the
  panel.
- 3.3, code: `stable-3_3_0` of OJS (9fdb9bcf9a), OMP (8e72fc883),
  pkp-lib (d446601ebe) and ui-library (96959f9e). The same form at 0 in
  `PKPSubmissionSubmitStep2Form`'s panel, and
  `PKPSubmissionFileService::validate()` with no genre check. But
  `SubmissionFilesMigration.inc.php` declares `genre_id` with no foreign
  key, so 0 is stored with no error and the panel closes on the
  success answer. The row still asks, because
  `SubmissionFilesListItem.vue` shows the question while `genreId` is
  falsy. OMP's 3.3 `SubmissionSubmitStep2Form` extends the pkp-lib form
  and its template shows the same panel; OPS's 3.3 step 2 template loads
  the galley grid.
- Introduced: `git log -S PKPSubmissionFileForm` in pkp-lib leads to
  5f383f87c3. That commit added the form with `'value' => 0`, the
  submission file API with its `edit()`, and the service's `validate()`
  without a genre check, in place of the legacy upload form. It was
  merged by `pkp/pkp-lib#6292` (merge 079e8ca156, 2020-11-13).
- Upstream search 2026-09-30, in pkp/pkp-lib, pkp/ojs, pkp/omp and
  pkp/ui-library, for "What kind of file is this", genre not selected,
  file component save error, `submission_files_genre_id_foreign`,
  genre_id foreign key violation, `SubmissionFileForm` and
  `SubmissionFilesListPanel` genre: nothing about this fault.
  `pkp/pkp-lib#6741` (closed) was about the panel showing an upload's
  validation errors. `pkp/pkp-lib#12276` (open) is a Native XML import
  failing on a submission file key.
