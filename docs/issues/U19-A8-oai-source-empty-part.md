# In OAI Dublin Core records, "Source" ends in an empty part for articles in no issue and for every book

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** OJS: `pkp/ojs#5039` for `pkp/pkp-lib#9295` · [1fb080776e](https://github.com/pkp/ojs/commit/1fb080776ef774c6c31e12e2450de0c29c4183c8) · 2025-09-12 · Touhidur Rahman (touhidurabir). OMP: [c742bfc20f](https://github.com/pkp/omp/commit/c742bfc20f84d7d273f5346e7e067b29a86d168a), the commit that added the Dublin Core adapter (no pull request) · 2012-03-19 · Bruno Beghelli (beghelli)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U19 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a8)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A harvester reading an OAI-PMH Dublin Core record expects "Source" to
read "{journal name}; {issue}; {pages or article number}", with only
the parts the item has. An article published in no issue reads
"Journal of Public Knowledge; " instead, or "Journal of Public
Knowledge; ; 15-20" when it has pages ("; ; e0142" with an article
number). Every record of a press reads "Public Knowledge Press; ". A
preprint server writes no "Source", so it is not affected.

The two halves differ in age. The journal half is new on `main`:
articles in no issue reach the OAI lists only since continuous
publication came in (`pkp/ojs#5039`), so it can be fixed before the
next release. The press half has been there since 2012.

## Impact

- **Lost**: nothing; the journal or press name and the pages are right.
  Indexes that display "Source" show the stray separator to their
  readers.
- **Who**: harvesters and the indexes behind them, for every book of a
  press and every article a journal publishes with "Don't Assign To An
  Issue".
- **Way round**: none for a press. A journal avoids it only by putting
  the article in an issue, which changes how it is published, so for a
  journal that publishes continuously it is no way round. No stored
  data needs repair: the value is built each time the record is served.

Low: a cosmetic flaw in one field that no harvester needs to parse; it
would be medium if an index that matters were shown to reject or
misread the value.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS's journal `publicknowledge`
  ("Journal of Public Knowledge") and OMP's press `publicknowledge`
  ("Public Knowledge Press"), each in English and French, with the OAI
  interface on, as by default.
- OJS: submissions 5 "Genetic transformation of forest trees" and 6
  "Investigating the Shared Background Required for Argument: A Critique
  of Fogelin's Thesis on Deep Disagreement", both in Production.

OJS:

1. Sign in as `dbarnes`.
2. Open submission 5, then its "Title & Abstract" page.
3. Press "Publish". In "Review Publishing Details" choose "Version of
   Record" under "Publication Stage", "Major Revision" under "Revision
   Significance", and "Don't Assign To An Issue" under "Issue
   Assignment". Press "Confirm", then "Publish".
4. Open submission 6, then its "Publication Settings" page. The form
   starts with an issue picked, and "Save" asks for one until you choose
   "Don't Assign To An Issue" under "Issue Assignment". Choose it, type
   "15-20" in "Pages" and press "Save".
5. Publish submission 6 as in step 3.
6. In a browser, signed out, open
   `/index.php/publicknowledge/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:ojs2.localhost:article/5`
   and read the "Source" rows under "Dublin Core Metadata (oai_dc)".
7. Do the same for `…identifier=oai:ojs2.localhost:article/6`.

OMP (nothing to create, no sign-in):

1. Open `/index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=oai_dc`.
2. Read the "Source" row of each record.

**Expected.** Only the parts the item has, joined by "; ":

```xml
<dc:source xml:lang="en">Journal of Public Knowledge</dc:source>          <!-- article 5 -->
<dc:source xml:lang="en">Journal of Public Knowledge; 15-20</dc:source>   <!-- article 6 -->
<dc:source xml:lang="en">Public Knowledge Press</dc:source>               <!-- each book -->
```

