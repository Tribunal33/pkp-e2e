# After a refused "Requeue All Failed Jobs", the Failed Jobs page keeps showing a loading circle

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; no Failed Jobs page)
- **Introduced** `pkp/ui-library#248` for `pkp/pkp-lib#8306` · [b4a76e40a2](https://github.com/pkp/ui-library/commit/b4a76e40a2a0bf8ea5e8ff5d4d3d626bcab62912) · 2023-02-16 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U61 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U61-system-administration.md#a6)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On Administration › "View Failed Jobs", a Site Administrator presses
"Requeue All Failed Jobs" and it is refused, for example because the
list was already emptied in another tab. A window titled "Error" says
why. After "OK" the failed jobs are still listed, which is correct,
since nothing was requeued. But a loading circle keeps turning beside
the button until the page is reloaded. On a list long enough to have
page links, a second circle takes the place of the current page number.

The page looks busy when nothing is happening, which suggests the
requeue is still running.

## Impact

- **Lost**: nothing. The refusal is right; only the page's loading
  signal is wrong. The button, the row buttons and the other page links
  are not disabled.
- **Who**: a Site Administrator on "Failed Jobs" whose "Requeue All" is
  refused. That takes a list emptied after the page loaded: in another
  tab, by another administrator, or on the command line
  (`jobs.php failed --clear` or `--redispatch`). It also follows the
  server error in
  [U61 A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U61-A4-requeue-all-failed-jobs-database-error.md),
  which needs failed jobs without stored data and which nothing in the
  application writes. Both are uncommon; an administrator who works in
  one tab does not meet it.
- **Way round**: reload the page, which clears the circle and shows the
  current list.

Low: a misleading busy signal with no effect on the outcome.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`.
- One failed job on the list. No screen makes one; the application's own
  command line does, in the app root:
  `php lib/pkp/tools/jobs.php test --only=failed`, then
  `php lib/pkp/tools/jobs.php run --test` (lib/pkp's test job, which
  fails on the `queuedTestJob` queue).

Steps:

1. Sign in as `admin`.
2. Open Administration › "View Failed Jobs". The table lists the failed
   job, with "Requeue All Failed Jobs" above it. This is tab 1.
3. Open the same page in a second tab, tab 2.
4. In tab 2, press "Delete" on the row. The notice "Failed job deleted
   successfully from failed list." shows and the table reads "No Items".
5. In tab 1, which still lists the row, press "Requeue All Failed Jobs".
6. Press "OK" on the window titled "Error".

With page links under the table (51 failed jobs: the first command 51
times, then the second once; the table shows 50 a page):

1. Sign in as `admin` and open "View Failed Jobs" in tab 1 and tab 2.
2. In tab 2, press "Requeue All Failed Jobs". The notice "All
   redispatchable failed jobs with valid payload have been requeued
   successfully." shows and the table reads "No Items".
3. In tab 1, press "Requeue All Failed Jobs", then "OK" on the "Error"
   window.

**Expected.** At step 5 the request is refused with the window "Error",
"No failed job found in the list.". After "OK" the page is at rest:
nothing on it shows loading.

**Observed.** The window reads as expected:

```
POST /index.php/index/api/v1/jobs/redispatch/all  → 406
{"errorMessage":"No failed job found in the list."}
```

After "OK", a loading circle turns to the left of "Requeue All Failed
Jobs", 1 second later and still 6 seconds later. The row and "There's a
total of 1 failed job(s)." stay. On the list with page links, a second
circle replaces the current page number "1" under the table. After a
reload, neither circle shows and the table reads "No Items".

The page links themselves still work: "2", then "1", show their rows
with no circle left over.

## Cause

`FailedJobsPage.vue`'s `requeueAll()`
(`lib/ui-library/src/pages/jobs/FailedJobsPage.vue`, lines 118–132) sets
`this.isLoadingItems = true` before it posts to `jobs/redispatch/all`.
Only the success path clears the flag: `success` calls
`this.loadList(1)`, whose own `success` in `JobsPageBase.vue` sets
`isLoadingItems = false`. The `error` callback is
`this.ajaxErrorCallback`, which opens the "Error" window and leaves the
flag alone. So any refusal (406, 400 or 500) leaves `isLoadingItems`
true. Two places render that flag: the `<Spinner v-if="isLoadingItems">`
beside the button, and `<Pagination :is-loading="isLoadingItems">`,
which draws a spinner in place of the current page. Nothing else reads
it: the button has no `disabled` binding, and the pager replaces only
the current page's link.

`JobsPageBase.vue`'s `loadList()` (lines 53–72) has the same gap. It
clears the flag in `success` only, so a list request that fails after a
page link (`handlePagination()` sets the flag first) leaves the pager's
circle turning too.

The flag itself is older: `isLoadingItems`, set by `handlePagination()`,
was in the Jobs page before, when a page link reloaded the whole page.
b4a76e40a2 (`pkp/pkp-lib#8306`) replaced that navigation with the AJAX
`loadList()`, which clears the flag on success only, and added
`requeueAll()`. Both gaps start there.

Other ways the same gap shows:

- "Requeue All Failed Jobs" refused because the list is empty (406):
  the circle stays (seen in the browser).
- "Requeue All Failed Jobs" answering a server error (500, the U61 A4
  report's state): the circle stays (seen in the browser). The 500 is
  that report's crash; this report's own steps answer 406, a refusal.
- The 400 answer "Unable to redispatch failed job.": the same `error`
  path (read in the code).
- A page link whose list request fails: the pager's circle stays (read
  in the code).
- The Jobs page (`JobsPage.vue`) uses the same `loadList()`, so the
  pager gap reaches it too (read in the code).
- "Try Again" and "Delete" on a row set no loading flag (read in the
  code; "Delete" seen in the browser).

## Proposed fix

Clear the flag on every way a request ends. In `JobsPageBase.vue`, move
the reset into `complete`, as the `fetch` mixin and
`HighlightsListPanel.vue` do. In `requeueAll()`, clear the flag on
error. The success path already hands over to `loadList()`, which keeps
the circle until the reloaded list arrives.
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/requeue-all-refused-spinner-keeps-turning/fix.diff)
is against the app root; for a ui-library PR, apply it with
`git apply -p3`:

