# A press's "Add Reviewer" list opens with both review stages' reviewers, and the other stage's reviewer can be added

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP (since 3.5.0-3)
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#12112` for `pkp/pkp-lib#12100` · [7fb65fc5a1](https://github.com/pkp/pkp-lib/commit/7fb65fc5a1d6bb3d116053e9b52bbef7d57a6eab) · 2025-12-17 · Hafsa Naeem (Hafsa-Naeem)
- **Upstream** `pkp/pkp-lib#4656` (closed with a fix in 2019; the change above removed that fix from the list the window opens with, not from its search)
- **Tracked in** spec U27 [OMP2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U27-reviewer-assignment-and-management.md#omp2)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

On a press, the "Add Reviewer" window of Internal Review opens on a
list of every reviewer of the press, External Reviewers included, and
External Review's window likewise lists the Internal Reviewers. The
entries do not say which stage a reviewer belongs to. Searching the
list keeps to the stage's own reviewers.

An editor who picks from the list as it opens can add a reviewer of the
other stage: the reviewer is added to the round, sent the request and
given the round's files, and nothing warns the editor. The press's
split between its internal and external reviewers does not hold.
Searching instead of picking avoids it.

## Impact

- **Lost**: the separation of the press's internal and external
  review: an External Reviewer is asked to review an internal round,
  with its files, or the reverse, silently.
- **Who**: a press editor adding a reviewer on either review stage, on
  every press, whenever the reviewer is picked from the list as it
  opens rather than searched for.
- **Way round**: search the list by name. A wrong reviewer can be
  removed with "Unassign Reviewer" while the request is unanswered,
  which deletes the assignment and its file access; the request email
  has gone out by then.

Medium: a reviewer of the wrong pool is added silently, with a way
round on screen. It would be high if a press kept its internal
round's files from external reviewers by policy, since the list gives
the editor no sign of the stage before the pick.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main` (press `publicknowledge`).
- Submission 9, "Enabling Openness: The future of the information
  society in Latin America and the Caribbean", is in Internal Review,
  round 1, with no reviewers. Adela Gallego (`agallego`) holds only
  "External Reviewer"; Aisla McCrae (`amccrae`) only "Internal
  Reviewer". Nothing else is needed.

1. Sign in as `dbarnes`.
2. Open submission 9. It opens on "Internal Review (Round 1)".
3. Under "Reviewers", press "Add Reviewer".
4. Read the "Locate a Reviewer" list as it opens.
5. Type "Gallego" in the list's search box and press Enter. Then type
   "McCrae" and press Enter.
6. Close the window, press "Add Reviewer" again, and press "Select
   Reviewer" on "Adela Gallego" in the list as it opens.
7. Press "Add Reviewer".
8. Read the "Reviewers" panel of Internal Review, round 1. Reload the
   page and read it again.

**Expected:** the list opens with the press's Internal Reviewers only,
as its search does, and Adela Gallego cannot be added to Internal
Review.

**Observed:** at step 4 the list holds all twelve reviewers of the
press: the three Internal Reviewers (Julie Janssen, Paul Hudson, Aisla
McCrae) and the nine External Reviewers, Adela Gallego among them,
each entry with its name, affiliation and figures and no stage. At
step 5 "Gallego" finds "No items found." and "McCrae" finds Aisla
McCrae. At step 7 the page notice reads "Adela Gallego was assigned to
review this submission and sent an email notification.", and at step 8
her row reads "Request Sent" under Internal Review, round 1, also after
the reload.

## Cause

`PKPSelectReviewerListPanel::_getCollector()`
(`lib/pkp/classes/components/listPanels/PKPSelectReviewerListPanel.php`)
builds the list the window opens with, on the server. It filters the
users by context and by the reviewer role, but not by the round's
stage, although its one caller, `AdvancedSearchReviewerForm::fetch()`,
passes the stage in `getParams` (`'reviewStage' =>
$reviewRound->getStageId()`). Every search after that goes to `GET
users/reviewers`, where `PKPUserController::getReviewers()` applies
`filterByWorkflowStageIds([$reviewStage])`.

The filter was there: `pkp/pkp-lib#4656` restricted the reviewer
selection to the round's stage in 2019, and the collector carried
`->filterByWorkflowStageIds([$this->getParams['reviewStage']])` until
`pkp/pkp-lib#12112` ("Reviewer search is broken" on 3.5.0-2,
`pkp/pkp-lib#12100`) removed it in the PR's second commit, 9f5102d607 (merged
to `stable-3_5_0` as 7914e48615, forward-ported to `main` as
7fb65fc5a1). The same hunk made
`getItemsMax()` count without the page limit. Neither the commits, the
PR nor the issue mention the stage filter, and none of the issue's
work (the answer's array shape, interests, `recommendOnly`,
pagination) needed its removal.

The save does not catch it. `ReviewerForm::execute()` calls
`ReviewerForm::_isValidReviewer()`, which throws on a reviewer already
on the round or a user with no reviewer role in the context
(`RoleDAO::userHasRole(..., ROLE_ID_REVIEWER)`), but does not ask for a
reviewer role of the round's stage. So any reviewer of the press is
added. Two ways reach the save without the opening list:

