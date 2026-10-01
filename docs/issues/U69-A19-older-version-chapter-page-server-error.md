# An older version's chapter page of a book shows a blank server error page to every reader

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OMP (press with "DOI Versioning" "No")
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/omp#2091` for `pkp/pkp-lib#10553` · [89c20392d7](https://github.com/pkp/omp/commit/89c20392d7c005e5abfdd6a4bb1c79710571a9ca) · 2025-09-16 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U69 [A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a19)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

The server fails when a reader opens a chapter's page in an older
version of a book. Instead of the chapter under the "This is an outdated
version" notice, the reader gets a blank server error page. All three
ways in fail: the address typed, the chapter's link in the older
version's table of contents, and the older version's link in the chapter
page's "Versions" list.

The older version's book page and the current version's chapter pages
still open.

It needs three things, and the first is the default:

- the press's "DOI Versioning" reads "No", as it does until someone
  changes it;
- the chapter has its own page ("Chapter Page" is a tick on each
  chapter);
- the chapter has no DOI in the older version, which is every chapter
  of a press that assigns no chapter DOIs.

A DOI assigned after the second version is published does not help: it
goes to the current version's chapter only.

## Impact

- **Lost.** The older version's chapter page, with that version's
  abstract and files of the chapter. The page is blank, with no link
  onward, and nobody at the press is told.
- **Who.** Readers of a press that gives chapters their own pages, once
  such a book has a second published version.
- **Way round.** The older version's book page lists the chapter with
  its files. Setting "DOI Versioning" to "Yes" makes the page open, but
  is not a way round to recommend: from then on every new major version
  of a book and its chapters gets a DOI of its own.

Medium: one reader page fails for everyone, but only for an older
version of a chapter, and that version's book page still carries the
chapter's files. It would be high if the current version's chapter pages
failed too.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for OMP `main`, freshly loaded. The press's
  "DOI Versioning" (Settings › Distribution › "DOIs" › "Setup") reads
  "No".
- Submission 14, "From Bricks to Brains: The Embodied Cognitive Science
  of LEGO Robots", is published in one version. Its "Chapter 1: Mind
  Control—Internal or External?" has its "Chapter Page" ticked and no
  DOI.
- No book in the dataset has two published versions, so steps 3 and 4
  publish a second one.

