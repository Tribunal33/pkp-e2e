# In French (Canada), a press's catalog, book and chapter pages and Roles list show codes, even for editors' names

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP (the editors' names by code)
  - 3.4: OMP (code)
  - 3.3: OMP (code; no chapter pages, review rounds' names or ISBN boxes)
- **Introduced** not traced as one change. Most of the texts never had a French (Canada) text; the oldest, the book page's "Published" and "Categories", came in English in [52df855c59](https://github.com/pkp/omp/commit/52df855c59a26832353324486789159f965d5605) (2015-09-04). Four had a French (Canada) text and lost it: the External Review stage's name and the catalog's book count read in French (Canada) in OMP 3.1.1 and show codes from 3.1.2 (2019) on; on the main line pkp-lib [ceef9fdb49](https://github.com/pkp/pkp-lib/commit/ceef9fdb49470eb056e88d0930777897faeadddc) (2019-10-15) dropped both. The Production notice's two paragraphs read in French (Canada) in OMP 3.1.2 and show codes from 3.2.0 (2020) on: OMP `pkp/omp#700` (for `pkp/pkp-lib#2072`) · [ce205d583](https://github.com/pkp/omp/commit/ce205d58362e3bdcfaf1dc59e43c6c068e12415c) · 2019-08-21 · Nate Wright (NateWr) and [5ea424e69](https://github.com/pkp/omp/commit/5ea424e69e2cada0f92f5dbca96badc037d1827f) (2019-11-04, for `pkp/pkp-lib#5235`) removed them in every language with the English texts they dropped or reworded. Those four parts are a regression. The rest, the editors' names among them, never worked, so the report as a whole is a defect
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U69 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a15), spec U19 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a13) (a book's OAI-PMH "Resource Type"), spec U54 [OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#omp1) (the External Review stage's name on the press's "Roles" list), spec U24 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U24-workflow-screen-and-stage-access.md#a11) (a press's codes on the workflow screen: the External Review stage, the review rounds' names, the "Monograph" control and its menu), spec U16 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U16-categories.md#a15) (a press's category page), spec U68 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U68-catalog-browse.md#a8) (the catalog pages and the "Browse" block), spec U65 [OMP5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U65-editorial-statistics.md#omp5) (the monthly statistics email's attachment on a press whose primary language is French (Canada)), spec U70 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U70-catalog-management.md#a7) (the Catalog page), [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U70-catalog-management.md#a15) (the Catalog Entry page's "Series Position" description), spec U73 [A25](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U73-publication-formats-proof-terms.md#a25) (the Publication Formats page and its windows), spec U23 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U23-submissions-dashboard.md#a12) (the "Submissions" list's "Assigned To Editor" filter; the list's other codes are reported apart), spec U33 [OMP3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U33-production-stage.md#omp3) (the notice on a book's Production stage)
- **Checked** 2026-10-01 to 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

2026-10-02: widened to the staff screens, the workflow screen and the
catalog pages (Steps 14 to 27).

2026-10-03: widened to the monthly statistics email, the Catalog page
and the Catalog Entry page (Steps 28 to 40).

2026-10-04: widened to a book's Publication Formats page (Steps 41 to
47); the OAI-PMH records, already in the Cause, get a step (48). Revised
after a developer's and a triage read: one count of the texts, who
enters them, the way round, and corrections in the Cause and the fix.
Later the same day, widened to the notice on a book's Production stage
(Steps 51 to 58).

## Summary

On a press shown in French (Canada), readers and staff meet raw codes
where the English pages show labels: the Steps show 50 texts as codes
and 3 more in the wrong words. A book's page heads its date
"##catalog.published##" instead of "Published", and on an edited volume
the code takes the place of each editor's name: the page lists
"##submission.editorName##" where the English page lists "Sarah Carter
(ed)" and "Peter Fortna (ed)". The catalog pages and the "Browse" block
show codes for their counts and headings, and each book's French
OAI-PMH record gives its type as "##rt.metadata.pkp.dctype##" where the
English record says "Book". The staff meet the same on the "Rôles"
list, in the workflow, on the "Submissions" list (an internal review's
stage and the "Assigned To Editor" filter), in the monthly statistics
email, and on the Catalog,
Catalog Entry and Publication Formats pages, where the External Review
stage reads "##workflow.review.externalReview##" and a column heading
"##grid.catalogEntry.availability##". On a book's Production stage, the
staff and the book's author read a French heading over a code.

