# A Funding coordinator is offered "Add Reviewer" on a suggested person without an account, then refused

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP (from the "Add Reviewer" window only)
  - 3.4: none (code; no reviewer suggestions)
  - 3.3: none (code; no reviewer suggestions)
- **Introduced** `pkp/ui-library#426` for `pkp/pkp-lib#4787` · [1e0faa4a](https://github.com/pkp/ui-library/commit/1e0faa4a0d5ea1bce3ec41d58a6aa3820da7bc80) · 2025-02-27 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U31 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U31-reviewer-suggestions.md#a5)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

A Funding coordinator assigned to a submission whose author suggested
reviewers is offered to turn a suggested person who has no account
into a reviewer. "Select Reviewer" in the "Add Reviewer" window, or
"Add Reviewer" in the person's menu under "Reviewers Suggested by
Author", opens a form on "Create New Reviewer", filled in. Its "Add
Reviewer" is refused with a browser alert, "The current role does not
have access to this operation.", and the form stays open.

The coordinator's role may not create reviewer accounts, and for that
reason the "Add Reviewer" window does not show the coordinator its own
"Create New Reviewer" link. A suggested person who has an account but
no reviewer role opens the "Enroll an Existing User as Reviewer" form
instead and meets the same refusal (read in the code, not walked).

It needs "Reviewer Suggestion at Submission" switched on.

## Impact

- **Lost**: nothing. No reviewer is added, the refusal is shown, and
  the form keeps what was typed; the alert does not say what to do
  instead.
- **Who**: a Funding coordinator assigned to a submission in review,
  for each suggested person without a reviewer role. Any user group a
  journal or press defines at the Assistant permission level with
  access to a review stage meets the same (read in the code); in a
  default install the Funding coordinator is the only such group.
- **Way round**: an editor or section editor adds the person from the
  same list. The coordinator can still add a suggested person who
  already holds a reviewer role.

Low: a role is offered a step it may not finish and is told so. It
would be medium if the refusal were silent or if coordinators were
meant to add new reviewers.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (OMP `main` the same, with
  the differences in brackets).
- The dataset has no Funding coordinator, no pending reviewer
  suggestion, and "Reviewer Suggestion at Submission" off; steps 1–5
  make them. The suggestions are "Nova Newcomer"
  (nova.u31q1@mailinator.com, no account) and "Adela Gallego"
  (agallego@mailinator.com, the dataset's reviewer `agallego`).

1. Sign in as `admin`. Settings › Workflow › "Review" › "Setup":
   tick "Allow authors to suggest potential reviewers at submission
   process", "Save".
2. Administration › "Hosted Journals" [OMP: "Hosted Presses"] ›
   "Settings wizard" of the journal › "Users". Search `svogt`, "Edit
   User", tick "Funding coordinator", "OK". (The admin's "Users" grid
   gives the role at once; the journal's "Users & Roles" sends a role
   invitation that `svogt` would first have to accept.)
3. Sign in as `ccorino` [OMP: `aclark`]. "New Submission": title "u31q1
   Reviewer suggestions", section "Articles" [OMP: no section], tick
   the boxes, "Begin Submission". Upload a file, type an abstract [3.5:
   the wizard opens on "Details", then "Upload Files"] and
   "Continue" through the steps. On "Reviewer Suggestions" press "Add
   Reviewer Suggestion": Given Name "Nova", Family Name "Newcomer",
   Email nova.u31q1@mailinator.com, Affiliation "u31q1 Institute", a
   reason, "Save". Add "Adela" "Gallego", agallego@mailinator.com, the
   same way. "Continue" to "Review", tick the confirmation, "Submit",
   "Submit".
4. Sign in as `dbarnes`. Open "u31q1 Reviewer suggestions". "Send for
   Review" [OMP: "Send to External Review"], "Continue" to "Record
   Decision".
5. Under "Participants", "Assign": role "Funding coordinator",
   "Search", "Sarah Vogt", "OK".
6. Sign in as `svogt`. Open the submission. It opens on "Review Round
   1" [OMP: "External Review"], and "Reviewers Suggested by Author"
   lists Nova Newcomer and Adela Gallego, each with a "…" menu. [3.5:
   a dialog "Error", "The current role does not have access to this
   operation.", opens instead of the panel; press "OK". Step 9 cannot
   be taken there.]
7. Under "Reviewers", press "Add Reviewer". "Select a Reviewer from
   Reviewer Suggestions" lists both, each with "Select Reviewer".
   Press "Select Reviewer" on Nova Newcomer.
8. A second "Add Reviewer" window opens by itself on the "Create New
   Reviewer" form, with Nova Newcomer's name and email filled in (the
   coordinator presses no link). Type `novau31q1` in "Username" and
   press "Add Reviewer".
