# Before posting, a Moderator without "Permissions" cannot edit, add or reorder the galleys the page offers

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: none (code; the galley grid offers only what it allows)
  - 3.3: none (code; the galley grid offers only what it allows)
- **Introduced** `pkp/ui-library#478` for `pkp/pkp-lib#10760` · [f9aca59b](https://github.com/pkp/ui-library/commit/f9aca59bf6e91142d96a91fc01b8e8d04b5aa4e8) · 2025-01-06 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U46 [OPS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U46-galleys.md#ops2)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On a preprint server, a Moderator whose assignment on the preprint has
"Permissions" unticked (the box that allows changes to the
publication) is offered the whole "Galleys" page before the preprint is
posted: "Add galley", "Order", and "Edit", "Change File", "More
Information" and "Delete" on each galley. Three of them fail. "Edit"
opens the galley's window with every field and "Save" greyed out. A new
galley's "Save" greys the "Create New Galley" window out, shows no
message and adds nothing; at the next page load (a reload, say) a
notice reads "This galley can not be edited because it has already been
published." "Save Order" puts the old order back at once, with no
message.

"Change File" and "Delete" work for the same Moderator, and once the
preprint is posted everything on the page does.

## Impact

- **Lost**: nothing stored. The Moderator's new order is dropped with
  no message, and their new galley with a false notice.
- **Who**: a Moderator whose assignment on the preprint has
  "Permissions" unticked, before the preprint is posted. The box is
  ticked for Moderators by default, so only assignments an editor
  restricted meet it.
- **Way round**: a Preprint Server Manager makes the change, or ticks
  the Moderator's "Permissions" box. After posting, the Moderator can.

Medium: the tasks fail without saying why, so the Moderator cannot tell
they must ask, but a manager can do them and the setup is one an editor
chooses. It would be high if Moderators were restricted by default, low
if each failure said plainly that the action is not allowed.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OPS (the server
  `publicknowledge`). Submission 1, "The influence of lactation on the
  quantity and quality of cashmere production", is in Production and
  not posted. Its one galley is "PDF", and its Moderators David Buskins
  (`dbuskins`) and Stephanie Berardo (`sberardo`) have "Permissions"
  ticked.
- Steps 1–5 add a second galley (the order needs two), store the
  list's order and untick the box on `dbuskins`'s assignment.

As the manager:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`). Open "Active
   submissions" and press "View" on submission 1.
2. Side menu "Preprint" › "Galleys". Press "Add galley", type "Galley
   Label" `u46w6 Remote`, tick "This galley will be available at a
   separate website.", type `https://example.org/u46w6` as the address
   and press "Save".
3. The window "Upload a File Ready for Publication" opens: press
   "Cancel".
4. Press "Order" and "Save Order" (the list already reads "PDF", then
   `u46w6 Remote`). Until an order is saved every galley shares one
   position and the list shows them in whatever order the database
   returns (spec U46 A7), so step 9's "old order" would not be fixed.
5. Side menu "Production". In "Participants" press "David Buskins More
   Actions" › "Edit", untick the box under "Permissions" ("Allow this
   person to make changes to the publication, …") and press "OK". Sign
   out.

As the Moderator:

6. Sign in as `dbuskins`. On "Assigned to me" press "View" on
   submission 1, then side menu "Preprint" › "Galleys". Look above and
   below the table and open the "PDF" row's "More Actions".
7. "More Actions" › "Edit" on "PDF". Then press the window's "Close".
8. Press "Add galley", type "Galley Label" `u46w6 HTML` and press
   "Save". Then press the window's "Close" and reload the page.
9. Press "Order", press the down arrow on the "PDF" row (the list reads
   `u46w6 Remote`, then "PDF") and press "Save Order". Reload the page.

**Expected**, as recommended below: what the page offers works. In step 7
the window "Upload a File Ready for Publication" lets `dbuskins` change
the label and has "Save" and "Cancel". In step 8 "Save" closes the
window, the upload window opens for the new galley's file, and the list
shows `u46w6 HTML`. In step 9 the list keeps `u46w6 Remote` above "PDF",
also after the reload. (If the team decides that the box keeps a
Moderator off the galleys before posting, the page should instead offer
this Moderator a read-only "View", as it does the Author.)

**Observed**: in step 6 "Order" and "Add galley" are there, and the
row menu offers "Edit", "Change File", "More Information" and "Delete".
In step 7 the window opens with "Galley Label", "Language", the remote
box and "URL Path" greyed out, "Save" greyed out and no "Cancel". In
step 8 "Save" leaves "Create New Galley" open with every field and
"Save" greyed out and no message; after the reload the list still reads
"PDF", `u46w6 Remote`, and a notice reads "This galley can not be
edited because it has already been published." In step 9 the list goes
back to "PDF", `u46w6 Remote` as soon as "Save Order" is pressed, and
stays so after the reload. Both saves answer as if they succeeded:

```
POST /index.php/publicknowledge/$$$call$$$/grid/preprint-galleys/preprint-galley-grid/update-galley?submissionId=1&publicationId=1&representationId=
200 {"status":true,"content":"<the same form, its fields disabled>"}

POST /index.php/publicknowledge/$$$call$$$/grid/preprint-galleys/preprint-galley-grid/save-sequence?submissionId=1&publicationId=1
200 {"status":true,"content":"","elementId":"0","events":[{"name":"dataChanged"}]}
```

Control: `sberardo`, whose box is still ticked, gets the same window in
step 7 with every field editable, "Save" and "Cancel".

## Cause

The page and the server apply two rules for the same Moderator.

The page: ui-library's `useGalleyManagerConfig.js`
(`lib/ui-library/src/managers/GalleyManager/`),
`getGalleyManagerConfiguration()`, gives every editorial role
(`ROLE_ID_SUB_EDITOR`, `ROLE_ID_MANAGER`, `ROLE_ID_SITE_ADMIN`,
`ROLE_ID_ASSISTANT`) the whole set of actions and ignores
`canCurrentUserEditPublication`, which it reads only for the Author.
That rule was a deliberate decision. f9aca59b
(`pkp/pkp-lib#10760`) replaced the page's `canEdit` prop, which the
preprint server's workflow filled from the publication's edit
permission, with this role list, and the issue's notes say "Edit
actions are available for editorial roles when the publication is not
published". In July 2026 a comment on `pkp/pkp-lib#13039` restated it
for the page: "Editorial roles can edit galleys anytime (including
publication is published)".

