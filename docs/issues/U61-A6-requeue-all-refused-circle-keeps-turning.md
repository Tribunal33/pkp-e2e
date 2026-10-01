# Failed Jobs: after a refused "Requeue All Failed Jobs", loading circles keep turning until the page is reloaded

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; no Failed Jobs page)
- **Introduced** `pkp/ui-library#248` for `pkp/pkp-lib#8306` · [b4a76e40a2](https://github.com/pkp/ui-library/commit/b4a76e40a2a0bf8ea5e8ff5d4d3d626bcab62912) · 2023-02-16 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U61 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U61-system-administration.md#a6)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

The site administrator presses "Requeue All Failed Jobs" on Administration ›
"Failed Jobs", and the server refuses the request: a window titled "Error"
gives the reason, for example "No failed job found in the list." when the
list was already emptied in another tab. After "OK" the rows rightly stay as
they were, but a loading circle keeps turning beside the button, and a
second one in place of the page number when the list has page links.

The page looks busy when nothing is happening, until it is reloaded. Every
error answer to this button does the same, whatever its reason.

## Impact

- **Lost**: nothing. No job is requeued or removed, and the "Error" window
  says why; only the page's busy sign is wrong.
- **Who**: the site administrator on "Failed Jobs", when the server
  refuses "Requeue All Failed Jobs". Two refusals do that today. One is a
  list emptied elsewhere in the meantime (another tab, another
  administrator). The other is the server error when no failed job has
  stored data, a state no screen creates (spec U61
  [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U61-system-administration.md#a4)).
  Both are rare.
- **Way round**: reload the page. Meanwhile the page stays usable: in the
  walk the button stayed pressable and the page link "2" stayed shown, and
  by the code that page link and each row's "Try Again" and "Delete" work
  as usual. The circles do not grow or pile up.

Low: the page only shows a wrong busy sign and nothing is at risk. It would
rise if the refusal became common in ordinary use, or if the circles
blocked the page's controls.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (OJS, OMP or OPS).
- 51 failed jobs, so the list has a second page. With fewer than 51
  failed jobs there are no page links, so only the circle beside the
  button shows. The dataset has none and no screen makes
  one, so on the server, in the application's folder, queue the
  application's own always-failing test job 51 times and run the test
  queue once:

  ```sh
  for i in $(seq 51); do php lib/pkp/tools/jobs.php test --only=failed; done
  php lib/pkp/tools/jobs.php run --test
  ```

Steps:

1. Sign in as `admin`.
2. Administration › "View Failed Jobs". The page reads "There's a total of
   51 failed job(s).", with the page links "Previous 1 2 Next" under the
   table.
3. Open the same page (`/index.php/index/en/admin/failedJobs`) in a second
   tab.
4. In the first tab, press "Requeue All Failed Jobs". The notice "All
   redispatchable failed jobs with valid payload have been requeued
   successfully." shows and the table reads "No Items".
5. In the second tab, which still lists the 51, press "Requeue All Failed
   Jobs". A window titled "Error" reads "No failed job found in the list."
   with "OK".
6. Press "OK".

**Expected.** The window closes and the page is idle again: no loading
circle beside "Requeue All Failed Jobs", and the page links read "Previous
1 2 Next".

**Observed.** Step 5's request answered:

```
POST /index.php/index/api/v1/jobs/redispatch/all
406 {"errorMessage":"No failed job found in the list."}
```

After "OK", a loading circle turns beside "Requeue All Failed Jobs", and
another stands in place of the current page number: the page links read
"Previous", the circle, "2", "Next". Both were still turning 10 seconds
later. The 50 rows, the total "There's a total of 51 failed job(s)." and
the button, still pressable, stay as they were.

Control: step 4 in the first tab ends with no circle once the list has
reloaded.

## Cause

`FailedJobsPage.vue` `requeueAll()` (ui-library,
`src/pages/jobs/FailedJobsPage.vue`) sets `this.isLoadingItems = true` and
posts `jobs/redispatch/all`. Its `success` handler calls `loadList(1)`, and
only the `success` of that list request sets `isLoadingItems = false`. Its
`error` handler is the bare
`this.ajaxErrorCallback`, which opens the "Error" window and nothing else,
so after any refusal the flag stays `true`.

The template draws a `<Spinner v-if="isLoadingItems">` beside the button,
and passes `:is-loading="isLoadingItems"` to `Pagination`, which shows a
spinner in place of the current page's number. Both stay until a list load
succeeds: a page reload, or a page link (`handlePagination()` →
`loadList()`).

`JobsPageBase.vue` `loadList()` makes the same mistake. It clears the flag
in `success` only, so a page link whose list request fails leaves the
circles too. The sibling list panels clear their loading flag in a
`complete` handler (`SelectReviewerListPanel.vue`
`updateReviewerSuggestionList()`, `ReviewerSuggestionsListPanel.vue`,
`HighlightsListPanel.vue`, the `fetch` mixin), which runs after success and
error alike.

The 2024 migration to the new Table API (`pkp/ui-library#389` and
`pkp/pkp-lib#10255`, for `pkp/pkp-lib#9744`;
[b978d50fc4](https://github.com/pkp/ui-library/commit/b978d50fc47bb0fad296a7bbbdbc3102ca66ad66))
moved the spinner and the page links from pkp-lib's
`templates/admin/failedJobs.tpl` into the Vue template, and moved both
methods to `src/pages/jobs/`. It carried the methods' handlers over
unchanged.

Reach:

- the 406 "No failed job found in the list." when the list was emptied
  elsewhere (on screen, the steps above);
- the 400 `api.jobs.400.failedJobRedispatchedFailed`, "Unable to
  redispatch failed job." (code).
  `PKPJobController::redispatchAllFailedJob()` answers it when
  `FailedJob::redispatchToQueue()` returns 0. That method returns the
  number of failed jobs it deleted. Today it returns 0 only in a race:
  another request deletes the selected rows between the method's read and
  its delete;
- the server error of spec U61
  [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U61-system-administration.md#a4),
  "Requeue All" when no failed job has stored data: the same circles after
  "OK" (seen on screen; a separate fault with its own report). A4's
  proposed fix makes `redispatchToQueue()` return 0 in that case, so the
  controller answers the 400 above instead. After that fix, this page's
  circles follow that refusal too;
- a failed list load from a page link, on "Failed Jobs" and on "Jobs",
  which shares `JobsPageBase` (code);
- the row buttons "Try Again" and "Delete" never set the flag, so their
  refusals leave no circle (code).

## Proposed fix

Clear the flag on every way out of the two requests, in ui-library
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/requeue-all-refused-circle-keeps-turning/fix.diff)):

```diff
--- a/lib/ui-library/src/pages/jobs/FailedJobsPage.vue
+++ b/lib/ui-library/src/pages/jobs/FailedJobsPage.vue
@@ requeueAll()
-				error: this.ajaxErrorCallback,
+				error: (r) => {
+					this.isLoadingItems = false;
+					this.ajaxErrorCallback(r);
+				},
--- a/lib/ui-library/src/pages/jobs/JobsPageBase.vue
+++ b/lib/ui-library/src/pages/jobs/JobsPageBase.vue
@@ loadList()
 					this.lastPage = response.pagination.lastPage;
+				},
+				complete: () => {
 					this.isLoadingItems = false;
 				},
```

`requeueAll()` clears the flag in its error handler rather than in
`complete`: on success it hands over to `loadList(1)`, and a `complete`
there would hide the circle while the list is still reloading. The rows
are left as they are, as the row buttons do after a refusal.

The diff's paths start at the application's folder; a ui-library pull
request applies it with `git apply -p3`.

Tried on `main` on the three apps: the walk then showed no circle after "OK"
and the page links "Previous 1 2 Next". A second check, with the fix in and
out, delayed the page's own list and requeue requests. It confirmed that the
circles still show while a page link or a successful "Requeue All Failed
Jobs" is loading, and go once the list has loaded ("No Items" after the
requeue).

**Alternatives**

- Reload the list after a refused "Requeue All": it would show "No Items"
  in the steps above, but it changes what a refusal does on this page,
  unlike the row buttons. That is a product choice; it can come on top of
  this fix.
- Clear the flag inside `ajaxErrorCallback`: that mixin is shared by many
  components that know nothing of `isLoadingItems`.

**What goes with it**

- No stored data to repair, no API or plugin change.
- Backport: 3.5 has the same two files unchanged and the diff applies as
  written. 3.4 has the same code in `src/components/Container/FailedJobsPage.vue`
  and `JobsPage.vue`, where the same two edits fit.
- Guard: an e2e scenario on Failed Jobs (a refused "Requeue All Failed
  Jobs", then no loading circle after "OK"), a **Planned** item in spec
  U61.

Small: two handlers in ui-library, with no data repair and no API change.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/requeue-all-refused-circle-keeps-turning/walk.js)
  (helpers in `lib.js` beside it), run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/requeue-all-refused-circle-keeps-turning/walk.js`
  on an install freshly loaded from the default dataset (pkp/datasets
  c657990, 2026-10-01, PostgreSQL). The precondition runs exactly the two
  commands above under the install's config. The script reads the page at
  once, 3 s and 10 s after "OK". Neighbour check:
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/requeue-all-refused-circle-keeps-turning/neighbour.js).
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, with the same
  observation on all six. No request answered 500 and the first tab logged
  no script error; the second tab's console was not recorded.
- Tips: `main` OJS b84f8e2e44 (pkp-lib ddd8ab243a, ui-library 64d67363),
  OMP 3b0ecf794 and OPS c8af945bb7 (pkp-lib 3dc90c81a6, ui-library
  280f98c5); `stable-3_5_0` OJS c346ee00a5 (pkp-lib 3bb4450bea), OMP
  c7b45f88e and OPS 8eaf899468 (pkp-lib 1fb843f491), ui-library d4e01883;
  `stable-3_4_0` OJS 75cc2d488b, pkp-lib 32b0f4b4af, ui-library ee684b34;
  `stable-3_3_0` OJS ac77c9fb35, pkp-lib f6ab331645, ui-library 96959f9e.
- 3.4 (code): read ui-library `requeueAll()` and `loadList()` (the files
  the Backport bullet names); pkp-lib `templates/admin/failedJobs.tpl`,
  where the spinner and the page links are bound to `isLoadingItems`; and
  `api/v1/jobs/PKPJobHandler.php` `redispatchAllFailedJob()`, which
  answers 406 on an empty list. The three apps share these files.
- 3.3 (code): no Failed Jobs page, jobs API or failed-jobs component in
  pkp-lib or ui-library `stable-3_3_0`.
- Introduced: `git blame` on `requeueAll()` in `src/pages/jobs/FailedJobsPage.vue`
  gives b978d50fc4 (the Table API migration, `pkp/ui-library#389`, which
  moved the file and carried the method over unchanged); the file before it,
  `src/components/Container/FailedJobsPage.vue`, has the method unchanged
  since b4a76e40a2, which `git log -S requeueAll` names as its origin; the
  GitHub API names `pkp/ui-library#248` (touhidurabir) for that commit.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library for "requeue
  all", "failed jobs" with "spinner", "loading" or "page", "redispatch
  failed", `FailedJobsPage` and `requeueAll`. Only the feature's own issue
  and PRs and an unrelated payload display fix (`pkp/pkp-lib#11862`) came
  up.
- Not walked: the 400 refusal and a failed page-link load (code only); the
  A4 server error is walked in its own report. MySQL not checked; the fault
  is in the browser code, not in the database.
