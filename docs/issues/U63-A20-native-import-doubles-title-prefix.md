# A submission with a title prefix comes back from a Native XML export and import titled "The The …"

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; the export wrote the title without the prefix)
- **Introduced** `pkp/pkp-lib#8584` for `pkp/pkp-lib#2564` · [b391330955](https://github.com/pkp/pkp-lib/commit/b391330955658e22ae29e1e48656ab2fde56008a) · 2023-02-12 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U63 [A20](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a20)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager uses the "Native XML Plugin" to export a submission whose
"Prefix" (Publication › "Title & Abstract") reads "The", and imports the
file into another journal, press or server, or the same one. The copy
should come back titled as the original. Instead the prefix is doubled.
The "Import Results" tab ("Results" on a press) lists the copy as "The
The …", and the copy's workflow is headed the same. On its "Title &
Abstract", "Prefix" reads "The" and "Title" also starts with "The".

Nothing on screen calls it a problem, and the manager has to correct
each copy's title by hand.

## Impact

- **Lost.** Each copy's correct title; exporting and importing a copy
  again adds a third "The". Once a copy is published, its pages,
  citations, DOI deposits, OAI-PMH records and search index carry the
  doubled title.
- **Who.** Managers who move content with the "Native XML Plugin": from
  one journal, press or server to another, from one install to another,
  or as a back-up and restore. Only titles that use the "Prefix" field
  ("Examples: A, The") are touched.
- **Way round.** On each copy, open "Title & Abstract" and remove the
  extra word from "Title"; a published copy is locked, so it has to be
  unpublished first or corrected in a new version. Nothing finds the
  affected copies for the manager. Fixing the export will not mend files
  already exported from 3.4, 3.5 or `main`, back-ups included: the fault
  is in the file, which the import reads faithfully. Files exported from
  3.3 are not affected.

Medium: even for a whole archive moved this way, the doubled titles are
listed on the results tab and shown on each copy's workflow, they can be
corrected on screen, and nothing else in the copy is lost. It would be
high if the "Prefix" field turned out to be in wide use on published
titles, so that one archive move put the doubled title on many public
records at once.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main` (OJS, OMP or OPS), freshly
  loaded, context `publicknowledge`. `dbarnes` is the editor (on OPS a
  manager).
- No set-up beyond the dataset. Each app uses one submission that is
  unpublished and has one version:
  - OJS: submission 3, "The Facets Of Job Satisfaction: A Nine-Nation
    Comparative Study Of Construct Equivalence"
  - OMP: submission 3, "The Political Economy of Workplace Injury in
    Canada"
  - OPS: submission 1, "The influence of lactation on the quantity and
    quality of cashmere production"

1. Sign in as `dbarnes`.
2. Open the submission's workflow
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=3`,
   OPS `…=1`), then "Publication" › "Title & Abstract" (OPS "Preprint" ›
   "Title & Abstract").
3. Type "The" in "Prefix", delete "The " from the start of "Title" and
   press "Save". The page now reads "Prefix" "The" and "Title" "Facets
   Of Job Satisfaction: …", and the workflow is headed "The Facets Of Job
   Satisfaction: …" as before.
4. Open Tools › "Import/Export" › "Native XML Plugin"
   (`/index.php/publicknowledge/en/management/importexport/plugin/NativeImportExportPlugin`).
5. Open "Export Articles" (OMP "Export", OPS "Export Preprints"), tick
   the submission, press "Export Articles" ("Export Submissions",
   "Export Preprints"), then "Download Exported File".
6. Open "Import", upload the downloaded file in "File" and press
   "Import".
7. Open the copy the results tab lists (OJS 21, OMP 19, OPS 20) and its
   "Title & Abstract", as in step 2.

**Expected.** The results tab lists the copy under the original's title,
and its "Title & Abstract" matches the original's:

```
Submission "21" - "The Facets Of Job Satisfaction: A Nine-Nation Comparative Study Of Construct Equivalence"
Prefix: The
Title:  Facets Of Job Satisfaction: A Nine-Nation Comparative Study Of Construct Equivalence
```

