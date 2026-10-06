# Native XML import lists "Errors occured:" for every article that is not assigned to an issue

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** `pkp/ojs#2646` (the Native Import/Export Plugin rework for 3.2) · [5dcbc94c2a](https://github.com/pkp/ojs/commit/5dcbc94c2af4eda1a1ca9f970f0a36a9691780dc) · 2020-02-26 · Dimitris Efstathiou (defstat)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U63 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a8) (the issue-identification line)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A journal manager imports articles with Tools › "Native XML Plugin".
The results tab reads "The import completed successfully", but under it
adds "Errors occured:" and "The issue identification element is missing
for the article …" for each article that is not assigned to an issue.
This happens with a file the journal itself exported, unchanged, not
only with hand-made files.

Nothing is wrong with those articles: an article in no issue has no
issue to name, and it is imported complete. The lines sit in the same
list as a file's real problems, so the manager cannot tell them apart.

Any submission still in the workflow is such an article.

## Impact

- **Lost:** no data. The manager spends time checking error lines that
  mean nothing. The import is not marked failed: the tab keeps its
  success text, and the command-line tool prints its success line in
  green and exits with status 0, as it does after any import.
- **Who:** a journal manager who moves articles with the Native XML
  Plugin, on screen or from the command line, whenever the articles
  moved include some that are not assigned to an issue.
- **Way round:** ignore "The issue identification element is missing"
  for an article that is in no issue; nothing else needs doing.

Low: nothing is lost and the import says it completed; only the error
list misleads.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`, journal `publicknowledge`.

1. Sign in as `rvaca` (Journal manager).
2. Open "Tools" (`/index.php/publicknowledge/en/management/tools`) and
   choose "Native XML Plugin".
3. Choose the "Export Articles" tab. Tick submission 8, "Traditions and
   Trends in the Study of the Commons" (in the Submission stage, not
   assigned to an issue), and press "Export Articles".
4. In the "Export Submissions Results" tab, press "Download Exported
   File" and keep the file.
5. Choose the "Import" tab, press "Upload File" and choose the
   downloaded file.
6. Press "Import". The "Import Results" tab opens.

**Expected:** the tab reads only the success text and the imported
item, with the new submission's number (21 on a freshly loaded
dataset):

```
The import completed successfully. The following items were imported:
Submission
"21" - "Traditions and Trends in the Study of the Commons"
```

**Observed:**

```
The import completed successfully. The following items were imported:
Submission
"21" - "Traditions and Trends in the Study of the Commons"
Errors occured:
Publication
The issue identification element is missing for the article "Traditions and Trends in the Study of the Commons".
```

Submission 21 is imported complete and in no issue, like submission 8.

Control: the same steps with submission 17, "Antimicrobial, heavy metal
resistance and plasmid profile of coliforms isolated from nosocomial
infections in a hospital in Isfahan, Iran" (published in Vol. 1 No. 2
(2014)), read only the success text, and the copy is placed in that
issue.

## Cause

In OJS, `NativeXmlPublicationFilter::populateObject()`
(`plugins/importexport/native/filter/NativeXmlPublicationFilter.php`,
line 83) calls `populatePublishedPublication()` for every publication in
the file, published or not. When the article is imported on its own
rather than inside an `<issue>`, that method looks for
`<issue_identification>`. When there is not exactly one, it records
`plugins.importexport.native.import.error.issueIdentificationMissing`
with `$deployment->addError()` (lines 170–172).

The element is optional. `native.xsd` declares it `minOccurs="0"
maxOccurs="1"` for an article's publication (line 49), and the export
writes it only for a publication with an `issueId`
(`PublicationNativeXmlFilter`, line 64). `addError()` does not stop the
import, so the article is imported, and pkp-lib's
`templates/plugins/importexport/innerResults.tpl` lists the message
under "Errors occured:".

In 3.1 the check ran only for an article with a `date_published`:
pkp-lib's `NativeXmlSubmissionFilter` called
`populatePublishedSubmission()` behind that test. The publication
versioning work,
[718ad72e59](https://github.com/pkp/pkp-lib/commit/718ad72e597285d2899932efbd1d87635b90efe7),
removed that call. 5dcbc94c2a then added the call in `populateObject()`
for every publication, so that a publication naming an issue is attached
to it; the error branch came along unchanged.

Reach:

- Articles exported inside an issue ("Export Issues") are not affected:
  the import already knows their issue (read in the code).
- On `main`, a published article can be in no issue (`IssueAssignment`
  in `APP\publication\Repository`), and it gets the same line (read in
  the code, not walked). On 3.5 and older, publishing needs an issue
  (`publication.required.issue`).
- The command-line import runs the same filter and prints the same line
  (read in the code). `PKPNativeImportExportCLIToolKit::getCLIImportResult()`
  prints the success line because `addError()` does not set the
  deployment's failed flag, and `tools/importExport.php` ignores the
  plugin's result, so the exit status is 0.
- The sibling check above it in `populateObject()` (lines 74–81) adds
  the warning "The article "…" is contained within an issue, but has no
  published date." for an article that names an issue but has no
  `date_published`. A scheduled article, which gets its date only when
  it is published, meets that test, so it would show under "Warnings
  encountered:" (read in the code; the dataset has no scheduled article,
  so not walked). It is left out of this fix: it is a warning, not an
  error, it does not fire on the Steps' file, and it was added on purpose
  (`pkp/pkp-lib#2516`) to flag a published article without a date, so
  narrowing it to published articles is a separate decision.

## Proposed fix

Proposed: in `populatePublishedPublication()`, attach the issue when the
file names one and do nothing when it does not.

```diff
         if (empty($issue)) {
             $issueIdentificationNodes = $node->getElementsByTagName('issue_identification');
 
-            if ($issueIdentificationNodes->length != 1) {
-                $titleNodes = $node->getElementsByTagName('title');
-                $deployment->addError(Application::ASSOC_TYPE_PUBLICATION, $publication->getId(), __('plugins.importexport.native.import.error.issueIdentificationMissing', ['articleTitle' => $titleNodes->item(0)->textContent]));
-            } else {
-                $issueIdentificationNode = $issueIdentificationNodes->item(0);
-                $issue = $this->parseIssueIdentification($publication, $issueIdentificationNode);
+            // The element is optional: an article that is not assigned to an issue has none to name.
+            if ($issueIdentificationNodes->length === 1) {
+                $issue = $this->parseIssueIdentification($publication, $issueIdentificationNodes->item(0));
             }
         }
```

This keeps what 5dcbc94c2a was for: a file that names an issue still
attaches the article to it. The schema already allows at most one
`<issue_identification>`, so the "more than one" half of the old test
cannot pass validation. An `<issue_identification>` that matches no
issue of the journal still gets "None or more than one issue matches the
given issue identification …" and a new unpublished issue, as now
(`parseIssueIdentification()`). After the fix, the import no longer
flags a hand-written file that leaves the element out for an article
meant to be in an issue. It cannot tell that file from an article in no
issue, which is valid.

It was tried on OJS `main` with the Steps: step 6 then read only the
success text. Submission 17, exported and imported the same way, read
only the success text and was placed in Vol. 1 No. 2 (2014) with the fix
in and with it out. The diff:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-import-article-without-issue-lists-error/fix.diff).

