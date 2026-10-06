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
- **Upstream** none found (2026-10-06)
- **Tracked in** spec U69 [A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a19)
- **Checked** 2026-10-06, each branch's tip (the commits in Evidence)

**Update 2026-10-06.** Widened to the chapter pages of a new version's
preview, which fail the same way for the press's editors (Steps 4 and 5).

## Summary

The server fails when a reader opens a chapter's page in an older
version of a book. Instead of the chapter under the "This is an outdated
version" notice, the reader gets a blank server error page. All three
ways in fail: the address typed, the chapter's link in the older
version's table of contents, and the older version's link in the chapter
page's "Versions" list.

Editors meet the same page in the preview of a book's second or later
version before it is published: each chapter's link in the preview's
table of contents fails. The preview of a book's first version, and
every book page, still open, and so do the current version's chapter
pages.

It needs three things, for both pages, and the first is the default:

- the press's "DOI Versioning" reads "No", as it does until someone
  changes it;
- the chapter has its own page ("Chapter Page" is a tick on each
  chapter);
- the chapter has no DOI in the version shown, which is every chapter
  of a press that assigns no chapter DOIs. A new version's chapter
  carries the DOI its chapter had when the version was made.

A chapter DOI assigned later saves only one of the two pages. Assigned
between "Create New Version" and "Publish", it goes to the published
version's chapter: that version's page opens once it is the older one,
but the preview still fails. Assigned after "Publish", it goes to the
new version's chapter, and the older version's page still fails.

## Impact

- **Lost.** The older version's chapter page, with that version's
  abstract and files of the chapter. The page is blank, with no link
  onward, and nobody at the press is told. Editors cannot check a new
  version's chapter pages before publishing it.
- **Who.** Readers of a press that gives chapters their own pages, on
  every book with two or more published versions; and that press's
  editors, whenever they preview a book's second or later version.
- **Way round.** Readers find the chapter's files on the older
  version's book page. Editors have none: a new version's chapter pages
  can be seen only once it is published. Setting "DOI Versioning" to
  "Yes" makes both pages open, but is not a way round to recommend: from
  then on every new major version of a book and its chapters gets a DOI
  of its own.

Medium: only the chapter pages of versions other than the current one
fail. Readers have a way round, and editors lose a check before
publishing, not the publication. It would be high if the current
version's chapter pages failed too.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for OMP `main`, freshly loaded. The press's
  "DOI Versioning" (Settings › Distribution › "DOIs" › "Setup") reads
  "No".
- Submission 14, "From Bricks to Brains: The Embodied Cognitive Science
  of LEGO Robots", is published in one version. Its "Chapter 1: Mind
  Control—Internal or External?" has its "Chapter Page" ticked and no
  DOI.
- No book in the dataset has two versions, so step 3 makes a second one
  and step 6 publishes it.

