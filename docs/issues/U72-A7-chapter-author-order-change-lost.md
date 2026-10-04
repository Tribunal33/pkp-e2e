# Chapter authors dragged into a new order snap back on "Done" when they are among the book's first contributors

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#6850` · [17d6bcdad5](https://github.com/pkp/omp/commit/17d6bcdad54b0df56f4af85452191ebec4c689b1) · 2021-08-30 · Dimitris Efstathiou (defstat)
- **Upstream** none found (2026-10-04); `pkp/pkp-lib#10526` (closed, fix in PR `pkp/omp#1754`) fixed the order the list reads the authors in, not this save
- **Tracked in** spec U72 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U72-chapters-work-type.md#a7)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

On a book's "Chapters" page, a press editor presses "Order", drags one of
a chapter's authors above another and presses "Done". In some chapters
the list redraws with the authors in their old order, and a reload shows
the same. No message is shown.

The save leaves an author at their old place when they end up n-th in
the chapter while being (n + 1)-th on the book's Contributors list: for
example, second in the chapter and third on the Contributors list. Each
author is saved or left on their own, so with two authors the drag is
undone, and with three or more the chapter can end up in a mix of the
old and new order. Only authors near the top of the Contributors list
can meet this, so in an edited volume whose contributors are listed
chapter by chapter it is the first chapter or two. Dragging again gives
the same result; "Edit Chapter" can set the order instead.

## Impact

- **Lost**: the author order the editor set for the chapter, which the
  book's table of contents and the chapter's page then show. A "Done"
  can also leave two authors of a chapter nobody touched stored at one
  place, so that their order depends on the database.
- **Who**: a press manager or editor on the "Chapters" page, or the
  submitting author on the wizard's Details step, ordering a chapter
  that has two or more authors. In the default dataset, a swap fails in
  one of its eight two-author chapters, and a "Done" leaves two other
  chapters with their authors stored at one place.
- **Way round**: in "Edit Chapter", untick the author who should come
  last and press "Save", then open the window again, tick them and press
  "Save": the chapter keeps its authors in the window's order, so the
  re-ticked author is added at the end. This takes two saves per author
  moved.

Medium: a chapter's author order cannot be set with "Order" for the
authors who meet the condition, and the editor sees the old order without
being told why; it is not higher because "Edit Chapter" sets the order,
and the list shows the result at once.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main`, press `publicknowledge`.
  Submission 12, "Connecting ICTs to Development" (internal review), has
  the chapter "Catalyzing Access through Social and Technical
  Innovation", whose authors are Frank Tulus, then Raymond Hyma. On the
  book's Contributors list they are third and fourth, after Laurent Elder
  and Heloise Emdon.
- [3.5: the 3.5 dataset stores every contributor of submission 12 at the
  same `seq` (0), so there the drag is saved and the fault does not show.
  Use submission 2, "The West and
  Beyond: New Perspectives on an Imagined Region": on its "Chapters",
  press "Add Chapter", type the title "u72a Chapter", tick "Peter Fortna"
  and "Gerald Friesen" (its third and fourth contributors) and press
  "Save". Then take steps 3 to 6 on that chapter, dragging "Gerald
  Friesen" above "Peter Fortna".]

1. Sign in as `dbarnes`.
2. Open submission 12, "Connecting ICTs to Development", and in its
   workflow open "Chapters" (under "Publication"). [3.5: the "Publication"
   tab, then "Chapters".]
3. Press "Order" above the chapter list.
4. Under "Catalyzing Access through Social and Technical Innovation", drag
   "Raymond Hyma" above "Frank Tulus". The list now shows Raymond Hyma
   first.
5. Press "Done".
6. Reload the page and open "Chapters" again.

**Expected**: after "Done" and after the reload the chapter lists Raymond
Hyma, then Frank Tulus.

**Observed**: "Done" is accepted:

```
{"status":true,"content":"","elementId":"0","events":[{"name":"dataChanged"}]}
```

The list redraws at once with Frank Tulus, then Raymond Hyma, and the
reload shows the same. No message is shown. On 3.5, with the bracketed
preconditions, "u72a Chapter" goes back to Peter Fortna, then Gerald
Friesen, the same way.

Under "Catalyzing Access via Telecommunications Policy", the same drag of
Khaled Fourati above John Valk (the book's sixth and fifth contributors)
is kept.

## Cause

Below, a *place* counts from 1 as the screen does, and a `seq` is the
stored value.

OMP's `ChapterGridHandler::getDataElementInCategorySequence()`
(controllers/grid/users/chapter/ChapterGridHandler.php, line 350) returns
`$author->getSequence()` as an author's current `seq` in the chapter. The
grid's authors come from `Chapter::getAuthors()`, that is
`Repo::author()->getCollector()->filterByChapterId()`.
`APP\author\Collector::getQueryBuilder()` joins
`submission_chapter_authors` and orders by `sca.seq`, but the select is
the parent's `['a.*', 's.locale AS submission_locale']`. So the author's
`seq` is `authors.seq`, their `seq` on the publication's contributor list.
The matching setter, `setDataElementInCategorySequence()`, writes
`submission_chapter_authors.seq`.

"Done" posts each chapter's ids in screen order, the chapter's own id
first. `OrderCategoryGridItemsFeature::_saveRowsInCategoriesSequence()`
(pkp-lib) unsets that first id, so each author's new `seq` is their key
in the posted list: 1, 2, …. It calls the setter only
`if ($newSequence != $currentSequence)`. In the Steps it posts
`{"categoryId":"48","rowsId":["48","36","35"]}`:

- Raymond Hyma (36): new `seq` 1, `authors.seq` 3: the link is rewritten
  with 1.
- Frank Tulus (35): new `seq` 2, `authors.seq` 2: the setter is skipped,
  and the link keeps its old `seq`, 0.

So the chapter stores Tulus at 0 and Hyma at 1, the old order. The author
left behind is usually not the one the editor dragged.

In 3.3, `ChapterAuthorDAO::getAuthors()` selected `a.*, …, sca.seq`
("replace the primary_contact and seq with submission_chapter_authors"),
so the same getter read the chapter's `seq`. 17d6bcdad5
(`pkp/pkp-lib#6850`, the repository pattern for authors) removed that DAO
and read chapter authors through the author collector, without the
chapter's `seq`. 92bf36160b (`pkp/omp#1754`, for `pkp/pkp-lib#10526`)
later added the join and the `sca.seq` order, but not the column.

