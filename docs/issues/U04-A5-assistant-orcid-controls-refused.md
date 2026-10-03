# An Assistant allowed to edit a contributor is refused "Request verification" and "Delete" on the ORCID iD

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; no ORCID iD field, the ORCID Profile plugin's boxes)
  - 3.3: none (code; the same plugin boxes)
- **Introduced** `pkp/pkp-lib#9818` for `pkp/pkp-lib#9771` · [c79f538c51](https://github.com/pkp/pkp-lib/commit/c79f538c51e8300366732f993edcd84fa18a18ff) · 2023-10-06 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U04 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U04-orcid-integration.md#a5), the server's refusal
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

When an editor lets an Assistant (a Copyeditor, Layout Editor,
Proofreader or another assistant-level role) change the publication,
the Assistant can edit a contributor, and the contributor's "ORCID iD"
field offers them "Request verification" and "Delete". Both are
refused: a window titled "Error" says "You are not authorized to access
the requested resource.", no verification email goes out, and the iD
stays.

This reads as an oversight rather than an editors-only design:
authors were refused the same way until `pkp/pkp-lib#11505` added
them.

It happens on any journal, press or preprint server with ORCID
enabled in its settings.

## Impact

- **Lost**: nothing stored. The Assistant cannot ask a contributor to
  verify their iD, or remove a wrong iD, and is told so.
- **Who**: every Assistant whom an editor has let edit the publication,
  by ticking "Allow this person to make changes to the publication, …"
  (the "Permissions" box of the participant assignment). The box is off
  by default for the assistant roles, so this happens where a journal
  hands contributor metadata to its copyeditors or production staff.
- **Way round**: an editor or manager presses the same button.

Low. A journal that leaves contributor metadata to its Assistants
would make it medium, since the task then has to come back to an
editor every time.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS. OMP and OPS are the same
  with the names in brackets.
- ORCID is on: as `dbarnes`, Settings › Users & Roles › "ORCID", tick
  "Enable ORCID functionality", "ORCID API" "Member Sandbox", any Client
  ID and Client Secret, "Save".
- An Assistant who may edit the publication. As `dbarnes`, open
  submission 3, "The Facets Of Job Satisfaction: A Nine-Nation
  Comparative Study Of Construct Equivalence" [OMP: 7, "Accessible
  Elements: Teaching Science Online and at a Distance"],
  "Participants", Maria Fritz's (`mfritz`, Copyeditor) "More Actions" ›
  "Edit", tick "Allow this person to make changes to the publication,
  such as the title, abstract, metadata and other publication details.
  …", "OK". The contributor used below is Catherine Kwantes
  (`ckwantes@mailinator.com`) [OMP: Dietmar Kennepohl,
  `dkennepohl@mailinator.com`].
- [OPS: the dataset has no Assistant who takes part in a preprint's
  stages, and a new account is invited because every dataset user below
  Moderator also holds Author, and an Assistant who also holds Author
  is refused with a 403 instead (Cause). As `dbarnes`: Settings › Users & Roles › "Roles", "Editorial
  Board Member" › "Settings" › "Edit", tick the stage "Production",
  "OK"; "Users" › "Invite to a role" for a new address (here Ada
  Assist-u04r4, ada.u04r4@mailinator.com), role "Editorial Board
  Member". The invited person accepts from the invitation email (the
  install must deliver mail, to a mail catcher on a test install) and
  creates the account (here `adau04r4`). Then open preprint 1, "The
  influence of lactation on the quantity and quality of cashmere
  production" (Production), "Participants" › "Assign", "Editorial Board
  Member", Ada, tick the same "Allow this person to make changes …"
  box, "OK". The Assistant in the steps is `adau04r4`, the contributor
  Carlo Corino (`ccorino@mailinator.com`).]

Requesting verification:

1. Sign in as `mfritz` [OPS: `adau04r4`], open the submission from
   "Assigned to me", Publication › "Contributors", the contributor's
   "Edit". Under "ORCID iD" the form offers "Request verification".
