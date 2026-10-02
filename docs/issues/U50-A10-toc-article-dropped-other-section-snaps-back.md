# In an issue's "Order", an article dropped past a section heading jumps back and reorders its section

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: none (the class aliases are kept while `strict` is off, the default)
  - 3.4: none (code; the same)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#11601` · [1810f38f34](https://github.com/pkp/pkp-lib/commit/1810f38f34c3fc0fb22640ac9fbc4e303fc6b942) · 2025-07-07 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U50 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U50-issues.md#a10)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

In an issue's "Table of Contents", "Order" lets a journal manager drop
an article above a section heading: its own heading when dragging it to
the top of its section, or the next section's heading when dragging it
up into the section above. "Done" is accepted, but what is saved is not
what was dropped. An article dropped into the section above is back in
its own section at once, moved to its top. An article dropped above its
own heading is saved first, as meant, but another article of the section
can move with it: in the walk one jumped from last place to second.

An article can still be moved within its own section when it is dropped
below the heading, to the top or anywhere else; that order is saved as
shown, and so are the other drags made before the same "Done". The list
redraws with the saved order after "Done", so the editor sees the result
and can drag again.

## Impact

- **Lost**: the order the editor set, for the dragged article and at
  times for one other article of its section. On a published issue the
  issue's page shows the saved order at once.
- **Who**: a journal manager or editor ordering an issue's table of
  contents. A drop at the very top of a section can land above its
  heading, so everyday reordering meets it, not only a move to another
  section.
- **Way round**: drag again and drop below the heading. An article's
  section is changed on its "Publication Settings"; the table of
  contents has never moved articles between sections.

Medium: a reorder inside one section can save an order the editor did
not set, which they see only in the redrawn list; it is not higher
because the redraw shows it and a second drag puts it right. `main` is
not released yet, which makes it cheap to fix, not less severe.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`, journal `publicknowledge`. Its
  issue "Vol. 1 No. 2 (2014)" holds two articles, both in "Articles":
  "Signalling Theory Dividends" (submission 1, listed on the "Table of
  Contents" tab as "The Signalling Theory Dividends") and "Antimicrobial,
  heavy metal resistance and plasmid profile of coliforms isolated from
  nosocomial infections in a hospital in Isfahan, Iran" (submission 17).
- A second section in that issue: steps 1 and 2 publish submission 9,
  "Hansen & Pinto: Reason Reclaimed" (in Production, section "Reviews"),
  into the issue.

Moving to another section:

1. Sign in as `dbarnes`.
2. Open submission 9, "Hansen & Pinto: Reason Reclaimed", and its "Title
   & Abstract". Press "Publish". Set "Publication Stage" to "Version of
   Record (VoR)" and "Revision Significance" to "Major Revision", choose
   "Assign To Current/Back Issue" and the issue "Vol. 1 No. 2 (2014)",
   press "Confirm", then "Publish". [3.5: the "Issue" page, "Assign to
   Issue", "Vol. 1 No. 2 (2014)", "Save"; then "Publish" and its
   "Publish".]
3. Go to Issues › "Back Issues", open the row of "Vol. 1 No. 2 (2014)"
   and press "Edit". The "Table of Contents" tab lists "Articles" (two
   articles) and "Reviews" ("Hansen & Pinto: Reason Reclaimed").
4. Press "Order". Drag "Hansen & Pinto: Reason Reclaimed" up past the
   "Reviews" heading and drop it under "Antimicrobial…", the last article
   of "Articles".
5. Press "Done".
6. Close the window, press "Edit" on "Vol. 1 No. 2 (2014)" again and
   look at "Table of Contents".
7. Open the issue's page (the journal's "Current").
8. Open submission 9's workflow and its "Publication Settings" [3.5:
   "Issue"]: "Section".

Moving to the top of a section (from a freshly loaded dataset):

1. Signed in as `dbarnes`, publish as in step 2 above, into "Vol. 1
   No. 2 (2014)", submission 5,
   "Genetic transformation of forest trees", and submission 6,
   "Investigating the Shared Background Required for Argument: A
   Critique of Fogelin's Thesis on Deep Disagreement" (both in
   "Articles"), and submission 9.
2. Open the issue's "Table of Contents", press "Order", drag "The
   Signalling Theory Dividends" down below "Genetic transformation…",
   and press "Done". "Articles" now reads "Antimicrobial…", "Genetic
   transformation…", "The Signalling Theory Dividends",
   "Investigating…".
3. Press "Order", drag "Investigating…" to the top of "Articles",
   dropping it above the "Articles" heading, and press "Done".

**Expected**: moving to another section, the drop is refused: while
dragging, "Hansen & Pinto" cannot leave "Reviews", and it stays there
after "Done". Moving to the top, "Articles" is saved as dropped:
"Investigating…", "Antimicrobial…", "Genetic transformation…", "The
Signalling Theory Dividends".

**Observed**: moving to another section, the drop is taken. After step
4 the list reads, top to bottom:

```
Articles
  The Signalling Theory Dividends
  Antimicrobial, heavy metal resistance and plasmid profile of coliforms …
  Hansen & Pinto: Reason Reclaimed