Reach:

- Chapters nobody touched: every "Done" runs the comparison on every
  chapter. On submission 17, "Open Development: Networked Innovations in
  International Development", the first "Done" stored the two authors of
  the untouched "The Emergence of Open Development in a Network Society"
  (Matthew Smith, `authors.seq` 0; Katherine Reilly, `authors.seq` 2)
  both at 1. Reilly dragged above Smith in "Introduction" with "Done",
  then dragged back with "Done", left that chapter the same way.
  PostgreSQL listed both chapters as Smith, Reilly; tied links come in
  whatever order the database returns (walked).
- The wizard's Details step draws the same grid (code, not walked).
- "Create New Version": `APP\publication\Repository::version()` links each
  copied chapter's authors with `$oldChapterAuthor->getData('seq')`, the
  contributor `seq`. A new version's chapters therefore list their
  authors in contributor order, not in the order set for the chapter
  (code, not walked).
- Native XML export: `ChapterNativeXmlFilter::createChapterAuthorNode()`
  writes the same value as `chapterAuthor`'s `seq`, and
  `NativeXmlChapterFilter::parseAuthor()` stores it as the chapter's
  `seq` on import (code, not walked).
- REST API: the publication's `chapters[].authors[].seq` is the
  contributor `seq` (`APP\publication\maps\Schema`) (code).
- Readers of the order: the book page, the chapter page and the citation
  and Dublin Core plugins list chapter authors in `sca.seq` order (code).
  `ChapterForm::fetch()` (line 227), `ChapterGridHandler::getChapterData()`
  (line 607) and `Chapter::getAuthorNamesAsString()` read only ids and
  names (code).

## Proposed fix

Have the collector carry the chapter's `seq` as the author's `seq`
whenever it filters by chapter, as 3.3's `ChapterAuthorDAO` did. In OMP's
`classes/author/Collector.php`, inside the `chapterId` branch of
`getQueryBuilder()`:

```diff
             $query->join('submission_chapter_authors as sca', function (JoinClause $join) {
                 $join->on('a.author_id', '=', 'sca.author_id')
                     ->where('sca.chapter_id', '=', $this->chapterId);
             });
+            // An author read for a chapter carries its place in the chapter (submission_chapter_authors.seq)
+            // as its seq, as the chapters grid and the version copy expect: listed after a.*, it replaces a.seq.
+            $query->addSelect('sca.seq');
```

