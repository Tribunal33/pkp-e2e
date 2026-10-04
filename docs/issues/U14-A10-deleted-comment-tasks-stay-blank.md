# A comment deleted with its article or its writer's merged account leaves blank, dead rows in every moderator's Tasks

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS (a press and a preprint server have no comment box)
  - 3.5: none (code; no reader comments)
  - 3.4: none (code; no reader comments)
  - 3.3: none (code; no reader comments)
- **Introduced** PR `pkp/pkp-lib#12258` for `pkp/pkp-lib#12205` · [85afa0b822](https://github.com/pkp/pkp-lib/commit/85afa0b8226abb435aafb0fc5ff8c60eb19964f5) · 2026-01-30 · Taslan A. Graham (taslangraham)
- **Upstream** none open (2026-10-04); `pkp/pkp-lib#12401` (closed) fixed the same symptom for a comment deleted on its own, not for one that goes with its submission or its writer's account
- **Tracked in** spec U14 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U14-reader-comments-and-moderation.md#a10)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

With public comments on, every new comment raises a task for each
moderator: "A comment has been submitted and is pending review by a
moderator." Every report on a comment raises "A report was submitted
for a comment and requires review by a moderator." Approving a comment
leaves its task in place. After a submission carrying comments
is deleted, or a writer's account is merged into another, these rows
stay in every moderator's Tasks panel with an empty line where the
comment's text was. Pressing a comment's row opens the Comments page
with the dialog "Error" / "The requested resource was not found.";
pressing a report's opens the page with no panel.

The moderators expect the rows to go with the comment, as they do when
a comment is deleted on its own. Each blank row counts in the number on
"Tasks" until the moderator presses it, which marks it read. Each
moderator can clear the rows only by ticking them and pressing "Delete"
in the Tasks window.

## Impact

- **Lost**: none of the moderators' work. Each is left with tasks that
  point at nothing, and nobody is told why the rows are blank. After a
  merge, the merged reader's comments and reports are gone from the
  journal too.
- **Who**: every Journal Manager and Journal editor of a journal with
  public comments on, after a submission that carried comments is
  deleted or after "Merge user" on a reader who wrote a comment or a
  report.
- **Way round**: none that stops the rows; once they are there, each
  moderator clears them by hand. They never leave on their own.

Low: the moderation is done and the blank rows only mislead; each
moderator must clear them by hand.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main` (journal `publicknowledge`).
  Public comments are off in it; step 1 turns them on.
- Nothing else: `dbarnes` (Journal editor, assigned to every submission)
  moderates, and the readers `ccorino`, `ckwantes` and `dphillips` write
  and report.

Turn comments on, publish an article that can later be deleted:

1. Sign in as `dbarnes`. Settings › Website › "Content" › "Comments":
   tick "Enable Public Comments", press "Save".
2. Open submission 4, "Computer Skill Requirements for New and Existing
   Teachers: Implications for Policy and Practice" (Submission stage).
   Publication › "Title & Abstract" › "Schedule For Publication". In
   "Review Publishing Details" choose "Version of Record" as the
   publication stage, a major revision, and "Don't Assign To An Issue";
   press "Confirm", then "Publish".

A comment and a report on it:

3. Sign in as `ccorino`. Open the article's page
   (`/index.php/publicknowledge/article/view/4`), type "u14b comment on
   submission 4" in the comment box, press "Submit".
4. Sign in as `dbarnes`. Content › Comments: the row's "…" › "View
   Comment" › "Approve Comment".
5. Sign in as `ckwantes`. On the article's page, the comment's "…" ›
   "Report", reason "u14b report on submission 4", "Submit".
6. Sign in as `dbarnes`. Press "Tasks" in the header: one row reads "A
   comment has been submitted and is pending review by a moderator."
   over the comment's text, one "A report was submitted for a comment
   and requires review by a moderator." over the reason.

Delete the submission:

7. Open submission 4 › Publication › "Title & Abstract" › "Unpublish",
   and "Unpublish" in the dialog.
8. Submission stage › "Decline Submission", and record the decision.
9. "Delete", and "Confirm" in the dialog.
10. Content › Comments: the comment is on none of the four tabs.
11. Press "Tasks".
12. Press the "pending review" row.
13. Press "Tasks" again and press the "requires review" row.

Merge the writer of a comment away:

14. Sign in as `dphillips`. Open submission 17's page, "Antimicrobial,
    heavy metal resistance and plasmid profile of coliforms isolated from
    nosocomial infections in a hospital in Isfahan, Iran"
    (`/index.php/publicknowledge/article/view/17`), type "u14b comment by
    dphillips", press "Submit".
15. Sign in as `dbarnes`. "Tasks" shows a "pending review" row over that
    text.
16. Settings › Users & Roles › Users › `dphillips`'s "…" › "Merge user":
    on `amwandenga`'s row, "Merge into this User", then "OK".
17. Content › Comments: the comment is on none of the four tabs.
18. Press "Tasks".

**Expected**: after step 9 the two rows about the deleted comment and
its report leave every moderator's Tasks, as they do when the comment is
deleted on its own from the Comments page; after step 16 the row about
dphillips's comment leaves too.

**Observed**: at step 11 both rows are still there, unread, each with
its sentence and an empty line under it. "Tasks" reads 4: the two blank
rows and the two unread tasks `dbarnes` has in the dataset. Step 12
opens
`/index.php/publicknowledge/en/management/settings/userComments?commentId=1`;
the page's request for the comment (`GET …/api/v1/comments/1`) answers
404, and the page shows the dialog:

```
Error
The requested resource was not found.
OK
```

Step 13 opens `…/userComments?reportId=1&commentId=` with the list
reading "No Items" and no panel. At step 18 the row about dphillips's
comment is still there, blank, beside the two from step 11.

## Cause

A comment's moderation tasks are notifications that point at it only by
`assoc_type` and `assoc_id`: `UserCommentController::submit()` and
`submitReport()` call `notifyModerators()` with
`Application::ASSOC_TYPE_COMMENT` and the comment's id, or
`ASSOC_TYPE_COMMENT_REPORT` and the report's id (lib/pkp
`api/v1/comments/UserCommentController.php`). Nothing in the database
links those rows to the comment.

The comment rows, by contrast, go by database cascade.
`UserCommentsMigration` gives `user_comments.publication_id` and
`user_comments.user_id` `onDelete('cascade')`, and
`user_comment_reports.user_comment_id` and `user_comment_reports.user_id`
the same. So `PKP\publication\DAO::deleteById()` (reached from
`PKP\submission\DAO::deleteById()` through `Repo::publication()->delete()`
when a submission is deleted) and `PKP\user\Repository::delete()` take the
comments and reports with them without any PHP code seeing them.

A merge reaches that deletion too. `Repository::mergeUsers()` hands the
merged account's submission files, notes, decisions, review
assignments, editorial comments, notifications, roles and stage
assignments to the chosen account, but has no line for reader comments
or their reports, so they go by cascade when it deletes the merged
account at the end. Whether a merge should hand them over instead is a
separate question this report leaves out; the fix below is needed
either way, since any deletion of an account takes its comments.

Only the API's deletion routes in `UserCommentController` delete the
notifications, so a comment or report that leaves any other way leaves
its tasks. The Tasks grid then finds nothing to print:
`NotificationsGridCellProvider` returns `null` for the title when
`UserComment::find()` or `UserCommentReport::find()` comes back empty.
The comment row's link still carries the comment's id, so the Comments
page asks for a comment that no longer exists. The report row's link
has an empty `commentId=`: `PKPNotificationManager::getNotificationUrl()`
reads `$report->userCommentId` from a `UserCommentReport::find()` that
returned null (by code).

PR `pkp/pkp-lib#12407` (for `pkp/pkp-lib#12401`) added the deletion to
those routes only.

Reach:

- "Merge user" on a reader who reported someone else's comment: the
  report goes by `user_comment_reports.user_id` and leaves its
  "requires review" row (checked in the code).
- Deleting an unpublished version through the REST API
  (`DELETE …/submissions/{id}/publications/{publicationId}`, which no
  screen sends): the same `PKP\publication\DAO::deleteById()` (checked
  in the code).
- The scheduled removal of unvalidated accounts goes through
  `user\Repository::delete()` too, but only for accounts that never
  signed in, so they hold no comments (checked in the code).
- Deleting a journal: `notifications.context_id` cascades, so its tasks
  go with it (checked in the code).
- `deleteReports()` (`DELETE …/comments/{id}/reports`, which no screen
  sends) passes `withReportIds([$reportIds])`, an array in an array,
  which Laravel's `whereIn()` refuses when the comment has no report or
  more than one, before the notification query runs (by code, not
  driven; outside this fix).

## Proposed fix

Delete the tasks in the two places that delete comments by cascade,
before the rows go, through one helper on the comment model that the API
route uses too ([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/deleted-comment-tasks-stay-blank/fix.diff),
lib/pkp only):

- `UserComment::deleteNotifications(array $commentIds, array $reportIds = [])`
  deletes the `ASSOC_TYPE_COMMENT` notifications of the comments and the
  `ASSOC_TYPE_COMMENT_REPORT` ones of their reports and of any other
  reports given.
- `PKP\publication\DAO::deleteById()` calls it with the publication's
  comment ids at its start, before `parent::deleteById()`, since the
  cascade removes the comments there. (Its existing
  `Notification::withAssoc(ASSOC_TYPE_PUBLICATION, …)->delete()` runs
  after `parent::deleteById()`; the new call cannot.)
- `PKP\user\Repository::delete()` calls it with the user's comment ids and
  the user's own report ids before `$this->dao->delete($user)`.
- `UserCommentController::delete()` calls it in place of its two
  queries, so a comment's tasks are deleted by one rule.

```php
// PKP\publication\DAO::deleteById()
UserComment::deleteNotifications(
    UserComment::withPublicationIds([$publicationId])->pluck('user_comment_id')->all()
);
$affectedRows = parent::deleteById($publicationId);
```

This follows how the code base clears tasks for rows it deletes in bulk:
`editorialTask\Repository::deleteBySubmissionId()` deletes the
`ASSOC_TYPE_QUERY` notifications of the tasks it removes, and
`PKP\submission\DAO::deleteById()` and `PKP\publication\DAO::deleteById()`
delete the notifications about the submission and the publication. The
helper lives on
the model rather than on `Repo::userComment()`, whose constructor reads
the request's context, which a site-level or command-line deletion does
not have.

Tried: with the diff applied, the steps above end with neither blank row
at step 11 nor at step 18 ("Tasks" back to 2). With and without it,
when two readers comment on submission 17 and one is merged away, the
other's row keeps its text and still opens that comment's panel. With
the diff applied, the moderator's "Delete Comment" in that panel still
clears the row.

**Alternatives**:

- A `deleting` event on the `UserComment` model: Eloquent events do not
  fire for a database cascade, so it would not reach either path on its
  own.
- Deleting the comments one by one through Eloquent before the
  publication or the user goes: the same reach, with a query per comment
  and a second deletion rule beside the cascade.
- Skipping rows whose comment is gone in `NotificationsGridCellProvider`:
  hides the rows but leaves them in the count on "Tasks" and in the
  table. A workaround.

**What goes with it**:

- No data repair: reader comments are not in any release yet, so only
  test and development installs hold such rows.
- The guard: a unit test in lib/pkp that deletes a publication and a
  user carrying a comment and a report and finds no `ASSOC_TYPE_COMMENT`
  or `ASSOC_TYPE_COMMENT_REPORT` notification left, and the e2e scenarios
  for deletion and merging in the spec (U14 scenarios 12 and 13), which
  then expect no row.

Medium: `pkp/pkp-lib#12401` fixed only the comment's own deletion
route, while the cascade runs in the shared publication and user
deletions, so the fix spans four files and needs a unit test.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/deleted-comment-tasks-stay-blank/walk.js)
  (helpers in `lib.js` beside it) takes steps 1–18 on an OJS install
  loaded from the default dataset (pkp/datasets `1a5552c`, 2026-10-04,
  the `pgsql` dump; the walks ran on PostgreSQL):
  `node bin/probe.js ojs shared/playwright/checks/issues/deleted-comment-tasks-stay-blank/walk.js`.
  Its `neighbour` argument takes the two-reader check under Proposed
  fix, and `wayround` ticks a blank row and presses "Delete" (the row
  goes, "Tasks" from 3 to 2). The fix was tried by applying `fix.diff`
  to the OJS checkout for the walk and the neighbour check, and
  reverting it for the neighbour check again.
