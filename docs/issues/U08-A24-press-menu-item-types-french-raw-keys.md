# In French (Canada), a press's menu item window shows codes for three item types and their series and category lists

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** not traced; present since at least [435515aa69](https://github.com/pkp/omp/commit/435515aa69bc81c8c0049872970bfd63d784631d) (2017-10-03), which gave OMP the "Catalog" type's description in English only (`pkp/pkp-lib#2178`); the other types and their lists followed in `pkp/omp#592` (2018, `pkp/pkp-lib#3171`)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U08 [A24](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U08-navigation-menus-and-site-chrome.md#a24)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A press manager who uses the interface in French (Canada) and adds or
edits a menu item (Settings › Website › Navigation) sees codes
(untranslated keys) in eleven places of the item window. The type list
names three of the press's own types as codes:
"##navigation.navigationMenus.newRelease##" for "New Releases",
"##navigation.navigationMenus.series.generic##" for "Series" and
"##navigation.navigationMenus.category.generic##" for "Category".
Choosing any of the press's four own types (these three and
"Catalogue") shows a code as the line that describes the type. Choosing
"Series" or "Category" also shows the list of the press's series or
categories, whose label and help line are codes.

It takes a press that offers French (Canada) as an interface language;
the series and category types are listed only while the press has
series or top-level categories.

## Impact

- **Lost.** Nothing a manager saves or a reader sees. The codes stand
  in for eleven texts: three type names, four type descriptions, and
  the label and help line of the series list and of the category list.
- **Who.** Press managers who use the interface in French (Canada), each
  time they add or edit a menu item.
- **Way round.** Switching the interface to English shows every text.
  Within the codes, "newRelease", "series" and "category" name the
  type.

Low: codes replace labels and help texts on a staff screen, and the
task gets done. It would rise if a code hid a choice the manager could
not identify another way.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`, freshly loaded: the press
  `publicknowledge`, which offers English and French (Canada) and holds
  five series and two top-level categories. Nothing is created.

1. Sign in as `rvaca` (the press manager).
2. Open the menu under the initials at the top right and, under "Change
   Language", choose "français".
3. Open "Paramètres" › "Site Web" › "Configuration" › "Menus de
   navigation"
   (`/index.php/publicknowledge/fr_CA/management/settings/website#setup/navigationMenus`).
4. Under "Éléments du menu de navigation", press "Ajouter un élément".
5. Open the type list ("Choisir un type...") and read its last four
   options.
6. Choose "Catalogue", then each of the three options after it in turn.
   Each time, read the line under the type list and, for the last two,
   the list that appears under it.
7. Close the window with its back arrow ("Fermer").

**Expected.** French text in each place, as French (Canada) names the
same things elsewhere in the press ("Nouveautés" for the catalog's new
releases, "Séries", "Catégories"): three type names, four lines
describing the types, and a label and a line for the series list and
for the category list.

**Observed.**

```
Step 5:  … | Déclaration de confidentialité | Catalogue
         | ##navigation.navigationMenus.newRelease##
         | ##navigation.navigationMenus.series.generic##
         | ##navigation.navigationMenus.category.generic##
Step 6:  Catalogue          ##navigation.navigationMenus.catalog.description##
         …newRelease##      ##navigation.navigationMenus.newRelease.description##
         …series.generic##  ##navigation.navigationMenus.series.description##
                            ##manager.navigationMenus.form.navigationMenuItem.series##
                            [list: the press's series]
                            ##manager.navigationMenus.form.navigationMenuItemSeriesMessage##
         …category.generic## ##navigation.navigationMenus.category.description##
                            ##manager.navigationMenus.form.navigationMenuItem.category##
                            [list: "Applied Science", …]
                            ##manager.navigationMenus.form.navigationMenuItemCategoryMessage##
```

The other types and their descriptions read French ("À propos", "Annonces",
"Coordonnées"). No request failed and no script error showed.

## Cause

OMP's French (Canada) locale files hold the eleven texts as `msgstr ""`.
`LocaleFile::loadArray()` (`lib/pkp/classes/i18n/translation/LocaleFile.php`,
line 66) drops an empty text, and `Locale::translate()`
(`lib/pkp/classes/i18n/Locale.php`, line 525) prints `##key##` for a
key with no text in the user's language, with no fallback to English.

Where each text is read:

- `locale/fr_CA/locale.po`: `navigation.navigationMenus.newRelease`,
  `.series.generic` and `.category.generic` (the type names) and the
  `.description` of `catalog`, `newRelease`, `series` and `category`,
  all read by `NavigationMenuService::getMenuItemTypesCallback()`
  (`classes/services/NavigationMenuService.php`, lines 55 to 95). The
  item form lists the names and its script writes the chosen type's
  description under the list.
