# After a manager edits or re-sends a role invitation, the earlier email's links open a bare "404 Not Found"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; no "Invite to a role")
  - 3.3: none (code; no "Invite to a role")
- **Introduced** `pkp/pkp-lib#10472` for `pkp/pkp-lib#10459` · [7e3a26ea83](https://github.com/pkp/pkp-lib/commit/7e3a26ea83db5428a8747b7dba574259e749cf98) · 2024-09-26 · Dimitris Efstathiou (defstat)
- **Upstream** none found (2026-10-02); a comment on `pkp/pkp-lib#12608` (closed) reports the 404 for a reviewer's link after a reminder and is answered as a design decision (Evidence)
- **Tracked in** spec U06 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U06-user-invitations.md#a3) · spec U28 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U28-reviewers-review.md#a9)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager can change a pending role invitation from Users & Roles in
two ways: "Edit" on its row in the "Invitations" table, or sending a new
invitation to the same person. Either way the app withdraws the pending
invitation and emails a new one. The second send gives no hint that an
invitation is already pending. Only the newest email's links work.
Every earlier email's accept and decline links open a bare page
reading only "404 Not Found", with no journal header, no styling and
nothing to press.

An invitation that was cancelled, declined or ran out gets the
journal's own "Invitation Unavailable" page instead. That page says the
invitation is no longer available and offers "Login" and "Register".
Nothing is lost, since the newest email works. The proposed fix gives
withdrawn invitations that same page, using one status change in shared
code.

The same code withdraws the app's other emailed invitations in the same
way: reviewer one-click access, account validation and email change.

## Impact

- **Lost**: nothing, as long as the person finds the newest email.
- **Who**: everyone whose pending role invitation a manager edits or
  sends again, when they open an earlier email. "Edit" always withdraws
  the invitation, so every edit leaves such an email behind.
- **Way round**: open the newest invitation email. The 404 page does
  not point to it.

Low: the outcome is right; only the page shown for a dead link is the
wrong one.

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main`. OMP and OPS are the same with the
  names and roles given in brackets.

Editing:

1. Sign in as `rvaca` and open Settings › "Users & Roles".
2. Press "Invite to a role", type `ddiouf@mailinator.com` (OMP:
   `dkennepohl@mailinator.com`) and press "Search User".
3. In the role row choose "Copyeditor" (OPS: "Moderator"), today as
   Start Date and either masthead choice. Press "Save And Continue",
   then "Invite user to the role", then "View All Users".
4. In the "Invitations" table, open the menu ("Invitation management
   options") on that person's row and choose "Edit". The dialog "Edit
   Invitation" says "If you edit the existing invitation or add a new
   role, the current invitation will be canceled and, a new one will be
   sent. Are you sure you want to proceed?" Press "Edit Invitation".
5. The wizard opens prefilled. Replace the prefilled role with "Layout
   Editor" (OPS: "Editorial Board Member"), then press "Save And
   Continue", "Invite user to the role" and "View All Users".
6. The person now has two emails "You are invited to new roles". In a
   browser that is not signed in, open the first email's accept link,
   then its decline link.

Re-sending:

7. As `rvaca`, invite `dphillips@mailinator.com` (OMP:
   `fperini@mailinator.com`) to "Copyeditor" (OPS: "Moderator") as in
   steps 2–3.
8. Invite the same address to the same role again, the same way.
9. Not signed in, open the first email's accept link.

**Expected**: the earlier email's links (steps 6 and 9) open the
"Invitation Unavailable" page, as a cancelled invitation's link does:

```
Invitation Unavailable
This invitation is no longer available. It may have already been accepted, declined, or expired. Please contact the journal manager for further assistance.
[Login] [Register]
```

**Observed**: both links of step 6 and the link of step 9 answer HTTP
404. The page has no title, no stylesheet, and nothing but this heading:

```
404 Not Found
```

In both paths, the newest email's accept link opens the accept wizard
("STEP 1 - Review & create account", "Accept And Continue to OJS").
Control: take an invitation to `eostrom@mailinator.com` (OMP:
`jbrower@mailinator.com`) and cancel it through the row menu's "Cancel
Invite" › "Cancel Invitation". Its accept link shows "Invitation
Unavailable".

## Cause

`PKP\invitation\core\Invitation::invite()` is in lib/pkp
`classes/invitation/core/Invitation.php`, and its query ends at line
332. Once the new invitation is sent, it deletes every other `PENDING`
invitation of the same type for the same user (or email) and context:

```php
InvitationModel::byStatus(InvitationStatus::PENDING)
    ->byType($this->getType())
    ->byNotId($this->getId())
    ->when(…byUserId…)->when(…byEmail…)->when(…byContextId…)
    ->delete();
```

"Edit" goes through the same path. The send wizard (ui-library
`UserInvitationPageStore.js`) starts with no invitation id even in edit
mode. So it creates a new invitation (`POST
invitations/add/userRoleAssignment`, then `…/invite`), and `invite()`
deletes the edited one.

`PKP\pages\invitation\InvitationHandler::getInvitationByKey()` shows
"Invitation Unavailable" only when two things hold: the invitation's
row still exists (`Repo::invitation()->getById($id)`), and the key in
the link matches it (`password_verify`). Anything else raises
`NotFoundHttpException`, which `PKPApplication` answers with the bare
`<h1>404 Not Found</h1>`. The friendly page was added later, in
[6bfd654c02](https://github.com/pkp/pkp-lib/commit/6bfd654c021c0c0d26133efaaaaf13e456aeef98)
for `pkp/pkp-lib#12332`; `pkp/pkp-lib#12208` asked for it for used and
expired links. Cancelling and declining keep the row and only change its
status, so their links reach the friendly page. A replaced invitation's
row is gone, so its correct link is treated like a tampered one.

The deletion keeps one live invitation per person, so an older email can
no longer grant roles. Changing the old row's status does that just as
well, because every reader of live invitations filters on `PENDING`
(`stillActive()`/`notHandled()`). Those readers are:

- the invitations list API;
- the profile's pending email change;
- `getAccessInvitation()`;
- `getByIdAndKey()` and `getByKey()`.

Reach:

- Role invitations, through "Edit" and through a new send to the same
  person: walked on OJS, OMP and OPS, on main and 3.5.
- Reviewer one-click access, on a journal or press with Settings ›
  Workflow › Review › "Include a secure link in the email invitation
  to reviewers." on (`reviewerAccessKeysEnabled`): walked on OJS and
  OMP, main and 3.5. An editor's "Send Reminder" mails a new access
  link, which replaces the one in the request email. That link then
  answers the bare "404 Not Found", while the link of a submitted or
  declined review shows "Invitation Unavailable".
- Registration validation and the profile's email change go through
  the same `invite()`, so a replaced email of theirs gets the same bare
  404. Read in the code, not walked, with or without the fix.
- A reviewer's access link is also replaced when it should not be:
  by a request to the same reviewer on another submission of the
  journal
  ([its report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U28-A9-reviewer-link-dead-after-second-request.md),
  `pkp/pkp-lib#11154`), and by opening the "Send Reminder" window
  without sending
  ([its report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U28-A9-reminder-window-kills-reviewer-link.md)).
  Those are faults of their own and not this report's. With this
  report's fix in, such a wrongly withdrawn link shows "Invitation
  Unavailable" instead of a 404, which looks deliberate. So both still
  need their own fixes.
- Rows already deleted cannot be brought back, and their links stay
  404. The daily cleanup (`RemoveExpiredInvitationsJob`) deletes every
  invitation past its deadline, whatever its status. So any old link,
  a cancelled invitation's included, turns into a 404 after that. That
  is a separate choice about how long invitations are kept, and this
  report leaves it alone.

## Proposed fix

In `Invitation::invite()`, cancel the earlier invitations instead of
deleting them
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/replaced-invitation-links-not-found/fix.diff)):

