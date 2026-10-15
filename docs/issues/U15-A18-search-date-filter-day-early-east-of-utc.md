# On a site east of UTC, the Search page's "Published After" and "Published Before" apply the day before the chosen date

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OPS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#11578` for `pkp/pkp-lib#8920` · [b44cf27793](https://github.com/pkp/pkp-lib/commit/b44cf277933) · 2025-08-01 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-15)
- **Tracked in** spec U15 [A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U15-search.md#a18)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a journal or preprint server whose site time zone (the `time_zone`
setting) is east of UTC, as in most of Europe, Africa, Asia and
Oceania, the Search page applies each full date chosen under
"Published After" or "Published Before" as the day before. "Published
After" then also lists the items published on the day before the
chosen date, and "Published Before" leaves them out.

The selects still show the date as chosen and no message appears; only
the dates printed under the extra "Published After" items give it
away. On a site at UTC or west of it, the default database search
keeps the chosen day.

## Impact

- **Lost**: one day's items at the edge of a date-limited search. In
  the default database search "Published Before" never includes its
  own date, so the day it loses
  is the one before: asking for items before 13 October leaves out
  those of 12 October.
- **Who**: readers of journals and preprint servers east of UTC who
  search by date, whenever items were published on the day before the
  chosen date. Only `main` has it; no release does, and the next
  release ships it unless it is fixed.
- **Way round**: a reader can choose the day after the intended date,
  but nothing says that is needed. An administrator can change
  `time_zone` only in `config.inc.php` (the install form is the one
  screen that sets it), and that changes the zone in which the whole
  site reads and writes its dates and times, so it is no way round.

Medium: a silent wrong result at the edge of a date-limited search, for
every site east of UTC once released.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main`, context `publicknowledge`, as a
  visitor (not signed in). Nothing is created.
- The site's time zone is "Europe/Prague": `time_zone = "Europe/Prague"`
  under `[general]` in `config.inc.php`, the setting the install form's
  "Time zone" writes. The dataset ships with "UTC".
- The dataset's published articles (OJS 1 and 17; OPS preprints 2, 3 and
  5 to 19) all carry one date: 12 October 2026 on the journal, 13
  October on the server, in the dataset used here. With another build,
  use the day after its date in steps 2 and 3.

Steps (journal; on the server use 14 October):
1. Open the journal's home page and press "Search" in the header.
2. Leave the box empty. Under "Published After" choose "2026", "Oct",
   "13" and press "Search".
3. Press "Search" in the header again for a fresh form. Under "Published
   Before" choose "2026", "Oct", "13" and press "Search".

[On 3.5 an empty box lists nothing whatever the filters, so type
"Antimicrobial" into the box in steps 2 and 3; it finds OJS article 17
and OPS preprint 17. The 3.5 dataset's preprints carry 12 October, so
use 13 October on the server too.]

**Expected**: step 2 reads "No Results", since both articles were
published on 12 October. Step 3 lists both articles.

**Observed**: step 2 lists both articles ("1 - 2 of 2 items"; on the
server, all 17 preprints, "1 - 17 of 17 items"), with the selects at
"2026", "Oct", "13". Step 3 reads "No Results". No error is shown, and
no request fails.

With `time_zone = "UTC"`, the same steps give the Expected. On 3.5 they
give the Expected in both zones.

## Cause

`PKPRequest::getUserDateVar()` turns the chosen date into a Unix
timestamp with `mktime()`, which runs in PHP's default zone, the site's
(`PKPApplication::initializeTimeZone()` sets it from `[general]
time_zone`). That timestamp is midnight of the chosen day on the site's
clock. `SubmissionSearchResult::builderFromRequest()` passes it to the
search driver as `publishedFrom` / `publishedTo`.

`DatabaseEngine::buildQuery()` (line 64) turns it into
`new \Carbon\Carbon($value)`. Given an integer, Carbon 3 builds the date
in UTC, not in PHP's default zone. Then `whereDate('p.date_published',
'>=' | '<', …)` (lines 160 and 161) keeps only that Carbon's `Y-m-d`.
Wherever the site's zone is ahead of UTC on that day, midnight on the
site's clock is still the day before in UTC, so the limit becomes the
day before. `p.date_published` holds the date on the site's clock, so
both sides of the comparison should be read there.

The line came with the Laravel Scout search of `pkp/pkp-lib#8920`. Up to
3.5, `ArticleSearch::getSearchFilters()` (OPS: `PreprintSearch`) turned
the same timestamp into `date('Y-m-d H:i:s', …)`, which keeps the site's
zone, and `ArticleSearchDAO` (OPS: `PreprintSearchDAO`, lines 70 and 74)
compared `p.date_published` with that.

