# On PHP older than 8.4, a users import replaces each new user's working password and emails a new one

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP (on PHP older than 8.4; OPS has no users import)
  - 3.5: OJS, OMP (code; on PHP older than 8.4)
  - 3.4: none (code; passwords stored at PHP's default cost)
  - 3.3: none (code; passwords stored at PHP's default cost)
- **Introduced** `pkp/pkp-lib#11953` for `pkp/pkp-lib#11933` · [8d8a37010b](https://github.com/pkp/pkp-lib/commit/8d8a37010b8b1bf2b542e546af96237f2cb6c941) · 2025-10-19 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U63 [A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a16)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A users file exported from OJS or OMP 3.5 or later carries each user's
password as a hash, in the form these versions store it. On a server
running PHP 8.2 or 8.3, both of which the application supports, a users
import does not recognise that form as its own. Each new account gets a
new password it must change at its first sign-in, sent in the "Journal
Registration" email ("Press Registration" on a press), and its own
password no longer signs in.

The "Results" tab lists "…password could not be imported as is. A new
password is been send to the user email. The user has been imported."
for every user in the file. Accounts that already exist get the line
too, but they keep their passwords and receive no email.

Released 3.5 versions from 3.5.0-2 on carry it. On PHP 8.4 the same
import keeps these passwords, but replaces those in files from 3.4 and
3.3.

## Impact

- **Lost.** Every new user's own password. If the email does not
  arrive, that user cannot sign in until a password is set, and "Forgot
  your password?" also goes by email.
- **Who.** A journal or press manager moving users from another OJS or
  OMP installation, on a server with PHP 8.2 or 8.3. Every new user in
  the file is affected.
- **Way round.** None that keeps the passwords. The users get in with
  the emailed password and choose a new one.

Medium: the import replaces the password of every new user in the file,
but each is told by email. Mail that does not reach the users would
raise it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS (on OMP the same, with
  "press" for "journal"). The server runs PHP 8.2 or 8.3
  (Administration › "System Information" shows the PHP version), and
  its email goes to a mail catcher or to the log (`default = log` under
  `[email]` in `config.inc.php`).
- A users file `u63ir5-new.xml` with one new user, Nora New. Her
  password is a bcrypt hash at cost 12 of `u63ir5newu63ir5new`, as OJS
  and OMP 3.5 and later store it. An export writes the hash with the
  `encryption` attribute set to the source's `[security] encryption`
  setting (`sha1` by default). The import only checks that the
  attribute is present, and then treats the value as a hash.

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
        <givenname locale="en">Nora</givenname>
        <familyname locale="en">New</familyname>
        <email>u63ir5new@mailinator.com</email>
        <username>u63ir5new</username>
        <password encryption="sha1"><value>$2y$12$.51wKGk6L430Nc5Z7h/aiuZVHvr70xCsP5yunx6GqjYGpXbE/uEua</value></password>
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
  after `<is_default>`.]

1. Sign in as `rvaca` (the journal manager).
2. In the left menu, open "Tools", then "Users XML Plugin".
3. On "Import Users", press "Upload File", choose `u63ir5-new.xml`, and
   press "Import Users".
4. Look in the mail catcher or the mail log for an email to
   `u63ir5new@mailinator.com`.
5. Sign out, and sign in as `u63ir5new` with `u63ir5newu63ir5new`.

**Expected:** step 3 reads "The import completed successfully. Users
with usernames and email addresses that are not already in use have been
imported, along with accompanying user groups."; step 4 finds no email;
step 5 signs Nora New in.

**Observed** in an earlier check, not on these Steps: OJS and OMP
`main` on PHP 8.3.33, 2026-09-29, on a test install with its own
manager and users rather than the default dataset. A new account given
a cost-12 bcrypt hash got this "Results" line:

```
Import/Export errors:
The imported user "<username>" password could not be imported as is. A new password is been send to the user email. The user has been imported.
```

That account then got a "Journal Registration" ("Press Registration")
email from the importing manager with a new password, and had to change
it at its first sign-in. Its original password was refused.

Control: on PHP 8.4, these Steps give the Expected (walked on the
default dataset, `main` and 3.5).

## Cause

`UserXmlPKPUserFilter::importUserPasswordValidation()` (lib/pkp
`plugins/importexport/users/filter/UserXmlPKPUserFilter.php`) decides
whether a hashed file password can be kept with
`password_needs_rehash($passwordHash, PASSWORD_BCRYPT)`. With no options,
PHP compares the hash with its own default bcrypt cost: 10 before PHP
8.4, 12 from 8.4 on.

The installation stores every password at cost 12, whatever the PHP
version (`Validation::encryptCredentials()`). So below PHP 8.4 the check
flags every password a 3.5 or later installation wrote. The method then
replaces the password with a generated one, sets "must change", and
sends the new account the `UserCreated` email.

The check confuses two questions: whether a hash can be kept, and
whether it is at the preferred cost. Any bcrypt hash verifies, and
sign-in already raises one at another cost to 12
(`PKPUserProvider::rehashPasswordIfRequired()`, called by Laravel's
`SessionGuard` on each sign-in).

The fault appeared with
[8d8a37010b](https://github.com/pkp/pkp-lib/commit/8d8a37010b8b1bf2b542e546af96237f2cb6c941)
(pkp/pkp-lib#11933). Sign-in's rehash check uses Laravel's
`BcryptHasher`, whose cost is 12. On PHP below 8.4 every sign-in
therefore rewrote the stored hash, and that signed the user out on
their other devices. The commit made `encryptCredentials()` write cost
12 to match, but the import's check kept PHP's default. Before it, both
sides used PHP's default, and the import kept the installation's own
passwords on every PHP version.

Reach:

- Existing accounts in the file get the line but keep their passwords
  and get no email. That misleading line is U63 A15's fault; this cause
  makes it show for every account (on screen on PHP 8.3, 2026-09-29).
- The same check on PHP 8.4 replaces cost-10 hashes. Every 3.4 and 3.3
  export carries those when written on PHP below 8.4, and so do older
  accounts of 3.5 and `main` installs that have not signed in since. On
  screen on PHP 8.4: a new user given a cost-10 hash got the line, the
  email and the forced change. This half dates from PHP 8.4's new
  default, not from the commit.
- On 3.4 and 3.3, a file from a 3.5 or later installation (cost 12) is
  reset the same way on their PHP 8.2 (in the code).
- `Validation::verifyPassword()` makes the same call without a cost. It
  only decides whether to try a legacy MD5/SHA-1 comparison before
  `password_verify()`, so the result is the same (in the code). It is
  left out of the fix.

## Proposed fix

Keep any bcrypt hash, whatever its cost, and give a new password only to
a hash in another scheme. Sign-in brings a kept hash up to cost 12 the
first time the user signs in:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-import-resets-passwords-below-php84/fix.diff).

```diff
-            if (password_needs_rehash($passwordHash, PASSWORD_BCRYPT)) {
+            // Keep any bcrypt hash, whatever its cost: sign-in raises it to the installation's cost
+            // (PKPUserProvider::rehashPasswordIfRequired()). Only another scheme gets a new password.
+            if (password_get_info($passwordHash)['algo'] !== PASSWORD_BCRYPT) {
```

This keeps the passwords of files from 3.5 and later (cost 12) and from
3.4 and 3.3 (cost 10) on every PHP version. It leaves the cost to the
one place that sets it, sign-in's hasher. A legacy MD5/SHA-1 value
still gets a new password and the email, as it should.
`password_get_info()` reports bcrypt for the `$2y$` form PHP writes;
`$2a$` or `$2b$` hashes from other systems would still be replaced,
which is what happens to them today.

Not tried. The PHP 8.2 and 8.3 case needs a PHP this machine does not
have (it has 8.4 only). The PHP 8.4 half, a cost-10 hash now kept, was
not walked either. The diff applies to the `main` and 3.5 lib/pkp
commits and passes `php -l`.

**Alternatives:**

- Pass `['cost' => 12]` to `password_needs_rehash()`, the cost
  `encryptCredentials()` writes. It fixes the headline case, but on PHP
  8.2 and 8.3 it would start replacing the cost-10 passwords of 3.4 and
  3.3 exports, which are kept today.
- A shared cost constant in `Validation`. It still turns every cost
  difference into a password reset, when sign-in already handles one.

**What goes with it:**

- Nothing to repair. Accounts imported meanwhile already have the new
  password they were sent.
- Applies as written to 3.5. On 3.4 and 3.3 the same line would let
  files from newer versions keep their passwords. That is optional,
  since those branches' own exports are kept.
- The guard: a PHPUnit test that imports a new user with a cost-10 hash
  and one with a cost-12 hash, and expects both kept with no line. It
  fails today on any PHP (cost 12 below 8.4, cost 10 on 8.4). OJS's own
  workflow (`.github/workflows/main.yml`) runs its test jobs on PHP 8.2
  and 8.3.

Small: one line in pkp-lib, using a PHP function the code already
relies on, and a test.

## Evidence

- Kept script that runs the Steps in the browser on OJS and OMP, on an
  install loaded from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-import-refused-password-creates-account/walk.js)
  part `r2` (the files in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-import-refused-password-creates-account/lib.js)),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/users-import-refused-password-creates-account/walk.js r2`.
  It imports `u63ir5-new.xml` (steps 1–5) and `u63ir5-ten.xml`, a new
  user with a cost-10 hash, then reads the mail catcher by recipient.
- Walked 2026-10-01 on PostgreSQL and **PHP 8.4.11**, the only PHP on the
  machine. Each install was freshly loaded from pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30):
  - main: OJS bade233f73 (lib/pkp 2e377d27fc), OMP 3b0ecf794 (lib/pkp
    3dc90c81a6). Steps 1–5 gave the Expected. The cost-10 user got the
    line, the email and the forced change.
  - stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00 (lib/pkp a9c76aed62),
    with the 3.5 bracket's `<show_title>`. The same as on `main`.
- An earlier fix, `['cost' => 12]` in the import and in
  `verifyPassword()`, was tried on PHP 8.4 on the `main` tips with
  `node bin/try-fix.js apply … ojs omp`, walk.js part `r2`, and
  `node bin/try-fix.js revert … ojs omp`. It changed nothing on PHP
  8.4, as expected. It was replaced by the fix above after weighing the
  cost-10 case, and the new diff has not been walked.
- The Observed comes from the U63 spec's own check on the campaign's
  test install (not the default dataset), OJS and OMP `main`, PHP
  8.3.33, 2026-09-29, twice. The same day's run of the spec's
  move-users scenario on PHP 8.3 read the line for every account of a
  file moved between two journals. Since then lib/pkp changed the import
  only in role-date code (85f6b3c074, 2e377d27fc).
- Unverified on today's tips: the PHP 8.3 behaviour itself. It rests on
  that check and on PHP's documented change of the default bcrypt cost
  from 10 to 12 in PHP 8.4. On this machine `password_needs_rehash()`
  without options flags a cost-10 hash and keeps a cost-12 one.
  `password_get_info()` reports `2y` for both and `null` for a SHA-1
  hex value. Also unverified: whether OJS's CI test jobs include
  pkp-lib's PHPUnit tests.
- Released versions: the 3.5 backport, 3865a29dbc
  (`pkp/pkp-lib#11952`), is contained in the pkp-lib tags `3_5_0-2`
  through `3_5_0-5`.
- 3.4 and 3.3, by code: pkp-lib `stable-3_4_0` at df13621c2d and
  `stable-3_3_0` at d446601ebe. `encryptCredentials()` calls
  `password_hash($password, PASSWORD_BCRYPT)` with no cost, the
  import's check is the same as on `main`, and neither branch has a
  pkp/pkp-lib#11933 commit.
- Introduced: `git log -L` on `encryptCredentials()`'s `password_hash()`
  line gives 8d8a37010b. The GitHub API names its PR,
  `pkp/pkp-lib#11953`, merged 2025-11-20. In the issue, the author
  names the cost difference below PHP 8.4 as the cause of the sign-outs.
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/omp searched on 2026-10-01 for
  the users import's password line, `password_needs_rehash` and the
  bcrypt cost.
