# On PHP 8.2 or 8.3, a users import drops the file's passwords and mails each new account a new one

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP (OPS has no Users XML Plugin)
  - 3.5: OJS, OMP
  - 3.4: none (code; the stored hash and the import's check both use PHP's default cost)
  - 3.3: none (code; the same)
- **Introduced** `pkp/pkp-lib#11953` for `pkp/pkp-lib#11933` · [8d8a37010b](https://github.com/pkp/pkp-lib/commit/8d8a37010b8b1bf2b542e546af96237f2cb6c941) · 2025-10-19 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U63 [A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a16)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A journal or press manager imports a users file in Tools › "Users XML
Plugin" on a server running PHP 8.2 or 8.3. The file comes from "Export
Users" on an installation of 3.5.0-2 or later, which writes each
password as a scrambled copy (a hash) in the form 3.5.0-2 and later
store. Each new account should sign in with the password it had there.
Instead it gets a new password that it must change at its first
sign-in, sent in a "Journal Registration" email ("Press Registration" on
a press), and its old password no longer works. The "Results" tab reads
"Import/Export errors:" with a line for each account.

The accounts and their roles are imported, and each person can get back
in with the emailed password. The manager cannot move accounts with
their passwords, and every person moved gets an email the manager did
not choose to send.

A file with plain-text passwords imports normally. So do passwords
that older versions stored on PHP below 8.4, and passwords not changed
or signed in to since 3.5.0-2. With PHP 8.4 or later on the importing server, the file keeps
its passwords.

## Impact

- **Lost:** the password of every new account in the file. The results
  line reads "The imported user "agallego" password could not be
  imported as is. A new password is been send to the user email. The
  user has been imported.", so the manager is told, in those words.
- **Who:** a manager on PHP 8.2 or 8.3, both supported, who brings
  users in from another installation of 3.5.0-2 or later, for example
  when moving a journal to a new site. Accounts the importing
  installation already holds keep their passwords (see Cause).
- **Way round:** none that keeps the passwords. OJS's command-line
  import runs the same check, and OMP has none.

Medium: people lose their passwords, not their accounts, roles or work,
and are told how to get back in. It would be high on an installation
whose mail does not reach its users, since the moved accounts could not
sign in until someone set their passwords.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS or OMP `main` (or `stable-3_5_0`),
  context `publicknowledge`. Its accounts' passwords are stored in
  3.5.0-2's form (bcrypt, cost 12).
- The server runs PHP 8.2 or 8.3: Administration › "System Information"
  reads "PHP version 8.3.x".

The steps export one of the dataset's accounts, delete it by merging it
into another, and import it again. The import then meets a new account
whose password came from an installation of this version.

1. Sign in as `admin` (password `admin`).
2. Open the journal (press): Tools › "Users XML Plugin", tab "Export
   Users".
3. Tick the row of Adela Gallego (`agallego`) and click "Export Users".
   An .xml file downloads. Its `<password … encryption="sha1">` holds a
   value that starts with `$2y$12$`.
4. Settings › "Users & Roles", "Users": in agallego's row menu choose
   "Merge User". In the "Merge user" window, click the arrow at the
   start of Aisla McCrae's (`amccrae`) row. Under the row, click "Merge
   into this User", then "OK" on "Are you sure you wish to merge the
   account with the username "agallego" into the account with the
   username "amccrae"? …". The account `agallego` is gone.
5. Tools › "Users XML Plugin", tab "Import Users": click "Upload File",
   choose the file from step 3, and click "Import Users".
6. Read the "Results" tab.
7. Sign out, and sign in as `agallego` with password `agallegoagallego`.
8. Open the mailbox of `agallego@mailinator.com`.

**Expected:** the "Results" tab reads "The import completed
successfully. Users with usernames and email addresses that are not
already in use have been imported, along with accompanying user
groups.". `agallego` signs in with `agallegoagallego`. No email is sent.

**Observed:** the "Results" tab reads:

```
Import/Export errors:
The imported user "agallego" password could not be imported as is. A new password is been send to the user email. The user has been imported.
```

The sign-in fails with "Invalid username/email or password. Please try
again.". The mailbox holds one email, subject "Journal Registration"
("Press Registration" on OMP), from `pkpadmin@mailinator.com`, reply-to
`rvaca@mailinator.com`:

```
Adela Gallego

You have now been registered as a user with Journal of Public Knowledge. We have included your username and password in this email, which are needed for all work with this journal through its website. At any point, you can ask to be removed from the journal's list of users by contacting me.

Username: agallego
Password: <a new password>

Thank you,

admin admin
```

Signing in with the emailed password opens "Change Password".

## Cause

The import checks the file's hash against PHP's default bcrypt cost,
while the installation writes its hashes at a fixed cost of 12. In
lib/pkp `plugins/importexport/users/filter/UserXmlPKPUserFilter.php`,
`importUserPasswordValidation()` (line 491) replaces any hash for which
`password_needs_rehash($passwordHash, PASSWORD_BCRYPT)` returns true.
The call passes no cost, so PHP compares the hash with its own default:
10 before PHP 8.4, 12 from PHP 8.4. `Validation::encryptCredentials()`
(lib/pkp `classes/security/Validation.php`, line 260) writes every
password with `['cost' => 12]`. So on PHP 8.2 and 8.3 the check returns
true for every hash that 3.5.0-2 or later wrote. The branch then
generates a password, sets "must change" and adds the
`passwordHasBeenChanged` line. `parseUser()` saves a new account with
that password and, because a password was generated (`if ($password)`,
line 296), mails it `UserCreated` (line 307).

A file from "Export Users" always reaches this check.
`PKPUserUserXmlFilter` (line 122) writes each `<password>` with
`encryption="<the config's encryption setting>"` (`sha1` in the
dataset), and the import sends any password with an `encryption`
attribute to the hash check.

Before the change named under Introduced, `encryptCredentials()` called
`password_hash($password, PASSWORD_BCRYPT)` with no cost, so the stored
hash and the import's check followed the same default on any PHP. That
change pinned the stored cost to 12, the cost of Laravel's
`BcryptHasher`. Laravel uses it at sign-in to decide whether to rehash
(`PKPUserProvider::rehashPasswordIfRequired()`). On PHP 8.3 the cost-10
hashes had been rehashed at every sign-in, and each new hash signed the
user out of their other browsers (`pkp/pkp-lib#11933`).

Reach:

- An account the importing installation already holds (the file
  imported into a second journal or press, or imported again) keeps its
  password and gets no email, because line 296 sends only for a new
  account. The results still show the line for it (code). That wrong
  line is a separate finding, spec U63
  [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a15).
  On PHP 8.4 it shows only for a hash that is not at cost 12. This
  fault makes it show for every account.
- A plain-text password (no `encryption` attribute) is hashed on import
  and signs in, and a bcrypt hash at cost 10 is kept and signs in
  (walked). A file with a user and no `<password>` is refused as a whole
  (spec U63 Rule 22a).
- OJS's command-line import (`UserImportExportPlugin::executeCLI()` ›
  `importUsers()`) runs the same filter. OMP has no command-line users
  import (code).
