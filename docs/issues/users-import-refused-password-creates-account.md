# A users import says a user with a short or empty password "has not been imported", yet creates the account

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** `pkp/pkp-lib#3494` for `pkp/pkp-lib#3462` · [bc01a6a126](https://github.com/pkp/pkp-lib/commit/bc01a6a1267c888311b0a731beea2770bc38ccc0) · 2018-04-30 · Dimitris Efstathiou (defstat)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U63 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a4)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

For a user whose plain-text password in the file is shorter than the
site's minimum, or empty, the results say "The user has not been
imported."; the account is nevertheless created, with its roles, and no
password signs in to it until someone resets it. The manager is told
the opposite of what happened.

When the refused user is someone who already has an account (the same
username and email), that account's password is left as it was, but
the account gains the roles the file names, although the results say
it was not imported. The other users in the file import normally.

Only files written by hand or by another system are affected. The
app's own "Export Users" writes each password already encrypted, and
the import takes those without the length check.

## Impact

- **Lost:** no data. The journal or press ends up with new accounts
  nobody can sign in to, and with roles given to existing accounts,
  after being told neither happened.
- **Who:** a manager who imports users in Tools › "Users XML Plugin"
  from a file with a plain password shorter than the site's minimum (6
  by default), or empty. Occasional: a migration from another system,
  or a hand-made file.
- **Way round:** the new account's owner resets the password with
  "Forgot your password?" on the sign-in page, or the manager removes
  the account. Either needs someone to know the account is there.

Medium: the import misleads, but only for a narrow kind of file, no
working password is replaced, and the new accounts can be reset or
removed on screen. It would be high if files the app itself writes
were affected.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS or OMP `main` (or
  `stable-3_5_0`), context `publicknowledge`. Its site minimum password
  length is 6.
