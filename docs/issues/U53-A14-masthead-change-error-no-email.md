# On a press or preprint server, a member's masthead change ends in an "Error" and emails nobody

- **Severity** medium
- **Effort** small
- **Kind** intention gap
- **Crash** server
- **Affects**
  - main: OMP, OPS
  - 3.5: none
  - 3.4: none (code; no "Appear on the masthead" select per role)
  - 3.3: none (code; no "Appear on the masthead" select per role)
- **Introduced** `pkp/omp#2305` and `pkp/ops#1265` for `pkp/pkp-lib#11800` · [39debf40a8](https://github.com/pkp/omp/commit/39debf40a8da0fbd88a98a480b424f3d4a911682), [b2493ba00c](https://github.com/pkp/ops/commit/b2493ba00c260d38537de711f7fe8bf910cd4437) · 2026-04-10 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U53 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a14), spec U06 [OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U06-user-invitations.md#omp1), spec U56 [OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U56-emails-management.md#omp1)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a press or preprint server, the app fails on the server when a
manager changes a member's "Appear on the masthead" select. After
"Confirm" an "Error" dialog shows a developer's message ("Email template
USER_ROLE_MASTHEAD_UPDATE not found. The migration script
I11800_AddUserRoleMastheadUpdateEmail needs to be run."), and the member
gets no email, although the confirmation promised "The user will be
notified of this change." The change itself is saved.

It happens on the user's roles page (Users & Roles, a user's "Edit") and
on "Invite to a role" for an existing member, for every role that offers
the select. On a press the email's text cannot be read or changed
either: its "Edit" in Manage Emails leaves the page behind a spinner.
The manager can tell the member through the users list's "Email";
running the migration the message names does not help.

Presses and preprint servers installed from `main` have no template for
this email, and so do those upgraded to it from 3.4 or from a 3.5
release before 3.5.0-4.

## Impact

- **Lost**: the member's notice of the change, every time; the manager
  is shown an error that blames a migration and is not told the change
  was saved.
- **Who**: press and preprint server managers changing a member's
  masthead listing or opening this email in Manage Emails.
- **Way round**: the change is kept; the member can be told by hand
  with "Email" on the users list.

Medium: the notice is lost for every member it concerns, but the change
is saved and the member can be told by hand. It would be high if the
change were lost too.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OMP ("Public Knowledge Press")
  or OPS ("Public Knowledge Preprint Server"), context `publicknowledge`.
  Nothing else.

From the users list:

1. Sign in as `rvaca` (Press manager; Preprint Server manager on OPS).
2. Open Settings › Users & Roles
   (`/index.php/publicknowledge/en/management/settings/access`).
3. In the users list, open David Buskins' row menu and choose "Edit".
4. On "Series editor" ("Moderator" on OPS), change the masthead select
   from "Appear on the masthead" to "Does not appear on the masthead".
5. In "Confirm masthead visibility change", press "Confirm".
6. Reload the page.

From "Invite to a role":

7. Back on Settings › Users & Roles, press "Invite to a role".
8. Type `minoue@mailinator.com` and press "Search User".
9. On "Enter details", on Minoti Inoue's "Series editor" ("Moderator")
   row, change the masthead select to "Does not appear on the masthead".
10. In "Confirm masthead visibility change", press "Confirm".

**Expected**: each "Confirm" closes the dialog and keeps the new choice,
and David Buskins, then Minoti Inoue, receives the email "Your journal
masthead visibility has been updated" ("… New setting: Does not appear
on the masthead …"), as the dialog says: "This will update whether this
user appears on the journal masthead for the selected role. The user
will be notified of this change."

**Observed**: after each "Confirm" an "Error" dialog with one "OK"
button reads:

```
Email template USER_ROLE_MASTHEAD_UPDATE not found. The migration script I11800_AddUserRoleMastheadUpdateEmail needs to be run.
```

The save behind it (a POST carrying `X-Http-Method-Override: PUT`)
answers 500:

```
POST /index.php/publicknowledge/api/v1/users/4/masthead/5 → 500
production.ERROR: Email template USER_ROLE_MASTHEAD_UPDATE not found. The migration script I11800_AddUserRoleMastheadUpdateEmail needs to be run. {"exception":"[object] (Exception(code: 0): … at lib/pkp/api/v1/users/PKPUserController.php:429)"}
```

After "OK", and after the reload in step 6, the select reads "Does not
appear on the masthead". Neither David Buskins nor Minoti Inoue receives
any email. After step 10, "Edit" on Minoti Inoue's row also shows the
new choice.

The same steps on OJS (`publicknowledge`, "Section editor") close the
dialog and deliver "Your journal masthead visibility has been updated"
to each member.

From Manage Emails (OMP; a preprint server does not list this email):

11. Signed in as `rvaca`, open Settings › Workflow › Emails and follow
    "Manage Emails"
    (`/index.php/publicknowledge/en/management/settings/manageEmails`).
12. Type "User Role Masthead Visibility Update Notification" in the
    search box and press Enter.
