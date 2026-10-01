# A section editor who is also an author is offered "Submit As: Section editor", and "Begin Submission" refuses it

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#11435` for `pkp/pkp-lib#10929` · [24e9ca169e](https://github.com/pkp/pkp-lib/commit/24e9ca169e39b8edcabaf8ce80f84ee37f117aac) · 2025-05-28 · Taslan A. Graham (taslangraham); backported to `stable-3_5_0` in `pkp/pkp-lib#11075`
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U21 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#a14)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A user who is both a Section Editor and an Author gets "Submit As" with
"Author" and "Section editor" ("Series editor" on a press). Choosing
"Section editor" and pressing "Begin Submission" keeps them on the form
with "You are not allowed to submit in this user role." under "Submit
As", and no submission is created. The offer is what is wrong: the
server refuses a section editor's role for submitting, as 3.4's did, and
before 3.5 the form never offered it.

An Editor who is also an Author is not affected: "Journal editor" ("Press
editor") is offered and accepted. A preprint server never offers its
Moderator role, so it is not affected either.

## Impact

- **Lost**: nothing. The refused press shows the error beside "Submit
  As", though it does not say which role would be accepted.
- **Who**: users who hold a section or series editor role together with
  Author in the same journal or press, each time they start a
  submission. Two other default groups are offered and refused the same
  way: "Guest editor" and "Funding coordinator", which both have access to
  the submission stage without being a manager or author role.
- **Way round**: choose "Author" in "Submit As" and press "Begin
  Submission" again.

Low: nothing is lost and the submission gets started after one refused
press with a message beside the field. It would be medium if real
installs usually preselect the refused role and editors could not tell
what to change; which role is preselected is not fixed by the code
(Cause).

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main` (OMP the same, with the words in
  brackets).
- `dbuskins` (David Buskins) holds only "Section editor" ["Series
  editor"]. The dataset has no user who is both a section editor and an
  author, so steps 1 to 3 give him "Author".

1. Sign in as `admin`. Administration › "Hosted Journals" ["Hosted
   Presses"]. On the "publicknowledge" row: the arrow, "Settings wizard".
2. On the "Users" tab press "Search", search `dbuskins`. On David
   Buskins's row: "Edit User".
3. Tick "Author", "OK". Sign out.
4. Sign in as `dbuskins` and open the "Make a Submission" page
   (`/index.php/publicknowledge/en/submission`).
5. Read "Submit As".
6. Choose "English" as the submission language, type a title, choose
   the section "Articles" [OMP: no section choice; leave the submission
   type as it is], tick "Yes, my submission meets all of these
   requirements." and the privacy consent, choose "Section editor"
   ["Series editor"] in "Submit As", and press "Begin Submission".
7. Choose "Author" in "Submit As" and press "Begin Submission".

**Expected.** "Submit As" offers only the roles "Begin Submission"
accepts. David Buskins submits as "Author", as on 3.4, where a section
editor who is also an author gets no "Submit As" choice and the
submission opens under "Author".

**Observed.** Step 5 lists "Section editor" ["Series editor"] and
"Author". On the PostgreSQL install of the dataset they came in that
order, with "Section editor" already selected (MySQL not checked; the
order is not fixed, see Cause). Step 6 stays on
the form with the error under "Submit As" and creates no submission:

```
POST /index.php/publicknowledge/api/v1/submissions  400
{"userGroupId":["You are not allowed to submit in this user role."]}
```

Step 7 opens the submission wizard on "Upload Files" ["Details" on 3.5].

Control: an editor with "Journal editor" ["Press editor"] and Author is
offered both roles, and "Journal editor" is accepted. On a preprint
server the same steps give a Moderator who is also an author no "Submit
As" choice, and "Begin Submission" opens the wizard.

## Cause

The "Make a Submission" page and the submissions API decide separately
which roles a user may submit in, and since 3.5 they disagree.

The page builds its "Submit As" list in
`PKPSubmissionHandler::getSubmitUserGroups()` (lib/pkp
`pages/submission/PKPSubmissionHandler.php`). For a user who is not a site
administrator it returns every group of theirs that has access to the
submission stage:

```php
: $query->withStageIds([WORKFLOW_STAGE_ID_SUBMISSION])->get();
```

That includes the Sub-editor groups ("Section editor", "Guest editor",
"Series editor") and "Funding coordinator", an Assistant group that the
default install gives access to the submission stage.
`StartSubmission::addUserGroups()` filters by the same stage, so they
reach the radio list, and the form selects the first group listed. The
query has no `ORDER BY`, so which group comes first is the database's
choice.

`PKPSubmissionController::add()` (lib/pkp
`api/v1/submissions/PKPSubmissionController.php`), which "Begin
Submission" posts to, accepts only the user's groups with the Manager or
Author role (`withRoleIds([Role::ROLE_ID_MANAGER,
Role::ROLE_ID_AUTHOR])`). It answers any other `userGroupId` with 400
`api.submissions.400.invalidSubmitAs`. Below that filter it keeps the
other half of the same temporary fix, commented out:

```php
// To be resolved in https://github.com/pkp/pkp-lib/issues/10929
//$submitterUserGroupsQuery->withStageIds([WORKFLOW_STAGE_ID_SUBMISSION]);
```

So the API accepts every Manager group, with or without the submission
stage, and no Sub-editor or Assistant group.

Before 24e9ca169e the page offered the user's Manager, Site
administrator and Author groups, and the API accepted Manager and Author.
A site administrator's group belongs to no journal, so the page offered
nothing the API refused. That change, a "temporary fix" for
`pkp/pkp-lib#10929` (a Production editor who started a submission was
refused at the file upload), replaced the role filter with the
submission-stage filter. It meant to drop manager groups that have no
submission stage, such as "Journal manager" and "Production editor". It
also let in every other group that has the stage.