The diff, against the OMP root:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/chapter-author-order-change-lost/fix.diff).
The collector is the one place that joins the chapter's author links, so
one line there fixes the grid's comparison, the version copy and the
native export together. The row then holds two `seq` columns, and the
later one wins, because PDO fills a fetched row column by column under
any driver, as 3.3's query relied on; `getIds()` and `getCount()` replace
or wrap the select and are not affected. Tried on OMP `main`: the Steps
keep Raymond Hyma first after "Done" and after the reload; the control
drag in the other chapter is kept with the fix in and out, and the book's
contributor order is unchanged.

**Alternatives**:

- Select the link's `seq` under its own name (`sca.seq AS chapter_seq`)
  and read that in the grid, the version copy and the export: clearer
  than relying on column order, but three readers and the author DAO
  change instead of one line.
- Read the link's `seq` in the grid alone (a new DAO method called from
  `getDataElementInCategorySequence()`): fixes the reorder but leaves the
  version copy and the export writing contributor `seq`s.
- Drop the `!=` check in `_saveRowsInCategoriesSequence()`: rewrites every
  row of every category grid on each "Done", OJS's table of contents
  included, and leaves the getter wrong.

**What goes with it**:

- Every instance: of the `getDataElementInCategorySequence()`
  implementations in OJS, OMP and OPS `main`, only OMP's chapter grid
  reads a value other than the one its setter writes; OJS's
  `TocGridHandler` reads and writes the publication's `seq`. Every reader
  of `filterByChapterId()` is listed under Reach, and none saves the
  Author objects it reads.
- What it touches: the REST API's `chapters[].authors[].seq` becomes the
  chapter's `seq`, as on 3.3, while the publication's own `authors` list
  is unchanged. The native export then writes what import expects.
- Stored data: no repair. A wrong order or a tie is put right by ordering
  the chapter again once the fix is in.
- Backport: 3.5 and 3.4 have the same collector with the join, so the
  line applies as written there.
- Guard: an e2e scenario in spec U72 (a **Planned** item) that drags a
  chapter author into a place the comparison skipped and checks the order
  after "Done" and after a reload; and an OMP unit test that a
  chapter-filtered author's `seq` is the chapter's.

Medium: a one-line change, sized up because API clients must follow the
changed field.

## Evidence

- Kept script, run on the default dataset after loading it (OMP alone has
  chapters):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/chapter-author-order-change-lost/walk.js),
  with [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/chapter-author-order-change-lost/lib.js).
  With no argument it takes the Steps on submission 12; `west` takes the
  3.5 bracket; `twice` takes the tie on submission 17; `edit` takes the
  "Edit Chapter" way round; `neighbour` drags Khaled Fourati above John
  Valk. Each mode reads `submission_chapter_authors.seq` beside
  `authors.seq` before and after. Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/chapter-author-order-change-lost/walk.js [west|twice|edit|neighbour]`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Walks: OMP `main` (the Steps, `twice`, `edit`, and `neighbour` with the
  fix in and out) and 3.5 (the Steps and `west`), on PostgreSQL with the
  default dataset at pkp/datasets 566bb1f (2026-10-03). No server or
  script error was logged. The fix was not tried on 3.5. MySQL was not
  run: the order of tied links, and the later `seq` column winning, were
  seen on PostgreSQL only.
- Branch tips: OMP `main` 3b0ecf794c, its pkp-lib 3dc90c81a6; OMP
  `stable-3_5_0` 9c5e24246c, pkp-lib cf3f984335; OMP `stable-3_4_0`
  0aec65441f, pkp-lib 767353f4fe; OMP `stable-3_3_0` 8e72fc8836, pkp-lib
  ac3fa73402.
- Code reads on the older lines: 3.5, the same collector, getter and
  save. 3.4 (`git show`): `classes/author/Collector.php` with the join and
  no `sca.seq` column, the same getter, and pkp-lib's
  `OrderCategoryGridItemsFeature.php` with the same `!=` check. 3.3:
  `ChapterAuthorDAO.inc.php` selecting `sca.seq`, and the same getter and
  check.
- Introduced: `git blame` puts the getter in 01088072a8, a 2021 reformat;
  the line is older than 3.3. GitHub names no pull request for
  17d6bcdad5. `pkp/pkp-lib#13036` (closed) is about the version copy
  matching authors by `seq`, not the `seq` it writes.
