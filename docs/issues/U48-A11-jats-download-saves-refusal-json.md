# A Copyeditor pressing "Download" on an uploaded JATS XML file saves a refusal as "download-file.json"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: none (code; no "JATS XML" page)
  - 3.3: none (code; no "JATS XML" page)
- **Introduced** `pkp/ui-library#300` for `pkp/pkp-lib#7505` · [fa798c79](https://github.com/pkp/ui-library/commit/fa798c79fb17e2e8271b0ea975fe9c1528d2fd51) · 2023-12-18 · Dimitris Efstathiou (defstat)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U48 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U48-jats-and-body-text.md#a11)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A Copyeditor working on a submission in Copyediting can open the "JATS
XML" page and read the JATS file an editor uploaded there. The page
offers them "Download". Pressing it saves a file named
"download-file.json" that holds the message "The current role does not
have access to this operation." instead of the XML, and the page says
nothing. An editor who presses the same "Download" gets the XML.

It happens to any participant without access to the Production stage,
while the submission is in a stage they work on and its version already
has an uploaded JATS file. Once the submission reaches Production, these
participants no longer see the publication pages.

## Impact

- **Lost**: nothing stored.
- **Who**: by default the Copyeditor and the Marketing and sales
  coordinator while the submission is in Copyediting, and the Funding
  coordinator while it is in Submission or Review, on a version with an
  uploaded JATS file.
- **Way round**: copy the XML from the page, or ask an editor, who
  downloads it.

Low: the saved file misleads, but its name and content show it is not
the XML. A journal whose copyeditors check the uploaded JATS file would
make it medium.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`. `mfritz` (Maria Fritz) is
  the Copyeditor assigned to submission 3, "The Facets Of Job
  Satisfaction: A Nine-Nation Comparative Study Of Construct
  Equivalence", which is in Copyediting. The Copyeditor role works on
  the Copyediting stage only.
- An XML file named `u48r9-jats.xml`, to upload as the version's JATS
  file. Any UTF-8 JATS XML serves; step 3 makes one.

Steps:

1. Sign in as `dbarnes`.
2. Open submission 3 from the dashboard.
3. In the side menu, under "Publication", choose "JATS XML". The page
   shows the generated XML and "This JATS file is generated
   automatically by the submission metadata". Press "Download" and
   rename the saved `jats-<n>-<date>-<time>.xml` to `u48r9-jats.xml`.
4. Press "Upload" and choose `u48r9-jats.xml`. The page shows the
   file's XML and "Last Modification at {date} by dbarnes".
5. Log out and sign in as `mfritz`.
6. Open submission 3 from the dashboard.
7. In the side menu, under "Publication", choose "JATS XML". The page
   shows the XML uploaded at step 4, with the buttons "More
   Information" and "Download" [3.5: "Download" alone].
8. Press "Download".

**Expected** The browser saves `u48r9-jats.xml`, the XML the page
shows.

**Observed** The browser saves `download-file.json`, 113 bytes:

```
{"status":false,"content":"The current role does not have access to this operation.","elementId":"0","events":[]}
```

The page shows no message and stays as it was.

Control: `dbarnes` pressing "Download" on the page after step 4 saves
`u48r9-jats.xml` with the uploaded content.

## Cause

`downloadJatsXML()` in
`lib/ui-library/src/pages/workflow/components/publication/WorkflowPublicationJats.vue`
downloads the two kinds of content by two different routes. For the
generated XML it saves the `jatsContent` the page already holds, as a
blob. For an uploaded file it clicks a hidden `<a download>` pointing
at the file's `url`.

That `url` comes from the submission file's schema map
(`PKP\submissionFile\maps\Schema`): `FileApiHandler::downloadFile`
with `stageId` set by `SubmissionFile\Repository::getWorkflowStageId()`,
which is Production for `SUBMISSION_FILE_JATS`.
`FileApiHandler::authorize()` checks it with
`SubmissionFileAccessPolicy`. Its assistant branch requires the file to
belong to the `stageId` in the address
(`SubmissionFileMatchesWorkflowStageIdPolicy`) and the user to be
assigned to that stage (`WorkflowStageAccessPolicy`,
`AssignedStageRoleHandlerOperationPolicy`). With `stageId` Production,
a Copyeditor is refused, whenever the file was uploaded.

The page's own content is fetched under a looser check.
`PKPJatsController::get()` admits any assigned role that passes
`PublicationAccessPolicy` and returns the uploaded file's full content
as `jatsContent`, so the page shows it. The page shows what "Download"
then refuses.

The page is offered to these participants on purpose, as far as the
code shows. "JATS XML" is the one publication page placed outside the
`permissions.canAccessProduction` check in
`useWorkflowNavigationConfigOJS.js` (Body Text, Galleys, Media, License
and Issue are inside it). It has been beside the metadata pages since
it was added: the first OJS template (551e7f6644, `pkp/pkp-lib#7505`)
put the `jats` tab after "Identifiers" and before `{if
$canAccessProduction}`. Two days after the first commit, the same
author opened the read to `PublicationAccessPolicy` ("Fix publication
access", `pkp/pkp-lib#9581`). `pkp/pkp-lib#12702` later kept that
split: "Read access … (read-only)" for the GET, editorial roles only
for writing.

The legacy router answers the refusal with HTTP 200 and a JSON message
(`PKPComponentRouter::handleAuthorizationFailure()`). Because the link
carries the `download` attribute, the browser saves that answer under
the address's last segment, `download-file`, with a `.json` extension,
and the page's script never sees it.

Reach:

- Every role without access to the Production stage that sees the
  version's publication pages. The publication menu needs
  `permissions.canAccessPublication` (`useWorkflowPermissions.js`),
  which is true only for an editorial role assigned to the submission's
  current stage. By default that is the Copyeditor and the Marketing and
  sales coordinator (stage 4) and the Funding coordinator (stages 1
  and 3) (`registry/userGroups.xml`).
- When the file was uploaded does not matter:
  `SubmissionFile\Repository::getWorkflowStageId()` puts every
  `SUBMISSION_FILE_JATS` file in Production. A file uploaded in
  Production reaches a Copyeditor too if the submission is sent back to
  Copyediting ("Move To Copyediting"; code, not walked).
- "More Information" on the same page opens a window for the same roles
  with `stageId` Production and is refused in it ("You don't currently
  have access to that stage of the workflow."). The fix leaves it
  alone.
- No other ui-library component saves a file by a `download` link to a
  file's `url` (searched for `setAttribute('download'` and
  `.download =`).
- The "Galleys" page links each galley's name to the same kind of
  address (`GalleyManagerCellName.vue`), but it sits inside the
  `canAccessProduction` check, so these roles are not offered it.

## Proposed fix

A proposal: make "Download" save the XML the page shows, for an
uploaded file as it already does for the generated one
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/jats-download-saves-refusal-json/fix.diff)).