Reach:
- The Search page of a journal and of a preprint server, both filters:
  walked on `main`. The site-wide Search page of a multi-journal site
  runs the same code (code).
- A category page (`PKPCatalogHandler`, line 76) builds its listing
  with the same `builderFromRequest()`, and its page links carry the
  `dateFrom*` / `dateTo*` parameters of the address, so a dated
  category address gets the same shift (code; no screen offers dates
  there). The fix covers it.
- A press's Search page has no date selects (code).
- The OpenSearch driver (`[search] driver = opensearch`) builds the same
  UTC Carbon (line 290) and sends it in its `range` as a UTC time
  (`"2026-10-12T22:00:00.000000Z"` for 13 October in Prague), against
  `datePublished` indexed as a bare `Y-m-d`. So a site east of UTC keeps
  the chosen day under "Published After" but loses it under "Published
  Before"; a site west of UTC loses the chosen day's items under
  "Published After" (code; OpenSearch not driven).
- Partial dates are ignored on `main` today (spec U15
  [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U15-search.md#a1),
  [its report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U15-A1-partial-date-filter-ignored.md)).
  Once that is fixed, they get the same shift through the same lines.

## Proposed fix

Proposed: in each search driver, read the limit as a day on the site's
clock. In `DatabaseEngine::buildQuery()`:

```php
'publishedFrom', 'publishedTo' => $value ? \Carbon\Carbon::createFromTimestamp($value, date_default_timezone_get()) : null,
```

and in `OpenSearchEngine`, the same date sent as a `Y-m-d` string
(`toDateString()`), which compares with the indexed `Y-m-d` dates:

```php
$$field = \Carbon\Carbon::createFromTimestamp($value, date_default_timezone_get())->toDateString();
```

(diff:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/search-date-filter-day-early-east-of-utc/fix.diff)).
The drivers own the step where a timestamp becomes a date, so the fix
goes there and covers every caller of `builderFromRequest()`. It
follows `pkp/pkp-lib#10813`, which fixed the same mistake (a timestamp
handed to `new \Carbon\Carbon()`) in the statistics chart labels
([5ca591d18d](https://github.com/pkp/pkp-lib/commit/5ca591d18d)).

Tried on `main`, OJS and OPS: with "Europe/Prague", step 2 reads "No
Results" and step 3 lists every item; with "UTC" the results are the
same as before the fix. Under "UTC" and "America/Vancouver", "Published
After" and "Published Before" on the dataset's date and on the day
after gave the same results with the fix in and out. The OpenSearch
line was not tried (no OpenSearch server); its value was checked in
PHP only.

**Alternatives**:
- Have `builderFromRequest()` pass a date string instead of a
  timestamp. Listeners on the `SubmissionSearchResult::builderFromRequest`
  hook would get a new type, and a plugin driver reading the value as a
  timestamp would break.
- Store and compare in UTC throughout. That is a migration of stored
  dates and a far larger change.

**What goes with it**:
- No stored data is involved, and the values the
  `SubmissionSearchResult::builderFromRequest` hook sees are unchanged.
- OpenSearch: the range in `$filter`, which `OpenSearchEngine` passes
  by reference to the `OpenSearchEngine::buildQuery` hook (line 356),
  now holds `Y-m-d` strings instead of Carbon objects. A listener that
  calls Carbon methods on them would have to change; no plugin bundled
  with OJS, OMP or OPS listens to that hook.
- Whether "Published Before" includes its own day is open, and the two
  drivers disagree (`<` against `lte`; spec U15
  [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U15-search.md#a2)).
  This fix keeps each driver's comparison.
- Partial dates are a separate fault
  ([U15 A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U15-A1-partial-date-filter-ignored.md));
  the two fixes can land in either order.
- The same mistake elsewhere: `ReviewAssignmentEmailVariable::formatDate()`
  formats review dates in emails through `new \Carbon\Carbon($time)`,
  tracked as `pkp/pkp-lib#10579` (open), left out here.
- Guard: lib/pkp has no test of either driver. A unit test can call the
  protected `DatabaseEngine::buildQuery()` through reflection with PHP's
  zone set to Europe/Prague and a builder limit of 13 October, and
  assert that the query's `getBindings()` hold `2026-10-13`
  (`whereDate()` binds the Carbon's `Y-m-d`). Also an e2e check in
  pkp-e2e's search spec with the site's `time_zone` east of UTC.

Small: two lines in pkp-lib, tried for the database driver, plus a unit
test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/search-date-filter-day-early-east-of-utc/walk.js)
  (it uses the helpers of the U15 A1 script's `lib.js`) takes the Steps
  as a visitor on OJS and OPS, first with `time_zone` set to
  Europe/Prague in the install's config, then to UTC, and puts the
  setting back. `NB=1` runs the fix trial's nearby cases (UTC and
  America/Vancouver). Run it from the pkp-e2e repo on an install loaded
  from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,ops shared/playwright/checks/issues/search-date-filter-day-early-east-of-utc/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0 QUERY=Antimicrobial` in front for 3.5).
- Walked on `main` and `stable-3_5_0`, OJS and OPS, on PostgreSQL, each
  install freshly loaded from pkp/datasets 7912e09 (2026-10-14). The
  fix trial applied the diff to OJS and OPS on `main`; the nearby cases
  ran with it and without it. The fault does not depend on the database
  (MySQL not checked).
- Checked in PHP with the lib's vendor (Carbon 3): for 13 October 2026,
  `new \Carbon\Carbon(mktime(…))` gives 2026-10-12 under Europe/Prague
  and Asia/Tokyo and 2026-10-13 under UTC and America/Vancouver; with
  `createFromTimestamp(…, date_default_timezone_get())` all four give
  2026-10-13. `json_encode()` of the current OpenSearch value gives
  `2026-10-12T22:00:00.000000Z` (Prague) and `2026-10-13T07:00:00.000000Z`
  (Vancouver).
- Tips (2026-10-15): `main` OJS 378eced941, OMP f4836d4fb, OPS
  2ece50497f, each with lib/pkp b17fadae59; `stable-3_5_0` OJS
  ca763c91cd, OMP a70bbb9c4, OPS 44aec6e131, each with lib/pkp
  4045d9241e; `stable-3_4_0` OJS daf0ca971d, OPS acd8ae704b, lib/pkp
  55c8e406b3; `stable-3_3_0` OJS d7d9dd14ec, OPS c5532e2161, lib/pkp
  5e84acd11b.
- Code reads: on `main`, `PKPRequest::getUserDateVar()`,
  `PKPApplication::initializeTimeZone()`,
  `SubmissionSearchResult::builderFromRequest()`, `DatabaseEngine`
  (lines 64, 160 and 161), `OpenSearchEngine` (the `datePublished`
  index field, line 189, its `date` mapping, and lines 290 and 304), the
  `publication` schema's `datePublished` (`date_format:Y-m-d`), and the
  other `new \Carbon\Carbon(` and `Carbon::createFromTimestamp(` calls
  in lib/pkp. On 3.5, 3.4 (`upstream/stable-3_4_0`) and 3.3
  (`upstream/stable-3_3_0`): OJS `ArticleSearch::getSearchFilters()`
  and OPS `PreprintSearch::getSearchFilters()` (`date('Y-m-d H:i:s', …)`
  in the site's zone), and on 3.5 `ArticleSearchDAO` (`p.date_published`
  against that string).
- Introduced: `git blame` of `DatabaseEngine.php` lines 64, 160 and 161
  gives b44cf27793, "pkp/pkp-lib#8920 Implement Laravel Scout and
  Opensearch (#11578)". The OpenSearch line was moved by ad87af40bd
  (2025-09-14, plugin hooks) from the same commit.
- Upstream, related but not the same fault: `pkp/pkp-lib#10579` (open; review
  email dates, the same mistake) and `pkp/pkp-lib#10813` (closed;
  statistics labels, fixed in 5ca591d18d).
- Unverified: the OpenSearch driver, its fault and its fix line, read
  in the code and checked in PHP only (no OpenSearch server).
