# Site Settings' "Journal redirect" list ignores the Hosted Journals order, and on PostgreSQL reshuffles after a journal save

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/ojs#2067` for `pkp/pkp-lib#3594` · [43b3907299](https://github.com/pkp/ojs/commit/43b3907299b8cfd08c0903f672027fc32320beeb) · 2018-10-23 · Nate Wright (NateWr); up to 3.1 the list was sorted in the Hosted Journals order
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U60 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U60-site-settings.md#a11)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

The Site Administrator opens Administration › "Site Settings" ›
"Settings" and expects the "Journal redirect" list to show the journals
in the order set under Administration › "Hosted Journals", as "Bulk
Emails" on the same page and the site's home page do. On every
database, the list instead follows the order in which the database
stores the journals, and an order set with "Order" on Hosted Journals
never reaches it. On MySQL that is, by the code, the order the journals
were created in.

On PostgreSQL the list also reshuffles: after a journal's "Edit" window
is saved, even with nothing changed, that journal moves to the end of
the list.

Nothing is lost, and the redirect saves as chosen, but on a site with
many journals the administrator has to scan the whole list to find one.
Up to 3.1 the list followed the Hosted Journals order.

## Impact

- **Lost.** Nothing: the redirect is stored and works.
- **Who.** The Site Administrator of a site with two or more journals,
  when setting or changing the redirect. On MySQL, every site whose
  Hosted Journals order differs from the order the journals were
  created in; on PostgreSQL, also every site once a journal's "Edit"
  window has been saved.
- **Way round.** Read the whole list.

Low: no data, work or message is lost and the redirect is set as
chosen; only the order of the choices is wrong.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main`, the PostgreSQL dump (`pgsql`),
  freshly loaded (OJS; OMP and OPS the same with "Press" and "Server"
  for "Journal"). It hosts one journal, "Journal of Public Knowledge"
  ("Public Knowledge Press", "Public Knowledge Preprint Server"), path
  `publicknowledge`.
- Nothing else. The two more journals are created in steps 2 and 3:
  while the site hosts exactly one journal, enabled or not, Site
  Settings has no "Settings" tab and so no "Journal redirect". With the
  tab shown, the list holds the journals enabled publicly and appears
  when there is at least one.

Steps:
1. Sign in as `admin` (password `admin`).
2. Open Administration › "Hosted Journals" ("Hosted Presses", "Hosted
   Servers") › "Create Journal" ("Create Press", "Create Server"). Fill
   in "u60g Zulu" as the title and as the contact name, `U60GZ` as the
   initials, `u60gz@mailinator.com` as the contact email, "Canada" as
   the country and `u60gzulu` as the path. Tick "English" under
   "Languages", choose "English" under "Primary locale", and tick
   "Enable this journal to appear publicly on the site". Press "Save";
   the Settings Wizard opens.
3. Do the same for "u60g Alpha" (`U60GA`, `u60ga@mailinator.com`, path
   `u60galpha`).
4. Open Administration › "Hosted Journals". The table reads "Journal of
   Public Knowledge", "u60g Zulu", "u60g Alpha".
5. Open Administration › "Site Settings" › "Site Setup" › "Settings" and
   open "Journal redirect" ("Press redirect", "Server redirect"). Then
   open "Bulk Emails".
6. Open "Hosted Journals", press "Order", drag "u60g Alpha" above "u60g
   Zulu" and press "Done". The table now reads "Journal of Public
   Knowledge", "u60g Alpha", "u60g Zulu", which is also the order by
   name.
7. Open "Site Settings" › "Settings" › "Journal redirect" again, then
   "Bulk Emails".
8. Open "Hosted Journals", open "Journal of Public Knowledge"'s "Edit"
   and press "Save" without changing anything. The window shows "Saved"
   and closes; the table's order is unchanged.
9. Open "Site Settings" › "Settings" › "Journal redirect" again, then
   "Bulk Emails".

**Expected:** at steps 5, 7 and 9 "Journal redirect" lists the journals
in the order Hosted Journals shows, after the blank first choice: at
step 5 "Journal of Public Knowledge", "u60g Zulu", "u60g Alpha"; at
steps 7 and 9 "Journal of Public Knowledge", "u60g Alpha", "u60g Zulu".

**Observed:** step 5 matches. After the reorder and the save, the list
does not follow:

```
step 5  Journal redirect: Journal of Public Knowledge, u60g Zulu, u60g Alpha
step 7  Journal redirect: Journal of Public Knowledge, u60g Zulu, u60g Alpha
step 9  Journal redirect: u60g Zulu, u60g Alpha, Journal of Public Knowledge
```

"Bulk Emails" followed the Hosted Journals order each time. On MySQL,
by the code, the list would read "Journal of Public Knowledge", "u60g
Zulu", "u60g Alpha" at steps 5, 7 and 9: still wrong at steps 7 and 9,
but unmoved by the save at step 8.

## Cause

`PKPSiteConfigForm::__construct()` builds the list's options from
`app()->get('context')->getMany(['isEnabled' => true])`.
`PKPContextService::getMany()` runs the query of
`PKPContextQueryBuilder::getQuery()`, which has no `ORDER BY`. Without
one, the database returns the rows in whatever order it reads them:
- On PostgreSQL that is the table's storage order. Every `UPDATE`
  writes a new version of the row, usually after the rows already
  stored, so a journal whose row is written usually moves to the end
  of the list.
- On MySQL (InnoDB) a scan of the table follows the primary key, the
  journals' ids, which is the order they were created in. By the
  code; not walked.

Three screens write the journals' rows:
- "Create Journal": `PKPContextService::add()` calls
  `ContextDAO::resequence()`, which rewrites every row in the site's
  order. That is why the list matches the site's order at step 5.
- "Order" › "Done": `OrderGridItemsFeature::saveSequence()` calls
  `ContextGridHandler::setDataElementSequence()` only for the rows whose
  position changed, and walks them in their order from before the drag.
  So the moved rows are rewritten in their old order, and the list keeps
  it (step 7).
- "Edit" › "Save": `PKPContextService::edit()` →
  `ContextDAO::updateObject()` (step 9).

The site's order is the `seq` column. Every other list of the journals
sorts by it: `ContextDAO::getAll()` (`ORDER BY seq`; Hosted Journals and
the site's home page) and `PKPContextQueryBuilder::getManySummary()`
(`orderBy('c.seq')`; "Bulk Emails" and the editorial header's journal
switcher). `getManySummary()` got its sort in 2021 for the switcher
(`pkp/pkp-lib#6747`, [1f2f692d70](https://github.com/pkp/pkp-lib/commit/1f2f692d70f31b78720f538f5c7b4e4bd71ecc89)).

