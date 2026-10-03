# Authors of posted preprints and Moderators without "Permissions" get "An unexpected error" saving "Relations"

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: none (code; the relation saves through its own address)
  - 3.3: none (code; the relation saves through its own address)
- **Introduced** `pkp/ui-library#445` for `pkp/pkp-lib#7495` · [e88d2d20](https://github.com/pkp/ui-library/commit/e88d2d20dbf9d28b2f707c8fa062aa6f32167882) · 2024-11-06 · Jarda Kotěšovec (jardakotesovec); the Author meets it since [de140dc6](https://github.com/pkp/ui-library/commit/de140dc663ab8e3266a75d118256aef03ae115ec) for `pkp/pkp-lib#11157` (2025-04-23, the same author), which gave the Author the panel
- **Upstream** `pkp/pkp-lib#11157` (closed 2025-04-28), which brought "Relations" to the Author's view on 3.5 and `main`; it covered showing the panel, not its save
- **Tracked in** spec U75 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U75-preprint-relations.md#a1), [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U75-preprint-relations.md#a2)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

The Author of a posted (or scheduled) preprint opens "Relations", ticks
"This preprint has been published elsewhere.", types the DOI of the
published version and presses "Save". The notice reads "An unexpected
error has occurred. Please reload the page and try again.", nothing is
saved, and the preprint page shows no notice that the preprint was
published elsewhere.

A Moderator or an Author whose assignment has "Permissions" unticked
meets the same refusal whatever the preprint's status, posted or not.
The panel offers its choices and "Save" as active, while the "Title &
Abstract" page's "Save" is greyed for the same person, and the notice
never says why.

The Author is the one who learns that a journal has published the
version of record, and before 3.5 they could record it after posting.

## Impact

- **Lost**: the link from the preprint to its published version, on the
  preprint page and, on a server that deposits with Crossref, in the
  next deposit, until someone else records it.
- **Who**: every Author of a posted or scheduled preprint, on every
  preprint server. "Permissions" is ticked by default on a Moderator's
  and an Author's assignment, so the rest meet it only after a manager
  unticked the box or the role's "Permit submission metadata edit.".
- **Way round**: a Preprint Server Manager, or one of the preprint's
  Moderators (who have "Permissions" by default), saves the relation for
  the Author once asked (a discussion on the preprint, an email).

Medium: recording the relation is the one change OPS leaves to the
Author after posting, and it fails for all of them; the default
Moderators can still do it on request, and it would be high if no one on
the server could.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OPS (the server
  `publicknowledge`).
- Submission 2, "The Facets Of Job Satisfaction: A Nine-Nation
  Comparative Study Of Construct Equivalence", is posted; its Author is
  Catherine Kwantes (`ckwantes`).
- Submission 1, "The influence of lactation on the quantity and quality
  of cashmere production", is in Production and not posted; its
  Moderators are David Buskins (`dbuskins`) and Stephanie Berardo, each
  with "Permissions" ticked.

The Author on a posted preprint:

1. Sign in as `ckwantes` (password `ckwantesckwantes`). In "My
   Submissions" open "Published" and press "View" on submission 2.
2. Side menu "Preprint" › "Title & Abstract". The page reads "Status:
   Posted" and "This version has been posted and can not be edited.",
   and its "Save" is greyed.
3. Press "Relations". Tick "This preprint has been published
   elsewhere.", type `https://doi.org/10.1234/u75r1` in "DOI of the
   published preprint" and press "Save".
4. Reload the page, open "Title & Abstract" again and press "Relations".
5. Open the preprint's page,
   `/index.php/publicknowledge/preprint/view/2`.

A Moderator without "Permissions":

6. Sign in as `dbarnes`, the Preprint Server Manager. Open "Active
   submissions" and press "View" on submission 1, then side menu
   "Production"; in "Participants" press "David Buskins More Actions" ›
   "Edit", untick the box under "Permissions" ("Allow this person to
   make changes to the publication, …") and press "OK". Sign out.
7. Sign in as `dbuskins`. On "Assigned to me" press "View" on
   submission 1, side menu "Preprint" › "Title & Abstract": its "Save"
   is greyed.
8. Press "Relations" and do as in step 3; then reload as in step 4.

[On 3.5 the panel lists two choices; "This preprint's relations have
not been entered." is not among them. The steps are the same.]

**Expected**: "Saved" shows beside "Save" in steps 3 and 8, and after
each reload "This preprint has been published elsewhere." is ticked with
the address in the box. In step 5 the preprint page opens with "This
preprint has been published elsewhere." and "DOI of the published
preprint https://doi.org/10.1234/u75r1".

**Observed**: in steps 3 and 8 the panel offers its choices and "Save"
active; "Save" shows the notice

```
An unexpected error has occurred. Please reload the page and try again.
```

and the save answers

```
POST /index.php/publicknowledge/api/v1/submissions/2/publications/2   (X-Http-Method-Override: PUT)
401  errorMessage: "You are not allowed to edit this publication."
```

(`…/submissions/1/publications/1` in step 8). After each reload no
choice is ticked and the box is gone; in step 5 the preprint page has no
notice.

Control: `dbarnes` opens the dashboard's "Published" view, presses
"View" on submission 2, takes steps 2 and 3 and sees "Saved"; the
preprint page then shows the notice with the address.

## Cause

The "Relations" panel saves through the wrong address. In ui-library
`WorkflowPublicationRelationDropdownOPS.vue` (lines 37–40) the panel's
`watch` sets the form's action to
`submissions/{submissionId}/publications/{id}`, the general publication
edit (`PKPSubmissionController::editPublication()`). That route is in
`requiresPublicationWriteAccess`, so `PublicationWritePolicy` →
`PublicationCanBeEditedPolicy` → `Repo::submission()->canEditPublication()`
decides, and it refuses:

- every person whose assignments are all Author ones once the version is
  `STATUS_PUBLISHED` or `STATUS_SCHEDULED` (pkp-lib
  `classes/submission/Repository.php` lines 562–567, "Don't allow
  authors to change metadata of published publications"; on 3.5 the
  check is any version of the submission being published or scheduled);
- every non-manager whose assignments lack `canChangeMetadata` (line
  569), which is what the "Permissions" box sets.

OPS has its own address for the relation, `PUT
submissions/{id}/publications/{publicationId}/relate`
(`SubmissionController::relatePublication()` in the OPS app), written for
exactly this. It accepts only `relationStatus` and `vorDoi`, clears the
DOI when the status is not "published elsewhere"
(`Repository::relate()`), and is not behind the edit gate. Its access
is submission access plus `requiresProductionStageAccess`, which
`PKPSubmissionController::authorize()` (line 403) turns into `new
StageRolePolicy($this->productionStageAccessRoles,
WORKFLOW_STAGE_ID_PRODUCTION, false)`, with `ROLE_ID_AUTHOR` added to
`productionStageAccessRoles`. The `false` refuses a recommend-only
assignment, a recommend-only manager's too.

That access is pkp's rule for the relation. `pkp/pkp-lib#5957` asked to
let Authors update it "even after the preprint has been posted" (the
issue's description), and its pull request `pkp/ops#68` made, in its
author's words on the issue, "an author can always edit the relation
status of her own submission". The 3.3 and 3.4 author dashboard and
workflow page posted the form to `/relate`. The dashboard that replaced
them (`DashboardHandler`) builds the form with the action `'emit'`, and
e88d2d20, which brought the panel to the new workflow, set the action to
the publication route. Since then no screen calls `/relate`; `main`'s
OPS `WorkflowHandler` and `AuthorDashboardHandler` still build the
`/relate` form, as dead code behind pages that redirect to the
dashboard.

The relate route has also broken on `main` while unused:
`pkp/pkp-lib#11765` for `pkp/pkp-lib#857` (52d3a0f8e7, 2025-11-11)
changed `PKP\publication\Repository::getSchemaMap()` to `(Submission
$submission, array $genres)`, and `relatePublication()` still calls
`getSchemaMap($submission, $userGroups, $genres)` (OPS
`api/v1/submissions/SubmissionController.php` line 166), passing a
collection where the array goes. On `main` a request there would write
the relation and then fail with a type error (read in the code, not
driven). 3.5 still has the three-argument signature.

The notice says nothing useful because `Form.vue::error()` (lines
489–498) shows the server's `errorMessage` only for a 403 or 404, and
the policy's refusal answers 401.

Reach:

- Same cause, from the code: a scheduled version (the same
  `STATUS_SCHEDULED` branch), and an Author whose "Permissions" box is
  unticked (the edit gate's `canChangeMetadata` branch).
- Related: saving "This preprint has not been published elsewhere."
  after "published elsewhere" keeps the DOI, because
  `editPublication()` stores the hidden `vorDoi` as sent where
  `relate()` clears it ("What goes with it").

## Proposed fix

Proposal: send the panel's save to the relation's own address again,
repair that address on `main`, and offer the panel on the editorial side
only to those the address accepts. This restores the rule of
`pkp/pkp-lib#5957`, without opening the rest of a posted version to the
Author. Tried as
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/relations-save-refused/fix.diff):

```diff
--- a/lib/ui-library/src/pages/workflow/components/publication/WorkflowPublicationRelationDropdownOPS.vue
 		const {apiUrl} = useUrl(
-			`submissions/${newPublication.submissionId}/publications/${newPublication.id}`,
+			`submissions/${newPublication.submissionId}/publications/${newPublication.id}/relate`,
 		);
--- a/lib/ui-library/src/pages/workflow/composables/useWorkflowConfig/workflowConfigEditorialOPS.js
+			// The relation saves through /relate, whose Production stage check
+			// refuses recommend-only assignments: offer it only to those it accepts
+			const canRelate = !getStageById(
+				submission,
+				pkp.const.WORKFLOW_STAGE_ID_PRODUCTION,
+			)?.currentUserCanRecommendOnly;
…
-				{
-					component: 'WorkflowPublicationRelationDropdownOPS',
-					props: {publication: selectedPublication},
-				},
+				...(canRelate
+					? [{component: 'WorkflowPublicationRelationDropdownOPS', props: {publication: selectedPublication}}]
+					: []),
--- a/api/v1/submissions/SubmissionController.php
-        $userGroups = UserGroup::withContextIds([[$submission->getData('contextId')]])
-            ->get();
-
         /** @var GenreDAO $genreDao */
         $genreDao = DAORegistry::getDAO('GenreDAO');
-        $genres = $genreDao->getByContextId($request->getContext()->getId())->toAssociativeArray();
+        $genres = $genreDao->getByContextId($submission->getData('contextId'))->toAssociativeArray();
 
         return response()->json(
-            Repo::publication()->getSchemaMap($submission, $userGroups, $genres)->map($publication),
+            Repo::publication()->getSchemaMap($submission, $genres)->map($publication),
```

The OPS hunk follows `editPublication()`, which maps the answer the same
way (and drops the now unused `UserGroup` import). For a recommend-only
Moderator the panel is hidden rather than the stage check loosened:
without the second hunk they would get the same active panel, 401 and
"An unexpected error" for a save they can make today, and hiding it is
what 3.4 did (its workflow page showed the relation only with
`$canPublish`, which a recommend-only assignment never has). The
alternative, letting `/relate` accept recommend-only assignments, needs
the stage check moved out of `requiresProductionStageAccess`, whose
`false` the publish and version routes share.

Tried on OPS `main`: in steps 3 and 8 "Saved" shows, the save goes to
`…/publications/2/relate` and `…/publications/1/relate` and answers 200,
the reloads keep the choice and the address, and the preprint page shows
the notice. Neighbour checks, with the fix in and out:

- the Author's "Title & Abstract" on the posted version keeps its greyed
  "Save" and the "can not be edited" line, both ways;
- the Preprint Server Manager's relation save on submission 3 is
  accepted and kept, both ways;
- Stephanie Berardo, made recommend-only on submission 1 with
  "Permissions" left ticked, is offered no "Relations" with the fix;
  without it she is offered it and her save is accepted;
- David Buskins, not recommend-only, is offered "Relations" both ways.

**Alternatives**:

- Keep the publication route and let `canEditPublication()` pass the
  Author for the relation: the gate knows nothing about which fields are
  sent, so it would need a field list in `editPublication()`, a second
  rule beside the one `/relate` already holds.
- Grey the panel for whoever the edit gate refuses (read
  `publication.canCurrentUserChangeMetadata`, as the other publication
  forms do): it would stop the refused save but leave the Author unable
  to record the relation after posting. It is the right change only if
  the team decides the relation follows the "Permissions" box and the
  posting lock.
- Pass the server's message on for a 401 in `Form.vue`: worth doing for
  every form, but here the save would still be refused.

**What goes with it**:

- Who may save is then decided by the relate route's rule: an Author or
  Moderator without "Permissions" is accepted, as on 3.4; a
  recommend-only Moderator no longer sees the panel, where today they
  can save with "Permissions" ticked, as on 3.4.
- The DOI kept under another status
  ([U75-A3-relation-change-keeps-published-version-doi.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U75-A3-relation-change-keeps-published-version-doi.md)):
  once this fix lands, that report's steps on the panel stop
  reproducing, since `relate()` stores an empty DOI for the other two
  statuses. Its own fix (a `Repository::edit()` override, with the
  Crossref filter) still covers the wizard, API clients and stored data.
  The two combine (`relate()` goes through that `edit()`), and either
  may land first.
- `/relate` does not fire `MetadataChanged`, which `editPublication()`
  does; nothing in pkp-lib or OPS listens to it today.
- No stored data, schema or plugin hook changes.
- 3.5: the two ui-library hunks apply as they stand; the OPS hunk is not
  needed there.
- Guard: an e2e scenario in which the Author records the relation on a
  posted preprint and the preprint page shows it (a **Planned** item in
  the spec).

Medium: two repos, and the rule of who may record the relation changes
back to 3.4's for Moderators and Authors without "Permissions", which
the team should confirm.

## Evidence

- The script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/relations-save-refused/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/relations-save-refused/lib.js))
  takes steps 1–8 and the control on an install freshly loaded from the
  default dataset; `MODE=nb` takes the neighbour checks alone:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ops shared/playwright/checks/issues/relations-save-refused/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Walked on `main` and 3.5, OPS, on PostgreSQL; datasets pkp/datasets
  e8dafbc (2026-10-02). On 3.5 the dataset's Author assignment on
  submission 2 has "Permissions" unticked (3.5 clears it on posting) and
  the panel lists two choices; the save answers the same 401 and notice.
- Branch tips. `main`: OPS c8af945bb7, pkp-lib 3dc90c81a6, ui-library
  280f98c5. 3.5: OPS 38b61882d3, pkp-lib cf3f984335, ui-library
  d4e01883. 3.4: OPS acd8ae704b, pkp-lib 767353f4fe, ui-library
  ee684b34. 3.3: OPS c5532e2161, pkp-lib ac3fa73402, ui-library
  96959f9e.
- Code reads. 3.4: `templates/authorDashboard/authorDashboard.tpl` shows
  the relation dropdown to the Author unconditionally and
  `templates/workflow/workflow.tpl` to editors with `$canPublish`
  (Production assignment, not recommend-only, not tied to
  "Permissions"); both post to `/relate` (`$relatePublicationApiUrl`),
  whose `SubmissionHandler` rule is the one above. 3.3: the same in
  `authorDashboard.tpl` and `SubmissionHandler.inc.php`. The
  "Permissions" default: OPS `registry/userGroups.xml` sets
  `permitMetadataEdit="true"` on the Moderator and Author groups,
  `StageAssignment` `Repository::build()` takes `canChangeMetadata` from
  it, and `AddParticipantForm` pre-ticks the box for those groups.
- History. e88d2d20 (main, 2024-11-06) made the editorial panel save
  through the publication route: the Moderator half. The Author's view
  showed no panel until de140dc6 (main; 61e9245f on `stable-3_5_0`, both
  2025-04-23), which made the Author's publication controls render: the
  Author half. Every 3.5.0 release, 3.5.0-0 (2025-06-16) to 3.5.0-5
  (2026-06-30), carries both (the ui-library pointers of the OPS tags).
  `git log` on `WorkflowPublicationRelationDropdownOPS.vue` and on the
  panel's entries in `workflowConfigAuthorOPS.js` and
  `workflowConfigEditorialOPS.js` has e88d2d20 alone. The relate route's
  break: 52d3a0f8e7 (merged as f155593809); its OPS companion
  b44752743b did not touch `relatePublication()`.
- Upstream: found `pkp/pkp-lib#5957` (closed 2020; the rule),
  `pkp/pkp-lib#11157` (closed 2025; the panel shown to the Author),
  `pkp/pkp-lib#9441` and `#11719` (open; the wizard's required mark and
  an "unspecified" status). None reports the refused save.
- Not walked: a scheduled version, an Author with "Permissions"
  unticked, the relate route on `main` without the OPS hunk, and the fix
  on 3.5. MySQL not checked (nothing here depends on the database).
