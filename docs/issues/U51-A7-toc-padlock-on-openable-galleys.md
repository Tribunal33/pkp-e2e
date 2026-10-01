# Issue page shows padlocks to editors, authors and lapsed subscribers on galleys they can open

- **Severity** low
- **Effort** small
- **Kind** regression (OJS 2.x's issue page unlocked these galleys from each article's own access; the 3.0 reader interface stopped reading it)
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** `pkp/ojs#554` · [7b726d89f6](https://github.com/pkp/ojs/commit/7b726d89f6f2db9e4a6cc5aa030bab872336dd44) · 2015-08-05 · Alec Smecher (asmecher), merging Nate Wright's (NateWr) new reader interface; for the editorial roles also [687f30bda5](https://github.com/pkp/ojs/commit/687f30bda504fb092c951d58043869eaeebd66bc) · 2016-07-22 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U51 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a7)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On a journal that requires subscriptions, the issue's table of contents
shows the padlock and "Requires Subscription" on article and "Full
Issue" galleys that the signed-in user can open. That happens to three
groups when they hold no current subscription:

- Journal Managers and Editors, Section Editors, assistants such as
  Copyeditors, and Subscription Managers;
- an article's own author, on that article;
- a lapsed subscriber on a journal set to "Partial expiry", the policy
  that lets a subscriber keep the issues and articles published while
  they were subscribed.

Pressing the locked link opens the galley, and the article's own page
shows it unlocked. The journal's home page, which shows the current
issue's table of contents, carries the same padlocks.

## Impact

- **Lost:** no access, only a true label. A lapsed subscriber who
  believes the padlock takes the issues they kept for closed: they skip
  them, or renew or buy the issue again to read what is already theirs.
- **Who:** the three groups above, on any journal that requires
  subscriptions; the lapsed subscribers only where the journal chose
  "Partial expiry" ("Full expiry" is the default).
- **Way round:** press the link anyway, or open the article's own page.

Low: a wrong label on content the user can read. It would be medium if
journals on "Partial expiry" saw readers pay again for issues they keep.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`: journal `publicknowledge`,
  its current issue "Vol. 1 No. 2 (2014)" holding submission 1
  "Signalling Theory Dividends" and submission 17 "Antimicrobial, heavy
  metal resistance and plasmid profile of coliforms isolated from
  nosocomial infections in a hospital in Isfahan, Iran" (author
  `vkarbasizaed`), each with a "PDF" galley.
- The issue and both articles are dated the day the dataset was built
  (2026-09-30 for the walk). The steps need a dataset built before today.
  Dates are the install's: the dataset's configuration sets
  `time_zone = UTC`.
- The users: `dbarnes` (Journal editor), `minoue` (Section editor,
  assigned to neither article), `mfritz` (Copyeditor), `jjanssen` (a
  Reviewer, whom step 8 makes Subscription Manager, since the dataset has
  none), `vkarbasizaed`, `ccorino` (Author and Reader, given an expired
  subscription in step 7) and `ckwantes` (Author and Reader, no
  subscription).
- The steps make the journal and the issue require subscriptions and add
  a "Full Issue" galley, which the dataset lacks.

Setting up, as `dbarnes`:

1. Sign in as `dbarnes`.
2. Settings › Distribution › "Access": choose "The journal will require
   subscriptions to access some or all of its contents." and press "Save".
3. Issues › "Back Issues" › "Vol. 1 No. 2 (2014)" › "Edit" › "Access": set
   "Access status" to "Subscription" and press "Save".
4. Open the same issue again › "Issue Galleys" › "Create Issue Galley":
   type "PDF" as the "Galley Label", upload any PDF file and press "Save".
5. Open the "Payments" page at `/index.php/publicknowledge/payments` (the
   side menu offers it only while payments are enabled, which these steps
   do not need) › "Subscription Policies": type "Subscriptions u51w15" as
   "Name", "subscriptions@mailinator.com" as "Email" and "1 Main Street"
   as "Mailing Address", choose "Partial expiry" and press "Save".
6. "Subscription Types" › "Create New Subscription Type": "Name" "Online
   u51w15", "Cost" 40 "US Dollar", "Format" "Online", "Duration" 12,
   "Individual (users are validated via login)"; press "Save".
7. "Individual Subscriptions" › "Create New Subscription": find `ccorino`
   and choose him, "Subscription Type" "Online u51w15", "Status"
   "Active", "Start Date" 2025-10-01, "End Date" the day the issue was
   published (its page reads "Published: 2026-09-30"); press "Save". The
   subscription then counts to 23:59:59 that day, so it covers the issue
   and its articles and has ended before today.
8. Users & Roles › "Invite to a role": search `jjanssen@mailinator.com`,
   choose "Subscription Manager" with today as the start date, press
   "Save And Continue", then "Invite user to the role".
9. Sign out. Open the "Accept Invitation" link in the email sent to
   `jjanssen@mailinator.com` (on a development install, wherever its
   `[email]` settings deliver mail: a mail catcher or the log) and press
   "Accept And Continue to OJS". No sign-in is asked for.

Reading, as each of `dbarnes`, `minoue`, `mfritz`, `jjanssen`,
`vkarbasizaed`, `ccorino` and `ckwantes` in turn:

10. Sign in.
11. Open "Archives" › "Vol. 1 No. 2 (2014)".
12. Look at the "PDF" under each article and under "Full Issue".
13. Press submission 17's "PDF".
14. Go back to the issue's page and press the "PDF" under "Full Issue".
15. Sign out.

**Expected:** only a "PDF" the user cannot open shows the padlock.

- `dbarnes`, `minoue`, `mfritz`, `jjanssen`: no padlock; steps 13 and 14
  open the PDF viewer.
- `vkarbasizaed`: no padlock on submission 17's "PDF", which opens; the
  padlock on submission 1's "PDF" and on "Full Issue", which is refused.
- `ccorino`: no padlock (the issue and both articles were published on
  or before the subscription's last day); steps 13 and 14 open.
- `ckwantes`: the padlock on every "PDF", and each is refused.

**Observed:** on the issue's page all seven users see the padlock on
all three "PDF" buttons, and a screen reader hears "Requires
Subscription PDF" for each. The home page shows the same padlocks (read
as `dbarnes`). Yet the presses go as Expected says:

- `dbarnes`, `minoue`, `mfritz`, `jjanssen` and `ccorino`: step 13
  opens "View of Antimicrobial, heavy metal resistance and plasmid
  profile of coliforms …" (`/index.php/publicknowledge/en/article/view/17/3`)
  and step 14 opens "View of Vol. 1 No. 2 (2014)"
  (`/index.php/publicknowledge/en/issue/view/1/1`), both in the PDF viewer.
- `vkarbasizaed`: step 13 opens the PDF; step 14 is refused.
- `ckwantes`: both are refused.

A refusal sends a signed-in reader to the "Subscriptions" page, which
redirects to the journal's home page while payments are not enabled, so
these refusals land on the home page (spec U51
[A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a5),
a separate report).

The article's own page (the title pressed) shows submission 17's "PDF"
without a padlock to the first six users, and with it to `ckwantes`.

Control: a signed-out visitor sees the padlock on every "PDF", as
expected.

## Cause

The issue's table of contents takes one access answer for the whole
page, while the galleys are opened on an answer for each article.

`IssueHandler::setupIssueTemplate()` (`pages/issue/IssueHandler.php`,
from line 334; its subscription part at lines 404–458) assigns a single
`hasAccess`. It asks
`IssueAction::subscribedUser($user, $journal)` (line 416) with no issue
and no submission. Without a submission, `subscribedUser()`
(`classes/issue/IssueAction.php` line 104) skips
`Repo::submission()->canPreview()`, which is what lets editorial roles
and the article's authors in. Without an issue or a submission it also
skips the "Partial expiry" check (lines 113–127). So `hasAccess` is
false for everyone but a current subscriber, an institution's address
and a buyer of the issue.

The templates draw the padlock from that one flag.
`templates/frontend/objects/article_summary.tpl` (lines 95–100) passes
`hasAccess` to `galley_link.tpl` for each article's galleys, overriding
it only for an open journal or an open-access article.
`templates/frontend/objects/issue_toc.tpl` (line 119) passes it for the
"Full Issue" galleys. `galley_link.tpl` (lines 56–62) then marks the link
`restricted`, which draws the padlock and the "Requires Subscription"
words.

The answers the galleys are opened on:

- `ArticleHandler::userCanViewGalley()` lets `canPreview()` through
  first: the Journal Manager, Section Editor, assistant and Subscription
  Manager roles, and the article's authors. Then it asks
  `subscribedUser()` with the issue and the submission, which honours
  "Partial expiry". The article page's own `hasAccess`
  (`ArticleHandler::view()`, lines 386–400) asks the same, so the article
  page is right.
- `IssueHandler::userCanViewGalley()` lets
  `IssueAction::allowedIssuePrePublicationAccess()` through (the same
  four roles; not authors), then asks `subscribedUser()` with the issue.

`setupIssueTemplate()` already works out the per-article answer. While
the user has no subscription it fills `articleExpiryPartial` (each
article, through `subscribedUser()` with the submission, so roles,
authors and "Partial expiry") and `issueExpiryPartial` (the issue). But
no template reads them, and the institutional part is computed and then
thrown away (lines 425 and 434 call `subscribedDomain()` without keeping
the result).

No template has read these flags since
[7b726d89f6](https://github.com/pkp/ojs/commit/7b726d89f6f2db9e4a6cc5aa030bab872336dd44)
(2015, `pkp/ojs#554`), the new reader interface. It replaced
`templates/issue/issue.tpl`, whose condition was
`$subscribedUser || $subscribedDomain || ($subscriptionExpiryPartial && $articleExpiryPartial.$articleId)`,
with the page-wide `hasAccess`. Until 2016 the editorial roles were
still covered: `subscribedUser()` without an article checked their roles
first.
[687f30bda5](https://github.com/pkp/ojs/commit/687f30bda504fb092c951d58043869eaeebd66bc)
("Fix null article object issue") guarded that check with the article,
so it no longer runs on the table of contents.

Reach:

- The issue's page (Archives, "Current") and the home page, which shows
  the current issue through the same method: walked.
- Article and "Full Issue" galleys: walked.
- A reader who bought the article ("Purchase Article"): the table of
  contents never asks `hasPaidPurchaseArticle()`, while the article page
  does. Read in the code, not walked.
- An institution's expired subscription under "Partial expiry": the
  thrown-away `subscribedDomain()` results above. Read in the code, not
  walked.
- The "issue published" email's table of contents is built without a
  user (`withSubscriptionDetails` false) and is not affected.
- The home page's list of latest articles (a theme option on `main`;
  the default shows only the current issue) goes through
  `article_summary.tpl`. Shown alone, it has no `hasAccess` at all. Shown
  beside the current issue, it takes that issue's page-wide `hasAccess`
  for every article, including articles of other issues. Read in the
  code, not walked.

## Proposed fix

A proposal; the team decides. Make the templates read the per-article
and per-issue answers that `setupIssueTemplate()` already prepares, and
make those answers match the rules the galleys are opened on. The full
diff for `main` is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/toc-padlock-on-openable-galleys/fix.diff):

