# Readers never see a new version's Summary of Changes, though the editor is told it appears publicly

- **Severity** high
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (no Summary of Changes field)
  - 3.4: none (code; no Summary of Changes field)
  - 3.3: none (code; no Summary of Changes field)
- **Introduced** `pkp/pkp-lib#12622` for `pkp/pkp-lib#12584` · [de26641811](https://github.com/pkp/pkp-lib/commit/de2664181146787103afbf094a8d6c8105bbe7b6) · 2026-05-28 · Blesilda Biazon (blesildaramirez), with the app sides in [ojs eb14c0b9d3](https://github.com/pkp/ojs/commit/eb14c0b9d3ee07e512423fd87708544ff3e9e752), [omp 187598aa5](https://github.com/pkp/omp/commit/187598aa5b2e15bb0b6a8f2adf1570cc90ec268e) and [ops 84c0e0c06b](https://github.com/pkp/ops/commit/84c0e0c06b5f2e4417871367185bb041c0437d39)
- **Upstream** `pkp/pkp-lib#12624` (open, the amendment notice's umbrella issue): of its to-do items only "Consider exact placement of Amendment notice for OPS/OMP" concerns the reader page, still open, and none names OJS
- **Tracked in** spec U49 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U49-publish-schedule-and-versions.md#a5)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An editor who publishes a new version of an article, book or preprint
with Update Type "Correction" and a Summary of Changes is promised on
the form that "This will appear publicly as the version amendment
notice". After publishing, the new version's reader page does not show
it. Readers see only a new entry in the "Versions" list and an "Updated
on" date, with no word on what changed.

The publish goes through and the form keeps the text, so the editor has
no reason to check. A retraction or a withdrawal published this way
leaves readers no mark at all.

The display was never built: the change that added the field left the
themes for later, and upstream's open plan for the feature lists only
where the notice should go on a press and a preprint server. Every
version published with a summary is affected, whatever its Update Type,
on every install using the default theme, the only theme the three
apps ship.

## Impact

- **Lost.** The correction, retraction or other notice the editor
  wrote, on the reader page. On OJS the JATS and OAI-PMH MARC records
  carry it; OMP and OPS have no output that does.
- **Who.** Every reader of an amended version, and the editors and
  managers who publish one.
- **Way round.** Write the notice into the version's abstract or title,
  which an editor finds out to do only by checking the reader page.

High. Taken alone, a reader page missing one field with a way round on
screen is medium; here the form promises the notice and nothing says it
did not appear, and by the silence rule that lifts it one level. It
would sit at medium if a bundled theme showed the notice; none does.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, in each app its context
  `publicknowledge` and a published work with one version: OJS
  submission 17, "Antimicrobial, heavy metal resistance and plasmid
  profile of coliforms isolated from nosocomial infections in a
  hospital in Isfahan, Iran"; OMP submission 14, "From Bricks to Brains:
  The Embodied Cognitive Science of LEGO Robots"; OPS submission 2, "The
  Facets Of Job Satisfaction: A Nine-Nation Comparative Study Of
  Construct Equivalence".

Steps:

1. Sign in as `dbarnes`.
2. Open the submission's workflow
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=17`;
   14 on OMP, 2 on OPS).
3. In the side menu press "Create New Version". The window arrives with
   the published version, its stage and "Minor Revision" chosen; press
   "Confirm". The menu gains "Version of Record 1.1"
   ("Author Original 1.1" on OPS).
4. Under the new version open "Publication Settings" ("Catalog Entry" on
   OMP, "Preprint entry" on OPS). The "Summary of Changes (Amendment
   Notice)" box reads "This will appear publicly as the version
   amendment notice. Ensure it accurately reflects the changes made in
   this version before publishing."
5. In "Update Type" choose "Correction", type "Figure 2 corrected." into
   "Summary of Changes (Amendment Notice)" and press "Save".
6. Press "Publish" ("Post" on OPS) and confirm with "Publish" ("Post")
   in the window naming "Version of Record 1.1" ("Author Original 1.1").
   (On OJS the save in step 5 marked the version ready to publish, so
   "Review Publishing Details" does not open first.)
7. Sign out and open the reader page:
   `/index.php/publicknowledge/en/article/view/17`,
   `/index.php/publicknowledge/en/catalog/book/14` or
   `/index.php/publicknowledge/en/preprint/view/2`.
8. In its "Versions" list, open the earlier version (1.0).

**Expected.** Step 7: the new version's page shows the amendment
notice, its Update Type "Correction" and "Figure 2 corrected.", as the
form promised. Step 8: the earlier version's page reads "This is an
outdated version published on 2026-10-02. Read the most recent version."
and links to the page that carries the notice.

**Observed.** Step 8 is as expected. On step 7, neither "Figure 2
corrected." nor "Correction" is anywhere in the page's HTML.
The save and the publish succeed (the version stores
`"updateType":"correction"` and `"summaryOfChanges":{"en":"<p>Figure 2
corrected.</p>"}`), and the page changes only in its date line and
"Versions" list:

```
Published  2026-10-02 — Updated on 2026-10-02
Versions   2026-10-02 (Version of Record 1.1)
           2026-10-02 (Version of Record 1.0)
```

## Cause

`pkp/pkp-lib#12584` added Update Type and Summary of Changes to the
publication (`updateType`, `summaryOfChanges` in
`lib/pkp/schemas/publication.json`, schema description "Public-facing
amendment notice describing what changed in this version of the
publication.") and to the forms that edit it: OJS's and OPS's
`IssueEntryForm`, OMP's `CatalogEntryForm` and the publish panel
(ui-library `useWorkflowVersionForm.js` in publish mode, shown in
`WorkflowVersionSideModal.vue`). Each form describes the field with
`publication.summaryOfChanges.description` ("This will appear publicly
as the version amendment notice. …"). The issue did not ask for the
reader side. In its review the reviewer asked about the themes, and the
author answered that she would open a separate issue for them; no such
issue was found. None of the default themes' reader templates reads
either field:

- OJS `templates/frontend/objects/article_details.tpl`
- OMP `templates/frontend/objects/monograph_full.tpl`
- OPS `templates/frontend/objects/preprint_details.tpl`

They render the date line (`submission.updatedOn`), the "Versions" list
and, on an earlier version, `submission.outdatedVersion`, and nothing of
the version's summary.

Where else this applies, from the code:

- OMP's chapter pages and every other reader template: no template in
  the three apps, in `plugins/themes/default` or in `lib/pkp/templates`
  reads `summaryOfChanges` or `updateType`, and none mentions a
  retraction or withdrawal. `default` is the only theme in each app's
  `plugins/themes`.
- Machine outputs carry it on OJS: the JATS template writes it as
  `<notes notes-type="update-notice">`
  (`plugins/generic/jatsTemplate/classes/ArticleFront.php`) and the
  OAI-PMH MARC and MARC21 formats as a 500 note; the Crossref deposit
  carries the Update Type only. OMP and OPS have no such output.

## Proposed fix

Show the notice in each app's default theme, on the reader page of the
version that carries it. `pkp/pkp-lib#11540` added the Plain Language
Summary the same way, as an inline block in each of the three templates
(after the abstract). The notice goes right before the abstract, headed
by the version's Update Type label (`UpdateType::label()`, the keys
`publication.updateType.*` the forms already use), with the summary
through `strip_unsafe_html`, as the abstract is. The earlier versions'
pages keep their "outdated version" line, which links to the notice. The
template reads the label through `PKP\publication\enums\UpdateType::tryFrom()`,
which works because PKP's Smarty 4 runs without a security policy (as
`search.tpl`'s `\APP\core\Application::get()` does); `UpdateType` is
not among the classes `PKPTemplateManager` registers. The diff for OJS
([fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/amendment-notice-shown-to-no-reader/fix-ojs.diff);
OPS identical in
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/amendment-notice-shown-to-no-reader/fix-ops.diff),
OMP in its `<div class="item">` markup in
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/amendment-notice-shown-to-no-reader/fix-omp.diff)):

```diff
--- a/templates/frontend/objects/article_details.tpl
+++ b/templates/frontend/objects/article_details.tpl
@@ -200,6 +200,18 @@
 			</section>
 			{/if}
 
+			{* Amendment notice: what this version changed *}
+			{if $publication->getLocalizedData('summaryOfChanges')}
+				{assign var="updateType" value=null}
+				{if $publication->getData('updateType')}
+					{assign var="updateType" value=PKP\publication\enums\UpdateType::tryFrom($publication->getData('updateType'))}
+				{/if}
+				<section class="item amendment_notice">
+					<h2 class="label">{if $updateType}{$updateType->label()|escape}{else}{translate key="publication.updateType.newVersion"}{/if}</h2>
+					{$publication->getLocalizedData('summaryOfChanges')|strip_unsafe_html}
+				</section>
+			{/if}
+
 			{* Abstract *}
 			{if $publication->getLocalizedData('abstract')}
 				<section class="item abstract">
```

Tried on all three apps: with the diffs applied, the new version's page
shows "Correction" over "Figure 2 corrected.", and the earlier version's
page is unchanged. An unpublished draft's summary does not reach the
public page, with the fix in or out.

- **Alternatives.**
  - A shared partial in `lib/pkp/templates/frontend/objects/` included
    by the three templates: one place for the markup, but the default
    themes keep each publication field inline in the app's template, and
    the include would still need a line in each app.
  - Assigning the label from each app's page handler
    (`ArticleHandler`, `CatalogBookHandler`, `PreprintHandler`): it
    avoids the static call in the template, at the cost of three
    handlers changed for what the template can read from the
    publication itself.
  - Repeating the notice on the earlier versions' pages beside the
    "outdated version" line: it matters most for a retraction, and is a
    product call.
  - Dropping the promise from `publication.summaryOfChanges.description`
    instead: the field then has no reader at all on OMP and OPS, and
    loses the purpose `pkp/pkp-lib#12624` gives it.
- **What goes with it.** The placement is a design question
  `pkp/pkp-lib#12624` leaves open for OMP and OPS (its Figma design
  shows OJS), so the team may move the block. Stored data needs no
  repair: published versions with a summary show it once the templates
  read it. The default theme's stylesheet may want a rule for
  `.amendment_notice`. The guard is an e2e check that a published
  version's summary shows on its reader page.

Medium: a block in three app repos' templates, following the Plain
Language Summary's pattern, with the placement for the team to confirm.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/amendment-notice-shown-to-no-reader/walk.js),
  run on an install freshly loaded from PKP's default test dataset
  (pkp/datasets e8dafbc, 2026-10-02), PostgreSQL:
  `node bin/probe.js all shared/playwright/checks/issues/amendment-notice-shown-to-no-reader/walk.js`
  (`WALK=neighbour` for the draft check). It reads each reader page's
  full HTML for the summary and the word "Correction". No server error
  or page script error in any run. On OJS the walk saw one publication
  save before the publish and no "Review Publishing Details" submit, and
  ui-library `useWorkflowActions.js`
  `workflowAssignToIssueAndScheduleForPublication()` skips that window
  for a version with a stage in status "ready to publish".
- 3.5 walked (the same script on `stable-3_5_0`): the steps stop at step
  4. The "Issue" (OJS), "Catalog Entry" (OMP) and "Preprint entry" (OPS)
  pages and the other publication pages carry no "Update Type" or
  "Summary of Changes" field; the 3.5 checkouts' `lib/pkp/schemas`,
  `locale/en`, `classes` and `templates` hold no `summaryOfChanges`.
- 3.4 and 3.3 read in the code: no `summaryOfChanges` in the three
  apps' or `lib/pkp`'s `stable-3_4_0` and `stable-3_3_0`.
- Branch tips: `main` OJS b84f8e2e44 (lib/pkp ddd8ab243a, ui-library
  64d67363), OMP 3b0ecf794 (lib/pkp 3dc90c81a6, ui-library 280f98c5),
  OPS c8af945bb7 (lib/pkp 3dc90c81a6, ui-library 280f98c5);
  `stable-3_5_0` OJS 091fb65453, OMP 9c5e24246, OPS 38b61882d3 (lib/pkp
  cf3f984335); `stable-3_4_0` OJS 75cc2d488b, OMP 0aec65441, OPS
  acd8ae704b (lib/pkp 32b0f4b4af); `stable-3_3_0` OJS ac77c9fb35, OMP
  8e72fc883, OPS c5532e2161 (lib/pkp f6ab331645).
- Introduced: `git blame` on `publication.summaryOfChanges.description`
  in `lib/pkp/locale/en/submission.po` gives de26641811; the GitHub API
  names its PR `pkp/pkp-lib#12622`. The theme follow-up was mentioned by
  the author in `pkp/pkp-lib#12584`'s review (2026-05-04); searches of
  pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library for
  "amendment", "summary of changes", "summaryOfChanges" and "update
  type" with "theme" or "frontend" found no issue for it (2026-10-02).
  `pkp/pkp-lib#12623` covers the machine outputs, not the reader pages.
- Not driven: the published version's chapter pages (OMP), third-party
  themes (not checked), languages other than English.