The French rows ("Journal de la connaissance du public", "Press de la
connaissance du public") follow the same pattern.

**Observed.**

```xml
<dc:source xml:lang="en">Journal of Public Knowledge; </dc:source>
<dc:source xml:lang="fr-CA">Journal de la connaissance du public; </dc:source>

<dc:source xml:lang="en">Journal of Public Knowledge; ; 15-20</dc:source>
<dc:source xml:lang="fr-CA">Journal de la connaissance du public; ; 15-20</dc:source>

<dc:source xml:lang="en">Public Knowledge Press; </dc:source>
<dc:source xml:lang="fr-CA">Press de la connaissance du public; </dc:source>
```

The browser view shows the same text in its "Source" rows. The OMP
lines are the same on both records the press lists
(`oai:omp.localhost:publicationFormat/2` and `/3`).

Control: article 1 "Signalling Theory Dividends", in Vol. 1 No. 2 (2014)
with "Pages" 71-98, reads "Journal of Public Knowledge; Vol. 1 No. 2
(2014); 71-98".

## Cause

Both apps build "Source" by gluing a "; " in front of each part, whether
or not the part exists.

OJS, `Dc11SchemaArticleAdapter::extractMetadataFromDataObject()`
(`plugins/metadata/dc11/filter/Dc11SchemaArticleAdapter.php`):

```php
foreach ($sources as $locale => $source) {
    $sources[$locale] .= '; ' . $issue?->getIssueIdentification([], $locale);
    $sources[$locale] .= $pages;
}
```

`$pages` is `'; '` plus the version's pages or, when it has none, its
article number (`$publication->getData('pages') ?:
$publication->getData('articleNumber')`), or `''` when it has neither.
So an article in no issue with an article number reads "…; ; e0142" in
the same way (checked in the code).

Until 2025 every article in the OAI lists had an issue: publishing
required one, and `OAIDAO` joined the issues table. The continuous
publication work (`pkp/ojs#5039`) let an article be published with no
issue, changed that join to a left join so such articles are listed,
and made the call null-safe (`$issue?->`), but kept the separator.

OMP, `Dc11SchemaPublicationFormatAdapter::extractMetadataFromDataObject()`
(`plugins/metadata/dc11/filter/Dc11SchemaPublicationFormatAdapter.php`)
appends `'; '` unconditionally after the press name. That separator
is the OJS adapter's issue slot, copied when OMP's adapter was modelled
on it in 2012; books have no issue. The pages part after it is empty
too: OMP's publication schema has no `pages` property, so
`$publication->getData('pages')` is always null.

Reach:

- OAI `oai_dc` only: `PKPOAIMetadataFormat_DC` is the adapters' only
  user (checked in the code). The article page's `DC.Source` meta tag
  (`DublinCoreMetaPlugin`) is the journal or press name alone, and the
  MARC 773 field of the same OJS article already leaves the empty issue
  out (`OAIMetadataFormat_MARC21::getRelatedParts()`, checked in the
  code).
- OJS: articles in an issue are right, with or without pages (checked
  on screen: articles 1 and 17). The ISSN "Source" rows are separate
  statements and unaffected.
- OPS: `Dc11SchemaPreprintAdapter` writes no `dc:source` (checked in
  the code).

## Proposed fix

A proposal; the team decides. Join the parts that exist, as the MARC
773 field of the same article already does
(`OAIMetadataFormat_MARC21::getRelatedParts()`: `implode(', ',
array_filter([...]))`, from `pkp/pkp-lib#12609`).
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-source-empty-part/fix-ojs.diff):

```diff
-        if (!empty($pages)) {
-            $pages = '; ' . $pages;
-        }
         foreach ($sources as $locale => $source) {
-            $sources[$locale] .= '; ' . $issue?->getIssueIdentification([], $locale);
-            $sources[$locale] .= $pages;
+            $sources[$locale] = implode('; ', array_filter([
+                $source,
+                $issue?->getIssueIdentification([], $locale),
+                $pages,
+            ]));
         }
```

[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-source-empty-part/fix-omp.diff)
does the same with the press name and pages
(`implode('; ', array_filter([$source, $pages]))`), which keeps the
pages part working for a plugin that adds `pages` to OMP's publication
schema.

Tried on `main`, OJS and OMP: article 5 read "Journal of Public
Knowledge", article 6 "Journal of Public Knowledge; 15-20", each book
"Public Knowledge Press", and the French rows likewise. Articles 1 and
17, in an issue, read the same with the fix in and out: "…; Vol. 1
No. 2 (2014); 71-98" and "…; Vol. 1 No. 2 (2014)".

**Alternatives:**

- Keep an empty slot ("Journal of Public Knowledge; ; 15-20") so the
  parts stay in fixed positions: Dublin Core "Source" is free text, and
  a trailing "; " is wrong either way.
- Trim a trailing "; " after the loop: leaves "; ;" for an article with
  pages and no issue.

**What goes with it:**

