# Changing the file of a new version's galley replaces the file readers download from the published version

- **Severity** high
- **Effort** medium
- **Kind** defect
- **Crash** both
- **Affects**
  - main: OJS, OPS
  - 3.5: OJS, OPS
  - 3.4: OJS, OPS (code)
  - 3.3: OJS, OPS (code)
- **Introduced** `pkp/ojs#2457` for `pkp/pkp-lib#2072` · [88aba9a0cb](https://github.com/pkp/ojs/commit/88aba9a0cb9a46881fdb0c2b46c3f311d98be7d5) · 2019-06-26 (merged 2019-09-05) · Nate Wright (NateWr); OPS carries the same commit
- **Upstream** `pkp/pkp-lib#11900` (open; fix in PR `pkp/pkp-lib#12846`, not yet in main), covering the failed delete of a whole submission that the shared file causes; the PR stops a galley delete from removing a file another galley still uses, so "Change File" on either version still changes both
- **Tracked in** spec U46 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U46-galleys.md#a4), [OJS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U46-galleys.md#ojs1)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

After "Create New Version", the new version's galley opens the same
stored file as the published version's galley it was copied from. An
editor who uses "Change File" on the new version's galley, expecting to
prepare the next version, immediately replaces the file readers
download from the published version.

Deleting the published version's galley reaches the copy too. On a
journal installed fresh since 3.3, the app fails: a window titled
"Error" opens, the galley is gone anyway, and the new version's galley
keeps a link that no longer downloads. On a journal upgraded to 3.4 or
later, and on a preprint server, the delete goes through without a word
and takes the new version's file with it.

Nothing on screen says the two versions share a file. An editor who
knows can delete the copied galley and add a new one with "Add galley",
which gives the new version a file of its own.

## Impact

- **Lost.** The published version's file, replaced for every reader by
  a draft nobody has published; the original stays stored as an earlier
  revision of the galley's file, offered as a download in the file's
  history (code), but no screen puts it back. A later delete of the published
  galley takes the new version's file, and on an upgraded journal or a
  preprint server it deletes the stored files for good (code).
- **Who.** Every editor who makes a new version of a published article
  or posted preprint and changes its file, the usual reason to make
  one.
- **Way round.** Delete the copied galley on the new version and add a
  new one there. Only an editor who knows of the fault takes it.

High: readers of the published version get a file no one decided to
publish, and the version's own record of what was published no longer
matches what it serves. It would be critical if the replaced file were
lost for good; it is kept, reachable only from the file's history.

## Steps to reproduce

Preconditions:

- The default dataset, `main`: OJS, and OPS with the names in brackets.
- OJS submission 17, "Antimicrobial, heavy metal resistance and plasmid
  profile of coliforms isolated from nosocomial infections in a hospital
  in Isfahan, Iran" [OPS submission 2, "The Facets Of Job Satisfaction:
  A Nine-Nation Comparative Study Of Construct Equivalence"]: published,
  one version, one galley "PDF" whose file is `article.pdf` ["The Facets
  Of Job Satisfaction: A Nine-Nation Comparative Study Of Construct
  Equivalence.pdf"].
- A PDF on your computer that differs from the galley's, named
  `replacement.pdf`.

Changing the new version's file:

1. In a private window (a reader, not signed in), open
   `/index.php/publicknowledge/en/article/view/17`
   [`/index.php/publicknowledge/en/preprint/view/2`], press "PDF", then
   "Download". The browser gets the galley's file.
2. In another window, sign in as `dbarnes`.
3. Open submission 17
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=17`)
   [submission 2, `…?workflowSubmissionId=2`].
4. In the side menu, press "Create New Version", keep "Minor Revision"
   and press "Confirm". The menu gains "Version of Record 1.1"
   ["Author Original 1.1"]. [3.5: the version page's "Create New
   Version" button, then "Yes".]
5. Under "Version of Record 1.1", open "Galleys".
6. On the "PDF" row, open "More Actions" › "Change File", choose
   `replacement.pdf`, then "Continue", "Continue" and "Complete".
7. In the reader's window, repeat step 1.
8. Back as `dbarnes`, under "Version of Record 1.0" ["Author Original
   1.0"], open "Galleys" and press the "PDF" row's label. [3.5: pick
   version 1 in "All Versions", then "Galleys".]

Deleting the published version's galley (continuing):

9. On that "PDF" row, open "More Actions" › "Delete" and press "OK".
10. Under "Version of Record 1.1", open "Galleys" and press the "PDF"
    row's label.

**Expected:** in steps 7 and 8 the published version still gives
`article.pdf` [the preprint's own file]; `replacement.pdf` belongs to
the new version only. In step 9 the published version's row goes
without an error, and in step 10 the new version's "PDF" downloads
`replacement.pdf`.

**Observed:** in steps 7 and 8 the browser gets `replacement.pdf`.

In step 9, on OJS, the row goes, but a window opens:

```
Error
An unexpected error has occurred. Please reload the page and try again.
```

The delete request answered 500, and the server log reads:

```
PDOException: SQLSTATE[23503]: Foreign key violation: 7 ERROR:  update or delete on table "submission_files" violates foreign key constraint "publication_galleys_submission_file_id_foreign" on table "publication_galleys"
DETAIL:  Key (submission_file_id)=(40) is still referenced from table "publication_galleys". (… SQL: delete from "submission_files" where "submission_file_id" = 40)
```

The page's script then failed: `Cannot read properties of null (reading
'status')`. In step 10 the copy's label is still a link, and it opens a
"404 Not Found" page (on 3.5 it answers 500: `File 28 is not a revision
of submission file 40`).

On OPS, step 9 shows no message and the row goes; in step 10 the new
version's "PDF" label is plain text: its file is gone.

Control: deleting the new version's galley instead leaves the published
galley and its file in place.

## Cause

OJS's and OPS's `APP\publication\Repository::version()`
(`classes/publication/Repository.php`, OJS lines 165–177, OPS 125–137)
copy each galley with `clone`, giving the copy a new id and publication
id but keeping its `submissionFileId`. Both galleys then point at one
`submission_files` row, whose `assoc_id` names the original galley only.
Every other copy a new version makes gives the copy its own file:
pkp-lib's `version()` copies the JATS file
(`Repo::submissionFile()->versionSubmissionFile()`) and the media files
as new submission files, and OMP's `version()` copies each publication
format's files and their dependent files.

"Change File" revises a galley's file by editing that one row:
`SubmissionFilesUploadForm::execute()` calls
`Repo::submissionFile()->edit()` with the new `fileId`. Both galleys, and
the reader's download address (`article/download/17/3/40`), serve the new
file. The earlier `file_id` stays in `submission_file_revisions`, and
`EventLogGridRow::initialize()` offers a "Download" on the history entry
of any file that is still a revision; no action makes a revision the
current file again.

Deleting a galley runs `PKP\galley\Repository::delete()`: it deletes the
galley row, then every submission file attached to that galley, which
is the shared row. What happens next depends on the foreign key
`publication_galleys_submission_file_id_foreign`:

- **OJS installed fresh since 3.3** (the default dataset is one): the
  key has no `ON DELETE` action, so the database refuses. By then the
  galley row and the file's revision rows are deleted, outside any
  transaction. The copy is left pointing at a file row with no
  revisions, which `FileApiHandler::downloadFile()` refuses.
- **OJS upgraded to 3.4 or later**: the 3.4.0 upgrade drops the key and
  never adds it back (`I6093_AddForeignKeys`, lines 93–96, and
  `PreflightCheckMigration::dropForeignKeys()`, from
  `pkp/pkp-lib#9038`, [3918d62d19](https://github.com/pkp/ojs/commit/3918d62d192bfae5b2991d72649ae602b208f7a8);
  the migration's comment says it meant to replace a key "which doesn't
  have the cascade rule"). The delete succeeds silently, removes the
  file row, its revisions and the stored files no other row uses, and
  leaves the copy pointing at a `submission_file_id` that no longer
  exists (code).
- **OPS**: the key is `ON DELETE SET NULL` (since `pkp/pkp-lib#8337`),
  re-added so by OPS's own 3.4.0 upgrade, so the delete succeeds and
  empties the copy's `submission_file_id` without a word.

The reach of the same cause:

- Deleting a whole submission that has a copied galley fails on a
  journal with the key (`pkp/pkp-lib#11900`; code, not driven).
- Stored data: every galley a new version copied since versioning
  began shares its file. The default dataset holds two such pairs
  itself, OJS submission 1 and OPS submission 3 (checked in the
  database). Deleting version 1.0's "PDF" of OJS submission 1 fails as
  in step 9 (checked on screen).
- On a preprint whose versions are all posted, deleting an earlier
  version's galley takes the current version's file from readers.
  Deleting version 1.0's "PDF" of OPS submission 3 left version 2.0's
  "PDF" without a file, and the preprint's page then offered no PDF
  (checked on screen).
- OMP is not affected (checked in the code).

## Proposed fix

Give the copy a file of its own when the version is made. In
`version()` of both apps, after `Repo::galley()->add($newGalley)`,
clone the galley's submission file with `assocId` set to the new
galley, clone its dependent files (an HTML galley's images and style
sheets) onto the new file, and point the copy at the new file. The
closest precedent is pkp-lib's own `PKP\publication\Repository::version()`
(around line 476), which clones each media file the same way, keeping
`fileId`; OMP does the same for a format's files. Keeping `fileId`
means nothing is copied on disk until one version's file is changed,
and it is safe because `Repo::submissionFile()->delete()` keeps a
stored file that another submission file still uses. The fix is
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/new-version-galley-shares-published-file/fix-ojs.diff)
and
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/new-version-galley-shares-published-file/fix-ops.diff),
the same new method in each app's `Repository`, called as
`$this->versionGalleyFile($galley, Repo::galley()->add($newGalley))`:

