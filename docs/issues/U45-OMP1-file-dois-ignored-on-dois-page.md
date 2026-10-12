# A press's DOIs page lists no books when only "Files" is ticked, and "Needs DOI" skips missing file DOIs

- **Severity** medium
- **Effort** small
- **Kind** regression (the empty list, new on `main`; the filters and "Mark DOIs Needs Sync" ignoring file DOIs are a defect, there since the DOIs page arrived in 3.4)
- **Affects**
  - main: OMP
  - 3.5: OMP (not the empty list)
  - 3.4: OMP (code; not the empty list)
  - 3.3: none (code; no DOIs page)
- **Introduced**
  - the empty list: `pkp/pkp-lib#12119` and `pkp/omp#2197` for `pkp/pkp-lib#11887` · [0ccc9a3f0d](https://github.com/pkp/pkp-lib/commit/0ccc9a3f0db386caee94929f244fd3c3cc8f7620), [6a08a46f03](https://github.com/pkp/omp/commit/6a08a46f032a2203ff8362cfe3f5dcb11c37aa6c) · 2025-12-10 and 2025-12-17 · Bozana Bokan (bozana)
  - the filters: `pkp/omp#1070` for `pkp/pkp-lib#7682` · [695afbf86b](https://github.com/pkp/omp/commit/695afbf86bad0f5e495d2176a003941bd7784496) · 2022-02-22 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-12)
- **Tracked in** spec U45 [OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#omp1)
- **Checked** 2026-10-12, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

Update 2026-10-12: `pkp/omp#2495` (for `pkp/pkp-lib#13447`, merged
2026-10-09) changed which books the DOIs page lists on `main`: every
submitted book that is not declined, where it listed only those in
Copyediting or Production, published or with a DOI. That shorter list
is now the "Workflow" filter. Both faults stand, walked again on `main`
and 3.5. The same day's walks added two symptoms of the same cause: the
refused "Mark DOIs Needs Sync", and on 3.5 the "Status" filters that do
not narrow the list with "Files" alone.

## Summary

A press's DOIs page does not count the DOIs of files. That shows as two
faults, and one fix covers both.

New on `main`, in no release: a press ticks "Files" alone under "Items
with DOIs" and saves. Its DOIs page then reads "No items found.", so
the files' DOIs can be neither seen nor assigned there. The way round
is to tick a second kind, such as "Monographs", and "Assign DOIs" then
also gives each book it is used on a DOI of its own. A book's files
still get their DOIs automatically when it is published, unless
"Automatic DOI Assignment" is "Never".

In every release since 3.4: with a second kind ticked the books are
listed with their file rows, but the filters and one action ignore file
DOIs. "Needs DOI" leaves out a book that has its own DOI but whose file
has none, although that file's row reads "Needs DOI". "Mark DOIs Needs
Sync" refuses a book whose only registered DOI is a file's. "Assign
DOIs" still fills a missing file DOI on any book that is ticked.

## Impact

- **Lost.** No DOI or setting is lost. On `main` a press with "Files"
  alone cannot see, assign or edit a file DOI on the page. A file added
  to a book that is already published gets no DOI until the book is
  next published, unless "Automatic DOI Assignment" is "Immediately,
  when an item is created (only with the default DOI suffix)". In the
  releases, "Needs DOI" misses a book whose only gap is a file's DOI,
  and nothing says so; the refused "Mark DOIs Needs Sync" shows an
  error window.
- **Who.** Press managers and editors on the DOIs page of a press that
  gives DOIs to files. "Files" is unticked by default.
- **Way round.**
  - The empty list: tick a second kind as well, then use "Assign DOIs".
    With "Monographs" as that kind, each book it is used on gets a book
    DOI too, and so does every later book while the box stays ticked.
    A published book's page shows that DOI to readers as a link until
    the press deletes it, by emptying its box on the DOIs page and
    pressing "Save". OMP ships no registration agency plugin, so the
    install deposits none of these DOIs.
  - "Needs DOI": leave the filter off, tick the books and use "Assign
    DOIs", which fills any missing file DOI. A file's DOI can also be
    typed into its row; that saves it but reports "Some DOI(s) could
    not be updated" (U45
    [OMP2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#omp2)).
  - "Mark DOIs Needs Sync": only by also marking a DOI of another kind
    registered on the same book. The status matters only to a
    registration agency plugin.

Medium, and the empty list on `main` carries it: a press with "Files"
alone finds its DOIs page empty with no word why, and the way round on
screen costs a DOI of another kind on each book, public until deleted.
The filters and the refused action, which are all that 3.5 and 3.4
have, would be low by themselves: no DOI is lost, "Assign DOIs" fills
a missing file DOI whether or not a filter lists the book, and the
refused status serves only an agency plugin, which OMP does not ship.
It would be high if a press could not remove the extra DOIs, or if an
agency plugin the press added deposited them.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main`. Its press `publicknowledge`
  has DOIs on, "Items with DOIs" "Monographs" only, no DOI prefix, and
  no DOIs yet.
- The dataset's published books "Bomb Canada and Other Unkind Remarks
  in the American Media" (submission 5; format "PDF" with the file
  "epilogue.pdf") and "From Bricks to Brains: The Embodied Cognitive
  Science of LEGO Robots" (submission 14; format "PDF" with six files).
  These are the dataset's only books with files on a format. Nothing is
  created.

Giving a book its own DOI:

1. Sign in as `dbarnes`.
2. Settings › Distribution › "DOIs" › "Setup": type `10.1234` in "DOI
   Prefix" and press "Save".
3. Open "DOIs" in the side menu. Tick "Bomb Canada and Other Unkind
   Remarks in the American Media", choose "Bulk Actions" › "Assign
   DOIs" and confirm "Assign DOIs".

"Files" alone:

4. Back on "Setup", under "Items with DOIs" untick "Monographs", tick
   "Files" and press "Save".
5. Open "DOIs".

Both kinds:

6. On "Setup", tick "Monographs" as well ("Monographs" and "Files") and
   press "Save".
7. Open "DOIs" and expand "Bomb Canada and Other Unkind Remarks in the
   American Media".
8. Press the "Needs DOI" filter.

"Mark DOIs Needs Sync" (on a fresh dataset, after steps 1 and 2):

9. On "Setup", untick "Monographs", tick "Chapters" and "Files" and
   press "Save". ("Files" alone lists nothing on `main`. "Bomb Canada
   …" has no chapter with a page of its own, so only its file gets a
   DOI.)
10. Open "DOIs". Tick "Bomb Canada …", choose "Bulk Actions" › "Assign
    DOIs" and confirm.
11. Tick it again, choose "Mark DOIs Registered" and confirm.
12. Tick it again, choose "Mark DOIs Needs Sync" and confirm.

**Expected.** Step 5: the "Monographs" tab lists the 18 books step 3
showed (every submitted book that is not declined, which is all of the
dataset's). "Bomb Canada …" and "From Bricks to Brains …" expand to
their file rows ("PDF / epilogue.pdf", …), ready for "Assign DOIs".
Step 8: "Bomb Canada …" is listed, since its file has no DOI. Step 12:
the notice "Items successfully marked needs sync", and the row "PDF /
epilogue.pdf" reads "Needs Sync".

**Observed.** Step 5: the tab reads "No items found.". Step 7: the book's
rows read "Monograph" `10.1234/…` "Unregistered" and "PDF /
epilogue.pdf" (empty) "Needs DOI". Step 8: 17 books are listed, "From
Bricks to Brains …" (no DOI of its own) among them; "Bomb Canada …" is
not. Step 12: the window "DOI Updates Failed" opens, and the row still
reads "Registered":

```
Some DOI(s) could not be updated
Failed to mark the DOI needs sync for Bomb Canada and Other Unkind Remarks in the American Media. The DOI cannot be marked needs sync because they have not yet been registered or submitted.
```

[3.5: steps 3 and 5 both list seven books, the published ones and those
in Copyediting or Production, so step 5 is as expected there. Step 8
lists six of them, without "Bomb Canada …". With "Files" alone (step 4)
"Needs DOI" and "DOI Assigned" each list all seven, before and after
"Assign DOIs" on "Bomb Canada …". Steps 10 to 12 end in the same
window, with "Files" alone and with step 9's two kinds.]

Control: right after step 3, with "Monographs" alone still ticked,
"Needs DOI" leaves "Bomb Canada …" out and "DOI Assigned" lists it
alone. That is right, since files do not count while "Files" is
unticked.

## Cause

OMP's submission collector (`APP\submission\Collector`,
`classes/submission/Collector.php`) chooses which books the DOIs page
lists and which books each filter keeps. Its DOI methods know three of
the press's four DOI kinds, `publication`, `chapter` and
`representation`, and not `file` (`Repo::doi()::TYPE_SUBMISSION_FILE`).
Every other DOI path in OMP handles files beside the other three: the
DOI repository's `getDoisForPublication()`, the deposit query in
`APP\doi\DAO`, the collector's DOI search
(`addFilterByAssociatedDoiIdsToQuery()`), and the page's rows
(`DoiListPanelOMP.vue`).

The empty list. Since `pkp/pkp-lib#11887`, OMP's
`pages/dois/DoisHandler.php` fetches the list with
`GET /api/v1/submissions?onDoiPage=true`. In
`PKP\submission\Collector::getQueryBuilder()`, an early return gives no
rows for `onDoiPage` when the press's ticked kinds share nothing with
the app's `getAllowedDoiTypes()`. OMP's `getAllowedDoiTypes()` leaves
out `file`, so with "Files" alone the query returns nothing.

`addOnDoiPageFilterToQuery()` itself needs no ticked kind to list a
book. Since `pkp/omp#2495` it takes every submitted book that is not
declined, and besides those the former list: Copyediting or
Production, published, or carrying a DOI of a ticked kind
(`addInEditingPublishedOrWithDoisToQuery()`). So adding the file kind
to `getAllowedDoiTypes()` alone fixes step 5 (code). Before
`pkp/pkp-lib#11887` the page asked by stage (`stageIds`), which ignored
the kinds; 3.5 still does.

"Needs DOI". `addHasDoisFilterToQuery()` serves "Needs DOI"
(`hasDois=0`) and "DOI Assigned" (`hasDois=1`). It joins the current
version's chapters and formats and tests the `doi_id` of each ticked
kind. It never joins the formats' files, so a file DOI, missing or set,
never counts. The filter was written this way in `pkp/pkp-lib#7682`,
after file DOIs arrived with `pkp/pkp-lib#7014`.

With "Files" alone the method does not filter at all. None of its
`when()` branches applies, the nested `where` group stays empty, and
Laravel drops an empty group (`addNestedWhereQuery()`), so the subquery
returns every publication. On `main` the early return hides that. 3.5
and 3.4 list by stage, so there both "Status" filters show the whole
list (3.5 on screen).

Reach:

- "DOI Assigned" ignores file DOIs the same way: a book whose only DOI
  is a file's is not listed (code).
- `addDoiStatusFilterToQuery()` ignores file DOIs too, and it has two
  callers. Under the "Registration" filters, a book whose only
  "Registered" DOI is a file's is never listed under "Registered"
  (code). And `PKPDoiController::markSubmissionsStale()`, behind "Mark
  DOIs Needs Sync", accepts only the books that
  `filterByDoiStatuses([STATUS_SUBMITTED, STATUS_REGISTERED])` returns,
  and answers 400 `doi.incorrectStaleStatus` for any other: step 12 (on
  screen). This method checks no kind at all. It joins the chapters'
  and formats' DOIs whether or not those kinds are ticked.
- The "Workflow" filter, "In Copyediting, Production, Published or
  with DOIs" (`inEditingOrPublished`), goes through the same early
  return: with "Files" alone it lists nothing either (code).
- `addInEditingPublishedOrWithDoisToQuery()` is that filter's list. In
  the full list it is also what keeps a declined book that is in
  Copyediting or Production, is published, or carries a DOI. The DOI it
  counts is a publication's, chapter's or format's, never a file's. So
  a book in Submission or Review whose only DOI is a file's is missing
  under "Workflow", and a declined one from the full list (code).
- The search box already covers file DOIs (code), and the page's file
  rows are correct (on screen).
- OJS and OPS have no file DOIs; their collectors list all their own
  kinds (code).

## Proposed fix

We propose adding the file kind to the collector's DOI methods, in
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/file-dois-ignored-on-dois-page/fix.diff)
(one OMP file):

- `getAllowedDoiTypes()`: add `Repo::doi()::TYPE_SUBMISSION_FILE`.
  This line alone mends the empty list.
- `addHasDoisFilterToQuery()`: a `when(in_array(…TYPE_SUBMISSION_FILE…))`
  branch like the chapter and format ones. "DOI Assigned" counts a file
  `doi_id`; "Needs DOI" counts a file without one. A new
  `joinFormatProofFiles()` helper joins the proof files of each format
  of the current version, the files `createDois()` and
  `getDoisForPublication()` take.
- `addDoiStatusFilterToQuery()`: the same file join and the files'
  DOIs beside the formats'. This mends the "Registration" filters and
  "Mark DOIs Needs Sync" together; without it a press with "Files"
  alone would get its list and then be refused that action on every
  book. Like the existing joins it checks no kind, so a file's DOI then
  counts even while "Files" is unticked, as a chapter's or format's
  already does. Is that intended? With unticked kinds counted, "Mark
  DOIs Needs Sync" accepts a book whose only registered DOI is of an
  unticked kind and marks nothing, since `getDoisForSubmission()` skips
  unticked kinds (code). If it is not intended, all three joins should
  follow the ticked kinds.
- `addInEditingPublishedOrWithDoisToQuery()`: a `when(in_array(…))`
  branch that also counts a DOI on a format's proof file, in any
  version, like the chapter and format branches beside it. It matters
  only for the book the Reach names for this method, which the
  "Workflow" filter and the full list then keep. That book is rare and
  the branch was not tried on one, so the team may drop it; the other
  three bullets do not depend on it.

The heart, in `addHasDoisFilterToQuery()`:

```php
->leftJoin('submission_files as current_sf', fn (JoinClause $join) => $this->joinFormatProofFiles($join))
…
$q->when(in_array(Repo::doi()::TYPE_SUBMISSION_FILE, $this->enabledDoiTypes), function (Builder $q) {
    $q->orWhere(function (Builder $q) {
        $q->whereNull('current_sf.doi_id');
        $q->whereNotNull('current_sf.submission_file_id');
    });
});
```

Tried on `main`. With the fix:

- Step 5 lists the 18 books, and step 8 lists "Bomb Canada …" with the
  other 17.
- With "Files" alone, "Needs DOI" lists the two books that have files
  and "DOI Assigned" none. After "Assign DOIs" on "Bomb Canada …" that
  book moves from the first list to the second.
- With "Files" alone, "Mark DOIs Needs Sync" on that book, its file DOI
  marked registered, answers "Items successfully marked needs sync" and
  the file's row reads "Needs Sync". Step 12 ends the same way.
- With "Files" alone, the "Workflow" filter lists the seven books that
  are published or in Copyediting or Production. A book whose file DOIs
  were assigned and marked registered is listed under "Registered".

The control reads the same with and without the fix, its "Workflow"
filter included (the same seven books).

**Alternatives**

- Go back to listing by stage in `DoisHandler`. That loses what
  `pkp/pkp-lib#11887` was for: books published from an early stage.
- Drop the early return in `PKP\submission\Collector`. That would mend
  the list but not the filters, and the return guards OJS and OPS too.

**What goes with it**

- The REST API on a press that ticks "Files": `onDoiPage` and
  `inEditingOrPublished` return books where "Files" alone returned
  none, and `doiStatus` also returns the books with a file DOI in that
  status. `hasDois` with "Files" alone returns fewer: today every book,
  then only those with, or missing, a file DOI. The callers are the
  DOIs page and, for the status filter, `markSubmissionsStale()`.
- Backport to 3.5 and 3.4, which need the `addHasDoisFilterToQuery()`
  and `addDoiStatusFilterToQuery()` hunks, the `joinFormatProofFiles()`
  helper and the two imports (not tried). fix.diff does not hand them
  over as it stands: on 3.5 the import and filter hunks apply, the
  helper shares a hunk with the `getAllowedDoiTypes()` line 3.5 lacks
  and is placed by hand, and the
  `addInEditingPublishedOrWithDoisToQuery()` hunk is left out (`patch`
  would land it in another method).
- Guard: an e2e case in U45 (a book missing only its file DOI under
  "Needs DOI", "Files" alone listing the books, and "Mark DOIs Needs
  Sync" on a book whose only registered DOI is a file's), or a unit
  test on the collector.

Small: one OMP class, about forty lines that follow the branches
already there, and no data repair.

## Evidence

- Kept script that takes the Steps in the browser on OMP (OJS and OPS
  have no file DOIs), on an install loaded from PKP's default test
  dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/file-dois-ignored-on-dois-page/walk.js),
  run after `npm run fleet-prep -- --feature issues --dataset --reset`
  with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js omp shared/playwright/checks/issues/file-dois-ignored-on-dois-page/walk.js`.
  Its modes, each on a fresh dataset:
  - no `WALK`: steps 1 to 8.
  - `WALK=files`: steps 1 and 2, then "Files" alone with the list and
    both "Status" filters and, where the list has book 5, "Assign
    DOIs", the filters again, "Mark DOIs Registered" and "Mark DOIs
    Needs Sync"; then steps 9 to 12. So it saves "Files" alone and
    opens the page before step 9, which the Steps do not.
  - `WALK=neighbour`: the "Monographs"-alone control, then its
    "Workflow" filter.
  - `WALK=reach`: "Files" alone with the "Workflow" filter and the
    "Registered" check (meaningful only with the fix).
- The fix, tried 2026-10-12 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/file-dois-ignored-on-dois-page/fix.diff omp`,
  then walk.js in each of its four modes, then
  `node bin/try-fix.js revert …`. The neighbour and files modes were
  also run without the fix. The neighbour's four lists matched (18
  books; "Needs DOI" 17, without book 5; "DOI Assigned" book 5 alone;
  "Workflow" books 14, 13, 11, 7, 5, 4, 1). The files mode without the
  fix: "Files" alone lists nothing, so nothing can be ticked there, and
  step 12 answers 400.
- Walked 2026-10-12 on PostgreSQL, each install freshly loaded from
  pkp/datasets fac2371 (2026-10-11), `omp/main/pgsql` and
  `omp/stable-3_5_0/pgsql`, no upgrade needed. No request answered a
  server error and no page script failed; step 12's
  `PUT …/dois/submissions/markStale` answers 400 with the message
  quoted in Observed.
  - main: OMP eb4c30aa3c (lib/pkp 58c7f454ff, ui-library 38814ea1).
  - stable-3_5_0: OMP 486cbf9eb (lib/pkp 8094f06bf5, ui-library
    2576e00a), the default mode and `WALK=files`.
- 3.5, by code as well: `pages/dois/DoisHandler.php` asks by
  `stageIds` (no `onDoiPage`, no `getAllowedDoiTypes()`), and
  `classes/submission/Collector.php` has the same three-kind
  `addHasDoisFilterToQuery()` and `addDoiStatusFilterToQuery()`;
  `PKPDoiController::markSubmissionsStale()` makes the same
  `filterByDoiStatuses()` call. `pkp/omp#2495` is not on the branch.
- 3.4, by code: OMP `stable-3_4_0` at 0aec65441 lists by `stageIds` in
  `pages/dois/DoisHandler.php` and has the same three-kind
  `addHasDoisFilterToQuery()` and `addDoiStatusFilterToQuery()` in
  `classes/submission/Collector.php`. "Files" is offered in
  `DoiSetupSettingsForm`. pkp-lib `stable-3_4_0` at 55c8e406b3 offers
  the "Needs DOI" filter (`PKPDoiListPanel`) and makes the same
  `filterByDoiStatuses()` call in `PKPDoiHandler::markSubmissionsStale()`.
- 3.3, by code: OMP `stable-3_3_0` at 8e72fc883 (pkp-lib
  `stable-3_3_0` at 5e84acd11b) has no `pages/dois`; DOIs are set in
  the DOI plugin.
- Introduced: `git blame` on `getAllowedDoiTypes()` in OMP `main` gives
  6a08a46f03 (PR `pkp/omp#2197`, "list all submissions on the DOIs
  management page"). The early return in pkp-lib's `getQueryBuilder()`
  gives 0ccc9a3f0d (PR `pkp/pkp-lib#12119`), both for
  `pkp/pkp-lib#11887`. `addOnDoiPageFilterToQuery()` and the new
  `addInEditingPublishedOrWithDoisToQuery()` now blame to
  [1614d5e442](https://github.com/pkp/omp/commit/1614d5e442cdbdfba386e5990de8a908681b8f47)
  (`pkp/omp#2495`, 2026-10-07), which changed the books listed and kept
  the three kind branches of 6a08a46f03. The
  `addHasDoisFilterToQuery()` branches blame to 695afbf86b (PR
  `pkp/omp#1070`, `pkp/pkp-lib#7682`), adjusted by e4cd15951a and
  52d382fd1c without adding a file branch.
  `addDoiStatusFilterToQuery()` and `TYPE_SUBMISSION_FILE` date from
  OMP
  [440b0394cb](https://github.com/pkp/omp/commit/440b0394cb051e53fb3c16d83d2f3a9e50a85190)
  (`pkp/pkp-lib#7014`, 2021-11-30), by the same author.
- Impact and way round, by code on `main`, none of it walked:
  - `Repo::submission()->createDois()` (behind "Assign DOIs") and
    `Repo::publication()->createDois()` (at publication,
    `PKP\observers\listeners\AssignDOIs::handlePublished()`, unless the
    setting is "Never") give DOIs to every ticked kind, the files of
    the version's formats included.
  - A proof file added to a format gets a DOI at once only when
    `Repo::doi()->assignOnItemCreation()` holds ("Immediately, …" with
    the default suffix): `APP\submissionFile\Repository::add()` calls
    `Repo::publication()->createDoisOnCreation()`.
  - The book's public page prints the publication's DOI as a link
    whenever it has one, whatever its status or the ticked kinds
    (`pages/catalog/CatalogBookHandler.php`, `monographDoiObject` in
    `templates/frontend/objects/monograph_full.tpl`).
  - OMP `main` ships no agency plugin under `plugins/`; an emptied DOI
    box is deleted (`DoiListItem.vue` `deleteDoi()`).
  - "Mark DOIs Needs Sync" passes once the book has a registered DOI of
    another kind: `addDoiStatusFilterToQuery()` tests the
    publication's, chapters' and formats' DOIs.
- Backport, a dry run of fix.diff with `patch` on a copy of 3.5's
  `Collector.php`: hunks 1 to 5 apply at offset −1, hunk 6 lands with
  fuzz at the end of the file, in another method, and hunk 7 fails. Nothing was applied to a 3.5 checkout.
- Upstream search 2026-10-12 in pkp/pkp-lib, pkp/omp and pkp/ui-library,
  by symptom words and by `getAllowedDoiTypes`, `onDoiPage` and
  `addHasDoisFilterToQuery`: nothing about this fault. `pkp/omp#2495`
  says of the DOIs page only that it "lists all submitted submissions
  that haven't been declined plus the previous list"; it does not
  mention the file kind there. `pkp/pkp-lib#13415` (published articles
  missing from the OJS DOIs page) has another cause.
- Not driven: "DOI Assigned" with two kinds ticked, with or without
  the fix; the "Registration" filters without the fix (code; step 12
  shows the same query refusing); the "Workflow" filter with "Files"
  alone without the fix (code: the same early return); a book in
  Submission or Review, or a declined one, whose only DOI is a file's
  (the dataset has none, and making one needs a format and a proof
  file on an unreviewed book); "Mark DOIs Needs Sync" on a book whose
  only registered DOI is of an unticked kind; the 3.5 and 3.4 backport;
  MySQL (the queries are plain joins).
- Unverified: what a registration agency plugin a press adds itself
  does with the way round's extra DOIs (the checkout has none), and
  that a file added to a published book gets its DOI at the next
  publication (read in `handlePublished()` and `createDois()`).
