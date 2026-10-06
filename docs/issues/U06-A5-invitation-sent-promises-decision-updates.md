# "Invitation Sent" promises the inviter news of the person's decision, but nothing ever tells them

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; no "Invite to a role")
  - 3.3: none (code; no "Invite to a role")
- **Introduced** `pkp/pkp-lib#10558` for `pkp/pkp-lib#9658` · [e8bdca4673](https://github.com/pkp/pkp-lib/commit/e8bdca46737fb77d39a7a041cec5f7526dd07835) · 2024-10-24 · Ipula Indeewara (ipula)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U06 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U06-user-invitations.md#a5)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

When someone sends an invitation with "Invite to a role" on Users &
Roles, the "Invitation Sent" dialog says: "You can be updated about the
user's decision on the Users & Roles page, your OJS notifications and/or
your email" (a press and a preprint server name OMP and OPS). When the
person accepts or declines, nothing tells the inviter. No notification
arrives and no email is sent. The invitation's row just leaves the
"Invitations" table.

Nothing is lost, and an accepted invitation grants its roles correctly.
The only sign of an acceptance is the new role in the person's "Roles"
under Current Users. A decline leaves no trace on screen and looks the
same as an invitation that was cancelled or ran out.

The report proposes that the dialog stop promising updates, a change to
one English sentence per app. Delivering the updates is a larger product
decision, named as the alternative.

## Impact

- **Lost**: no data. No screen shows that an invitation was declined.
- **Who**: everyone who opens Users & Roles, for every invitation they
  send: the site administrator, and while "Permit changes to Settings"
  is on for their role, the Journal Manager, the Editor and the
  Production Editor (on a press the same roles; on a preprint server the
  Preprint Server Manager).
- **Way round**: check Users & Roles: a row gone from "Invitations" was
  answered, cancelled or ran out. A decline can only be confirmed by
  asking the person.

Low: the invitation itself works, and the fault is a promise in the
dialog's text. It would be medium if the team decides the inviter must
be told of each answer: the missing notice would then be a broken
feature, with no screen to fall back on for a decline.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS (the journal
  `publicknowledge`); OMP and OPS the same, with the names in brackets.
- The install's outgoing mail can be read (a mail catcher, or the
  dataset's `@mailinator.com` inboxes).

Steps:

1. Sign in as the Journal manager `rvaca` (password `rvacarvaca`). Open
   Settings › Users & Roles. The header's "Tasks" shows no count, and
   pressing it shows "No Items" [server: the same; press: "Tasks 12", the
   dataset's own tasks].
2. Press "Invite to a role". In "Search for a user by email address,
   username, or ORCID iD" type `ccorino@mailinator.com` [server: the
   same; press: `aclark@mailinator.com`] and press "Search User".
3. On "Enter details", in the new role's row choose "Copyeditor" [server:
   "Moderator"] in "Select a new role", enter today as the start date,
   choose either masthead option, and press "Save And Continue".
4. On the email step press "Invite user to the role". Read the
   "Invitation Sent" dialog, then press "View All Users".
5. Repeat steps 2–4 for `ckwantes@mailinator.com` [server: the same;
   press: `afinkel@mailinator.com`]. "Invitations (2)" lists both people
   as "Invited".
6. Sign out. Open the invitation email to Carlo Corino [server: the
   same; press: Arthur Clark], "You are invited to new roles", and follow
   its accept link. On "Review & create account" press "Accept And
   Continue to OJS".
7. Open the invitation email to Catherine Kwantes [server: the same;
   press: Alvin Finkel] and follow its decline link. Press "Confirm
   Decline Invitation".
8. Run the queued jobs, so that any mail they hold is sent (in the app's
   directory: `php lib/pkp/tools/jobs.php run`).
9. Sign in as `rvaca` again. Press "Tasks" in the header, look in the
   inbox of `rvaca@mailinator.com`, and open Settings › Users & Roles.

**Expected**: the "Invitation Sent" dialog says only what the app will
do. As it reads today, `rvaca` would have a notification or an email
saying Carlo Corino accepted and Catherine Kwantes declined, and Users &
Roles would show both answers.

**Observed**: at step 4 the dialog reads:

```
Invitation Sent
ccorino@mailinator.com has been invited to new role in OJS. You can be updated about the user's decision on the Users & Roles page, your OJS notifications and/or your email
[View All Users]
```

