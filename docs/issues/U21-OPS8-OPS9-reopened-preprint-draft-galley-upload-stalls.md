# On a reopened preprint draft, a further galley's upload stalls and "Review" says no files were uploaded

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** script
- **Affects**
  - main: OPS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code; no galley list in the submission wizard)
- **Introduced** pkp-lib [c6babb5dbe](https://github.com/pkp/pkp-lib/commit/c6babb5dbecf73a7528c8ef3bad1761bcc7f5987) for `pkp/pkp-lib#13003` (no PR) · 2026-08-19 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U21 [OPS8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#ops8), [OPS9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#ops9)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

An author on a preprint server who comes back to a draft that already
has a galley (after "Save for Later", or after reloading the page) and
adds another galley cannot finish the upload. The page's script fails.
The galley label form ("Add File") stays open, and the file upload
window that opens over it stops at a blank "2. Review Details" step
with "Continue" greyed. The file is in fact saved with the new galley,
but the galley list shows it without a file until the page is
reloaded.

On the same reopened draft, the "Review" step's "Files" panel reads
"No files have been uploaded for this submission." although the draft
has its galleys. "Submit" still works, and the preprint goes in with
its files.

Both symptoms have one cause and one small fix. They need only a draft
that already had a galley when the wizard page was loaded.

## Impact

- **Lost**: nothing. The author is shown an upload that cannot be
  finished, and a "Review" step that says the draft has no files.
- **Who**: anyone who submits through the wizard on a preprint server:
  authors, and a manager or moderator submitting for someone else (the
  same page). Resuming a draft after "Save for Later" is an ordinary
  part of submitting, and a reload has the same effect.
- **Way round**: close both windows and carry on: "Submit" works. Until
  the page is reloaded, the "Files" list shows the new galley with its
  label as plain text, which is how the list shows a galley without a
  file. After a reload it becomes a download link like the others.
  Uploading the file again (a second galley) or giving up are likely
  reactions; neither was seen. Adding all of a draft's galleys before
  leaving the page avoids the problem.

Medium: the submission goes in complete, but a failing page script, a
galley list that looks file-less and a "Review" step that says the files
are missing mislead everyone who reopens a draft. Reports of abandoned
submissions or duplicate galleys would raise it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OPS `main`. It has no draft submissions,
  so the author starts one.
- A PDF file and an HTML file on disk (any content).

Steps:

1. Sign in as `ccorino`.
2. Open "New Submission" (`/index.php/publicknowledge/en/submission`).
   Enter the title "u21w32 Galleys after a reload", choose "English"
   under "Submission Language", tick "Yes, my submission meets all of
   these requirements." and the privacy consent, then click "Begin
   Submission".
3. On "Upload Files", click "Add File", enter the Galley Label "PDF"
   and click "Save".
4. In the upload window, "Upload a File Ready for Publication", choose
   the Preprint Component "Preprint Text" and upload the PDF. Click
   "Continue", "Continue", "Complete".
5. Click "Continue" to "Details" and type an abstract. Continue through
   "Contributors" and "For Readers" (choose "This preprint has not been
   published elsewhere.") to "Review". The "Files" panel lists "PDF
   Preprint Text".
6. Reload the page. (Clicking "Save for Later" and opening the draft
   again from the submissions list has the same effect.)
7. Continue from step to step to "Review".
8. Click "Edit" on the "Files" panel. On "Upload Files", click "Add
   File", enter the Galley Label "HTML" and click "Save".
9. In the upload window, choose the Preprint Component "Preprint
   Text", upload the HTML file and click "Continue".
10. Click "Cancel" in the upload window, then "Cancel" in the "Add
    File" window. Look at the "Files" list, then reload the page, look
    at it again, and go to "Review".

[On 3.5 the wizard opens on "Details", with "Upload Files" second. The
steps are otherwise the same.]

**Expected**: at step 7 the "Files" panel lists "PDF Preprint Text". At
step 8 the "Add File" window closes and the upload window opens. At
step 9 "2. Review Details" shows the file's name fields, and "Continue"
and "Complete" finish the upload. At step 10 "Review" lists both
galleys.

**Observed**: at step 7 the "Files" panel reads "No files have been
uploaded for this submission.", and "Submit" is enabled. At step 8 the
upload window opens, but the "Add File" window stays open behind it,
with a spinner beside a greyed "Save". The browser console shows:

```
this.galleys.push is not a function
```

At step 9 the file uploads, then:

```
this.galleys.map is not a function
```

"2. Review Details" stays blank and its "Continue" stays greyed. At
step 10, after the windows close, the "Files" list shows "HTML" below
"PDF", "HTML" as plain text and "PDF" as a download link. After the
reload both are download links. "Review" still reads "No files have
been uploaded for this submission.".

Control: on a new draft, "PDF" and then "HTML" added without reloading
upload normally, and "Review" lists both.

## Cause

The submission wizard keeps the draft's galleys in a client-side
list. OPS's `SubmissionHandler::getFilesStep()`
(`pages/submission/SubmissionHandler.php`, lines 169–179) seeds that
list when the page loads. It does so by passing
`Repo::galley()->getSchemaMap(…)->mapMany($galleys)` to
`setState()`, which serialises the collection to JSON with its keys:

```php
$templateMgr->setState([
    'galleys' => Repo::galley()
        ->getSchemaMap($submission, $publication, $genres)
        ->mapMany($galleys)
]);
```

The client code expects an array. ui-library's
`src/components/Container/SubmissionWizardPageOPS.vue` calls
`this.galleys.push()` when the grid announces a new galley
(`galley:added`), and `this.galleys.map()` when a galley or its file
changes (`galley:edited`, `submissionFile:added`,
`submissionFile:edited`). OPS's `templates/submission/review-galleys.tpl`
reads `galleys.length` (lines 37 and 42).

Since pkp-lib c6babb5dbe, the galley collection is keyed by galley ID.
That commit, for `pkp/pkp-lib#13003` (batch loading), replaced each
DAO's own `getMany()` with one in `EntityDAO`, which yields
`$row->{$this->primaryKeyColumn} => $this->fromRow(…)`. The galley
DAO's own `getMany()` had yielded `$row->galley_id = $this->fromRow($row)`,
an assignment where a key was meant, so its collection was a plain
list. Now a draft with galleys `[21 => …]` serialises as the object
`{"21": {…}}`, which in the browser has no `push`, `map`, `filter` or
`length`. The `getFilesStep()` code dates from the new wizard in 2022
(OPS 8fd2c6d834, `pkp/pkp-lib#7191`) and became wrong only when the
keys changed.

A draft with no galleys when the page loads still serialises as `[]`,
so on a new draft every galley added before the page is reloaded
works. Each
error is thrown inside the jQuery handler of the "Add File" window or
the upload window, which stops that handler before it closes the
window or loads "2. Review Details", and before the "Files" list row is
refreshed with its file.

Reach (read in the code):

- Editing an existing galley's label or deleting a galley on a
  reopened draft runs `editGalley()` (`map`) or `deleteGalley()`
  (`filter`) on the same object, and fails in the same way.
- Other users of the galley collection: the publication maps
  (`classes/publication/maps/Schema.php`, line 34, in OPS and OJS)
  already call `->values()`, so the publication JSON in the API and
  the workflow is unaffected. The other galley readers iterate the
  collection.
- Other DAOs: all the DAOs c6babb5dbe moved already yielded by ID,
  except the galley DAO and the email-template DAO. Email templates
  were made unkeyed again in pkp-lib a7c80f0bce (below). The galley
  collection is the only one still re-keyed.

## Proposed fix

A proposal; the team decides. Add `->values()` in OPS's `SubmissionHandler::getFilesStep()`, the one
place that hands the galley collection to the browser as a list
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reopened-preprint-draft-galley-upload-stalls/fix.diff)):

