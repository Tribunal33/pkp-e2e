# On a press or preprint server, the masthead confirmation and the "Invitation Unavailable" page speak of a journal

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP, OPS
  - 3.5: OMP, OPS
  - 3.4: none (code; no role invitations, no masthead select per role)
  - 3.3: none (code; no role invitations, no masthead select per role)
- **Introduced** `pkp/pkp-lib#12472` for `pkp/pkp-lib#11800` · [a3582c0919](https://github.com/pkp/pkp-lib/commit/a3582c09199bd8d3b7685a3a02ab8dd0663f8456) · 2026-03-19 · Bozana Bokan (bozana) for the masthead confirmation; `pkp/pkp-lib#12488` for `pkp/pkp-lib#12332` · [6bfd654c02](https://github.com/pkp/pkp-lib/commit/6bfd654c021c0c0d26133efaaaaf13e456aeef98) · 2026-03-22 · Touhidur Rahman (touhidurabir) for the "Invitation Unavailable" page
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U06 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U06-user-invitations.md#a7)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a press or a preprint server, two texts connected with role
invitations speak of a journal. On Settings › Users & Roles, a user's
"Edit" page has a "Press Masthead" or "Server Masthead" column with a
select per role, which decides whether the person is listed on the
masthead. Changing it asks the manager to confirm that "This will
update whether this user appears on the journal masthead for the
selected role.". Someone who opens an invitation link that can no
longer be used is told "Please contact the journal manager for further
assistance.", but the role is called "Press manager" on a press and
"Preprint Server manager" on a preprint server.

Both texts are understood and nothing is lost. They read as if the
press or server were a journal.

Only English is affected by this report; other languages have their own
texts. The texts reached the released 3.5.0-4 and 3.5.0-5.

## Impact

- **Lost.** Nothing: wording only.
- **Who.** Managers of presses and preprint servers who change a
  person's masthead listing; people who open an invitation link after
  it was used, declined, cancelled or expired.
- **Way round.** None needed.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OMP or OPS, with OJS as the
  control; context `publicknowledge`.
- Outgoing mail caught where it can be read (a mail catcher such as
  Mailpit, or the log mailer), for steps 8 and 9: the dataset's users
  all have `@mailinator.com` addresses.

The masthead confirmation:

1. Sign in as `rvaca` (the manager).
2. Open Settings › Users & Roles
   (`/index.php/publicknowledge/en/management/settings/access`), type
   "Buskins" in the search box and press Enter.
3. On David Buskins' row press "…", then "Edit".
4. In his role's row ("Series editor" on OMP, "Moderator" on OPS,
   "Section editor" on OJS), in the column "Press Masthead" ("Server
   Masthead" on OPS, "Journal Masthead" on OJS), choose "Does not appear
   on the masthead".
5. Read the "Confirm masthead visibility change" window, then press
   "Cancel".

The "Invitation Unavailable" page:

6. Back on Users & Roles, press "Invite to a role", type
   `dbuskins@mailinator.com` and press "Search User".
7. In the empty role row choose "Reader", today as "Start Date" and
   "Does not appear on the masthead"; press "Save And Continue", then
   "Invite user to the role", then "View All Users".
8. Signed out (another browser), open the "Decline Invitation" link of
   the email "You are invited to new roles" sent to
   dbuskins@mailinator.com, and press "Confirm Decline Invitation".
9. Open the same email's "Accept Invitation" link.

**Expected.** Texts that fit a press or a preprint server, or that name
no kind of publication.

**Observed.** On OMP; OPS is the same, with "Server Masthead" and
"Public Knowledge Preprint Server":

```
Step 5: Confirm masthead visibility change
        This will update whether this user appears on the journal masthead for the selected role.
        The user will be notified of this change.
        [Confirm] [Cancel]
Step 9: Public Knowledge Press
        Invitation Unavailable
        This invitation is no longer available. It may have already been accepted, declined, or
        expired. Please contact the journal manager for further assistance.
        [Login] [Register]
```

"Cancel" in step 5 puts the select back to "Appear on the masthead" and
sends nothing. On OJS the same texts are right for a journal.

## Cause

Both texts are pkp-lib's, shared by the three applications, and were
written for OJS:

- `user.masthead.update.message` in `locale/en/user.po`, the window that
  ui-library's `UserInvitationUserGroupsTable.vue`
  (`updateMastheadForCurrentGroup()`) opens;
- `invitation.unavailable.description` in `locale/en/invitation.po`, the
  paragraph of `templates/invitation/invitationUnavailable.tpl`, which
  `InvitationHandler::getInvitationByKey()` shows, through
  `displayInvitationNotAvailablePage()`, for an invitation that exists
  but can no longer be used.

Neither OMP nor OPS gives either key a text of its own. The same
screens already avoid the problem elsewhere in two ways. The select's
own values are neutral pkp-lib texts ("Appear on the masthead", "Does
not appear on the masthead"). The words that must name the kind of
publication are overridden in each application's
`locale/en/invitation.po` ("Press Masthead", "The user already exists
in the press").

Reach:

- The masthead window opens from a user's "Edit" page, seen on screen,
  and from the same table on the search path of "Invite to a role"
  (read in the code).
- The "Invitation Unavailable" page answers every emailed link of this
  kind once it can no longer be used, as read in the code: a reviewer's
  one-click access, a registration confirmation, an email address
  change. Their links are all built by `Invitation::getActionURL()` and
  answered by `InvitationHandler`.
- Left out: the masthead update email that "Confirm" sends, "Your
  journal masthead visibility has been updated" with "please contact
  the journal manager" (`emails.po`). On presses and preprint servers
  that email template is not installed today, so "Confirm" ends in an
  error there
  ([its report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U53-A14-masthead-change-error-no-email.md)).
  An email template's text is copied into each install's database when
  the template is installed. So its wording is best settled in that
  fix, before the template reaches presses and servers.
- Not this fault: other pkp-lib English texts that name a journal
  outside these screens
  ([a report that counts them](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U53-A4-user-search-example-journal-role.md)).

## Proposed fix

Make both pkp-lib texts neutral, as the select beside the first one
already is. The diff is against the application's root, so the pkp-lib
paths start with `lib/pkp/`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-ops-invitation-journal-wording/fix.diff)):

```diff
 # lib/pkp/locale/en/user.po
 msgid "user.masthead.update.message"
-msgstr "This will update whether this user appears on the journal masthead for the selected role. The user will be notified of this change."
+msgstr "This will update whether this user appears on the masthead for the selected role. The user will be notified of this change."
 # lib/pkp/locale/en/invitation.po
 msgid "invitation.unavailable.description"
-msgstr "… Please contact the journal manager for further assistance."
+msgstr "… Please contact the editorial team for further assistance."
```

The window sits under the "Press Masthead" column, so "the masthead" is
unambiguous. "The editorial team" is how pkp-lib's other shared texts
name the people behind a journal, press or server. It also fits the
links nobody was invited to, such as a registration or an email change
confirmation. One repository changes, every application is covered,
and no key changes. OJS's English changes too, to the same neutral
wording.

Tried on `main`, on all three applications: the window reads "This will
update whether this user appears on the masthead for the selected role.
…" and the "Invitation Unavailable" page reads "… Please contact the
editorial team for further assistance.".

**Alternatives**

- Give each text an OMP and an OPS version in the applications'
  `locale/en/invitation.po`, as "Press Masthead" is: right too, but two
  more repositories, and every language must translate the text three
  times.
- Pass the context's name into the page ("Please contact {$contextName}
  …"): a template change for a text that needs none.

**What goes with it**

- Other languages keep their own texts; any that name a journal on
  presses are left to their translators.
- Backport: on `stable-3_5_0`, pkp-lib's `invitation.po` ends with a
  blank line, so `fix.diff`'s `invitation.po` hunk does not apply there;
  [fix-stable-3_5_0.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-ops-invitation-journal-wording/fix-stable-3_5_0.diff)
  is the same change made against that branch.

Small: two English texts in one repository, and no code.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/omp-ops-invitation-journal-wording/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-ops-invitation-journal-wording/walk.js)
  takes steps 1 to 9:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/omp-ops-invitation-journal-wording/walk.js`
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, on PostgreSQL,
  from pkp/datasets 3788b55 (2026-10-02).
- Tips: `lib/pkp` 3dc90c81a6 (OMP and OPS `main`), ddd8ab243a (OJS
  `main`), cf3f984335 (`stable-3_5_0`); `lib/ui-library` 280f98c5 and
  64d67363 (`main`), d4e01883 (`stable-3_5_0`).
- Code reads: the two texts, `UserInvitationUserGroupsTable.vue`,
  `InvitationHandler.php` and `invitationUnavailable.tpl` on `main` and
  `stable-3_5_0`; the applications' English locale files (no text for
  either key); pkp-lib's tags 3_5_0-4 and 3_5_0-5 (both texts present).
- Introduced: a3582c0919 was written by Jarda Kotěšovec and merged in
  Bozana Bokan's `pkp/pkp-lib#12472`; the bullet names the PR's author.
- Unverified: the other kinds of emailed links the page answers.