Up to 3.1 the redirect list was sorted. `SiteSetupForm::fetch()` read
`ContextDAO::getNames()`, that is `getAll()`, `ORDER BY seq`. The 3.2
redesign (`pkp/ojs#2067`) replaced it with the Vue form, which read the
context service's unsorted list. The form moved to pkp-lib as
`PKPSiteConfigForm` in `pkp/pkp-lib#4762`
([c4985f94ae](https://github.com/pkp/pkp-lib/commit/c4985f94aea6577a1e6c513ad07de2ff839367e0)),
with the same read.

The reach of the cause:
- `GET /api/v1/contexts` (`PKPContextController::getMany()`) runs the
  same query with `LIMIT` and `OFFSET`. On PostgreSQL a client paging
  through the journals can get one twice and miss another when a
  journal is saved between two pages. Checked in the code; no screen
  calls it.
- `getIds()`: the scheduled tasks `DepositDois`, `EditorialReminders`
  and `PublishSubmissions`, the upgrade migrations,
  `tools/setVersionTool.php`, `emailTemplate\DAO` and the statistics
  API's journal search (`PKPStatsContextController`). The order does not
  matter in any of them. Checked in the code.
- `getCount()` and `getMax()`: counts only. Checked in the code.
- No app overrides `getQuery()` or the form; OJS, OMP and OPS share
  both. Checked in the code, and on screen on all three.

## Proposed fix

Sort the context service's query by the site's order, with the id as a
tie-breaker, in `PKPContextQueryBuilder::getQuery()`, and drop the now
duplicate sort from `getManySummary()`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/site-redirect-list-ignores-journal-order/fix.diff)):

```diff
--- a/lib/pkp/classes/services/queryBuilders/PKPContextQueryBuilder.php
+++ b/lib/pkp/classes/services/queryBuilders/PKPContextQueryBuilder.php
@@ -134,7 +134,6 @@
                     ->where('cst.setting_name', '=', 'name')
                     ->where('cst.locale', '=', DB::raw('c.primary_locale'));
             })
-            ->orderBy('c.seq')
             ->get()
             ->toArray();
     }
@@ -203,6 +202,9 @@
             }
         });
 
+        // List the contexts in the site's order (Administration > Hosted Journals)
+        $q->orderBy('c.seq')->orderBy('c.' . $this->dbIdColumn);
+
         // Add app-specific query statements
         Hook::call('Context::getContexts::queryObject', [&$q, $this]);
         $q->select($this->columns);
```

