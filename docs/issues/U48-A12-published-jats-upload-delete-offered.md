# Editors can still replace or delete a published version's JATS XML file, which 3.5 does not offer

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: none
  - 3.4: none (code; no "JATS XML" page)
  - 3.3: none (code; no "JATS XML" page)
- **Introduced** `pkp/pkp-lib#11695` with `pkp/ui-library#683` for `pkp/pkp-lib#9295` · [5818b3084f](https://github.com/pkp/pkp-lib/commit/5818b3084f1dab6ac87c160054b03ea0cbc03222) · 2025-09-12 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U48 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U48-jats-and-body-text.md#a12)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On a published version's "JATS XML" page, whoever may edit the
publication is still offered "Upload" and "Delete", and both work. An
upload replaces the version's JATS file. "Delete JATS File" removes it,
and the version falls back to the generated XML: the JATS XML that OJS
builds from the version's metadata when no file is uploaded. The page
has code meant to hide both buttons once the version is published, and
that code no longer takes effect.

A published version's galleys and metadata are meant to stay editable;
the JATS file is the one part the page means to lock.

## Impact

- **Lost**: the fixed state of a published version's JATS file, with no
  new version made to record the change. While "Make available with
  publication" is ticked, readers who use the article's "JATS XML" link
  get the new file at once, or the generated XML after a delete (read
  in the code: an upload or delete clears the link's cached copy). While
  it is unticked, readers get nothing either way: the article page
  lists no link, and the link's address answers `{"error":"You are not
  authorized to access the requested resource."}` before and after the
  change (read in the code). Nothing harvested or deposited carries
  this file: the OAI-PMH JATS format reads the production-ready files
  or builds its own XML, and the DOI deposits do not read it (read in
  the code).
- **Who**: the Journal Manager, the Journal Editor, the Production
  Editor and a Section Editor with the metadata-edit permission, on any
  published version's "JATS XML" page.
- **Way round**: none needed to finish a task.

Low: nothing changes unless an editor presses a button ("Delete" asks
first), the file's History records the change, and the same editors
may already change a published version's galleys and metadata. It
would be higher if the team rules that a published JATS file must never
change once it is out (archiving, indexing).

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`. Submission 17,
  "Antimicrobial, heavy metal resistance and plasmid profile of
  coliforms isolated from nosocomial infections in a hospital in
  Isfahan, Iran", is published, with one version and no uploaded JATS
  file.
- A JATS XML file on disk, `article.xml` (any well-formed JATS
  article).

1. Sign in as `dbarnes`.
2. Open submission 17:
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=17`.
3. Side menu: "Publication" › "Version of Record 1.0" › "JATS XML"
   [3.5: "Publication" › "JATS XML"].
4. Read the buttons on the right of the "JATS XML" panel's heading.
5. Press "Upload" and choose `article.xml`.
6. Press "Delete", then "Delete JATS File" in the window "Confirm
   deleting JATS XML".

**Expected**: the page carries "Warning: This version has been
published. Editing it may impact the published content.", and the "JATS
XML" panel offers "Download" and the "Make available with publication"
box but neither "Upload" nor "Delete", as on 3.5 [3.5 has no tick box].
Steps 5 and 6 cannot be taken.

**Observed**: the warning shows, and step 4's row offers "Upload" and
"Download" beside the tick box. Step 5 shows the notice "Your file has
been uploaded.". The XML shown becomes the file's, the line under it
reads "Last Modification at 2026-10-02 16:11:17 by dbarnes", and "More
Information" and "Delete" appear. Step 6's window reads "You are about
to remove the existing JATS XML File from this publication. Are you
sure?". "Delete JATS File" removes the file, and the panel returns to
the generated XML with "This JATS file is generated automatically by
the submission metadata". Both requests succeed:

```
POST   …/api/v1/submissions/17/publications/18/jats   200
DELETE …/api/v1/submissions/17/publications/18/jats   200
```

## Cause

`lib/ui-library/src/pages/workflow/components/publication/WorkflowPublicationJats.vue`
shows "Upload" and "Delete" only when
`publication.status !== getConstant('STATUS_PUBLISHED') && canEdit`,
and `getConstant()` returns `pkp.const[constant]`. On `main` the page
defines no `pkp.const.STATUS_PUBLISHED`. The condition therefore
compares the status with `undefined` and always passes, so `canEdit`
alone decides.

The constant went in 5818b3084f (`pkp/pkp-lib#11695`, continuous
publication). Before it, `PKPTemplateManager::setupBackendPage()` gave
every backend page flat constants such as `pkp.const.STATUS_PUBLISHED`.
That change replaced them with two groups, `pkp.const.submission.*` and
`pkp.const.publication.*`, so that a submission's status and a
publication's status are named apart. The companion ui-library change,
be238605 (`pkp/ui-library#683`), rewrote the components that read
`pkp.const.STATUS_*` directly. It did not rewrite those that read it
through a `getConstant('STATUS_…')` helper. On `stable-3_5_0` the flat
constants are still defined, so the same condition works there.

The JATS page's condition is older than that change, and has been kept
on purpose since. It came with the side-panel workflow (f77229c3,
2024). The JATS revision work (7dd5e32a, `pkp/pkp-lib#10405`,
2026-02-03) kept it, already dead, under the comment "Upload button -
always visible when publication is not published".

The server does not lock the file. `PKPJatsController` guards uploads
and deletes with `PublicationWritePolicy`, which reaches
`Repo::submission()->canEditPublication()` through
`PublicationCanBeEditedPolicy`. That method locks published and
scheduled versions only for users whose assignments are all author
ones, which is the rule `pkp/pkp-lib#10263` set for all of a published
version's metadata. The page's condition names published versions only,
so a scheduled version offers "Upload" and "Delete" on 3.5 too; whether
a scheduled version should lock as well is a point for the team.

Reach:

- `lib/ui-library/src/components/ListPanel/reviewerSuggestions/ReviewerSuggestionsListPanel.vue`
  has the same condition twice ("Add Reviewer Suggestion", and each
  row's "Edit" and "Delete"). It is used only in the submission wizard
  (`SubmissionWizardPage.vue`), where the publication is never
  published, so nothing changes on screen. Read in the code, not
  walked.
- The `getConstant('STATUS_PUBLISHED')` lines in
  `workflowConfigEditorial{OJS,OMP,OPS}.js` are inside comments. Read
  in the code.
- No other `pkp.const.STATUS_*` read is left in ui-library's `src`
  (stories and mocks aside), pkp-lib's `js/` and `templates/`, or OJS's
  `templates/`, `js/` and `plugins/`. Read in the code.
- The JATS panel mounts its `FileUploader` whatever the condition says,
  and the uploader listens for drops on the whole document
  (`useDropzoneDragDrop`). A file dragged onto the page is therefore
  handed to the upload route even where "Upload" is withheld (3.5
  included). Read in the code, not walked.

## Proposed fix

Give the JATS panel one computed condition that reads the publication
constant, and use it for both buttons and the uploader
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/published-jats-upload-delete-offered/fix.diff)):

```diff
 							<PkpButton
-								v-if="
-									publication.status !== getConstant('STATUS_PUBLISHED') &&
-									canEdit
-								"
+								v-if="canChangeFile"
 								ref="uploadXMLButton"
…
 			<FileUploader
+				v-if="canChangeFile"
 				:id="id + '-uploader'"
…
 	computed: {
+		canChangeFile() {
+			return (
+				this.canEdit &&
+				this.publication.status !== pkp.const.publication.STATUS_PUBLISHED
+			);
+		},
```

"Delete" takes the same `v-if="canChangeFile"`, and the unused
`getConstant()` helper goes. `pkp.const.publication.STATUS_PUBLISHED`
is how the other workflow components read a publication's status since
the constants were grouped (`workflowConfigEditorialOJS.js`,
`WorkflowPublicationVersionControl.vue`,
`useWorkflowPublicationFormIssue.js`). The diff also changes the
reviewer suggestions panel's two conditions to
`getConstant('publication').STATUS_PUBLISHED`, so no dead read is left;
nothing changes on screen there.

Tried on `main`: with the fix, submission 17's "JATS XML" panel offers
"Download" alone. On unpublished submission 5, "Upload" and, after an
upload, "Delete" still work, with the fix in and out.

**Alternatives**:

- Drop the condition instead, and make today's behaviour the rule, in
  line with `pkp/pkp-lib#10263`, which let editors change a published
  version's galleys and metadata. That is a product call against the
  page's own comment and 3.5's behaviour; the dead condition should go
  either way.
- Lock it on the server too (`PKPJatsController` refusing uploads and
  deletes on a published version). It would also bind API clients, but
  it departs from the `canEditPublication()` rule that `pkp/pkp-lib#10263`
  set for every other part of a published version.
- Restore the flat `STATUS_*` constants in `PKPTemplateManager`. That
  brings back the ambiguity `pkp/pkp-lib#9295` removed.

**What goes with it**:

- No stored data to repair, no API change. Scheduled versions keep
  "Upload" and "Delete", as on 3.5.
- No backport: 3.5 is not affected.
- Guard: a component test that mounts the page with a published
  publication and `canEdit` true and expects no "Upload". In this
  campaign it is a Planned item in spec U48 (a published version's
  "JATS XML" page offers neither button).

Small: one component in ui-library, a few lines, following the
publication-constant pattern the other workflow components use, and
one component test.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/published-jats-upload-delete-offered/walk.js),
  steps 1–6 on a freshly loaded default dataset:
  `PROBE_FEATURE=<fleet> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/published-jats-upload-delete-offered/walk.js`.
  `WALK=nb` is the neighbour check: the same steps on unpublished
  submission 5 ("Genetic transformation of forest trees", Production).
  A step whose button is not offered is recorded, not forced. No
  request failed and no script error was recorded in any walk.