- On the manager's computer, a file `u63a4-passwords.xml` with four
  users, each with a plain password (no `encryption` attribute):
  `u63a4short` with `abc`, `u63a4empty` with an empty value, the
  dataset's `zzedd` (same username and email) with `abc` and the role
  Copyeditor, which zzedd does not hold, and `u63a4ok` with
  `u63a4oku63a4ok` as the control. Each user carries
  `<date_registered>`, without which the whole import fails. [3.5: add
  `<show_title>true</show_title>` after `<is_default>`, which the 3.5
  format requires and the `main` format no longer accepts.]

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
        <givenname locale="en">Ada</givenname>
        <familyname locale="en">u63a4short</familyname>
        <email>u63a4short@mailinator.com</email>
        <username>u63a4short</username>
        <password is_disabled="false" must_change="false">
          <value>abc</value>
        </password>
        <date_registered>2020-01-02 03:04:05</date_registered>
        <user_user_group>
          <user_group_ref>Reader</user_group_ref>
          <masthead>true</masthead>
        </user_user_group>
      </user>
      <user>
        <givenname locale="en">Ada</givenname>
        <familyname locale="en">u63a4empty</familyname>
        <email>u63a4empty@mailinator.com</email>
        <username>u63a4empty</username>
        <password is_disabled="false" must_change="false">
          <value></value>
        </password>
        <date_registered>2020-01-02 03:04:05</date_registered>
        <user_user_group>
          <user_group_ref>Reader</user_group_ref>
          <masthead>true</masthead>
        </user_user_group>
      </user>
      <user>
        <givenname locale="en">Zayan</givenname>
        <familyname locale="en">Zedd</familyname>
        <email>zzedd@mailinator.com</email>
        <username>zzedd</username>
        <password is_disabled="false" must_change="false">
          <value>abc</value>
        </password>
        <date_registered>2020-01-02 03:04:05</date_registered>
        <user_user_group>
          <user_group_ref>Copyeditor</user_group_ref>
          <masthead>true</masthead>
        </user_user_group>
      </user>
      <user>
        <givenname locale="en">Ada</givenname>
        <familyname locale="en">u63a4ok</familyname>
        <email>u63a4ok@mailinator.com</email>
        <username>u63a4ok</username>
        <password is_disabled="false" must_change="false">
          <value>u63a4oku63a4ok</value>
        </password>
        <date_registered>2020-01-02 03:04:05</date_registered>
        <user_user_group>
          <user_group_ref>Reader</user_group_ref>
          <masthead>true</masthead>
        </user_user_group>
      </user>
    </users>
  </PKPUsers>
  ```

Steps:

1. Sign in as `rvaca` (the journal or press manager).
2. In the side menu click "Tools"; on the "Import/Export" tab click
   "Users XML Plugin".
3. On the "Import Users" tab, click "Upload File" and choose
   `u63a4-passwords.xml`.
4. Click "Import Users". A "Results" tab opens.
5. In the side menu open Settings › "Users & Roles"; on "Users", search
   for "u63a4".
6. Search for "zzedd".
7. Sign out, and sign in as `u63a4short` with the password `abc`.
8. Sign in as `u63a4ok` with `u63a4oku63a4ok`.

**Expected:** the "Results" tab lists the three refused users, and
they are not imported: the search at step 5 finds only "Ada u63a4ok",
and zzedd's roles at step 6 are still "Reader Author". Step 7 is
refused, step 8 signs in.

**Observed:** the "Results" tab reads:

```
Import/Export errors:
The imported user "u63a4short" has a plain password that is not valid. The user has not been imported.
The imported user "u63a4empty" has a plain password that is not valid. The user has not been imported.
The imported user "zzedd" has a plain password that is not valid. The user has not been imported.
```

The search at step 5 finds "Current Users (3)": "Ada u63a4short",
"Ada u63a4empty" and "Ada u63a4ok", each with the role "Reader". At
step 6 zzedd reads "Reader Author Copyeditor". Step 7 is refused with
"Invalid username/email or password. Please try again."; step 8 signs
in.

## Cause

Line numbers are OJS `main`'s lib/pkp (2e377d27fc).

`UserXmlPKPUserFilter::parseUser()` (lib/pkp
`plugins/importexport/users/filter/UserXmlPKPUserFilter.php`) reports
the refusal but does not act on it. At line 220 it calls
`importUserPasswordValidation($user, $encryption)`. For a password with
no `encryption` attribute, that method (lines 478–504) hashes it when
`strlen()` reaches `Site::getMinPasswordLength()`. Otherwise it only
calls `addError()` with `plugins.importexport.user.error.plainPasswordNotValid`
("… The user has not been imported."), and returns `null`, the same
value as for an accepted password.

`parseUser()` cannot tell the two apart and goes on:

- A new user is created with `Repo::user()->add()` (line 282), without
  a password that can sign in.
- For an existing user with the same username and email, `$user` is
  replaced by the stored account (line 227). The password read from the
  file was set on the discarded object, and this branch saves nothing,
  so the account's own password is left as it was.
- Either way, the roles in the file are then given to the user (lines
  314–407).

The same method's other refusals do skip: a username and email that
belong to two different accounts leave `$userId` unset, and (in OJS
`main`'s lib/pkp and 3.5) a refused role date `continue`s past that
role. The user is handled on its own,
so the other users in the file import normally.

The check and its message came in the commit named under Introduced,
in the pull request that first let the users import take plain
passwords. Its first commit hashed any plain password; this one added
the minimum length and the message, and did not stop the import.

Reach:

- The command-line import (`UserImportExportPlugin::executeCLI()`) runs
  the same filter, so it does the same (code).
- A `<password>` with no `<value>` gets `userHasNoPassword`, which also
  says "The user has not been imported." and does not skip. The schema
  requires `<value>`, so such a file is refused before the filter runs
  (code).
- Passwords with an `encryption` attribute, which is what "Export
  Users" writes, take the other branch and are not affected (code; an
  md5 password on screen in the fix trial).
- OMP `main`'s lib/pkp pointer (3dc90c81a6) lags OJS's. It has the same
  password code at other lines (the call at 218, `add()` at 280, the
  method from 427), but not yet the role-date handling
  (`parseRoleDate()`, the role-date `continue`, the overlap check). The
  fault and the fix are the same there.
- OPS is not affected: it has no Users XML Plugin on any version
  (main, 3.5, and `stable-3_4_0` acd8ae704b, `stable-3_3_0` c5532e2161).

## Proposed fix

A proposal, tried on `main`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-import-refused-password-creates-account/fix.diff)).

Recommended: let `importUserPasswordValidation()` return `false` for a
refused password, and have `parseUser()` return before it looks the
user up, so that the user is neither created nor given roles, as the
line says:

```diff
         $password = $this->importUserPasswordValidation($user, $encryption);
+        if ($password === false) {
+            // The password was refused and the results say "The user has not been imported.": neither create
+            // the user nor give an existing user the roles in the file.
+            return null;
+        }
 …
-     * @return string if a new password is generated, the function returns it.
+     * @return string|null|false the new password if one is generated; false if the password is refused, and the user must not be imported
 …
                 $this->addError(__('plugins.importexport.user.error.plainPasswordNotValid', ['username' => $userToImport->getUsername()]));
+                return false;
             }
