# On a press, an unpublished book's Production stage still says the monograph has been approved

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/omp#700` for `pkp/pkp-lib#2072` · [ce205d5836](https://github.com/pkp/omp/commit/ce205d58362e3bdcfaf1dc59e43c6c068e12415c) · 2019-08-21 · Nate Wright (NateWr)
- **Upstream** `pkp/pkp-lib#10618` (closed without a fix; a comment on it lists this notice staying after an unpublish)
- **Tracked in** spec U70 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U70-catalog-management.md#a6), spec U33 [OMP2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U33-production-stage.md#omp2)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

When an editor of any press unpublishes a book, its Production stage
keeps the "Catalog Management" notice: "The monograph has been approved.
Please visit Marketing and Publication to manage its catalog details,
using the links just above." Expected is the notice an unpublished book
has: "Awaiting approval." with "The monograph will not be listed in the
catalog until it has been published. To add this book to the catalog,
click on the Publication tab."

The wrong notice stays until the book is published again. The fix is one
condition in one shared class; the fault has been there since 3.2.

## Impact

- **Lost**: nothing. The workflow's "Publish" button and the public
  catalog show the book's real state; only the notice is wrong.
- **Who**: everyone who opens the Production stage of a book the press
  has unpublished (to correct or withdraw it), the author included.
- **Way round**: none is needed to get work done, and the notice
  corrects itself at the next publish.

Low: a notice that misleads while the book's state is right. It would be
medium if a press relied on this notice to tell which books are in the
catalog.

## Steps to reproduce

Preconditions: PKP's default test dataset, OMP `main`, press
`publicknowledge`. Submission 5, "Bomb Canada and Other Unkind Remarks in
the American Media", is published with one version; its author account is
`callan`.

1. Sign in as `dbarnes`.
2. Open submission 5's workflow
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=5`).
3. In the side menu, press "Production". The box reads "Catalog
   Management", as it should for a published book.
4. In the side menu, press "Title & Abstract", then "Unpublish" at the
   top right; in "Are you sure you don't want this to be published?"
   press "Unpublish".
5. In the side menu, press "Production".
6. Open the press's catalog (`/index.php/publicknowledge/en/catalog`).
7. Sign out, sign in as `callan`, open the book
   (`/index.php/publicknowledge/en/dashboard/mySubmissions?workflowSubmissionId=5`)
   and press "Production".

**Expected** (steps 5 and 7): the notice the stage showed before the book
was first published:

```
Awaiting approval.
The monograph will not be listed in the catalog until it has been published. To add this book to the catalog, click on the Publication tab.
```

**Observed**: in steps 5 and 7, for the editor and the author alike:

```
Catalog Management
The monograph has been approved. Please visit Marketing and Publication to manage its catalog details, using the links just above.
```

The header offers "Preview" and "Publish", and the catalog in step 6 no
longer lists the book. Submission 4, "How Canadians Communicate", which
has never been published, reads "Awaiting approval." on its Production
stage.

## Cause

lib/pkp `PKPApproveSubmissionNotificationManager::updateNotification()`
manages three notice types from the current publication's date
published:

```php
$notificationTypes = [
    Notification::NOTIFICATION_TYPE_APPROVE_SUBMISSION => false,
    Notification::NOTIFICATION_TYPE_FORMAT_NEEDS_APPROVED_SUBMISSION => false,
    Notification::NOTIFICATION_TYPE_VISIT_CATALOG => true,
];
$isPublished = (bool) $publication->getData('datePublished');
```

With a date it keeps `VISIT_CATALOG` ("Catalog Management") and deletes
the other two; without one it keeps `FORMAT_NEEDS_APPROVED_SUBMISSION`
("Awaiting approval.") and `APPROVE_SUBMISSION`. Nothing on screen asks
for `APPROVE_SUBMISSION`: neither `WorkflowNotificationDisplay.vue` nor
the constants `PKPDashboardHandler` passes to the page include it (code).

"Unpublish" keeps the date. lib/pkp `Publication\Repository::unpublish()`
only sets the status back to `STATUS_QUEUED`, so that the book's "Date
Published" on the Catalog Entry page survives for the next publish. OMP
`Publication\Repository::unpublish()` then calls `updateNotification()`,
which still finds a date and leaves "Catalog Management" in place. After
step 4 the publication has status 1 with its date published, and the
book's only notice row of the three is the `VISIT_CATALOG` one.

Before 3.2, OMP's `SubmissionService::removeFromCatalog()` cleared the
date (`setDatePublished(null)`) before the same `updateNotification()`
call, so the notice followed. The versioning change (`pkp/omp#700`, with
`pkp/pkp-lib#5025` on the pkp-lib side) moved unpublishing to the
publication, which keeps its date.

Reach:

- Every unpublish of a book's latest version when that version had been
  published: walked for submission 5's only version. When a newer
  unpublished version exists, unpublishing the last published one makes
  the newer one current; it has no date, so the notice is right then
  (code: `Submission\Repository::getCurrentPublicationIdByPublications()`,
  `Publication\Repository::version()` clears the copy's date).
- A scheduled book (a future "Date Published", then "Schedule For
  Publication") reads "Catalog Management", which is right because it has
  been approved (walked); the fix keeps it.
- OJS and OPS call the delegate only when a submission is submitted
  (`PKPSubmissionController::submit()`), where the publication is queued
  and has no date, and show neither notice: `WorkflowNotificationDisplay.vue`
  asks for them on OMP only (code).
- Stored data: each book unpublished since 3.2 and still unpublished
  holds a stale "Catalog Management" row (code).

## Proposed fix

Pick the notice by the publication's status, the way `main`'s
`Submission\Repository` (its `$lockedPublication` test) and
`PKPSubmissionController` already test for "published or scheduled"
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unpublished-book-notice-still-approved/fix.diff)):

