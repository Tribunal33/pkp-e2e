# An article published with no issue opens its galleys to everyone, past the subscription and "registered readers" restrictions

- **Severity** high
- **Effort** medium
- **Kind** defect
- **Security** unreleased
- **Affects**
  - main: OJS
  - 3.5: none (publishing needs an issue)
  - 3.4: none (code; publishing needs an issue)
  - 3.3: none (code; publishing needs an issue)
- **Introduced** `pkp/ojs#4875` for `pkp/pkp-lib#9295` · [234fdf6586](https://github.com/pkp/ojs/commit/234fdf6586b5f2e92a166e7f5326fd40cbe35840) · 2025-06-10 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-05)
- **Tracked in** spec U51 [A30](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a30)
- **Checked** 2026-10-05, each branch's tip (the commits in Evidence)

## Summary

An editor publishes an article with "Don't Assign To An Issue". On a
journal that requires subscriptions, a signed-out visitor pressing its
galley should be sent to the Login page, and a signed-in Reader without a
subscription should be turned away from the file, as for an article in a
restricted issue. With "Users must be registered and log in to view open
access content." ticked, a signed-out visitor should get the Login page.

Instead each of them opens and downloads the full text, and the
article's page shows its galley link without a padlock.

The Journal Manager is not warned. An article's own "Open Access" box
exists only in an issue's table of contents, so an article with no issue
has no access setting at all and is served as open.

## Impact

- **Lost**: the journal's control over who reads its full text.
- **Who**: journals that require subscriptions, or require readers to
  register and log in, and publish articles with "Don't Assign To An
  Issue". Every article published that way is exposed.
- **Way round**: publish into an issue. An article already published
  with no issue can be closed: "Unpublish" it, then "Schedule For
  Publication" with "Assign To Current/Back Issue" and a restricted
  issue.

High: publishing gives a wrong result in an ordinary setup that is not
the default, which with the way round on screen is medium, and the
fault is silent (the article looks published under the journal's
restrictions and is not), which sits it one level above.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (journal `publicknowledge`). As
  loaded, the journal is open access, the "Users must be registered and
  log in to view open access content." box is unticked, and "Vol. 1
  No. 2 (2014)" has the "Access status" "Open access".
- Submission 5, "Genetic transformation of forest trees", is in
  Production with no galley.
- The control is submission 17, "Antimicrobial, heavy metal resistance
  and plasmid profile of coliforms isolated from nosocomial infections in
  a hospital in Isfahan, Iran", published in "Vol. 1 No. 2 (2014)" with a
  "PDF" galley.

Publishing without an issue:

1. Sign in as `dbarnes`. Open submission 5, Publication › "Galleys" ›
   "Add galley": label "PDF", component "Article Text", upload any PDF
   file (here `sxx3-forest-trees.pdf`), save.
2. Publication › "Title & Abstract" › "Publish". In "Review Publishing
   Details" choose "Don't Assign To An Issue", press "Confirm", then
   "Publish". The status reads "Published".

Registered readers only:

3. Settings › Users & Roles › "Site Access Options": under "View Article
   Content" tick "Users must be registered and log in to view open access
   content.", "Save".
4. Sign out. Open `/index.php/publicknowledge/article/view/17` and press
   "PDF": the Login page (control).
5. Open `/index.php/publicknowledge/article/view/5` and press "PDF".

Subscriptions:

6. Sign in as `dbarnes`. Settings › Users & Roles › "Site Access
   Options": untick the box again, "Save".
7. Settings › Distribution › "Access": choose "The journal will require
   subscriptions to access some or all of its contents.", "Save".
8. Issues › "Back Issues" › "Vol. 1 No. 2 (2014)" › "Edit" › "Access":
   "Access status" "Subscription", "Save".
9. Sign out. Open article 17: its link reads "Requires Subscription PDF"
   with a padlock. Press it: the Login page with "Subscription required
   to access item. To verify subscription, log in to journal." (control).
10. Open article 5 and press "PDF".
11. Sign in as `ccorino` (Author and Reader, no subscription). Article
    17's "PDF" sends them to the journal's home page (control; the
    "Subscriptions" page it aims at is not offered while payments are
    off, a separate fault). Then press article 5's "PDF".

**Expected**: in step 5 the Login page, as for article 17. In step 10 a
padlock on the link and the Login page with the subscription message. In
step 11 the home page, as for article 17.

**Observed**: in steps 5, 10 and 11 the PDF viewer opens ("View of
Genetic transformation of forest trees"), and its download link serves
the file `sxx3-forest-trees.pdf`. In step 10 the link reads "PDF", with
no padlock.

Control, readers who may read it (after steps 1, 2, 7 and 8, as
`dbarnes`):

12. Settings › Distribution › "Payments": tick "Enable", currency "US
    Dollar", method "Manual Fee Payment" with any instructions, "Save".
13. "Payments" › "Subscription Types" › "Create New Subscription Type":
    "Name of Type" "Online Year sxx3", cost 40, format "Online", duration
    12 months, "Save".
14. "Payments" › "Individual Subscriptions" › "Create New Subscription":
    user `ccorino`, type "Online Year sxx3", status "Active", from today
    to a year on, "Save".
15. As `ccorino`, press "PDF" on articles 17 and 5; as `dbarnes`, on
    article 5. Each opens the PDF, as it should.

## Cause

`ArticleHandler::userCanViewGalley()` (OJS `pages/article/ArticleHandler.php`,
lines 622–626) is the one gate for an article's galleys: the galley view
(line 280) and the file download (line 519) both ask it. For a published
publication it returns early when the publication has no issue:

```php
if ($this->publication->getData('status') == PKPPublication::STATUS_PUBLISHED) {

    if (!$issue) {
        return true;
    }
```

This skips the two checks below it: the "registered readers" login check
(`restrictArticleAccess`) and the subscription chain (subscriptions by
user, by domain or IP, article and issue purchases, membership).

Before 234fdf6586 the gate's condition was
`$issue && $issue->getPublished() && … STATUS_PUBLISHED`, so an article
with no issue fell to the else branch and was refused to every reader.
The commit added the early return so that such articles could be read
at all, and the return skips the access checks with them. There was no
rule to call instead: `IssueAction::subscriptionRequired()` takes an
issue only.

`ArticleHandler::view()` (lines 384–388) does the same for the landing
page: with no issue `$subscriptionRequired` stays `false`, so
`hasAccess` is true and the galley link is drawn without the padlock.

Reach, beyond the screens walked:

- The OAI-PMH JATS format, `OAIMetadataFormat_JATS::toXml()`, runs its
  subscription check only `if ($issue)`, so the JATS full text of an
  article with no issue goes out over OAI-PMH unchecked. The plugin is
  the `pkp/oaiJats` submodule (`plugins/oaiMetadataFormats/oaiJats`), a
  repository of its own. Code read, not walked.
- `SubmissionSearchResult::newCollection()` sets `issueAvailable` true
  for an article with no issue. No template reads it today. Code read.
- `IssueHandler` (issue galleys, "Full Issue") always has an issue and is
  not touched.

## Proposed fix

Teach the access rule about an article with no issue, and drop the early
return. `IssueAction::subscriptionRequired()` takes a nullable issue:
with no issue, a subscription is required when the journal's publishing
mode is "subscription". That is the default the code base already gives
a new issue: `IssueForm` sets it to "Subscription" on such a journal.

```diff
-    public function subscriptionRequired(Issue $issue, Journal $journal): bool
+    public function subscriptionRequired(?Issue $issue, Journal $journal): bool
     {
-        if ($journal->getId() != $issue->getJournalId()) {
+        if ($issue && $journal->getId() != $issue->getJournalId()) {
…
-        $result = $journal->getData('publishingMode') == Journal::PUBLISHING_MODE_SUBSCRIPTION &&
-            $issue->getAccessStatus() != Issue::ISSUE_ACCESS_OPEN && (
-                is_null($issue->getOpenAccessDate()) ||
-                strtotime($issue->getOpenAccessDate()) > time()
-            );
+        $result = $journal->getData('publishingMode') == Journal::PUBLISHING_MODE_SUBSCRIPTION && (
+            !$issue || (
+                $issue->getAccessStatus() != Issue::ISSUE_ACCESS_OPEN && (
+                    is_null($issue->getOpenAccessDate()) ||
+                    strtotime($issue->getOpenAccessDate()) > time()
+                )
+            )
+        );
```

In `ArticleHandler`, `userCanViewGalley()` loses the `if (!$issue) return
true;`. It passes `$issue?->getId()` to `subscribedDomain()` and
`subscribedUser()`, which already accept a null issue ID, and checks the
issue purchase only `if ($issue)`. `view()` calls
`subscriptionRequired($issue, $context)` without its `if ($issue)`. The
whole change is in
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/article-without-issue-galleys-open-to-all/fix.diff).

Tried on `main`: with the fix in, steps 5, 10 and 11 refuse article 5 as
they refuse article 17, and the link shows the padlock. On an open
journal the article stays open to visitors, and steps 12–15 still open
it.

**A question for the team**: on a subscription journal, should an
article published with no issue be restricted or open, and where does an
editor change it? The fix restricts it, following the journal's
publishing mode as a new issue does. Until a control exists, an editor
can open such an article only by putting it into an open issue, since
the article's "Open Access" box is in an issue's table of contents. The
publication's `accessStatus` is writable through the REST API, but no
screen sets it. Our recommendation: keep the restricted default, and add
an "Open Access" choice to "Review Publishing Details" when "Don't Assign
To An Issue" is chosen, writing the existing `accessStatus`. The
"registered readers" half of the fix needs no decision and could land
alone.

**Alternatives**:

- Copy only the login check into the no-issue branch. This closes
  "registered readers only" but leaves the subscription bypass.
- Compute the no-issue rule inside `ArticleHandler`. The screens show the
  same result, but the rule sits in two places of one handler, and the
  OAI JATS format and search results cannot reuse it.

**What goes with it**:

- `pkp/oaiJats`: `toXml()` drops its `if ($issue)` and calls the widened
  method. It is in another repository, so it ships as a PR there plus a
  submodule bump in OJS. It is not in the diff and was not tried. It can
  ship with this fix, or as an issue of its own if the team prefers.
- `SubmissionSearchResult` should call the widened method for an article
  with no issue too, so `issueAvailable` tells the truth when a template
  starts reading it. There is no visible effect today, and it is not in
  the diff.
- The `IssueAction::subscriptionRequired` hook may now receive a null
  issue. No hook user exists in OJS or its bundled plugins; third-party
  plugins must follow. `docs/dev/guide/hooks.rst` is generated from the
  `@hook` tags (`php lib/pkp/tools/getHooks.php -r`). Its parameter list
  is unchanged, so it needs no edit; the nullable issue is written in the
  method's docblock.
- Overlap with the U48 A22 fix: the JATS XML link that gives the article's
  text to visitors whom the galleys refuse
  ([pkp-e2e#923](https://github.com/jardakotesovec/pkp-e2e/issues/923)).
  That fix adds `IssueAction::userCanReadArticle()` and replaces
  `view()`'s `hasAccess` block with it. The two diffs edit the same
  lines of `view()`, so whichever lands second rebases. They also
  disagree in substance: `userCanReadArticle()` returns true when there
  is no issue, which repeats this fault for the JATS XML. Together they
  make one helper: `userCanReadArticle()` calls the widened
  `subscriptionRequired($issue, $journal)` in place of its
  `!$issue ||`, passes `$issue?->getId()`, and checks the issue purchase
  only when there is an issue. `view()`, the JATS download and the
  subscription part of `userCanViewGalley()` then share one rule.
- No stored data changes: access is computed on each request.
- A unit test of `subscriptionRequired()` with a null issue in both
  publishing modes, and the e2e scenario in spec U51 (Rules 7 and 13).

Medium: two files in OJS and one in `pkp/oaiJats` (two repos), tried in
OJS, with a hook contract that widens. The open-access control the
question above may call for is not counted.

## Evidence

- Kept script:
  `shared/playwright/checks/issues/article-without-issue-galleys-open-to-all/walk.js`
  (helpers in `lib.js`), run as
  `PROBE_FEATURE=<f> PROBE_AGENT=<a> node bin/probe.js ojs shared/playwright/checks/issues/article-without-issue-galleys-open-to-all/walk.js [neighbour|wayround]`
  on an install freshly loaded from the default dataset. The plain run
  is steps 1–11, `neighbour` steps 1–2, 7–8 and 12–15 (and article 5 on
  the open journal), `wayround` the Impact's way round.
- Walked on OJS `main` 2026-10-05: ojs `1f4cef786f`, lib/pkp
  `a7f5e3081b`, pkp/datasets `58f1d08` (2026-10-05), PostgreSQL. The fix
  was tried with the steps and the neighbour, and the neighbour was also
  walked without it. Way round, walked: after "Unpublish" and "Publish"
  into "Vol. 1 No. 2 (2014)", article 5 is refused signed out and to
  `ccorino`. No server error or page script error in the `main` walks.
- 3.5, walked on ojs `4342473090`, lib/pkp `771474347e`: "Schedule For
  Publication" opens "Select an issue to schedule for publication"
  listing only the issues; article 17 was refused in steps 4, 9 and 11
  as on `main`. Code: `ArticleHandler::userCanViewGalley()` line 550
  enters the reader checks only on `$issue && $issue->getPublished()`
  and redirects otherwise, and `publication\Repository::validatePublish()`
  refuses a publication with no issue (`publication.required.issue`).
- 3.4 (ojs `upstream/stable-3_4_0` `d68934d0d1`, lib/pkp
  `origin/stable-3_4_0` `767353f4fe`) and 3.3 (ojs `ac77c9fb35`, lib/pkp
  `ac3fa73402`), code: `ArticleHandler` lines 539 and 471
  (`ArticleHandler.inc.php`) have the same issue-guarded condition, and
  `validatePublish()` (3.4 `classes/publication/Repository.php`, 3.3
  `classes/services/PublicationService.inc.php`) requires an issue.
- Introduced: `git blame` on lines 622–626 gives 234fdf6586. Line 622's
  condition was retouched by ec01cea04c (`pkp/dev-team#310`, 2026-07-23)
  without touching the return. The commit belongs to `pkp/ojs#4875`,
  which was closed with its commits pushed to `main`.
- Upstream searches (2026-10-05) in pkp/pkp-lib, pkp/ojs and
  pkp/ui-library: "galley without issue subscription", "article not
  assigned issue access restricted", `userCanViewGalley`,
  `subscriptionRequired`, "continuous publication subscription access",
  "issueless subscription", "restrictArticleAccess issue", "galley access
  no issue". `pkp/pkp-lib#9295` is the feature issue; nothing on the fault.
- Not driven: institutional (domain, IP) subscriptions, purchases and
  membership on an article with no issue, the OAI JATS format, and
  whether the REST API accepts `accessStatus` on a published publication.
