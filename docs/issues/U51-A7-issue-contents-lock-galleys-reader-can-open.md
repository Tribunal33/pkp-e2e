# An issue's table of contents shows a padlock on galleys that editors, the article's author or a former subscriber under "Partial expiry" can open

- **Severity** low
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced**
  - the editorial roles: [687f30bda5](https://github.com/pkp/ojs/commit/687f30bda504fb092c951d58043869eaeebd66bc) (no pull request) · 2016-07-22 · Alec Smecher (asmecher)
  - "Partial expiry": `pkp/ojs#554` (the 3.0 reader interface) · [7b726d89f6](https://github.com/pkp/ojs/commit/7b726d89f6f2db9e4a6cc5aa030bab872336dd44) · 2015-08-05 · Alec Smecher (asmecher)
  - the article's author: not traced; this page never checked authors
- **Upstream** `pkp/pkp-lib#8175` (open), covering the editorial roles only
- **Tracked in** spec U51 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a7)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On a journal that requires subscriptions, an issue's table of contents
shows a padlock on galley links that some users can in fact open, and
a screen reader announces "Requires Subscription" before them:

- Editorial staff without a subscription (journal managers, editors,
  section editors, assistants such as copyeditors, and subscription
  managers) see every article's and the "Full Issue"'s links locked.
- The author of an article sees that article's links locked.
- On a journal set to "Partial expiry", a former subscriber keeps access
  to the issues published while the subscription ran. The table of
  contents still shows those issues' "Full Issue" locked.

Each of them presses the link and the galley opens. The article's own
page shows editors and authors the right state; for the former
subscriber's "Full Issue" no page does.

The editorial roles and "Partial expiry" both showed correctly on this
page in OJS 2.x; the author never did.

## Impact

- **Lost**: nothing; every galley named above opens when pressed.
- **Who**: editorial staff and authors on any subscription journal, and
  former subscribers on a journal set to "Partial expiry". It shows on
  the issue's page and on the current issue on the journal's home page.
- **Way round**: editors and authors can open the article's own page,
  which shows the right state. The former subscriber can only press the
  "Full Issue" link despite the padlock; nothing on screen says it will
  open.

Low: the wrong padlock costs a click, not access. A former subscriber
who trusts it and never presses is the case that would raise it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS, `publicknowledge`. Its
  journal is open access and its issue "Vol. 1 No. 2 (2014)" is
  published with "The Signalling Theory Dividends" (author
  `amwandenga`) and "Antimicrobial, heavy metal resistance and plasmid
  profile of coliforms…", each with a "PDF". Both articles carry the
  dataset's build date as their publication date (2026-10-01 in the
  dataset used here), which is after the subscription step 7 ends.
- The dataset has no payments, no subscription and no "Full Issue"
  galley; steps 1 to 8 set them up.

As `dbarnes`:

1. Settings › Distribution › "Access": choose "The journal will require
   subscriptions to access some or all of its contents." and press
   "Save".
2. Issues › "Back Issues" › "Vol. 1 No. 2 (2014)" › "Edit" › "Access":
   choose "Subscription" under "Access Status" and press "Save".
3. In the same window, "Issue Galleys" › "Create Issue Galley": label
   "PDF", upload a PDF, "Save".
4. Settings › Distribution › "Payments": tick "Enable", choose "US
   Dollar" and "Manual Fee Payment", type "Pay by cheque" in "Manual
   Payment Instructions", "Save". (The subscription screens are on the
   "Payments" page, which the side menu shows only while payments are
   on.)
5. "Payments" › "Subscription Policies": fill "Name", "Email address"
   and "Mailing Address" (required), choose "Partial expiry", "Save".
6. "Subscription Types" › "Create New Subscription Type": "Online
   Year", currency USD, cost 40, format "Online", duration 12,
   "Individual", "Save".
7. "Individual Subscriptions" › "Create New Subscription": find and
   choose `ccorino`, type "Online Year", status "Active", start date
   2025-01-01, end date 2025-12-31, "Save".
8. Issues › "Back Issues" › "Vol. 1 No. 2 (2014)" › "Edit" › "Issue
   Data": type 2025-06-01 in "Date Published", "Save". The issue now
   dates from inside the subscription; its articles keep their own,
   later date.

Reading the issue as each user:

9. Open "Archives", then "Vol. 1 No. 2 (2014)". Look at the two
   articles' "PDF" links and the "Full Issue" "PDF".
10. Press "The Signalling Theory Dividends"'s "PDF", then (back on the
    issue's page) the other article's "PDF", then the "Full Issue" "PDF".
