# Reference managers and indexes get an abstract's "&" and "<" as "&amp;" and "&lt;"

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP (code; OPS has no abstract tag)
- **Introduced** not traced; present since at least [0b59cec8a2](https://github.com/pkp/ojs/commit/0b59cec8a293b0da397632bbf87d675d136388e5) (2016-09-23)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U20 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U20-search-engine-metadata-and-analytics.md#a7)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An editor types an abstract that holds an "&" or a "<", such as "Soil &
water quality improved (P<0.01).". The item's page shows it as typed.
The copy of the abstract that the page gives reference managers and
indexes, in the "citation_abstract" tag (and "DC.Description" on a
journal and a press), reads "Soil &amp; water quality improved
(P&lt;0.01).".

A reader who saves the item to a reference manager such as Zotero gets
the abstract with "&amp;" and "&lt;" in it.

On a press, the book page and each book file's page carry the same
wrong abstract.

## Impact

- **Lost**: a correct abstract in the tags that reference managers and
  indexes read. Each "&", "<" or ">" arrives as "&amp;", "&lt;" or
  "&gt;". Nobody is told: the page itself looks right.
- **Who**: every journal, press and server with "Google Scholar
  Indexing Plugin" on, and every journal and press with "Dublin Core
  Indexing Plugin" on (both are on by default), for each item whose
  abstract holds one of these symbols, published items included. The
  symbols are common in research abstracts ("P<0.05", "R&D").
- **Way round**: none that keeps the symbol. An editor can write "and"
  or "less than" instead.

Medium: the abstract field of a public output is wrong for every such
item, and Zotero stores the codes in its users' libraries. It is not
higher because the text stays readable around the codes, and the page
itself and its other tags are right.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (OJS, OMP or OPS). "Google Scholar
  Indexing Plugin" is on in all three apps, and "Dublin Core Indexing
  Plugin" on the journal and the press, as the dataset leaves them.
- The published item each app uses. Each has an English abstract and no
  French one:
  - OJS: submission 17, "Antimicrobial, heavy metal resistance and
    plasmid profile of coliforms isolated from nosocomial infections in
    a hospital in Isfahan, Iran".
  - OMP: submission 14, "From Bricks to Brains: The Embodied Cognitive
    Science of LEGO Robots".
  - OPS: submission 12, "Sodium butyrate improves growth performance of
    weaned piglets during the first period after weaning".

Steps:

1. Signed out, open the item's page
   (`/index.php/publicknowledge/article/view/17` on OJS,
   `/index.php/publicknowledge/catalog/book/14` on OMP,
   `/index.php/publicknowledge/preprint/view/12` on OPS) and view the
   page source.
2. Sign in as `dbarnes` and open the submission
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=17`,
   14 or 12).
3. Open "Publication" ("Preprint" on OPS) › "Title & Abstract". The page
   reads "Warning: This version has been published. Editing it may
   impact the published content."
4. Replace the whole English "Abstract" with `Soil & water quality
   improved (P<0.01).` and press "Save". The form reads "Saved".
5. Open the item's page again and view the page source:
   `citation_abstract`, and `DC.Description` on OJS and OMP.
6. OMP only: on the book page, open the file "Segmentation of Vascular
   Ultrasound Imag.pdf" (a file of the whole book, not of a chapter)
   and view the page source.

**Expected**: each tag holds the text escaped once, which a reader of
the tag gets back as typed, as the page's own "Abstract" ("Synopsis" on
a press) shows it:

```html
<meta name="citation_abstract" xml:lang="en" content="Soil &amp; water quality improved (P&lt;0.01)."/>
```

**Observed**: on all three apps, each tag escapes the text twice, so a
reader of the tag gets "Soil &amp; water quality improved
(P&lt;0.01).". OMP's book file page (step 6) carries the same
`DC.Description`. (Its PDF viewer stays empty, the separate fault in
[U69-A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U69-A9-book-file-open-download-fails.md).)

```html
<meta name="citation_abstract" xml:lang="en" content="Soil &amp;amp; water quality improved (P&amp;lt;0.01)."/>
<meta name="DC.Description" xml:lang="en" content="Soil &amp;amp; water quality improved (P&amp;lt;0.01)."/>
```

On OPS the fault shows before any edit. In step 1, preprint 12's own
abstract, which holds "(P<0.01)", reads `(SFA) (P&amp;lt;0.01); those
fed MO` in the source.

## Cause

The abstract's text box is a rich-text field (`FieldRichTextarea`,
TinyMCE with `entity_encoding: 'raw'`), so the abstract is stored as
HTML. The field writes the HTML entities `&amp;`, `&lt;` and `&gt;` for
"&", "<" and ">". Step 4 stores `<p>Soil &amp; water quality improved
(P&lt;0.01).</p>`.

The tag writers turn that HTML into an attribute value with
`htmlspecialchars(strip_tags($abstract))`. `strip_tags()` removes the
markup but leaves the entities as they are. `htmlspecialchars()` then
escapes the "&" that starts each entity, so `&amp;` becomes
`&amp;amp;`. The step that is missing is decoding the entities between
the two. `PKPString::html2text()` in pkp-lib does exactly that
(`strip_tags()`, then `html_entity_decode()`), and the other readers of
the abstract use it (below).

The line sits in five places on `main`:

- OJS and OPS: `GoogleScholarPlugin::submissionView()`
  (`plugins/generic/googleScholar/GoogleScholarPlugin.php`, the
  `pkp/googleScholar` submodule, line 180 in OJS's copy and 177 in
  OPS's): `citation_abstract`.
- OJS: `DublinCoreMetaPlugin::articleView()`
  (`plugins/generic/dublinCoreMeta/DublinCoreMetaPlugin.php`, line 128):
  `DC.Description`.
- OMP: `GoogleScholarPlugin::monographView()` (line 123):
  `citation_abstract` on the book page and a chapter's page.
- OMP: `DublinCoreMetaPlugin::monographView()` (line 122) and
  `monographFileView()` (line 266): `DC.Description` on the book page,
  a chapter's page and a book file's page.

Reach:

- "&" and "<" seen in a browser; ">" seen in the stored value after a
  save, which writes the dataset's raw ">" in OJS 17 back as `&gt;`.
- `DC.Description` is written once per language that has an abstract.
  A French abstract holding these symbols gets its own wrong tag (code
  only; the items above have none).
- An abstract saved another way shows the fault when it carries the same
  entities. The dataset's abstracts were saved through the REST API (the
  data tests' `createSubmissionWithApi()`): OPS 12's was sent with
  `P&lt;0.01` and shows the fault; OJS 17's was sent with a raw ">",
  which the tags escape once, correctly. A native import is the same
  (code only).
- Titles are right: `citation_title` and `DC.Title` read
  `getLocalizedFullTitle()`, whose `'text'` format runs
  `htmlspecialchars_decode(strip_tags())` (checked in the code).
- "DC.Coverage" and "DC.Type" use the same expression, but their boxes
  are plain text (`FieldText`), which store no entities, so they are
  right (checked in the code).
- The same mistake outside these tags, not covered here (code only, not
  walked): the citation plugin's chapter abstract
  (`CitationStyleLanguagePlugin`, line 511); the Crossref deposit's
  funding statement (`ArticleCrossrefXmlFilter`, line 888); and the
  review download (`reviewDownload.tpl`, `|strip_tags|escape` on the
  review's comments).

## Proposed fix

A proposal for the team to decide: turn the abstract into text with
`PKPString::html2text()` before escaping it, in the five places listed in
the Cause. That is one `pkp/googleScholar` change, taken by OJS and OPS
as two submodule updates (they pin it at different commits, 4cae995 and
a677be9), plus OJS's Dublin Core plugin and OMP's two plugins. This is
the pattern the code base already uses for an abstract leaving HTML: the
DOAJ and DataCite exports write
`htmlspecialchars(PKPString::html2text($abstract), …)`, and the MARC,
PubMed and citation exports read the abstract through `html2text()`.
`trim()` drops the line breaks `html2text()` puts at the start and end.
One diff per app root:
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/abstract-symbols-reach-search-tags-as-codes/fix-ojs.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/abstract-symbols-reach-search-tags-as-codes/fix-omp.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/abstract-symbols-reach-search-tags-as-codes/fix-ops.diff).
Each place gets the same change, plus `use PKP\core\PKPString;`:

```diff
-            $templateMgr->addHeader('googleScholarAbstract', '<meta name="citation_abstract" xml:lang="' . htmlspecialchars(LocaleConversion::toBcp47($publicationLocale)) . '" content="' . htmlspecialchars(strip_tags($abstract)) . '"/>');
+            $templateMgr->addHeader('googleScholarAbstract', '<meta name="citation_abstract" xml:lang="' . htmlspecialchars(LocaleConversion::toBcp47($publicationLocale)) . '" content="' . htmlspecialchars(trim(PKPString::html2text($abstract))) . '"/>');
```

Tried on `main` in all three apps. With the fix the Steps show the
Expected: the source reads `Soil &amp; water quality improved
(P&lt;0.01).`, and OPS preprint 12's own abstract reads `(P&lt;0.01)`.
Neighbour check, with the fix in and out:

- Other dataset items' abstract and title tags (OJS 1, OMP 5, OPS 2
  and 8) are identical with the fix in and out.
- An abstract typed as `Typed <b>tag</b> and "quotes".`, then a second
  paragraph, stays text and stays inside its attribute: one tag per
  language, the source reading `Typed &lt;b&gt;tag&lt;/b&gt; and
  &quot;quotes&quot;.`. Without the fix a reader of the tag gets
  "Typed &lt;b&gt;tag&lt;/b&gt;". The one other change is whitespace:
  the paragraphs are parted by three line breaks instead of one.

The line breaks inside `content` are acceptable: HTML allows them in an
attribute value, and the attribute already held one between paragraphs
before the fix.

**Alternatives**

- `htmlspecialchars(html_entity_decode(strip_tags(…)))` inline, as the
  Crossref deposit writes the abstract (`ArticleCrossrefXmlFilter`,
  line 493). It gives the same text with one line break between
  paragraphs, but repeats in five places what `html2text()` already
  does.
- `htmlspecialchars(strip_tags(…), double_encode: false)`: a reader of
  the tag gets the same text, but the value keeps the field's entities
  instead of becoming text, unlike every other reader of the abstract.
- Store the abstract as plain text: the abstract is meant to carry
  markup, so this is not on the table.

**What goes with it**

- No data repair. The tags are built each time a page is shown, so
  every item is corrected at once, and indexes pick it up on their next
  crawl.
- Backport: 3.5 has the same lines and takes the diffs as written
  (checked with `patch --dry-run`). On 3.4 the lines differ only in the
  `xml:lang` part (`substr($locale, 0, 2)`), so the same edit is made by
  hand, with the `use` line beside the file's others. On 3.3 the same
  edit goes in OJS's `DublinCoreMetaPlugin.inc.php` and OMP's
  `GoogleScholarPlugin.inc.php` and `DublinCoreMetaPlugin.inc.php`,
  where `PKPString` needs no `use`.
- Guard: these plugins have no unit tests, so the guard is the e2e
  scenario here, a **Planned** item in U20: an abstract holding "&" and
  "<", and both tags read on the item's page.

Medium: three repositories and two submodule updates.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/abstract-symbols-reach-search-tags-as-codes/walk.js),
  with its helpers in `lib.js` beside it. Run it on an install freshly
  loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/abstract-symbols-reach-search-tags-as-codes/walk.js`.
  Put `PKP_E2E_LINE=stable-3_5_0` in front for 3.5, and `NB=1` for the
  neighbour check. Apply the fix with
  `node bin/try-fix.js apply shared/playwright/checks/issues/abstract-symbols-reach-search-tags-as-codes/fix-<app>.diff <app>`.
- Walked on OJS, OMP and OPS, `main` and `stable-3_5_0`, on PostgreSQL.
  The fault does not depend on the database. Datasets: pkp/datasets
  e8dafbc (2026-10-02).
- Tips:
  - `main`: OJS ff004d0973 (lib/pkp 987776cd04, googleScholar 4cae995),
    OMP 3b0ecf794c (lib/pkp 3dc90c81a6), OPS c8af945bb7 (lib/pkp
    3dc90c81a6, googleScholar a677be9).
  - `stable-3_5_0`: OJS c1cee76b95, OMP 9c5e24246c, OPS 38b61882d3.
  - `stable-3_4_0`: OJS d68934d0d1, OMP 0aec65441, OPS acd8ae704b
    (googleScholar 37a78c2 in OJS and OPS); pkp-lib 767353f4fe.
  - `stable-3_3_0`: OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161
    (googleScholar 648b0a6 in OJS and OPS); pkp-lib ac3fa73402.
- Code reads:
  - Both plugins' abstract lines on `main`, 3.5, 3.4 and 3.3, with
    `pkp/googleScholar` at 37a78c2 and 648b0a6 read on
    raw.githubusercontent.com (648b0a6 has no `citation_abstract`, and
    OPS has no Dublin Core plugin, so OPS 3.3 writes no abstract tag).
  - `PKPString::html2text()` on `main`, 3.4 and 3.3.
  - The title getters (`PKPPublication::getLocalizedTitle()`) and the
    title tags.
  - The field types in `TitleAbstractForm` and `PKPMetadataForm`, and
    `entity_encoding` in ui-library's `FieldRichTextarea.vue`.
  - The data tests `VkarbasizaedSubmission.cy.js` (OJS) and
    `LchristopherSubmission.cy.js` (OPS), for how the dataset's
    abstracts were saved.
  - The other `htmlspecialchars(strip_tags(…))` and
    `html_entity_decode(strip_tags(…))` uses in OJS, OMP, OPS and
    pkp-lib.
- Introduced: `git log -S` on the abstract lines. The line came into
  OJS's Dublin Core plugin with its first commit,
  [0b59cec8a2](https://github.com/pkp/ojs/commit/0b59cec8a293b0da397632bbf87d675d136388e5)
  (`pkp/pkp-lib#1815`, Alec Smecher, asmecher), which moved the
  template's `{$metaValue|strip_tags|escape}` into PHP. That template
  form goes back to
  [717f153456](https://github.com/pkp/ojs/commit/717f153456f6e62151f049b8d106873405c2bdbe)
  (2009-02-17), in OJS 2, whose abstract storage was not checked. The
  other places copied the line:
  - OMP's two plugins:
    [749f84f7db](https://github.com/pkp/omp/commit/749f84f7dbdeece4733ebf4ee58ebb406a2c6203)
    (2017-02-27).
  - `citation_abstract` in `pkp/googleScholar`:
    [64ebce3](https://github.com/pkp/googleScholar/commit/64ebce32e65a9a2eb4b094cf86e8a07715847596)
    (2022-12-16, `pkp/pkp-lib#8478`).
- What readers of the tags show:
  - Zotero's "Embedded Metadata" translator
    (https://github.com/zotero/translators/blob/master/Embedded%20Metadata.js)
    maps `citation_abstract` to the item's abstract and reads the Dublin
    Core tags too. Its first test case is an OJS 3.3.0.11 article page,
    https://www.ajol.info/index.php/thrb/article/view/63347, which
    carries `DC.Description` and no `citation_abstract` or `description`
    tag. The test expects the saved abstract to read "(p &lt; 0.05)",
    "&nbsp;" and "socio &ndash; demographic". That page's
    `DC.Description` source reads `(p &amp;lt; 0.05)`, `&amp;nbsp;` and
    `socio &amp;ndash;` (read 2026-10-03). How that journal's abstracts
    were entered is not known.
  - Google Scholar's inclusion guidelines
    (https://scholar.google.com/intl/en/scholar/inclusion.html) do not
    list `citation_abstract` among the tags Scholar reads. Whether
    Scholar, or any other index, shows these codes is unverified.
- Tracker search (2026-10-03), pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops,
  pkp/googleScholar and pkp/ui-library: the tag names, the plugin and
  method names, and abstract with ampersand, `&amp;`, entities, escaped
  and double encoded. Nothing on these tags. `pkp/pkp-lib#1092`
  (closed) is the same mistake in the OAI-PMH output, a separate path.
- Not driven: 3.4 and 3.3 (code only); a chapter's page on OMP and a
  French abstract (code only).