1. Sign in as `dbarnes` (Press editor).
2. Open submission 14's workflow,
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=14`.
3. In the "Publication" menu, press "Create New Version" and, in the
   "Create New Version" window, press "Confirm" without changing
   anything. [3.5: the "Create New Version" button, then "Yes".]
4. Press "Publish", then "Publish" in the window that asks "Are you sure
   you want to make this catalog entry public?".
5. Signed out, open `/index.php/publicknowledge/catalog/book/14`.
6. Under "Versions", press the older version, "… (Version of Record
   1.0)". [3.5: "… (1)".]
7. In the table of contents, press "Chapter 1: Mind Control—Internal or
   External?".
8. Open the book's page again (step 5), press "Chapter 1: Mind
   Control—Internal or External?" in its table of contents and, on the
   chapter's page, press the older version under "Versions".

**Expected:** steps 7 and 8 open the older version's chapter page: the
heading "Chapter 1: Mind Control—Internal or External?" under "This is
an outdated version published on {the older version's own publication
date}. Read the most recent version." Its address is
`…/en/catalog/book/14/version/14/chapter/54`, where 14 after "version"
is the older version's number (step 6's address ends with it) and 54
the chapter's (the end of the chapter page's address in step 8).

**Observed:** steps 7 and 8 answer 500 with a blank page (no title, no
text), and so does that address typed. [3.5: both open the page as
Expected.] The server log:

```
[500]: GET /index.php/publicknowledge/en/catalog/book/14/version/14/chapter/54 - Uncaught TypeError: count(): Argument #1 ($value) must be of type Countable|array, int given in …/lib/pkp/lib/vendor/laravel/framework/src/Illuminate/Database/Query/Builder.php:1389
#1 …/classes/monograph/ChapterDAO.php(439): Illuminate\Database\Query\Builder->whereIn()
#2 …/pages/catalog/CatalogBookHandler.php(189): APP\monograph\ChapterDAO->getCurrentPublicationChapterDoi()
```

The current version's chapter page (step 8's first page) and the older
version's book page (step 6) open. After "DOI Versioning" is saved as
"Yes", the older version's chapter page opens.

## Cause

`ChapterDAO::getCurrentPublicationChapterDoi()` (omp
`classes/monograph/ChapterDAO.php` lines 435–444) builds its query with
`->whereIn('publication_id', $currentPublication->getId())`. `whereIn()`
takes a list and counts it; given the publication's ID, an integer,
`count()` throws a `TypeError` before any query runs.

The method came with
[89c20392d7](https://github.com/pkp/omp/commit/89c20392d7c005e5abfdd6a4bb1c79710571a9ca)
("DOIs display on book and chapter landing page"), so that an older
version's chapter page can show the DOI the same chapter has in the
current version. `CatalogBookHandler::book()` (line 189) calls it when
all of these hold: a chapter page is asked for, the chapter has no DOI
of its own in the shown version, "DOI Versioning" is off, and the shown
version is not the current one.

The same method has a second fault behind the first. It ends its query
with `->get()`, which returns a collection of rows, and then tests and
casts that collection (`$doiId ? … (int) $doiId`). A collection is
always true and casts to 1, so with only `whereIn` corrected the page
would show the DOI whose ID is 1, whatever the chapter (none only when
no DOI has ID 1).

Reach:

- Every older version's chapter page on a press with "DOI Versioning"
  "No", for a chapter without a DOI in that version (on screen). That
  includes a chapter whose DOI was assigned after the newer version was
  made: "Assign DOIs" on the "DOIs" page gives one to the current
  version's chapter only (on screen).
- A chapter that already had its DOI when the newer version was made
  escapes the fault: with "DOI Versioning" "No" the new version copies
  the DOI, the older version's chapter keeps its own, and the handler
  never calls the method (code).
- With "DOI Versioning" "Yes" the handler calls
  `ChapterDAO::getMinorVersionsDoi()` instead, which passes `whereIn()`
  a collection of IDs (it accepts one) and reads `->first()?->doi_id`:
  the page opens (on screen).
- The book's own page takes the DOI from the current version's object
  (`$submission->getCurrentPublication()->getData('doiObject')`), with
  no query: it opens (on screen).
- The table of contents does not go through the failing method. For a
  chapter without a DOI, `book()` lines 236–242 fill its line with
  `getMinorVersionsDoi()`, whatever "DOI Versioning" reads: the DOI the
  chapter has in another version of the same stage and major version.
  So on a press with "No", once the page opens, an older version's
  chapter page shows the current chapter's DOI while the same chapter's
  line in that version's table of contents shows it only when the
  current version shares the stage and major version (1.0 and 1.1: the
  same DOI on both, on screen; 1.0 and 2.0: the page shows it, the line
  none, code).
- `getCurrentPublicationChapterDoi()` has one caller. The two
  `whereIn()` calls the same commit added to `ChapterDAO` pass a
  collection. Other `whereIn()` calls were not audited: a grep of OMP's
  `classes`, `pages` and `lib/pkp/classes` showed no other call with an
  ID as a literal second argument, but several pass variables or
  request values that the grep cannot judge.

## Proposed fix

Recommended: make the method read one DOI ID for one publication
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/older-version-chapter-page-server-error/fix.diff)).

```php
// omp classes/monograph/ChapterDAO.php, getCurrentPublicationChapterDoi()
$doiId = DB::table('submission_chapters')
    ->where('publication_id', '=', $currentPublication->getId())
    ->where(function ($query) use ($chapter) {
        $sourceChapterId = $chapter->getData('sourceChapterId');
        $query->where('source_chapter_id', '=', $sourceChapterId)
            ->orWhere(fn ($query) => $query->whereNull('source_chapter_id')->where('chapter_id', '=', $sourceChapterId));
    })
    ->whereNotNull('doi_id')
    ->value('doi_id');

