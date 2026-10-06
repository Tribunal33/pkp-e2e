# A category, series or catalog page with one item reads "1 Items" or "1 Titles"

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** not traced; present since at least [fa16697d1f](https://github.com/pkp/ojs/commit/fa16697d1f5e77562f349df98e32c376d0dca28b) (2019-02-07, OJS and OPS's "{$numTitles} Items") and [52df855c59](https://github.com/pkp/omp/commit/52df855c59a26832353324486789159f965d5605) (2015-09-04, OMP's "{$numTitles} Titles")
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U16 [A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U16-categories.md#a19), spec U68 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U68-catalog-browse.md#a1)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A visitor who opens a category holding one published item reads "1
Items" above it ("1 Titles" on a press) where "1 Item" ("1 Title") is
expected. On a press, the catalog page, a series' page, the "New
Releases" page and the catalog search results do the same when they
list one book.

The item is listed and the number is right; only the wording is wrong.
Translated sites show the same fault in their own language ("1
Elemente" in German, "1 elementos" in Spanish), because the app has one
text for every count.

## Impact

- **Lost**: nothing; the count line's grammar is wrong.
- **Who**: every visitor to a category with one item. On a press also:
  a series with one book, and the catalog, "New Releases" or a search
  when it lists one book. A new series or category often starts with
  one item.
- **Way round**: none. A custom locale file cannot help, since the one
  text serves every count.

Low: wording only, on a public page whose content is right. The effort
is medium because the fix touches three repos: a new text in each app
and the count line of seven templates.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS, OMP or OPS `main`, freshly
  loaded. A published version cannot be edited, so the steps unpublish
  a published item, place it in the empty category "Anthropology" and
  publish it again: OJS submission 17, "Antimicrobial, heavy metal
  resistance and plasmid profile of coliforms isolated from nosocomial
  infections in a hospital in Isfahan, Iran"; OMP submission 5, "Bomb
  Canada and Other Unkind Remarks in the American Media"; OPS
  submission 2, "The Facets Of Job Satisfaction: A Nine-Nation
  Comparative Study Of Construct Equivalence".

A press's series, with nothing to create (OMP only):

1. Signed out, open the series "Psychology", which holds one book,
   "From Bricks to Brains": `/index.php/publicknowledge/catalog/series/psy`.

A category, on all three apps:

2. Sign in as `dbarnes`.
3. Open the submission from the editorial dashboard
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=<id>`).
4. Press "Unpublish" (on a preprint server "Unpost") and confirm with
   "Unpublish" ("Unpost").
5. Open "Publication Settings" in the side menu (on a press "Catalog
   Entry", on a preprint server "Preprint entry").
6. Under "Categories", type "Anthr", choose the suggestion "Social
   Sciences > Anthropology", and press "Save".
7. Press "Schedule For Publication" ("Publish" on a press, "Post" on a
   preprint server) and confirm with "Publish" ("Post").
8. Log out, and open the category "Anthropology":
   `/index.php/publicknowledge/catalog/category/anthropology` (on a
   preprint server `/index.php/publicknowledge/preprints/category/anthropology`).

**Expected:** "1 Title" on the series page; on the category page "1
Item" ("1 Title" on a press) above the one item.

**Observed:** the series page reads "1 Titles" above "From Bricks to
Brains". The category page reads, below the breadcrumb:

```
Anthropology
1 Items
All Items
Antimicrobial, heavy metal resistance and plasmid profile of …
```

On OMP "1 Titles" and "Bomb Canada and Other Unkind Remarks in the
American Media"; on OPS "1 Items" and "The Facets Of Job Satisfaction:
…".

On `stable-3_5_0` the same: "1 Titles" on the series page, "1 Items"
and "1 Titles" on the category pages. [On 3.5, step 6 ticks a checkbox
under "Categories" instead of typing; the field is on the "Issue" page
on a journal. The 3.5 preprint server's dataset has other categories,
so there the steps tick "Mathematics" and open
`/index.php/publicknowledge/preprints/category/mathematics`.]

Control: a count other than one reads right: "0 Items" on an empty
category, "2 Titles" on the press's catalog page.

## Cause

Each app's count line has one text for every number. The English
`catalog.browseTitles` is "{$numTitles} Items" in OJS and OPS
([OJS `locale/en/submission.po` line 155](https://github.com/pkp/ojs/blob/b84f8e2e44/locale/en/submission.po#L155),
[OPS line 58](https://github.com/pkp/ops/blob/c8af945bb7/locale/en/submission.po#L58))
and "{$numTitles} Titles" in OMP
([line 333](https://github.com/pkp/omp/blob/3b0ecf794c/locale/en/submission.po#L333)),
and every template prints it with the count and nothing else, e.g.
`{translate key="catalog.browseTitles" numTitles=$results->total()}`.
The text has never had a singular form in any of the three apps.

Reach (read in the code; the pages in Steps were also seen on screen):

- OJS and OPS: the category page (`catalogCategory.tpl`), the only use.
- OMP: the category page, the catalog (`catalog.tpl`), a series' page
  (`catalogSeries.tpl`), "New Releases" (`catalogNewReleases.tpl`) and
  the search results (`search.tpl`, which also says "One title was
  found…" correctly under it).
- Every other language has one text too: German "{$numTitles}
  Elemente", Spanish "{$numTitles} elementos", Brazilian Portuguese
  "{$numTitles} Itens". No locale file of the three apps or pkp-lib uses
  plural forms.
- Languages with more than two plural forms are wrong for more counts
  than one. OMP's Polish text, "{$numTitles} Tytuły", is the form for 2
  to 4 only. Its Czech text, "{$numTitles} titulů", is the form for 5
  and up only.

## Proposed fix

Add a singular text in each app and let the templates choose it for
one, as OMP's search results already do with `catalog.foundTitleSearch`
/ `catalog.foundTitlesSearch`.

```diff
--- a/locale/en/submission.po
+++ b/locale/en/submission.po
+msgid "catalog.browseTitle"
+msgstr "1 Item"
+
 msgid "catalog.browseTitles"
 msgstr "{$numTitles} Items"
--- a/templates/frontend/pages/catalogCategory.tpl
+++ b/templates/frontend/pages/catalogCategory.tpl
 	<div class="article_count">
-		{translate key="catalog.browseTitles" numTitles=$results->total()}
+		{if $results->total() == 1}
+			{translate key="catalog.browseTitle"}
+		{else}
+			{translate key="catalog.browseTitles" numTitles=$results->total()}
+		{/if}
 	</div>
```

OMP's text is "1 Title", and its five templates take the same `{if}`.
The diffs, one per app:
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/one-item-reads-1-items/fix-ojs.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/one-item-reads-1-items/fix-omp.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/one-item-reads-1-items/fix-ops.diff).
Tried on `main`, all three apps: the pages then matched the Expected.
An empty category still read "0 Items" ("0 Titles"), and the press's
catalog "2 Titles", with the fix in and out.

The fix has a limit: it chooses the singular for 1 only, so a language
whose singular also covers 0 stays wrong there (French says "0 titre",
not "0 titres"). Plural forms, the first alternative below, would get
that right, but they cannot be added one language at a time. The
singular text fixes English and every language whose singular is for
1 alone, and it leaves the other languages as they are today.

A proposal; the team decides.

**Alternatives**:

- Gettext plural forms (`msgid_plural` with `msgstr[0]`, `msgstr[1]`)
  and `{translate … count=$n}`: pkp-lib's `Translator::getPlural()`
  reads them and would follow each language's own rules. But
  `getPlural()` finds no text for the plural form of an entry that has
  only one form, and then prints the raw key. So every language whose
  entry has not been converted would print `##catalog.browseTitles##`
  for every count that takes the plural, and all locales would need
  converting at once. OJS's and OPS's search pages already show this:
  they pass `count=` to `search.searchResults.foundPlural`, which has
  only one form.
- A wording without a number before the noun ("Items: 1"): avoids the
  plural but changes a familiar line, and only for English.

**What goes with it**:

- Translations: PKP has no fallback to English, so until Weblate fills
  `catalog.browseTitle`, a page in another language with one item shows
  `##catalog.browseTitle##` where it shows "1 …" in that language's
  plural today.
- Backport: the templates and texts are the same on 3.5, 3.4 and 3.3
  (`numTitles=$total` on the category page there); 3.3's English text
  sits in `locale/en_US/submission.po`.
- A theme that overrides these templates keeps its own copies.
- Test: an e2e check that a category with one item reads "1 Item".

Medium: a text in each of three apps and the count line of seven
templates, in three repos, with a test.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/one-item-reads-1-items/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/one-item-reads-1-items/lib.js))
  takes the Steps and records each page's count line and list.
  - **Run:** on an install freshly loaded from the default dataset,
    `PROBE_FEATURE=<fleet> PROBE_AGENT=<name> node bin/probe.js all shared/playwright/checks/issues/one-item-reads-1-items/walk.js`.
  - **Other counts:** `WALK=neighbour` in front, signed out and creating
    nothing, reads the empty category "Sociology" and OMP's catalog (two
    books), to show the fix leaves counts other than one as they were.
