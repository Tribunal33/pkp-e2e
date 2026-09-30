# Presses and preprint servers cannot delete an institution, and removing one that holds one half deletes it

Severity: medium · Effort: small · Defect · OMP OPS · main 3.5 3.4 · crash: server

Introduced: `pkp/pkp-lib#8109` for `pkp/pkp-lib#6782`, commit [bed0ee4c3b](https://github.com/pkp/pkp-lib/commit/bed0ee4c3bcde7cf48c9f70bdee9400b061a31c1) (written 2021-06-15, merged 2022-07-23), by Bozana Bokan (bozana)

Affects: main OMP OPS (driven), OJS does not (driven) · 3.5 OMP OPS (driven), OJS does not (driven) · 3.4 OMP OPS (by code), OJS does not (by code) · 3.3 n/a (no institutions list in any of the three apps)

Upstream: none found (2026-09-30)

OMP at 3b0ecf794c, OPS at c8af945bb7 (lib/pkp 3dc90c81a6), OJS at 7ce98ec09e as the control. Tracked
in spec U66 Institutions, register [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U66-institutions.md#a3) and [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U66-institutions.md#a8).

## Summary

On a press and a preprint server, "Yes" on an institution's "Delete"
fails on the server: a window titled "Error" opens, and the institution
stays listed, after a reload too. Removing such a press or preprint
server under Administration › "Hosted Presses" ("Hosted Servers") fails
on the server as well: the "Confirm" window stays open with no message,
the press stays listed, and it is left half deleted, its roles gone, so
even the Site Administrator is refused its Settings pages while its
public site stays up. Nothing on screen gets round either, so an
institution once added, a mistyped one included, stays for good, and so
does the press that holds it, on every OMP and OPS version with the
Institutions page (3.4, 3.5 and main); journals are not affected.

## Impact

What is lost: a Press Manager (a preprint server's Manager) can never
remove an institution, and a Site Administrator can never remove a press
or server that holds one. The failed removal is not undone: the press's
user groups (every user's role in it) and genres are already deleted
when the request fails, and so, as read from the code, are its review
assignments, announcements and highlights. The press stays on the public
site with nobody able to manage it, the Site Administrator included, and
its roles cannot be restored from any screen. The institution delete
says only "Error"; the removal says nothing at all.

Who meets it: only a press or server that uses institutions. The side
menu offers "Institutions" only while institutional statistics are
enabled for the site and for the press, and both are off at install;
every press or server that has added an institution meets both
failures, on every attempt.

Way round: none on screen. The institution can be renamed but not
removed, and the press cannot be removed while it holds one.

Medium: two administrative tasks fail with no way round and one of them
destroys a press's roles, but only on a press or server that uses
institutions, which the side menu offers only once institutional
statistics are turned on; it would be high if institutions were in
common use on presses and servers.

## Steps to reproduce

Preconditions:

- A fresh install of OMP (on OPS the same, with "Hosted Servers",
  "Create Server" and "server" for "press"), default language English,
  signed in as the site administrator ("admin").
- Administration › "Hosted Presses" › "Create Press": a press "Test
  Press", path `testpress`. The administrator who creates a press is its
  Press Manager.
- A second press "Empty Press", created the same way, which holds no
  institution (the control in step 8).

Steps:

1. Open the press's Institutions page:
   `http://<host>/index.php/testpress/en/management/settings/institutions`
   (the side menu offers "Institutions" once institutional statistics are
   enabled for the site and the press; the address works either way).
2. Press "Add Institution", type "Campus Library" in "Name", press
   "Save". The row "Campus Library" is listed.
3. On the row "Campus Library", press "Delete". The "Delete Institution"
   dialog asks "Are you sure you want to continue and delete this
   institution?". Press "Yes".
4. Press "OK" on the window that opens, then reload the page.
5. Open Administration › "Hosted Presses". On the row "Test Press", open
   its actions and press "Remove"; the "Confirm" window asks "Are you
   sure you want to permanently delete Test Press and all of its
   contents?". Press "OK".
6. Reload "Hosted Presses".
7. Open the press's Institutions page again (step 1's address), and its
   Settings › "Users & Roles".
8. On "Hosted Presses", press "Remove" › "OK" on "Empty Press".

**Expected.** Step 3: the dialog closes and "Campus Library" leaves the
list. Step 5: the "Confirm" window closes and "Test Press" leaves the
list, its institution with it.

**Observed.** Step 3: a window titled "Error" opens with one button,
"OK". The request behind "Yes" answers 500:

```
POST /index.php/testpress/api/v1/institutions/<id>   (X-Http-Method-Override: DELETE)   500
```

Step 4: after "OK" and the reload, "Campus Library" is still listed.
Step 5: the "Confirm" window stays open with no message; the request
answers 500:

```
POST /index.php/index/$$$call$$$/grid/admin/context/context-grid/delete-context?rowId=<id>   500
```

The server log, for both requests:

```
Illuminate\Database\QueryException: SQLSTATE[42P01]: Undefined table: 7 ERROR:  relation "institutional_subscriptions" does not exist
LINE 1: select exists(select * from "institutional_subscriptions" wh...
```

Step 6: "Test Press" is still listed. Step 7: both pages answer "The
current role does not have access to this operation.", while the press's
home page still opens. Step 8: "Empty Press" leaves the list.

Control: on OJS the same steps on a journal ("Hosted Journals") remove
the institution at step 3 and the journal at step 5.

## Cause

`PKP\institution\DAO::delete()` (lib/pkp
`classes/institution/DAO.php`, lines 174–186 on main) decides between a
soft and a hard delete by asking whether an institutional subscription
names the institution:

```php
$shouldSoftDelete = DB::table('institutional_subscriptions')
    ->where('institution_id', '=', $institution->getId())
    ->exists();
```

`institutional_subscriptions` is an OJS table (`OJSMigration`); OMP and
OPS create no such table, so on a press and a preprint server the query
throws and every delete of an institution fails. The rule it encodes,
that an institution a subscription names is kept (soft deleted) for
that subscription, is OJS's own, but it sits unguarded in the shared
DAO. It came with the Institutions feature itself (`pkp/pkp-lib#6782`,
PR `pkp/pkp-lib#8109`), whose own migration touches the same table only
behind `Schema::hasTable('institutional_subscriptions')`
(`InstitutionsMigration`, and `I6895_CreateNewInstitutionsTables` in the
3.4 upgrade); the DAO has had the check unguarded since, reformatted in
`98b335d0c0` (2023) and left as it was by the `pkp/pkp-lib#13003` work
(`630730ae13`, 2026).

Reach, checked in the code:

- `PKPInstitutionController::delete()` (`api/v1/institutions`), behind
  the Institutions page's "Delete" › "Yes": fails (driven).
- `PKPContextService::delete()`, behind "Hosted Presses" › "Remove",
  calls `Repo::institution()->deleteMany()` for the context's
  institutions, which calls `DAO::delete()` per institution: fails
  (driven). The method runs without a transaction. Before it reaches the
  institutions it has run the `Context::delete::before` hook (on OMP,
  `APP\services\ContextService::beforeDeleteContext()` writes a
  publication format tombstone for every published book and deletes the
  genres) and deleted the context's announcement types, review
  assignments, user groups, genres, announcements and highlights; those
  are gone when it throws (user groups and genres checked in the
  database, the rest read from the code), while the context row, its
  settings, its institutions, its sections and submissions and
  everything else deleted after that point remain. A context with no
  institution never calls `DAO::delete()` and is removed (driven, the
  control).
- No other caller of `Repo::institution()->delete()` or `deleteMany()`
  exists in pkp-lib, OMP, OPS or their bundled plugins, and no other
  query in pkp-lib outside the migrations names an OJS-only table.
- OJS is not affected: the table exists there (driven, the control).
- The database does not matter: a missing table fails the same way on
  MySQL (read from the query, not driven there).

## Proposed fix

A proposal; not tried.

Recommended: guard the query in the shared DAO the way the Institutions
migration already guards the same table, so that on an app without
institutional subscriptions an institution is simply hard deleted, as
OJS already does for one no subscription names:

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

It fixes both symptoms at their one root, since the Institutions page
and the context removal both reach the database only through this
method, it follows the precedent the feature's own migrations set for
the same table, and OJS's behavior is unchanged.

Alternatives:

- Move the rule to OJS: an OJS institution DAO or repository that
  overrides `delete()`, bound through OJS's `Repo` facade, as OJS's
  `APP\user\Repository::mergeUsers()` handles its subscription tables.
  Cleaner layering, since pkp-lib would no longer name an OJS table, but
  a new class and a change in two repos for the same outcome; worth it
  if the team wants pkp-lib free of app tables.
- Catch the failure in `PKPInstitutionController::delete()` and
  `PKPContextService::delete()`: a workaround at two callers that
  leaves the DAO wrong for any plugin that calls it.

What goes with it:

- No API or hook change: the delete answers 200 as it does on OJS, and
  `Institution::delete::before` and `Institution::delete` fire as they
  do there.
- Stored data: a press or server already left half deleted can be
  removed again with "Remove" once the fix is in: `PKPContextService::delete()`
  re-runs over what is left and completes (read from the code; on OMP
  the before-delete hook writes its tombstones a second time). No
  migration is needed.
  Wrapping `PKPContextService::delete()` in a transaction would stop any
  later failure there from leaving a context half deleted; that is a
  separate hardening, not needed for this fix.
- Backport: the same lines are in `stable-3_5_0` and `stable-3_4_0` of
  pkp-lib, so the diff applies as written.
- Guard: a test in pkp-lib's institution tests, run under OMP or OPS,
  that deletes an institution; and the e2e scenario in U66 that deletes
  an institution on a press and a preprint server, and removes a press
  that holds one.

Small: one guarded condition in the shared DAO, following the
migration's own check, and a test.

## Evidence

- The steps walked on main, on all three apps, and on the
  stable-3_5_0 line with the same script:
  [`shared/playwright/checks/issues/omp-ops-institution-delete-fails/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-ops-institution-delete-fails/walk.js),
  run with `PROBE_FEATURE=issues PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/omp-ops-institution-delete-fails/walk.js`
  (prefix `PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35` for 3.5), on
  PostgreSQL. The two presses (servers, journals) were created by the
  test harness with the site administrator enrolled as their manager, as
  "Create Press" does, under generated names and paths instead of "Test
  Press" and `testpress`; every other step went through the screens as
  written. The walk matched the text; on 3.5 each step showed the same
  as on main, OMP and OPS failing and OJS passing.
- The server log line was read from the app's log for both requests;
  both stacks pass through `classes/institution/DAO.php` line 179, the
  removal's through `PKPContextService.php` line 716
  (`Repo::institution()->deleteMany()`).
- Code read on main (lib/pkp 3dc90c81a6): `classes/institution/DAO.php`
  `delete()`, `classes/institution/Repository.php` `delete()` and
  `deleteMany()`, `classes/services/PKPContextService.php` `delete()`,
  `api/v1/institutions/PKPInstitutionController.php` `delete()`,
  `classes/migration/install/InstitutionsMigration.php`; OJS
  `classes/migration/install/OJSMigration.php` (the table), OJS
  `classes/user/Repository.php` (the app-subclass precedent); a search
  of lib/pkp, OMP, OPS and OJS for callers and for other OJS-only table
  names outside migrations.
- Introduced: `git blame` on the query's lines in lib/pkp gives
  bed0ee4c3b (`pkp/pkp-lib#6782 Introduce Institutions`); the line above
  it was only reworded in 98b335d0c0 ("Formatting and typehinting");
  GitHub's `commits/<sha>/pulls` gives PR `pkp/pkp-lib#8109` ("usage
  stats improvements", merged 2022-07-23).
- 3.5: driven (OMP 4f90dadac0, OPS 0bb1ca0f6e, OJS 040e916378, lib/pkp
  8809a197de); `DAO::delete()` there carries the same query (line 193).
- 3.4 by code: lib/pkp `origin/stable-3_4_0` (df13621c2d)
  `classes/institution/DAO.php` has the same query (line 191) and
  `PKPContextService::delete()` the same order (user groups and genres
  before institutions); OMP `upstream/stable-3_4_0` (0aec65441f) and OPS
  (acd8ae704b) ship `api/v1/institutions` and create no
  `institutional_subscriptions` table; OJS (9571d8fde7) creates it.
- 3.3 by code: lib/pkp `origin/stable-3_3_0` (d446601ebe) has no
  institution classes; OMP (8e72fc8836) and OPS (c5532e2161) have no
  institutions list, and OJS 3.3 keeps an institution's name and ranges
  on the subscription itself.
- Upstream search, 2026-09-30, pkp/pkp-lib, pkp/omp, pkp/ops and
  pkp/ui-library, issues and PRs: "institutional_subscriptions",
  "delete institution", "institution soft delete", "cannot delete
  institution", "delete press institution", "delete context
  institution", "institution DAO delete", "hosted press remove error",
  "institution". Nothing on this fault: `pkp/pkp-lib#8851` and its OMP
  and OPS PRs fix other institution and statistics code, and
  `pkp/pkp-lib#12391` (a context removal failing on foreign keys in
  installs upgraded from 3.3, closed as a duplicate) is another cause of
  the same "Remove" failure.
- Not driven: MySQL; a press whose institution usage statistics are
  collected (the delete fails before any statistics code runs); a press
  with published books, so the tombstones a failed removal writes on OMP
  were not seen.
- Unverified: whether those tombstones make a surviving press's
  published books show as deleted in its OAI-PMH lists (read from the
  code only).
