# In French (Canada), a press's appearance settings and a book's or preprint's download chart show untranslated codes

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP, OPS
  - 3.5: OMP, OPS
  - 3.4: OMP, OPS (code)
  - 3.3: OMP (code; no download chart)
- **Introduced** not traced as one change. On a press, the oldest missing text is the home page's "Featured Books", added in English only in [849994307d](https://github.com/pkp/omp/commit/849994307ddd0495824d37a9cd478ff2995fabd8) (2014-09-24). On a preprint server the texts came with the download chart's option, in English only: `pkp/ops#313` for `pkp/pkp-lib#6782` · [cc159de973](https://github.com/pkp/ops/commit/cc159de973cad72af95d859a082b94db7586c342) · 2022-03-09 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U10 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U10-appearance-and-theming.md#a6) · spec U11 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U11-highlights.md#a7)
- **Checked** 2026-10-03, and 2026-10-04 for the home page carousel, each branch's tip (the commits in Evidence)

2026-10-04: the home page carousel's arrows were walked on a press and
a preprint server (spec U11 A7): a screen reader names them by codes.
Steps 8 to 12 are new; the proposed fix already holds both texts.

## Summary

A press manager who uses the interface in French (Canada) and opens
Settings › Website › "Apparence" reads codes (untranslated keys, such
as "##plugins.themes.default.name##" for the theme's name) in place of
36 labels, descriptions and choices: every field of the theme on
"Thème", the press thumbnail, "Featured Books", "New Releases" and
"Order of monographs" on "Configuration", and the two cover image sizes
on "Configuration avancée". A preprint server's "Thème" shows the
download chart's field and its three choices as codes.

When the press or server turns that chart on, a French (Canada) reader
of a book's or a preprint's page sees a code as the chart's heading,
and the months read "##plugins.themes.default.displayStats.monthInitials## 2026"
for January and "undefined 2026" for every other month. The download
counts show, but not which month they belong to. On the home page, a
screen reader names the highlights carousel's two arrows by codes too.
The settings save and work.

It happens on a press or preprint server that offers French (Canada);
the chart is off until the manager picks one of its two chart types. A
journal is not affected: its theme texts are translated, and the codes
its "Thème" shows are texts new on `main` that await translation in
every language. French (France) has nearly all the press's texts, but on a preprint server 9 of the other
16 languages lack the chart's texts too, French (France), Spanish and
Portuguese among them. No code changes: PKP's French (Canada)
translators, or a PKP developer with an account, enter the missing
texts on PKP's translation platform.

## Impact

- **Lost.** Readers lose the months of the download chart, and screen
  reader users the names of the carousel's arrows. Staff lose the names
  and help of the settings listed above.
- **Who.** French (Canada) readers of every book or preprint page, on
  a press or server that shows the chart; screen reader users on the
  home page of a press or server with highlights, where the carousel is
  the first block under the header; its managers on the settings tabs.
- **Way round.** The manager can switch the interface to English. A
  reader can switch the page to English with the sidebar's language
  block, which the default test data's press and preprint server both
  show; a site without it offers none. A screen reader user has no way
  to learn the arrows' names.

Low: the codes are untranslated text, the settings work and the chart's
counts stay, and the chart is off by default; it would be medium if the
chart were on by default.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main` (or OPS `main`), freshly
  loaded: the press (the server) `publicknowledge`, which offers English
  and French (Canada). Nothing is created beforehand: step 6 changes
  one theme setting, and steps 9 and 10 add two highlights, since the
  dataset holds none and with one slide the carousel hides its arrows.
  Steps 8 to 12 can follow on from step 7: step 6's setting does not
  touch the carousel.

Settings:

1. Sign in as `rvaca` (the manager).
2. Open the menu under the initials at the top right and, under "Change
   Language", choose "français".
3. Open "Paramètres" › "Site Web"
   (`/index.php/publicknowledge/fr_CA/management/settings/website`). The
   "Apparence" tab opens on its side tab "Thème". Read the "Thème" list
   and every field under it.
4. Open the side tab "Configuration" and read every field.
5. Open the side tab "Configuration avancée" and read every field.

Readers:

6. Back on "Thème", in the last field (the download chart's), choose
   the second choice (the bar chart) and press "Enregistrer".
7. Open a published item in French: on a press, book 5 "Bomb Canada and
   Other Unkind Remarks in the American Media"
   (`/index.php/publicknowledge/fr_CA/catalog/book/5`); on a preprint
   server, preprint 2 "The Facets Of Job Satisfaction: A Nine-Nation
   Comparative Study Of Construct Equivalence"
   (`/index.php/publicknowledge/fr_CA/preprint/view/2`). Read the chart's
   heading and its months.

Home page carousel:

8. Open "Settings" › "Website" in English
   (`/index.php/publicknowledge/en/management/settings/website`), the
   top tab "Setup", then its side tab "Highlights".
9. Press "Add Highlight". Type in the English boxes (the form's first;
   French ones are not needed): in "Title", `First highlight u11d`; in
   "URL", `https://example.org/u11d-1`; in "Button Label", `Read more`.
   Press "Save".
10. Press "Add Highlight" again: `Second highlight u11d`,
    `https://example.org/u11d-2`, `Read more`, "Save".
11. Open the menu under the initials at the top right and, under
    "Change Language", choose "français".
12. Open the home page (`/index.php/publicknowledge/fr_CA`). The
    carousel, headed "En vedette" for a screen reader, shows the two
    highlights. Read the names of its two arrows, as a screen reader
    says them (the buttons' `aria-label`).

**Expected.** French text in each place, as a journal shows it: "Thème
par défaut", "Typographie", "Couleur", "Options d'affichage des
statistiques d'utilisation" with its three choices, a press's
thumbnail, home page lists, catalog order and cover sizes in French,
and on the item's page the heading "Téléchargements" over months "Jan.",
"Fév.", "Mar." and so on. The carousel's arrows named in French, as on
a journal.

**Observed.** On OMP:

```
Step 3:  Thème                 [##plugins.themes.default.name##]
         ##plugins.themes.default.option.typography.label##   ##…typography.description##
             ##…typography.notoSans## … ##…typography.lora_openSans##   (7 choices)
         ##manager.setup.contextSummary##                     ##…showDescriptionInPressIndex.option##
         ##…useHomepageImageAsHeader.label##                  ##…useHomepageImageAsHeader.description##  ##….option##
         ##…colour.label##                                     ##…colour.description##
         ##…showCatalogSeriesListing.label##                  ##…showCatalogSeriesListing.option##
         ##…displayStats.label##   ##…displayStats.none## | ##…displayStats.bar## | ##…displayStats.line##
Step 4:  ##manager.setup.pressThumbnail##  (help: ##manager.setup.pressThumbnail.description##)
         Barre latérale: … | ##plugins.block.browse.displayName##
         ##manager.setup.displayFeaturedBooks.label##   ##manager.setup.displayFeaturedBooks##
         ##manager.setup.displayNewReleases.label##     ##manager.setup.displayNewReleases##
         ##catalog.sortBy##   ##catalog.sortBy.catalogDescription##
             Titres (A-Z) | Titres (Z-A) | Date de publication (du plus ancien) | Date de publication (du plus récent)
             | ##catalog.sortBy.seriesPositionAsc## | ##catalog.sortBy.seriesPositionDesc##
Step 5:  ##manager.setup.coverThumbnailsMaxWidth##    ##manager.setup.coverThumbnailsMaxWidthHeight.description##
         ##manager.setup.coverThumbnailsMaxHeight##   ##manager.setup.coverThumbnailsMaxWidthHeight.description##
Step 7:  ##plugins.themes.default.displayStats.downloads##
         x axis: ##plugins.themes.default.displayStats.monthInitials## 2026 | undefined 2026 | undefined 2026 | …
Step 12: <button class="swiper-button-prev" aria-label="##plugins.themes.default.prevSlide##">
         <button class="swiper-button-next" aria-label="##plugins.themes.default.nextSlide##">
```

(`##…` abbreviates `##plugins.themes.default.option.`.)

- On OPS, steps 3 and 6 show only the download chart's field as codes:
  "##plugins.themes.default.option.displayStats.label##" over
  "##plugins.themes.default.option.displayStats.none##", "…bar##" and
  "…line##". Steps 4 and 5 read French. Step 7 shows the same heading
  and months as on OMP, and step 12 the same two arrow names.
- The rest of each tab reads French ("Logo", "Image de la page
  d'accueil", "Pied de page", "Barre latérale", "Contenu additionnel"),
  and the English tabs show none of these codes.
- The same steps on OJS read French in every place named here, the
  chart's months read "Jan.", "Fév.", "Mar."…, and the arrows are named
  "À la diapositive précédente" and "À la diapositive suivante". In
  English a press's and a preprint server's arrows read "Previous slide"
  and "Next slide".

## Cause

The texts have no French (Canada) translation in OMP's and OPS's own
locale files. `LocaleFile::loadArray()`
(`lib/pkp/classes/i18n/translation/LocaleFile.php`) drops an empty
text, and `Locale::translate()` (`lib/pkp/classes/i18n/Locale.php`) does
not fall back to another language, so the screen prints `##key##`.
That is PKP's stated design (`pkp/pkp-lib#784` points to the "Default
Translation" plugin for an English fallback).

Where each text is missing:

- OMP's default theme, `plugins/themes/default/locale/fr_CA/locale.po`:
  the file holds a header and no entry. Weblate created it that way in
  [bcac5a5a8c](https://github.com/pkp/omp/commit/bcac5a5a8c3f0e1940b98b662ef572152e4e9df4)
  (2023-05-23); there was no French (Canada) file for the theme before.
  `DefaultThemePlugin::init()` reads 21 of its keys for the "Thème"
  fields and `getDisplayName()` the theme's name.
- OMP's `locale/fr_CA/manager.po` and `locale.po`: 14 entries with an
  empty `msgstr`: `manager.setup.contextSummary` (the theme's summary
  field), `manager.setup.pressThumbnail` and its description,
  `manager.setup.displayFeaturedBooks` and `displayNewReleases` with
  their `.label`, `catalog.sortBy`, `catalog.sortBy.catalogDescription`,
  `catalog.sortBy.seriesPositionAsc` and `…Desc`, and
  `manager.setup.coverThumbnailsMaxWidth`, `…MaxHeight` and
  `…MaxWidthHeight.description`. Their English texts date from 2014 to
  2020, and the French (Canada) entries first appear, empty, in
  [3bcd14e06c](https://github.com/pkp/omp/commit/3bcd14e06cc22367cecae0210fb6834a79c98991)
  (2023-01-30).
- OPS's default theme, `plugins/themes/default/locale/fr_CA/locale.po`:
  the four field texts `plugins.themes.default.option.displayStats.*`
  and the chart's `plugins.themes.default.displayStats.monthInitials`,
  `.downloads` and `.noStats` have an empty `msgstr`, and
  `plugins.themes.default.nextSlide` and `.prevSlide` are absent. Its
  French (Canada) entries first appear, empty, in
  [eb1d961fe7](https://github.com/pkp/ops/commit/eb1d961fe79bbdf2feb2a8035934b1ecb1c6f8e7)
  (2023-01-30). The rest of the file was translated in 2020.

Why the chart loses its months: `ThemePlugin::displayUsageStatsGraph()`
(`lib/pkp/classes/plugins/ThemePlugin.php`, line 1000) passes the months
to the page as `explode(' ', __('plugins.themes.default.displayStats.monthInitials'))`.
Without a text that is a one-item list holding the code, and
`lib/pkp/js/usage-stats-chart.js` (line 152) labels each month
`months[month - 1] + ' ' + year`, so January reads the code and every
other month "undefined". `ThemePlugin::getUsageStatsChartData()` (line
941) builds the same list for its `monthLabels`; nothing in the three
apps calls it at these tips.

Reach:

- On screen (`main` and 3.5): the codes in Observed, OMP and OPS.
  Among them are the carousel arrows' texts,
  `plugins.themes.default.nextSlide` and `.prevSlide`.
  `DefaultThemePlugin::getSwiperI18n()` puts the two texts on the page.
  The theme's `js/main.js` passes them to Swiper's `a11y` options, which
  set the arrows' `aria-label`. Both apps added the texts in English
  only, with the carousel, for `pkp/pkp-lib#9262`
  ([328d82267e](https://github.com/pkp/omp/commit/328d82267e925a0205febc63ec4005e70a53a51a),
  [654d005b62](https://github.com/pkp/ops/commit/654d005b629155a8df3316247db3acfdbda9f7a0),
  2023-09-12). 3.4 has no carousel on the home page, 3.3 no highlights.
- Read in the code, not walked:
  - `plugins.themes.default.displayStats.noStats`, the chart's "no
    figures yet" notice, which shows only until the chart has loaded
    (`templates/frontend/objects/monograph_full.tpl`,
    `preprint_details.tpl`); empty in both apps.
  - `plugins.themes.default.description`, the theme's description on
    "Plugiciels"; absent in OMP.
- The Browse block's name on step 4 ("##plugins.block.browse.displayName##",
  a 37th code on these tabs) has the same cause in the Browse block's own
  French (Canada) file. Its texts are in the fix of [pkp-e2e#291](https://github.com/jardakotesovec/pkp-e2e/issues/291), an issue
  about a press's French (Canada) book and catalog pages, so this report
  leaves them there. Both fixes add the chart's heading
  (`plugins.themes.default.displayStats.downloads`, "Téléchargements")
  to OMP's theme file: whichever is entered first, it needs entering
  once.
- Left out: texts added on `main` only and not yet translated into any
  language. They are awaiting translation before the next release, not
  missing:
  - a journal's "Thème" shows "##manager.setup.journalContentOrganization##",
    its description and its three choices. OJS added them in English in
    [9486d8e182](https://github.com/pkp/ojs/commit/9486d8e182356a101a018450ea2073c747addbaa)
    (2025-05-27, `pkp/pkp-lib#9295`); this is why a journal's codes are
    not in Affects;
  - the chart's "Last 12 months" and "All time" button
    (`plugins.themes.default.displayStats.lastYear` and `.allTime`,
    `pkp/pkp-lib#12929`, 2026-07-06), which shows once an item has more
    than twelve months of figures; it is untranslated in all three apps;
  - the "##navigation.content##" and "##manager.userComment.comments##"
    tabs on the same page.
- Other languages, outside this fix and left to their translators
  (read in the locale files on `main`; a language counts when its text
  is empty or absent):
  - OMP, 33 languages: Greek, Kyrgyz and Vietnamese lack all 42 texts
    of the fix, as French (Canada) does; 19 others lack some, French
    (France) three (the summary choice and the carousel's two arrows).
    The chart's months are missing in 18 of the 33.
  - OPS, 17 languages: Catalan, Croatian, French (France), Indonesian,
    Kyrgyz, Norwegian Bokmål, Portuguese, Spanish and Turkish lack all
    nine texts, as French (Canada) does, so their readers meet the same
    chart.

## Proposed fix

A proposal: enter the missing French (Canada) texts on PKP's Weblate
(translate.pkp.sfu.ca), which writes the locale files, rather than
commit them. The French (Canada) translators can enter them, or a
developer with a Weblate account. The texts are in
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/french-appearance-settings-raw-keys/fix-omp.diff)
(42 texts: 28 in the theme's file, 10 in `manager.po`, 4 in
`locale.po`) and
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/french-appearance-settings-raw-keys/fix-ops.diff)
(9 texts in the theme's file).

```diff
 msgid "plugins.themes.default.displayStats.monthInitials"
-msgstr ""
+msgstr "Jan. Fév. Mar. Avr. Mai. Juin. Juil. Août Sep. Oct. Nov. Déc."

 msgid "catalog.sortBy"
-msgstr ""
+msgstr "Ordre des monographies"
```

Where to enter them: Weblate's `omp` project, components
`themes-default`, `manager` and `locale`, and its `ops` project,
component `themes-default` (unverified: taken from the `Language-Team`
lines of OMP's French (France) files and OPS's French (Canada) theme
file, since OMP's French (Canada) files have none). A text entered for 3.5
reaches `stable-3_5_0` through its `translations/stable-3_5_0` merges and
`main` when 3.5 is next merged forward.

The wording copies OJS's French (Canada) theme texts, with the app's own
nouns as its French (Canada) files already use them: "presse",
"série", "en vedette", "Nouveautés" (not French (France)'s "maison
d'édition" and "collection"). The rest is this report's own wording,
for a French (Canada) translator to settle:

- French (France)'s "Choisissez comment commander les livres" reads as
  ordering a purchase. The diff says "Choisir l'ordre des livres dans
  le catalogue."
- The series position choices read "Position dans la série (la plus
  basse d'abord)" and "(la plus haute d'abord)".
- The "no figures yet" line takes OJS's text with the plural agreement
  ("disponibles"), which OJS's own text lacks.
- The month list copies OJS's French (Canada) text, twelve month words
  separated by spaces, since the code splits it on spaces.

Tried on `main`, with the two diffs applied. Steps 3 to 7 read French
in every place named in Observed ("Thème par défaut", "Typographie",
"Résumé de la presse", "Vignette de la presse", "Livres en vedette",
"Ordre des monographies", "Largeur maximale de l'image de couverture",
"Options d'affichage des statistiques d'utilisation"). The chart read
"Téléchargements" over the months "Jan.", "Fév.", "Mar."… on both
apps. Step 12 named both arrows in French on both apps. The one code
left was the Browse block's name. Steps 1 to 7 in English read the same
on all three apps with the diffs in and out, and steps 8 to 12 in
English the same on OMP and OPS.

**Alternatives**

- Commit the diffs to OMP and OPS: the same result at once, but
  Weblate's next sync may conflict with it or empty the entries again.
- Fall back from a missing text to another language in
  `Locale::translate()`: it would cover every gap of this kind, but PKP
  chose a plugin for that (`pkp/pkp-lib#784`), and it is a product
  decision.
- Make the chart robust instead: keep English month names when the
  translated list does not hold twelve items, in
  `displayUsageStatsGraph()` and `getUsageStatsChartData()` alike. It
  would spare the chart in every language listed under Cause, but the
  heading and the settings would still be codes, and it adds code to
  cover a missing translation.

**What goes with it**

- Older versions: `stable-3_5_0` and `stable-3_4_0` have the same empty
  entries and OMP's theme file without an entry. On `stable-3_3_0` OMP
  has no French (Canada) file for its theme at all and the same 14
  empty entries, and neither app has the chart.
- The guard: the U10 spec's French reading of the "Apparence" tabs on a
  press and a preprint server, asserting that they show no `##` code
  (a Planned item).

Small: translations only, with no code change.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/french-appearance-settings-raw-keys/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/french-appearance-settings-raw-keys/walk.js)
  takes steps 1 to 7 on OJS (the journal control), OMP and OPS, and
  [`carousel.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/french-appearance-settings-raw-keys/carousel.js)
  beside it steps 8 to 12 (`walk.js` replaced by `carousel.js` in the
  command below). Run each on
  an install freshly loaded from the default dataset (step 6 changes a
  setting, steps 9 and 10 add highlights):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/french-appearance-settings-raw-keys/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). `NB=1` in front
  takes the same steps in English; the fix was tried by applying the two
  diffs and running it in French, then with `NB=1` with the diffs in and
  out.
- Walked on `main` and `stable-3_5_0`, on PostgreSQL, from pkp/datasets
  566bb1f (2026-10-03); steps 8 to 12 on 2026-10-04 from pkp/datasets
  1a5552c, at the same tips, as a walk of their own from a freshly
  loaded dataset rather than following on from step 7. The two lines read the same codes on OMP and
  OPS. On 3.5 a journal's "Thème" has no content organization field and
  the chart no "All time" button, so OJS reads French throughout.
- The default test data holds no download figures, so the chart is
  drawn at zero and its "no figures yet" notice was not seen.
- Tips: `main`: OJS ff004d0973 (`lib/pkp` 987776cd04), OMP 3b0ecf794c
  and OPS c8af945bb7 (`lib/pkp` 3dc90c81a6). `stable-3_5_0`: OJS
  c1cee76b95 (`lib/pkp` 771474347e), OMP 9c5e24246c, OPS 38b61882d3
  (`lib/pkp` cf3f984335). `stable-3_4_0`: OMP 0aec65441f, OPS
  acd8ae704b, pkp-lib 767353f4fe. `stable-3_3_0`: OMP 8e72fc8836, OPS
  c5532e2161, pkp-lib ac3fa73402.
- Code reads beyond those the Cause names: on every branch, the keys in
  each app's `locale/en` (`en_US` on 3.3) and `locale/fr_CA`, and the
  default theme's `locale/en` and `locale/fr_CA`, against OJS's French
  (Canada) theme file; on `main`, every language folder of the two apps
  for the counts under Cause. On `stable-3_4_0`, `ThemePlugin.php` and
  `usage-stats-chart.js`, which build the months the same way. On
  `stable-3_3_0`, OMP's theme locale folders (no `fr_CA`) and both
  apps' `DefaultThemePlugin.inc.php` (no chart option). For the
  carousel: on `main` and `stable-3_5_0`, each app's
  `plugins/themes/default/js/main.js` and `DefaultThemePlugin.php`
  (`nextSlide`, `prevSlide`) and `lib/pkp/templates/frontend/components/highlights.tpl`;
  on `stable-3_4_0`, the theme's `js/main.js` (no Swiper) and
  pkp-lib's `templates/frontend/components` (no highlights); on
  `stable-3_3_0`, no highlights in pkp-lib.
- Upstream: `pkp/pkp-lib#11092` (the chart without labels when another
  theme is active) is a different fault; `pkp/pkp-lib#9262` added the
  carousel and does not mention its translations.
- Not driven: a chart with figures; the diffs on 3.5; languages other
  than French (Canada) and English.
- Unverified: whether Weblate already holds French (Canada) texts for
  these keys that have not reached the branches; the components' names;
  whether Weblate still takes texts for 3.4.
