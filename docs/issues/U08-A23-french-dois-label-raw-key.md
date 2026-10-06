# In French (Canada), a press's and a preprint server's "DOIs" menu entry and page show an untranslated text key

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP, OPS
  - 3.5: OMP, OPS
  - 3.4: OMP, OPS (code)
  - 3.3: none (code; no DOIs page)
- **Introduced** not traced; present since at least [440b0394c](https://github.com/pkp/omp/commit/440b0394cb051e53fb3c16d83d2f3a9e50a85190) (2021-11-30), which gave OMP the label in English only (`pkp/pkp-lib#7014`)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U08 [A23](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U08-navigation-menus-and-site-chrome.md#a23) (the "DOIs" entry)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager or the Site Administrator of a press or a preprint server
who uses the interface in French (Canada) sees an untranslated text key,
"##doi.manager.displayName##", where the side menu's "DOIs" entry should
be. The page that entry opens shows the same key as its heading and in
the browser tab, and heads its list "##doi.manager.submissionDois##"
instead of "Monograph DOIs" ("Preprint DOIs"). A journal shows "DOIs"
and "DOIs de l'article".

The entry still opens the DOIs page and the page works; in English
every text shows.

Every press and preprint server that offers French (Canada) as an
interface language and has DOIs turned on shows the keys. In French
(France) a preprint server lacks the same two texts, while a press has
them.

## Impact

- **Lost.** Nothing: the keys stand in for labels only.
- **Who.** Users with a manager-level role (the dataset's "Press
  editor" among them) and the Site Administrator, each time they look
  at the side menu. Series editors and moderators never see the entry.
- **Way round.** Switch the interface to English.

Low: labels show as untranslated keys in one language while every task
gets done.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main` (or OPS `main`): the press
  (the server) `publicknowledge`, which offers English and French
  (Canada), with DOIs turned on. Nothing is created.

1. Sign in as `dbarnes` (the press's editor, a manager-level role).
2. Open the menu under the initials at the top right and, under "Change
   Language", choose "français".
3. In the side menu, read the entry that leads to the DOIs page (in
   English, "DOIs").
4. Press it (`/index.php/publicknowledge/fr_CA/dois`). Read the browser
   tab, the page's heading and the heading over the list.

**Expected.** French text in each place, as a journal shows: the entry
and the heading "DOIs", the tab "DOIs | Press de la connaissance du
public", and over the list a heading such as a journal's "DOIs de
l'article", with the press's or the server's own noun.

**Observed.** On OMP:

```
Step 3:  side menu  ##doi.manager.displayName##
Step 4:  tab        ##doi.manager.displayName## | Press de la connaissance du public
         heading    ##doi.manager.displayName##
         list       ##doi.manager.submissionDois##
```

OPS shows the same keys, with the tab ending "Serveur de prépublication
de la connaissance du public". To a screen reader the side menu entry's
name is the same key. No request failed and no script error showed.

The page shows two more keys, which are separate faults (Cause, Reach):
on OMP the tab and the title over the list read
"##submission.list.monographs##", and on OPS the "Statut de
publication" filter offers "##publication.status.published##".

## Cause

OMP's and OPS's French (Canada) `locale/fr_CA/manager.po` hold no text
for `doi.manager.displayName` ("DOIs") and `doi.manager.submissionDois`
("Monograph DOIs", "Preprint DOIs"): both entries are `msgstr ""`. The
keys are each app's own, defined in its `locale/en/manager.po`, so
pkp-lib's French files do not stand in for them.

`LocaleFile::loadArray()` (`lib/pkp/classes/i18n/translation/LocaleFile.php`,
line 66, `'includeEmpty' => false`) drops an empty text, and
`Locale::translate()` (`lib/pkp/classes/i18n/Locale.php`, line 525)
does not fall back to another language, so the page prints `##key##`.
That is PKP's stated design (`pkp/pkp-lib#784` points to the "Default
Translation" plugin for an English fallback).

The English texts came with the DOI management rework
(`pkp/pkp-lib#7014`): OMP
[440b0394c](https://github.com/pkp/omp/commit/440b0394cb051e53fb3c16d83d2f3a9e50a85190)
(2021-11-30) and OPS
[baf9653198](https://github.com/pkp/ops/commit/baf9653198b503cb3c53346443e9ae4f90da8cff)
(2022-01-10). OJS's French (Canada) received "DOIs" on Weblate on
2022-02-23. OMP's and OPS's entries first appear, empty, when the locale
files were rearranged on 2023-01-30
([3bcd14e06](https://github.com/pkp/omp/commit/3bcd14e06cc22367cecae0210fb6834a79c98991),
[eb1d961fe7](https://github.com/pkp/ops/commit/eb1d961fe79bbdf2feb2a8035934b1ecb1c6f8e7)),
and have stayed empty.

Reach:

- Where the two texts are read (on screen, steps 3 and 4):
  - `doi.manager.displayName`: the side menu entry
    (`lib/pkp/classes/template/PKPTemplateManager.php`, line 1322), the
    page title (`lib/pkp/pages/dois/PKPDoisHandler.php`, line 131) and
    the heading (`templates/management/dois.tpl`, line 5).
  - `doi.manager.submissionDois`: the list's heading
    (`pages/dois/DoisHandler.php`, line 37).
- The rest of the DOI texts in the same two files are empty as well (53
  in OMP, 55 in OPS, read in the code); this report placed none of them
  on screen, and many have no reader in the code. In all, `msgfmt
  --statistics` counts 168 of OMP's 426 entries untranslated, and 176
  untranslated and 14 fuzzy of OPS's 235.
- Other languages (read in the locale files on `main`; a language counts
  when the entry is empty or absent): `doi.manager.displayName` is
  missing in 15 of OMP's 33 translations and 11 of OPS's 17. French
  (France) is among OPS's: its `locale/fr/manager.po` has neither key,
  while OMP's has both ("DOI", "DOI de livres"). They are outside this
  report's fix.
- Not this fault, though the same screens show them in French (Canada):
  - The side menu's "Content" group, `##navigation.content##` (OJS,
    OMP; the same missing text is Settings › Website's fourth tab, spec
    U11 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U11-highlights.md#a7)),
    and the "Search submissions" box's placeholder and screen-reader
    label, `##editor.submission.searchGlobal##` (all three apps). Both
    are pkp-lib texts that exist on `main` only, added by `pkp/pkp-lib#11576`
    (2025-08-28) and `pkp/pkp-lib#12932` (2026-07-23). No language has
    them yet, except a Hindi text for the first, committed directly.
    Weblate translates `stable-3_5_0`, where neither text nor screen
    exists (walked), so `main`'s new texts wait for the next release's
    translation, as is usual before a release.
  - A press's "Monographs" entry under "Statistics",
    `##common.publications##`: in the report "In French (Canada), a
    press's and a preprint server's statistics pages and site statistics
    settings show codes" (pkp-e2e#625), whose fix holds the text.
  - On a press's DOIs page, the tab and title "##submission.list.monographs##"
    over the list: an OMP `submission.po` text that the Catalog page
    shows too (spec U70
    [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U70-catalog-management.md#a7)).
  - On a preprint server's DOIs page, the filter
    "##publication.status.published##": in the report "On a preprint
    server shown in French, the "Post" button, the status and the "Date
    Posted" label show codes" (pkp-e2e#548), whose fix holds the text.
  - The help icon's screen-reader name, `##common.help##`, on every
    editorial page in every language (pkp-e2e#640).

## Proposed fix

A proposal. No program code is at fault, so the fix is four French
(Canada) texts, two per app. The French (Canada) translators, or a
developer with a Weblate account, enter them on PKP's Weblate
(translate.pkp.sfu.ca), which writes the locale files; a developer can
instead commit the tried diffs to OMP and OPS. The texts are in
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/french-dois-label-raw-key/fix-omp.diff)
and
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/french-dois-label-raw-key/fix-ops.diff):

```diff
 msgid "doi.manager.displayName"
-msgstr ""
+msgstr "DOIs"

 msgid "doi.manager.submissionDois"
-msgstr ""
+msgstr "DOIs de la monographie"
```

OPS takes "DOIs" and "DOIs de la prépublication". "DOIs" copies OJS's
French (Canada) label, so the three apps read alike; the list headings
follow OJS's "DOIs de l'article" with the nouns OMP's and OPS's French
(Canada) files already use. The wording needs a French (Canada)
translator's yes before it is entered.

Where to enter them: the `manager` component of Weblate's `omp` and
`ops` projects, on `stable-3_5_0`. Both apps merge a
`translations/stable-3_5_0` branch into `stable-3_5_0`, and pkp copies
each such merge onto `main` as a commit of the same title and date (OMP
15e98f9b8 as 8a6ff0375, OPS 934933ae0f as 8d7eef85b7); `main` itself has
had no `translations/main` merge since 2023. A text entered there does not
reach 3.4, which has its own translations branch (below).

Tried on `main`, with the two diffs applied: the walk read "DOIs" in
the side menu, the tab and the heading on both apps, and "DOIs de la
monographie" and "DOIs de la prépublication" over the lists. The
English screens read the same with the diffs in and out.

**Alternatives**

- Commit the diffs to OMP and OPS: the same result at once, but
  Weblate's next sync may conflict with it or empty the entries again.
- OMP's French (France) "DOI" and "DOI de livres": closer to French
  usage, but OJS's French (Canada) says "DOIs", and the three apps' menus
  would then differ in one language.
- Fall back from a missing text to another language in
  `Locale::translate()`: it would cover every gap of this kind, but PKP
  chose a plugin for that (`pkp/pkp-lib#784`), and it is a product
  decision.

**What goes with it**

- Older versions: `stable-3_4_0` has the same empty entries, and its
  last `translations/stable-3_4_0` merge is from 2025-02-14 (OMP) and
  2024-02-22 (OPS), so 3.4 may need a developer's commit of the same
  texts. `stable-3_3_0` has no DOIs page.
- Left out: the other DOI texts of the two files (Cause, Reach), which
  the translators may complete in the same component; among them OPS's
  `doi.readerDisplayName`, the "DOI" label beside a preprint's DOI on
  its public page, read in the code and not walked (OMP's is in
  pkp-e2e#291's fix). The other languages named under Cause.
- The guard: the U08 spec's French reading of the side menu on a press
  and a preprint server, asserting that it shows no `##` key (a
  Planned item).

Small: four texts in two apps, with no change to program code.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/french-dois-label-raw-key/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/french-dois-label-raw-key/walk.js)
  takes the Steps on OJS (the journal control), OMP and OPS, changes no
  data, and lists every `##` key in the side menu and on the DOIs page.
  Run it on an install loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/french-dois-label-raw-key/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). `NB=1` in front
  takes steps 3 and 4 in English instead, the check that the diffs
  change nothing else.
- Walked on `main` and `stable-3_5_0`, on PostgreSQL, from pkp/datasets
  e8dafbc (2026-10-02). The two lines read the same DOI keys on OMP and
  OPS. On 3.5 the side menu has no "Content" group and no search box,
  and shows no `navigation.content` or `editor.submission.searchGlobal`
  key. The database plays no part (locale files); MySQL not checked.
- Differences from the Steps: the script opens "Editor Dashboard" by its
  address after signing in, and reads the entry's screen-reader name
  from the page's markup.
- Fix trial: `node bin/try-fix.js apply …/fix-omp.diff omp` and
  `… fix-ops.diff ops`, the kept script in French, then with `NB=1`
  with the diffs in and out, then `revert`.
- Tips: `main`: OJS b84f8e2e44 (`lib/pkp` ddd8ab243a, `lib/ui-library`
  64d67363), OMP 3b0ecf794c and OPS c8af945bb7 (`lib/pkp` 3dc90c81a6,
  `lib/ui-library` 280f98c5). `stable-3_5_0`: OJS 091fb65453, OMP
  9c5e24246c, OPS 38b61882d3 (`lib/pkp` cf3f984335, `lib/ui-library`
  d4e01883). `stable-3_4_0`: OJS c1827e3527, OMP 0aec65441f, OPS
  acd8ae704b, pkp-lib 9e41f10273. `stable-3_3_0`: OJS ac77c9fb35, OMP
  8e72fc8836, OPS c5532e2161, pkp-lib ac3fa73402.
- Code reads: `doi.manager.displayName` and `doi.manager.submissionDois`
  in each app's `locale/en` and `locale/fr_CA` `manager.po` on `main`,
  3.5 and 3.4 (OJS has both texts; OMP's and OPS's are empty), and
  their absence from 3.3's `locale/en_US` and from its
  `PKPTemplateManager.inc.php` (no DOIs page or menu entry there);
  `PKPTemplateManager` (the menu entry) on `main` and 3.4;
  `PKPDoisHandler`, `DoisHandler` and `templates/management/dois.tpl`
  on `main`; `LocaleFile::loadArray()` and `Locale::translate()` on
  `main`; every `doi.*` entry of OMP's and OPS's French (Canada)
  `manager.po` and a search of the apps' `classes`, `pages`,
  `templates`, `plugins`, `lib/pkp` and `lib/ui-library/src` for their
  readers; every `locale/*/manager.po` of OMP and OPS for the language
  counts, with `msgfmt --statistics` on OMP's and OPS's French (Canada)
  `manager.po` for the totals; `navigation.content` and `editor.submission.searchGlobal` in
  pkp-lib's `locale/*` on `main` and 3.5, and their readers
  (`PKPTemplateManager`, the apps' `TemplateManager`,
  `templates/management/website.tpl`); pkp-lib's `git log --merges
  --grep=translations` on `main`.
- Introduced: `git log -S'doi.manager.displayName'` on each app's
  `locale/en` and `locale/fr_CA` (OJS's French (Canada) text:
  [0b8281300e](https://github.com/pkp/ojs/commit/0b8281300eb42e26d5f4ef568646d96a53cb9cc7),
  2022-02-23); `git log -S'msgid "<key>"'` on pkp-lib's `locale` for
  the two `main`-only texts
  ([1869f217fd](https://github.com/pkp/pkp-lib/commit/1869f217fda0b6f3ce5c86445b181516ce89e552),
  [34a773f69b](https://github.com/pkp/pkp-lib/commit/34a773f69b2dc0bb865fe954fee596ae405d7bcf); the
  Hindi text [120de1ee60](https://github.com/pkp/pkp-lib/commit/120de1ee6023aaad72a2ba857d8c8c81f53b7403),
  2026-08-05).
- Upstream: pkp/pkp-lib, pkp/omp, pkp/ops and pkp/ui-library searched on
  2026-10-03 by `doi.manager.displayName`, `doi.manager.submissionDois`,
  "DOIs French translation", "DOIs French missing translation", "fr_CA
  DOI", "fr_CA" (OMP, OPS) and "translation key DOIs menu": nothing on
  this fault.
- Not driven: 3.4 and 3.3 (code only); the other DOI texts of the two
  files and OPS's public "DOI" label (code only); languages other than
  French (Canada) and English, French (France) included (locale files
  only); the diffs on 3.5.
- Unverified: whether Weblate already holds French (Canada) texts for
  these keys that have not reached the branches; whether Weblate still
  takes texts for 3.4; whether its components are still named as the
  file headers say.