return $doiId ? Repo::doi()->get((int) $doiId) : null;
```

It reads one value from one row with `whereNotNull('doi_id')`, as its
sibling `getMinorVersionsDoi()` does a few lines above, and it keeps
what the introducing change was for: the older chapter page shows the
current chapter's DOI.

A NULL `source_chapter_id` is matched by the chapter's own ID, the rule
`getBySourceChapterId()` and `getBySourceChapterAndPublication()` use in
the same DAO. The column is nullable: every chapter saved on 3.4 or
later holds a number (its own ID for an original chapter;
`Chapter::getSourceChapterId()`), but the 3.4 upgrade added the column
without filling it, and deleting the source chapter sets it to NULL. A
current version's chapter that is itself the original and was last
saved before 3.4 is the row a match on `source_chapter_id` alone would
miss.

Tried on `main`: steps 7 and 8 and the typed address opened the older
version's chapter page under its outdated notice. After the current
version's chapter was given a DOI (prefix set, "Chapters" ticked under
"Items with DOIs", "Assign DOIs" on the "DOIs" page), the older chapter
page showed that same DOI; without the fix it answered 500. Neighbour
checks, the same with the fix in and out: the current version's chapter
page and the older version's book page open, an older version's chapter
without its own page answers "404 Not Found", and with "DOI Versioning"
"Yes" the older chapter page opens. The NULL branch was not driven: no
screen leaves a NULL today.

**Alternatives:**

- Wrapping the ID in a list (`whereIn('publication_id', [$id])`) stops
  the error but leaves the collection cast, so the page would show the
  DOI with ID 1.
- Reading the DOI in the handler from the current version's chapter
  objects would also work, but the lookup already has its place in the
  DAO beside its sibling.

**What goes with it:**

- No stored data is wrong; nothing to repair.
- Left out: the table of contents' rule (Cause, Reach). Whether an older
  version's line should show the current chapter's DOI on a press with
  "DOI Versioning" "No", as the chapter page does, is the team's call.
  `getMinorVersionsDoi()` also matches `source_chapter_id` alone,
  without the DAO's NULL rule.
- The guard: an e2e scenario in U69 (an older version's chapter page on
  a press with "DOI Versioning" "No", with and without a DOI on the
  current chapter); the spec's scenario 7 covers "Yes" only.

Small: one query in one method, following the sibling beside it and the
DAO's own NULL rule, with no data repair.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/older-version-chapter-page-server-error/walk.js)
  takes the Steps on OMP, on an install freshly loaded from the default
  dataset, then the typed address, the controls and the neighbour
  checks (the DOI and the "DOI Versioning" "Yes" checks on `main` only):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/older-version-chapter-page-server-error/walk.js`.
  The fix was tried with
  `node bin/try-fix.js apply …/fix.diff omp`, the same script, then
  `revert`.
- Where the walk differed from the Steps: steps 5 to 8 run in a second
  browser while `dbarnes` stays signed in. The 3.5 walk reached step 8's
  chapter page by its typed address.
- Walked on `main` and `stable-3_5_0` (OMP), PostgreSQL; nothing here
  depends on the database. Datasets: pkp/datasets fetched at 92050d9
  (2026-10-01). OMP 3.5 offers no "DOI Versioning" setting, so the 3.5
  walk stops after the controls. OJS and OPS have no chapters.
- Tips: OMP `main` 3b0ecf794 (lib/pkp 3dc90c81a6); OMP `stable-3_5_0`
  b24879c3d (lib/pkp 1fb843f491); OMP `stable-3_4_0` 0aec65441; OMP
  `stable-3_3_0` 8e72fc883.
- Code reads: `ChapterDAO` and `CatalogBookHandler::book()` on each line
  (3.3: the `.inc.php` files): 3.5, 3.4 and 3.3 have neither
  `getCurrentPublicationChapterDoi()` nor a chapter DOI lookup in the
  handler. Laravel's `Builder::whereIn()` (line 1389,
  `count($values)`). `Repository::version()` (omp
  `classes/publication/Repository.php`): a new version's chapters,
  formats and files keep their DOIs unless "DOI Versioning" is on and
  the version is major. `Chapter::getSourceChapterId()`,
  `ChapterDAO::insertChapter()`, `updateObject()` and `_fromRow()`, the
  install migration's `source_chapter_id` (nullable, foreign key "on
  delete set null") and `I7132_AddSourceChapterId` (no backfill). In
  the default dataset every chapter row holds a `source_chapter_id`.
- Introduced: `git blame` on `ChapterDAO.php` lines 435–444 and
  `CatalogBookHandler.php` lines 182–192 names 89c20392d7 (written
  2025-08-14, merged with `pkp/omp#2091` on 2025-09-16). pkp/omp `main`
  on GitHub still had the line on 2026-10-01.
- Upstream search 2026-10-01, pkp/pkp-lib, pkp/omp and pkp/ui-library:
  "getCurrentPublicationChapterDoi", "chapter landing page older
  version error", "chapter page version 500 DOI versioning", "chapter
  version error", "chapter landing page 500", "older version chapter".
  Nothing about this fault. `pkp/pkp-lib#11819` (open) is a design
  discussion of the "DOIs" page under versioning, not this fault; it
  records that "Assign DOIs" reaches only the current version.
- Unverified: the collection cast showing the DOI with ID 1 and the
  fix's NULL branch (both read in the code, not driven); the table of
  contents of an older version whose current version is a new major
  version (code).
