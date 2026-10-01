# A press's OAI-PMH record lists answer a server error once one book is published without an abstract

- **Severity** high
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OMP
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/omp#2398` for `pkp/pkp-lib#12950` · [b9f8323fbf](https://github.com/pkp/omp/commit/b9f8323fbf6b4765a00323584a8e129879dd78f9) · 2026-07-07 · Kaitlin Newson (kaitlinnewson)
- **Upstream** none found (2026-10-01); the same fault in OJS was fixed by `pkp/ojs#5753` for `pkp/pkp-lib#12922`, which covers OJS only
- **Tracked in** spec U19 [OMP4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#omp4)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

When a press publishes a book that has no abstract in any language,
which the press's forms allow at submission and in the workflow, the
press's OAI-PMH ListRecords answers a server error instead of the page
of the list that holds the book. GetRecord for that book fails the same
way. ListIdentifiers still answers.

ListRecords is served in pages of up to 100 records. A harvester gets
status 500 and an empty answer for the page that holds the book, so it
loses every record of that page and cannot go on to the pages after
it. On a press with fewer than 100 records that is the whole list. The
site-wide address fails on the same page, which there also holds the
other presses' records.

Nothing tells the press: the book's page and the workflow look right.
The list answers once the book has an abstract. Dublin Core is the only
format a press offers, so the harvester has no other format to ask for.

## Impact

- **Lost.** The Dublin Core records harvesters collect: the page of
  ListRecords that holds the book and, for a harvester reading the
  pages in order, every page after it. At the site-wide address that
  includes other presses' records.
- **Who.** Outside harvesters and the indexes behind them, on any
  install where one press has one published book without an abstract.
  How often presses publish such a book was not established.
- **Way round.** An editor who knows the cause unpublishes the book,
  types an abstract and publishes again. The error is written only to
  the PHP error log, which does not name the book.

High: a press with fewer than 100 records loses its whole record list,
silently, after one ordinary action, until someone finds the book.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`: the press "Public
  Knowledge Press" (`publicknowledge`) and its two published books, 5
  "Bomb Canada and Other Unkind Remarks in the American Media" and 14
  "From Bricks to Brains: The Embodied Cognitive Science of LEGO
  Robots". Nothing else is needed.

Steps:

1. Signed out, open `/index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=oai_dc`.
2. Sign in as `dbarnes` and open submission 14, "From Bricks to Brains:
   The Embodied Cognitive Science of LEGO Robots". Its workflow opens.
3. Press "Unpublish", in the top right corner of the workflow, and
   confirm with "Unpublish".
4. Open Publication › "Title & Abstract", delete the whole text of
   "Abstract" and press "Save". "Saved" shows. (In the dataset book 14
   has an abstract in English only; the French box is already empty.)
5. Press "Publish". The window reads "All publication requirements have
   been met."; press "Publish".
6. Open the book's page, `/index.php/publicknowledge/en/catalog/book/14`.
7. Open the address of step 1 again.
8. Open the site-wide list,
   `/index.php/index/oai?verb=ListRecords&metadataPrefix=oai_dc`, and
   the same with `&set=publicknowledge`.
9. Open `/index.php/publicknowledge/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:omp.localhost:publicationFormat/3`
   (book 14's record, as step 1 names it), then the same with
   `publicationFormat/2` (book 5's).
10. Open `/index.php/publicknowledge/oai?verb=ListIdentifiers&metadataPrefix=oai_dc`.

Getting round it:

11. Open submission 14 again, press "Unpublish" in the top right corner
    and confirm; on "Title & Abstract" type "Abstract u19omp4" into "Abstract" and press "Save";
    press "Publish", then "Publish".
12. Open the address of step 1 again.

**Expected.** Steps 7 and 8 list the two records that step 1 lists,
book 14's without a `dc:description`. Step 9 answers each record.

**Observed.** Step 1 shows "OAI 2.0 Request Results" with two records.
Step 6 shows the book's page. Steps 7 and 8 (both addresses) and step 9
for `publicationFormat/3` each show an empty page; the answer has
status 500 and no body (the dataset's config has `display_errors` Off):

```
GET /index.php/publicknowledge/en/oai?verb=ListRecords&metadataPrefix=oai_dc   500   (0 bytes)
```

The PHP error log, for each of them:

```
PHP Fatal error:  Uncaught TypeError: APP\plugins\metadata\dc11\filter\Dc11SchemaPublicationFormatAdapter::addLocalizedElements(): Argument #3 ($localizedValues) must be of type array, null given, called in …/plugins/metadata/dc11/filter/Dc11SchemaPublicationFormatAdapter.php on line 112 and defined in …/plugins/metadata/dc11/filter/Dc11SchemaPublicationFormatAdapter.php:307
```

Step 9 for `publicationFormat/2` answers book 5's record, and step 10
lists both identifiers. After step 11, step 12 lists the two records
again, book 14's with "Abstract u19omp4".

Control: on 3.5 the same steps list both records at steps 7 to 9, book
14's without a `dc:description`.

## Cause

OMP's `Dc11SchemaPublicationFormatAdapter::extractMetadataFromDataObject()`
passes the publication's abstract to a method that no longer takes
"no abstract"
([`plugins/metadata/dc11/filter/Dc11SchemaPublicationFormatAdapter.php`, line 112 on main](https://github.com/pkp/omp/blob/3b0ecf794c/plugins/metadata/dc11/filter/Dc11SchemaPublicationFormatAdapter.php#L112)):

```php
$this->addLocalizedElements($dc11Description, 'dc:description', $publication->getData('abstract'));
```

`getData('abstract')` is `null` when the publication has no abstract in
any language: an emptied "Abstract" stores no row. `pkp/omp#2398`
renamed the untyped `_addLocalizedElements($description, $propertyName,
$localizedValues)` to `addLocalizedElements(MetadataDescription
&$description, string $propertyName, array $localizedValues): void`
(line 307). The new `array` type refuses the `null` with a `TypeError`
before the method's own `(array) $localizedValues` cast, which used to
absorb it, can run.

Nothing catches the exception, so the whole OAI answer fails, not only
the one record: `OAI::ListRecords()` builds a page of up to
`oai_max_records` (100) records in one loop. The press cannot prevent the state: `TitleAbstractForm`
marks "Abstract" required only when its caller says so, and no OMP code
does, at submission or in the workflow.

The PR was for the version relations in the Dublin Core record
(`pkp/pkp-lib#12950`) and tidied the adapter's signatures on the way.

Reach, checked in the code unless marked:

- ListRecords at the press and site-wide, with and without the press's
  set, and GetRecord of the book's format: fail (reproduced, steps 7 to
  9). `oai_dc` is the only metadata format a press offers, and this
  adapter builds it.
