# A users import says a user with a too-short password was not imported, yet creates an account nobody can sign in to

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP (OPS has no users import)
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** `pkp/pkp-lib#3494` for `pkp/pkp-lib#3462` · [bc01a6a126](https://github.com/pkp/pkp-lib/commit/bc01a6a1267c888311b0a731beea2770bc38ccc0) · 2018-04-30 · Dimitris Efstathiou (defstat)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U63 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a4), [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a15)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager imports a users file in which a user's plain-text password is
shorter than the site's minimum, or empty. The "Results" tab says "The
user has not been imported.", but the account is created all the same,
with its roles. No password signs in to it, and nobody is emailed.

If the manager corrects the password in the file and imports it again,
the import reports success but leaves the existing account as it was,
so the corrected password does not sign in either.

The results also mislead for accounts that already exist. When the file
gives such an account a password hashed in an older scheme (an older
installation's SHA-1, say), the results read "A new password is been
send to the user email.", yet no email goes out and the account keeps
its own password.

## Impact

- **Lost.** No data. The manager is told the opposite of what happened,
  and the account's owner gets no email.
- **Who.** A journal or press manager importing a file written by hand
  or converted from another system, with a short or empty plain-text
  password for some user. Files exported from another OJS or OMP carry
  hashed passwords and are never refused. The false "new password" line
  shows for each existing account whose stored password is in an older
  scheme, and for every existing account on PHP older than 8.4 (U63 A16).
- **Way round.** The owner can set a password through "Forgot your
  password?", once someone tells them the account exists. The "Results"
  tab does not say it exists.

Medium: the results say the reverse of what the import did, but only for
a narrow input, and the owner can still set a password. A
converter that wrote short passwords for every user of a migration would
raise it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS (on OMP the same, with
  "press" for "journal"), with its email going to a mail catcher or to
  the log (`default = log` under `[email]` in `config.inc.php`), where
  the "no email" of the steps is read.
- A users file `u63ir5-short.xml` with two new users, Sam Short with the
  password `abc` and Emma Empty with an empty one (the site minimum is 6
  characters):

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
        <givenname locale="en">Sam</givenname>
        <familyname locale="en">Short</familyname>
        <email>u63ir5short@mailinator.com</email>
        <username>u63ir5short</username>
        <password><value>abc</value></password>
        <date_registered>2026-01-15 10:00:00</date_registered>
        <user_user_group>
          <user_group_ref>Reader</user_group_ref>
          <masthead>false</masthead>
        </user_user_group>
      </user>
      <user>
        <givenname locale="en">Emma</givenname>
        <familyname locale="en">Empty</familyname>
        <email>u63ir5empty@mailinator.com</email>
        <username>u63ir5empty</username>
        <password><value></value></password>
        <date_registered>2026-01-15 10:00:00</date_registered>
        <user_user_group>
          <user_group_ref>Reader</user_group_ref>
          <masthead>false</masthead>
        </user_user_group>
      </user>
    </users>
  </PKPUsers>
  ```

  [3.5: the `<user_group>` also needs `<show_title>true</show_title>`
  after `<is_default>`; 3.5's file format requires it and `main`'s no
  longer accepts it.]
- `u63ir5-fixed.xml`: the same file with Sam Short's `<user>` alone,
  his password now `<password><value>u63ir5shortpass</value></password>`.
- `u63ir5-existing.xml`: the same file with one `<user>` for the
  dataset's Julie Janssen (`Julie`, `Janssen`,
  `jjanssen@mailinator.com`, `jjanssen`) and the password
  `<password encryption="sha1"><value>2ac1751ea5fd8a154b780c09da24ccff3f04bbe1</value></password>`:
  the SHA-1 of her username and password, as an installation configured
  with `encryption = sha1` stored it before bcrypt.
- `u63ir5-ten.xml`, for the control: the same file with one new user,
  Tom Ten (`Tom`, `Ten`, `u63ir5ten@mailinator.com`, `u63ir5ten`), and
  `<password encryption="sha1"><value>$2y$10$J2LMIZ8ZlFutmhGS4hEWmer5V7El9jvLTiShqKPchxA5cXzgwepO2</value></password>`,
  a bcrypt hash at cost 10 of `u63ir5tenu63ir5ten`.

A refused password:

1. Sign in as `rvaca` (the journal manager).
2. In the left menu, open "Tools", then "Users XML Plugin".
3. On "Import Users", press "Upload File", choose `u63ir5-short.xml`, and
   press "Import Users".
4. Open Settings › Users & Roles › "Users", type `u63ir5` in the search
   box and press Enter.
5. Sign out, and sign in as `u63ir5short` with the password `abc`.
6. Sign in as `rvaca` again and import `u63ir5-fixed.xml` as in steps
   2–3 (the manager corrects the password and imports again).
7. Sign out, and sign in as `u63ir5short` with `u63ir5shortpass`.

An existing account:

8. As `rvaca`, import `u63ir5-existing.xml` as in steps 2–3.
9. Sign out, and sign in as `jjanssen` with her own password,
   `jjanssenjjanssen`.

**Expected:** step 3 reports both users as not imported, and step 4
lists nobody. Step 6 imports Sam Short with the corrected password, and
step 7 signs him in. Step 8 says nothing about a new password: Julie
Janssen's account already exists, so the import leaves her password as
it is.

**Observed:** step 3's "Results" tab reads

```
Import/Export errors:
The imported user "u63ir5short" has a plain password that is not valid. The user has not been imported.
The imported user "u63ir5empty" has a plain password that is not valid. The user has not been imported.
```

and step 4 shows "Current Users (2)": "Sam Short" and "Emma Empty", each
as Reader. Step 5 is refused with "Invalid username/email or password.
Please try again." Step 6 reads "The import completed successfully.
Users with usernames and email addresses that are not already in use
have been imported, along with accompanying user groups.", and step 7 is
refused the same way as step 5. No email goes to either address. Step 8
reads

```
Import/Export errors:
The imported user "jjanssen" password could not be imported as is. A new password is been send to the user email. The user has been imported.
```

but no email goes to `jjanssen@mailinator.com`, and step 9 signs her in
with her own password, without asking her to change it.

Control, on PHP 8.4: importing `u63ir5-ten.xml` as in steps 2–3 gives
the same line as step 8 for "u63ir5ten", and also what it promises: a
"Journal Registration" email to `u63ir5ten@mailinator.com` with a new
password, which must be changed at the first sign-in. (On PHP older than
8.4 the import keeps a cost-10 hash, so the control shows nothing.)

## Cause

`UserXmlPKPUserFilter::parseUser()` (lib/pkp
`plugins/importexport/users/filter/UserXmlPKPUserFilter.php`) calls
`importUserPasswordValidation($user, $encryption)` before it looks the
account up. That method writes its verdict on the file's password into
the results:

- `plugins.importexport.user.error.plainPasswordNotValid` ("…The user
  has not been imported.") for a plain password shorter than
  `Site::getMinPasswordLength()`;
- `…passwordHasBeenChanged` ("…A new password is been send…") for a
  hash that `password_needs_rehash()` flags.

Account creation in `parseUser()` then ignores both verdicts:

- A refused password: the method adds the line and returns `null`.
  `parseUser()` goes on to `Repo::user()->add($user)` and the role rows,
  so the account is saved with a stored password that no sign-in
  matches. Since no new password was made, no email goes out.
- An existing account: the method makes a new password on the object
  built from the file. `parseUser()` then takes the stored account
  (`$user = $userByUsername`) and saves nothing, so the new password is
  dropped. The `UserCreated` email is sent only in the new-account
  branch, and the line stays.

History. `pkp/pkp-lib#3494` brought plain-text passwords to the import
in two commits. 215b630949 added the check before the lookup, the
regenerated password and its email. Then
[bc01a6a126](https://github.com/pkp/pkp-lib/commit/bc01a6a1267c888311b0a731beea2770bc38ccc0)
added the minimum length and both result lines, without making
`parseUser()` act on them. The PR was merged with both commits, so no
release ever hashed a short plain password. Until
30619d7556 (`pkp/pkp-lib#4434` for `pkp/pkp-lib#4432`, 2019, Bozana
Bokan (bozana)), an existing account was also emailed the new password,
which was never saved. That change moved the email into the new-account
branch and left the line behind.

Reach:

- An existing account given a short plain password gets the "has not
  been imported" line, yet is given the file's roles (in the code, not
  driven).
- A `<password>` with no `<value>` would get the "has no password" line
  and the same treatment as a short one. The file format requires
  `<value>`, so the import refuses such a file whole before it reaches
  this code, as it does a user with no `<password>` (in the code).
- The owner of an account created this way can set a password through
  "Forgot your password?":
  `Validation::generatePasswordResetHash()` does not need a valid
  password (in the code, not driven). On `main` a user's "Edit" in
  Settings › Users & Roles leads to `management/settings/user/<id>`, not
  the older user form that had a password field, so whether a manager
  can set the password on screen was not established.
- 3.5, 3.4 and 3.3 call the check at the same point and add the account
  the same way (in the code; 3.5 also on screen).

## Proposed fix

Check the file's password only where `parseUser()` creates an account,
and leave the account out when the check refuses the password, as the
line already says. `importUserPasswordValidation()` returns `false` on a
refusal so the caller can tell. The node variable that shared the name
`$password` is renamed, since the result no longer overwrites it in
every branch:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-import-refused-password-creates-account/fix.diff).

```diff
-                            $password = $passwordValueNodeList->item(0);
-                            $user->setPassword($password->textContent);
+                            $passwordNode = $passwordValueNodeList->item(0);
+                            $user->setPassword($passwordNode->textContent);
 ...
-        // Password Import Validation
-        $password = $this->importUserPasswordValidation($user, $encryption);
-
         $userByUsername = Repo::user()->getByUsername($user->getUsername(), true);
 ...
         } elseif (!$userByUsername && !$userByEmail) {
+            // Only a new account takes the file's password: an existing account keeps its own
+            $password = $this->importUserPasswordValidation($user, $encryption);
+            if ($password === false) {
+                // Refused, and reported as not imported: do not create the account
+                return $user;
+            }
 ...
                 $this->addError(__('plugins.importexport.user.error.plainPasswordNotValid', ['username' => $userToImport->getUsername()]));
+                return false;
```

Skipping the user follows the mismatch branch of `parseUser()`, which
adds a line and creates nothing. Checking the password for new accounts
only follows the code's own comment that an existing user's details are
not changed. The fix keeps what `pkp/pkp-lib#3494` was for: plain-text
passwords hashed on import, and a regenerated password emailed to a new
account.

Tried on OJS and OMP `main`, without the variable rename, which was
added afterwards. The walk then showed the Expected:

- both users reported and left out, and "Current Users (0)";
- the corrected import created Sam Short, who signed in;
- step 8 read the success sentence.

In the neighbour check, Tom Ten still got the line, the "Journal
Registration" ("Press Registration") email and the forced change. A new
user with a cost-12 bcrypt kept its password.

**Alternatives:**

- Create the account anyway, with a generated password and the
  registration email, and reword the line. A product choice. The current
  line promises the user is left out, which the recommended fix keeps
  with less change.
- Reword only the line for existing accounts. The check would still run
  where its outcome is thrown away, and a refused password would still
  create the account.

**What goes with it:**

- `importUserPasswordValidation()` is public, but nothing outside this
  filter calls it in pkp-lib, OJS, OMP or OPS.
- Existing accounts get no password line at all, which matches the
  success sentence ("…not already in use have been imported").
- Accounts already created this way still need a password set, through
  "Forgot your password?".
- Applies as written to 3.5. 3.4 and 3.3 have the same code in their own
  syntax.
- The guard: no unit test covers this filter today. A PHPUnit test on
  `parseUser()` with three users would catch it:
  - a new user with a short plain password: not created, one line;
  - a new user with a valid plain password: created, and the password
    verifies;
  - an existing user with an old-scheme hash: no line, and the stored
    password unchanged.

Small: a few lines in one filter method and its caller, following the
skip the method already uses, plus a test.

## Evidence

- Kept script that runs the Steps in the browser on OJS and OMP, and
  checks that OPS's Tools list has no Users XML Plugin. It runs on an
  install loaded from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-import-refused-password-creates-account/walk.js)
  (the files in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-import-refused-password-creates-account/lib.js)),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/users-import-refused-password-creates-account/walk.js r1 r2`.
  Part `r1` is steps 1–9 and part `r2` holds the control. The mail was
  read from a mail catcher by recipient.
- The fix, tried 2026-10-01 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/users-import-refused-password-creates-account/fix.diff ojs omp`,
  walk.js with the same command, then
  `node bin/try-fix.js revert shared/playwright/checks/issues/users-import-refused-password-creates-account/fix.diff ojs omp`.
  The `$passwordNode` rename was added to fix.diff after the trial and
  has not been walked. It checks with `php -l` and applies to both
  lib/pkp commits below.