- `Validation::verifyPassword()` (line 77) makes the same call with no
  cost. On PHP 8.2 and 8.3 it returns true there for every cost-12 hash
  as well, but the method then only compares the password with its
  legacy md5/sha1 form before `password_verify()`, so its answer is
  right. Its callers are `Validation::checkCredentials()` (the "Current
  password" checks) and `PKPSessionGuard::rehashUserPasswordForDeviceLogout()`
  (code).
- Signing in is not affected: it checks through Laravel's
  `BcryptHasher`, and raises a lower-cost bcrypt hash to cost 12 (code;
  walked for a cost-10 hash).
- Accounts already imported this way hold the new password. The old one
  cannot be restored, so there is nothing to repair.

## Proposed fix

A proposal, tried on `main`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-import-resets-installation-passwords/fix.diff)).

Recommended: keep any bcrypt hash, whatever its cost, and replace only
a hash of another algorithm. In
`UserXmlPKPUserFilter::importUserPasswordValidation()`:

```diff
-            if (password_needs_rehash($passwordHash, PASSWORD_BCRYPT)) {
+            // Keep any bcrypt hash, whatever its cost: it still verifies, and sign-in raises its cost to
+            // Validation::encryptCredentials()'s (PKPUserProvider::rehashPasswordIfRequired()). Only a hash
+            // of another algorithm, which this installation cannot verify, is replaced.
+            if (password_get_info($passwordHash)['algo'] !== PASSWORD_BCRYPT) {
```

The check is there to catch a hash this installation cannot verify
(md5, sha1 and the like, the `encryption` values the method's comment
names). A bcrypt hash of any cost verifies, and the first sign-in raises
it to cost 12. So the fix keeps every working password, on every PHP
version, and needs no product decision. It is also the behaviour PHP
8.2 and 8.3 installs had before `pkp/pkp-lib#11933` for the hashes
they wrote. The sign-in rehash that `pkp/pkp-lib#11933` fixed is
untouched, and `verifyPassword()` needs no change, since its answer is
right.

Tried on OJS and OMP (PHP 8.3). With the fix, the Steps gave the
Expected: the success sentence, `agallego` signed in with
`agallegoagallego`, and no email. A second file with three new
accounts, one per other password form, gave the same result with and
without the fix:

- A plain-text password: imported, signed in with it, no email.
- A bcrypt hash at cost 10: kept, signed in with it, no email, and
  stored at cost 12 after that sign-in.
- An md5 value (`encryption="md5"`): the line and a mailed password. The
  forced "Change Password" form accepted the mailed password as
  "Current password", and the new password signed in.

`dbarnes` signed in as before.

**Alternatives:**

