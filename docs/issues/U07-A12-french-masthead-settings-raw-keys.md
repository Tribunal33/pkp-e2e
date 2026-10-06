# In French (Canada), a press's and a preprint server's Masthead settings tab shows untranslated codes

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP, OPS
  - 3.5: OMP, OPS
  - 3.4: OMP, OPS (code)
  - 3.3: OMP, OPS (code; no "Country" field, no discontinued code types)
- **Introduced** not traced as one change. Each text came in English only, the oldest the press's "Publisher Code Type" in [8f53cd931b](https://github.com/pkp/omp/commit/8f53cd931bb6581d2b0ee9f8f86c3a41f1f1d97a) (2015-12-14); the French (Canada) entries first appear, empty, in [3bcd14e06c](https://github.com/pkp/omp/commit/3bcd14e06cc22367cecae0210fb6834a79c98991) and [eb1d961fe7](https://github.com/pkp/ops/commit/eb1d961fe79bbdf2feb2a8035934b1ecb1c6f8e7) (2023-01-30), and none has had a text since
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U07 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U07-journal-identity-and-about-pages.md#a12)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A press manager who uses the interface in French (Canada) and opens the
press's settings finds codes on the first tab, "Bloc générique"
(Masthead): the first two group headings read
"##manager.setup.identity##" and "##manager.settings.publisher.identity##",
the publisher code type field's label is a code, and so are the help
line under "Pays" and both fields of "Description" with their help
lines. In that field's list, four discontinued code types read "GKD"
followed by a code where English reads "(Discontinued)". On a preprint
server the "Sponsoring organization" label and the help lines under
"Pays" and "Résumé du serveur" are codes. Only the names and help lines
are missing; the fields and their choices are as in English.

These are translations, not code: the French (Canada) texts are empty
or missing in OMP's and OPS's locale files, and are entered on PKP's
Weblate. Every press and preprint server that offers French (Canada)
shows the codes, including the press and server in PKP's default test
data. Other languages that lack the same texts show codes too, since a
missing text never falls back to English.

## Impact

- **Lost.** On a press, two group headings, the names or help lines of
  four fields and the "(Discontinued)" mark of four code types; on a
  preprint server, the name or help line of three fields. No data, and
  no action.
- **Who.** Managers of a press or preprint server working in French
  (Canada), or another language without these texts, on the settings'
  first tab.
- **Way round.** Switch the interface to English. The fields' order and
  boxes are the same, so a manager who knows the English tab can fill
  them in French too.

Low: untranslated labels and help lines, while the fields themselves are
unchanged; it would rise only if a code hid something the manager needs
in order to act.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main` (or OPS `main`), freshly
  loaded: the press (the server) `publicknowledge`, which offers English
  and French (Canada). Nothing is created and nothing is saved.

Steps:

1. Sign in as `rvaca` (the manager).
2. Open the menu under the initials at the top right and, under "Change
   Language", choose "français".
3. Open "Paramètres" › "Presse" (on OPS "Serveur"),
   `/index.php/publicknowledge/fr_CA/management/settings/context`. The
   page "Configuration" (on OPS "Paramètres du serveur") opens on its
   first tab, "Bloc générique".
4. Read every group heading, label and help line, top to bottom.
5. On a press, open the list of the third field in the second group
   (in English "Publisher Code Type"). The list is in alphabetical
   order; read the choices for GKD, GRID, PND and the second
   "Proprietary" (14th, 17th, 31st and 33rd of 41).

**Expected.** French text in each place, as a journal's tab shows it
("Identité de la revue", "Sélectionner le pays où se trouve cette revue,
…", "Résumé de la revue", "À propos de la revue" and their help lines),
with the press's or the server's noun, and on a press the four code types
marked as discontinued in French.

**Observed.** On OMP:

```
Step 4:  group    ##manager.setup.identity##
         group    ##manager.settings.publisher.identity##
         label    ##manager.settings.publisherCodeType##
         Pays     help: ##manager.setup.selectCountry##
         label    ##manager.setup.contextSummary##     help: ##manager.setup.contextSummary.description##
         label    ##manager.setup.contextAbout##       help: ##manager.setup.contextAbout.description##
