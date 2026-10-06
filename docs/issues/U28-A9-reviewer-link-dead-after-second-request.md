# With one-click reviewer access, a request on a second submission kills the link in the reviewer's first request email

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#10472` for `pkp/pkp-lib#10459` · [7e3a26ea83](https://github.com/pkp/pkp-lib/commit/7e3a26ea83db5428a8747b7dba574259e749cf98) · 2024-09-26 · Dimitris Efstathiou (defstat)
- **Upstream** `pkp/pkp-lib#11154` (open; fix in PR `pkp/pkp-lib#13259`, open against `stable-3_5_0`, not yet in main)
- **Tracked in** spec U28 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U28-reviewers-review.md#a9)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a journal or press with "One-click Reviewer Access" on (Settings ›
Workflow › Review; its tick box "Include a secure link in the email
invitation to reviewers." is off by default), each review request email
carries a personal link that opens the review without a sign-in. When
an editor asks the same reviewer to review a second submission, the
link in the first request email stops working. It opens a bare page
reading only "404 Not Found", although that review is still waiting for
the reviewer.

At any moment only the newest email's link works, so a reviewer holding
two requests can open only one of them by link. Neither the editor nor
the reviewer is told. The reviewer has to sign in with a password
instead.

pkp already tracks this, and a fix is open for 3.5 only: what is left
is to review it and bring it to main. The fix is two short methods in
the shared library.

## Impact

- **Lost**: the reviewer's way into the first review by its emailed
  link.
- **Who**: every reviewer who holds open requests on two submissions of
  one journal or press that has one-click access on. A preprint server
  has no review.
- **Way round**: signing in: a reviewer has a password, their own if they
  registered, or a generated one the journal mailed when an editor
  created the account. One who does not know it uses "Forgot your
  password?" on the Login page.
  A reminder for the first review is no way round: its new link kills
  the second request's link in turn.

Medium: the journal's own link to a review fails, and the sign-in is a
way round every reviewer has.

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main`. OMP is the same with the names given
  in brackets.
- Sign in as `dbarnes`. Under Settings › Workflow › "Review" › "Setup",
  tick "Include a secure link in the email invitation to reviewers."
  and press "Save".

1. As `dbarnes`, open submission 7, "Developing efficacy beliefs in the
   classroom" (OMP: 2, "The West and Beyond: New Perspectives on an
   Imagined Region").
2. Press "Add Reviewer", search for "Julie Janssen" (OMP: "Adela
   Gallego"), press "Select Reviewer", then "Add Reviewer".
   `jjanssen@mailinator.com` (OMP: `agallego@mailinator.com`) receives
   "Invitation to review" (OMP: "Manuscript Review Request").
3. In a browser that is not signed in, open that email's link. The
   review opens on "1. Request", signed in as the reviewer.
4. As `dbarnes`, open submission 10, "Condensing Water Availability
   Models to Focus on Specific Water Management Systems" (OMP: 15,
   "Expansive Discourses: Urban Sprawl in Calgary, 1945-1978"), and add
   the same reviewer the same way. The reviewer receives a second
   request email.
5. In a browser that is not signed in, open the first email's link
   again.

**Expected**: the review of submission 7 (OMP: 2) opens on "1.
Request", as in step 3.

**Observed**: the link answers HTTP 404. The page has no title, no
stylesheet, and nothing but this heading:

```
404 Not Found
```

The second email's link opens the review of submission 10 (OMP: 15).

## Cause

`PKP\invitation\core\Invitation::invite()`, in lib/pkp
`classes/invitation/core/Invitation.php` (lines 326–332), ends by
deleting every other pending invitation of the same type for the same
user and context:

```php
InvitationModel::byStatus(InvitationStatus::PENDING)
    ->byType($this->getType())
    ->byNotId($this->getId())
    ->when(…byUserId…)->when(…byEmail…)->when(…byContextId…)
    ->delete();
```

For a role invitation, "same type, same person, same journal" means the
same invitation sent again. A reviewer's access link is a
`ReviewerAccessInvite`, and it belongs to one review assignment: its
payload holds `reviewAssignmentId`. The query does not look at the
payload. So the invitation minted for the second request
(`EditorAction::createMail()`) deletes the one that belongs to the
first, which is still pending.

A deleted invitation's link no longer finds a row, so
`InvitationHandler::getInvitationByKey()` raises
`NotFoundHttpException`, shown as the bare "404 Not Found".

On 3.4 and 3.3 each email carried an access key of its own
(`AccessKeyManager::createKey()`), stored per review assignment, and
creating one deleted nothing. The links moved to invitations in
[596057ddfb](https://github.com/pkp/pkp-lib/commit/596057ddfb)
(`pkp/pkp-lib#9197`, 2023-08-31), still deleting nothing. The
introducing change added the deletion.

Reach:

- A request on another submission: walked on OJS and OMP, main and 3.5.
- A reminder for one review also deletes the reviewer's links for
  their other reviews in the journal. Read in the code, not walked:
  - the editor's "Send Reminder" (`ReviewRemind`);
  - the automatic reminders (`ReviewRemindAuto`,
    `ReviewResponseRemindAuto`, sent by `jobs/email/ReviewReminder`).
- A request in another journal of the same site leaves the link alone:
  the query filters on the context. Read in the code.
- For role invitations, registration validation and the profile's
  email change, a person has one live invitation per journal, so
  deleting the others is right.

## Proposed fix

Take PR `pkp/pkp-lib#13259` to main: let each invitation type say which
earlier invitations a new one replaces, and have `ReviewerAccessInvite`
replace only those of the same review assignment
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-link-dead-after-second-request/fix.diff),
the PR's two files as they apply to main):

