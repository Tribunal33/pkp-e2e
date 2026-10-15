# Deleting all of a comment's reports at once fails with a server error unless it has exactly one

- **Severity** low
- **Effort** small
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS; OMP and OPS carry the same code, but no screen there writes a comment to report
  - 3.5: none (no reader comments)
  - 3.4: none (code; no reader comments)
  - 3.3: none (code; no reader comments)
- **Introduced** `pkp/pkp-lib#12407` for `pkp/pkp-lib#12401` · [677b737d20](https://github.com/pkp/pkp-lib/commit/677b737d20a93f279a21e60780a77b8cbcf022a0) · 2026-03-04 · Taslan A. Graham (taslangraham); it replaced a delete by comment that worked, before any release carried comments
- **Upstream** none found (2026-10-15)
- **Tracked in** spec U14 [A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U14-reader-comments-and-moderation.md#a19)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

The comments API request that deletes all of a comment's reports at
once, `DELETE {journal}/api/v1/comments/{id}/reports`, fails with a
server error unless the comment has exactly one report. For a comment
with two or more reports, or with none, nothing changes: the reports
stay in the comment's panel, the comment stays on the Comments page's
"Reported" tab, and every moderator keeps the Tasks panel entry "A
report was submitted for a comment and requires review by a moderator."
for each report.

Nothing in the apps, their bundled plugins or the UI library sends this
request today. The comment panel deletes reports one at a time with
"Delete Report", which works. So the failure reaches only a client of
the API, a third-party plugin, or a future "delete all reports"
control.

## Impact

- **Lost**: nothing. The request changes nothing and answers with a
  server error.
- **Who**: whoever calls the route, which admits the manager role (in
  the default dataset the Journal manager, Journal editor and
  Production editor groups) and the Site Administrator.
- **Way round**: "Delete Report" on each report in the comment panel,
  or the one-report request, `DELETE …/comments/{id}/reports/{reportId}`,
  per report.

Low: no code sends the request today. If a screen or a plugin came to
send it, it would be medium; the one-by-one deletion would keep it from
going higher.

## Steps to reproduce

Steps 8, 10 and 11 are typed in the browser's developer console on the
Comments page, as the Journal Manager, the way an API client would send
them.

Preconditions:

- PKP's default test dataset for OJS `main` (journal `publicknowledge`).
  Public comments are off in it; step 1 turns them on.
- Submission 17, "Antimicrobial, heavy metal resistance and plasmid
  profile of coliforms isolated from nosocomial infections in a
  hospital in Isfahan, Iran", is published.
- `rvaca` (Journal manager) moderates and sends the requests; `ccorino`
  and `ckwantes` write comments; `lchristopher` and `dsokoloff` report.

Steps:

1. Sign in as `rvaca`. Settings › Website › "Content" › "Comments": tick
   "Enable Public Comments", press "Save".
2. Sign in as `ccorino`. Open the article's page
   (`/index.php/publicknowledge/article/view/17`), type "h15h comment A
   by ccorino" in the comment box, press "Submit".
3. Sign in as `ckwantes`. On the same page, type "h15h comment B by
   ckwantes", press "Submit".
4. Sign in as `rvaca`. Content › Comments: for each comment, the row's
   "…" › "View Comment" › "Approve Comment".
5. Sign in as `lchristopher`. On the article's page, comment A's "…" ›
   "Report", reason "h15h reason 1 on A by lchristopher", "Submit".
6. Sign in as `dsokoloff`. On the article's page, comment A's "…" ›
   "Report", reason "h15h reason 2 on A by dsokoloff", "Submit"; then
   comment B's "…" › "Report", reason "h15h reason on B by dsokoloff",
   "Submit".
7. Sign in as `rvaca`. Content › Comments › "Reported" lists both
   comments. Comment A's "…" › "View Comment": its "Reports" table lists
   the two reports, and the address ends `?commentId=1` (comment B's,
   `?commentId=2`). "Tasks" in the header lists three entries "A report
   was submitted for a comment and requires review by a moderator."
8. On the Comments page, in the browser's developer console:
   ```js
   await fetch(pkp.context.apiBaseUrl + 'comments/1/reports', {method: 'DELETE', headers: {'X-Csrf-Token': pkp.currentUser.csrfToken}})
   ```
9. Reload Content › Comments: the "Reported" tab, comment A's "View
   Comment", and "Tasks".
10. The same request for comment B (`comments/2/reports`, one report),
    then comment B's "View Comment" and "Tasks".
11. The same request for comment B again (no reports left).

**Expected**: steps 8, 10 and 11 answer 200. After step 8, comment A is
off the "Reported" tab, its "Reports" table reads "No one has reported
this comment yet", and the two Tasks entries about its reports are
gone; after step 10 the same for comment B. Step 11 has nothing to
delete.

**Observed**: step 8 answers 500:

```
DELETE /index.php/publicknowledge/api/v1/comments/1/reports → 500
{"error":"Nested arrays may not be passed to whereIn method."}
```

The server log:

```
production.ERROR: Nested arrays may not be passed to whereIn method. {"exception":"[object] (InvalidArgumentException(code: 0): Nested arrays may not be passed to whereIn method. at …/lib/pkp/lib/vendor/laravel/framework/src/Illuminate/Database/Query/Builder.php:1390)
[500]: DELETE /index.php/publicknowledge/api/v1/comments/1/reports
```

After it (step 9), comment A is still on "Reported", its "Reports" table
still lists both reports, and "Tasks" still holds the three report
entries. Step 10 answers 200: comment B leaves "Reported", its table
reads "No one has reported this comment yet", and its entry is gone.
Step 11 answers 500 with the same message.

## Cause

`PKP\API\v1\comments\UserCommentController::deleteReports()` passes the
comment's report ids to the `withReportIds` scope wrapped in a second
array
([UserCommentController.php#L429-L430](https://github.com/pkp/pkp-lib/blob/b17fadae59/api/v1/comments/UserCommentController.php#L429-L430)):

```php
$reportIds = $comment->reports()->pluck('user_comment_report_id')->all();
UserCommentReport::withReportIds([$reportIds])->delete();
```

The scope (`UserCommentReport::scopeWithReportIds(array $reportIds)`)
hands its argument to `whereIn('user_comment_report_id', …)`. Laravel's
`Query\Builder::whereIn()` throws `InvalidArgumentException` "Nested
arrays may not be passed to whereIn method." whenever the values and
their one-level flattening differ in count. `[[5]]` and `[5]` both count
one, so a comment with one report passes and the binding is flattened
into a correct query. `[[5, 6]]` counts one against two and throws; the
zero-report case is the same fault, `[[]]` counting one against none.
The throw comes before the report delete and before the notification
delete under it, so nothing is written.

The line came in with
[677b737d20](https://github.com/pkp/pkp-lib/commit/677b737d20a93f279a21e60780a77b8cbcf022a0),
which made the deletes remove the moderators' Tasks entries too. It
replaced `UserCommentReport::withCommentIds([$commentId])->delete()`,
which worked for any number of reports, with a delete by the plucked
ids, so that the reports deleted are exactly those whose entries the
next statement deletes. The sibling `deleteReport()` wraps its single
`$reportId` the same way, `withReportIds([$reportId])`, which is right
there; here the value is already an array.

Reach:

- Callers: none in the three apps, their bundled plugins or ui-library;
  the Comments page sends `DELETE comments/{id}/reports/{reportId}` and
  `DELETE comments/{id}`, the article's page only posts reports.
  Checked in the code (ui-library `userCommentStore.js`,
  `usePkpCommentsStore.js`; the apps' `plugins/` and `js/` grepped).
- The same call shape, an array variable wrapped in another array, has
  no other instance in lib/pkp or the three apps' classes. Checked in
  the code.
- `delete()` (the comment, with its reports' entries) and
  `deleteReport()` (one report) hand `whereIn` flat lists. Checked in
  the code.

## Proposed fix

Pass the ids as they are
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/delete-all-comment-reports-fails/fix.diff),
against `lib/pkp`):

```diff
         $reportIds = $comment->reports()->pluck('user_comment_report_id')->all();
-        UserCommentReport::withReportIds([$reportIds])->delete();
+        UserCommentReport::withReportIds($reportIds)->delete();
```

For a comment with no reports `whereIn` on an empty list matches
nothing, so the request answers 200 and deletes nothing.

Tried on OJS `main`: with the fix, the Steps show Expected. Clearing
comment A, with the fix in and out, leaves comment B's report and its
Tasks entry in place, and leaves both comments' "A comment has been
submitted and is pending review by a moderator." entries.

- **Alternatives**: going back to
  `withCommentIds([$commentId])->delete()` also works, but a report
  filed between the pluck and the delete would be deleted while its
  Tasks entry, missing from the plucked ids, stayed behind.
  `$comment->reports()->delete()` has the same gap.
- **What goes with it**: `pkp/pkp-lib#12972` (open, no PR yet) asks
  for a check that the comment belongs to the request's journal in this
  method and six other comment routes; that check goes before the
  delete and does not touch the `withReportIds` line, so the two fixes
  do not overlap. The guard is a new test at the end of
  `lib/pkp/cypress/tests/integration/publicComments/PublicComments.cy.js`,
  before "should disable public commenting" (comments still on, version
  1.1 unpublished again): `rvaca` approves "Test comment - 1", which no
  later test uses; `eostrom` and `kalkhafaji` each report it on the
  article's page, as "should allow authenticated user to report a
  comment" does; then, as `rvaca` on the Comments page, a `cy.request()`
  of `DELETE comments/{id}/reports` with the page's CSRF token expects
  200 and the comment's panel "No one has reported this comment yet",
  and a second identical request, on the now empty comment, expects 200
  as well.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/delete-all-comment-reports-fails/walk.js)
  (helpers in `lib.js` beside it, through the OJS U14 page objects)
  takes steps 1–11 on an OJS install loaded from the default dataset
  (pkp/datasets `7912e09`, 2026-10-14, the `pgsql` dump; the walks ran
  on PostgreSQL):
  `node bin/probe.js ojs shared/playwright/checks/issues/delete-all-comment-reports-fails/walk.js`;
  the check under Proposed fix is the same command with `neighbour`
  added (steps 1–9, then comment B's panel). Each walk also counts
  `user_comment_reports` and the matching `notifications` rows (assoc
  type `0x0100011`) per comment, and they agree with the screens: before
  step 8, comment A has 2 reports and 6 notification rows (three
  moderator accounts per report), comment B 1 report and 3 rows.
- Tips: OJS `378eced941`, OMP `f4836d4fb`, OPS `2ece50497f` (all three
  lib/pkp `b17fadae59`, lib/ui-library `47b565cb`); stable-3_5_0 OJS
  `ca763c91cd` (lib/pkp `4045d9241e`). 3.4 and 3.3 read at lib/pkp
  `origin/stable-3_4_0` and `origin/stable-3_3_0`.
- Code reads on `main`: `UserCommentController` (`getGroupRoutes()`,
  `delete()`, `deleteReport()`, `deleteReports()`), `UserCommentReport`
  (its `withReportIds` and `withCommentIds` scopes), Laravel 12.65.0
  `Query\Builder::whereIn()` (the count check at line 1390); the route
  group's `roleAuthorizer([ROLE_ID_SITE_ADMIN, ROLE_ID_MANAGER])` and
  the dataset's `user_groups` (role 16: Journal manager, Journal editor,
  Production editor; Section editor and Guest editor are role 17). A
  Section editor's refusal is read in the code, not walked.
- Introduced: `git blame` on line 430 gives `677b737d20`; its diff
  replaces `withCommentIds([$commentId])->delete()` from `3aa127313b`
  (`pkp/pkp-lib#11410`, 2025-06-18).
- 3.5 walked on OJS (the same script with `PKP_E2E_LINE=stable-3_5_0`):
  no "Comments" tab under Settings › Website, and the request answers
  404 `api.404.endpointNotFound`. lib/pkp on `stable-3_5_0`,
  `stable-3_4_0` and `stable-3_3_0` holds no `api/v1/comments` and no
  `userComment` classes.
- Not driven: OMP and OPS on `main`, which have no comment box to write
  the comments with (spec U14, Purpose). MySQL not checked; the throw is
  Laravel's check on the bound values, before the delete query is sent.
- `pkp/pkp-lib#12972` read 2026-10-15: its body lists `DELETE
  /comments/{commentId}/reports` among the seven routes needing a context
  check (one of them listed twice), its "PRs" section reads "TBD", and no PR references it.
