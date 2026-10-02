# Opening a reviewer's "Send Reminder" window, even without sending, kills the reviewer's one-click access link

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#10472` for `pkp/pkp-lib#10459` · [7e3a26ea83](https://github.com/pkp/pkp-lib/commit/7e3a26ea83db5428a8747b7dba574259e749cf98) · 2024-09-26 · Dimitris Efstathiou (defstat)
- **Upstream** `pkp/pkp-lib#11154` (open): it reported the link re-created when a sent reminder was logged, and that case was fixed in 2025-04; opening the window without sending is not covered
- **Tracked in** spec U28 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U28-reviewers-review.md#a9)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On a journal or press with "One-click Reviewer Access" on (Settings ›
Workflow › Review; its tick box "Include a secure link in the email
invitation to reviewers." is off by default), a reviewer's emails carry
a personal link that opens the review without a sign-in. When an editor
presses "Send Reminder" on an overdue reviewer's row, the "Review
Reminder" window opens with the email to send. Opening that window
already deletes the reviewer's current link on the server, before
anything is sent.

If the editor then presses "Cancel", no email goes out, and the link in
the reviewer's request email opens a bare page reading only "404 Not
Found". The reviewer is left with no working link at all, and neither
person is told. The reviewer has to sign in with a password instead.

The fix is two short changes in the shared library: create the link
when the reminder is sent, not when the window reads the email.

## Impact

- **Lost**: the reviewer's only working link into the review, with no
  new one mailed.
- **Who**: reviewers of a journal or press with one-click access on,
  each time an editor opens "Send Reminder" on their row and closes the
  window without sending. A preprint server has no review.
- **Way round**: signing in: a reviewer has a password, their own if they
  registered, or a generated one the journal mailed when an editor
  created the account. One who does not know it uses "Forgot your
  password?" on the Login page. A reminder that is sent mails a new
  link, but the editor has no sign that one is needed, so that is a
  repair after the reviewer complains.

Medium: the journal's own link to a review fails after an action that
looks like it did nothing, and the sign-in is a way round every
reviewer has.

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main`. OMP is the same with the names given
  in brackets.
- Sign in as `dbarnes`. Under Settings › Workflow › "Review" › "Setup",
  tick "Include a secure link in the email invitation to reviewers."
  and press "Save".

1. As `dbarnes`, open submission 10, "Condensing Water Availability
   Models to Focus on Specific Water Management Systems" (OMP: 15,
   "Expansive Discourses: Urban Sprawl in Calgary, 1945-1978").
2. Press "Add Reviewer", search for "Sabine Kumar" (OMP: "Catherine
   Turner"), press "Select Reviewer", then "Add Reviewer".
   `skumar@mailinator.com` (OMP: `cturner@mailinator.com`) receives
   "Invitation to review" (OMP: "Manuscript Review Request").
3. On the reviewer's row, open "More Actions" › "Edit", pick yesterday
   as "Response Due Date" and press "OK". Reload the page: the row
   reads "Overdue" and offers "Send Reminder".
4. In a browser that is not signed in, open the request email's link.
   The review opens on "1. Request", signed in as the reviewer.
5. As `dbarnes`, press the row's "Send Reminder". When the "Review
   Reminder" window has opened, press "Cancel".
6. In a browser that is not signed in, open the request email's link
   again.

**Expected**: the review opens on "1. Request", as in step 4. Nothing
was sent, so nothing changed for the reviewer.

**Observed**: the link answers HTTP 404. The page has no title, no
stylesheet, and nothing but this heading:

```
404 Not Found
```

The reviewer's mailbox holds no email newer than the notice of step 3
("Your review assignment has been changed for Journal of Public
Knowledge"), which carries the plain review address and no link of its
own.

Control: pressing "Send Reminder" in the window sends "A reminder to
please complete your review", whose own link opens the review.

## Cause

`PKP\mail\mailables\ReviewRemind::setData()` (lib/pkp
`classes/mail/mailables/ReviewRemind.php`, line 64) calls
`setOneClickAccessUrl()`. That method, in the trait
`PKP\mail\traits\OneClickReviewerAccess`, creates a new
`ReviewerAccessInvite` and calls its `invite()`. So every read of the
reminder's data mints an access link, and `Mailable::getData()` calls
`setData()` each time.

`Invitation::invite()` ends by deleting the reviewer's other pending
access invitations. So minting a link deletes the one the reviewer
holds. That is meant for a link that is mailed. Here it runs for a
preview. The deletion also reaches too far, which is
[the report on a second request](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U28-A9-reviewer-link-dead-after-second-request.md).

The window reads the data to show the email:
`ReviewReminderForm::initData()` (lib/pkp
`controllers/grid/users/reviewer/form/ReviewReminderForm.php`, line 90)
calls `$mailable->getData()`, then replaces the link with the
placeholder `{$reviewAssignmentUrl}` so the editor does not see it.

On main two more reads follow. `getEmailTemplates()` (line 247) reads
the data again for the template list as the window opens. And
`PKPReviewerGridHandler::fetchReviewerActionTemplateBody()` (lib/pkp
`classes/controllers/grid/users/reviewer/PKPReviewerGridHandler.php`,
line 984) calls `getData()` on a new `ReviewRemind` each time the
editor chooses another template in the window.

On 3.4 the same `setData()` created a new access key on each read
(`AccessKeyManager::createKey()`), which deleted nothing: wasteful, but
the earlier links went on working. The introducing change moved the
links to invitations, where a new one replaces the earlier ones.

Reach:

- The window opened and cancelled: walked on OJS and OMP, main and 3.5.
  The scripted runs of the Steps also read the `invitations` table:
  when the window opens, the reviewer's row is gone and a new one is
  there. Main mints two, the second deleting the first; 3.5 mints one.
- A change of template in the open window (main only): read in the
  code, not walked.
- The window closed by "Close" or by leaving the page is the same
  request; read in the code.
- Until the second-request report's fix is in, opening the window on
  one review also deletes the reviewer's links for their other
  reviews in the journal. Read in the code.
- `ReviewRemindAuto` and `ReviewResponseRemindAuto` mint in `setData()`
  the same way. They are built only by `jobs/email/ReviewReminder`,
  which sends them at once, and no screen previews them. Read in the
  code.
- The request email mints its link in the sender,
  `EditorAction::createMail()`, not in the mailable's data. It has no
  such fault.
- Since the fix for `pkp/pkp-lib#11154`,
  `PKP\log\Repository::logMailable()` reads the mailable's `viewData`
  and no longer mints.

