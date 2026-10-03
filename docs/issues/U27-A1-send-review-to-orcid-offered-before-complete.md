# A reviewer's row offers "Send Review To ORCID" before the review is submitted, and pressing it does nothing

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: none (code; no "Send Review To ORCID")
  - 3.3: none (code; no "Send Review To ORCID")
- **Introduced** `pkp/ui-library#473` for `pkp/pkp-lib#10744` · [48887248d0](https://github.com/pkp/ui-library/commit/48887248d0207a9cf2878f13715413ce6e9f2206) · 2024-12-31 · Taslan Graham (taslangraham)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U27 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U27-reviewer-assignment-and-management.md#a1) · spec U04 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U04-orcid-integration.md#a1), its offer before completion
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

A reviewer row whose reviewer has an authenticated ORCID iD shows "Send
Review To ORCID" in its menu in every state, including before the
reviewer has even responded. The action only makes sense for a
completed review.

The entry shows on declined and cancelled requests too, which will
never have a review. Pressed early, it asks "Send this review to the
reviewer's ORCID?", and "OK" closes the question with no message;
nothing is sent, and nothing says so.

Once the review is submitted, the entry starts the deposit on a journal
that uses ORCID's member API, which also sends a confirmed review on its
own. A press never sends reviews to ORCID, so there the entry does
nothing in any state. The fix is one condition on the menu entry.

## Impact

- **Lost**: nothing. Pressing the entry early sends nothing, and a
  journal that sends reviews to ORCID sends the review when the editor
  confirms it, without the entry.
- **Who**: editors on the row of any reviewer who connected their iD
  through ORCID's sign-in, on a journal or press, before the review is
  submitted.
- **Way round**: none needed; the editor can ignore the entry until the
  review is in.

Low: a menu entry offered where it does nothing, while the deposit
itself happens when it should.

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main`. OMP is the same with the names given
  in brackets.
- Julie Janssen (`jjanssen`) [OMP: Paul Hudson, `phudson`] has connected
  her [OMP: his] ORCID iD through ORCID's sign-in. ORCID's own service
  creates that state; on a test install without it, this SQL
  (PostgreSQL; MySQL not checked) writes what the app stores when the
  sign-in completes. On OMP, put `'phudson'` in the last line:

  ```sql
  insert into user_settings (user_id, locale, setting_name, setting_value)
  select u.user_id, '', s.name, s.value from users u, (values
    ('orcid', 'https://sandbox.orcid.org/0000-0002-1825-0097'),
    ('orcidIsVerified', '1'),
    ('orcidAccessToken', 'an-access-token-from-orcid'),
    ('orcidAccessScope', '/activities/update'),
    ('orcidRefreshToken', 'a-refresh-token-from-orcid'),
    ('orcidAccessExpiresOn', '2046-10-03 12:00:00')
  ) as s(name, value) where u.username = 'jjanssen';
  ```

1. Sign in as `dbarnes` and open submission 12, "Sodium butyrate
   improves growth performance of weaned piglets during the first period
   after weaning" [OMP: 17, "Open Development: Networked Innovations in
   International Development"]. Julie Janssen's [OMP: Paul Hudson's] row
   in "Reviewers" reads "Request Sent": she has not responded.
2. Open that row's "More Actions".
3. Press "Send Review To ORCID", then "OK".
4. Control: open "More Actions" on Paul Hudson's [OMP: Julie Janssen's]
   row, whose reviewer has no iD.
5. Open submission 13, "Hydrologic Connectivity in the Edwards Aquifer
   between San Marcos Springs and Barton Springs during 2009 Drought
   Conditions" [OMP: 12, "Connecting ICTs to Development"], where the
   same reviewer's review is completed, and open her [OMP: his] row's
   "More Actions".

**Expected**: step 2's menu has no "Send Review To ORCID", since there is
no review to send; step 5's menu has it.

**Observed**: step 2's menu ends with "Send Review To ORCID":

```
Review Details · Edit · Unassign Reviewer · Email Reviewer · History ·
Login As · Editorial Notes · Log Response · Send Review To ORCID
```

In step 3 the question "Send this review to the reviewer's ORCID?" with
"OK" and "Cancel" closes on "OK", and no message of any kind follows;
the request behind it, `POST
/index.php/publicknowledge/api/v1/reviews/12/17/sendToOrcid` [OMP:
`reviews/17/25/sendToOrcid`], answers 200 with `[]`. Step 4's menu has
no such entry, and step 5's ends with it, on a row reading "Reviewer
Thanked" [OMP: "Review Submitted"].

## Cause

The menu is built by `getItemActions()` in ui-library
`src/managers/ReviewerManager/useReviewerManagerConfig.js`. Its ORCID
entry is shown when (lines 380–383):

```js
if (
	reviewAssignment.reviewerHasOrcid &&
	pkp.const.REVIEW_ASSIGNMENT_STATUS_COMPLETE
) {
```

The second operand is the constant itself (8), not a comparison with
the row's status, so it is always true. The entry then depends on
`reviewerHasOrcid` alone, which lib/pkp `PKP\submission\maps\Schema`
(line 699) sets from the reviewer's `orcidIsVerified`, a per-user,
site-wide setting; the journal's own ORCID settings are not read.

"OK" posts to `reviews/{submissionId}/{reviewAssignmentId}/sendToOrcid`
(`PKPReviewController::sendToOrcid()`), which calls the app's
`SendReviewToOrcid` and answers `[]` with 200 whatever happens next. On
OJS the deposit job, `DepositOrcidReview::handle()` (OJS
`jobs/orcid/DepositOrcidReview.php`), returns at line 50 for a review
whose status is not in `ReviewAssignment::REVIEW_COMPLETE_STATUSES`
(submitted, viewed, confirmed, thanked), and at lines 62–72 when ORCID
is off for the journal, the member API is not on, or no city and country
are set. On OMP, `SendReviewToOrcid` is the empty base
`PKPSendReviewToOrcid::execute()`, so a press never deposits a review.

Reach:

- Every state of a row: request sent, response
  overdue, accepted, review overdue, declined, request resent and
  cancelled. Walked on the unanswered row; the others read in the code,
  since the condition ignores the status.
- A journal sends a submitted review without the entry when the editor
  confirms it (`PKPReviewerGridHandler::reviewRead()`,
  `ReviewAssignmentController::markReviewConsidered()`) and at
  publication (`PKPSendSubmissionToOrcid::depositReviewsForSubmission()`),
  under the same member-API conditions. `VerifyIdentityWithOrcid`
  deposits a review only when a reviewer answers the member-scope
  request a deposit attempt sent.
- No other condition in ui-library `src` uses a bare `pkp.const` value
  as a test.

## Proposed fix

Compare the row's status with the statuses the deposit accepts
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/send-review-to-orcid-offered-before-complete/fix.diff),
ui-library only, the same for OJS and OMP):

```diff
-		// ORCID reviewer deposit
+		// ORCID reviewer deposit: only a submitted review can be deposited
+		// (ReviewAssignment::REVIEW_COMPLETE_STATUSES, as DepositOrcidReview checks)
 		if (
 			reviewAssignment.reviewerHasOrcid &&
-			pkp.const.REVIEW_ASSIGNMENT_STATUS_COMPLETE
+			[
+				pkp.const.REVIEW_ASSIGNMENT_STATUS_RECEIVED,
+				pkp.const.REVIEW_ASSIGNMENT_STATUS_VIEWED,
+				pkp.const.REVIEW_ASSIGNMENT_STATUS_COMPLETE,
+				pkp.const.REVIEW_ASSIGNMENT_STATUS_THANKED,
+			].includes(reviewAssignmentStatusId)
 		) {
```

The same file already tests these four statuses this way in the
`redactedForAuthors` branch of `getItemPrimaryActions()` (lines
234–241), and the dashboard page sets all four constants.

The fix ends the offer on requests that have no review. It does not end
the offer where the server sends nothing for a submitted review either:
on a press, on a journal with ORCID off, and on a journal on the public
API, the entry stays on a completed row and pressing it still does
nothing, with no message. Ending those needs the server to say whether
a deposit is possible (see Alternatives); that is a decision for the
team.

Tried on `main`, on the journal and the press, with the JavaScript
rebuilt. With the diff applied, step 2's menu ended at "Log Response",
with no "Send Review To ORCID", and the completed review's menu in step
5 ("Reviewer Thanked" [OMP: "Review Submitted"]) still offered it, as it
did with the fix out.

How this was settled:

- **Where the rule lives.** On the server, in
  `REVIEW_COMPLETE_STATUSES`; the menu repeats the list, as its other
  status checks do.
- **How the code base does it.** The `redactedForAuthors` branch above.
- **What the introducing change was for.** Sending a completed review
  on request (`pkp/pkp-lib#10744`); the fix keeps the entry for every
  submitted state, "Review Submitted" included.
- **What it touches.** The menu only. No API, hook or stored data
  changes. It applies as written to 3.5.
- **The test.** A ui-library unit test of `getItemActions()` for an
  unanswered and a completed row of a reviewer with an iD, or the e2e
  step in spec U04, Scenario 9.

**Alternatives**

- A flag from the server: `PKP\submission\maps\Schema` adds, beside
  `reviewerHasOrcid`, whether this app deposits reviews and the context
  has ORCID on with the member API, and the menu reads it with the
  status. That also hides the entry on a press and on public-API
  journals; it is a larger change across pkp-lib, the app and
  ui-library.
- Refuse the request in `PKPReviewController::sendToOrcid()` for an
  incomplete review: gives a script an answer that says so, but leaves
  the entry offered.
- Compare with `REVIEW_ASSIGNMENT_STATUS_COMPLETE` alone, as the
  constant's name in the condition suggests was meant: hides the entry
  on a submitted review the editor has not confirmed and on a thanked
  one, which the deposit accepts.

Small: one condition in one ui-library file, tried.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/send-review-to-orcid-offered-before-complete/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/send-review-to-orcid-offered-before-complete/walk.js)
  (helpers in
  [`../reviewer-response-erases-reminder-history/lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-response-erases-reminder-history/lib.js))
  takes the preconditions and Steps on a journal and a press loaded from
  the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/send-review-to-orcid-offered-before-complete/walk.js`;
  with `WALK_MODE=neighbour` it takes the preconditions and step 5 only,
  for the fix trial. The script also turns ORCID on first (Settings ›
  Users & Roles › "ORCID", Member Sandbox, placeholder credentials),
  which the menu does not depend on.
- `fix.diff` paths start at the app root (`a/lib/ui-library/…`); in a
  ui-library clone apply it with `-p3`.
- The SQL precondition writes what `AuthorizeUserData::getOrcidOAuthAccessData()`
  (lib/pkp `classes/orcid/actions/AuthorizeUserData.php`) builds and
  `HasOrcid::setVerifiedOrcidOAuthData()` stores for a signed-in user
  (no locale; `orcidAccessDenied` null, so not stored); the scope is
  `OrcidManager::ORCID_API_SCOPE_MEMBER`. The token strings stand in for
  ORCID's.
- Walked on `main` and `stable-3_5_0`, OJS and OMP, PostgreSQL, the
  default datasets of pkp/datasets e8dafbc (2026-10-02). On 3.5 the
  ui-library has the same condition (line 386).
- Branch tips: main OJS ff004d0973 (lib/ui-library 64d6736318), OMP
  3b0ecf794c (lib/ui-library 280f98c570); 3.5 OJS c1cee76b95, OMP
  9c5e24246c (lib/ui-library d4e0188353); 3.4 OJS d68934d0d1, OMP
  0aec65441f (lib/pkp 767353f4fe); 3.3 OJS ac77c9fb35, OMP 8e72fc8836
  (lib/pkp ac3fa73402).
- 3.4 and 3.3 (code): neither lib/pkp nor lib/ui-library has the entry
  or `sendToOrcid`; on 3.4 the ORCID Profile plugin
  (`plugins/generic/orcidProfile` at 894c2593e0) deposits a review when
  the editor thanks the reviewer (`handleThankReviewer()`), with no menu
  entry.
- Introduced: `git log -S'reviewerHasOrcid'` in lib/ui-library gives
  48887248d0 (adds the condition) and 41d07ae95 (moves it from
  `useReviewerManagerActions.js` unchanged).
- Not walked: a deposit from the entry on a completed review (it needs
  ORCID's service), and a journal with ORCID off on a multi-journal
  site (read in the code).