2. Press "Request verification", then "Yes".
3. Press "OK" on the "Error" window. Reload the page and open the
   contributor's "Edit" again.
4. Look in the contributor's mailbox.

Deleting the iD:

5. Give the contributor a stored iD. Only ORCID's sign-in creates one,
   so on a test install write it by SQL, as the app stores it when that
   sign-in completes (run on PostgreSQL; standard SQL, not tried on
   MySQL). On OMP replace 3 in `s.submission_id = 3` with 7 and the
   email with `dkennepohl@mailinator.com`; on OPS with 1 and
   `ccorino@mailinator.com`:

   ```sql
   INSERT INTO author_settings (author_id, locale, setting_name, setting_value)
   SELECT a.author_id, '', v.setting_name, v.setting_value
   FROM authors a
   JOIN submissions s ON s.current_publication_id = a.publication_id
   CROSS JOIN (
     SELECT 'orcid' AS setting_name, 'https://sandbox.orcid.org/0000-0002-1825-0097' AS setting_value
     UNION ALL SELECT 'orcidIsVerified', '1'
     UNION ALL SELECT 'orcidAccessToken', '00000000-1111-2222-3333-444444444444'
     UNION ALL SELECT 'orcidAccessScope', '/activities/update'
     UNION ALL SELECT 'orcidRefreshToken', '55555555-6666-7777-8888-999999999999'
     UNION ALL SELECT 'orcidAccessExpiresOn', '2046-10-01 00:00:00'
   ) v
   WHERE s.submission_id = 3
     AND a.email = 'ckwantes@mailinator.com';
   ```

6. Reload the page and open the contributor's "Edit": the iD with
   "Delete".
7. Press "Delete", then "Yes", then "OK" on the "Error" window. Reload
   the page and open the contributor's "Edit" again.

Adding a contributor (the control):

8. Still as the Assistant, "Add Contributor": a given and family name,
   an email (here ola.u04r4@mailinator.com), a country, then "Request
   verification", "Yes" ("The email will be sent once the author has
   been created."), and "Save".

**Expected**: the two buttons do what they do for an editor: after step
2 the contributor is sent the verification email, and after step 7 the
iD is removed.

**Observed**: both requests are refused, and the window "Error" shows
the server's sentence each time:

```
POST /index.php/publicknowledge/api/v1/orcid/requestAuthorVerification/9    401
POST /index.php/publicknowledge/api/v1/orcid/deleteForAuthor/9              401
{"error":"You are not authorized to access the requested resource."}
```

(OMP's contributor is 21, OPS's 1.) After the reload, the field shows
"Request verification" again (step 3), the contributor's mailbox has no
email (step 4), and the iD is still there with "Delete" (step 7). The
field behind the "Error" window reads as if each action had worked; that
is a separate fault, pkp-e2e#749.

Control: step 8 saves the new contributor and sends them "Requesting
ORCID record access", the same verification email the refused button
would send.

## Cause

lib/pkp `api/v1/orcid/OrcidController.php` leaves the Assistant out of
both routes, in two places:

- `getRouteGroupMiddleware()` (lines 51–56): the `roleAuthorizer()`
  list has no `ROLE_ID_ASSISTANT`, so a user whose role in the context
  is an assistant-level one is refused before the method runs, with the
  401 above.
- `hasEditPermissions()` (lines 134–179), which `validateRequest()`
  calls for both routes, has no branch that reads an Assistant's
  assignment. So an Assistant who also holds the Author role in the
  context (as every OPS dataset user below Moderator does) passes the
  role list and is refused here instead, with a 403 and the window
  "Error" saying "You cannot make changes to authors on submissions you
  are not assigned to." (`api.orcid.403.editWithoutPermission`; read
  in the code, through ui-library `modalStore.openDialogNetworkError()`,
  not walked). Adding
  the role to the list alone would turn the 401 into that 403. The fix
  below covers both.