```php
protected function versionGalleyFile(Galley $galley, int $newGalleyId): void
{
    $submissionFile = $galley->getData('submissionFileId')
        ? Repo::submissionFile()->get($galley->getData('submissionFileId'))
        : null;
    if (!$submissionFile) {
        return;
    }
    $newSubmissionFile = clone $submissionFile;
    $newSubmissionFile->setData('id', null);
    $newSubmissionFile->setData('assocId', $newGalleyId);
    $newSubmissionFileId = Repo::submissionFile()->add($newSubmissionFile);
    // … the same clone for each dependent file, with assocId = $newSubmissionFileId …
    Repo::galley()->edit(Repo::galley()->get($newGalleyId), ['submissionFileId' => $newSubmissionFileId]);
}
```

Galley files on a journal or preprint server carry no identifiers on
today's screens, but a pub-id plugin can store `pub-id::*` settings on
a submission file; the clone should drop them, as the galley copy
clears `doiId`, or it repeats the refused copied identifier of spec U44 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#a5).

Tried on `main`, OJS and OPS: the Steps then showed the Expected. With
the fix in and out alike, "Change File" on the published version's
galley still reaches readers, and deleting the new version's galley
leaves the published galley and its file in place. The default
dataset's own pairs, made before the fix, still fail as before, which
is what the repair below is for.