1. Sign in as `dbarnes` (Press editor).
2. Open submission 14's workflow,
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=14`.
3. Under "Publication" in the menu, press "Create New Version" and, in
   the "Create New Version" window, press "Confirm" without changing
   anything. The menu lists "Version of Record 1.1", unpublished. [3.5:
   the "Create New Version" button, then "Yes".]
4. Under "Version of Record 1.1", open "Title & Abstract" and press
   "Preview". The new version's preview opens, at
   `…/en/catalog/book/14/version/19`. [3.5: "Title & Abstract" is a
   plain entry, and "Preview" sits beside "Publish".]
5. In the preview's table of contents, press "Chapter 1: Mind
   Control—Internal or External?".
6. Open the workflow again (step 2), open "Version of Record 1.1" ›
   "Title & Abstract", press "Publish", then "Publish" in the window
   that asks "Are you sure you want to make this catalog entry
   public?".
7. Signed out, open `/index.php/publicknowledge/catalog/book/14`.
8. Under "Versions", press the older version, "… (Version of Record
   1.0)". [3.5: "… (1)".]
9. In the table of contents, press "Chapter 1: Mind Control—Internal or
   External?".
10. Open the book's page again (step 7), press "Chapter 1: Mind
    Control—Internal or External?" in its table of contents and, on the
    chapter's page, press the older version under "Versions".

**Expected:** step 5 opens the new version's chapter page, headed
"Chapter 1: Mind Control—Internal or External?" under the preview notice
"This is a preview and has not been published. View submission", at
`…/en/catalog/book/14/version/19/chapter/54`. [Once the page opens, it
carries no preview notice, the separate fault [pkp-e2e#297](https://github.com/jardakotesovec/pkp-e2e/issues/297), and reads
"This is an outdated version published on {today}" instead, the
separate fault [pkp-e2e#209](https://github.com/jardakotesovec/pkp-e2e/issues/209); neither is part of this one.] Steps 9 and 10 open the
older version's chapter page: the same heading under "This is an
outdated version published on {the older version's own publication
date}. Read the most recent version.", at
`…/en/catalog/book/14/version/14/chapter/54`. In these addresses the
number after "version" is the version's publication ID (step 4's and
step 8's addresses end with it), and 54 is the ID of the chapter as
first created, which the chapter's links keep in every version.

**Observed:** steps 5, 9 and 10 answer 500 with a blank page (no title,
no text), and so does the older chapter's address typed. [3.5: all three
open the page.] The server log, the same for each:

```
[500]: GET /index.php/publicknowledge/en/catalog/book/14/version/19/chapter/54 - Uncaught TypeError: count(): Argument #1 ($value) must be of type Countable|array, int given in …/lib/pkp/lib/vendor/laravel/framework/src/Illuminate/Database/Query/Builder.php:1389
#1 …/classes/monograph/ChapterDAO.php(439): Illuminate\Database\Query\Builder->whereIn()
#2 …/pages/catalog/CatalogBookHandler.php(189): APP\monograph\ChapterDAO->getCurrentPublicationChapterDoi()
```

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
version is not the current one. Until a new version is published, the
book's current version stays the published one, so the new version's
preview meets the last condition as an older version does.

The same method has a second fault behind the first. It ends its query
with `->get()`, which returns a collection of rows, and then tests and
casts that collection (`$doiId ? … (int) $doiId`). A collection is
always true and casts to 1, so with only `whereIn` corrected the page
would show the DOI whose ID is 1, whatever the chapter (none only when
no DOI has ID 1).

Reach:

- Every older version's chapter page on a press with "DOI Versioning"
  "No", for a chapter without a DOI in that version (on screen), and
  every chapter page of a new version's preview under the same rule (on
  screen). A book's first version, never published, is its own current
  version, so its preview's chapter pages never call the method (code).
- When the chapter's DOI is assigned decides which page fails.
  `Submission\Repository::createDois()` ("Assign DOIs" on the "DOIs"
  page) mints for `$submission->getCurrentPublication()` only. Before
  "Publish", that is the published version: its chapter gets the DOI,
  the new version's copy does not, and only the preview fails (code).
  After "Publish", the new version's chapter gets it and the older
  version's page fails (on screen).
- A chapter that already had its DOI when the new version was made
  escapes the fault on both pages: with "DOI Versioning" "No"
  `Repository::version()` copies the DOI to the new version's chapter,
  and the handler never calls the method (code).
- With "DOI Versioning" "Yes" the handler calls
  `ChapterDAO::getMinorVersionsDoi()` instead, which passes `whereIn()`
  a collection of IDs (it accepts one) and reads `->first()?->doi_id`
  (on screen for the older page, code for the preview).
- The book's own page takes the DOI from the current version's object
  (`$submission->getCurrentPublication()->getData('doiObject')`), with
  no query.
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
  collection.

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

It follows its sibling `getMinorVersionsDoi()` (`whereNotNull('doi_id')`,
one value), and keeps what the introducing change was for: the older
chapter page shows the current chapter's DOI.

A NULL `source_chapter_id` is matched by the chapter's own ID, the rule
`getBySourceChapterId()` and `getBySourceChapterAndPublication()` use in
the same DAO. The column is nullable: every chapter saved on 3.4 or
later holds a number (its own ID for an original chapter;
`Chapter::getSourceChapterId()`), but the 3.4 upgrade added the column
without filling it, and deleting the source chapter sets it to NULL. A
current version's chapter that is itself the original and was last
saved before 3.4 is the row a match on `source_chapter_id` alone would
miss. That row serves only the preview: every other copy of an original
chapter is newer, so only a newer, unpublished version's page looks it
up. Data from before 3.4 whose versions all hold NULL is not helped:
`_fromRow()` gives each row its own ID, so the versions are not linked
and the method finds no DOI.

Tried on `main`: step 5 opened the new version's chapter page in the
preview, and steps 9 and 10 and the typed address opened the older
version's chapter page under its outdated notice. After the current
version's chapter was given a DOI (prefix set, "Chapters" ticked under
"Items with DOIs", "Assign DOIs" on the "DOIs" page), the older chapter
page showed that same DOI; without the fix it answered 500. An older
version's chapter without its own page still answered "404 Not Found".
The NULL branch was not driven: no screen leaves a NULL today.

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
- The guard: an e2e scenario in U69 (an older version's chapter page,
  and a new version's in its preview, on a press with "DOI Versioning"
  "No", with and without a DOI on the current chapter); the spec's
  scenario 7 covers "Yes" only.

Small: one query in one method, with no data repair.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/older-version-chapter-page-server-error/walk.js)
  takes the Steps on OMP, on an install freshly loaded from the default
  dataset, then the typed address and the checks named in the Proposed
  fix (the DOI and "DOI Versioning" "Yes" checks on `main` only):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/older-version-chapter-page-server-error/walk.js`.
