# The role invitation email and the Activity Log write "as a Author" for roles whose name starts with a vowel

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code; the Activity Log only, as 3.4 has no role invitations)
  - 3.3: OJS, OMP, OPS (code; the Activity Log only, as 3.3 has no role invitations)
- **Introduced** `pkp/pkp-lib#10472` for `pkp/pkp-lib#10459` · [7e3a26ea83](https://github.com/pkp/pkp-lib/commit/7e3a26ea83db5428a8747b7dba574259e749cf98) · 2024-09-26 · Dimitris Efstathiou (defstat) for the email; the Activity Log's sentence is older, not traced: present since at least [631efb9665](https://github.com/pkp/pkp-lib/commit/631efb966542b6de2766e0aea847d3d3d8bdb618) (2019-09-27)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U06 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U06-user-invitations.md#a7)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

When a manager invites someone to the Author role from Settings › Users
& Roles, the invitation email says "Your name will not appear in Journal
of Public Knowledge's masthead as a Author.". A submission's Activity
Log reads the same way when someone is given a participant role: "Alan
Mwandenga (amwandenga) was assigned to this submission as a Author.".

The sentences are understood and nothing is lost, but they read as
careless in an email that goes to the people a journal, press or server
is recruiting.

Every role whose name starts with a vowel sound gets "a". Among the
default roles that is Author and Editorial Board Member on all three
applications, Indexer on OJS and OMP, and Internal Reviewer and
External Reviewer on OMP; and any role a manager names that way.
Only English is affected: the article is in the English text, and
other languages have their own.

## Impact

- **Lost.** Nothing: wording only.
- **Who.** Everyone invited to such a role reads it in the email;
  editors read it in a submission's Activity Log.
- **Way round.** None in practice. The sentence is built by the code,
  and the email template only holds the placeholders `{$rolesAdded}`
  and `{$existingRoles}`, so a manager could only replace them with
  their own text in each email before sending. Renaming the role does
  not help for "Author".

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), context
  `publicknowledge`.
- Outgoing mail caught where it can be read (a mail catcher such as
  Mailpit, or the log mailer): the dataset's users all have
  `@mailinator.com` addresses.

The invitation email:

1. Sign in as `rvaca` (the manager).
2. Open Settings › Users & Roles
   (`/index.php/publicknowledge/en/management/settings/access`) and
   press "Invite to a role".
3. Type `dbuskins@mailinator.com` and press "Search User".
4. In the empty role row choose "Author", today as "Start Date" and
   "Does not appear on the masthead".
5. Press "Save And Continue", then "Invite user to the role", then "View
   All Users".
6. Open the email "You are invited to new roles" sent to
   dbuskins@mailinator.com and read the roles it lists.

The Activity Log, OJS only (the OMP and OPS datasets have no
participant line for a role that starts with a vowel):

7. Sign in as `dbarnes` and open submission 1, "Signalling Theory
   Dividends".
8. Press "Activity Log" and read the line about Alan Mwandenga.

**Expected.** "… masthead as an Author." or a sentence that does not
put an article before the role's name; the same in the log.

**Observed.** The block shows OJS. On OMP and OPS the email names
Public Knowledge Press or Public Knowledge Preprint Server, and David
Buskins' existing role is "Series editor" or "Moderator".

```
Already assigned roles
1. Section editor
   Starting from 2026-10-01
   Your name will appear in the Journal of Public Knowledge's masthead as a Section editor.
Newly assigned roles
1. Author
   Starting from 2026-10-02
   Your name will not appear in Journal of Public Knowledge's masthead as a Author.

Activity Log: Alan Mwandenga (amwandenga) was assigned to this submission as a Author.
```

The "Section editor" sentence above it, and the log's lines for "a
Copyeditor", "a Layout Editor" and "a Proofreader", read correctly.

## Cause

Both sentences put a fixed "a" in front of the role's name, which is
filled in when the text is used, from the role's name in the reader's
language. pkp-lib's `locale/en/emails.po`:

```
msgid "emails.userRoleAssignmentInvitationNotify.userGroupSectionWillNotAppear"
msgstr "Your name will not appear in {$contextName}'s masthead as a {$sectionName}."
msgid "emails.userRoleAssignmentInvitationNotify.userGroupSectionWillAppear"
msgstr "Your name will appear in the {$contextName}'s masthead as a {$sectionName}."
```

`UserRoleAssignmentInvitationNotify::getUserUserGroupSection()` passes
`$userGroup->getLocalizedData('name', $locale)` as `{$sectionName}`.
`locale/en/submission.po` does the same with
`submission.event.participantAdded` and
`submission.event.participantRemoved` ("… to this submission as a
{$userGroupName}." and "… was removed from this submission as a
{$userGroupName}."). `StageParticipantGridHandler` stores the role's
name with each event, and `EventLogEntry::getTranslatedMessage()` builds
the sentence when the log is shown. A role's name is set by each
journal, press or server and can start with any letter, so no fixed
article fits every role.

Reach:

- The invitation email's held and offered roles, both sentences (seen
  on screen, all three applications).