- Only the page that holds the book's record fails; the pages before
  it answer, and the pages after it need the token the failed page
  would have given. The site-wide list pages every press's records
  together, so the failing page takes other presses' records with it.
- ListIdentifiers, and GetRecord of another book: not touched, they
  build no record of the book (reproduced, steps 9 and 10).
- A book with several publication formats has one record per format,
  each built from the same publication, so each fails.
- The other eight calls to `addLocalizedElements()` in the adapter pass
  arrays (`getFullTitles()`, `getFullNames()`, the built subjects,
  types and sources, the press's names), cast (`coverage`) or sit
  behind `is_array()` (`dc:contributor`, line 129).
- The book's page reads the abstract with `?: []`
  (`DublinCoreMetaPlugin`) and opened (step 6).
- OPS's `Dc11SchemaPreprintAdapter` got the same typed method from the
  same change (`pkp/ops#1337`) and has the same uncast call (lines 231
  and 108), so it needs the same two lines; OJS's got them in
  `pkp/ojs#5753`.
- No stored data is wrong.

## Proposed fix

A proposal, tried on main:
[`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/book-without-abstract-oai-lists-fail/fix.diff)
applied to OMP. With it, the Steps show Expected: steps 7 to 9 answer
both records, book 14's without a `dc:description` and with its other
20 elements. With both abstracts in place, the lists and GetRecord
answer the same XML with the fix in and out.

Recommended: the two changes `pkp/ojs#5753` made to OJS's adapter, in
OMP's.

```diff
--- a/plugins/metadata/dc11/filter/Dc11SchemaPublicationFormatAdapter.php
+++ b/plugins/metadata/dc11/filter/Dc11SchemaPublicationFormatAdapter.php
@@ -109,7 +109,7 @@
         $this->addLocalizedElements($dc11Description, 'dc:subject', $subjects);
 
         // Description
-        $this->addLocalizedElements($dc11Description, 'dc:description', $publication->getData('abstract'));
+        $this->addLocalizedElements($dc11Description, 'dc:description', (array) $publication->getData('abstract'));
 
         // Publisher
         $publisher = $press->getData('publisher');
@@ -307,7 +307,7 @@
     private function addLocalizedElements(
         MetadataDescription &$description,
         string $propertyName,
-        array $localizedValues
+        ?array $localizedValues
     ): void {
         foreach (stripAssocArray((array) $localizedValues) as $locale => $values) {
             if (is_scalar($values)) {
```

The fix belongs in OMP's adapter: each app has its own, with its own
private `addLocalizedElements()`, and no shared method to mend. The
cast mends the one call that can pass `null` today; `?array` lets the
method take `null` again, which its body already handles, so a later
call with an optional value cannot fail the list.

**Alternatives:**

- The cast alone, or `?array` alone: either one makes the lists answer.
  Both together is what OJS has, and keeps the three adapters alike.
- Requiring an abstract on a press: a product change, and it would not
  mend books already published without one.

**What goes with it:**

- No API or hook change: requests that failed now answer.
- No backport: the stable branches do not have the change.
- Guard: OMP's repo has no test of its Dublin Core format. Proposed: a
  unit test in OMP like OJS's
  `OAIMetadataFormat_DCTest::testToXmlWithoutAbstract()`, added with
  OJS's fix, which builds the record of a publication without an
  abstract and checks it has a title and no `dc:description`. pkp-e2e
  adds its own OAI-PMH scenario for a book without an abstract once
  the fix is in.

Small: two lines in one file, following OJS's adapter.

## Evidence

- Kept script that takes the Steps on OMP as `dbarnes`, on an install
  freshly loaded from PKP's default test dataset (pkp/datasets 2c84c3c,
  2026-10-01, the `main` and `stable-3_5_0` PostgreSQL dumps):
  [`shared/playwright/checks/issues/book-without-abstract-oai-lists-fail/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/book-without-abstract-oai-lists-fail/walk.js),
  run with `PROBE_FEATURE=issues-omp4 PROBE_AGENT=omp4 node bin/probe.js omp shared/playwright/checks/issues/book-without-abstract-oai-lists-fail/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It opens each OAI
  address in the browser and reads the raw XML beside it, signed out.
  The script builds nothing; it reads the stored abstract rows after
  each save (none after step 4, one after step 11).
- The addresses in the Steps redirect to the same address with the
  language in it (`/index.php/publicknowledge/en/oai?…`), which is the
  request that answers. `omp.localhost` in step 9 is the dataset's
  repository identifier.
- In step 5 the window is headed "Schedule For Publication" and its
  button reads "Publish". In step 4 the script empties the box with
  select-all and Delete.
- The fix, tried with `node bin/try-fix.js apply shared/playwright/checks/issues/book-without-abstract-oai-lists-fail/fix.diff omp`,
  then `walk.js` as above, and the same script with `neighbour` as its
  argument on the untouched dataset with the fix in and out: the
  press's list, the site-wide list with and without the set, GetRecord
  of each book and ListIdentifiers gave the same records, element for
  element. Reverted with `node bin/try-fix.js revert …/fix.diff omp`.
- main walked at OMP 3b0ecf794c (lib/pkp 3dc90c81a6); 3.5 at OMP
  b24879c3db (lib/pkp 1fb843f491). On 3.5 the walk answered 200 at
  every step, and `Dc11SchemaPublicationFormatAdapter.php` there has
  the untyped `_addLocalizedElements()` (line 268) called with the
  uncast abstract (line 111).
- 3.4 and 3.3 by code: OMP `upstream/stable-3_4_0` (0aec65441f) and
  `upstream/stable-3_3_0` (8e72fc8836) have the untyped
  `_addLocalizedElements()` (lines 266 and 239) with the `(array)` cast
  in its body; b9f8323fbf is on neither branch, nor on `stable-3_5_0`.
- Introduced: `git blame` on lines 112 and 307 to 311 gives b9f8323fbf,
  whose diff replaces the untyped method with the typed one and leaves
  the call uncast; GitHub's `commits/<sha>/pulls` gives `pkp/omp#2398`
  (merged 2026-07-22), listed in `pkp/pkp-lib#12950`.
- Code read on main: OMP's adapter whole; OJS's
  `Dc11SchemaArticleAdapter` (the call on line 109, the method on
  line 320) and its fix
  b0c6b99642; OPS's `Dc11SchemaPreprintAdapter` (lines 108 and 231);
  lib/pkp `OAI::ListRecords()` (the loop over one page's records) and
  `TitleAbstractForm` and every use of `isAbstractRequired` in
  OMP and its lib/pkp (none sets it); OMP's
  `plugins/oaiMetadataFormats` (only `dc`); a search of the three apps'
  plugins and of lib/pkp for `array $localizedValues`, and of OMP for
  `getData('abstract')`.
- The preprint server's side is tracked apart, as spec U19 OPS2, in
  the regression report
  [`docs/reports/2026-09-25-ops-oai-empty-abstract.md`](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/reports/2026-09-25-ops-oai-empty-abstract.md).
  Nothing was driven on OPS or OJS here.
- Upstream search, 2026-10-01, pkp/pkp-lib and pkp/omp, issues and PRs, open and closed, by "OAI abstract
  empty", "OAI ListRecords 500 abstract", "OAI monograph without
  abstract", "oai_dc null given", "addLocalizedElements" and
  "Dc11SchemaPublicationFormatAdapter": nothing on this fault in the
  press. `pkp/pkp-lib#12922` (closed) carries OJS's fix; its notes say
  OMP and OPS are "covered separately under a sub-issue, for future",
  about per-version records. That sub-issue could not be named: the
  issue's page counts two sub-issues, names `pkp/pkp-lib#12950` and
  not the other.
- The walks ran on PostgreSQL; the fault does not depend on the
  database. They ran with `display_errors` Off, the dataset's setting;
  the error line was read from the PHP built-in server's log.
- Unverified:
  - Paging and the site-wide reach are from the code, not driven: the
    dataset has one press with two records, so the whole list failed
    at both addresses. On a longer list only the page that holds the
    book fails, and at the site-wide address that page holds other
    presses' records too.
  - A book submitted by an author with the abstract left empty and
    then published: by the code it stores no abstract either; the walk
    emptied the abstract of a published book instead.
  - A book with an abstract in French only: by the code the value is
    an array and the lists answer.
