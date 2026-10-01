# PubMed files lose the journal's title once the PubMed tool's Settings are saved with no NLM abbreviation

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS (releases 3.5.0-1 to 3.5.0-5)
  - 3.4: none (code; no "NLM Title Abbreviation" setting)
  - 3.3: none (code; no "NLM Title Abbreviation" setting)
- **Introduced** `pkp/ojs#4918` (3.5) and `pkp/ojs#4955` (main) for `pkp/pkp-lib#11447` · [c1d5f94e79](https://github.com/pkp/ojs/commit/c1d5f94e79c645f028c7c7aaed666685912a32b8), [1e556c9455](https://github.com/pkp/ojs/commit/1e556c945582c375bfdeba5348a9564195c5a5d0) · 2025-06-25 · Kaitlin Newson (kaitlinnewson)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U63 [OJS3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#ojs3)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A journal manager who presses "Save" on the PubMed XML Export Plugin's
"Settings" tab with "NLM Title Abbreviation" empty, whether they cleared
an abbreviation or never typed one, expects the PubMed file to name the
journal by its title, as it did before the tab was first saved. Instead,
every PubMed file from then on has an empty journal title.

The file still passes the PubMed format check that the export runs, so
it downloads with no message. NLM lists the journal title as a required
field of the file. Saving an abbreviation in the box puts a title back
in the files exported after that.

## Impact

- **Lost**: the journal title in every PubMed file. NLM asks for the
  journal's NLM title abbreviation there. Its documentation does not say
  what its loader does when the title is empty, so it is not known
  whether files already sent need sending again.
- **Who**: journal managers and editors who export to PubMed and have
  pressed "Save" on the tool's "Settings" tab with the box empty. The
  tool opens on that tab, which shows the empty "NLM Title Abbreviation"
  box with "Cancel" and "Save" under it.
- **Way round**: type the NLM title abbreviation into the box and press
  "Save". Files exported after that are correct.

Medium: a required field of the PubMed file is lost without a word, but
only after the box has been saved empty, and there is a way round. It
would be high if NLM's loader
turns out to accept such files and list the articles under a missing or
wrong journal. NLM's documentation does not say which happens.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`. Issue "Vol. 1 No. 2 (2014)" is
  published and holds "Signalling Theory Dividends" (submission 1). The
  PubMed tool's Settings have never been saved.
- The server can reach NLM's website, so that the export downloads the
  file. On a server that cannot reach it, each export shows a
  "Validation errors:" page instead (a separate fault). Find
  `<JournalTitle>` there, in the file text under "Invalid XML:".

Clearing an abbreviation:

1. Sign in as `dbarnes`.
2. Open Tools › "Import/Export" › "PubMed XML Export Plugin"
   (`/index.php/publicknowledge/en/management/importexport/plugin/PubMedExportPlugin`).
   It opens on "Settings", with "NLM Title Abbreviation" empty.
3. Open "Export Articles", tick "Signalling Theory Dividends" and press
   "Export Articles". The file's journal title reads
   `<JournalTitle>Journal of Public Knowledge</JournalTitle>`.
4. Open the tool again. On "Settings", type "J Pub Knowl" in "NLM Title
   Abbreviation" and press "Save". The notice reads "Your changes have
   been saved.".
5. Export the article as in step 3. The file reads
   `<JournalTitle>J Pub Knowl</JournalTitle>`.
6. Open the tool again. On "Settings", clear "NLM Title Abbreviation"
   and press "Save". The same notice shows, and the box is empty when
   the tool is opened again.
7. Export the article as in step 3.

Saving the tab as it opens:

8. Start from a freshly loaded dataset and take steps 1 to 3. Then open
   the tool again and press "Save" on "Settings" without typing anything.
9. Export the article as in step 3.

**Expected**: the files of steps 7 and 9 name the journal as the file
of step 3 does: `<JournalTitle>Journal of Public Knowledge</JournalTitle>`.

**Observed**: both files have an empty journal title:

```
<Journal>
  <PublisherName>Public Knowledge Project</PublisherName>
  <JournalTitle></JournalTitle>
  <Issn>0378-5955</Issn>
```

## Cause

`ArticlePubMedXmlFilter::createJournalNode()`
(`plugins/importexport/pubmed/filter/ArticlePubMedXmlFilter.php`, line
221 on `main`, 205 on `stable-3_5_0`) picks the journal title with the
null-coalescing operator:

```php
$nlmTitle = $plugin->getSetting($journal->getId(), 'nlmTitle');
…
$journalTitle = $nlmTitle ?? $journal->getName($journal->getPrimaryLocale());
```

`??` falls back to the journal's name only while the setting is `null`,
that is, while no row exists. `PubMedSettingsForm::execute()` saves the
field whatever it holds, through `Plugin::updateSetting()`, as type
`string`. The request trims every posted value, so an empty or blank box
is stored as the empty string, and `getSetting()` returns it as `''`.
Since `''` is not `null`, it becomes the title.

The field is optional: the form has no validator on it, and the
template does not mark it as required. The feature's issue,
`pkp/pkp-lib#11447`, describes it as optional, so an empty box should
mean "no abbreviation". The change that brought the setting in
(`pkp/ojs#4918` for 3.5, `pkp/ojs#4955` for `main`) wrote the line this
way. Before it, the method always wrote the journal's name.

Reach:

- "Export Issues" builds its file through the same method. This was read
  in the code; the walk exported articles only.
- The command-line export (`importExport.php PubMedExportPlugin`, its
  `articles` and `issue` commands) goes through `executeCLI()` to the
  same `exportSubmissions()` and `exportIssues()`, so it is affected too
  (code).
- The setting has no other reader. `grep nlmTitle` finds only the
  settings form, its template and this method.
- Stored data: a journal that has saved the tab empty holds an `nlmTitle`
  row with the value `''`. This was checked in the database after steps
  6 and 8.

## Proposed fix

Make the fallback treat an empty setting like a missing one, in the
setting's only reader
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/pubmed-empty-nlm-title-empties-journal-title/fix.diff)):

