# Assistants allowed to edit the publication's metadata, and administrators with only an assistant role, get a language "Change" that fails

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP; OPS (code)
  - 3.4: none (code; no submission language change)
  - 3.3: none (code; no submission language change)
- **Introduced** `pkp/pkp-lib#9245` for `pkp/pkp-lib#5502` · [80f1467d6e](https://github.com/pkp/pkp-lib/commit/80f1467d6ef2da5976c8e8bc7210e9e944c40f58) · 2024-09-18 · jyhein (jyhein)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U40 [A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U40-publication-metadata.md#a19)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

A Copyeditor (or another assistant) whose assignment allows changes to
the publication's metadata sees "Change" beside "Current Submission
Language" on the Publication pages of a submission they are assigned to
in its current stage. So does a Site Administrator whose only role in
the journal is an assistant role. They can open the panel, pick another
language and type the title and abstract, but "Confirm" only shows "An
unexpected error has occurred. Please reload the page and try again."
and the language stays as it was.

An editor or manager can make the change instead. The assistant case
needs the "Permissions" box ticked on the assignment, which is off by
default; the administrator case needs their manager role in the journal
removed.

## Impact

- **Lost**: the title and abstract typed into the panel, and the time
  it took.
- **Who**: an assistant an editor has allowed to edit the publication's
  metadata; and a Site Administrator left with only an assistant role.
  With the default roles a preprint server meets it only through the
  administrator, since its one assistant role cannot be assigned to a
  submission.
- **Way round**: ask an editor or manager to change the language.

Low: the submission is unchanged and an editor can make the change. If
the team decides that an assistant allowed to edit the publication's
metadata may also change its language, this becomes a task that fails
for them (medium), and the fix is to let the server admit them instead.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, context `publicknowledge`
  (languages English and French (Canada)).
- The administrator path sends an invitation email to
  `pkpadmin@mailinator.com`; the install needs a mail catcher to open it
  (the walk read it from Mailpit, the dataset install's SMTP pointed at
  it). The administrator takes the assistant role before losing the
  manager role because Users & Roles refuses to remove a user's last
  role: "You cannot remove the role. At least one role must be assigned
  to the user."

A Copyeditor allowed to edit the publication's metadata (OJS, OMP):

1. Sign in as `dbarnes`.
2. Open submission 3 "The Facets Of Job Satisfaction: A Nine-Nation
   Comparative Study Of Construct Equivalence" (OMP: submission 7
   "Accessible Elements: Teaching Science Online and at a Distance") and
   open the "Copyediting" stage.
3. In "Participants", open "Maria Fritz" › "More Actions" › "Edit". In
   its "Permissions" box tick "Allow this person to make changes to the
   publication, such as the title, abstract, metadata and other
   publication details. …" and press "OK".
4. Sign out and sign in as `mfritz`.
5. Open the same submission, then "Publication" › "Title & Abstract".
   The page shows "Current Submission Language: English" and a "Change"
   button.
6. Press "Change", pick "French (Canada)", type a Title (on OJS also an
   Abstract) and press "Confirm".

The Site Administrator left with an assistant role (OJS, OMP, OPS):

1. Sign in as `rvaca`. Settings › Users & Roles › "Invite to a role",
   search `pkpadmin@mailinator.com`, add the role "Copyeditor" (OPS:
   "Editorial Board Member") from today, "Save And Continue", "Invite
   user to the role".
2. Sign out. In the email "You are invited to new roles" press "Accept
   Invitation", then "Accept And Continue to OJS" ("… OMP", "… OPS").