**Alternatives:**

- PR `pkp/pkp-lib#12846` skips deleting a submission file that another
  galley still uses. It ends the journal's failed delete and the silent
  loss, but the two versions keep sharing one file, so "Change File" on
  either one still replaces the other's.
- `versionSubmissionFile()`, which the JATS file uses, copies the
  stored file on disk as well. It works, but stores every galley file
  twice for no gain.
- Giving OJS's key `ON DELETE SET NULL` alone, as OPS has, turns the
  journal's error into the silent loss.
- OJS and OPS carry the same galley copy; the new method could live
  once in `PKP\galley\Repository` for both, next to the media-file
  precedent in pkp-lib. Either serves.

**What goes with it:**

- A repair migration in each app. It finds the galleys sharing a file
  with `publication_galleys g join submission_files sf on
  sf.submission_file_id = g.submission_file_id where sf.assoc_id <>
  g.galley_id`. The galley the row's `assoc_id` names keeps the row and
  its revision history; every other galley gets a clone holding the
  row's current `file_id`, the file both serve today, since nothing
  records which version a "Change File" was meant for. On OJS it also
  empties every `submission_file_id` whose row no longer exists (an
  upgraded journal after a delete). Not tried.
- Restore the key on upgraded journals, so that a galley cannot point
  at a deleted file again: the 3.4.0 upgrade dropped it meaning to add
  it back with a delete rule. `ON DELETE SET NULL`, as OPS has, fits
  once no two galleys share a row; the team decides the rule.
- Each copied file adds the "file uploaded" lines to the activity log
  that `Repo::submissionFile()->add()` writes, as the media and OMP
  copies do today.
- The code applies as written to 3.5; 3.4 has the same `version()`, and
  3.3 copies galleys in `PublicationService::versionPublication()`.