At step 9 "Tasks" shows "No Items", as it did at step 1 [server: the
same; press: still "Tasks 12", the same tasks]. Nothing has arrived in
`rvaca@mailinator.com`'s inbox. Users & Roles shows "Invitations (0)"
and "No Items". Under Current Users, Carlo Corino's "Roles" now read
"Reader, Author, Copyeditor" and Catherine Kwantes' still read "Reader,
Author". Nothing on the page says that she declined.

Control: the two invitation emails, which `rvaca` sent at steps 4 and 5,
reached their recipients through the same mail setup.

## Cause

The updates exist only in the dialog's copy. The ui-library store
`UserInvitationPageStore.js` (`lib/ui-library/src/pages/userInvitation/`)
opens the dialog once `PUT invitations/{id}/invite` answers, with the
message `userInvitation.modal.message`. That key lives in each app's
`locale/en/invitation.po`. No code on either answer path tells the
inviter:

- Accepting: `UserRoleAssignmentReceiveController::finalize()`
  (`lib/pkp/classes/invitation/invitations/userRoleAssignment/handlers/api/`)
  creates the account or reads the existing one, assigns each role
  through `Repo::userGroup()->assignUserToGroup()`, and marks the
  invitation `ACCEPTED`.
- Declining: `UserRoleAssignmentInviteRedirectController::confirmDecline()`
  (and the API's `UserRoleAssignmentReceiveController::decline()`) calls
  `Invitation::decline()`, which marks it `DECLINED`.

Neither path sends a mailable or creates a notification. The inviter
(`invitations.inviter_id`) is read only when the invitation is sent:
`UserRoleAssignmentInvite::getMailable()` makes them the email's sender
(`->sender($inviter)`), and `UserRoleAssignmentInvitationNotify` fills
`{$inviterName}` from them. `InvitationModel` writes each status change to the audit
log (`AuditEvent::USER_INVITATION_ACCEPTED`, `…_DECLINED`), which is a
server log and appears on no screen. The "Invitations" table lists only
invitations that are still pending and have not expired
(`InvitationController::getMany()`, scope `stillActive()`). An answered
invitation therefore disappears from it without a status.

The promise was written into the dialog when the send and accept views
were built (e8bdca4673). The requirement those views implement,
`pkp/pkp-lib#9658`, never asks for a notice to the inviter. The string
has since moved into each app's locale (`pkp/pkp-lib#10575`) and been
reworded, but no change added the delivery.

Reach:

- Every send through the wizard ends on this dialog: "Invite to a role"
  for a new person or an existing account, a user row's "Edit", and
  "Edit Invitation". The store opens it in one place (code).
- OJS carries the same promise in its 20 translations of the key (for
  example German, "… Sie können Updates zur Entscheidung des/der
  Benutzer/in … einsehen"). OMP and OPS have it in English only (code).
- No other copy in the apps' or pkp-lib's English locale promises a
  decision update that is never sent (a search of `locale/en/*.po` for
  "updated about", "notified" and "and/or your email").

## Proposed fix

Make the dialog say what happens: the invitation is listed under
"Invitations" on Users & Roles while it awaits an answer. The diffs are
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/invitation-sent-promises-decision-updates/fix-ojs.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/invitation-sent-promises-decision-updates/fix-omp.diff)
and
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/invitation-sent-promises-decision-updates/fix-ops.diff).
Here is OJS's (OMP's and OPS's differ only in the acronym):

```diff
--- a/locale/en/invitation.po
+++ b/locale/en/invitation.po
@@ -35,7 +35,7 @@
 msgstr "You can invite them to take up a role in OJS"
 
 msgid "userInvitation.modal.message"
-msgstr "{$email} has been invited to new role in OJS. You can be updated about the user's decision on the Users & Roles page, your OJS notifications and/or your email"
+msgstr "{$email} has been invited to a new role in OJS. The invitation is listed under Invitations on the Users & Roles page while it awaits their answer."
 
 msgid "userInvitation.roleTable.journalMasthead"
 msgstr "Journal Masthead"
```

It keeps the purpose of the original copy, which is to confirm that the
invitation went out and say where to follow it, and it fixes "to new
role".

Tried on `main`, OJS, OMP and OPS: at step 4 the dialog showed the new
sentence, and the rest of the walk was unchanged. As a control, a second
invitation (to Domatilia Sokoloff; on a press Bob Barnetson) was sent
and accepted with the fix and without it, and behaved the same both
times: listed as "Invited" while pending, the invitee's closing dialog
"You've been assigned a new role in OJS" with its message unchanged,
and the row gone from "Invitations" after the acceptance.

**Alternatives**