- Walks: OJS, OMP and OPS on `main` and `stable-3_5_0`, on PostgreSQL;
  datasets from pkp/datasets e8dafbc (2026-10-02).
- Not driven: 3.4 and 3.3; OMP's "New Releases" and search pages with
  one book (the dataset marks no new release; code only); another
  language.
- The branch tips the walks and code reads used:
  - **`main`:** OJS b84f8e2e44 (pkp-lib ddd8ab243a), OMP 3b0ecf794c and
    OPS c8af945bb7 (pkp-lib 3dc90c81a6).
  - **`stable-3_5_0`:** OJS 091fb65453, OMP 9c5e24246, OPS 38b61882d3,
    pkp-lib cf3f984335.
  - **`stable-3_4_0`** (code): OJS 75cc2d488b, OMP 0aec65441, OPS acd8ae704b.
  - **`stable-3_3_0`** (code): OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161.
- Code reads:
  - `main`: `catalog.browseTitles` in the three apps' templates,
    plugins and classes, and in their locale files;
    `PKPTemplateManager::smartyTranslate()`, `Locale::translate()`,
    `LocaleBundle::translatePlural()` and `Translator::getPlural()` for
    the plural alternative.
  - 3.5, 3.4 and 3.3: the same English texts (`locale/en_US/` on 3.3)
    and the same `{translate key="catalog.browseTitles" …}` lines in
    `catalogCategory.tpl` (`git show upstream/<branch>:<path>`).
- The trace: `git log -S "catalog.browseTitles"` over each app. In OJS
  and OPS, ea9c1cefd4 (2018) added the template line with pkp-lib's
  "{$numTitles} Titles", and fa16697d1f (2019) the app's own
  "{$numTitles} Items". In OMP the key came in 2011 as "Browse
  {$numTitles} Titles", reads "{$numTitles} Titles" since 52df855c59
  (2015), moved to pkp-lib in 38a6184f5d (2018) and back in 5027c3cee1
  (2019). No version had a singular.
- Upstream (searched 2026-10-02): no close hit.
