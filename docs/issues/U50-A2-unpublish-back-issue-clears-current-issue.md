# Unpublishing an older back issue leaves the journal with no current issue

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: none (code; unpublishing cleared only that issue's own "current" mark)
- **Introduced** `pkp/ojs#3174` for `pkp/pkp-lib#7247` · [988946e5a8](https://github.com/pkp/ojs/commit/988946e5a895c2f58f89de64c31b653dd0dd05f0) · 2021-09-01 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U50 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U50-issues.md#a2)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

A Journal Manager or editor presses "Unpublish Issue" on an older back
issue, one that is not the current issue. The journal then has no current
issue at all: "Current" opens "No Current Issue" with "This journal has not
published any issues.", and the home page loses its "Current Issue" part,
while "Archives" still lists the newer issue that was current.

Nobody is told. The current issue stays missing until a manager presses
"Current Issue" on the right issue's row; that this row now offers the link
is the only hint. Publishing any issue makes that issue current, so only
publishing a newer issue brings back the right one.

## Impact

- **Lost**: the journal's current issue, on the home page and behind the
  header's "Current". No message says so; the Issues page looks as before
  apart from one more "Current Issue" link.
- **Who**: every reader of a journal, after a manager or editor unpublishes
  any issue other than the current one, for example to correct an old
  issue.
- **Way round**: "Current Issue" on the latest issue's row in "Back
  Issues" restores it. Publishing the corrected older issue again does
  not, since it then becomes the current one.

Medium: the public home page and "Current" lose the latest issue silently,
but only after an occasional action, and the Issues page offers the way
back. It would be high if unpublishing back issues were common.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (or `stable-3_5_0`): the journal
  `publicknowledge` has "Vol. 1 No. 2 (2014)" published and current, and
  "Vol. 2 No. 1 (2015)" not yet published.

Steps:

1. Sign in as `dbarnes`.
2. Open Issues (`/index.php/publicknowledge/manageIssues`), "Future
   Issues".
3. On "Vol. 2 No. 1 (2015)", press the row's arrow, then "Publish Issue".
4. Untick "Send an email about this to all registered users." and press
   "OK". "Vol. 2 No. 1 (2015)" is now the current issue: in "Back Issues",
   the "Vol. 1 No. 2 (2014)" row offers "Current Issue", and the "Vol. 2
   No. 1 (2015)" row does not.
5. Open the journal's home page and press "Current" in the header. "Vol. 2
   No. 1 (2015)" opens.
6. Back on Issues › "Back Issues", press the arrow on "Vol. 1 No. 2 (2014)",
   then "Unpublish Issue".
7. "Are you sure you want to unpublish this published issue?" › "OK".
8. In "Back Issues", press the arrow on "Vol. 2 No. 1 (2015)".
9. Open the journal's home page and press "Current".
10. Press "Archives".

**Expected.** At step 8 the row offers "Edit", "View", "Unpublish Issue"
and "Delete", but not "Current Issue", because it is still the current
issue. At step 9 the home page shows "Vol. 2 No. 1 (2015)" under "Current
Issue", and "Current" opens "Vol. 2 No. 1 (2015)".

**Observed.** Step 7's request answered 200, and "Vol. 1 No. 2 (2014)" left
"Back Issues". At step 8 the row offers "Edit", "View", "Unpublish Issue",
"Current Issue", "Delete". At step 9 the home page has no "Current Issue"
part, and "Current" opens `/index.php/publicknowledge/en/issue/current`:

```
No Current Issue
This journal has not published any issues.
```

Step 10 lists "Vol. 2 No. 1 (2015)".

Control: unpublishing the current issue itself also leaves no current
issue, which is the intended behavior ("Current Issue" lets the manager
choose the next one).

## Cause

`IssueGridHandler::unpublishIssue()` (OJS,
`classes/controllers/grid/issues/IssueGridHandler.php`, line 711) calls
`Repo::issue()->updateCurrent($request->getContext()->getId())` with no
issue, whichever issue is being unpublished. `Repository::updateCurrent()`
treats a missing issue as "no current issue" and runs
`JournalDAO::removeCurrentIssue()`, which sets `journals.current_issue_id`
to null. So the journal's current issue is cleared even when it is another
issue that stays published.

Up to 3.3, the current issue was a flag on each issue, and
`unpublishIssue()` cleared only the unpublished issue's own flag
(`$issue->setCurrent(0)`). The Issue EntityDAO refactor of 3.4 moved the
current issue to `journals.current_issue_id`, and 988946e5a8 ("Fix bugs
introduced in Issue EntityDAO refactor") replaced the issue's `'current' =>
0` with the context-wide `updateCurrent()` call, without the check that the
unpublished issue was the current one. `deleteIssue()` in the same class
makes that check: on `main` as `$journal->getData('currentIssueId') ==
$issue->getId()` (since 098cceb01b, `pkp/pkp-lib#12264`), on 3.5 and 3.4
against `Repo::issue()->getCurrent()`.

Reach:

- the header's "Current" (`IssueHandler::current()`) and the home page's
  "Current Issue" part (`IndexHandler`; shown under the default
  `journalContentOrganization`, which includes the issue's table of
  contents): on screen;
- "Back Issues" offers "Current Issue" on the issue that was current
  (`IssueGridRow`, `controllers/grid/issues/IssueGridRow.php`): on screen;
- the REST API's `GET issues/current` answers 404 (code);
- the Native XML export marks no issue `current="1"` (code);
- the Web Feed plugin, when set to list the current issue's articles, lists
  none (code).

## Proposed fix

Clear the current issue only when the issue being unpublished is the
current one, with the check `deleteIssue()` makes on `main`, in
`IssueGridHandler::unpublishIssue()`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unpublish-back-issue-clears-current/fix.diff)):

```diff
         Repo::issue()->edit($issue, $updateParams);
-        Repo::issue()->updateCurrent($request->getContext()->getId());
+        // Only unpublishing the current issue leaves the journal without one;
+        // a back issue's unpublishing keeps the current issue as it is.
+        if ($journal->getData('currentIssueId') == $issue->getId()) {
+            Repo::issue()->updateCurrent($journal->getId());
+        }
```

This restores the 3.3 behavior. `unpublishIssue()` is the only caller of `updateCurrent()` without an issue,
and the only action that unpublishes an issue (the REST API has none), so
one place covers every path.

Tried on `main`: the walk then showed "Vol. 2 No. 1 (2015)" still current
at steps 8 and 9, and the Control in the Steps gave the same result with
the fix in and out.

**Alternatives**

- Make `Repository::updateCurrent()` refuse to clear without knowing which
  issue left: it changes a public repository method other code may call,
  for no gain over the one caller.
- When the current issue itself is unpublished, make the newest remaining
  published issue current, as `deleteIssue()` does when the current issue
  is deleted (`pkp/pkp-lib#12264` fixed only that method's check, the pick
  was already there). That is a product choice: `pkp/pkp-lib#2267` met
  that case with the "Current Issue" action instead. It can come on top of
  this fix.

**What goes with it**

- No API or plugin hook change. Journals that already lost their current
  issue this way keep that state until a manager presses "Current Issue";
  no repair is needed.
- Backport: the same lines are in 3.5 and 3.4, and the diff applies to
  both as written. There `deleteIssue()` compares against
  `Repo::issue()->getCurrent()` instead; the diff's check reads the
  journal's `currentIssueId`, which both branches hold.
- Guard: an e2e scenario on Issues (unpublish a back issue, then "Current"
  still opens the current issue), a **Planned** item in spec U50.

Small: one condition in one handler, following the check `deleteIssue()`
already makes, and an e2e scenario.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unpublish-back-issue-clears-current/walk.js)
  (helpers in `lib.js` beside it), run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js ojs shared/playwright/checks/issues/unpublish-back-issue-clears-current/walk.js`
  on an install freshly loaded from the default dataset (pkp/datasets
  c657990, 2026-10-01, PostgreSQL). The second walk, unpublishing the
  current issue itself (the Control):
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unpublish-back-issue-clears-current/neighbour.js).
- Walked on `main` and `stable-3_5_0`, OJS, with the same observation on
  both. No request answered 500 and no script error was logged. OMP and
  OPS have no issues.
- Tips: `main` OJS b84f8e2e44 (pkp-lib ddd8ab243a); `stable-3_5_0` OJS
  c346ee00a5 (pkp-lib 3bb4450bea); `stable-3_4_0` OJS 75cc2d488b;
  `stable-3_3_0` OJS ac77c9fb35.
- 3.5 (walked) and 3.4 (code): read `classes/controllers/grid/issues/IssueGridHandler.php`
  `unpublishIssue()` and `deleteIssue()`, and `classes/issue/Repository.php`
  `updateCurrent()`.
- 3.3 (code): read `classes/controllers/grid/issues/IssueGridHandler.inc.php`
  `unpublishIssue()`, `classes/issue/IssueDAO.inc.php` `updateObject()` and
  `updateCurrent()`, and `pages/issue/IssueHandler.inc.php` `current()`.
- Introduced: `git blame` on line 711 gives 988946e5a8; its parent still
  had `'current' => 0` in `$updateParams`. The GitHub API names
  `pkp/ojs#3174` (ewhanson) for the commit.
- Upstream: searched pkp/pkp-lib and pkp/ojs, issues and PRs, for
  "unpublish issue current", "no current issue", `updateCurrent` and
  `removeCurrentIssue`. `pkp/pkp-lib#2267` (unpublishing the current issue
  itself, closed in 2017 by adding the "Current Issue" action),
  `pkp/pkp-lib#12264` (deleting the current issue, fixed) and
  `pkp/pkp-lib#13093` (article states after unpublishing and publishing an
  issue again, open) are different faults. The pkp/ui-library search was
  skipped: the fault is server-side.
- Not driven: the REST API, Native XML export and Web Feed effects in
  Cause are read in the code. That publishing the older issue again makes it current
  (Impact) is read in `publishIssue()`, which always calls
  `updateCurrent()` with the published issue.