- Deliver the updates instead: on `finalize()` and `decline()`, send the
  inviter a new mailable and a notification, following how a reviewer's
  answer reaches the editors. This needs new email templates (registry
  and an upgrade migration), a notification type, and a product decision
  on who is told (the inviter only, or every manager) and on how Users &
  Roles shows a decline. That is large, and a new feature rather than a
  fix. If the team wants it, the dialog should still stop promising it
  until it ships.
- Dropping only "and/or your email": the dialog would still promise
  notifications that never come.

**What goes with it**

- Translations, a choice for the team. Keeping the key, as the diffs
  do, leaves the 20 OJS translations promising the updates until
  translators update them through Weblate. A new key instead makes those
  languages show the English sentence until they are translated.
- 3.5: the three diffs apply as written to `stable-3_5_0` (`patch
  --dry-run` on each app's `locale/en/invitation.po`).
- Guard: the e2e scenario for the send wizard (spec U06) can check the
  dialog's text, as a Planned item.

Small: one English string per app, with no code change, data repair or
API change.

## Evidence

- The script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/invitation-sent-promises-decision-updates/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/invitation-sent-promises-decision-updates/lib.js),
  which drives the wizard through `invite()` of
  [users-tab-keeps-renamed-role-old-name/lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-tab-keeps-renamed-role-old-name/lib.js))
  takes steps 1–9 on OJS, OMP and OPS. With `neighbour` as its argument
  it walks only the control invitation of the Proposed fix. Each run starts from an install freshly loaded
  from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/invitation-sent-promises-decision-updates/walk.js [neighbour]`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Step 8: the script empties the queue with `php
  lib/pkp/tools/jobs.php work --stop-when-empty` (the dataset's config
  also runs jobs on web requests). It reads the inviter's inbox from the
  moment of the answers, and the database: `invitations` held the two
  rows as `ACCEPTED` and `DECLINED` with `inviter_id` set to `rvaca`;
  `notifications` held no row for `rvaca` created during the walk; the
  job queue was empty. The walks ran on PostgreSQL; no query is
  involved in the fault.
- Datasets: pkp/datasets 3788b55 (2026-10-02), `main` and
  `stable-3_5_0`.
- Branch tips. `main`: OJS b84f8e2e44, OMP 3b0ecf794, OPS c8af945bb7;
  pkp-lib ddd8ab243a (OJS) and 3dc90c81a6 (OMP, OPS); ui-library
  64d67363 (OJS) and 280f98c5 (OMP, OPS). 3.5: OJS 091fb65453, OMP
  9c5e24246, OPS 38b61882d3; pkp-lib cf3f984335; ui-library d4e01883.
  3.4: OJS 75cc2d488b, OMP 0aec65441, OPS acd8ae704b; pkp-lib
  32b0f4b4af. 3.3: OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161;
  pkp-lib f6ab331645.
- Code reads. 3.5: the string, `finalize()`, `confirmDecline()`,
  `Invitation::decline()` and the store's dialog. 3.4 and 3.3: pkp-lib's `stable-3_4_0` and `stable-3_3_0` have no
  `classes/invitation/` and no `invitation.po`. The apps' branches have
  no `locale/en/invitation.po`, so there is no "Invite to a role" there.
- Introduced: `git log -L` on the OJS line leads through 4b6d127e5d
  (2025-05-22, rewording), 56d2c68587 and 17ee400eae (2024-11-06,
  rewording), 298685b46c (2024-11-01, typos, `pkp/pkp-lib#10575`) to
  e25e32dc65 (2024-10-31, Dulip Withanage, the key moved into OJS).
  `git log -S` in pkp-lib finds the string first in e8bdca4673 ("send
  and accept invitation views and php integrations"), which already
  promised "your ojs notification and/ or your email"; its PR is
  `pkp/pkp-lib#10558`, for `pkp/pkp-lib#9658`.
- Upstream searches (pkp/pkp-lib, pkp/ojs, pkp/ui-library): "invitation
  accepted notify inviter", "invitation declined notification",
  "Invitation Sent" notifications, "invitation decision inviter email",
  "user invitation accept notification manager", "invitation status
  users roles accepted declined", `userInvitation.modal.message`,
  "updated about the user". Read: `pkp/pkp-lib#9658` (the requirement:
  no notice to the inviter), `pkp/pkp-lib#11265` (closed, the dialog's
  typos only), `pkp/pkp-lib#12336` (closed, the audit log entries, not a
  notice to anyone), `pkp/pkp-lib#3022` (closed, the original request).
- Not walked: a new person's invitation, the user row's "Edit" path and
  "Edit Invitation", and the fix on 3.5.