13. On that row, press "Edit".

**Expected**: the "Edit Template" window opens with the template's
Subject, "Your journal masthead visibility has been updated", and its
Body ("Updated role masthead visibility …").

**Observed**: no window opens; the page stays greyed behind a
full-screen spinner until it is reloaded, and no message shows. The
template's load answers 404:

```
GET /index.php/publicknowledge/api/v1/emailTemplates/USER_ROLE_MASTHEAD_UPDATE → 404
{"error":"The email template you requested was not found."}
```

## Cause

The masthead save, `PKPUserController::masthead()` in
`lib/pkp/api/v1/users/PKPUserController.php`, stores the new choice
(`Repo::userGroup()->setUserUserGroupMasthead()`), then looks up the
context's `USER_ROLE_MASTHEAD_UPDATE` email template and, when there is
none, throws an `Exception` with the message above (the throw and the
mailable came with pkp-lib
[c22577121b](https://github.com/pkp/pkp-lib/commit/c22577121b14d93aa8fc7240afa8877552d66296),
"pkp/pkp-lib#11800 Allow manager to edit user setting Appear on the
masthead", 2026-03-18). An OMP or OPS install made from `main` has
none, because the apps' `registry/emailTemplates.xml` does not list the
key.

`pkp/pkp-lib#11800` added the "Appear on the masthead" select per role
and its email. On
`stable-3_5_0` its app PRs added the registry line to all three apps
(`pkp/omp#2301`, `pkp/ops#1261`, commits
[9b2bc2f60](https://github.com/pkp/omp/commit/9b2bc2f60653465698d68a3c285e1a96a27ac16e)
and
[4f9a9a4a33](https://github.com/pkp/ops/commit/4f9a9a4a334dbeea88b5b46e7649e500ac29632a)).
On `main`, OJS's PR (`pkp/ojs#5488`,
[677a50ee2f](https://github.com/pkp/ojs/commit/677a50ee2f41e7004bef149e974b2d69ed175957))
carries the line, but OMP's
and OPS's (`pkp/omp#2305`, `pkp/ops#1265`) port only the `upgrade.xml`
entry that runs `I11800_AddUserRoleMastheadUpdateEmail`.

The message's advice does not help: `I11800_AddUserRoleMastheadUpdateEmail`
and `v3_5_0\InstallEmailTemplates` read the same app registry and skip
a key it does not hold.

Reach:

- Fresh installs of OMP and OPS `main`: no template (seen on screen,
  and in pkp/datasets' `main` dumps: no `USER_ROLE_MASTHEAD_UPDATE` row
  for OMP or OPS, two for OJS).
- Upgrades to `main` from 3.4 or earlier, or from a 3.5 release before
  3.5.0-4 (the first OMP/OPS tag with the line): the 3.5 migrations run
  against `main`'s registry and install nothing (read in the code). An install that
  already holds the template from 3.5.0-4 or later keeps it.
- Both screens that send the save, the user's roles page and "Invite to
  a role", through `UserInvitationUserGroupsTable.vue`'s
  `updateMasthead()` (seen on screen).
- Manage Emails on a press lists the email, and its "Edit" loads the
  missing template (`GET emailTemplates/USER_ROLE_MASTHEAD_UPDATE`, 404),
  so "Edit Template" never opens (seen on screen). That the full-screen
  spinner outlives a failed load is a separate weakness of the Emails
  page (the Vue method `openMailable()` in
  `lib/ui-library/src/components/Container/ManageEmailsPage.vue` stops
  it only on success), not part of this fix. A preprint server's list leaves the email out
  (`APP\mail\Repository::map()`), so there its text cannot be edited on
  screen even with the template (read in the code).
- No other email is affected: every other template key of the pkp-lib
  and app mailables OMP sends is in OMP's registry, and those OPS lacks
  belong to review and decision emails a preprint server does not send
  (read in the code).

## Proposed fix

Add the missing line to OMP's and OPS's `registry/emailTemplates.xml`,
where `stable-3_5_0` has it, after `USER_ROLE_END`
([fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/masthead-change-error-no-email/fix-omp.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/masthead-change-error-no-email/fix-ops.diff)):

```diff
 	<email key="USER_ROLE_END" name="mailable.userRoleEndNotify.name" subject="emails.userRoleEndNotify.subject" body="emails.userRoleEndNotify.body"/>
+	<email key="USER_ROLE_MASTHEAD_UPDATE" name="mailable.userRoleMastheadUpdateNotify.name" subject="emails.userRoleMastheadUpdateNotify.subject" body="emails.userRoleMastheadUpdateNotify.body"/>
```

Fresh installs then write the template, and the existing migrations
install it on upgrades to `main` from 3.4 or earlier
(`v3_5_0\InstallEmailTemplates`) and from a 3.5 release before 3.5.0-4
(`I11800`); an install already on `main` needs the tool below.

Tried on OMP and OPS `main`: the registry line applied, then the
template installed into the loaded dataset with the tool below, as a
fresh install would have it. Both "Confirm"s of the Steps answer 200, no dialog shows, the choice is kept and each member
receives "Your journal masthead visibility has been updated"; on OMP,
"Edit" in Manage Emails opens "Edit Template" with the subject above
and no spinner left. "Cancel" on the same confirmation still sends no
request and no email and puts the select back, with the fix and
without.

**Alternatives**:

- Send the email from the mailable's locale strings when the template is
  missing: no other sender does this, and the press could still not edit
  the text.
- Check for the template before saving, so a failure changes nothing:
  better ordering, but the member would still never be told; worth doing
  only beside the registry line.

**What goes with it**:

- An install already on `main` needs the template once, after the
  registry line is deployed: from the app root,
  `php lib/pkp/tools/installEmailTemplate.php USER_ROLE_MASTHEAD_UPDATE`.
  The tool reads the app's registry, so run before the line is there it
  installs nothing and shows no error. No released version holds the
  wrong data.
- No backport: `stable-3_5_0` already has the line.
- A guard: an e2e masthead change on a press and a preprint server (a
  Planned item in spec U06). A check in each app's CI that its registry
  holds the keys of the user-role emails pkp-lib sends
  (`USER_ROLE_ASSIGNMENT_INVITATION`, `USER_ROLE_END`,
  `USER_ROLE_MASTHEAD_UPDATE`) would catch the next missed port.

Small: one line in each of two registry files, and a test.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/masthead-change-error-no-email/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/masthead-change-error-no-email/lib.js))
  takes the Steps on each app, with OJS as the control, and reads the
  masthead request's answer, the dialog, the select after a reload, the
  server log and each member's mailbox; with `neighbour` as argument it
  takes only "Cancel" on the masthead confirmation (no request, no
  email, the select back), and with `emails` the Manage Emails
  steps 11–13 (on OMP; it opens the page by its address and records the
  template's load, the window and any spinner left up). On an install
  freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/masthead-change-error-no-email/walk.js [neighbour | emails]`.
- Driven on screen on OJS, OMP and OPS `main` and `stable-3_5_0`, on
  PostgreSQL; the fault does not depend on the database. Dataset:
  pkp/datasets c657990 (2026-10-01). On `stable-3_5_0` both "Confirm"s
  answer 200 and each member receives the email on all three apps, and
  on OMP the Manage Emails "Edit" opens "Edit Template" (its load
  answering 200).
- The fix trial: `fix-omp.diff` and `fix-ops.diff` applied to the app
  roots, the dataset reloaded, and, since a registry change reaches only
  a new install, the install step replayed from each app root with
  `php lib/pkp/tools/installEmailTemplate.php USER_ROLE_MASTHEAD_UPDATE`
  (it wrote the `en` and `fr_CA` rows); then `walk.js` on OMP and OPS,
  `walk.js emails` on OMP, and the "Cancel" check (`walk.js neighbour`)
  with the fix and, after the revert and a reload, without it.
- Tips: `main` OJS b84f8e2e44, OMP 3b0ecf794, OPS c8af945bb7 (lib/pkp
  ddd8ab243a and 3dc90c81a6, ui-library 64d67363 and 280f98c5);
  `stable-3_5_0` OJS 091fb65453, OMP 9c5e24246, OPS 38b61882d3 (lib/pkp
  cf3f984335, ui-library d4e01883); `stable-3_4_0` OJS 75cc2d488b, OMP
  0aec65441, OPS acd8ae704b (lib/pkp 32b0f4b4af); `stable-3_3_0` OJS
  ac77c9fb35, OMP 8e72fc883, OPS c5532e2161 (lib/pkp f6ab331645).
- Code reads: `registry/emailTemplates.xml` of the three apps on `main`
  and `stable-3_5_0` (`git log -S USER_ROLE_MASTHEAD_UPDATE`: OMP and OPS
  `main` never held the key); `dbscripts/xml/upgrade.xml` (OMP and OPS
  run `I11800` for 3.5.0.0–3.5.0.99 and `v3_5_0\InstallEmailTemplates`
  for 3.1.0.0–3.4.9.9); `InstallEmailTemplates::up()`;
  `DAO::installEmailTemplates()` behind the tool;
  `PKPUserController::masthead()` (the same on `stable-3_5_0`); a
  comparison of the mailables' `$emailTemplateKey` values with each
  registry; `git tag --contains 9b2bc2f60` in OMP `stable-3_5_0`
  (3_5_0-4). On `stable-3_4_0` and `stable-3_3_0`: no masthead route in
  `PKPUserHandler`, no `UserRoleMastheadUpdateNotify`, no key in the
  registries.
- PR trace: `pkp/pkp-lib#11800`'s description lists its 3.5 and `main`
  PRs; GitHub's `commits/<sha>/pulls` confirms the two app PRs.
- Unverified: an actual upgrade of a 3.4 or early 3.5 press to `main`
  (read in the code only).
