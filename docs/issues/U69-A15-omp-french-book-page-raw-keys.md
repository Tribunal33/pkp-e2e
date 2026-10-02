# In French (Canada), a press's book and chapter pages and Roles list show codes, even for editors' names

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP (the editors' names by the code)
  - 3.4: OMP (code)
  - 3.3: OMP (code; the book's page and the "Roles" list, no chapter pages)
- **Introduced** not traced; the texts were added in English at different times and none was ever entered in OMP's French (Canada) files. The External Review stage's name had a French (Canada) text in pkp-lib until 2019 (Cause). The oldest are the book page's "Published" and "Categories", since [52df855c59](https://github.com/pkp/omp/commit/52df855c59a26832353324486789159f965d5605) (2015-09-04)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U69 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a15), spec U19 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a13) (a book's OAI-PMH "Resource Type"), spec U54 [OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#omp1) (the External Review stage's name on the press's "Roles" list)
- **Checked** 2026-10-01, the staff screens 2026-10-02, each branch's tip (the commits in Evidence)

2026-10-02: widened to the press's staff screens, where the External
Review stage's name is a code (Steps 14 to 17).

## Summary

On a press shown in French (Canada), a book's page and a chapter's page
show raw codes where the English pages show labels: the date is headed
"##catalog.published##" instead of "Published", and a file's view page
has the browser tab "##catalog.viewableFile.title##". On an edited
volume the code also takes the place of each editor's name: the page
lists "##submission.editorName##" where the English page lists "Sarah
Carter (ed)" and "Peter Fortna (ed)". A file for sale is linked as
"Achat (25.00 USD)", without the format's name that the English link
gives ("Purchase PDF (25.00 USD)"). The press's staff see the same in
its settings and workflow: the External Review stage is named
"##workflow.review.externalReview##" on the "Rôles" list's column, on
its box in the window that creates a role, and in a submission's
workflow menu.

The rest of each page shows as usual and every link works. A French
reader of an edited volume cannot see who edited it, and the press
cannot change these texts from its settings. The fix is a translation
hand-off with no code change: entering the missing French (Canada)
texts.

A press shows these codes when "Français (Canada)" is among the
languages it offers in its language settings. A press that offers
"Français" (France) instead has every one of these texts but the priced
link's format name.

## Impact

- **Lost.** An edited volume's editors' names, and about a dozen labels
  on every book and chapter page.
- **Who.** Readers of a press that offers French (Canada), and its
  staff working in French (Canada) on the "Rôles" list and in the
  workflow. By the code, the reader pages are the same in Arabic,
  Central Kurdish, Greek, Kyrgyz and Vietnamese.
- **Way round.** Switch the page to English; none in French. Staff
  are not held up: the stage's code only stands in for its name.

Medium: a public page is wrong in a field, the editors' names, on edited
volumes only, in French (Canada) and, by the code, in the five
languages above, and the English page shows them. The labels and the
staff screens alone would be low.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`, freshly loaded: the press
  `publicknowledge`, which offers English and French (Canada). Its pages
  show no language menu, so French is reached by its address.
- Book 14, "From Bricks to Brains: The Embodied Cognitive Science of
  LEGO Robots", is published in one version. Its "Chapter 1: Mind
  Control—Internal or External?" has its own page, and two files are
  listed by name under "PDF" in the side column.
- Book 5, "Bomb Canada and Other Unkind Remarks in the American Media",
  is published with one "PDF" file, "epilogue.pdf".
- Submission 2, "The West and Beyond: New Perspectives on an Imagined
  Region", is an edited volume in review. Its contributors Sarah Carter
  and Peter Fortna have the role "Volume editor".
- The dataset has no chapter added in a second version and no file for
  sale, so steps 5 to 8 and 10 to 11 make them.

Reader, the dataset as loaded (signed out):

1. Open the catalogue in French,
   `/index.php/publicknowledge/fr_CA/catalog`.
2. Open "From Bricks to Brains: The Embodied Cognitive Science of LEGO
   Robots". Read the label over the date in the side column.
3. In the table of contents, open "Chapter 1: Mind Control—Internal or
   External?". Read the labels over the book's title and over the date.
4. Back on the book's page, press either of the two file names under
   "PDF" in the side column ("Segmentation of Vascular Ultrasound
   Imag.pdf" or "The Canadian Nutrient File: Nutrient Val.pdf"). Read
   the browser tab, and the label of the return arrow in the bar above
   the file. The label is for screen readers only: the browser's
   accessibility inspector shows it as the arrow's name.

A chapter added in a second version:

5. Sign in as `dbarnes` (Press editor) and open submission 14's
   workflow,
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=14`.
6. Under "Publication", press "Create New Version". The "Create New
   Version" window opens with its three selects filled: "Version of
   Record 1.0" to copy from, "Publication Stage" "Version of Record
   (VoR)" and "Revision Significance" "Minor Revision". Leave them and
   press "Confirm". [3.5: the "Create New Version" button, then "Yes"
   to "Are you sure you want to create a new version?".]
7. Open the new version's "Chapters", press "Add Chapter", type the
   Title "Afterword u69r6" and the Pages "201-210", tick "Show this
   chapter on its own page and link to that page from the book's table
   of contents.", and press "Save".
8. Press "Publish" in the workflow's header. One window opens, "All
   publication requirements have been met. Are you sure you want to
   make this catalog entry public? The publication version is "Version
   of Record 1.1"". Press its "Publish". [3.5: the same window without
   the version sentence.]
9. Signed out, open the book in French as in steps 1 and 2 and open
   "Afterword u69r6". Read the label over "201-210" and the "Versions"
   list.

A file for sale:

10. As `dbarnes`, open Settings › Distribution › "Payments", tick
    "Enable", choose "US Dollar" under "Currency" and "Manual Fee
    Payment" under "Payment Plugins", type "Pay by cheque u69r6" in
    "Manual Payment Instructions", and press "Save".
11. Open submission 5's workflow, "Publication" › "Publication Formats".
    Under "PDF", press "Open Access" on the row of "epilogue.pdf",
    choose "Direct Sales", type the price 25.00, and press "Save".
12. Signed out, open "Bomb Canada and Other Unkind Remarks in the
    American Media" from the French catalogue. Read the file's link in
    the side column.

An edited volume:

13. As `dbarnes`, open the preview of submission 2 in French,
    `/index.php/publicknowledge/fr_CA/catalog/book/2`. Read the names
    under "Auteurs-es".

The press's settings, as staff (the dataset as loaded):

14. Sign in as `dbarnes`, open the menu under his initials at the top
    right and, under "Change Language", choose "français".
15. Open "Paramètres" › "Utilisateurs-trices et rôles"
    (`/index.php/publicknowledge/fr_CA/management/settings/access`) and
    its "Rôles" tab. Read the column headings of the "Rôles actuels"
    list.
16. Press "Créer un nouveau rôle" and read the names of the boxes under
    "Affectation d'étape". Close the window.
17. Open submission 2, "The West and Beyond: New Perspectives on an
    Imagined Region", which is in External Review
    (`/index.php/publicknowledge/fr_CA/dashboard/editorial?workflowSubmissionId=2`).
    Read the stage names in the workflow's menu under "Flux des
    travaux".

**Expected.** Each label reads in French what the English page reads:
"Published" (steps 2, 3), "Volume" (3), the tab "PDF view of the file
Segmentation of Vascular Ultrasound Imag.pdf" and the arrow "Return to
view details about From Bricks to Brains: …" (4), "Pages" and the newer
version's line "2026-10-01 (Version of Record 1.1) — Chapter created"
(9). The priced link names the format, as the English link "25.00
Purchase PDF (25.00 USD)" does (12). The editors are named, as in
English "Sarah Carter (ed)" and "Peter Fortna (ed)" (13). Every stage
is named in French, as the English screens read "Submission", "Internal
Review", "External Review", "Copyediting", "Production" (15 to 17).

**Observed.**

```
Step 2:  ##catalog.published##
Step 3:  ##chapter.volume##
         ##catalog.published##
Step 4:  tab    ##catalog.viewableFile.title##
         arrow  ##catalog.viewableFile.return##
Step 9:  ##chapter.pages##
         2026-10-01 (##publication.versionStage.display##)##submission.chapterCreated##
         2026-10-01 (##publication.versionStage.display##)
Step 12: 25.00 Achat (25.00 USD)
Step 13: ##submission.editorName##
         ##submission.editorName##
Step 15: Soumission | Évaluation interne | ##workflow.review.externalReview## | Révision | Production
Step 16: Soumission | Évaluation interne | ##workflow.review.externalReview## | Révision | Production
Step 17: Soumission | Évaluation interne | ##workflow.review.externalReview## (Cycle d'évaluation 1) | Révision | Production
```

The version's name inside the brackets is a code of its own on `main`,
reported apart (the report "In French, readers and editors see a raw
translation key in place of every version's name and number"). On 3.5
step 9 reads "2026-10-01 (2)##submission.chapterCreated##". The price in
front of the link in step 12 is also reported apart (spec U69 A7). On
3.5 the address of step 13 answers "404 Not Found" to the editor, so
the editors' names were not seen there.

## Cause

OMP's French (Canada) locale files hold no text for these keys. Each has
an entry with an empty `msgstr` in `locale/fr_CA/locale.po`,
`manager.po` or `submission.po`, and the default theme's
`plugins/themes/default/locale/fr_CA/locale.po` holds a header and no
entry at all. `LocaleFile::loadArray()`
(`lib/pkp/classes/i18n/translation/LocaleFile.php`) drops an empty text,
and `Locale::translate()` (`lib/pkp/classes/i18n/Locale.php`) does not
fall back to another language, so the page prints `##key##`. That is
PKP's stated design (`pkp/pkp-lib#784` points to the "Default
Translation" plugin for an English fallback).

The French (Canada) translation of OMP dates from 2013
([453d1ff6e0](https://github.com/pkp/omp/commit/453d1ff6e027eb9910f307e4f68340ef4fead6b7))
and has not followed the reader pages since: the keys below were added
in English from 2015 on. Nine of OMP's eleven English locale files have
a French counterpart (`admin`, `api`, `author`, `default`, `editor`,
`emails`, `locale`, `manager`, `submission`; `invitation.po` and
`sushi.po` have none). Of their 1,290 `msgid` entries, 438 have no text
in `locale/fr_CA`, against 21 in `locale/fr` (French (France)).
`locale/fr` has a text for every key below.

The priced link's French (Canada) text exists but lacks a parameter.
The English text of `payment.directSales.purchase` gained the format's
name in
[905eed2d37](https://github.com/pkp/omp/commit/905eed2d37ae971713f5285df3992be06f634ea9)
(2016-02-03): "Purchase ({$amount} {$currency})" became "Purchase
{$format} ({$amount} {$currency})", under the same key. The French
(Canada) text stayed "Achat ({$amount} {$currency})", so the format's
name the template passes is dropped.

Three of the texts carry more than words, which is why their codes do
more harm than a label's:

- `submission.editorName` is "{$editorName} (ed)".
  `templates/frontend/components/authors.tpl` prints it in place of the
  plain name for each contributor with the "Volume editor" role on an
  edited volume. Without a text the code replaces the name.
- `submission.chapterCreated` is " — Chapter created" with its leading
  space and dash, and `templates/frontend/objects/chapter.tpl` prints it
  straight after the version's name. Without a text the line reads
  "2026-10-01 (…)##submission.chapterCreated##", with no space between.
- `submission.withoutChapter` is "{$name} — Without this chapter".
  Without a text the code replaces the version's date and name.

Reach. This report's fix covers French (Canada), and the priced link's
format name in French (France); the other languages below are named as
left out.

- On screen (`main` and 3.5): `catalog.published`, `chapter.volume`,
  `chapter.pages`, `catalog.viewableFile.title`,
  `catalog.viewableFile.return`, `submission.chapterCreated` and the
  priced link. On screen on `main` only: `submission.editorName`.
- On screen (`main` and 3.5), outside the pages: `rt.metadata.pkp.dctype`,
  the "Resource Type" of every book's Dublin Core record. Read at the
  press's French OAI-PMH address
  (`/index.php/publicknowledge/fr_CA/oai?verb=ListRecords&metadataPrefix=oai_dc`),
  each record carries
  `<dc:type xml:lang="fr-CA">##rt.metadata.pkp.dctype##</dc:type>` where
  the English address gives "Book"
  (`Dc11SchemaPublicationFormatAdapter`).
- On screen (`main` and 3.5), for the press's staff:
  `workflow.review.externalReview`, the External Review stage's name,
  empty in `locale/fr_CA/submission.po`. It heads the stage's column on
  the "Rôles" list, names the stage's box in the "Créer un nouveau
  rôle" window and names the stage in a submission's workflow menu.
  By the code (`WorkflowStageDAO::getWorkflowStageTranslationKeys()`,
  `PKPApplication::getWorkflowStageName()`, ui-library `StageLabels`)
  it also names the stage in:
  - the "Rôles" list's stage filter, and the notice after a stage box
    is ticked (`UserGroupGridHandler`);
  - the editorial statistics page (`PKPStatsHandler`) and the monthly
    statistics email's attachment (`StatisticsReportMail`);
  - the API's `stageName` of a submission (`submission/maps/Schema.php`);
  - the monograph report's status column (`plugins/reports/monographReport/Report.php`);
  - OMP's `SubmissionsListPanel` stage filter;
  - the workflow's status notices that name a stage the submission has
    not reached or has left (`WorkflowSubmissionStatus.vue`).

  Until 2019 the text
  "Évaluation externe" came from pkp-lib's French (Canada) files, which
  dropped it in
  [ceef9fdb49](https://github.com/pkp/pkp-lib/commit/ceef9fdb49470eb056e88d0930777897faeadddc)
  (2019-10-15), four years after the English text moved from pkp-lib
  into OMP
  ([2ba2d4c8d2](https://github.com/pkp/omp/commit/2ba2d4c8d25750d37292a15ad5a0660402a58338),
  2015-02-24). OMP's own French (Canada) file never received it.
- By the code, in cases not set up on screen here, the same templates
  read nine more keys that are empty in `locale/fr_CA`:
  - `catalog.forthcoming`, over a publication date in the future.
  - `catalog.categories`, over a book's categories.
  - `doi.readerDisplayName` ("DOI:"), on a book, a chapter and a format
    with a DOI.
  - `catalog.manage.series.onlineIssn` and `…printIssn`, under a series
    that has them, on the book's page, the chapter's page and the
    series' page.
  - `monograph.publicationFormatDetails`, a screen-reader heading when a
    book has more than one format with details.
  - `plugins.themes.default.displayStats.downloads`, the chart's
    heading when the theme's usage statistics option is on.
  - `submission.authorListSeparator`, between the names when a page
    lists five contributors or more (`authors.tpl`, line 110).
  - `submission.withoutChapter`, on an older version's chapter page when
    a newer version lacks the chapter. On `main` that page fails first
    on a press with "DOI Versioning" "No" (spec U69 A19).
- `Publication::getEditorString()` builds a list of editors from
  `submission.editorName` as well; no template of OMP reads it (code).
- Other languages (code), of OMP's 33 translations:
  - The book-page and view-page keys have no text in Arabic, Central
    Kurdish, Greek, Kyrgyz and Vietnamese (`ckb` and `ky` have no
    `locale.po` at all).
  - "Volume" and "Pages" have no text in 12 languages, French (Canada)
    among them; the two "Versions" texts in 13.
  - `payment.directSales.purchase` has no `{$format}` in Catalan, Greek,
    French (France) and Italian, and no text at all in Arabic, Central
    Kurdish, Kyrgyz and Vietnamese, where the priced link is a code.
- Not this fault: `submission.plainLanguageSummary` is new in pkp-lib
  `main`. The English page reads "Plain Language Summary"; no other
  language has the text yet, as is usual before a release. The HTML
  view page's return arrow reads `monograph.return`, a key defined in
  no language (spec U69 A10).

## Proposed fix

Enter the missing French (Canada) texts on PKP's Weblate
(translate.pkp.sfu.ca), which writes the locale files, rather than
commit them. The texts are those of
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-french-book-page-raw-keys/fix.diff).
All 20 are OMP's own, none pkp-lib's, in four components of Weblate's
`omp` project, as the files' `Language-Team` headers name them:
`locale`, `manager` and `submission` in French (Canada), `locale` also
in French (France) for the priced link, and `themes-default` in French
(Canada). A developer can enter them or hand the list to the French
(Canada) translators.

The diff holds 20 texts. Eighteen fill the 17 empty entries and the
theme's missing one, each copied from OMP's own French (France) files.
Two add `{$format}` to the priced link, in French (Canada) and French
(France):

```diff
 msgid "catalog.published"
-msgstr ""
+msgstr "Publié"

 msgid "submission.editorName"
-msgstr ""
+msgstr "{$editorName} (éd.)"

 msgid "payment.directSales.purchase"
-msgstr "Achat ({$amount} {$currency})"
+msgstr "Achat {$format} ({$amount} {$currency})"
```

The texts are a proposal for the translators. "Achat {$format} (…)" is
this report's own wording, and the copies carry French (France)'s own
punctuation ("&nbsp;; " between names, a hyphen in "{$name} - Sans ce
chapitre" where English has a dash) for them to settle.

Tried on `main`, with the diff applied to the checkout. The walk read
"Publié", "Volume", "Pages", the tab "PDF vue du fichier Segmentation of
Vascular Ultrasound Imag.pdf", the arrow "Retournez pour voir les
détails sur From Bricks to Brains: …", "2026-10-01
(##publication.versionStage.display##) — Chapitre créé", "25.00 Achat
PDF (25.00 USD)" and "Sarah Carter (éd.)", "Peter Fortna (éd.)". The
English pages and the French labels that were already translated
("Synopsis", "Séries", "Mots-clés :") read the same with the diff in
and out. The French OAI-PMH records' "Resource Type" read "Livre", with
every other element of the records and the English records unchanged.
The staff screens of steps 15 to 17 read "Évaluation externe".

**Alternatives**

- Commit the diff to OMP: the same result at once, but Weblate's next
  sync may conflict with it or empty the entries again.
- Fall back from a regional language to its parent (French (Canada) to
  French) when a text is missing: it would cover every gap of this kind
  at once, but it is a new rule in `Locale::translate()` beside PKP's
  decision not to fall back (`pkp/pkp-lib#784`), and a product decision.
- Read pkp-lib's translated keys where one has the same word
  (`category.category` "Catégories", `submission.downloads`
  "Téléchargements"), as proposed for OPS's keywords label: it covers
  two of the 18 keys, and the rest still need a text.
- Print the editor's name, the version's name and " — " from the
  template and translate only the words of `submission.editorName`,
  `submission.chapterCreated` and `submission.withoutChapter`: a code
  would then never replace a name or run on to one, in any language. It
  changes three English texts that most languages have translated.

**What goes with it**

- Left out of the diff: the other 420 or so entries without a text in
  `locale/fr_CA`, which the report did not place on a screen; the rest
  of the theme's French (Canada) file; the languages listed under
  Cause.
- With the fix for spec U69 A7 the priced link then reads "Achat PDF
  (25.00 USD)".
- Older versions: `stable-3_5_0` and `stable-3_4_0` have the same empty
  entries (3.4 names the French (France) folder `fr_FR`). From OMP's
  history: Weblate commits to a `translations/stable-3_5_0` branch,
  which pkp merges into `stable-3_5_0` about monthly (latest
  8a6ff0375, 2026-09-18), and `stable-3_5_0` is merged forward into
  `main`, so texts entered once reach 3.5 and `main`. The last Weblate
  commit on `stable-3_4_0` is 5d7b75b79 (2025-02-14). Not known:
  whether Weblate still takes 3.4 texts, or whether 3.4 needs a commit
  of its own.
  `stable-3_3_0` has the book-page entries empty, no chapter-page
  texts, and no French (France) file to copy from.
- The guard: the U69 spec's French-page scenario asserting that a
  book's and a chapter's page show no `##` code (a Planned item).

Small: 20 texts entered on Weblate and no code, tried as a diff.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/omp-french-book-page-raw-keys/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-french-book-page-raw-keys/walk.js)
  takes the Steps on OMP, each reading step in French and then in
  English (the control, and the check that the diff changes nothing
  else). It changes books 14 and 5 and the press's payment settings, so
  it runs on an install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js omp shared/playwright/checks/issues/omp-french-book-page-raw-keys/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5; `STEP=13` in
  front takes step 13 alone).
- Walked on `main` and `stable-3_5_0`, on PostgreSQL, from pkp/datasets
  92050d9 (2026-10-01).
- Differences from the Steps: in step 4 the script presses the first
  file name of the side column, which was "Segmentation of Vascular
  Ultrasound Imag.pdf"; after step 8 the two file names change places
  from one run to the next. On 3.5 the book of step 2 shows no
  "Versions" list while it has one version, and the names read "(2)"
  and "(1)".
- Step 13 on 3.5: `catalog/book/2` and `catalog/book/2/version/2`
  answered "404 Not Found" to `dbarnes`, and the 3.5 dataset's
  contributors of submission 2 are not marked as volume editors. The
  3.5 code was read instead: `authors.tpl` prints
  `submission.editorName` for `getIsVolumeEditor()` contributors, and
  the entry is empty in `locale/fr_CA`.
- In step 13 the role under each name read "Volume editor" in French
  too; not looked into.
- Failures the walk recorded, each reported apart: on `main` the file
  view page of step 4 threw "PDFJS is not defined" and its file request
  answered 500 (spec U69 A9); on 3.5 only the script error.
- Tips: OMP `main` 3b0ecf794c (`lib/pkp` 3dc90c81a6); `stable-3_5_0`
  b24879c3d (`lib/pkp` 1fb843f491); `stable-3_4_0` 0aec65441 (`lib/pkp`
  df13621c2d); `stable-3_3_0` 8e72fc883 (`lib/pkp` d446601ebe).
- Code reads, on each branch: the entries of the keys above in OMP's
  `locale/en` (`en_US` on 3.3), `locale/fr_CA` and `locale/fr` (`fr_FR`
  on 3.4 and 3.3), the theme's `locale/fr_CA/locale.po`, and the
  templates that read them (`templates/frontend/objects/monograph_full.tpl`,
  `chapter.tpl`, `components/authors.tpl`, `components/downloadLink.tpl`,
  `pages/catalogSeries.tpl`, the pdf.js and HTML viewers' `display.tpl`).
  On `main` also `CatalogBookHandler` (the `editors` it passes),
  `Author::getIsEditor()`, `Publication::getEditorString()`,
  `LocaleFile::loadArray()`, `Locale::translate()`, and every
  `locale/*/locale.po`, `manager.po` and `submission.po` of OMP and the
  theme's `locale.po` for the counts (an empty `msgstr` counts as
  missing).
- 3.4 (code): the same 17 keys empty or absent in `fr_CA`, the same
  templates. 3.3 (code): `catalog.published`, `catalog.forthcoming`,
  `catalog.categories`, the two ISSN labels, the two view-page texts,
  `monograph.publicationFormatDetails`, `submission.editorName` and
  `submission.authorListSeparator` and `rt.metadata.pkp.dctype` empty
  in `fr_CA`, and the priced
  link without `{$format}`; the chapter keys and
  `doi.readerDisplayName` do not exist there.
- Introduced: `git log -S` of each key on OMP's English locale files
  (52df855c5, 2015-09-04, for `catalog.published` and
  `catalog.categories`; 905eed2d37, 2016-02-03, for the priced link's
  `{$format}`; 735e2044d, 2017-11-20, for `submission.editorName`;
  bfe33f3e2, 2021-10-05, for the chapter texts) and on `locale/fr_CA`,
  where the entries first appear, empty, in 3bcd14e06 (2023-01-30, the
  locale files rearranged) and were absent before.
- Upstream: pkp/pkp-lib and pkp/omp searched by "fr_CA", "French
  translation OMP", the key names (`catalog.published`, `viewableFile`,
  `chapterCreated`, `withoutChapter`, `directSales.purchase`,
  `workflow.review.externalReview`, searched 2026-10-02), "Évaluation
  externe" and
  "fallback locale regional". Read: `pkp/pkp-lib#10169` (the
  "Forthcoming" label under another date format, fixed),
  `pkp/pkp-lib#9707` (locale folders renamed to Weblate's codes),
  `pkp/pkp-lib#784`, `pkp/pkp-lib#5335` (a PHP notice from OJS's
  editorial report task on this key, closed; not this fault).
- The OAI-PMH "Resource Type" (spec U19 A13): read by
  [`oai-french-records-raw-keys/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-french-records-raw-keys/walk.js),
  which lists the press's Dublin Core records at the French and the
  English address, signed out, and changes nothing. Walked on `main`
  and `stable-3_5_0` (pkp/datasets 2c84c3c, 2026-10-01), and on `main`
  with the diff applied. `rt.metadata.pkp.dctype` is empty in
  `locale/fr_CA/locale.po` on `main`, 3.5, 3.4 and 3.3, and
  `Dc11SchemaPublicationFormatAdapter` reads it under the request's
  language on each.
- The staff screens (spec U54 OMP1, steps 14 to 17): read by
  [`omp-french-roles-stage-raw-key/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-french-roles-stage-raw-key/walk.js),
  which takes steps 14 to 16 on OJS, OMP and OPS and step 17 on OMP,
  and changes nothing:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/omp-french-roles-stage-raw-key/walk.js`
  (`NB=1` in front reads the same screens in English). Walked on `main`
  and `stable-3_5_0` (pkp/datasets c657990, 2026-10-01), and on `main`
  with the diff in and out: OMP showed the code in the column, the
  window and the workflow menu on both lines; OJS headed its columns
  "Soumission", "Évaluation", "Révision", "Production" and OPS its one
  column "Production". The script opens step 15's page and step 17's
  workflow by their addresses. 3.5 tip for this walk: c7b45f88e
  (`lib/pkp` 1fb843f491). 3.4 and 3.3 (code): the entry is empty in
  OMP's `locale/fr_CA/submission.po` on `upstream/stable-3_4_0`
  (0aec65441) and `upstream/stable-3_3_0` (8e72fc883), pkp-lib's
  `locale/fr_CA/submission.po` has none on `origin/stable-3_4_0`
  (32b0f4b4af) and `origin/stable-3_3_0` (f6ab331645), and
  `UserGroupGridHandler` heads the columns from
  `WorkflowStageDAO::getWorkflowStageTranslationKeys()` on both. The
  2019 trace: `git log -S'workflow.review.externalReview'` on OMP's and
  pkp-lib's `locale/fr_CA` (OMP c7be6b7f3, 2013-08-07, moved the text
  to pkp-lib; pkp-lib ceef9fdb49 removed it).
- Fix trial:
  `node bin/try-fix.js apply shared/playwright/checks/issues/omp-french-book-page-raw-keys/fix.diff omp`,
  the kept scripts, then `revert`.
- Not driven: 3.4 and 3.3 (code only); the nine keys listed under Cause
  as "by the code"; the External Review stage's name in the "Rôles"
  list's filter, the stage notice and the statistics page (code); languages other than French (Canada) and English
  (code only); the diff on 3.5.
- Unverified: whether Weblate already holds French (Canada) texts for
  these keys that have not reached the branches. The Custom Locale
  plugin, which edits translations, and the Default Translation plugin
  were not tried: neither is installed, and the Plugin Gallery does not
  load on the test install.