9. Close both windows with their "Close" arrows. Under "Reviewers
   Suggested by Author", press Nova Newcomer's "…" › "Add Reviewer".
   Type `novau31q1` in "Username" and press "Add Reviewer".

**Expected**: the coordinator, who may not create reviewer accounts,
is offered neither "Select Reviewer" on Nova Newcomer (step 7) nor
"Add Reviewer" in her menu (step 9). "Select Reviewer" on Adela
Gallego, who holds a reviewer role, stays.

**Observed**: at step 7 the window offers "Select Reviewer" on both
entries, and no "Create New Reviewer" or "Enroll Existing User" link.
"Select Reviewer" on Nova Newcomer opens a second window, "Create New
Reviewer", with "Nova", "Newcomer" and nova.u31q1@mailinator.com
filled in. At step 8 the form posts to
`$$$call$$$/grid/users/reviewer/reviewer-grid/create-reviewer`, which
answers 200 with

```json
{"status": false, "content": "The current role does not have access to this operation."}
```

and the browser shows that text as an alert. After "OK" the form is
still open with what was typed, and "Reviewers" reads "No Items".
Step 9's menu holds "Add Reviewer", which opens the same form with
the same refusal.

`dbarnes` on the same round has the "Create New Reviewer" and "Enroll
Existing User" links in the window; his "Select Reviewer" on Nova
Newcomer and "Add Reviewer" in the second window close both windows
and list Nova Newcomer under "Reviewers" as "Request Sent".

## Cause

The Funding coordinator has `ROLE_ID_ASSISTANT`, and
`PKPReviewerGridHandler::__construct()` (lib/pkp
`classes/controllers/grid/users/reviewer/PKPReviewerGridHandler.php`)
grants that role every review-round operation except `createReviewer`,
`enrollReviewer` and `gossip`: assistants may not make user accounts
or give a user the reviewer role. Those two operations go to
`ROLE_ID_MANAGER`, `ROLE_ID_SITE_ADMIN` and `ROLE_ID_SUB_EDITOR`, held
in the current context or the site, together with access to the
review stage. `AdvancedSearchReviewerForm::fetch()` shows the "Create
New Reviewer" and "Enroll Existing User" links for a narrower set,
`ROLE_ID_MANAGER` and `ROLE_ID_SUB_EDITOR` only: a site administrator
without a role in the journal gets no link, although the handler
would let them create the reviewer.

The two ui-library controls that turn a suggestion into a reviewer do
not follow it. Both open `showReviewerForm`, which the role may call,
with `selectionType` `REVIEWER_SELECT_CREATE` for a person without an
account and `REVIEWER_SELECT_ENROLL_EXISTING` for an account without a
reviewer role, for anyone who sees them:

- `SelectReviewerSuggestionListItem.vue`: `canSelect` hides the
  button only when the person is already assigned (its other test
  reads `this.approvedAt`, which the component never defines, so it
  always passes), and `select()` picks the form.
- `useReviewerSuggestionManagerActions.js`: `getItemActions()` gives
  every row "Add Reviewer", and `reviewerSuggestionApprove()` picks the
  form the same way.

The form's "Add Reviewer" then posts `createReviewer` (or
`enrollReviewer`), which the role-based policy refuses. A refused
legacy grid call answers 200 with `status: false`, and
`$.pkp.classes.Handler.prototype.handleJson()` shows its `content` with
`alert()`, so the user gets the generic refusal and the form stays.

On `main` the panel row's menu became reachable for the coordinator
with `pkp/pkp-lib#13191`, which let assistants read the suggestions
API.

Reach:

- A suggested person whose account has no reviewer role in the
  context: the same controls open "Enroll an Existing User as
  Reviewer", and `enrollReviewer` is refused the same way (read in the
  code, not walked).
- A person who already holds a reviewer role: `select()` fills the
  outer window's "Selected Reviewer" and the request posts
  `updateReviewer`, which the role may call.
