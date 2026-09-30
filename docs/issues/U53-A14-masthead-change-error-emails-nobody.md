# On presses and preprint servers, a masthead change shows a raw error and emails nobody

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OMP, OPS
  - 3.5: none
  - 3.4: none (code; no masthead notice)
  - 3.3: none (code; no masthead notice)
- **Introduced** `pkp/omp#2305` and `pkp/ops#1265` for `pkp/pkp-lib#11800` · [39debf40a](https://github.com/pkp/omp/commit/39debf40a8da0fbd88a98a480b424f3d4a911682) (OMP), [b2493ba00c](https://github.com/pkp/ops/commit/b2493ba00c260d38537de711f7fe8bf910cd4437) (OPS) · 2026-04-10 · Bozana Bokan (bozana)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U53 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a14) · spec U06 [OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U06-user-invitations.md#omp1) · spec U56 [OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U56-emails-management.md#omp1)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

On a press or preprint server, a manager changes whether a member
appears on the masthead, on that member's roles page. An "Error" dialog
opens, naming a missing email template and a migration script. The app
fails on the server while sending the member's notice: the new choice
is saved, but the member is not emailed, and nothing on screen can send
it.

On a press, "Manage Emails" lists "User Role Masthead Visibility Update
Notification", but its "Edit" greys the page behind a spinner that never
ends, so the press cannot read or change that email. A preprint server
does not list the email at all. A journal is not affected: OJS ships
this email's template.

The template is missing on every new installation of the current
development code, and on every site upgraded to it from 3.4 or from a
3.5 release before 3.5.0-4. Sites upgraded from 3.5.0-4 or later keep
the template they already have. Unless it is fixed before the next
release, every press and preprint server installed from that release,
or upgraded to it from before 3.5.0-4, has the fault.

## Impact

- **Lost.** The member's notice of the change, and the press's say over
  that notice's text. The error does not tell the manager that the
  choice was saved.
- **Who.** Managers of a press or preprint server installed new, or
  upgraded from before 3.5.0-4, each time they change a member's
  masthead choice: for a role the member holds, for a role that has
  ended (its row stays on the roles page), or for an existing member's
  roles in "Invite to a role". Press managers opening the email on
  "Manage Emails".
- **Way round.** None for the notice: the manager can write to the
  member from the row's "Email". Nothing gets worse with time.

Medium: every masthead change on those presses and servers ends in a
raw error and sends nothing, though the choice is saved. It would be
high if the choice were lost too. The fix has to land before the next
release to keep new presses and servers clear.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for OMP `main` (the press) and for OPS
  `main` (the preprint server), freshly loaded. David Buskins
  (`dbuskins`) holds "Series editor" on the press and "Moderator" on the
  server, each set to "Appear on the masthead".

Changing the masthead choice:

1. Sign in as `rvaca` (the manager).
2. Open Settings › "Users & Roles"
   (`/index.php/publicknowledge/en/management/settings/access`).
3. On David Buskins' row, open "…" and choose "Edit".
4. On "Enter details", in his "Series editor" row ("Moderator" on the
   server), change "Appear on the masthead" to "Does not appear on the
   masthead".
5. In "Confirm masthead visibility change", press "Confirm".
6. Press "OK" if a dialog shows, and reload the page.
7. Look for mail to dbuskins@mailinator.com.

Editing the email (press only; a preprint server does not list it):

8. Open Settings › "Workflow" › "Emails" and follow "Add and edit
   templates" ("Manage Emails").
9. On "User Role Masthead Visibility Update Notification", press "Edit".

**Expected:** at step 5 the confirmation closes and nothing else shows;
after the reload the row reads "Does not appear on the masthead"; David
Buskins receives "Your journal masthead visibility has been updated". At
step 9 the "Edit Template" window opens with the default template.

**Observed:** at step 5 a dialog opens:

```
Error

Email template USER_ROLE_MASTHEAD_UPDATE not found. The migration script I11800_AddUserRoleMastheadUpdateEmail needs to be run.

OK
```

The masthead request answered 500 with that text:

```
PUT /index.php/publicknowledge/api/v1/users/4/masthead/5   500
{"error":"Email template USER_ROLE_MASTHEAD_UPDATE not found. The migration script I11800_AddUserRoleMastheadUpdateEmail needs to be run."}
```

The server log:

```
production.ERROR: Email template USER_ROLE_MASTHEAD_UPDATE not found. The migration script I11800_AddUserRoleMastheadUpdateEmail needs to be run. {"exception":"[object] (Exception(code: 0): … at …/lib/pkp/api/v1/users/PKPUserController.php:429)
```

After the reload the row reads "Does not appear on the masthead". No
mail reaches David Buskins.

At step 9 the page greys behind a spinner and no window opens; another
row's "Edit" cannot be pressed until the page is reloaded. The template request answered:

```
GET /index.php/publicknowledge/api/v1/emailTemplates/USER_ROLE_MASTHEAD_UPDATE   404
{"error":"The email template you requested was not found."}
```

The same steps on the journal (OJS `main`, David Buskins' "Section
editor" row) show no error, deliver the email and open "Edit Template".

## Cause

OMP's and OPS's `registry/emailTemplates.xml` on `main` have no
`USER_ROLE_MASTHEAD_UPDATE` entry. That file is where each app lists its
default email templates. A new install reads it in `PKPInstall`, through
`PKP\emailTemplate\DAO::installEmailTemplates()`. The upgrade migrations
that add this email, `PKP\migration\upgrade\v3_5_0\InstallEmailTemplates`
and `PKP\migration\upgrade\v3_5_0\I11800_AddUserRoleMastheadUpdateEmail`
(which extends it), parse the same file themselves with
`XMLDAO::parseStruct()` and install only the keys it holds. OJS's
registry has the entry, and so do all three apps' registries on
`stable-3_5_0`.

`PKPUserController::masthead()` (pkp-lib
`api/v1/users/PKPUserController.php`) first saves the new choice
(`setUserUserGroupMasthead()`, line 421), then looks the template up
(`Repo::emailTemplate()->getByKey()`, line 425). It finds none and
throws the exception quoted above (line 429), which the request answers
as a 500 with the exception's text, shown to the manager as it stands.

`pkp/pkp-lib#11800` added the notice, its mailable and the I11800
migration. The 3.5 pull requests for OMP and OPS (`pkp/omp#2301`,
`pkp/ops#1261`) added the registry line with the upgrade step. The
`main` pull requests left the line out. `pkp/omp#2305` added only an
upgrade step, `APP\migration\upgrade\v3_4_0\InstallEmailTemplates`;
OMP's I11800 step came four days later, from `pkp/pkp-lib#12555`.
`pkp/ops#1265` added only the I11800 step. The message's advice cannot
help: I11800 adds nothing on OMP or OPS, since the registry does not
list the key.

Reach:

- The masthead select on a current role's row, on the row of a role
  that has ended, and on "Enter details" of "Invite to a role" for an
  existing member: all three send the same request from
  `UserInvitationUserGroupsTable.vue` (a current role seen on screen;
  the other two read in the code).
- Press "Manage Emails": the pkp-lib mailable list names the email, and
  `GET emailTemplates/USER_ROLE_MASTHEAD_UPDATE` answers 404. The page
  stays behind its spinner because `ManageEmailsPage::openMailable()`
  stops the spinner only when the template loads (seen on screen).
- Preprint server "Manage Emails": OPS's own `Repository::map()` lists
  no user-role email, so there is nothing to open (seen on screen; the
  same on 3.5).
- No other email is missing: every mailable's template key was checked
  against each app's `main` registry. OMP lacks only this one. OPS lacks
  this one, plus the review and decision emails, which a preprint server
  never sends (read in the code).
- Stored data (read in the code): new installs of `main`, including
  pkp's own `main` test datasets for OMP and OPS, have no row for this
  template in `email_templates_default_data`. An upgrade to `main` from
  3.4 runs `v3_5_0\InstallEmailTemplates` (the 3.1.0.0–3.4.9.9 block of
  `upgrade.xml`), and one from 3.5.0-3 or earlier runs I11800 (the
  3.5.0.0–3.5.0.99 block). Both list the key but read `main`'s registry,
  so they install nothing. Releases 3.5.0-4 and 3.5.0-5 ship the
  template, so a site upgraded from them keeps it.

## Proposed fix

A proposal, tried on `main` as
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/masthead-change-error-emails-nobody/fix.diff),
applied to both OMP and OPS. With the template installed from the fixed
registry, the masthead change shows no error and David Buskins gets the
email on the press and the server. On the press, "Edit" opens "Edit
Template". Both apps' "Manage Emails" lists are otherwise unchanged, and
the preprint server still does not list the email.

Recommended: add the entry to OMP's and OPS's registries, in the place
and form that `stable-3_5_0` and OJS `main` already have it:

```diff
 	<email key="USER_ROLE_END" name="mailable.userRoleEndNotify.name" subject="emails.userRoleEndNotify.subject" body="emails.userRoleEndNotify.body"/>
+	<email key="USER_ROLE_MASTHEAD_UPDATE" name="mailable.userRoleMastheadUpdateNotify.name" subject="emails.userRoleMastheadUpdateNotify.subject" body="emails.userRoleMastheadUpdateNotify.body"/>
 	<email key="ORCID_REQUEST_UPDATE_SCOPE" name="orcid.orcidRequestUpdateScope.name"  subject="emails.orcidRequestUpdateScope.subject" body="emails.orcidRequestUpdateScope.body"/>
```

The subject and body keys already live in pkp-lib's
`locale/*/emails.po`, so the one line is the whole change.

A new install then gets the template. So does an upgrade from 3.4
(`v3_5_0\InstallEmailTemplates`) or from 3.5.0-3 or earlier (I11800),
and I11800 skips a template already there on 3.5.0-4 and later.

**Alternatives:**

- Skip the email in `PKPUserController::masthead()` when the template
  is missing: the error goes away, but the member is still not told, and
  the press keeps a "Manage Emails" row it cannot open.
- A new upgrade migration: not needed, since the existing ones read the
  fixed registry on both upgrade paths that lack the template.

**What goes with it:**

- No change to the REST API, a plugin hook or a released install's
  data. A development install of `main` needs the template once:
  `php lib/pkp/tools/installEmailTemplate.php USER_ROLE_MASTHEAD_UPDATE`.
  pkp's `main` test datasets get it when they are next built.
- Separate hardening, not needed for this fix: `masthead()` saves the
  choice before it checks for the template, and shows a message meant
  for developers. `ManageEmailsPage::openMailable()` leaves its spinner
  on when the template does not load. Both make a missing template look
  worse than it is: the manager reads that the change failed when it was
  saved, and the page hangs.
- Guard: an e2e scenario on OMP and OPS that changes a member's masthead
  choice and reads the member's email, planned in the user invitations
  spec (U06), which owns the roles page.

Small: the same one line in OMP's and OPS's registries, copied from
3.5, and an e2e scenario; the existing migrations repair upgraded sites.

## Evidence

- Kept script that takes the Steps on all three apps, OJS as the
  control, on an install loaded from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/masthead-change-error-emails-nobody/walk.js),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/masthead-change-error-emails-nobody/walk.js`
  (on `stable-3_5_0` with `PKP_E2E_LINE=stable-3_5_0` in front, as its
  header says).
- The fix, tried 2026-09-30 on the `main` tips below: fix.diff applied
  to OMP and OPS
  (`node bin/try-fix.js apply shared/playwright/checks/issues/masthead-change-error-emails-nobody/fix.diff omp ops`,
  taken out with `node bin/try-fix.js revert omp ops`), the dataset
  reloaded, then
  `php lib/pkp/tools/installEmailTemplate.php USER_ROLE_MASTHEAD_UPDATE`
  in each app, since the dataset was built from the unfixed registry.
  That tool reads the registry through the same
  `DAO::installEmailTemplates()` as the installer, and added two rows
  (`en`, `fr_CA`) and nothing else. Then walk.js, and the fix taken out.
  The "Manage Emails" rows were the same with the fix in and out: 66 on
  OJS, 56 on OMP, 17 on OPS, with no masthead email on OPS. Run against
  the unfixed registry, the same tool added no row on OMP.
- Walked 2026-09-30 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`, no
  upgrade needed:
  - main: OJS bade233f73 (lib/pkp 2e377d27fc), OMP 3b0ecf794 and OPS
    c8af945bb7 (lib/pkp 3dc90c81a6, lib/ui-library 280f98c5). The
    loaded OMP and OPS datasets hold no `USER_ROLE_MASTHEAD_UPDATE` row;
    OJS holds two.
  - stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00, OPS cf4fce69bd (lib/pkp
    a9c76aed62). All three show the Expected: the email delivered, and
    on OJS and OMP "Edit Template" opened. Each dataset holds two rows.
  - Only PostgreSQL was walked. The cause is a missing registry line,
    not a query, so MySQL should behave the same (not checked).
