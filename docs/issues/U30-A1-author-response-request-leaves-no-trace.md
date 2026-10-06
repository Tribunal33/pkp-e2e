# Editors' "Author Response" table still reads "Ready to invite author" after the request was sent

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: none (no "Author Response" table)
  - 3.4: none (code; no author response feature)
  - 3.3: none (code; the same)
- **Introduced** `pkp/ui-library#767` for `pkp/pkp-lib#12048` · [8d29739f](https://github.com/pkp/ui-library/commit/8d29739f60c4f2fd21417a8c68f74e42efed8cbf) · 2026-01-23 · Taslan A. Graham (taslangraham)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U30 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U30-author-response-to-reviews.md#a1)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

After an editor sends the author a request for a response to the
reviews ("Request Response", then "Submit Request"), the round's
"Author Response" table still reads "Ready to invite author" / "Editor
can now request the author's response.", and "Request Response" stays
enabled. Nothing on the round shows that the author was asked.

So another editor of the submission, or the same one later, reads the
round as never asked and sends the request again. Each send emails the
author once more.

It holds on every review round from the first request until the author
responds, on any journal whose editors use "Request Response"; no
setting turns the feature on or off.

## Impact

- **Lost** Nothing is stored wrong. The author receives the same request
  once per send.
- **Who** Editors and section editors who use "Request Response", and
  the authors they ask.
- **Way round** The submission's "Activity Log" lists each sent request
  as "An email has been sent: Request For Author Response To Reviewer
  Feedback".

Medium: the table tells every editor of the round that no request went
out, so authors get duplicates, while another screen records it. It
would be high if no screen recorded the request at all.

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main`. Submission 10, "Condensing Water
  Availability Models to Focus on Specific Water Management Systems", is
  in Review, round 1, with both reviews in (Aisla McCrae and Adela
  Gallego). Its author is `jnovak` (John Novak); `dbarnes` (Journal
  editor) and `dbuskins` (Section editor) are assigned to it.
- The install's mail goes to a local mail catcher (or the mail log), not
  out: the dataset's addresses are real `mailinator.com` ones.

Steps:

1. Sign in as `dbarnes` and open submission 10. The workflow opens on
   Review, round 1.
2. Read the "Author Response" table: the row "John Novak" reads "Ready
   to invite author" / "Editor can now request the author's response.",
   and "Request Response" is enabled.
3. Press "Request Response". On the page "Request Author Response", once
   "Message" has loaded, press "Submit Request".
4. The dialog "Request for review response sent" opens. Press "View
   Submission Summary".
5. Back on Review, round 1, read the "Author Response" table.
6. Sign out, sign in as `dbuskins` and open submission 10. Read the
   "Author Response" table.
7. Press "Request Response", then "Submit Request", then "View
   Submission Summary". Read the table.
8. Sign in as `jnovak` and open submission 10 from "My Submissions".
   Read the "Notifications" list and the "Author Response" card.
9. In the mail catcher, open the mail to `jnovak@mailinator.com`.

**Expected** At step 5 the row says that the author was asked to
respond, and `dbuskins` sees the same at step 6 before deciding whether
to send the request again.

**Observed** At steps 5, 6 and 7 the row reads, as before the request:

```
John Novak    Ready to invite author
              Editor can now request the author's response.
```

and "Request Response" is enabled. `dbuskins`'s "Submit Request" at
step 7 is accepted like the first and shows the same dialog. At step 8
the "Notifications" list holds two rows "Request For Author Response To
Reviewer Feedback", and the card reads "Author Response" / "Respond to
Reviews" with "Submit Response". At step 9 the mailbox holds two emails
"Request For Author Response To Reviewer Feedback".

## Cause

The round does record the request. `PKPReviewController::requestAuthorResponse()`
(lib/pkp `api/v1/reviews/PKPReviewController.php`) sends the email and
then sets the review round setting `isAuthorResponseRequested` to true,
and `PKP\submission\maps\Schema::getPropertyReviewRounds()` returns it
with each round of the submission. The author's view reads it:
`workflowConfigAuthorOJS.js` shows the "Author Response" card once
`selectedReviewRound?.isAuthorResponseRequested` is set or the round is
accepted or has revisions requested.

The editors' table never reads it. In lib/ui-library,
`AuthorResponseRequestManagerCellStatus.vue` picks the "Response Status"
cell from two store values only: `canRequestReviewRoundAuthorResponse`
("Ready to invite author") and `reviewHasResponse` ("A response was
submitted by …"), with "Awaiting reviews" otherwise.
`canRequestReviewRoundAuthorResponse` in
`AuthorResponseRequestManagerStore.js` looks at the reviews (all in, or
the minimum confirmed) and at whether a response exists, so it stays
true after a request, and the cell has no state for "asked, no answer
yet". `AuthorResponseRequestManagerActionButton.vue` enables "Request
Response" on the same value.

The server accepts a repeat: it refuses when the reviews are not ready
(422) or a response exists (409), and otherwise a second "Submit
Request" sends a second email. A repeat can be a fair reminder; the fault is that the
editors cannot see that one already went out.

Reach:

- Every author row of the round reads the same cell, since the cell
  reads the store, not the row (screen, one author on the dataset's
  submission; code for several).
- No other editorial screen shows the request: the flag is read only by
  the author's card and the author's add-response check
  (`AddResponse::passedValidation()`, which lets the author submit on a
  round not yet accepted or in revisions requested) (code: lib/ui-library
  `src`, and lib/pkp `classes` and `api`).
- A press runs the same code but shows no "Author Response" table on its
  review stages, and a preprint server has no review (code).

## Proposed fix

Give the cell the state the server already stores: the store exposes
the flag, and the cell shows "Response requested" / "The author was
asked to respond and has not responded yet." once a request went out
and no response exists. An excerpt of
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-response-request-leaves-no-trace/fix.diff),
which also adds `isAuthorResponseRequested` to the store's `return`:

```diff
 		const reviewHasResponse = computed(
 			() => !!reviewRound.value.authorResponse,
+		);
+
+		const isAuthorResponseRequested = computed(
+			() => !!reviewRound.value.isAuthorResponseRequested,
 		);
```

```diff
-		<div v-if="store.canRequestReviewRoundAuthorResponse">
+		<span v-if="store.reviewHasResponse" class="text-base-bold">
+			…"A response was submitted by …", moved up unchanged…
+		</span>
+		<div v-else-if="store.isAuthorResponseRequested">
+			<p class="text-base-bold capitalize">
+				{{ t('editor.submission.reviewRound.authorResponse.requested') }}
+			</p>
+			<p>
+				{{ t('editor.submission.reviewRound.authorResponse.awaitingAuthor') }}
+			</p>
+		</div>
+		<div v-else-if="store.canRequestReviewRoundAuthorResponse">
```

The response branch moves first because the flag stays true after a
response, so "Response requested" must come after it. The two strings go
into lib/pkp `locale/en/submission.po` beside
`…authorResponse.readyToInvite`. "Request Response" stays enabled, so an
editor who sees "Response requested" can still send the request again as
a reminder, knowingly.

Tried on `main`: with the fix, the row reads "Response requested" / "The
author was asked to respond and has not responded yet." at steps 5, 6
and 7, for `dbarnes` and `dbuskins` alike. With and without the fix,
submission 13 (reviews in, never asked) reads "Ready to invite author"
with the button enabled, submission 7 (reviews outstanding) "Awaiting
reviews" with it greyed, and submission 10, once asked and answered by
`jnovak` through the card's "Submit Response", "A response was submitted
by John Novak" with it greyed.

**Alternatives**

- Disable "Request Response" once a request went out, and have
  `requestAuthorResponse()` refuse a repeat with 409 as it does for an
  existing response. That stops duplicates but leaves editors no way to
  remind the author, so it is a product decision.
- Relabel the button "Resend Request" once a request went out. It needs
  one more string; it can go with the fix if the team wants a repeat to
  read as deliberate.

**What goes with it**

- No API, stored data or plugin hook changes. Rounds already asked
  before the fix carry the flag, so they show the new state at once.
- The flag is never cleared, so after an editor deletes a response the
  cell reads "Response requested" again. That matches the author's card,
  which offers "Submit Response" again then.
- The two new strings show as raw codes in French until translated, as
  the feature's other strings do today.
- Test: a pkp-e2e check that after "Submit Request" the row reads
  "Response requested".

Medium: a few lines, but in two repos that land together (ui-library's
store and status cell, pkp-lib's English strings), with an e2e check.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-response-request-leaves-no-trace/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-response-request-leaves-no-trace/lib.js)):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs
  shared/playwright/checks/issues/author-response-request-leaves-no-trace/walk.js`.
  Its default mode takes the Steps and then reads the "Activity Log" as
  `dbarnes`; `WALK_MODE=neighbour` reads the other states of the table:
  submissions 13 and 7, and submission 10 after a request and the
  author's response.
  The Activity Log read (two rows "An email has been sent: Request For
  Author Response To Reviewer Feedback", one by Daniel Barnes, one by
  David Buskins) was taken on the run with the fix applied; the fix does
  not touch the log.
- Fix trial: `node bin/try-fix.js apply
  shared/playwright/checks/issues/author-response-request-leaves-no-trace/fix.diff
  ojs` (rebuilds the JavaScript), the dataset reloaded, the walk in both
  modes, then `revert`; the other states read again without the fix.
  It opens the workflow by its address
  (`…/dashboard/editorial?workflowSubmissionId=10`, the author's
  `…/dashboard/mySubmissions?workflowSubmissionId=10`) and counts the
  mailbox by recipient, subject and the install's own address in the
  email's link.
- Tips walked: `main` OJS ff004d0973 (lib/pkp 987776cd04, lib/ui-library
  64d67363); `stable-3_5_0` OJS c1cee76b95 (lib/pkp 771474347e,
  lib/ui-library d4e01883). Dataset: pkp/datasets 566bb1f (2026-10-03),
  PostgreSQL.
- 3.5, walked: the Review, round 1 of submission 10 goes from
  "Reviewers" straight to "Review Discussions", with no "Author Response"
  table and no "Request Response"; lib/ui-library `stable-3_5_0` has no
  `ReviewRoundResponseManager` and lib/pkp no `requestAuthorResponse()`.
- Code read on 3.4 and 3.3 (lib/pkp `stable-3_4_0` 767353f4fe,
  `stable-3_3_0` ac3fa73402; lib/ui-library ee684b34 and 96959f9e; OJS
  d68934d0d1 and ac77c9fb35): no `api/v1/reviews` controller, no
  `isAuthorResponseRequested`, no author response component.
- OMP and OPS, `main` (code): `workflowConfigEditorialOMP.js` and
  `workflowConfigEditorialOPS.js` never add
  `AuthorResponseRequestManager`; not walked.
- Introduced: `git blame` on `canRequestReviewRoundAuthorResponse` and
  on the status cell leads to 8d29739f, the commit that added both
  (`pkp/ui-library#767`); the server half is lib/pkp 3dff6a7b
  (`pkp/pkp-lib#12207`), which already stored the flag. Later changes to
  the condition (`pkp/ui-library#778`, `#807` for `pkp/pkp-lib#12252`
  and `#12307`) changed when a round is ready, not the request state.
- Upstream search (pkp/pkp-lib, pkp/ui-library, pkp/ojs): author
  response request, "Request Response" author, "Ready to invite author",
  author response resend, "author response" requested status,
  `isAuthorResponseRequested`, `canRequestReviewRoundAuthorResponse`.
  `pkp/pkp-lib#12048` and `#12307` (both closed) designed and refined
  when the button is enabled and do not mention the state after a
  request; `pkp/ui-library#981` (open) only moves the author's card.
- The status strings are quoted as the page holds them; the cell's CSS
  shows the first line capitalised ("Ready To Invite Author").
- Not driven: a round with more than one assigned author; a request
  under "Minimum Confirmed Reviews Required".