```diff
-        InvitationModel::byStatus(InvitationStatus::PENDING)
+        $superseded = InvitationModel::byStatus(InvitationStatus::PENDING)
             ->byType($this->getType())
             ->byNotId($this->getId())
             …
-            ->delete();
+            ->get();
+
+        foreach ($superseded as $earlier) {
+            $earlier->markAs(InvitationStatus::CANCELLED);
+        }
```

A withdrawn invitation then looks exactly like a cancelled one:

- it leaves the "Invitations" table;
- `getByIdAndKey()` refuses it;
- the existing fallback in `InvitationHandler` answers its links with
  "Invitation Unavailable".

It also makes the record match what the "Edit Invitation" dialog
already tells the manager ("the current invitation will be canceled").
`markAs()` is how each kind's `finalize()` already changes a status.
Saving each model, rather than running one bulk update, keeps the model
events. On main, the invitation audit trail
(`InvitationModel::booted()`) then records each cancellation, where the
deletion recorded nothing.

The fix was tried on main, on OJS, OMP and OPS. The earlier email's
accept and decline links show "Invitation Unavailable" in both paths,
and the newest email still opens the accept wizard. On OJS and OMP, a
reviewer's request link replaced by a reminder shows "Invitation
Unavailable" too, and the reminder's link opens the review. Two further checks
gave the same result with and without the fix. They ran with an
earlier form of the diff, which did the same through
`Collection::each()`. That form was dropped because `each()` stops at
the first `markAs()` that returns false. The checks were:

