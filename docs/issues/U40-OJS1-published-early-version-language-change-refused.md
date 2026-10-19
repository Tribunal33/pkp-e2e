# Editors are offered a language "Change" on an article published as Author's Original, and every change is refused

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: none (no "Publication Stage" at publish)
  - 3.4: none (code; no submission language change)
  - 3.3: none (code; no submission language change)
- **Introduced** `pkp/pkp-lib#12881` and `pkp/ojs#5585` for `pkp/pkp-lib#12799` · [d52aa4c84b](https://github.com/pkp/pkp-lib/commit/d52aa4c84b740ec537b13141f88401e8d2e4cdc4) · 2026-06-28 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-19)
- **Tracked in** spec U40 [OJS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U40-publication-metadata.md#ojs1)
- **Checked** 2026-10-19, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An editor publishes a journal article's only version with the
"Publication Stage" "Author's Original" or "Published Manuscript Under
Review". The article's Publication pages (Title & Abstract,
Contributors, Metadata) then still show "Current Submission Language:
English" with a "Change" button, beside "Status: Published" and
"Unpublish". An article published as "Version of Record" no longer
shows that line or the button.

Picking another language there and pressing "Confirm" is always
refused with the toast "You can not change language of this submission
because it already has more than one publication version or a
published publication.", and the panel stays open. The refusal is the
intended rule: the button should not be offered. The editor loses only
the title and abstract typed into the panel.

Only journals that publish an article's first version under one of
these two stages meet it. Publication stages are new on `main` and in
no release yet.

## Impact

- **Lost**: the title and abstract typed into the panel for the new
  language. The article is unchanged.
- **Who**: editors and journal managers, on an article whose only
  version is published as "Author's Original" or "Published Manuscript
  Under Review", each time they press "Change".
- **Way round**: an editor who must change the language presses
  "Unpublish", changes it, and publishes again. The article is offline
  for that time.

Low: nothing is stored wrong, and the toast says why the change is
refused. It would be medium only if the team ruled that the language
may change until the Version of Record is out, which nothing in the
code or its issues suggests.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`, journal `publicknowledge`
  (submission languages English and French (Canada)).
- Submission 5, "Genetic transformation of forest trees", is in
  Production with one version, not published.

Author's Original:

1. Sign in as `dbarnes`.
2. Open submission 5, "Genetic transformation of forest trees".
3. In the side menu, open Publication › "Title & Abstract". It shows
   "Current Submission Language: English" with "Change", and "Status:
   Unscheduled".
4. Press "Schedule For Publication". In "Review Publishing Details" set
   "Publication Stage" to "Author's Original (AO)", "Revision
   Significance" to "Major Revision", and "Issue Assignment" to "Don't
   Assign To An Issue". Press "Confirm".
5. The window reads "All publication requirements have been met. This
   will be published immediately without any issue association. Are you
   sure you want to publish this? The publication version is "Author's
   Original 1.0"". Press "Publish".
6. Open "Title & Abstract", "Contributors" and "Metadata" in turn.
7. On "Title & Abstract", press "Change", pick "French (Canada)", type a
   title and an abstract, and press "Confirm".

Published Manuscript Under Review: steps 1 to 7 on submission 6,
"Investigating the Shared Background Required for Argument: A Critique
of Fogelin's Thesis on Deep Disagreement", with "Published Manuscript
Under Review (PMUR)" in step 4. This stage can be published only when a
review round is linked to the version; the panel's "Associated review
round" already shows "Round 1", the dataset's round for this version,
so nothing needs picking.

**Expected**: once the article is published, the language line and
"Change" leave its Publication pages, as they do for a Version of
Record.

**Observed**: after step 5, "Title & Abstract", "Contributors" and
"Metadata" each still show "Current Submission Language: English" with
"Change", beside "Status: Published". In step 7 "Confirm" is refused:

```
PUT /index.php/publicknowledge/api/v1/submissions/5/publications/6/changeLocale
403 {"error":"You can not change language of this submission because it already has more than one publication version or a published publication."}
```

The same text shows as a toast, the panel stays open with what was
typed, and after a reload the language is still English and "Change" is
still there.

Control: steps 1 to 6 on submission 9, "Hansen & Pinto: Reason
Reclaimed", with "Version of Record (VoR)" in step 4. After "Publish",
its Publication pages show "Status: Published" with neither the
language line nor "Change".

## Cause

The server's rule is in `PKPSubmissionController::changeLocale()`
(lib/pkp): the language may change only while the submission has one
version and that version's own status is not `STATUS_PUBLISHED`.
Otherwise it answers 403 with `api.submission.403.cantChangeSubmissionLanguage`.
That rule came with the feature (`pkp/pkp-lib#9245` for
`pkp/pkp-lib#5502`) and no change since has touched it.