- Walked 2026-10-01 on PostgreSQL and PHP 8.4.11, each install freshly
  loaded from pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`:
  - main: OJS bade233f73 (lib/pkp 2e377d27fc), OMP 3b0ecf794 (lib/pkp
    3dc90c81a6). The two lib/pkp commits hold the same password
    handling in `parseUser()`.
  - stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00 (lib/pkp a9c76aed62 for
    both), with the 3.5 bracket's `<show_title>`. Every step showed the
    same as on `main`.
  - Nothing here depends on the database. MySQL not checked.
- 3.4 and 3.3, by code: pkp-lib `stable-3_4_0` at df13621c2d and
  `stable-3_3_0` at d446601ebe. Both call
  `importUserPasswordValidation()` before the account lookup, add the
  account after a refusal, and send the registration email only in the
  new-account branch (3.3 through `UserDAO::insertObject()` and
  `MailTemplate`).
- Introduced and history: the file at 215b630949's parent stored the
  file's `<value>` as the password, with no check. At bc01a6a126's
  parent, the check before the lookup, the regenerated password and the
  email sent outside the new-account branch were all present.
  30619d7556's diff moves the email into the new-account branch. The
  PR numbers come from the GitHub API (`commits/<sha>/pulls`).
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/omp searched on 2026-10-01 for
  the users import's password lines and for
  `importUserPasswordValidation` and `password_needs_rehash`.
  `pkp/pkp-lib#2166` (closed) holds a 2019 comment quoting the "new
  password is been send" line with no email received. Its file does not
  say whether the account existed, so it is not counted as a match.
- Unverified: the "Forgot your password?" reset for an account created
  this way, whether a manager can set its password on screen, and an
  existing account given a short plain password. The first and last are
  read in the code only; the second is not settled.
