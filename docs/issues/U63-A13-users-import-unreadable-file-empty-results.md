# Importing a users file with a format error leaves an empty "Results" tab instead of the reasons

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP (OPS has no Users XML Plugin)
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: none (code; the tab lists the validation errors)
- **Introduced** `pkp/pkp-lib#6960` for `pkp/pkp-lib#6490` · [049f5f85f3](https://github.com/pkp/pkp-lib/commit/049f5f85f34c602d0feeabd7e5de72ad00a095a5) · 2021-04-19 · Dimitris Efstathiou (defstat)
- **Upstream** `pkp/pkp-lib#11628` (open)
- **Tracked in** spec U63 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a13)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A manager imports a users file that does not match the users format,
such as a user with no password, an element the format does not know,
or a file that is not XML at all. The import request fails on the
server. A "Results" tab opens with only its "Close" button and a blank
panel: no message, no notice, no sign that anything is still loading.
The manager expected the tab to list why the file was refused.

No user is imported. The manager cannot tell a refused file from one
still being processed, and has no hint of what to correct.

## Impact

- **Lost.** No data. The import does not happen, and finding the fault
  means checking the file against the format by hand.
- **Who.** Journal and press managers who import users from a file they
  wrote or converted from another system. One element out of place
  anywhere in the file is enough.
- **Way round.** None on screen. Validating the file against the
  format's schema outside the application gives the reasons the tab
  should show.