Reviews
```

"Done" answers 200 (`{"status":true,…,"events":[{"name":"dataChanged"}]}`)
and the list redraws at once with "Hansen & Pinto: Reason Reclaimed"
back under "Reviews". Steps 6 and 7 show it under "Reviews", and its
"Section" still reads "Reviews". Its stored position in "Reviews" goes
from 1 to 0, the top.

Moving to the top, "Investigating…" is drawn above the "Articles"
heading. After "Done" the list redraws as "Investigating…", "The
Signalling Theory Dividends", "Antimicrobial…", "Genetic
transformation…": "The Signalling Theory Dividends" has moved from last
to second. The reopened tab and the issue's page show the same.

On the tab the headings "Articles" and "Reviews" are in the same plain
weight as the article titles, where 3.5 shows them in bold; this is a
visual change only. Dropped below the heading, a drag inside one
section is saved as shown: the step 2 drag above, a drag of the last
article to the top just under the heading, and a drag made in the same
"Order" as a refused move to another section.

## Cause

`lib/pkp/templates/controllers/grid/gridRow.tpl` decides whether a row
is a category heading with `{if is_a($row, 'GridCategoryRow')}` (line
21). The heading's class is `PKP\controllers\grid\GridCategoryRow`, and
the short name `GridCategoryRow` was only a global alias of it, made at
the end of `lib/pkp/classes/controllers/grid/GridCategoryRow.php` while
`strict` was off in `config.inc.php`. `pkp/pkp-lib#11601` ("Remove
class and constant aliases") deleted that alias, and the alias of
`CategoryGridHandler`, without changing the templates that name them.
So `is_a()` is now false for every heading: the row loses its
`category` and `default_category_style` classes, and `grid.tpl` (line
39, `is_a($grid, 'CategoryGridHandler')`) no longer gives a category
grid its `pkp_grid_category` class.

The ordering script tells a heading from an article by that class. In
"Order", `OrderItemsFeature.addOrderingClassToRows()` marks every row
with a move handle as `orderable`, the heading included, and
`OrderCategoryGridItemsFeature.addOrderingClassToRows()` then removes
`orderable` from the headings through
`CategoryGridHandler.getCategoryRow()`, which finds them as
`tr.category`. With no `category` class it finds nothing, so the
heading stays a sortable row of its own section's list, and an article
can be dropped above it. The article never leaves its section's
`tbody`: it is drawn above that section's heading, which on screen is
the bottom of the section above.

"Done" posts each section's rows in screen order, the heading's id
among them. `OrderCategoryGridItemsFeature::_saveRowsInCategoriesSequence()`
drops the first id of each list as "always the parent category ID" and
gives every article the index of its id in what is left. With the
article above its heading, the first id is the article's:

- "Reviews" posts `["9","2"]` (with the fix: `["2","9"]`). The article's
  id is dropped, `array_search()` returns `false`, and its `seq` is
  saved as `false`, stored as 0.
