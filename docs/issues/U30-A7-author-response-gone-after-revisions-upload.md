# Author who uploads revisions first can no longer respond to the reviewers, as the decision email asks

- **Severity** medium
- **Effort** small
- **Kind** intention gap
- **Affects**
  - main: OJS (a press shows no "Author Response" card at all: its own report, spec U30 OMP1)
  - 3.5: none (read in the code, not walked; no author response feature)
  - 3.4: none (read in the code, not walked; the same)
  - 3.3: none (read in the code, not walked; the same)
- **Introduced** `pkp/pkp-lib#12207` and `pkp/ui-library#767` for `pkp/pkp-lib#12048` · [3dff6a7b6e](https://github.com/pkp/pkp-lib/commit/3dff6a7b6e1a51e40849562ee24a5a16b3824be4), [8d29739f](https://github.com/pkp/ui-library/commit/8d29739f60c4f2fd21417a8c68f74e42efed8cbf) · 2026-01-23 · Taslan A. Graham (taslangraham)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U30 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U30-author-response-to-reviews.md#a7)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

An author asked for revisions gets an email that asks them both to
respond to the reviewers ("Submit Author Response") and to upload their
revised files, in no set order. If they upload the revised file first,
the round's "Author Response" card disappears. The email's button then
opens the round with no card and no response form, so the response the
email asked for cannot be written.

The only way back is for an editor to send a separate "Request
Response", and the round's "Author Response" table still reads "Ready to
invite author", as if the author had never been asked.

No setting turns author responses on or off, so every OJS journal on
`main` meets this.

## Impact

- **Lost**: a response the author never gets to write (no typed draft
  is deleted). Once the card is gone, nothing tells the author a
  response is still expected: the round's status reads only "Revisions
  have been submitted and a decision is needed."
- **Who**: every journal author who receives "Request Revisions" and
  uploads the revised file before responding.
- **Way round**: an editor sends "Request Response" from the round's
  "Author Response" table, after which the card comes back. The author
  has to ask for it, through a discussion or by email.

Medium: an editor can bring the response form back with "Request
Response"; it would be high if no screen could.

## Steps to reproduce

Preconditions: PKP's default test dataset, OJS `main`, with the
install's mail going to a local mail catcher (the dataset's addresses
are real mailinator.com ones). Without one, step 6 can be taken by
opening the email's link directly as `jnovak` (its shape is in
Observed). Submission 10, "Condensing Water Availability Models to
Focus on Specific Water Management Systems" (author `jnovak`), is in
Review round 1 with both accepted reviews completed; nothing else is
needed.

1. Sign in as `dbarnes` and open submission 10 (Review Round 1).
2. Press "Request Revisions". In "Require New Review Round" leave
   "Revisions will not be subject to a new round of peer reviews." and
   press "Next".
3. On "Notify Authors", keep the email to the author (its message holds
   the "Submit Author Response" button) and press "Continue"; continue
   through "Notify Reviewers" and press "Record Decision". The email is
   sent.
4. Sign in as `jnovak` and open submission 10 from "My Submissions". The
   round reads "Revisions have been requested." and ends with the
   "Author Response" card: "Respond to Reviews", "Submit Response".
5. Press "Upload revisions", choose "Article Text", add a file, and
   press "Continue", "Continue", "Complete".
6. In `jnovak`'s mailbox, open "Your submission has been reviewed and we
   encourage you to submit revisions" and press "Submit Author Response".

**Expected**: after step 5 the card is still there. Step 6 opens Review
Round 1 with the response form "Submit Your Response to Reviewer
Feedback" open.

**Observed**: after step 5 the round reads "Revisions have been
submitted and a decision is needed." and the "Author Response" card is
gone. Its headings are "Round 1 Status", "Notifications", "Revisions
Uploaded" and "Review Tasks & Discussions". Step 6 lands on the same
round, at
`/index.php/publicknowledge/en/dashboard/mySubmissions?workflowSubmissionId=10&workflowMenuKey=workflow_3_8&reviewResponseAction=respond`,
with no card and no form. No request fails and the console holds no
error.

Control: if `dbarnes` then presses "Request Response" on the round
(the table still reads "Ready to invite author") and sends the request,
the author's card comes back with "Submit Response".

