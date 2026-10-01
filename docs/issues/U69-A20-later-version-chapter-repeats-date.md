# A chapter with its own date reads "June 1, 2024 — Updated on June 1, 2024" in a book's later version

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: none (code; no chapter pages)
- **Introduced** `pkp/omp#1012` for `pkp/pkp-lib#7132` · [bd5eb048df](https://github.com/pkp/omp/commit/bd5eb048df2bca32ea40e7fec7848b653c99afad) · 2021-11-08 · marsilius (nongenti)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U69 [A20](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a20)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On a book whose chapters carry their own publication dates, a chapter's
page in a later version of the book gives the same date twice: "June 1,
2024 — Updated on June 1, 2024". A reader is told the chapter was
updated on the day it was first published.

A new version copies each chapter with its "Date Published", and the
page prints the chapter's first date and its date in this version
whether or not they differ. The line stays that way until an editor
types another date into the chapter.

It needs a book set to "Each chapter may have its own publication
date.", which is a choice made per book and not what a new book has, a
chapter with its own page and date, and a second published version.

## Impact

- **Lost.** A date line that makes sense: this one claims an update on
  the day of first publication.
- **Who.** Readers of a chapter's page in a second or later version of a
  book that dates its chapters one by one; every such chapter whose
  date the editor left as copied.
- **Way round.** The editor can type another date in the chapter's
  "Date Published"; the line then reads "June 1, 2024 — Updated on
  {that date}". That is honest only for a chapter that did change in
  the new version; for an unchanged chapter there is no way to show
  the one date.

Low: a redundant date on a public page; the date itself is right.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for OMP `main`, freshly loaded. Submission
  14, "From Bricks to Brains: The Embodied Cognitive Science of LEGO
  Robots", is published in one version; its "Chapter 1: Mind
  Control—Internal or External?" has its own page and no date of its
  own.
- No book of the dataset dates its chapters or has two published
  versions, so steps 2 to 7 set that up. The dataset's book carries the
  date of the day the dataset was built; step 3 gives it a fixed date
  instead, so that the dates below come out the same on any day.

1. Sign in as `dbarnes` (Press editor) and open submission 14's
   workflow,
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=14`.
2. Press "Unpublish" and, in the window that asks, "Unpublish".
3. Under "Publication", open "Catalog Entry", type 2024-12-31 in "Date
   Published" and press "Save".
4. Under "Marketing", open "Publication Dates", choose "Each chapter may
   have its own publication date." and press "Save".
5. Under "Publication", open "Chapters", press "Chapter 1: Mind
   Control—Internal or External?", type 2024-06-01 in "Date Published"
   and press "Save".
6. Press "Publish", then "Publish" in the window that asks "Are you sure
   you want to make this catalog entry public?". Signed out, the
   chapter's page now reads "Published June 1, 2024".
7. Under "Publication", press "Create New Version". The "Create New
   Version" window offers "Version of Record 1.0" to copy from, the
   stage "Version of Record (VoR)" and "Minor Revision"; keep them and
   press "Confirm". Then press "Publish" and, in the window that says
   'The publication version is "Version of Record 1.1"', "Publish".
   [3.5: the "Create New Version" button, then "Yes"; then "Publish" ›
   "Publish".]
8. Signed out, open `/index.php/publicknowledge/catalog/book/14` and, in
   the table of contents, press "Chapter 1: Mind Control—Internal or
   External?".

**Expected:** under "Published", "June 1, 2024": the chapter's date is
the same in both versions.

**Observed:**

```
Published
June 1, 2024 — Updated on June 1, 2024
```

The book's page reads "December 31, 2024 — Updated on October 1, 2026"
(the day of the walk). "Publication Dates" can be changed on the
published book: saved as "All chapters will use the publication date of
the monograph.", the chapter's page reads those two dates too.

## Cause

OMP
[`templates/frontend/objects/chapter.tpl`](https://github.com/pkp/omp/blob/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262/templates/frontend/objects/chapter.tpl#L198-L204)
lines 198–204 print one date when the shown chapter is the chapter's
first version (`$sourceChapter->getId() === $chapter->getId()`) and
otherwise always `submission.updatedOn`, "{$firstDatePublished} —
Updated on {$datePublished}".

With the chapters' own dates the two are the same by default.
`CatalogBookHandler::book()` takes `$datePublished` from the shown
chapter's own date and `getChaptersFirstPublishedDate()` takes
`$firstDatePublished` from the source chapter's own date, and
`APP\publication\Repository::version()` clones each chapter into the new
version with its `datePublished`.

The chapter's "Date Published" and the book's "Publication Dates"
choice are older than chapter pages (`pkp/pkp-lib#4920`, c471356dd,
2019), and 3.3 already clones a chapter with its date into a new
version. The fault is the line's unconditional second date, which came
with the chapter page's template and handler (bd5eb048df,
`pkp/pkp-lib#7132`).

