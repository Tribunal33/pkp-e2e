# Section Editors who are also Authors are offered "Section editor" in "Submit As", then refused

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: none (code; "Submit As" offered only manager and author roles)
  - 3.3: none (code; the same)
- **Introduced** `pkp/pkp-lib#11435` for `pkp/pkp-lib#10929` · [24e9ca169e](https://github.com/pkp/pkp-lib/commit/24e9ca169e39b8edcabaf8ce80f84ee37f117aac) · 2025-05-28 · Taslan A. Graham (taslangraham)
- **Upstream** none found (2026-10-01); related and open: `pkp/pkp-lib#12097`, a task to settle which roles "Submit As" offers (it does not name this refusal), and `pkp/pkp-lib#10929`, the issue the introducing change was for, still open on which role a Production editor submits under
- **Tracked in** spec U21 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#a14)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A Section Editor who is also an Author opens "Make a Submission" and finds
"Submit As" offering "Section editor" ("Series editor" on a press) and
"Author". With "Section editor" chosen, "Begin Submission" leaves them on
the form with "You are not allowed to submit in this user role." under
"Submit As", and no submission is made.

The list has no fixed order and the form selects whichever role comes
first. On PKP's test dataset that is "Section editor", so an editor who
leaves the role as it is gets refused. Choosing "Author" gets them
through, and the form keeps what they typed.

Every other role that has access to the submission stage but is neither a
manager nor an author role is offered and refused the same way. On a
journal's default roles that is also "Guest editor" and "Funding
coordinator"; on a press's, "Funding coordinator".

## Impact

- **Lost:** no data. The editor's press of "Begin Submission" fails, and
  the error does not say which role to choose instead.
- **Who:** journal Section Editors and Guest Editors, press Series
  Editors, and Funding Coordinators, each also holding the Author role,
  when they start a submission of their own. A Section Editor without
  the Author role is not refused: they get no "Submit As" field and are
  made an Author when they begin.
- **Way round:** choose "Author" and press "Begin Submission" again.

Medium: the form offers a choice it refuses, and where the editorial role
comes first in the list, as on the test dataset, it is the preselected
choice. It would be low if "Author" were always preselected.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS or OMP), freshly loaded.
- Nothing else. The dataset has no Section Editor who also holds the
  Author role, so steps 1 to 3 give `dbuskins` that role through his own
  profile, as any user may for a role that allows self-registration.

Steps:

1. Sign in as `dbuskins` (Section editor; "Series editor" on the press).
2. Open the profile ("Edit Profile",
   `/index.php/publicknowledge/en/user/profile`) and its "Roles" tab.
3. Tick "Author" and press "Save" ("Your changes have been saved.").
4. Press "Start A New Submission" in the side menu
   (`/index.php/publicknowledge/en/submission`).
5. Type the title "u21w35 Section editor's paper", choose the section
   "Articles" (OJS) and the language "English" where asked, and tick the
   checklist and privacy boxes.
6. Under "Submit As", choose "Section editor" ("Series editor").
7. Press "Begin Submission".

**Expected:** the wizard opens on the new submission. Or, if a Section
Editor may not submit under that role, "Submit As" does not offer it.

