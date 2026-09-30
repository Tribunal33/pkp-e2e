# A long "IP ranges" line makes an institution's "Save" fail, adding duplicates or wiping its ranges

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Crash** server
- **Affects** main OJS, OMP, OPS · 3.5 OJS, OMP, OPS · 3.4 OJS, OMP, OPS (code) ·
  3.3 OJS (code; on an institutional subscription's "IP ranges")
- **Introduced** not traced; present since at least [5091b6949e](https://github.com/pkp/ojs/commit/5091b6949e1c9f6f50b62f5d41951d8506949995) (2009-05-20, OJS subscriptions), carried into pkp-lib by `pkp/pkp-lib#8109` for `pkp/pkp-lib#6782` · [bed0ee4c3b](https://github.com/pkp/pkp-lib/commit/bed0ee4c3bcde7cf48c9f70bdee9400b061a31c1) · Bozana Bokan (bozana)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U66 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U66-institutions.md#a9)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A manager who types in "IP ranges" a valid range longer than 40
characters, such as one with many spaces around "-", and presses "Save"
on "Add Institution" or "Edit Institution" meets a failure on the server:
the panel stays open under "An unexpected error has occurred. Please
reload the page and try again." and nothing says which line is at fault.

Yet each "Save" on "Add Institution" adds the institution without IP
ranges, and a "Save" on "Edit Institution" keeps only the lines above the
long one, so the institution loses the ranges it had. The same range saves
once the extra spaces are removed.

Every journal, press and preprint server since institutions were
introduced, and journals' institutional subscriptions before that.

## Impact

- **Lost.** On "Edit Institution", the institution's existing IP ranges,
  which decide which visitors an institutional subscription admits (OJS)
  and which visits the usage statistics credit to the institution; on
  "Add Institution", one extra institution without ranges per "Save". The
  manager is told only that an unexpected error occurred; the duplicates
  and the lost ranges show only after a reload, on "Edit".
- **Who.** A journal, press or server manager on the Institutions page,
  in any setup, when a line runs past 40 characters: a range padded with
  extra spaces around "-", as a list pasted from a spreadsheet or an
  aligned text file may carry.
- **Way round.** Remove the spaces, delete the duplicate rows, retype the
  lost ranges. Nothing gets worse with time.

Medium: the save fails only on a narrow input and says it failed, though
the duplicates and the lost ranges it leaves are silent; it would rise if
padded range lists turned out to be common.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main` (OJS, OMP or OPS), freshly
  loaded. Its `publicknowledge` journal (press, preprint server) has no
  institutions.
- Nothing else: `rvaca` is its Journal Manager (Press Manager, Preprint
  Server Manager).

Adding:
1. Sign in as `rvaca`.
2. Open the Institutions page by its address,
   `/index.php/publicknowledge/en/management/settings/institutions`.
   The side menu lists "Institutions" only once institutional statistics
   are enabled, which the dataset leaves off; the page opens either way.
3. Press "Add Institution".
4. In "Name" type "Long Library".
5. In "IP ranges" type `142.58.103.1          -          142.58.103.4`
   (ten spaces either side of "-", 45 characters).
6. Press "Save".
7. Press "Save" again.
8. Close the panel and reload the page.
9. Press "Edit" on each "Long Library" row and read "IP ranges".

Editing an institution that has a range:

10. Press "Add Institution", type "Campus Library" in "Name" and
    `10.1.0.0/16` in "IP ranges", and press "Save".
11. Press "Edit" on "Campus Library", put the line of step 5 on a new first
    line above `10.1.0.0/16`, and press "Save".
12. Close the panel, reload the page, press "Edit" on "Campus Library" and
    read "IP ranges".

**Expected:** step 6 saves the range (it is a valid range, and the help
under the box writes a range with spaces around "-"), or refuses it with
"Invalid IP range" under the box; either way the list holds one "Long
Library". Step 11 saves both lines, or refuses and keeps `10.1.0.0/16`.

**Observed:** steps 6 and 7 each leave the panel open with the notice "An
unexpected error has occurred. Please reload the page and try again.", no
message under any box and the list behind unchanged; each "Save" answered
`POST /index.php/publicknowledge/api/v1/institutions` with 500. After the
reload the list reads "Long Library" twice, and "Edit" on either shows "IP
ranges" empty.

Step 10 saves. Step 11 shows the same notice (the save,
`POST /index.php/publicknowledge/api/v1/institutions/3` with
`X-Http-Method-Override: PUT`, answered 500); after the reload "Edit" on
"Campus Library" shows "IP ranges" empty: `10.1.0.0/16` is gone. The
server log, for each failed save:

```
production.ERROR: SQLSTATE[22001]: String data, right truncated: 7 ERROR:  value too long for type character varying(40) (Connection: pgsql, …, SQL: insert into "institution_ip" ("institution_id", "ip_string", "ip_start", "ip_end") values (1, 142.58.103.1          -          142.58.103.4, 2386192129, 2386192132))
```

A line of exactly 40 characters (`142.58.103.1       -        142.58.103.4`)
saves and reads back as typed.

## Cause

`PKP\institution\DAO::insertIPRanges()` (lib/pkp
`classes/institution/DAO.php`, the insert at line 243) stores each line,
trimmed at its ends only, in `institution_ip.ip_string`, a `VARCHAR(40)`
(`classes/migration/install/InstitutionsMigration.php` line 64).

The validation it relies on, `PKP\institution\Repository::validate()`
(`classes/institution/Repository.php` lines 124–135), matches a range as
`…((\s)*[-](\s)*…)`, any run of whitespace around "-", and sets no length.
The longest range written with single spaces is 33 characters, so a
valid range runs past 40 only with eight or more extra spaces around "-".

So a line the validator accepts can be longer than the column holds, and
the insert fails: PostgreSQL raises SQLSTATE 22001 and the request
answers 500. The rule broken: what validation accepts, the writer must
be able to store.

The failure lands in the middle of a write that is not atomic, which is
what turns a refused value into lost or duplicated data. `DAO::insert()`
writes the `institutions` row and its settings (`parent::_insert()`)
before `insertIPRanges()`; `DAO::update()` writes the row
(`parent::_update()`), deletes every stored range (`deleteIPRanges()`),
then inserts the new lines one by one.

Neither runs in a transaction, so an add keeps the institution without
ranges and an edit keeps the new name and only the lines before the long
one.

Reach:

- `PKPInstitutionController::add()` and `edit()`, the Institutions page's
  two saves and the REST API's `POST` and `PUT`: on screen, all three apps,
  main and 3.5.
- OJS `UserInstitutionalSubscriptionForm::execute()`, a reader buying an
  institutional subscription: it validates with its own copy of the same
  pattern and calls `Repo::institution()->add()`, so the same line fails
  there and leaves an institution without ranges and no subscription.
  Checked in the code, not driven.
- Matching a visitor to an institution (`Collector::filterByIps()`) reads
  `ip_start` and `ip_end`, not `ip_string`, which only the list's search
  and the subscriptions list read; nothing stored is wrong beyond the
  empty duplicates and the lost ranges the failed saves leave.
- On MySQL the outcome depends on the server's `sql_mode`:
  `PKPContainer` sets no `strict` on the connection, so a strict server
  (the default since MySQL 5.7 and MariaDB 10.2.4) fails the same way and a
  non-strict one would cut the string to 40 characters. Read from the code,
  not run.

## Proposed fix

A proposal, not tried.

Recommended: normalize the whitespace in the writer, and make the write
atomic, both in `PKP\institution\DAO`.

```php
// DAO::insertIPRanges(), in place of `$ipRange = trim($ipRange);`
$ipRange = preg_replace('/\s+/', ' ', trim($ipRange));
```

The validator allows whitespace only around "-", so this collapses exactly
that, and the longest line it accepts becomes
`255.255.255.255 - 255.255.255.255`, 33 characters, inside the column.

And wrap the bodies of `DAO::insert()` and `DAO::update()` in
`DB::transaction(function () { … })`, so any failed range insert leaves the
institution as it was, as the newer multi-table writers do
(`MediaFilesController`, `PKPEditTaskTemplateController`,
`VariantGroup`).

Why here: the DAO is the one writer of `institution_ip`, so the fix covers
the Institutions page, the REST API and OJS's subscription purchase form at
once, where a validation change would have to be made in both copies of
the pattern. It keeps the intent of the pattern, which accepts a range
written with or without spaces; only runs of spaces are stored as one.

**Alternatives:**

- A length rule on `ipRanges` items in `Repository::validate()`: it
  refuses a valid range and leaves OJS's copy of the pattern open.
- Narrowing the pattern to one optional space: it refuses inputs that
  save today.
- Widening `ip_string`: it needs an upgrade migration and still sets an
  arbitrary limit.

**What goes with it:**

- API: an API client sees a padded range read back with single spaces,
  the only change in behavior.
- No data repair: stored strings already fit, and the empty duplicates a
  failed save left cannot be told apart from an institution added
  without ranges.
- Backport: it applies as written to 3.5 and 3.4; a 3.3 backport needs
  the same line in OJS
  `InstitutionalSubscriptionDAO::_insertSubscriptionIPRanges()` and a
  transaction around `insertObject()` and `updateObject()`.
- Guard: a pkp-lib unit test that adds and edits an institution with a
  range padded past 40 characters and reads it back, and the e2e
  scenario in U66 (a Planned item).

Small: a few lines in one shared DAO, following the transaction pattern
the code base already uses, and a unit test.

## Evidence

- Kept script, taking the Steps and the 40-character control through the
  screens on each app, on an install loaded from PKP's default test
  dataset (a dataset fleet):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/institution-long-ip-range-save-error/walk.js),
  run after a fresh load with
  `npm run fleet-prep -- --feature issues --dataset --reset` and
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/institution-long-ip-range-save-error/walk.js`
  (stable-3_5_0: `PKP_E2E_LINE=stable-3_5_0` in front of both, with
  `--feature issues-3_5`, and `PROBE_FEATURE=issues-3_5 PROBE_RUN=r35` on
  the walk).
  - It signs in as the dataset's `rvaca` on `publicknowledge` and builds
    nothing itself: the three institutions ("Long Library", "Campus
    Library", "Forty Library") are created on screen.
  - The Steps were walked as written; the walk also read the stored rows
    after the control (evidence only, not a step).
- Walked 2026-09-30 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [c0f9f10](https://github.com/pkp/datasets/commit/c0f9f10d529f7dcd018c1a61d7084c16044f0162)
  (2026-09-30), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`, no
  upgrade needed:
  - main: OJS 7ce98ec09e, OMP 3b0ecf794c, OPS c8af945bb7 (lib/pkp
    3dc90c81a6);
  - stable-3_5_0: OJS 040e916378, OMP 4f90dadac0, OPS 0bb1ca0f6e (lib/pkp
    8809a197de).
  - All six showed the Observed above, three 500s each and no script
    error; the log line is from the app's error log (institution 1, the
    first "Long Library"). MySQL not checked.
- 3.4, by code:
  - pkp-lib `stable-3_4_0` at df13621c2d: `InstitutionsMigration.php`
    `ip_string` 40, `Repository::validate()` the same pattern,
    `DAO::insert()`, `update()` and `insertIPRanges()` the same order
    with no transaction, `PKPInstitutionHandler::convertIpToArray()`.
  - OJS `stable-3_4_0` at 9571d8fde7: `UserInstitutionalSubscriptionForm`,
    the same pattern.
- 3.3, by code: OJS `stable-3_3_0` at 9fdb9bcf9a. OMP and OPS 3.3 have no
  institutions.
  - `classes/migration/OJSMigration.inc.php`
    `institutional_subscription_ip.ip_string` 40.
  - `InstitutionalSubscriptionForm` validates with the same pattern.
  - `InstitutionalSubscriptionDAO::insertObject()` writes the
    subscription before `_insertSubscriptionIPRanges()`, and
    `updateObject()` deletes the ranges before inserting them, with no
    transaction.
- Introduced: `git blame` on the column, the pattern and the insert in
  pkp-lib main stops at bed0ee4c3b, which created the Institutions classes
  from OJS's subscription code; in OJS, `git log -S` finds the pattern with
  its any-spaces range in d76dc5eb75 (2005-02-19) and the 40-character
  `ip_string` with that pattern in 5091b6949e (2009-05-20).
- Upstream search 2026-09-30 in pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and
  pkp/ui-library (institution IP range, `ip_string`, `institution_ip`,
  "value too long", `insertIPRanges`): nothing about this fault;
  `pkp/pkp-lib#4261` (IPv6 support for subscriptions) and `pkp/ojs#2408`
  (the purchase form's validation, 2019) are other faults.
- Not driven: the OJS reader's institutional subscription purchase (code
  only). Unverified: the MySQL outcome; the proposed fix, not tried.