- Walked: OJS `main` and `stable-3_5_0`, each on its default dataset
  (pkp/datasets e8dafbc, 2026-10-02, PostgreSQL). The fault does not
  depend on the database. Not walked: the other editorial roles in
  Impact, a scheduled version, the public "JATS XML" link, and dropping
  a file on the page.
- Code reads on `main`: ui-library
  `src/pages/workflow/components/publication/WorkflowPublicationJats.vue`,
  `src/components/FileUploader/FileUploader.vue`,
  `src/composables/useDropzoneDragDrop.js`,
  `src/components/ListPanel/reviewerSuggestions/ReviewerSuggestionsListPanel.vue`,
  `src/components/Container/SubmissionWizardPage.vue`,
  `src/pages/workflow/composables/useWorkflowConfig/workflowConfigEditorialOJS.js`;
  pkp-lib `classes/template/PKPTemplateManager.php`,
  `api/v1/jats/PKPJatsController.php` (`publicDownload()`: a 403 with
  `api.403.unauthorized` while `jatsPublicVisibility` is off, else
  `Repo::jats()->getPublicJatsContent()`),
  `classes/jats/Repository.php`,
  `classes/security/authorization/PublicationWritePolicy.php`,
  `classes/security/authorization/internal/PublicationCanBeEditedPolicy.php`,
  `classes/submission/Repository.php` `canEditPublication()`,
  `classes/publication/PKPPublication.php`; OJS
  `pages/workflow/WorkflowHandler.php`,
  `plugins/oaiMetadataFormats/oaiJats/OAIMetadataFormat_JATS.php`
  (`findJats()` reads `SUBMISSION_FILE_PRODUCTION_READY` files or the
  JATS template), and a grep of `plugins/generic/crossref`,
  `plugins/generic/datacite` and `plugins/importexport` for JATS. A grep
  of ui-library `src`, pkp-lib `js/` and `templates/`, and OJS
  `templates/`, `js/` and `plugins/` for `pkp.const.STATUS_` and
  `getConstant('STATUS_`.