```diff
             'galleys' => Repo::galley()
                 ->getSchemaMap($submission, $publication, $genres)
                 ->mapMany($galleys)
+                ->values()
         ]);
```

This is how the surrounding code already hands mapped collections to
the client: `PKPSubmissionHandler::getSubmissionFilesListPanel()` ends
its `summarizeMany($submissionFiles)` with `->values()`, and the OPS and
OJS publication maps end `summarizeMany(…galleys)` with `->values()`.

The team fixed the same kind of fallout from c6babb5dbe for email
templates in the DAO instead: pkp-lib [a7c80f0bce](https://github.com/pkp/pkp-lib/commit/a7c80f0bcee931e52ca0594eb8a5d0ffbffe67df) ("Do not yield by ID
with email templates") gives `emailTemplate\DAO` its own unkeyed
`getMany()`, because "not all email templates have keys". Default
templates that were never customised are read with `NULL as
email_id`, so their keys would collide. That reason does not hold for
galleys: every galley has a `galley_id`, so keys by ID are well defined, and other galley code now
runs on them (`APP\publication\DAO::fromRow()` groups the batch's
galleys with `groupBy(…, true)`, keeping their keys). Un-keying the
galley DAO would change every galley collection a second time before
release, for API and plugin code alike, to fix one handler that assumes
a list.

The fix was tried on `main`: with it, the steps show the Expected
throughout, with no page error, and a new draft with two galleys added before any
reload behaves the same with and without it.

**Alternatives**:

- An unkeyed `getMany()` in the galley DAO, as a7c80f0bce does for
  email templates: works, but re-keys every galley collection again
  for the one handler above, and the reason behind a7c80f0bce does not
  apply to galleys.
- Converting with `Object.values()` in `SubmissionWizardPageOPS.vue`:
  this guards one reader, needs a ui-library rebuild, and leaves
  `review-galleys.tpl` and any later reader of the state exposed.

**What goes with it**: no stored data is wrong. No backport is needed,
since 3.5 and 3.4 still build a plain list. For a guard, an e2e
scenario in the submission wizard spec: reopen a draft with a galley,
add a second one, and "Review" lists both.

Small: one line in one handler, and an e2e scenario.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reopened-preprint-draft-galley-upload-stalls/walk.js),
  run on a fresh load of the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ops shared/playwright/checks/issues/reopened-preprint-draft-galley-upload-stalls/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). With no `PHASE`
  it takes steps 1–10. `PHASE=neighbour` takes the control: a new
  draft, "PDF" then "HTML" in one visit, then "Review".
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/reopened-preprint-draft-galley-upload-stalls/fix.diff ops`,
  the script in both phases, then `node bin/try-fix.js revert ops`.
  `PHASE=neighbour` was also run without the fix.
- Driven on PostgreSQL, on the default dataset from pkp/datasets
  38ab955 (2026-09-30): steps 1–10 on `main` (Observed as above) and
  on `stable-3_5_0` (Expected throughout: "Review" lists "PDF Preprint
  Text" after the reload and both galleys at the end, with no page
  error). OJS and OMP have no galley list in their submission wizard.
- That the "HTML" galley holds its file after step 10 was also read
  in the walked install's database (`publication_galleys.submission_file_id`
  set, the submission file named `preprint.html`). Closing the upload
  window with its back arrow instead of "Cancel" (an earlier walk) left
  the file in place too.
- Not walked: a manager or moderator submitting through the wizard
  (the same page and handler as for an author), and editing or deleting
  a galley on a reopened draft.
- Tips:
  - `main`: OPS
    [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2)
    with pkp-lib
    [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a638238c2241f5d3086f93865cb943b8)
    and ui-library
    [280f98c5](https://github.com/pkp/ui-library/commit/280f98c5703024a8de7694642dfa860eaa293e1a).
  - `stable-3_5_0`: OPS
    [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd1b020b73ff061dbde9cea586207994)
    with pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1)
    and ui-library
    [1a7a4750](https://github.com/pkp/ui-library/commit/1a7a47504c4f8b78f423cdfd16c55c0fcf01caca).
  - `stable-3_4_0`: OPS
    [acd8ae704b](https://github.com/pkp/ops/commit/acd8ae704b26a97e5a32147e151ca339699cf96a)
    with pkp-lib
    [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747)
    and ui-library
    [ee684b34](https://github.com/pkp/ui-library/commit/ee684b341bacfcdd330b95073394a1fbf34a1f4f).
  - `stable-3_3_0`: OPS
    [c5532e2161](https://github.com/pkp/ops/commit/c5532e2161952b912635d2920d6b63f0cffeaf09)
    with pkp-lib
    [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072).
- Code reads:
  - 3.5 (walked, for the reason): `SubmissionHandler::getFilesStep()`
    line 176 and `SubmissionWizardPageOPS.vue` are as on `main`.
    pkp-lib's `classes/galley/DAO.php` line 127 still has its own
    `getMany()` yielding `$row->galley_id = $this->fromRow($row)`, a
    positional list.
  - 3.4: the same `getFilesStep()` (line 172) and Vue component. The
    galley DAO's `getMany()` (line 124) yields
    `$row->user_id = $this->fromRow($row)`, also a positional list.
  - 3.3: the submission form's second step
    (`templates/submission/form/step2.tpl`) holds only the galley grid,
    with no client-side galley list. `review-galleys.tpl` and
    `SubmissionWizardPageOPS.vue` do not exist there.
- Introduced: `git blame` on `getFilesStep()` lines 169–179 gives
  8fd2c6d834 (2022-10-19, Nate Wright, `pkp/pkp-lib#7191`, the new
  submission wizard). The keys changed in pkp-lib c6babb5dbe ("Make
  populator a simple instance method with inheritance; centralize
  getMany"), which removed `galley\DAO::getMany()` in favour of
  `EntityDAO::getMany()`; it is on pkp-lib `main`'s first-parent
  history. a7c80f0bce (2026-08-28, Alec Smecher) restored an unkeyed
  `getMany()` for email templates only.
- Upstream: searched pkp/pkp-lib, pkp/ops and pkp/ui-library for the
  page errors' text, "submission wizard galley reload", "No files have
  been uploaded" with "preprint", "Add File" with "galley wizard",
  `SubmissionWizardPageOPS`, and `13003` with "getMany". The `13003`
  PRs found concern batch loading and caching. None mentions the
  wizard's galleys.
- MySQL not checked. The fault does not depend on the database: the
  keys come from `EntityDAO::getMany()`.
