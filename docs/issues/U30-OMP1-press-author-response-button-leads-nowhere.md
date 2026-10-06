# Press author's "Submit Author Response" email button opens a review round with nothing to respond in

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: none (read in the code, not walked; no author response feature)
  - 3.4: none (read in the code, not walked; the same)
  - 3.3: none (read in the code, not walked; the same)
- **Introduced** `pkp/ui-library#767` and `pkp/pkp-lib#12207` for `pkp/pkp-lib#12048` · [8d29739f](https://github.com/pkp/ui-library/commit/8d29739f60c4f2fd21417a8c68f74e42efed8cbf), [3dff6a7b6e](https://github.com/pkp/pkp-lib/commit/3dff6a7b6e1a51e40849562ee24a5a16b3824be4) · 2026-01-23 · Taslan A. Graham (taslangraham)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U30 [OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U30-author-response-to-reviews.md#omp1)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

When a press editor records "Request Revisions" on External Review or
Internal Review, the author's email invites them to "Submit Author
Response", as a journal's does. Pressing the button opens the
monograph's review round with no "Author Response" card and no response
form, so the author cannot do what the email asks.

The press's editors have no "Author Response" table on either review
stage, so they cannot see or request a response either. The "Request
Author Response" page still opens by its address and sends an email with
the same button, which leads to the same empty round.

Whether presses should have author responses is the team's call, and the
fix follows from it. The recommended fix adds the table and the card to
both of a press's review stages; the other way is to take the button out
of the press's emails.

## Impact

- **Lost**: nothing typed is lost. The author simply cannot write the
  response the email asks for, and nothing on screen says why.
- **Who**: every press author asked for revisions, with the default
  email template.
- **Way round**: the author can still answer through "Review Tasks &
  Discussions" or a file under "Revisions Uploaded".

Medium: the email promises a step that does not exist on any press, but
a discussion still carries the author's answer. It would be high if no
answer could reach the editor at all.

## Steps to reproduce

Preconditions: PKP's default test dataset, OMP `main`, with the
install's mail going to a local mail catcher (the dataset's addresses
are real mailinator.com ones). Without one, each email step can be taken
by opening the button's link directly as the author (its shape is in
Observed). Submission 16, "A Designer's Log: Case Studies in
Instructional Design" (author `mpower`), is in External Review round 1
with one completed review. Submission 12, "Connecting ICTs to
Development" (author `lelder`), is in Internal Review round 1 with one
completed review.

External Review:

1. Sign in as `dbarnes` and open submission 16 (External Review,
   Review Round 1). The round shows "Reviewers" and then "Review Tasks &
   Discussions", with no "Author Response" table.
2. Press "Request Revisions". Leave "Revisions will not be subject to a
   new round of peer reviews.", press "Next", keep the "Notify Authors"
   email (its message holds "Submit Author Response"), continue through
   "Notify Reviewers", and press "Record Decision".
3. Sign in as `mpower`. In the mailbox, open "Your submission has been
   reviewed and we encourage you to submit revisions" and press "Submit
   Author Response".

Internal Review:

4. Sign in as `dbarnes` and open submission 12 (Internal Review, Review
   Round 1): again no "Author Response" table. The address ends in
   `workflowMenuKey=workflow_2_12`.
5. Open
   `/index.php/publicknowledge/en/reviewResponse/requestAuthorResponse?stageId=2&reviewRoundId=12&submissionId=12`
   ("Laurent Elder" in "To"), wait for "Message" to fill, and press
   "Submit Request". The dialog "Request for review response sent"
   opens.
6. Back on the round, press "Request Revisions", leave "Revisions will
   not be subject to a new round of peer reviews." if the window asks
   (the other choice sends an email with no button), keep the "Notify
   Authors" email, continue through the steps and press "Record
   Decision".
7. Sign in as `lelder`. Press "Submit Author Response" in "Request For
   Author Response To Reviewer Feedback", then in "Your submission has
   been reviewed and we encourage you to submit revisions".

**Expected**: each button opens the round with the response form
"Submit Your Response to Reviewer Feedback" open, and the "Author
Response" card is the last item on the round. That is what a journal
author gets from the same email.

**Observed**: each button lands on
`/index.php/publicknowledge/en/dashboard/mySubmissions?workflowSubmissionId=<id>&workflowMenuKey=workflow_<stage>_<round>&reviewResponseAction=respond`.
The round reads "Revisions have been requested." with the headings
"Round 1 Status", "Notifications" (External Review only), "Revisions
Uploaded" and "Review Tasks & Discussions". There is no "Author
Response" card and no form. No request fails and the console holds no
error.