- The guard: an e2e scenario in U46 (a new version's "Change File"
  leaves the published download alone; deleting the published galley
  leaves the copy's file), and a unit test of `version()` that the copy's
  `submissionFileId` differs from the original's.

Medium: the code change is one method per app, but the repair has to
split shared rows and clear dangling references with an upgrade
migration in two apps, and restoring the key is a schema step on
upgraded journals.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/new-version-galley-shares-published-file/walk.js)
  (helpers in `lib.js` beside it and in the walks it names), run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/new-version-galley-shares-published-file/walk.js`
  on an install freshly loaded from the default dataset (pkp/datasets
  e8dafbc, 2026-10-02, PostgreSQL). `WALK=neighbour` in front takes the
  neighbour check, which also deletes version 1.0's "PDF" of the
  dataset's own pairs (OJS submission 1, OPS submission 3). The fix
  trial: `node bin/try-fix.js apply
  shared/playwright/checks/issues/new-version-galley-shares-published-file/fix-ojs.diff ojs`
  (and `fix-ops.diff ops`), a fresh load, the walk; the neighbour check
  on fresh loads with the fix applied and reverted.
- A database read after each step (`publication_galleys` joined to
  `submission_files`) showed both versions' galleys on one
  `submission_file_id` whose `assoc_id` is the original galley, the
  copy's `submission_file_id` emptied on OPS after the delete, and on
  OJS the file row left without its `submission_file_revisions` rows.
  With the fix, the copy had its own row (same `file_id` until "Change
  File" gave it a new one). After "Change File", the shared row's
  `submission_file_revisions` held both the original and the new
  `file_id`, and the event log kept the original upload's entry with its
  `fileId`; the history's "Download" on it was not pressed on screen.
- The dataset install is fresh: one `versions` row (3.6.0.0), and the
  key present with no delete action (`pg_constraint`).
- 3.5 was walked with the same script (`PKP_E2E_LINE=stable-3_5_0` in
  front): the same results on OJS and OPS; the copy's link after the
  delete answered 500 there (`FileApiHandler.php:110`), where `main`
  now reports the missing file as 404.
- Code reads on each line (3.3: `PublicationService::versionPublication()`
  and `GalleyService::delete()`): the galley copy in `version()`, the
  galley delete and `SubmissionFilesUploadForm::execute()`, the same on
  all four. The key: a fresh OJS install creates it without a delete
  action on all four lines (since `pkp/pkp-lib#6057`,
  [863fbbc22f](https://github.com/pkp/ojs/commit/863fbbc22f4ee3c0a2c7aad69134f586669838f3),
  2020-10-19), and OJS's 3.4.0 upgrade drops it on 3.4, 3.5 and main
  without re-adding it; OPS has `SET NULL` on main, 3.5 and 3.4, fresh
  and upgraded
  ([f19b31e2f7](https://github.com/pkp/ops/commit/f19b31e2f7dc6ee29c74e9b038c328a1ae29787a),
  2022-10-28), and no delete action on 3.3, so OPS 3.3 should fail the
  delete as OJS does (unverified, not walked). An upgraded journal was
  not walked.
- Introduced: `git log -S` on the galley clone in OJS finds it first in
  [88aba9a0cb](https://github.com/pkp/ojs/commit/88aba9a0cb9a46881fdb0c2b46c3f311d98be7d5)
  (merged with `pkp/ojs#2457`, 2019-09-05), moved since by the
  repository refactors (`pkp/pkp-lib#5328`) without change to the
  galley's file. OPS's history carries the same commit.
- Upstream: searched pkp/pkp-lib, pkp/ojs, pkp/ops and pkp/ui-library
  on 2026-10-02 (new version galley file, delete galley version, the
  foreign key's name, versioning galley submission file copy).
  `pkp/pkp-lib#11900` reports the failed delete of a whole submission
  and names the shared file as its cause; its PR `pkp/pkp-lib#12846`
  is open and not in the checkout.
- Tips: `main` OJS b84f8e2e44 (pkp-lib ddd8ab243a), OPS c8af945bb7
  (pkp-lib 3dc90c81a6), OMP 3b0ecf794; `stable-3_5_0` OJS 091fb65453,
  OPS 38b61882d3 (pkp-lib cf3f984335); `stable-3_4_0` OJS c1827e3527,
  OPS acd8ae704b (pkp-lib 9e41f10273); `stable-3_3_0` OJS ac77c9fb35,
  OPS c5532e2161 (pkp-lib ac3fa73402).
- Not checked: MySQL (the walks ran on PostgreSQL; the foreign key
  refuses the same way there, per `pkp/pkp-lib#11900`'s log); HTML
  galleys with dependent files (the fix copies them, not exercised);
  the repair migration (not written).
