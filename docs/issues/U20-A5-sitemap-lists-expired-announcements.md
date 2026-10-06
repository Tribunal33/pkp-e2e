# The sitemap lists expired announcements, whose entries lead to the Announcements list

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/ojs#1869` for `pkp/pkp-lib#3459` · [00be20808c](https://github.com/pkp/ojs/commit/00be20808c34c5c60c50e7488a38e6e8bb599d04) · 2018-03-08 · Bozana Bokan (bozana); moved to pkp-lib for OJS and OMP in `pkp/pkp-lib#3463` · [a77b057743](https://github.com/pkp/pkp-lib/commit/a77b05774317c7c8314ee547191d75e150a5c34f), and inherited by OPS
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U20 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U20-search-engine-metadata-and-analytics.md#a5)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A journal with announcements switched on expects its sitemap to list
the announcements a visitor can read. The sitemap lists every
announcement the journal has, including those whose expiry date has
passed. Following an expired announcement's entry does not open the
announcement: the app sends the visitor or search engine on to the
"Announcements" list, which no longer shows it.

It shows once an announcement's expiry date has passed, and the
entries grow by one with each announcement that expires.

## Impact

- **Lost**: no content, and nobody is told. Search engines are handed
  addresses that redirect to the Announcements list; Google, for one,
  does not index an address that redirects.
- **Who**: journals, presses and preprint servers that use
  announcements with expiry dates; the sitemap is the same in all
  three.
- **Way round**: deleting the announcement removes its entry. Clearing
  its expiry date does not remove the entry: it makes the announcement
  public again.

Low: the sitemap's extra entries lead to the Announcements list and
hide nothing; it would be medium if the entries ended in an error or
exposed what the expiry hides.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (OMP and OPS the same way;
  `rvaca` is the manager in all three datasets). The dataset's journal
  `publicknowledge` has announcements switched off and no announcement.

Steps:

1. Sign in as `rvaca` (Journal manager).
2. Settings › Website › Setup › "Announcements": tick "Enable
   announcements" and press "Save".
3. In the side menu press "Announcements", then "Add Announcement".
   Type the "Title" `u20d current` and press "Save".
4. Press "Add Announcement" again. Type the "Title" `u20d expired`, the
   "Expiry Date" `2020-01-31`, and press "Save". The list shows both
   rows. Read the address of the "View" link of `u20d expired` (hover
   over it or copy the link; pressing it redirects): it ends in its
   number, 2 on a fresh dataset.
5. Sign out. Open the journal's Announcements page
   (`/index.php/publicknowledge/announcement`): it lists `u20d current`
   only.
6. Open the sitemap, `/index.php/publicknowledge/sitemap` (it opens as
   `…/en/sitemap`).
7. Open the address the sitemap lists for `u20d expired`.

**Expected**: the sitemap lists the Announcements page and the page of
`u20d current`, and no entry for `u20d expired`, whose page no visitor
can open.

**Observed**: the sitemap lists both announcements:

```
<loc>http://{host}/index.php/publicknowledge/en/announcement</loc>
<loc>http://{host}/index.php/publicknowledge/en/announcement/view/1</loc>
<loc>http://{host}/index.php/publicknowledge/en/announcement/view/2</loc>
```

Step 7 answers an HTTP `302` redirect and lands on
`/index.php/publicknowledge/en/announcement`, the "Announcements" list
showing `u20d current` only.

## Cause

`PKP\pages\sitemap\PKPSitemapHandler::_createContextSitemap()`
(`lib/pkp/pages/sitemap/PKPSitemapHandler.php`, line 112) lists the
announcements with
`Announcement::withContextIds([$context->getId()])->pluck(…)`, with no
date filter.

The announcement's own page decides differently.
`PKP\pages\announcement\AnnouncementHandler::view()` shows an
announcement only while `dateExpire` is empty or not yet past, and
otherwise redirects to `announcement`. The public list (`index()`), the
home page (`PKPIndexHandler`) and OJS's `AnnouncementFeedGatewayPlugin`
read `withActiveByDate()`, so they leave expired announcements out. The
sitemap is the one public listing that does not apply the same rule.

The listing came in with OJS `pkp/ojs#1869` for `pkp/pkp-lib#3459`
(2018), to list each announcement's page for search engines. It used
`AnnouncementDAO::getByAssocId()`, which returns every announcement,
although the DAO already had `getAnnouncementsNotExpiredByAssocId()`.
The code moved to pkp-lib the same week and was rewritten for the 3.4
collector and the 3.5 Eloquent model without a date filter being added.

Reach:

- All three apps: the announcement entries are written by the shared
  `PKPSitemapHandler`. The apps' `SitemapHandler` subclasses add no
  announcement entries (read in the code, OJS, OMP and OPS `main`).
- The site's sitemap index lists only each context's sitemap address,
  never an announcement (read in the code).
- `ManagementHandler`, `AdminHandler` and the announcements API list
  expired announcements on purpose, for managers.

## Proposed fix

Filter the sitemap's announcements as the public list does, in the
shared handler
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/sitemap-lists-expired-announcements/fix.diff)):

```diff
-            $announcementIds = Announcement::withContextIds([$context->getId()])->pluck((new Announcement())->getKeyName())->toArray();
+            // Only the announcements a visitor can open: an expired one's page redirects to the list
+            $announcementIds = Announcement::withContextIds([$context->getId()])
+                ->withActiveByDate()
+                ->pluck((new Announcement())->getKeyName())
+                ->toArray();
```

This is the same chain OJS's `AnnouncementFeedGatewayPlugin` already
uses (`withContextIds([...])->withActiveByDate()`), and it keeps every
announcement a visitor can read listed, as `pkp/ojs#1869` intended. The
scope's `orWhereNull('date_expire')` cannot widen the query past the
context: Eloquent wraps the conditions a local scope adds in their own
group (`Builder::callScope()` → `addNewWheresWithinGroup()`), so the
query reads `… assoc_id in (…) and (date_expire > ? or date_expire is
null)`.