The rest of each page shows as usual and every link works. A French
reader of an edited volume cannot see who edited it, and the press
cannot change these texts from its settings. The fix changes no code: a
developer enters or corrects 75 French (Canada) texts, all of them
OMP's own, on PKP's translation platform. Some of them belong to
states, windows and settings no Step opens (the Browse block's name
and settings, a series' ISSN labels, among others).

A press shows these codes when "Français (Canada)" is among the
languages it offers. "Français" (France) has these texts, except a
priced file's format name and the review rounds' names, which it lacks
too.

## Impact

- **Lost.** An edited volume's editors' names on its public pages, and
  the book's type in every French OAI-PMH record; on a book's
  Production stage, what the notice tells the editor or author reading
  it to do next; elsewhere labels. Nobody is told.
- **Who.** Readers of a press that offers French (Canada), and the
  services that harvest its French OAI-PMH records; its staff working in
  French (Canada), and the authors of its books in Production; the
  editors who receive the monthly statistics email of a press whose
  primary language is French (Canada). The locale files
  show the same gaps on the reader pages in Arabic, Central Kurdish,
  Greek, Kyrgyz and Vietnamese, which the fix leaves to their
  translators.
- **Way round.** A reader can switch the page to English only when the
  press also offers English; within French (Canada) there is none. No
  way round for the press was tried (Evidence, "Unverified"). Staff are
  not held up: each code names what its control does ("orderFeatures",
  "isbn13") closely enough to use it. Nor are the staff and the author
  on a book's Production stage: the notice's French heading still gives
  the book's state, and they can switch the interface to English for
  the paragraph.

Medium: on an edited volume's public page in French (Canada), the
editors' names are gone, while the English page shows them, and every
book's French OAI-PMH record carries a code for its type. The labels
and the staff screens alone would be low.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`, freshly loaded: the press
  `publicknowledge`, which offers English and French (Canada). Its pages
  show no language menu, so French is reached by its address.
- Load the dataset afresh before step 1 and again before step 34:
  steps 5 to 12 and 22 to 23 change it, and step 36 needs book 14 not
  yet featured. Steps 28 to 33 may follow step 27, and steps 41 to 48
  may follow step 40; the other groups save nothing.
- For step 33, the install's mailer delivers to a mail catcher such as
  Mailpit, where the email and its attachment can be opened.
- Book 14, "From Bricks to Brains: The Embodied Cognitive Science of
  LEGO Robots", is published in one version. Its "Chapter 1: Mind
  Control—Internal or External?" has its own page, and two files are
  listed by name under "PDF" in the side column.
- Book 5, "Bomb Canada and Other Unkind Remarks in the American Media",
  is published with one "PDF" file, "epilogue.pdf".
- Submission 2, "The West and Beyond: New Perspectives on an Imagined
  Region", is an edited volume in review. Under "Contributors", Sarah
  Carter and Peter Fortna are listed as "Volume editor", the press's
  contributor role for a volume's editors. The book page treats a
  contributor as an editor when their role is the editor role, whatever
  name the press gives it.
- The dataset has no chapter added in a second version and no file for
  sale, so steps 5 to 8 and 10 to 11 make them.
- Submission 4, "How Canadians Communicate: Contexts of Canadian
  Popular Culture", is in Production, not yet published; `dbarnes` is
  its editor and `bbeaty` its author. Book 14 is in the series
  "Psychology".

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
    the new email "Editorial activity for <the previous month>, <its
    year>" ("septembre, 2026" in the walk) and read its first block.

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

The Publication Formats page, as staff (the dataset as loaded; nothing
is saved). Submission 4 has one format, "PDF", hosted on another
website, neither approved nor available:

41. Sign in as `dbarnes` and change the language to "français" as in
    step 14.
42. Open submission 4 as in step 40, and in the window's menu, under
    "Publication", press "Formats de publication". Read the list's
    column headings, and the links on the row "PDF" under the second
    and third.
43. Press "Ajouter un format de publication". Read the label of the box
    under "Format physique", and under "Chemin d'accès URL" the heading
    over the next two boxes and the line under each.
44. Tick that box and read the label of the box that appears under it.
    Press "Annuler".
45. On the row "PDF", press the arrow, then "Modifier". The window opens
    with the box of step 44 already ticked, since the format is hosted
    elsewhere, and the address box showing. Read the same five labels as
    in steps 43 and 44. Press "Annuler".
46. On the row "PDF", press the link under "Terminer". Read the
    window's title and text. Press "Annuler".
47. Press the link under the third column. Read the window's title and
    text. Press "Annuler".

The OAI-PMH records (signed out; nothing is saved):

48. Open the press's French OAI-PMH list,
    `/index.php/publicknowledge/fr_CA/oai?verb=ListRecords&metadataPrefix=oai_dc`,
    and read each record's `<dc:type>`. Open the same address with `en`
    in place of `fr_CA` and read the same element.

The editorial "Submissions" list, as staff (the dataset as loaded):

49. Sign in as `dbarnes`, open "Submissions"
    (`/index.php/publicknowledge/en/dashboard/editorial`), change the
    language to "français" as in step 34, and in the side menu choose
    "Soumissions actives". Read the "Étape" cell of submission 17,
    "Open Development: Networked Innovations in International
    Development" (Internal Review, round 1).
50. Press "Filtres" above the list and read the label of its first
    field.

The notice on a book's Production stage, as staff and as the author
(the dataset as loaded; nothing is saved):

51. Sign in as `dbarnes` and change the language to "français" as in
    step 14.
52. Open submission 4
    (`/index.php/publicknowledge/fr_CA/dashboard/editorial?workflowSubmissionId=4`).
53. In the window's menu, under "Flux des travaux", press "Production".
    Read the box at the top of the main column.
54. Open book 14 the same way (`…workflowSubmissionId=14`), which is
    published, and press "Production". Read the box under "Statut".
55. Sign out and sign in as `bbeaty`, the author of submission 4.
56. Change the language to "français" as in step 14.
57. Open submission 4 from "Mes soumissions"
    (`/index.php/publicknowledge/fr_CA/dashboard/mySubmissions?workflowSubmissionId=4`)
    and press "Production" in the window's menu.
58. Read the box at the top of the main column.

**Expected.** Each label reads in French what the English page reads:
"Published" (steps 2, 3), "Volume" (3), the tab "PDF view of the file
Segmentation of Vascular Ultrasound Imag.pdf" and the arrow "Return to
view details about From Bricks to Brains: …" (4), "Pages" and the newer
version's line "<the day of step 8> (Version of Record 1.1) — Chapter
created" (9). The priced link names the format, as the English link "25.00
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
"Examples: Book 2, Volume 2" (40). The Publication Formats page and its
windows read in French what English reads: the column "Availability"
and the row's "Awaiting Approval" and "Not Available" (42); "This format
will be available at a separate website", "ISBN", "A 13-digit ISBN
code, such as 978-951-98548-9-2." and "A 10-digit ISBN code, such as
951-98548-9-4." (43, 45); "URL of remotely-hosted content" (44, 45); the
window "Format Approval", "Approve the metadata for this format.
Metadata can be checked from the Edit panel for each format." (46); the
window "Format Availability" (47). The French records give a book's type
in French, as the English records read "Book" (48). The list reads in
French what English reads: "Internal Review (Round 1)" (49) and the
field "Assigned To Editor" (50), as a journal's French (Canada) list
reads "Assignée au,à la rédacteur-trice". The Production stage's box
gives its French heading a French paragraph, as English reads "Awaiting
approval." over "The monograph will not be listed in the catalog until
it has been published. To add this book to the catalog, click on the
Publication tab." (53, 58) and "Catalog Management" over "The monograph
has been approved. Please visit Marketing and Publication to manage its
catalog details, using the links just above." (54).

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
Step 42: columns  Nom | Terminer | ##grid.catalogEntry.availability##
         row      PDF | ##submission.incomplete## | ##grid.catalogEntry.isNotAvailable##
Step 43: ##grid.catalogEntry.remotelyHostedContent##
         ##grid.catalogEntry.isbn##
         ##grid.catalogEntry.isbn13.description##
         ##grid.catalogEntry.isbn10.description##
Step 44: ##grid.catalogEntry.remoteURL##
Step 45: the same five codes
Step 46: title    ##grid.catalogEntry.approvedRepresentation.title##
         text     ##grid.catalogEntry.approvedRepresentation.message##
Step 47: title    Approbation du format
         text     Ce format sera accessible aux lecteurs. Ils pourront consulter des fichiers
                  téléchargeables qui apparaitront désormais dans l'entrée de catalogue du livre […]
Step 48: <dc:type xml:lang="fr-CA">##rt.metadata.pkp.dctype##</dc:type>   (every record; in English "Book")
Step 49: ##submission.stage.internalReviewWithRound##
Step 50: ##editor.submissions.assignedTo##   (then "Catégories", "Nombre de jours depuis la dernière intervention")
Step 53: En attente d'approbation.
         ##notification.type.formatNeedsApprovedSubmission##
Step 54: Gestion du catalogue
         ##notification.type.visitCatalog##
Step 58: En attente d'approbation.
         ##notification.type.formatNeedsApprovedSubmission##
```

On the Publication Formats page the rest reads French ("Formats de
publication", "Ajouter un format de publication", "Détails du format",
"Format de publication", "Format physique", "Chemin d'accès URL").
The second column's heading "Terminer" ("Finish") is pkp-lib's French
(Canada) text for "Complete", not a code, and the fix leaves it.

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
3.5 the address of step 13 answers "404 Not Found" to the editor, as
3.5 lets staff preview a book only in Copyediting or Production, so the
editors' names were not seen there (Evidence).

## Cause

OMP's French (Canada) locale files hold no text for most of these keys.
Most have an entry with an empty `msgstr` in `locale/fr_CA/locale.po`,
`editor.po`, `manager.po` or `submission.po`. The two review rounds'
names have no entry there at all, and the default theme's
`plugins/themes/default/locale/fr_CA/locale.po` and the Browse block's
`plugins/blocks/browse/locale/fr_CA/locale.po` hold a header and no
entry at all. Two texts are there but wrong: the
priced link's and the "Format Availability" window's title (below). `LocaleFile::loadArray()`
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

- `submission.editorName` is "{$editorName} (ed)". On an edited
  volume, `CatalogBookHandler` collects the contributors whose role is
  the editor role (`Author::getIsEditor()` on `main`,
  `getIsVolumeEditor()` on 3.5), and
  `templates/frontend/components/authors.tpl` prints this text in place
  of each one's plain name. Without a text the code replaces the name.
- `submission.chapterCreated` is " — Chapter created" with its leading
  space and dash, and `templates/frontend/objects/chapter.tpl` prints it
  straight after the version's name. Without a text the line reads
  "2026-10-01 (…)##submission.chapterCreated##", with no space between.
- `submission.withoutChapter` is "{$name} — Without this chapter".
  Without a text the code replaces the version's date and name.

Reach. The fix covers French (Canada) and, in French (France), the
priced link's format name and the two review rounds' names. The other
languages below are left to their translators.

- On screen (`main` and 3.5): `catalog.published`, `chapter.volume`,
  `chapter.pages`, `catalog.viewableFile.title`,
  `catalog.viewableFile.return`, `submission.chapterCreated` and the
  priced link. `submission.editorName` on screen on `main`, and by code
  on 3.5, where the same template prints it and the entry is empty too.
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
- On screen (`main` and 3.5), on the "Submissions" list, for managers
  and site administrators: `editor.submissions.assignedTo` ("Assigned
  To Editor"), empty in `locale/fr_CA/editor.po`. pkp-lib's
  `PKPSubmissionFilters::addAssignedTo()` labels the "Filtres" panel's
  editor field with it. OMP's English file has carried the key since
  [4a151fcdd](https://github.com/pkp/omp/commit/4a151fcddd246ef49f6885b188be9fb68a750fad)
  (2020-11-10, `pkp/pkp-lib#6038`), and the empty French (Canada) entry
  came with the files' rearrangement for Weblate,
  [3bcd14e06](https://github.com/pkp/omp/commit/3bcd14e06cc22367cecae0210fb6834a79c98991)
  (2023-01-30). OJS's and OPS's own French (Canada) files translate the
  key ("Assignée au,à la rédacteur-trice", "Assigné au modérateur";
  walked). On 3.4 and 3.3 the same empty entry labels the older
  submissions list's "Assigned To Editor" filter
  (`PKPSubmissionsListPanel`; code).
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
    and `locale/fr` have neither. pkp-lib's French (Canada) file has
    only the external key, "Évaluation (Cycle {$round})", written for a
    journal's single review stage. So the internal round shows a code
    and the external round pkp-lib's text. ui-library reads both keys in three places:
    `ExtendedStagesLabels` (`useSubmission.js`) for the stage name
    under the title and the dashboard list's stage column (walked,
    step 49);
    `getReviewItems()` and its `TitleKeys` map
    (`useWorkflowNavigationConfigOJS.js`, which OMP's config imports)
    for the heading over the round's page; and, on `main` only,
    `InsertSummaryOfChangesModal.vue` (`reviewRoundLabel()`), which
    names each round's revision files (read in the code, not opened).
    In the other languages' files, 20 of OMP's 33 translations have neither
    round key (`ar`, `ca`, `ckb`, `de`, `el`, `fa`, `fr`, `fr_CA`,
    `gd`, `gl`, `hr`, `hu`, `ky`, `nb_NO`, `pt`, `ro`, `ru`, `sv`,
    `tr`, `vi`), so each shows the internal round as the same code.
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
- On screen (`main` and 3.5), a book's Publication Formats page, for
  the press's staff: 15 OMP texts empty in `locale/fr_CA/locale.po`
  and `submission.po` (ten of them in the Steps), and one wrong.
  - `PublicationFormatGridHandler::initialize()` heads the third column
    `grid.catalogEntry.availability`. `PublicationFormatGridCellProvider::getCellActions()`
    labels a format's links `submission.incomplete` ("Awaiting
    Approval") and `grid.catalogEntry.isNotAvailable` ("Not
    Available"), and titles the approval window
    `grid.catalogEntry.approvedRepresentation.title`, whose text
    `PublicationFormatGridHandler::setApproved()` takes from
    `grid.catalogEntry.approvedRepresentation.message`.
  - `templates/controllers/grid/catalogEntry/form/formatForm.tpl`, the
    form of both "Add publication format" and a format's "Edit", prints
    `grid.catalogEntry.remotelyHostedContent`,
    `grid.catalogEntry.remoteURL`, `grid.catalogEntry.isbn`,
    `grid.catalogEntry.isbn13.description` and
    `grid.catalogEntry.isbn10.description`.
  - Read in the code, in states the Steps do not set up: the approval
    window's text when approval is taken back
    (`grid.catalogEntry.approvedRepresentation.removeMessage`); a
    format file's "Awaiting Approval" and "Approved" links
    (`grid.catalogEntry.availableRepresentation.notApproved`,
    `.approved`); "Dependent Files" in an HTML or XML file's row, which
    `PublicationFormatGridRow` adds (`submission.dependentFiles`). An
    approved format's "Approved"
    (`submission.complete`) is empty in OMP's French (Canada) file too,
    so pkp-lib's French (Canada) text for its own "Complete",
    "Complétée", stands in for it.
  - `grid.catalogEntry.availableRepresentation.title` has a French
    (Canada) text, "Approbation du format" ("Format Approval"), from
    the first French (Canada) files
    ([453d1ff6e0](https://github.com/pkp/omp/commit/453d1ff6e027eb9910f307e4f68340ef4fead6b7),
    2013), when the window's English title was also "Format Approval".
    The English became "Format Availability" in
    [b9affacac](https://github.com/pkp/omp/commit/b9affacacd5f72429b0bd6b620cef29a10fcf4fe) (2015-10-19,
    `pkp/pkp-lib#825`) and the French (Canada) text was not changed.

  Their English texts date from 2015 to 2021: the column, the
  availability links and the remote box from `pkp/pkp-lib#825` and
  `pkp/pkp-lib#1123` (2015, 2016), the approval texts from
  `pkp/pkp-lib#825` and `pkp/pkp-lib#1294` (2015, 2016), "Dependent
  Files" from `pkp/pkp-lib#1631` (2016), and the ISBN boxes from
  `pkp/pkp-lib#6893`
  ([5b168227c](https://github.com/pkp/omp/commit/5b168227c6bfc926d5bb87d2c8fabe40c20db071), 2021-04-01).
  None ever had a French (Canada) text: their entries first appear,
  empty, in
  [3bcd14e06](https://github.com/pkp/omp/commit/3bcd14e06cc22367cecae0210fb6834a79c98991)
  (2023-01-30). 3.4 and 3.3 have the same empty entries and the same
  wrong title; 3.3's format window has no ISBN boxes.
- On screen (`main` and 3.5), a book's Production stage, for the
  staff and the book's author:
  `notification.type.formatNeedsApprovedSubmission` and
  `notification.type.visitCatalog`, the paragraphs under "En attente
  d'approbation." and "Gestion du catalogue", empty in
  `locale/fr_CA/locale.po`. OMP's
  `ApproveSubmissionNotificationManager::getNotificationMessage()`
  translates them for the notice the workflow's Production stage shows;
  the two headings have French (Canada) texts.
  Both paragraphs had French (Canada) texts from the first French
  (Canada) files of 2013 up to OMP 3.1.2. In 2019 OMP removed them in
  every language: ce205d583 (`pkp/omp#700`, versioning) dropped
  `notification.type.visitCatalog` in English and every translation, and
  5ea424e69 (`pkp/pkp-lib#5235`) rewrote the English
  `formatNeedsApprovedSubmission` for the Publication tab and dropped
  its translations. [47c3a40f4](https://github.com/pkp/omp/commit/47c3a40f4a75946e5b123c20427843a461a375e6)
  (2020-02-27, "Re-add missing locale key") brought back the English
  `visitCatalog` alone. French (France) has both texts again; French
  (Canada) has had empty entries since
  [3bcd14e06](https://github.com/pkp/omp/commit/3bcd14e06cc22367cecae0210fb6834a79c98991)
  (2023-01-30). 3.4 and 3.3 have the same empty entries, and their
  editorial Production tab requests both notices
  (`WorkflowTabHandler::getProductionNotificationOptions()`; code).
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
  - The Publication Formats page's column, its remote box and its
    address have no text in Arabic, Central Kurdish, Greek, Kyrgyz and
    Vietnamese, and the three ISBN texts none in those and in Scottish
    Gaelic, Norwegian Bokmål and Russian.
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

Enter the missing French (Canada) texts, and correct two wrong ones, on PKP's
Weblate (translate.pkp.sfu.ca), which writes the locale files, rather
than commit them. This is work for a developer with a Weblate account:
OMP's French (Canada) files have had no translator's commit since
2023-07-20 ([5ff9cb3d4](https://github.com/pkp/omp/commit/5ff9cb3d43ccbac0c43d4afc4f7ca93b3dcae263)), so the translators cannot be counted on to
pick it up. It touches OMP alone: every text is OMP's own, none
pkp-lib's. The other languages' gaps under Cause are not in the fix;
they need their own translators. The texts are those of
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-french-book-page-raw-keys/fix.diff),
in six components of Weblate's `omp` project: `editor`, `locale`,
`manager`, `submission`, `themes-default` (the default theme) and
`blocks-browse` (the Browse block). French (Canada) takes texts in all
six; French (France) takes the priced link in `locale` and the rounds'
names in `submission`. The component names are read from the files'
headers: French (France)'s name the first four, other languages'
name `themes-default` (German's among them) and `blocks-browse`
(Catalan's, Czech's and Danish's),
since most French (Canada) files this fix touches name none.

What the diff holds: 78 texts. 75 are French (Canada): 62 empty
entries filled, 11 entries added (1 in the default theme's file, 8 in
the Browse block's, the 2 review rounds' names) and 2 texts corrected
(the "Format Availability" window's title and the priced link). 3 are
French (France): the 2 review rounds' names added and the priced link
corrected. In detail:

- The 62 empty entries and the default theme's entry. Each text is
  copied from OMP's French (France) files, except where OMP's French
  (Canada) already has its own word for the same thing: "En vedette" (its `catalog.feature`)
  for "Featured", "Volume édité" (its `submission.workflowType.editedVolume`)
  for "Edited Volume", and two texts taken from OJS's French (Canada)
  files: the count, "{$numTitles} titre(s)", and the "Submissions"
  list's "Assigned To Editor" field, "Assignée au,à la
  rédacteur-trice". The Catalog page's texts follow the same rule: "En
  vedette" for "Featured" (French (France) says "À la une") and "série"
  for "series" (French (France) says "collection"); "Ordonner les titres
  en vedette" and "Enregistrer l'ordre" are this report's own wording,
  since French (France)'s "Enregistrer la commande" reads as saving a
  purchase order. The ordering notice names the up and down buttons
  only, as pkp-e2e#745 proposes for the English, since no row can be
  dragged. A format file's "Approved" reads "Approuvé", the word the
  diff gives a format's, where French (France) says "Accepté". The
  Production notice's two paragraphs are French (France)'s, which
  follow the English as it stands; if the English texts are reworded as
  `pkp-e2e#743` proposes, the French follows them.
- The "Format Availability" window's title,
  "Disponibilité du format" as French (France) says it, in place of
  "Approbation du format".
- The Browse block's French (Canada) file, which holds no entry: "Parcourir", "Bloc Parcourir", "Catégories" and the
  description from OJS's French (Canada) Browse block, "Séries" and
  "Nouveautés" as OMP's French (Canada) already says them, "Paramètres"
  from French (France), and the settings form's title in this report's
  own wording.
- The two rounds' names, in French (Canada) and French (France). In
  French (Canada) the external round's name replaces pkp-lib's text
  for a journal's single review stage, the third wrong text the Steps
  show.
- `{$format}` added to the priced link, in French (Canada) and French
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

The texts are a proposal for the translators. "Achat {$format} (…)" and
the rounds' names ("Évaluation interne (Cycle {$round})", "Évaluation
externe (Cycle {$round})", built from OMP's stage names and pkp-lib's
"Évaluation (Cycle {$round})") and the Browse block's "Options de
l'outil Parcourir" are this report's own wording, and the copies carry French (France)'s own
punctuation ("&nbsp;; " between names, a hyphen in "{$name} - Sans ce
chapitre" where English has a dash) for the translators to settle.

Tried on `main`, with the diff applied to the checkout: every step
read the diff's text in place of the code or the wrong words (step 9,
for one, "Chapitre créé"; step 13 "Sarah Carter (éd.)"; step 48
"Livre"), and the same steps in English, and the French labels that
were already translated, read the same with the diff in and out.
With the `editor.po` entry in, the "Submissions" list read
"Évaluation interne (Cycle 1)" at step 49 and "Assignée au,à la
rédacteur-trice" at step 50; the English panel kept "Assigned To
Editor". The Production stage's box read the diff's French paragraph
under each heading at steps 53, 54 and 58, and the same steps in
English read the English texts with the diff in and out.

**Alternatives**

- Commit the diff to OMP: the same result at once, but Weblate's next
  sync may conflict with it or empty the entries again.
- Fall back from a regional language to its parent (French (Canada) to
  French) when a text is missing: it would cover every gap of this kind
  at once, but it goes against the design above, a product
  decision. `Locale::translate()`
  already calls a hook of the same name, which the Default Translation
  plugin uses for an English fallback, so a plugin could do it without
  a change to pkp-lib. It would help only the sites that install it,
  and French (Canada) would still ship incomplete.
- Read pkp-lib's translated keys where one has the same word
  (`category.category` "Catégories", `submission.downloads`
  "Téléchargements"): it covers two of the French (Canada) entries the diff fills
  or adds,
  and the rest still need a text.
- Print the editor's name, the version's name and " — " from the
  template and translate only the words of `submission.editorName`,
  `submission.chapterCreated` and `submission.withoutChapter`: a code
  would then never replace a name or run on to one, in any language. It
  changes three English texts that most languages have translated.

**What goes with it**

- Left out of the diff: the other 374 entries without a text in
  `locale/fr_CA` (counted with the diff applied), which the report did
  not place on a screen; the rest of the theme's French (Canada) file.
- With the fix for spec U69 A7 the priced link then reads "Achat PDF
  (25.00 USD)".
- Older versions: `stable-3_5_0` and `stable-3_4_0` have the same empty
  entries and the same Browse block file with no entry (3.4 names the
  French (France) folder `fr_FR`). From OMP's
  history: Weblate commits to a `translations/stable-3_5_0` branch,
  which pkp merges into `stable-3_5_0` about monthly (latest
  8a6ff0375, 2026-09-18), and `stable-3_5_0` is merged forward into
  `main`, so texts entered once reach 3.5 and `main`. The last Weblate
  commit on `stable-3_4_0` is 5d7b75b79 (2025-02-14), so 3.4 is best
  given the same texts by a commit of its own, with the French (France)
  ones under `fr_FR`; whether Weblate still takes 3.4 texts is not
  known.
  `stable-3_3_0` has the book-page and catalog entries empty, no
  chapter-page texts, no French (Canada) folder for the Browse block,
  and no French (France) file to copy from.
- The guard: the U69 spec's French-page scenario asserting that a
  book's and a chapter's page show no `##` code, and the U68 spec's
  for the catalog pages and the "Browse" block, the U70 spec's for
  the Catalog page, the U73 spec's for the Publication Formats page
  and its windows, and the U33 spec's for the Production stage's notice
  (Planned items).

A proposal; the team decides.

Small: 78 texts entered on Weblate and no code, tried as a diff.

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
- Per version: `main` walked every group of the Steps. 3.5 walked every
  group but step 13; the editors' names were read in its code (next
  bullet). 3.4 and 3.3 were read in the code: the review rounds' names
  (steps 18, 20) do not exist before 3.5, 3.3 has no chapter pages
  (steps 3, 9) and its format window no ISBN boxes (steps 43 to 45).
- Step 13 on 3.5: `catalog/book/2` and `catalog/book/2/version/2`
  answered "404 Not Found" to `dbarnes`. That is 3.5's rule, not a
  fault: its `Repository::canPreview()` (lib/pkp) lets staff preview a
  book only in Copyediting or Production, and submission 2 is in
  review; `main` dropped the stage condition. The 3.5 dataset's
  contributors of submission 2 are not marked as volume editors either.
  The 3.5 code was read instead: `CatalogBookHandler` collects the
  `getIsVolumeEditor()` contributors, `authors.tpl` prints
  `submission.editorName` for each (lines 34 and 74), and the entry is
  empty in `locale/fr_CA/submission.po`.
- In step 13 the role under each name read "Volume editor" in French
  too; not looked into.
- Failures the walk recorded: on `main` the file view page of step 4
  threw "PDFJS is not defined" (spec U69 A23, reported apart) and its
  file request answered 500 (since fixed by `pkp/pkp-lib#13444`); on
  3.5 only the script error.
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
- The OAI-PMH "Resource Type" (spec U19 A13, step 48): read by
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
  translation missing": nothing on this fault. Not driven: the statistics download's
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
  entries of the 20 keys in OMP's `locale/en` and `locale/fr_CA` on
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
- The Publication Formats page (spec U73 A25, steps 41 to 47): taken by
  [`omp-french-publication-formats-raw-keys/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-french-publication-formats-raw-keys/walk.js),
  which saves nothing:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js omp shared/playwright/checks/issues/omp-french-publication-formats-raw-keys/walk.js`;
  `NB=1` in front takes the same steps in English (the check that the
  diff changes nothing else). Walked on `main` (OMP 3b0ecf794c,
  `lib/pkp` 3dc90c81a6) and `stable-3_5_0` (9c5e24246c, `lib/pkp`
  cf3f984335), on PostgreSQL, from pkp/datasets 566bb1f (2026-10-03),
  2026-10-04, and on `main` with the diff in and, in English, in and
  out. The two lines read the same codes. No request failed and no
  script error showed. The script reads the labels from the window's
  markup, where the address box's label is present, hidden, before the
  box is ticked. Code reads: the entries of the 16 keys in OMP's
  `locale/fr_CA`, `locale/fr` and `locale/en` on `main`, in
  `locale/fr_CA` on 3.5, `stable-3_4_0` (0aec65441f) and
  `stable-3_3_0` (8e72fc8836), and `submission.complete` in pkp-lib's
  `locale/fr_CA` on each; `PublicationFormatGridHandler`,
  `PublicationFormatGridCellProvider`, `PublicationFormatGridRow` and
  `formatForm.tpl` on `main`, 3.5, 3.4 and 3.3 (`.inc.php` there; 3.3's
  form has no ISBN boxes). History: `git log -S` of each key on OMP's
  `locale/en`, `en_US` and `fr_CA`. Upstream searched 2026-10-04 in
  pkp/pkp-lib, pkp/omp and pkp/ui-library by
  `grid.catalogEntry.availability`, `remotelyHostedContent`,
  `isbn13.description`, `approvedRepresentation`,
  `submission.incomplete`, `catalogEntry fr_CA`, "Approbation du
  format", "publication format French translation", "Format Approval
  French" and "ISBN French Canada": nothing on this fault
  (`pkp/pkp-lib#5487`, fields required in every language, is another
  fault).
- Fix trial: the kept scripts on `main` with the diff applied to OMP's
  checkout, and again with it taken out. After "Volume édité" replaced
  the French (France) "Ouvrage collectif" in the diff, steps 18 to 20
  were walked again with the diff in.
- Not driven: 3.4 and 3.3 (read in the code only); the eight keys the
  Cause lists as read in the code; the Catalog page's category column
  headings and its notice while ordering within a category or series; the External Review stage's name in
  the "Rôles" list's filter, the stage notice, the statistics page and
  the export plugins' lists (read in the code); on the Publication
  Formats page, an approved or available format, a format file's row
  and the approval window's text for taking approval back (read in the
  code); languages other than
  French (Canada) and English (read in the locale files only); the diff
  on 3.5.
- Unverified: whether Weblate holds French (Canada) texts for these
  keys that have not reached the branches. Its pages refuse a script,
  so it was not read; OMP's history holds no French (Canada) Weblate
  commit after [5ff9cb3d4](https://github.com/pkp/omp/commit/5ff9cb3d43ccbac0c43d4afc4f7ca93b3dcae263) (2023-07-20), the 2026-09-18 translations
  merge into `stable-3_5_0` included. No way round for a press was
  tried: offering "Français" (France) in place of French (Canada) (what
  it does to content entered in French (Canada) is not known), the
  Custom Locale plugin from the Plugin Gallery (not bundled with OMP),
  which lets a press override its texts, and the Default Translation
  plugin.
- The "Submissions" list (spec U23 A12, steps 49 and 50): read by
  [`shared/playwright/checks/issues/editorial-dashboard-french-raw-keys/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/editorial-dashboard-french-raw-keys/walk.js)
  with its
  [`lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/editorial-dashboard-french-raw-keys/lib.js),
  on an install freshly loaded from the default dataset: `dbarnes` opens "Submissions", chooses "français" and
  "Soumissions actives", reads submission 17's row and the "Filtres"
  panel, then the same in English:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js omp shared/playwright/checks/issues/editorial-dashboard-french-raw-keys/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5; `MODE=nb` in front
  reads the list and panel in English and French and changes nothing,
  the neighbour check). Walked 2026-10-04 on `main` (OMP 3b0ecf794c) and
  `stable-3_5_0` (OMP 9c5e24246c), pkp/datasets 1a5552c, with the same
  codes; on both lines OJS's and OPS's panels read French. The fix was
  tried on `main` with this report's diff joined in one file with the
  diffs of pkp-e2e#457 and of the "My Submissions" review counter
  report (`node bin/try-fix.js apply`), the script on a fresh install,
  `MODE=nb` with the diffs in, `revert`, and `MODE=nb` again. Code read:
  `editor.submissions.assignedTo` in OMP's `locale/en`, `locale/fr` and
  `locale/fr_CA` `editor.po` on `main`, `stable-3_5_0`,
  `upstream/stable-3_4_0` and `upstream/stable-3_3_0` (empty in French
  (Canada) on all four), its readers (`PKPSubmissionFilters::addAssignedTo()`
  on `main` and 3.5, `PKPSubmissionsListPanel` on 3.4 and 3.3, pkp-lib
  `origin/stable-3_4_0` and `origin/stable-3_3_0`), the 3.3 loader
  (`LocaleFile::load()`, which also drops an empty text) and `git log
  -S` of the key on OMP's `locale/`. Upstream also searched for
  `editor.submissions.assignedTo` and "Assigned To Editor" (pkp/omp,
  pkp/pkp-lib) on 2026-10-04: nothing on this fault.
- The Production stage's notice (spec U33 OMP3, steps 51 to 58): read by
  [`shared/playwright/checks/issues/omp-french-production-notice-raw-keys/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-french-production-notice-raw-keys/walk.js)
  with its
  [`lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-french-production-notice-raw-keys/lib.js),
  on an install freshly loaded from the default dataset; it changes
  nothing:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js omp shared/playwright/checks/issues/omp-french-production-notice-raw-keys/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5; `NB=1` in front takes
  the same steps in English without the language change, the neighbour
  check). Walked 2026-10-04 on `main` (OMP 3b0ecf794c, `lib/pkp`
  3dc90c81a6, `lib/ui-library` 280f98c5) and `stable-3_5_0` (OMP
  9c5e24246c, `lib/pkp` cf3f984335, `lib/ui-library` d4e01883),
  pkp/datasets 1a5552c, with the same codes on both. No request failed
  and no page script failed. The fix was tried on `main`: the script with
  the diff applied, `NB=1` with it in, `revert`, and `NB=1` again on a
  fresh install. Code read: the four `notification.type.*` keys of the
  box in OMP's `locale/en`, `locale/fr` and `locale/fr_CA` on `main`
  and `stable-3_5_0`, and in `locale/en` (`en_US`) and `locale/fr_CA` on
  `upstream/stable-3_4_0` (0aec65441) and `upstream/stable-3_3_0`
  (8e72fc883); OMP's `ApproveSubmissionNotificationManager` on `main`
  and the 3.4 and 3.3 `WorkflowTabHandler`; the trace by `git log -S`
  of both keys on OMP's `locale/` and the release tags `omp-3_1_2-4`
  (French (Canada) texts present) and `3_2_0-0` (absent).
  `pkp/omp#700` was found by the API's `commits/<sha>/pulls`;
  5ea424e69 and 47c3a40f4 were pushed without a pull request. Upstream
  also searched on 2026-10-04 in pkp/pkp-lib, pkp/omp and
  pkp/ui-library by `visitCatalog`, `formatNeedsApprovedSubmission`,
  "Gestion du catalogue", "Awaiting approval", "Catalog Management" and
  "monograph has been approved": nothing on this fault. Not driven: the
  editorial Production tab on 3.4 and 3.3 (read in the code).
