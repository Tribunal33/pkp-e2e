# A press's discussion window lists an External Review reviewer as "Internal Reviewer"

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#12010` for `pkp/pkp-lib#12009` · [b05dbf9cb1](https://github.com/pkp/pkp-lib/commit/b05dbf9cb1f33ba09ece568ba8273fdc01487d10) and [adbde238ed](https://github.com/pkp/pkp-lib/commit/adbde238ed7638db5b38718550ba52bca0fdf626) · committed 2025-11-10 and 2025-11-11 · Vitaliy Bezsheiko (Vitaliy-1)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U37 [OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U37-tasks-and-discussions.md#omp1)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a press, the "Add" window of "Review Tasks & Discussions" lists every
reviewer under "Participants" with the same reviewer role, whichever
stage they review in. On the default press that role is "Internal
Reviewer", so an External Review reviewer reads "Internal Reviewer". The
same reviewer, once ticked and saved, reads "External Reviewer" in the
discussion's "Edit" window.

Nothing is lost and the discussion reaches the right people. But an
editor who checks the role before ticking a reviewer is told the wrong
one.

The role printed is the first of the press's two reviewer roles that
the database returns. A press where that is "External Reviewer" sees
the reverse: its Internal Review reviewers read "External Reviewer".

## Impact

- **Lost**: nothing; the discussion reaches the people ticked.
- **Who**: an editor, an author in an open review, or a reviewer
  starting a discussion, every time the "Add" window opens on one of a
  press's two review stages: on the default press, External Review.
- **Way round**: none needed for a label. Only a reviewer already ticked
  in a saved discussion reads the right role, in its "Edit" window.