- Tips: OJS `ff004d0973` (lib/pkp `987776cd04`, lib/ui-library
  `64d67363`), OMP `3b0ecf794` and OPS `c8af945bb7` (both lib/pkp
  `3dc90c81a6`, lib/ui-library `280f98c5`); stable-3_5_0 OJS
  `c1cee76b95` (lib/pkp `771474347e`), OMP `9c5e24246`, OPS `38b61882d3`
  (lib/pkp `cf3f984335`); stable-3_4_0 OJS `d68934d0d1`, OMP `0aec65441`,
  OPS `acd8ae704b`, lib/pkp `767353f4fe`; stable-3_3_0 OJS `ac77c9fb35`,
  OMP `8e72fc883`, OPS `c5532e2161`, lib/pkp `ac3fa73402`.
- Code reads on `main`: `UserCommentController` (`submit()`,
  `submitReport()`, `delete()`, `deleteReport()`, `deleteReports()`),
  `UserCommentsMigration`, `PKP\publication\DAO::deleteById()`,
  `PKP\submission\DAO::deleteById()`, `PKP\user\Repository::delete()` and
  `mergeUsers()`, `PKPNotificationManager::getNotificationUrl()`, `user\DAO::deleteUnvalidatedExpiredUsers()`,
  `NotificationsGridCellProvider` and the `notifications` table in
  `CommonMigration`. These files are the same in OMP's and OPS's lib/pkp
  (`3dc90c81a6`) as in OJS's (`987776cd04`).