Step 5:  GKD##monograph.publicationFormat.onixDeprecated##
         GRID##monograph.publicationFormat.onixDeprecated##
         PND##monograph.publicationFormat.onixDeprecated##
         Proprietary##monograph.publicationFormat.onixDeprecated##
```

The other 37 choices read as in English, a name and its ONIX code
number ("ARK (35)", "Proprietary (01)").

On OPS:

```
Step 4:  group "Identité du serveur", last label  ##manager.setup.sponsoringOrganization##
         Pays               help: ##manager.setup.selectCountry##
         Résumé du serveur  help: ##manager.setup.contextSummary.description##
```

The name a screen reader gives each language box of the two "Description"
fields on a press carries the code too ("français
##manager.setup.contextSummary## en français"). The same steps on OJS
read French throughout, and the tab shows no code in English on any app.

## Cause

The texts have no French (Canada) translation in OMP's and OPS's own
locale files. The tab's fields are built by
`PKPMastheadForm::__construct()` (`lib/pkp/classes/components/forms/context/PKPMastheadForm.php`)
and each app's `MastheadForm` (`classes/components/forms/context/MastheadForm.php`).
The apps define these keys themselves: the shared ones because their
English names the app's kind of context ("Press Identity", "Preprint
Server Identity"), the publisher fields and the discontinued mark
because ONIX exists only in OMP, and the sponsoring organization because
only OPS has that field.

- OMP `locale/fr_CA/manager.po` has an empty `msgstr` for
  `manager.setup.identity`, `manager.settings.publisher.identity`,
  `manager.settings.publisherCodeType`, `manager.setup.selectCountry`,
  `manager.setup.contextSummary`, `manager.setup.contextAbout` and
  `manager.setup.contextAbout.description`, and no entry for
  `manager.setup.contextSummary.description`.
- OMP `locale/fr_CA/locale.po` has no entry for
  `monograph.publicationFormat.onixDeprecated`, the " (Discontinued)"
  that `ONIXCodelistItemDAO::getCodes()` appends to a code ONIX marks as
  discontinued, in place of the code number other choices carry (added
  in `pkp/pkp-lib#10365`,
  [d002b418ed](https://github.com/pkp/omp/commit/d002b418edafecd22c1255a80f8830478546f579),
  2024-10-11). The list is sorted by name (`asort()` in the same DAO).
- OPS `locale/fr_CA/manager.po` has an empty `msgstr` for
  `manager.setup.sponsoringOrganization` and `manager.setup.selectCountry`,
  and no entry for `manager.setup.contextSummary.description`.

`LocaleFile::loadArray()` (`lib/pkp/classes/i18n/translation/LocaleFile.php`)
drops an empty text (`includeEmpty => false`), and `Locale::translate()`
(`lib/pkp/classes/i18n/Locale.php`) does not fall back to another
language, so the screen prints `##key##`. That is PKP's stated design:
`pkp/pkp-lib#784` leaves an English fallback to the separately installed
"Default Translation" plugin.

Reach:

- On screen (`main` and 3.5): the codes in Observed.
- Read in the code, not walked:
  - `manager.setup.selectCountry` is also the help line of "Pays" in
    Administration › "Presses hébergées" ("Serveurs hébergés") ›
    create or edit (`PKPContextForm`), so a Site Administrator working in
    French (Canada) meets the same code there; the same fix covers it.
  - `monograph.publicationFormat.onixDeprecated` is appended by every
    `getCodes()` call, so every ONIX list a press's staff choose from
    that holds a discontinued code shows it: product identifier types
    (list 5), audience range qualifiers (30), sales rights types (46),
    regions (49) and countries (91) on a book's publication formats,
    audience and markets. The same fix covers them.