- after an invitation to a second person, the first person's link still
  opens the accept wizard;
- a link with one character of its key changed still answers "404 Not
  Found".

**Alternatives**:

- Show a page of its own for a replaced invitation ("This invitation
  was replaced by a newer one; please use the latest email"). This
  needs a way to tell a replaced row from a cancelled one. One way is a
  new status such as `SUPERSEDED`, which needs an upgrade migration,
  since the `status` column is a database enum. The other is a marker
  in the payload. It is left out because the generic page already gives
  the person a way on, and the wording is a product choice the team may
  want to make first.
- Show "Invitation Unavailable" for every link that finds no row. A
  tampered or guessed link would then get the same page as a real one.
  Not recommended.
- Fix it in the edit path only, by cancelling the edited invitation
  before the wizard sends the new one. This leaves the plain re-send
  and the other invitation kinds with the 404.

**What goes with it**:

- Two readers do not filter on status, so a withdrawn invitation's id
  now finds a row there, as a cancelled one's does today. Both were
  read in the code and not walked:
  - The invitation API's `InvitationController::authorize()` reads the
    id with `InvitationModel::find()` for `get`, `populate`, `invite`,
    `getMailable` and `cancel`. A request for a withdrawn id is still
    refused, but the message changes from "Invitation not found" to
    "This action is not allowed".
  - The manager's wizard address `invitation/edit/<id>`
    (`InitializeInvitationUIHandler::edit()`) does not check the
    status. A withdrawn invitation can therefore still be opened there
    until the cleanup removes it. Sending from it creates a new
    invitation, as "Edit" does.
- Until the "Send Reminder" window stops minting access links when it
  opens (its report, linked in the Cause), each opening leaves
  cancelled rows behind, two on main, where it left none before. The
  daily cleanup removes them once they pass their deadline. Seen in
  the reviewer walk with the fix in.
- PR `pkp/pkp-lib#13259` rewrites the same statement. It collects the
  rows through a new `getInvitationsToDelete()` and deletes them by id.
  If that PR merges first, its delete-by-id becomes the same
  `markAs(InvitationStatus::CANCELLED)` loop. If this fix merges first,
  the PR changes its delete the same way.
- The fix applies as written to `stable-3_5_0` (one line of offset).
- Guard: a new unit test. There is no invitation test under
  `lib/pkp/tests` to extend. The test sends two invitations to the same
  person and finds the first `CANCELLED`, with mail faked, since
  `invite()` sends the email before it runs the query. The U06 spec's
  e2e scenario "edit = replace" should also assert "Invitation
  Unavailable" on the earlier email's link. Today it only asserts that
  the link no longer opens the wizard.

Small: this is a proposal, and the change itself is one statement in
one shared class. The new unit test, with its mail fake, is the larger
part, still within a couple of hours.

## Evidence

- The script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/replaced-invitation-links-not-found/walk.js)
  takes the Steps, plus the cancelled control, on OJS, OMP and OPS. Its
  helpers are in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/replaced-invitation-links-not-found/lib.js),
  and it sends invitations through
  [invitation-sent-promises-decision-updates/lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/invitation-sent-promises-decision-updates/lib.js).
  Run it as
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/replaced-invitation-links-not-found/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). With
  `WALK_MODE=neighbour` it runs only the two further checks of the
  Proposed fix.