The rule (journals are listed in the site's order) belongs to the query
every list of the service is built from, not to one form. So the
redirect list and the REST API's pages are both covered. This follows
`ContextDAO::getAll()` and `GalleyQueryBuilder::getQuery()`, which sorts
by `g.seq` in the same place. `seq` is kept distinct by `resequence()`
and the grid's "Order", but nothing in the schema enforces it, so the
id makes the order total and the API's pages stable. `getCount()` goes
through Laravel's `getCountForPagination()`, which drops the `ORDER BY`.

The sort by `seq` alone was tried on `main` on OJS, OMP and OPS. The
walk then read "Journal of Public Knowledge", "u60g Alpha", "u60g Zulu"
at steps 7 and 9. With the fix in and out, "Bulk Emails", Hosted
Journals and the site's home page listed the journals in the same
order, and Site Settings with the dataset's one journal showed the same
tabs. The id tie-breaker, which only adds a second sort key, was added
afterwards and not walked.

**Alternatives:**
- Sort the options by name in `PKPSiteConfigForm`. That is a product
  decision: in `pkp/pkp-lib#6747` one maintainer leaned towards names,
  another towards one set order applied everywhere, and the switcher
  got the set order. It would also leave the API's pages unsorted.
- Read `ContextDAO::getAll(true)` in the form. It fixes the form only,
  and the API's pages stay unsorted.

**What goes with it:**
- No data repair: `seq` is already kept in order by `resequence()` and
  the grid's "Order".
- `GET /api/v1/contexts` answers in the site's order from then on,
  where it had no defined order.
- A plugin that sorts through the `Context::getContexts::queryObject`
  hook now gets `seq` and the id as the first sort keys and its own
  after them; none of the plugins the three apps ship uses that hook.
- Backport: the same changes apply to 3.5 and 3.4, whose `getQuery()`
  and `getManySummary()` match `main`'s. 3.3's
  `PKPContextQueryBuilder.inc.php` groups by the journal's id, and the
  same sort is valid there (both columns depend on the grouped primary
  key).
- Guard: a pkp-lib unit test that gives two contexts a `seq` order
  against their id order (swap their `seq`) and reads `getMany()`,
  expecting the `seq` order. A test that only saves a context passes on
  MySQL without the fix, since `seq` order equals id order there.

Small: one line in the shared query builder and a unit test.

## Evidence

- Kept script, which takes the Steps in the browser on an install loaded
  from PKP's default test dataset and records the redirect list, "Bulk
  Emails" and the Hosted Journals table at each step:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/site-redirect-list-ignores-journal-order/walk.js)
  (helpers in `lib.js` beside it), run from pkp-e2e with `node
  bin/probe.js all
  shared/playwright/checks/issues/site-redirect-list-ignores-journal-order/walk.js`.
- Branch tips: OJS `main` ff004d0973 (lib/pkp 987776cd04), OMP `main`
  3b0ecf794c (lib/pkp 3dc90c81a6), OPS `main` c8af945bb7 (lib/pkp
  3dc90c81a6); OJS `stable-3_5_0` c1cee76b95 (lib/pkp 771474347e), OMP
  9c5e24246c and OPS 38b61882d3 (lib/pkp cf3f984335). Datasets:
  pkp/datasets 566bb1f (2026-10-03), `pgsql`. The walks ran on
  PostgreSQL; MySQL not checked.
- Code reads on `stable-3_4_0` (OJS d68934d0d1, lib/pkp 767353f4fe) and
  `stable-3_3_0` (OJS ac77c9fb35, lib/pkp ac3fa73402):
  `PKPSiteConfigForm` reads the same `getMany(['isEnabled' => true])`,
  and `getQuery()` has no sort (only `getManySummary()` has one); the
  three apps share the form and the query builder there too. The 3.1
  list's source, `SiteSetupForm::fetch()` and `ContextDAO::getNames()`,
  was read at pkp-lib 5f3be929e6's parent.
- `pkp/pkp-lib#6747` (closed, fixed in 2021) is the same missing sort on
  the journal switcher's list, a different query.
- Unverified: the MySQL order (read in the code, not walked); the REST
  API's paging fault (read in the code, not driven); the id
  tie-breaker (not walked).
