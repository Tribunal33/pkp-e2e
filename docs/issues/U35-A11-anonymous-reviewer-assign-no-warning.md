# An editor assigning an anonymous reviewer of the submission as a participant gets no warning

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** `pkp/pkp-lib#5406` for `pkp/pkp-lib#4868` · [42dd9f164b](https://github.com/pkp/pkp-lib/commit/42dd9f164b6a611f65ee4ea6dfe68908b2d399db) · 2020-01-15 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U35 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a11)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

In "Assign", an editor chooses a person who reviews the submission
anonymously. A warning is meant to open, saying that this person "will
have access to the author's identity". Nothing opens, and "OK" assigns
the person with "User added as a stage participant.".

From then on the reviewer can open the submission's workflow, which
shows the author's name. In this way an editor undoes a review's
anonymity without being told.

It happens while the submission is in a review stage. The person must
hold a role that "Assign" offers there, such as Section editor. Their
review of this submission must be of the type "Anonymous
Reviewer/Anonymous Author" or "Anonymous Reviewer/Disclosed Author" and
not declined. A preprint server has no review and is not affected.

## Impact

- **Lost**: the review's anonymity. Before the assignment the reviewer
  sees the submission without its author. After it, the workflow opens
  for them as for any editor, with the author's name in its heading and
  the "Publication" pages in its menu. The reviewer has to open the
  workflow to see it; the assignment sends them no email.
- **Who**: an editor or section editor who assigns, during review, a
  person who is also a reviewer of that submission. That is rare in a
  large journal and likelier in a small one, where the same people edit
  and review and a second editor may not know whom the first one asked
  to review.
- **Way round**: the editor can compare the chosen name with the
  "Reviewers" panel before pressing "OK". "Remove" on the participant's
  row closes the workflow to the reviewer again, but not what they have
  already seen.

Medium: the author's identity does reach an anonymous reviewer, and
nothing says so, but only when an editor assigns that same person, a
state few submissions reach. An assignment editors make routinely would
put it at high.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`, freshly loaded. [OMP: the
  same steps on submission 2, "The West and Beyond: New Perspectives on
  an Imagined Region", which is in external "Review"; step 4's reviewer
  group reads "External Reviewer", and step 6's role is "Series
  editor".]
- In the dataset no reviewer holds a role that "Assign" offers on a
  review stage, so steps 3 and 4 make the Section editor Minoti Inoue a
  reviewer of the submission.

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. Open submission 12, "Sodium butyrate improves growth performance of
   weaned piglets during the first period after weaning". It opens on
   its "Review" stage.
3. In "Reviewers" press "Add Reviewer", then "Enroll Existing User".
4. Under "Search By Name" type "Minoti" and pick "Minoti Inoue". Leave
   everything else as offered: "Enroll the user with this reviewer user
   group" at "Reviewer", the email, the two dates, and "Review Type" at
   "Anonymous Reviewer/Anonymous Author". Press "Add Reviewer".
5. In "Participants" press "Assign".
6. In the list under "Locate a User" choose "Section editor" and press
   "Search".
7. Tick the button in front of "Minoti Inoue".
8. Press "OK".
9. Sign in as `minoue` (password `minoueminoue`) and open
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=12`.

**Expected:** step 7 at once opens a box over the window, with one
button, "OK":

```
The participant you selected has been assigned to conduct an anonymous review. If you assign them as a participant, they will have access to the author's identity. You are encouraged not to assign this participant unless you can independently ensure the integrity of the peer review process.
```

**Observed:** step 7 opens nothing. Step 8 closes the window with the
notice "User added as a stage participant.", and "Participants" lists
Minoti Inoue as "Section editor" while "Reviewers" lists her with
"Request Sent" and "Anonymous Reviewer/Anonymous Author". In step 9 the
workflow opens for her headed "Christopher — Sodium butyrate improves
growth performance of weaned piglets during the first period after
weaning", with the "Participants" panel, the "Activity Log" and the
"Publication" menu; on `main` the Review stage also lists "Leo
Christopher" under "Author Response".

Controls:

- Before step 5, the address of step 9 shows `minoue` the title alone
  and "You don't currently have access to that stage of the workflow.",
  and her review request shows no author. After `dbarnes` removes her
  with "Remove" on her "Participants" row, it is so again.
- Ticking her on submission 7, "Developing efficacy beliefs in the
  classroom", which she does not review, opens no box, with or without
  the fix below.

## Cause

`AddParticipantForm::fetch()` works out the list correctly. While the
submission is in Internal or External Review it collects the reviewer
ids of the review assignments that are anonymous and not declined, and
the template hands them to the window's script as `anonymousReviewerIds`.
In the walk the window received `[7,8,6]`, Minoti Inoue being user 6.

The script never finds the chosen person in that list.
`StageParticipantNotifyHandler.prototype.maybeTriggerReviewerWarning()`
(`lib/pkp/js/controllers/grid/users/stageParticipant/form/StageParticipantNotifyHandler.js`,
line 278) reads the chosen id from the form's hidden `userIdSelected`
box, which gives text, and looks it up with `indexOf`:

```js
var userId = $(sourceElement).val(),
...
if (!userId || this.anonymousReviewerIds_.indexOf(userId) < 0) {
    return;
}
```

`indexOf` compares strictly, so `"6"` is not found among the numbers
`[7,8,6]` and the method returns before it opens the box.

When the warning was added in 2018 (9544e706c1, `pkp/pkp-lib#3499` for
`pkp/pkp-lib#3130`, first tagged 3.1.2), the reviewer ids came from the
database as text, so the list was `["7","8","6"]` and the lookup
matched. 42dd9f164b (first tagged 3.2.0) cast the review assignment's
ids to integers in `ReviewAssignmentDAO::_fromRow()`, so that the API
could compare them, and from then on the list holds numbers. On `main`
and 3.5 the id is read through the entity schema, where `reviewerId` is
an integer, so the list holds numbers there as well.

Reach:

- "Assign" on a journal's Review stage and a press's External Review:
  checked on screen. A press's Internal Review goes through the same
  form and script (read in the code).
- "Assign" opened on the Submission stage of a submission that is in
  review: the same window and list (read in the code).
- Once the submission has left review (Copyediting, Production) the list
  is empty, so no warning opens there even with the fix. That is how
  9544e706c1 wrote it ("If submission is in review"); whether a reviewer
  of an earlier stage should still be warned about is a product question
  this report leaves open (read in the code).
- A cancelled review stays in the list: `fetch()` leaves out declined
  reviews only, and the collector it calls with `filterBySubmissionIds()`
  alone does not drop cancelled ones (on 3.4 and 3.3,
  `ReviewAssignmentDAO::getBySubmissionId()` likewise). With the fix, a
  person whose anonymous review was cancelled would be warned about
  (read in the code).
- A preprint server has no review stage; its list is always empty.
- Nothing on the server refuses or flags the assignment, by design: the
  warning only advises, and its "OK" leaves the choice in place.
- No other script compares a form value with `indexOf` against a list of
  ids from the server (searched `lib/pkp/js`).

## Proposed fix

Read the chosen id as a number before the lookup
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/anonymous-reviewer-assign-no-warning/fix.diff)):

