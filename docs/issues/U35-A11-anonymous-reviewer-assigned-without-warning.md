# Editors get no warning when assigning a participant who reviews the submission anonymously

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** `pkp/pkp-lib#5406` for `pkp/pkp-lib#4868` · [42dd9f164b](https://github.com/pkp/pkp-lib/commit/42dd9f164b6a611f65ee4ea6dfe68908b2d399db) · 2020-01-15 (merged 2020-01-17) · Nate Wright (NateWr)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U35 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a11)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

While a submission is in review, an editor may choose, in "Assign
Participant", someone who has an anonymous review request on it that is
not declined. The window is meant to warn the editor at that moment:
"The participant you selected has been assigned to conduct an anonymous
review. …". Nothing appears, and "OK" assigns the person.

Nobody is told that the new participant also reviews the submission.
The editor can only find out by checking the reviewer list by hand
first.

This happens only when the reviewer also holds a role that "Assign
Participant" offers on that stage, such as Author, which most registered
users hold.

## Impact

- **Lost:** the warning, so the editor does not learn that the person
  reviews this submission. The person gains less than the warning says:
  on `main` and 3.5 the data the workflow screens load still hides the
  authors (for "Anonymous Reviewer/Anonymous Author") and the other
  reviewers from them, whatever role they are given (code); the files
  and discussions the role opens were not checked. With "Anonymous
  Reviewer/Disclosed Author" they already see the authors, so nothing
  more is known to be exposed.
- **Who:** editors and managers of a journal or press who assign someone
  while the submission is in review and pick one of its anonymous
  reviewers, often without knowing it, since the window does not show
  who reviews.
- **Way round:** check the submission's reviewer list by hand before
  each assignment.

Low: the editor gets the assignment they asked for, and on the screens
read in the code the new participant sees no more of the authors or the
other reviewers than their review request already allows. It would be
medium if the files or discussions the role opens show them (not
checked).

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main`, OJS (submission 12) or OMP
  (submission 17). In both, Paul Hudson (`phudson`) has a review request
  on the submission, "Anonymous Reviewer/Anonymous Author", not
  declined.
- Paul Hudson holds only a reviewer role in the dataset, and "Assign"
  never offers a reviewer role, so in steps 1–2 he takes the Author role
  through his own profile, as any registered user can.

1. Sign in as `phudson`, open "Edit Profile"
   (`/index.php/publicknowledge/user/profile`) and its "Roles" tab.
2. Tick "Author", press "Save" and sign out.
3. Sign in as `dbarnes` and open the submission's workflow at
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=<id>`:
   OJS 12, "Sodium butyrate improves growth performance of weaned
   piglets during the first period after weaning" (Review), or OMP 17,
   "Open Development: Networked Innovations in International
   Development" (Internal Review). [OMP: `dbarnes` is not assigned to
   submission 17, so it is not under "Assigned to me"; the address, or
   a search for 17 under "Active", opens it.]
4. In "Participants", press "Assign".
5. Choose the role "Author", type "Hudson" in "Search User By Name" and
   press "Search".
6. Choose "Paul Hudson".
7. Press "OK".

**Expected:** step 6 opens a dialog with an "OK" button and the text:

```
The participant you selected has been assigned to conduct an anonymous review. If you assign them as a participant, they will have access to the author's identity. You are encouraged not to assign this participant unless you can independently ensure the integrity of the peer review process.
```

**Observed:** step 6 shows nothing. Step 7 closes the window with "User
added as a stage participant.", and Paul Hudson is assigned to the
submission as Author.

Control: choosing an author with no review request on the submission
(OJS "Carlo Corino", OMP "Arthur Clark") shows no dialog, as it should.

## Cause

`AddParticipantForm::fetch()` (lib/pkp
`controllers/grid/users/stageParticipant/form/AddParticipantForm.php`)
collects, while the submission is in a review stage, the reviewer ids
of its anonymous, not declined review assignments and hands them to the
window's script as JSON. The ids are integers: on `main` and 3.5
`EntityDAO::fromRow()` converts `reviewer_id` by the schema
(`reviewerId` is `"type": "integer"`), and on 3.4 and 3.3
`ReviewAssignmentDAO::_fromRow()` casts it with `(int)`. So the list is
numbers (`[7,8]` on OJS submission 12).

`StageParticipantNotifyHandler.prototype.maybeTriggerReviewerWarning()`
(lib/pkp
`js/controllers/grid/users/stageParticipant/form/StageParticipantNotifyHandler.js`,
line 278) reads the chosen person from the hidden `userIdSelected`
input, which is always a string, and tests it with
`this.anonymousReviewerIds_.indexOf(userId) < 0`. `indexOf` compares
strictly, so `"8"` never matches `8`, and the method always returns
before opening the dialog.

The check worked when it was added (`pkp/pkp-lib#3130`, 2018): the
review assignment DAO then passed the database's string values through,
so the list held strings too. `42dd9f164b` cast the ids in
`ReviewAssignmentDAO::_fromRow()` to `(int)`, as part of hiding author
details in the REST API from users with an anonymous review assignment
(`pkp/pkp-lib#4868`), and that silently broke this comparison. 3.1.2
is the last release whose code shows the warning.

Reach:
- Both anonymous review types: on OJS submission 12 the list the window
  received held Julie Janssen's user id (her request is "Anonymous
  Reviewer/Disclosed Author") beside Paul Hudson's (walked). The dialog
  was tried for Paul Hudson only; for her it follows from the same
  comparison.
- The list is filled whenever the submission's current stage is a
  review stage, whichever stage's "Assign" is pressed; once the
  submission leaves review, nobody is warned (code).
