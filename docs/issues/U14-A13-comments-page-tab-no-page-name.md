# On the editorial Comments page, the browser tab shows only the journal's name, not "Comments"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (code; no reader comments)
  - 3.4: none (code; no reader comments)
  - 3.3: none (code; no reader comments)
- **Introduced** `pkp/pkp-lib#11647` for `pkp/pkp-lib#11576` · [1869f217fd](https://github.com/pkp/pkp-lib/commit/1869f217fda0b6f3ce5c86445b181516ce89e552) · 2025-08-28 · Taslan A. Graham (taslangraham)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U14 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U14-reader-comments-and-moderation.md#a13)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A Journal Manager or Journal editor who opens Content › Comments, the
page for moderating readers' comments, gets a browser tab that reads the
journal's name alone ("Journal of Public Knowledge"). Every other page
of the editorial side menu names itself first: "Website Settings |
Journal of Public Knowledge", "Announcements | Journal of Public
Knowledge", "Submissions | Journal of Public Knowledge". (Journal editor
and Press editor are the editor roles with manager rights; on a preprint
server only the manager sees the page.)

The page itself works. Only the browser tab, the browser history and a
bookmark lose the page's name, so a moderator with several browser tabs
of the journal open cannot tell which one is the Comments page. The
browser tab shows the journal's name only whichever of the page's four
lists (All, Approved, Hidden/Needs Approval, Reported) is chosen, and
after a reload.

## Impact

- **Lost**: nothing. The page's name is missing from the browser tab,
  the window title, the history and a bookmark's default name. The page
  title is also what a screen reader announces when the page opens, so
  a screen-reader user hears only the journal's name.
- **Who**: every manager who moderates comments, and every Journal
  editor or Press editor (on a preprint server only the manager), each
  time they open the page. The page is in the side menu only once
  public comments are on.
- **Way round**: the page's own "Comments" heading; among the browser's
  tabs, only by switching to each one.

Low: the page title is incomplete, not wrong, and every task on the page
gets done.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS). The dataset
  leaves public comments off, so step 3 switches them on: the "Comments"
  entry of the side menu shows only then.

Steps:

1. Sign in as `dbarnes` (the dataset's Journal editor, Press editor or
   Preprint Server manager).
2. Open "Settings" › "Website", press the "Content" tab button, then
   "Comments" in the list beside the form.
3. Tick "Enable Public Comments" and press "Save". The page reloads; its
   browser tab reads "Website Settings | Journal of Public Knowledge".
4. In the side menu, open "Content" › "Comments". The page headed
   "Comments" opens (`/index.php/publicknowledge/en/management/settings/userComments`).
5. Read the browser tab.
6. Press the page's tab buttons "Approved", "Hidden/Needs Approval" and
   "Reported" in turn, reading the browser tab after each.
7. Reload the page and read the browser tab.

**Expected**: at steps 5 to 7 the browser tab reads "Comments | Journal
of Public Knowledge" ("Comments | Public Knowledge Press", "Comments |
Public Knowledge Preprint Server"), as the side menu's other pages read
"{page heading} | {journal}".

**Observed**: at steps 5 to 7 the browser tab reads the context's name
alone:

```
Journal of Public Knowledge             (OJS)
Public Knowledge Press                  (OMP)
Public Knowledge Preprint Server        (OPS)
```

Control: at step 3 the same user's browser tab read "Website Settings |
Journal of Public Knowledge" ("… | Public Knowledge Press", "… | Public
Knowledge Preprint Server").

## Cause

The backend layout prints the browser tab's title from the page title
the handler assigns. `lib/pkp/templates/layouts/backend.tpl` line 17 is
`<title>{title|strip_tags value=$pageTitle}</title>`, and
`PKPTemplateManager::smartyTitle()` returns the context's name alone
when `value` is empty, or `"{value} | {context name}"` otherwise
(`common.titleSeparator`).

`ManagementHandler::userComments()` (`lib/pkp/pages/management/ManagementHandler.php`,
lines 628 to 644) assigns only `pageWidth` before displaying
`management/userComments.tpl`, and no `pageTitle`. So the page breaks
the rule every other backend page keeps, that its title names the page
(WCAG 2.4.2 "Page Titled").