```diff
--- a/pages/issue/IssueHandler.php
+++ b/pages/issue/IssueHandler.php
-            $partial = $issueAction->subscribedUser($user, $journal, $issue->getId());
-            if (!$partial) {
-                $issueAction->subscribedDomain($request, $journal, $issue->getId());
-            }
-            $templateMgr->assign('issueExpiryPartial', $partial);
+            $templateMgr->assign(
+                'issueExpiryPartial',
+                $issueAction->allowedIssuePrePublicationAccess($journal, $user) ||
+                $issueAction->subscribedUser($user, $journal, $issue->getId()) ||
+                $issueAction->subscribedDomain($request, $journal, $issue->getId())
+            );
…
-                $partial = $issueAction->subscribedUser($user, $journal, $issue->getId(), $issueSubmission);
-                if (!$partial) {
-                    $issueAction->subscribedDomain($request, $journal, $issue->getId(), $issueSubmission);
-                }
-                $articleExpiryPartial[$issueSubmission->getId()] = $partial;
+                $articleExpiryPartial[$issueSubmission->getId()] =
+                    $issueAction->subscribedUser($user, $journal, $issue->getId(), $issueSubmission) ||
+                    $issueAction->subscribedDomain($request, $journal, $issue->getId(), $issueSubmission) ||
+                    ($user && $completedPaymentDao->hasPaidPurchaseArticle($user->getId(), $issueSubmission->getId()));
--- a/templates/frontend/objects/article_summary.tpl
+++ b/templates/frontend/objects/article_summary.tpl
-					{if … == APP\submission\Submission::ARTICLE_ACCESS_OPEN}
+					{assign var="summaryArticleId" value=$article->getId()}
+					{if … == APP\submission\Submission::ARTICLE_ACCESS_OPEN || ($subscriptionExpiryPartial && $articleExpiryPartial.$summaryArticleId)}
--- a/templates/frontend/objects/issue_toc.tpl
+++ b/templates/frontend/objects/issue_toc.tpl
+			{assign var="hasIssueGalleyAccess" value=$hasAccess}
+			{if $subscriptionExpiryPartial && $issueExpiryPartial}
+				{assign var="hasIssueGalleyAccess" value=1}
+			{/if}
…
-						{include file="frontend/objects/galley_link.tpl" parent=$issue labelledBy="issueTocGalleyLabel" purchaseFee=…
+						{include file="frontend/objects/galley_link.tpl" parent=$issue labelledBy="issueTocGalleyLabel" hasAccess=$hasIssueGalleyAccess purchaseFee=…
```