- No stored data needs repair and no API changes. The hooks
  `Dc11SchemaArticleAdapter::extractMetadataFromDataObject` (OJS) and
  `Dc11SchemaPublicationFormatAdapter::extractMetadataFromDataObject`
  (OMP) receive the corrected value.
- Backport, OMP only: 3.5 needs its own diff, because its adapter calls
  `_addLocalizedElements()` and the lines sit elsewhere;
  [fix-omp-3_5.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-source-empty-part/fix-omp-3_5.diff)
  makes the same change and passes `git apply --check` on 3.5's tip
  (not walked). 3.4 and 3.3 read `$monograph->getPages()` and need a
  diff of their own too; none was written or checked.
- Guard: cases in OJS's `OAIMetadataFormat_DCTest` (it already asserts
  `journal-title; issue-identification; e0142`) for an article with no
  issue, with pages, with an article number and with neither; OMP has
  no such test yet.

Medium, because it is two repos and an OMP backport diff; each change
is a few lines following the MARC 773 pattern, with a unit test.

## Evidence

- Kept walk: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-source-empty-part/walk.js)
  takes the Steps on PKP's default test dataset (pkp/datasets 38ab955,
  2026-09-30, PostgreSQL): on OJS it signs in as `dbarnes` and publishes
  submissions 5 and 6 through the screens, then reads the three records
  signed out; on OMP it reads ListRecords.
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-source-empty-part/neighbour.js)
  reads OJS articles 1 and 17, both in an issue. Both read the page and
  the raw XML through
  [source.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-source-empty-part/source.js).
  Run from pkp-e2e on a freshly loaded dataset: `PROBE_FEATURE=issues-w11
  PROBE_AGENT=w11 node bin/probe.js all
  shared/playwright/checks/issues/oai-source-empty-part/walk.js`; 3.5 the
  same with `PKP_E2E_LINE=stable-3_5_0 ONLY=omp` in front. The fix was
  tried with `node bin/try-fix.js apply …/fix-ojs.diff ojs` and `…
  fix-omp.diff omp`.
- Walked on `main` (OJS, OMP) and `stable-3_5_0` (OMP), each on a fresh
  load of that branch's dataset: the Observed values above on all three.
- Not walked: OPS (no `dc:source`). OJS on 3.5, whose steps cannot be
  taken there: `APP\publication\Repository::validatePublish()` refuses
  to publish without an issue (`publication.required.issue`) and
  `OAIDAO` inner-joins the issues table, so every listed article has an
  issue part.
- Tips walked or read:
  - main: OJS bade233f73, OMP 3b0ecf794c; pkp-lib 2e377d27fc (OJS),
    3dc90c81a6 (OMP).
  - stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00d; pkp-lib a9c76aed62.
    OMP's adapter has the same unconditional `'; '`.
  - stable-3_4_0 (code): OJS 9571d8fde7, OMP 0aec65441f; pkp-lib
    df13621c2d. OMP's adapter appends `'; '` then
    `$monograph->getPages()` (`PKPSubmission::getPages()`, the current
    publication's pages, empty for books). OJS's writes the issue with
    `$issue->getIssueIdentification()`; publishing requires an issue.
  - stable-3_3_0 (code): OJS 9fdb9bcf9a, OMP 8e72fc8836; pkp-lib
    d446601ebe. Same as 3.4 (`.inc.php` files).
- Introduced: `git blame` on the OJS line gives 1fb080776e
  ("pkp/pkp-lib#9295 separate component for issue selection"); the
  GitHub API gives `pkp/ojs#5039`
  ("pkp/pkp-lib#9295 continuous publication implementation update",
  merged 2025-09-12). Before it, the line read
  `'; ' . $issue->getIssueIdentification([], $locale)` (last touched by
  a200614c74, 2024), which was correct as long as every listed article
  had an issue.
  OMP: blame gives 01088072a8 (PSR-12 reformatting, 2021); `git log -S`
  traces the unconditional `'; '` back to c742bfc20f ("*7206*
  Introduced dublin core filter and metadata format plugins",
  2012-03-19, PKP's old tracker), where it first appears in
  `Dc11SchemaMonographAdapter.inc.php`.
- Upstream search (2026-10-01), pkp/pkp-lib, pkp/ojs and pkp/omp, by
  symptom words and by both adapter class names: `pkp/pkp-lib#3148` (the issue
  part in the primary language only, closed with a fix) and
  `pkp/pkp-lib#7527` (the journal's current name used for old articles,
  open) concern "Source" but are other faults.
