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
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U15 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U15-search.md#a1)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

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
nothing asks for all three. The ignored filter is on `main` only, the
coming 3.6. On 3.5 the first search is filtered correctly, and the
wrong date in the selects is what a repeated search uses. A press's
Search page has no date filters.

## Impact

- **Lost**: on `main`, the date limit of the first search. On `main`
  and 3.5, the date limit of any search repeated from the redrawn form:
  it uses 30 November of the year before (or the last day of the
  month before) when that year is in the list, or with no date
  limit when the Year came back blank. Nothing tells the reader.
- **Who**: readers of every journal and preprint server who use the
  advanced filters. A Year alone is the natural way to use them, since
  every part starts blank.
- **Way round**: choose Year, Month and Day; a full date is applied
  and shown as chosen.

Medium, rated on `main` as it will ship in 3.6. It would be high if a
full date failed too.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main`, context `publicknowledge`, as a
  visitor (not signed in). Nothing is created.
- The dataset's published articles (OJS 1 and 17; OPS preprints 2, 3
  and 5 to 19) all carry the date the dataset was built, 2 October 2026
  in the dataset used here, so each "Year" list offers that one year.
  With another build date, use its year, and in step 2 a month before
  the publication month; for a January build, set "Published After" to
  the Year and Month "Dec" in step 2 instead (nothing was published
  from December on).

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
`main` engines disagree (`OpenSearchEngine` uses `lte`; spec U15
[A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U15-search.md#a2)).
The fix follows whatever the team rules for a full date. If the ruling
is "inclusive", one line changes: return `mktime(23, 59, 59, …)` for
`dateTo` with an inclusive comparison, or return the next period's
first day and keep `<`.

Tried on `main`, OJS and OPS: steps 2 and 3 now give the Expected
("No Results" under "2026", "Jan", "31"; every article under "2026",
"Jan", "1"), and step 4 is unchanged. Three nearby cases were also
walked with the fix in and out, on OJS, OPS and OMP, and gave the same
results both times:
- Month and Day without a Year stay ignored, with blank selects.
- A full date keeps `main`'s rule: "Published Before 2 Oct 2026" still
  lists nothing published on 2 October.
- A press's Search page still finds its books.

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

**What goes with it**:
- No stored data is involved. `_assignDateFromTo()` keeps its
  signature. Hook listeners on `SubmissionSearchResult::builderFromRequest`
  now see `publishedFrom` / `publishedTo` set for a partial choice.
- 3.5 needs only the selects fixed, because its query still applies
  the defaults. Adding the `options` key to the three `filter_var()`
  calls in OJS's and OPS's `pages/search/SearchHandler.php` brings back
  the 3.4 display.
- Whoever backports the `pkp/pkp-lib#10371` patches to
  `stable-3_4_0` (its thread says they apply there) should add the
  `options` key, or 3.4 gets the selects fault.
- `getUserDateVar()`'s own flat options (Reach, last bullet) are left
  out. With its range honoured, 3.5's
  `getUserDateVar('dateTo', 32, 12, …)` would return null, so 3.5's
  `ArticleSearch` and `PreprintSearch` would have to change first.
- Guard: a unit test of `getDateFilter()` (Year alone, Year and Month,
  Year and Day, no Year, a full date, a non-numeric part). Also an e2e
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
  `NB=1` runs the three nearby cases of the fix trial alone (OJS, OPS
  and OMP). Run it from
  the pkp-e2e repo on an install loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/partial-date-filter-ignored/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0 QUERY=Antimicrobial` in front for 3.5).
- Walked on `main` and `stable-3_5_0`, OJS and OPS, on PostgreSQL, each
  install freshly loaded from pkp/datasets e8dafbc (2026-10-02). The fix
  trial and the nearby cases were walked on `main` with the diff
  applied to OJS, OMP and OPS, and the nearby cases again without it.
  The fault does not depend on the database (MySQL not checked).
- Timezone: the walks ran with `time_zone = UTC`. Both `main` engines
  turn the timestamp into `new \Carbon\Carbon($value)`, which is UTC,
  while `mktime()` uses the site's zone. On a site east of UTC every
  date limit, full or partial, therefore falls on the day before
  (checked in PHP with `Europe/Prague`: 31 January 2026 became
  `2026-01-30 23:00 UTC`). This is older than this fault and was not
  walked.
- Tips: `main` OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794c and
  OPS c8af945bb7 (lib/pkp 3dc90c81a6); `stable-3_5_0` OJS c1cee76b95
  (lib/pkp 771474347e), OMP 9c5e24246c, OPS 38b61882d3 (lib/pkp
  cf3f984335); `stable-3_4_0` OJS d68934d0d1, OMP 0aec65441f, OPS
  acd8ae704b, lib/pkp 767353f4fe; `stable-3_3_0` OJS ac77c9fb35, OMP
  8e72fc8836, OPS c5532e2161, lib/pkp ac3fa73402. The two changed files
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
  year before in the list) could not be reached on it.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/ops and pkp/ui-library searched
  for the symptom (search date filter, "published after", "published
  before" month, year ignored, wrong date selected) and for
  `getUserDateVar`, `_assignDateFromTo`, `dateFromYear`,
  `html_select_date_a11y` and `SubmissionSearchResult`. Related but not
  the same fault: `pkp/pkp-lib#12862` (open; filter usability for a new
  theme; its criteria expect a Year alone to apply), `pkp/pkp-lib#13006`
  (open; 3.5 lists nothing for an empty box, the reason for the 3.5
  bracket in the Steps) and `pkp/pkp-lib#10371` (closed; the change
  above).
- Not checked: the OpenSearch engine (not driven; it gets the same null
  limit from the builder); 3.4 and 3.3 were not walked.
