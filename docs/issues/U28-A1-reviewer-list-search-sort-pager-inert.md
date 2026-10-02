# Reviewer's "My Assignments as Reviewer" list: search, "Sort", "Filters" and the pager leave the rows unchanged

- **Severity** low
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: none (code; the reviewer's list is "My Assigned", which searches and pages)
  - 3.3: none (code; as 3.4)
- **Introduced** `pkp/pkp-lib#9469` for `pkp/pkp-lib#8887` · [c075b30b36](https://github.com/pkp/pkp-lib/commit/c075b30b3618627813e8e10102ea9134e661a928) · 2023-10-25 · Vitalii Bezsheiko (Vitaliy-1)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U28 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U28-reviewers-review.md#a1)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On "My Assignments as Reviewer", the search box, the "Sort" control
on the "ID" column and the "Filters" window do nothing: every phrase,
every sort and every filter shows the same rows in the same order.
The page still prints "Search: {phrase}" or "Section: Reviews" above
rows that do not match. The list is never cut into pages either: a
view with more than 30 rows shows them all on every page of its pager.

Nothing is lost: all of the reviewer's assignments stay on screen and
each one opens. The editors' dashboard has the same controls, and
there they work; its search cannot simply be reused, because it
matches author names, which a reviewer under anonymous review must
not find.

The fault came with the reviewer's list of 3.5. In 3.4 the reviewer's
list searched, filtered and paged; "Sort" is new with the 3.5 list
and has never worked on it.

## Impact

- **Lost**: nothing. The reviewer is not told that the search or
  filter was not applied: the label above the table says it was.
- **Who**: every reviewer of a journal or press, on the page a
  reviewer lands on after signing in, whenever they search, sort or
  filter. The pager fault is met only with more than 30 assignments
  in one view. A preprint server has no reviewers.
- **Way round**: read the list, or use the browser's find-in-page on
  it; the six views in the sidebar ("Action Required by me",
  "Completed", "Archived" and the others) do narrow it.

Low: four controls on the reviewer's page do nothing, and the review
gets done without them. A list that kept rows off the screen (a pager
that hid them) would raise the severity; this one shows them all.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, or the one for `stable-3_5_0`
  on a 3.5 install: OJS or OMP (the context `publicknowledge`). Nothing
  else. On the journal the reviewer `amccrae` has four rows under "All
  assignments": submissions 7, 10, 13 ("Hydrologic Connectivity in the
  Edwards Aquifer between San Marcos Springs and Barton Springs during
  2009 Drought Conditions") and 20, all in the section "Articles". On
  the press the reviewer `agallego` has four: submissions 11
  ("Dreamwork"), 13, 16 and 18.

Steps:

1. Sign in as `amccrae` (password `amccraeamccrae`); on a press as
   `agallego` (password `agallegoagallego`).
2. Under "My Assignments as Reviewer" in the sidebar open "All
   assignments"
   (`/index.php/publicknowledge/en/dashboard/reviewAssignments?currentViewId=reviewer-assignments-all`).
   The heading reads "All assignments (4)".
3. In the box "Search submissions, ID, authors, keywords, etc." type
   `Hydrologic` (on a press `Dreamwork`) and press Enter.
4. Replace the text with `zzzz` and press Enter.
5. Press "Clear search phrase" on the "Search: zzzz" label above the
   table. [3.5: no label shows above the table; press the button of
   that name inside the search box.]
6. Press "Sort" in the header of the "ID" column, then press it again.
7. On a journal: press "Filters", tick "Reviews" under "Section" and
   press "Apply Filters".
8. For comparison, sign out and sign in as `dbarnes` (password
   `dbarnesdbarnes`). Open the dashboard's "Active submissions"
   (`/index.php/publicknowledge/en/dashboard/editorial?currentViewId=active`),
   repeat step 3, clear the phrase, and press "Sort" on "ID" twice.

The pager is not in the steps: it shows only past 30 assignments in
one view, and the dataset's longest reviewer view holds four.

**Expected**: at step 3 the list holds the one submission with that
word in its title, and the heading reads "All assignments (1)". At
step 4 it reads "No Items". At step 6 the rows stand by ID, highest
first after the first press and lowest first after the second. At
step 7 the list reads "No Items", since none of the four submissions
is in "Reviews".

**Observed**: at every step the table holds the same four rows in the
same order (7, 10, 13, 20 on the journal; 11, 13, 16, 18 on the press)
under "All assignments (4)" and "Showing 1 to 4 of 4". Step 3 puts
"Search: Hydrologic" above them, step 4 "Search: zzzz" [3.5: no
"Search:" label; the phrase stays in the box], step 7 "Section:
Reviews". The page sends what was asked for, and the answer
ignores it:

```
GET …/api/v1/_submissions/reviewerAssignments?searchPhrase=zzzz&active=true&offset=0&count=30&page=1&perPage=30
200, itemsMax 4, four items

GET …/_submissions/reviewerAssignments?active=true&orderBy=id&orderDirection=DESC&offset=0&count=30&page=1&perPage=30
200, itemsMax 4, items 7, 10, 13, 20      (the same for orderDirection=ASC)

GET …/_submissions/reviewerAssignments?active=true&sectionIds[]=2&offset=0&count=30&page=1&perPage=30
200, itemsMax 4, four items
```

At step 8 the editor's list goes from 17 rows (16 on the press) to the
one matching submission under "Active submissions (1)", and the second
press on "Sort" turns the order from highest ID first to lowest first.

## Cause

`PKPBackendSubmissionsController::getReviewAssignments()`
(`lib/pkp/api/v1/_submissions/PKPBackendSubmissionsController.php`,
lines 361–405), which answers `_submissions/reviewerAssignments`,
reads six parameters from the request and no others: the view flags
`actionRequired`, `active`, `archived`, `declined`, `completed` and
`published`. It never reads `searchPhrase`, `orderBy`,
`orderDirection`, `count`, `offset` or a filter such as `sectionIds`,
sets no limit and no order on its collector, and returns every
assignment of the view with `itemsMax` as their number.

The page, however, is the same component for all three dashboards.
In ui-library, `useDashboardConfig()` gives every dashboard the
"Filters" button and the search box and marks the reviewer's "ID"
column `sortable: true`; `dashboardPageStore.js` builds one query for
them all (`submissionsQuery`: the phrase, the view's flags, the
filters, the sort; `useFetchPaginated` adds `offset` and `count`); and
`PKPDashboardHandler::index()` hands every dashboard a filters form
and `countPerPage` 30.

The two sibling endpoints do take them. `getMany()` (the editors'
dashboard) and `assigned()` ("My Submissions") build their collector
in `getSubmissionCollector()`, which starts at `limit(30)`,
`offset(0)` and handles `orderBy`, `offset`, `searchPhrase`, `count`
and the filters; the apps' subclasses add `sectionIds`, `issueIds` and
`seriesIds` there.

The endpoint was written for the 3.5 reviewer list
(`pkp/pkp-lib#8887`) with its view filters only.

Reach:

- All six views of the reviewer's list: one endpoint ("All
  assignments" walked; the others by code).
- "Filters": "Section" walked on the journal. "Issues", "Categories"
  and "Days since last activity" go the same way (code: `issueIds`,
  `categoryIds` and `daysInactive` are not read either).
- The pager (code): the answer holds every row and `itemsMax` is
  their number, so `TablePagination` shows page buttons past 30 while
  the table renders every item it was given, on every page.
- The editors' dashboard (walked) and "My Submissions" (code) are not
  affected.
- The reviewer's list is the endpoint's only caller: the six views in
  `PKP\submission\Repository::getDashboardViews()` name it, nothing
  else in `lib/pkp` or `lib/ui-library/src` does (searched).

## Proposed fix

Make the endpoint take what the page sends
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-list-search-sort-pager-inert/fix.diff),
two files in pkp-lib). In `getReviewAssignments()` the loop gains
four cases: `searchPhrase`, `orderBy` (`id` only,
`APP\submission\Collector::ORDERBY_ID`, with `orderDirection`; the
default is `DESC`), `count` (default 30, capped at `MAX_COUNT`) and
`offset` (default 0). After the loop:

```php
// filters: the app's submission collector says which of the reviewer's submissions pass
$filterParams = array_diff_key($queryParams, array_flip([
    'actionRequired', 'active', 'archived', 'declined', 'completed', 'published',
    'searchPhrase', 'orderBy', 'orderDirection', 'count', 'offset', 'page', 'perPage',
]));
if (!empty($filterParams)) {
    $collector->filterBySubmissionIds(
        $this->getSubmissionCollector($filterParams)
            ->limit(null)->offset(null)
            ->filterByReviewIds($collector->getIds()->all())
            ->getIds()->all()
    );
}

// count before the page is cut, and give the pages a stable order
$itemsMax = $collector->getCount();
$reviewAssignments = $collector
    ->orderBySubmissionId($orderDirection)
    ->limit($count)->offset($offset)
    ->getMany();
```

Paging and sorting use what `PKP\submission\reviewAssignment\Collector`
already has (`limit()`, `offset()`, `orderBySubmissionId()`), with the
defaults and the `MAX_COUNT` cap of `getSubmissionCollector()`. The
count is taken before the limit because this DAO's `getCount()` counts
the limited query. The filters go through `getSubmissionCollector()`,
so each app's own filters (`sectionIds`, `issueIds`, `seriesIds`) work
without being named in pkp-lib; the query runs only when a filter is
sent. Every parameter outside the list above is passed on as a
filter, because the filter names belong to the apps'
`getSubmissionCollector()` overrides.