## Proposed fix

Mint the reminder's link where the reminder is sent, as the request
email does, and not where its data is read
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reminder-window-kills-reviewer-link/fix.diff)):

```diff
 // classes/mail/mailables/ReviewRemind.php
+    public function addOneClickAccessUrl(): void
+    {
+        $this->setOneClickAccessUrl($this->context, $this->reviewAssignment);
+    }
+
     public function setData(?string $locale = null): void
     {
         parent::setData($locale);
 
-        $this->setOneClickAccessUrl($this->context, $this->reviewAssignment);
-
         // See pkp/pkp-lib#9111

 // controllers/grid/users/reviewer/form/ReviewReminderForm.php, execute()
             ->subject($template->getLocalizedData('subject'))
             ->body($this->getData('message'));
 
+        // The reviewer's one-click access link is created only now that the reminder is sent
+        $mailable->addOneClickAccessUrl();
+
         // Finally, send email and handle Symfony transport exceptions
```

`EditorAction::createMail()` already does this for the request: it
mints the invitation and calls `updateMailableWithUrl()` right before
the send. With the minting out of `setData()`, none of the three reads
mints any more, and the window's preview keeps its placeholder. This
is a proposal.

`updateMailableWithUrl()` registers the link through
`Mailable::buildViewDataUsing()`. That method is static: it sets one
callback for every mailable in the process, in place of the one
`PKP\mail\Mailable::setupVariables()` set. The callback's data is
merged over `viewData` when an email is built, so the `setData()` that
`Mailer::send()` runs does not overwrite the link. The fix registers
it at the send, as today's code does, so it changes nothing there.

The fix was tried on main, on OJS and OMP. After the window is opened
and cancelled, the request email's link still opens the review, and the
reviewer's invitation is the same row. A reminder that is sent still
mails a link of its own, which opens the review. A further check shows
the fix changes nothing with the setting off: with it and without it,
the request and the reminder carry the plain review address, which
asks a signed-out browser to sign in.

**Alternatives**:

- Keep the minting in `setData()` and have the form build the preview
  without it (a flag on the mailable). The side effect stays in a
  method every reader calls, so the next reader brings the fault back,
  as the email log did in `pkp/pkp-lib#11154`.
- Mint in `Mailable::build()`, which runs only for a send. The email
  log renders a clone of the mailable, which builds it again and would
  mint a second link after the first was mailed; `pkp/pkp-lib#11154`
  names that.

**What goes with it**:

- `jobs/email/ReviewReminder::handle()` builds an invitation of its own
  before it sends an automatic reminder, without a
  `reviewAssignmentId`, so its `invite()` fails the validation and
  mints nothing; the mailable's `setData()` mints the one that is
  mailed. Moving that job to one `addOneClickAccessUrl()`
  on each mailable would give all three reminders the same shape. In
  a queue worker the static callback stays set for the mailables built
  later in the process (`pkp/pkp-lib#13183`, open, is about that
  callback). The job has that today, so the move neither adds nor
  removes it. Read in the code, not tried.
- On `stable-3_5_0`, `ReviewRemind.php` is the same. In `execute()`
  the chain goes on after `->body()` with
  `->sender($user)->recipients([$reviewer]);`, so the diff's second
  hunk does not match. `git apply` refuses it; `patch` places it by
  fuzz after `->recipients([$reviewer]);`, which is where the call
  belongs. That was a dry run on a copy, not tried on an install.
- No data repair: a reminder mints a new link.
- Guard: a unit test that calls `getData()` on a `ReviewRemind` for a
  context with the setting on and finds no new row in `invitations`;
  that covers the three reads.
  The U28 spec's e2e scenario "One-click access" should also open the
  request link after the "Review Reminder" window was opened and
  cancelled.

Small: two short changes in one repo, following the request email's
pattern, and a unit test.

## Evidence

- The script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reminder-window-kills-reviewer-link/walk.js)
  takes the Steps and the control on OJS and OMP; its helpers are in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-link-dead-after-second-request/lib.js).
  Run it as
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/reminder-window-kills-reviewer-link/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). With
  `WALK_MODE=neighbour` it runs only the further check of the Proposed
  fix, with the setting left off.
- After the control's reminder is sent, the request email's link
  answers "404 Not Found" with and without the fix: the reminder's
  link replaced it. Which page a replaced link shows is
  [the report on replaced invitation links](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U06-A3-replaced-invitation-links-not-found.md).
- No request failed on the server and no page script failed in any
  walk. The only console error is the 404 answer itself. The walks ran
  on PostgreSQL; the fault involves no database-specific query.
- Datasets: pkp/datasets e8dafbc (2026-10-02), `main` and
  `stable-3_5_0`.
- Branch tips:
  - `main`: OJS b84f8e2e44, OMP 3b0ecf794. pkp-lib ddd8ab243a (OJS) and
    3dc90c81a6 (OMP); `ReviewRemind` and `ReviewReminderForm` are the
    same in both.
  - 3.5: OJS 091fb65453, OMP 9c5e24246; pkp-lib cf3f984335.
  - 3.4: OJS 75cc2d488b, OMP 0aec65441; pkp-lib 6f96165c90.
  - 3.3: OJS ac77c9fb35, OMP 8e72fc883; pkp-lib 4156e50233.
- Code reads, version by version:
  - 3.5: the same `ReviewRemind::setData()` and trait;
    `ReviewReminderForm::initData()` calls `getData()` once, and the
    window has no template list.
  - 3.4: `ReviewRemind::setData()` calls the trait, which calls
    `AccessKeyManager::createKey()`; that inserts a key and deletes
    nothing.
  - 3.3: `ReviewReminderForm::execute()` creates the key when the
    reminder is sent; the window's `initData()` creates none.
- Introduced, the trace: the call in `setData()` blames to
  [ad24e2676d](https://github.com/pkp/pkp-lib/commit/ad24e2676d0)
  (2023-02-20), harmless while a new key left the earlier ones alone.
  7e3a26ea83 made the trait call `invite()` and added the deletion to
  `invite()`; its parent's `invite()` deleted nothing. The second read
  on main, in `getEmailTemplates()`, blames to
  [24c461510f](https://github.com/pkp/pkp-lib/commit/24c461510fd)
  (2026-02-17), and the third, in `fetchReviewerActionTemplateBody()`,
  to [a629da8a99](https://github.com/pkp/pkp-lib/commit/a629da8a99d)
  (2026-07-08).
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ui-library were
  searched, issues and PRs. `pkp/pkp-lib#11154` describes the mechanism
  ("the mailable is reconstructed … recreating the invitation") for the
  email log's read after a send, fixed in 2025-04 by reading
  `viewData`. Nothing found names the window opened without a send.
- The password fact of the Way round, read in the code:
  `CreateReviewerForm::execute()` ("Create New Reviewer") generates a
  password, mails it with the registration email unless the form's
  `skipEmail` box is ticked, and makes the reviewer change it at the
  first sign-in.