**Observed.** The prefix is doubled. OJS's "Import Results" tab:

```
The import completed successfully.
The following items were imported:
Submission "21" - "The The Facets Of Job Satisfaction: A Nine-Nation Comparative Study Of Construct Equivalence"
Errors occured:
Publication
The issue identification element is missing for the article "The Facets Of Job Satisfaction: A Nine-Nation Comparative Study Of Construct Equivalence".
```

The copy's workflow is headed "The The Facets Of Job Satisfaction: …",
and its "Title & Abstract" reads "Prefix" "The" and "Title" "The Facets
Of Job Satisfaction: A Nine-Nation Comparative Study Of Construct
Equivalence". OMP lists `Submission "19" - "The The Political Economy of
Workplace Injury in Canada"` and OPS `Submission "20" - "The The
influence of lactation on the quantity and quality of cashmere
production"`, each copy's "Title" again starting "The".

The "issue identification" line appears for every unpublished article a
journal imports. It quotes the file's `<title>` as it stands
(`NativeXmlPublicationFilter`, lines 171–172), which is why it shows a
single "The": the file's title already starts with the prefix.

The downloaded file already holds the prefix twice:

```xml
<title locale="en">The Facets Of Job Satisfaction: A Nine-Nation Comparative Study Of Construct Equivalence</title>
<prefix locale="en">The</prefix>
```

Control: the same submission exported and imported without step 3 (no
prefix) comes back unchanged.

## Cause

`PKPPublicationNativeXmlFilter::addMetadata()`
(`lib/pkp/plugins/importexport/native/filter/PKPPublicationNativeXmlFilter.php`,
line 209 on `main`) writes `<title>` from `$entity->getTitles('html')`.
`PKPPublication::getTitles()` returns, per locale,
`getLocalizedTitle($locale, 'html')`, which joins the prefix and the title
(`$title = $prefix . ' ' . $title`). The next line writes the prefix again
as `<prefix>`, from `getData('prefix')`. So the file carries the prefix
twice: once inside `<title>`, once on its own.

`NativeXmlPKPPublicationFilter` reads both back as stored fields
(`_getLocalizedPublicationFields()`: `title`, `prefix`, …), so the copy
stores `prefix` "The" and `title` "The Facets …", and everything that
shows the title joins them again. The rule the export breaks is that
`<title>` and `<prefix>` are separate fields of the format
(`pkp-native.xsd`), the way the publication stores them.

The line read `$entity->getData('title')` until
[b391330955](https://github.com/pkp/pkp-lib/commit/b391330955658e22ae29e1e48656ab2fde56008a)
(`pkp/pkp-lib#8584`, for `pkp/pkp-lib#2564`, HTML markup in titles)
changed it to `getTitles('html')`, so that the exported title keeps its
markup. The stored title is already HTML, so `getData('title')` keeps
the markup too; `getTitles('html')` only adds the prefix.

Reach:
- OJS, OMP and OPS alike: the filter is pkp-lib's, and the apps'
  `PublicationNativeXmlFilter` subclasses do not override
  `addMetadata()` (walked on all three, and read in the code).
- Every locale that has a prefix, and every version of the submission:
  the export writes each publication through the same method (read in
  the code).
- The command-line `tools/importExport.php NativeImportExportPlugin`
  export uses the same filter (read in the code).
- Files exported by 3.4, 3.5 and `main` hold the joined title, so they
  double the prefix on import even once the export is fixed. Files
  exported by 3.3 hold the title alone and import correctly (read in
  the code).
- A copy exported again writes `getTitles('html')` of its stored "The" +
  "The Facets …", so the next import stores "The The Facets …" and shows
  "The The The Facets …" (read in the code).
- Once a copy is published, everything that reads the joined title
  (`getLocalizedTitle()`, `getTitles()`, `getFullTitles()`: the article
  pages, the "How to Cite" citations, Crossref, DataCite and DOAJ
  deposits, Dublin Core, OAI-PMH, the search index) carries the doubled
  prefix (read in the code).

## Proposed fix

Export the stored title, as the method's other lines export their
fields
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-import-doubles-title-prefix/fix.diff)):

