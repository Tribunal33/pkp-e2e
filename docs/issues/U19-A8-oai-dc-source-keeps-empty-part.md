# The OAI-PMH Dublin Core "Source" ends in "; " for an article in no issue and for every book

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS (an article in no issue), OMP (OPS writes no "Source")
  - 3.5: OMP (OJS publishes only in an issue; OPS writes no "Source")
  - 3.4: OMP (code; OJS and OPS as on 3.5)
  - 3.3: OMP (code; OJS and OPS as on 3.5)
- **Introduced** OJS: `pkp/ojs#5039` for `pkp/pkp-lib#9295` ·
  [1fb080776e](https://github.com/pkp/ojs/commit/1fb080776ef774c6c31e12e2450de0c29c4183c8)
  · 2025-08-06 · Touhidur Rahman (touhidurabir). OMP:
  [c742bfc20f](https://github.com/pkp/omp/commit/c742bfc20f84d7d273f5346e7e067b29a86d168a)
  · 2012-03-19 · Bruno Beghelli, the commit that first wrote the line
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U19 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a8)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

The "Source" of a journal article's Dublin Core record is meant to read
"{journal name}; {issue}; {pages}", leaving out a part the article
lacks together with its separator. An article published without an
issue reads "{journal name}; " instead, and "{journal name}; ; 15-20"
when it has pages: the separator of the missing issue stays.

Every book record of a press reads "{press name}; ", since a book has
neither an issue nor pages.

The names and pages in the line are right; it is malformed for whoever
splits it at "; ".

The press half is long-standing and shows on every press. The journal
half is new and not yet released: it needs an article published with
"Don't Assign To An Issue", a choice that journals did not have before.

## Impact

- **Lost.** Nothing: the line carries a trailing or doubled separator.
- **Who.** Harvesters of the OAI-PMH address. No harvester was shown to
  split the line at "; ".
- **Way round.** None on screen.

Low: a wrong value in a secondary output that nothing was shown to rely
on. It would be medium if a harvester were shown to reject or misfile
such a line.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: the press "Public Knowledge
  Press" and the journal "Journal of Public Knowledge", both at
  `publicknowledge`.
- The journal steps are for `main`: on 3.5 "Don't Assign To An Issue"
  does not exist, so they cannot be taken there.

On the press (nobody signs in):

1. Open `/index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=oai_dc`
   and read "Source" in each record.

On the journal:

1. Sign in as `dbarnes` and open submission 17, "Antimicrobial, heavy
   metal resistance and plasmid profile of coliforms isolated from
   nosocomial infections in a hospital in Isfahan, Iran" (published in
   "Vol. 1 No. 2 (2014)", no pages).
2. Press "Unpublish" and confirm.
3. Press "Title & Abstract" in the "Publication" menu, then "Schedule
   For Publication". (After an "Unpublish" the submission may reopen on
   a workflow stage; the steps use a publication page so that the
   button is always in the same place.) In "Review Publishing Details"
   choose "Don't Assign To An Issue", press "Confirm", then "Publish".
4. Open `/index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=oai_dc`
   and read "Source" in the record whose identifier ends in
   "article/17".
5. Back in the submission, press "Unpublish" and confirm. Press
   "Publication Settings", type "15-20" in "Pages", press "Save". Press
   "Schedule For Publication": this time the question "Are you sure
   you want to publish this?" opens at once, without "Review Publishing
   Details", and says "This will be published immediately without any
   issue association." Press "Publish".
6. Open the address of step 4 again.

**Expected.** The press: "Public Knowledge Press". The journal: "Journal
of Public Knowledge" at step 4 and "Journal of Public Knowledge; 15-20"
at step 6.

**Observed.** The press, in both of its records:

```xml
<dc:source xml:lang="en">Public Knowledge Press; </dc:source>
<dc:source xml:lang="fr-CA">Press de la connaissance du public; </dc:source>
```

The journal, at step 4 and at step 6:

```xml
<dc:source xml:lang="en">Journal of Public Knowledge; </dc:source>
<dc:source xml:lang="fr-CA">Journal de la connaissance du public; </dc:source>

<dc:source xml:lang="en">Journal of Public Knowledge; ; 15-20</dc:source>
<dc:source xml:lang="fr-CA">Journal de la connaissance du public; ; 15-20</dc:source>
```

Control: article 1, in the issue with pages, reads "Journal of Public
Knowledge; Vol. 1 No. 2 (2014); 71-98", and article 17 before step 2
reads "Journal of Public Knowledge; Vol. 1 No. 2 (2014)".

## Cause

