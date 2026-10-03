# In French (Canada), a press's catalog, book and chapter pages and Roles list show codes, even for editors' names

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP (walked: the book and chapter pages, the editors' names, the catalog pages and the "Browse" block, the staff screens, the Catalog and Catalog Entry pages, the monthly statistics email's attachment)
  - 3.5: OMP (walked: the book and chapter pages, the catalog pages and the "Browse" block, the staff screens, the Catalog and Catalog Entry pages, the monthly statistics email's attachment; the editors' names read in the code, as no edited volume's page opened there)
  - 3.4: OMP (code: the book and chapter pages, the editors' names, the catalog pages and the "Browse" block, the staff screens without the review rounds' names, the Catalog and Catalog Entry pages, the monthly statistics email's attachment)
  - 3.3: OMP (code: the book page, the editors' names, the catalog pages and the "Browse" block, the staff screens without the review rounds' names, the Catalog and Catalog Entry pages, the monthly statistics email's attachment; no chapter pages)
- **Introduced** not traced as one change. Most of the texts never had a French (Canada) text; the oldest, the book page's "Published" and "Categories", came in English in [52df855c59](https://github.com/pkp/omp/commit/52df855c59a26832353324486789159f965d5605) (2015-09-04). Two had one and lost it: the External Review stage's name and the catalog's book count read in French (Canada) in OMP 3.1.1 and show codes from 3.1.2 (2019) on; on the main line pkp-lib [ceef9fdb49](https://github.com/pkp/pkp-lib/commit/ceef9fdb49470eb056e88d0930777897faeadddc) (2019-10-15) dropped both. Those two parts are a regression. The rest, the editors' names among them, never worked, so the report as a whole is a defect
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U69 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a15), spec U19 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a13) (a book's OAI-PMH "Resource Type"), spec U54 [OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#omp1) (the External Review stage's name on the press's "Roles" list), spec U24 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U24-workflow-screen-and-stage-access.md#a11) (a press's codes on the workflow screen: the External Review stage, the review rounds' names, the "Monograph" control and its menu), spec U16 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U16-categories.md#a15) (a press's category page), spec U68 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U68-catalog-browse.md#a8) (the catalog pages and the "Browse" block), spec U65 [OMP5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U65-editorial-statistics.md#omp5) (the monthly statistics email's attachment on a press whose primary language is French (Canada)), spec U70 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U70-catalog-management.md#a7) (the Catalog page), [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U70-catalog-management.md#a15) (the Catalog Entry page's "Series Position" description)
- **Checked** 2026-10-01, the staff screens and the catalog pages 2026-10-02, the monthly statistics email's attachment and the Catalog and Catalog Entry pages 2026-10-03, each branch's tip (the commits in Evidence)

2026-10-02: widened to the press's staff screens, where the External
Review stage's name is a code (Steps 14 to 17), and to the workflow
screen's own codes: a review round's name and the "Monograph" control
(Steps 18 to 20). Widened again to the catalog pages and the sidebar's
"Browse" block (Steps 21 to 27).

2026-10-03: widened to the monthly statistics email of a press whose
primary language is French (Canada): its attachment names the External
Review stage by the same code (Steps 28 to 33). Widened again to the
press's Catalog page and a version's Catalog Entry page, where the staff
read codes for the page's tab, headings, buttons and notices (Steps 34
to 40).

## Summary

On a press shown in French (Canada), a book's page and a chapter's page
show raw codes where the English pages show labels: the date is headed
"##catalog.published##" instead of "Published", and a file's view page
has the browser tab "##catalog.viewableFile.title##". On an edited
volume the code also takes the place of each editor's name: the page
lists "##submission.editorName##" where the English page lists "Sarah
Carter (ed)" and "Peter Fortna (ed)". A file for sale is linked as
"Achat (25.00 USD)", without the format's name that the English link
gives ("Purchase PDF (25.00 USD)"). The catalog, a category's or a
series' page, the "New Releases" page and the home page's lists show
codes for the book count ("##catalog.browseTitles##" for "2 Titles"),
the list headings ("Featured", "New Releases", "All Books") and the
empty-list messages, and the sidebar's "Browse" block reads
"##plugins.block.browse##" over codes for "Categories" and "Series".
The press's staff see the same in its settings and workflow: the
External Review stage is named "##workflow.review.externalReview##" in
the "Rôles" list, in the window that creates a role, and in a
submission's workflow menu. The workflow screen shows the same for a
review round's name and for the "Monograph" control
("##common.publication##"). On a press whose primary language is French
(Canada), the monthly statistics email's "editorial-report.csv" also
names the External Review stage "##workflow.review.externalReview##".
The Catalog page (Content › "Catalogue") reads
"##navigation.catalog.allMonographs##" for its tab and shows codes for
its list heading, its column headings, each book's "View Entry", the
"Order Features" and "Save Order" buttons, the ordering notice, the
"Add Entry" panel's search box and the names a screen reader gives the
"Featured" and "New release" check boxes. A version's "Catalog Entry" page describes "Series Position" as
"##submission.submit.seriesPosition.description##".

The rest of each page shows as usual and every link works. A French
reader of an edited volume cannot see who edited it, and the press
cannot change these texts from its settings. The fix changes no code:
the missing French (Canada) texts, all of them OMP's own, are entered
on PKP's translation platform.

A press shows these codes when "Français (Canada)" is among the
languages it offers in its language settings. A press that offers
"Français" (France) instead has these texts, except the priced link's
format name and the review rounds' names on the workflow screen.

## Impact

- **Lost.** An edited volume's editors' names, about a dozen labels
  on every book and chapter page, and the catalog pages' book count,
  list headings and "Browse" block labels; on the Catalog page, the
  names of its buttons, columns and boxes.
- **Who.** Readers of a press that offers French (Canada); its staff
  working in French (Canada) on the "Rôles" list, in the workflow and
  on the Catalog page;
  the editors who receive the monthly statistics email of a press whose
  primary language is French (Canada). The locale files show the same
  gaps on the reader pages in
  Arabic, Central Kurdish, Greek, Kyrgyz and Vietnamese (read, not
  walked).