- `locale/fr_CA/manager.po`:
  `manager.navigationMenus.form.navigationMenuItem.series`,
  `.navigationMenuItemSeriesMessage`, `.navigationMenuItem.category`
  and `.navigationMenuItemCategoryMessage`, read by
  `templates/controllers/grid/navigationMenus/seriesNMIType.tpl` and
  `categoriesNMIType.tpl`.

The English texts came in 2017 and 2018. The French (Canada) entries
first appear, empty, with the locale files' rearrangement of
2023-01-30 (3bcd14e06 on `main` and `stable-3_4_0`, cc684782d on
`stable-3_3_0`), and are empty on every branch since. French (France) has all eleven.

Reach:

- Only OMP has these types and lists. OJS's and OPS's type lists read
  French throughout (walked on `main` and 3.5).
- Other languages (read in OMP's locale files on `main`, outside this
  report's fix): of its 33 translations, Arabic, Central Kurdish, Greek,
  Kyrgyz and Vietnamese lack all eleven, as French (Canada) does;
  Persian, Gaelic, Italian and Swedish lack the four list texts.
- Not this fault, though the same windows show it:
  - On `main`, all three apps: the "Query Parameters" box's label and
    line, the drag handles' tooltip (`##common.dragToReorder##`) and the
    empty "Éléments du menu assignés" panel's text. These pkp-lib texts
    exist on `main` only (`pkp/pkp-lib#12371`, `pkp/pkp-lib#12178`, 2026)
    and no language has them yet, as is usual before a release.
  - The chosen type's description also replaces the type list's heading
    (spec U08
    [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U08-navigation-menus-and-site-chrome.md#a12)),
    so the heading shows the same code.
  - The help link's screen-reader name, `##common.help##`, in the
    windows' top strip (pkp-e2e#640).

## Proposed fix

A proposal: the French (Canada) translators (or anyone with a Weblate
account) enter the eleven texts on PKP's Weblate (translate.pkp.sfu.ca),
which writes the locale files, rather than a developer committing them.
They are in
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-menu-item-types-french-raw-keys/fix-omp.diff):
Weblate's `omp` project, components `locale` (seven texts) and
`manager` (four), branch `stable-3_5_0`.

They reach `main` without a commit of their own. pkp merges
`translations/stable-3_5_0` into `stable-3_5_0` and commits a copy of
that merge on `main` under the same title and date: OMP's
merge of 2026-09-18 (15e98f9b8 on `stable-3_5_0`) is 8a6ff0375 on
`main`, and each 2026 merge has such a copy. `main` has merged no
`translations/main` branch since 2023-06-16.

```diff
 msgid "navigation.navigationMenus.series.generic"
-msgstr ""
+msgstr "Série"
…
 msgid "navigation.navigationMenus.newRelease"
-msgstr ""
+msgstr "Nouveautés"
…
 msgid "manager.navigationMenus.form.navigationMenuItem.category"
-msgstr ""
+msgstr "Sélectionner une catégorie"
```

The texts follow the words OMP's French (Canada) files already use
("Nouveautés", "Séries", "Catégories", "Catalogue") and need a French
(Canada) translator's yes. One point to settle: French (France) calls a
series "collection", and the diff follows French (Canada)'s "série".

Tried on OMP `main`: with the diff applied, step 5 read "Catalogue |
Nouveautés | Série | Catégorie", step 6 read "Lien vers votre
catalogue.", "Lien vers vos nouveautés.", "Lien vers une série." and
"Lien vers une catégorie.", with "Sélectionner une série" and
"Sélectionner une catégorie" over the two lists, and no code was left in
the item window from these texts; in English the steps read the same
with the diff in and out.

**Alternatives**

- Commit the diff to OMP: the same result at once, but Weblate's next
  sync may conflict with it or empty the entries again.
- Fall back to English when a text is missing, in
  `Locale::translate()`: it would cover every gap of this kind, but it
  changes how every missing text shows and is a product decision.

**What goes with it**

- Older versions: Weblate's `translations/stable-3_5_0` reaches 3.5.
  `stable-3_4_0` and `stable-3_3_0` hold the same eleven empty entries
  and would need their own commit of the same texts.
- Left out: the other OMP languages that lack these texts (five lack
  all eleven, four the list texts; Cause), for their translators.
- The guard: the U08 spec's French reading of a press's item window,
  asserting that its type list and the series and category lists show
  no `##` code (a Planned item).

Small: eleven translations in one app, with no code change.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/press-menu-item-types-french-raw-keys/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-menu-item-types-french-raw-keys/walk.js)
  (helpers in `lib.js` beside it) takes the Steps on OMP, and on OJS and
  OPS as the control, and changes no data. Run it on an install loaded
  from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/press-menu-item-types-french-raw-keys/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). `NB=1` in front
  takes the same steps in English, the check that the diff changes
  nothing else.