3. Sign in as `admin`. Settings › Users & Roles › admin's row › "Edit".
   On the "Journal manager" row ("Press manager", "Preprint Server
   manager") press "Remove Role" and confirm with "Remove Role".
4. Open submission 6 "Investigating the Shared
   Background Required for Argument: A Critique of Fogelin's Thesis on
   Deep Disagreement" (OMP: submission 4 "How Canadians Communicate:
   Contexts of Canadian Popular Culture"; OPS: submission 1 "The
   influence of lactation on the quantity and quality of cashmere
   production") at
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=6`,
   then "Publication" › "Title & Abstract" ("Preprint" › "Title &
   Abstract" on OPS).
5. Press "Change", pick "French (Canada)", type a Title (on OJS and OPS
   also an Abstract) and press "Confirm".

**Expected**: either no "Change" button for this user, or the language
changes: the panel closes and the page reloads on Title & Abstract in
French (Canada).

**Observed**: the toast "An unexpected error has occurred. Please reload
the page and try again." appears, the panel stays open with the typed
values, and after a reload the page still reads "Current Submission
Language: English" with "Change" beside it. The browser's request was
refused:

```
PUT /api/v1/submissions/3/publications/4/changeLocale
401 {"error":"user.authorization.roleBasedAccessDenied","errorMessage":"The current role does not have access to this operation."}
```

Control: as `dbuskins`, a Section Editor assigned to submission 3 (OMP:
Series Editor on submission 1; OPS: Moderator on submission 1), the same
"Confirm" answers 200 and the page reloads with "Current Submission
Language: French (Canada)"; `dbarnes` then changes it back to English.

## Cause

The screen and the server decide "may change the submission language"
by two different rules.

The server: `PUT submissions/{id}/publications/{id}/changeLocale` sits in
the route group of `PKPSubmissionController::getGroupRoutes()` that
admits the journal roles `ROLE_ID_MANAGER` and `ROLE_ID_SUB_EDITOR` only
(among others with decisions, `returnToDone`, deletion, `changeVersion`
and `getNextAvailableVersion`). `PublicationWritePolicy`
then applies `StageRolePolicy`, which lets managers and administrators
through and asks everyone else for a role on the current stage, and
`PublicationCanBeEditedPolicy`, which asks for the edit permission
except from an administrator. The administrator's roles do include
`ROLE_ID_SITE_ADMIN`, but the route group does not list it, so an
administrator without a manager or sub-editor role in the journal is
refused there.

The screen: `useWorkflowPermissions.js` (ui-library) sets
`canChangeSubmissionLanguage = canPublish || canEditPublication`, and
`WorkflowChangeSubmissionLanguage.vue` shows "Change" on it.
`canEditPublication` is the publication's `canCurrentUserChangeMetadata`,
true for an assistant whose assignment carries the metadata-edit
permission. `canPublish` is true when the production stage's
`currentUserAssignedRoles` holds `ROLE_ID_SITE_ADMIN`; the submission map
puts that role on every stage for an administrator with no assignment.

Both halves came in with the feature in
[80f1467d6e](https://github.com/pkp/pkp-lib/commit/80f1467d6ef2da5976c8e8bc7210e9e944c40f58):
the route in the manager/sub-editor group, and the workflow page's
state `'canChangeSubmissionLanguage' => $canPublish || $canEditPublication`.
The rewritten workflow page carried the second rule over unchanged
(`pkp/ui-library#422`). The feature's PR and issue speak of editors
changing the language, so the route is the intended rule.

Reach:

- OPS: with the default user groups (`registry/userGroups.xml`) its only
  assistant role, Editorial Board Member, has no stages, so it is never
  assigned to a preprint; a server whose manager gives that role stages
  meets the assistant case too (checked in the code).
- The publish button also follows `canPublish`, so the same
  administrator is offered it. On OMP and OPS its panel first sends
  `PUT …/version` (`changeVersion`), in the same manager/sub-editor
  group, so by the code it is refused there too; on OJS the panel writes
  through routes that admit assistants. Not driven, and not covered by
  the fix below: whether a Site Administrator without a manager role
  should act in the workflow at all is a product question.

## Proposed fix

Let the server say whether the current user may change the language,
computed from the same rules that authorize `changeLocale`, and have the
screen show "Change" on that flag
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/change-language-offered-then-refused/fix.diff)):