(the `$completedPaymentDao` line moves above the block, and the templates'
`@uses` comments name the two flags.)

The access decision stays in the handler, as `pkp/pkp-lib#626` (2015)
wanted, and the templates read the flags the old `issue.tpl` read. The
issue flag asks what `IssueHandler::userCanViewGalley()` asks; the
article flag asks what the article page's own padlock
(`ArticleHandler::view()`) asks. The flags are computed only while the
user has no subscription, as today, so subscribers and visitors cost
nothing extra.

Tried on `main`:

- All seven users saw what Expected says: no padlock for the four
  editorial users or `ccorino`; for `vkarbasizaed` only submission 17's
  "PDF" unlocked; `ckwantes` locked everywhere. The presses went as
  before.
- The padlocks that must stay stayed: `vkarbasizaed`'s on submission 1
  and "Full Issue", and every padlock for `ckwantes` and for a signed-out
  visitor, the same with the fix applied as without it.

**Alternatives:**

- Give `subscribedUser()` the role check back when no article is given.
  That fixes the editorial roles only; authors and "Partial expiry"
  still depend on the article.
- Work out the access in the templates. That is what `pkp/pkp-lib#626`
  moved away from.

**Left as they are** (the article page shares both, so the padlock and
the refusal can still disagree there):

- A reader with a current "Association Membership" opens restricted
  galleys while a membership fee is set (both `userCanViewGalley()`
  methods read `dateEndMembership`), but no padlock flag reads it, on the
  table of contents or the article page.