- Pass the cost (`['cost' => 12]`, or one `Validation::BCRYPT_COST`
  shared with `encryptCredentials()` through a
  `Validation::passwordNeedsRehash()` helper). This keeps a cost-12 hash
  on every PHP, but it replaces a cost-10 one. On PHP 8.2 and 8.3 that
  would begin mailing new passwords for hashes that are kept today,
  which is a product decision. Tried on PHP 8.3: the Steps' account kept
  its password, and the cost-10 account got the line and a mailed
  password. Using the helper in `verifyPassword()` too would
  only make the two checks alike: it changes no answer for either
  caller.
- Pass the cost and also keep a lower-cost bcrypt. This gives the same
  result as the recommendation, in two conditions instead of one.
- Ask Laravel's hasher (`PKPUserProvider::getHasher()->needsRehash()`).
  It has the same cost-10 problem as passing the cost, and it ties the
  import filter to the sign-in provider.
- Revert the change named under Introduced. This would bring back the
  sign-in rehash that signed users out of their other browsers.

**What goes with it:**

- On PHP 8.4, a file's cost-10 bcrypt hash is kept instead of replaced
  and mailed (code: the check no longer depends on the PHP version).
  The person signs in with their own password.
- No stored data, REST API or hook changes.
- Backport: the diff applies unchanged to pkp-lib `stable-3_5_0` (a
  patch dry run). 3.4 and 3.3 need nothing.
- Guard: a pkp-lib unit test on `importUserPasswordValidation()`. A
  hash from `encryptCredentials()` and a cost-10 bcrypt are kept, and an
  md5 value is replaced. pkp's tests run on PHP 8.2 and 8.3, so this
  test would have caught the fault. In e2e, U63's users-import scenario.

Small: one condition in `UserXmlPKPUserFilter::importUserPasswordValidation()`,
the only call site the diff changes, and a unit test.

## Evidence

- Script that takes the Steps in a browser on a fresh load of the
  default dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-import-resets-installation-passwords/walk.js),
  run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> ONLY=ojs,omp node bin/probe.js all shared/playwright/checks/issues/users-import-resets-installation-passwords/walk.js`
  (on 3.5 with `PKP_E2E_LINE=stable-3_5_0` in front; `NEIGHBOUR=1` adds
  the file of the three other password forms). The fix was tried with
  [trial.sh](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-import-resets-installation-passwords/trial.sh)
  (`bin/try-fix.js apply`, the walks, `bin/try-fix.js revert`).
- Walked 2026-09-30 on PostgreSQL and PHP 8.3.33, each install loaded
  from pkp/datasets 38ab955 (2026-09-30), `<app>/main/pgsql` and
  `<app>/stable-3_5_0/pgsql`. main: OJS bade233f73 (lib/pkp
  2e377d27fc), OMP 3b0ecf794 (lib/pkp 3dc90c81a6). stable-3_5_0: OJS
  92b9a16b48, OMP 3081c9b00 (lib/pkp a9c76aed62). All four showed the
  Observed above. No request failed, and the browser logged no error.
  The fault does not depend on the database, so MySQL was not checked.
- PHP 8.4 was not walked; the machine has PHP 8.3 and 8.2. What the
  report says of PHP 8.4 rests on PHP 8.4 raising the default bcrypt
  cost to 12, read against the code.
- 3.5, by code as well: pkp-lib `stable-3_5_0` carries the same change
  as `e1f53b750c` (`pkp/pkp-lib#11952`, first released in 3.5.0-2). The
  filter's check (line 491) and `verifyPassword()` (line 76) are
  unchanged.
- 3.4, by code: pkp-lib `stable-3_4_0` at df13621c2d.
  `encryptCredentials()` calls `password_hash($password,
  PASSWORD_BCRYPT)` with no cost (line 309), and the filter's check
  (line 379) passes none, so both follow PHP's default. The branch has
  no commit for `pkp/pkp-lib#11933`. OJS 9571d8fde7 and OMP 0aec65441
  ship the plugin; OPS acd8ae704b does not.
- 3.3, by code: pkp-lib `stable-3_3_0` at d446601ebe, the same pair
  (`Validation.inc.php` line 279, `UserXmlPKPUserFilter.inc.php` line
  327). OJS 9fdb9bcf9a and OMP 8e72fc883 ship the plugin; OPS
  c5532e2161 does not.
- Introduced: `git blame` on `Validation.php` line 260 gives
  8d8a37010b ("pkp/pkp-lib#11933 Proper hashing cost applied at login
  time"), merged 2025-11-20. The filter has called
  `password_needs_rehash()` with no cost since `pkp/pkp-lib#3462`
  (2018), which was right while the writer also used PHP's default.
- Upstream searched 2026-09-30 in pkp/pkp-lib, pkp/ojs, pkp/omp and
  pkp/ui-library. The searches used the symptom (users import password,
  "could not be imported as is", new password email), the names in the
  Cause (`password_needs_rehash`, `importUserPasswordValidation`,
  `encryptCredentials`), "bcrypt cost" and "PHP 8.4 password". Only
  `pkp/pkp-lib#11933` and its PRs came up, and they do not mention the
  import.
- Unverified, read in the code only: the existing-account branch on PHP
  8.2 and 8.3, the command-line import, and the PHP 8.4 behaviour with
  and without the fix.
