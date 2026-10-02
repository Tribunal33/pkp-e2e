# An issue keeps listing an article whose newer version was published outside it, and "Remove" takes the issue's version offline

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS (through another issue; 3.5 has no "Don't Assign To An Issue")
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** `pkp/ojs#2457` for `pkp/pkp-lib#2072` · [88aba9a0cb](https://github.com/pkp/ojs/commit/88aba9a0cb9a46881fdb0c2b46c3f311d98be7d5) · 2019-06-26 · Nate Wright (NateWr)
- **Upstream** `pkp/pkp-lib#10015` (open), covering the "Items" count and the article showing in two issues when a newer version is assigned to another issue. This report adds the "Don't Assign To An Issue" path, "Remove" taking the issue's version offline, the root cause and a tried fix.
- **Tracked in** spec U50 [A17](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U50-issues.md#a17), [A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U50-issues.md#a18)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

An editor publishes a newer version of an article that is in a published
issue, and chooses "Don't Assign To An Issue". The issue still lists the
article, now under the newer version's title, on its page, in "Items"
and in its "Table of Contents". The link opens the newer version's page,
which names no issue.

Publishing the newer version into another issue has the same effect,
and the newer version's page then names that other issue. On 3.5, which
has no "Don't Assign To An Issue", this is how it happens.

Pressing "Remove" on that article in the "Table of Contents" does not
take it out of the issue. It takes offline the version the issue
published: that version's page answers "404 Not Found" and drops out of
the article's "Versions" list. Nothing tells the editor. The editor can
publish that version again from the workflow, if they notice.

## Impact

- **Lost**: a correct table of contents for the issue, on its page, in
  its web feeds and in the Items count. After "Remove", the issue's
  version and every link to it fail until someone publishes it again,
  and nobody is told.
- **Who**: editors who publish a new version of an issue's article
  outside that issue, and that issue's readers. The publish window
  preselects the earlier version's issue, so it takes a deliberate
  choice.
- **Way round**: the earlier version's own "Publish" in the workflow
  brings it back online. The window preselects "Assign To Current/Back
  Issue" with the same issue. The issue still lists the newer title
  afterwards. For the listing itself, "Unpublish" on the newer version
  makes the earlier version current again, so the issue lists it under
  its own title. Nothing on the issue's screens helps.

Medium: a published issue lists the wrong version, and "Remove" silently
takes a published version offline. It happens only after a choice away
from the preselected issue, and the lost version can be published again.
It would be high if journals often published new versions outside the
issue.

## Steps to reproduce

Preconditions: the default dataset, OJS `main`. In the journal
`publicknowledge`, the published, current issue "Vol. 1 No. 2 (2014)"
holds submission 1, "Signalling Theory Dividends", and submission 17.
Submission 1 also has a version 1.1, "The Signalling Theory Dividends
Version 2", which is not yet published. Nothing else is created.

Publishing the newer version outside the issue:

1. Sign in as `dbarnes`.
2. Open submission 1 from the editorial dashboard.
3. In the "Publication" menu, open the newest version's "Title &
   Abstract".
4. Press "Publish". In "Review Publishing Details", under "Issue
   Assignment" ("Assign To Current/Back Issue" is preselected), choose
   "Don't Assign To An Issue" and press "Confirm".
5. The window reads "All publication requirements have been met. This
   will be published immediately without any issue association. Are you
   sure you want to publish this?". Press "Publish".
   [3.5 has no "Don't Assign To An Issue". Steps 4 and 5 become: on the
   version's "Issue" page, "Change Issue" to "Vol. 2 No. 1 (2015)" and
   press "Save"; press "Publish" and, in the window, "Publish". The
   window reads "…will be published immediately…" because the dataset's
   version 1.1 carries a past publication date, but the version is only
   scheduled while "Vol. 2 No. 1 (2015)" is unpublished. Then Issues ›
   "Future Issues" › "Vol. 2 No. 1 (2015)" › "Publish Issue" › "OK",
   which publishes it.]

What the issue shows:

6. Sign out and press "Current" (on 3.5: "Archives" › "Vol. 1 No. 2
   (2014)").
7. Open the link "The The Signalling Theory Dividends Version 2"
   (version 1.1's prefix "The" is followed by a title that starts with
   "The").

"Remove":

8. Sign in as `dbarnes` and open Issues › "Back Issues". The row "Vol. 1
   No. 2 (2014)" reads "Items" 2.
9. Open the row's "Edit". The "Table of Contents" tab lists "The The
   Signalling Theory Dividends Version 2" under "Articles".
10. On that row press "Remove". The window "Remove Article From Issue"
    asks "Are you sure you wish to remove this article from the issue?
    The article will be available for scheduling in another issue.".
    Press "OK".
11. Close and reopen the issue's "Edit", then sign out and open the first
    version's page, `/index.php/publicknowledge/en/article/view/mwandenga/version/1`.

**Expected**: after step 5 the issue no longer lists the article, since
the editor published its current version without any issue. "Items"
reads 1, and there is nothing in the issue to "Remove". If the article
were still listed, "Remove" would take it out of the issue and leave its
published versions online, or refuse with a message.

**Observed**: in step 6 the issue's page lists "The The Signalling
Theory Dividends Version 2 A Review Of The Literature And Empirical
Evidence" under "Articles". In step 7 the link opens
`article/view/mwandenga`, headed "The The Signalling Theory Dividends
Version 2", with the breadcrumb "Home / Archives / Articles" and an
issue part that reads only "Section Articles" (3.5: "Home / Archives /
Vol. 2 No. 1 (2015) / Articles" and "Issue Vol. 2 No. 1 (2015)"). In
step 10 "OK" closes the window and the request answers success:

```
POST /index.php/publicknowledge/$$$call$$$/grid/toc/toc-grid/remove-article?articleId=1&issueId=1 → 200
{"status":true,"content":"","elementId":"0","events":[{"name":"dataChanged"}]}
```

But the row stays, before and after the window is reopened, and "Items"
still reads 2. The issue's page still lists the article, and the
workflow still reads "Status: Published". In step 11 the first version's
page, which before step 10 showed "Issue Vol. 1 No. 2 (2014)", answers
"404 Not Found". The article's page no longer links to it under
"Versions".

## Cause

The issue's lists pick their articles by any version and then show the
current one. `APP\submission\Collector::filterByIssueIds()`
(`classes/submission/Collector.php`, lines 71–77) keeps a submission
when **any** of its publications carries the issue's id, whatever that
publication's status.

Every reader of an issue's contents then shows the submission's
**current** publication: its title, section, order and link. None of
them checks that the current publication is in the issue:

- `IssueHandler::setupIssueTemplate()` (`pages/issue/IssueHandler.php`
  377–394) and `Issue::getNumArticles()` ("Items") check the current
  publication's status.
- `Repository::getInSections()` (`classes/submission/Repository.php`
  30–41, behind the "Table of Contents" tab) checks the submission's
  status.
- The issue schema's `articles` and the DataCite issue reads check no
  status.
- The core template `templates/frontend/objects/article_summary.tpl`
  (line 20) renders `getCurrentPublication()`.

Since versioning, each version carries its own issue, and elsewhere OJS
reads a version's issue from that version. The article page's breadcrumb
and "Issue" line come from the version it shows (`ArticleHandler`,
191–195). So the article's own address, which shows the current version,
names the current version's issue. The table of contents' "Open Access"
box (`TocGridHandler::setAccessStatus()`) accepts an article only when
its current publication carries the issue's id. The issue's lists break
that rule as soon as the current version is published outside the
issue.

"Remove" (`TocGridHandler::removeArticle()`) unpublishes every
publication of the submission that carries this issue's id and is
scheduled or published. Here only the earlier version carries the id,
so that version goes offline. The current version has no issue, so the
lists, filtered as above, keep showing the article.

Reach:

- Walked on main and 3.5: the issue's page (which is also "Current"),
  the "Table of Contents" tab, "Items" and "Remove".
- Read in the code: the home page's "Current Issue" (`IndexHandler`) and
  the "issue published" email's table of contents (`IssueEmailVariable`),
  both through `setupIssueTemplate()`; the section headings for an issue
  (`classes/section/DAO.php` `getByIssueId()`); the REST API's `GET
  /issues/{id}` `articles`; DataCite's issue export (its related parts
  and its table of contents); the PubMed issue export
  (`PubMedExportPlugin`, through `getInSections()`); and the current-issue
  web feeds (`plugins/generic/webFeed/WebFeedGatewayPlugin.php`).
- "Don't Assign To An Issue", which `pkp/pkp-lib#9295` added to the
  publish window on main: walked on main.
- A newer version published into another issue: walked on 3.5 ("Change
  Issue"); read in the code on main ("Assign To Future Issue and Publish
  Immediately"), 3.4 and 3.3.
- Left alone on purpose, read in the code: deleting, publishing and
  unpublishing an issue (`IssueGridHandler`), clearing an issue's
  identifiers (`PubIdPlugin`), the native XML export of an issue, and
  the COUNTER AR1 report must act on every version in the issue. The
  REST API's `GET /submissions?issueIds=` and the editorial dashboard's
  issue filter (`GET /_submissions?issueIds=`,
  `BackendSubmissionsController`) also stay: they are searches that find
  every submission with a version in the issue, not a table of contents,
  and the parameter is an API contract.

## Proposed fix

An issue should list an article when its current version is in that
issue, or when one of its versions is scheduled there. The second part
keeps a newer version scheduled into a future issue in that issue's
"Table of Contents", for ordering and "Remove". As today, it is shown
with the current version's title, section and order. The proposal adds
this rule as a second filter on the OJS submission collector and points
the issue's readers at it. `filterByIssueIds()` keeps its meaning ("has
a version in these issues") for the callers that must act on every
version. The full diff:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-lists-version-published-outside-it/fix.diff).

```php
// classes/submission/Collector.php
public function filterByListedInIssueIds(array $issueIds): self
{
    $this->listedInIssueIds = $issueIds;
    return $this;
}
// in getQueryBuilder()
if (is_array($this->listedInIssueIds)) {
    $q->whereIn('s.submission_id', function ($query) {
        $query->select('p.submission_id')
            ->from('publications as p')
            ->join('submissions as ps', 'ps.submission_id', '=', 'p.submission_id')
            ->whereIn('p.issue_id', $this->listedInIssueIds)
            ->where(
                fn (Builder $query) => $query
                    ->whereColumn('p.publication_id', 'ps.current_publication_id')
                    ->orWhere('p.status', Publication::STATUS_SCHEDULED)
            );
    });
}
```

The readers that switch from `filterByIssueIds()` to
`filterByListedInIssueIds()`:

- `IssueHandler::setupIssueTemplate()`
- `Repository::getInSections()`, and with it the PubMed issue export
- `Issue::getNumArticles()`
- the section `DAO::getByIssueId()`
- the issue schema map's `articles`
- the two DataCite issue reads
- `WebFeedGatewayPlugin`, in the pkp/webFeed plugin

With the article gone from the table of contents, "Remove" is no longer
offered for it. `removeArticle()` stays as it is, because unpublishing
every version in the issue is right for an article the issue lists.

The fix was tried on main. After step 5, the issue's page and its "Table
of Contents" list only submission 17, "Items" reads 1, and the first
version's page stays online. Two neighbouring cases came out the same
with the fix in and out:

- Version 1.1 published into the issue stays listed, and "Remove" takes
  it out.
- Version 1.1 scheduled into "Vol. 2 No. 1 (2015)" shows in that issue's
  table of contents ("Items" 1), and the article stays in "Vol. 1 No. 2
  (2014)".

**Alternatives**:

- List the version that is in the issue, under its own title and link.
  The templates, the grid, ordering and "Open Access" all work on the
  current publication, so this is a new pattern.
- Change `filterByIssueIds()` itself. Deleting, publishing and
  unpublishing an issue, the identifier clean-up and the export need
  every version in the issue, and the REST API's `issueIds` parameter
  would change meaning.
- Drop "Don't Assign To An Issue" for a version whose earlier version is
  in an issue. That is a product decision, and it would leave the
  other-issue path, the only path on 3.5 and older.

**What goes with it**:

- No data repair: the lists are computed on every read.
- The REST API's issue `articles`, and the DataCite and PubMed issue
  exports, stop listing such articles.
- A backport to 3.5 and 3.4 applies to the same methods, where the
  filter reads `publications.issue_id` (3.5) or the `issueId`
  publication setting (3.4). 3.3 needs the same rule in
  `SubmissionQueryBuilder`.
- The guard: an e2e scenario in the spec (a newer version published
  without an issue leaves the issue's page, "Items" and "Table of
  Contents") and a unit test of the new filter.

Medium: eight files across OJS and the webFeed plugin, and the REST
API's issue `articles` and two issue exports change what they list.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-lists-version-published-outside-it/walk.js),
  with helpers in `lib.js` and the 3.5 steps in `lib35.js` beside it.
  Run it with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js ojs shared/playwright/checks/issues/issue-lists-version-published-outside-it/walk.js`
  on an install freshly loaded from the default dataset (pkp/datasets
  c657990, 2026-10-01, PostgreSQL). No request answered 500 and no script
  error was logged.
- The fix's two neighbouring cases: `walk.js neighbour` publishes
  version 1.1 into the issue, and
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-lists-version-published-outside-it/neighbour.js)
  schedules it into the future issue.
- Way round, publishing again:
  [republish.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-lists-version-published-outside-it/republish.js)
  takes steps 1–10 on main, then the first version's "Publish". The
  window read "This will be published immediately in Vol. 1 No. 2
  (2014)… "Version of Record 1.0"". After it, the version's page answered
  200 with "Issue Vol. 1 No. 2 (2014)", and the issue still listed the
  newer title.
- Tips: `main` OJS b84f8e2e44 (pkp-lib ddd8ab243a, ui-library 64d67363,
  webFeed 7436935); `stable-3_5_0` OJS c346ee00a5 (pkp-lib 3bb4450bea,
  ui-library d4e01883); `stable-3_4_0` OJS 75cc2d488b (pkp-lib
  32b0f4b4af); `stable-3_3_0` OJS ac77c9fb35 (pkp-lib f6ab331645).
- main (code): the publish button the workflow shows for a queued
  version (`workflowConfigEditorialOJS.js` `getPrimaryControlsRight`),
  `validatePublish()` (no rule against an earlier version), and
  `getCurrentPublicationIdByPublications()` (the last published version
  by version order is current, which is what the "Unpublish" way round
  rests on).
- 3.5 (walked, and read): the same `filterByIssueIds()` subquery on
  `publications.issue_id`, `setupIssueTemplate()`, `getInSections()` and
  `removeArticle()` as on main. `IssueEntryForm` and `AssignToIssueForm`
  let an unpublished version take another issue, and
  `Repository::setStatusOnPublish()` schedules a version in an
  unpublished issue.
- 3.4 (code): `filterByIssueIds()` matches the `issueId` publication
  setting of any publication. `setupIssueTemplate()` and `removeArticle()`
  have the same shape, and `AssignToIssueForm` offers the issue choice
  for a version.
- 3.3 (code): `SubmissionQueryBuilder::filterByIssues()` joins every
  publication's `issueId` setting. `IssueHandler::setupIssueTemplate()`
  reads it through `getMany(['issueIds' => …])`, and
  `TocGridHandler::removeArticle()` unpublishes every publication that
  carries the issue's id. `AssignToIssueForm` is there.
- Introduced: the any-version issue filter dates from 88aba9a0cb in
  `SubmissionQueryBuilder` (`git log -S issue_ps`). It moved to the
  collector in 9fcf842157 and to `publications.issue_id` in 25cf1cc3d6,
  without changing its meaning.
- Upstream: searched pkp/pkp-lib and pkp/ojs for "issue table of
  contents new version", "version published without issue", "remove
  article from issue version", "new version another issue",
  `filterByIssueIds` and `getInSections`. `pkp/pkp-lib#7292` (closed)
  covered publishing such a version, not the listing.
- Not walked: main's other-issue path, and the "Unpublish" way round.
