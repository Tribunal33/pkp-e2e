# A DOI typed into a book's file row on a press's DOIs page is saved, but "Save" reports a failure

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: none (code)
  - 3.3: none (code; no DOIs page)
- **Introduced** `pkp/omp#2095` (main) and `pkp/omp#2094` (3.5) for `pkp/pkp-lib#11682` · [4f3ca0fd10](https://github.com/pkp/omp/commit/4f3ca0fd10ed933d71424d2ac81ac1e8b4e1614a) · 2025-08-20 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U45 [OMP2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#omp2)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a press's DOIs page, a manager expands a book whose file row
("PDF / epilogue.pdf") has no DOI, presses "Edit", types a DOI into
that row's DOI box and presses "Save". The server stores the DOI, then
answers the save with an error. The notice reads "Some DOI(s) could not
be updated", the box is empty again and the row still reads "Needs
DOI". Only after a reload does the row show the DOI, "Unregistered".

A manager who believes the notice and tries again is refused the same
DOI, with the same notice, because it is already taken. A different DOI
is stored and linked to the file in its place, with the same notice.
The first DOI then belongs to nothing, yet stays taken: it can no
longer be given to this file or any other item on the install, and no
screen shows or removes it.

It needs a press with "Files" ticked under "Items with DOIs", which is
off by default. A DOI typed into the book's own row saves without the
error.

## Impact

- **Lost.** The DOI a manager typed first, when the retry used another
  one: it stays reserved by a record no screen shows, so the file
  cannot get it back.
- **Who.** Press managers who type a DOI into a book's empty file row
  on the DOIs page, on a press that gives DOIs to files. Each such save
  shows the false failure.
- **Way round.** Reload the page before trying again; the row then
  shows the stored DOI. "Assign DOIs" gives files DOIs without the
  error. A DOI already reserved can only be freed in the database.

Medium: the save misleads with a way round on screen, but the natural
reaction to it, retrying with a corrected DOI, silently reserves the
first one for good.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main`. Its press `publicknowledge`
  has DOIs on, "Items with DOIs" "Monographs" only, no DOI prefix, and
  no DOIs yet.
- The dataset's published book "Bomb Canada and Other Unkind Remarks in
  the American Media" (submission 5), with the format "PDF" holding the
  file "epilogue.pdf". The steps create nothing else.

1. Sign in as `dbarnes`.
2. Settings › Distribution › "DOIs" › "Setup": type `10.1234` in "DOI
   Prefix", tick "Files" under "Items with DOIs" ("Monographs" stays
   ticked) and press "Save".
3. Open "DOIs" in the side menu.
4. Expand "Bomb Canada and Other Unkind Remarks in the American Media".
   Its rows are "Monograph" and "PDF / epilogue.pdf", both empty and
   reading "Needs DOI". [On 3.5 the rows carry no status; the book's
   own badge reads "Needs DOI".]
5. Press "Edit", type `10.1234/u45ir9-file` into the "PDF /
   epilogue.pdf" box and press "Save".

Seeing what was stored:

6. Reload the page and expand the book again.

Trying again instead (from step 5, without a reload):

7. Press "Edit", type `10.1234/u45ir9-file` into the "PDF /
   epilogue.pdf" box again and press "Save".
8. Press "Edit", type `10.1234/u45ir9-file2` into that box and press
   "Save".
9. Reload the page and expand the book.
10. Press "Edit", change the "PDF / epilogue.pdf" box to
    `10.1234/u45ir9-file` and press "Save".

**Expected.** After step 5 the notice "DOI(s) successfully updated",
and the "PDF / epilogue.pdf" row holds `10.1234/u45ir9-file` and reads
"Unregistered" without a reload.

**Observed.** After step 5 the notice reads "Some DOI(s) could not be
updated", the box is empty and the row reads "Needs DOI". The DOI is
created (`POST api/v1/dois` answers 200), then linking it to the file
fails after the link is stored:

```
POST /index.php/publicknowledge/api/v1/_dois/submissionFiles/41   (X-Http-Method-Override: PUT)
500 {"error":"Call to undefined method PKP\\db\\DAOResultFactory::toArrayAssociative()"}
```

The server log:

```
production.ERROR: Call to undefined method PKP\db\DAOResultFactory::toArrayAssociative() {"exception":"[object] (Error(code: 0): Call to undefined method PKP\\db\\DAOResultFactory::toArrayAssociative() at …/api/v1/_dois/BackendDoiController.php:172)
```

After step 6 the row holds `10.1234/u45ir9-file` and reads
"Unregistered" [on 3.5 the book's badge reads "Unregistered"].

Trying again: step 7 shows the same notice; `POST api/v1/dois` answers
400 `{"doi":["The given DOI suffix is already in use for another
published item. Please enter a unique DOI suffix for each item."]}` and
nothing is written. Step 8 shows the same notice and the same 500;
`10.1234/u45ir9-file2` is stored and linked to the file, and the record
for `10.1234/u45ir9-file` stays, linked to nothing. After step 9 the
row reads `10.1234/u45ir9-file2`, "Unregistered". Step 10 shows the
notice again (`PUT api/v1/dois/2` answers 400 with the same message),
and the row keeps `10.1234/u45ir9-file2`.

Control: `10.1234/u45ir9-book` typed into the "Monograph" row of the
same book and saved shows "DOI(s) successfully updated" and the DOI at
once (`PUT api/v1/_dois/publications/5` answers 200).

## Cause

OMP's `APP\API\v1\_dois\BackendDoiController::editSubmissionFile()`
(`api/v1/_dois/BackendDoiController.php`, line 172 on `main`) stores
the new `doiId` on the file through `Repo::submissionFile()->edit()`,
then builds its answer with:

```php
$genres = $genreDao->getByContextId($submission->getData('contextId'))->toArrayAssociative();
```

`PKP\db\DAOResultFactory` has `toArray()` and
`toAssociativeArray($idField = 'id')`, but no `toArrayAssociative()`,
so the call throws after the edit is saved. The request answers 500,
and the ui-library's `DoiListItem.postUpdatedDoiComplete()` drops a
failed item from its updates, shows
`manager.dois.update.partialFailure` and refetches nothing, so the box
falls back to the row's old, empty value and its `doiId` stays null in
the page.

That null `doiId` sends the next "Save" of the row down the new-DOI
path again: `POST api/v1/dois` first. `PKPDoiController::add()`
validates through `Repo::doi()->validate()`, whose `isDuplicate()`
looks the DOI up in every context, so the same DOI is refused with a
400 (`doi.editor.doiSuffixCustomIdentifierNotUnique`) and another DOI
is created and linked in its place, through the same failing request.
Nothing deletes the DOI record the file pointed to before, so it is
left linked to nothing and keeps its DOI taken.

The OMP change was made together with pkp-lib's c5c583d415, which
gave `Repo::submissionFile()->getSchemaMap($submission, $genres)` its
genres argument, keyed by ID, and switched every pkp-lib caller from
`toArray()` to `toAssociativeArray()`, including this method's pkp-lib
twin, `PKPBackendDoiController::editPublication()`. The OMP commit
switched its other callers the same way; this one got a misspelled
method name.

Reach:

- Only the file row's "Save" on a press's DOIs page sends this request
  (`DoiListPanelOMP.vue` sets `_dois/submissionFiles/{id}` as the file
  row's `updateWithNewDoiEndpoint`); checked in the code and on screen.
- Changing or emptying a file DOI that already exists goes to
  `PUT` / `DELETE api/v1/dois/{id}` (`DoiListItem.editDoi()`,
  `deleteDoi()`) and never reaches this method; checked in the code,
  and emptying on screen.
- Until a reload the row's status, box and `doiId` are the page's old
  values; the bulk actions ("Mark DOIs Registered", "Deposit DOIs")
  work from the stored DOIs (`DoiRepository::getDoisForSubmission()`
  reads the file's stored `doiId`), so they act on the stored DOI;
  checked in the code. OMP ships no registration agency plugin, so
  nothing is deposited by itself.
- "Assign DOIs" and the automatic assignment at publishing do not use
  this endpoint; checked on screen ("Assign DOIs") and in the code.
- OJS and OPS have no file DOIs and no such method; no other
  `toArrayAssociative()` call exists in OJS, OMP, OPS, their pkp-lib
  or ui-library, on `main` or 3.5; checked in the code.
- Stored data: the DOI record and the file's `doiId` are written
  before the failure. Each retry with another DOI leaves one record
  linked to nothing, whose DOI stays taken install-wide; checked on
  screen and in the database.

## Proposed fix

In `BackendDoiController::editSubmissionFile()`, line 172, call
`toAssociativeArray()` instead of `toArrayAssociative()`, the method
the rest of the change uses; the whole change is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/file-row-doi-save-error/fix.diff).
It was tried on `main`: the Steps then show "DOI(s) successfully
updated" and the row reads `10.1234/u45ir9-file`, "Unregistered"
without a reload. Assigning DOIs, then changing the book's DOI and
emptying the file's DOI, gave the same answers and rows with and
without the fix.

**Alternatives**

- Restoring `toArray()` would stop the error, but the map would look
  genres up by list position instead of ID and could name the wrong
  genre in the answer.
- Catching the failure in the ui-library, or refetching the item after
  a failed save, would show the stored DOI, but would leave the
  endpoint answering 500 to every client.

**What goes with it**

- No data repair proposed. The DOIs linked to files are correct; the
  only bad data is a DOI record linked to nothing, left by a retry with
  another DOI. It reserves its DOI and nothing else, and the fix stops
  new ones. An administrator who needs such a DOI back can delete its
  row in `dois` (one that no publication, chapter, format or file
  references).
- Backport: the same line is on `stable-3_5_0`, and the diff applies
  there as written.
- Guard: an e2e scenario on a press with "Files" ticked that types a
  DOI into a file row and expects "DOI(s) successfully updated" (a
  Planned item in U45), or an API test of
  `PUT api/v1/_dois/submissionFiles/{id}` that expects 200.

Small: one method name, and a test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/file-row-doi-save-error/walk.js)
  takes steps 1-6 and the control through the screens on PKP's default
  test dataset, `pgsql`, pkp/datasets 38ab955 (2026-09-30), on
  PostgreSQL; `WALK=retry` takes steps 1-5 and 7-10 and reads the
  `dois` table after each save; `WALK=neighbour` takes the paths the
  fix must leave alone (Assign DOIs, change and empty an existing DOI). Run from the
  pkp-e2e root:
  `npm run fleet-prep -- --feature <f> --dataset <n> --reset`, then
  `PROBE_FEATURE=<f> PROBE_AGENT=<a> node bin/probe.js omp shared/playwright/checks/issues/file-row-doi-save-error/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front of both for 3.5).
- Walked: OMP `main` and `stable-3_5_0`, each on a freshly reset
  dataset; steps 7-10 on `main` only (3.5 has the same `add()` and
  `isDuplicate()`, read in the code). The fix was applied with `node bin/try-fix.js apply
  shared/playwright/checks/issues/file-row-doi-save-error/fix.diff omp`
  on `main`, walked and neighbour-checked, and reverted.
- Tips: OMP `main` 3b0ecf794 (2026-09-29), its pkp-lib 3dc90c81a6,
  ui-library 280f98c5; OMP `stable-3_5_0` 3081c9b00 (2026-09-30), its
  pkp-lib a9c76aed62, ui-library 1a7a4750; OMP `upstream/stable-3_4_0`
  0aec65441, pkp-lib `stable-3_4_0` df13621c2d; OMP
  `upstream/stable-3_3_0` 8e72fc883, pkp-lib `stable-3_3_0` d446601ebe.
- Code reads: `main` and 3.5, OMP `api/v1/_dois/BackendDoiController.php`
  `editSubmissionFile()` (line 172 is the same on both),
  lib/pkp `classes/db/DAOResultFactory.php`,
  `classes/submissionFile/maps/Schema.php`,
  `api/v1/_dois/PKPBackendDoiController.php`; ui-library
  `src/components/ListPanel/doi/DoiListItem.vue` (`saveDois()`,
  `postUpdatedDoiComplete()`) and `DoiListPanelOMP.vue`. 3.4: OMP
  `api/v1/_dois/BackendDoiHandler.php` `editSubmissionFile()` calls
  `toArray()`, which exists there, and 4f3ca0fd10 and its 3.5 backport
  are not on the branch. 3.3: OMP has no `api/v1/_dois` and no DOIs page.
- Introduced: `git blame` on line 172 gives 4f3ca0fd10, which changed
  `toArray()` to `toArrayAssociative()` in the same hunk that moved the
  genres into `getSchemaMap()`; the GitHub API's `commits/<sha>/pulls`
  names `pkp/omp#2095` (main). The 3.5 backport is c94ef436d
  (`pkp/omp#2094`); the pkp-lib half is c5c583d415 (`pkp/pkp-lib#11715`).
- Upstream: searched issues and PRs, open and closed, on 2026-10-01:
  pkp/pkp-lib for "toArrayAssociative", "editSubmissionFile",
  "DAOResultFactory undefined method", "Some DOI(s) could not be
  updated", "DOI file could not be updated" and "OMP file DOI 500";
  pkp/omp for "toArrayAssociative", "DAOResultFactory" and "submission
  file DOI"; pkp/ui-library for "DOI file not updated". None is this
  fault.
- Not driven: OMP 3.4 and 3.3 (read in the code); OJS and OPS (no file
  DOIs). MySQL not checked; the fault does not depend on the database.
- Code reads for the retry: lib/pkp `api/v1/dois/PKPDoiController.php`
  `add()` and `edit()`, `classes/doi/Repository.php` `validate()` and
  `isDuplicate()` (no context filter), and OMP
  `classes/doi/Repository.php` `getDoisForSubmission()`, on `main` and
  3.5.
- Unverified: that the orphan DOI blocks the same DOI in a second press
  on the install (read in the code, not walked).
