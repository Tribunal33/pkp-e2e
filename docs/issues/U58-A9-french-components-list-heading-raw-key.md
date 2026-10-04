# A press's or preprint server's "Components" settings tab and list show internal text codes in French (Canada)

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP, OPS
  - 3.5: OMP, OPS
  - 3.4: OMP, OPS (code)
  - 3.3: OMP, OPS (code)
- **Introduced** not traced; present since at least [942a71f35d](https://github.com/pkp/omp/commit/942a71f35d0806a3b4dc139ea7eae6ee7f6bc006) (2015-03-30)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U58 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U58-submission-intake-configuration.md#a9)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

A press or preprint server manager working in French (Canada) opens
Settings › Workflow › "Soumission". The side tab that manages file
components is labelled with the internal text code
"##grid.genres.title.short##", and the list it opens is headed
"##grid.genres.title##", where a journal reads "Éléments" and
"Éléments de l'article".

Nothing is lost: the list works as in English. The cause is two French
(Canada) texts missing from the press's and the server's translations;
no code needs to change.

Every press and preprint server that offers French (Canada) shows the
two codes. So do presses in nine other languages that lack the same
texts, and preprint servers in nine others, French (France) among them.

## Impact

- **Lost.** The name of one settings tab and the heading of its list.
  No data, and no action.
- **Who.** Managers of a press or preprint server working in French
  (Canada) or another language without the texts.
- **Way round.** None is needed to work: the tab is the fourth side tab,
  under the "Métadonnées" one, and the list's buttons read in French.
  Switching the interface to English shows the names.

Low: two untranslated labels on a working screen.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main` (or OPS `main`), freshly
  loaded: the press (the server) `publicknowledge`, which offers English
  and French (Canada). Nothing is created.

Steps:

1. Sign in as `rvaca` (the manager).
2. Open the menu under the initials at the top right and, under "Change
   Language", choose "français".
3. Open "Paramètres" › "Flux des travaux"
   (`/index.php/publicknowledge/fr_CA/management/settings/workflow`). On
   the tab "Soumission", press the fourth side tab, under "Métadonnées".
4. Read the side tab's name and the heading of the list it opens.

**Expected.** The side tab and the list heading in French, as a
journal's read "Éléments" and "Éléments de l'article", with the press's
or the server's noun.

**Observed.** On OMP and OPS:

```
side tab      ##grid.genres.title.short##
list heading  ##grid.genres.title##        Trier | Ajouter un élément | Restaurer les valeurs par défaut
```

On a preprint server seven rows of the list show codes too
("##default.genres.researchInstrument##" and six more); that is another
fault, under Cause. With the interface in English, OMP's tab and list
read "Components" and "Monograph Components", and OPS's "Components"
and "Preprint Components".

## Cause

The two texts have no French (Canada) translation in OMP's and OPS's own
locale files. The side tab is labelled in
`lib/pkp/templates/management/workflow.tpl` with
`{translate key="grid.genres.title.short"}`, and the list's heading is
set in `GenreGridHandler::initialize()` with
`$this->setTitle('grid.genres.title')`
(`lib/pkp/controllers/grid/settings/genre/GenreGridHandler.php`). The
apps define both keys themselves, because each app's English text names
its own kind of item ("Article Components", "Monograph Components",
"Preprint Components"). OMP's and OPS's `locale/fr_CA/manager.po` hold
both entries with an empty `msgstr`, where OJS's has a text.

`LocaleFile::loadArray()` (`lib/pkp/classes/i18n/translation/LocaleFile.php`)
drops an empty text, and `Locale::translate()`
(`lib/pkp/classes/i18n/Locale.php`) does not fall back to another
language, so the screen prints `##key##`.

Reach:

- On screen (`main` and 3.5): the side tab and the heading in Observed.
  No other template or class uses the two keys (searched in the apps,
  `lib/pkp` and `lib/ui-library`).
- A separate gap, not in this fix: on `main` only, a component's
  "Modifier" (Edit) window labels its "File Variants" box with
  "##manager.setup.genres.supportsFileVariants.title##" and
  "##manager.setup.genres.supportsFileVariants.label##". These are
  pkp-lib's keys, added in English with the media files
  (`pkp/pkp-lib#12251`, 2026-02-13), and pkp-lib's French (Canada)
  `manager.po` has neither. Seen on OPS; read in the code for OJS and
  OMP, which share the window.
- Another fault: a preprint server's seven French component names are
  saved as codes when the server is created, and "Restaurer les valeurs
  par défaut" saves them again.
  [pkp-e2e#360](https://github.com/jardakotesovec/pkp-e2e/issues/360)
  covers it with the other default texts stored as codes
  (`GenreDAO::installDefaults()` saves the untranslated key).
- Other languages, outside this fix and left to their translators (read
  in the locale files on `main`; a language counts when either text is
  empty or absent):
  - OMP: Arabic, Central Kurdish, Greek, Persian, Scottish Gaelic,
    Italian, Kyrgyz, Swedish and Vietnamese.
  - OPS: Catalan, Finnish, French (France), Croatian, Indonesian, Kyrgyz,
    Norwegian Bokmål, Portuguese and Turkish.
  - OJS's "Article Components" lacks them in twenty-one languages.

## Proposed fix

Enter the two French (Canada) texts in OMP's and OPS's `manager`
components on PKP's Weblate (translate.pkp.sfu.ca), which writes the
locale files. The texts are in
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/french-components-list-heading-raw-key/fix-omp.diff)
and
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/french-components-list-heading-raw-key/fix-ops.diff):

