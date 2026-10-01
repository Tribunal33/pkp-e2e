# Unpublishing an older issue leaves the journal with no current issue

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: none (code)
- **Introduced** `pkp/ojs#3174` for `pkp/pkp-lib#7247` · [988946e5a8](https://github.com/pkp/ojs/commit/988946e5a895c2f58f89de64c31b653dd0dd05f0) · 2021-09-01 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U50 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U50-issues.md#a2)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

An editor uses "Unpublish Issue" on an older back issue, one that is
not the journal's current issue. Unpublishing clears the journal's
current issue whichever issue is unpublished, so the journal is left
with no current issue at all. Readers who follow "Current" get "No
Current Issue" and "This journal has not published any issues.", and
the home page loses its "Current Issue" part. "Archives" still lists
the newer issue.

The journal stays without a current issue until a manager sets one
again by hand, or publishes another issue.

## Impact

- **Lost:** the "Current" page and the home page's "Current Issue"
  part, and a web feed the journal has set to show the current issue
  (it goes empty). The sidebar blocks and OAI-PMH do not use the current
  issue and are unchanged. No issue or article is lost, and no one is
  told.
- **Who:** every reader of the journal, after a manager or editor
  unpublishes any issue other than the current one (to correct it, or
  to take it down). Unpublishing is an occasional action, not a weekly
  one.
- **Way round:** on screen, once someone notices: "Back Issues" › the
  row of the issue that was current before the unpublish (not
  necessarily the newest) › "Current Issue" › "OK".

Medium: it follows only an occasional action and a manager can undo it
on screen. It would be high if journals unpublished back issues
routinely.

## Steps to reproduce

Preconditions: PKP's default test dataset for OJS `main`. The journal
`publicknowledge` has "Vol. 1 No. 2 (2014)" (published, current) and
"Vol. 2 No. 1 (2015)" (unpublished, under "Future Issues"). Nothing
else is needed.

1. Sign in as `dbarnes`.
2. Issues › "Future Issues" › the "Vol. 2 No. 1 (2015)" row's arrow ›
   "Publish Issue". The window asks "Are you sure you want to publish
   the new issue?". Untick "Send an email about this to all registered
   users." and press "OK". The issue moves to "Back Issues".
3. Open the journal's "Current" link
   (`/index.php/publicknowledge/issue/current`). It shows "Vol. 2 No. 1
   (2015)": publishing made it current.
4. Issues › "Back Issues" › the "Vol. 1 No. 2 (2014)" row's arrow ›
   "Unpublish Issue". The window asks "Are you sure you want to
   unpublish this published issue?". Press "OK".
5. Open "Current" again, then the journal's home page, then "Archives".
6. Issues › "Back Issues": open the "Vol. 2 No. 1 (2015)" row's arrow.

**Expected:** step 5: "Current" still shows "Vol. 2 No. 1 (2015)", and
the home page still shows it under "Current Issue". Step 6: the row
does not offer "Current Issue", since the issue is current.

**Observed:** step 5: "Current" answers `200` with a page headed "No
Current Issue" that reads "This journal has not published any issues."
The home page has no "Current Issue" part. "Archives" lists "Vol. 2
No. 1 (2015)". Step 6: the row offers "Edit", "View", "Unpublish
Issue", "Current Issue" and "Delete". No request failed and no page
script failed.

Control: unpublishing the current issue itself (step 4 on "Vol. 2 No. 1
(2015)" instead) also leaves no current issue. That is the intended
behaviour, and the fix below keeps it.

## Cause

`IssueGridHandler::unpublishIssue()`
(`classes/controllers/grid/issues/IssueGridHandler.php` line 711 on
`main`) clears the journal's current issue on every unpublish:

```php
Repo::issue()->updateCurrent($request->getContext()->getId());
```

`Repository::updateCurrent()` (`classes/issue/Repository.php` lines
210–223), called without an issue, runs
`JournalDAO::removeCurrentIssue()`, which sets
`journals.current_issue_id` to null. Nothing checks whether the issue
being unpublished is the current one, though only the current issue
should stop being current when it is unpublished.

Up to 3.3 the current issue was a flag on each issue (`issues.current`),
and `unpublishIssue()` cleared the flag of the issue it unpublished
(`$issue->setCurrent(0)`), so unpublishing a back issue left the current
issue alone. The Issue EntityDAO refactor
([88aaa6b49f](https://github.com/pkp/ojs/commit/88aaa6b49f818e53145bc0cfa5068542a7b2e1e7),
`pkp/pkp-lib#7129`) moved the current issue to
`journals.current_issue_id`. `unpublishIssue()` still passed
`'current' => 0`, a field the issue no longer had, so unpublishing the
current issue left `journals.current_issue_id` pointing at it.
[988946e5a8](https://github.com/pkp/ojs/commit/988946e5a895c2f58f89de64c31b653dd0dd05f0)
(`pkp/pkp-lib#7247`, "journal/context does not remove previous
`current_issue_id` when an issue is unpublished") fixed that by calling
`updateCurrent()` with no issue, but for every issue unpublished, not
only the current one.

Reach:

- "Unpublish Issue" on any published issue that is not current (walked
  on `main` and 3.5). It is the only path that unpublishes an issue:
  the REST API's issue endpoints only read (code).
- Everything that reads the current issue loses it, all through
  `Repo::issue()->getCurrent()`: the "Current" page
  (`IssueHandler::current()`) and the home page (`IndexHandler`), both
  walked; `GET /api/v1/issues/current`, which answers `404`; the native
  XML export, which marks every issue `current="0"`; and the Web Feed
  plugin's feeds when its settings choose "Display items in current
  published issue." (`WebFeedGatewayPlugin`, `filterByIssueIds([0])`,
  so the feed lists nothing), all (code).
- Not reading it (code): the sidebar blocks under `plugins/blocks`, the
  OAI-PMH classes, and the Web Feed plugin set to "Display a fixed
  number of the most recent publications."
- Not affected: "Delete" on a back issue, which already changes the
  current issue only when it deletes the current one
  (`deleteIssue()`, line 400); publishing and "Current Issue", which
  set the issue they act on.

## Proposed fix

A proposal; the team decides. Clear the current issue only when the
issue being unpublished is the current one
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unpublish-back-issue-clears-current/fix.diff)):

```diff
--- a/classes/controllers/grid/issues/IssueGridHandler.php
+++ b/classes/controllers/grid/issues/IssueGridHandler.php
@@ -708,7 +708,10 @@
         Hook::call('IssueGridHandler::unpublishIssue', [&$issue]);
 
         Repo::issue()->edit($issue, $updateParams);
-        Repo::issue()->updateCurrent($request->getContext()->getId());
+        // Only the current issue stops being current when it is unpublished
+        if ($journal->getData('currentIssueId') == $issue->getId()) {
+            Repo::issue()->updateCurrent($journal->getId());
+        }
 
         Repo::doi()->issueUpdated($issue);
 
```

This is the check `deleteIssue()` in the same class already makes
(`$journal->getData('currentIssueId') == $issue->getId()`), and it
restores the 3.3 behaviour for every issue but the current one.

Tried on `main`: after step 4 "Current" and the home page showed "Vol.
2 No. 1 (2015)", and its row no longer offered "Current Issue".
Unpublishing the current issue itself still left no current issue,
with the fix and without it.

**Alternatives:**

- Move the check into `Repository::updateCurrent()`, so that it clears
  only a given issue. That changes a public repository method that
  plugins may call, for a single caller.
- Also make the newest remaining issue current when the current issue
  is unpublished, as "Delete" does. That changes the intended behaviour
  above, so it is a product decision. `pkp/pkp-lib#2267` (2017) chose
  the "Current Issue" row action for that case instead.

**What goes with it:**

- Journals already caught by this have no current issue stored, which
  the data cannot tell apart from a current issue unpublished on
  purpose. So no upgrade migration is proposed: those journals set
  their current issue again by hand.
- The diff applies as written to `stable-3_5_0` (checked with `patch`),
  and the same lines are in `stable-3_4_0`. No API, hook or other
  screen changes.
- Regression test: an e2e check that unpublishing a back issue keeps
  the current issue, and that unpublishing the current issue clears it
  (the kept script below does both). The handler has no unit tests to
  extend.

Small: one condition in one handler, following the pattern beside it,
plus a test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unpublish-back-issue-clears-current/walk.js),
  run on a fresh load of the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/unpublish-back-issue-clears-current/walk.js [current]`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). With no argument
  it takes steps 1–6. With `current` it unpublishes "Vol. 2 No. 1
  (2015)" in step 4 instead (the control).
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/unpublish-back-issue-clears-current/fix.diff ojs`,
  the script with and without `current`, then
  `node bin/try-fix.js revert ojs`. `current` was also run without the
  fix.
- Driven on PostgreSQL, on the default dataset from pkp/datasets
  38ab955 (2026-09-30): steps 1–6 on `main` and `stable-3_5_0`, with
  the same result. The fault does not depend on the database.
- Tips:
  - `main`: OJS
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    with pkp-lib
    [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12).
  - `stable-3_5_0`: OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17)
    with pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1).
  - `stable-3_4_0`: OJS
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833).
  - `stable-3_3_0`: OJS
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144).
- Code reads:
  - 3.5: `IssueGridHandler.php` line 704 and `Repository::updateCurrent()`
    are the same as on `main`.
  - 3.4: `IssueGridHandler.php` line 693 makes the same call, and
    `Repository::updateCurrent()` (lines 227–240) is the same;
    988946e5a8 is on the branch.
  - 3.3: `unpublishIssue()` (`classes/controllers/grid/issues/IssueGridHandler.inc.php`
    lines 545–552) clears only the unpublished issue's own `current`
    flag. `IssueDAO::getCurrent()` reads `issues.current = 1`, so
    another current issue stays current.
- Introduced: `git blame` on line 711 gives 988946e5a8, which added the
  call.
- Upstream, close but different:
  `pkp/pkp-lib#2267` (closed 2017; the current issue itself
  unpublished, answered with the "Current Issue" row action),
  `pkp/pkp-lib#12264` (closed; "Delete" never set a new current issue,
  fixed on `main`), `pkp/pkp-lib#13093` and `pkp/pkp-lib#11951`
  (articles' state and dates after unpublishing).
- Not driven: OJS 3.4 and 3.3 (code).