```diff
--- a/lib/ui-library/src/pages/workflow/components/publication/WorkflowPublicationJats.vue
+++ b/lib/ui-library/src/pages/workflow/components/publication/WorkflowPublicationJats.vue
 		downloadJatsXML() {
-			// Ensure existingJatsFile.url is available and is a string containing the URL
-			if (!this.workingJatsProps.isDefaultContent) {
-				const downloadUrl = this.workingJatsProps.url;
-				…
-				link.href = downloadUrl;
-				link.setAttribute('download', '');
-				…
-			} else {
-				const jatsContent = this.workingJatsProps.jatsContent;
-				…
-			}
+			// Save the XML the page shows. An uploaded file's own download link
+			// is authorized for the Production stage only, so a role that reads
+			// this page without Production access would save a refusal instead.
+			const {localize} = useLocalize();
+			const fileName = this.workingJatsProps.isDefaultContent
+				? this.downloadDefaultJatsFileName
+				: localize(this.workingJatsProps.name);
+			const jatsContent = this.workingJatsProps.jatsContent;
+			const blob = new Blob([jatsContent], {type: 'application/xml'});
+			… (the existing blob download, with `fileName`)
 		},
```

The page already holds the uploaded file's full content, so saving it
gives nobody anything they do not already see, and needs no second
request. The saved file has the uploaded file's name, as today. This
is recommended over moving the page, because the page's placement and
its read rule both look deliberate (Cause): the fix makes "Download"
agree with what the page was built to show.

Tried on `main`: with the diff applied, `mfritz` pressing "Download" at
step 8 saves `u48r9-jats.xml` with the uploaded content. Three things
were the same with the diff applied and without it: `dbarnes`'s
download of the generated XML (`jats-4-<date>-<time>.xml`, the XML on
screen), his download of the uploaded file (`u48r9-jats.xml`, the bytes
uploaded), and the Copyeditor's "More Information", which still opens
"Information Center: u48r9-jats.xml" reading "You don't currently have
access to that stage of the workflow.".

**Alternatives**

- Move "JATS XML" under `permissions.canAccessProduction` in
  `useWorkflowNavigationConfigOJS.js`, like Galleys. It also ends the
  "More Information" refusal. But it takes the page, the generated XML
  included, away from these roles, against the page's placement and
  its read rule; that is the team's call.