- "Articles" posts `["6","1","17","5","1"]`: submission 6, the heading
  (section 1), then 17, 5 and 1. Submission 6 gets 0. Submission 1 is
  found at the heading's place, because the section's id and its
  submission id are both 1, and gets 1 instead of 4.

Articles are read from the server section by section, so a dropped
article is saved in the section it was already in, and the grid is
redrawn from what was saved. `TocGridHandler::setDataElementInCategorySequence()`
can move an article to another section, but only for an article posted
under that section, and the browser never posts one there: no drag
takes a row out of its own section's list.

Reach:

- The table of contents' "Order" in OJS: walked (both groups of Steps
  and the drags dropped below the heading).
- Every legacy category grid on `main`: the headings lose their bold
  style (`.pkp_grid_category .gridRow.category .label` in `grid.less`).
  Seen on the table of contents; the others by code.
- Section headings in "Order": a heading is a sortable row inside its
  own section, so it can be dragged below that section's articles
  (code; an earlier drive saw a heading move below its own article,
  register entry
  [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U50-issues.md#a9)).
- OMP's "Chapters" list (`ChapterGridHandler`, a chapter's authors as
  its rows, ordered the same way): the same heading rows (code, not
  walked).
- Category grids shown as a subcomponent: `grid.tpl` lines 70 and 95
  (`!is_a($grid, 'CategoryGridHandler')`) now wrap them in the split
  header/body tables meant for plain grids (code).
- 3.5 and 3.4 with `strict = On`: the aliases are not made, so the same
  fault shows there (code, not walked).

## Proposed fix

Name the classes by their full names in the two shared templates, as
the other templates do since the aliases went
(`{if $pubObject instanceof PKP\submission\PKPSubmission}` in OJS's
`publicIdentifiersForm.tpl`). The diff, tried on OJS `main`, is written
against the app root; in pkp-lib the paths drop the `lib/pkp/` prefix:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/toc-article-dropped-other-section-snaps-back/fix.diff).

```diff
--- a/lib/pkp/templates/controllers/grid/gridRow.tpl
+++ b/lib/pkp/templates/controllers/grid/gridRow.tpl
-{if is_a($row, 'GridCategoryRow')}
+{if $row instanceof PKP\controllers\grid\GridCategoryRow}
```

The same change goes on gridRow.tpl's three other `is_a($row,
'GridCategoryRow')` (lines 57, 69, 77) and on grid.tpl's three
`is_a($grid, 'CategoryGridHandler')` (lines 39, 70, 95, the last two
negated as `!($grid instanceof PKP\controllers\grid\CategoryGridHandler)`).
The class is restored where it is made, so every category grid and every
script that reads `category` comes right at once. The heading is then
always the first row posted, as `_saveRowsInCategoriesSequence()`
expects.

With the fix in, "Hansen & Pinto" stays under "Reviews" through the
drag, "Done" posts `["2","9"]`, the headings are bold again, and a drag
inside "Articles" still saves its new order.

**Alternatives**:

- Restore the global aliases: it undoes what `pkp/pkp-lib#11601` was
  for.
- Have the script find headings some other way (the first row of each
  `tbody`): it fixes "Order" but leaves the styling and the
  subcomponent layout wrong.
- Make the save skip the heading by its id rather than by its place:
  the id can equal an article's, as in the walk, and the screen would
  still accept a move it does not make.