```diff
-		var userId = $(sourceElement).val(),
+		// The form holds the chosen user's id as text; the list holds numbers.
+		var userId = parseInt(/** @type {string} */ ($(sourceElement).val()), 10),
 				opts;
```

The existing `!userId` test also covers an empty box, which parses to
`NaN`.

The fix is two changes per branch: this commit in pkp-lib, and in each
app's repo a commit of the compiled `js/pkp.min.js` rebuilt with
`lib/pkp/tools/buildjs.sh`, which is the file a production install
loads. OPS's bundle carries the method too, so it is rebuilt with the
others although its list is always empty.

The pkp-lib change was tried on OJS and OMP `main`, which load the
uncompiled scripts: step 7 then opened the box with the text above and
the single "OK"; "OK" closed it with Minoti Inoue still ticked, and step
8 assigned her. The rebuilt bundle was not tried: the build needs Java,
the Closure compiler and jslint4java, which the test machine does not
have.

**Alternatives**

- A loop with `==`, as `updateRecommendOnly()` in the same file compares
  role ids: the same effect in more lines.
- Have `AddParticipantForm::fetch()` send the ids as text: the lookup
  would match again, but the script would still depend on the type the
  server happens to send, which is how it broke.

**What goes with it**

- The line is the same on `stable-3_5_0`, `stable-3_4_0` and
  `stable-3_3_0`, so the diff applies there as written, each with its
  apps' rebuilt bundles.
- Leaving cancelled reviews out of the list in `fetch()`
  (`&& !$reviewAssignment->getCancelled()`), so that the restored warning
  does not open for a person who no longer reviews. Not tried.
- Guard: an e2e scenario that enrolls a section editor as an anonymous
  reviewer and ticks them in "Assign" (a Planned item in spec U35).

Medium: the change is one line, but it lands as a pkp-lib commit plus a
rebuilt bundle committed in each of the three app repos, and the bundle
is the untried half.

## Evidence