- Every user group with `ROLE_ID_ASSISTANT` and a review stage, and an
  OMP press's internal review, whose "Add Reviewer" window shows the
  same list; OMP's Funding coordinator has stages 1, 2 and 3 (read in
  the code).
- OPS has no reviewer suggestions.

## Proposed fix

Let the server say, per suggestion, whether the current user may turn
it into a reviewer, and have both controls read that. The rule is
`PKPReviewerGridHandler`'s per-context grant, so the role list is held
once there and read by both the grant and the flag
([fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/funding-coordinator-create-reviewer-from-suggestion-does-nothing/fix-ojs.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/funding-coordinator-create-reviewer-from-suggestion-does-nothing/fix-omp.diff);
the same change, apart from each app's `schemas/submission.json`):

- `PKPReviewerGridHandler` gets
  `REVIEWER_ACCOUNT_ROLES = [ROLE_ID_MANAGER, ROLE_ID_SITE_ADMIN,
  ROLE_ID_SUB_EDITOR]`, and the constructor grants every operation to
  that constant instead of the literal list.
- `ReviewerSuggestionResource::toArray()` adds
  `canCurrentUserAddAsReviewer`: true when the person already has a
  reviewer role, otherwise when the current user holds one of
  `REVIEWER_ACCOUNT_ROLES` in the submission's context or the site,
  as `UserRolesRequiredPolicy` reads roles for the grid. Both lists
  already go through this class: the panel through the suggestions
  API, the window's list through `PKPSelectReviewerListPanel` and
  `Schema::getPropertyReviewerSuggestions()`.
- Each app's `schemas/submission.json` declares the property under
  `reviewerSuggestions`, since `getPropertyReviewerSuggestions()` keeps
  only declared keys.
- ui-library: `SelectReviewerSuggestionListItem.vue`'s `canSelect`
  returns false without the flag, so the entry is listed without
  "Select Reviewer" and with nothing in its place. The panel's store carries
  the flag, `getItemActions({reviewerSuggestion})` returns no "Add
  Reviewer" without it, and `ReviewerSuggestionManager.vue` shows the
  "…" menu only with it (the store's `itemActions` computed, read
  nowhere else, becomes `getItemActions(reviewerSuggestion)`).

```diff
+    protected function canCurrentUserCreateOrEnrollReviewer(): bool
+    {
+        $user = Application::get()->getRequest()->getUser();
+        if (!$user) {
+            return false;
+        }
+
+        return $user->hasRole(PKPReviewerGridHandler::REVIEWER_ACCOUNT_ROLES, $this->submission->getData('contextId'))
+            || $user->hasRole(PKPReviewerGridHandler::REVIEWER_ACCOUNT_ROLES, Application::SITE_CONTEXT_ID);
+    }
```

The flag follows the handler's grant, not the link check in
`AdvancedSearchReviewerForm::fetch()`: a site administrator without a
journal role keeps "Select Reviewer" on Nova Newcomer and can create
her, as the handler allows (read in the code). Bringing the link check onto the same
constant would give that administrator the two links as well; it is
left out here as a separate change.

The fix was tried on `main`, OJS and OMP, with the Steps. The
coordinator's list showed Nova Newcomer without "Select Reviewer", her
row under "Reviewers Suggested by Author" had no "…" menu, and no
alert came; Adela Gallego kept both controls. With `svogt` also made
manager of a second journal (press) on the install, the controls on
Nova Newcomer stayed hidden in `publicknowledge`. These paths behaved
the same with the fix in and out: the coordinator's "Select Reviewer"
on Adela Gallego still sent her request, and `dbarnes` still had Nova
Newcomer's menu and "Select Reviewer" and created her as a reviewer.
No server or script error was logged.

**Alternatives**:

- Check the roles in the browser only: a `hasCurrentUserAtLeastOneRole()`
  test with the same three roles in ui-library, the pattern of
  `canCurrentUserEditParticipant()`. One repository, and it works as a
  stopgap, but `pkp.currentUser.roles` holds the user's roles in every
  context of the install: a Funding coordinator here who manages
  another journal or press keeps both controls and is still refused.
  `canCurrentUserEditParticipant()` has the same gap. It also copies
  the server's role list into a second repository.
- Let assistants call `createReviewer` and `enrollReviewer` when the
  form comes from a suggestion: that hands account creation to a role
  the grid keeps it from, a product decision rather than a fix.
- Keep the controls and refuse at `showReviewerForm`: the user would
  still be offered a step that cannot be finished.

**What goes with it**: a pkp-lib unit test of the flag for a
coordinator, a sub-editor, a manager of another context and a person
with and without a reviewer role, and the e2e scenario here asserting
the button's absence (a **Planned** item in the spec). On
`stable-3_5_0` every file applies but
`ReviewerSuggestionResource.php`, whose imports are ordered
differently there and which has a blank line before `return
$suggestion;`: a backport places the `use` line and the new method by
hand (the method's hunk also applies with `git apply -C1`).

This is a proposal; the team decides.

Medium: two repositories and both apps' submission schemas, a dozen
lines each in pkp-lib and ui-library, and a field added to the
suggestions API.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/funding-coordinator-create-reviewer-from-suggestion-does-nothing/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/funding-coordinator-create-reviewer-from-suggestion-does-nothing/lib.js).
  `ONLY=ojs,omp PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/funding-coordinator-create-reviewer-from-suggestion-does-nothing/walk.js`
  takes the Steps and the editor's control; `MODE=nb` in front takes
  the neighbours alone (the coordinator adds Adela Gallego, `dbarnes`
  adds Nova Newcomer), and `MODE=multi` the coordinator who manages a
  second journal or press. The fix was tried with
  `node bin/try-fix.js apply …/fix-ojs.diff ojs` and
  `… fix-omp.diff omp`, which rebuild the JavaScript.
- Walked on PostgreSQL, PKP's default test dataset at pkp/datasets
  566bb1f (2026-10-03): OJS `main` at ff004d0973 (lib/pkp 987776cd04,
  lib/ui-library 64d6736318), OMP `main` at 3b0ecf794c (lib/pkp
  3dc90c81a6, lib/ui-library 280f98c570); OJS `stable-3_5_0` at
  c1cee76b95 (lib/pkp 771474347e, lib/ui-library d4e0188353), OMP
  `stable-3_5_0` at 9c5e24246c (lib/pkp cf3f984335, lib/ui-library
  d4e0188353). The runs carried no server error and no script error.
- 3.5: steps 1–8 as on `main`, with the same refusal and alert; step 9
  cannot be taken there because 3.5's `ReviewerSuggestionController`
  does not list `ROLE_ID_ASSISTANT` (`pkp/pkp-lib#13191` is on `main`
  only). 3.5's `PKPReviewerGridHandler` grants and the four ui-library
  files match `main`'s but for the selection event's `email`.
- 3.4 and 3.3, read in the code: lib/pkp `origin/stable-3_4_0`
  (767353f4fe) and `origin/stable-3_3_0` (ac3fa73402) have no
  `ReviewerSuggestion` class or suggestions API; ui-library
  `origin/stable-3_4_0` (ee684b34) and `origin/stable-3_3_0` (96959f9e)
  have no `ReviewerSuggestion*` component; neither app's
  `upstream/stable-3_4_0` or `upstream/stable-3_3_0` `schemas/context.json`
  has `reviewerSuggestionEnabled` (OJS d68934d0d1, ac77c9fb35; OMP
  0aec65441, 8e72fc883).
- Introduced: `git blame` on `canSelect`, the `selectionType` choice in
  `select()` and `getItemActions()` leads to 1e0faa4a, the commit that
  created both files; 659b110c (`pkp/pkp-lib#12031`) only renamed
  `existingReviewerRole`. `commits/<sha>/pulls` names
  `pkp/ui-library#426`, merged 2025-02-26. The assistant restriction in
  `PKPReviewerGridHandler::__construct()` is older than the PSR-12
  reformat (e3f570bc37, 2021).
- Tracker search (2026-10-04): pkp/pkp-lib, pkp/ojs, pkp/omp and
  pkp/ui-library, issues and PRs, for reviewer suggestions with
  "funding coordinator", "assistant", "create new reviewer", and for
  `createReviewer`, `SelectReviewerSuggestionListItem` and
  `reviewerSuggestionApprove`. Read and set aside: `pkp/pkp-lib#13191`
  (the assistant's "Error" dialog on the panel, fixed on `main`; it
  does not touch adding reviewers) and `pkp/pkp-lib#11519` (detecting
  an existing user when suggesting).
- Not walked: the "Enroll an Existing User as Reviewer" path (a
  suggested account without a reviewer role) and an OMP internal
  review round; both are read in the code.