**Alternatives**

- `addWarning()` instead of `addError()`: moves the line under "Warnings
  encountered:", but still reports an ordinary state as a problem.
- Run the check only for a publication with a `date_published` (the 3.1
  rule): a scheduled article names its issue but gets its
  `date_published` only when it is published (`APP\publication\Repository::setStatusOnPublish()`
  sets it then, unless one was entered), so it would no longer be
  attached to its issue.

**What goes with it**

- The key `plugins.importexport.native.import.error.issueIdentificationMissing`
  becomes unused in `plugins/importexport/native/locale/*/locale.po`
  and can be dropped from the English file; the other languages drop it
  when they are next synced with English.
- Backport to 3.5, 3.4 and 3.3: there a published article must be in an
  issue, so a backport should keep a message for a published article
  that names no issue. The check runs before the publication's status is
  set: `NativeXmlPKPPublicationFilter::handleElement()` calls
  `populateObject()` first (main line 80, 3.5 line 81, 3.4 line 80, 3.3
  line 75) and sets `status` afterwards (main line 101, 3.5 line 86, 3.4
  line 85, 3.3 line 80). So the backport reads the file's own value,
  `$node->getAttribute('status')`, and warns with `addWarning()` only
  when it is published (3). The fix for `main` does not depend on the
  status, so the trial stands as walked.