- The reviewer-link reach was walked by
  [reminder-window-kills-reviewer-link/walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reminder-window-kills-reviewer-link/walk.js)
  on OJS and OMP (a preprint server has no review), run the same way:
  its last step opens a request email's link after a reminder was sent.
- No request failed on the server and no page script failed in any
  walk. The only console errors in the browser are the 404 answers
  themselves. The walks ran on PostgreSQL; the fault involves no
  database-specific query.
- Datasets: pkp/datasets 3788b55 (2026-10-02), `main` and
  `stable-3_5_0`.
- Branch tips:
  - `main`: OJS b84f8e2e44, OMP 3b0ecf794, OPS c8af945bb7. pkp-lib
    ddd8ab243a (OJS) and 3dc90c81a6 (OMP, OPS); `invite()` and
    `InvitationHandler` are the same in both. ui-library 64d67363 (OJS)
    and 280f98c5 (OMP, OPS).
  - 3.5: OJS 091fb65453, OMP 9c5e24246, OPS 38b61882d3; pkp-lib
    cf3f984335; ui-library d4e01883.
  - 3.4: OJS 75cc2d488b, OMP 0aec65441, OPS acd8ae704b; pkp-lib
    32b0f4b4af.
  - 3.3: OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161; pkp-lib
    f6ab331645.
- Code reads, version by version:
  - 3.5 has the same `invite()` and the same friendly-page fallback
    (5d47a2e13c and 1e077663e2 for `pkp/pkp-lib#12332`), and no audit
    hook on `InvitationModel`.
  - pkp-lib's `stable-3_4_0` and `stable-3_3_0` have no
    `classes/invitation/` and no `pages/invitation/`.
- Introduced, the trace: the parent of 7e3a26ea83 had an `invite()`
  that deleted nothing. In `getInvitationByKey()`, the fallback also
  blames to 4d9ec3cbd0 (2026-09-16, `pkp/pkp-lib#13181`), which made the
  page use the invitation's journal rather than the request's.
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/ui-library were searched, both
  issues and PRs. Two pkp issues came closest, and neither covers this
  fault:
  - `pkp/pkp-lib#12208` (closed) asked for the friendly page for used
    and expired links, and does not mention replaced ones.
  - `pkp/pkp-lib#11154` (open), with PR `pkp/pkp-lib#13259`, is about
    which reviewer-access invitations the same deletion reaches.
  - On `pkp/pkp-lib#12608` (closed, about a reviewer's link dying on
    its first use), a tester's comment of 2026-04-29 notes that after a
    reminder the former link shows "a 404 error and not the standard
    3.5.0.4 link expired page". The answer of 2026-04-30 calls it a
    design decision: a replaced invitation is deleted, not marked
    expired, "so it is not considered a malfunction". No issue tracks
    it.
- Unverified: the audit entry the fix adds on main was read in the code
  and not looked at.