The diff also gives `orderBySubmissionId()` a second key,
`ra.review_id`. The list keeps one stage and one round per reviewer
and submission, but `review_assignments` has no unique key on round
and reviewer, so two rows of one submission would otherwise have no
fixed order across pages.

The search is a new `searchPhrase()` on the review-assignment
collector: every word must be in the title of the submission's
current publication, or be the submission's ID. It is deliberately
not the submission collector's search. That one also matches author
names, abstracts and keywords. It withholds author names only when
`assignedTo()` is set, and `assignedTo()` would drop declined
assignments from the "Declined" view. A reviewer's search that
matched author names would tell them who wrote a submission under
anonymous review.

Tried on `main` on OJS and OMP. With the fix, step 3 lists the one
submission under "All assignments (1)", step 4 and step 7 read "No
Items", and step 6 orders the rows by ID in both directions; the
editors' list at step 8 is unchanged. The six views hold the same
rows with the fix as without; a search for the family name of a
listed submission's author (`Kumiega`, `Locke Hart`) reads "No
Items"; a search for a listed ID lists that row; a title word
together with `zzzz` reads "No Items".

**Alternatives**

- Take the controls the endpoint does not serve off the reviewer's
  page (in ui-library's `useDashboardConfig()`: no search box and no
  "Filters" for `MY_REVIEW_ASSIGNMENTS`, `sortable: false` on its
  "ID"). Smaller for search, sort and filters, but it removes what
  3.4 offered, and the pager still needs `count` and `offset` in the
  endpoint.
- Send the phrase to the submission collector with `assignedTo()`, as
  "My Submissions" does: no new collector method, but it searches
  nothing in the "Declined" view, and its author-name rule is being
  reworked (`pkp/pkp-lib#9989`, PR `pkp/pkp-lib#12416`, both open).

**What goes with it**

- A product choice the diff makes and the team may change: with no
  sort chosen the list now comes newest submission first, as the
  editors' lists do. Today the query has no order at all (the rows
  came lowest ID first in the walks), and paging needs one.
- The search box's hint, "Search submissions, ID, authors, keywords,
  etc.", promises more than a reviewer's search should match. A
  hint of its own for this page would be a ui-library change, not in
  the diff.
- No stored data is wrong; nothing to repair. The endpoint is
  internal (`_submissions`); the answer's shape is unchanged, it only
  holds at most `count` items now.
- Backport to 3.5: the controller is identical there and its hunks
  apply. The collector lacks some of `main`'s properties and filters,
  so its hunks need placing by hand; the code is the same. Not
  tried on 3.5.
