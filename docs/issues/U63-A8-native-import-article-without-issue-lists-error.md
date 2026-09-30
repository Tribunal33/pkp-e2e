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
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U63 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a8) (the issue-identification line)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A journal manager imports a file with Tools › "Native XML Plugin". The
import succeeds, but for each article in the file that is not assigned
to an issue, the results tab adds "Errors occured:" and "The issue
identification element is missing for the article …". This happens in
any journal, with any file, the journal's own export included.

Nothing is wrong with those articles. An article that has not been
given an issue has none to name, and on `main` a published article can
be in no issue. An article assigned or scheduled to an issue names it
in the file and gets no line.

A batch of such articles gives one error line each, in the same list as
the file's real problems, and nothing tells the two apart.

## Impact

- **Lost:** nothing in the data. The time the manager spends reading
  error lines that mean nothing.
- **Who:** a journal manager who imports articles with the Native XML
  Plugin, for example when moving submissions that are still in the
  workflow between journals or installs.
- **Way round:** the manager has to know that this line can be ignored.

Low: a misleading message on an import that is complete.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`, context `publicknowledge`.

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

Submission 21 is imported complete, in no issue, like submission 8.

Control: the same steps with submission 17, "Antimicrobial, heavy metal
resistance and plasmid profile of coliforms isolated from nosocomial
infections in a hospital in Isfahan, Iran" (published in Vol. 1 No. 2
(2014)), read only the success text, and the copy is placed in that
issue. On a press or a preprint server the same round trip reads only
the success text.

## Cause

In OJS, `NativeXmlPublicationFilter::populateObject()`
(`plugins/importexport/native/filter/NativeXmlPublicationFilter.php`,
line 83) calls `populatePublishedPublication()` for every publication in
the file, published or not. When the article is imported on its own
rather than inside an `<issue>`, that method looks for
`<issue_identification>`. When there is not exactly one, it records
`plugins.importexport.native.import.error.issueIdentificationMissing`
with `$deployment->addError()` (line 172).

The element is optional. `native.xsd` declares it `minOccurs="0"` for a
publication (line 49), and the export writes it only for a publication
with an `issueId` (`PublicationNativeXmlFilter`, line 64). `addError()`
does not stop the import, so the article is imported, and pkp-lib's
`templates/plugins/importexport/innerResults.tpl` lists the message
under "Errors occured:".

In 3.1 the check ran only for an article with a `date_published`, so an
article in no issue was imported without it. pkp-lib's
`NativeXmlSubmissionFilter` called `populatePublishedSubmission()` only
behind that test. The publication versioning,
[718ad72e59](https://github.com/pkp/pkp-lib/commit/718ad72e597285d2899932efbd1d87635b90efe7),
removed that call. Then 5dcbc94c2a, in the 3.2 rework of the plugin,
added the call in `populateObject()` for every publication, so that any
publication that names an issue is attached to it. The error branch
came along unchanged.

Reach:

- Articles exported inside an issue ("Export Issues") are not affected:
  the import already knows their issue (read in the code).
- On `main`, a published article in no issue (`IssueAssignment` in
  `APP\publication\Repository`) gets the same line (read in the code).
  On 3.5 and older, publishing needs an issue
  (`publication.required.issue`).

## Proposed fix

Proposed: in `populatePublishedPublication()`, attach the issue when the
file names one and do nothing when it does not, and drop the locale key
that only this line used.

```diff
         if (empty($issue)) {
             $issueIdentificationNodes = $node->getElementsByTagName('issue_identification');
 
-            if ($issueIdentificationNodes->length != 1) {
-                $titleNodes = $node->getElementsByTagName('title');
-                $deployment->addError(Application::ASSOC_TYPE_PUBLICATION, $publication->getId(), __('plugins.importexport.native.import.error.issueIdentificationMissing', ['articleTitle' => $titleNodes->item(0)->textContent]));
-            } else {
-                $issueIdentificationNode = $issueIdentificationNodes->item(0);
-                $issue = $this->parseIssueIdentification($publication, $issueIdentificationNode);
+            if ($issueIdentificationNodes->length === 1) {
+                $issue = $this->parseIssueIdentification($publication, $issueIdentificationNodes->item(0));
             }
         }
```

This keeps what 5dcbc94c2a was for: a file that names an issue still
attaches the article to it. The schema already allows at most one
`<issue_identification>`, so no other case needs the branch.

What the check still catches in a hand-written file: an
`<issue_identification>` that matches no issue of the journal still
gets "None or more than one issue matches the given issue
identification …" (`issueIdentificationMatch`, in
`parseIssueIdentification()`) and a new unpublished issue, as now. What
it stops catching: a file that leaves the element out for an article
meant to be in an issue. The import cannot tell that from an article in
no issue, which is valid.

The full diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-import-article-without-issue-lists-error/fix.diff).
It was tried on `main`: step 6 then read only the success text.
Submission 17, exported and imported the same way with the fix and
without it, read only the success text and was placed in Vol. 1 No. 2
(2014) both times.

**Alternatives**

- `addWarning()` instead of `addError()`: moves the line under
  "Warnings encountered:", but still reports an ordinary state as a
  problem.
- Run the check only for a publication with a `date_published` (the
  3.1 rule): a scheduled article names its issue but can have no
  `date_published` yet, and it would no longer be attached to its issue.

**What goes with it**

- The key is in 51 `plugins/importexport/native/locale/*/locale.po`
  files, English and 50 translations. The fix removes it from English.
  The 50 translated entries become unused and do nothing. The next
  sweep that applies the English source to the translations removes
  them, as
  [38bc84e560](https://github.com/pkp/ojs/commit/38bc84e560c4c646fa9053dfe9d88cdfd8f35b19)
  ("Apply .pot to locale files", 2023) did.
- Backport to 3.5, 3.4 and 3.3: there a published article must be in an
  issue, so the backport should not drop the check entirely. It keeps
  the key and reports it with `addWarning()`, only when the
  publication's `status` attribute is published (3) and the file names
  no issue. The status is already set on the publication at that point
  (`NativeXmlPKPPublicationFilter::handleElement()`, line 101). An
  unpublished article in no issue then gets no line there either.
- No stored data changes.
- The guard is an e2e test: export an article that is not assigned to
  an issue, import it, and assert that the results tab has no "Errors
  occured:".

Small: one method in one OJS import filter.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-import-article-without-issue-lists-error/walk.js).
  It takes the Steps with submission 8 and submission 17 on OJS, and the
  same round trip on OMP (submission 3) and OPS (submission 1). It reads
  from the database the issue each copy is placed in. Command:
  `node bin/probe.js all shared/playwright/checks/issues/native-import-article-without-issue-lists-error/walk.js`.
- Fix trial:
  [trial.sh](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-import-article-without-issue-lists-error/trial.sh)
  applies fix.diff with `node bin/try-fix.js apply … ojs`, walks, and
  reverts with `node bin/try-fix.js revert ojs`.
- The walks: `main` and 3.5, OJS, OMP and OPS, on PostgreSQL, on PKP's
  default datasets from pkp/datasets 38ab955 (2026-09-30).
- Branch tips:
  - main: OJS bade233f73 (pkp-lib 2e377d27fc), OMP 3b0ecf794 and OPS
    c8af945bb7 (pkp-lib 3dc90c81a6).
  - stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00, OPS cf4fce69bd (pkp-lib
    a9c76aed62).
  - stable-3_4_0: OJS 9571d8fde7 (pkp-lib df13621c2d).
  - stable-3_3_0: OJS 9fdb9bcf9a (pkp-lib d446601ebe).
- Code reads: OJS `NativeXmlPublicationFilter` on stable-3_4_0 (lines
  83, 159–172) and stable-3_3_0 (`.inc.php`, lines 78, 154–165) has the
  same call and the same `addError()`. `PublicationNativeXmlFilter`
  there writes `<issue_identification>` only for a publication with an
  `issueId`. Publishing needs an issue on 3.4 (`Repository`, line 114)
  and 3.3 (`PublicationService`, line 191).
- Introduced: found with `git log -S'$this->populatePublishedPublication('`
  (a blame on line 172 stops at a PSR-12 reformat). The message dates
  from
  [1d54f56aad](https://github.com/pkp/ojs/commit/1d54f56aad8ba3b70979f8404eb2e2a8824cb239)
  (`pkp/pkp-lib#1709`, 2016), when it stopped the import and was
  reached only for a published article.
- Upstream search (2026-09-30), pkp organisation, issues and PRs: the
  message's words, `issueIdentificationMissing`,
  `populatePublishedPublication`; no match.