## Cause

The decision email invites a response, but the round keeps no record of
that invitation. Whether the author may respond is decided again from
the round's status every time, and the author's own upload changes that
status.

`PKP\decision\types\RequestRevisions::runAdditionalActions()` sends
`DecisionRequestRevisionsNotifyAuthor`. Since `pkp/pkp-lib#12207`, that
mailable carries `{$reviewRoundAuthorResponseUrl}` (the
`ReviewRoundAuthorResponse` trait), and the `EDITOR_DECISION_REVISIONS`
template renders it as "Submit Author Response". Unlike
`PKPReviewController::requestAuthorResponse()`, which the "Request
Author Response" page calls, the decision does not set the round's
`isAuthorResponseRequested` flag after sending.

Two checks then allow a response only when that flag is set or the
round's status is "accepted" or "revisions requested":

- ui-library `workflowConfigAuthorOJS.js`
  ([lines 198–203](https://github.com/pkp/ui-library/blob/64d67363/src/pages/workflow/composables/useWorkflowConfig/workflowConfigAuthorOJS.js#L198-L203))
  adds `AuthorResponseManager` (the card, and the form the email's
  `reviewResponseAction=respond` opens) only when
  `isAuthorResponseRequested` is set or the status is
  `REVIEW_ROUND_STATUS_ACCEPTED` or `REVIEW_ROUND_STATUS_REVISIONS_REQUESTED`.
  Nothing else conditions it: no context setting is read, and the
  editors' table is added to every External Review round in
  `workflowConfigEditorialOJS.js`.
- pkp-lib `AddResponse::passedValidation()`
  ([lines 73–76](https://github.com/pkp/pkp-lib/blob/987776cd04/api/v1/reviews/formRequests/AddResponse.php#L73-L76))
  answers 403 to a response on any other round without the flag.

`ReviewRound::determineStatus()` moves a round from
`REVIEW_ROUND_STATUS_REVISIONS_REQUESTED` to
`REVIEW_ROUND_STATUS_REVISIONS_SUBMITTED` as soon as a revision file
exists after the decision. From then on both checks refuse. This misses
what `pkp/pkp-lib#12048` asked for: the review results email is how the
author is prompted, and the response "should be made available from that
point on".

Reach:

- OJS External Review: walked.
- A press's Request Revisions emails, External and Internal Review
  (`RequestRevisionsInternal` extends `RequestRevisions`), carry the same
  button. A press shows no card at all today (spec U30 OMP1); once it
  does, it meets this fault too (read in the code, not walked).
- "Resubmit for Review" sends `DecisionResubmitNotifyAuthor`, which
  carries no button and shows no card, so it is not affected (walked).

## Proposed fix

Record the invitation where the email is sent. In
`RequestRevisions::runAdditionalActions()`, once the author email has
gone, set `isAuthorResponseRequested` on the decision's round, the way
`PKPReviewController::requestAuthorResponse()` does after its own email.
An excerpt of
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-response-gone-after-revisions-upload/fix.diff),
which also adds the `use PKP\db\DAORegistry;` and
`use PKP\submission\reviewRound\ReviewRoundDAO;` imports:

```php
$this->shareReviewAttachmentFiles($emailData->attachments, $submission, $decision->getData('reviewRoundId'));
/** @var ReviewRoundDAO $reviewRoundDao */
$reviewRoundDao = DAORegistry::getDAO('ReviewRoundDAO');
$reviewRound = $reviewRoundDao->getById((int) $decision->getData('reviewRoundId'));
if ($reviewRound) {
    $reviewRound->setData('isAuthorResponseRequested', true);
    $reviewRoundDao->updateObject($reviewRound);
}
```

Both checks already accept the flag, so this one write in the shared
decision class covers the card, the email's button and the API. The flag
is set only when the "Notify Authors" email is sent, so a decision
recorded with that email skipped behaves as it does today.

Nothing clears the flag, so with the fix the card stays on that round
after any later decision (a new round, "Accept", "Decline"), until the
author has responded once. That is how a round asked through "Request
Response" already behaves, and it matches the issue's "from that point
on"; whether a declined submission should still take a response is the
team's call for both paths alike.

Tried on OJS `main`: after the upload the card stays with "Submit
Response", and the email's button opens "Submit Your Response to
Reviewer Feedback". A "Resubmit for Review" decision, whose email has no
button, still leaves its round without a card, with the fix in and out.

**Alternatives**:

- Add `REVIEW_ROUND_STATUS_REVISIONS_SUBMITTED` to both checks. This
  takes two repos with two lists to keep in step. The response would
  still hang on a status, which later decisions keep changing, and the
  editors' table still could not tell that the author was asked.
- Drop the button from the decision email. That goes against
  `pkp/pkp-lib#12048`, which chose this email as the prompt.

**What goes with it**:

- No data repair: the feature is new on `main`, and 3.5 decision emails
  carry no button.
- With a status cell that reads the flag (spec U30 A1's report), the
  editors' table would read "Response requested" after "Request
  Revisions", which is accurate, since the email asked.
- The guard: a pkp-lib unit test that recording "Request Revisions" with
  the author email sets the flag, then a Planned e2e scenario in spec
  U30 (upload a revision after "Request Revisions", then use the email's
  button).

Small: one write in one shared class, and a test.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-response-gone-after-revisions-upload/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-response-gone-after-revisions-upload/lib.js),
  on an install reset to PKP's default test dataset (pkp/datasets
  566bb1f, 2026-10-03, PostgreSQL):
  `npm run fleet-prep -- --feature <feature> --dataset <n> --reset`, then
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/author-response-gone-after-revisions-upload/walk.js`.
  After step 6 the script also sends "Request Response" as `dbarnes`
  and reads the author's card again (the control).
  `WALK_MODE=neighbour` runs only the "Resubmit for Review" check.
- Fix trial: `node bin/try-fix.js apply shared/playwright/checks/issues/author-response-gone-after-revisions-upload/fix.diff ojs`,
  the dataset reloaded, the walk and the "Resubmit for Review" check,
  then `revert`; that check again with the fix out.
- Tips: OJS `main` ff004d0973 (lib/pkp 987776cd04, lib/ui-library
  64d67363); OMP `main` 3b0ecf794c (lib/pkp 3dc90c81a6, lib/ui-library
  280f98c5). 3.5: OJS c1cee76b95 (lib/pkp 771474347e, lib/ui-library
  d4e01883). 3.4: OJS d68934d0d1, lib/pkp 767353f4fe, lib/ui-library
  ee684b34. 3.3: OJS ac77c9fb35, lib/pkp ac3fa73402.
- Code reads for 3.5, 3.4 and 3.3: lib/pkp's English `emails.po` has no
  "Submit Author Response" and no `{$reviewRoundAuthorResponseUrl}`, the
  3.5 dataset's stored `EDITOR_DECISION_REVISIONS` template has no
  button, and neither lib/pkp nor lib/ui-library holds any author
  response class or component, so the steps cannot be taken there.
- Introduced: `git blame` puts the card's check in ui-library 8d29739f
  (`pkp/ui-library#767`), and the API's check and the decision email's
  button (`setupReviewAuthorResponseVariable()` in
  `DecisionRequestRevisionsNotifyAuthor`) in pkp-lib 3dff6a7b6e
  (`pkp/pkp-lib#12207`). Both PRs were merged on 2026-01-23 for
  `pkp/pkp-lib#12048`.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ui-library searched
  for "author response" with revisions, "Submit Author Response",
  `isAuthorResponseRequested`, "card disappears", `AuthorResponseManager`
  and `editorDecisionRevisions`. Read and not a match: `pkp/pkp-lib#12307`
  (the feature's part 2: the request button's conditions and its own
  email template), `pkp/pkp-lib#12252` (a response refused on a
  submission with several versions), and `pkp/pkp-lib#11939` (the 3.6
  feature notes, which say the Request Revisions email links to the
  response form).
- Unverified: a response actually submitted through the form after the
  upload with the fix in. The trial opened the form but did not post;
  `AddResponse` admits a round that holds the flag (read in the code).
  The card staying after a later decision with the fix in is read in the
  code, not walked. MySQL not checked; nothing here depends on the
  database.