The server: OPS's `PreprintGalleyGridHandler::canEdit()`
(`controllers/grid/preprintGalleys/PreprintGalleyGridHandler.php`)
lets a manager or sub-editor through only once the version is posted.
Before posting it asks `Repo::submission()->canEditPublication()`,
which for an assigned Moderator is their assignment's
`canChangeMetadata`, the "Permissions" box. The rule dates from 2020
(`pkp/pkp-lib#5750`), when the legacy grid built its actions from
`canEdit()` and so offered this Moderator a read-only "View" only.
`pkp/pkp-lib#10263` (OPS
[7d9c84e9b6](https://github.com/pkp/ops/commit/7d9c84e9b6f5ce9399c79b76c722fc2904234565),
2025) let managers and sub-editors edit galleys after posting, and left
the branch before posting as it was. The Vue page first followed the
server: at e88d2d20 (`pkp/ui-library#445`), which brought it to the
preprint server, a Moderator without the box got "View" as the grid
gave. The two parted at f9aca59b.

`canEdit()` decides only some of the operations:

- `editGalleyTab` and `updateGalley` pass it to `PreprintGalleyForm` as
  `$isEditable`: the form renders disabled, and `validate()` adds
  `galley.cantEditPublished` under no field, so the window shows nothing
  and the message arrives as a notice at the next page load, worded for
  a published version.
- `initFeatures()` adds `OrderGridItemsFeature` only when it is true.
  Without it `saveSequence` stores nothing and still answers
  `"status":true`.
- `identifiers`, `updateIdentifiers` and `clearPubId` pass it to
  `PublicIdentifiersForm`, so the "Identifiers" tab, shown when galley
  identifiers are switched on, is read-only for this Moderator before
  posting (code).
- `addGalley` renders the empty form without it, so "Create New
  Galley" opens editable and the refusal comes only with its save.

Reach:

- Steps 7, 8 and 9: on screen.
- A Preprint Server Manager passes `canEditPublication()` without an
  assignment, and a site administrator passes `canEdit()` first: not
  affected (code).
- OJS: `ArticleGalleyGridHandler::canEdit()` asks only for access to
  the Production stage, so a journal's editorial roles are never
  refused (code; spec U46 note q2 drove them all).
- The Author is not affected: the page reads
  `canCurrentUserEditPublication` for them, as the server does.
- OPS installs no assistant group, the fourth role the page lists
  (`registry/userGroups.xml`).

## Proposed fix

Let `PreprintGalleyGridHandler::canEdit()` pass a manager or a
Moderator whether or not the version is posted, the rule the page and
`pkp/pkp-lib#13039` state, and keep the "Permissions" box and posting
as the Author's gate. The diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/moderator-galleys-offered-then-refused/fix.diff):

```diff
--- a/controllers/grid/preprintGalleys/PreprintGalleyGridHandler.php
+++ b/controllers/grid/preprintGalleys/PreprintGalleyGridHandler.php
@@ -488,21 +489,16 @@
         $userRoles = $this->getAuthorizedContextObject(Application::ASSOC_TYPE_USER_ROLES);
 
-
-        if (in_array(Role::ROLE_ID_SITE_ADMIN, $userRoles)) {
+        if (
+            in_array(Role::ROLE_ID_SITE_ADMIN, $userRoles) ||
+            in_array(Role::ROLE_ID_MANAGER, $userRoles) ||
+            in_array(Role::ROLE_ID_SUB_EDITOR, $userRoles)
+        ) {
             return true;
         }
 
-        // if it is published, allow managers or sub-editors
+        // once posted, nobody else
         if ($publication->getData('status') === PKPSubmission::STATUS_PUBLISHED) {
-            // allow these roles to edit galleys even if published
-            if (
-                in_array(Role::ROLE_ID_MANAGER, $userRoles) ||
-                in_array(Role::ROLE_ID_SUB_EDITOR, $userRoles)
-            ) {
-                return true;
-            }
-            // otherwise block
             return false;
         }
```

(The diff also rewrites the method's comment to state the rule.) It
moves the role check that `pkp/pkp-lib#10263` placed inside the posted
branch to the top, so posting no longer widens a Moderator's rights.

Tried on `main`, OPS: in step 7 the window is editable with "Save" and
"Cancel"; in step 8 "Save" closes it, the upload window opens and the
list shows `u46w6 HTML`; in step 9 the new order stays after the
reload. With the fix and without it, the Author's rights stay as they
were. `ccorino`, with his "Permissions" unticked before posting, is
offered "View" alone and its window is read-only. So is `ckwantes` on
her posted submission 2. A Moderator with the box unticked on posted
submission 2 keeps the whole page, with and without the fix.

**Alternatives**

- Make the page follow `canEdit()`: offer a Moderator without the box a
  read-only "View" and "More Information" before posting. This keeps
  the 3.4 behaviour, but it goes against the `pkp/pkp-lib#13039`
  ruleset, keeps a rule under which posting widens a Moderator's
  rights, and "Change File" and "Delete" would then have to be held to
  the same rule. The same question is open for the
  "Media" page, whose report recommends the server's rule there
  ([U47-A1-media-actions-offered-then-refused](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U47-A1-media-actions-offered-then-refused.md)):
  the team may want to answer both at once.
- Read the roles from the Production stage's assignments
  (`ASSOC_TYPE_ACCESSIBLE_WORKFLOW_STAGES`) instead of the user's roles
  in the server: closer to the page's own check, which counts only
  roles assigned on the stage. A Moderator of the server who is only
  the Author of a preprint would then be held to the Author's gate,
  where the role check in the posted branch passes them today. Not
  tried.

**What goes with it**

- The "Identifiers" tab follows: with galley identifiers on, a
  Moderator without the box can now save them before posting (code).
- The refusal's missing message and its wording ("already been
  published" on a preprint not posted) stay for anyone still refused;
  after the fix no screen offers a refused save.
- Who else it widens: `ASSOC_TYPE_USER_ROLES` holds the user's roles in
  the server, not on the preprint. A Moderator of the server assigned
  to a preprint only as its Author would pass `canEdit()` before
  posting too, whatever their author assignment's box says; today the
  posted branch already passes them after posting. The second
  alternative above closes both.
- 3.5: the diff applies with fuzz (`patch --dry-run` on the 3.5
  checkout). Its second hunk misses only because `main` has a second
  blank line after `$userRoles` that 3.5 lacks; the method is otherwise
  the same where the hunk falls.
- Guard: a scenario in spec U46 (a Moderator without "Permissions"
  edits, adds and reorders galleys before posting). OPS has no unit
  test of the galley grid to extend.

Medium: the change is a few lines in one method, but it widens what a
restricted Moderator may do before posting on three surfaces, which
the team confirms first.

## Evidence

- The script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/moderator-galleys-offered-then-refused/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/moderator-galleys-offered-then-refused/lib.js))
  takes steps 1–9 and the control on an install freshly loaded from the
  default dataset; `MODE=nb` takes the neighbour checks alone:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ops shared/playwright/checks/issues/moderator-galleys-offered-then-refused/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Walked on `main` and 3.5, OPS, on PostgreSQL; datasets pkp/datasets
  e8dafbc (2026-10-02). On 3.5 the row menu has no "More Information"
  and steps 7–9 show the same. The step 8 notice is a notification the server queues
  for the user (`addError('', …)` on the form); it appeared on the next
  page load on both versions.