**Observed:** "Submit As" lists "Section editor" and "Author" ("Series
editor" and "Author"). On the test dataset "Section editor" is listed
first and already selected; the order is whatever the database returns.
After "Begin Submission" the form stays on "Make a Submission". Under
"Submit As":

```
You are not allowed to submit in this user role.
```

The form's summary reads "Please correct one error. Go to Submit As: You
are not allowed to submit in this user role.", and a notice reads "The form
was not saved because 1 error(s) were encountered. Please correct these
errors and try again." The request behind the button answers:

```
POST /index.php/publicknowledge/api/v1/submissions  →  400
{"userGroupId":["You are not allowed to submit in this user role."]}
```

No submission is created.

Control: choosing "Author" in the same form and pressing "Begin Submission"
opens the wizard, with `dbuskins` listed as the submission's author.

## Cause

The start page and the endpoint behind "Begin Submission" build their lists
of allowed submitting roles from different rules.

The page's list comes from `PKPSubmissionHandler::getSubmitUserGroups()`
([`pages/submission/PKPSubmissionHandler.php` line 661](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/pages/submission/PKPSubmissionHandler.php#L651-L676)).
For a user who is not a site administrator it returns every active group of
theirs that has access to the submission stage, whatever the group's role.
`StartSubmission::addUserGroups()`
([lines 154-190](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/classes/components/forms/submission/StartSubmission.php#L154-L190))
filters that list once more by submission-stage access, adds no field when
fewer than two groups remain, and otherwise shows the "Submit As" radio
with the first group selected. Neither method orders the groups.

`PKPSubmissionController::add()`
([`api/v1/submissions/PKPSubmissionController.php` lines 659-684](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/api/v1/submissions/PKPSubmissionController.php#L659-L684))
accepts only the user's groups with `ROLE_ID_MANAGER` or `ROLE_ID_AUTHOR`,
and answers any other `userGroupId` with 400
`api.submissions.400.invalidSubmitAs`. That rule dates from the new wizard
([e79fc21e20](https://github.com/pkp/pkp-lib/commit/e79fc21e20f7c47c194d87e25b23897bbc036e77),
2022). Until 2025 the page filtered by the same roles (manager, site
administrator, author), so the two lists agreed.

`pkp/pkp-lib#11435` (for `pkp/pkp-lib#10929`, a Production editor who
could not upload files to their own submission) replaced the page's role
filter with a submission-stage filter, in `getSubmitUserGroups()` and in
`addUserGroups()`. The aim was to keep the manager roles that lack that
stage (Journal manager, Production editor) off the list. Dropping the role
filter also let in every other group with the stage: on OJS's default
roles, Section editor and Guest editor (`ROLE_ID_SUB_EDITOR`) and Funding
coordinator (`ROLE_ID_ASSISTANT`); on OMP's, Series editor and Funding
coordinator. The endpoint still refuses all of them.

The offer is the fault, not the refusal. `add()`'s rule is the older one,
and 3.3 and 3.4 never let a sub-editor or an assistant submit under that
role. `pkp/pkp-lib#11435` set out to remove manager roles from the list,
not to add these.

Why the refused role is selected on the test dataset: with no `ORDER BY`,
PostgreSQL returns the groups in the order their rows were stored. A
context's roles are created from the application's default list, where
the editorial roles come before Author.

Reach:

- OJS and OMP, where the shared `getSubmitUserGroups()` runs (walked).
  OPS overrides it in its own `pages/submission/SubmissionHandler.php`
  with a role filter (manager, site administrator, author), so a
  Moderator who is also an Author gets no "Submit As" and begins as
  Author (walked).
- Section editor and Series editor (walked); Guest editor and Funding
  coordinator (code, and their submission-stage rows in the dataset);
  any role a journal creates with submission-stage access that is
  neither a manager nor an author role (code).
- A Section Editor without the Author role has one group left, so no
  field is shown; `add()` receives no role, finds no manager or author
  group, and enrols the user in the first Author role before creating
  the submission (walked: `sberardo` on OJS and OMP began as Author and
  held "Section editor, Author" afterwards).

## Proposed fix

A proposal; the team decides. Have the page offer only the roles the endpoint accepts. Keep the
submission-stage filter that `pkp/pkp-lib#10929` added, and add back the role
filter, the one `add()` applies, in the non-administrator branch of
`PKPSubmissionHandler::getSubmitUserGroups()`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/submit-as-section-editor-refused/fix.diff)):

```diff
         $userGroups = $isAdmin
             ? $query->withRoleIds([Role::ROLE_ID_MANAGER, Role::ROLE_ID_SITE_ADMIN])->get()
-            : $query->withStageIds([WORKFLOW_STAGE_ID_SUBMISSION])->get(); // For non-admin users, query for the groups tht give them access to the submission stage
+            // For non-admin users, the groups that give them access to the submission stage,
+            // among those PKPSubmissionController::add() accepts as the submitting role
+            : $query->withRoleIds([Role::ROLE_ID_MANAGER, Role::ROLE_ID_AUTHOR])
+                ->withStageIds([WORKFLOW_STAGE_ID_SUBMISSION])
+                ->get();
```

This follows what the code base already does: OPS's override of the same
method and the 3.4 version both filter by role. `getSubmitUserGroups()`
feeds both the start page's check for an empty list (the "Not Allowed"
page) and the "Submit As" field, so fixing it there covers both.
`addUserGroups()` keeps its own stage filter: after the fix it repeats the
handler's filter for other users, but it still removes the stage-less
manager groups from a site administrator's list, which the handler's
administrator branch does not filter by stage.

Tried on `main` (OJS, OMP, OPS) with the steps above. With the fix,
`dbuskins` gets no "Submit As" field, and "Begin Submission" opens the
wizard with him as Author. Two users the fix must leave alone behaved the
same with and without it: `dbarnes` (Journal editor or Press editor, plus
Author) is still offered his editorial role and the endpoint accepts it,
and `rvaca` (Journal manager or Press manager, plus Author) still gets no
"Submit As". OPS is unchanged.

**Alternatives:**

- Let `add()` accept sub-editor groups. That would decide that a Section
  Editor may submit as the section's editor, which 3.3 and 3.4 never
  allowed. It is a product decision, and it would still refuse assistant
  groups such as Funding coordinator.
- Filter by role in `StartSubmission::addUserGroups()` only. That fixes
  the radio, but the empty-list check and the self-registering Author
  role `getSubmitUserGroups()` returns for an empty list would still work
  from the wider list.
- One shared "submit as" query used by both the page and `add()`, for
  example on `Repo::userGroup()`. It would stop the two from drifting
  again, but it is a larger change. It fits better with the decision
  `pkp/pkp-lib#10929` still has to make (the commented-out stage filter in
  `add()`).

**What goes with it:**

- A Section Editor with no Author role gets an empty list with the fix,
  so `getSubmitUserGroups()` returns the context's self-registering Author
  role, as for any user with no submitting role. When no Author role
  allows self-registration they now see the "Not Allowed" page; today they
  reach the form and are enrolled as Author anyway. Read in the code.
- No API, hook or stored data changes. Submissions already created are
  unaffected.
- Backport: the same lines are on `stable-3_5_0`, and the diff applies
  there as written.
- Guard: an end-to-end check that a Section Editor who is also an Author
  sees no "Submit As" and begins as Author (a Planned item in spec U21).

Small: it restores the rule 3.4 had and needs no product decision, since
it keeps the endpoint's long-standing behaviour.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/submit-as-section-editor-refused/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/submit-as-section-editor-refused/walk.js),
  on an install loaded from PKP's default dataset (pkp/datasets 38ab955,
  2026-09-30), PostgreSQL:
  `npm run fleet-prep -- --feature issues-w35 --dataset 8 --reset`, then
  `PROBE_FEATURE=issues-w35 PROBE_AGENT=w35 node bin/probe.js all shared/playwright/checks/issues/submit-as-section-editor-refused/walk.js`.
  On 3.5, put `PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35` in front and use
  the feature `issues-w35-3_5`. `NEIGHBOUR=1` runs the `dbarnes` and
  `rvaca` checks; `SECTION_EDITOR_ONLY=1` runs `sberardo`.
  The script opens "Make a Submission" three times as `dbuskins` (OJS,
  OMP) and as `dbarnes` (all three apps): each visit, on `main` and 3.5,
  listed the editorial role first and selected it.
- Fix tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/submit-as-section-editor-refused/fix.diff ojs omp ops`,
  then the script with and without `NEIGHBOUR=1`, then `revert`.
- Tips walked: `main` OJS bade233f73 (pkp-lib 2e377d27fc), OMP 3b0ecf794
  and OPS c8af945bb7 (pkp-lib 3dc90c81a6); `stable-3_5_0` OJS 92b9a16b48,
  OMP 3081c9b00, OPS cf4fce69bd (pkp-lib a9c76aed62).
- Introduced, traced from line 661: the blame lands on
  [af8f0d8d2f](https://github.com/pkp/pkp-lib/commit/af8f0d8d2f63453f156058bd94901da341ea21aa)
  (`pkp/pkp-lib#12002`), which removed the non-administrator branch's own
  active-membership filter, leaving the one
  [51ec96c68d](https://github.com/pkp/pkp-lib/commit/51ec96c68dd16a778b9b39ef0dcf195bed3fda96)
  (`pkp/pkp-lib#12017`) had put on the shared query, where it also applies
  to the administrator branch, in place of `withUserIds()`. Neither
  changed the stage filter, which comes from 24e9ca169e
  (`pkp/pkp-lib#11435`, merged 2025-05-28): it replaced
  `withRoleIds([MANAGER, SITE_ADMIN, AUTHOR])` with
  `withStageIds([SUBMISSION])` and added the stage filter to
  `addUserGroups()`. On `stable-3_5_0` the same change is
  [02b85e4d38](https://github.com/pkp/pkp-lib/commit/02b85e4d3816b1918f7d54707186e469339c726a)
  (`pkp/pkp-lib#11075`); the blame there lands on
  [2d9bb77911](https://github.com/pkp/pkp-lib/commit/2d9bb77911591e59c0484e30a7069de07f340b2a)
  (`pkp/pkp-lib#12017`), the same move of the active-membership filter
  onto the shared query. `add()`'s manager-and-author roster dates from
  e79fc21e20 (git log -S).
- 3.5 code (`stable-3_5_0`, pkp-lib a9c76aed62):
  `getSubmitUserGroups()` lines 630-655 and `add()` lines 621-634 are the
  same as on `main`.
- 3.4 code (pkp-lib `stable-3_4_0` df13621c2d; apps' `stable-3_4_0`
  9571d8fde7, 0aec65441, acd8ae704b): `getSubmitUserGroups()` filters by
  manager, site administrator and author roles, and the API's
  `PKPSubmissionHandler::add()` accepts manager and author. The two lists
  agree; no `pkp/pkp-lib#10929` commit is on the branch.
- 3.3 code (pkp-lib `stable-3_3_0` d446601ebe):
  `PKPSubmissionSubmitStep1Form` offers the user's manager groups and the
  author groups, so no sub-editor group is offered.
- Searched pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ui-library (issues and
  PRs, open and closed) for "submit as", the error text,
  `invalidSubmitAs`, `getSubmitUserGroups`, and "section editor" with
  "submit as". `pkp/pkp-lib#12967` (closed) was the same error message
  for a different cause (a strict comparison on some servers).
- Unverified: the order of the "Submit As" options on MySQL (with no
  `ORDER BY` it most likely follows the primary key, so editorial roles
  first, but this was not checked), and on installs whose roles were
  created in another order. A walk on a new press with throwaway users
  also listed the editorial role first on every visit.