- Walked on `main` and `stable-3_5_0` (OMP), PostgreSQL; nothing here
  depends on the database. Datasets: pkp/datasets 5a53d3d (2026-10-05).
  OMP 3.5 offers no "DOI Versioning" setting, so the 3.5 walk stops
  after the Steps and the typed address.
- Tips: OMP `main` 592914b83 (lib/pkp e39fdee199); OMP `stable-3_5_0`
  9c5e24246 (lib/pkp cf3f984335); OMP `stable-3_4_0` 0aec65441; OMP
  `stable-3_3_0` 8e72fc883.
- Code reads: `ChapterDAO` and `CatalogBookHandler::book()` on each line
  (3.3: the `.inc.php` files): 3.5, 3.4 and 3.3 have neither
  `getCurrentPublicationChapterDoi()` nor a chapter DOI lookup in the
  handler. On `main`: `CatalogBookHandler::book()` lines 110–124 (a
  `version` request takes the asked publication, an unpublished one for
  `canPreview()` users) and 182–192 (the call); `PKPSubmission::getCurrentPublication()`
  (`currentPublicationId`);
  `Submission\Repository::createDois()` (mints for the current
  publication); `chapter.tpl` (the outdated notice, no preview notice);
  Laravel's `Builder::whereIn()` (line 1389, `count($values)`);
  `Repository::version()` (omp `classes/publication/Repository.php`: a
  new version's chapters, formats and files keep their DOIs unless "DOI
  Versioning" is on and the version is major);
  `Chapter::getSourceChapterId()`, `ChapterDAO::insertChapter()`,
  `updateObject()` and `_fromRow()`, the install migration's
  `source_chapter_id` (nullable, "on delete set null") and
  `I7132_AddSourceChapterId` (no backfill). In the default dataset every
  chapter row holds a `source_chapter_id`.
- Introduced: `git blame` on `ChapterDAO.php` lines 435–444 and
  `CatalogBookHandler.php` lines 182–192.
- Upstream: `pkp/pkp-lib#11819` (open) is a design discussion of the
  "DOIs" page under versioning, not this fault; it records that "Assign
  DOIs" reaches only the current version.
- Unverified (code only): the collection cast showing the DOI with ID 1;
  the fix's NULL branch; a DOI assigned between "Create New Version" and
  "Publish"; a book's first version's preview; a new version's preview
  with "DOI Versioning" "Yes" or with a chapter that has a DOI; the table
  of contents of an older version whose current version is a new major
  version.