```diff
--- a/lib/ui-library/src/pages/jobs/FailedJobsPage.vue
+++ b/lib/ui-library/src/pages/jobs/FailedJobsPage.vue
@@ -123,7 +123,10 @@
 				headers: {
 					'X-Csrf-Token': pkp.currentUser.csrfToken,
 				},
-				error: this.ajaxErrorCallback,
+				error: (r) => {
+					this.isLoadingItems = false;
+					this.ajaxErrorCallback(r);
+				},
 				success: (response) => {
 					pkp.eventBus.$emit('notify', response.message, 'success');
 					this.loadList(1);
--- a/lib/ui-library/src/pages/jobs/JobsPageBase.vue
+++ b/lib/ui-library/src/pages/jobs/JobsPageBase.vue
@@ -66,6 +66,8 @@
 					this.total = response.total;
 					this.currentPage = response.pagination.currentPage;
 					this.lastPage = response.pagination.lastPage;
+				},
+				complete: () => {
 					this.isLoadingItems = false;
 				},
 			});
```

Proposed, and tried on main in OJS, OMP and OPS. With it, after "OK" no
circle shows, on both lists and after the server error. The page links,
the successful "Requeue All Failed Jobs" in the other tab and "Delete"
read as before.

**Alternatives**

- A `complete` callback in `requeueAll()`: it would also clear the flag
  after a success, before the reloaded list arrives, so the circle would
  stop while the table is still stale.
- Reload the list after a refusal (`this.loadList(this.currentPage)` in
  the error path): a stale tab would then catch up and show "No Items".
  That is a reasonable addition, but it changes what the page shows, so
  it is the team's call. The fix above only stops the false circle.