The routes that change a contributor in `PKPSubmissionController`
(add, edit, delete, order) admit `ROLE_ID_ASSISTANT` and, through
`PublicationWritePolicy`, let an Assistant act when their assignment
carries `canChangeMetadata` (the "Permissions" box). That is what makes
the workflow's Contributors list offer the Assistant "Edit", and
`ContributorForm` adds the ORCID iD field for everyone who can open
the form. `addContributor()` itself queues the same `SendAuthorMail`
job when the form posts `orcid: "shouldRequestVerification"`, which is
step 8's control.

So the fault is the API's rule, not the screen: an Assistant with the
box may already change the contributor's name and email, remove the
contributor, and have this very email sent while adding one. Hiding the
two buttons would keep that inconsistency and only stop the Assistant
from finishing a task they may do otherwise.

The role list came without the Assistant when the ORCID integration
moved into the core (c79f538c51, `pkp/pkp-lib#9818`).
`pkp/pkp-lib#11505` ("Authors currently do not have authorization via
the API to request ORCID verification on the contributors panel") met
the same refusal for authors and fixed it in
[a3343ab8ff](https://github.com/pkp/pkp-lib/commit/a3343ab8ff9c996a454c66ab557b9199179ba0d0)
by adding the Author role to the list and an author branch to
`hasEditPermissions()`, the Assistant staying out.

Reach:

- Both routes, so "Request verification", "Resend Verification Email"
  (the same route) and "Delete"; walked: the first and the last.
- Every assistant-level group with the "Permissions" box ticked: by
  default Copyeditor, Designer, Funding Coordinator, Indexer, Layout
  Editor, Marketing and sales coordinator, Proofreader and Editorial
  Board Member, the last the only one on a preprint server. The
  workflow's Contributors list is the one place an Assistant opens the
  contributor form; the walks used a Copyeditor (OJS, OMP) and an
  Editorial Board Member (OPS).
- No other route in lib/pkp `api/` writes to a contributor outside
  `PKPSubmissionController` (searched `Repo::author()->edit` and
  `->get(` in `api/`). The sibling publication APIs (citations, data
  citations, funders, body text) list the Assistant and use
  `PublicationWritePolicy`.

## Proposed fix

Admit the Assistant the way `pkp/pkp-lib#11505` admitted authors
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assistant-orcid-controls-refused/fix.diff),
lib/pkp only): add `ROLE_ID_ASSISTANT` to the role list, and a branch
in `hasEditPermissions()` that accepts the user's assignment to the
submission in an assistant-level group when its `canChangeMetadata` is
set. Every existing branch stays as it is.

```diff
@@ -52,6 +52,7 @@
                 Role::ROLE_ID_SITE_ADMIN,
                 Role::ROLE_ID_MANAGER,
                 Role::ROLE_ID_SUB_EDITOR,
+                Role::ROLE_ID_ASSISTANT,
                 Role::ROLE_ID_AUTHOR
             ]),
         ];
@@ -158,6 +159,17 @@
             return true;
         }
 
+        // Check if is an assistant assigned to this submission who may change its metadata
+        $assistantAssignment = StageAssignment::withSubmissionIds([$submissionId])
+            ->withRoleIds([Role::ROLE_ID_ASSISTANT])
+            ->withUserId($user->getId())
+            ->get()
+            ->first(fn (StageAssignment $stageAssignment) => (bool) $stageAssignment->canChangeMetadata);
+
+        if ($assistantAssignment !== null) {
+            return true;
+        }
+
         // Checks if user is an author on the submission
```

Tried on `main` on OJS, OMP and OPS: both of the Assistant's requests
answered 200, the contributor received "Requesting ORCID record
access", and "Delete" removed the iD and its access token. With the fix
in and out alike, `dbarnes` requested and deleted as before,
`ccorino`, signed in as the OPS preprint's author, pressed "Resend
Verification Email" on their own contributor entry and it was sent,
and `mfritz`
without the "Permissions" box was offered no "Edit" on the Contributors
list.

