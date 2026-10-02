# A Section Editor's "Counter R5" opens an "Error" window over an empty list while the COUNTER statistics are restricted

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; no "Counter R5" page)
- **Introduced** `pkp/pkp-lib#9600` for `pkp/pkp-lib#8248` · [c260d3719e](https://github.com/pkp/pkp-lib/commit/c260d3719e9b3d9dd2a49331d108bfabc1bb3181) · 2023-12-12 (merged 2024-01-24) · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U64 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U64-usage-statistics.md#a5)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

The side menu offers "Counter R5" to the Section Editor. While the
journal's COUNTER statistics are public, which is the setting on a new
install, the page lists the reports for them. While the statistics are
restricted, the page opens an "Error" window reading "The current role
does not have access to this operation." with "OK", over a list reading
"No items found.".

The statistics are restricted when the journal's "Public API" box is
unticked, or when the site administrator has restricted the same
setting for the whole site. The setting's own text gives restricted
reports to admin and manager roles only, so the refusal is intended;
the fault is that the menu still offers the page.

## Impact

- **Lost.** Nothing but a working menu: the Section Editor gets an
  error window and an empty list where the menu should have no entry.
- **Who.** A Section Editor or Guest Editor (Series Editor on a press,
  Moderator on a preprint server) who opens Statistics › "Counter R5"
  while the COUNTER statistics are restricted.
- **Way round.** Not needed: the role is not meant to have the reports
  while they are restricted, and a manager has them.

Low: the Section Editor is refused reports the setting does not give
them, and only the menu entry and the error window are wrong. It would
be medium if the team wants Section Editors to have the reports while
restricted.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main` (on OMP and OPS the same;
  `dbuskins` is a Series editor on the press and a Moderator on the
  preprint server).

Steps:

1. Sign in as `rvaca`. Open Settings › Distribution › "Statistics"
   (`/index.php/publicknowledge/en/management/settings/distribution`).
2. Under "Public API" untick "Make the COUNTER SUSHI statistics
   publicly available" and click "Save".
3. Sign in as `dbuskins`. In the side menu open "Statistics" and click
   "Counter R5".

**Expected.** Step 2 shows "Saved". At step 3 the side menu does not
offer "Counter R5" to the Section Editor: the box's description says
"If unchecked, the API will only be accessible to users with admin or
manager roles."

**Observed.** Step 2 shows "Saved". At step 3 the "Statistics" group
lists "Articles", "Issues", "Journal", "Editorial Activity", "Users"
and "Counter R5". The page "Counter R5 Reports" opens an "Error" window
reading "The current role does not have access to this operation." with
"OK", and its list reads "No items found.". The list's request is
refused:

```
GET /index.php/publicknowledge/api/v1/stats/sushi/reports → 401
{"error":"user.authorization.roleBasedAccessDenied","errorMessage":"The current role does not have access to this operation."}
```

Control: `rvaca`'s "Counter R5" lists every report while the box is
unticked ("Platform Master Report (PR)" to "Journal Article Requests
(IR_A1)"), and once `rvaca` ticks the box again `dbuskins`'s page lists
them too.

## Cause

Two places decide who reads the COUNTER reports, and they disagree while
the statistics are restricted.

The API holds the rule the setting describes.
`PKPStatsSushiController::isPublic()`
(`lib/pkp/api/v1/stats/sushi/PKPStatsSushiController.php`, line 46)
answers false when the site's or the context's `isSushiApiPublic` is
false, and `getRouteGroupMiddleware()` (lines 77–84) then lets in
`ROLE_ID_SITE_ADMIN` and `ROLE_ID_MANAGER` only.

The page does not know the rule. `PKPStatsHandler::__construct()`
(`lib/pkp/pages/stats/PKPStatsHandler.php`, lines 43–46) grants the
`counterR5` operation to `ROLE_ID_SUB_EDITOR` always, and
`PKPTemplateManager` (`lib/pkp/classes/template/PKPTemplateManager.php`,
lines 1375 and 1400–1404) adds the "Counter R5" menu entry for site
administrators, managers and `ROLE_ID_SUB_EDITOR` always. The role
grant and the menu entry both came with the page itself, in
`pkp/pkp-lib#9600` (3.4) and its port `pkp/pkp-lib#10149` (`main`), on
top of an API that already had the restricted mode.

So the page renders for the Section Editor, `CounterReportsListPanel.vue`
fetches `stats/sushi/reports`, the API answers 401, and the fetch's
shared error handling shows the answer's message in the "Error" window
over the empty list.

Reach:

- The Guest Editor on OJS, the Series Editor on OMP and the Moderator
  on OPS hold `ROLE_ID_SUB_EDITOR` and get the same (Series Editor and
  Moderator checked on screen; Guest Editor in the code,
  `registry/userGroups.xml`).
- The site's "Public API" restricted (Administration › Site Settings ›
  "Statistics") has the same effect in every journal of the site, as
  `isPublic()` reads the site's value first (checked in the code).