11. Open "The Signalling Theory Dividends" and look at its "PDF" link.
12. Sign out and repeat steps 9 and 10 as `dbuskins` (Section editor),
    `mfritz` (Copyeditor), `amwandenga` (the article's author) and
    `ccorino`.

**Expected.** A link the user can open shows its file icon, without
"Requires Subscription": for `dbarnes`, `dbuskins` and `mfritz` every
link; for `amwandenga` "The Signalling Theory Dividends"'s "PDF"; for
`ccorino` the "Full Issue" "PDF". Links the user cannot open keep the
padlock.

**Observed.** On the issue's page every user sees the same three links:

```
Full Issue:                        PDF   (padlock; screen reader: "Requires Subscription")
The Signalling Theory Dividends:   PDF   (padlock; screen reader: "Requires Subscription")
Antimicrobial, heavy metal …:      PDF   (padlock; screen reader: "Requires Subscription")
```

Pressed, the links open as Expected says:

- `dbarnes`, `dbuskins` and `mfritz`: both articles' PDFs and the "Full
  Issue" open in the PDF viewer ("View of The Signalling Theory
  Dividends", "View of Vol. 1 No. 2 (2014)").
- `amwandenga`: his article's PDF opens; the other article and the
  "Full Issue" lead to "Subscriptions".
- `ccorino`: the "Full Issue" opens; both articles lead to
  "Subscriptions".

At step 11 the article's own page shows `dbarnes` its "PDF" with the
file icon, without the padlock.

Control: `zwoods` (a Reader with no subscription) and a signed-out
visitor see every link locked and are refused each one (`zwoods` to
"Subscriptions", the visitor to the Login page).

## Cause

The table of contents decides one access flag for the whole issue in
`IssueHandler::setupIssueTemplate()` (`pages/issue/IssueHandler.php`,
lines 413 to 449):

```php
$subscribedUser = $issueAction->subscribedUser($user, $journal);
…
'hasAccess' => !$subscriptionRequired ||
    $issue->getAccessStatus() == Issue::ISSUE_ACCESS_OPEN ||
    $subscribedUser || $subscribedDomain ||
    ($user && $completedPaymentDao->hasPaidPurchaseIssue(…))
```

`article_summary.tpl` (line 95) uses that flag for every article's
links, and `issue_toc.tpl` for the "Full Issue" links. It is narrower
than the checks that decide whether a galley opens:

- `IssueAction::subscribedUser()` admits the editorial roles and the
  article's authors through `Repo::submission()->canPreview()` only
  when it is given a submission. It checks "Partial expiry" only when
  it is given an issue or a submission. The table of contents passes
  neither, so the flag asks for a current subscription alone.
- `IssueHandler::userCanViewGalley()` opens a "Full Issue" galley for
  `allowedIssuePrePublicationAccess()` (manager, section editor,
  assistant, subscription manager) and for `subscribedUser($user,
  $journal, $issueId)`, which compares the subscription with the
  issue's publication date under "Partial expiry".
- The article page's `ArticleHandler::view()` passes the article to
  `subscribedUser()`: the roles, the article's authors and the
  article's own date under "Partial expiry", and a paid "Purchase
  Article". `ArticleHandler::userCanViewGalley()` admits the same
  users through its own `canPreview()` call.

`setupIssueTemplate()` also computes `issueExpiryPartial` and
`articleExpiryPartial`, but no template reads them. OJS 2.x's table of
contents read them; the 3.0 reader interface (7b726d89f6) replaced that
template and dropped them. In 687f30bda5 the pre-publication check in
`subscribedUser()` was put behind `$publishedArticle &&` to avoid a null
article. Before that, a call without an article still admitted the
editorial roles, so the table of contents showed them no padlock.

Reach:

- The issue's page (seen in the browser) and the current issue on the journal's home
  page (`IndexHandler` calls `setupIssueTemplate()`; code).
- A Subscription Manager without a subscription: the same path (code;
  the dataset has none).
- A former subscriber under "Partial expiry" whose article is dated
  inside the subscription: that article's links are also locked here
  and open when pressed (code; the dataset's articles carry one later
  date).
- A reader who bought one article: its links stay locked here, since
  the flag counts only an issue purchase (code; no payment completes on
  a test install).
- A reader with a paid "Association Membership": both download handlers
  open the galleys while a membership fee is set (`dateEndMembership`),
  but neither this page nor the article page checks it (code).

## Proposed fix

Decide the table of contents' links with the checks the galleys
themselves use: the issue's check for the "Full Issue", the article
page's check for each article
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-contents-lock-galleys-reader-can-open/fix.diff)):

- `pages/issue/IssueHandler.php`, `setupIssueTemplate()`: `hasAccess`
  adds `allowedIssuePrePublicationAccess()` and passes the issue to
  `subscribedUser()`, as `userCanViewGalley()` does. On a restricted
  issue a new `articleAccess` map gives each article `true` when any of
  these holds, as in `ArticleHandler::view()`: `subscribedUser()` or
  `subscribedDomain()` with the submission, a paid issue, a paid
  article. The map replaces the unread partial-expiry block.
- `templates/frontend/objects/article_summary.tpl`: an article's links
  use `$articleAccess` for that article when it is set, and `$hasAccess`
  otherwise.

```php
'hasAccess' => !$subscriptionRequired ||
    $issue->getAccessStatus() == Issue::ISSUE_ACCESS_OPEN ||
    $issueAction->allowedIssuePrePublicationAccess($journal, $user) ||
    $issueAction->subscribedUser($user, $journal, $issue->getId()) ||
    $issueAction->subscribedDomain($request, $journal, $issue->getId()) ||
    $paidIssue
…
$articleAccess[$issueSubmission->getId()] = $paidIssue ||
    $issueAction->subscribedUser($user, $journal, $issue->getId(), $issueSubmission) ||
    $issueAction->subscribedDomain($request, $journal, $issue->getId(), $issueSubmission) ||
    ($user && $completedPaymentDao->hasPaidPurchaseArticle($user->getId(), $issueSubmission->getId()));
```

