# A journal's "Do not collect any geographical data" is not kept: the journal keeps collecting at the site's level

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; no journal-level geographical setting)
- **Introduced** `pkp/pkp-lib#8278` for `pkp/pkp-lib#8250` · [cf9b85c6ba](https://github.com/pkp/pkp-lib/commit/cf9b85c6bad192ad8af8a2a997eb811883524b65) · 2022-09-19 (merged 2022-09-21) · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U64 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U64-usage-statistics.md#a4)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a site that collects geographical statistics, a Journal Manager
chooses "Do not collect any geographical data" on Settings ›
Distribution › "Statistics" and saves. The tab shows "Saved" with the
choice still selected. When the manager opens the tab again, the
site's level is selected, and the journal keeps collecting at that
level: the "Download Report" window of Statistics › "Articles" still
offers "Download Geographic", and its file reports at the site's level
(cities, on a site that collects cities).

The manager expects the choice to hold and nothing geographical to be
collected for the journal, as a less detailed level than the site's
holds ("Collect the visitor's country" on a site that collects cities).
The manager cannot stop the collection entirely; choosing "Collect the
visitor's country" only limits it to the country. This needs a site
whose "Geographical Statistics" is set to collect; a new install
collects none.

## Impact

- **Lost.** The journal's choice not to collect its visitors' location.
  Country, region and city go on being recorded for the journal's
  visits, in as much detail as the site's level records.
- **Who.** A Journal Manager (Press Manager, Preprint Server Manager) on
  a site that collects geographical statistics who wants the journal
  out of it, every time.
- **Way round.** The manager cannot stop the collection entirely;
  "Collect the visitor's country" limits it to the country. Only the
  Site Administrator can stop it, by setting the site to "Do not collect
  any geographical data", which stops it for every journal.

Medium: the setting fails silently and the manager can only limit the
collection, not stop it, but only on sites that turned geographical
statistics on (off on a new install), and only for a journal that wants
none. It would be high if most installs collected geographical
statistics.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main` (on OMP and OPS the same,
  with "Monographs" and "Preprints" for "Articles").

Steps:

1. Sign in as `admin`. Open Administration › Site Settings › "Site
   Setup" › "Statistics". Under "Geographical Statistics" choose
   "Collect the visitor's country, region and city" and click "Save".
2. Sign in as `rvaca`. Open Settings › Distribution › "Statistics"
   (`/index.php/publicknowledge/en/management/settings/distribution`).
   "Collect the visitor's country, region and city" is selected.
3. Choose "Do not collect any geographical data" and click "Save".
4. Load the page again and open "Statistics".
5. Open Statistics › "Articles" and click "Download Report".

**Expected.** Step 3 shows "Saved". At step 4 "Do not collect any
geographical data" is still selected. At step 5 the window offers no
geographic report, since the journal collects none.

**Observed.** Step 3 shows "Saved" with "Do not collect any geographical
data" selected. At step 4 "Collect the visitor's country, region and
city" is selected again. At step 5 the window offers "Download
Geographic" after "Download Articles", "Download Files" and "Download
Timeline"; its file is `stats_cities_….csv`, headed
`City,Region,Country,Total,Unique`. No request fails.

Control: with "Collect the visitor's country" chosen at step 3, that
option is still selected at step 4, and step 5's file is
`stats_countries_….csv`, headed `Country,Total,Unique`.

## Cause

`Context::getEnableGeoUsageStats()` (`lib/pkp/classes/context/Context.php`,
line 592) decides the level a context collects at. It takes the
context's own setting only when the site's value starts with it:

```php
if ($contextSetting != null && str_starts_with($siteSetting, $contextSetting)) {
    return $contextSetting;
}
return $siteSetting;
```

The levels are stored as `country`, `country+region` and
`country+region+city`, so "starts with" means "no more detailed than
the site's level". The fourth value, `disabled`, collects least of all
but is no prefix of any level, so a context that stored it gets the
site's level. `PKPContextStatisticsForm::__construct()` (lines 58–62)
repeats the same test to pick the selected radio, which is why the tab
shows the site's level again once reloaded.

The save itself works: the context's `enableGeoUsageStats` row holds
`disabled` after step 3.

The test came with `pkp/pkp-lib#8278` (for `pkp/pkp-lib#8250`, "what is
set at the site level … should be selected by default at the journal
level"), which added `str_starts_with()` to the form and to
`PKPStatisticsHelper::getGeoData()` so that a context could not
collect more detail than the site. Before it, a context value that
differed from the site's was used as it stood, `disabled` included.

A second fact shapes the fix. `schemas/context.json` gives
`enableGeoUsageStats` the default `disabled` (since `pkp/pkp-lib#8681`
for `pkp/pkp-lib#8678`; it was `""` before), so every context created
on 3.4 or later already stores `disabled` without anyone choosing it.
Today that stored default means "follow the site", and it cannot be
told from a manager's own choice of "Do not collect any geographical
data".

Reach, all through the one method:

- `PKPStatisticsHelper::getGeoData()`, called by the `LogUsageEvent`
  listener for every counted visit, records country, region and city at
  the site's level for such a context (checked in the code; no visit
  with a resolved location was driven).