**What goes with it**

- No stored data is involved.
- Backport: the diff applies as it stands to 3.5. On 3.4 the same two
  changes go into `src/components/Container/FailedJobsPage.vue` and
  `src/components/Container/JobsPage.vue`.
- Test: ui-library's vitest suite tests composables and stores only,
  with no `@vue/test-utils` and no DOM environment, and the page calls
  the global `$.ajax`. So a component test would need that tooling
  first. The check that fits today is an end-to-end one: the kept script
  in Evidence takes the Steps and counts the circles after "OK", and
  could become a scenario in pkp-e2e's U61 suite.

Small: a few lines in two ui-library files, following the `complete`
pattern the library already uses. A component test would add test
tooling to ui-library, which this estimate does not count.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/requeue-all-refused-spinner-keeps-turning/walk.js)
  with its helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/requeue-all-refused-spinner-keeps-turning/lib.js).
  It makes the failed jobs with the commands above, signs in as `admin`
  and takes both groups of steps in two tabs. It counts the visible
  loading circles (`.pkpSpinner`) 1 s and 6 s after "OK", and again after
  a reload. Then it takes the 500 path (two more failed jobs,
  `UPDATE failed_jobs SET payload = ''` on them, then "Requeue All
  Failed Jobs"). Run it with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/requeue-all-refused-spinner-keeps-turning/walk.js`.
- Walked 2026-10-01 on PostgreSQL, each install loaded from
  pkp/datasets 38ab955 (2026-09-30), `<app>/main/pgsql` and
  `<app>/stable-3_5_0/pgsql`. main: OJS bade233f73 (lib/pkp
  2e377d27fc), OMP 3b0ecf794 and OPS c8af945bb7 (lib/pkp 3dc90c81a6),
  ui-library 280f98c5. stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00,
  OPS cf4fce69bd (lib/pkp a9c76aed62, ui-library 1a7a4750).
  `FailedJobsPage.vue` and `JobsPageBase.vue` are identical on 3.5 and
  main.
- The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/requeue-all-refused-spinner-keeps-turning/fix.diff ojs omp ops`,
  which rebuilds the JavaScript.
- 3.4, by code: OJS `stable-3_4_0` at 9571d8fde7, pkp-lib at df13621c2d,
  ui-library at ee684b34. `src/components/Container/FailedJobsPage.vue`
  `requeueAll()` is the same as main's. `JobsPage.vue` `loadList()`
  clears the flag in `success` only. pkp-lib's
  `templates/admin/failedJobs.tpl` (added by f65908dc36, PR
  `pkp/pkp-lib#8534`) renders `<spinner v-if="isLoadingItems">` beside
  the button and `<pagination :is-loading="isLoadingItems">`.
  `PKPJobHandler::redispatchAllFailedJob()` answers 406 on an empty
  list. b4a76e40a2 is on the branch. OMP and OPS run the same pkp-lib
  and ui-library files.
- 3.3, by code: OJS `stable-3_3_0` at 9fdb9bcf9a, pkp-lib at d446601ebe,
  ui-library at 96959f9e. There is no `templates/admin/failedJobs.tpl`
  and no jobs page component.
- Introduced: `git blame` on `FailedJobsPage.vue` puts `requeueAll()` in
  b978d50fc4 (`pkp/ui-library#389`, 2024), which moved it unchanged
  from `src/components/Container/FailedJobsPage.vue`, where b4a76e40a2
  wrote it. In the parent of b4a76e40a2, `JobsPage.vue`'s
  `handlePagination()` set `isLoadingItems` and then set
  `window.location`.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library by symptom
  and by `requeueAll`, `FailedJobsPage` and `isLoadingItems`.
- Not driven: the walk did not press the button, the row buttons or the
  other page links after "OK"; that they are not disabled is read from
  the code (nothing binds `disabled` to the flag).