- **How the code base does it.** The branch has the shape of the
  sub-editor branch above it (`StageAssignment::withSubmissionIds()`,
  `withRoleIds()`, `withUserId()`), and reads `canChangeMetadata`, the
  flag the contributor routes rely on for an Assistant.
- **What it touches.** It adds the Assistant whose assignment carries
  the "Permissions" box to the two ORCID routes, and leaves every other
  role's answer unchanged. The paths, the answers' shape and the stored
  data do not change.
- **The guard.** An e2e scenario in spec U04: an Assistant with the
  "Permissions" box presses "Request verification" (the email arrives)
  and "Delete" (the iD is gone), and one without the box is offered no
  "Edit".

**Alternatives**:

- Hide the two buttons from Assistants: the field would need to learn
  the user's roles, and the Assistant would lose a task they may
  otherwise do (Cause).

**What goes with it**: nothing stored needs repair.

Small: one role and one branch in one controller, in the shape of the
branch beside it, and one e2e scenario.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assistant-orcid-controls-refused/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assistant-orcid-controls-refused/lib.js),
  run on a dataset install with
  `node bin/probe.js all shared/playwright/checks/issues/assistant-orcid-controls-refused/walk.js`.
  It takes the steps above, also closing and reopening the form before
  each reload (pkp-e2e#749's steps), reads the mailbox for each
  contributor's address after the request, and reads the stored
  `orcid*` settings after each step. `WALK_MODE=neighbour` runs the
  neighbour check alone: `dbarnes` requests and deletes on the same
  contributor, on OPS `ccorino`, signed in as the preprint's author,
  presses "Resend Verification Email" on their own contributor entry, and on OJS and OMP `mfritz` without
  the box opens the Contributors list.
- `fix.diff`'s paths are from the app root (`a/lib/pkp/…`); inside
  `lib/pkp` apply it with `patch -p3`.
- The fix trial: `node bin/try-fix.js apply shared/playwright/checks/issues/assistant-orcid-controls-refused/fix.diff ojs omp ops`,
  then the walk, and `WALK_MODE=neighbour` with the fix applied and
  reverted (`node bin/try-fix.js revert …`); the database reloaded
  before each.
- Walked on PKP's default test dataset (pkp/datasets 566bb1f,
  2026-10-03), PostgreSQL. No server error and no script error; the two
  401s are refusals.
- `main` tips: OJS ff004d0973 (pkp-lib 987776cd04); OMP 3b0ecf794 and
  OPS c8af945bb7 (pkp-lib 3dc90c81a6). `stable-3_5_0` tips: OJS
  c1cee76b95 (pkp-lib 771474347e), OMP 9c5e24246 and OPS 38b61882d3
  (pkp-lib cf3f984335), walked with the same result on all three apps;
  `OrcidController.php` is the same file on all six tips.
- 3.4 and 3.3 (code): lib/pkp `stable-3_4_0` (767353f4fe) and
  `stable-3_3_0` (ac3fa73402) have no `api/v1/orcid`; ORCID is the ORCID
  Profile plugin (pkp/orcidProfile 894c2593 and 41864d37, the apps'
  submodule pointers), whose request is a box on the contributor form
  saved through the form's own execute hook, under the form's own
  permission.
- Trace: `git blame` on the role list gives c79f538c51 for the three
  original roles and a3343ab8ff for `ROLE_ID_AUTHOR`;
  `hasEditPermissions()` was `hasEditorPermissions()` in c79f538c51.
  `commits/c79f538c51/pulls` names `pkp/pkp-lib#9818` (merged
  2024-06-21).
- Tracker search (2026-10-03): pkp/pkp-lib by "orcid assistant",
  "orcid copyeditor", "orcid layout editor", "orcid request
  verification not authorized", `OrcidController`,
  `hasEditPermissions`, `requestAuthorVerification`, `deleteForAuthor`,
  `editWithoutPermission`; pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library
  by "orcid assistant" (ui-library also by `FieldOrcid`): nothing on
  this fault.
  `pkp/pkp-lib#11505` is the authors' case, fixed.