Low: a wrong label, and nothing sent or saved wrong apart from the
History case in the Cause.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main` (press `publicknowledge`).
- Submission 16, "A Designer's Log: Case Studies in Instructional
  Design", is in External Review, round 1. Adela Gallego (`agallego`)
  holds only the "External Reviewer" role and has completed her review
  there. Nothing else is needed.

The editor's "Add" window:

1. Sign in as `dbarnes`.
2. Open submission 16 and choose "External Review" › "Round 1" in the
   side menu.
3. Under "Review Tasks & Discussions", press "Add".
4. Read the line under "Adela Gallego (agallego)" in "Participants".

The saved discussion's "Edit" window:

5. Type "Figure check u37r16" in "Name", tick "Adela Gallego
   (agallego)", type "Please look again at figure 2." in the message box
   and press "Save".
6. In the "Figure check u37r16" row, open "More Actions" and choose
   "Edit".
7. Read the line under "Adela Gallego (agallego)", then close the
   window. She is the only reviewer listed: Al Zacharia and Gonzalo
   Favio, the stage's other reviewers, have not accepted, so neither
   window lists them.

The reviewer's own "Add" window:

8. Sign out, sign in as `agallego` and open the review of "A Designer's
   Log". It opens on "4. Completion".
9. Under "Review Tasks & Discussions", press "Add" and read the line
   under "Adela Gallego (agallego) (Me)".

**Expected**: Adela Gallego reads "External Reviewer", her role and the
reviewer role the press assigns to External Review, in steps 4, 7
and 9.

**Observed**: steps 4 and 9 read "Internal Reviewer"; step 7 reads
"External Reviewer":

```
4  Adela Gallego (agallego) Internal Reviewer Round 1 - Anonymous Reviewer/Anonymous Author
7  Adela Gallego (agallego) External Reviewer Round 1 - Anonymous Reviewer/Anonymous Author
9  Adela Gallego (agallego) (Me) Internal Reviewer Round 1 - Anonymous Reviewer/Anonymous Author
```

Control: on submission 12, "Connecting ICTs to Development" (Internal
Review, round 1), the same "Add" window lists Paul Hudson (`phudson`,
"Internal Reviewer" only) as "Internal Reviewer". That is right only
because "Internal Reviewer" is the press's first reviewer role.

## Cause

The role under a participant's name comes from
`EditorialTaskParticipantResource::toArray()` in pkp-lib. For a
participant with a review assignment, it prints the name of the first
reviewer-level user group in the groups the controller hands it. It
does not check that the participant holds that group, or that the group
belongs to the stage of the review (lines 52–59, from
[adbde238ed](https://github.com/pkp/pkp-lib/commit/adbde238ed7638db5b38718550ba52bca0fdf626),
"fix reviewer user group name"). A press has two reviewer groups:
"Internal Reviewer" is assigned to Internal Review and "External
Reviewer" to External Review.

`EditorialTaskController::getParticipants()` (the list behind the "Add"
window) hands the resource one reviewer group:
`UserGroup::…->where('role_id', Role::ROLE_ID_REVIEWER)->where('context_id', …)->first()`
(lines 873–875, from
[b05dbf9cb1](https://github.com/pkp/pkp-lib/commit/b05dbf9cb1f33ba09ece568ba8273fdc01487d10)).
That query has no order and no stage, so every reviewer of either stage
gets whichever of the press's two groups the database returns first. On
the default dataset that is "Internal Reviewer" (group 17).

The "Edit" window calls the same `GET …/tasks/participants`, then
merges in the saved item's own participants: `getAllParticipants()` in
ui-library `src/managers/DiscussionManager/useDiscussionManagerForm.js`
de-duplicates the two lists by `userId`, and the saved entry wins. The
saved entries come from `getTaskData()`, which passes only the groups
the item's participants hold. When Adela Gallego is the only
participant holding a reviewer group, that group, "External Reviewer",
is the only one the resource can pick, so she reads right. A reviewer
who has accepted but is not ticked comes from the endpoint alone and
reads "Internal Reviewer" in the "Edit" window too (code; submission 16
has no such reviewer).

Reach:

- The "Add" window for every role that sees reviewers: an editor, an
  author in an open review, and a reviewer listing themself. All three
  go through `getParticipants()` (code; the editor's and the reviewer's
  were walked).
- The "Edit" window and the task's own participant list
  (`TaskResource`, `getTaskData()`): when the participants hold
  different reviewer groups, every reviewer gets the first one (code).
- The History's role words (`getUserUserGroups()`, lines 1142–1147):
  these take the user's own reviewer group, but `->get()->first()`
  without order. Someone holding both of a press's reviewer roles gets
  either one (code). Unlike the participant labels, these are saved:
  they go into the event log's `userGroupNames` when the entry is
  written, so an entry logged with the wrong role keeps it.
- A journal that has created a second reviewer-level role meets the same
  fault (code). A preprint server has no review stage.

## Proposed fix

Recommended (proposed; the team decides): let the resource choose each
reviewer's own group, the one assigned to the stage of their review, and
let the controller hand it every reviewer group of the context. In
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/external-reviewer-listed-as-internal/fix.diff):

- `EditorialTaskParticipantResource`: a new
  `getReviewerRoleName($userGroups, $reviewAssignments)`. Of the
  reviewer groups assigned to the stages of the participant's review
  assignments (`UserGroup::getAssignedStageIds()`), it takes the one the
  participant holds (`userUserGroups`). Failing that, it takes a
  reviewer group assigned to the review's stage, then any reviewer group
  the participant holds, then the generic `user.role.reviewer` ("Reviewer"). It replaces the "first
  reviewer group" pick in the loop.
- `EditorialTaskController::getParticipants()`: load all of the
  context's reviewer groups (`withContextIds()->withRoleIds([ROLE_ID_REVIEWER])->orderById()`,
  with `userUserGroups` as before) and put each one where the single
  group was put. This also removes the dereference of a null group on a
  context that has deleted its reviewer roles.
- `EditorialTaskController::getUserUserGroups()`: prefer the user's
  reviewer group assigned to the task's stage, with `orderById()` for
  the rest. This covers the History's instance.

Choosing a reviewer group by stage follows the stage-to-group
assignment the press keeps under Settings › Users & Roles › Roles, the
same one `Repo::userGroup()->getUserGroupsByStage()` reads.

Tried on OMP and OJS `main`. With the fix in, steps 4, 7 and 9 read
"External Reviewer", and the control still reads "Internal Reviewer".
A journal's reviewers (OJS submission 10, Aisla McCrae and Adela
Gallego) read "Reviewer" with the fix in and out. No server error.

**Alternatives**:

- Only give `getParticipants()` the stage's reviewer group
  (`getUserGroupsByStage($contextId, $stageId, ROLE_ID_REVIEWER)`). This
  fixes the "Add" window, but the resource still prints one group for
  every reviewer when the participants hold different ones.
- Print the generic "Reviewer", as 3.5's discussion form did. This
  drops the press's own role names, which adbde238ed set out to show.

**What goes with it**:

- The REST answer keeps its shape. Only `roles[].name` for a reviewer
  changes, in `GET …/stages/{stageId}/tasks/participants` and in the
  task resources, so the "Edit" window's unticked reviewers read right
  too.
- No repair proposed for History entries already logged with the wrong
  role. Only a person holding both reviewer roles gets one, the words
  are a label, and the fault exists only on `main`, so no released
  install holds such entries.
- No backport: 3.5, 3.4 and 3.3 build the list in the legacy
  `QueryForm`, which prints "Reviewer".
- `getAssignedStageIds()` queries once per reviewer group per reviewer
  participant, which is a handful of queries.
- The guard: a pkp-lib unit test of the resource with two reviewer
  groups on two stages, and an e2e check of each reviewer's role line
  on a press.

Small: one controller and its resource in pkp-lib, tried as written.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/external-reviewer-listed-as-internal/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/external-reviewer-listed-as-internal/lib.js))
  takes the Steps and the control on OMP and records each participant
  line. The neighbour check
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/external-reviewer-listed-as-internal/neighbour.js)
  reads a journal's "Add" window on OJS. Each runs on an install
  freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/external-reviewer-listed-as-internal/walk.js`.