Reach:

- Every later version's page of a chapter that has its own date, on a
  book with "Each chapter may have its own publication date.", unless
  the editor changed the date in the new version (on screen for the
  copied date; the changed date in code).
- A second way to the same line, whatever "Publication Dates" reads:
  when the first version is unpublished while a later one stays
  published, `getChaptersFirstPublishedDate()` finds the source
  chapter's version among no published one and returns null, and the
  handler falls back to `$firstDatePublished ?: $datePublished`. The
  chapter's page then read "October 1, 2026 — Updated on October 1,
  2026" (on screen on `main`; 3.5 and 3.4 in code).
- A chapter without its own date, and every chapter of a book on "All
  chapters will use the publication date of the monograph.", takes both
  dates from its versions and reads "{first version's date} — Updated on
  {this version's date}" (on screen).
- The older version's chapter page reads the one date (on screen).
- The book's page has the same unconditional line in
  `monograph_full.tpl`, between two versions' dates: a book whose two
  versions were published on one day reads "October 1, 2026 — Updated
  on October 1, 2026" (on screen on `main`), and so does each chapter
  page of such a book that takes the versions' dates (code).

## Proposed fix

Recommended: on both pages, print the one date when this version's date
is the first date
([fix-a20.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/chapter-page-dates-and-preview-notice/fix-a20.diff)):

```diff
 templates/frontend/objects/chapter.tpl
 							{* If this is the original version *}
-							{if $sourceChapter->getId() === $chapter->getId()}
+							{* ... or a later version whose chapter keeps the first date *}
+							{if $sourceChapter->getId() === $chapter->getId() || $firstDatePublished|date_format:"Y-m-d" === $datePublished|date_format:"Y-m-d"}

 templates/frontend/objects/monograph_full.tpl
 							{* If this is the original version *}
-							{if $firstPublication->getId() === $publication->getId()}
+							{* ... or a later version published on the first date *}
+							{if $firstPublication->getId() === $publication->getId() || $firstPublication->getData('datePublished')|date_format:"Y-m-d" === $publication->getData('datePublished')|date_format:"Y-m-d"}
```

The dates are compared as "Y-m-d" strings, the way the book's page
compares dates since `pkp/pkp-lib#10169`. A chapter whose date the
editor changed in the new version still reads "{first date} — Updated
on {new date}", which keeps what the line was made for.

The book's page gets the same condition because the chapter condition
alone would also collapse the same-day case for a chapter that takes
the versions' dates, and the two pages of one book would then disagree:
"October 1, 2026" on the chapter, "October 1, 2026 — Updated on October
1, 2026" on the book. With both, a line never names one date twice.

Tried on `main`: step 8 read "Published June 1, 2024"; the chapter's
page of a book whose first version was unpublished read "October 1,
2026"; and a book with two versions published on one day read "October
1, 2026". Neighbour checks, the same with the fix in and out: the first
version's chapter page reads "June 1, 2024"; the book's page reads
"December 31, 2024 — Updated on October 1, 2026"; and with "All
chapters will use the publication date of the monograph." the chapter's
page reads those two dates too.

**Alternatives:**

- The chapter condition alone, narrowed to chapters with their own
  date: it leaves the unpublished-first-version case and the same-day
  case doubled.
- Not copying a chapter's "Date Published" into a new version
  (`Repository::version()`), so that the chapter falls back to the new
  version's date and reads "June 1, 2024 — Updated on {the new
  version's date}" like the book. It changes what an editor finds in
  the new version's chapter, leaves the versions already published as
  they are, and is a product decision: whether every chapter counts as
  updated when the book gets a new version.

**What goes with it:**

- No stored data is wrong; nothing to repair.
- A backport: the diff applies as written to 3.5 and 3.4.
- Left out: the first date itself on the book's page while a version
  without a date exists, a fault of its own
  ([register entry](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U49-publish-schedule-and-versions.md#a6)).
- The guard: an e2e scenario in U69: a chapter with its own date on a
  second published version reads the one date.

Small: one condition in each of two templates, with no data repair.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/chapter-page-dates-and-preview-notice/walk.js)
  takes these Steps on OMP on an install freshly loaded from the default
  dataset, beside those of two other reports about the chapter page,
  then the neighbour checks:
  `PHASES=a13,a20,n,n3,n4,n5 PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/chapter-page-dates-and-preview-notice/walk.js`.
- The fix was tried with `node bin/try-fix.js apply …/fix.diff omp`,
  the script without `PHASES`, then `revert`: `fix.diff` holds the three
  reports' diffs, tried together in one walk on `main`, and the
  neighbour checks read the same with the fix in and out.
- Where the walk differed from the Steps: the visitor's pages are read
  in a second browser while `dbarnes` stays signed in. Between steps 3
  and 4 the walk takes another report's steps (the book published,
  scheduled and unscheduled, the date typed again, the short date
  format changed and put back). The older version's chapter page, a
  neighbour check, is read on `main` after "DOI Versioning" is saved as
  "Yes", since with "No" that page fails on the server
  ([separate report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U69-A19-older-version-chapter-page-server-error.md)).
- The two further cases, `main` only: for the unpublished first
  version, `dbarnes` presses "Unpublish" on "Version of Record 1.0"
  while 1.1 stays published. A third, unpublished version exists by
  then, so the book's page in that state shows the first-date fault of
  the Left out item and is no check of this fix. The same-day book is
  submission 5, "Bomb Canada and Other Unkind Remarks in the American
  Media": "Unpublish", "Date Published" today, "Publish", "Create New
  Version" › "Confirm", "Publish".
- Walked on `main` and `stable-3_5_0` (OMP), PostgreSQL; nothing here
  depends on the database. Datasets: pkp/datasets fetched at 92050d9
  (2026-10-01). On 3.5 the walk's book was re-dated the same way.
- Tips: OMP `main` 3b0ecf794 (lib/pkp 3dc90c81a6); OMP `stable-3_5_0`
  b24879c3d (lib/pkp 1fb843f491); OMP `stable-3_4_0` 0aec65441 (lib/pkp
  df13621c2d); OMP `stable-3_3_0` 8e72fc883.
- Code reads: `chapter.tpl`, `monograph_full.tpl`,
  `CatalogBookHandler::book()`, `getSourceChapter()` and
  `getChaptersFirstPublishedDate()`, and `Repository::version()` (omp
  `classes/publication/Repository.php`, `clone $oldChapter`) on `main`,
  3.5 and 3.4: the same on all three. 3.3 has no `chapter.tpl` and no
  chapter address; its `PublicationService::version()` clones chapters.
  c471356dd for the chapter's date and the book's choice.
  `ChapterGridHandler::initialize()` for the way round on a published
  version: the Press manager, editors and assistants keep the chapter
  window there.
- Introduced: `git blame` on `chapter.tpl` lines 198–204 names
  bd5eb048df ("pkp/pkp-lib#7132 Review changes", in every release from
  3.4.0), merged with `pkp/omp#1012` on 2021-11-17. `pkp/pkp-lib#7132`
  says nothing about a chapter's date in a new version.
- Upstream search 2026-10-01, pkp/pkp-lib and pkp/omp: "chapter
  \"updated on\"", "chapter publication date new version", "chapter
  landing page date", `getChaptersFirstPublishedDate`,
  `enableChapterPublicationDates`. Nothing about this fault.
- Unverified: the way round (another date typed into the chapter,
  before or after the new version is published) is read in the code,
  not walked.