Tried on `main`: each user's links matched Expected, and `zwoods` and
the visitor were locked out as before.

**Alternatives**

- Let `subscribedUser()` admit the roles again without a submission:
  fixes the editors, not the author or "Partial expiry", and changes a
  method other callers and the `IssueAction::subscribedUser` hook rely
  on.
- Read `articleExpiryPartial` in the template, as 2.x did: covers
  "Partial expiry" only.

**What goes with it**

- Cost: the map runs on every view of a restricted issue, by
  subscribers too, and asks per article one `canPreview()` (a role
  query and a stage-assignment query) and one subscription query. The
  old block ran only for users with neither a current nor an
  institutional subscription. Skipping the map when `subscribedUser()`
  without an issue or `subscribedDomain()` already holds would restore
  that; the tried diff does not.
- Members stay locked on this page, as on the article page. Adding the
  `dateEndMembership` check to both while a membership fee is set would
  cover them; the tried diff does not.
- "Latest Publications" on the home page (main only) includes the same
  template for articles of any issue. When the home page also shows the
  current issue, those articles get the current issue's flag, which the
  fix widens by the roles and that issue's "Partial expiry" date; when
  it does not, the flag is unset and every link there is locked, as
  today. That list needs its own per-article check; it is left out.
  Search results hide galleys, so they are not touched.
- `subscriptionExpiryPartial`, `issueExpiryPartial` and
  `articleExpiryPartial` are no longer assigned; a third-party theme
  that read them would read `articleAccess` instead. A theme with its
  own `article_summary.tpl` keeps the padlock until it reads
  `articleAccess`.
- Backport: `fix.diff` does not apply to 3.5 (`git apply --check` fails
  on both files). On 3.5, 3.4 and 3.3 the method is
  `_setupIssueTemplate()`, and `subscribedUser()` / `subscribedDomain()`
  take an article ID, not a submission (`main` changed that in
  0131f1cc30, `pkp/pkp-lib#13003`): the map passes
  `$issueSubmission->getId()`. 3.5's `article_summary.tpl` docblock
  differs by one line. 3.3's file is `IssueHandler.inc.php`.
- The test: an end-to-end check that on a restricted issue's page a
  Section Editor without a subscription sees no padlock.

Medium: the change is a few dozen lines in two files, but it adds
per-article queries to a public page, and the team must weigh that
cost.

## Evidence

- The Steps as a Playwright script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-contents-lock-galleys-reader-can-open/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-contents-lock-galleys-reader-can-open/lib.js)),
  run with `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js ojs shared/playwright/checks/issues/issue-contents-lock-galleys-reader-can-open/walk.js`.
  For each user it records every link's text, computed icon and
  screen-reader text on the issue's page, and where the presses land.
- The fix was tried with `node bin/try-fix.js apply shared/playwright/checks/issues/issue-contents-lock-galleys-reader-can-open/fix.diff ojs`
  and the walk on a freshly loaded install, then reverted.
- The Steps were taken in a browser on PostgreSQL, each install freshly loaded from pkp/datasets
  [c657990](https://github.com/pkp/datasets/commit/c657990320435ecbd047603eadb4b4ac863f6dba)
  (2026-10-01): `main` OJS b84f8e2e44 (lib/pkp ddd8ab243a) on
  2026-10-02; `stable-3_5_0` OJS c346ee00a5 (lib/pkp 3bb4450bea) on
  2026-10-01, with the same result at every step.
- How the commits were found: `git log -S 'articleExpiryPartial' --
  templates` ends at 7b726d89f6, which deleted the 2.x
  `templates/issue/issue.tpl` line
  `{if (… || ($subscriptionExpiryPartial && $articleExpiryPartial.$articleId))}`;
  `git log -G` on the guarded pre-publication check in
  `classes/issue/IssueAction.inc.php` ends at 687f30bda5 ("Fix null
  article object issue"). 82a94f79dd (2022, `pkp/pkp-lib#5299`) later
  replaced the check with `canPreview()` under the same guard.
- Related upstream: `pkp/pkp-lib#11874` and `#11894` (closed, fixed for
  3.5) were the institutional-address case of the same flag, and
  `#12291` added the issue to the flag's `subscribedDomain()` call.
- 3.4 and 3.3, by code: OJS `stable-3_4_0` at 75cc2d488b and
  `stable-3_3_0` at ac77c9fb35. `_setupIssueTemplate()` calls
  `subscribedUser($user, $journal)` (3.4 line 393, 3.3 line 353) and
  computes the unread partial-expiry flags; `subscribedUser()` checks
  the roles only with an article (`canPreview()` on 3.4,
  `allowedPrePublicationAccess()` on 3.3); `article_summary.tpl` uses
  `$hasAccess` (3.4 line 94, 3.3 line 88).
