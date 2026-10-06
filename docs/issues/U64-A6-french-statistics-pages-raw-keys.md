# In French (Canada), a press's and a preprint server's statistics pages and site statistics settings show codes

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP, OPS
  - 3.5: OMP, OPS
  - 3.4: OMP, OPS (code)
  - 3.3: OMP, OPS (code; the "Monographs" or "Preprints" page only)
- **Introduced** not traced; present since at least [afc82dc81](https://github.com/pkp/omp/commit/afc82dc81) (2019-05-08), which gave OMP the page's first text in English only
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U64 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U64-usage-statistics.md#a6), spec U08 [A23](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U08-navigation-menus-and-site-chrome.md#a23) (a press's "Monographs" entry in the side menu)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager or editor of a press or a preprint server who reads the
interface in French (Canada) and opens Statistics sees codes
(untranslated keys, such as "##stats.publicationStats##") in place of
about twenty labels. On the "Monographs" ("Preprints" on a preprint
server) page they replace the browser tab's title, a chart button, the
table's title and its count line, and on a press also the heading and
the side menu's entry. On the "Press" ("Server") page they replace the
browser tab's title. In the window that "Télécharger le rapport" opens
on either page, they replace the description and the first button. A
Site Administrator sees three more on Administration › Site Settings ›
"Statistiques", in place of the descriptions of three settings.

No code is at fault: OMP's and OPS's own French (Canada) translation
files lack these texts, which a journal has. The fix is 39 texts
entered on PKP's translation platform. The usage figures, the downloads
and the settings work, and the same screens in English show every text.

Only a user whose interface language is French (Canada) sees the codes,
so it takes a press, a server or a site that offers French (Canada) as
an interface language; a user reading the same press in English sees
none. Other languages of OMP and OPS lack some of the same texts and
are left to their translators.

## Impact

- **Lost.** No usage figure, download or setting. Three site settings
  lose their explanation. The count line above the table ("0 of 0
  monographs" in English) shows a code without its two numbers, so the
  page does not say how many monographs match; the table's rows and
  their figures do not depend on these texts.
- **Who.** Managers and editors of a press or a preprint server who
  read Statistics in French (Canada), and the Site Administrator of
  such a site on the "Statistiques" tab.
- **Way round.** Switching the interface to English shows the texts.

Low: codes replace labels and help texts on staff screens, and the one
number they hide is the table's row count, not a usage figure. It would
rise if a code hid a usage figure or a control the user needs.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main` (or OPS `main`), freshly
  loaded: the press (the server) `publicknowledge`, which offers English
  and French (Canada). Nothing is created.

1. Sign in as `admin` (the Site Administrator, who is also a manager of
   `publicknowledge`).
2. Open the menu under the initials at the top right and, under "Change
   Language", choose "français".
3. Open Administration › "Paramètres du site"
   (`/index.php/index/fr_CA/admin/settings`) and its "Statistiques" tab.
   Read the description under "Statistiques géographiques",
   "Statistiques institutionnelles" and "API publique".
4. Open the first page of the side menu's "Statistiques" group
   (`/index.php/publicknowledge/fr_CA/stats/publications/publications`).
   Read the browser tab, the heading, the chart's buttons, the table's
   title, its count line and the line in the empty table.
5. Press "Télécharger le rapport". Read the window, then close it.
6. Open the group's "Presse" page ("Serveur" on a preprint server;
   `/index.php/publicknowledge/fr_CA/stats/context/context`). Read the
   browser tab.
7. Press "Télécharger le rapport". Read the window, then close it.

**Expected.** French text in each place, as a journal shows with its
own nouns: the three descriptions ("Sélectionner le type de
statistiques d'utilisation géographique qui peuvent être collectées par
les revues sur ce site. …"), the tab "Statistiques de l'article", the
heading "Articles", the buttons "Résumés" and "Fichiers", the title
"Renseignements sur l'article", the count "0 de 0 articles", the tab
"Statistiques de la revue", and the windows' descriptions and buttons
"Téléchargements d'articles" and "Téléchargements de la revue".

**Observed.** On OMP:

```
Step 3:  Statistiques géographiques     ##admin.settings.statistics.geo.description##
         Statistiques institutionnelles ##admin.settings.statistics.institutions.description##
         API publique                   ##admin.settings.statistics.sushi.public.description##
Step 4:  tab      ##stats.publicationStats## | Press de la connaissance du public
         heading  ##common.publications##
         buttons  ##stats.publications.abstracts## | Fichiers | Par jour | Par mois
         table    ##stats.publications.details##   ##stats.publications.countOfTotal##   [Télécharger le rapport]
         empty    ##stats.publications.none##
Step 5:  ##stats.publications.downloadReport.description##
         ##common.publications##
         ##stats.publications.downloadReport.downloadSubmissions.description##
         [##stats.publications.downloadReport.downloadSubmissions##]
Step 6:  tab      ##stats.contextStats## | Press de la connaissance du public
Step 7:  ##stats.context.downloadReport.description##
         ##stats.context.downloadReport.downloadContext.description##
         [##stats.context.downloadReport.downloadContext##]
```

- OPS shows the same codes, except that its heading in step 4 and the
  panel in step 5 read "Prépublications".
- On OMP the side menu's entry for step 4's page reads
  "##common.publications##" as well.
- Two more codes are names for screen readers only and do not show on
  screen; the browser's accessibility inspector shows them. The chart
  of step 4 is captioned
  "##stats.publications.totalAbstractViews.timelineInterval##", and the
  information icon beside step 6's table title "Consultations" is named
  "##stats.context.tooltip.label##" (a journal's reads "À propos des
  statistiques de la revue").
- The rest of each page is French: "Fichiers", "Par jour", "Par mois",
  the column headings, the windows' "Période", "Fichiers" and
  "Chronologie" panels.

No request failed and no script error showed. The same steps on OJS
show French text in every place named here.

## Cause

OMP's and OPS's French (Canada) locale files hold no text for these
keys. Each key names the app's own kind of publication or site
(monographs, preprints, presses, servers), so each app defines it in
its own `locale/en`, and in `locale/fr_CA/admin.po`, `manager.po` and
(OMP) `locale.po` the entry is `msgstr ""`.

`LocaleFile::loadArray()` (`lib/pkp/classes/i18n/translation/LocaleFile.php`)
drops an empty text, and `Locale::translate()`
(`lib/pkp/classes/i18n/Locale.php`) does not fall back to another
language, so the page prints `##key##`. That is PKP's stated design
(`pkp/pkp-lib#784` points to the "Default Translation" plugin for an
English fallback).

The texts came in English in four steps: the publications page in 2019
(`pkp/pkp-lib#3673`, `pkp/pkp-lib#4844`), the site settings'
descriptions on 2022-09-20 (`pkp/pkp-lib#8250`), the "Download Report"
windows on 2022-10-11 and the "Press" ("Server") page on 2022-10-29
(`pkp/pkp-lib#7318`). OJS's French (Canada) has all of them. OMP's and
OPS's entries first appear, empty, when the locale files were
rearranged on 2023-01-30, and have stayed empty.

Reach.

- The keys, 20 in OMP and 19 in OPS, where each is read:
  - `admin.settings.statistics.geo.description`,
    `….institutions.description` and `….sushi.public.description`:
    `PKPSiteStatisticsForm` (step 3, on screen).
  - `stats.publicationStats` and `stats.contextStats`: the page titles
    in `PKPStatsHandler` (steps 4 and 6, on screen).
  - `stats.publications.abstracts`, `.details`, `.none` and
    `.totalAbstractViews.timelineInterval`:
    `lib/pkp/templates/stats/publications.tpl` (step 4; the first three
    on screen, the caption in the page's hidden table).
  - `stats.publications.countOfTotal`:
    `lib/pkp/classes/components/PKPStatsPublicationPage.php`, line 74
    (`itemsOfTotalLabel`). The template fills it with the number of
    rows listed and the number that match (step 4, on screen).
  - `stats.publications.totalGalleyViews.timelineInterval`: the same
    hidden caption after "Fichiers" is pressed (read in the code).
  - `stats.publications.downloadReport.description`,
    `.downloadSubmissions` and `.downloadSubmissions.description`:
    ui-library's
    `src/pages/statsPublications/PublicationsDownloadReportModal.vue`
    (step 5, on screen).
  - `stats.context.downloadReport.description`, `.downloadContext` and
    `.downloadContext.description`: ui-library's
    `src/pages/statsContext/ContextDownloadReportModal.vue` (step 7, on
    screen).
  - `stats.context.tooltip.label` and `stats.context.tooltip.text`:
    the information icon in `lib/pkp/templates/stats/context.tpl`.
    ui-library's `Tooltip.vue` puts the label in a screen-reader-only
    span (in the page, step 6); the text shows on hover (read in the
    code).
- `common.publications` ("Monographs") has no text in OMP only; OPS has
  "Prépublications". It reaches past the statistics pages:
  - On screen: the heading in `templates/stats/publications.tpl`, the
    side menu's entry (`PKPTemplateManager`, line 1381) and the panel
    in `PublicationsDownloadReportModal.vue` (line 29).
  - Read in the code, not walked: the monographs option of the DOI
    setup form (`classes/components/forms/context/DoiSetupSettingsForm.php`,
    line 34); the publisher ID option of the metadata settings, where
    it fills `{$objects}` in `submission.publisherId.enable`
    (`MetadataSettingsForm.php`, line 36); and the list's title on the
    Native XML and ONIX 3.0 export pages
    (`PKPNativeImportExportPlugin.php`, line 129;
    `Onix30ExportPlugin.php`, line 110).
- Other languages (read in the locale files on `main`; a language
  counts when its entry is empty, or the key or the whole file is
  absent). They are outside this report's fix:
  - OMP, 33 translations: 10 lack the publications page's title (5
    empty, Italian without the key, 4 without a `manager.po`) and 15
    the "Press" page's.
  - OPS, 17 translations: 11 lack both titles (5 empty; French
    (France), Croatian and Portuguese without the key; 3 without a
    `manager.po`).
- Not this fault: on `main`, a journal with the JATS Template plugin
  enabled has a "JATS" column on "Articles" that reads "##stats.jats##"
  in French (Canada) (OJS's `pages/stats/StatsHandler.php`, line 231).
  `stats.jats` came to pkp-lib's English file with the JATS views
  (`pkp/pkp-lib#12310`, 2026-02-07) and is on `main` only. No other
  language has the text yet, as is usual before a release.
- Not this fault either: the codes the same pages show in the header
  and side menu ("##common.help##", "##doi.manager.displayName##" and,
  on `main`, "##navigation.content##"), which are not statistics texts.

## Proposed fix

A proposal: enter the missing French (Canada) texts for OMP and OPS on
PKP's Weblate (translate.pkp.sfu.ca), which writes the locale files,
rather than commit them. The French (Canada) translators can enter
them, or a developer with a Weblate account. The texts are in
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/french-statistics-pages-raw-keys/fix-omp.diff)
(20 texts) and
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/french-statistics-pages-raw-keys/fix-ops.diff)
(19 texts).

Where to enter them, as far as the repositories show:

- Components: Weblate's `omp` project, components `admin`, `manager`
  and `locale`; its `ops` project, components `admin` and `manager`.
  The names are read from the `Language-Team` addresses in the locale
  files' headers (`…/projects/omp/manager/…`).
- Branch: `stable-3_5_0`. Both apps merge a `translations/stable-3_5_0`
  branch into `stable-3_5_0` (OMP last on 2026-09-18, OPS on
  2026-09-23). `main` itself has had no `translations/main` merge
  since 2023; it holds the earlier 3.5 translation merges (OMP
  f5803864e of 2026-03-13, OPS 840fa84d65 of 2025-04-29) and not yet
  September's. So a text entered for 3.5 reaches `main` when 3.5 is
  next merged forward.

```diff
 msgid "stats.publicationStats"
-msgstr ""
+msgstr "Statistiques de la monographie"

 msgid "stats.publications.countOfTotal"
-msgstr ""
+msgstr "{$count} de {$total} monographies"

 msgid "stats.contextStats"
-msgstr ""
+msgstr "Statistiques de la presse"
```

Each text copies OJS's French (Canada) text with the app's own nouns,
the ones its French (Canada) files already use ("Presse", "Serveur",
"monographie", "prépublication"). The wording needs a French (Canada)
translator's yes before it is entered, on three points:

- The buttons "Download Monographs" and "Download Press" are actions in
  English. The diffs follow OJS's nouns ("Téléchargements d'articles",
  "Téléchargements de la revue") and propose "Téléchargements de
  monographies" and "Téléchargements de la presse"; OJS's wording may
  itself be the slip, since the neighbouring buttons read "Télécharger
  les fichiers".
- A press's chart button and caption name the catalog in English
  ("Catalog Entries", "Total catalog views by date"). The diffs propose
  "Entrées de catalogue" and "Total des consultations du catalogue par
  date".
- "Monographies" for `common.publications` must also fit the DOI setup
  form, the metadata settings' publisher ID option and the export
  pages' list title (Cause, Reach), which take the text too.

Tried on `main`, with the two diffs applied: the walk read French text
in every place of steps 3 to 7 on both apps ("Statistiques de la
monographie", "Monographies", "0 de 0 monographies", "Statistiques du
serveur", "À propos des statistiques du serveur"), and no statistics
code was left. The English screens read the same with the diffs in and
out.

**Alternatives**

- Commit the diffs to OMP and OPS: the same result at once, but
  Weblate's next sync may conflict with it or empty the entries again.
- Copy OMP's French (France) texts: they call a press "maison
  d'édition", which the rest of OMP's French (Canada) interface does
  not, and OPS has no French (France) text to copy.
- Fall back from a missing text to another language in
  `Locale::translate()`: it would cover every gap of this kind, but PKP
  chose a plugin for that (`pkp/pkp-lib#784`), and it is a product
  decision.

**What goes with it**

- Older versions: `stable-3_4_0` has the same 39 empty entries, and its
  last `translations/stable-3_4_0` merge is from 2025-02-14 (OMP) and
  2024-02-22 (OPS), so 3.4 may need a developer's commit of the same
  texts. On `stable-3_3_0` only the publications page's entries exist,
  all empty: eight of the diff's texts apply in OMP and seven in OPS.
- Left out: the other languages named under Cause; the "JATS" column's
  text, which every language still needs; OMP's and OPS's other empty
  French (Canada) entries, which this report did not place on a
  statistics screen.
- The guard: the U64 spec's French reading of the statistics pages and
  the "Statistiques" tab on a press and a preprint server, asserting
  that they show no `##` code (a Planned item).

Small: translations only, in two apps, with no code change.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/french-statistics-pages-raw-keys/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/french-statistics-pages-raw-keys/walk.js)
  takes the Steps on OJS (the journal control), OMP and OPS and changes
  no data. Run it on an install loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/french-statistics-pages-raw-keys/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). `NB=1` in front
  takes steps 3 to 7 in English instead, the check that the diffs
  change nothing else.
- Walked on `main` and `stable-3_5_0`, on PostgreSQL, from pkp/datasets
  e8dafbc (2026-10-02). The two lines read the same codes on OMP and
  OPS; on 3.5 OJS's "Articles" table has no "JATS" column.
- Differences from the Steps: the script opens the pages of steps 3, 4
  and 6 by their addresses, and reads the two screen-reader names from
  the page's markup. The dataset's statistics tables are empty: the
  code sits where English reads "0 of 0 monographs", and no row was on
  screen to read in French.
- Fix trial: `node bin/try-fix.js apply …/fix-omp.diff omp` and
  `… fix-ops.diff ops`, the kept script in French, then with `NB=1`
  with the diffs in and out, then `revert`.
- Tips: OJS `main` b84f8e2e44 (`lib/pkp` ddd8ab243a); OMP `main`
  3b0ecf794c and OPS `main` c8af945bb7 (`lib/pkp` 3dc90c81a6).
  `stable-3_5_0`: OJS 091fb65453, OMP 9c5e24246c, OPS 38b61882d3
  (`lib/pkp` cf3f984335, `lib/ui-library` d4e01883). `stable-3_4_0`: OJS
  c1827e3527, OMP 0aec65441f, OPS acd8ae704b, pkp-lib 9e41f10273.
  `stable-3_3_0`: OJS ac77c9fb35, OMP 8e72fc8836, OPS c5532e2161,
  pkp-lib ac3fa73402.
- Code reads, on each branch: the 20 keys in each app's `locale/en`
  (`en_US` on 3.3) and `locale/fr_CA` `admin.po`, `locale.po` and
  `manager.po`. `main`, 3.5 and 3.4: OJS has every text; OMP's 20 and
  OPS's 19 entries are empty. 3.3: the eight keys of the publications
  page exist (`common.publications`, `stats.publicationStats`,
  `stats.publications.abstracts`, `.details`, `.countOfTotal`, `.none`
  and the two captions), empty in OMP and, but for
  `common.publications`, in OPS; the other twelve do not exist there
  (no "Press" page, no download windows, no site statistics tab). Also
  pkp-lib's `templates/stats/publications.tpl` on `main`, 3.4 and 3.3,
  `templates/stats/context.tpl` on `main`, `PKPStatsHandler` on `main`,
  3.4 and 3.3 (the page titles), `PKPSiteStatisticsForm` on 3.4, and on
  `main` `LocaleFile::loadArray()`, `Locale::translate()`,
  `PKPStatsPublicationPage`, ui-library's two download windows and
  `Tooltip.vue`, every reader of `common.publications` in OMP (a search
  of its `classes`, `pages`, `plugins`, `lib/pkp` and
  `lib/ui-library/src`), OJS's `pages/stats/StatsHandler.php` and
  `PKPStatsPublicationService::isJatsPluginAvailable()` (the "JATS"
  column), every `locale/*/manager.po` and `admin.po` of OMP and OPS
  for the language counts, and OMP's `locale/fr` for the French
  (France) wording.
- Weblate: the `Language-Team` header of OMP's `locale/fr` `admin.po`,
  `manager.po` and `locale.po` and of OPS's `locale/cs` `admin.po` and
  `manager.po` (OMP's French (Canada) `manager.po` names none);
  `git log --merges --grep='translations/'` on each branch (OMP
  15e98f9b8 and OPS 934933ae0f on `stable-3_5_0`; OMP 3e975eb3b and
  OPS b04d50a355 on `stable-3_4_0`; on `main`, OMP fc7f25a92 of
  2023-06-16 and OPS 1b17475897 of 2023-04-14 are the last
  `translations/main` merges).
- Introduced: `git log -S'msgid "<key>"'` on OMP's and OPS's `locale`.
  The English texts: `common.publications` in OMP
  [afc82dc81](https://github.com/pkp/omp/commit/afc82dc81) (2019-05-08,
  `pkp/pkp-lib#3673`); `stats.publicationStats` in OMP
  [3935ac1c7](https://github.com/pkp/omp/commit/3935ac1c7) and OPS
  [66896a1d28](https://github.com/pkp/ops/commit/66896a1d28)
  (2019-12, `pkp/pkp-lib#4844`); the site descriptions in OMP
  [611ddb642](https://github.com/pkp/omp/commit/611ddb642) and OPS
  [c5a230f33b](https://github.com/pkp/ops/commit/c5a230f33b)
  (2022-09-20); the download windows in OMP
  [36ab96eb9](https://github.com/pkp/omp/commit/36ab96eb9) and OPS
  [2c7c676a01](https://github.com/pkp/ops/commit/2c7c676a01)
  (2022-10-11); the "Press" ("Server") page in OMP
  [2ec840fd6](https://github.com/pkp/omp/commit/2ec840fd6) and OPS
  [971e97009d](https://github.com/pkp/ops/commit/971e97009d)
  (2022-10-29). The empty French (Canada) entries first appear in OMP
  3bcd14e06 and OPS eb1d961fe7 (2023-01-30). `stats.jats`: pkp-lib
  9d774d490f (2026-02-07).
- Upstream: pkp/pkp-lib, pkp/omp, pkp/ops and pkp/ui-library searched
  on 2026-10-03 by `stats.publicationStats`,
  `admin.settings.statistics.geo.description`, `stats.jats`, "fr_CA
  statistics", "statistics French press", "statistics French missing
  translation OMP" and "statistics locale key missing": nothing on this
  fault.
- Not driven: 3.4 and 3.3 (code only); the information icon's hover
  text and the chart's caption after "Fichiers" (code only); languages
  other than French (Canada) and English (locale files only); the
  diffs on 3.5; the "Issues", "Counter R5" and editorial statistics
  pages; the DOI setup form, the metadata settings and the export
  pages that read `common.publications` (code only).
- Unverified: whether Weblate already holds French (Canada) texts for
  these keys that have not reached the branches; whether Weblate still
  takes texts for 3.4; whether its components are still named as the
  file headers say.
