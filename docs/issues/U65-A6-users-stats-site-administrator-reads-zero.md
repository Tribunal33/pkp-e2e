# Statistics › "Users" lists a "Site Administrator" row that always reads 0

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; the row is left out)
- **Introduced** `pkp/pkp-lib#7170` for `pkp/pkp-lib#7127` ·
  [bacbe92996](https://github.com/pkp/pkp-lib/commit/bacbe92996b4d8b389aae46f89574fef91969bf1)
  · 2021-08-19 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U65 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U65-editorial-statistics.md#a6)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A journal's Statistics › "Users" page lists a "Site Administrator" row
under "All Users", and it reads 0 on every journal, even when the site
administrator holds a role in that journal and is the one reading the
page. Site administration is a role of the whole site, not of a
journal, so the page has nothing to count there. Every other row is
right.

The same 0 row appears in the "Users" block of the monthly editorial
email's attachment, which goes to the journal's managers and section
editors (on by default). The fix leaves the row out of a journal's
overview, which the page, the monthly email and the statistics API
share.

## Impact

- **Lost**: nothing, and no task depends on the row. A reader may take
  it to mean the journal has no site administrator, or that the count
  is broken.
- **Who**: whoever reads the page or the monthly email's attachment, on
  any install.
- **Way round**: none needed.

Low: a row that can only read 0 misleads, and nothing else.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (or `stable-3_5_0`): OJS "Journal
  of Public Knowledge", OMP "Public Knowledge Press", OPS "Public
  Knowledge Preprint Server", each at the path `publicknowledge`.
- `admin` is the site administrator and also a Journal Manager (OMP
  Press Manager, OPS Preprint Server manager) of `publicknowledge`.

Steps:

1. Sign in as `admin` (password `admin`).
2. Open the journal's dashboard
   (`/index.php/publicknowledge/en/dashboard/editorial`).
3. In the side menu, open "Statistics" › "Users".
4. Read the "Registered users" table.

**Expected**: the table lists the journal's own roles and no "Site
Administrator" row, as 3.3 does.

**Observed**: the second row is "Site Administrator" with 0. OJS:

```
Name                  Total
All Users             39
Site Administrator    0
Journal Manager       3
Section Editor        3
Assistant             6
Author                20
Reviewer              10
Reader                20
Subscription Manager  0
```

OMP reads "All Users" 38, "Site Administrator" 0, "Press Manager" 3;
OPS "All Users" 25, "Site Administrator" 0, "Manager" 3. `admin` is
counted in "All Users" and in each manager row. The page reads the same signed in as `rvaca`,
a Journal Manager who is not a site administrator.

## Cause

`PKP\user\Repository::getRolesOverview()`
([lib/pkp classes/user/Repository.php](https://github.com/pkp/pkp-lib/blob/ddd8ab243a39584ce34cdcf379acb17b46e496b8/classes/user/Repository.php#L305))
builds one row per entry of `Application::get()->getRoleNames()`, which
by default includes `Role::ROLE_ID_SITE_ADMIN`. Every caller passes a
collector limited to one context. The collector's context filter
(`COALESCE(ug.context_id, 0)` in the given IDs) never matches the site
administrator's user group, which belongs to no context. So that row's
count is always 0.

Until 3.3, `PKPUserService::getRolesOverview()` removed the site
administrator role when the overview was limited to a context ("Don't
include the admin user if we are limiting the overview to one
context"), a guard there since the page was added for
`pkp/pkp-lib#4844`. `bacbe92996` (`pkp/pkp-lib#7127`, "Use collector
instead of parameter array") changed the method to take a collector
instead of an `$args` array. The guard tested `$args['contextId']`, so
it was removed along with `$args`, and no test of the collector's
`contextIds` took its place.

Reach:

- Statistics › "Users", `PKPStatsHandler::users()`: the three apps
  (checked on screen; OMP and OPS do not override `getRoleNames()`).
- The "Users" block of the monthly email's "editorial-report.csv",
  `StatisticsReportMail::createCsvAttachment()`: the same call, so the
  same "Site Administrator",0 line (checked in the code).
- `GET {context}/api/v1/stats/users`, `PKPStatsUserController`: the
  same call after `filterByContextIds()`, so its answer carries the
  same item (checked in the code; no screen sends this request).
- Nothing is stored: each overview is computed when asked.

## Proposed fix

Restore the guard in `getRolesOverview()`, where the rows are chosen,
using the `$contextOnly` flag `getRoleNames()` already has for this:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-stats-site-administrator-reads-zero/fix.diff).

```diff
-        $roleNames = Application::get()->getRoleNames();
+        // A site administrator's role belongs to no context, so an overview limited to contexts leaves it out
+        $roleNames = Application::get()->getRoleNames(contextOnly: !empty(array_filter($collector->contextIds ?? [])));
```

The row stays when `contextIds` is null (no context filter, the whole
site) or holds only the site's own ID (`[null]` or `[0]`; null on
`main`, 0 on 3.4), since `array_filter()` drops those. A filter
holding any journal's ID (`[1]`, what every caller passes) drops the
row, as 3.3's `!empty($args['contextId'])` did. A mixed filter such as
`[1, 0]` would drop the row although the collector still counts
site-level groups for the 0; no caller passes one, so this is accepted.

The other context-level screens build their role lists the same way:
the Roles tab's permission levels (`UserGroupGridHandler`,
`UserGroupForm`) use `getRoleNames(true)`.

Tried on `main`, all three apps: the table no longer has the "Site
Administrator" row, and every other row keeps its count (read signed in
as `rvaca`, a manager who is not a site administrator, with the fix in
and out).

**Alternatives**:

- `getRoleNames(true)` in each of the three callers: the same result,
  but the rule would sit in three places and the next caller would miss
  it.
- Count the site administrators in the row: they hold no role in the
  journal, so the figure would not belong on a per-journal page; it
  would be a product decision, and 3.3 chose to leave the row out.

**What goes with it**:

- The `stats/users` API answer loses its always-0 "Site Administrator"
  item, as on 3.3; nothing can rely on a value that is always 0.
- Backport: 3.5 takes the diff as written. 3.4 has the same method
  with `getRoleNames()` at line 292 and takes the same line
  (`CONTEXT_SITE` is 0 there, which `array_filter()` drops).
- Test: no unit test covers `getRolesOverview()`. The e2e scenario for
  this page reads its rows and guards it.

Small: one line in the shared repository, restoring 3.3's behaviour.

## Evidence

- Kept script, which takes the Steps on the three apps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-stats-site-administrator-reads-zero/walk.js);
  with the argument `neighbour` it reads the same page signed in as
  `rvaca` instead, the check that the fix changes no other row.
