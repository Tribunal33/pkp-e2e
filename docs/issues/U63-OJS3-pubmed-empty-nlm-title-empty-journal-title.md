# PubMed files carry an empty journal title once a manager saves "NLM Title Abbreviation" empty

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS (from 3.5.0-1)
  - 3.4: none (code; no "NLM Title Abbreviation")
  - 3.3: none (code; no "NLM Title Abbreviation")
- **Introduced** `pkp/ojs#4955` for `pkp/pkp-lib#11447` · [1e556c9455](https://github.com/pkp/ojs/commit/1e556c945582c375bfdeba5348a9564195c5a5d0) · 2025-06-24 · Kaitlin Newson (kaitlinnewson); on 3.5 `pkp/ojs#4918` · [c1d5f94e79](https://github.com/pkp/ojs/commit/c1d5f94e79c645f028c7c7aaed666685912a32b8) · 2025-06-04
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U63 [OJS3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#ojs3)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A journal manager opens the PubMed XML Export Plugin and presses "Save" on
its "Settings" tab while "NLM Title Abbreviation" is empty. That happens
when they clear an abbreviation, or when they press "Save" on a first visit
without typing anything, since the box starts empty. From then on, every
PubMed file the journal exports has an empty journal title. Before that
save, the file carries the journal's full name, and the manager would
expect the same while the box is empty.

The save says "Your changes have been saved.", and the box looks as it did
before, so nothing tells the manager that the title is gone. NLM requires
the journal title in every file PubMed receives. Typing an abbreviation, or
the journal's name, into the box and saving again brings it back.

## Impact

- **Lost:** the journal title in every PubMed file exported after the
  save. NLM's rules make that element required. The rest of the file is
  unchanged.
- **Who:** managers of journals that send their metadata to PubMed. They
  download the file from the PubMed XML Export Plugin and upload it to
  NLM's SFTP server themselves; the plugin has no deposit of its own. The
  plugin's page opens on "Settings", so pressing "Save" there without an
  abbreviation is an easy step to take.
- **Way round:** save an abbreviation, or the journal's name, in the box.
  The fault shows only in the exported file, so a manager finds it only by
  reading the file. Files already sent cannot be corrected by sending them
  again, but NLM places a citation by its ISSN, so they are not shown to
  be lost.

Medium: a secondary output breaks one of NLM's required fields, silently.
NLM's published rejection messages include none for the journal title, and
its loader identifies the journal by ISSN, so the citations are not shown
to be refused or misfiled.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (`publicknowledge`, "Journal of
  Public Knowledge"). "NLM Title Abbreviation" has never been saved there.
- Reading the file: an install that reaches dtd.nlm.nih.gov downloads it
  (`pubmed-<date>-articles-1.xml`). An install that cannot reach that site
  (a test install, for example) shows a "Validation errors:" page instead,
  which prints the same file under "Invalid XML:" (the report
  "PubMed and validated DOAJ exports end in a "Validation errors:" page
  when OJS cannot reach NLM's or DOAJ's site"). Either way, read the
  `<JournalTitle>` element.

Saving the Settings tab on a first visit:

1. Sign in as `rvaca` (Journal manager).
2. In the side menu, open "Tools". On "Import/Export", press "PubMed XML
   Export Plugin". The "Settings" tab opens, and "NLM Title Abbreviation"
   is empty.
3. Open the "Export Articles" tab, tick "Signalling Theory Dividends" and
   press "Export Articles". Read `<JournalTitle>`.
4. Return to the PubMed XML Export Plugin. On "Settings", press "Save"
   without typing anything.
5. Export as in step 3. Read `<JournalTitle>`.

Clearing an abbreviation:

6. On "Settings", type "J Pub Knowl" into "NLM Title Abbreviation" and
   press "Save".
7. Export as in step 3. Read `<JournalTitle>`.
8. On "Settings", clear "NLM Title Abbreviation" and press "Save".
9. Export as in step 3. Read `<JournalTitle>`.

**Expected:** step 3 reads "Journal of Public Knowledge". Step 5 reads the
same, because no abbreviation was typed. Step 7 reads "J Pub Knowl". Step
9 reads "Journal of Public Knowledge" again.

**Observed:** steps 4, 6 and 8 show "Your changes have been saved.", and
after a reload the box reads empty after steps 4 and 8. Step 3 reads
`<JournalTitle>Journal of Public Knowledge</JournalTitle>` and step 7
reads `<JournalTitle>J Pub Knowl</JournalTitle>`. Steps 5 and 9 read:

```
<JournalTitle></JournalTitle>
```

## Cause

`ArticlePubMedXmlFilter::createJournalNode()`
(`plugins/importexport/pubmed/filter/ArticlePubMedXmlFilter.php`, line 221
on `main`) chooses the title with a null-coalescing fallback:

```php
$journalTitle = $nlmTitle ?? $journal->getName($journal->getPrimaryLocale());
```

`??` falls back only when the setting is `null`, which happens only while
the journal has no `nlmTitle` row. `PubMedSettingsForm::execute()` writes
each of its fields with `updateSetting($contextId, 'nlmTitle', …,
'string')`. `PKPRequest::getUserVars()` trims every posted string, so an
empty or blank box is stored as the empty string. After steps 4 and 8, the
`plugin_settings` row for `pubmedexportplugin` / `nlmTitle` held `''`.
`PluginSettingsDAO::getSetting()` returns that `''`, and the filter writes
it as the title.

That breaks the setting's own rule. The field is optional:
`PubMedSettingsForm` (a plain `Form`) adds no validator for it, only
`FormValidatorPost` and `FormValidatorCSRF`, and `pkp/pkp-lib#11447` says
"This field will be optional". Before that change, the file always carried
the journal's name. An optional abbreviation left empty should mean "no
abbreviation", so the journal's name should be used.

Reach:

- "Export Articles" (`PubMedExportPlugin::exportSubmissions()`), "Export
  Issues" (`PubMedExportPlugin::exportIssues()`) and the command-line
  export (`executeCLI()`, which calls one or the other) all run the single
  `article=>pubmed-xml` filter, so every export path reaches
  `createJournalNode()` (code). "Export Articles" was walked.
- `createJournalNode()` is the only place that reads `nlmTitle` (code,
  searched across OJS).

## Proposed fix

Treat an empty abbreviation as none in `createJournalNode()`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/pubmed-empty-nlm-title-empty-journal-title/fix.diff)):

```diff
-        $journalTitle = $nlmTitle ?? $journal->getName($journal->getPrimaryLocale());
+        // An abbreviation saved empty means none: fall back to the journal's name
+        $journalTitle = $nlmTitle != '' ? $nlmTitle : $journal->getName($journal->getPrimaryLocale());
```

`!= ''` is how the same method already tests the ISSNs
(`$journal->getData('printIssn') != ''`). It is false for `null` and for
`''`, and true for any abbreviation, "0" included. The fix belongs in the
reader rather than the form because it also fixes the empty rows journals
have already stored, so no data repair is needed.

The fix was tried on `main`. With it in, steps 5 and 9 read
`<JournalTitle>Journal of Public Knowledge</JournalTitle>`. Step 7 read
"J Pub Knowl" both with the fix and without it, so a saved abbreviation
is left alone.

**Alternatives:**

- Have `PubMedSettingsForm::execute()` delete the setting when the box is
  empty, so that `??` works. Future saves would be fixed, but the empty
  rows already stored would need an upgrade migration.
- `$nlmTitle ?: …`. This works too, but it treats the string "0" as empty.
  It also departs from the `!= ''` tests beside it.

**What goes with it:**

- Test: `pkp/pkp-lib#11565` (open) asks for a PHPUnit test of this
  setting in the exported `<JournalTitle>`. Adding the empty-string case to
  it covers this fault.
- The open `pkp/ojs#5608` (for `pkp/pkp-lib#7527`) rewrites this line to
  `$nlmTitle ?? $publication->getPrimaryContextName($journal)`, keeping
  `??`. Whichever PR merges second should keep the `!= ''` test when it
  resolves the conflict on this line.
- Backport: the diff applies to `stable-3_5_0` as written, with an offset
  (the line is 205 there).
- A similar pattern exists elsewhere, but it is left out here because it
  was not shown to fail:
  `CitationStyleLanguagePlugin` (line 537 in all three apps) uses
  `$context->getData('abbreviation', …) ?? $context->getData('acronym', …)`.
  Whether a cleared journal abbreviation is stored as `''` there was not
  checked.

Small: one line in one filter, following the method's own pattern, plus a
unit test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/pubmed-empty-nlm-title-empty-journal-title/walk.js),
  run on an install freshly loaded from PKP's default test dataset
  (pkp/datasets `38ab955`, 2026-09-30, PostgreSQL):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/pubmed-empty-nlm-title-empty-journal-title/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It takes steps 1 to 9
  and reads the stored `nlmTitle` row with SQL (as evidence, not as a
  step).
- Fix trial:
  [trial.sh](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/pubmed-empty-nlm-title-empty-journal-title/trial.sh)
  applies `fix.diff` with `node bin/try-fix.js apply`, walks every step,
  reverts the fix, then walks steps 1, 2, 6 and 7 without it.
- Walked on `main` and 3.5 with the same result. The test installs cannot
  reach dtd.nlm.nih.gov, so `<JournalTitle>` was read from the
  "Validation errors:" page's file text. The download itself was not
  driven. `display()` writes the same XML to the downloaded file (code).
- NLM's rules, from the PubMed DTD the export names
  (`https://dtd.nlm.nih.gov/ncbi/pubmed/in/PubMed.dtd`, fetched
  2026-09-30, "PubMed Journal Article DTD Version 3.0"):
  `<!ELEMENT Journal (PublisherName, JournalTitle, Issn, …)>` and
  `<!ELEMENT JournalTitle (#PCDATA)>`. The element is required, but an
  empty one passes the DTD, and so passes the export's own check.
- NLM's "XML Help for PubMed Data Providers" (NBK3828), read from the
  Wayback Machine snapshot of 2024-05-23, because the live page answers a
  captcha. It says:
  - "JournalTitle (R) The NLM Title Abbreviation for the journal", and
    "Required tags must be included".
  - "PubMed only accepts citation and abstract data uploaded by Secure
    File Transfer Protocol (SFTP)".
  - Replaces files are accepted only for ahead-of-print citations and a
    listed set of fields (AuthorList, InvestigatorList, Pagination,
    ELocationID, OtherAbstract, PII, DOI), which does not include the
    journal title.
  - The Loader Report's rejection messages place the journal by ISSN
    ("ISSN not found in NCBI database: ISSN= Title=") and include none for
    the journal title.
- Tips: OJS `main` `bade233f73` (lib/pkp `2e377d27fc`); OJS
  `stable-3_5_0` `92b9a16b48` (lib/pkp `a9c76aed62`); OJS
  `upstream/stable-3_4_0` `9571d8fde7`; `upstream/stable-3_3_0`
  `9fdb9bcf9a`. Code reads on 3.4 and 3.3: the PubMed filter and the
  plugin's files at those tips. The first release containing
  `c1d5f94e79` is tag `3_5_0-1` (2025-07-09, from `git tag --contains`).
- Upstream search (2026-09-30), pkp/pkp-lib and pkp/ojs issues and PRs:
  "pubmed JournalTitle", "NLM title abbreviation", "pubmed journal title
  empty", "pubmed abbreviation empty", `nlmTitle`, `createJournalNode`.
- Not driven: OMP and OPS have no PubMed tool. "Export Issues" and the
  command-line export were read in the code only. MySQL was not checked,
  but the empty row and `??` do not depend on the database.
- Unverified: what NLM's loader does with an empty `<JournalTitle>`
  beyond its published messages, and the `CitationStyleLanguagePlugin`
  pattern named under Proposed fix.
