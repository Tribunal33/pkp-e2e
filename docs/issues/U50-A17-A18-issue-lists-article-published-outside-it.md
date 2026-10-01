# An issue keeps listing an article published outside it, and "Remove" takes its older version offline

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS (through a newer version published in another issue)
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** `pkp/ojs#2457` for `pkp/pkp-lib#2072` · [88aba9a0cb](https://github.com/pkp/ojs/commit/88aba9a0cb9a46881fdb0c2b46c3f311d98be7d5) · 2019-06-26 · Nate Wright (NateWr)
- **Upstream** `pkp/pkp-lib#10015` (open), covering a newer version assigned to another issue: the article shown in both issues and a wrong "Items" count. It does not cover "Don't Assign To An Issue" or "Remove".
- **Tracked in** spec U50 [A17](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U50-issues.md#a17), [A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U50-issues.md#a18)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

An editor publishes a newer version of an issue's article with "Don't
Assign To An Issue". The article's own page then names no issue, but
the issue keeps listing the article under the newer version's title: on
the issue's page, on its "Table of Contents" tab and in its "Items"
count.

"Remove" on that row makes it worse. The window closes as if the article
had been taken out, but the article stays listed. What goes offline is
the earlier version, the one the issue published: its page answers "404
Not Found", and nothing tells the editor. The editor can publish that
version again from its own page in the workflow, once they notice.

A newer version published in another issue does the same: both issues
list the article, and "Remove" in the older issue takes the older
version offline.

## Impact

- **Lost.** A correct public record: the issue lists an article that
  is not in it. After "Remove", the version the issue published is
  offline, and every link to it is broken until the editor publishes it
  again.
- **Who.** A journal manager or editor who publishes an updated version
  of an article already in an issue, either without an issue or in
  another issue, and every reader of the first issue.
- **Way round.** Publishing the newer version into the same issue
  avoids it. Once it has happened, nothing on screen takes the article
  off the first issue's list: "Remove" leaves it listed and takes the
  earlier version offline, and that version can be published again from
  the workflow.

Medium: the issue's public list is wrong and "Remove" takes the wrong
version offline without a word, but only for an article whose newer
version went outside its issue, and the lost version can be brought
back. It would be high if that version could not be published again.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for OJS `main`. Its current issue "Vol. 1
  No. 2 (2014)" holds "Signalling Theory Dividends" (submission 1). Its
  version 1 ("Version of Record 1.0" in the workflow) is published
  there. Its version 2 ("Version of Record 1.1", titled "The Signalling
  Theory Dividends Version 2") is unpublished and is also assigned to
  "Vol. 1 No. 2 (2014)", which step 3 changes.
- Nothing else: `dbarnes` is the journal's editor.
- The dates on the article's pages are the ones the dataset was built
  with (2026-09-30 for the dump named in Evidence), not the day of the
  steps.

Publishing the newer version outside the issue:
1. Sign in as `dbarnes`.
2. Open submission 1, "Signalling Theory Dividends", and under "Version
   of Record 1.1" open "Publication Settings".
3. Choose "Don't Assign To An Issue" and press "Save".
4. Press "Publish". The window reads "All publication requirements have
   been met. This will be published immediately without any issue
   association. Are you sure you want to publish this?". Press
   "Publish".
   [3.5 has no "Don't Assign To An Issue" and names the version "2".
   There, open version 2's "Issue", press "Change Issue", choose "Vol. 2
   No. 1 (2015)", "Save", and "Publish". Then, on "Issues" › "Future
   Issues", open the arrow of "Vol. 2 No. 1 (2015)", press "Publish
   Issue" and "OK".]
5. Sign out and open the issue "Vol. 1 No. 2 (2014)"
   (`/index.php/publicknowledge/issue/view/1`).
6. Follow the article's link.
7. Sign in as `dbarnes`, open "Issues" › "Back Issues", read "Items" for
   "Vol. 1 No. 2 (2014)", open it and its "Table of Contents" tab.

"Remove" (the same on 3.5):
8. Open the arrow of the row "The The Signalling Theory Dividends
   Version 2" (the version's prefix "The" is part of its title) and
   press "Remove". The window "Remove Article From Issue" asks "Are you
   sure you wish to remove this article from the issue? The article will
   be available for scheduling in another issue.". Press "OK".
9. Open the tab again. Signed out, open the issue's page, the article's
   page and version 1's page (`/index.php/publicknowledge/article/view/1/version/1`).

**Expected:** after step 4 the issue no longer lists the article, since
its current version belongs to no issue, as its page says. Steps 5 and
7 list only "Antimicrobial, heavy metal resistance and plasmid profile
of coliforms isolated from nosocomial infections in a hospital in
Isfahan, Iran", and "Items" reads 1. Step 8 has no row to remove, and
version 1's page stays up, naming "Vol. 1 No. 2 (2014)".

**Observed:** at step 5 the issue's page lists, under "Articles",
"Antimicrobial, heavy metal resistance …" and "The The Signalling
Theory Dividends Version 2". At step 6 the link opens version 2's page,
whose breadcrumb reads "Home / Archives / Articles" and whose issue
part reads only "Section Articles". At step 7 "Items" reads 2, and the
tab lists both articles, the second as "The The Signalling Theory
Dividends Version 2".

At step 8 the window closes. The request behind "OK"
(`…/$$$call$$$/grid/toc/toc-grid/remove-article`) answers 200:

```
{"status":true,"content":"","elementId":"0","events":[{"name":"dataChanged"}]}
```

The row stays, in the same window and at step 9, and "Items" still
reads 2. The issue's page still lists the article under the new title.
Version 1's page answers "404 Not Found". The article's page still
shows version 2, "Published 2026-09-30 — Updated on 2026-09-30", and
its "Versions" list now offers only "(Version of Record 1.1)". The
workflow still reads "Published" and offers "Unpublish". No request
failed.

[On 3.5 the same, except that at step 6 the link opens a page naming
"Vol. 2 No. 1 (2015)".]

A control: "Remove" on "Antimicrobial, heavy metal resistance …", whose
only version is in the issue, takes the row off, "Items" drops to 1,
and the article's page goes offline, as the window says.

Bringing version 1 back: under "Version of Record 1.0" the workflow
offers "Publish". "Review Publishing Details" arrives with "Version of
Record (VoR)", "Major Revision" and "Assign To Current/Back Issue"
"Vol. 1 No. 2 (2014)" chosen. "Confirm" and "Publish" ("This will be
published immediately in Vol. 1 No. 2 (2014).") put version 1's page
back up as "Version of Record 1.0", in the issue. On 3.5 the same from
"All Versions" › "Version 1: Unpublished" › "Publish".

## Cause

`APP\submission\Collector::getQueryBuilder()` (OJS
`classes/submission/Collector.php` lines 71–77), for
`filterByIssueIds()`, keeps a submission when any of its publications
carries the issue's id. It ignores that publication's status and
whether a newer version has superseded it.

The code that shows an issue's articles then shows each one by its
current publication, the most recent published version. The article's
own page and its workflow follow the current publication too. So once
version 2, with no issue, is published and becomes current, the
submission still matches through version 1 and is shown as version 2.
The rule this breaks: an issue lists the articles whose current version
it holds, or which are scheduled for it.

`TocGridHandler::removeArticle()` (OJS
`controllers/grid/toc/TocGridHandler.php` lines 256–266) unpublishes
each publication of the submission that is in this issue and scheduled
or published. For a listed article whose current version is in the
issue, that is right. Here it reaches only version 1. Version 1 keeps
its `issue_id`, so the list still matches it and the row stays.

The same follows when the newer version is published in another issue,
which every version since versioning allows. "Don't Assign To An Issue"
(`pkp/ojs#5039` for `pkp/pkp-lib#9295`,
[1fb080776e](https://github.com/pkp/ojs/commit/1fb080776ef774c6c31e12e2450de0c29c4183c8),
2025-08-06, Touhidur Rahman (touhidurabir)) added a second way in.

Reach, each seen on screen unless marked as read in the code:

- The issue's page and the "Table of Contents" tab with "Items".
- "Current" and the home page's "Current Issue" when the issue is
  current, and the table of contents in the "issue published" email:
  read in the code; they use `IssueHandler::setupIssueTemplate()`, as the
  issue's page does.
- The web feeds when set to "Display items in current published issue."
  (`WebFeedGatewayPlugin`): read in the code. An earlier run of these
  steps (2026-09-28) saw the feeds list the new title.
- The REST API's `GET /issues/{issueId}` `articles` (`APP\issue\maps\Schema`),
  the PubMed export of an issue (through `getInSections()`), and
  DataCite's deposit of an issue, which names version 2's DOI and title
  among the issue's parts: read in the code.
- A newer version published in another issue: both issues list the
  article under the newer title, and "Remove" in the older issue takes
  the older version offline. On screen on 3.5; the same code on `main`.

## Proposed fix

A proposal; the team decides. Tried on `main` as
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-lists-article-published-outside-it/fix.diff).
With it the Steps show the Expected. Three nearby cases agree with it:

- Version 2 scheduled into the future issue "Vol. 2 No. 1 (2015)": that
  issue's tab lists the article ("Items" 1), and "Vol. 1 No. 2 (2014)"
  keeps listing it under version 1's title, since version 1 is still
  current. The same with the fix out.
- "Remove" on "Antimicrobial, heavy metal resistance …" still takes it
  off the tab and offline. The same with the fix out.
- Version 2 moved to "Reviews" before step 3, so the article is alone
  in its section: the tab and the issue's page show only "Articles", and
  the server log has no warning. With the fix out, both show "Reviews"
  holding version 2.

Recommended: give `filterByIssueIds()` an option that matches a
submission only through its current publication or a publication
scheduled in the issue, and use it wherever an issue lists its articles
or their sections:

```php
public function filterByIssueIds(array $issueIds, bool $listedOnly = false): self
…
$query->select('p.submission_id')
    ->from('publications as p')
    ->whereIn('p.issue_id', $this->issueIds)
    ->when($this->issueListedOnly, fn (Builder $query) => $query->where(
        fn (Builder $query) => $query
            ->whereColumn('p.publication_id', 's.current_publication_id')
            ->orWhere('p.status', Publication::STATUS_SCHEDULED)
    ));
```

The "scheduled" branch keeps a future issue listing a newer version
scheduled for it, as today. Every caller of the submission collector's
`filterByIssueIds()` was sorted:

| Caller | Match | Why |
|---|---|---|
| `IssueHandler::setupIssueTemplate()` (issue page, "Current", home page, "issue published" email) | narrowed | lists the issue's articles |
| `Repository::getInSections()` (the tab, `removeArticle()`'s section check, PubMed export) | narrowed | lists the issue's articles |
| `APP\section\DAO::getByIssueId()` (sections of the tab, the issue's page, the API, PubMed) | narrowed, by default | its sections must match the narrowed articles; otherwise an article alone in its section leaves an empty section row and an "Undefined array key" warning on the tab, and `array_merge()` with null in `PubMedExportPlugin::exportIssues()` |
| `Issue::getNumArticles()` ("Items") | narrowed | counts what the issue lists |
| `APP\issue\maps\Schema` `articles` (REST API) | narrowed | the API's list of the issue's articles |
| `WebFeedGatewayPlugin` (current-issue feed) | narrowed | lists the issue's articles |
| `DataciteXmlFilter` (issue deposit: `HasPart` and its table of contents) | narrowed | describes the issue's parts, by the current publication's DOI and title |
| `IssueGridHandler` "Publish Issue", "Unpublish Issue", "Delete" | old | must reach every version in the issue, a superseded one included |
| `IssueNativeXmlFilter::addArticles()` and its sections (native export) | old; its `addSections()` passes `false` | exports whole submissions with every version that belongs to the issue, so an import restores them |
| `PubIdPlugin::clearIssueObjectsPubIds()` | old | clears identifiers on every version in the issue |
| `CounterReportAR1` (usage report by issue) | old | counts usage of every article that appeared in the issue |
| `issueIds` filter of `api/v1/submissions` and `api/v1/_submissions` | old | an editor filtering by issue should still find the article |
| `SitemapHandler` | old | it also filters by `filterByLatestPublished()`, which leaves out every article whose current version is in a published issue; a fault of its own |

`DOIPubIdExportPlugin`, `PubObjectsExportPlugin` and
`RecommendBySimilarityPlugin` call the issue collector's
`filterByIssueIds()`, a different method, so they are untouched.

**Alternatives:**

- Changing the match for every caller: "Unpublish Issue" and "Delete"
  would miss a published, superseded version in the issue, leaving it
  published in an unpublished issue, or published with no issue once
  the issue is deleted. The code expects versions of one submission in
  distinct issues (a comment in `IssueGridHandler::publishIssue()` says
  so).
- Comparing the current publication's issue in each reader's loop:
  several copies, and "Items" is a count query with no loop. It would
  also stop a future issue from listing a newer version scheduled for
  it.
- A guard in `removeArticle()` alone stops the wrong unpublishing but
  leaves the wrong listing.
- Listing the version that is in the issue instead of the current one:
  every template, the feed and the API map read `getCurrentPublication()`,
  and the link would still lead to the article's page, which names no
  issue.

**What goes with it:**

- The REST API's `GET /issues/{issueId}` no longer lists such an article
  under `articles` or its section under `sections`, a change API clients
  see; it then agrees with the issue's page.
- `WebFeedGatewayPlugin` lives in the `pkp/webFeed` plugin repository,
  so the fix spans two repositories.
- No stored data is wrong, so no repair.
- `removeArticle()` is unchanged. A tab opened before the newer version
  was published could still offer the row; a guard there (act only when
  the current publication is in the issue or scheduled for it) is
  optional.
- Backport: on 3.5 most hunks apply, and three need adapting to the
  branch's lines. 3.4 matches through `publication_settings` and 3.3
  through `SubmissionQueryBuilder`, so the clause is written anew there.
- Guard: a unit test of the collector with a superseded version, and an
  e2e scenario in U50.

Medium: one filter option and its callers across OJS and the webFeed
plugin, with a change to what the REST API returns.

## Evidence

- Kept script that runs the Steps in the browser, on an install loaded
  from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-lists-article-published-outside-it/walk.js),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js ojs shared/playwright/checks/issues/issue-lists-article-published-outside-it/walk.js`
  after `npm run fleet-prep -- --feature issues --dataset --reset`. On
  3.5 it takes the bracketed steps by itself. `RECOVER=1` in front adds
  the republishing of version 1 (walked on `main` and 3.5).
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-lists-article-published-outside-it/neighbour.js)
  beside it runs the first two nearby cases, and with `PHASE=section`
  the third, each on a fresh load.
- The fix, tried 2026-10-01 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/issue-lists-article-published-outside-it/fix.diff ojs`,
  then walk.js, neighbour.js and `PHASE=section` neighbour.js, each on a
  fresh load, then `node bin/try-fix.js revert ojs`. Both neighbour
  checks were also run with the fix out.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `ojs/main/pgsql` and `ojs/stable-3_5_0/pgsql`, no
  upgrade needed:
  - main: OJS bade233f73 (lib/pkp 2e377d27fc, plugins/generic/webFeed
    7436935).
  - stable-3_5_0: OJS 92b9a16b48 (lib/pkp a9c76aed62), the bracketed
    steps. The code has the same match in `Collector.php`, the same
    `removeArticle()`, and `setupIssueTemplate()` reading the current
    publication.
  - MySQL not run: the fix's correlated subquery
    (`whereColumn('p.publication_id', 's.current_publication_id')`) was
    run on PostgreSQL only.
- 3.4, by code: OJS `stable-3_4_0` at 9571d8fde7 (lib/pkp df13621c2d).
  `Collector.php` matches any publication through `publication_settings`
  (`issueId`), `removeArticle()` has the same loop, and
  `setupIssueTemplate()` reads the current publication. It has no
  "Don't Assign To An Issue", so it is reached through another issue.
- 3.3, by code: OJS `stable-3_3_0` at 9fdb9bcf9a (lib/pkp d446601ebe).
  `SubmissionQueryBuilder::filterByIssues()` joins every publication's
  `issueId` setting, `TocGridHandler::removeArticle()` has the same
  loop, and `IssueHandler::_setupIssueTemplate()` reads the current
  publication. `pkp/pkp-lib#10015` was reported on 3.3.
- Introduced: the any-publication join was added to
  `SubmissionQueryBuilder` by 88aba9a0cb; later commits moved it into
  the collector and onto the `issue_id` column with the same match.
- Upstream, searched 2026-10-01 in pkp/pkp-lib and pkp/ojs:
  `pkp/pkp-lib#10015` has a maintainer's comment expecting the
  other-issue path to become moot with continuous publication
  (`pkp/pkp-lib#9295`), the change that added the issueless path.
- Read in the code only: the PubMed export and the DataCite deposit
  (the PubMed export fails in the test install whatever the issue holds:
  its DTD check cannot reach `dtd.nlm.nih.gov`), the web feeds, the REST API,
  the native export, the "issue published" email.
- Not driven: the other-issue path on `main`, and a tab opened before
  the newer version was published.