- Run: `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/users-stats-site-administrator-reads-zero/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Fix: `node bin/try-fix.js apply shared/playwright/checks/issues/users-stats-site-administrator-reads-zero/fix.diff ojs omp ops`,
  then the walk, and the walk with `neighbour` with the fix in and out.
- Walked on PostgreSQL, datasets pkp/datasets e8dafbc (2026-10-02). The
  fault has no database-specific part; MySQL not checked.
- Tips: `main` OJS b84f8e2e44, OMP 3b0ecf794, OPS c8af945bb7 (lib/pkp
  ddd8ab243a for OJS, 3dc90c81a6 for OMP and OPS; `Repository.php` is
  the same in both); `stable-3_5_0` OJS 091fb65453, OMP 9c5e24246, OPS
  38b61882d3 (lib/pkp cf3f984335); `stable-3_4_0` OJS c1827e3527, OMP
  0aec65441, OPS acd8ae704b (pkp-lib 9e41f10273); `stable-3_3_0` OJS
  ac77c9fb35, OMP 8e72fc883, OPS c5532e2161 (pkp-lib ac3fa73402).
- Code reads: on `main` and 3.5, the files Cause and Reach name (the
  same code on both). On 3.4, the same files: no guard (line 292), the
  collector's filter on plain `ug.context_id`, every caller limited to
  the context. On 3.3, pkp-lib's
  `classes/services/PKPUserService.inc.php` `getRolesOverview()` (the
  guard at line 625) and its three callers, each passing `contextId`.
- Introduced: `git blame` on the `getRoleNames()` line goes to
  8c3a060c19 (`pkp/pkp-lib#7127`, the move from `PKPUserService` into
  the repository), which still carried the guard. GitHub's
  `commits/bacbe92996…/pulls` names `pkp/pkp-lib#7170`, merged
  2021-08-27. The guard dates from 8d4e08c4ae (`pkp/pkp-lib#4844`,
  2019-12-04).
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library
  searched by the symptom's words and by `getRolesOverview`.
  `pkp/pkp-lib#7317` (the CSV user export listing
  other journals' roles) is a different fault; nothing describes this
  one.
- Not driven: 3.4 and 3.3; the monthly email's attachment and the
  `stats/users` API.