- A reader who bought an article loses the padlock for good, while the
  galley check honours the purchase only while "Purchase Article" or a
  membership fee is set. After the journal drops both, the past buyer
  sees the galley unlocked and is refused.
- The latest-articles list on the home page: with the current issue shown
  beside it, the fix unlocks the current issue's articles there too;
  articles of other issues keep the current issue's page-wide answer.

**What goes with it:**

- Themes that override `article_summary.tpl` or `issue_toc.tpl` keep
  today's padlocks until they read the flags; nothing breaks for them.
  No hook, API or stored data changes.
- Backport: on `stable-3_5_0` `subscribedUser()` and `subscribedDomain()`
  take the article's id rather than the submission, so the handler hunk
  differs;
  [fix-stable-3_5_0.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/toc-padlock-on-openable-galleys/fix-stable-3_5_0.diff)
  applies there with `patch -p1` (not `git apply`, which rejects its
  `article_summary.tpl` hunk). 3.4 and 3.3 have the same code
  in a slightly different shape and need their own diff (the handler
  hunk and the `article_summary.tpl` hunk do not apply as they stand).
- Guard: an e2e scenario in the Subscriptions spec: on a restricted
  issue, an editor, the article's author and a reader under "Partial
  expiry" see no padlock on what they can open, and a reader without a
  subscription keeps it. The handler has no unit tests to extend.