- `lib/pkp/classes/submission/Repository.php`: a new
  `canChangeLocale(Submission, Publication, User)` beside
  `canEditPublication()`. It returns false unless the user holds
  `ROLE_ID_MANAGER` or `ROLE_ID_SUB_EDITOR` in the submission's context
  (the route). A user who is neither a manager there nor an
  administrator also needs `ROLE_ID_SUB_EDITOR`, `ROLE_ID_ASSISTANT` or
  `ROLE_ID_AUTHOR` among their accessible roles on the current stage
  (`Repo::user()->getAccessibleWorkflowStages()`, as `StageRolePolicy`).
  Last, an administrator passes and anyone else needs
  `canEditPublication()` (`PublicationCanBeEditedPolicy`).
- `lib/pkp/schemas/publication.json` and
  `lib/pkp/classes/publication/maps/Schema.php`: a read-only publication
  property `canCurrentUserChangeLocale`, mapped like
  `canCurrentUserChangeMetadata` but kept out of the summary, so lists
  do not compute it.
- `lib/ui-library/src/pages/workflow/composables/useWorkflowPermissions.js`:

```diff
-		if (canPublish || canEditPublication) {
-			canChangeSubmissionLanguage = true;
-		}
+		// The server applies the changeLocale endpoint's own rules
+		canChangeSubmissionLanguage =
+			selectedPublication?.value?.canCurrentUserChangeLocale ?? false;
```

Against the server, the button then goes to exactly the users it
admits:

- **Keep it** (admitted today and after): journal managers and editors,
  assigned or not and in whatever role they are assigned; an
  administrator who also holds a manager role, or a section-editor role
  and no manager role; a section editor
  assigned on the current stage whose assignment allows edits,
  recommend-only included; and a section editor assigned here as an
  assistant or author whose assignment allows edits and whose assigned
  role covers the current stage.
- **Lose it** (refused today, offered today): an assistant without a
  manager or section-editor role in the journal, whatever their
  assignment allows; a Site Administrator whose only journal role is an
  assistant role; a section editor assigned only in a group that does
  not cover the current stage (a Copyeditor assignment with the box
  ticked while the submission is in Review or Production; by the code,
  not walked).
- Unchanged: who sees the readout, and the rule that a second version
  or a published version blocks the change, which stays with the
  existing guard and with `changeLocale()` itself.

The other policies on the route (context, submission and publication
access) are met by anyone who is looking at the Publication pages.

Tried: with the fix in, the walk above shows "Current Submission
Language: English" without "Change" for `mfritz` (OJS, OMP) and for the
administrator (all three apps). The control above passes with the fix
in and out, and so does a journal manager assigned as a Copyeditor:
`rvaca`, given the Copyeditor role and assigned as Copyeditor on OJS
submission 19 (OMP: submission 13), keeps "Change" and the change
answers 200.

**Alternatives**:

- Decide on the client from `activeStage.currentUserAssignedRoles`. That
  list holds only assignment roles once the user has any assignment, so
  a manager or section editor assigned here in another role would lose
  a "Change" that works; and `pkp.currentUser.roles` spans every journal.
  No client-side form matches the server.
- Admit assistants on the server (move `changeLocale` to the group that
  lists `ROLE_ID_ASSISTANT`). That changes who may change a submission's
  language, a product decision, and the endpoint also edits the
  submission itself (`edit()`), which assistants may not do elsewhere.

**What goes with it**:

- A unit test of `canChangeLocale()` in pkp-lib for each row above, and
  a ui-library (vitest) test that the composable follows the flag.
- The publication API gains a read-only property; nothing existing
  changes.
- The route's roles then live in two places, the route group and
  `canChangeLocale()`; the method's comment names `getGroupRoutes()`,
  and a matching comment at the route group would keep them together.