- Shared with another report: `manager.setup.contextSummary` ("Press
  Summary") also names a theme field on a press's appearance settings,
  and is in the fix of
  [pkp-e2e#777](https://github.com/jardakotesovec/pkp-e2e/issues/777)
  too.
- Other languages, outside this fix and left to their translators (read
  in the locale files on `main`; a language counts when its text is
  empty or absent):
  - OMP, 33 languages: Arabic, Greek, Persian, Scottish Gaelic, Kyrgyz
    and Vietnamese lack all nine texts of the fix, as French (Canada)
    does. Fifteen more lack one to four of the other eight, most often
    the discontinued mark and the summary's help line; French (France)
    lacks exactly those two.
  - OPS, 17 languages: Catalan, French (France), Croatian, Indonesian,
    Kyrgyz, Norwegian Bokmål, Portuguese and Turkish lack all three, as
    French (Canada) does; Spanish lacks the summary's help line, and
    Finnish that and the help line under "Pays".

## Proposed fix

Enter the missing French (Canada) texts on PKP's Weblate
(translate.pkp.sfu.ca), which writes the locale files: OMP's components
`manager` (8 texts) and `locale` (1), OPS's `manager` (3). The French
(Canada) translators can enter them, or a developer with a Weblate
account. The texts are in
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/french-masthead-settings-raw-keys/fix-omp.diff)
and
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/french-masthead-settings-raw-keys/fix-ops.diff):

```diff
 msgid "manager.setup.identity"
-msgstr ""
+msgstr "Identité de la presse"

+msgid "monograph.publicationFormat.onixDeprecated"
+msgstr " (abandonné)"
```

`manager.setup.contextSummary` ("Résumé de la presse") is among the
OMP texts and in pkp-e2e#777's fix with the same wording: it is entered
once, by whichever fix goes first.

The wording copies OJS's French (Canada) texts for the same keys, with
the noun each app's French (Canada) files already use ("presse",
"serveur"), and spells "proposition" where OJS's summary help line has
"propositon". The rest is this report's own wording, for a French
(Canada) translator to settle: "Identité de l'éditeur", "Type de code de
l'éditeur" (beside the existing "Code de l'éditeur"), " (abandonné)" for
a discontinued code, and "Organisme commanditaire", as OJS's French
(Canada) texts name a sponsor.

Tried on `main`, with the diffs applied before the summary's label was
added to them: steps 4 and 5 read French in every place named in
Observed ("Identité de la presse", "Identité de l'éditeur", "Type de
code de l'éditeur", "GKD (abandonné)", "À propos de la presse",
"Organisme commanditaire" and the help lines), and the summary's label
was the one code left; pkp-e2e#777's trial showed that text in place.
The same tab in English read the same on both apps with the diffs in and
out.

**Alternatives**

- Commit the diffs to OMP and OPS: the same result at once, but
  Weblate's next sync may conflict with it or empty the entries again.
- Fall back from a missing text to another language in
  `Locale::translate()`: it would cover every gap of this kind, but PKP
  chose a plugin for that (`pkp/pkp-lib#784`), and it is a product
  decision.

**What goes with it**

- Branches: `main` and `stable-3_5_0` each need the texts. Weblate's
  translations reach `stable-3_5_0` through its `translations/stable-3_5_0`
  merges (the latest on 2026-09-18 in OMP). `main` gets them only when
  someone at PKP copies that branch's translations onto `main`, as
  pkp-lib's [25182919bf](https://github.com/pkp/pkp-lib/commit/25182919bf5b3dd45a98ec7c02563317ce02a1fc)
  did; OMP's and OPS's French (Canada) files on `main` have had no such
  copy, so `main` needs one, or a commit of the same diffs.
