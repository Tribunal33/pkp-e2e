# A Search date filter chosen without its Month or Day is ignored and comes back showing another date

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OPS
  - 3.5: OJS, OPS (the wrong date in the selects only)
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced**
  - the filter ignored (`main`): `pkp/ojs#4963` and `pkp/ops#1067` for `pkp/pkp-lib#8920` · [71a7bfccec](https://github.com/pkp/ojs/commit/71a7bfccec891e519f676c8edbdf36f0265923da) · 2025-08-01 · Alec Smecher (asmecher)
  - the wrong date in the selects (`main`, 3.5): for `pkp/pkp-lib#10371` · [49d67ee7f9](https://github.com/pkp/pkp-lib/commit/49d67ee7f97dd9ab5292d410cb06e8bdd5de3f4e); 3.5 [a2836ee0a4](https://github.com/pkp/ojs/commit/a2836ee0a496ca6009155e67f81eeeb5f4d32f60), [2e9c5f5cfd](https://github.com/pkp/ops/commit/2e9c5f5cfd7deb828a2792fe80dc04a8c00562d1) · 2026-06-01 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-15)
- **Tracked in** spec U15 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U15-search.md#a1)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

Update 2026-10-15: the earlier note on sites east of UTC was wrong. The
one-day shift there is a separate fault with its own report (spec U15
A18), and this fix was also tried on such a site.

## Summary

A reader on the Search page who sets "Published After" or "Published
Before" to a Year alone, or to a Year and Month without a Day, and
presses "Search" gets every result, as if no date had been chosen. The
selects then show a date the reader never chose: a Year alone comes back
as 30 November of the year before, a Year and Month as the last day of
the month before. When the year before is not in the "Year" list, the
Year select comes back blank. Pressing "Search" again from that form
searches by the date shown, or with no date at all when the Year is
blank.

Choosing all three parts works, but the selects start blank and
nothing asks for all three. On 3.5 the first search is filtered
correctly, but the form comes back showing the wrong date, and pressing
"Search" again searches by it. A press's Search page has no date
filters.

## Impact

- **Lost**: on `main`, the date limit of the first search; on `main`
  and 3.5, that of a search repeated from the redrawn form. Nothing
  tells the reader.
- **Who**: readers of every journal and preprint server who narrow a
  search by date. The "Published After" and "Published Before" selects
  are always shown, under "Advanced filters" below the search box, and
  a Year alone is the natural way to use them.
- **Way round**: choose Year, Month and Day; a full date is applied
  and shown as chosen. On a site whose time zone is east of UTC (most
  of Europe, Africa, Asia and Oceania), a full date is applied a day
  early, with the built-in database search and with OpenSearch alike;
  that is a separate fault with its own report, and the fix here is
  complete without it and can land before or after it.

Medium: the filter is silently ignored, but a full date works. It would
be high if a full date failed too.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main`, context `publicknowledge`, as a
  visitor (not signed in). Nothing is created.
- The dataset's published articles (OJS 1 and 17; OPS preprints 2, 3
  and 5 to 19) all carry one date near the day the dataset was built
  (12 October 2026 on the journal, 13 October on the server, in the
  dataset used here), so each "Year" list offers that one year. The
  Steps assume a build after January; with another year, use that
  year.

Steps (journal; a preprint server is the same):
1. Open the journal's home page and press "Search" in the header. The
   Search page opens with an empty box; under "Advanced filters",
   "Published After" and "Published Before" each have blank "Year",
   "Month" and "Day" selects.
2. Leave the box empty. Under "Published Before" choose Year "2026" and
   Month "Jan", leave Day blank, and press "Search".
3. Press "Search" in the header again for a fresh form. Under
   "Published After" choose Year "2026" only and press "Search".
4. (Control) Fresh form again. Under "Published Before" choose "2026",
   "Jan", "31" and press "Search".

[On 3.5 an empty box lists nothing whatever the filters, so type
"Antimicrobial" into the box in steps 2 to 4; it finds OJS article 17
and OPS preprint 17.]

**Expected**: step 2 reads "No Results", since nothing was published by
January 2026, and the "Published Before" selects show the date applied,
"2026", "Jan", "31". Step 3 lists every article, and the "Published
After" selects read "2026", "Jan", "1". Step 4 is the same as step 2.

**Observed**: step 2 lists every article ("1 - 2 of 2 items" on the
journal, "1 - 17 of 17 items" on the server). Its address keeps the
choice (`…/search/index?query=&dateFromYear=&dateFromMonth=&dateFromDay=&dateToYear=2026&dateToMonth=1&dateToDay=`),
but the "Published Before" selects read Year blank, "Dec", "31". Step 3
lists every article, and the "Published After" selects read Year blank,
"Nov", "30". No error is shown, and no request fails.

The control, step 4, reads "No Results" with the selects at "2026",
"Jan", "31". On 3.5, step 2 reads "No Results" (the filter is applied),
but the selects read blank, "Dec", "31", and step 3's read blank,
"Nov", "30", as on `main`.

## Cause

The Search page reads its date filters twice from the same six request
parameters (`dateFromYear`, `dateFromMonth`, `dateFromDay` and the
`dateTo` three): once for the query, once to redraw the selects. Up to
3.4 both readings filled a blank Month or Day with the start of the
period for "Published After" and its end for "Published Before".
`ArticleSearch::getSearchFilters()` (OPS: `PreprintSearch`) called
`getUserDateVar('dateFrom', 1, 1)` and
`getUserDateVar('dateTo', 32, 12, null, 23, 59, 59)`, and
`SearchHandler::search()` used `empty($month) ? $defaultMonth : $month`
with the same defaults. Since then each reading has broken
separately.

**The query** (`main` only). The search rewrite for
`pkp/pkp-lib#8920` (71a7bfccec in OJS, 43359941c6 in OPS) replaced
`getSearchFilters()` with `$request->getUserDateVar('dateFrom')` and
`getUserDateVar('dateTo')`, without defaults. The code now sits in
`PKP\search\SubmissionSearchResult::builderFromRequest()`, lines 39 and
40, moved there in
[7157287a85](https://github.com/pkp/pkp-lib/commit/7157287a85d94e40c04fbd4ad854d3c01baa3641).
`PKPRequest::getUserDateVar()` returns `null` when the month or the day
is missing, so the builder gets `publishedFrom` / `publishedTo` = null,
and `DatabaseEngine` (like `OpenSearchEngine`) adds no date condition.

**The selects** (`main` and 3.5). For `pkp/pkp-lib#10371`, a fatal
`TypeError` from `mktime()` on a typed `dateFromYear=2021xx`, the
handler's defaults became
`filter_var($month, FILTER_VALIDATE_INT, ['min_range' => 1, 'max_range' => 12, 'default' => $defaultMonth])`,
the same for the day and year. On `main` this is
`PKP\pages\search\SearchHandler::_assignDateFromTo()`, lines 103 to 105.
On 3.5 it is the app's own `SearchHandler::search()` in OJS and OPS.
`filter_var()` reads `min_range`, `max_range` and `default` only under
an `options` key. Given flat, they are ignored, so a blank part returns
`false`, and `mktime()` takes it as 0. Month 0 and day 0 count back:
`mktime(0, 0, 0, 0, 0, 2026)` is 30 November 2025, and
`mktime(0, 0, 0, 1, 0, 2026)` is 31 December 2025.
`html_select_date_a11y` then selects those parts, and the Year select
stays blank when that year is outside `yearStart`–`yearEnd`.

Reach:
- The Search page of a journal and of a preprint server, under both
  filters: walked on `main` and 3.5. A Year and Day without a Month
  comes back as that day of the December before (code: `mktime()` month
  0).
- The site-wide Search page of a multi-journal site runs the same
  handler, so it has the same fault (code).
- A press's Search page has no date selects, so the fault does not
  show there. The category and series pages call
  `builderFromRequest()` (`PKPCatalogHandler`) without date parameters
  (code).
- The page links (`page_links`) pass on the raw parts, so page 2 drops
  the filter and redraws the selects the same way (code).
- On a site whose time zone is east of UTC, both search drivers PKP
  ships on `main` (`DatabaseEngine`, the default, and `OpenSearchEngine`)
  read every date limit as the day before: `new \Carbon\Carbon($value)`
  turns the timestamp into a UTC date. That is a separate fault from
  the same `pkp/pkp-lib#8920` change set
  ([b44cf27793](https://github.com/pkp/pkp-lib/commit/b44cf277933),
  spec U15 [A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U15-search.md#a18)).
  It shifts full dates today, and partial dates too once this fault is
  fixed (read in the code, and walked with the fix applied: see
  Proposed fix).
- `PKPRequest::getUserDateVar()` has the same flat options in its
  range check
  ([244448ae8e](https://github.com/pkp/pkp-lib/commit/244448ae8e48acb18aff98bdb6c70cf9d92d193f),
  3.5 [9b601a9f38](https://github.com/pkp/pkp-lib/commit/9b601a9f384496184188e6bf6c428e64dc57e117)),
  so the check only asks for an integer: a typed month of 13 rolls over
  instead of being refused. No screen sends one (code).

## Proposed fix

Proposed: read the date once, in pkp-lib's `SubmissionSearchResult`, and have the
selects show what that reading applied. A new
`SubmissionSearchResult::getDateFilter()` fills a blank Month or Day
with the start of the period (dateFrom) or its last day (dateTo).
`builderFromRequest()` uses it for the query, and
`SearchHandler::_assignDateFromTo()` uses it in place of its own
`mktime()` (diff:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/partial-date-filter-ignored/fix.diff)):

```php
public static function getDateFilter(PKPRequest $request, string $prefix): ?int
{
    $year = filter_var($request->getUserVar("{$prefix}Year"), FILTER_VALIDATE_INT);
    if ($year === false) {
        return null;
    }
    $isEnd = $prefix === 'dateTo';
    $month = filter_var($request->getUserVar("{$prefix}Month"), FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 12, 'default' => $isEnd ? 12 : 1]]);
    $lastDay = (int) date('t', mktime(0, 0, 0, $month, 1, $year));
    $day = filter_var($request->getUserVar("{$prefix}Day"), FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 31, 'default' => $isEnd ? $lastDay : 1]]);
    return mktime(0, 0, 0, $month, $day, $year);
}
```

With one reading, the query and the selects cannot drift apart again,
and the rule lives in the shared class that every app's search uses.
The start of a period is 3.4's default (1 January, or the 1st of the
month). Every part is checked as an integer before `mktime()`, which
keeps `pkp/pkp-lib#10371`'s protection: `2021xx` as a Year means no
limit, and a garbage Month or Day takes the default.

The end of a period is its last day at midnight, compared the way
`main` compares a full date today. `DatabaseEngine` keeps only items
published before that day (`<`), so a partial "Published Before"
leaves out the items of its last day: a Year alone ends before
31 December, and "2026" + "Jan" before 31 January. 3.5 and 3.4 kept
them: they compared with `<=` against "day 32" at 23:59:59, which
also took in the first day of the next month. Whether "Published
Before" includes its day is open for full dates too, and the two
`main` search drivers disagree (`OpenSearchEngine` uses `lte`; spec U15
[A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U15-search.md#a2)).
The fix follows whatever the team rules for a full date. If the ruling
is "inclusive", one line changes: return `mktime(23, 59, 59, …)` for
`dateTo` with an inclusive comparison, or return the next period's
first day and keep `<`.

The limit is midnight of the day in the site's time zone: `mktime()`
runs in PHP's default zone, which
`PKPApplication::initializeTimeZone()` sets from `[general] time_zone`.
A full date gets the same value from `getUserDateVar()`, and 3.5's
query compares dates in that zone. On a site east of UTC the day is
lost later, in both search drivers (A18, Cause). There, with this fix
alone, a partial limit moves one day earlier, as a full date's does
today: "After" also takes in the day before, and "Before" stops a day
sooner. A18's own fix goes in the drivers, where the timestamp becomes
a date (`\Carbon\Carbon::createFromTimestamp($value, date_default_timezone_get())`
in place of `new \Carbon\Carbon($value)`), and covers full and
partial dates alike.

Tried on `main`, OJS and OPS, with the site's time zone at UTC and at
Europe/Prague: steps 2 and 3 now give the Expected in both zones ("No
Results" under "2026", "Jan", "31"; every article under "2026", "Jan",
"1"), and step 4 is unchanged. Nearby cases, walked with the fix in and
out:
- Month and Day without a Year stay ignored, with blank selects (OJS,
  OPS).
- Full dates apply as before: "Published Before 2 Oct 2026" lists
  nothing and "Published After" it lists every item (OJS, OPS).
- A press's Search page still finds its books (OMP).
- On a journal and a server with items published 31 December 2024,
  1, 30 and 31 January and 1 February 2025: under UTC the fix applies
  "Published After 2025", "Published After 2025 Feb" and "Published
  Before 2025 Jan" on the chosen day (from 1 January; 1 February only;
  up to 30 January). Under Europe/Prague each lands a day early: the
  two "After" filters also list 31 December and 31 January, and "Before
  2025 Jan" leaves out 30 January. The full date "Before 2025 Jan 31"
  has the same shift with or without the fix (A18). With A18's change
  added, the three partial filters and the full date all land on the
  chosen day in both zones.

**Alternatives**:
- Give `builderFromRequest()` back the defaults
  (`getUserDateVar('dateFrom', 1, 1)`, `getUserDateVar('dateTo', 31, 12)`)
  and add the `options` key in the handler. This is smaller, but it
  keeps two readings that have already drifted twice. A Month without
  a Day under "Published Before" would also roll into the next month
  (June 31 becomes 1 July), and the selects would show that date.
- Redraw the reader's own partial choice (Year only) rather than the
  date applied. The `html_select_date_a11y` helper takes one date, so
  this is a larger change, and it hides which day the search used.
- Refuse a partial date with a message. That is a product decision,
  and the blank selects invite a partial choice.
- Return the limit with its zone (a `Y-m-d` string, or a Carbon in the
  site's zone) so that today's drivers read the right day. That would
  also fix the Search page's full dates (A18). But listeners on the
  `builderFromRequest` hook would get a string or a Carbon instead of
  an integer, and it cannot be combined with A18's fix: given either
  value, `createFromTimestamp()` returns 1 January 1970 (checked in
  PHP).

**What goes with it**:
- No stored data is involved. `_assignDateFromTo()` keeps its
  signature. Hook listeners on `SubmissionSearchResult::builderFromRequest`
  now see `publishedFrom` / `publishedTo` set for a partial choice.
- 3.5 needs only the selects fixed, because its query still applies
  the defaults. Adding the `options` key to the three `filter_var()`
  calls in OJS's and OPS's `pages/search/SearchHandler.php` brings back
  the 3.4 display for Month and Day. The Year call should then drop its
  `default => date('Y')`: honoured, it would show 1 January of the
  current year for a non-numeric Year, while 3.5's query applies no
  limit (no screen sends one).
- Whoever backports the `pkp/pkp-lib#10371` patches to
  `stable-3_4_0` (its thread says they apply there) should add the
  `options` key, or 3.4 gets the selects fault.
- `getUserDateVar()`'s own flat options (Reach, last bullet) are left
  out. With its range honoured, 3.5's
  `getUserDateVar('dateTo', 32, 12, …)` would return null, so 3.5's
  `ArticleSearch` and `PreprintSearch` would have to change first.
- On a site east of UTC, partial dates land on the chosen day only
  once A18's fix is in as well. The two fixes touch different lines
  and can land in either order.
- A Year of "0" now gives a limit in the year 2000 (`mktime()` reads
  years 0 to 69 as 2000 to 2069), where `empty($year)` gave none. No
  screen sends it; `'min_range' => 1` on the Year keeps "no limit".
- A full date past the month's end ("Feb", "31") rolls into March in
  the query and the selects alike, today and with the fix; the fix does
  not change it.
- Guard: a unit test of `getDateFilter()` (Year alone, Year and Month,
  Year and Day, no Year, a Year of "0", a full date, a non-numeric
  part). Also an e2e
  check that a Year alone under "Published After" and a Year and Month
  under "Published Before" narrow the results and redraw the applied
  date, in pkp-e2e's search spec.

Small: one helper and two call sites in pkp-lib, tried, plus a unit
test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/partial-date-filter-ignored/walk.js)
  (helpers in `lib.js` beside it) takes the Steps as a visitor on OJS
  and OPS and records the results and every select after each search.
  Switches for the fix trial: `ZONE=<zone>` (the site's `time_zone`,
  put back at the end), `NB=1` and `NB=zone` (the nearby cases; the
  latter builds a scratch journal or server with the five dated
  items). Run it
  from the pkp-e2e repo on an install loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/partial-date-filter-ignored/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0 QUERY=Antimicrobial` in front for 3.5).
- Walked on `main` and `stable-3_5_0`, OJS and OPS, on PostgreSQL, each
  install freshly loaded from pkp/datasets 7912e09 (2026-10-14), on
  2026-10-15 (first walked 2026-10-03 on e8dafbc, with the same
  results). The fix trial applied
  [fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/partial-date-filter-ignored/fix.diff)
  to OJS, OMP and OPS on `main`. The trial of this fix together with
  A18's change applied
  [trial-with-a18.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/partial-date-filter-ignored/trial-with-a18.diff)
  (fix.diff plus the two drivers' lines) for `NB=zone` alone. The
  fault does not depend on the database (MySQL not checked).
- Time zone: the Steps' walks ran with `time_zone = UTC`, as the test
  installs are set. The day a limit lands on east of UTC is spec U15
  [A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U15-search.md#a18);
  3.5 has no such shift (A18's footnote). Checked in PHP with the lib's vendor: the fix's
  `getDateFilter()` fills a partial date to the same day in UTC,
  Europe/Prague, Asia/Tokyo and America/Vancouver (Year 2025 under
  "Published After" is 2025-01-01, 2025 + Jan under "Published Before"
  2025-01-31); `new \Carbon\Carbon($value)` turns the Prague and Tokyo
  limits into the day before, and
  `Carbon::createFromTimestamp($value, date_default_timezone_get())`
  keeps the day in all four.
- Tips (2026-10-15): `main` OJS 378eced941, OMP f4836d4fb, OPS
  2ece50497f, each with lib/pkp b17fadae59; `stable-3_5_0` OJS
  ca763c91cd, OMP a70bbb9c4, OPS 44aec6e131, each with lib/pkp
  4045d9241e; `stable-3_4_0` OJS daf0ca971d, OMP 0aec65441f, OPS
  acd8ae704b, lib/pkp 55c8e406b3; `stable-3_3_0` OJS d7d9dd14ec, OMP
  8e72fc8836, OPS c5532e2161, lib/pkp 5e84acd11b. The changed files
  are identical in the three `main` checkouts.
- Code reads: on `main`, `SubmissionSearchResult::builderFromRequest()`,
  `SearchHandler::search()` and `_assignDateFromTo()`,
  `PKPRequest::getUserDateVar()`,
  `PKPTemplateManager::smartyHtmlSelectDateA11y()`,
  `DatabaseEngine` and `OpenSearchEngine` (the `publishedFrom` /
  `publishedTo` conditions), `PKPCatalogHandler`, and both apps'
  `templates/frontend/pages/search.tpl`. On 3.5, OJS's and OPS's
  `pages/search/SearchHandler.php` (flat `filter_var` options),
  `ArticleSearch` / `PreprintSearch::getSearchFilters()` (the defaults
  kept) and `PKPRequest::getUserDateVar()`. On 3.4 and 3.3, the same
  handler and search class in OJS and OPS: `empty($month) ? $defaultMonth : $month`
  and the `getUserDateVar()` defaults, with an `empty()` check in
  `getUserDateVar()`.
- Introduced: the OPS twin of 71a7bfccec is
  [43359941c6](https://github.com/pkp/ops/commit/43359941c6c51896b62723dcaf74bbf375bd2082).
  The handler code moved to pkp-lib in
  [24553ea4aa](https://github.com/pkp/pkp-lib/commit/24553ea4aaf13dd5ca5c709a2254ae21be11a08e)
  and the query to `SubmissionSearchResult` in 7157287a85, both
  2026-01-09, unchanged. 49d67ee7f9 (pkp-lib, `main`), a2836ee0a4 (OJS,
  3.5) and 2e9c5f5cfd (OPS, 3.5) were pushed for `pkp/pkp-lib#10371`
  without a pull request.
- Code read, not walked: a search repeated from the redrawn form (the
  Impact's "Lost"). The selects submit what they show, and with a blank
  Year `getUserDateVar()` returns null on both lines. The default
  dataset has one year of publications, so the full-date case (the
  year before in the list) is not reached on it; on the `NB=zone`
  scratch journal and server, without the fix, "Published After 2025"
  came back as "2024", "Nov", "30", but "Search" was not pressed again
  from there.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/ops and pkp/ui-library searched
  for the symptom (search date filter, "published after", "published
  before" month, year ignored, wrong date selected) and for
  `getUserDateVar`, `_assignDateFromTo`, `dateFromYear`,
  `html_select_date_a11y` and `SubmissionSearchResult`. Related but not
  the same fault: `pkp/pkp-lib#12862` (open; filter usability for a new
  theme; its criteria expect a Year alone to apply), `pkp/pkp-lib#13006`
  (open; 3.5 lists nothing for an empty box, the reason for the 3.5
  bracket in the Steps), `pkp/pkp-lib#13307` (closed; labels for the
  same selects) and `pkp/pkp-lib#10371` (closed; the change above).
  Searched again 2026-10-15, with "search timezone published" added.
- Not checked: the OpenSearch engine (not driven; it gets the same null
  limit from the builder, and the A18 line in it was applied but not
  exercised); 3.4 and 3.3 were not walked.