Tried on OJS, OMP and OPS `main`: the walk's sitemap kept
`announcement/view/1` (`u20d current`) and dropped
`announcement/view/2` (`u20d expired`). A control check (an
announcement with no expiry date and one expiring a year from now) kept
both entries, each opening its own page, with the fix in and out.

**Alternatives**

- Make `AnnouncementHandler::view()` show expired announcements: this
  reverses the expiry rule the list, home page and feed follow.

**What goes with it**

- A guard: extend the "Check announcements on a sitemap" test in
  `lib/pkp/cypress/tests/integration/Announcements.cy.js` with an
  announcement that has a past expiry date and assert that its address
  is absent. The e2e guard is spec U20's Rule 3.
- Backport: 3.5 takes the diff as it stands (the same file). 3.4 would
  add `->filterByActive()` to the `Repo::announcement()->getCollector()`
  chain. 3.3 would call
  `AnnouncementDAO::getAnnouncementsNotExpiredByAssocId()` in place of
  `getByAssocId()`, iterated through `->toIterator()` (or a
  `while ($announcement = $result->next())` loop): it returns a
  `DAOResultFactory`, whose `ItemIterator` base implements no PHP
  iterator, so the plain swap under the existing `foreach` would not
  list the announcements.
- No data repair (the sitemap is built on each request), and no API or
  hook change: the
  `SitemapHandler::createJournalSitemap` hook (and the press and server
  ones) receive the document with fewer entries.

Small: one query in the shared handler, following the feed plugin's
pattern, plus one Cypress assertion.

## Evidence

- A Playwright script that runs the Steps on installs loaded from PKP's
  default test dataset, all three apps in one run:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/sitemap-lists-expired-announcements/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/sitemap-lists-expired-announcements/lib.js)),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/sitemap-lists-expired-announcements/walk.js`
  (`NB=1` in front runs the control check alone). It reads the sitemap's
  raw XML and follows the expired entry, recording its redirect.
- The fix, tried 2026-10-03 on the `main` tips below with
  `node bin/try-fix.js apply shared/playwright/checks/issues/sitemap-lists-expired-announcements/fix.diff ojs omp ops`.
- Walked 2026-10-03 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [e8dafbc](https://github.com/pkp/datasets/commit/e8dafbcf0a61c21a3653dd24d9a1282f36762d12) (2026-10-02):
  - main: OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794c (lib/pkp
    3dc90c81a6), OPS c8af945bb7 (lib/pkp 3dc90c81a6).
  - stable-3_5_0: OJS c1cee76b95 (lib/pkp 771474347e), OMP 9c5e24246c
    (lib/pkp cf3f984335), OPS 38b61882d3 (lib/pkp cf3f984335). The same
    steps and the same result; the same `PKPSitemapHandler` line and the
    same `view()` check.
- 3.4, by code: pkp-lib `stable-3_4_0` at 767353f4fe, apps at OJS
  d68934d0d1, OMP 0aec65441, OPS acd8ae704b. `PKPSitemapHandler.php`
  lists `Repo::announcement()->getCollector()->filterByContextIds(…)->getIds()`
  without `filterByActive()`; `AnnouncementHandler::view()` redirects an
  expired announcement to the list.
- 3.3, by code: pkp-lib `stable-3_3_0` at ac3fa73402, apps at OJS
  ac77c9fb35, OMP 8e72fc883, OPS c5532e2161.
  `PKPSitemapHandler.inc.php` lists
  `AnnouncementDAO::getByAssocId()` (no date filter);
  `AnnouncementHandler.inc.php` `view()` redirects an expired
  announcement to the list. On 3.4 and 3.3 the apps' own
  `SitemapHandler` adds no announcement entry.
- Introduced: `git blame` on line 112 gives 9547aa3e5b (2025,
  `pkp/pkp-lib#11548`, which fixed the column name in the same query)
  and, around it, later reformatting and rewrites (e3f570bc37,
  1f48f6e414, 2aa31cb858). `git log -S` on the
  `'announcement', 'view'` entry reaches a77b057743 in pkp-lib ("move
  shared code to pkp-lib", PR `pkp/pkp-lib#3463`) and, in OJS,
  00be20808c ("consider announcements and custom pages urls", PR
  `pkp/ojs#1869`), which replaced the comment "the URL for each
  announcement is not considered" with a `getByAssocId()` loop. At that
  commit `AnnouncementHandler::view()` already redirected expired
  announcements. OPS's history holds the same OJS commits; it took the
  shared handler when it grew out of OJS.
- Not driven: site-wide announcements (the site's sitemap index lists
  none), a second language (the sitemap lists the language it is read
  in, and the filter does not depend on it), and the day an
  announcement expires (the list and `view()` use the same
  `date_expire` boundary). MySQL not checked; the filter is a plain
  timestamp comparison.
- Search engines: Google's Search Console help, "Page indexing report"
  (https://support.google.com/webmasters/answer/7440203), says of
  "Page with redirect": "This is a non-canonical URL that redirects to
  another page. As such, this URL will not be indexed." It does not say
  how a sitemap entry that redirects is reported; other search engines
  not checked.
- Upstream search 2026-10-03, pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and
  pkp/ui-library issues and PRs, by the symptom's words and `PKPSitemapHandler`:
  `pkp/pkp-lib#11548` (closed) fixed a database error in the same query,
  not its missing date filter; `pkp/pkp-lib#8288` (closed) asked for
  expired announcements to be hidden in the announcement feed, not in
  the sitemap.
