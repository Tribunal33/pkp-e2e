# A users import says an existing account was emailed a new password, but nothing is sent or changed

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP (OPS has no Users XML Plugin)
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** `pkp/pkp-lib#3494` for `pkp/pkp-lib#3462` · [bc01a6a126](https://github.com/pkp/pkp-lib/commit/bc01a6a1267c888311b0a731beea2770bc38ccc0) · 2018-04-30 · Dimitris Efstathiou (defstat)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U63 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a15)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A journal or press manager imports a users file in Tools › "Users XML
Plugin". For an account the installation already has, the file's
password is an old-form hash (see below). The "Results" tab lists,
under "Import/Export errors:", "The imported user "{username}" password
could not be imported as is. A new password is been send to the user
email. The user has been imported.". No email goes out, and the
account's own password still signs in.

The manager may tell the person to look for a password that never
comes, or read the import as having failed. For a new account the same line
is true: a new password is set and emailed.

Which file passwords count as old-form depends on the server's PHP:

- On every PHP version: a SHA-1 or MD5 value, the form OJS 2.x wrote.
- On PHP 8.4 and later: also a bcrypt hash at a cost below 12, which
  versions before 3.5.0-2 wrote on PHP older than 8.4, for an account
  that has not signed in since.
- On PHP 8.2 and 8.3: every bcrypt hash that 3.5.0-2 and later write,
  so every existing account in a file exported from the same
  installation gets the line. That is a separate fault
  ([users-import-resets-installation-passwords](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/users-import-resets-installation-passwords.md)).

## Impact

- **Lost:** nothing. The account, its password and its roles are right;
  only the results' line is wrong.
- **Who:** a manager who imports accounts that already exist: for
  example, users exported from one journal and imported into another
  journal of the same installation to give them roles there, or a file
  imported a second time. On PHP 8.4 it needs an account whose stored
  password is in one of the older forms above; on PHP 8.2 and 8.3 it is
  every existing account.
- **Way round:** none is needed; the accounts work as before. Nothing
  gets worse with time.

Low: a misleading line. It would be medium if managers acted on it, for
instance by resetting the passwords of the accounts it names.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS or OMP `main` (or `stable-3_5_0`),
  context `publicknowledge`.
- Any PHP version; the steps were taken on PHP 8.3. On PHP 8.2 or 8.3
  step 4 can be left out, since the file as exported gives the same
  result; on PHP 8.4 or later it is needed.
- Outgoing mail is kept where you can read it: a local mail catcher
  (such as Mailpit), or `[email] default = log` in `config.inc.php`,
  which writes each message to the server's log instead of sending it.

1. Sign in as `admin` (password `admin`).
2. Open the journal (press): Tools › "Users XML Plugin", tab "Export
   Users".
3. Tick the row of Adela Gallego (`agallego`) and click "Export Users".
   An .xml file downloads.
4. Open the file in a text editor. Find the `<password …>` element. Its
   `encryption` attribute is the `[security] encryption` setting of
   `config.inc.php`, `sha1` on the default dataset. Replace the text
   inside `<value>` with `cf133691b9efe7b2e2c4260151411de53aa0da3f`
   (the SHA-1 of "agallego" followed by "agallegoagallego", the form
   OJS 2.x stored), and save.
5. Tools › "Users XML Plugin", tab "Import Users": click "Upload File",
   choose the file, and click "Import Users".
6. Read the "Results" tab.
7. Look for mail to `agallego@mailinator.com` in the mail catcher or
   the log.
8. Sign out, and sign in as `agallego` with password `agallegoagallego`.

**Expected:** the "Results" tab reads "The import completed
successfully. Users with usernames and email addresses that are not
already in use have been imported, along with accompanying user
groups.". No email is sent, and `agallego` signs in with
`agallegoagallego`.

**Observed:** the "Results" tab reads:

```
Import/Export errors:
The imported user "agallego" password could not be imported as is. A new password is been send to the user email. The user has been imported.
```

No email to `agallego@mailinator.com` is sent. `agallego` signs in with
`agallegoagallego` and lands on the reviewer dashboard, not on "Change
Password".

Control: a new account in a file with a password of the same form gets
the same line, is sent a "Journal Registration" ("Press Registration"
on OMP) email with a new password, and that password opens "Change
Password".

## Cause

`UserXmlPKPUserFilter::parseUser()` (lib/pkp
`plugins/importexport/users/filter/UserXmlPKPUserFilter.php`, OJS
`main`'s lib/pkp 2e377d27fc) checks the file's password before it knows
whether the user is new. At line 220 it calls
`importUserPasswordValidation($user, $encryption)`. For a value that
`password_needs_rehash($hash, PASSWORD_BCRYPT)` flags, that method
(lines 491–497) generates a password, sets it on the user object with
"must change", and calls `addError()` with
`plugins.importexport.user.error.passwordHasBeenChanged` at once.

Only then does `parseUser()` look the user up. For an existing account
with the same username and email it replaces `$user` with the stored
account (line 227) and saves nothing, so the generated password and the
"must change" flag are dropped. The email goes out only in the new-user
branch (`if ($password)`, line 296). The line has already been added.

The line came in with the change named under Introduced. At that time
an existing account was sent the email too, with a password it had
never been given. `pkp/pkp-lib#4434` (for `pkp/pkp-lib#4432`,
[30619d7556](https://github.com/pkp/pkp-lib/commit/30619d75566fa85ff9261db6b3e0dece73334cb1),
Bozana Bokan, 2019) moved the email into the new-user branch, because
an existing user is already registered, and left the line where it was.

Reach:

- A username that belongs to one account and an email that belongs to
  another (or only one of them matching), with such a password in the
  file: `parseUser()` adds
  `usernameEmailMismatch` and imports nothing, yet the line before it
  already says "The user has been imported." (code).
- A bcrypt hash the check accepts is also discarded for an existing
  account, since the stored account replaces the file's; the stored
  password stays and no line is shown, which is right (code).
- The command-line import (`UserImportExportPlugin::executeCLI()`) runs
  the same filter but does not print the filter's errors, so the line
  never shows there (code).
- The other refusal lines of the same method,
  `plainPasswordNotValid` and `userHasNoPassword`, are added before the
  lookup too; that they do not stop the import is a separate finding
  ([users-import-refused-password-creates-account](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/users-import-refused-password-creates-account.md)).

## Proposed fix

A proposal, tried on `main`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-import-existing-account-told-new-password/fix.diff)).

Recommended: add the line in `parseUser()`, next to the email it
announces, in the branch that saves a new user:

```diff
             if ($password) {
+                $this->addError(__('plugins.importexport.user.error.passwordHasBeenChanged', ['username' => $user->getUsername()]));
                 $template = Repo::emailTemplate()->getByKey($context->getId(), UserCreated::getEmailTemplateKey());
 …
                 $userToImport->setMustChangePassword(true);
-
-                $this->addError(__('plugins.importexport.user.error.passwordHasBeenChanged', ['username' => $userToImport->getUsername()]));
+                // parseUser() says so when it saves a new user with this password; an existing user keeps its own
```

`parseUser()` is the only caller of `importUserPasswordValidation()`
and the place where new, existing and mismatched users part, so the
line leaves both the existing-account and the mismatch case. The
replacement of passwords that cannot be kept, which the introducing
change was for, is unchanged.

Tried on OJS and OMP. With the fix, the Steps gave the Expected, both
with the edited file and with the file as exported (PHP 8.3). The
control, a new account with a password of the same form, gave the same
result with and without the fix: the line, the email, and a mailed
password that opened "Change Password". The mismatch case was not
driven.

**Alternatives:**

- Call `importUserPasswordValidation()` only for a new user. It would
  also skip the needless password generation for an existing one, but
  it drops the refusal of a short plain password for existing users,
  which the fix proposed in
  [users-import-refused-password-creates-account](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/users-import-refused-password-creates-account.md)
  relies on.
- Add a line for an existing account saying its password was left as
  it was. The account's other fields are left unchanged without a word,
  so singling out the password is a product decision.

**What goes with it:**

- No REST API or hook changes. The results show one line fewer for
  existing and mismatched accounts.
- This diff and the one proposed for
  [users-import-refused-password-creates-account](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/users-import-refused-password-creates-account.md)
  touch the same method; `patch --dry-run` applies each on top of the
  other.
- Backport: the diff applies unchanged to pkp-lib `stable-3_5_0` and
  `stable-3_4_0` (`patch --dry-run`, with offsets). 3.3 has the same
  code in `UserXmlPKPUserFilter.inc.php`, with tab indentation, so it
  needs porting by hand.
- Guard: an end-to-end check that importing a users file of existing
  accounts whose passwords are SHA-1 values shows only the "The import
  completed successfully." sentence. pkp-lib has no unit test for this
  filter, and `parseUser()` needs the user repository, an import
  deployment and mail, so a unit test would need new scaffolding.

Small: one line moved within one pkp-lib class, and an end-to-end check.

## Evidence

- Script that takes the Steps in a browser on a fresh load of the
  default dataset, first with the edited file, then with the file as
  exported:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-import-existing-account-told-new-password/walk.js),
  run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> ONLY=ojs,omp node bin/probe.js all shared/playwright/checks/issues/users-import-existing-account-told-new-password/walk.js`
  (on 3.5 with `PKP_E2E_LINE=stable-3_5_0` in front). The fix trial,
  `node bin/try-fix.js apply` of fix.diff with the walk and the control
  (`NEIGHBOUR=1`, one new Reader `u63a15n` with the SHA-1 form of its
  password), is
  [trial.sh](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-import-existing-account-told-new-password/trial.sh).
  The script also checks that the stored password is unchanged and
  "must change" unset after each import.
- Walked 2026-09-30 on PostgreSQL and PHP 8.3.33 (the System
  Information page), each install loaded from pkp/datasets 38ab955
  (2026-09-30), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`.
  main: OJS bade233f73 (lib/pkp 2e377d27fc), OMP 3b0ecf794c (lib/pkp
  3dc90c81a6). stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00d (lib/pkp
  a9c76aed62). All four showed the Observed above, with the edited file
  and with the file as exported. No request failed, and the browser
  logged no error.
