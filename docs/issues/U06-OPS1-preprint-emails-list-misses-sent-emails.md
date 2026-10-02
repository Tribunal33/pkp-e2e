# On a preprint server, the manager cannot find or edit the invitation email and eight others it sends

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: none (code; a 3.4 preprint server lists every pkp-lib email it sends)
  - 3.3: none (code; the list there is built from the stored templates, with no per-app list of emails)
- **Introduced** not traced (pkp-lib emails added to the shared list since 3.4 were not added to the preprint server's own list); present since at least [c79f538c51](https://github.com/pkp/pkp-lib/commit/c79f538c51e8300366732f993edcd84fa18a18ff) (2023-10-06)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U06 [OPS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U06-user-invitations.md#ops1), spec U03 [OPS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U03-user-profile.md#ops2), spec U04 [OPS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U04-orcid-integration.md#ops2)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On a preprint server, the Manage Emails page has no row for "User
Invited to Role Notification": a search for it answers "No items
found.", so a manager cannot review, reword or translate the stored
email that "Invite to a role" sends. Eight more emails the server sends
have no row either: "User Role Ended Notification", "Change Email
Address Invitation", "Publication Published", "Submission Saved for
Later", "Submission Needs Editor" and, with ORCID turned on, the three
ORCID request emails. On a journal or a press each has a row with an
"Edit" button.

All nine still go out, in the default text that ships with the software
for the language they are sent in. Only the invitation can be changed
at send time, one message at a time, in "Invite to a role"'s email step;
the other eight are sent automatically. The fix is to add the nine to
the preprint server's own list of emails.

## Impact

- **Lost**: the manager's control over the wording of nine emails that
  go to authors, invitees, users and the server's own managers. Nobody
  is told they cannot be changed.
- **Who**: every preprint server's managers. The invitation, the
  role-ended notice, "Publication Published" (each posting, to its
  authors) and "Submission Saved for Later" go out in ordinary use; the
  email-change confirmation when a user changes their address; "Submission
  Needs Editor" only when a new submission gets no editor; the ORCID
  emails only with ORCID turned on.
- **Way round**: none on screen; an alternative template cannot be added
  for these emails either. Off screen, the REST API's
  `PUT /api/v1/emailTemplates/{key}` does not check the list, so a
  developer could change a stored text through it or in the database.

Medium: the rest of the email list can be customized, and these nine are
still sent; a few named emails are stuck in their default text. A
default text of one of the nine that is wrong for a preprint server
would raise this to high, since the server could not correct it.

## Steps to reproduce

Preconditions: PKP's default test dataset, OPS `main`. Nothing is created
beforehand. The control is the same steps 1–4 on OJS `main` and OMP
`main`, each from its own default dataset.

1. Sign in as `rvaca` (Preprint Server manager).
2. Open Settings › Workflow, tab "Emails", and follow "Add and edit
   templates" (the Manage Emails page,
   `/index.php/publicknowledge/en/management/settings/manageEmails`).
3. Type "User Invited to Role Notification" in the search box and press
   Enter.
4. Clear the search and read the full list.
5. Open Settings › Users & Roles and press "Invite to a role". Search
   for `ccorino@mailinator.com` and press "Search User". Choose the role
   "Moderator", today's start date and "Does not appear on the
   masthead", then press "Save And Continue" and "Invite user to the
   role".
6. Read the email that arrives at `ccorino@mailinator.com`.