```diff
+use PKP\publication\PKPPublication;
 ...
-        $isPublished = (bool) $publication->getData('datePublished');
+        // Read the status: an unpublished publication keeps its datePublished.
+        $isPublished = in_array($publication->getData('status'), [PKPPublication::STATUS_PUBLISHED, PKPPublication::STATUS_SCHEDULED]);
```

The rule lives in the shared delegate, so every caller is covered:
OMP's publish and unpublish, the scheduled-publishing task (through
`publish()`) and submission. On unpublish the fix also brings back the
`APPROVE_SUBMISSION` row, the same row a book never published has.

It was tried on OMP `main`. With the fix, the Steps show "Awaiting
approval." after "Unpublish" for `dbarnes` and `callan`. Three controls
gave the same notices with the fix in and out: "Awaiting approval." on
submission 4, never published; "Catalog Management" on submission 5
unpublished and published again; "Catalog Management" on submission 4
scheduled for 2030-01-01.

**Alternatives**

- Clear the date on unpublish, as 3.1 did: the book would lose the
  "Date Published" the Catalog Entry page keeps for the next publish, and
  REST API clients would see an unpublished version without its date.
- Key on `STATUS_PUBLISHED` alone: a scheduled book would then read
  "Awaiting approval." and "To add this book to the catalog, click on the
  Publication tab.", which the editor has already done.

**What goes with it**

- Stored rows: a book unpublished before the fix keeps its stale row
  until it is next published or unpublished. An upgrade step that runs
  `updateNotification()` for each unpublished book would clear them. It
  is optional, since only this notice reads the row.
- Backport: on 3.5, 3.4 and 3.3 the publication class has no `STATUS_*`
  constants, so the diff as written would fail with an undefined
  constant every time the delegate runs. There the test uses
  `PKPSubmission::STATUS_PUBLISHED` and `PKPSubmission::STATUS_SCHEDULED`
  (3.5's `PKPSubmissionController` does the same); 3.3 uses the global
  `STATUS_PUBLISHED` and `STATUS_SCHEDULED`. 3.5 has `main`'s line; 3.4 and
  3.3 test `$submission->getDatePublished()` (the current publication's
  date), so there the status test goes on
  `$submission->getCurrentPublication()`.
- Guard: an e2e check that the Production stage reads "Awaiting
  approval." after "Unpublish".

Small: one line in the shared delegate, tried, with no data repair
required.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unpublished-book-notice-still-approved/walk.js)
  takes the Steps on OMP (`WALK=neighbour` runs the three controls
  alone), on an install loaded from PKP's default test dataset
  (pkp/datasets 566bb1f, 2026-10-03, PostgreSQL):
  `PROBE_FEATURE=<fleet> node bin/probe.js omp shared/playwright/checks/issues/unpublished-book-notice-still-approved/walk.js`.
  It also reads the book's `notifications` rows and its publication's
  status and date after each step.
- Tips: `main` OMP 3b0ecf794c (lib/pkp 3dc90c81a6, lib/ui-library
  280f98c5); `stable-3_5_0` OMP 9c5e24246c (lib/pkp cf3f984335);
  `stable-3_4_0` OMP 0aec65441f (lib/pkp 767353f4fe); `stable-3_3_0` OMP
  8e72fc8836 (lib/pkp ac3fa73402).
- 3.5, walked: the same observations as on `main`; the delegate's line is
  the same, and `PKPPublication` has no `STATUS_*` constants
  (`PKPSubmission` has them).
- 3.4 (code): the delegate tests `$submission->getDatePublished()`, which
  `PKPSubmission` reads from the current publication. lib/pkp
  `Repository::unpublish()` sets only the status. OMP
  `Publication\Repository::unpublish()` calls `updateNotification()`. OMP
  `controllers/tab/workflow/WorkflowTabHandler.php` asks for both notices
  on the Production tab.
- 3.3 (code): the same in `PKPApproveSubmissionNotificationManager.inc.php`,
  `PKPPublicationService::unpublish()`, OMP
  `PublicationService::unpublishPublication()` and
  `WorkflowTabHandler.inc.php`.
- Introduced: blaming the line leads to 8ded2f38eb (2024, a refactor from
  `$submission->getDatePublished()`) and then to f8523580bd (2014, the
  date test itself, correct while unpublishing cleared the date). OMP
  ce205d5836 removed `SubmissionService::removeFromCatalog()`, which
  called `setDatePublished(null)` before `updateNotification()`. It was
  merged in `pkp/omp#700` on 2019-09-05, with `pkp/pkp-lib#5025`.
- Upstream: a comment of 2024-11-19 on `pkp/pkp-lib#10618` lists
  "NOTIFICATION_TYPE_VISIT_CATALOG (omp) - after being published, stays
  there forever even if book is unpublished". The issue was closed on
  2024-12-18, and the delegate's line has not changed since.
  `pkp/pkp-lib#10636` (the "Awaiting approval." notice missing before the
  first publish, fixed on submission) is a different fault. Searched
  pkp/pkp-lib, pkp/omp and pkp/ui-library on 2026-10-03 for unpublish
  with "Catalog Management", "Awaiting approval", the delegate's name,
  `VISIT_CATALOG` and `FORMAT_NEEDS_APPROVED_SUBMISSION`.
- Unverified: the 3.4 and 3.3 screens.