The screen applies the same rule in ui-library
`workflowConfigEditorialOJS.js`, `PublicationConfig.common.getPrimaryControlsLeft`
(line 763, the guard at 771-774), but reads the submission's status
instead of the version's:

```js
if (
	submission.status !== pkp.const.submission.STATUS_PUBLISHED &&
	submission.publications.length < 2
) {
	items.push({component: 'WorkflowChangeSubmissionLanguage', ...});
```

The two agreed until
[d52aa4c84b](https://github.com/pkp/pkp-lib/commit/d52aa4c84b740ec537b13141f88401e8d2e4cdc4).
It changed the protected `PKP\submission\Repository::getStatusByPublications()`
so that a submission becomes `STATUS_PUBLISHED` only when a version of
the final stage is published, Version of Record on a journal
(`VersionStage::finalVersionStage()`, added to OJS by `pkp/ojs#5585`).
Before it, any published version made the submission published.

The purpose of `pkp/pkp-lib#12799` was the workflow queues. An article
published as Author's Original now stays in the active queue until its
Version of Record is out, and the issue speaks of "the decoupling of
the submission workflow stage from the publication status". So the
submission's status no longer says whether a version is published, and
the guard should not read it. Nothing in that issue or its PRs changes
when the language may change, so the server's refusal is the intended
rule and the button is the fault. After step 5 the database holds
publication status 3 (published) and submission status 1 (queued).

Reach:

- OMP: the press's publish always assigns "Version of Record 1.0"
  (walked: the "Schedule For Publication" window names it), so the
  fault does not show. The press workflow uses the same guard
  (`useWorkflowConfigOMP` merges the OJS config), so the fix reaches it
  without changing what it shows.
- OPS: its only stage, Author's Original, is the final one, so the two
  statuses agree (walked: "Post" assigns "Author's Original 1.0"). Its
  own copy of the guard in `workflowConfigEditorialOPS.js` has the same
  shape and no fault today.
- The stage screens show the language line with no button
  (`common.getPrimaryItems`), as intended; not affected.
- The workflow header's "View" and "Preview" (lines 39-60, same file)
  also read `submission.status`: an Author's Original article in
  Production gets "Preview". Both run the same action, which opens the
  article page, so only the label differs. Which label fits an article
  that is live but still in the workflow is a product call, separate
  from this fix (checked in the code, not walked).

## Proposed fix

Check the versions' own status in the guard, as `changeLocale()` does
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/published-early-version-language-change-refused/fix.diff)),
in `lib/ui-library/src/pages/workflow/composables/useWorkflowConfig/workflowConfigEditorialOJS.js`:

```diff
+			// The same rule as PKPSubmissionController::changeLocale(): one
+			// version, not published. The submission's own status cannot stand
+			// in for it, since it counts only a published Version of Record.
 			if (
-				submission.status !== pkp.const.submission.STATUS_PUBLISHED &&
-				submission.publications.length < 2
+				submission.publications.length < 2 &&
+				!submission.publications.some(
+					(publication) =>
+						publication.status === pkp.const.publication.STATUS_PUBLISHED,
+				)
 			) {
```

`submission.publications` already carries each version's `status` (an
`apiSummary` property in all three apps), and the same function's
neighbours compare `selectedPublication.status` with
`pkp.const.publication.STATUS_PUBLISHED`.

Tried: with the fix in, the Steps on submissions 5 and 6 end with
"Status: Published" and neither the language line nor "Change". With
the fix in and with it out:

- an unpublished article (OJS submission 15) and an unpublished book
  (OMP submission 7) keep "Change", and the change to French (Canada)
  is accepted;