- The other Statistics pages are not touched: their API controllers
  (`stats/publications`, `stats/contexts`, `stats/editorial`,
  `stats/users`, and OJS's own `stats/issues`) let `ROLE_ID_SUB_EDITOR`
  in, as their pages do, OJS's `StatsHandler` included (checked in the
  code; "Articles" checked on screen).
- No stored data is wrong.

## Proposed fix

A proposal: let the page and the menu follow the rule the API already
has, so a Section Editor is offered "Counter R5" only while the COUNTER
statistics are public. This follows the setting's wording. If the team
instead wants Section Editors to keep the reports while restricted,
that is the one-line first alternative below, and a product decision to
take before either change is made.

The patch is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-editor-counter-r5-error-while-restricted/fix.diff),
four short hunks in `lib/pkp`, as a diff against the app root:

- `Context::isSushiApiPublic(Site $site): bool`, new, holds the rule
  beside `isInstitutionStatsEnabled(Site $site)` and
  `getEnableGeoUsageStats(Site $site)`, which decide the two other
  statistics settings the same way.
- `PKPStatsSushiController::isPublic()` returns that method's answer
  instead of its own copy of the test; the API behaves as before.
- `PKPStatsHandler::authorize()` takes `counterR5` out of
  `ROLE_ID_SUB_EDITOR`'s operations while the statistics are restricted.
  A Section Editor who types the page's address then gets the standard
  access-denied page.
- `PKPTemplateManager` adds the "Counter R5" entry when the statistics
  are public or the user is a manager or site administrator. The menu
  already does this for "Institutions", with
  `$request->getContext()->isInstitutionStatsEnabled($request->getSite())`.

```php
public function isSushiApiPublic(Site $site): bool
{
    return (bool) ($site->getData('isSushiApiPublic') ?? true) && (bool) ($this->getData('isSushiApiPublic') ?? true);
}
```

A search of the other statistics pages and their API controllers, OJS's
"Issues" included, found no second page offered to a role its API
refuses. Two other places read `isSushiApiPublic` by hand and are left
as they are, because they ask about the site's value alone, to decide
whether the journal's "Statistics" tab and its "Public API" box are
shown: `ManagementHandler.php` line 391 and
`PKPContextStatisticsForm.php` line 86.

Tried on `main`, on the three apps: with the diff applied, the Section
Editor's "Statistics" group no longer lists "Counter R5" at step 3, and
the page's address shows "The current role does not have access to this
operation." on the access-denied page. What must not change stays the
same with and without the fix: the Section Editor's menu entry and list
while public, the manager's entry and list while restricted, the
Section Editor's "Articles" page while restricted, and the Section
Editor's list once the box is ticked again.

**Alternatives**

- Let the restricted API serve `ROLE_ID_SUB_EDITOR` too: one line, and
  the page then works for the Section Editor. It changes what the
  setting promises ("only … admin or manager roles") and what its
  description and the site option "Restrict access to the COUNTER SUSHI
  statistics API to managers and admins" say; a product decision.
- Take "Counter R5" from the Section Editor altogether: simpler, but it
  removes a page that works for them today while the statistics are
  public. Public statistics are open to anyone, signed out included.
- Only show a kinder message on the page: the menu would still offer a
  page the role cannot use.

**What goes with it**

- Backport: the diff applies as written to `stable-3_5_0`. On
  `stable-3_4_0` the API is the Slim `PKPStatsSushiHandler`, whose
  constructor holds the test; the `Context` method, the page handler
  and the menu change the same way there.