- a reviewer suggestion whose email matches an existing reviewer of
  the other stage: its "Add Reviewer" opens the search form with that
  person preset (`ReviewerSuggestion::hasExistingReviewerRole` asks for
  any reviewer role), so the list is never used (code);
- a `reviewerId` posted by hand to the add request (code).

Reach:

- OMP, both review stages: Internal Review lists the External
  Reviewers, External Review the Internal Reviewers (both walked).
- OJS: none. A journal's reviewer role serves its one review stage, so
  the list is the same with or without the filter (walked).
- OPS: no review stage.
- "Enroll Existing User" and "Create New Reviewer" offer the reviewer
  roles of the round's stage (`getUserGroupsByStage()`), but
  `EnrollExistingReviewerForm::isValidUserAndGroup()` checks a posted
  role's context, not its stage (code).

## Proposed fix

Two parts, one diff
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-add-reviewer-list-both-stages/fix.diff)):

1. Put the stage filter back in the panel's collector, as it was before
   the change above and as the reviewers endpoint applies it:

   ```diff
            ->filterByContextIds([$this->getParams['contextId']])
   +        ->filterByWorkflowStageIds([$this->getParams['reviewStage']])
            ->filterByRoleIds([\PKP\security\Role::ROLE_ID_REVIEWER])
   ```

2. Refuse, on save, a person who holds no reviewer role of the round's
   stage. `_isValidReviewer()` asks for it in place of
   `userHasRole()`, through a new `ReviewerForm::isReviewerForStage()`
   (the user collector filtered by user, context, reviewer role and
   stage). That covers all three add modes and the two ways above. So
   that the editor sees why, `AdvancedSearchReviewerForm`'s constructor
   adds the same test as a `FormValidatorCustom` on `reviewerId`, with
   a new message, `editor.review.reviewerNotForStage`: "This person is
   not a reviewer for this review stage." The window stays open with
   that notice, and nothing is added or sent.

Tried on `main`, OMP and OJS. With the diff, Internal Review's list
opens with the three Internal Reviewers and no Adela Gallego; External
Review's list (submission 16) with the nine External Reviewers; the
journal's list is unchanged; "Enroll Existing User" (Maria Fritz, a
copyeditor) and "Create New Reviewer" still add on Internal Review. The
save's part was also tried alone, without the list's line: picking
Adela Gallego from the unfiltered list and pressing "Add Reviewer"
showed the notice "This person is not a reviewer for this review
stage.", kept the window open and added no row.

**Alternatives**

- The list filter alone: one line, and it ends the steps above, but
  leaves the suggestion path and a hand-made request open.
- The save's test alone: the list would keep offering people it then
  refuses.

**What goes with it**

- No stored data to repair: assignments already made across stages are
  the press's to keep or unassign.
- An editor who wants a reviewer of the other stage gives them that
  stage's reviewer role first (Users & Roles), as on 3.4.
- Translations of the new message.
- Backport to `stable-3_5_0`, where the change landed as 7914e48615;
  the diff applies as written.
- Guard: the press's two-pool scenario in the U27 e2e spec reads the
  opening list on both stages, not only the searched one.

Medium: the restored filter, a stage test in the shared reviewer form
that every add mode now passes through, and a new message.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-add-reviewer-list-both-stages/walk.js),
  with the helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-template-chooser-nothing-to-choose/lib.js),
  run on an install loaded from the default dataset (pkp/datasets
  e8dafbc, 2026-10-02; PostgreSQL):
  `PROBE_FEATURE=<fleet> PROBE_AGENT=<id> ONLY=ojs,omp node bin/probe.js all shared/playwright/checks/issues/press-add-reviewer-list-both-stages/walk.js`
  (`K6_MODE=nb` reads External Review's list on OMP submission 16 and
  the Review list on OJS submission 12; `K6_MODE=other` adds through
  "Enroll Existing User" and "Create New Reviewer" on OMP submission 9).
- Walked on `main` and `stable-3_5_0`, OMP, 2026-10-03. The search
  requests carried `reviewStage=2` and answered 200.
- Fix trial on `main`: the Steps, the two lists and the two other add
  modes with the diff (the lists and the add modes also without it);
  the save's part alone, with the Steps.
- Not driven: the reviewer-suggestion path and a hand-made request
  (code only).
- Release: the change is in pkp-lib's tag 3_5_0-3 (2025-12-19), which
  OMP 3.5.0-3 points at, and not in 3.5.0-2.
- Branch tips. `main`: OMP 3b0ecf794 (lib/pkp 3dc90c81a6), OJS
  ff004d0973 (lib/pkp 987776cd04). `stable-3_5_0`: OMP 9c5e24246
  (lib/pkp cf3f984335). `stable-3_4_0`: OMP 0aec65441, lib/pkp
  767353f4fe. `stable-3_3_0`: OMP 8e72fc883, lib/pkp ac3fa73402.
- Code reads: 3.4's `_getCollector()` carries the stage filter. 3.3's
  `PKPSelectReviewerListPanel.inc.php` passes `reviewStage` to
  `PKPUserService::getReviewers()`, which applies
  `filterByReviewStage()`.
- Not checked: MySQL (the change is in which rows are asked for, not in
  how they are compared).