OJS, `Dc11SchemaArticleAdapter::extractMetadataFromDataObject()`
([lines 185 to 193 on main](https://github.com/pkp/ojs/blob/06fd981b01c2793a006d0c2929f805dca2f781b7/plugins/metadata/dc11/filter/Dc11SchemaArticleAdapter.php#L185-L193)):

```php
$sources = $journal->getName(null);
$pages = $publication->getData('pages') ?: $publication->getData('articleNumber');
if (!empty($pages)) {
    $pages = '; ' . $pages;
}
foreach ($sources as $locale => $source) {
    $sources[$locale] .= '; ' . $issue?->getIssueIdentification([], $locale);
    $sources[$locale] .= $pages;
}
```

The pages (or the article number in their place) get their "; " only
when they exist; the issue gets its "; " always. Until
`pkp/pkp-lib#9295` every published article had an issue. That change
let an article be published without one and made the call null-safe
(`$issue?->`), which stops the error and leaves the separator.

OMP, `Dc11SchemaPublicationFormatAdapter::extractMetadataFromDataObject()`
([lines 232 to 240 on main](https://github.com/pkp/omp/blob/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262/plugins/metadata/dc11/filter/Dc11SchemaPublicationFormatAdapter.php#L232-L240)):

```php
$sources = $press->getName(null);
$pages = $publication->getData('pages');
if (!empty($pages)) {
    $pages = '; ' . $pages;
}
foreach ($sources as $locale => $source) {
    $sources[$locale] .= '; ';
    $sources[$locale] .= $pages;
}
```

The "; " is appended with no part after it. `$pages` is always empty:
OMP's publication has no `pages` property, so the lines around it do
nothing.

Reach:

- OJS: every article published with "Don't Assign To An Issue", in
  every language of the journal (on screen).
- OMP: every record of every press, in every language (on screen).
- OPS writes no "Source" (on screen on 3.5, code on main).
- The same parts are joined in one other place, which is right: OJS's
  `OAIMetadataFormat_MARC21::getRelatedParts()` and
  `OAIMetadataFormat_MARC::getRelatedParts()` (line 94 of each) build
  the issue and the pages or article number with
  `implode(', ', array_filter([...]))`, which drops a missing part with
  its separator (code). The Dublin Core meta tags of the article page
  write the journal's name alone (code).

## Proposed fix

A proposal, tried on main:
[`fix-ojs.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-dc-source-keeps-empty-part/fix-ojs.diff)
applied to OJS and
[`fix-omp.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-dc-source-keeps-empty-part/fix-omp.diff)
to OMP. The press and the journal's steps 4 and 6 then read as
Expected. Articles in the issue are unchanged: article 1 still reads
"Journal of Public Knowledge; Vol. 1 No. 2 (2014); 71-98", and article
17 put back in the issue reads "Journal of Public Knowledge; Vol. 1 No.
2 (2014); 15-20".

Recommended for OJS: join the parts the way the two MARC formats
already do, so the three record formats build the line by one pattern
and an issue whose identification is empty is covered too.

```diff
--- a/plugins/metadata/dc11/filter/Dc11SchemaArticleAdapter.php
+++ b/plugins/metadata/dc11/filter/Dc11SchemaArticleAdapter.php
@@ -184,12 +184,12 @@
         // Source (journal title, issue id and pages or article number)
         $sources = $journal->getName(null);
         $pages = $publication->getData('pages') ?: $publication->getData('articleNumber');
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
         $this->addLocalizedElements($dc11Description, 'dc:source', $sources);
         if ($issn = $journal->getData('onlineIssn')) {
```

Recommended for OMP: write the press name alone and remove the pages
lines with the separator, since they read a property that does not
exist.

```diff
--- a/plugins/metadata/dc11/filter/Dc11SchemaPublicationFormatAdapter.php
+++ b/plugins/metadata/dc11/filter/Dc11SchemaPublicationFormatAdapter.php
@@ -228,17 +228,8 @@
             $dc11Description->addStatement('dc:identifier', $identificationCode->getValue());
         }
 
-        // Source (press title and pages)
-        $sources = $press->getName(null);
-        $pages = $publication->getData('pages');
-        if (!empty($pages)) {
-            $pages = '; ' . $pages;
-        }
-        foreach ($sources as $locale => $source) {
-            $sources[$locale] .= '; ';
-            $sources[$locale] .= $pages;
-        }
-        $this->addLocalizedElements($dc11Description, 'dc:source', $sources);
+        // Source (press title)
+        $this->addLocalizedElements($dc11Description, 'dc:source', $press->getName(null));
 
         // Language
         $submissionLanguage = $monograph->getData('locale');
```

**Alternatives:**

- OJS: keep the appending and wrap the issue line in `if ($issue)`.
  Two lines fewer to change, also tried, with the same result; but it
  keeps a second way of joining these parts beside the MARC formats',
  and an issue with an empty identification would still leave "; ; ".
- OMP: delete only the `.= '; '` line and keep the dead pages lines, if
  the press is meant to gain pages later.
- Drop "Source" from OMP's record, since it only repeats the press
  name given as "Publisher": a change of what harvesters receive, for
  the team to weigh.

**What goes with it:**

- The line changes for harvesters on their next harvest of the affected
  records. No stored data, hook or API changes.
- Backport: OMP's lines are on `stable-3_5_0`, `stable-3_4_0` and
  `stable-3_3_0` too, with other lines around them (`$monograph->getPages()`
  on 3.4 and 3.3), so the removal is made by hand there. OJS needs
  none.
- Guard: OJS's `OAIMetadataFormat_DCTest` asserts the line for an
  article in an issue. A no-issue case needs the mocked
  `$oaiDao->getIssue()` in `createOAIRecord()` to return null, for
  example through a parameter like its `withAbstract`. OMP has no test
  of this record; a pkp-e2e test would read both lines.

Medium only because the change is made in two repos: five lines
replaced in OJS with a test case, eleven replaced by two in OMP.

## Evidence

- Kept script that takes the Steps on installs freshly loaded from
  PKP's default test dataset (pkp/datasets 2c84c3c, 2026-10-01, the
  `main` and `stable-3_5_0` PostgreSQL dumps, no upgrade needed):
  [`shared/playwright/checks/issues/oai-dc-source-keeps-empty-part/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-dc-source-keeps-empty-part/walk.js),
  run with `PROBE_FEATURE=issues-a7 PROBE_AGENT=a7 node bin/probe.js all shared/playwright/checks/issues/oai-dc-source-keeps-empty-part/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It reads the XML
  itself, where the trailing space shows.
- Where the walk differed from the Steps: at steps 4 and 6 it opened
  `verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:ojs2.localhost:article/17`,
  the identifier under the dataset's own config, in place of the list.
- On 3.5 the script read the press's list (the same two lines as on
  main), the journal's list (both articles in the issue, no empty
  part; the publish steps are not taken there) and the preprint
  server's list (no "Source" in its 17 records).
- The fixes, tried with `node bin/try-fix.js apply shared/playwright/checks/issues/oai-dc-source-keeps-empty-part/fix-ojs.diff ojs`
  and `node bin/try-fix.js apply shared/playwright/checks/issues/oai-dc-source-keeps-empty-part/fix-omp.diff omp`,
  then `walk.js` as above, then `revert` in place of `apply`. The
  `if ($issue)` alternative for OJS and the one-line removal for OMP
  were tried the same way before the diffs took their present form.
- main walked at OJS 06fd981b01 (lib/pkp 2e377d27fc) and OMP 3b0ecf794c
  (lib/pkp 3dc90c81a6); 3.5 at OJS 18d097d94e, OMP b24879c3db and OPS
  3f0919468c (lib/pkp 1fb843f491), on PostgreSQL.
- Code read on main: OJS `plugins/metadata/dc11/filter/Dc11SchemaArticleAdapter.php`
  (the source lines), `plugins/oaiMetadataFormats/marcxml/OAIMetadataFormat_MARC21.php`
  and `plugins/oaiMetadataFormats/marc/OAIMetadataFormat_MARC.php`
  (`getRelatedParts()`, added by 7c3d13bdb6 for `pkp/pkp-lib#12609`,
  2026-09-15), `plugins/generic/dublinCoreMeta/DublinCoreMetaPlugin.php`,
  `plugins/oaiMetadataFormats/dc/tests/OAIMetadataFormat_DCTest.php`;
  OMP `plugins/metadata/dc11/filter/Dc11SchemaPublicationFormatAdapter.php`
  and `schemas/publication.json` with lib/pkp's (no `pages`); OPS
  `plugins/metadata/dc11/filter/Dc11SchemaPreprintAdapter.php` (no
  `dc:source`).
- 3.5, 3.4 and 3.3 by code. OMP: the adapter on `stable-3_5_0`
  (b24879c3db), pkp/omp `stable-3_4_0` (0aec65441) and `stable-3_3_0`
  (8e72fc883) appends "; " unconditionally. OJS: the adapter on
  `stable-3_5_0` (18d097d94e), `stable-3_4_0` (9571d8fde7) and
  `stable-3_3_0` (9fdb9bcf9a) calls `$issue->getIssueIdentification()`
  on an issue that publishing requires (`publication.required.issue`
  in each branch's publish validation). OPS on 3.4 and 3.3 was not
  read; its sub-items rest on main and 3.5.
- Introduced: `git blame` on OJS's line 191 gives 1fb080776e, whose PR
  the GitHub API names as `pkp/ojs#5039` (merged 2025-09-12). In OMP,
  c742bfc20f ("*7206* Introduced dublin core filter and metadata format
  plugins") added the lines in `Dc11SchemaMonographAdapter.inc.php`;
  913e80287 (2012-03-24) renamed that file to
  `Dc11SchemaPublicationFormatAdapter.inc.php`, so `git log` needs
  `--follow` to reach it. Bruno Beghelli's GitHub handle was not looked
  up.
- Upstream search, 2026-10-01, issues and PRs, open and closed:
  pkp/pkp-lib by "dc:source OAI", "OAI source semicolon", ""dc:source"
  issue continuous", "Dc11SchemaArticleAdapter" and
  "Dc11SchemaPublicationFormatAdapter"; pkp/ojs and pkp/omp by
  "dc:source"; pkp/omp by "OAI source press name". `pkp/pkp-lib#3148`
  (closed, the line's language) and `pkp/pkp-lib#7527` (open, journal
  details as they were at publication) are other faults.
- Not driven: an article in no issue with an "Article Number" in place
  of pages (the same `$pages` variable in the code), an issue whose
  identification is empty, OPS on main, and the unit test.
