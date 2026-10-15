# Statistics: a refused date range shows a raw code like "api.stats.400.wrongDateFormat", not a sentence

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; the answer carries the sentence)
  - 3.3: none (code; the answer carries the sentence)
- **Introduced** `pkp/pkp-lib#9176` for `pkp/pkp-lib#7698` · [71e79e31e3](https://github.com/pkp/pkp-lib/commit/71e79e31e3d5c827e4bfa2443bbe81e5ec4c1dba) · 2023-10-13 · Touhidur Rahman (touhidurabir); OJS's issue statistics in `pkp/ojs#3980` · [7cdc10c1b5](https://github.com/pkp/ojs/commit/7cdc10c1b5eae971101240d7c0872a7b952d9233)
- **Upstream** none found (2026-10-15)
- **Tracked in** spec U64 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U64-usage-statistics.md#a14)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On Statistics › "Articles", when the server refuses the dates the page
asks for, its answer carries only a code such as
"api.stats.400.wrongDateFormat", where a sentence saying what is wrong
with the dates is expected. Choosing "All dates" on a journal, press or
server with nothing published is refused this way
([pkp-e2e#610](https://github.com/jardakotesovec/pkp-e2e/issues/610)),
and the "Error" window shows the code.

A program that sends the statistics API a date or an "orderDirection"
it refuses gets the same kind of code, for the articles', the
journal's, the issues', the editorial and the users' figures. Nothing
is lost: the refusal is right, only its sentence is missing.

Once pkp-e2e#610 is fixed, a screen shows the code only on "Editorial
Activity" when "This year" is chosen on 1 January. Otherwise only
programs that use the statistics API meet it.

## Impact

- **Lost.** Nothing stored or counted; only the refusal's wording.
- **Who.** On screen, managers and editors who meet the "All dates"
  window of pkp-e2e#610 on Statistics › "Articles" ("Monographs",
  "Preprints"), and, with that fixed, anyone choosing "This year" on
  "Editorial Activity" on 1 January. Off screen, scripts and
  integrations that read the statistics API; the apps' own pages are
  the only clients found that show its message to a person.
- **Way round.** None needed: the window closes with "OK", and another
  range works.

Low: a raw translation key in a refusal that is right. A screen that
sent refused dates on an ordinary day would raise the severity.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main` (OMP and OPS the same with
  their own words: "Hosted Presses" › "Create Press", "Hosted
  Servers" › "Create Server", Statistics › "Monographs", "Preprints").

Through the page (a journal with nothing published, the case of
`pkp-e2e#610`):

1. Sign in as `admin`.
2. Open Administration › "Hosted Journals" › "Create Journal". Fill in
   "Journal title" `hkk10 Journal`, "Journal initials" `HKK10`, the
   principal contact's name and email, "Country" Canada, "Path"
   `hkk10`, tick English under "Languages" and "Primary locale", tick
   "Enable this journal to appear publicly on the site", and press
   "Save".
3. Open the new journal's Statistics › "Articles"
   (`/index.php/hkk10/en/stats/publications/publications`).
4. Press the calendar button beside the range and choose "All dates".

The same API in the address bar (no screen sends these values):

1. Sign out, and sign in as `dbarnes`.
2. Type each address in the address bar:
   1. `/index.php/publicknowledge/api/v1/stats/publications?dateStart=2000-01-01`
   2. `/index.php/publicknowledge/api/v1/stats/publications?orderDirection=up`
   3. `/index.php/publicknowledge/api/v1/stats/editorial?dateStart=2000-01-01`
   4. `/index.php/publicknowledge/api/v1/stats/users?registeredAfter=2000-01-01`
   5. OJS only: `/index.php/publicknowledge/api/v1/stats/issues?dateStart=2000-01-01`

**Expected.** The window reads "The date must be in the format
YYYY-MM-DD." That the window opens at all is pkp-e2e#610: "All dates"
sends no start date, the server fills one in from the journal's
earliest publication date, which is empty on a journal with nothing
published, and the date check refuses the empty value. Each
address answers 400 with a sentence in `error`: "The start date can not
be earlier than 2001-01-01." for 1, 3, 4 and 5, "Your request was not
valid. The orderDirection must be `desc` or `asc`." for 2.

**Observed.** The window:

```
Error
api.stats.400.wrongDateFormat
OK
```

The page's three statistics requests, the table's
`GET /index.php/hkk10/api/v1/stats/publications?count=30&offset=0&orderBy=total&orderDirection=DESC`
and the chart's
`GET /index.php/hkk10/api/v1/stats/publications/timeline?timelineInterval=month`
(sent twice, as the chart switches to "Monthly"), answer 400 with
`{"error":"api.stats.400.wrongDateFormat"}`. In the address bar:

```
1, 3, 4, 5   400   {"error":"api.stats.400.earlyDateRange"}
2            400   {"error":"api.stats.400.invalidOrderDirection"}
```

Control, a refusal the code does translate: `/index.php/publicknowledge/api/v1/stats/publications/1/timeline?timelineInterval=year`
answers 400 with `{"error":"Your request was not valid. The
timelineInterval must be `day` or `month`."}`, a sentence.

## Cause

`PKPBaseController::_validateStatDates()` (lib/pkp
[`classes/core/PKPBaseController.php`, lines 568–583 on main](https://github.com/pkp/pkp-lib/blob/b17fadae59/classes/core/PKPBaseController.php#L568-L583))
returns, for a refused date, the locale key of the message
(`'api.stats.400.wrongDateFormat'`, `earlyDateRange`, `lateDateRange`,
`wrongDateRange`), as its docblock says. Every caller puts that key in
the answer as it is:

```php
$result = $this->_validateStatDates($allowedParams);
if ($result !== true) {
    return response()->json(['error' => $result], Response::HTTP_BAD_REQUEST);
}
```

`PKPStatsPublicationController::validateParams()` throws the key as an
exception's message instead (line 715), along with two keys of its own
(lines 719 and 723, `api.stats.400.invalidOrderDirection` and
`api.stats.400.invalidTimelineInterval`), and the six list endpoints
answer `['error' => $e->getMessage()]`.

Up to and including 3.4, each of these answered through
`$response->withJsonError($result)`, which sent the key as `error` and
the translated sentence as `errorMessage`. The page's error window
(`ajaxErrorCallback()`, lib/ui-library `src/mixins/ajaxError.js`) shows
`errorMessage` first, so the sentence showed.

The port to Laravel routing (`pkp/pkp-lib#9176`) dropped
`withJsonError()`. Where the key was written out, it put
`'error' => __('<key>')` in its place, as for the Steps' control
(`getTimeline()`, line 392). Where the key came in a variable
(`$result`, `$e->getMessage()`), it put the variable in `error`
untranslated. With no `errorMessage`, the window shows `error`, the key.

Reach, checked in the code unless marked:

- Statistics › "Articles" (on screen, three apps, main and 3.5): only
  the "All dates" refusal of `pkp-e2e#610` reaches it, on the list, the
  chart and "Download Report". Every other range the page sends passes
  the validator: "Custom Range" refuses a bad or early date in the
  browser (`DateRange.vue`).
- Statistics › "Editorial Activity" (`StatsEditorialPage.vue`, which
  shows errors through `ajaxErrorCallback()`): its "This year" preset
  is 1 January to yesterday (`PKPStatsHandler::editorial()`), so on 1
  January the start is after the end and the editorial endpoint
  answers `api.stats.400.wrongDateRange`. This is the only screen left
  once pkp-e2e#610 is fixed; 3.5 has the same preset. The other
  Statistics pages' presets all pass the validator, and "Journal",
  "Issues" and "Users" show no window for a refused request.
- Every caller of `_validateStatDates()`: publications (`get()`,
  `getTimeline()`, and `validateParams()` for `getMany()`,
  `getManyTimeline()`, `getManyFiles()`, `getManyCountries()`,
  `getManyRegions()`, `getManyCities()`), contexts (four endpoints),
  editorial, users, and OJS's issues (four endpoints, in the app's
  `api/v1/stats/issues/StatsIssueController.php`). On screen in the
  address bar: the publications list, editorial, users and OJS's issues.
- Not affected: the literal keys the port wrapped in `__()` (the
  control; OJS's issues `invalidOrderDirection` and
  `wrongTimelineInterval`), and the "Counter R5" form's refusals, which
  have messages of their own (their date placeholder is a separate
  fault,
  [pkp-e2e#626](https://github.com/jardakotesovec/pkp-e2e/issues/626)).

## Proposed fix

A proposal, tried on main:
[`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/stats-refusal-raw-code/fix.diff),
applied to OJS, OMP and OPS. With it, the Steps show Expected, and the
control's sentence is not translated twice. A neighbour check on the
dataset's own journal, press and server gave the same with the fix in
and out: Statistics › "Articles" on its arrival range and "Last 90
days" with no window, and the same addresses with accepted values
(`dateStart=2001-01-01`, `orderDirection=ASC`,
`timelineInterval=month`) answering 200 with the same bodies.

Recommended: translate where the key is chosen, in pkp-lib.
`_validateStatDates()` returns `__('api.stats.400.…')` for each of its
four refusals, and `validateParams()` throws
`__('api.stats.400.invalidOrderDirection')` and
`__('api.stats.400.invalidTimelineInterval')`:

```diff
-                return 'api.stats.400.wrongDateFormat';
+                return __('api.stats.400.wrongDateFormat');
```

(the same for the other three returns and the two throws, and the
docblock's `@return` now says a translated message). This covers every
caller, OJS's issue statistics included, without an app change. It
follows what the port did for every key written out: 396 of the
`'error' =>` lines in main's API code put `__('<key>')` there.

**Alternatives:**

- Wrap `__()` around `$result` and `$e->getMessage()` at the 18
  answering lines (pkp-lib's four controllers and OJS's issues
  controller). The same result, in two repos, and the next caller of the
  helper must remember it.
- Send the key as `error` and the sentence as `errorMessage`, as 3.4
  did and as the router's "endpoint not found" answer still does. It
  keeps the code for clients that read it, at the same 18 lines; 11
  answers on main use that shape.

**What goes with it:**

- An API change, small: a refused statistics request's `error` holds
  the sentence instead of the code, like the other endpoints' answers
  since 3.5. A client that matched the code (3.5 on) must match the
  status instead.
- No data repair.
- Backport: `fix.diff` applies to 3.5 as it stands (offsets only,
  checked with `patch --dry-run`). 3.4 and 3.3 do not need it.
- `_validateStatDates()` is protected; a plugin's controller that calls
  it and translates the result itself would get the sentence wrapped in
  `##…##`. None of the three apps' bundled plugins calls it.
- Guard: an e2e check in pkp-e2e's usage statistics spec that a refused
  statistics request's `error` is not a locale key.

Small: two pkp-lib files, the port's own pattern, and a test.

## Evidence

- Kept script that takes the Steps:
  [`shared/playwright/checks/issues/stats-refusal-raw-code/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/stats-refusal-raw-code/walk.js)
  (helpers in `lib.js` beside it), run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all <walk.js>`
  on an install freshly loaded from PKP's default test dataset
  (pkp/datasets 7912e09, 2026-10-14, the `main` and `stable-3_5_0`
  PostgreSQL dumps, no upgrade needed); `neighbour` as the argument for
  the neighbour check. It reads the window, the page's statistics answers
  and each address's status and body.
- The fix was applied with `node bin/try-fix.js apply <fix.diff> ojs omp ops`.
- main walked at OJS 378eced941, OMP f4836d4fb, OPS 2ece50497f (each
  lib/pkp b17fadae59, lib/ui-library 47b565cb). 3.5 walked at OJS
  ca763c91cd, OMP a70bbb9c4, OPS 44aec6e131 (lib/pkp 4045d9241e,
  lib/ui-library 2576e00a): the same window, codes and control as on
  main.
- Code read on main: lib/pkp `classes/core/PKPBaseController.php`
  (`_validateStatDates()`), the publications, contexts, editorial and
  users statistics controllers, `classes/core/APIRouter.php`, every
  `'error' =>` in `api/` and `classes/`; OJS
  `api/v1/stats/issues/StatsIssueController.php` and
  `api/v1/stats/index.php`; OMP and OPS `api/` and `plugins/` (no
  caller of their own); lib/ui-library `src/mixins/ajaxError.js` and
  `src/components/DateRange/DateRange.vue`, `StatsEditorialPage.vue`;
  lib/pkp `pages/stats/PKPStatsHandler.php` (the presets).
- 3.4 by code: lib/pkp `origin/stable-3_4_0` (55c8e406b3),
  `classes/core/APIResponse.php` (`withJsonError()` sends `error` and
  `errorMessage`), `PKPStatsPublicationHandler.php` (lines 299–301,
  353–355 and the list endpoints' `withJsonError($e->getMessage())`),
  the editorial and users handlers; OJS `upstream/stable-3_4_0`
  (daf0ca971d) `StatsIssueHandler.php` line 133; lib/ui-library
  (ee684b34) `ajaxError.js` shows `errorMessage`. OMP 0aec65441, OPS
  acd8ae704b.
- 3.3 by code: lib/pkp `origin/stable-3_3_0` (5e84acd11b),
  `APIResponse.inc.php` (the same `withJsonError()`) and
  `PKPStatsPublicationHandler.inc.php` line 139; lib/ui-library
  (96959f9e) `ajaxError.js` the same. OJS d7d9dd14ec, OMP 8e72fc883, OPS
  c5532e2161.
- Introduced: `git blame` on the answering lines on main
  (`PKPStatsPublicationController.php` 213 and 329, OJS
  `StatsIssueController.php` 146) gives 71e79e31e3 and 7cdc10c1b5, the
  port; the lines before it were `withJsonError($result)`. The keys in
  `_validateStatDates()` are older and were meant to be translated by
  the caller. 71e79e31e3 is not on `stable-3_4_0`; 3.5 has it.
- Upstream search terms (pkp/pkp-lib, pkp/ojs, pkp/ui-library; issues
  and PRs, open and closed): the codes, `_validateStatDates`,
  `withJsonError errorMessage`, "statistics "All dates" error", "stats
  api error message key".
- Not driven: the contexts endpoints, one submission's figures, the
  page's "Download Report", "Editorial Activity" on 1 January (all by
  code), 3.4 and 3.3.