```diff
-        $journalTitle = $nlmTitle ?? $journal->getName($journal->getPrimaryLocale());
+        $journalTitle = $nlmTitle ?: $journal->getName($journal->getPrimaryLocale());
```

An abbreviation, when there is one, still wins, as the feature intends.
This follows how the code base already treats "empty means the default":
the ISSN lines just below in the same method test `!= ''`, and
`WebFeedGatewayPlugin` reads its optional `recentItems` setting with
`?:`. Because the fix is in the reader, it also mends every journal that
already stored `''`, with no data repair.

Tried on OJS `main`: steps 7 and 9 then gave
`<JournalTitle>Journal of Public Knowledge</JournalTitle>`, and step 5
still gave `<JournalTitle>J Pub Knowl</JournalTitle>`.

**Alternatives**:

- Have `PubMedSettingsForm::execute()` store `null`, or delete the row,
  when the field is empty. That is a change to this form's own save loop
  (one field), but it leaves the `''` rows already stored, so it would
  also need an upgrade step.
- Make the field required. It is optional by design, because not every
  journal has an NLM abbreviation.

**What goes with it**:

- A unit test of `createJournalNode()` for three cases: no row, a stored
  `''`, and an abbreviation. `pkp/pkp-lib#11565` (open) already asks for
  a unit test of this feature.
- The open PR `pkp/ojs#5608` (its diff read on GitHub) rewrites the same
  line as `$nlmTitle ?? $publication->getPrimaryContextName($journal)`,
  keeping `??`. That line needs `?:` too.
- The diff applies as written to `stable-3_5_0`, where the line is the
  same.
- Every instance: no other import/export or DOI plugin in OJS, or under
  `lib/pkp/plugins`, falls back from a plugin setting with `??` or `?:`.
  The PFL plugin (`plugins/generic/pflPlugin`) reads its optional
  `academicSociety` setting the same way, as `?? 'NA'`. This report does
  not cover it: it is another plugin, and nobody has read whether its
  form stores an empty value as `''`.

Small: one operator in one method, and a unit test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/pubmed-empty-nlm-title-empties-journal-title/walk.js)
  (helpers in its `lib.js`), run on an install freshly loaded from PKP's
  default test dataset (pkp/datasets 38ab955, 2026-09-30, PostgreSQL):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/pubmed-empty-nlm-title-empties-journal-title/walk.js`
  for steps 1 to 7, and the same with `as-opened` as the argument for
  steps 8 and 9. Walked on `main` and on `stable-3_5_0`, with the same
  result on both. The fix was tried on `main` with
  `node bin/try-fix.js apply …/fix.diff ojs`; both paths were walked, and
  the fix was then reverted.
- The walk's server cannot reach NLM's website. So each export answered
  500 with the "Validation errors:" page, and the walk read
  `<JournalTitle>` from the file text on that page. That failure is
  reported separately, in
  [U63-OJS4-OJS7-pubmed-doaj-export-needs-outside-sites.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U63-OJS4-OJS7-pubmed-doaj-export-needs-outside-sites.md).
  The file texts of steps 3 and 7 both passed `DOMDocument::validate()`
  against PubMed's DTD on a machine that reaches NLM. The DTD declares
  `JournalTitle` as `(#PCDATA)`, so an empty title is valid there.
- NLM's "XML Help for PubMed Data Providers" (NBK3828, last updated
  2024-12-06; read through the Internet Archive copy
  `https://web.archive.org/web/20250114145246/https://www.ncbi.nlm.nih.gov/books/NBK3828/`,
  because the live page answered with a robot check) lists `JournalTitle`
  as "(R)", meaning required, with the text "The NLM Title Abbreviation for the journal". Its
  Loader Report messages name the journal by ISSN ("ISSN not found in
  NCBI database: ISSN= Title="). It does not say what the loader does
  with an empty `JournalTitle`.
- Branch tips: OJS `main` bade233f73 (lib/pkp 2e377d27fc); OJS
  `stable-3_5_0` 92b9a16b48 (lib/pkp a9c76aed62); OJS `stable-3_4_0`
  9571d8fde7; OJS `stable-3_3_0` 9fdb9bcf9a. The release tags that contain
  c1d5f94e79 are `3_5_0-1` to `3_5_0-5`.
- Code reads on `main`: the filter, `PubMedSettingsForm`,
  `PubMedExportPlugin::executeCLI()`, `Plugin` and `PluginSettingsDAO`
  setting reads and writes, and `PKPRequest::getUserVars()`. On
  `stable-3_5_0`, the same filter. On `stable-3_4_0` and
  `stable-3_3_0`, `ArticlePubMedXmlFilter.php` (`.inc.php` on 3.3)
  always writes the journal's name, and the plugin has no settings form.
- Introduced: `git log -L` on the line leads to c1d5f94e79 (authored
  2025-06-04) on 3.5 and 1e556c9455 on `main`. Neither commit only moved
  the line.
- Upstream search (2026-10-01): pkp/pkp-lib, pkp/ojs and pkp/ui-library,
  for "pubmed NLM title", "pubmed JournalTitle", "nlmTitle" and "pubmed
  journal title empty".
- MySQL not checked. By the code, an empty field is stored as `''` on
  either database.
- Unverified: what NLM's loader does with a file whose `JournalTitle` is
  empty.