- The Activity Log's "was assigned to" lines (seen on screen, OJS
  submission 1) and its "was removed from" lines (read in the code).
  The log builds each sentence when it is shown, so the fix also
  corrects the lines already stored.
- No other English text in pkp-lib or the applications puts "a" or "an"
  before a role name.
- Not this fault: whether the email should mention the masthead at all
  for a role the masthead never lists
  ([its report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U06-A11-invitation-promises-masthead-for-unlisted-roles.md)).
  That fix chooses which of the two sentences is sent, and this one
  changes their wording, so they do not conflict.

## Proposed fix

Drop the article, as English does before a role used as a title ("as
Author", "as Section editor"), in the four English texts of pkp-lib.
The diff is against the application's root
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/invitation-email-role-article/fix.diff)):

```diff
 # lib/pkp/locale/en/emails.po
-msgstr "Your name will not appear in {$contextName}'s masthead as a {$sectionName}."
+msgstr "Your name will not appear in {$contextName}'s masthead as {$sectionName}."
-msgstr "Your name will appear in the {$contextName}'s masthead as a {$sectionName}."
+msgstr "Your name will appear in the {$contextName}'s masthead as {$sectionName}."
 # lib/pkp/locale/en/submission.po
-msgstr "{$userFullName} ({$username}) was assigned to this submission as a {$userGroupName}."
+msgstr "{$userFullName} ({$username}) was assigned to this submission as {$userGroupName}."
-msgstr "{$userFullName} ({$username}) was removed from this submission as a {$userGroupName}."
+msgstr "{$userFullName} ({$username}) was removed from this submission as {$userGroupName}."
```

The texts are read when the email is built and when the log is shown,
so no stored data changes and no code is touched. No key changes;
Weblate may flag the other languages' versions of the four texts for
review, which they do not need.

On `main`, `participantRemoved` carries a `# fuzzy` flag. Its wording
came with `pkp/pkp-lib#13007` for `pkp/pkp-lib#12821`
([173bde9155](https://github.com/pkp/pkp-lib/commit/173bde915526e442bde45ee9369afec0f600fbbd),
2026-07-08), and the edit is the moment to clear the flag.

Tried on `main`, on all three applications: the email reads "Your name
will not appear in Journal of Public Knowledge's masthead as Author."
and "… as Section editor." ("Series editor", "Moderator"), and the OJS
log line reads "… was assigned to this submission as Author.".

**Alternatives**

- Choose "a" or "an" in code from the role's name: English-only logic
  in a mailable and an event log, and a first-letter rule is still wrong
  for a name such as "Honorary editor".
- "for the role {$sectionName}", the pattern of the masthead update
  email ("for the role {$roleNameAndDates}"): also correct, a few words
  longer.

**What goes with it**

- Backport: on `stable-3_5_0` and 3.4 the removal text reads
  "\"{$userFullName}\" ({$username}) is removed as a {$userGroupName}.",
  so `fix.diff`'s fourth hunk does not apply there;
  [fix-stable-3_5_0.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/invitation-email-role-article/fix-stable-3_5_0.diff)
  carries all four texts in their 3.5 form. On 3.3 both log texts name
  `{$name}` and live in `locale/en_US/submission.po`, and the change is
  made by hand.

Small: four English texts in one repository, and no code.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/invitation-email-role-article/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/invitation-email-role-article/walk.js)
  takes steps 1 to 8:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/invitation-email-role-article/walk.js`
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, on PostgreSQL,
  from pkp/datasets 3788b55 (2026-10-02).
- Tips: `lib/pkp` ddd8ab243a (OJS `main`), 3dc90c81a6 (OMP and OPS
  `main`), cf3f984335 (`stable-3_5_0`), 32b0f4b4af (`stable-3_4_0`),
  f6ab331645 (`stable-3_3_0`).
- Code reads: `UserRoleAssignmentInvitationNotify.php`,
  `StageParticipantGridHandler.php` and `EventLogEntry.php` on `main`;
  the four texts on `main`, `stable-3_5_0`, `stable-3_4_0` and
  `stable-3_3_0`; a search of pkp-lib's and the applications' English
  locale files for an article before a `{$…}` variable.
- Upstream: `pkp/pkp-lib#11417` (closed) reported this email's missing
  closing periods, with a screenshot of "as a Journal editor"; it did
  not raise the article.
- Unverified: the "was removed from" line on screen, and a role renamed
  by a manager (the name is used as stored).