```diff
 msgid "grid.genres.title.short"
-msgstr ""
+msgstr "Éléments"                          (OMP and OPS)

 msgid "grid.genres.title"
-msgstr ""
+msgstr "Éléments de la monographie"        (OMP)
+msgstr "Éléments de la prépublication"     (OPS)
```

The short name is OJS's French (Canada) text, and OMP's heading is
OMP's French (France) one. OPS's heading takes the noun its French (Canada) files already
use for a preprint's file ("Élément de la prépublication"). A French
(Canada) translator settles the final wording.

Tried on `main`: with the diffs applied, step 4 read the texts above on
OMP and OPS, and the English tab was unchanged.

**Alternatives**

- Commit the diffs to OMP and OPS: the same result at once, but
  Weblate's next sync may conflict with it or empty the entries again.
- Fall back from a missing text to another language in
  `Locale::translate()`: it would cover every gap of this kind, but PKP
  left that to the separately installed "Default Translation" plugin
  (`pkp/pkp-lib#784`), and it is a product decision.

**What goes with it**

- Branches:
  - `stable-3_5_0`: Weblate, whose translations reach the branch through
    its `translations/stable-3_5_0` merges.
  - `main`: a copy of those translations onto `main`, which someone at
    PKP makes from time to time, or a commit of the same diffs.
  - `stable-3_4_0` and `stable-3_3_0` hold the same two empty entries in
    both apps, but are not expected to get them, since fixes are not
    backported past the 3.5 LTS.
- The guard: an e2e check in pkp-e2e's U58 suite that opens the
  "Soumission" tab of a press's and a preprint server's workflow
  settings in French (Canada) and asserts that the side tabs and the
  components list show no `##` code.

Small: four texts in two Weblate components, no code.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/french-components-list-heading-raw-key/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/french-components-list-heading-raw-key/walk.js)
  takes the Steps on OJS (the journal control), OMP and OPS, and goes on
  to the preprint server's "Modifier" window and "Restaurer les valeurs
  par défaut" for pkp-e2e#360. Run it on an install loaded from the
  default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/french-components-list-heading-raw-key/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5; `MODE=nb` reads
  the tab in English). The fix was tried with
  `node bin/try-fix.js apply …/fix-omp.diff omp` and `… fix-ops.diff
  ops`, the script, and `MODE=nb` with the diffs in and out.
- Walked on `main` and `stable-3_5_0`, on PostgreSQL, from pkp/datasets
  566bb1f (2026-10-03). The database plays no part (a locale file);
  MySQL not checked.
- Tips: `main` OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794c and
  OPS c8af945bb7 (lib/pkp 3dc90c81a6); `stable-3_5_0` OJS c1cee76b95
  (lib/pkp 771474347e), OMP 9c5e24246c and OPS 38b61882d3 (lib/pkp
  cf3f984335); `stable-3_4_0` OMP 0aec65441, OPS acd8ae704b (lib/pkp
  767353f4fe); `stable-3_3_0` OMP 8e72fc883, OPS c5532e2161 (lib/pkp
  ac3fa73402).
- Code reads on 3.4 and 3.3: the same tab and title keys
  (`GenreGridHandler.inc.php` on 3.3) and the same empty entries,
  English in `locale/en_US`. The other languages come from every
  `locale/<language>/manager.po` of the three apps on `main`.
- Introduced: `git log -S` and `-G` on the keys. 942a71f35d
  (`pkp/pkp-lib#444`) named OMP's tab and list "Components" and
  "Monograph Components" in English only, and OMP's French (Canada)
  file never had a text for them. OPS's `locale/fr_CA` once held the
  journal's texts, inherited from OJS (460ba7801d, 2016), and lost them
  with every locale in a798a25a7a (2019-05-26), before OPS's first
  release; its French (Canada) `manager.po` was started on Weblate in
  [9081f0d4f9](https://github.com/pkp/ops/commit/9081f0d4f9028746675f99865455d42e11da941e)
  (2020-02-27) without them. Both apps' empty entries arrived with the
  2023 rearrangement of the locale files (3bcd14e06c in OMP, eb1d961fe7
  in OPS).
- Upstream: pkp/pkp-lib, pkp/omp and pkp/ops searched by the keys and by
  "Monograph Components" French, "french components translation",
  "genres untranslated" and `default.genres`; nothing on this fault.