- Guard: a unit test of `Context::isSushiApiPublic()` over the site and
  context values, and an e2e scenario for the Section Editor's menu and
  page while restricted (a Planned item of the spec).

Small: about 30 changed lines in one repository, and a unit test.

## Evidence

- A Playwright script that runs the Steps and the control on an install
  loaded from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-editor-counter-r5-error-while-restricted/walk.js),
  with helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-editor-counter-r5-error-while-restricted/lib.js).
  Run it with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/section-editor-counter-r5-error-while-restricted/walk.js`.
- The check of what must not change is the same script with
  `WALK_MODE=neighbour`.
- The fix, tried 2026-10-02 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/section-editor-counter-r5-error-while-restricted/fix.diff ojs omp ops`,
  then the script in both modes, then `revert`. The check of what must
  not change was also run without the fix.
- Walked 2026-10-02 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [e8dafbc](https://github.com/pkp/datasets/commit/e8dafbcf0a61c21a3653dd24d9a1282f36762d12)
  (2026-10-02). The fault is a role check in PHP, so the database does
  not matter.
  - main: OJS b84f8e2e44 (lib/pkp ddd8ab243a), OMP 3b0ecf794c and OPS
    c8af945bb7 (lib/pkp 3dc90c81a6): the same result on each, with each
    app's own menu entries and reports.
  - stable-3_5_0: OJS 091fb65453, OMP 9c5e24246c, OPS 38b61882d3
    (lib/pkp cf3f984335): the same result at every step.
- 3.4, by code, each file read with `git show origin/stable-3_4_0:<path>`:
  pkp-lib `stable-3_4_0` at 9e41f10273 (OJS c1827e3527,
  OMP 0aec65441f, OPS acd8ae704b), ui-library `stable-3_4_0` at
  ee684b34. `PKPStatsHandler::__construct()` (lines 44–47) grants
  `counterR5` to `ROLE_ID_SUB_EDITOR`, `PKPTemplateManager` (lines 1113
  and 1137–1140) adds the menu entry for the same roles, and
  `PKPStatsSushiHandler::__construct()`
  (`api/v1/stats/sushi/PKPStatsSushiHandler.php`) gives every endpoint
  the roles site admin and manager when either `isSushiApiPublic` is
  false. The list panel there
  (`src/components/ListPanel/counter/CounterReportsListPanel.vue`)
  passes a failed fetch to `ajaxErrorCallback()`. The page arrived in
  3.4.0-5.
- 3.3, by code: pkp-lib `stable-3_3_0` at ac3fa73402. Nothing under
  `pages/`, `classes/` or `api/` names `counterR5` or
  `isSushiApiPublic`.
- Introduced: on `main`, `git blame` on `PKPStatsHandler.php` line 45
  and on `PKPTemplateManager.php` lines 1400, 1401 and 1403 gives
  [28b974e8f1](https://github.com/pkp/pkp-lib/commit/28b974e8f18f9620605ebe7506b75502d73c1d12)
  (`pkp/pkp-lib#10149` for `pkp/pkp-lib#9666`, merged 2024-10-15, the
  port of the 3.4 change by the same author); line 1402, the entry's
  address, gives 4079896cec (2024-07-17), which only corrected the
  address. `git log -S"'counterR5'"` on `stable-3_4_0` gives c260d3719e.
  The API's restricted mode is older (28b366b248, 2022-01-27). The Kind
  is "defect" rather than "regression" because the page has been
  refused to this role while restricted since it was added.
- Upstream search (2026-10-02), pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library, issues and PRs, open and closed: "Counter R5
  section editor", "Counter R5" with "does not have access", "COUNTER
  SUSHI restrict managers sub editor", "COUNTER R5 reports sub editor
  access", `isSushiApiPublic`, `PKPStatsSushiController isPublic`,
  `CounterReportsListPanel`. The hits (`pkp/pkp-lib#6781`,
  `pkp/pkp-lib#6782`, `pkp/ui-library#309`) are the feature's own work,
  not this fault.
- Not driven: a Guest Editor (the dataset has none) and the site's
  "Public API" restricted; both are read in the code, as Reach says.
- Unverified: the fix on `stable-3_5_0` beyond the diff applying
  cleanly to its files, and on `stable-3_4_0`; MySQL not walked.