## Cause

The author response screens were added to OJS's workflow page only. The
emails that link to them are shared, so a press sends them too.

`pkp/pkp-lib#12207` gave the shared `DecisionRequestRevisionsNotifyAuthor`
and `RequestReviewRoundAuthorResponse` mailables the
`{$reviewRoundAuthorResponseUrl}` variable (the
`ReviewRoundAuthorResponse` trait), and put the "Submit Author Response"
button in the shared `EDITOR_DECISION_REVISIONS` and
`REQUEST_REVIEW_ROUND_AUTHOR_RESPONSE` templates. The API routes and the
request page come from lib/pkp, so they serve a press too, and
`pkp/omp#2210` added the feature's database tables to OMP's install and
upgrade.

`pkp/ui-library#767` added the two components,
`AuthorResponseRequestManager` (the editor's table) and
`AuthorResponseManager` (the author's card and the form the button's
`reviewResponseAction=respond` opens). It added them to
`workflowConfigEditorialOJS.js` and `workflowConfigAuthorOJS.js` for
External Review, and registered them in `WorkflowPageOJS.vue`'s
`Components`. A press misses them in two ways:

- External Review: `useWorkflowConfigOMP()` builds the press's
  configuration as
  `deepMerge(deepMerge({}, ConfigEditorialOJS), ConfigEditorialOMP)`
  (and the same with the author configs). OMP defines no External
  Review items, so the press inherits OJS's, components included. But
  `WorkflowPageOMP.vue` does not register the two components, so
  `<component :is="…">` renders an unknown, empty
  `<authorresponserequestmanager>` or `<authorresponsemanager>` element.
  The walk finds exactly these elements, with no children, on the
  editor's and the author's External Review.
- Internal Review: OMP's own `workflowConfigEditorialOMP.js` and
  `workflowConfigAuthorOMP.js` define the stage's items and include
  neither component, while the decision email (`RequestRevisionsInternal`
  extends `RequestRevisions`) and the request page link to
  `workflow_2_<round>`.

OPS has no review stage and no Request Revisions decision, and the
request page refuses there (spec U30 note a). A journal's card shows;
its own gap after a revised upload is
[the A7 report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U30-A7-author-response-gone-after-revisions-upload.md).

## Proposed fix

If presses are to have author responses, give them the screens their
emails already link to. In ui-library
([fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-author-response-button-leads-nowhere/fix-omp.diff)):

- `WorkflowPageOMP.vue`: import `AuthorResponseManager` and
  `AuthorResponseRequestManager` and add them to `Components`, as
  `WorkflowPageOJS.vue` does. This alone completes External Review,
  whose items the press already inherits.
- `workflowConfigEditorialOMP.js`, Internal Review `getPrimaryItems()`:
  push `AuthorResponseRequestManager` after `ReviewerManager`, with the
  props OJS's External Review passes (taking
  `contextMinReviewsPerSubmission` from the arguments).
- `workflowConfigAuthorOMP.js`, Internal Review `getPrimaryItems()`:
  push `AuthorResponseManager` on the same condition as
  `workflowConfigAuthorOJS.js`: the round's `isAuthorResponseRequested`,
  or a status of `REVIEW_ROUND_STATUS_ACCEPTED` or
  `REVIEW_ROUND_STATUS_REVISIONS_REQUESTED`.

The copied condition does not name `REVIEW_ROUND_STATUS_SENT_TO_EXTERNAL`,
and needs not: no decision on `main` sets that status. OMP's
`SendExternalReview` records the internal round as
`REVIEW_ROUND_STATUS_ACCEPTED`, so the card shows on an internal round
sent on to External Review, as it does on an accepted one. The server
needs nothing.

Tried on OMP `main`: both review stages now show the editor's "Author
Response" table, and each of the three email buttons opens "Submit Your
Response to Reviewer Feedback" on its round. On submission 2 (External
Review, two of its three reviews still outstanding) the fix's table reads
"Awaiting reviews" with "Request Response" greyed, and the author's
round still shows no card, as without the fix.

**Alternatives**:

- Keep author responses OJS-only and take the button out of the press's
  emails. That needs press-specific texts for the two templates in
  OMP's locale and registry, and an upgrade step for templates already
  installed. The request page and its API would also have to refuse a
  press. It is a larger change, and it leaves out the review outputs and
  DOIs that OMP already carries for author responses (`pkp/omp#2222`,
  `pkp/omp#2232`).
- Register the components only, without the Internal Review items.
  External Review is fixed, but the internal decision email still leads
  nowhere.

**What goes with it**:

- The team's word that presses get the feature. `pkp/pkp-lib#12048`
  speaks of "the OJS review process", and its follow-up added the OMP
  setup "just for consistency".
- [The A7 report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U30-A7-author-response-gone-after-revisions-upload.md)'s
  fix, so that a press's card also survives the author's upload.
- The guard: a ui-library vitest that every component the OMP workflow
  configs name is registered in `WorkflowPageOMP.vue` (the same check
  would catch the next component added to OJS's configs only), then a
  Planned e2e scenario in spec U30 (OMP: the table on both review
  stages, and the decision email's button opening the form). Spec U71's
  Rule 5, which records the table's absence on Internal Review, changes
  with it.

Medium: three files in one repo and a product decision first; large if
the team chooses to take the button out instead.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-author-response-button-leads-nowhere/walk.js),
  with the helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-response-gone-after-revisions-upload/lib.js),
  on an install reset to PKP's default test dataset (pkp/datasets
  566bb1f, 2026-10-03, PostgreSQL):
  `npm run fleet-prep -- --feature <feature> --dataset <n> --reset`, then
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/press-author-response-button-leads-nowhere/walk.js`.
  `WALK_MODE=neighbour` runs only the submission 2 check (a round with
  reviews outstanding). Each read lists the unknown elements the page
  left.
- Fix trial: `node bin/try-fix.js apply shared/playwright/checks/issues/press-author-response-button-leads-nowhere/fix-omp.diff omp`
  (rebuilds the JavaScript), the dataset reloaded, the walk and the
  submission 2 check, then `revert`; that check again with the fix out
  (no table, and the unknown `<authorresponserequestmanager>` back).
- Tips: OMP `main` 3b0ecf794c (lib/pkp 3dc90c81a6, lib/ui-library
  280f98c5); OJS `main` ff004d0973 (lib/pkp 987776cd04, lib/ui-library
  64d67363). 3.5: OMP 9c5e24246c (lib/pkp cf3f984335, lib/ui-library
  d4e01883). 3.4: OMP 0aec65441f, lib/pkp 767353f4fe, lib/ui-library
  ee684b34. 3.3: OMP 8e72fc8836, lib/pkp ac3fa73402.
- Code reads for 3.5, 3.4 and 3.3: lib/pkp's English `emails.po` has no
  "Submit Author Response", the 3.5 dataset's stored
  `EDITOR_DECISION_REVISIONS` template has no button, and neither
  lib/pkp nor lib/ui-library holds any author response class or
  component.
- Introduced: ui-library 8d29739f (`pkp/ui-library#767`) touched
  `WorkflowPageOJS.vue` and the OJS configs only (`git show --stat`), and
  `git log -S AuthorResponse` on `WorkflowPageOMP.vue` finds no commit.
  pkp-lib 3dff6a7b6e (`pkp/pkp-lib#12207`) added the email button.
  `pkp/omp#2210` changed only OMP's install and upgrade descriptors (the
  database migration) and the submodule pointers. The issue's follow-up
  `pkp/pkp-lib#12307` asked for "the migration/email template setup for
  OPS and OMP just for consistency".
- Upstream: pkp/pkp-lib, pkp/omp, pkp/ojs and pkp/ui-library searched
  for "author response" with OMP and press, "Submit Author Response",
  `AuthorResponseManager` and `WorkflowPageOMP`. Read and not a match:
  `pkp/omp#2222` and `pkp/omp#2232` (author responses in review outputs
  and DOIs), and `pkp/pkp-lib#11939` (the 3.6 feature notes).
- With the fix, submission 16's External Review table reads "Awaiting
  reviews" with "Request Response" greyed, because two of its three
  reviews are still outstanding. Yet the request page opened by its
  address sends the request, since the server counts only accepted
  reviews. That is the screen's stricter check, which OJS shares (spec
  U30 note e), not this fault.
- Unverified: a response posted through the form on a press with the
  fix in. The trial opened the form but did not submit. The card on an
  internal round sent on to External Review is read in the code, not
  walked.