Reach:

- "Section editor" and "Series editor": checked on screen. "Guest
  editor" and "Funding coordinator": read in the code and in the
  dataset's `user_group_stage` rows.
- A user with "Section editor" and "Journal editor" and no Author role is
  offered both, and "Section editor" is refused (read in the code).
- OPS overrides `getSubmitUserGroups()` with the Manager, Site
  administrator and Author roles, so it offers nothing the API refuses
  (checked on screen).
- A user whose only submission-stage group is a Sub-editor or Assistant
  group gets no "Submit As" choice, so the page sends no role. The API
  finds no Manager or Author group of theirs and silently adds them to
  the Author group. That is a separate known problem (spec U21
  [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#a9)),
  which comes from the same two lists disagreeing.

## Proposed fix

Make the page offer only the roles the API accepts, and keep the
submission-stage filter `pkp/pkp-lib#10929` added. In
`PKPSubmissionHandler::getSubmitUserGroups()`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-editor-submit-as-refused/fix.diff)):

```diff
         $userGroups = $isAdmin
             ? $query->withRoleIds([Role::ROLE_ID_MANAGER, Role::ROLE_ID_SITE_ADMIN])->get()
-            : $query->withStageIds([WORKFLOW_STAGE_ID_SUBMISSION])->get(); // For non-admin users, query for the groups tht give them access to the submission stage
+            // For non-admin users, the groups that give them access to the submission stage, among
+            // the roles PKPSubmissionController::add() accepts to submit in
+            : $query->withRoleIds([Role::ROLE_ID_MANAGER, Role::ROLE_ID_AUTHOR])
+                ->withStageIds([WORKFLOW_STAGE_ID_SUBMISSION])
+                ->get();
```

The page then offers the user's Manager and Author groups that have the
submission stage. That is a subset of what the API accepts. Against 3.4,
which offered every Manager and Author group, it still leaves out manager
groups with no submission stage ("Journal manager", "Production editor"),
as `pkp/pkp-lib#10929` wanted. The commented-out stage filter in
`PKPSubmissionController::add()` can stay as it is for this fix; turning
it on belongs to the permanent fix for `pkp/pkp-lib#10929`. It was tried on OJS and OMP `main`. David Buskins then got no
"Submit As" choice and "Begin Submission" opened the wizard under
"Author". An editor with "Journal editor" ["Press editor"] and Author was
still offered both and could submit as the editor.