Medium: the import fails with no message, but only for a file with a
format error. It would be high if files the plugin itself exports were
refused, so that ordinary transfers between journals met it.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main`, OJS or OMP, freshly loaded.
  `rvaca` is the Journal Manager (Press Manager).
- A file `u63ir4-unknown.xml`, a users file with one user and an element
  the format does not know (`<nickname>`):

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
        <givenname locale="en">Uma</givenname>
        <familyname locale="en">Unknown</familyname>
        <email>u63ir4u@mailinator.com</email>
        <username>u63ir4u</username>
        <nickname>Umi</nickname>
        <password must_change="true">
          <value>u63ir4uu63ir4u</value>
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

- A file `u63ir4-nopassword.xml`: the same file without the
  `<nickname>` line and without the three `<password>` lines, its user
  being "Paula" "Nopass", `u63ir4p`, `u63ir4p@mailinator.com`.
- A file `u63ir4-notusers.txt` holding two lines of plain text:
  `username,email` and `u63ir4t,u63ir4t@mailinator.com`.
- For the control, a file `u63ir4-good.xml`: the first file without the
  `<nickname>` line, its user being "Grace" "Good", `u63ir4g`,
  `u63ir4g@mailinator.com`.

[3.5: each users file also carries `<show_title>true</show_title>` right
after `<is_default>`, which 3.5's format requires.]

1. Sign in as `rvaca`.
2. In the left menu, open "Tools", then "Users XML Plugin".
3. On "Import Users", upload `u63ir4-unknown.xml` into "File".
4. Press "Import Users".
5. Repeat steps 2 to 4 with `u63ir4-nopassword.xml`, then with
   `u63ir4-notusers.txt`.
6. Open Settings › "Users & Roles" › "Users" and search for `u63ir4`.

Control, after step 6:

7. Repeat steps 2 to 4 with `u63ir4-good.xml`.
8. Repeat step 6.

**Expected:** each press in steps 4 and 5 opens a "Results" tab that
reads "Validation errors:" and lists what is wrong. For
`u63ir4-unknown.xml`:

```
Element '{http://pkp.sfu.ca}nickname': This element is not expected. Expected is one of ( {http://pkp.sfu.ca}country, {http://pkp.sfu.ca}email, {http://pkp.sfu.ca}url, {http://pkp.sfu.ca}orcid, {http://pkp.sfu.ca}biography, {http://pkp.sfu.ca}username ).
```

For `u63ir4-nopassword.xml`, where the parser meets
`<date_registered>` in the password's place:

```
Element '{http://pkp.sfu.ca}date_registered': This element is not expected. Expected is one of ( {http://pkp.sfu.ca}country, {http://pkp.sfu.ca}email, {http://pkp.sfu.ca}url, {http://pkp.sfu.ca}orcid, {http://pkp.sfu.ca}biography, {http://pkp.sfu.ca}username ).
```

For `u63ir4-notusers.txt`: "Start tag expected, '<' not found" and "The
document has no document element." Step 6 finds no account.

**Observed:** each press opens a "Results" tab with its "Close" button
and a blank panel. The request behind it answers 500:

```
GET /index.php/publicknowledge/en/management/importexport/plugin/UserImportExportPlugin/import?temporaryFileId=…&csrfToken=… → 500
```

The server log, the same for all three files:

```
PHP Fatal error:  Uncaught Exception: Filter (User XML user import) supports input schema(lib/pkp/plugins/importexport/users/pkp-users.xsd) - string given in …/lib/pkp/classes/filter/Filter.php:447
```

Step 6 reads "Current Users (0)" and "No Items".

Control: step 7's tab reads "The import completed successfully. Users
with usernames and email addresses that are not already in use have been
imported, along with accompanying user groups.", and step 8 lists "Grace
Good" with "Reader".

## Cause

The import action is the `import` case of
`PKPUserImportExportPlugin::display()` (lib/pkp
`plugins/importexport/users/PKPUserImportExportPlugin.php`, lines
133–162). It turns libxml's error collection on and calls
`importUsers()` (line 150), which returns the `user-xml=>user` filter's
`execute()`. It then reads `libxml_get_errors()` into `validationErrors`
for the template. The call has no `try`.

The template is each app's own
`plugins/importexport/users/templates/results.tpl` (the same in OJS and
OMP). Its first branch prints "Validation errors:" with each libxml
message, its second "Import/Export errors:" with the filter's errors,
and its last the success sentence.

`Filter::execute()` (lib/pkp `classes/filter/Filter.php`, lines 443–454)
first checks the input against the filter's input type, here the
`pkp-users.xsd` schema. A file that is not XML, or that the schema
refuses, fails `supportsAsInput()`. Since
[049f5f85f3](https://github.com/pkp/pkp-lib/commit/049f5f85f34c602d0feeabd7e5de72ad00a095a5)
(`pkp/pkp-lib#6490`, the Native XML import rework), `execute()` throws
an `Exception` there. Before that change it returned null, and the users
import went on to show the libxml errors. 3.3 still does.

That change moved the Native XML import onto
`PKPImportExportDeployment::import()`, which catches what `execute()`
throws. The users import was left calling the filter directly. So the
exception leaves `display()`, the request answers 500, and the
"Validation errors:" branch is never reached for the files it was
written for.

Reach:
- Every file the schema refuses, whatever the fault. Checked on screen:
  an unknown element, a missing `<password>`, plain text.
- Exceptions thrown inside the filter after the schema check also end in
  the empty tab, and by then whatever the file added before the failing
  element (groups, users) is stored. Checked on screen: a user with no registration date
  ([its report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U63-A21-users-import-stops-at-user-without-registration-date.md)).
  Read in the code: the filter's own `throw` for a user whose given
  names are all empty, and the group filter's for an unacceptable
  `role_id` or a group with no `<name>`.
- The command-line import in OJS (`UserImportExportPlugin::executeCLI()`)
  calls the same `importUsers()`. It prints the uncaught exception and
  never the libxml errors (read in the code).

## Proposed fix

We propose catching the failure in the `import` case and telling the two
kinds of failure apart. `Filter::execute()` stores the input
(`getLastInput()`) only after the input check passes:

- **No input stored:** the file was refused before anything was
  imported. Add a line saying so. When libxml recorded reasons, the
  template's "Validation errors:" branch shows them instead. Nothing is
  logged here, because `XMLTypeDescription::checkType()` already logs
  the libxml errors for a refused file.
- **Input stored:** the import stopped part-way, and the users before
  the failing one are already stored. Log the exception and say exactly
  that.

The change, with two new strings in lib/pkp `locale/en/manager.po`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-import-unreadable-file-empty-results/fix.diff)):

```diff
                 $filter = $this->getUserImportExportFilter($context, $user);
-                $users = $this->importUsers(file_get_contents($temporaryFilePath), $context, $user, $filter);
+                try {
+                    $users = $this->importUsers(file_get_contents($temporaryFilePath), $context, $user, $filter);
+                } catch (Error | Exception $e) {
+                    $users = null;
+                    if ($filter->getLastInput() === null) {
+                        // Filter::execute() refused the file before importing anything (results.tpl lists libxml's reasons when there are any)
+                        $filter->addError(__('plugins.importexport.user.error.fileNotRead'));
+                    } else {
+                        // The import stopped part-way: the users before the failing one are stored
+                        error_log((string) $e);
+                        $filter->addError(__('plugins.importexport.user.error.importStopped'));
+                    }
+                }
```

```
plugins.importexport.user.error.fileNotRead
  "The file could not be read as a users XML file. No user has been imported."
plugins.importexport.user.error.importStopped
  "The import stopped because of an unexpected error. The users listed in the file before the one that
   failed have been imported, and new accounts among them may have been sent their welcome email. Check
   the users list before importing the file again."
```

This keeps the intent of `pkp/pkp-lib#6490`: `execute()` still refuses
unsupported input with an exception, and the caller handles it, as the
Native XML import's caller does with the same `catch (Error | Exception
$e)`.

Tried on `main`, OJS and OMP, in an earlier form of the same `try` that
added `common.unknownError` in both cases and logged every exception.
For refused files that form showed what this one shows: the three files
opened a "Results" tab reading "Validation errors:" with the libxml
lines in Expected, no request failed, and no account was created. A file
that imports cleanly still showed the success sentence. The existing
refusal of a username and email that belong to different accounts
still showed its own line ("The username "dbarnes" and the e-mail
"u63ir4m@mailinator.com" do not match to the one and the same existing
user."), with the fix in and out. The two new messages and the
`getLastInput()` test are not tried.

**Alternatives**
- Run the users import through `PKPUserImportExportDeployment::import()`
  like the Native XML import. It would add a transaction, but the users
  filter records its errors on the filter, not the deployment, so the
  template and the error plumbing would change too. A rollback would
  also undo accounts whose welcome email (`UserCreated`, sent as each
  account is added) may already have gone out.
- Show the exception's own message. For a failure that is not about the
  file's format, it is a raw PHP or database message that tells a
  manager nothing they can act on.
- Make `Filter::execute()` return null again. That undoes the contract
  the Native XML import relies on.

**What goes with it**
- No data repair for a file the schema refuses, since it stores nothing.
  An import that stopped part-way leaves the accounts it created, as it
  does today; the new message tells the manager to check them.
- Backport: on 3.5 the diff applies as it stands. On 3.4 the PHP hunk
  applies, and the two strings need placing by hand, because the
  neighbouring lines of 3.4's `manager.po` differ.
- The OJS command-line import could print the filter's errors and the
  libxml errors too; that is a separate change.
- Guard: an e2e scenario that imports a file with an unknown element and
  reads "Validation errors:" in the "Results" tab.

Small: one `try` in one method of the shared plugin and two strings,
with one e2e scenario.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-import-unreadable-file-empty-results/walk.js)
  with its [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-import-unreadable-file-empty-results/lib.js),
  which holds the files exactly as the Steps give them. On a dataset
  install of `main`:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/users-import-unreadable-file-empty-results/walk.js a13 control neighbour`
  (`neighbour` is the file with dbarnes's username and another address).
  The fix trial:
  `node bin/try-fix.js apply shared/playwright/checks/issues/users-import-unreadable-file-empty-results/fix.diff ojs omp`,
  then the same command, then `revert`.
- Walked 2026-10-01 on PKP's default test dataset (pkp/datasets
  `38ab955`, 2026-09-30, PostgreSQL), freshly loaded before each walk:
  `main` OJS and OMP, and `stable-3_5_0` OJS and OMP with the bracketed
  `<show_title>` line. Both versions showed the same: a blank tab, 500,
  the same log line, no account, no page notice. The walk imported the
  other report's file between step 6 and the control, so its step 8
  list also held that file's first user.
- The fix trial ran the earlier form of the diff, described under
  Proposed fix. The current `fix.diff` passes a dry run on copies of
  lib/pkp `main` and `stable-3_5_0`; on `stable-3_4_0` its
  `manager.po` hunk does not apply and its PHP hunk does.
- Unverified: an empty upload. In the code, `loadXML('')` throws a
  `ValueError` inside the input check, so with the fix it would get the
  "could not be read" line; not driven.
- Tips: `main` OJS `bade233f73` (lib/pkp `2e377d27fc`), OMP `3b0ecf794`
  (lib/pkp `3dc90c81a6`); `stable-3_5_0` OJS `92b9a16b48`, OMP
  `3081c9b00` (lib/pkp `a9c76aed62`); `stable-3_4_0` OJS `9571d8fde7`,
  OMP `0aec65441`, lib/pkp `df13621c2d`; `stable-3_3_0` OJS
  `9fdb9bcf9a`, OMP `8e72fc883`, lib/pkp `d446601ebe`.
- Code reads: 3.4, `PKPUserImportExportPlugin::display()` calls
  `importUsers()` with no `try`, `049f5f85f3` is on lib/pkp
  `stable-3_4_0`, and `Filter::getLastInput()` exists there. 3.3,
  `Filter.inc.php` `execute()` returns the empty output for unsupported
  input, and `PKPUserImportExportPlugin.inc.php` then hands the libxml
  errors to `results.tpl`.
- Introduced: `git blame` on the `throw` lands on `e3f570bc37`
  (`pkp/pkp-lib#5678`, PSR-12 formatting). At its parent the lines come
  from `049f5f85f3`, which replaced `return $this->_output;` with the
  `throw`; GitHub names its PR as `pkp/pkp-lib#6960`, merged
  2021-04-19. The users import's validation display dates from
  `pkp/pkp-lib#1347` (2016).
- Upstream: `pkp/pkp-lib#11628` (open, OJS 3.5.0) reports the same
  empty tab and log line, with no cause or fix. Searched 2026-10-01 in
  pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ui-library.
- Unverified on screen: a users file exported from 3.5 meets the same
  empty tab on `main`, because `main`'s schema refuses the
  `<show_title>` it carries in each group (checked with `xmllint` only).