```diff
--- a/lib/pkp/plugins/importexport/native/filter/PKPPublicationNativeXmlFilter.php
+++ b/lib/pkp/plugins/importexport/native/filter/PKPPublicationNativeXmlFilter.php
@@ -206,7 +206,7 @@
     public function addMetadata($doc, $entityNode, $entity)
     {
         $deployment = $this->getDeployment();
-        $this->createLocalizedNodes($doc, $entityNode, 'title', $entity->getTitles('html'));
+        $this->createLocalizedNodes($doc, $entityNode, 'title', $entity->getData('title'));
         $this->createLocalizedNodes($doc, $entityNode, 'prefix', $entity->getData('prefix'));
         $this->createLocalizedNodes($doc, $entityNode, 'subtitle', $entity->getSubTitles('html'));
         $this->createLocalizedNodes($doc, $entityNode, 'abstract', $entity->getData('abstract'));
```

It follows the pattern around it: the prefix, abstract and the other
localized fields are exported with `getData()`, and so are OMP's chapter
and series titles (`ChapterNativeXmlFilter`, `PublicationNativeXmlFilter`).
It keeps what `pkp/pkp-lib#8584` wanted, since the stored title already
holds its markup. `createLocalizedNodes()` escapes the value as before
(`pkp/pkp-lib#9625`). The subtitle line is left alone:
`getSubTitles('html')` returns the stored subtitle as it is.

One difference is left out on purpose. `createLocalizedNodes()` skips
only a locale stored as `''`, while `getTitles()` skipped every empty
title, `null` included. With the fix, a locale whose title is stored as
`null` would write an empty `<title locale="…"/>` (and `htmlspecialchars(null)`
is deprecated on PHP 8.1+). The prefix, abstract and other lines already
pass `getData()` the same way, so this is not new to the method; an
`array_filter()` inside `createLocalizedNodes()` would close it for all
of them, as a separate change.

Tried on `main` on all three apps: with the fix in, the Steps show the
Expected. The same round trip without a prefix comes back unchanged with
the fix in and out.