**Alternatives**

- Let the API accept the Sub-editor groups the page offers. That is a
  product decision: section editors would become participants of their
  own submissions in the editor's role, and assistant groups such as
  "Funding coordinator" would become submitting roles too.
- Move the roster into one shared method (for example on the user group
  repository) that both the page and `PKPSubmissionController::add()`
  call. This is the lasting answer to the duplication, and the permanent
  fix `pkp/pkp-lib#10929` still waits for. It is a larger change than
  this regression needs.

**What goes with it**

- The fix leaves the API's silent enrolment as Author (A9) as it is: a
  user whose only submission-stage group is a Sub-editor or Assistant
  group is still made an Author when they press "Begin Submission".
- What changes for that user is the start page. The query now finds no
  group of theirs, so the page falls back to an Author group that allows
  self-registration. When the journal has none, they get the "Not
  Allowed" page, where today they are let in. With the default Author
  group, which allows self-registration, they see no difference.
- The REST API does not change, and the diff applies as it stands to
  `stable-3_5_0`.
- Guard: a test in which a section editor who is also an author starts
  a submission.

Small: one query in the shared handler, with its test.

## Evidence

- The kept script takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-editor-submit-as-refused/walk.js),
  with its helpers in `lib.js` beside it; the neighbour check (an editor
  with "Journal editor" ["Press editor", "Preprint Server manager"] and
  Author, submitting in the editorial role) is
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-editor-submit-as-refused/neighbour.js).
  On an install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/section-editor-submit-as-refused/walk.js`
- The fix was tried with `walk.js` and `neighbour.js` on OJS and OMP
  `main`; `neighbour.js` was also run without it, on all three apps.
- Taken on OJS, OMP and OPS `main` and `stable-3_5_0`, on PostgreSQL.
  Datasets: pkp/datasets 27f1204 (2026-10-01).
- Tips: OJS `main` 4408b94def (lib/pkp f5bd392a69), OMP `main` 3b0ecf794
  and OPS `main` c8af945bb7 (lib/pkp 3dc90c81a6); `stable-3_5_0` OJS
  18d097d94e, OMP b24879c3d, OPS 3f0919468c (lib/pkp 1fb843f491);
  `stable-3_4_0` OJS 9571d8fde7, OMP 0aec65441, OPS acd8ae704b (lib/pkp
  df13621c2d); `stable-3_3_0` OJS 9fdb9bcf9a, OMP 8e72fc883, OPS
  c5532e2161 (lib/pkp d446601ebe).
- Code reads:
  - `main` and 3.5: `PKPSubmissionHandler::getSubmitUserGroups()`,
    `StartSubmission::addUserGroups()`, `PKPSubmissionController::add()`,
    OPS `SubmissionHandler::getSubmitUserGroups()`, the
    `UserGroup` scopes, and the dataset's `user_groups` and
    `user_group_stage` rows (which groups have the submission stage).
    Blame from the stage-filter line leads to 24e9ca169e
    (`pkp/pkp-lib#11435`); on 3.5 to 02b85e4d38 and 2e5482da85
    (`pkp/pkp-lib#11075`). The API's Manager/Author filter dates from
    714d5d5aa4 (2024-10-15).
  - 3.4: `getSubmitUserGroups()` filters by Manager, Site administrator
    and Author, and the API by Manager and Author, so the page offers no
    role the API refuses.
  - 3.3: `PKPSubmissionSubmitStep1Form` offers the user's Manager groups
    and the Author groups. Its validation accepts any group the user
    holds or an Author group that allows self-registration.
- Upstream searches (2026-10-01): pkp/pkp-lib by the error text, "submit
  as" with section editor, role order and default, `invalidSubmitAs` and
  `getSubmitUserGroups`; pkp/ojs, pkp/omp and pkp/ui-library by "submit
  as". `pkp/pkp-lib#12967` has the same message for a user who chose
  "Author". There the cause was a strict comparison on LiteSpeed servers
  (closed), not this one. `pkp/pkp-lib#10929` (open) tracks the
  Production editor upload error that the introducing change worked
  around.