- Older versions: `stable-3_5_0` has the same empty and missing
  entries. `stable-3_4_0` has the same empty entries, without the
  discontinued mark (its code types carry none) and without the
  summary's help line (its form has none); its press tab also shows
  codes for a "Key Information" group (`manager.setup.keyInfo` and its
  description, empty there and gone from `main`'s form).
  `stable-3_3_0` is 3.4 without the "Pays" field.
- The guard: an e2e check in pkp-e2e's U07 suite that reads the Masthead
  tab of a press and a preprint server in French (Canada) and asserts
  that it shows no `##` code.

Small, as a proposal: twelve texts entered in three Weblate components,
with no code to change or review.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/french-masthead-settings-raw-keys/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/french-masthead-settings-raw-keys/walk.js)
  takes the Steps on OJS (the journal control), OMP and OPS, and reads
  every group, field and code on the tab. It changes no data. Run it on
  an install loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/french-masthead-settings-raw-keys/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). `MODE=nb` in
  front takes the same steps in English; the fix was tried by applying
  the two diffs (`node bin/try-fix.js apply …/fix-omp.diff omp`, `…
  fix-ops.diff ops`) and running it in French, then with `MODE=nb` with
  the diffs in and out.
- Walked on `main` and `stable-3_5_0`, from pkp/datasets 566bb1f
  (2026-10-03). The two lines read the same codes on OMP and OPS.
- Tips: `main` OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794c and
  OPS c8af945bb7 (lib/pkp 3dc90c81a6); `stable-3_5_0` OJS c1cee76b95
  (lib/pkp 771474347e), OMP 9c5e24246c and OPS 38b61882d3 (lib/pkp
  cf3f984335); `stable-3_4_0` OMP 0aec65441, OPS acd8ae704b (lib/pkp
  767353f4fe); `stable-3_3_0` OMP 8e72fc883, OPS c5532e2161 (lib/pkp
  ac3fa73402).
- Code reads: on each version, the form's keys
  (`PKPMastheadForm`, `.inc.php` on 3.3, and each app's `MastheadForm`),
  OMP's `ONIXCodelistItemDAO::getCodes()` and `lib/pkp/xml/onixFilter.xsl`
  (a current code's name gets its number, a discontinued one's does
  not), and the French (Canada) `manager.po`, `locale.po` and pkp-lib
  `manager.po`, `common.po`. On 3.3, `LocaleFile::load()` drops an empty
  text and `PKPLocale::translate()` prints `##key##` the same way. The
  other languages' counts come from every `locale/<language>/manager.po`
  and `locale.po` on `main`. The Weblate components are named by the
  files' `Language-Team` lines (OMP's French (Canada) `manager.po` has
  none; its French (France) one names `omp/manager`).
- Introduced: `git log -S` on each key in the apps' English locale files
  (OMP `manager.settings.publisherCodeType` 8f53cd931b, 2015;
  `manager.setup.identity`, `manager.settings.publisher.identity`,
  `manager.setup.contextSummary`, `manager.setup.contextAbout(.description)`
  88d8a48125, 2018, `pkp/pkp-lib#3594`; `manager.setup.selectCountry`
  4b15b7e913 (OMP) and 4a18dfeeac (OPS), 2021, `pkp/pkp-lib#6099`;
  `manager.setup.contextSummary.description` 9bdf0589d3 (OMP) and
  3edafe36a2 (OPS), 2024-05-06, `pkp/pkp-lib#9914`; OPS
  `manager.setup.sponsoringOrganization` 7d4033b463, 2019), all before
  the 3.5 release, and in the French (Canada) files, which no commit
  ever gave a text for these keys.
- Upstream: pkp/pkp-lib, pkp/omp and pkp/ops searched by the keys and by
  "French", "translation", "masthead", "Publisher Code Type",
  "Discontinued" and "Sponsoring organization".
- Not driven: Administration's create and edit press form and the ONIX
  lists of a book's publication formats (code only). The fix as it now
  stands, with the summary's label, was not walked.