- Hide "Download" when `permissions.canAccessProduction` is false (the
  page's config already receives it). The page would still show them
  the XML, so it removes a working way to save what is on screen.
- Reuse the JATS API's existing `download` route (`publicDownload`).
  It refuses with 403 unless "Make available with publication" is
  ticked, so it is not a drop-in; a new route under
  `PublicationAccessPolicy` would be.
- Withhold the uploaded file's content from these roles in
  `PKPJatsController::get()`. That is a product decision on who may
  read the JATS file before publication, and would change what the page
  shows them; it would also have to say what the page shows instead.

**What goes with it**

- No data repair, no API change. A download no longer passes through
  `FileApiHandler`, so it no longer fires the `File::download` hook;
  no plugin in the OJS checkout hooks it (third-party plugins not
  checked).
- The saved name is the file's name as stored. `FileApiHandler` passes
  it through `formatFilename()`, which adds the stored file's
  extension, so a file whose name was changed to one without ".xml"
  would be saved without it.
- The blob is built from the decoded `jatsContent`, so it is the same
  bytes only for a UTF-8 file. A file in another encoding never reaches
  the page: `PKPJatsController::get()` cannot encode it as JSON and the
  page breaks for everyone
  ([U48-A13-jats-image-upload-breaks-page.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U48-A13-jats-image-upload-breaks-page.md)),
  so this fix changes nothing there.
- On `stable-3_5_0` the diff applies (offset), but the component there
  does not import `useLocalize`: the backport adds that import.
- A test: an e2e scenario in which a Copyeditor downloads the uploaded
  JATS file and gets the XML.

Small: one method in one ui-library component, and a test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/jats-download-saves-refusal-json/walk.js)
  with its `lib.js`. On an install of PKP's default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/jats-download-saves-refusal-json/walk.js`;
  `MODE=neighbour` in front for what the fix must leave unchanged, and
  `PKP_E2E_LINE=stable-3_5_0` for 3.5.
- Walked on `main` and `stable-3_5_0`, OJS, on PostgreSQL, dataset
  pkp/datasets e8dafbc (2026-10-02).
- Tips: `main` OJS b84f8e2e44 (pkp-lib ddd8ab243a, ui-library
  64d67363); `stable-3_5_0` OJS 091fb65453 (pkp-lib cf3f984335,
  ui-library d4e01883); `stable-3_4_0` OJS 75cc2d488b (pkp-lib
  6f96165c90, ui-library ee684b34); `stable-3_3_0` OJS ac77c9fb35
  (pkp-lib 4156e50233, ui-library 96959f9e).
- 3.5 code read: `downloadJatsXML()`, `PKPJatsController::get()` and
  `getWorkflowStageId()` are the same as on `main`. 3.4 and 3.3 code
  read: no JATS file anywhere in the three trees (no
  `PKPJatsController`, no `classes/jats`, no JATS component in
  ui-library).
- Introduced: `git blame` on the uploaded-file branch of
  `downloadJatsXML()` leads through the moves of the file (f77229c3,
  2024-09-19, and later renames) to fa798c79, the component's
  first commit (`src/pages/workflow/PublicationSectionJats.vue`), merged
  as `pkp/ui-library#300`; its pkp-lib side, `PKPJatsController`, came
  with af8ad0fe08 (`pkp/pkp-lib#9536`) the same day. The branch has
  linked the file's `url` since then.
- The HTTP status of the download request was read in the code
  (`PKPComponentRouter::handleAuthorizationFailure()` returns a
  `JSONMessage` with no status), not captured: the browser's download
  does not reach the page's response events.
- Upstream search, pkp/pkp-lib, pkp/ojs and pkp/ui-library, by the
  symptom's words ("jats download", "download-file.json", "jats
  copyeditor", the refusal's text) and by `downloadJatsXML` and
  `WorkflowPublicationJats`: the hits (`pkp/pkp-lib#12702`, an upload
  refused for an administrator; `pkp/pkp-lib#12728` and
  `pkp/pkp-lib#13009`, the public download) are about other things.
- Intent: the `pkp/pkp-lib#7505` issue and its comments say nothing on
  which roles should see the page; the placement and the read rule
  above are read from 551e7f6644 (`templates/workflow/workflow.tpl`),
  e3dbb3c93f and 2b13599365 (`PKPJatsController`), and 80daa02d
  (`useWorkflowNavigationConfigOJS.js`, 2024-10-16).
- Not driven: the Marketing and sales coordinator and the Funding
  coordinator (the dataset has neither assigned to a submission), and
  published versions.
