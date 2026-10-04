# Submissions dashboard: a sort switched off stays in the address and comes back on reload

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; the submission list has no sortable columns)
  - 3.3: none (code; as 3.4)
- **Introduced** `pkp/ui-library#609` for `pkp/pkp-lib#10772` · [97863b835](https://github.com/pkp/ui-library/commit/97863b835eae8782feca3f89e4c78d0178ffe47f) · 2025-04-29 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** `pkp/pkp-lib#12736` (open), the same fault; it proposes a two-way toggle where this report proposes clearing the keys
- **Tracked in** spec U23 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U23-submissions-dashboard.md#a5)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

Clicking a sortable column header ("ID", or "Days", which the address
names `lastActivity`) on the submissions dashboard cycles it through
descending, ascending and off. The page's address records the first
two, but the third click leaves the address on "ascending" while the
rows go back to their default order. Reloading the
page, or opening the address from a bookmark or a shared link, sorts the
list again by the column the person had switched off.

Nothing is lost: one more click after the reload puts the list back in
its default order, though the address again keeps the sort.

The same happens on an author's My Submissions and on a reviewer's list
of assignments, which use the same table.

## Impact

- **Lost.** Nothing. Until the page is reloaded the address says one
  order and the list shows another; after a reload the list is sorted
  by a column nobody chose.
- **Who.** Anyone who sorts a submission list and switches the sort off
  again (editors, authors, reviewers), then reloads, bookmarks or shares
  the page.
- **Way round.** Click the header once more after the reload: the list
  returns to its default order. Only removing `sortColumn` and
  `sortDirection` from the address by hand gives an address without the
  sort.

Low: nothing is lost and the list can always be put back in its default
order; only a reloaded or shared address shows a sort the person
switched off.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS). Nothing else.

Steps:

1. Sign in as `dbarnes` and open the dashboard
   (`/index.php/publicknowledge/en/dashboard/editorial`).
2. In the side menu, choose "Active submissions". The address ends
   `?currentViewId=active`. On OJS the rows read 20, 19, 16, 15 … 2: the
   default order, newest submission first, which in this dataset is
   also the highest ID first.
3. Click the "ID" column header. The address gains
   `&sortColumn=id&sortDirection=descending`; the rows look unchanged,
   since descending ID is the order they already had.
4. Click "ID" again. The rows sort lowest first (2, 3, 4 …), and the
   address reads `sortDirection=ascending`. This is the sort the next
   click switches off, so the change is visible.
5. Click "ID" a third time.
6. Reload the page.

[OPS: "Active submissions" holds one preprint in this dataset, so the
rows cannot change order; the address and the reload show the same as on
OJS and OMP.]

**Expected.** After step 5 the address loses `sortColumn` and
`sortDirection`, as the list loses its sort. After step 6 the list loads
in its default order (20, 19, 16 …).

**Observed.** After step 5 the rows return to the default order (20,
19, 16 …), while the address still reads:

```
/index.php/publicknowledge/en/dashboard/editorial?currentViewId=active&sortColumn=id&sortDirection=ascending
```

After step 6 the list is sorted by ID again, lowest first (2, 3, 4 …),
and the page asks the server for that order:

```
GET /index.php/publicknowledge/api/v1/_submissions?status%5B%5D=1&assignedWithRoles&orderBy=id&orderDirection=ASC&offset=0&count=30&page=1&perPage=30
```

The same three clicks on "ID" on My Submissions (signed in as `ccorino`,
or `afinkel` on OMP) and on a reviewer's list (`jjanssen`, OJS and OMP)
leave `sortColumn=id&sortDirection=ascending` in the address too, and a
reload asks for `orderBy=id&orderDirection=ASC` again.

## Cause