- 3.4, 3.3 (code): no JATS file in `stable-3_4_0` or `stable-3_3_0` of
  pkp-lib or ui-library.
- Introduced: `git blame` on the condition gives 7dd5e32a (2026-02-03)
  and f77229c3 (2024-09-19). f77229c3 wrote it when the flat constant
  existed. 7dd5e32a descends from be238605, so it re-indented and
  re-commented a condition that had already been dead for five months.
  `git log -S"'STATUS_PUBLISHED' =>"` in pkp-lib gives 5818b3084f as
  the change that took the flat constant away, and
  `git log -S"pkp.const.submission.STATUS_PUBLISHED"` in ui-library
  its companion
  [be238605](https://github.com/pkp/ui-library/commit/be23860556943edc3bc9180282e3377e784fded9).
  `pkp/pkp-lib#10263` ("Relax editing metadata on published/posted
  materials") and `pkp/pkp-lib#10405` were read for intent.
- Upstream: no pkp issue or PR found in pkp/pkp-lib, pkp/ui-library or
  pkp/ojs (searched for JATS upload or delete on a published version,
  `STATUS_PUBLISHED` with `pkp.const` and `getConstant`, and
  `WorkflowPublicationJats`).
- Branch tips: OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a,
  lib/ui-library 64d67363); `stable-3_5_0` OJS 091fb65453 (cf3f984335,
  d4e01883); `stable-3_4_0` pkp-lib 6f96165c90, ui-library ee684b34;
  `stable-3_3_0` pkp-lib 4156e50233, ui-library 96959f9e.