- Make "Order" move articles between sections (a shared drop target,
  and a save that reads the posted lists instead of the server's): a
  product decision and a larger change; 3.5 and earlier never offered
  it.

**What goes with it**:

- Every instance: a search of the templates of OJS, OMP and OPS `main`,
  their `lib/pkp` and plugins for `is_a()` or `instanceof` with a short
  class name found the seven lines above and, in OPS,
  `instanceof Preprint` in `controllers/tab/pubIds/form/publicIdentifiersForm.tpl`
  and `controllers/grid/pubIds/form/assignPublicIdentifiersForm.tpl`.
  Those are left out: a different screen, not walked here.
- Stored data: an order saved wrong is put right by ordering again; no
  repair is proposed.
- Backport: not worth one on its own. 3.5 and 3.4 show the fault only
  with `strict = On`, a setting the config template describes as
  raising errors on deprecated code, not one for live journals. The
  change applies as written there, so it can ride along with another
  3.5 fix at no cost.
- Guard: an e2e scenario in spec U50 (a **Planned** item) that drags an
  article past a section heading in "Order", its own and the next
  section's, and checks the saved order and section after "Done".

Small: seven lines in two shared templates and the e2e scenario, with
no data repair.

## Evidence

- Kept scripts, run on the default dataset after loading it (OJS alone
  has issues):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/toc-article-dropped-other-section-snaps-back/walk.js)
  takes "Moving to another section" (`neighbour` as its argument: a
  drag inside "Articles" instead);
  [reorder.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/toc-article-dropped-other-section-snaps-back/reorder.js)
  takes "Moving to the top of a section", then a drag of the last
  article to just under the heading and one round with a drag inside
  "Articles" plus "Hansen & Pinto" up past the "Reviews" heading,
  reading each current publication's `publications.seq` before and
  after every "Done". Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/toc-article-dropped-other-section-snaps-back/<walk.js|reorder.js> [neighbour]`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Walks: OJS `main` (both scripts) and 3.5 (walk.js), PostgreSQL, the
  default dataset at pkp/datasets c657990 (2026-10-01); no server or
  script error was logged. The stored order after "Moving to the top":
  submission 6 at 0, 1 at 1, 17 at 2, 5 at 3. The fix was walked on
  `main` with walk.js and its neighbour; reorder.js ran without it.
- Branch tips: OJS `main` b84f8e2e44, its pkp-lib ddd8ab243a; OJS
  `stable-3_5_0` c346ee00a5, pkp-lib 3bb4450bea; OJS `stable-3_4_0`
  75cc2d488b, pkp-lib 32b0f4b4af; OJS `stable-3_3_0` ac77c9fb35,
  pkp-lib f6ab331645. OMP and OPS `main` carry pkp-lib 3dc90c81a6, with
  the same two templates.
- Code reads: `main`: `gridRow.tpl`, `grid.tpl`,
  `gridBodyPartWithCategory.tpl`, `CategoryGridHandler.js`
  (`getCategoryRow()`, `getRowsInCategory()`), `OrderItemsFeature.js`,
  `OrderCategoryGridItemsFeature.js` and `.php`, `TocGridHandler`,
  OMP's `ChapterGridHandler`, `grid.less`. 3.5: the alias at the end of
  `GridCategoryRow.php` (and `CategoryGridHandler.php`) under
  `!PKP_STRICT_MODE`, `strict = Off` in the config template. 3.4 (`git
  show`): the same templates and aliases, `PKP_STRICT_MODE` defined from
  `strict` in `PKPApplication`, `strict = Off` in
  `config.TEMPLATE.inc.php`. 3.3: the same templates, and
  `GridCategoryRow` a global class with no namespace.
- Introduced: `git blame` puts gridRow.tpl line 21 in 99beb0ca38 (2015)
  and grid.tpl line 39 in 990e7c3a3a (2016), both written when the
  short names were real classes; 1810f38f34 removed the aliases they
  relied on. Its pull request, `pkp/pkp-lib#11601`, links no issue.
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/ui-library searched by "table
  of contents order section", "GridCategoryRow", "class aliases",
  "gridRow.tpl" and "toc drag section". `pkp/pkp-lib#12826` (open,
  "Remove grid code") would retire these grids in time; it does not
  report this fault.
- Not driven: OMP's "Chapters" list; a category grid shown as a
  subcomponent; the fix on 3.5; an install with `strict` on.
- Unverified: a move to another section from a section of two or more
  articles (the walk's "Reviews" held one; by the code the dragged
  article is then listed first there); whether the fix also lets a
  section heading be dragged above another section.
