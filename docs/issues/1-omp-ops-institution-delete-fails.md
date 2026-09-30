# Presses and preprint servers cannot delete an institution, and removing one that holds one half deletes it

- **Severity** medium · **Effort** small · **Kind** defect · **Crash** server
- **Introduced** `pkp/pkp-lib#8109` for `pkp/pkp-lib#6782` · [bed0ee4c3b](https://github.com/pkp/pkp-lib/commit/bed0ee4c3bcde7cf48c9f70bdee9400b061a31c1) · 2022-07-23 · Bozana Bokan (bozana)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U66 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U66-institutions.md#a3), [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U66-institutions.md#a8) · **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

| Affects | main | 3.5 | 3.4 | 3.3 |
|---|---|---|---|---|
| OJS | no | no | no (code) | n/a |
| OMP | yes | yes | yes (code) | n/a |
| OPS | yes | yes | yes (code) | n/a |

## Summary

On a press and a preprint server, "Yes" on an institution's "Delete"
fails on the server: a window titled "Error" opens, and the institution
stays listed, after a reload too.

Removing such a press or preprint server under Administration › "Hosted
Presses" ("Hosted Servers") fails on the server as well: the "Confirm"
window stays open with no message, the press stays listed, and it is
left half deleted, its roles gone, so even the Site Administrator is
refused its Settings pages while its public site stays up.

Nothing on screen gets round either, so an institution once added, a
mistyped one included, stays for good, and so does the press that holds
it, on every OMP and OPS version with the Institutions page (3.4, 3.5
and main); journals are not affected.

## Impact

- **Lost.** No institution can be removed, nor a press or server that
  holds one; the delete says only "Error", the removal nothing at all.
  The failed removal is not undone: every user's role in the press is
  gone, and it stays on the public site with nobody able to manage it,
  the Site Administrator included. A press's (not a server's) OAI-PMH
  list then also reports each published book as deleted, beside its
  live record.