```diff
 // Invitation::invite()
-        InvitationModel::byStatus(InvitationStatus::PENDING)
-            ->byType($this->getType())
-            …
-            ->delete();
+        $invitationIds = $this->getInvitationsToDelete()->pluck('id')->all();
+        InvitationModel::query()->whereIn('invitation_id', $invitationIds)->delete();

 // ReviewerAccessInvite
+    protected function getInvitationsToDelete(): Collection
+    {
+        $reviewAssignmentId = $this->getPayload()->reviewAssignmentId;
+        if (!isset($reviewAssignmentId)) {
+            return new Collection();
+        }
+        return parent::getInvitationsToDelete()
+            ->where('payload.reviewAssignmentId', $reviewAssignmentId);
+    }
```

The rule "which invitations does a new one replace" belongs to the
invitation type, and the base class keeps today's answer for the other
three types. This is a proposal; the PR is the team's own.

The fix was tried on main, on OJS and OMP. After the second request,
the first email's link opens its review on "1. Request", and the second
email's link opens the other review. A further check shows the fix
leaves the wanted replacement alone: with it and without it, a reminder
sent for a review replaces that review's request link, and the
reminder's own link opens the review.

**Alternatives**:

- Filter in the query (`whereJsonContains('payload->reviewAssignmentId', …)`)
  instead of in PHP. It saves loading the rows, but puts a
  reviewer-only payload key into the shared class.
- Stop replacing access links at all, as 3.4 did. Every reminder would
  then leave one more live link behind. Not proposed: one live link per
  review is the invitation design.

**What goes with it**:

- [The report on replaced invitation links](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U06-A3-replaced-invitation-links-not-found.md)
  proposes to cancel replaced invitations instead of deleting them, in
  the same statement. With both, `invite()` loops over the rows
  `getInvitationsToDelete()` returns and calls
  `markAs(InvitationStatus::CANCELLED)` on each, one update per row as
  in that report's diff, not a bulk update.
- `jobs/email/ReviewReminder::handle()` builds a `ReviewerAccessInvite`
  of its own without a `reviewAssignmentId`. Its `invite()` returns
  false at the validation, where `reviewAssignmentId` is `required`,
  before the save and the delete, and the job ignores the result. So
  it replaces nothing, today or with the fix: the automatic reminders'
  only deletion is the one of the mailable's `setData()`. Read in the
  code.
- No data repair: deleted invitations are gone, and a reminder mints a
  new link.
- Guard: a unit test that sends two `ReviewerAccessInvite` for two
  review assignments of one reviewer and finds both pending, and two
  for one assignment and finds only the second. It is a new file: the
  one invitation test under `lib/pkp/tests`,
  `jobs/invitations/RemoveExpiredInvitationsJobTest.php`, is a job
  test. The U28 spec's e2e scenario
  "One-click access" should also open the first link after a request
  on a second submission.

Small: two methods in two classes of one repo, already written in the
PR, and a unit test.

## Evidence

- The script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-link-dead-after-second-request/walk.js)
  takes the Steps on OJS and OMP; its helpers are in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-link-dead-after-second-request/lib.js).
  Run it as
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/reviewer-link-dead-after-second-request/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). With
  `WALK_MODE=neighbour` it runs only the further check of the Proposed
  fix: a reviewer added to submission 10 (OMP: 15), the row's "Edit"
  with yesterday as "Response Due Date", then "Send Reminder".
- The walks also read the `invitations` table. Without the fix, the
  reviewer has one `reviewerAccess` row after the second request, the
  second review's. With it, two, one per review.
- No request failed on the server and no page script failed in any
  walk. The only console error is the 404 answer itself. The walks ran
  on PostgreSQL; the fault involves no database-specific query.
- Datasets: pkp/datasets e8dafbc (2026-10-02), `main` and
  `stable-3_5_0`.
- Branch tips:
  - `main`: OJS b84f8e2e44, OMP 3b0ecf794. pkp-lib ddd8ab243a (OJS) and
    3dc90c81a6 (OMP); `invite()`, `ReviewerAccessInvite` and
    `EditorAction::createMail()` are the same in both.
  - 3.5: OJS 091fb65453, OMP 9c5e24246; pkp-lib cf3f984335.
  - 3.4: OJS 75cc2d488b, OMP 0aec65441; pkp-lib 6f96165c90.
  - 3.3: OJS ac77c9fb35, OMP 8e72fc883; pkp-lib 4156e50233.
- Code reads, version by version:
  - 3.5 has the same `invite()` query and the same
    `EditorAction::createMail()`.
  - 3.4: `OneClickReviewerAccess::setOneClickAccessUrl()` calls
    `AccessKeyManager::createKey()`, which inserts a key for the review
    assignment and deletes nothing. pkp-lib's `stable-3_4_0` has no
    `classes/invitation/`.
  - 3.3: the request and reminder forms call the same `createKey()`.
- Introduced, the trace: `git blame` on the query gives 7e3a26ea83. Its
  parent's `invite()` deleted nothing.
- Upstream: `pkp/pkp-lib#11154` was opened for a reminder whose mailed
  link was replaced before it arrived, fixed in 2025-04. A comment of
  2026-08-31 reports this fault there with the same cause, and PR
  `pkp/pkp-lib#13259` (2026-09-01) answers it. pkp/pkp-lib, pkp/ojs,
  pkp/omp and pkp/ui-library were searched, issues and PRs.
- The password fact of the Way round, read in the code:
  `CreateReviewerForm::execute()` ("Create New Reviewer") generates a
  password, mails it with the registration email unless the form's
  `skipEmail` box is ticked, and makes the reviewer change it at the
  first sign-in.