**Expected**: step 3 lists "User Invited to Role Notification" ("This
email is sent to users that are invited to obtain certain roles") with an
"Edit" button. "Edit" opens "Edit Template" with the subject "You are
invited to new roles". Step 4 also lists the other eight emails the
Summary names.

**Observed**: step 3 answers "No items found." Step 4 lists 17 emails on
the default dataset, and none of the nine is among them. Step 6 delivers
the invitation from `rvaca@mailinator.com` with the subject "You are
invited to new roles", built from the stored template the manager could
not open.

On OJS and OMP, step 3 lists the row, its "Edit" opens the template with
the subject "You are invited to new roles", and step 4 lists all nine
(66 emails on OJS, 56 on OMP, on the default dataset). The counts depend
on four settings that hide an email when off: "Statistics Report
Notification" (`editorialStatsEmail`), "Submission Confirmation (Other
Authors)" (`submissionAcknowledgement`), "Notify Other Authors"
(`notifyAllAuthors`) and, on a preprint server, "Posted Acknowledgement"
(`postedAcknowledgement`); the default datasets have all four on.

[On 3.5 the walk is the same. The list has 18 emails (3.5 still lists
"Discussion (Production)", see the Cause), and "Publication Published"
does not exist there. "User Role Masthead Visibility Update
Notification" is missing from the preprint server's
list on 3.5 too, though a journal and a press list it.]

## Cause

The Manage Emails page lists `Repo::mailable()->getMany($context, null,
false, true)`: the mailables in the app's list (`Repository::map()`)
that are enabled for the context (`isMailableEnabled()`) and editable
(`includeConfigurableOnly`: the class uses the `Configurable` trait). All
nine missing mailables are `Configurable` and enabled on every context,
so only the list keeps them off.

`getMany()` lives in pkp-lib (`lib/pkp/classes/mail/Repository.php`) and
calls the app's `map()`. OJS and OMP extend the shared list
(`parent::map()->merge([...])`), so every mailable pkp-lib adds there
shows up. OPS overrides `map()` in
[`classes/mail/Repository.php`](https://github.com/pkp/ops/blob/main/classes/mail/Repository.php)
with its own list ("Overrides the map from the shared library as OPS
uses distinct mailables from OJS and OMP"). Since January 2023
(`pkp/ops#442` and two fixes after it) that list has gained no pkp-lib
mailable. Its one later change, [cd03bc1cdb](https://github.com/pkp/ops/commit/cd03bc1cdb20beda901cdd285815bc48664e27a8)
(2026-08-05, for `pkp/pkp-lib#12593`), removed `DiscussionProduction` on
`main` only, which is why 3.5 lists 18 emails and `main` 17.

pkp-lib added these mailables to its own list, and none to OPS's (the
PRs named come from GitHub's commit-to-PR lookup; the issue numbers from
the commit messages):

- `OrcidRequestAuthorAuthorization` and `OrcidCollectAuthorId`, when ORCID
  moved into the core: [c79f538c51](https://github.com/pkp/pkp-lib/commit/c79f538c51e8300366732f993edcd84fa18a18ff)
  for `pkp/pkp-lib#9771`, merged in `pkp/pkp-lib#9818`, Erik Hanson
  (ewhanson). On 3.4 the ORCID plugin added its own two emails to every
  app's list through the `Mailer::Mailables` hook, so a 3.4 preprint
  server listed them.
- `UserRoleAssignmentInvitationNotify` and `UserRoleEndNotify`:
  [a18a6b6a12](https://github.com/pkp/pkp-lib/commit/a18a6b6a12ef2b36521bb20679d096e6674e9cd7)
  (2024-10-24, "craft-oa/gdpr-invitation#75 Add end user role
  endpoint", merged in `pkp/pkp-lib#10563`, Erik Hanson). The invitation
  email class itself came in [7e3a26ea83](https://github.com/pkp/pkp-lib/commit/7e3a26ea83db5428a8747b7dba574259e749cf98)
  for `pkp/pkp-lib#10459` (2024-09-26), outside any list.
- `SubmissionSavedForLater` and `SubmissionNeedsEditor`:
  [1c44e0f687](https://github.com/pkp/pkp-lib/commit/1c44e0f687fe5c6ec0d8117bb6539ccebf89b097)
  for `pkp/pkp-lib#10463` (2026-02-11).
- `UserRoleMastheadUpdateNotify`:
  [c22577121b](https://github.com/pkp/pkp-lib/commit/c22577121b14d93aa8fc7240afa8877552d66296)
  for `pkp/pkp-lib#11800` (2026-03-18).
- `AuthorPublicationPublished`:
  [b399d851a6](https://github.com/pkp/pkp-lib/commit/b399d851a6d9c67226622d0230fb21b038f72443)
  for `pkp/pkp-lib#12987` (2026-07-03).
- `ChangeProfileEmailInvitationNotify` and `OrcidRequestUpdateScope`:
  [dcd67ebc72](https://github.com/pkp/pkp-lib/commit/dcd67ebc72efc9773d7747072db1486c4c175521)
  for `pkp/pkp-lib#13050` (2026-08-19).

Each is sent from pkp-lib code that runs on a preprint server: the
invitation and role-ending endpoints, the email-change request, the
ORCID jobs, the submission wizard's "Save for Later", and the
`AssignEditors` and `NotifyAuthorOnPublication` listeners. Each template
key except `USER_ROLE_MASTHEAD_UPDATE` is seeded in OPS's
`registry/emailTemplates.xml`. The senders read the template by key
(`Repo::emailTemplate()->getByKey()`), not through the list, so the
emails go out while the list hides them.

The reach, read in the code unless marked otherwise:

- Manage Emails: no row, so no "Edit" and no "Add Template" (seen on
  screen for all nine).
- `GET /api/v1/mailables/{key}` answers 404 for these keys, since
  `Repository::get()` searches the same list.
- `POST /api/v1/emailTemplates` refuses an alternative template for
  them (`alternateTo` must name a listed mailable,
  `PKP\emailTemplate\Repository::validate()`), so the invitation's email
  step offers only the default template.
- `SubmissionAcknowledgementOtherAuthors` is also missing from the OPS
  list, but it is not `Configurable`, so no app's Manage Emails shows it;
  its template, `SUBMISSION_ACK_NOT_USER`, is listed as "Submission
  Confirmation (Other Authors)".
- The review and decision mailables the OPS list leaves out are never
  sent by a preprint server and are rightly absent.

## Proposed fix

Add the nine pkp-lib mailables to OPS's list in `APP\mail\Repository::map()`
([fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-emails-list-misses-sent-emails/fix-ops.diff)),
and say in the method's comment that every pkp-lib mailable OPS sends
belongs there:

```diff
             \PKP\mail\mailables\AnnouncementNotify::class,
+            \PKP\mail\mailables\AuthorPublicationPublished::class,
+            \PKP\mail\mailables\ChangeProfileEmailInvitationNotify::class,
             ...
             \PKP\mail\mailables\EditorAssigned::class,
+            \PKP\mail\mailables\OrcidCollectAuthorId::class,
+            \PKP\mail\mailables\OrcidRequestAuthorAuthorization::class,
+            \PKP\mail\mailables\OrcidRequestUpdateScope::class,
             ...
             \PKP\mail\mailables\SubmissionAcknowledgementNotAuthor::class,
+            \PKP\mail\mailables\SubmissionNeedsEditor::class,
+            \PKP\mail\mailables\SubmissionSavedForLater::class,
             \PKP\mail\mailables\UserCreated::class,
+            \PKP\mail\mailables\UserRoleAssignmentInvitationNotify::class,
+            \PKP\mail\mailables\UserRoleEndNotify::class,
```

Tried on OPS `main`: the list grew from 17 emails to 26, "User Invited
to Role Notification" is listed, and its "Edit" opens the template with
the subject the invitation arrived with. The 17 earlier rows stayed, and
none of the 30 review and decision emails a journal lists appeared.

`UserRoleMastheadUpdateNotify` is left out on `main` on purpose. OPS
`main` does not install its template, `USER_ROLE_MASTHEAD_UPDATE` (no
registry entry, no migration), so a row for it would open an "Edit"
that fails to load the template, as it does on a press today. It joins
the list in the change that seeds that template (a registry entry plus a
migration for existing installs), which is a fix of its own and not
part of this one. On 3.5, where the template is installed, it belongs in
this fix.

**Alternatives**

- Build the OPS list as `parent::map()` minus the mailables a preprint
  server never sends, the way OJS and OMP build on the shared list. A
  pkp-lib email added later would then show on OPS by default, but the
  exclusion list would hold about 30 review and decision classes, and a
  new review email would appear on OPS until someone excluded it.
- Have each sending path check the list. It changes nothing a manager
  sees, and the rule that broke is that OPS's list must name every
  pkp-lib mailable OPS sends.

**What goes with it**

- The guard: a unit test in OPS that every key in
  `registry/emailTemplates.xml` belongs to a mailable in
  `Repo::mailable()->map()`, with `REQUEST_REVIEW_ROUND_AUTHOR_RESPONSE`
  allowed by name: OPS seeds that template but never sends it, and
  removing it would need a migration for no gain to anyone. The test
  would have failed in OPS at each change that seeded a key without
  listing its mailable: the ORCID templates (0c2f9d353d, 2024-05-08),
  `CHANGE_EMAIL` (9d5458048a, 2024-06-04), the invitation (2a44dca985,
  2024-09-26), `USER_ROLE_END` (16d3965e0e, 2024-11-01),
  `ORCID_REQUEST_UPDATE_SCOPE` (9ff35f8bcb, 2025-01-31) and
  `AUTHOR_PUBLICATION_PUBLISHED` (a8eb59e979, 2026-07-14), and it fails
  today for `SUBMISSION_SAVED_FOR_LATER` and `SUBMISSION_NEEDS_EDITOR`.
  It could not have caught c22577121b, since OPS never seeded
  `USER_ROLE_MASTHEAD_UPDATE`; the test passes for a mailable whose
  template is missing as well.
- Backport to `stable-3_5_0`: the same lines without
  `AuthorPublicationPublished`, which 3.5 does not have, and with
  `UserRoleMastheadUpdateNotify`, whose template 3.5 installs. No data
  repair is needed, since the templates are already stored.
- Once listed, the ORCID emails show with the raw names
  "orcidRequestAuthorAuthorization", "orcidCollectAuthorId" and
  "orcidRequestUpdateScope", as they already do on journals; that is a
  separate wording fault in pkp-lib's `locale/en/emails.po`.

Small: nine lines in one OPS class, following the class's own pattern,
and a unit test.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-emails-list-misses-sent-emails/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-emails-list-misses-sent-emails/lib.js))
  takes the Steps on each app, with OJS and OMP as the control (OJS
  invites `ccorino` as Copyeditor, OMP `aclark`), and records the search,
  the template's subject when "Edit" opens it, the full list and the
  email that arrives. On an install freshly loaded from the default
  dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/preprint-emails-list-misses-sent-emails/walk.js`.
- Walked on OJS, OMP and OPS `main` and `stable-3_5_0`, on PostgreSQL;
  the fault does not depend on the database. Dataset: pkp/datasets
  3788b55 (2026-10-02). The fix trial reloaded the dataset with
  `fix-ops.diff` applied, walked OPS, and read the full list with the fix
  in and, after the revert, out.
- Tips: `main` OJS b84f8e2e44, OMP 3b0ecf794, OPS c8af945bb7 (lib/pkp
  ddd8ab243a for OJS, 3dc90c81a6 for OMP and OPS; ui-library 64d67363
  and 280f98c5); `stable-3_5_0` OJS 091fb65453, OMP 9c5e24246, OPS
  38b61882d3 (lib/pkp cf3f984335). On 3.5, lib/pkp's list differs from
  `main` only in review and discussion mailables and in lacking
  `AuthorPublicationPublished`.
- Code read on 3.4 (`upstream/stable-3_4_0` of the OPS checkout,
  `origin/stable-3_4_0` of lib/pkp): lib/pkp's list has no invitation,
  email-change or ORCID mailables; `SubmissionSavedForLater` and
  `SubmissionNeedsEditor` are in no app's list; the pkp-lib mailables
  missing from OPS's list are review and decision emails; the ORCID
  plugin (orcidProfile 7d8c4e3c51, read on raw.githubusercontent.com)
  adds its two emails through `Hook::add('Mailer::Mailables', ...)`.
- Code read on 3.3 (`origin/stable-3_3_0` of lib/pkp): `ManagementHandler`
  builds the list from the `emailTemplates` API, the stored templates.
- Trackers searched with the symptom's words and with `Repository::map`
  and mailables in pkp/pkp-lib, pkp/ops and pkp/ui-library. Related, not
  this fault: `pkp/pkp-lib#13050` (closed) fixed a stale entry in
  pkp-lib's list and added three mailables there, not to OPS's;
  `pkp/pkp-lib#10463` (closed) added "Submission Needs Editor" to
  pkp-lib's list only.
- Not driven: sending the other eight emails on OPS. The spec entries
  show three of them delivered on OPS: "Change Email Address Invitation"
  (U03 OPS2) and the two ORCID request emails "Request verification"
  sends (U04 OPS2); the other five are read in the code. Unverified,
  read in the code only: the `GET /api/v1/mailables/{key}` 404, the
  refused `alternateTo`, the REST API way round, and the language each
  automatic email is sent in.