- an article (OJS submission 9) and a book (OMP submission 4), each
  published as Version of Record during the check, show neither.

**Alternatives**:

- Count a published Author's Original as published again in
  `getStatusByPublications()`. That undoes `pkp/pkp-lib#12799`: the
  article would leave the active queue at its first version.
- Let the language change until the Version of Record is published, by
  relaxing `changeLocale()`. A product decision: the published
  version's metadata and its public page would change under readers.

**What goes with it**:

- A test. ui-library has no tests for the workflow configs, so a vitest
  test of `getPrimaryControlsLeft` would first need stubs for the global
  `pkp.const` and for `useLocalize`. The e2e case planned in spec U40
  (scenario 6, "An article published as Author's Original") checks the
  same thing through the screens without that setup.
- The OPS guard may take the same line for consistency.

Small: one condition in one file, and a test.

## Evidence

- Kept script: `shared/playwright/checks/issues/published-early-version-language-change-refused/walk.js`
  (helpers in `lib.js` beside it), run on an install reset to the
  default dataset: `node bin/probe.js ojs …/walk.js` takes the Steps;
  `MODE=neighbour` (OJS, OMP) is the control and the fix's neighbour
  check; `MODE=wayround` reads submission 6's "Associated review round"
  and walks Impact's way round (Unpublish, Change accepted with 200,
  publish again). On `omp` and `ops` the default mode reads what the
  publish button opens; with `PKP_E2E_LINE=stable-3_5_0`, OJS 3.5's.
- Walks ran on PostgreSQL, the default dataset of pkp/datasets
  `eaf024c5` (2026-10-18), on 2026-10-19. Tips: `main` OJS `6b4323ced7`,
  OMP `5777025be`, OPS `f048e747b4`, pkp-lib `042726ebf6`, ui-library
  `99abe252`; `stable-3_5_0` OJS `007c2cd0d6`, pkp-lib `092ec34b0f`,
  ui-library `2576e00a`.
- 3.5, walked on OJS: "Schedule For Publication" opens "Select an issue
  to schedule for publication" (Issue, Save), with no "Publication
  Stage". In the code, `stable-3_5_0` has no `VersionStage` enum and its
  `getStatusByPublications()` counts any published publication. OMP and
  OPS 3.5 not walked: no stage choice in their publish either (code).
- 3.4 and 3.3 (code): pkp-lib `origin/stable-3_4_0` `a71d6bd2ca` and
  `origin/stable-3_3_0` `5e84acd11b` have no `changeLocale` route and no
  `cantChangeSubmissionLanguage` string; ui-library `origin/stable-3_4_0`
  `ee684b34` and `origin/stable-3_3_0` `96959f9e` have no
  `ChangeSubmissionLanguage` component; OJS `upstream/stable-3_4_0`
  `0012bd1022`, `upstream/stable-3_3_0` `d7d9dd14ec`.
- Introduced: `git blame` on the guard gives ui-library `ec6cb15f8`
  (2024-10-07, the rewritten workflow page, already reading
  `submission.status`) and `be2386055` (2025-09-12, `pkp/pkp-lib#9295`,
  the constant's namespace only). The guard became wrong with pkp-lib
  `d52aa4c84b` (blame of the version-stage condition; committed to
  `main` 2026-06-28, authored 2026-06-09) and OJS `a9282937f8`; the
  GitHub API names `pkp/pkp-lib#12881` and `pkp/ojs#5585`. The server
  rule's line blames to `80f1467d6e` (`pkp/pkp-lib#9245`) and
  `5818b3084f1` (`pkp/pkp-lib#9295`, the constant's class only).
- Kind: regression on `main`, read in the code. Version stages
  (Author's Original in OJS `66361dfdde`, 2025-05-28, `pkp/pkp-lib#4860`;
  Published Manuscript Under Review in `6ffc728923`, 2025-11-19) reached
  `main` before
  `d52aa4c84b`, and until then any published version made the
  submission published, so the guard hid the button. That older `main`
  was not walked, and no release ever had publication stages.
- Not verified: OMP with a first version published under another
  stage, which no OMP screen offers; the header's "View"/"Preview" on
  an Author's Original article (code only).