- 3.5, code: `registry/emailTemplates.xml` of OMP and OPS at the tips
  above hold the entry, added by
  [9b2bc2f606](https://github.com/pkp/omp/commit/9b2bc2f60653465698d68a3c285e1a96a27ac16e)
  and [4f9a9a4a33](https://github.com/pkp/ops/commit/4f9a9a4a334dbeea88b5b46e7649e500ac29632a)
  (`pkp/omp#2301`, `pkp/ops#1261`, 2026-04-09, Jarda Kotěšovec,
  jardakotesovec).
- 3.4, code: `stable-3_4_0` of OJS (9571d8fde7), OMP (0aec65441), OPS
  (acd8ae704b) and pkp-lib (df13621c2d): no masthead request in
  `api/v1/users`, no `UserRoleMastheadUpdateNotify`, no
  `USER_ROLE_MASTHEAD_UPDATE`.
- 3.3, code: the same on `stable-3_3_0` of OJS (9fdb9bcf9a), OMP
  (8e72fc883), OPS (c5532e2161) and pkp-lib (d446601ebe).
- Introduced: `git log -S USER_ROLE_MASTHEAD_UPDATE` finds no commit in
  OMP's or OPS's `main`: the line was never there. The `main` pull
  requests for `pkp/pkp-lib#11800` are `pkp/pkp-lib#12472`
  ([c22577121b](https://github.com/pkp/pkp-lib/commit/c22577121b14d93aa8fc7240afa8877552d66296),
  the endpoint and its exception), `pkp/ojs#5488` (with the registry
  line, [677a50ee2f](https://github.com/pkp/ojs/commit/677a50ee2f41e7004bef149e974b2d69ed175957)),
  and `pkp/omp#2305` and `pkp/ops#1265`, all merged 2026-04-10.
  OMP's [39debf40a](https://github.com/pkp/omp/commit/39debf40a8da0fbd88a98a480b424f3d4a911682)
  added `APP\migration\upgrade\v3_4_0\InstallEmailTemplates` in a new
  3.5.0.0–3.5.9.9 block of `upgrade.xml`, and no registry line.
  [be62aeda2](https://github.com/pkp/omp/commit/be62aeda279684b5f51016095e3e8bb7b38c28f7)
  (`pkp/pkp-lib#12555`, 2026-04-14, Bozana Bokan) replaced that block
  with the I11800 step in the 3.5.0.x block, again with no registry
  line; OMP's registry history on `main` has no later change for this
  key. OPS's b2493ba00c added the I11800 step, and no registry line.
- Which installs, code: `main`'s `upgrade.xml` in OMP (lines 126, 174)
  and OPS (lines 121, 165); `tag --contains` for 9b2bc2f606 and
  4f9a9a4a33 lists `3_5_0-4` and `3_5_0-5` only.
- Upstream search 2026-09-30 in pkp/pkp-lib, pkp/omp, pkp/ops and
  pkp/ui-library (masthead, masthead email template not found, masthead
  visibility, `USER_ROLE_MASTHEAD_UPDATE`, `I11800`,
  `UserRoleMastheadUpdateNotify`): nothing about this fault.
  `pkp/pkp-lib#12550` ("I11800 main", open) is an unmerged pkp-lib-only
  port, which does not touch the apps' registries.
  `pkp/pkp-lib#11805` is an older masthead error in the "Edit User"
  form.