- No stored data changes.
- The guard is an e2e test: export an article that is not assigned to
  an issue, import it, and assert that the results tab has no "Errors
  occured:".

Small: three lines removed from one method of one OJS import filter,
with no data repair.

## Evidence

- Kept script that runs the Steps (and the submission 17 control) in the
  browser on OJS, on an install loaded from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-import-article-without-issue-lists-error/walk.js)
  (the Native XML page helpers in
  [unknown-section-import-broken-submission/lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unknown-section-import-broken-submission/lib.js)),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js ojs shared/playwright/checks/issues/native-import-article-without-issue-lists-error/walk.js`.
- The fix, tried 2026-10-01 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/native-import-article-without-issue-lists-error/fix.diff ojs`,
  walk.js, then
  `node bin/try-fix.js revert shared/playwright/checks/issues/native-import-article-without-issue-lists-error/fix.diff ojs`.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `ojs/main/pgsql` and `ojs/stable-3_5_0/pgsql`, no upgrade
  needed.
  - main: OJS bade233f73 (lib/pkp 2e377d27fc). OMP 3b0ecf794 and OPS
    c8af945bb7 (lib/pkp 3dc90c81a6) were walked through the same round
    trip into `publicknowledge` (OMP submission 2, OPS submission 1, by
    [native-import-other-context-resets-contributor-roles/walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-import-other-context-resets-contributor-roles/walk.js)
    with `SAME_CONTEXT=1`): success text only.
  - stable-3_5_0: OJS 92b9a16b48 (lib/pkp a9c76aed62). The walk showed
    the same as on `main`, and lines 83 and 170–172 read the same there.
- 3.4, by code: OJS `upstream/stable-3_4_0` at 9571d8fde7,
  `NativeXmlPublicationFilter.php` lines 83 and 159–172: the same call
  and the same `addError()`. `PublicationNativeXmlFilter` writes
  `<issue_identification>` only for a publication with an `issueId`.
- 3.3, by code: OJS `upstream/stable-3_3_0` at 9fdb9bcf9a,
  `NativeXmlPublicationFilter.inc.php` lines 78 and 154–165: the same.
- Introduced: `git blame` on lines 83 and 170–172 stops at a namespace
  move (665ed1f925, 2021) and a constant rename (88aaa6b49f, 2021);
  `git log -S'$this->populatePublishedPublication('` gives 5dcbc94c2a
  alone (merged in `pkp/ojs#2646`, 2020-02-28). The message itself dates
  from `pkp/pkp-lib#1709` (2016), when it was reached only for a
  published article.
- Upstream search (2026-10-01), pkp/pkp-lib, pkp/ojs and pkp/omp, issues
  and PRs: the message's words, `issueIdentificationMissing`,
  `populatePublishedPublication`, "native import issue identification";
  the matches (`pkp/ojs#1041`, `pkp/ojs#1380`, `pkp/ojs#1397`) are the
  element's introduction and older, different faults.
- Not driven: the command-line import, and a published article in no
  issue on `main` (both read in the code).