- Saving never checks: `saveParticipant` assigns whoever is chosen, by
  design, since the warning only advises (code).
- OPS has no review stage, so the list is always empty there (code).
- No other legacy script in lib/pkp tests a form value against an id
  list with `indexOf` (code).

## Proposed fix

Compare the chosen id as a number, in the handler that reads it
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/anonymous-reviewer-assigned-without-warning/fix.diff),
paths from the app root; in a pkp-lib checkout apply it with `-p3`):

```diff
-		if (!userId || this.anonymousReviewerIds_.indexOf(userId) < 0) {
+		if (!userId ||
+				this.anonymousReviewerIds_.indexOf(parseInt(userId, 10)) < 0) {
```

The ids are integers everywhere else (the schema, the API, the DAO), so
the script, which is the one place that reads them from a form field,
is where the type is matched. The sibling methods in the same handler
(`updateRecommendOnly()`, `updateSubmissionMetadataEditPermitOption()`)
compare the form's `userGroupId` with user-group id lists using `==`,
which passes over the same string-and-number difference.

Tried on OJS and OMP `main`: step 6 now opens the dialog with the
expected text, and its "OK" followed by the window's "OK" assigns Paul
Hudson as before. Choosing an author with no review request still shows
nothing, with the fix in and out.

Which requests warn: `fetch()` leaves out only declined requests, so
with the fix the warning also shows for a reviewer whose anonymous
request was cancelled or is completed, as it did in 2018. We recommend
keeping that: the anonymity of a completed review matters as much as of
one in progress, and a reviewer whose request was cancelled may already
have read the submission. Leaving cancelled requests out as well
(`&& !$reviewAssignment->getCancelled()` in the filter) is a product
call.

**Alternatives:**
- Sending the ids as strings from `AddParticipantForm::fetch()` would
  work, but puts the browser's string handling into the PHP side and
  breaks again if someone casts there.
- A loop with `==` like the sibling methods works as well; `parseInt`
  keeps the existing one-line test.

**What goes with it:**
- Each app's committed bundle (`js/pkp.min.js`) is rebuilt with
  `lib/pkp/tools/buildjs.sh`, as for any legacy script change; installs
  with `enable_minified = On` run the bundle.
- The same line applies as written to `stable-3_5_0`, `stable-3_4_0` and
  `stable-3_3_0`.
- A test: an end-to-end walk that assigns a current anonymous reviewer
  in review and expects the dialog.

Small: a one-line change in pkp-lib, following a pattern the code
already has.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/anonymous-reviewer-assigned-without-warning/walk.js)
  takes the Steps on OJS and OMP (OPS skipped, no review stage) on an
  install freshly reset to the default dataset, and records the id list
  the window receives and the stage assignment in the database:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/anonymous-reviewer-assigned-without-warning/walk.js`.
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/anonymous-reviewer-assigned-without-warning/neighbour.js)
  is the control (an author with no review request), run with the fix in
  and out.
- Walked on PostgreSQL, the default dataset of pkp/datasets `38ab955`
  (2026-09-30). MySQL not checked; the comparison runs in the browser on
  a list the schema types as integers, so the database does not matter.
- Tips: `main` OJS `bade233f73` (lib/pkp `2e377d27fc`), OMP `3b0ecf794`
  (lib/pkp `3dc90c81a6`); `stable-3_5_0` OJS `92b9a16b48`, OMP
  `3081c9b00` (lib/pkp `a9c76aed62`); `stable-3_4_0` OJS `9571d8fde7`,
  OMP `0aec65441` (lib/pkp `df13621c2d`); `stable-3_3_0` OJS
  `9fdb9bcf9a`, OMP `8e72fc883` (lib/pkp `d446601ebe`).
- 3.5, walked: the same Steps and Observed; the window receives `[7,8]`.
  The install runs the minified bundle, which holds the same test.
- 3.4 and 3.3 (code): lib/pkp's `StageParticipantNotifyHandler.js` has
  the same line 278; `AddParticipantForm` builds the list from
  `ReviewAssignmentDAO::getBySubmissionId()`, whose `_fromRow()` casts
  `reviewer_id` to `(int)`; `addParticipantForm.tpl` passes it through
  `json_encode`; `AddParticipantFormHandler.js` sets `userIdSelected`
  with `.val(…).trigger('change')`.
- Introduced: the last version that showed the warning is 3.1.2, by the
  code, not walked: its tag (`3_1_2-4`) has the same comparison and
  `setReviewerId($row['reviewer_id'])` without a cast, so the list held
  strings. `git log -S` on `setReviewerId((int)` gives `42dd9f164b`,
  first released in 3.2.0.
- What the new participant sees (Impact), read on `main` and 3.5:
  `AnonymizeData::submissionsToAnonymizeByAuthor()` (lib/pkp
  `api/v1/submissions/AnonymizeData.php`) hides the authors from a user
  with an "Anonymous Reviewer/Anonymous Author" request on the
  submission, and `reviewsToAnonymize()` hides every other non-open
  review's reviewer from a user with any request; the submission and
  publication maps apply both whatever stage role the user holds.
  Not checked: the files, discussions and legacy windows the new role
  opens, and 3.4 and 3.3.
- Upstream searched: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ui-library, by
  "anonymous reviewer participant warning", "reviewerWarning",
  "anonymousReviewerIds", "maybeTriggerReviewerWarning",
  "StageParticipantNotifyHandler". `pkp/pkp-lib#7800` (open) is a
  different leak: an author seeing a reviewer's role in "Add discussion".