- Guard: an e2e scenario in pkp-e2e (a reviewer's search for a word
  of one title lists that row alone, and a search for no title's word
  reads "No Items"), and a pkp-lib unit test of the collector's
  `searchPhrase()`.

Medium: two pkp-lib files and a new collector method, with a default
order the team should agree on.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-list-search-sort-pager-inert/walk.js)
  with
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-list-search-sort-pager-inert/lib.js).
  It takes the Steps on an install loaded from the default dataset
  (pkp/datasets e8dafbc, 2026-10-02; PostgreSQL) and records, per
  step, the list request's query, its `itemsMax` and item IDs, and
  the rows, heading and labels on screen:
  `PROBE_FEATURE=issues-u28a PROBE_AGENT=u28a node bin/probe.js all shared/playwright/checks/issues/reviewer-list-search-sort-pager-inert/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` and that line's install for 3.5;
  `MODE=neighbour` in front for the extra searches and the six-view
  comparison).
- Walked on `main` and on `stable-3_5_0`, OJS and OMP, 2026-10-02. No
  request failed and no page script failed in any walk.
- Fix trial on `main`, OJS and OMP:
  `node bin/try-fix.js apply shared/playwright/checks/issues/reviewer-list-search-sort-pager-inert/fix.diff ojs omp`,
  the walk, the extra searches and the six-view comparison
  (`MODE=neighbour`), `revert`; these also ran without the fix (every
  search there listed all four rows).
- Branch tips the walks and code reads were made on. `main`: OJS
  b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library 64d67363), OMP
  3b0ecf794c (lib/pkp 3dc90c81a6, lib/ui-library 280f98c5).
  `stable-3_5_0`: OJS 091fb65453, OMP 9c5e24246c (lib/pkp cf3f984335,
  lib/ui-library d4e01883). `stable-3_4_0`: lib/pkp 6f96165c90.
  `stable-3_3_0`: lib/pkp 4156e50233.
- Code read on 3.5: `PKPBackendSubmissionsController.php` is identical
  to `main`'s; ui-library's `useDashboardConfig.js` gives the
  reviewer's page the search box and the sortable "ID".
- Code reads on 3.4 and 3.3: `pages/dashboard/DashboardHandler` builds
  the reviewer's list as the "My Assigned" `SubmissionsListPanel` on
  `_submissions` with `assignedTo` the user;
  `PKPBackendSubmissionsHandler` applies `searchPhrase`, `count` and
  `offset` there, and the list panel's "Filters" (overdue,
  incomplete, stage, days inactive, a journal's sections) are
  parameters the same handler applies. The introducing commit is on
  neither branch, and those lists have no "Sort" control.
- Introduced: `git log -S getReviewAssignments` on the controller
  gives c075b30b36, which gave the method its body, reading two view
  flags and no list parameter; the GitHub API names `pkp/pkp-lib#9469` as its
  pull request. The shared page that offers the controls came with
  `pkp/ui-library#338` and `pkp/pkp-lib#9815` for `pkp/pkp-lib#7495`
  (2024-04-02).
- Upstream search, 2026-10-02: pkp/pkp-lib, pkp/ojs, pkp/omp and
  pkp/ui-library, issues and PRs, for reviewer dashboard search,
  review assignments search not working, reviewer dashboard sort,
  pagination and filters, "My Assignments as Reviewer",
  `reviewerAssignments`, `getReviewAssignments`. `pkp/pkp-lib#9989`
  and `pkp/pkp-lib#12415` are about the submission search's
  author-name rule on the editors' lists, a different fault.
- Not driven: the pager, with the fix and without (the page size is
  fixed at 30 and 31 assignments need 31 submissions in review; read
  in the code, and seen on screen by this campaign on `main` on
  2026-09-05 with 34 rows: "Showing 1 to 30 of 34" under 34 rows, and
  the same 34 on page 2); the "Issues", "Categories" and
  "Days since last activity" filters and the press's "Filters" window
  (code); the views other than "All assignments" for search and sort;
  two assignments of one reviewer on one submission; OPS (the
  dataset's preprint server has no reviewer role); 3.4 and 3.3;
  MySQL (the fix orders by a column and compares lower-cased titles
  with `LIKE`, MySQL not checked).