- `getGeoData()` is also called from the `ConvertLogFile` trait
  (`classes/cliTool/traits/ConvertLogFile.php`, line 218), which the
  log conversion tools (`convertUsageStatsLogFile.php`,
  `convertApacheAccessLogFile.php`) and the 3.4 upgrade's
  `I8508_ConvertCurrentLogFile` use. Log files converted or reprocessed
  for such a context get the location columns too (checked in the
  code).
- `PKPStatsHandler::publications()` offers the geographic report at the
  site's level (checked on screen).
- `PKPContextStatisticsForm` selects the site's level (checked on
  screen).
- Stored data: the context's own row is right (`disabled`); the wrong
  records are the country, region and city values in the usage
  statistics tables of a context that had opted out.

## Proposed fix

A proposal: honor `disabled` in `Context::getEnableGeoUsageStats()`,
let the form ask that method instead of repeating the rule, and stop
storing `disabled` as a new context's default, so that "no value" means
"follow the site" and `disabled` means the manager chose it. The patch
is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/journal-geographical-data-opt-out-not-kept/fix.diff).

`Context::getEnableGeoUsageStats()`, before and after:

```php
if ($contextSetting != null && str_starts_with($siteSetting, $contextSetting)) {
```

```php
if ($contextSetting != null && ($contextSetting === 'disabled' || str_starts_with($siteSetting, $contextSetting))) {
```

`PKPContextStatisticsForm::__construct()`: the five lines that pick
`$selectedGeoOption` (58–62) become one:

```php
$selectedGeoOption = $context->getEnableGeoUsageStats($site);
```

`schemas/context.json`: the line `"default": "disabled",` of
`enableGeoUsageStats` is removed and `"nullable",` is added before its
`in:` rule. With the default gone the API returns `null` for the
setting, and Laravel's validator runs `in:` on a `null` value unless
the field is `nullable` (`Validator::isNotNullIfMarkedAsNullable()`,
read in the code), so a client that sends the object back would
otherwise be refused.

The intent of `pkp/pkp-lib#8250` is kept: a context with no choice of
its own shows and uses the site's level, and a context cannot collect
more detail than the site. A search for the same prefix test found only
these two places.

The code change needs one upgrade migration with it, and must not ship
without it: with `disabled` honored, every context created on 3.4 or
later would stop collecting on upgrade, because its stored default
reads as a choice. The migration deletes those rows, which keeps what
each context does today, in the pattern of
`I5885_RenameReviewReminderSettingsName` (a pkp-lib class, one subclass
per app naming its settings table):

```php
DB::table($this->getContextSettingsTable())
    ->where('setting_name', 'enableGeoUsageStats')
    ->where('setting_value', 'disabled')
    ->delete();
```

The migration must run once only. Run a second time, on an install that
already has the fix, it would delete the opt-outs managers saved since.
The guard is the version range of the `<upgrade>` block that lists it
in each app's `dbscripts/xml/upgrade.xml`, which is matched against the
version installed before the upgrade:

- Without a backport: on `main`, in the 3.6.0 block
  (`minversion="3.3.0.0" maxversion="3.5.9.9"`), and nowhere else.
- With a backport to 3.5: on `stable-3_5_0`, in a block of its own
  whose `maxversion` is the last 3.5.0 release without the fix; on
  `main`, in a block with that same `maxversion` instead of the 3.6.0
  block, so an install that already took the patched 3.5 release skips
  it. A 3.4 backport does the same with the last 3.4.0 release without
  the fix, on each later line.
- It must not be listed twice with the note "Already added to … but
  idempotent", as `I13128_FixEmailUrlLinks` is: it is not idempotent.

Tried on `main`, on the three apps: with the diff applied and the
migration's statement run on the database, the Steps show the Expected
(the choice holds after a reload, the window offers no "Download
Geographic"). What must not change stays the same with and without the fix:
a context that never saved shows the site's level and its
geographic report, "Collect the visitor's country" holds, and a journal
created on screen shows the site's level (with the fix it stores no
value). The migration as a class, in its `upgrade.xml` blocks, was not
tried.

**Alternatives**