- PHP 8.4 not walked (the machine has 8.3 and 8.2). That the edited file
  gives the line there too rests on the code: `password_needs_rehash()`
  flags any value that is not a bcrypt hash, on every PHP version. Which
  bcrypt costs each PHP flags: PHP's default cost (10 before 8.4, 12
  from 8.4), and sign-in rewrites a flagged stored hash at cost 12
  (`PKPUserProvider::rehashPasswordIfRequired()`).
- Code reads: the call before the lookup, the line in
  `importUserPasswordValidation()` and the new-user-only email are at
  the same places in OMP `main`'s lib/pkp 3dc90c81a6 (lines 218, 446,
  294) and in pkp-lib `stable-3_5_0` a9c76aed62 (220, 497, 296).
  `stable-3_4_0` df13621c2d: the same (197, 385, 274); OJS 9571d8fde7
  and OMP 0aec65441f ship the plugin, OPS acd8ae704b does not.
  `stable-3_3_0` d446601ebe, `UserXmlPKPUserFilter.inc.php`: the same
  (153, 334, 231); OJS 9fdb9bcf9a and OMP 8e72fc8836 ship the plugin,
  OPS c5532e2161 does not. OPS main c8af945bb7 and 3.5 cf4fce69bd have
  no Users XML Plugin.
- Introduced: the `addError()` line blames to bc01a6a126 through the
  2021 reformat e3f570bc37; the GitHub API maps it to PR
  `pkp/pkp-lib#3494` (merged 2018-05-31).
- Upstream searched 2026-09-30 in pkp/pkp-lib, pkp/ojs, pkp/omp and
  pkp/ui-library: the symptom (users import password existing user, "A
  new password is been send", "new password" import), and the names in
  the Cause (`importUserPasswordValidation`, `UserXmlPKPUserFilter`
  password, `passwordHasBeenChanged`). Only `pkp/pkp-lib#2166` and
  `pkp/pkp-lib#3462` (the feature's own issues, closed 2018) came up;
  neither mentions existing accounts.
- Unverified: the mismatch case (Cause, reach) was read in the code
  only.