The sort state lives in ui-library's
[`useSorting()`](https://github.com/pkp/ui-library/blob/64d6736318/src/composables/useSorting.js#L7-L56).
It cycles a column through `descending`, `ascending` and `none`, and
its `sortQueryParams` returns `{sortColumn, sortDirection}` for the first
two and an empty object for `none`.

The dashboard's store copies that into the address in
[`dashboardPageStore.js`](https://github.com/pkp/ui-library/blob/64d6736318/src/pages/dashboard/dashboardPageStore.js#L257-L266),
but only the keys that have a value:

```js
watch(sortQueryParams, (newSortQueryParams) => {
	if (newSortQueryParams.sortColumn) {
		queryParamsUrl.sortColumn = newSortQueryParams.sortColumn;
	}
	if (newSortQueryParams.sortDirection) {
		queryParamsUrl.sortDirection = newSortQueryParams.sortDirection;
	}
});
```

So when the sort is switched off, the empty object writes nothing and the
address keeps the previous state. The list's request reads the sort from
`useSorting()` directly (`sortQueryParamsApi`), so the rows follow the
click while the address does not. On load the store applies the address's
sort (`applySort(queryParamsUrl.sortColumn, queryParamsUrl.sortDirection)`,
lines 253–255), which is why a reload brings the switched-off sort back.
The rule it breaks is the one the URL sync was added for in
`pkp/pkp-lib#10771` and `pkp/pkp-lib#10772`: the address records the
page's state, so the page can be reloaded or shared as it was.

Reach:

- Every column that can be sorted: "ID" (`id`) on the editorial
  dashboard, My Submissions and the reviewer's list (on screen), and
  "Days" (`lastActivity`) on the editorial dashboard (code). All three pages are `DashboardPage.vue`
  with this one store.
- The reviewer's list (on screen): the address keeps the stale sort, but
  the rows there do not change order with any sort: the reviewer list's
  request ignores the ordering, a separate fault
  ([pkp-e2e#581](https://github.com/jardakotesovec/pkp-e2e/issues/581)).
- Other address writers (code): the filters (`useFiltersForm`'s
  `filtersFormQueryParams`) send every field, `null` when cleared, and the
  search phrase is set to `undefined` when cleared, so both leave the
  address. `useSorting()` has no other caller.

## Proposed fix

Write both keys every time, as the filters already do; `undefined`
removes a key from the address (`useUrlSearchParams` drops nullish
values by default) ([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/dashboard-unsort-keeps-sort-in-address/fix.diff)):

```diff
--- a/lib/ui-library/src/pages/dashboard/dashboardPageStore.js
+++ b/lib/ui-library/src/pages/dashboard/dashboardPageStore.js
 		watch(sortQueryParams, (newSortQueryParams) => {
-			if (newSortQueryParams.sortColumn) {
-				queryParamsUrl.sortColumn = newSortQueryParams.sortColumn;
-			}
-
-			if (newSortQueryParams.sortDirection) {
-				queryParamsUrl.sortDirection = newSortQueryParams.sortDirection;
-			}
+			queryParamsUrl.sortColumn = newSortQueryParams.sortColumn;
+			queryParamsUrl.sortDirection = newSortQueryParams.sortDirection;
 		});
```

It was tried on `main` on OJS, OMP and OPS. The third click then left
the address at `?currentViewId=active`, and the reload loaded the default
order with no ordering in the request.

Three neighbouring behaviours were checked with the fix in and out, and
did not change:

- Clicking "Days" and then "ID" writes
  `sortColumn=id&sortDirection=descending`.
- A reload keeps that sort.
- When the sort is switched off, the view and a search phrase (checked
  on OMP and OPS) stay in the address.

This is a proposal; the team decides.

**Alternatives:**

- Drop the third state, so a header only toggles between descending and
  ascending, as `pkp/pkp-lib#12736` asks: a product change, and it
  removes the only way back to the default order on screen, since
  choosing another view keeps the sort.
- Write `sortDirection=none` into the address: it keeps a key that means
  nothing and makes every address longer; removing the keys is how the
  search phrase and the filters already leave.

**What goes with it:**

- Backport: the diff applies to `stable-3_5_0` as written.
- Guard: a third click on "ID" in U23 scenario 7 ("Sort and page"),
  asserting that the address loses the sort (a Planned item in the
  spec). A ui-library unit test is optional. It would need a harness
  that ui-library lacks today: the store mounted with its props, and
  `window.location` set before `useQueryParams()` reads it.

Small: two lines in one file of ui-library, following the pattern the
filters already use, and one e2e check.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/dashboard-unsort-keeps-sort-in-address/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/dashboard-unsort-keeps-sort-in-address/walk.js)
  takes Steps 1–6 on an install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/dashboard-unsort-keeps-sort-in-address/walk.js`.
  Its `reach` mode takes the three clicks and the reload on My
  Submissions and the reviewer's list; its `neighbour` mode is the check
  run with the fix in and out.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, on PostgreSQL,
  from pkp/datasets 1a5552c (2026-10-04). On 3.5 the Steps and the reach
  showed the same as on `main`. No request failed and no page script
  failed.
- 3.5 code: `stable-3_5_0`'s ui-library has the same watcher (lines
  211–220 of `dashboardPageStore.js`, from 53c57eff6, the PR's own
  commit) and the same `useSorting.js`.
- 3.4 and 3.3 code: ui-library's `stable-3_4_0` and `stable-3_3_0` have
  no `dashboardPageStore.js` or `useSorting.js`; their submission list
  (`SubmissionsListPanel.vue`) has no sortable column and writes nothing
  to the address.
- Tips: OJS `main` ff004d0973 (`lib/pkp` 987776cd04, `lib/ui-library`
  64d6736318); OMP `main` 3b0ecf794c and OPS `main` c8af945bb7 (`lib/pkp`
  3dc90c81a6, `lib/ui-library` 280f98c570); `stable-3_5_0` OJS
  c1cee76b95 (`lib/pkp` 771474347e), OMP 9c5e24246c, OPS 38b61882d3
  (`lib/pkp` cf3f984335), `lib/ui-library` d4e0188353; ui-library
  `stable-3_4_0` ee684b34, `stable-3_3_0` 96959f9e.
- Introduced: `git blame` on the watcher gives 97863b835 on ui-library
  `main`, the port of `pkp/ui-library#609` (merged into `stable-3_5_0` as
  53c57eff6 the same day); it added the URL sync together with a
  `sortQueryParams` that returns `{}` for `none`. The three-state cycle itself is older.
- Upstream: pkp/pkp-lib, pkp/ui-library, pkp/ojs, pkp/omp and pkp/ops
  searched by the symptom's words and by `sortColumn` and
  `sortQueryParams`. `pkp/pkp-lib#12736` (OJS, OMP, OPS 3.5.0-4) shows the
  same stale address after a third click.