- Branch tips. `main`: OPS c8af945bb7, pkp-lib 3dc90c81a6, ui-library
  280f98c5. 3.5: OPS 38b61882d3, pkp-lib cf3f984335, ui-library
  d4e01883. 3.4: OPS acd8ae704b, pkp-lib 9e41f10273. 3.3: OPS
  c5532e2161, pkp-lib ac3fa73402.
- Code reads. 3.5: `useGalleyManagerConfig.js` gives the editorial
  roles the whole set (without "More Information") and `canEdit()` is
  the same as on `main`. 3.4: `PreprintGalleyGridHandler` adds "Add
  galley" and the ordering feature only when `canEdit()`, and
  `PreprintGalleyGridRow` offers "Edit" (else "View"), the upload and
  "Delete" only when editable; its `canEdit()` refuses everyone once
  posted and asks `canEditPublication()` before. 3.3: the same in
  `ArticleGalleyGridHandler.inc.php` and `ArticleGalleyGridRow.inc.php`
  (OPS kept the journal's class names there).
- Introduced: at e88d2d20 (`pkp/ui-library#445`), which brought the
  GalleyManager to the preprint server, `workflowConfigEditorialOPS.js`
  passed `canEdit: permissions.canEditPublication`, and without it
  `useGalleyManagerActions.js` left out "Add galley" and "Order" and
  offered "View" alone. f9aca59b (`pkp/ui-library#478`) dropped that
  prop from the store and added the role list
  (`GalleyManagerConfiguration.permissions`, checked with
  `hasCurrentUserAtLeastOneAssignedRoleInStage`). The server side: `git log -L` on `canEdit()` leads to 935df35d66
  (`pkp/pkp-lib#5750`, 2020) for the `canEditPublication()` branch and
  to 7d9c84e9b6 (`pkp/pkp-lib#10263`) for the posted branch; ab4b990d96
  (`pkp/pkp-lib#13109`) only changed the call's arguments.
- Upstream searches (pkp/pkp-lib, pkp/ops, pkp/ui-library): galley and
  moderator, permission and order words, the notice's text,
  `PreprintGalleyGridHandler`, `canCurrentUserEditPublication`. Found:
  `pkp/pkp-lib#13039` (closed; the Author's access to the page, the
  ruleset in a comment of 2026-07-27), `pkp/pkp-lib#13107` (closed; a
  "Save Order" server error, fixed) and `pkp/pkp-lib#10760` (closed;
  built the page, with the note quoted in the Cause). None is this
  fault.
- Not walked: the "Identifiers" tab, a Moderator who is also a
  preprint's Author, the alternatives, and the fix on 3.5.