- Walked on `main` and `stable-3_5_0`, on PostgreSQL, from pkp/datasets
  e8dafbc (2026-10-02). Both lines read the same codes on OMP; OJS and
  OPS read none from this report.
- Differences from the Steps: the script chooses each type by its value
  and, after step 6, also takes the "Query Parameters" box, the "Primary
  Navigation Menu" window's handle hint and the "Ajouter un menu"
  window's empty panel on all three apps, the `main`-only texts named
  under Cause (on 3.5 the box and the hint do not exist).
- Fix trial: `node bin/try-fix.js apply …/fix-omp.diff omp`, the kept
  script in French on OMP, then with `NB=1` with the diff in and out,
  then `revert`.
- Tips: OMP `main` 3b0ecf794c (`lib/pkp` 3dc90c81a6, `lib/ui-library`
  280f98c5); OJS `main` b84f8e2e44 (`lib/pkp` ddd8ab243a); OPS `main`
  c8af945bb7. `stable-3_5_0`: OMP 9c5e24246c, OJS 091fb65453, OPS
  38b61882d3 (`lib/pkp` cf3f984335, `lib/ui-library` d4e01883).
  `stable-3_4_0`: OMP 0aec65441f (pkp-lib 9e41f10273). `stable-3_3_0`:
  OMP 8e72fc8836 (pkp-lib ac3fa73402).
- Code reads: on `main`, the eleven keys in OMP's `locale/en`,
  `locale/fr_CA` and `locale/fr` and in every other OMP language for
  the counts; OMP's `NavigationMenuService`, `seriesNMIType.tpl` and
  `categoriesNMIType.tpl`; pkp-lib's `navigationMenuItemsForm.tpl` and
  `NavigationMenuItemsFormHandler.js` (the line under the list),
  `Locale::translate()` and `LocaleFile::loadArray()`. On 3.5, 3.4 and
  3.3: OMP's `NavigationMenuService` (`.inc.php` on 3.3), the two
  templates and the eleven `locale/fr_CA` entries, all empty;
  `LocaleFile::loadArray()` (3.4) and `LocaleFile::load()` (3.3) drop an
  empty text the same way. For the `main`-only texts: `git log -S` in
  pkp-lib's `locale/en` and ui-library's `src`, every pkp-lib language's
  `common.po` and `manager.po` on `main`, pkp-lib's `locale`,
  `templates` and `js` on the three stable branches (none of the keys),
  and the translation merges (`git log --merges --grep=translations`:
  pkp-lib's last `translations/main` merge 981fda049b, 2023-06-16).
- Introduced: `git log -S` on each key in OMP's `locale/en` and
  `locale/fr_CA`. The English names and descriptions came in
  [573398932](https://github.com/pkp/omp/commit/573398932) (2018-08-24)
  and the four list texts in
  [2dc82ef7e](https://github.com/pkp/omp/commit/2dc82ef7e)
  (2018-09-11), both in `pkp/omp#592` (`commits/<sha>/pulls`).
- How a text reaches `main`: `git log --grep='translations/stable-3_5_0'`
  on OMP's `main` and `stable-3_5_0`. The merges on `stable-3_5_0` are
  not ancestors of `main`; `main` holds single-parent commits of the same
  title and date (2026: a719ba602, f5803864e, 1852d5db0, a8ec45c79,
  e5ce2271e, ad385cc28, 8a6ff0375); 8a6ff0375 changes the same 17
  files as 15e98f9b8.
- Upstream: pkp/pkp-lib, pkp/omp, pkp/ojs, pkp/ops and pkp/ui-library
  searched on 2026-10-03 by `navigationMenus newRelease`,
  `dragToReorder`, `navigationMenus queryParams`, `navigationMenu
  noAssignedItems`, "Query Parameters" navigation, "navigation menu
  french translation missing", "fr_CA navigation menu", "navigation menu
  french" and "fr_CA translation missing": nothing on this fault.
- Not driven: 3.4 and 3.3 (code only); languages other than French
  (Canada) and English (locale files only); the diff on 3.5.
- Unverified: whether Weblate already holds French (Canada) texts for
  these keys that have not reached the branches (its pages answer a
  script with a bot check); the French wording, which is a proposal for
  the translators.
