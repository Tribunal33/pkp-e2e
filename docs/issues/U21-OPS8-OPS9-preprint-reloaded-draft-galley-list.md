# On a reopened preprint draft, Review says no files were uploaded and a further galley's upload gets stuck

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** script
- **Affects**
  - main: OPS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code; older form-by-form wizard)
- **Introduced** issue `pkp/pkp-lib#13003`, in commits from PR `pkp/pkp-lib#13179` pushed straight to main · [c6babb5dbe](https://github.com/pkp/pkp-lib/commit/c6babb5dbecf73a7528c8ef3bad1761bcc7f5987) · 2026-08-27 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U21 [OPS8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#ops8), [OPS9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#ops9)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An author opens the submission wizard on a preprint draft that already
has a galley, either resumed after "Save for Later" or just reloaded.
From that page load on, the Review step's "Files" panel reads "No files
have been uploaded for this submission.", although "Upload Files" lists
the galley and "Submit" is enabled.

On the same page, adding a further galley breaks the page's own script
in the browser. The "Add File" window, where the author typed the
galley's label, stays open under "Upload a File Ready for Publication".
After the author picks the file, that window stops at a blank "2. Review
Details" step that cannot be continued. Cancelling it leaves the new
galley listed without a file.

What is stored is complete: the new galley, its label and language, and
its file under the file's own name. A reload shows it with its file. A
moderator gets the submission with every galley the author added.
Galleys uploaded before the draft's first reload show normally.

## Impact

- **Lost**: nothing. The author is told their files are missing, by the
  stuck window and on "Review", their last look before submitting. The
  second file also keeps the name it had on the author's computer,
  because the window never reaches the step where it would be named.
- **Who**: every author on a preprint server who reopens or reloads a
  draft that has a galley, and then opens "Review" or adds another
  galley (a supplementary file next to the main one).
- **Way round**: "Cancel" closes the stuck window, and a reload shows
  the galley with its file. "Submit" works whatever "Review" says.
  Nothing on screen tells the author either of these.

Medium: the screen meant to confirm the files tells the author they are
missing, and the way round is one the author has to find alone. Galleys
lost from the submission would raise it.

## Steps to reproduce

Preconditions:

- The default dataset, OPS `main`.
- Two files on the author's computer: a PDF and an HTML file.

Steps:

1. Sign in as `ccorino` (an author on "Public Knowledge Preprint Server").
2. Open "Make a Submission" (`/index.php/publicknowledge/en/submission`),
   type the title "u21ir27 Galley list", choose the Submission language
   "English", tick the requirement boxes and press "Begin Submission".
   [3.5: the wizard opens on "Details"; "Continue" once reaches "Upload
   Files".]
3. On "Upload Files", press "Add File". In the "Add File" window type the
   Galley Label "PDF" and press "Save".
4. In "Upload a File Ready for Publication", choose the Preprint
   Component "Preprint Text", choose the PDF, then "Continue",
   "Continue", "Complete". The "Files" list shows "PDF".
5. Reload the page.
6. Press "Continue" until "Review" opens, and read the "Files" panel.
7. Press the "Files" panel's "Edit", then "Add File". Type the Galley
   Label "HTML" and press "Save".
8. Choose the Preprint Component "Preprint Text", choose the HTML file,
   press "Continue".
9. Press "Cancel" in "Upload a File Ready for Publication", then "Cancel"
   in the "Add File" window. Read the "Files" list, reload, and read it
   again.

**Expected**: at step 6 the "Files" panel lists "PDF" with its "Preprint
Text" badge. At step 7 the "Add File" window closes and "Upload a File
Ready for Publication" opens. At step 8 "2. Review Details" shows the
file's name, and "Continue", "Continue", "Complete" finish the upload,
after which "Files" lists "PDF" and "HTML" and "Review" lists both.

**Observed**: at step 6 the "Files" panel reads

```
No files have been uploaded for this submission.
```

with "Submit" enabled. At step 7 the "Add File" window stays open under
the upload window, and the browser logs

```
this.galleys.push is not a function
```

At step 8 the file is accepted, then

```
this.galleys.map is not a function
```

and "2. Review Details" stays blank with "Continue" greyed. At step 9 the
"Files" list shows "HTML" as plain text, without a file link. After the
reload "HTML" links to "preprint.html", and "Review" still reads "No
files have been uploaded for this submission.".

The wizard page carries the draft's galleys as `"galleys":[]` on a new
draft and as `"galleys":{"21":{…}}`, keyed by galley id, once the draft
has one.

Control: at step 4, before any reload, the first galley uploads and
lists normally. On `stable-3_5_0` the same steps give the Expected.

## Cause

OPS's `SubmissionHandler::getFilesStep()` (`pages/submission/SubmissionHandler.php`,
lines 169–179) writes the draft's galleys into the wizard's page state:

```php
$templateMgr->setState([
    'galleys' => Repo::galley()
        ->getSchemaMap($submission, $publication, $genres)
        ->mapMany($galleys)
]);
```

`$galleys` comes from `Repo::galley()->getCollector()->getMany()`. Since
c6babb5dbe that is `EntityDAO::getMany()`, which yields each entity
keyed by its primary key (`yield $row->{$this->primaryKeyColumn} => …`),
and `mapMany()` keeps the keys. Before it, the galley DAO had its own
`getMany()`, whose `yield $row->galley_id = $this->fromRow($row);` (an
assignment, not `=>`) yielded no key, so the list arrived as an array.

`SubmissionWizardPageOPS.vue` (ui-library) expects an array. Its
`pkp.eventBus` listeners call `this.galleys.push()` (`addGalley()`),
`this.galleys.map()` (`editGalley()`, `setSubmissionFile()`) and
`this.galleys.filter()` (`deleteGalley()`). The legacy JavaScript emits
those events synchronously from its success path, and `tiny-emitter`
does not catch a listener's error:

- `Handler.handleJson()` (`lib/pkp/js/classes/Handler.js`, line 382)
  emits the server's global events.
- `AjaxFormHandler.handleResponse()` (`lib/pkp/js/controllers/form/AjaxFormHandler.js`)
  calls it on line 121, before `formSubmitted` on line 129, which closes
  the "Add File" window.
- `FileUploadFormHandler.handleUploadResponse()` calls it on line 203,
  before `fileUploaded` on line 210. So the upload wizard never records
  the uploaded file (`uploadedFile_`), which its later steps need
  (`FileUploadWizardHandler.js`, line 133), and its "Cancel" deletes the
  file only when it has that record (line 261).

`templates/submission/review-galleys.tpl` tests `galleys.length`, which
an object does not have, so "Review" shows `author.submit.noFiles` and
no list.

Reach (every listener of the component throws on the object):

- `galley:added`, sent when the "Add File" window saves: on screen.
- `submissionFile:added`, sent when the upload stores the file
  (`FileUploadWizardHandler.php`, line 494): on screen.
- `galley:edited`, sent when a galley's "Settings" or identifiers are
  saved (`PreprintGalleyGridHandler.php`, lines 277, 302, 449): code.
- `galley:deleted`, sent when a galley is deleted
  (`PreprintGalleyGridHandler.php`, line 357): code.
- `submissionFile:edited`, sent when the upload wizard saves the file's
  details (`FileUploadWizardHandler.php`, line 537): code.
- The galleys of a publication in the REST API and the workflow:
  `classes/publication/maps/Schema.php` already calls `->values()`
  (code, OJS and OPS).
- No other page state or list panel in OJS, OMP, OPS or pkp-lib passes a
  `getMany()` collection to the browser without `->values()` (code:
  every `mapMany()` and `summarizeMany()` under `pages/`, `controllers/`
  and `classes/components/`).

## Proposed fix

Proposed: add `->values()` where the handler writes the state.

```diff
--- a/pages/submission/SubmissionHandler.php
+++ b/pages/submission/SubmissionHandler.php
@@ -176,6 +176,7 @@
             'galleys' => Repo::galley()
                 ->getSchemaMap($submission, $publication, $genres)
                 ->mapMany($galleys)
+                ->values()
         ]);
```

([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-reloaded-draft-galley-list/fix.diff),
OPS only.) The other page states and list panels built from a
`getMany()` collection already do this: `PKPSubmissionHandler`'s
submission files, the publication schema map's galleys, and the
announcement, institution and highlight list panels. The follow-up
82412b34e4 under the same issue fixed the same mistake at the writer
too, adding `array_values()` in `ReviewRoundAuthorResponseResource`.

Tried on OPS `main`: with the fix, the reloaded draft's "Review" lists
"PDF Preprint Text", the "HTML" galley uploads through "Complete" with
no page error, and "Review" then lists both. A draft with no galley
still reads "No files have been uploaded for this submission.", with
the fix in and out.

**Alternatives**:

- Restore positional keys in the galley DAO, as a7c80f0bce ("Do not
  yield by ID with email templates") did for the email templates. That
  override exists because "not all email templates have keys", so they
  cannot be keyed by id. Every galley has an id, and the id keys are now
  relied on: the publication DAO's batch cache groups galleys with
  `groupBy(…, true)`, keeping those keys, so a publication's `galleys`
  are keyed by galley id by design (`classes/publication/DAO.php`, OJS
  and OPS). Undoing that for one JSON writer would reach every galley
  caller.
- Make `SubmissionWizardPageOPS.vue` accept an object
  (`Object.values()` in `data()`): a guard at the reader. The state
  would still have the wrong shape, `review-galleys.tpl` would need its
  own guard, and it needs a ui-library build in OPS.

**What goes with it**:

- No stored data is wrong: the state is built on each page load.
- No backport: `stable-3_5_0` and `stable-3_4_0` still have the galley
  DAO's own `getMany()`, so their list is an array.
- Guard: an e2e scenario in U21, a draft reloaded with a galley,
  checking that "Review" lists it and that a second galley uploads.

Small: one line in OPS's wizard handler, and an e2e check.

## Evidence

- Script that takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-reloaded-draft-galley-list/walk.js),
  with [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-reloaded-draft-galley-list/lib.js),
  run on an install loaded from the default dataset:
  `node bin/probe.js ops shared/playwright/checks/issues/preprint-reloaded-draft-galley-list/walk.js`.
  It ends with the draft-without-galley check.
- Tips walked: OPS `main` c8af945bb7 (pkp-lib 3dc90c81a6, ui-library
  280f98c5); OPS `stable-3_5_0` 3f0919468c (pkp-lib 1fb843f491,
  ui-library 7a3c244b). pkp/datasets 27f1204 (2026-10-01). PostgreSQL.
- Stored state after the walk on `main`: galleys "PDF" and "HTML" on the
  draft's publication, each with a submission file ("preprint.pdf",
  "preprint.html"), "HTML" in English. The moderator's view was read in
  the code (the workflow lists the publication's stored galleys), not
  driven.
- 3.5: walked; the wizard page carries `"galleys":[{…}]` after the
  reload. pkp-lib 1fb843f491's `classes/galley/DAO.php` has its own
  `getMany()` with `yield $row->galley_id = $this->fromRow($row);`;
  `pages/submission/SubmissionHandler.php` and
  `SubmissionWizardPageOPS.vue` are the same as on `main`.
- 3.4 (code): pkp-lib `origin/stable-3_4_0` df13621c2d's galley DAO has
  its own `getMany()` yielding no key
  (`yield $row->user_id = $this->fromRow($row);`); OPS
  `upstream/stable-3_4_0` acd8ae704b writes the same state, and
  ui-library ee684b34 has the same `SubmissionWizardPageOPS.vue`.
- 3.3 (code): OPS `upstream/stable-3_3_0` c5532e2161 uses the older
  step-by-step `SubmissionHandler.inc.php`; ui-library
  `origin/stable-3_3_0` has no submission wizard component.
- Introduced: `git blame` on lines 169–179 of OPS's
  `pages/submission/SubmissionHandler.php` stops at 8fd2c6d834 (Nate
  Wright, 2022-10-19), written when the galley DAO yielded no keys.
  pkp-lib c6babb5dbe (authored 2026-08-19) removed `getMany()` from
  `classes/galley/DAO.php` and `classes/emailTemplate/DAO.php` in favour
  of `EntityDAO::getMany()`. a7c80f0bce (2026-08-28) put the email
  templates' override back; nothing did so for galleys.
- Resumed after "Save for Later": not driven. It is the same page load
  of the same handler as a reload.
- Unverified: whether pressing "Add File" again after the stuck window
  adds the galley twice; the `galley:edited`, `galley:deleted` and
  `submissionFile:edited` paths were read in the code, not driven.
