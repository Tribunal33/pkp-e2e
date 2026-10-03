# A Funding coordinator is offered "Request Response" and "Delete" on "Author Response", then refused

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS (a press never shows the table)
  - 3.5: none (no "Author Response" table)
  - 3.4: none (code; no author response)
  - 3.3: none (code; no author response)
- **Introduced** `pkp/ui-library#767` for `pkp/pkp-lib#12048` · [8d29739f](https://github.com/pkp/ui-library/commit/8d29739f60c4f2fd21417a8c68f74e42efed8cbf) · 2026-01-23 · Taslan A. Graham (taslangraham)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U30 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U30-author-response-to-reviews.md#a3)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

A Funding coordinator assigned to a submission sees the review
round's "Author Response" table with the same controls as an editor.
"Request Response" is enabled once the reviews are in, and once the
author has responded the row's menu offers "View" and "Delete". The
app refuses both actions. "Request Response" leads to a page reading
"The current role does not have access to this operation.". "Delete"
› "OK" ends in the dialog "Error" with that same sentence, and the
response stays.

"View" is part of the same fault. It opens the editors' window
"Author Response to Reviews" with editable fields and, where an editor
has "Save", the author's greyed "Submit Response", a button no
non-author can use.

The fix makes the controls follow the role the server checks. The
coordinator keeps "View", which then shows the response to read.

## Impact

- **Lost**: nothing. The request is not sent, the response is not
  deleted, and each refusal is shown. The coordinator's time goes on
  pressing controls that cannot work, and "Request Response" takes
  them out of the workflow to an access-denied page.
- **Who**: a Funding coordinator assigned to a submission, on the
  review stage of a journal, on every round once its reviews are in.
  Any assistant-level group a journal gives the review stage gets the
  same controls (read in the code); the Funding coordinator is the one
  default group that has it.
- **Way round**: none is needed. An assigned editor requests or
  deletes the response, and the coordinator can still read it in
  "View".

Low: the controls mislead, and no work or data is touched. It would
be medium if the screen showed a refused delete as done.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`. Submission 13, "Hydrologic
  Connectivity in the Edwards Aquifer between San Marcos Springs and
  Barton Springs during 2009 Drought Conditions", is in review round 1
  with revisions requested, its three reviews completed, and its
  author is `lkumiega`.
- The dataset has no Funding coordinator, so steps 1–2 give `svogt`
  (Sarah Vogt) that role and assign `svogt` to submission 13.

1. Sign in as `admin`. Administration › "Hosted Journals" › "Settings
   wizard" of the journal › "Users". Search `svogt`, "Edit User",
   tick "Funding coordinator", "OK". (The admin's "Users" grid gives the
   role at once; on `main` the journal's "Users & Roles" sends a role
   invitation that `svogt` would first have to accept.)
2. Sign in as `dbarnes`. Open submission 13. Under "Participants",
   "Assign": role "Funding coordinator", "Search", "Sarah Vogt", "OK".
3. Sign in as `svogt`. Open submission 13 (it opens on "Review Round
   1"). In the "Author Response" table, the row "Lise Kumiega" reads
   "Ready to invite author" and "Request Response" is enabled.
4. Press "Request Response".
5. Sign in as `lkumiega`. Open submission 13 from "My Submissions". The
   "Author Response" card is there although step 4's request was
   refused, because the round's status is "revisions requested". Press
   "Submit Response", type a response, tick "Lise Kumiega", press
   "Submit Response".
6. Sign in as `svogt`. Open submission 13. On the row "Lise Kumiega"
   press "More Actions" ("…").
7. Press "View". Read the window, then "Cancel".
8. "More Actions" › "Delete" › "OK".
9. Press "OK" on the dialog that follows. Reopen the submission.

**Expected**: the coordinator, who may not request, edit or delete a
response, is offered neither "Request Response" (step 3) nor "Delete"
(step 6). "View" shows the response to read, without a button that
cannot be used.

**Observed**: step 3 shows "Request Response" enabled. Step 4 lands on
`/index.php/publicknowledge/en/user/authorizationDenied?message=user.authorization.roleBasedAccessDenied`,
which reads "The current role does not have access to this
operation.". Step 6 offers "View" and "Delete", both enabled. Step 7
shows "Author Response to Reviews" with "The following response was
submitted by the author, Lise Kumiega. Editors may review the response
and make edits if necessary.", editable "Author Response" and
"Authors" fields, "Cancel" and a greyed "Submit Response". At step 8
the delete request answers 401 and the dialog reads:

```
Error
The current role does not have access to this operation.
```

At step 9 the row still reads "A response was submitted by Lise
Kumiega".

`dbarnes` and the assigned Section editor `dbuskins` on the same round
have "Request Response", which opens "Request Author Response", "View"
with "Save", and "Delete", which removes the response.

## Cause

The table's controls check the round and the response, never the
viewer's role. In ui-library, `workflowConfigEditorialOJS.js` (line
378) adds `AuthorResponseRequestManager` to the review stage for every
user of the editorial view, assistants included. Its config,
`useReviewRoundAuthorResponseConfig.js`
(`src/managers/ReviewRoundResponseManager/AuthorResponseRequestManager/`),
builds the controls:

- `getTopItems()` (line 82) always returns the "Request Response"
  button. `AuthorResponseRequestManagerActionButton.vue` disables it
  only on `!store.canRequestReviewRoundAuthorResponse`, which reads the
  reviews and whether a response exists.
- `getAuthorItemActions()` (line 48) adds "View" and "Delete" to every
  row once a response exists, disabled only on rows other than the
  submitter's.

The server admits only three roles, each held in the context:
`ROLE_ID_MANAGER`, `ROLE_ID_SITE_ADMIN` and `ROLE_ID_SUB_EDITOR`.
A user whose only role there is `ROLE_ID_ASSISTANT` is refused at that
gate (401 `user.authorization.roleBasedAccessDenied`). Past it, the
three actions differ:

- The request page: lib/pkp `ReviewResponseHandler::__construct()`
  assigns `requestAuthorResponse` to the three roles, and
  `authorize()` adds `SubmissionAccessPolicy` and
  `ReviewStageAccessPolicy`.
- The edit, `PUT
  reviews/{submissionId}/{reviewRoundId}/authorResponse/{responseId}`
  (`PKPReviewController::getGroupRoutes()`): `EditResponse::passedValidation()`
  further admits only a user assigned to the round's stage in a
  sub-editor group, a manager of the context or a site administrator.
- The delete, `DELETE` on the same address: `deleteAuthorResponse()`
  checks nothing beyond the route's role gate and
  `SubmissionAccessPolicy`; it deletes by round and response id.

The response window already follows the role rule, and the table does
not. `useAuthorResponseForm.js` sets `isEditor` from
`hasCurrentUserAtLeastOneAssignedRoleInStage(submission, stageId,
[ROLE_ID_SUB_EDITOR, ROLE_ID_MANAGER, ROLE_ID_SITE_ADMIN])` and enables
the submit button only for an editor (to save) or an author (to submit
a first response). For a user who is neither, the button keeps the
author's label, "Submit Response", greyed. Above it,
`AuthorResponseFormModal.vue` shows the editors' note to every user who
is not an author.

Reach:

- In OJS's default user groups, the Funding coordinator is the only
  assistant group whose stages include review (`registry/userGroups.xml`,
  stages 1 and 3). An assistant group a journal gives the review
  stage meets the same controls (read in the code, not walked).
- A press: OMP's `useWorkflowConfigOMP.js` merges the OJS editorial
  config, so its review stage lists `AuthorResponseRequestManager`, but
  `WorkflowPageOMP.vue` never registers that component, so no press
  shows the table (read in the code, not walked). A preprint server
  has no review stage.
- The author's "Author Response" card (`AuthorResponseManager.vue`) is
  shown only to assigned authors and is not affected (read in the
  code, not walked).

## Proposed fix

Gate the table's controls with the role test the window already uses
for "Save", and open "View" read-only for everyone else. All four
changes are in ui-library, under
`src/managers/ReviewRoundResponseManager/`:

- `AuthorResponseRequestManagerStore.js` adds a computed
  `canManageAuthorResponse`, set by
  `hasCurrentUserAtLeastOneAssignedRoleInStage()` with the sub-editor,
  manager and site administrator roles, and passes it to
  `getTopItems()` and `getAuthorItemActions()`.
- `useReviewRoundAuthorResponseConfig.js`: `getTopItems()` returns no
  "Request Response" without the flag, and `getAuthorItemActions()`
  adds "Delete" only with it. "View" stays for everyone who sees the
  table.
- `useAuthorResponseForm.js` returns `isDisplayOnly` (neither an author
  nor an editor) and gives that user no submit button.
  `AuthorResponseFormModal.vue` passes it to the form as
  `:display-only`, the read-only form that
  `DiscussionManagerFormDisplayModal.vue` and `ReviewDetailsModal.vue`
  already use. With no submit button the form shows no footer at all,
  so "Cancel" goes too; the window's own "Close" remains.

An excerpt of
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/funding-coordinator-author-response-offered-then-refused/fix.diff),
the table part of `useReviewRoundAuthorResponseConfig.js`; the file
has every line:

```diff
-	function getTopItems() {
+	function getTopItems({canManageAuthorResponse = false} = {}) {
+		if (!canManageAuthorResponse) {
+			return [];
+		}
+
 		return [
```

```diff
-		actions.push(
-			{
-				label: t('common.view'),
-				...
-			},
-			{
+		actions.push({
+			label: t('common.view'),
+			icon: 'View',
+			name: Actions.RESPONSE_VIEW,
+			disabled: submittingUser.id !== authorUser.id,
+		});
+
+		// Only the roles that may delete the response are offered "Delete"
+		if (canManageAuthorResponse) {
+			actions.push({
 				label: t('common.delete'),
```

The fix was tried on `main` with the Steps. The Funding coordinator
had no "Request Response" and only "View" in the row's menu. "View"
showed the response and the ticked author as text, with only the
window's "Close". The editors' and the author's paths gave the same
result with the fix in and out. `dbarnes` and `dbuskins` still opened
"Request Author Response", `dbuskins` still had "Save" in "View",
`dbarnes` deleted the response, and `lkumiega` still submitted a
response and was offered "Submit Response" again after the delete.

Left as they are: the coordinator still reads the editors' note "The
following response was submitted by the author, … Editors may review
the response and make edits if necessary." in "View", and the
"Response Status" cells, such as "Ready to invite author" with "Editor
can now request the author's response.". Both describe what editors
may do and stay true for the reader, so they are not part of the fix.
A note of its own for read-only readers would need a new locale key.

**Alternatives**:

- Hide "View" from the coordinator too. That takes away the only
  place where an assigned coordinator, who can read the reviews, reads
  the author's answer to them. Whether they should read it is the
  team's decision.
- A server-computed flag on the review round, like the one the
  "Modify Review" report proposes
  ([U27 A30, A31](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U27-A30-A31-modify-review-offered-then-refused.md)).
  It would match the server exactly, also for the manager or section
  editor assigned in an assistant group (next section), but it adds an
  API field for a rule the window already reads on the client.
- Admitting assistants on the routes is a product decision, and
  nothing in the feature asks for it.

**What goes with it**:

- No stored data and no REST API change. A plugin that overrides
  `getTopItems()` or `getAuthorItemActions()` through the extender gets
  one more argument and can ignore it.
- The role test reads `stages[].currentUserAssignedRoles`, which lists
  the roles of the user's assignments on this submission. A user with
  the manager role in the journal who is assigned to this submission
  only in an assistant group loses all three controls, although the
  server accepts all three from them. A user with the section editor
  role in the journal, assigned the same way, loses "Request Response"
  and "Delete", which the server accepts, while the server refuses
  their edit anyway (`EditResponse`). The window's "Save" already
  treats both that way today (read in the code, not walked).
- Guard: spec U30 scenario 6 asserts the Funding coordinator's
  access-denied page today. A **Planned** item there would assert that
  "Request Response" and "Delete" are missing and that "View" is
  read-only.

Small: four files in one ui-library folder, following the role test
the window already uses, with no data repair and no API change.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/funding-coordinator-author-response-offered-then-refused/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/funding-coordinator-author-response-offered-then-refused/lib.js).
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/funding-coordinator-author-response-offered-then-refused/walk.js`
  takes the Steps; `MODE=nb` in front takes the editors' and the
  author's paths alone.
- Walked on PostgreSQL, PKP's default test dataset at pkp/datasets
  566bb1f (2026-10-03): OJS `main` at ff004d0973 (lib/pkp 987776cd04,
  lib/ui-library 64d67363); OJS `stable-3_5_0` at c1cee76b95 (lib/pkp
  771474347e, lib/ui-library d4e01883). On 3.5, steps 1–3 were taken: the
  Funding coordinator's "Review Round 1" shows "Reviewers" and "Review
  Discussions" but no "Author Response" table, and 3.5's lib/pkp and
  ui-library have no author-response code.
- 3.4 and 3.3, read in the code: lib/pkp `origin/stable-3_4_0`
  (767353f4fe) and `origin/stable-3_3_0` (ac3fa73402) have no
  `api/v1/reviews/` author-response routes and no
  `pages/reviewResponse/`. ui-library `origin/stable-3_4_0` (ee684b34)
  and `origin/stable-3_3_0` (96959f9e) have no
  `ReviewRoundResponseManager`. The feature arrived with
  `pkp/pkp-lib#12048` for 3.6.
- Introduced: `git blame` on `getTopItems()`, `getAuthorItemActions()`
  and the action button leads to 8d29739f, the commit that created the
  three files. `commits/<sha>/pulls` names `pkp/ui-library#767` ("pkp/pkp-lib#12048
  Capture author review response"), merged 2026-01-23. The later
  changes to the folder (`pkp/ui-library#778`, `#807`, `#853`, 160a32d2)
  did not touch the role checks.
- Tracker search (2026-10-04): pkp/pkp-lib, pkp/ojs and pkp/ui-library,
  issues and PRs, for "author response" with "funding coordinator",
  "assistant", "role", "delete permission" and "unauthorized", for
  "[Author Response]", and for `AuthorResponseRequestManager`,
  `useReviewRoundAuthorResponseConfig`, `requestAuthorResponse`,
  `editAuthorResponse` and `deleteAuthorResponse`. Read and set aside:
  `pkp/pkp-lib#12307` (readiness of the button and the email template),
  `pkp/pkp-lib#13206` (the request page failing on stored locales) and
  `pkp/ui-library#981` (moving the author's card).
