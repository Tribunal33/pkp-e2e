# A journal's sitemap lists its issues but none of their articles or galleys

Model: claude-opus-5-5.

Regression. OJS at `d9b567efec` (lib/pkp `76a315591b`); introduced by
pkp/ojs `da7c68874e` (pkp/pkp-lib#12245, 2026-02-17, committed to `main`
without a pull request). stable-3_5_0: does not (by code) at ojs
`a3dc3b54ff`. Tracked in spec U20 register OJS2. Temporary: delete once
acted on.

## Summary

Since February 2026, a journal's sitemap lists each published issue's
page and nothing under it: no article page and no galley, although the
issue's page lists and links them. Publishing, unpublishing or
republishing an article leaves the sitemap as it was.

## Impact

Every journal meets it, on every published article, from the day it is
published; nobody on the journal's side sees it, since the sitemap is
read by search engines, not by people. A search engine that relies on
the sitemap learns of no article and no PDF: it finds them only by
following the links on the issue and archive pages, which is slower and
less complete, and it is never told that an article was added. A press
and a preprint server are not affected: their sitemaps list their books
and preprints. The journal cannot work around it on screen. Major: every
journal's articles have been missing from its sitemap since February
2026, silently; the 3.5 line does not carry the change.

## Steps to reproduce

Preconditions:

- A fresh OJS install with its default languages.
- A journal "Tide Notes" with a Journal Manager, and an issue "Vol. 1
  No. 1 (2025)" created under Issues › "Future Issues" › "Create Issue"
  and published with "Publish Issue".
- Two articles, "Tidal Patterns" and "Sea Study", each with a "PDF"
  galley, published into that issue from their workflow.

1. Signed out, open the journal's home page and press "Archives", then
   "Vol. 1 No. 1 (2025)". The issue lists "Tidal Patterns" and "Sea
   Study", each with a "PDF" link, and each of the four links opens.
2. Open the journal's sitemap,
   `http://{host}/index.php/{journal}/sitemap`.

**Expected:** after the issue's page (`…/issue/view/19`), the sitemap
lists each article's page and each of its galleys:

```
…/index.php/{journal}/article/view/21
…/index.php/{journal}/article/view/21/18
…/index.php/{journal}/article/view/22
…/index.php/{journal}/article/view/22/19
```

**Observed:** the browser shows "This XML file does not appear to have
any style information associated with it. The document tree is shown
below." above the list, which ends at the issue:

```xml
<url><loc>http://{host}/index.php/{journal}</loc></url>
<url><loc>http://{host}/index.php/{journal}/user/register</loc></url>
<url><loc>http://{host}/index.php/{journal}/login</loc></url>
<url><loc>http://{host}/index.php/{journal}/about/submissions</loc></url>
<url><loc>http://{host}/index.php/{journal}/about/contact</loc></url>
<url><loc>http://{host}/index.php/{journal}/search</loc></url>
<url><loc>http://{host}/index.php/{journal}/issue/current</loc></url>
<url><loc>http://{host}/index.php/{journal}/issue/archive</loc></url>
<url><loc>http://{host}/index.php/{journal}/issue/view/19</loc></url>
```

The response is 200 `application/xml`; the server logs nothing. Control:
the issue's page, in step 1, links all four addresses the sitemap leaves
out, and each answers 200.

## Cause

`APP\pages\sitemap\SitemapHandler::_createContextSitemap()` reaches
articles only through the published issues, one query per issue:

```php
$submissions = Repo::submission()
    ->getCollector()
    ->filterByContextIds([$journal->getId()])
    ->filterByIssueIds([$issue->getId()])
    ->filterByLatestPublished(true)
    ->getMany();
```