- The `Context` and form changes alone, keeping the schema default: not
  enough. Every new context would start at "Do not collect any
  geographical data" whatever the site collects, against
  `pkp/pkp-lib#8250`.
- Removing "Do not collect any geographical data" from the journal's
  radios: a few lines, but it takes away the opt-out the tab offers; a
  product decision.

**What goes with it**

- The migration above. A manager who chose "Do not collect any
  geographical data" before the fix is not told apart from the default
  and has to choose it again; the release notes should say so.
- "Follow the site" lasts until the tab's first save. Any save of the
  tab, also one that changes only another box, stores the level shown
  as the journal's own value, as it does today; the tab has no "same as
  the site" choice.
- No repair of the location values already recorded for a context that
  had opted out is proposed; they cannot be told from wanted ones.
- API: `enableGeoUsageStats` of a context that follows the site reads
  `null` instead of `disabled`.
- Backport: the three files are the same on `stable-3_5_0` and
  `stable-3_4_0` apart from line numbers; the migration goes in the
  blocks named above.
- Guard: a unit test of `Context::getEnableGeoUsageStats()` over the
  site and context values, and an e2e scenario on the journal's
  "Statistics" tab (a Planned item of the spec).

Medium: the upgrade migration, registered in each app, makes it more
than a few lines.

## Evidence

- A Playwright script that runs the Steps and the control on an install
  loaded from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/journal-geographical-data-opt-out-not-kept/walk.js),
  with helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/journal-geographical-data-opt-out-not-kept/lib.js).
  Run it with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/journal-geographical-data-opt-out-not-kept/walk.js`.
  After each save it also reads the stored `enableGeoUsageStats` rows of
  the site and the context.
- The check of what must not change is the same script with
  `WALK_MODE=neighbour`: a
  context that never saved, "Collect the visitor's country" saved and
  reloaded, and (OJS) a journal made with Administration › Hosted
  Journals › "Create Journal".
- The fix, tried 2026-10-02 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/journal-geographical-data-opt-out-not-kept/fix.diff ojs omp ops`,
  then the script with `MIGRATED=1` (it first runs the migration's
  delete statement through psql), in both modes, then `revert`. The
  check of what must not change was also run without the fix.
- Walked 2026-10-02 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [e8dafbc](https://github.com/pkp/datasets/commit/e8dafbcf0a61c21a3653dd24d9a1282f36762d12)
  (2026-10-02). The fault is a string comparison in PHP, so the database
  does not matter.
  - main: OJS b84f8e2e44 (lib/pkp ddd8ab243a), OMP 3b0ecf794c and OPS
    c8af945bb7 (lib/pkp 3dc90c81a6): the same result on each.
  - stable-3_5_0: OJS 091fb65453, OMP 9c5e24246c, OPS 38b61882d3
    (lib/pkp cf3f984335): the same result at every step.
- 3.4, by code: pkp-lib `stable-3_4_0` at 9e41f10273 (OJS c1827e3527,
  OMP 0aec65441, OPS acd8ae704b). `Context::getEnableGeoUsageStats()`
  (lines 557–568) and `PKPContextStatisticsForm` (line 63) hold the same
  test, `schemas/context.json` the same default, and both cf9b85c6ba and
  ea98417e96 are on the branch.
- 3.3, by code: pkp-lib `stable-3_3_0` at ac3fa73402. Neither
  `schemas/context.json` nor `classes/` names `enableGeoUsageStats`; the
  geographical columns there are an option of the Usage Statistics
  plugin, whose own repository was not read.
- Introduced: `git blame` on line 592 gives 540841c663 (2022-10-11,
  `pkp/pkp-lib#7318`), which renamed the method and kept the test;
  34afe297b8 (2022-10-04) moved it from `PKPStatisticsHelper::getGeoData()`;
  cf9b85c6ba added `str_starts_with()` there and in the form. The first
  version (86acb07066, `pkp/pkp-lib#6782`, 2021-07-16) used any context
  value that differed from the site's. All of these are older than
  3.4.0, so no release kept the choice; hence "defect".
- Upstream search (2026-10-02), pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library, issues and PRs, open and closed: "geographical
  statistics journal disabled", "Do not collect any geographical data",
  `enableGeoUsageStats`, `getEnableGeoUsageStats`. The hits
  (`pkp/pkp-lib#7976`, `pkp/pkp-lib#8678`, both closed) are about the
  default value, not about a chosen `disabled`.
- Not driven: a visit whose location is resolved. The test installs have
  no GeoIP database, so that the collector goes on recording a location
  for such a journal is read in the code (`LogUsageEvent`,
  `PKPStatisticsHelper::getGeoData()`), which asks the same method the
  report page asks.
- Unverified: the upgrade migration as a class; MySQL not walked.