The closest sibling is `announcements()`: it shares the
`management/settings/…` address and the exception in `authorize()`, and
it assigns `manager.setup.announcements`. The other methods of the class
that display a page assign their own title too: `context()`,
`website()`, `workflow()`, `distribution()`, `institutions()`, `access()`
and `manageEmails()`. `userComments()` came in with the Comments page
itself in
[1869f217fd](https://github.com/pkp/pkp-lib/commit/1869f217fda0b6f3ce5c86445b181516ce89e552)
("Add backoffice UI for comment moderation").

Nothing on the client sets the title afterwards: the Vue page
(`lib/ui-library/src/pages/userComments/UserCommentsPage.vue`) and its
side panels never touch `document.title`; in ui-library only the
submission wizard does.

Reach: every other backend page the side menu links to assigns a
`pageTitle`: the dashboards, Issues, Announcements, DOIs, the statistics
pages, Subscriptions, every Settings page, Users & Roles, Tools and the
Administration pages (checked in the code: `ManagementHandler`,
`PKPDashboardHandler`, `ManageIssuesHandler`, `PKPDoisHandler`,
`PKPStatsHandler`, `StatsHandler`, `PaymentsHandler`, `PKPToolsHandler`,
`AdminHandler`). The Comments page is the only one without.

## Proposed fix

Assign the page's heading as its title in `userComments()`, as the
sibling methods do, with the locale key the side menu entry and the
page heading already use
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/comments-page-tab-no-page-name/fix.diff)):

```diff
--- a/lib/pkp/pages/management/ManagementHandler.php
+++ b/lib/pkp/pages/management/ManagementHandler.php
@@ -631,6 +631,7 @@
         $templateMgr = TemplateManager::getManager($request);
 
         $templateMgr->assign([
+            'pageTitle' => __('manager.userComment.comments'),
             'pageWidth' => TemplateManager::PAGE_WIDTH_FULL,
         ]);
```

`manager.userComment.comments` ("Comments") is the key each app's
`TemplateManager::setupBackendPage()` (`classes/template/TemplateManager.php`
in OJS, OMP and OPS) gives the side menu entry, and
`UserCommentsPage.vue` its heading, so the browser tab, the menu and the
heading read the same in every language that has the key. The fix is in the
shared handler, so it covers the three apps at once. It changes no API,
no hook and no stored data, and applies to `main` only, since no
released version has the page.

The fix was tried on `main` on the three apps: at steps 5 to 7 the
browser tab read "Comments | Journal of Public Knowledge" ("Comments |
Public Knowledge Press", "Comments | Public Knowledge Preprint Server"),
and Website Settings, Announcements, Users & Roles and
the dashboard kept their own titles with the fix in and out.

**Alternatives**:

- Setting `document.title` in `UserCommentsPage.vue`: a second pattern
  for one page, and the browser tab would read the journal's name until
  the script runs.
- `manager.userComment.userComments` ("User Comments"): it would make
  the browser tab disagree with the heading and the menu entry, which read
  "Comments".

**What goes with it**: a check of the browser tab in the e2e tests of
the Comments page (a **Planned** item in the spec).

This is a proposal; the team decides.

Small: one line in the shared handler, following its siblings.

## Evidence

- The walk, a Playwright script that takes the Steps on an install loaded
  from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/comments-page-tab-no-page-name/walk.js)
  (helper in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/comments-page-tab-no-page-name/lib.js)),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/comments-page-tab-no-page-name/walk.js`.
  It records the browser tab after each step. The neighbour check, run
  with `nb` as the last argument, records the browser tab and heading of
  Website Settings, Announcements, Users & Roles and the editorial
  dashboard; it was run with the fix in and out on 2026-10-04, on the
  `main` tips below.
- Walked 2026-10-04 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [1a5552c](https://github.com/pkp/datasets/commit/1a5552c0b15562474f3ac499495e63031a4c09fb)
  (2026-10-04), on the `main` tips: OJS ff004d0973 (lib/pkp 987776cd04,
  lib/ui-library 64d67363), OMP 3b0ecf794c and OPS c8af945bb7 (lib/pkp
  3dc90c81a6, lib/ui-library 280f98c5).
- 3.5, by code: `stable-3_5_0` OJS c1cee76b95 (lib/pkp 771474347e), OMP
  9c5e24246c and OPS 38b61882d3 (lib/pkp cf3f984335) have no reader
  comments: no `api/v1/comments`, no `userComments` in
  `ManagementHandler.php`, so not walked.
- 3.4 and 3.3, by code: pkp-lib `stable-3_4_0` (767353f4fe) and
  `stable-3_3_0` (ac3fa73402) have no comments API under `api/v1` and
  no `UserComment` code anywhere.
- Introduced: `git blame` of `userComments()` on `main` gives
  1869f217fd for every line; `git log -L` on the method shows no later
  change.
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/ui-library searched by the
  symptom's words and by `userComments`; `pkp/pkp-lib#11789` (open, a
  list of design differences on the comment report and the comment
  panel) does not mention the title.