- 3.5 backport: fix.diff is for `main`. On `stable-3_5_0` it needs three
  changes: the `publication.json` hunk placed by hand (3.5 has no
  `canCurrentUserChangeMetadata` there to anchor it; the flag lives on
  the submission), `use PKP\core\PKPApplication;` added to
  `classes/publication/maps/Schema.php`, and `canEditPublication()`
  called as `($submission->getId(), $user->getId())`, its 3.5 signature.

Medium: two repos (pkp-lib and ui-library) and a new API property, each
with a test.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/change-language-offered-then-refused/walk.js)
  with its [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/change-language-offered-then-refused/lib.js),
  on an install freshly loaded from the default dataset:
  `PART=a19 node bin/probe.js all shared/playwright/checks/issues/change-language-offered-then-refused/walk.js`;
  `MODE=nb` runs the control and the manager-as-Copyeditor case. The fix
  was tried with `node bin/try-fix.js apply …/fix.diff ojs omp ops` and
  reverted after.
- An administrator with no role in the journal cannot be set up on
  screen: with the manager role as the only one, "Remove Role" answers
  "You cannot remove the role. At least one role must be assigned to the
  user." (walked on all three apps). An administrator who keeps the
  manager role and also takes the Copyeditor role keeps a working
  "Change" with the fix in (200), as the server admits them.
- Walked on `main` (OJS, OMP, OPS) and `stable-3_5_0` (OJS, OMP, OPS),
  PostgreSQL. On 3.5 the Copyeditor path showed the same 401 and toast
  on OJS and OMP. On 3.5 the administrator path never reached the
  button: after the role change the workflow opened with no Publication
  pages, because of a separate page script error, on all three apps. 3.5
  OPS is marked "(code)": its composable and route hold the same two
  rules.
- Code reads: `lib/pkp/api/v1/submissions/PKPSubmissionController.php`
  (`getGroupRoutes()`, `authorize()`, `changeLocale()`),
  `classes/security/authorization/PublicationWritePolicy.php`,
  `StageRolePolicy.php`, `internal/PublicationCanBeEditedPolicy.php`,
  `classes/middleware/HasRoles.php`, and
  `lib/ui-library/src/pages/workflow/composables/useWorkflowPermissions.js`
  on `main` and 3.5; `classes/submission/maps/Schema.php`
  (`getPropertyStages()`) on `main`; OPS `registry/userGroups.xml`. 3.4
  and 3.3: neither the pkp-lib nor the ui-library branch holds
  `changeLocale` or a submission language change (`git grep`).
- Introduced: `git blame` on the route line gives 80f1467d6e (PR
  `pkp/pkp-lib#9245`, merged 2024-09-25), which also added
  `canChangeSubmissionLanguage` to `PKPWorkflowHandler`'s state;
  ui-library ec6cb15f (`pkp/ui-library#422`, for `pkp/pkp-lib#5502`)
  moved that rule into the new workflow page unchanged.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library for
  "change submission language", "submission language copyeditor",
  "submission language admin", `changeLocale`,
  `canChangeSubmissionLanguage` and `cantChangeSubmissionLanguage`;
  only the feature's own issue and PRs came up.
- Tips: `main` OJS ff004d0973 (lib/pkp 987776cd04, ui-library
  64d67363), OMP 3b0ecf794 and OPS c8af945bb7 (lib/pkp 3dc90c81a6,
  ui-library 280f98c5); `stable-3_5_0` OJS c1cee76b95 (lib/pkp
  771474347e), OMP 9c5e24246, OPS 38b61882d3 (lib/pkp cf3f984335),
  ui-library d4e01883; 3.4 pkp-lib 767353f4fe, ui-library ee684b34;
  3.3 pkp-lib ac3fa73402, ui-library 96959f9e; datasets 566bb1f.
- Not driven: a Layout Editor or Proofreader (the Copyeditor's role
  constant); a section editor assigned as an assistant; the publish
  button for the administrator.
