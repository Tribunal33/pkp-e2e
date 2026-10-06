# Site Settings saves, and 3.5's daily scheduled tasks, log a PHP warning when no journal redirect is set

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; the redirect is never empty there)
  - 3.3: none (code; the redirect is never empty there)
- **Introduced** `pkp/pkp-lib#10023` for `pkp/pkp-lib#8333` · [11c9f223bf](https://github.com/pkp/pkp-lib/commit/11c9f223bfe318535d23cfb741829f4958925434) · 2024-07-11 · Jonas Raoni Soares da Silva (jonasraoni)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U60 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U60-site-settings.md#a3)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A Site Administrator presses "Save" on Site Settings "Security",
"Information", "Bulk Emails", "Statistics" or "Appearance" › "Setup".
The page shows "Saved" and the change is stored, but each save also
writes a PHP warning about a missing "redirectContextId" to the server's
error log. On an install with `display_errors = On`, a development
setting, the warning is printed into the save's answer instead: the page
shows "An unexpected error has occurred. Please reload the page and try
again." in place of "Saved", though the change is stored.

On 3.5 the scheduled tasks write the same warning with nobody saving.
The first page request of each day that starts the daily tasks logs one
line per task and one more for recording their run times (8 a day on
OJS). On `main` the scheduled tasks do not write it.

It happens on every site with no "Journal redirect" ("Press redirect",
"Server redirect") set, which is the default. A one-journal site has no
way round.

## Impact

- **Lost.** Nothing is lost. The error log fills with lines that look
  like a fault and are not one, which hides the real faults in it. With
  `display_errors = On`, the Site Administrator is told that a save
  failed when it worked.
- **Who.** The server's administrator reading the log, on every install
  without a redirect. With `display_errors = On`, the Site Administrator
  on every save of those tabs.
- **Way round.** None on a one-journal site: Site Settings shows the
  "Settings" tab, which holds "Journal redirect", only once a second
  journal exists. With two or more journals, setting a redirect stops
  it, but the site's address then opens that journal instead of the
  site's home page.

Low: every save is stored. The one visible effect, an error notice for a
save that worked, needs `display_errors = On`, which the configuration
template and the default dataset leave off.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main` (OJS, OMP or OPS), freshly
  loaded. It hosts one journal (press, server) and has no redirect set.
- A view of the server's PHP error log (the terminal running `php -S`,
  or the web server's error log). The dataset's `config.inc.php` has
  `display_errors = Off`, so warnings go to the log only.
- Steps 6 to 12 only: a second journal, created in step 6. While the
  site hosts one journal, Site Settings hides the "Settings",
  "Information" and "Appearance" tabs, and so the "Journal redirect"
  that "Settings" holds.

Steps:
1. Sign in as `admin` (password `admin`).
2. Open Administration › "Site Settings"
   (`/index.php/index/en/admin/settings`). The page shows "Site Setup"
   with "Security", "Languages", "Bulk Emails" and "Statistics".
3. Open "Security" and press "Save" without changing anything.
4. Open "Bulk Emails" and press "Save".
5. Open "Statistics" and press "Save".
6. Open Administration › "Hosted Journals" ("Hosted Presses", "Hosted
   Servers") › "Create Journal" ("Create Press", "Create Server"). Fill
   in "u60b Second Journal" as the title, `U60B` as the initials, "u60b
   Second Journal" and `u60b@mailinator.com` as the contact, "Canada" as
   the country and `u60bsecond` as the path. Tick "English" under
   "Languages", choose "English" under "Primary locale", and tick
   "Enable this journal to appear publicly on the site". Press "Save".
7. Open Administration › "Site Settings" › "Site Setup" ›
   "Information" and press "Save".
8. Open "Appearance" › "Setup" and press "Save".
9. Open "Site Setup" › "Settings". Type "u60b Site" in "Site Name",
   leave "Journal redirect" blank and press "Save".
10. Open "Security" and press "Save".
11. Open "Settings", choose "Journal of Public Knowledge" ("Public
    Knowledge Press", "Public Knowledge Preprint Server") in "Journal
    redirect" and press "Save".
12. Open "Security" and press "Save".

[3.5: there is no "Security" tab, so steps 3, 10 and 12 have no
counterpart. The 3.5 dataset also stores when each scheduled task last
ran, stamped on the day the dataset was built. Loaded on a later day,
its daily tasks are overdue, so step 1's page load runs them and shows
their lines.]

**Expected:** each save shows "Saved", and the error log gains no line.

**Observed:** each save shows "Saved", and its request answers 200:

```
POST /index.php/index/api/v1/site   (X-Http-Method-Override: PUT)
```

Steps 3, 4, 5, 7, 8 and 10 each add this line to the error log, just
before the request's own line:

```
PHP Warning:  Undefined array key "redirectContextId" in …/lib/pkp/classes/site/SiteDAO.php on line 136
```

Steps 9, 11 and 12 add nothing. Step 10 shows that a "Settings" save
with the redirect blank does not stop it; step 12 shows that a set
redirect does.

With `display_errors = On` under `[debug]` in `config.inc.php`, step 3
shows no "Saved". The page shows the notice "An unexpected error has
occurred. Please reload the page and try again.", and the save's answer
(still 200, `application/json`) starts with the warning before the
site's settings:

```
<br />
<b>Warning</b>:  Undefined array key "redirectContextId" in <b>…/lib/pkp/classes/site/SiteDAO.php</b> on line <b>136</b><br />
{"about":{"en":"","fr_CA":""},…
```

On 3.5 the line names line 130. Step 1's page load (the sign-in page)
adds 8 of these lines on OJS, 6 on OMP and 4 on OPS, all at once and
before any save: one for each daily task the page load started (7, 5
and 3) and one for the final record of their run times.

## Cause

`SiteDAO::updateObject()` (lib/pkp `classes/site/SiteDAO.php`) writes
every column of the `site` table on each call. It reads each column's
value from the site's data without checking it is there (line 136):

```php
foreach ($this->primaryTableColumns as $propName => $column) {
    $set[] = $column . ' = ?';
    $property = $schema->properties->{$propName};
    $params[] = $this->convertToDb(
        value: $sanitizedProps[$propName],
```

`SiteDAO::_fromRow()` leaves out a column whose value is null
(`if (isset($primaryRow[$column]))`, line 69). So when no redirect is
set, `redirect_context_id` is null, the site loaded by `getSite()` has
no `redirectContextId`, and the next `updateObject()` reads a missing
key. PHP 8 logs the warning and the read gives null, which is the value
already stored.

A "Settings" save is the exception because that form posts
`redirectContextId` (empty or a journal's id), so
`PKPSiteService::edit()` merges it in. The other tabs post only their own
fields.

The change that brought it, `pkp/pkp-lib#10023` for
`pkp/pkp-lib#8333` (adding missing foreign keys), renamed the column
`redirect` to `redirect_context_id` and made it nullable, with null for
"no redirect". The old column was `NOT NULL DEFAULT 0`, so `_fromRow()`
always loaded a value and the unguarded read in `updateObject()` never
missed.

Reach (every caller of `SiteDAO::updateObject()` with a site loaded
while no redirect is set):

- `PKPSiteService::edit()`: every Site Settings save except "Settings"
  (walked). The "Theme" tab's save, `PKPSiteController::editTheme()`,
  calls it only when the theme itself changes (read in the code; only
  "Default Theme" is installed).
- "Site Setup" › "Languages": installing or removing a language,
  enabling or disabling one for the site, and making one primary
  (`AdminLanguageGridHandler`, `InstallLanguageForm`); read in the code.
- `PKPApplication::getUUID()`, the first time a site with no unique ID
  needs one; read in the code. Installation itself sets the redirect to
  null explicitly, so it does not warn.
- 3.5 only: `ScheduledTaskHelper::saveLastRunTimes()`, added for
  `pkp/pkp-lib#13041` by
  [09534070b5](https://github.com/pkp/pkp-lib/commit/09534070b557646af9a2a052e0c3add3c2ca72ab)
  (PR `pkp/pkp-lib#13043`, into `stable-3_5_0` only). It stores the web
  task runner's last-run times as the site setting
  `taskRunnerLastRunSummary`, through `updateObject()`. The runner runs
  at the end of a page request (`[schedule] task_runner = On`, the
  default) at most once a minute. In `ScheduleTaskRunner::run()`:
  - a daily or monthly task whose stored run is before its latest
    boundary is stamped and saved before it starts (one line each), and
    the pass saves once more at the end (one line). So each day's first
    pass writes one line per daily task plus one: 8 on OJS (7 daily
    tasks), 6 on OMP, 4 on OPS; on the 1st of a month the monthly tasks
    add theirs (13 on OJS).
  - a task with no stored run is only stamped, not run, and the pass
    saves once at the end: one line for the pass, however many tasks.
  - an every-minute task that runs is saved at the end of its pass. The
    only one PKP schedules, the queued-jobs task, is off by default
    (`process_jobs_at_task_scheduler = Off`); turned on, it would write
    one line on each pass, up to one a minute.
  - a pass with nothing to start saves nothing.
  The batch in step 1 is the first case: the loaded dataset's stamps are
  from an earlier day. The later cases are read in the code. `main`
  has no `saveLastRunTimes()`: its runner writes no such line, and the
  `main` walk's step 1 logged none.

## Proposed fix

A proposal, tried on `main` as
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/site-settings-save-logs-redirect-warning/fix.diff):
with it, every save of the Steps shows "Saved" and the log gains
nothing, on all three apps. With the fix applied and without it, a
redirect that is set stays set through a "Security" save, and a
"Settings" save with the redirect blank clears it (`redirect_context_id`
read back as 1, then null).

Recommended: in `SiteDAO::updateObject()`, write only the columns whose
value the site holds, as `EntityDAO::getPrimaryDbProps()` and
`SchemaDAO::_getPrimaryDbProps()` already do
(`array_key_exists($propName, $sanitizedProps)`):

```php
foreach ($this->primaryTableColumns as $propName => $column) {
    if (!array_key_exists($propName, $sanitizedProps)) {
        continue;
    }
    $set[] = $column . ' = ?';
    …
}
if (count($set)) {
    $this->update('UPDATE site SET ' . join(',', $set), $params);
}
```

A redirect that is cleared on screen still arrives as a null value and
is written.

**Alternatives:**

- `$sanitizedProps[$propName] ?? null`: also silences it, but it still
  writes NULL for a value the site never held.
- Loading the null column as a null value in `_fromRow()`, as
  `EntityDAO::fromRow()` does (`property_exists`): also stops it, but
  every loaded site then holds `redirectContextId: null`, which shows in
  the site's REST answer, a change for API clients. It can go with the
  recommended fix, but it is not needed.

**What goes with it:**

- Nothing stored is wrong, so no data repair.
- What changes for callers: an `updateObject()` call with a column's
  value left out keeps the stored value instead of writing NULL. No
  caller leaves a value out to clear it. The REST `PUT site` already
  merges the stored values first (`PKPSiteService::edit()`), and the
  `Site::edit` hook receives the same object as before.
- Backport: 3.5 has the same loop with the read at line 130; the guard
  applies there unchanged, but this diff does not apply as written,
  because the line is formatted differently there. 3.5 needs it more,
  because of the scheduled tasks. Not tried on 3.5.
- Guard: a pkp-lib unit test that loads a site with no redirect, saves
  it through `updateObject()` with PHP warnings turned into errors, and
  reads the redirect back as null.

Small: a check in one method, and a unit test.

## Evidence

- Kept script, which takes the Steps in the browser on an install loaded
  from PKP's default test dataset and keeps, for each save, its answer,
  the "Saved" line, the page's notices and the lines PHP wrote to the
  server log:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/site-settings-save-logs-redirect-warning/walk.js).
  Its `neighbour` argument runs the redirect check of the Proposed fix;
  its `security` argument runs steps 1 to 3 alone, which is how the
  `display_errors = On` save was walked (the setting changed by hand in
  the install's config, then put back).
- Branch tips: OJS `main` ff004d0973 (lib/pkp 987776cd04), OMP `main`
  3b0ecf794c (lib/pkp 3dc90c81a6), OPS `main` c8af945bb7 (lib/pkp
  3dc90c81a6); OJS `stable-3_5_0` c1cee76b95 (lib/pkp 771474347e), OMP
  9c5e24246c and OPS 38b61882d3 (lib/pkp cf3f984335). Datasets:
  pkp/datasets 566bb1f (2026-10-03), `pgsql`. The walks ran on
  PostgreSQL; the fault is a PHP array read and does not depend on the
  database.
- The `display_errors = On` walk ran on PHP 8.4's built-in server with
  `output_buffering = 0`. The save's answer was the site's settings
  after the save, with the warning in front, so the save completed. A
  server that buffers its output was not tried.
- On 3.5, step 1's lines came right after the sign-in page's request
  line. Afterwards `taskRunnerLastRunSummary` showed seven OJS daily
  tasks stamped at that moment, and the monthly ones still at their
  dataset stamps (2026-10-01, 2026-09-10). The 13-line batches on the
  1st of a month were seen in the same fleet's server log on 2026-10-01.
- `pkp/pkp-lib#13043` was found from the commit: GitHub's
  `repos/pkp/pkp-lib/commits/09534070b557646af9a2a052e0c3add3c2ca72ab/pulls`
  names it (merged into `stable-3_5_0` on 2026-09-14). The branch's
  history carries only the `pkp/pkp-lib#13041` commit messages.
  `pkp/pkp-lib#10023` was found the same way from 11c9f223bf, which
  `git log -S"'redirectContextId' => 'redirect_context_id'"` names as
  the change that made the column nullable; `git blame` on the read
  itself gives only formatting commits.
- Code reads: `SiteDAO::_fromRow()` and `updateObject()`,
  `PKPSiteService::edit()`, `PKPSiteController::editTheme()`,
  `PKPSiteConfigForm`, `AdminHandler::siteSettingsAvailability()`, the
  `redirectContextId` property in `schemas/site.json`, the other callers
  named in Cause, and `EntityDAO`/`SchemaDAO` for the pattern, on
  `main`. On `stable-3_5_0`: the same, plus `ScheduleTaskRunner::run()`,
  `ScheduledTaskHelper::saveLastRunTimes()`,
  `ScheduleServiceProvider::boot()` and the schedules in `PKPScheduler`
  and each app's `Scheduler`. On `stable-3_4_0` (lib/pkp 767353f4fe) and
  `stable-3_3_0` (lib/pkp ac3fa73402): `SiteDAO` has the same unguarded
  read, but the column is `redirect`, `NOT NULL DEFAULT 0`
  (`CommonMigration`), so the loaded site always holds it.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library
  searched on 2026-10-04 by the warning's words, the column and property
  names, `SiteDAO` and `taskRunnerLastRunSummary`.
- Unverified: the daily batches on a running 3.5 install, and the
  one-line passes for tasks never stamped or for the queued-jobs task
  (read in `ScheduleTaskRunner::run()`). Also unverified, with
  `display_errors = On` on 3.5: the scheduled tasks' warnings would be
  printed at the end of whichever page or API answer ran them.