```

The fix sits where the rule is decided: `parseUser()` is the only
caller of `importUserPasswordValidation()`, and both the screen and the
command line go through it. It follows the method's own pattern for a
username and email that do not match: add the error, import nothing
for that user, go on with the next. The introducing change meant to
refuse a short plain password, and this makes the refusal real.

Tried on OJS and OMP. With the fix, the Results tab read the same three
lines, the search at step 5 found only "Ada u63a4ok", zzedd kept
"Reader Author", and `u63a4ok` signed in. A second file, of users the
fix must not change, gave the same result with and without the fix: a
user with a valid plain password was imported and signed in, a user
with an md5 password was imported with "… The user has been imported."
and the "Journal Registration" ("Press Registration") email, and zzedd
with a valid password got the Copyeditor role.

**Alternatives:**

- Change the line to say the account was created without a usable
  password. That keeps accounts nobody can use, and the refusal would
  mean nothing.
- Make a new password and email it, as the `encryption` branch does for
  a hash it cannot keep. That turns a refusal into an import, and
  replaces the password the manager put in the file with one they did
  not choose; that is a product decision.
- Throw an exception. That would stop the whole file, including the
  users after this one.

**What goes with it:**

- Accounts created by earlier imports are not repaired by the fix.
  The manager can find them by the usernames the import's results
  named, or by their registration date; each can then be reset with
  "Forgot your password?" or removed. Whether an upgrade should do more
  is left to the team.
- No API, hook or template changes.
- Backport: the diff applies unchanged to `stable-3_5_0` and to pkp-lib
  `stable-3_4_0` (a patch dry run, with offsets). 3.3 has the same code
  in `UserXmlPKPUserFilter.inc.php`, with tab indentation, so the diff
  needs porting by hand.
- Guard: an e2e scenario in U63 that imports a file with a short plain
  password and checks that no account is created, or a unit test on
  `parseUser()`.

Small: two lines in one pkp-lib class, and a test.

## Evidence

- Script that takes the Steps in a browser on a fresh load of the
  default dataset, and afterwards the way round ("Forgot your
  password?", the reset email, a new password, sign-in):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-import-refused-password-creates-account/walk.js),
  run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> ONLY=ojs,omp node bin/probe.js all shared/playwright/checks/issues/users-import-refused-password-creates-account/walk.js`
  (on 3.5 with `PKP_E2E_LINE=stable-3_5_0` in front; the script then
  adds `<show_title>`, as the Steps' bracket says). `NEIGHBOUR=1` takes
  the second file (the users the fix must not change) instead.
- The fix trial:
  [trial.sh](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-import-refused-password-creates-account/trial.sh)
  (`bin/try-fix.js apply fix.diff ojs omp`, then the Steps and the
  second file with the fix, the revert, and the second file without
  it, each on a freshly loaded dataset). fix.diff is against today's
  `main` and applies to OJS and OMP without fuzz; a pending fix for the
  import's rehash check (a separate report) changes the line after its
  last hunk.
- Walked 2026-09-30 on PostgreSQL, each install loaded from
  pkp/datasets 38ab955 (2026-09-30), `<app>/main/pgsql` and
  `<app>/stable-3_5_0/pgsql`. main: OJS bade233f73 (lib/pkp
  2e377d27fc), OMP 3b0ecf794c (lib/pkp 3dc90c81a6). stable-3_5_0: OJS
  92b9a16b48, OMP 3081c9b00d (lib/pkp a9c76aed62). All four showed the
  Observed above, and on all four the way round worked. The fault is in
  PHP logic, not the database; MySQL was not checked.
- Without `<date_registered>` the import answers 500 (a not-null
  violation on `users.date_registered`), a separate fault not covered
  here.
- 3.5, by code as well: `UserXmlPKPUserFilter.php` in lib/pkp
  a9c76aed62 is byte for byte the file in OJS `main`'s lib/pkp
  2e377d27fc (compared with `diff`), rehash line included (`if
  (password_needs_rehash($passwordHash, PASSWORD_BCRYPT))`), so the
  line numbers hold there too. The only difference on the lines read
  is OMP `main`'s older pointer (see Cause).
- 3.4, by code: pkp-lib `stable-3_4_0` at df13621c2d has the same
  `importUserPasswordValidation()` (lines 366–392) and the same call
  (line 197) before `Repo::user()->add()` (line 259) and the role loop.
  OJS `stable-3_4_0` at 9571d8fde7 and OMP at 0aec65441f ship the Users
  XML Plugin.
- 3.3, by code: pkp-lib `stable-3_3_0` at d446601ebe
  (`UserXmlPKPUserFilter.inc.php`) has the same check (lines 315–341)
  and the same call (line 153) before `$userDao->insertObject()` (line
  215) and `assignUserToGroup()` (line 266). OJS 9fdb9bcf9a and OMP
  8e72fc8836 ship the plugin. bc01a6a126 is an
  ancestor of both `stable-3_4_0` and `stable-3_3_0`.
- Introduced: `git blame` on the refused branch stops at the PSR-12
  reformat e3f570bc37 (2021). Blame at its parent gives bc01a6a126
  ("pkp/pkp-lib#3462 Error messages added to user import process"),
  which added the length check, the message and
  `plugins.importexport.user.error.userHasNoPassword`. The earlier
  commit of the same pull request, 185bc35a6d, hashed every plain
  password. The GitHub API gives PR `pkp/pkp-lib#3494` (merged
  2018-05-31, with `pkp/ojs#1954` and `pkp/omp#529`).
- Upstream searched in pkp/pkp-lib, pkp/ojs, pkp/omp and
  pkp/ui-library by the symptom's words and by `UserXmlPKPUserFilter`,
  `importUserPasswordValidation` and `plainPasswordNotValid`.
- Unverified: the command-line import, and that an existing
  account's password still signs in after the import (both read in the
  code only; the walk showed the roles).
