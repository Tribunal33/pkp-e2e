# Presses and preprint servers cannot delete an institution, and removing a press or server that has one leaves it half deleted

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OMP, OPS
  - 3.5: OMP, OPS
  - 3.4: OMP, OPS (code)
  - 3.3: none (no Institutions page)
- **Introduced** `pkp/pkp-lib#8109` for `pkp/pkp-lib#6782` · [bed0ee4c3b](https://github.com/pkp/pkp-lib/commit/bed0ee4c3bcde7cf48c9f70bdee9400b061a31c1) · 2021-06-15 (merged 2022-07-23) · Bozana Bokan (bozana)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U66 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U66-institutions.md#a3), [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U66-institutions.md#a8)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

On a press or preprint server, clicking "Delete" on an institution and
then "Yes" opens a window titled "Error". The institution stays listed,
also after a reload.

Removing a press or server that has an institution, under
Administration › "Hosted Presses" ("Hosted Servers"), fails too. The
"Confirm" window stays open with no message. The press stays listed and
public, but half deleted: its roles are gone, so even the Site
Administrator is refused its Settings pages.

This affects only presses and servers that have added an institution.
"Institutions" is in the side menu only while institutional statistics
are turned on for the site and for the press; both are off on a new
install.

## Impact

- **Lost.** An institution, once added, can never be deleted. A press
  or server that has one cannot be removed: it is left public, and
  nobody can manage it. On a press, its own OAI-PMH list and the site's
  then list each published book twice, once live and once deleted.
- **Who.** A Press Manager (on a server, its Manager) who deletes an
  institution, and the Site Administrator who removes a press or server
  that has one. It fails on every attempt.
- **Way round.** In the app, the leftover press can only be hidden. Its
  "Edit" on "Hosted Presses" still saves. Turning off "Enable this press
  to appear publicly on the site" hides the press from signed-out
  visitors, and its live records from the OAI-PMH lists. Outside the
  app, deleting the press's rows from the `institutions` table lets
  "Remove" complete; no command-line tool deletes an institution or a
  press.

Medium: only presses and servers that use institutions are affected,
and the leftover press can at least be hidden. It would be high if
presses and servers commonly used institutions.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main` (on OPS the same, with
  "Hosted Servers", "Create Server", "server" and "Public Knowledge
  Preprint Server" for "press" and "Public Knowledge Press"). Signed in
  as `admin` (password `admin`), the site administrator, who is also a
  Press Manager of the dataset's press "Public Knowledge Press"
  (`publicknowledge`).
- A second press with no institution, for the control in step 8 (the
  dataset has only one press): Administration › "Hosted Presses" ›
  "Create Press", "Press Name" "Empty Press", "Press Initials" "EP",
  "Principal Contact Name" "Empty Press", "Principal Contact Email"
  "emptypress@mailinator.com", "Country" "Canada", "Path" `emptypress`,
  "Languages" and "Primary locale" English, "Save".

Steps:

1. Open the press's Institutions page,
   `/index.php/publicknowledge/en/management/settings/institutions`
   (the address works even though the side menu hides "Institutions").
2. Click "Add Institution", type "Campus Library" in "Name", click
   "Save". The row "Campus Library" is listed.
3. On the row "Campus Library", click "Delete". The "Delete Institution"
   dialog asks "Are you sure you want to continue and delete this
   institution?". Click "Yes".
4. Click "OK" on the window that opens, then reload the page.
5. Open Administration › "Hosted Presses". On the row "Public Knowledge
   Press", open its actions and click "Remove"; the "Confirm" window asks
   "Are you sure you want to permanently delete Public Knowledge Press
   and all of its contents?". Click "OK".
6. Reload "Hosted Presses".
7. Open the press's Institutions page again (step 1's address), its
   Settings › "Users & Roles"
   (`/index.php/publicknowledge/en/management/settings/access`), its
   home page `/index.php/publicknowledge` and its OAI-PMH list,
   `/index.php/publicknowledge/oai?verb=ListIdentifiers&metadataPrefix=oai_dc`.
8. On "Hosted Presses", click "Remove" on "Empty Press", then "OK".

**Expected.** Step 3: the dialog closes and "Campus Library" leaves the
list. Step 5: the "Confirm" window closes, "Public Knowledge Press"
leaves the list, and its institution is deleted with it.

**Observed.** Step 3: a window titled "Error" opens with one button,
"OK". The request sent by "Yes" returns 500:

```
POST /index.php/publicknowledge/api/v1/institutions/1   (X-Http-Method-Override: DELETE)   500
```

Step 4: after "OK" and the reload, "Campus Library" is still listed.
Step 5: the "Confirm" window stays open with no message; the request
returns 500:

```
POST /index.php/index/$$$call$$$/grid/admin/context/context-grid/delete-context?rowId=1   500
```

The server log, for both requests:

```
Illuminate\Database\QueryException: SQLSTATE[42P01]: Undefined table: 7 ERROR:  relation "institutional_subscriptions" does not exist
LINE 1: select exists(select * from "institutional_subscriptions" wh...
```

Step 6: "Public Knowledge Press" is still listed. Step 7: both settings
pages show "The current role does not have access to this
operation.", while the press's home page still opens with its catalog.
On OMP, the OAI-PMH list shows the formats of the dataset's two
published books twice each, once live and once deleted:

```
<header><identifier>oai:omp.localhost:publicationFormat/2</identifier>…
<header status="deleted"><identifier>oai:omp.localhost:publicationFormat/2</identifier>…
<header><identifier>oai:omp.localhost:publicationFormat/3</identifier>…
<header status="deleted"><identifier>oai:omp.localhost:publicationFormat/3</identifier>…
```

Step 8: "Empty Press" leaves the list.

Control: on OJS, the same steps with "Journal of Public Knowledge" (on
"Hosted Journals") delete the institution at step 3 and remove the
journal at step 5.

## Cause

`PKP\institution\DAO::delete()` (lib/pkp
`classes/institution/DAO.php`, lines 174–186 on main) chooses between a
soft and a hard delete by checking whether an institutional
subscription refers to the institution:

```php
$shouldSoftDelete = DB::table('institutional_subscriptions')
    ->where('institution_id', '=', $institution->getId())
    ->exists();
```

`institutional_subscriptions` is an OJS table (`OJSMigration`). OMP and
OPS do not create it, so on a press or preprint server the query throws
and every delete of an institution fails.

The feature's own migrations already check for the table in `up()`,
with `Schema::hasTable('institutional_subscriptions')`
(`InstitutionsMigration::up()`, and
`I6895_CreateNewInstitutionsTables::up()` in the 3.4 upgrade).
`InstitutionsMigration::down()` drops the table's foreign key without
that check.

Reach, checked in the code:

- `PKPInstitutionController::delete()` (`api/v1/institutions`), called
  by the Institutions page's "Delete" › "Yes": fails (reproduced).
- `PKPContextService::delete()`, called by "Hosted Presses" › "Remove",
  calls `Repo::institution()->deleteMany()` for the context's
  institutions, which calls `DAO::delete()` for each one: fails
  (reproduced).
  - The method runs without a transaction. Before it reaches the
    institutions, it runs the `Context::delete::before` hook (on OMP,
    `APP\services\ContextService::beforeDeleteContext()` writes a
    publication format tombstone for every published book and deletes
    the genres). It then deletes the context's announcement types,
    review assignments, user groups, genres, announcements and
    highlights.
  - These changes stay when the query throws (user groups, genres and
    OMP's tombstones checked in the database, the rest read in the
    code). The context row, its settings, institutions, sections and
    submissions, and everything else due to be deleted after that
    point, remain.
- No other caller of `Repo::institution()->delete()` or `deleteMany()`
  exists in pkp-lib, OMP, OPS or their bundled plugins, and no other
  query in pkp-lib outside the migrations names an OJS-only table.

## Proposed fix

A proposal; not tried.

Recommended: guard the query in the shared DAO, as
`InstitutionsMigration::up()` already guards the same table. On an app
without institutional subscriptions, an institution is then simply hard
deleted, as OJS already does when no subscription refers to it. OJS's
behavior is unchanged:

```diff
+use Illuminate\Support\Facades\Schema;
 ...
     public function delete(Institution $institution): void
     {
-        // If the reference in the table institutional_subscriptions exists, soft delete the institution
-        $shouldSoftDelete = DB::table('institutional_subscriptions')
-            ->where('institution_id', '=', $institution->getId())
-            ->exists();
+        // Keep (soft delete) an institution an OJS institutional subscription names;
+        // OMP and OPS have no such table.
+        $shouldSoftDelete = Schema::hasTable('institutional_subscriptions')
+            && DB::table('institutional_subscriptions')
+                ->where('institution_id', '=', $institution->getId())
+                ->exists();
```

**Alternatives:**

- Move the rule to OJS: an OJS institution DAO or repository that
  overrides `delete()`, bound through OJS's `Repo` facade, as OJS's
  `APP\user\Repository::mergeUsers()` handles its subscription tables.
  The layering is cleaner, since pkp-lib would no longer name an OJS
  table, but it needs a new class and changes in two repos for the same
  outcome. It is worth it if the team wants pkp-lib free of app tables.
- Catch the failure in `PKPInstitutionController::delete()` and
  `PKPContextService::delete()`: a workaround at two callers that
  leaves the DAO wrong for any plugin that calls it.

**What goes with it:**

- No API or hook change: the delete returns 200 as it does on OJS, and
  `Institution::delete::before` and `Institution::delete` fire as they
  do there.
- Stored data: no repair migration is needed. A half-deleted press is
  one a site administrator set out to remove, and with the fix,
  "Remove" on it again completes. `PKPContextService::delete()` runs
  again over what is left. On OMP, the before-delete hook replaces each
  format's tombstone (it deletes the old one first), so none is doubled
  and the OAI-PMH lists show each book once, as deleted. This was
  reproduced with the press's institutions deleted by hand, which is
  what the fixed DAO does. A site that wants such a press back needs its
  backup: the press's user groups and genres are gone.
- The same guard in `InstitutionsMigration::down()` would let the
  migration be reversed on OMP and OPS; `down()` runs only on a
  rollback.
- Wrapping `PKPContextService::delete()` in a transaction would stop
  any later failure there from leaving a context half deleted; that is
  a separate hardening, not needed for this fix.
- Backport: the same lines are in `stable-3_5_0` and `stable-3_4_0` of
  pkp-lib, so the diff applies as written.
- Guard: a test in pkp-lib's institution tests, run under OMP or OPS,
  that deletes an institution; and the e2e scenario in U66 that deletes
  an institution on a press and a preprint server, and removes a press
  that holds one.

Small: one guarded condition in the shared DAO, following the
migration's `up()`, and a test.

## Evidence

- Kept script that runs the Steps on the three apps (OJS as the control),
  each on an install freshly loaded from PKP's default test dataset
  (pkp/datasets c0f9f10, the `main` and `stable-3_5_0` PostgreSQL
  dumps, no upgrade needed):
  [`shared/playwright/checks/issues/omp-ops-institution-delete-fails/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-ops-institution-delete-fails/walk.js),
  run with `PROBE_FEATURE=issues-rv1 PROBE_AGENT=rv1 node bin/probe.js all shared/playwright/checks/issues/omp-ops-institution-delete-fails/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). The control press
  gets a generated name and path. Besides the screens, the script
  checks the press's row, institutions, user groups, genres and OMP's
  tombstones in the database.
- Way round and second "Remove", on the main install as `walk.js` left
  it (OMP and OPS):
  [`after.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-ops-institution-delete-fails/after.js)
  turns off "Enable…" on the leftover press (the save returns 200),
  deletes its `institutions` rows by SQL and clicks "Remove" again. The
  press is removed, OMP keeps one tombstone per format, and the
  site-wide OAI-PMH list shows each book once, as deleted. That
  signed-out visitors and harvesters cannot reach the hidden press was
  read in the code (`PKPPageRouter` sends them to the login page; OMP's
  `OAIDAO::getRecordsRecordSetQuery()` lists only enabled presses), not
  driven.
- The server log line was read from the app's log for both requests;
  both stacks pass through `classes/institution/DAO.php` (line 179 on
  main, 195 on 3.5), the removal's through `PKPContextService.php`
  (line 716 on main, 703 on 3.5; `Repo::institution()->deleteMany()`).
- main walked at OJS 7ce98ec09e, OMP 3b0ecf794c, OPS c8af945bb7 (lib/pkp
  3dc90c81a6); 3.5 at OJS 040e916378, OMP 4f90dadac0, OPS 0bb1ca0f6e
  (lib/pkp 8809a197de), where `DAO::delete()` carries the same query
  (line 193).
- Code read on main (lib/pkp 3dc90c81a6): `classes/institution/DAO.php`,
  `Repository.php`, `PKPContextService::delete()`,
  `PKPInstitutionController::delete()`, `InstitutionsMigration`, OMP's
  `ContextService::beforeDeleteContext()` and
  `PublicationFormatTombstoneManager`, OJS's `OJSMigration` and
  `APP\user\Repository`; a search of lib/pkp, OMP, OPS and OJS for
  callers and for other OJS-only table names outside migrations.
- Introduced: `git blame` on the query's lines gives bed0ee4c3b
  (authored 2021-06-15); the line above it was only reworded in
  98b335d0c0; GitHub's `commits/<sha>/pulls` gives PR `pkp/pkp-lib#8109`.
- 3.4 by code: lib/pkp `origin/stable-3_4_0` (df13621c2d) has the same
  query (line 191) and the same order in `PKPContextService::delete()`;
  OMP `upstream/stable-3_4_0` (0aec65441f) and OPS (acd8ae704b) ship
  `api/v1/institutions` and create no `institutional_subscriptions`;
  OJS (9571d8fde7) creates it.
- 3.3 by code: lib/pkp `origin/stable-3_3_0` (d446601ebe) has no
  institution classes, and OMP (8e72fc8836) and OPS (c5532e2161) no
  institutions list.
- Upstream search, 2026-09-30, pkp/pkp-lib, pkp/omp, pkp/ops and
  pkp/ui-library, issues and PRs, by the symptom's words and by
  `institutional_subscriptions`: nothing on this fault
  (`pkp/pkp-lib#12391` is another cause of the same "Remove" failure).
- Not driven: MySQL; a press whose institution usage statistics are
  collected (the delete fails before any statistics code runs).
- Unverified: how a harvester settles an identifier listed both live
  and deleted.