Small: a few lines in one handler and two templates, with no data to
repair.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/toc-padlock-on-openable-galleys/walk.js),
  run on a fresh load of the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/toc-padlock-on-openable-galleys/walk.js [neighbour]`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). `neighbour` walks
  the setup, then only `vkarbasizaed`, `ckwantes` and the signed-out
  visitor.
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/toc-padlock-on-openable-galleys/fix.diff ojs`,
  the script with and without `neighbour`, then
  `node bin/try-fix.js revert ojs`.
- Driven on PostgreSQL, on the default dataset from pkp/datasets 38ab955
  (2026-09-30), on 2026-10-01 after 00:00 UTC: steps 1–15 on `main` and
  on `stable-3_5_0`, which matched. No request failed and no page script
  failed, with or without the fix. The walk set the end date as
  yesterday, which was the publication day.
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
- Code reads (OJS files; pkp-lib's `canPreview()` and
  `_roleCanPreview()` in `classes/submission/Repository.php` were read
  for the role list):
  - 3.5: `IssueHandler.php` lines 404–458, the same as `main` except that
    the article id is passed (line 432).
  - 3.4: `IssueHandler.php` lines 393–420, `IssueAction.php` line 109
    (`canPreview()` only with an article), `article_summary.tpl` lines
    94–99, `issue_toc.tpl` line 119.
  - 3.3: `IssueHandler.inc.php` lines 353–376, `IssueAction.inc.php`
    line 94 (`allowedPrePublicationAccess()` only with an article),
    `article_summary.tpl` lines 88–92, `issue_toc.tpl` line 103.
- Introduced, traced from `IssueHandler.php` line 416 and the templates:
  `git log -S articleExpiryPartial`
  on `templates/` ends at 7b726d89f6 ("Manual rebase of Nate's header_ui
  branch"), which deleted `templates/issue/issue.tpl` and added the
  page-wide `hasAccess`. `git log -G` on the guarded role check in
  `IssueAction` ends at 687f30bda5, which has no pull request.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library for
  "padlock issue table of contents", "lock icon galley editor
  subscription", "partial expiry", "expired subscription lock",
  `setupIssueTemplate`, `articleExpiryPartial`, `issueExpiryPartial`,
  `subscriptionExpiryPartial` and `hasAccess`. Read and not this fault:
  `pkp/pkp-lib#11894` and `pkp/pkp-lib#11874` (closed 2026-03, the
  padlock on open-access issues and for an institution's address, fixed
  on `main`), and `pkp/pkp-lib#626` (closed 2015, the template clean-up
  that preceded the cause).
- Not walked: a bought article, a member, an institution under "Partial
  expiry" and the latest-articles list on the home page (read in the
  code). MySQL not checked: the "Partial expiry" check compares a
  publication date with the subscription's end timestamp, so the cut-off
  could differ there.