Every instance: the other callers of `getTitles()` and
`getFullTitles()` (JATS, Crossref, DataCite, DOAJ, Dublin Core, the
OAI-PMH `dc` adapter, the search index, the REST API's `fullTitle`) want
the joined title, because their formats have no prefix field. The Native
XML export is the only writer that also carries the prefix on its own.

**Alternatives**
- Strip the prefix on import, in `NativeXmlPKPPublicationFilter`, when
  `<title>` starts with `<prefix>` and a space. It would also mend files
  already exported by 3.4 to `main`, but it guesses: a title that
  really starts with the same word as its prefix would lose it, and
  the files would stay wrong for any other reader. It could go with the
  recommended fix as a tolerance for old files, if the team wants it.
- Stop exporting `<prefix>`. The copy would then store the whole title
  in "Title" and lose the prefix as a field.

**What goes with it**
- No data repair: a doubled title cannot be told safely from a title
  that really repeats the word, so managers correct the copies on
  screen.
- The file format does not change; only what `<title>` holds does.
  No REST API or plugin hook is involved.
- Backport: applies as written to `stable-3_5_0` and `stable-3_4_0`.
  3.3 does not need it.
- Guard: a pkp-lib unit test that exports a publication with a prefix
  through `PKPPublicationNativeXmlFilter` and checks that `<title>`
  holds the title alone. pkp-lib has no unit test for any Native XML
  filter yet (none in `lib/pkp/tests` or the apps' `tests`), so this one
  needs its own set-up: a deployment, a context and a DOM document.
  The browser test kept with this report (Evidence) checks the same
  export and import through the screens.

Small: one line in the shared export filter. Most of the work is the
unit test's new set-up, which still fits in a few hours; it would be
medium if the team wants a reusable test base for the Native XML
filters first.

## Evidence

- Kept script that runs the Steps in the browser on all three apps, on
  an install loaded from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-import-doubles-title-prefix/walk.js)
  (helpers in its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-import-doubles-title-prefix/lib.js)
  and the Native XML page helpers in
  [unknown-section-import-broken-submission/lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unknown-section-import-broken-submission/lib.js)),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/native-import-doubles-title-prefix/walk.js`.
  Besides the screens it reads the downloaded file's `<title>` and
  `<prefix>` and the stored `title` and `prefix` of the original and the
  copy (`publication_settings`).
- The fix, tried 2026-10-01 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/native-import-doubles-title-prefix/fix.diff ojs omp ops`,
  then walk.js and
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-import-doubles-title-prefix/neighbour.js)
  with the same command, then
  `node bin/try-fix.js revert shared/playwright/checks/issues/native-import-doubles-title-prefix/fix.diff ojs omp ops`.
  neighbour.js is the no-prefix control: the same export and import of
  the same submission, left without a prefix. It was run with the fix in
  and again with it out.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`, no
  upgrade needed. No request failed and the pages raised no script
  error. MySQL not checked; nothing here depends on the database.
  - main: OJS bade233f73 (lib/pkp 2e377d27fc), OMP 3b0ecf794 and OPS
    c8af945bb7 (lib/pkp 3dc90c81a6 for both), ui-library 280f98c5.
  - stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00, OPS cf4fce69bd (lib/pkp
    a9c76aed62 for all three). The walk showed the same as on `main`,
    line for line, and `addMetadata()` reads the same there.
- Introduced: `git blame` on line 209 gives
  [c7bf39f6b9](https://github.com/pkp/pkp-lib/commit/c7bf39f6b960bb3529a7fd1fdded58a07ac64c6b)
  (`pkp/pkp-lib#9625`, escaping), which only dropped a fifth `'html'`
  argument; `git log -L` shows b391330955 replacing `getData('title')`
  with `getTitles('html')`.
- 3.4, by code: pkp-lib `stable-3_4_0` at df13621c2d.
  `PKPPublicationNativeXmlFilter::addMetadata()` writes `<title>` from
  `getTitles('html')` (line 195) and `<prefix>` from `getData('prefix')`;
  `PKPPublication::getLocalizedTitle()` joins the prefix the same way;
  `NativeXmlPKPPublicationFilter` reads both back. The apps' own
  `PublicationNativeXmlFilter` (OJS 9571d8fde7, OMP 0aec65441, OPS
  acd8ae704b) do not touch the publication title.
- 3.3, by code: pkp-lib `stable-3_3_0` at d446601ebe,
  `PKPPublicationNativeXmlFilter.inc.php` line 166 writes `<title>` from
  `getData('title')`, so the file carries the prefix once. OJS
  9fdb9bcf9a and OMP 8e72fc883 do not override it; OPS 3.3 (c5532e2161)
  has no Native XML plugin.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ops issues and PRs
  searched 2026-10-01 for "native prefix title", "prefix doubled",
  "prefix duplicated title", "import prefix twice", "prefix export import
  title", `getTitles native` and `PKPPublicationNativeXmlFilter title`;
  nothing about this fault. pkp/ui-library not searched: no front-end
  code is involved.
- Not driven, read in the code only (unverified on screen): an import
  into a second journal, press or server (the dataset has one context
  per app); the command-line tool; a second locale's prefix; a published
  submission's export; a copy exported and imported again ("The The The
  …"); a 3.3 file imported into 3.4 or later; the lock on a published
  copy's "Title & Abstract" (ui-library `WorkflowPublicationEditDisabled`,
  shown for a published version); what a published copy's pages,
  citations, deposits and index records show.
- Not walked with the fix: a locale whose title is stored as `null`
  (Proposed fix); no such row was in the dataset's walked submissions.