- Not driven: OMP and OPS, where no screen writes a comment (OJS's
  comment box is in `templates/frontend/objects/article_details.tpl`;
  the two apps' templates hold none), so the steps cannot be taken; 3.5, 3.4 and 3.3, which have no reader comments
  (no `api/v1/comments` in lib/pkp on `stable-3_5_0`, `stable-3_4_0` or
  `stable-3_3_0`).
- Introduced: `git blame` on the `notifyModerators()` calls in
  `UserCommentController::submit()` and `submitReport()` gives
  `85afa0b822` (PR `pkp/pkp-lib#12258`); the route-only deletion is
  `677b737d20` (PR `pkp/pkp-lib#12407`, 2026-03-04), corrected by
  `26ae6431b5` (PR `pkp/pkp-lib#13402`). The `user_id` cascades date
  from `3aa127313b` (PR `pkp/pkp-lib#11410`, 2025-06-18), so the merge
  path left rows from the day the tasks came; the `publication_id`
  cascade came with `a67e84494e` (PR `pkp/pkp-lib#12779` for
  `pkp/pkp-lib#12772`, 2026-05-20). Before it, a deleted submission's
  comments stayed in the table with their tasks.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library on
  2026-10-04 (issues and PRs, open and closed) by the symptom's words
  and by `ASSOC_TYPE_COMMENT` and `notifyModerators`.
- Unverified: the merged reporter's row (Cause, reach) was read in the
  code, not walked on the dataset.