- **Who.** A Press Manager (a preprint server's Manager) and the Site
  Administrator, on every press or server that has added an
  institution, on every attempt. The side menu offers "Institutions"
  only while institutional statistics are enabled for the site and for
  the press, both off at install.
- **Way round.** None on screen. The institution can be renamed but not
  removed, the press cannot be removed while it holds one, and no screen
  restores its roles.

Medium: two administrative tasks fail with no way round and one of them
destroys a press's roles, but only on a press or server that uses
institutions, which the side menu offers only once institutional
statistics are turned on; it would be high if institutions were in
common use on presses and servers.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main` (on OPS the same, with
  "Hosted Servers", "Create Server", "server" and "Public Knowledge
  Preprint Server" for "press" and "Public Knowledge Press"). Signed in
  as `admin` (password `admin`), the site administrator, who is also a
  Press Manager of the dataset's press "Public Knowledge Press"
  (`publicknowledge`).
- A second press that holds no institution, for the control in step 8
  (the dataset has one press): Administration › "Hosted Presses" ›
  "Create Press", "Press Name" "Empty Press", "Press Initials" "EP",
  "Principal Contact Name" "Empty Press", "Principal Contact Email"
  "emptypress@mailinator.com", "Country" "Canada", "Path" `emptypress`,
  "Languages" and "Primary locale" English, "Save".

Steps:

1. Open the press's Institutions page,
   `/index.php/publicknowledge/en/management/settings/institutions`
   (the side menu offers "Institutions" once institutional statistics are
   enabled for the site and the press; the address works either way).
2. Press "Add Institution", type "Campus Library" in "Name", press
   "Save". The row "Campus Library" is listed.
3. On the row "Campus Library", press "Delete". The "Delete Institution"
   dialog asks "Are you sure you want to continue and delete this
   institution?". Press "Yes".
4. Press "OK" on the window that opens, then reload the page.
5. Open Administration › "Hosted Presses". On the row "Public Knowledge
   Press", open its actions and press "Remove"; the "Confirm" window asks
   "Are you sure you want to permanently delete Public Knowledge Press
   and all of its contents?". Press "OK".
6. Reload "Hosted Presses".
7. Open the press's Institutions page again (step 1's address), its
   Settings › "Users & Roles", its home page `/index.php/publicknowledge`
   and its OAI-PMH list,
   `/index.php/publicknowledge/oai?verb=ListIdentifiers&metadataPrefix=oai_dc`.
8. On "Hosted Presses", press "Remove" › "OK" on "Empty Press".

**Expected.** Step 3: the dialog closes and "Campus Library" leaves the
list. Step 5: the "Confirm" window closes and "Public Knowledge Press"
leaves the list, its institution with it.

**Observed.** Step 3: a window titled "Error" opens with one button,
"OK". The request behind "Yes" answers 500:

```
POST /index.php/publicknowledge/api/v1/institutions/1   (X-Http-Method-Override: DELETE)   500
```

Step 4: after "OK" and the reload, "Campus Library" is still listed.
Step 5: the "Confirm" window stays open with no message; the request
answers 500:

```
POST /index.php/index/$$$call$$$/grid/admin/context/context-grid/delete-context?rowId=1   500
```

The server log, for both requests:

```
Illuminate\Database\QueryException: SQLSTATE[42P01]: Undefined table: 7 ERROR:  relation "institutional_subscriptions" does not exist
LINE 1: select exists(select * from "institutional_subscriptions" wh...
```

Step 6: "Public Knowledge Press" is still listed. Step 7: both settings
pages answer "The current role does not have access to this
operation.", while the press's home page still opens with its catalog.
On OMP the OAI-PMH list, which before step 5 gave the two published
books' formats once each, now gives each of them twice, live and
deleted:

```
<header><identifier>oai:omp.localhost:publicationFormat/2</identifier>…
<header status="deleted"><identifier>oai:omp.localhost:publicationFormat/2</identifier>…
<header><identifier>oai:omp.localhost:publicationFormat/3</identifier>…
<header status="deleted"><identifier>oai:omp.localhost:publicationFormat/3</identifier>…
```

Step 8: "Empty Press" leaves the list.

Control: on OJS the same steps on "Journal of Public Knowledge"
("Hosted Journals") remove the institution at step 3 and the journal at
step 5.

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
throws and every delete of an institution fails.

The rule it encodes, that an institution a subscription names is kept
(soft deleted) for that subscription, is OJS's own, but it sits
unguarded in the shared DAO.

It came with the Institutions feature itself (`pkp/pkp-lib#6782`,
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
  (driven).
  - The method runs without a transaction. Before it reaches the
    institutions it has run the `Context::delete::before` hook (on OMP,
    `APP\services\ContextService::beforeDeleteContext()` writes a
    publication format tombstone for every published book and deletes
    the genres) and deleted the context's announcement types, review
    assignments, user groups, genres, announcements and highlights.
  - Those are gone when it throws (user groups, genres and OMP's
    tombstones checked in the database, the rest read from the code),
    while the context row, its settings, its institutions, its sections
    and submissions and everything else deleted after that point remain.
  - On OMP the tombstones are served at once: the surviving press's
    OAI-PMH list gives every published book's format a second, deleted
    header beside its live one (driven on the dataset's two published
    books; OPS wrote none).
  - A context with no institution never calls `DAO::delete()` and is
    removed (driven, the control).
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

**Alternatives:**

- Move the rule to OJS: an OJS institution DAO or repository that
  overrides `delete()`, bound through OJS's `Repo` facade, as OJS's
  `APP\user\Repository::mergeUsers()` handles its subscription tables.
  Cleaner layering, since pkp-lib would no longer name an OJS table, but
  a new class and a change in two repos for the same outcome; worth it
  if the team wants pkp-lib free of app tables.
- Catch the failure in `PKPInstitutionController::delete()` and
  `PKPContextService::delete()`: a workaround at two callers that
  leaves the DAO wrong for any plugin that calls it.

**What goes with it:**

- No API or hook change: the delete answers 200 as it does on OJS, and
  `Institution::delete::before` and `Institution::delete` fire as they
  do there.
- Stored data: a press or server already left half deleted can be
  removed again with "Remove" once the fix is in:
  `PKPContextService::delete()` re-runs over what is left and completes
  (read from the code; on OMP the before-delete hook writes its
  tombstones a second time). No migration is needed.
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
migration's own check, and a test.

## Evidence

- The steps walked on main, on all three apps, and on 3.5 with the same
  script, each on an install freshly loaded from PKP's default test
  dataset (pkp/datasets c0f9f10, 2026-09-30: the `main` and
  `stable-3_5_0` PostgreSQL dumps, loaded as they are, no upgrade
  needed):
  [`shared/playwright/checks/issues/omp-ops-institution-delete-fails/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-ops-institution-delete-fails/walk.js),
  run with `npm run fleet-prep -- --feature issues-rv1 --dataset 1 --reset`
  and then `PROBE_FEATURE=issues-rv1 PROBE_AGENT=rv1 node bin/probe.js all shared/playwright/checks/issues/omp-ops-institution-delete-fails/walk.js`
  (both prefixed `PKP_E2E_LINE=stable-3_5_0`, with the feature
  `issues-rv1-3_5` and `PROBE_RUN=r35`, for 3.5).
  - Nothing was built by the test harness: the script signs in as the
    dataset's `admin` and takes every step through the screens, the
    control press created on "Create Press" under a generated name and
    path ("Empty Press u66rv1…", `u66rv1…`) instead of "Empty Press" and
    `emptypress`. "Country" is set because "Create Press" refuses it
    empty (a separate finding, U59 A1).
  - The walk matched the text; on 3.5 each step showed the same as on
    main, OMP and OPS failing and OJS passing.
  - Beside the screens the script reads the database (the press row, its
    institutions, user groups, genres and submissions, and
    `data_object_tombstones`) after steps 4 and 6, and the OAI-PMH list
    before step 5 and after step 7. On main the list after the removal
    was read from the same install right after the walk (the script's
    first read parsed the browser's rendering of the list); on 3.5 the
    script read it.
  - Each Settings Wizard load after "Create Press" answered a server
    error for the Plugin Gallery's list, on the three apps (a separate
    finding, U62 A1); no other request failed and no page script error
    was recorded.
- The server log line was read from the app's log for both requests;
  both stacks pass through `classes/institution/DAO.php` (line 179 on
  main, 195 on 3.5), the removal's through `PKPContextService.php`
  (line 716 on main, 703 on 3.5; `Repo::institution()->deleteMany()`).
- main walked at OJS 7ce98ec09e, OMP 3b0ecf794c, OPS c8af945bb7 (lib/pkp
  3dc90c81a6).
- Code read on main (lib/pkp 3dc90c81a6):
  - `classes/institution/DAO.php` `delete()`,
    `classes/institution/Repository.php` `delete()` and `deleteMany()`,
    `classes/services/PKPContextService.php` `delete()`,
    `api/v1/institutions/PKPInstitutionController.php` `delete()`,
    `classes/migration/install/InstitutionsMigration.php`;
  - OJS `classes/migration/install/OJSMigration.php` (the table), OJS
    `classes/user/Repository.php` (the app-subclass precedent);
  - a search of lib/pkp, OMP, OPS and OJS for callers and for other
    OJS-only table names outside migrations.
- Introduced: `git blame` on the query's lines in lib/pkp gives
  bed0ee4c3b (`pkp/pkp-lib#6782 Introduce Institutions`); the line above
  it was only reworded in 98b335d0c0 ("Formatting and typehinting");
  GitHub's `commits/<sha>/pulls` gives PR `pkp/pkp-lib#8109` ("usage
  stats improvements", merged 2022-07-23).
- 3.5: walked (OMP 4f90dadac0, OPS 0bb1ca0f6e, OJS 040e916378, lib/pkp
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
  pkp/ui-library, issues and PRs:
  - searched for "institutional_subscriptions", "delete institution",
    "institution soft delete", "cannot delete institution", "delete
    press institution", "delete context institution", "institution DAO
    delete", "hosted press remove error", "institution";
  - nothing on this fault: `pkp/pkp-lib#8851` and its OMP and OPS PRs
    fix other institution and statistics code, and `pkp/pkp-lib#12391`
    (a context removal failing on foreign keys in installs upgraded from
    3.3, closed as a duplicate) is another cause of the same "Remove"
    failure.
- Not driven: MySQL; a press whose institution usage statistics are
  collected (the delete fails before any statistics code runs).
- Unverified: how a harvester settles an identifier the OAI-PMH list
  gives both live and deleted (the deleted header carries the later
  datestamp); no harvester was run.
