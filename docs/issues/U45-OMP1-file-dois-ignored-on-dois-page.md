# A press's DOIs page lists no books when only "Files" is ticked, and "Needs DOI" skips missing file DOIs

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP ("Needs DOI" only)
  - 3.4: OMP (code; "Needs DOI" only)
  - 3.3: none (code; no DOIs page)
- **Introduced**
  - the empty list: `pkp/pkp-lib#12119` and `pkp/omp#2197` for `pkp/pkp-lib#11887` · [0ccc9a3f0d](https://github.com/pkp/pkp-lib/commit/0ccc9a3f0db386caee94929f244fd3c3cc8f7620), [6a08a46f03](https://github.com/pkp/omp/commit/6a08a46f032a2203ff8362cfe3f5dcb11c37aa6c) · 2025-12-10 and 2025-12-17 · Bozana Bokan (bozana)
  - "Needs DOI": `pkp/omp#1070` for `pkp/pkp-lib#7682` · [695afbf86b](https://github.com/pkp/omp/commit/695afbf86bad0f5e495d2176a003941bd7784496) · 2022-02-22 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U45 [OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#omp1)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A press ticks "Files" alone under "Items with DOIs" and saves. Its DOIs
page then reads "No items found.", so the files' DOIs can be neither
seen nor assigned there. With "Monographs" ticked as well, the press's
books are listed with their file rows, but the "Needs DOI" filter
ignores file DOIs. A book that has its own DOI but whose file has none
is left out, although that file's row reads "Needs DOI".

For a press that wants DOIs on files only, the way round is to tick a
second kind, such as "Monographs". "Assign DOIs" then also gives each
book a DOI of that kind, which the press must accept or delete row by
row. Publishing a book still gives its files DOIs by themselves,
unless "Automatic DOI Assignment" is "Never".

## Impact

- **Lost.** No DOI or setting is lost. On a press with "Files" alone
  the page lists no book, so file DOIs come only from the automatic
  assignment at publication; a file added later gets none. "Needs DOI"
  never shows a book whose only gap is its files, and nothing says so.
- **Who.** Press managers and editors on the DOIs page of a press that
  gives DOIs to files. "Files" is unticked by default.
- **Way round.** Tick another kind as well, then use "Assign DOIs".
  Each book also gets a DOI of the extra kind. OMP ships no
  registration agency plugin, so the install deposits none of them, and
  each can be deleted by emptying its box and pressing "Save". Typing a
  file's DOI into its row instead saves it but reports "Some DOI(s)
  could not be updated" (U45
  [OMP2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#omp2)).
  For "Needs DOI", tick every book and use "Assign DOIs", which fills
  any missing file DOI whether the filter lists the book or not.

Medium: the list and the filter fail silently, but there is a way
round on screen, and its cost is extra DOIs that the install never
deposits and that can be deleted. It would be high if a press could not remove the extra
DOIs, or if they were deposited.

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

**Expected.** Step 5: the "Monographs" tab lists the seven books step 3
showed (the published ones and those in Copyediting or Production).
"Bomb Canada …" and "From Bricks to Brains …" expand to their file rows
("PDF / epilogue.pdf", …), ready for "Assign DOIs". Step 8: "Bomb Canada
…" is listed, since its file has no DOI.

**Observed.** Step 5: the tab reads "No items found.". Step 7: the book's
rows read "Monograph" `10.1234/…` "Unregistered" and "PDF /
epilogue.pdf" (empty) "Needs DOI". Step 8: six books are listed, "From
Bricks to Brains …" (no DOI of its own) among them; "Bomb Canada …" is
not.

Control: right after step 3, with "Monographs" alone still ticked,
"Needs DOI" leaves "Bomb Canada …" out and "DOI Assigned" lists it. That
is right, since files do not count while "Files" is unticked.

## Cause

OMP's submission collector (`APP\submission\Collector`,
`classes/submission/Collector.php`) chooses which books the DOIs page
lists and which books each filter keeps. Its DOI methods know three of
the press's four DOI kinds, `publication`, `chapter` and
`representation`, and not `file` (`Repo::doi()::TYPE_SUBMISSION_FILE`).
Every other DOI path in OMP handles files beside the other three: the
DOI repository's `getDoisForSubmission()`, the deposit query in
`APP\doi\DAO`, the collector's DOI search
(`addFilterByAssociatedDoiIdsToQuery()`), and the page's rows
(`DoiListPanelOMP.vue`).

The empty list. Since `pkp/pkp-lib#11887`, OMP's
`pages/dois/DoisHandler.php` fetches the list with
`GET /api/v1/submissions?onDoiPage=true`. In
`PKP\submission\Collector::getQueryBuilder()`, an early return gives no
rows for `onDoiPage` when the press's ticked kinds share nothing with
the app's `getAllowedDoiTypes()`. OMP's `getAllowedDoiTypes()` leaves
out `file`, so with "Files" alone the query returns nothing. That
return is the only reason the list is empty. The first clause of
`addOnDoiPageFilterToQuery()` (Copyediting or Production, or published)
does not depend on the kinds and already picks the seven books. So
adding the file kind to `getAllowedDoiTypes()` alone fixes step 5
(code). Before that change the page asked by stage (`stageIds`), which
ignored the kinds; 3.5 still does.

"Needs DOI". `addHasDoisFilterToQuery()` serves "Needs DOI"
(`hasDois=0`) and "DOI Assigned" (`hasDois=1`). It joins the current
version's chapters and formats and tests the `doi_id` of each ticked
kind. It never joins the formats' files, so a file DOI, missing or set,
never counts. The filter was written this way in `pkp/pkp-lib#7682`,
after file DOIs arrived with `pkp/pkp-lib#7014`.

Reach:

- "DOI Assigned" ignores file DOIs the same way: a book whose only DOI
  is a file's is not listed (code).
- The "Registration" filters (`addDoiStatusFilterToQuery()`) ignore
  file DOIs too: a book whose only "Registered" DOI is a file's is never
  listed under "Registered" (code). This method checks no kind at all.
  It joins the chapters' and formats' DOIs whether or not those kinds
  are ticked.
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
  `doi_id`; "Needs DOI" counts a file without one. The files are joined
  as the page shows them, through a new `joinFormatProofFiles()` helper:
  the proof files assigned to each format of the current version
  (`APP\publication\maps\Schema`).
- `addDoiStatusFilterToQuery()`: the same file join and the files'
  DOIs beside the formats'. Like the existing joins it checks no kind,
  so the "Registration" filters then count a file's DOI even while
  "Files" is unticked, as they already do for chapters and formats.
  Is counting unticked kinds intended there? If not, all three joins
  should follow the ticked kinds.
- `addOnDoiPageFilterToQuery()`: a `when(in_array(…))` branch that
  also lists a book with any proof file carrying a DOI, matched by
  submission, with no format join and no limit to the current version.
  It only adds a book that is neither in Copyediting or Production nor
  published, which is rare. The team may drop it, or write it with the
  format join like the others.

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

Tried on `main`: with the fix, step 5 lists the seven books and step 8
lists "Bomb Canada …". The control reads the same with and without the
fix. With "Files" alone, a book whose file DOIs were assigned and
marked registered is listed under "Registered". "DOI Assigned" with
"Files" ticked was not tried.

**Alternatives**

- Go back to listing by stage in `DoisHandler`. That loses what
  `pkp/pkp-lib#11887` was for: books published from an early stage.
- Drop the early return in `PKP\submission\Collector`. That would mend
  the list but not the filters, and the return guards OJS and OPS too.

**What goes with it**

- The REST API's `onDoiPage`, `hasDois` and `doiStatus` parameters
  return more books on a press that ticks "Files"; the page is their
  caller.
- Backport to 3.5 and 3.4, where only the filters are affected: the
  `addHasDoisFilterToQuery()` and `addDoiStatusFilterToQuery()` hunks,
  with the `joinFormatProofFiles()` helper and the `JoinClause` and
  `SubmissionFile` imports (not tried).
- Guard: an e2e case in U45 (a book missing only its file DOI under
  "Needs DOI", and "Files" alone listing the books), or a unit test on
  the collector.

Small: about forty lines in one OMP class, following the branches
already there, with no data repair; the list alone is one line.

## Evidence

- Kept script that takes the Steps in the browser on OMP (OJS and OPS
  have no file DOIs), on an install loaded from PKP's default test
  dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/file-dois-ignored-on-dois-page/walk.js),
  run after `npm run fleet-prep -- --feature issues --dataset --reset`
  with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js omp shared/playwright/checks/issues/file-dois-ignored-on-dois-page/walk.js`.
  `WALK=neighbour` in front takes the "Monographs"-alone control;
  `WALK=reach` takes the "Registered" check (meaningful only with the
  fix, since without it "Files" alone lists nothing).
- The fix, tried 2026-10-01 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/file-dois-ignored-on-dois-page/fix.diff omp`,
  then walk.js in each of its three modes on a fresh dataset, then
  `node bin/try-fix.js revert …`. The neighbour mode was also run
  without the fix; its lists matched.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets 38ab955 (2026-09-30), `omp/main/pgsql` and
  `omp/stable-3_5_0/pgsql`, no upgrade needed. No request failed and no
  page script failed.
  - main: OMP 3b0ecf794 (lib/pkp 3dc90c81a6, ui-library 280f98c5).
  - stable-3_5_0: OMP 3081c9b00 (lib/pkp a9c76aed62, ui-library
    1a7a4750).
- 3.4, by code: OMP `stable-3_4_0` at 0aec65441 lists by `stageIds` in
  `pages/dois/DoisHandler.php` and has the same three-kind
  `addHasDoisFilterToQuery()` and `addDoiStatusFilterToQuery()` in
  `classes/submission/Collector.php`. "Files" is offered in
  `DoiSetupSettingsForm`. pkp-lib `stable-3_4_0` at df13621c2d offers
  the "Needs DOI" filter (`PKPDoiListPanel`).
- 3.3, by code: OMP `stable-3_3_0` at 8e72fc883 (lib/pkp d446601ebe)
  has no DOIs page; DOIs are set in the DOI plugin.
- Introduced: `git blame` on `getAllowedDoiTypes()` and
  `addOnDoiPageFilterToQuery()` in OMP `main` gives 6a08a46f03 (PR
  `pkp/omp#2197`, "list all submissions on the DOIs management page").
  The early return in pkp-lib's `getQueryBuilder()` gives 0ccc9a3f0d
  (PR `pkp/pkp-lib#12119`), both for `pkp/pkp-lib#11887`. The
  `addHasDoisFilterToQuery()` branches blame to 695afbf86b (PR
  `pkp/omp#1070`, `pkp/pkp-lib#7682`), adjusted by e4cd15951a and
  52d382fd1c without adding a file branch. `TYPE_SUBMISSION_FILE`
  dates from OMP
  [440b0394cb](https://github.com/pkp/omp/commit/440b0394cb051e53fb3c16d83d2f3a9e50a85190)
  (`pkp/pkp-lib#7014`, 2021-11-30).
- Way round, by code: `Repo::submission()->createDois()` (behind
  "Assign DOIs") and `Repo::publication()->createDois()` (at publish,
  `VersionDois`) give DOIs to every ticked kind, files included; OMP
  `main` ships no agency plugin under `plugins/`; an emptied DOI box is
  deleted (`DoiListItem.vue` `deleteDoi()`). None of this was walked.
- Upstream search 2026-10-01 in pkp/pkp-lib, pkp/omp and pkp/ui-library,
  by symptom words and by `getAllowedDoiTypes`, `onDoiPage` and
  `hasDois`: nothing about this fault.
  `pkp/pkp-lib#13415` (published articles missing from the OJS DOIs
  page) has another cause.
- Not driven: "DOI Assigned" and the "Registration" filters with
  "Files" ticked, without the fix (code); "DOI Assigned" with the fix;
  the 3.5 and 3.4 backport; MySQL (the queries are plain joins).
