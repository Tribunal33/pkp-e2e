# Statistics › Articles: "All dates" opens an "Error" window when nothing is published or an item predates 2001

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code; readable message)
  - 3.3: OJS, OMP, OPS (code; readable message)
- **Introduced** `pkp/pkp-lib#5497` for `pkp/pkp-lib#5469` · [60d23a612d](https://github.com/pkp/pkp-lib/commit/60d23a612d7b7a2876900e2bee00e11bade0b221) · 2020-02-10 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U64 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U64-usage-statistics.md#a1)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On Statistics › "Articles" of a journal that has not published an
article yet, choosing "All dates" should show the empty table for the
whole range. Instead an "Error" window opens reading the raw code
"api.stats.400.wrongDateFormat"; behind it the range reads "All
dates", but the chart still shows the previous range.

The same happens on a journal whose earliest article is dated before
2001, as back issues can be; there the code is
"api.stats.400.earlyDateRange". Such a journal cannot see or download
its all-time article figures through "All dates".

A "Custom Range" starting at 2001-01-01 gives the figures "All dates"
should have shown, but nothing on screen points to it. Statistics ›
"Journal" and "Issues" are not affected.

## Impact

- **Lost.** The all-time article figures and their "Download Report"
  files, while "All dates" is chosen. After "OK" the previous range's
  chart stays under the "All dates" label, so the page misleads.
  Nothing stored is lost.
- **Who.** Journal managers and editors on Statistics › "Articles" (a
  press's "Monographs", a preprint server's "Preprints"). A journal
  whose earliest publication is dated before 2001-01-01 meets it every
  time, for good. A new journal meets it until its first publication,
  and has no figures to see yet.
- **Way round.** "Custom Range" from 2001-01-01 to yesterday. No
  install holds usage figures from before 2001-01-01, so that range is
  complete. The window shows only a code and does not suggest it.

Medium: on a journal with an article dated before 2001, the all-time
view fails and the page misleads, and a custom range on the same
control gets the figures. A journal with nothing published loses no
figures, only meets the window and the stale chart; that case alone
would be low.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`.

Nothing published (OJS; OMP and OPS the same with their own words):

1. Sign in as `admin`.
2. Open Administration › "Hosted Journals" › "Create Journal". Fill in
   "Journal title" `u64a Journal`, "Journal initials" `U64A`, the
   principal contact's name and email, "Country" Canada, "Path"
   `u64a`, tick English under "Languages" and "Primary locale", tick
   "Enable this journal to appear publicly on the site", and press
   "Save".
3. Open the new journal's Statistics › "Articles"
   (`/index.php/u64a/en/stats/publications/publications`).
4. Press the calendar button beside "2026-09-01 — 2026-10-01" (the
   last 30 days) and choose "All dates".

Earliest article dated before 2001 (OJS, the dataset's journal, whose
two published articles, submissions 1 and 17, are both dated the day
the dataset was built):

1. Sign in as `dbarnes`.
2. Open submission 17, "Antimicrobial, heavy metal resistance and
   plasmid profile of coliforms isolated from nosocomial infections in
   a hospital in Isfahan, Iran". In the top right of the workflow
   page, press "Unpublish", then "Unpublish" in the window.
3. In the workflow page's side menu, under "Publication", open
   "Publication Settings" (3.5: "Issue"), type `1999-06-01` in
   "Publication Date" (3.5: "Date Published") and press "Save".
4. In the top right, press "Schedule For Publication" (3.5:
   "Publish"). The article keeps its issue, so the window reads "This
   will be published immediately in Vol. 1 No. 2 (2014)"; press
   "Publish".
5. Open Statistics › "Articles" of `publicknowledge`, press the
   calendar button and choose "All dates".

**Expected.** The range reads "All dates", the chart shows one point
per month, starting at January 2001 on both paths, and the table shows
the articles' figures for the whole range, or "No articles were found
with usage statistics matching these parameters." when there are none.

**Observed.** One window opens:

```
Error
api.stats.400.wrongDateFormat
OK
```

(on the second path `api.stats.400.earlyDateRange`). Behind it the
range reads "All dates", "Monthly" is pressed and "Daily" greyed, but
the chart still shows the 31 daily points of the last 30 days, and
they stay after "OK". The list request and the two chart requests
answer 400, each with the same body:

```
GET /index.php/u64a/api/v1/stats/publications/timeline?timelineInterval=month   400
GET /index.php/u64a/api/v1/stats/publications?count=30&offset=0&orderBy=total&orderDirection=DESC   400
GET /index.php/u64a/api/v1/stats/publications/timeline?timelineInterval=month   400
{"error":"api.stats.400.wrongDateFormat"}
```

Control: on the same new journal, Statistics › "Journal" with "All
dates" opens no window and draws the chart monthly from January 2001.

## Cause

For "All dates" the page sends no start date.
`PKPStatsPublicationController::_processAllowedParams()` then fills
one in
([`api/v1/stats/publications/PKPStatsPublicationController.php`, line 810 on main](https://github.com/pkp/pkp-lib/blob/ddd8ab243a39584ce34cdcf379acb17b46e496b8/api/v1/stats/publications/PKPStatsPublicationController.php#L810)):

```php
$dateRange = Repo::publication()->getDateBoundaries(
    Repo::publication()->getCollector()->filterByContextIds([...])
);
$returnParams['dateStart'] = $dateRange->min_date_published;
```

The value is `MIN(p.date_published)` over the context's publications,
used as it comes. The collector is filtered by context only, not by
status, so it is the earliest date any publication row carries.

The default is never checked against the two rules the validator has
for a start date. `PKPBaseController::_validateStatDates()` wants a
`Y-m-d` date, no earlier than
`StatisticsHelper::STATISTICS_EARLIEST_DATE` (2001-01-01). When no
publication carries a date, the minimum is null and
`date_format:Y-m-d` fails (`api.stats.400.wrongDateFormat`). When the
minimum is before 2001, `after_or_equal` fails
(`api.stats.400.earlyDateRange`).

The validation runs in each endpoint, after `_processAllowedParams()`
returns and the endpoint's params hook has run. The list endpoints
(`getMany()`, `getManyTimeline()`, `getManyFiles()`,
`getManyCountries()`, `getManyRegions()`, `getManyCities()`) call
`validateParams()` (line 707), which throws, and answer 400 with the
exception's message. `get()` and `getTimeline()`, for one submission,
call `_validateStatDates()` themselves (lines 327 and 385) and answer
400 the same way.

The default came with `pkp/pkp-lib#5469`, so that "All dates" starts
the chart at the first publication instead of always in 2001. The
same change gave `PKPPublicationService::getDateBoundaries()` a
fallback to 2001-01-01 for an empty result. That fallback never ran:
an aggregate query always returns a row, so the empty case arrives as
a row of nulls. The later port to `Repo::publication()` dropped it.

The window shows the key because the answer's `error` is the locale
key, untranslated. On 3.4 and 3.3 `withJsonError()` also sends the
translated `errorMessage`, which the page shows first: "The date must
be in the format YYYY-MM-DD." and "The start date can not be earlier
than 2001-01-01." The Laravel routing port (`pkp/pkp-lib#9176`) lost
that. It is a separate fault, described in the last Reach bullet and
not covered by this report's fix; no issue report exists for it.

Reach, checked in the code unless marked:

- The list and the chart of Statistics › Articles: both fail (on
  screen, three apps, main and 3.5).
- "Download Report" under "All dates": `getReportParams()` in
  `StatsPublicationsPage.vue` (line 271) adds `dateStart` only when
  the page has one, as the list's `getParams()` does, and the
  download's error handler is `ajaxErrorCallback` (line 377). So each
  download ("Articles", "Files", "Timeline", "Geographic") answers 400
  and opens the same window.
- One submission's figures and timeline (`get()`, `getTimeline()`)
  answer 400 when called without a start date. No screen calls them.
- A context with no published item but a date typed on an unpublished
  publication takes that date as the start, because the collector has
  no status filter. It fails only when that date is before 2001.
- Statistics › "Journal" and "Issues" leave the start date unset, and
  their services use 2001-01-01: not affected (on screen for
  "Journal").
- The other readers of `getDateBoundaries()` handle a null or old date
  their own way. `CounterR5Report::getEarliestDate()` compares it with
  the COUNTER start date, and the search page's year range reads it
  with `substr()`. Neither fails.
- The raw keys: every caller of `_validateStatDates()` on main
  (publications, contexts, issues, editorial, users) returns the key in
  `error` with no translated message. With this report's fix the
  Statistics pages send no date the validator refuses ("Custom Range"
  refuses a bad date in the browser), so only direct API clients would
  still get the raw keys.

## Proposed fix

A proposal, tried on main:
[`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/all-dates-error-nothing-published/fix.diff),
applied to OJS, OMP and OPS. With it, both paths of the Steps show
Expected: no window, the range "All dates", a monthly chart from
January 2001 and the empty table line.

A control on the dataset's own journal, press and server, whose
published items are all dated the day of the walk, shows the fix
changes nothing there. With the fix in and out, "All dates" drew one
monthly point (October 2026) over the empty table line with no window,
and "Last 90 days" drew its four monthly points.

Recommended: in `_processAllowedParams()`, start at the later of the
first publication date and 2001-01-01:

```diff
-            $returnParams['dateStart'] = $dateRange->min_date_published;
+            $returnParams['dateStart'] = max(
+                (string) $dateRange->min_date_published,
+                StatisticsHelper::STATISTICS_EARLIEST_DATE
+            );
```

This keeps what `pkp/pkp-lib#5469` wanted, a chart that starts at the
first publication, and gives the fallback that change meant to have.
2001-01-01 is the default start of the context and issue services.
`StatisticsHelper` is already imported. The string comparison is safe:
`publications.date_published` is a `date` column in the three apps'
install migrations, so the value is a bare `Y-m-d` string.

The fix leaves the collector unfiltered: a date on an unpublished
publication still moves the start. Whether to filter by published
status is the team's call and does not change this fault.

**Alternatives:**

- Leave `dateStart` unset when no date is found, as the context and
  issue controllers do. This mends the empty journal only, not a
  publication dated before 2001.
- Put the fallback into `getDateBoundaries()`. That changes a method
  that the search page and COUNTER reports read for other purposes.
- Hide "All dates" or relax the validator. Either one changes what
  other API clients rely on.

**What goes with it:**

- No data repair. No API change except that requests that answered
  400 now answer.
- Backport: 3.5 has the same line (799); 3.4 the same code
  (`PKPStatsPublicationHandler.php`, line 757). 3.3 reads `$dateRange[0]`
  from `PKPPublicationService::getDateBoundaries()`, so the same
  `max()` applies there.
- The raw keys, separately: translating the key where the stats
  controllers answer (`__($result)`, or an `errorMessage` as
  `withJsonError()` gave on 3.4) would give API clients readable
  refusals again. Left out of the diff.
- Guard: an e2e scenario in pkp-e2e's usage statistics spec for "All
  dates" on a context with nothing published and on one with a pre-2001
  publication. pkp-lib has no unit tests for the stats controllers to
  extend.

Small: one expression in one shared pkp-lib method, plus a test.

## Evidence

- Kept script that takes the Steps:
  [`shared/playwright/checks/issues/all-dates-error-nothing-published/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/all-dates-error-nothing-published/walk.js)
  (helpers in `lib.js` beside it), run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all <walk.js>`:
  no argument for the first path, `old` for the second (OJS),
  `neighbour` for the fix's control. It ran on installs freshly loaded
  from PKP's default test dataset (pkp/datasets e8dafbc, 2026-10-02,
  the `main` and `stable-3_5_0` PostgreSQL dumps, no upgrade needed),
  and reads the window, the range, the chart's points and the stats
  requests' answers before and after "All dates".
- The fix was applied with `node bin/try-fix.js apply <fix.diff> ojs omp ops`:
  the first path on the three apps, the second on OJS, and the control
  on the three apps with the fix in and out.
- main walked at OJS b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
  64d67363), OMP 3b0ecf794c and OPS c8af945bb7 (lib/pkp 3dc90c81a6,
  lib/ui-library 280f98c5). 3.5 walked at OJS 091fb65453, OMP
  9c5e24246c and OPS 38b61882d3 (lib/pkp cf3f984335, lib/ui-library
  d4e01883). Both paths gave the same window, codes and 400 answers on
  3.5 as on main. On OMP and OPS the steps were taken with "Hosted
  Presses" › "Create Press" and "Hosted Servers" › "Create Server", and
  Statistics › "Monographs" and "Preprints". The second path was walked
  on OJS only; OMP and OPS read the same shared method.
- One window showed although three requests failed; why the page shows
  one was not traced.
- Code read on main: lib/pkp
  `api/v1/stats/publications/PKPStatsPublicationController.php`
  (`_processAllowedParams()`, `validateParams()` and the eight
  endpoints), `classes/core/PKPBaseController.php`
  (`_validateStatDates()`), `classes/publication/DAO.php`
  (`getDateBoundaries()`), the contexts, issues, editorial and users
  stats controllers, `classes/sushi/CounterR5Report.php`,
  `pages/search/SearchHandler.php`, and `date_published` in
  `OJSMigration.php`, `OMPMigration.php` and `OPSMigration.php`;
  lib/ui-library `src/components/Container/StatsPublicationsPage.vue`
  (`getParams()`, `getReportParams()`, the download request) and
  `src/mixins/ajaxError.js` (shows `errorMessage`, else `error`).
- 3.4 by code: lib/pkp `origin/stable-3_4_0` (e3fe148c54),
  `PKPStatsPublicationHandler.php` line 757, the same default, with
  `withJsonError()` sending the translated message; lib/ui-library
  (ee684b34) sends no `dateStart` for "All dates". Apps at OJS
  c1827e3527, OMP 0aec65441, OPS acd8ae704b.
- 3.3 by code: lib/pkp `origin/stable-3_3_0` (cb3525364d),
  `PKPStatsPublicationHandler.inc.php` line 619 (`$dateRange[0]`) with
  `PKPPublicationService::getDateBoundaries()` returning the aggregate
  row, nulls included, and the same validation in
  `APIHandler::_validateStatDates()`; lib/ui-library (96959f9e) the same
  request. Apps at OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161. The
  column type of `date_published` was not read on 3.4 and 3.3.
- Introduced: `git blame` on line 810 gives 1f48f6e414 (2021, the move
  to `Repo::publication()`) and e3f570bc37 (2021, PSR-12 formatting);
  `git log -S` on the comment above the line gives 60d23a612d, which
  added the default. It is in pkp-lib's first 3.2 tag (3_2_0-0) and the
  Articles statistics page was new in 3.2, so no release had a working
  "All dates" here: Kind defect.
- Upstream search, 2026-10-02, pkp/pkp-lib, pkp/ojs and
  pkp/ui-library, issues and PRs, open and closed, by the two codes,
  the window's sentences, "statistics "All dates"" and the method
  names. The only related item is `pkp/pkp-lib#5469` (closed), which
  added the default.
- The walks ran on PostgreSQL. MySQL not checked: `MIN()` of no rows
  is null there too.
- Not driven: "Download Report" under "All dates" (by code, in Reach),
  a context whose only dated publication is unpublished, and 3.4 and
  3.3. Unverified: how many journals date back content before 2001.