- Walked on OMP `main` and `stable-3_5_0`, on PostgreSQL; the neighbour
  on OJS `main`. Dataset: pkp/datasets c657990 (2026-10-01). MySQL not
  checked.
- 3.5 (walked, editor's side only): the "Discussions" list's "Add
  discussion" form lists "Adela Gallego, Reviewer (Anonymous
  Reviewer/Anonymous Author)" and "Paul Hudson, Reviewer (Anonymous
  Reviewer/Anonymous Author)". `QueryForm::fetch()` builds the line from
  `user.role.reviewer` and the review method. The reviewer's side was
  not walked there; it uses the same form.
- 3.4 and 3.3 (code): pkp-lib `stable-3_4_0`
  `controllers/grid/queries/form/QueryForm.php` and `stable-3_3_0`
  `QueryForm.inc.php` print reviewers the same way, "Reviewer (…)".
- Not walked: an accepted but unticked reviewer in the "Edit" window
  (the dataset's submission 16 has none). Not walked: the author's window. The dataset has no open review on a
  press, and an author sees no anonymous reviewer. It takes the same
  `getParticipants()` path. A person holding both reviewer roles
  (`getUserUserGroups()` and the resource's preference) is covered by
  the fix in the code but was not walked.
- Tips: OMP `main` 3b0ecf794c (lib/pkp 3dc90c81a6, lib/ui-library
  280f98c5); OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a). OMP
  `stable-3_5_0` c7b45f88ea (lib/pkp 1fb843f491). OMP `stable-3_4_0`
  0aec65441f and `stable-3_3_0` 8e72fc8836; pkp-lib `stable-3_4_0`
  32b0f4b4af and `stable-3_3_0` f6ab331645.
- The trace: before adbde238ed, in aff80d393e
  (`pkp/pkp-lib#11699`), the condition `!is_null($reviewerRoleName)`
  never held, so no reviewer role name was printed. Both commits are in
  `pkp/pkp-lib#12010`.
- Upstream: pkp/pkp-lib, pkp/omp and pkp/ui-library searched
  2026-10-02.