Commit `da7c68874e` ("pkp/pkp-lib#12245 Review and fix use of
PKPSubmission::STATUS_...") replaced
`filterByStatus([Submission::STATUS_PUBLISHED])` with
`filterByLatestPublished(true)`. That filter (`APP\submission\Collector`)
is meant for the home page's continuous-publication list: it keeps a
submission whose current publication is published and has **no issue or
an issue that is not yet published** (`whereNull('publication_cp.issue_id')
->orWhere('pi.published', false)`). Here it is combined with the issue of
a loop over published issues, so the two conditions exclude each other and
the query returns nothing for every issue.

## Proposed fix

A proposal; the team decides.

1. In `SitemapHandler`, filter on the current publication's status
   instead:
   `->filterByCurrentPublicationStatus([Publication::STATUS_PUBLISHED])`
   (the pkp-lib collector's filter), which keeps the intent of #12245 (no
   submission status) and restores the article and galley entries. One
   line; not tried.
2. The same commit made the same swap in two other places that also
   combine `filterByLatestPublished(true)` with published issues or with
   no issue filter: `RecommendBySimilarityPlugin` (the "Similar
   articles" list) and `CounterReportAR1` (its issue filter). They are
   worth checking with the same eye; not driven.
3. Separately, and not a regression: an article published with "Don't
   Assign To An Issue" was never in the sitemap, before this change or
   after, since the sitemap reaches articles only through issues. A
   second query with `filterByLatestPublished(true)` alone would add
   those.

## Evidence

- Re-drive for this report, 2026-09-26, on the main fleet's OJS probe
  server (8050), kept script `shared/playwright/checks/U20/reports/rep.js`
  (`PROBE_FEATURE=U20 PROBE_AGENT=rep node bin/probe.js ojs shared/playwright/checks/U20/reports/rep.js`,
  phases `seed,ojs2`). Scratch journal "Tide Notes u20reprepkyb7mb"
  (`u20reprepkyb7mb`), seeded through the harness: issue 19 published,
  articles 21 and 22 published into it with galleys 18 and 19. Snapshots
  in `.reports/U20/rep/`: `ojs2-01-issue-page-ojs` (+ `.png`, the issue's
  four links), `ojs2-02-sitemap-ojs` (+ `.png`, the nine entries above
  and the full body), `rep-facts-ojs.json` (`ojs2-03-issue-links-open`:
  the four addresses, 200 each). The run record holds no response of 400
  or more and no console error for this phase; the probe server's log
  shows nothing but 200s and 302s.
- Claim check K2 (`.reports/U20/cc-K2.md`, K2-1), 2026-09-26:
  `.reports/U20/ccK2/` `r0-A-ojs` (issue `issue/view/7` listed, its two
  articles absent), `e-01-issue-page-ojs`, `e-02-sitemap-beside-issue-page-ojs`,
  `p-02-after-no-issue-ojs`, `p-06-after-unpublish-ojs`,
  `p-08-after-republish-ojs` (publish, unpublish, republish on screen
  change nothing); the same on two other scratch journals and on
  `publicknowledge`. Merge block M12 (`.reports/U20/claimcheck-merge.md`).
  Footnotes q3 and f-ojs2 of `docs/specs/U20-search-engine-metadata-and-analytics.md`.
- The introducing change: `git show da7c68874e -- pages/sitemap/SitemapHandler.php`
  in `checkouts/ojs` (Alec Smecher, 2026-02-17, on `main`'s first-parent
  line, no merge commit); the line had read
  `filterByStatus([Submission::STATUS_PUBLISHED])` since before.
  `filterByLatestPublished()` dates from `234fdf6586` (pkp-lib#9295,
  2025-06-10) and its query was last changed in `c075bba90e`
  (2025-09-11), both before this commit (`git blame` on
  `classes/submission/Collector.php`).
- stable-3_5_0, by code only: `checkouts/stable-3_5_0/ojs` at
  `a3dc3b54ff` does not contain `da7c68874e` and its `SitemapHandler`
  still filters by `Submission::STATUS_PUBLISHED`. Not driven.
- The before side was not driven; it rests on the diff.
- Unverified: whether the two sibling swaps in Proposed fix 2 change
  what a user sees.