- **Way round.** A reader can switch the page to English only when the
  press also offers English; on a press that offers French (Canada)
  alone, readers have no way round, and in French there is none. Staff
  are not held up: the stage's code only stands in for its name, and
  the Catalog page's codes name their controls' purpose ("featured",
  "orderFeatures", "saveFeatureOrder") closely enough to use them. A
  screen-reader user there hears each box as a code too, but the code
  still tells the state apart ("##catalog.manage.isNotFeatured##",
  "##catalog.manage.isFeatured##"), and the ordering arrows read
  "Avancer la position de …" and "Reculer la position de …" in French
  (their missing book title is spec U70
  [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U70-catalog-management.md#a14)'s
  fault), so the page can still be worked; the staff part stays low. The
  press cannot enter the texts itself; the French (Canada) translators,
  or a developer, enter them in OMP alone, with no change to pkp-lib.
  Texts entered on PKP's translation platform reach 3.5 and `main`
  through 3.5's monthly translation merge; 3.4 gets them only if the
  platform still takes its texts or by a commit, and 3.3 by a backport
  (Proposed fix, "Older versions"). The Custom Locale plugin
  from the Plugin Gallery, which lets a press override its texts, is not
  bundled with OMP and was not tried as a stopgap.

Medium: on an edited volume's public page in French (Canada), the
editors' names are gone, while the English page shows them. The same
holds, from the locale files, in the five languages above. The labels
and the staff screens alone would be low.

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
  Region", is an edited volume in review. Under "Contributors", Sarah
  Carter and Peter Fortna are listed as "Volume editor", the press's
  contributor role for a volume's editors. The page names a contributor
  as an editor by that kind of role, whatever the press calls it.
- The dataset has no chapter added in a second version and no file for
  sale, so steps 5 to 8 and 10 to 11 make them.
- Submission 4, "How Canadians Communicate: Contexts of Canadian
  Popular Culture", is in Production, not yet published. Book 14 is in
  the series "Psychology".

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

The workflow screen, as staff (the dataset as loaded; still signed in
as `dbarnes` with the language changed in step 14):

18. Open submission 6, "The Information Literacy User’s Guide", which
    is in Internal Review, round 1
    (`/index.php/publicknowledge/fr_CA/dashboard/editorial?workflowSubmissionId=6`).
    The window opens on the round's page, "Cycle d'évaluation 1" under
    "Évaluation interne" in its menu; leave it there. Read the stage
    name under the submission's title, and the heading at the top of
    the window's right pane, which starts "Flux des travaux :".
19. In the window's header, read the last button of the row that
    holds "Journal d'événements" and "Bibliothèque" (it reads
    "##common.publication##"; in English "Monograph"). Press it and
    read its two entries. Press Escape and choose nothing.
20. Open submission 2 again (step 17), which is in External Review,
    round 1, and is an edited volume. Read the stage name under the
    title, the right pane's heading and the same button.

The catalog pages and the "Browse" block (the dataset as loaded; steps
22 and 23 change the press's appearance settings and book 14's catalog
flags):

21. Signed out, open the press's "New Releases" page in French,
    `/index.php/publicknowledge/fr_CA/catalog/newReleases`. No book is a
    new release yet. Read the heading, the count and the message.
22. Sign in as `dbarnes` and open Settings › Website
    (`/index.php/publicknowledge/en/management/settings/website`),
    "Appearance" › "Setup". Under "Sidebar" tick "Browse Block", under
    "Featured Books" tick "Display featured books on the home page",
    under "New Releases" tick "Display new releases on the home page",
    and press "Save".
23. Open Content › "Catalog". On the row of "From Bricks to Brains: The
    Embodied Cognitive Science of LEGO Robots" press the "Featured" box
    and the "New release" box.
24. Sign out and open the press's home page in French,
    `/index.php/publicknowledge/fr_CA`. Read the headings of the two
    lists and the "Browse" block in the sidebar.
25. Press "Catalogue" in the header. Read the count above the books.
26. In the "Browse" block, press "Applied Science", a category with
    sub-categories and no book. Read the count and the headings.
27. In the "Browse" block, press "Library & Information Studies", a
    series with no book. Read the count, the heading and the message.

The monthly statistics email (after step 27, or on a freshly loaded
dataset: the steps above change no submission's stage). It needs a
shell in the application's root: the site's scheduler runs the task on
the 1st of each month, and step 31 runs it now with the scheduler's own
command.

28. Sign in as `dbarnes` and open Settings › Website in English
    (`/index.php/publicknowledge/en/management/settings/website`),
    "Setup" › "Languages".
29. Under "Website Languages", find the row "French/français", code
    `fr_CA`.
30. On that row, press the "Primary locale" radio. The list saves at
    once.
31. In the application's root, run the monthly task:
    `php lib/pkp/tools/scheduler.php test --name='PKP\task\StatisticsReport'`
32. Run the waiting jobs: `php lib/pkp/tools/jobs.php run`. Opening any
    page does the same, because the dataset runs jobs on web requests.
33. Open the mailbox of dbarnes@mailinator.com in the mail catcher the
    install delivers to. Open the attachment "editorial-report.csv" of
    the new email "Editorial activity for septembre, 2026" (the previous
    month) and read its first block.

The Catalog and Catalog Entry pages, as staff (on a freshly loaded
dataset; step 36 features book 14):

34. Sign in as `dbarnes` and change the language to "français" as in
    step 14.
35. In the side menu, open the group that holds "Catalogue" (on `main`
    it reads "##navigation.content##", a separate fault; in English
    "Content") and press "Catalogue"
    (`/index.php/publicknowledge/fr_CA/manageCatalog`). [3.5: "Catalogue"
    is a top-level entry.] Read the tab, the list's heading, the two
    column headings, the links on the row of "From Bricks to Brains:
    The Embodied Cognitive Science of LEGO Robots", and the names a
    screen reader gives its two boxes (the browser's accessibility
    inspector shows them).
36. On that row, press the first box. Read the box's name again, and
    the button that appears above the list.
37. Press that button. Read its new label and the notice over the list.
    Press "Annuler".
38. Press "Filtres" and read the headings of its two groups. Under the
    series group press "Psychology". Read the two column headings.
39. Press "Nouvelle entrée de catalogue" and read the label of the
    panel's search box. Close the panel.
40. Open submission 4
    (`/index.php/publicknowledge/fr_CA/dashboard/editorial?workflowSubmissionId=4`),
    and in the window's menu, under "Publication", press "Catalogue".
    Read the description under "Position dans cette série (ex: livre 2
    ou Volume 2)".

**Expected.** Each label reads in French what the English page reads:
"Published" (steps 2, 3), "Volume" (3), the tab "PDF view of the file
Segmentation of Vascular Ultrasound Imag.pdf" and the arrow "Return to
view details about From Bricks to Brains: …" (4), "Pages" and the newer
version's line "2026-10-01 (Version of Record 1.1) — Chapter created"
(9). The priced link names the format, as the English link "25.00
Purchase PDF (25.00 USD)" does (12). The editors are named, as in
English "Sarah Carter (ed)" and "Peter Fortna (ed)" (13). Every stage
is named in French, as the English screens read "Submission", "Internal
Review", "External Review", "Copyediting", "Production" (15 to 17). The rounds
and the control read in French what English reads: "Internal Review
(Round 1)" and "Workflow: Internal Review (Round 1)" (18), "Monograph"
with the entries "Edited Volume" and "Monograph" (19), "External Review
(Round 1)", "Workflow: External Review (Round 1)" and "Edited Volume"
(20). The catalog pages read in French what English reads: "New
Releases", "0 Titles" and "No new releases are available at this
time." (21); "Featured" and "New Releases", and the block "Browse",
"Categories" and "Series" (24); "2 Titles" (25); "0 Titles",
"Subcategories" and "All Books" (26); "0 Titles", "All Books" and "No
titles have been published yet." (27). The attachment's first block
names each stage in French, as the English file reads "Submission",
"Internal Review", "External Review", "Copyediting", "Production" (33).
The Catalog page reads in French what English reads: the tab "All
Monographs", the heading "Monographs", the columns "Featured" and "New
release", the row's "View Submission" and "View Entry", the boxes "This
monograph is not featured. Make this monograph featured." and "This
monograph is not a new release. Make this monograph a new release." (35);
"This monograph is featured. Make this monograph not featured." and
"Order Features" (36); "Save Order" and "Drag-and-drop or tap the up and
down buttons to change the order of features on the homepage." (37);
the groups "Categories" and "Series", the columns "Featured in series"
and "New release in series" (38); "Find monographs to add to the
catalog" (39). The Catalog Entry page describes "Series Position" as
"Examples: Book 2, Volume 2" (40).

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
Step 18: ##submission.stage.internalReviewWithRound##
         Flux des travaux : ##submission.stage.internalReviewWithRound##
Step 19: ##common.publication##
         ##submission.workflowType.editedVolume.label## | ##common.publication##
Step 20: Évaluation (Cycle 1)
         Flux des travaux : Évaluation (Cycle 1)
         ##submission.workflowType.editedVolume.label##
Step 21: ##catalog.newReleases##   (the browser tab, the trail and the heading)
         ##catalog.browseTitles##
         ##catalog.noTitlesNew##
Step 24: ##catalog.featured##
         ##catalog.newReleases##
         block: ##plugins.block.browse## | Nouveautés | ##plugins.block.browse.category## Applied Science …
                | ##plugins.block.browse.series## Library & Information Studies …
Step 25: ##catalog.browseTitles##
Step 26: ##catalog.browseTitles##
         Sous-catégories | ##catalog.category.heading##
Step 27: ##catalog.browseTitles##
         ##catalog.category.heading##
         ##catalog.noTitles##
Step 33: "Soumissions actives",Total
         Soumission,3
         "Évaluation interne",4
         ##workflow.review.externalReview##,4
         Révision,4
         Production,1
Step 35: tab      ##navigation.catalog.allMonographs##
         heading  ##submission.list.monographs##
         columns  ##catalog.manage.featured## | ##catalog.manage.feature.newRelease##
         row      Voir la soumission | ##submission.list.viewEntry##
         boxes    ##catalog.manage.isNotFeatured## | ##catalog.manage.isNotNewRelease##
Step 36: boxes    ##catalog.manage.isFeatured## | ##catalog.manage.isNotNewRelease##
         button   ##submission.list.orderFeatures##
Step 37: button   ##submission.list.saveFeatureOrder##   (beside "Annuler")
         notice   ##submission.list.orderingFeatures##
Step 38: groups   ##catalog.categories## | Série
         columns  ##catalog.manage.seriesFeatured## | ##catalog.manage.feature.seriesNewRelease##
Step 39: ##catalog.manage.findSubmissions##
Step 40: Position dans cette série (ex: livre 2 ou Volume 2)
         ##submission.submit.seriesPosition.description##
```

The block shows the same codes on every page of steps 24 to 27, and
its "Nouveautés" and the header's "Catalogue" are French. On `main`
step 26 shows no message under the heading, where 3.5 shows
"##catalog.noTitles##" (spec U16 A1, reported apart), and step 27's
page has an empty heading (spec U68 A3).

The rest of step 33's attachment, its "Tendances" and
"Utilisateurs-trices" blocks, reads in French. The email's subject and
body arrive in English, because OMP's French (Canada) `emails.po` leaves
`emails.statisticsReportNotification.subject` and `.body` empty; that is
out of this report's scope, the spec's open question U65
[A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U65-editorial-statistics.md#a13),
and the fix leaves it.

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
`plugins/themes/default/locale/fr_CA/locale.po` and the Browse block's
`plugins/blocks/browse/locale/fr_CA/locale.po` hold a header and no
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
`locale/fr` has a text for every key below except the two review
round names.

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
  plain name for each contributor whose role is of the editor kind
  (`Author::getIsEditor()`) on an edited volume. Without a text the code replaces the name.
- `submission.chapterCreated` is " — Chapter created" with its leading
  space and dash, and `templates/frontend/objects/chapter.tpl` prints it
  straight after the version's name. Without a text the line reads
  "2026-10-01 (…)##submission.chapterCreated##", with no space between.
- `submission.withoutChapter` is "{$name} — Without this chapter".
  Without a text the code replaces the version's date and name.

Reach. This report's fix covers French (Canada), and in French (France) the
priced link's format name and the two review round names; the other languages below are named as
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
  the "Rôles" list (`UserGroupGridHandler`, from
  `WorkflowStageDAO::getWorkflowStageTranslationKeys()`), names the
  stage's tick box in the "Créer un nouveau rôle" window, and names the
  stage in a submission's workflow menu (ui-library
  `useWorkflowNavigationConfigOMP.js`, line 75). On a press whose
  primary language is French (Canada) it also names the stage in the
  first block of the monthly statistics email's "editorial-report.csv":
  `StatisticsReportMail::createCsvAttachment()`
  (`lib/pkp/jobs/notifications/StatisticsReportMail.php`) writes each
  stage as `__(Application::getWorkflowStageName($stageId), [], $locale)`
  in the press's primary language. Read in the code, not walked, the
  same key also names the stage in:
  - the "Rôles" list's stage filter, and the notice after a stage box
    is ticked (`UserGroupGridHandler`);
  - the editorial statistics page (`PKPStatsHandler`), through
    `PKPApplication::getWorkflowStageName()`;
  - the API's `stageName` of a submission (`submission/maps/Schema.php`);
  - the monograph report's status column (`plugins/reports/monographReport/Report.php`);
  - the stage filter of the submission list in the Native XML and ONIX
    3.0 export plugins, where OMP's `SubmissionsListPanel` calls `__()`
    on the key itself;
  - the workflow's status notices that name a stage the submission has
    not reached or has left (`WorkflowSubmissionStatus.vue`, through
    ui-library's `StageLabels`).

  Until 2019 the text "Évaluation externe" came from pkp-lib's French
  (Canada) files, which dropped it in the 2019 commit the header names,
  four years after the English text moved from pkp-lib into OMP
  ([2ba2d4c8d2](https://github.com/pkp/omp/commit/2ba2d4c8d25750d37292a15ad5a0660402a58338),
  2015-02-24). OMP's own French (Canada) file never received it. OMP
  3.1.1 showed it in French (Canada); 3.1.2 has it in no French
  (Canada) file.
- On screen (`main` and 3.5), on the workflow screen: three more of
  OMP's own texts.
  - `common.publication` ("Monograph") and
    `submission.workflowType.editedVolume.label` ("Edited Volume"),
    empty in `locale/fr_CA` since the file has existed. ui-library's
    `WorkflowWorkTypeOMP.vue` prints them as the work type control and
    its two entries. `PKPStatsPublicationController` also heads the
    "Monograph ID" column of the statistics download with the first
    (read in the code).
  - `submission.stage.internalReviewWithRound` and
    `submission.stage.externalReviewWithRound`, "Internal Review (Round
    {$round})" and "External Review (Round {$round})", added to OMP's
    English file in
    [963af48bd](https://github.com/pkp/omp/commit/963af48bd269819d9706a95026c38200dd7bf0b1) (2024-12-12,
    `pkp/pkp-lib#10684`) for the 3.5 workflow screen. `locale/fr_CA`
    and `locale/fr` have neither. The internal one is a code; the
    external one falls through to pkp-lib's text under the same key,
    "Évaluation (Cycle {$round})", written for a journal's single
    review stage. ui-library reads both keys in three places:
    `ExtendedStagesLabels` (`useSubmission.js`) for the stage name
    under the title and the dashboard list's stage column;
    `getReviewItems()` and its `TitleKeys` map
    (`useWorkflowNavigationConfigOJS.js`, which OMP's config imports)
    for the heading over the round's page; and, on `main` only,
    `InsertSummaryOfChangesModal.vue` (`reviewRoundLabel()`), which
    names each round's revision files (read in the code, not opened).
    In the other languages' files, 20 of OMP's 33 translations have neither
    round key (`ar`, `ca`, `ckb`, `de`, `el`, `fa`, `fr`, `fr_CA`,
    `gd`, `gl`, `hr`, `hu`, `ky`, `nb_NO`, `pt`, `ro`, `ru`, `sv`,
    `tr`, `vi`), so each shows the internal round as the same code.
    The 18 beyond the two French ones are left to their translators.
- On screen (`main` and 3.5), the catalog pages and the "Browse"
  block:
  - `catalog.browseTitles` ("{$numTitles} Titles"), the count that
    `templates/frontend/pages/catalog.tpl`, `catalogCategory.tpl`,
    `catalogSeries.tpl` and `catalogNewReleases.tpl` print, empty in
    `locale/fr_CA/submission.po`. `search.tpl` prints it over the
    search results too (read in the code). Its French (Canada) text "Explorer
    {$numTitles} les titres" moved with the English one into pkp-lib
    when the catalog was shared in
    [38a6184f5](https://github.com/pkp/omp/commit/38a6184f5d9a2059f386c55e52f4e79d294c30f9) and
    [75f76c503a](https://github.com/pkp/pkp-lib/commit/75f76c503a603a0a0b4d1edda5a31ab82fb233e8)
    (2018-12-17, `pkp/pkp-lib#4158`). The English text came back to OMP
    in [5027c3cee](https://github.com/pkp/omp/commit/5027c3cee160929c9558845db2928b54684b82a9)
    (2019-02-07, `pkp/pkp-lib#4446`) without the French one, and
    pkp-lib's French (Canada) files dropped it in the same 2019 commit
    as the External Review stage's name. OMP 3.1.1 showed it in French
    (Canada); 3.1.2 has it in no French (Canada) file.
  - `catalog.featured`, `catalog.newReleases`,
    `catalog.category.heading` ("All Books"), `catalog.noTitles` and
    `catalog.noTitlesNew`, the list headings and empty-list messages of
    the same pages and of `templates/frontend/pages/index.tpl`, empty
    in `locale/fr_CA/locale.po`. Their English texts date from 2015
    ([de090dd80](https://github.com/pkp/omp/commit/de090dd809b485bcb69447a8fe8c59d9261d5951)
    and the commit in the header) and the
    French (Canada) file never held them before the empty entries that
    [3bcd14e06](https://github.com/pkp/omp/commit/3bcd14e06cc22367cecae0210fb6834a79c98991)
    added (2023-01-30).
  - `plugins.block.browse`, `plugins.block.browse.category` and
    `plugins.block.browse.series`, which
    `plugins/blocks/browse/templates/block.tpl` prints for the block's
    heading, its navigation's name for a screen reader and its two
    lines. The block's French (Canada) file was created on Weblate in
    [cfa6e0fbc](https://github.com/pkp/omp/commit/cfa6e0fbc8b86c6bdf7a0d475b818fe7cc0a07cf)
    (2023-05-23) with no entry, so its other five texts (the plugin's
    name, description and settings form) are missing too. OJS's
    and OPS's own Browse block plugins have "Parcourir" and
    "Catégories" in French (Canada).
  - `catalog.category.subcategories` is empty in OMP's
    `locale/fr_CA/locale.po` too, but pkp-lib's French (Canada) file
    has the same key, so step 26 reads "Sous-catégories".
- On screen (`main` and 3.5), the press's Catalog page and a version's
  Catalog Entry page, for the press's staff: 20 OMP texts beyond those
  above, empty in `locale/fr_CA/locale.po` and `submission.po`.
  - `navigation.catalog.allMonographs`, the tab, printed by
    `templates/manageCatalog/index.tpl`; `submission.list.monographs`,
    the list's heading, passed by `ManageCatalogHandler::index()` as the
    list's title. A press's DOIs page heads its list with the same
    text, so the fix covers it there too.
  - `catalog.categories`, the heading of the "Filtres" column's first
    group (step 38), passed by `CatalogListPanel`; the book page prints
    it over a book's categories.
  - ui-library's `CatalogListPanel.vue` and `CatalogListItem.vue` print
    `catalog.manage.featured`, `catalog.manage.feature.newRelease`,
    `catalog.manage.seriesFeatured`,
    `catalog.manage.feature.seriesNewRelease`,
    `catalog.manage.categoryFeatured`,
    `catalog.manage.feature.categoryNewRelease` (the column headings
    without a filter, with a series filter, with a category filter),
    `submission.list.viewEntry`, the four box names
    `catalog.manage.isFeatured`, `isNotFeatured`, `isNewRelease` and
    `isNotNewRelease`, `submission.list.orderFeatures`,
    `submission.list.saveFeatureOrder`, and the ordering notice
    `submission.list.orderingFeatures` (the whole catalog) or
    `submission.list.orderingFeaturesSection` (a category or series).
    The two category headings and the section notice were read in the
    code, not on screen: the column headings show only over rows, and
    no published book of the dataset is in a category; the section
    notice needs a book featured within the chosen series first.
  - `catalog.manage.findSubmissions`, the "Add Entry" panel's search
    box (`AddEntryForm`).
  - `submission.submit.seriesPosition.description`, under "Series
    Position" on the Catalog Entry page (`CatalogEntryForm`).

  None of them ever had a French (Canada) text: their English texts
  came with the catalog management rework from 2016 to 2020
  (`pkp/pkp-lib#1212`, `pkp/pkp-lib#2163`, `pkp/pkp-lib#2906`, `pkp/pkp-lib#5865`), and their French
  (Canada) entries first appear, empty, in
  [3bcd14e06](https://github.com/pkp/omp/commit/3bcd14e06cc22367cecae0210fb6834a79c98991)
  (2023-01-30). On 3.4 and 3.3 the same keys are empty, and
  `CatalogListPanel` hands the same keys to the page
  (`setLocaleKeys`).
- Read in the code, in cases these Steps do not set up, the same
  templates print eight more keys that are empty in `locale/fr_CA`:
  - `catalog.forthcoming`, over a publication date in the future.
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
  `submission.editorName` as well; no template of OMP reads it.
- Other languages, read in the locale files of OMP's 33 translations:
  - The book-page and view-page keys have no text in Arabic, Central
    Kurdish, Greek, Kyrgyz and Vietnamese (`ckb` and `ky` have no
    `locale.po` at all).
  - "Volume" and "Pages" have no text in 12 languages, French (Canada)
    among them. The two texts of a chapter page's "Versions" list,
    `submission.chapterCreated` and `submission.withoutChapter`, have
    none in 13.
  - `payment.directSales.purchase` has no `{$format}` in Catalan, Greek,
    French (France) and Italian, and no text at all in Arabic, Central
    Kurdish, Kyrgyz and Vietnamese, where the priced link is a code.
- Not this fault: `submission.plainLanguageSummary` is new in pkp-lib
  `main`. The English page reads "Plain Language Summary"; no other
  language has the text yet, as is usual before a release. The same
  holds for the codes of `main`'s new Catalog Entry page (step 40):
  the five group headings (`publication.placement`, `…publicationTiming`,
  `…versionAndUpdates`, `…display`, `…access`), "Update Type"
  (`publication.updateType.*`), "Summary of Changes"
  (`submission.form.summaryOfChanges`,
  `publication.summaryOfChanges.description`) and the descriptions
  `publication.series.description`,
  `publication.datePublished.description`,
  `publication.categories.description` and
  `publication.coverImage.description`, with `manager.selectCategories`;
  none is in 3.5's English files. The HTML
  view page's return arrow reads `monograph.return`, a key defined in
  no language (spec U69 A10).

## Proposed fix

Enter the missing French (Canada) texts on PKP's Weblate
(translate.pkp.sfu.ca), which writes the locale files, rather than
commit them. This is work for the French (Canada) translators, or for a
developer with a Weblate account, and it touches OMP alone: every text
is OMP's own, none pkp-lib's. The texts are those of
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-french-book-page-raw-keys/fix.diff),
59 in all, in five components of Weblate's `omp` project: `locale`,
`manager`, `submission`, `themes-default` (the default theme) and
`blocks-browse` (the Browse block). French (Canada) takes texts in all
five; French (France) takes the priced link in `locale` and the rounds'
names in `submission`. The component names are read from the French
(France) files' headers, since most French (Canada) files this fix
touches name none.

What the diff holds:

- 44 empty entries filled, and the one entry the default theme's French
  (Canada) file lacks added. Each text is copied from OMP's French
  (France) files, except where OMP's French (Canada) already has its
  own word for the same thing: "En vedette" (its `catalog.feature`)
  for "Featured", "Volume édité" (its `submission.workflowType.editedVolume`)
  for "Edited Volume", and OJS's French (Canada) count, "{$numTitles}
  titre(s)". The Catalog page's texts follow the same rule: "En
  vedette" for "Featured" (French (France) says "À la une") and "série"
  for "series" (French (France) says "collection"); "Ordonner les titres
  en vedette" and "Enregistrer l'ordre" are this report's own wording,
  since French (France)'s "Enregistrer la commande" reads as saving a
  purchase order. The ordering notice names the up and down buttons
  only, as pkp-e2e#745 proposes for the English, since no row can be
  dragged.
- 8 entries added to the Browse block's French (Canada) file, which
  holds none: "Parcourir", "Bloc Parcourir", "Catégories" and the
  description from OJS's French (Canada) Browse block, "Séries" and
  "Nouveautés" as OMP's French (Canada) already says them, "Paramètres"
  from French (France), and the settings form's title in this report's
  own wording.
- 4 entries adding the two rounds' names, in French (Canada) and French
  (France).
- 2 texts adding `{$format}` to the priced link, in French (Canada) and
  French (France):

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

The texts are a proposal for the translators. "Achat {$format} (…)" and
the rounds' names ("Évaluation interne (Cycle {$round})", "Évaluation
externe (Cycle {$round})", built from OMP's stage names and pkp-lib's
"Évaluation (Cycle {$round})") and the Browse block's "Options de
l'outil Parcourir" are this report's own wording, and the copies carry French (France)'s own
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
The staff screens of steps 15 to 17 read "Évaluation externe", and so
did step 33's attachment ("Évaluation externe",4); on the press left at
English as its primary language, the attachment read the same with the
diff in and out. Steps
18 to 20 read "Évaluation interne (Cycle 1)", "Monographie" with the
entries "Volume édité" and "Monographie", and "Évaluation externe
(Cycle 1)"; the same screens in English read the same with the diff in
and out. The capital in "(Cycle {$round})" for French (Canada) and
the small letter for French (France) follow pkp-lib's two texts. Steps
21 to 27 read "Nouveautés", "0 titre(s)" and "Aucune nouveauté n’est
disponible pour l’instant." (21), "En vedette", "Nouveautés" and the
block "Parcourir", "Catégories", "Séries" (24), "2 titre(s)" (25),
"Tous les livres" (26) and "Aucun titre n’a encore été publié." (27);
the same pages in English, and the French "Catalogue", its trail and
the block's "Nouveautés", read the same with the diff in and out.
Steps 35 to 40 read the diff's texts; the same steps in English read
the same with the diff in and out.

**Alternatives**

- Commit the diff to OMP: the same result at once, but Weblate's next
  sync may conflict with it or empty the entries again.
- Fall back from a regional language to its parent (French (Canada) to
  French) when a text is missing: it would cover every gap of this kind
  at once, but it goes against PKP's decision not to fall back
  (`pkp/pkp-lib#784`), a product decision. `Locale::translate()`
  already calls a hook of the same name, which the Default Translation
  plugin uses for an English fallback, so a plugin could do it without
  a change to pkp-lib. It would help only the sites that install it,
  and French (Canada) would still ship incomplete.
- Read pkp-lib's translated keys where one has the same word
  (`category.category` "Catégories", `submission.downloads`
  "Téléchargements"): it covers two of the 53 empty or missing entries,
  and the rest still need a text.
- Print the editor's name, the version's name and " — " from the
  template and translate only the words of `submission.editorName`,
  `submission.chapterCreated` and `submission.withoutChapter`: a code
  would then never replace a name or run on to one, in any language. It
  changes three English texts that most languages have translated.

**What goes with it**

- Left out of the diff: the other 410 or so entries without a text in
  `locale/fr_CA`, which the report did not place on a screen; the rest
  of the theme's French (Canada) file; the languages listed under
  Cause.
- With the fix for spec U69 A7 the priced link then reads "Achat PDF
  (25.00 USD)".
- Older versions: `stable-3_5_0` and `stable-3_4_0` have the same empty
  entries and the same Browse block file with no entry (3.4 names the
  French (France) folder `fr_FR`). From OMP's
  history: Weblate commits to a `translations/stable-3_5_0` branch,
  which pkp merges into `stable-3_5_0` about monthly (latest
  8a6ff0375, 2026-09-18), and `stable-3_5_0` is merged forward into
  `main`, so texts entered once reach 3.5 and `main`. The last Weblate
  commit on `stable-3_4_0` is 5d7b75b79 (2025-02-14). Not known:
  whether Weblate still takes 3.4 texts, or whether 3.4 needs a commit
  of its own.
  `stable-3_3_0` has the book-page and catalog entries empty, no
  chapter-page texts, no French (Canada) folder for the Browse block,
  and no French (France) file to copy from.
- The guard: the U69 spec's French-page scenario asserting that a
  book's and a chapter's page show no `##` code, and the U68 spec's
  for the catalog pages and the "Browse" block, and the U70 spec's for
  the Catalog page (Planned items).

A proposal; the team decides.

Small: 59 texts entered on Weblate and no code, tried as a diff.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/omp-french-book-page-raw-keys/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-french-book-page-raw-keys/walk.js)
  takes the Steps on OMP, each reading step in French and then in
  English (the control, and the check that the diff changes nothing
  else). It changes books 14 and 5 and the press's payment settings, so
  it runs on an install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js omp shared/playwright/checks/issues/omp-french-book-page-raw-keys/walk.js`.
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
- Tips: OMP `main` 3b0ecf794c (`lib/pkp` 3dc90c81a6, `lib/ui-library`
  280f98c5) for every walk. `stable-3_5_0` moved between the walks:
  b24879c3d (`lib/pkp` 1fb843f491) for steps 1 to 13, c7b45f88e
  (`lib/pkp` 1fb843f491) for steps 14 to 17, 9c5e24246c (`lib/pkp`
  cf3f984335, `lib/ui-library` d4e01883) for steps 18 to 40. Code reads:
  `stable-3_4_0` 0aec65441 (`lib/pkp` df13621c2d), `stable-3_3_0`
  8e72fc883 (`lib/pkp` d446601ebe).
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
- 3.4, read in the code: the same entries as on `main` are empty or
  absent in `fr_CA`, apart from the two round names, which do not exist
  there, and the same templates print them. 3.3, read in the code: `catalog.published`, `catalog.forthcoming`,
  `catalog.categories`, the two ISSN labels, the two view-page texts,
  `monograph.publicationFormatDetails`, `submission.editorName` and
  `submission.authorListSeparator` and `rt.metadata.pkp.dctype` empty
  in `fr_CA`, and the priced
  link without `{$format}`; the chapter keys and
  `doi.readerDisplayName` do not exist there.
- Introduced: `git log -S` of each key on OMP's English locale files,
  OMP's `locale/fr_CA` and pkp-lib's `locale/fr_CA`. Besides the
  commits the header and the Cause name: 735e2044d (2017-11-20) brought
  `submission.editorName`, bfe33f3e2 (2021-10-05) the chapter texts.
  The two lost texts on the release branches: OMP's tag `omp-3_1_1-4`
  has `catalog.browseTitles` in `locale/fr_CA/locale.xml`, and
  pkp-lib's `omp-stable-3_1_1` has `workflow.review.externalReview` in
  `locale/fr_CA/submission.xml`; neither key is in any `fr_CA` file of
  OMP's or pkp-lib's `stable-3_1_2`, while OMP's `en_US` has both.
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
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/omp-french-roles-stage-raw-key/walk.js`.
  Walked on `main`
  and `stable-3_5_0` (pkp/datasets c657990, 2026-10-01), and on `main`
  with the diff in and out: OMP showed the code in the column, the
  window and the workflow menu on both lines; OJS headed its columns
  "Soumission", "Évaluation", "Révision", "Production" and OPS its one
  column "Production". The script opens step 15's page and step 17's
  workflow by their addresses. 3.4 and 3.3, read in the code: the
  entry is empty in OMP's `locale/fr_CA/submission.po`, pkp-lib's
  `locale/fr_CA/submission.po` has none, and `UserGroupGridHandler`
  heads the columns from
  `WorkflowStageDAO::getWorkflowStageTranslationKeys()` on both. The
  2019 trace: `git log -S'workflow.review.externalReview'` on OMP's and
  pkp-lib's `locale/fr_CA` (OMP c7be6b7f3, 2013-08-07, moved the text
  to pkp-lib).
- The workflow screen (spec U24 A11, steps 18 to 20): read by
  [`omp-french-workflow-raw-keys/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-french-workflow-raw-keys/walk.js),
  which signs in as `dbarnes`, changes the language as in step 14 and
  takes steps 18 to 20 on OMP, and changes nothing:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js omp shared/playwright/checks/issues/omp-french-workflow-raw-keys/walk.js`.
  Walked on `main` and
  `stable-3_5_0` (pkp/datasets e8dafbc, 2026-10-02), and on `main` with
  the diff in and out. No request failed. The French address alone,
  without step 14's language change, was not tried. Code reads on both:
  `WorkflowWorkTypeOMP.vue`, `ExtendedStagesLabels` in
  `useSubmission.js`, `getReviewItems()` in
  `useWorkflowNavigationConfigOJS.js`, on `main`
  `InsertSummaryOfChangesModal.vue`, the `submission.po` of each of
  OMP's 33 translations for the two round keys, OMP's and pkp-lib's `locale/en`, `locale/fr_CA`
  and `locale/fr` entries of the four keys. 3.4 and 3.3, read in the
  code: `common.publication` and
  `submission.workflowType.editedVolume.label` are empty in
  `locale/fr_CA`, where
  `pages/workflow/WorkflowHandler` passes them to
  `templates/workflow/workflow.tpl` for the same control; the two round
  names do not exist before 3.5. Upstream searched 2026-10-02 in
  pkp/pkp-lib, pkp/omp and pkp/ui-library by
  `internalReviewWithRound`, `common.publication fr_CA`,
  `workflowType.editedVolume.label` and "Internal Review round
  translation missing": nothing on this fault. Not driven: the
  dashboard list's stage column (the walk's code scan found
  `##submission.stage.internalReviewWithRound##` on the dashboard
  behind the workflow, not read as a step), the statistics download's
  column, French (France).
- The catalog pages and the "Browse" block (spec U16 A15, spec U68 A8,
  steps 21 to 27): taken by
  [`omp-french-catalog-raw-keys/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-french-catalog-raw-keys/walk.js),
  which then reads the same pages in English (the control). It changes
  the press's appearance settings and book 14's catalog flags, so it
  runs on an install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js omp shared/playwright/checks/issues/omp-french-catalog-raw-keys/walk.js`.
  Walked on `main` and `stable-3_5_0`, on PostgreSQL, from pkp/datasets
  e8dafbc (2026-10-02), and on `main` with the diff in and out. The two
  lines read the same codes. No request failed and no script error
  showed. 3.4 and 3.3, read in the code: the six catalog entries are
  empty in OMP's `locale/fr_CA`, pkp-lib's `locale/fr_CA` has none of
  them, and the same templates print
  them; the Browse block's `locale/fr_CA/locale.po` holds a header
  only on 3.4, and 3.3 has no `fr_CA` folder for it. The history:
  `git log -S` of each key on OMP's `locale/en`, `en_US` and `fr_CA`
  and on pkp-lib's `locale/fr_CA`. Upstream searched 2026-10-02 in
  pkp/pkp-lib and pkp/omp by `catalog.browseTitles`,
  `catalog.category.heading`, `plugins.block.browse`, "browse block
  French", "fr_CA catalog", "New Releases" French and "missing
  translation OMP catalog": nothing on this fault
  (`pkp/pkp-lib#4901`, a missing `category.noTitlesSection` key, is
  another key, closed).
- The monthly statistics email's attachment (spec U65 OMP5, steps 28
  to 33): taken by
  [`omp-french-monthly-report-raw-key/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-french-monthly-report-raw-key/walk.js),
  which runs steps 31 and 32 as the commands they name and reads
  dbarnes@mailinator.com's mailbox in the install's mail catcher. It
  changes the press's primary language, so it runs on an install
  freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js omp shared/playwright/checks/issues/omp-french-monthly-report-raw-key/walk.js`;
  `NB=1` in front leaves out steps 28 to 30 (English primary). Walked on
  `main` (OMP 3b0ecf794c) and `stable-3_5_0` (9c5e24246, `lib/pkp`
  cf3f984335), on PostgreSQL, from pkp/datasets e8dafbc (2026-10-02),
  2026-10-03. With the diff applied on `main`, it was run with French
  (Canada) and with English as the press's primary language; with the
  diff taken out, with English only. `main` and 3.5 wrote the same
  rows. Code reads:
  `StatisticsReportMail::handle()` and `createCsvAttachment()` and
  `PKPApplication::getWorkflowStageName()` on `main` and 3.5; on 3.4
  (`lib/pkp` df13621c2d) the same job and map, with the entry empty in
  OMP's `locale/fr_CA/submission.po`; on 3.3 the attachment is written
  by `EditorialReportNotificationManager` (`lib/pkp` `classes/notification/managerDelegate/`,
  the same `__(…getWorkflowStageName($stageId), [], $locale)` in the
  primary language), and the entry is empty there too. Upstream searched
  2026-10-03 in pkp/pkp-lib and pkp/omp by "editorial report csv
  French", `StatisticsReportMail`, `getWorkflowStageName`,
  `editorial-report.csv`, `externalReview fr_CA` and "Évaluation
  externe": nothing on this fault (`pkp/pkp-lib#6085`, the report
  written in the wrong language, fixed by forwarding the context's
  locale, and `pkp/pkp-lib#10128`, emails ignoring a user's preferred
  language, are other faults). The attachment follows the press's
  primary language, not the recipient's (read in the code), so a press
  with English primary shows no code there whatever its editors'
  language; not driven.
- The Catalog and Catalog Entry pages (spec U70 A7 and A15, steps 34
  to 40): taken by
  [`omp-french-catalog-management-raw-keys/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-french-catalog-management-raw-keys/walk.js).
  It features book 14, so it runs on an install freshly loaded from
  the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js omp shared/playwright/checks/issues/omp-french-catalog-management-raw-keys/walk.js`;
  `NB=1` in front takes the same steps in English (the check that the
  diff changes nothing else). Walked on `main` and `stable-3_5_0`, on
  PostgreSQL, from pkp/datasets 566bb1f (2026-10-03), and on `main`
  with the diff in and, in English, in and out. The two lines read the
  same codes. No request failed and no script error showed. The script
  reads the boxes' names from the page's markup. Code reads: the
  entries of the 19 keys in OMP's `locale/en` and `locale/fr_CA` on
  `main`, 3.5, `stable-3_4_0` (0aec65441f) and `stable-3_3_0`
  (8e72fc8836), and `locale/fr` on `main` for the wording;
  `templates/manageCatalog/index.tpl`, `ManageCatalogHandler`,
  `CatalogListPanel`, `AddEntryForm` and `CatalogEntryForm` on `main`,
  3.4 and 3.3 (`.inc.php` there); ui-library's `CatalogListPanel.vue`
  and `CatalogListItem.vue` on `main` and on `stable-3_4_0` (ee684b341b)
  and `stable-3_3_0` (96959f9ed4); 3.5's `CatalogEntryForm` and its
  English files for the texts new on `main`; a search of OMP, pkp-lib
  and ui-library for a reader of `successMessage` (none). History:
  `git log -S` of five of the keys on OMP's `locale/en`, `en_US` and
  `fr_CA`. Upstream searched 2026-10-03 in pkp/pkp-lib, pkp/omp and
  pkp/ui-library by `catalog.manage.featured`,
  `submission.list.viewEntry`, `navigation.catalog.allMonographs`,
  `seriesPosition.description`, `orderFeatures`, "catalog French
  translation", "manage catalog French missing translation", "fr_CA
  catalog" and "catalog translation key": nothing on this fault.
- Fix trial: the kept scripts on `main` with the diff applied to OMP's
  checkout, and again with it taken out. After "Volume édité" replaced
  the French (France) "Ouvrage collectif" in the diff, steps 18 to 20
  were walked again with the diff in.
- Not driven: 3.4 and 3.3 (read in the code only); the eight keys the
  Cause lists as read in the code; the Catalog page's category column
  headings and its notice while ordering within a category or series; the External Review stage's name in
  the "Rôles" list's filter, the stage notice, the statistics page and
  the export plugins' lists (read in the code); languages other than
  French (Canada) and English (read in the locale files only); the diff
  on 3.5.
- Unverified: whether Weblate already holds French (Canada) texts for
  these keys that have not reached the branches. The Custom Locale and
  Default Translation plugins were not tried.
