# A users import stops at the first user without a registration date, silently leaving the rest out

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP (OPS has no Users XML Plugin)
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: none (code; the account gets the day of import)
- **Introduced** `pkp/pkp-lib#7170` for `pkp/pkp-lib#7127` · [20ada04630](https://github.com/pkp/pkp-lib/commit/20ada0463076fa159ef111c84dfda6b5994eb1c2) · 2021-07-14 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U63 [A21](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a21)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

The users file format lets a user's registration date be left out. When
a manager imports a file in which a user has none, the import stops at
that user. The request fails on the server and the "Results" tab opens
blank.

The users listed before it are imported with their roles; that user and
every one after it are not. Nothing tells the manager which users are
missing. Importing the file again with a registration date on every
user brings in the rest.

## Impact

- **Lost.** Every user from the first dateless one to the end of the
  file. The accounts created before it stay.
- **Who.** Journal and press managers importing a users file that
  leaves out `<date_registered>`, which the format marks optional. The
  plugin's own export always writes it; hand-written files and files
  from other tools may not.
- **Way round.** Add `<date_registered>` to every user and import the
  file again. The users already created are found by their username and
  email together, kept as they are, and not given their roles a second
  time.

Medium: users go missing without a word, but only from files that leave
out an optional element. It would be high if a tool in common use wrote
files without it; the one public generator found does, but its files
are refused by today's format for other reasons.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main`, OJS or OMP, freshly loaded.
  `rvaca` is the Journal Manager (Press Manager).
- A file `u63ir4-nodate.xml` with three users; the second, `u63ir4b`,
  has no `<date_registered>`:

  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <PKPUsers xmlns="http://pkp.sfu.ca" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://pkp.sfu.ca pkp-users.xsd">
    <user_groups>
      <user_group>
        <role_id>1048576</role_id>
        <context_id>1</context_id>
        <is_default>true</is_default>
        <permit_self_registration>true</permit_self_registration>
        <permit_metadata_edit>false</permit_metadata_edit>
        <name locale="en">Reader</name>
        <abbrev locale="en">Read</abbrev>
        <stage_assignments></stage_assignments>
        <masthead>false</masthead>
      </user_group>
    </user_groups>
    <users>
      <user>
        <givenname locale="en">Anna</givenname>
        <familyname locale="en">First</familyname>
        <email>u63ir4a@mailinator.com</email>
        <username>u63ir4a</username>
        <password must_change="true">
          <value>u63ir4au63ir4a</value>
        </password>
        <date_registered>2026-01-15 10:00:00</date_registered>
        <user_user_group>
          <user_group_ref>Reader</user_group_ref>
          <masthead>false</masthead>
        </user_user_group>
      </user>
      <user>
        <givenname locale="en">Ben</givenname>
        <familyname locale="en">Nodate</familyname>
        <email>u63ir4b@mailinator.com</email>
        <username>u63ir4b</username>
        <password must_change="true">
          <value>u63ir4bu63ir4b</value>
        </password>
        <user_user_group>
          <user_group_ref>Reader</user_group_ref>
          <masthead>false</masthead>
        </user_user_group>
      </user>
      <user>
        <givenname locale="en">Cleo</givenname>
        <familyname locale="en">Third</familyname>
        <email>u63ir4c@mailinator.com</email>
        <username>u63ir4c</username>
        <password must_change="true">
          <value>u63ir4cu63ir4c</value>
        </password>
        <date_registered>2026-01-15 10:00:00</date_registered>
        <user_user_group>
          <user_group_ref>Reader</user_group_ref>
          <masthead>false</masthead>
        </user_user_group>
      </user>
    </users>
  </PKPUsers>
  ```

[3.5: the file also carries `<show_title>true</show_title>` right after
`<is_default>`, which 3.5's format requires.]

1. Sign in as `rvaca`.
2. In the left menu, open "Tools", then "Users XML Plugin".
3. On "Import Users", upload `u63ir4-nodate.xml` into "File".
4. Press "Import Users".
5. Open Settings › "Users & Roles" › "Users" and search for `u63ir4`.

**Expected:** the "Results" tab reads "The import completed
successfully. Users with usernames and email addresses that are not
already in use have been imported, along with accompanying user
groups." Step 5 lists Anna First, Ben Nodate and Cleo Third, each with
"Reader".

**Observed:** the "Results" tab opens with its "Close" button and a
blank panel. The request behind it answers 500:

```
GET /index.php/publicknowledge/en/management/importexport/plugin/UserImportExportPlugin/import?temporaryFileId=…&csrfToken=… → 500
```

The server log:

```
PHP Fatal error:  Uncaught PDOException: SQLSTATE[23502]: Not null violation: 7 ERROR:  null value in column "date_registered" of relation "users" violates not-null constraint
```

Step 5 reads "Current Users (1)" with one row: "Anna First
u63ir4a@mailinator.com Reader 2026-10-01". The date in that row is the
"Start Date" column, the day her Reader role began, not her
registration date. Ben Nodate and Cleo Third are not listed.

Control: the same three users, each with a `<date_registered>`, import
with the success sentence.

## Cause

`UserXmlPKPUserFilter::parseUser()` (lib/pkp
`plugins/importexport/users/filter/UserXmlPKPUserFilter.php`) sets the
registration date only from a `<date_registered>` element (lines
169–171), which `pkp-users.xsd` makes optional (`minOccurs="0"`). A new
user without one reaches `Repo::user()->add()` (line 282) with no date.

`PKP\user\Repository::add()` (lib/pkp `classes/user/Repository.php`,
lines 108–116) passes the user to the entity DAO's insert unchanged, and
`users.date_registered` is `NOT NULL`. The insert throws, and nothing in
the import catches it. Each user is inserted as it is read, with no
transaction, so the users before it stay.

Up to 3.3, `UserDAO::insertObject()` filled in the current date when a
user had none.
[20ada04630](https://github.com/pkp/pkp-lib/commit/20ada0463076fa159ef111c84dfda6b5994eb1c2)
(`pkp/pkp-lib#7127`, the move of `UserDAO` to the repository pattern)
replaced `insertObject()` and dropped that default.

Reach:
- Every other caller of `Repo::user()->add()` sets
  `Core::getCurrentDate()` first: registration, Users & Roles' "Add
  User", "Create New Reviewer", accepting an invitation, and the
  installer. The users import is the only one that can pass no date
  (read in the code).
- An empty `<date_registered></date_registered>` stores `""` and fails
  the same way (read in the code).
- A `<date_registered>` holding text that is not a date, and an empty
  `<date_last_login>`, `<date_validated>` or `<date_last_email>`, also
  fail at the insert, because the import passes the file's date text on
  unchecked (read in the code).
- OJS's command-line import (`tools/importExport.php
  UserImportExportPlugin import …`) runs the same filter. It stops at
  the same user with the uncaught database error, and the users before
  it stay (read in the code). OMP has no command-line users import.
- The blank tab, instead of an error line, comes from the users
  import's missing error handling, reported separately in
  [the users-file format report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U63-A13-users-import-unreadable-file-empty-results.md).

## Proposed fix

We propose restoring the default where the old DAO had it, at the layer
every caller goes through: `PKP\user\Repository::add()` fills in today's
date when the user has none
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-import-stops-at-user-without-registration-date/fix.diff)):

```diff
     public function add(User $user): int
     {
+        if (!$user->getDateRegistered()) {
+            $user->setDateRegistered(Core::getCurrentDate());
+        }
         $id = $this->dao->insert($user);
```

(plus `use PKP\core\Core;`). Other repositories fill in a date in
`add()` the same way, as `PKP\submission\Repository::add()` does for
`dateSubmitted`. The test `!$user->getDateRegistered()` also covers an
empty `<date_registered></date_registered>`, since `""` is falsy. 3.3's
`insertObject()` also filled in `date_last_login`. That default is not
needed back, because `users.date_last_login` is nullable on `main`.

Tried on `main`, OJS and OMP: the file imports with the success
sentence, and step 5 lists all three users with "Reader". In the
`users` table, Anna First and Cleo Third keep the file's 2026-01-15
registration date and Ben Nodate gets the day of the import. A file in
which every user has a date still imports with its dates. The existing
refusal of a username and email that belong to different accounts
still shows its own line. The empty-element case was not tried.

**Alternatives**
- Fill in the date in `UserXmlPKPUserFilter::parseUser()` only. That
  fixes the import, but any plugin that calls `Repo::user()->add()`
  without a date would still fail the same way.
- Make `users.date_registered` nullable. That needs a migration, and an
  account without a registration date escapes what reads it: the users
  report's registration date, the user search by registration date, and
  the removal of unvalidated accounts after their grace period.

**What goes with it**
- No data repair: a failed insert stores nothing.
- Backport: the diff applies to 3.5 and 3.4, whose `add()` has the same
  shape.
- The users-file format report's fix is separate. It turns a failure
  like this one into an error line instead of a blank tab, but does not
  import the user.
- Guard: a unit test of `Repository::add()` with a user that has no
  registration date, and an e2e scenario importing a file with such a
  user.

Small: three lines in the shared user repository, and a unit test.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-import-unreadable-file-empty-results/walk.js)
  with its [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-import-unreadable-file-empty-results/lib.js)
  (shared with the users-file format report; the files exactly as the
  Steps give them). On a dataset install of `main`:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/users-import-unreadable-file-empty-results/walk.js a21 control neighbour`
  (`control` is a one-user file with a date, `neighbour` the file with
  dbarnes's username and another address). The fix trial:
  `node bin/try-fix.js apply shared/playwright/checks/issues/users-import-stops-at-user-without-registration-date/fix.diff ojs omp`,
  then the same command, then `revert`. The registration dates come
  from the `users` table, which no screen shows; a developer can read
  them with `select username, date_registered from users where username
  like 'u63ir4%';`.
- Walked 2026-10-01 on PKP's default test dataset (pkp/datasets
  `38ab955`, 2026-09-30, PostgreSQL), freshly loaded before each walk:
  `main` OJS and OMP, and `stable-3_5_0` OJS and OMP with the bracketed
  `<show_title>` line. Both versions showed the same: a blank tab, 500,
  the same log line, Anna First created, the other two not.
- Tips: `main` OJS `bade233f73` (lib/pkp `2e377d27fc`), OMP `3b0ecf794`
  (lib/pkp `3dc90c81a6`); `stable-3_5_0` OJS `92b9a16b48`, OMP
  `3081c9b00` (lib/pkp `a9c76aed62`); `stable-3_4_0` OJS `9571d8fde7`,
  OMP `0aec65441`, lib/pkp `df13621c2d`; `stable-3_3_0` OJS
  `9fdb9bcf9a`, OMP `8e72fc883`, lib/pkp `d446601ebe`.
- Code reads: `main` and 3.5, `UserXmlPKPUserFilter::parseUser()`,
  `Repository::add()`, `EntityDAO::_insert()`, and the `users` table in
  `CommonMigration`. 3.4: the same `parseUser()`, `add()` with no
  default, `date_registered` `NOT NULL`, and `20ada04630` on lib/pkp
  `stable-3_4_0`; the diff passes a dry run on a copy of 3.4's
  `Repository.php`. 3.3: `UserDAO.inc.php` `insertObject()` sets
  `Core::getCurrentDate()` when `getDateRegistered()` is null.
  "Matched and kept": `parseUser()` keeps an account whose username and
  email both belong to it, and the role is skipped while the account
  already holds it with no end date.
- Introduced: `git log -S'getDateRegistered() == null'` on
  `classes/user/` finds `20ada04630` ("pkp/pkp-lib#7127 WIP: Fix calls
  to UserDAO"), which deleted `insertObject()` with its defaults. GitHub
  names its PR as `pkp/pkp-lib#7170`, merged 2021-08-27.
- Upstream: searched 2026-10-01 in pkp/pkp-lib, pkp/ojs, pkp/omp and
  pkp/ui-library by the symptom and by `UserXmlPKPUserFilter`.
  `pkp/pkp-lib#8964` (closed) is another users-import database failure
  with no feedback, from a duplicate role row, so a different cause.
- Tools that write users files: a GitHub repository search (2026-10-01:
  "ojs users import", "ojs csv users", "ojs migration users",
  "pkp-users.xsd", "PKPUsers xml users import") found one generator,
  `ualbertalib/ojsUserImportGenerator` (last pushed 2023-09). Its
  `userXMLTemplate.php` writes no `<date_registered>`. It is written for
  the 3.3-era format (roles as bare `<user_group_ref>`), which today's
  schema refuses before any user is read. No other converter found.
- MySQL not checked: the failure comes from the column's `NOT NULL`.