- The kept scripts, with their helpers in `lib.js` beside them:
  - [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/anonymous-reviewer-assign-no-warning/walk.js)
    takes steps 1 to 8 on OJS and OMP.
  - [access.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/anonymous-reviewer-assign-no-warning/access.js)
    takes step 9 and the first control on OJS: as `minoue`, her review's
    page and the workflow's address after the review request, after the
    assignment and after "Remove", and her mailbox.
  - [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/anonymous-reviewer-assign-no-warning/neighbour.js)
    takes the second control: Minoti Inoue ticked and assigned on OJS
    submission 7, OMP submission 16 and, as "Moderator", OPS submission
    1. It was run with the fix and without.
  - They run in pkp-e2e, on an install freshly loaded from the default
    dataset (`npm run fleet-prep -- --feature <name> --dataset --reset`),
    with that feature name and any short id for the output folder:
    `PROBE_FEATURE=<name> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/anonymous-reviewer-assign-no-warning/walk.js`
- `walk.js` ran on OJS and OMP, `main` and `stable-3_5_0`, on
  PostgreSQL, with the same result on all four: the window's form
  carried `anonymousReviewerIds` `[7,8,6]` (OJS) and `[11,12,6]` (OMP),
  the ticked button's value was `6`, and no box opened. Datasets:
  pkp/datasets c657990 (2026-10-01).
- `access.js` ran on OJS `main` and `stable-3_5_0`, with the same
  result. Her mailbox held the "Invitation to review" from step 4 and
  nothing from the assignment. Whether the assignment puts a notice in
  her "Tasks" was not read.
- Not driven: 3.4 and 3.3 (read in the code); a press's Internal Review;
  "Anonymous Reviewer/Disclosed Author" (`fetch()` takes both anonymous
  types in the same `in_array()` condition); a declined, a cancelled or
  an "Open" review; a submission past review.
- Unverified: that the warning opened on 3.1.2, before the cast. The
  "regression" label rests on the code read of the two commits below,
  not on a walk of that version.
- Tips: OJS `main` 4408b94def (lib/pkp f5bd392a69), OMP `main` 3b0ecf794
  (lib/pkp 3dc90c81a6), OPS `main` c8af945bb7 (lib/pkp 3dc90c81a6);
  `stable-3_5_0` OJS 4fca1027f4, OMP c7b45f88e (lib/pkp 1fb843f491);
  `stable-3_4_0` OJS 9571d8fde7 (lib/pkp 30303e536a), OMP 0aec65441
  (lib/pkp df13621c2d); `stable-3_3_0` OJS 9fdb9bcf9a, OMP 8e72fc883
  (lib/pkp d446601ebe).
- Code reads:
  - `main`: `AddParticipantForm::fetch()`,
    `templates/controllers/grid/users/stageParticipant/addParticipantForm.tpl`
    (the list passed through `json_encode`),
    `AddParticipantFormHandler.js` (copies the ticked `userId` into
    `userIdSelected` and fires `change`),
    `StageParticipantNotifyHandler.js`, `ConfirmationModalHandler.js`,
    `ReviewAssignment::getReviewerId()`, `schemas/reviewAssignment.json`
    (`reviewerId`: integer) and `reviewAssignment/Collector.php` (its
    `cancelled` conditions sit under other filters).
  - 3.5: the same script line 278 and the same schema type.
  - 3.4 (both lib/pkp tips) and 3.3: the same script line 278, the
    template's `anonymousReviewerIds: {$anonymousReviewerIds|@json_encode}`,
    and `ReviewAssignmentDAO::_fromRow()` with
    `setReviewerId((int) $row['reviewer_id'])`.
  - The trace: `git log -L` on the lookup leads to 9544e706c1
    (2018-03-20), where `_fromRow()` set
    `setReviewerId($row['reviewer_id'])`; `git log -S` on the cast leads
    to 42dd9f164b, one of the commits of `pkp/pkp-lib#5406` ("Several
    PRs for issues in 3.2").
- Upstream searches (2026-10-01): pkp/pkp-lib by anonymous reviewer,
  participant, warning, author identity, blind reviewer, "anonymous
  review" with "stage participant", `maybeTriggerReviewerWarning`,
  `anonymousReviewerIds` and `reviewerWarning`; pkp/ojs, pkp/omp and
  pkp/ui-library by anonymous reviewer participant warning. The hits
  were the warning's own issue and PR (`pkp/pkp-lib#3130`,
  `pkp/pkp-lib#3499`) and other subjects (`pkp/pkp-lib#4915`,
  `pkp/pkp-lib#6297`, `pkp/pkp-lib#6629`).
