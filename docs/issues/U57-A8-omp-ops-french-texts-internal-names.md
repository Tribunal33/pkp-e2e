# French pages of a press and a preprint server show internal names where texts were never translated

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OMP, OPS
  - 3.5: OMP, OPS
  - 3.4: OMP, OPS (code)
  - 3.3: OMP, OPS (code; no default author guidelines or site-management line there)
- **Introduced** not traced; the French texts were left empty in several changes, the oldest present since at least [21fae1d76c](https://github.com/pkp/omp/commit/21fae1d76cefe797cdef61567e1ae922bac6b9b7) (2019-09-30)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U57 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U57-languages-and-locales.md#a8) · spec U07 [OPS3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U07-journal-identity-and-about-pages.md#ops3) · spec U61 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U61-system-administration.md#a7) · spec U19 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a13) (its OMP half) · spec U58 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U58-submission-intake-configuration.md#a9) · spec U69 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a15) (its OMP half) · spec U53 [OPS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#ops1) · spec U07 [OPS4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U07-journal-identity-and-about-pages.md#ops4) · spec U54 [OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#omp1)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

Update 2026-10-01: a press's book and chapter pages join this report
(spec U69 A15): their labels in French are OMP texts with empty French
entries too. Summary, Steps 10 and 11, Cause, Proposed fix and Evidence
now cover them, and `fix-omp.diff` fills them.

Update 2026-10-01: a press's names for its review stages join this
report (spec U54 OMP1): the "Rôles" list's External Review column, the
workflow's stage menu and the dashboard's Internal Review rows print OMP
texts whose French entries are empty or missing. Summary, Impact, Steps
12 to 14, Cause, Proposed fix and Evidence now cover them, and
`fix-omp.diff` fills them.

## Summary

On a press or a preprint server that offers French (Canada), several
French texts appear as internal names between hash signs. OJS is not
affected; it shows French in every one of these places:

- The "Soumissions" page of a press and of a server: the author
  guidelines read "##default.contextSettings.authorGuidelines##" and the
  submission checklist "##default.contextSettings.checklist##".
- The server's "Déclaration de confidentialité" page: its whole body is
  "##default.contextSettings.privacyStatement##".
- The server's manager and Moderator roles, under Users & Roles and on
  the French masthead ("##default.groups.name.manager##",
  "##default.groups.name.sectionEditor##"), and seven of its file types
  under "Components", such as "##default.genres.dataSet##".
- Administration in French ("##admin.siteManagement.description##"), the
  "Components" heading of a press and a server ("##grid.genres.title##"),
  and the "Resource Type" of a press's OAI-PMH records read in French
  ("##rt.metadata.pkp.dctype##").
- A press's book and chapter pages: "Published" ("##catalog.published##"),
  "Forthcoming", "Categories", "DOI:", the series' ISSNs, a chapter's
  "Volume" and "Pages", the download chart's texts and the format
  details' screen-reader heading; a priced format's link loses the
  format's name ("Achat (25.00 USD)").
- A press's review stages: the External Review column of the "Rôles"
  list and the stage in the workflow's menu read
  "##workflow.review.externalReview##", and a book in Internal Review
  shows its stage on the dashboard as
  "##submission.stage.internalReviewWithRound##".

Most of these names are saved into the press's or server's own settings
when French is added: when the press or server is created on a site with
French, or when a manager adds French as a form language. So every press
and server that added French already shows them today; the default test
dataset's press and server do. Adding the missing translations stops new
names being saved but does not change the ones already saved, which is
why the fix needs a repair step. "Reload defaults" for French, the
administrator's button to restore the default texts, saves the same
names again.

The fix is part translation, part code: the French texts belong in OMP's
and OPS's French translation files, and pkp-lib should stop saving an
internal name for a text that has no translation.

## Impact

- **Lost.** Nothing is lost, and nobody is told. The saved names stay
  until someone replaces them by hand.
- **Who.** Readers, authors, managers and administrators who use a press
  or a preprint server in French (Canada), and harvesters reading a
  press's French OAI-PMH.
- **Way round.** A manager can type French over the saved names: the
  guidelines, the checklist, the privacy statement, the role names and
  the file types. The Administration line, the "Components" heading,
  the OAI value, the book pages' labels and the review stage names have
  none.

Low: internal names in place of texts, with nothing lost; it would be
medium if a press could not replace the saved ones.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main` (OPS `main` the same; OJS `main`
  is the control). Its `publicknowledge` has English and French (Canada)
  under "UI" and "Forms", English primary, and two published books.

Reader (signed out):

1. Open `/index.php/publicknowledge/fr_CA/about/submissions`
   ("Soumissions").
2. Open `/index.php/publicknowledge/fr_CA/about/privacy`
   ("Déclaration de confidentialité").
3. Open
   `/index.php/publicknowledge/fr_CA/oai?verb=ListRecords&metadataPrefix=oai_dc`.

Administrator:

4. Sign in as `admin`. Open `/index.php/index/fr_CA/admin`
   ("Administration du site").
5. Open the press's Settings › Website › "Setup" › "Languages". On the
   "French" row, open the arrow › "Reload defaults" › "OK".
6. Sign out. Open the pages of steps 1 and 2 again.

Roles and file types (as `admin`):

7. Open `/index.php/publicknowledge/fr_CA/management/settings/access`,
   tab "Rôles".
8. Open `/index.php/publicknowledge/fr_CA/management/settings/workflow`,
   tab "Soumission", then the components tab.
9. Administration › "Hosted Servers" › "Create Server": name "u57w24
   Serveur", path `u57w24`, "English" and "French" ticked, English
   primary › "Save". Take steps 7 and 8 on `u57w24`.

Book pages (a press, signed out):

10. Open book 14, "From Bricks to Brains: The Embodied Cognitive
    Science of LEGO Robots", in French:
    `/index.php/publicknowledge/fr_CA/catalog/book/14`.
11. Open its "Chapter 1: Mind Control—Internal or External?".

Review stage names (a press, as `admin`):

12. Sign in as `admin`. Open
    `/index.php/publicknowledge/fr_CA/management/settings/access`, tab
    "Rôles". Read the stage column headings.
13. Open `/index.php/publicknowledge/fr_CA/dashboard/editorial`, view
    "Toutes les soumissions actives". Read the stage of submission 16,
    "A Designer's Log: Case Studies in Instructional Design" (External
    Review), and of submission 6, "The Information Literacy User’s
    Guide" (Internal Review).
14. Open submission 16. Read the workflow's menu.

**Expected.** French texts everywhere: the press's French guidelines and
checklist (steps 1 and 6), a French privacy statement (steps 2 and 6),
the French word for "Book" (step 3), a French line under "Gestion du
site" (step 4), such as OJS's "Ajouter, modifier ou supprimer des revues
de ce site et gérer les paramètres de l'ensemble du site.", and French
role names, file types and heading (steps 7 to 9), and French
headings on the book and chapter pages, such as "Publié" for
"Published" (steps 10 and 11), and a French name for each review stage
(steps 12 to 14), as "Évaluation interne" already is.

**Observed.** Step 1, press and server:

```
Lignes directrices s'adressant aux auteurs
##default.contextSettings.authorGuidelines##
Liste de vérification pour la préparation de la soumission
##default.contextSettings.checklist##
```

(the server: "Directives aux auteurs-es", "Liste de vérification de la
soumission", the same two names). Step 2, server only:

```
Déclaration de confidentialité
##default.contextSettings.privacyStatement##
```

Step 3, press only, each book's record:

```xml
<dc:type xml:lang="fr-CA">##rt.metadata.pkp.dctype##</dc:type>
```

Step 4, press and server:

```
Gestion du site
##admin.siteManagement.description##
```

Step 5 shows "French/français locale reloaded for Public Knowledge
Press."; step 6 shows the same names as steps 1 and 2. Steps 7 and 8,
server, and step 9 on the new server:

```
Nom du rôle  Niveau d'autorisation
##default.groups.name.manager##  Administrateur-trice du serveur
##default.groups.name.sectionEditor##  Éditeur-trice de série
…
##grid.genres.title##
Texte de la prépublication
##default.genres.researchInstrument##
##default.genres.researchMaterials##
…
##default.genres.sourceTexts##
```

(The level "Éditeur-trice de série" on the Moderator row is a separate
fault: [U54-OPS3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U54-OPS3-ops-moderator-level-series-editor-french.md).)
The press's components tab is headed "##grid.genres.title##"; its role
names and file types are French.

Step 10: the date's heading reads "##catalog.published##"; step 11: the
headings read "##chapter.volume##" and "##catalog.published##". The
English pages read "Published" and "Volume". (The "Versions" list's
"2026-09-30 (##publication.versionStage.display##)" on `main` is not
this fault: see Cause, "Excluded".)

Steps 12 to 14, press:

```
Nom du rôle  Niveau d'autorisation  Soumission  Évaluation interne  ##workflow.review.externalReview##  Révision  Production

16 Power — A Designer's Log: Case Studies in Instructional Design  Évaluation (Cycle 1)
6 Bernnard et al. — The Information Literacy User’s Guide  ##submission.stage.internalReviewWithRound##

Flux des travaux  Soumission  Évaluation interne  ##workflow.review.externalReview##  Cycle d'évaluation 1  Révision  Production
```

The English pages read "External Review", "External Review (Round 1)"
and "Internal Review (Round 1)". OJS's French list heads its review
column "Évaluation".

## Cause

The texts have no French in OMP's and OPS's French translation: their
entries are empty.

- [omp `locale/fr_CA/default.po`](https://github.com/pkp/omp/blob/3b0ecf794c/locale/fr_CA/default.po#L111-L115):
  `default.contextSettings.authorGuidelines`, `default.contextSettings.checklist`.
- [ops `locale/fr_CA/default.po`](https://github.com/pkp/ops/blob/c8af945bb7/locale/fr_CA/default.po#L24-L87):
  `section.default.policy`; the same two, `privacyStatement`,
  `forReaders`, `forAuthors`, `forLibrarians`, `openAccessPolicy`; the
  name, plural and abbreviation of `default.groups.*.manager` and
  `default.groups.*.sectionEditor`; seven `default.genres.*`
  (researchInstrument, researchMaterials, researchResults, transcripts,
  dataAnalysis, dataSet, sourceTexts).
- [omp](https://github.com/pkp/omp/blob/3b0ecf794c/locale/fr_CA/admin.po#L138-L139)
  and [ops](https://github.com/pkp/ops/blob/c8af945bb7/locale/fr_CA/admin.po#L82-L83)
  `admin.po`: `admin.siteManagement.description`;
  [omp](https://github.com/pkp/omp/blob/3b0ecf794c/locale/fr_CA/manager.po#L1283-L1284)
  and [ops](https://github.com/pkp/ops/blob/c8af945bb7/locale/fr_CA/manager.po#L390-L391)
  `manager.po`: `grid.genres.title`.
- [omp `locale/fr_CA/locale.po`](https://github.com/pkp/omp/blob/3b0ecf794c/locale/fr_CA/locale.po#L1560-L1561):
  `rt.metadata.pkp.dctype`.
- The book and chapter pages, OMP
  [`locale/fr_CA/locale.po`](https://github.com/pkp/omp/blob/3b0ecf794c/locale/fr_CA/locale.po#L704-L705):
  `catalog.published`, `catalog.forthcoming`, `catalog.categories`,
  `catalog.manage.series.onlineIssn`, `catalog.manage.series.printIssn`,
  `catalog.viewableFile.title`, `catalog.viewableFile.return`,
  `monograph.publicationFormatDetails`;
  [`submission.po`](https://github.com/pkp/omp/blob/3b0ecf794c/locale/fr_CA/submission.po#L469-L476):
  `chapter.volume`, `chapter.pages`, `submission.chapterCreated`,
  `submission.withoutChapter`, `submission.editorName`,
  `submission.authorListSeparator`;
  [`manager.po`](https://github.com/pkp/omp/blob/3b0ecf794c/locale/fr_CA/manager.po#L1434-L1435):
  `doi.readerDisplayName`. OMP's default theme has no French at all:
  its [`plugins/themes/default/locale/fr_CA/locale.po`](https://github.com/pkp/omp/blob/3b0ecf794c/plugins/themes/default/locale/fr_CA/locale.po)
  is a header only, so the download chart's texts are names. One entry
  is translated wrong: `payment.directSales.purchase`
  ([line 1541](https://github.com/pkp/omp/blob/3b0ecf794c/locale/fr_CA/locale.po#L1541-L1542))
  reads "Achat ({$amount} {$currency})", without the English
  "{$format}".
- The review stage names, OMP
  [`locale/fr_CA/submission.po`](https://github.com/pkp/omp/blob/3b0ecf794c/locale/fr_CA/submission.po#L293-L294):
  `workflow.review.externalReview` is empty, and
  `submission.stage.internalReviewWithRound` and
  `submission.stage.externalReviewWithRound`, which OMP's English
  overrides as "Internal Review (Round {$round})" and "External Review
  (Round {$round})", have no French entry. The external one falls back
  to pkp-lib's French "Évaluation (Cycle {$round})", which does not say
  which review; the internal one has nothing to fall back to.

OJS's French has every one OJS shares, its default theme's included.
The loader drops an empty entry
(`LocaleFile::loadArray()`, `includeEmpty => false`), so
`Locale::translate()` finds no text and returns the key between hash
signs ([`Locale.php` line 525](https://github.com/pkp/pkp-lib/blob/3dc90c81a6/classes/i18n/Locale.php#L525)).
The Administration line, the "Components" heading, the OAI value, the
book pages' labels and the stage names are translated on each request,
so the name is printed each time.

The default texts are translated once and saved, and three pieces of
pkp-lib code save whatever `__()` returns, the name included:

- `PKPSchemaService::getDefault()`, [line 584](https://github.com/pkp/pkp-lib/blob/3dc90c81a6/classes/services/PKPSchemaService.php#L584)
  and [line 607](https://github.com/pkp/pkp-lib/blob/3dc90c81a6/classes/services/PKPSchemaService.php#L607)
  (an object's sub-property): the press's guidelines, checklist, privacy
  statement and information texts, saved by `setDefaults()` when the
  press is created and by `PKPContextService::restoreLocaleDefaults()`
  when French is ticked under "Forms" or "Reload defaults" is pressed.
- `userGroup\Repository::installLocale()`, [lines 592 and 596](https://github.com/pkp/pkp-lib/blob/3dc90c81a6/classes/userGroup/Repository.php#L592-L596):
  the role names and abbreviations, saved when the press is created, for
  every language installed on the site.
- `GenreDAO::installDefaults()`, [line 387](https://github.com/pkp/pkp-lib/blob/3dc90c81a6/classes/submission/GenreDAO.php#L387):
  the file types, saved when the press is created and by "Restore
  Defaults" under "Components".

Other code that saves default texts already guards against this:
`emailTemplate\DAO::installEmailTemplateLocaleData()` and
`editorialTask\Repository` set the missing-key handler to return `''`
while they translate, so an untranslated email is saved empty.

Reach:

- Saved names: the "Soumissions" and privacy pages (walked); the
  checklist French authors confirm on "Make a Submission" and the
  privacy statement on the registration and review forms (code); the
  server's role names in Users & Roles (walked), on the French masthead
  and in the users list (spec entries U07 OPS4, U53 OPS1); the server's
  file types under "Components" (walked) and wherever an author picks a
  file's type (code). OPS's information texts and open access policy are
  saved as names too, though no OPS screen shows them; the REST API's
  context answer carries them (database read). `section.default.policy`
  is saved only in the primary language, so only a server with French
  primary gets it as a name (code).
- Printed names: Administration and the "Components" heading on OMP and
  OPS, a press's OAI-PMH at `…/fr_CA/oai` (walked).
- The External Review stage name, wherever OMP names the stage through
  `WorkflowStageDAO`: the "Rôles" list's column (walked), its stage
  filter, the role window's "Stage Assignment" box and the notice after
  a stage box is pressed, the stage in decision and editorial reminder
  emails, the submission's stage label in the REST API and the review
  report (code); and through the dashboard's stage labels
  (`useSubmission.js`) and the workflow's menu (walked).
- OMP's other empty default texts, the subscription manager's role names,
  are saved by no OMP code and show nowhere.
- The wider gap: OMP's French lacks 448 of OMP's own texts and OPS's 342
  (empty or missing entries), each printed as its name on the screen
  that uses it; this report covers the saved ones and the printed ones
  the specs met (four screens, and the book and chapter pages).
- Excluded: the version names on `main`, "{date}
  (##publication.versionStage.display##)" in an article's, a preprint's
  and a book's "Versions" list and OJS's French MARC (spec U13 A1, U69
  A15's other half, U19 A13's other half), and a book's "Plain Language
  Summary" heading. These are pkp-lib texts added on `main` only, by
  `pkp/pkp-lib#10810` and `pkp/pkp-lib#11540`, that no language but
  English has yet (walked: the 3.5 pages show no such name); not a
  defect.

## Proposed fix

Two changes, landed together (a proposal; the team decides):

1. **pkp-lib**: save an empty text, never the name, when a default has
   no translation, in all three places, with the missing-key handler the
   email templates already use
   ([fix-guard.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-ops-french-texts-internal-names/fix-guard.diff)).
   `PKPSchemaService` gains one helper used at both lines:

   ```php
   protected function translateDefault(string $key, array $localeParams, ?string $localeKey): string
   {
       $previous = Locale::getMissingKeyHandler();
       Locale::setMissingKeyHandler(fn (string $missingKey): string => '');
       try {
           return __($key, $localeParams, $localeKey);
       } finally {
           Locale::setMissingKeyHandler($previous);
       }
   }
   ```

   `userGroup\Repository::installLocale()` and `GenreDAO::installDefaults()`
   set and restore the handler around their loops. An empty value is
   shown in the press's primary language, as any untranslated text of a
   press is, and the manager sees an empty French box to fill. This
   covers every language's gaps: OJS's own "Author Guidelines" default
   has no text in 28 of its 77 languages.
2. **OMP and OPS**: the French texts, in each app's `locale/fr_CA` files
   ([fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-ops-french-texts-internal-names/fix-omp.diff),
   [fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-ops-french-texts-internal-names/fix-ops.diff)),
   which fill every empty entry of `default.po` that is saved, plus the
   site-management line, the "Components" heading and "Livre", and
   (OMP) the book and chapter pages' labels, the purchase link's
   "{$format}", the default theme's reader texts and the review stage
   names ("Évaluation externe", "Évaluation interne (Cycle {$round})",
   "Évaluation externe (Cycle {$round})"). The
   wording adapts OJS's French; a French (Canada) translator should
   review it. These files are also written by PKP's Weblate, so the
   entries can land as a commit to each app, which Weblate takes up, or
   be entered on Weblate by its French translators.

The guard alone leaves French readers with the English texts; the
translations alone leave every other language exposed. So both.

Tried on `main`: with both changes on OPS, steps 3 and 4 showed French,
step 6 showed the French guidelines, checklist and privacy statement
after "Reload defaults", and the server created in step 9 had French
role names, file types and heading. With `fix-omp.diff` alone on OMP,
step 10 read "Publié" and step 11 "Volume" and "Publié", and the English
book and chapter pages did not change; steps 12 to 14 read "Évaluation
externe" in the column and the menu, "Évaluation externe (Cycle 1)" and
"Évaluation interne (Cycle 1)" on the dashboard, and the English names
and "Évaluation interne" did not change. With the guard alone on OMP, "Reload
defaults" saved the French guidelines and checklist empty, and the
French "Soumissions" page showed the English texts. The dataset's saved
role and file-type names (steps 7 and 8) stayed, which is what the
repair below is for. The English pages and OAI records did not change.

**Alternatives:**

- Translations only: the smallest change, but any language with a gap
  keeps saving names, now and with every new default text.
- Show the primary language's text for any missing translation, as the
  defaultTranslation plugin of `pkp/pkp-lib#784` does: a product decision
  (spec U57 A4) that would hide the printed names but translate nothing.

**What goes with it:**

- Repair of saved names. An upgrade step that replaces each saved value
  equal to a `##…##` key, with or without the editor's `<p>` around it,
  by the new default in that language (empty when it has none), in
  `press_settings` / `server_settings` (and `journal_settings`),
  `user_group_settings` (`name`, `abbrev`) and `genre_settings`
  (`name`). "Reload defaults" is no repair: it replaces every French
  default text the press has edited, and it does not touch roles or file
  types. Not tried.
- Backport: the translation diffs apply as they stand to 3.5 and 3.4,
  and the guard to 3.5 except `GenreDAO`, which needs the same change by
  hand (checked with `git apply`). On 3.3 the same entries are empty
  in OPS (privacy statement, roles, file types, heading) and OMP (OAI
  value, heading, the book page's "Published", "Forthcoming" and format
  details heading; 3.3 has no chapter pages; the External Review stage
  name, while the two round labels exist only from 3.5 on), and `UserGroupDAO::installLocale()` and
  `GenreDAO::installDefaults()` save `__()`'s answer the same way.
- Test: a unit test that renders the context schema's defaults, the
  role names and the file types for a locale with a missing text and
  expects an empty value, not `##…##`.

Medium: a change in pkp-lib and in two apps' translation files, and an
upgrade step that repairs the names already saved on existing presses
and servers.

## Evidence

- Kept scripts, run on all three apps on an install reset to the
  default dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-ops-french-texts-internal-names/walk.js)
  (steps 1 to 6, then the English twins of steps 1 to 4) and
  [roles.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-ops-french-texts-internal-names/roles.js)
  (steps 7 to 9):
  `PROBE_FEATURE=issues-w24 PROBE_AGENT=w24 node bin/probe.js all shared/playwright/checks/issues/omp-ops-french-texts-internal-names/walk.js`
  (`roles.js` the same way);
  [book-page.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-ops-french-texts-internal-names/book-page.js)
  takes steps 10 and 11 and their English twins on OMP, and reads the
  "Versions" lists of OJS article 1 and OPS preprint 3 for the
  exclusion: `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/omp-ops-french-texts-internal-names/book-page.js`,
  walked on `main` (with `fix-omp.diff` in and out) and on 3.5;
  [review-stage.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-ops-french-texts-internal-names/review-stage.js)
  takes steps 12 to 14 and their English twins on OMP (OJS submission
  12 the control): `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/omp-ops-french-texts-internal-names/review-stage.js`,
  walked on `main` (with `fix-omp.diff` in and out) and on 3.5.
- Tips walked: OMP `main` [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794c),
  OPS `main` [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb7)
  (both pkp-lib [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a6)),
  OJS `main` [bade233f73](https://github.com/pkp/ojs/commit/bade233f73)
  (pkp-lib [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc));
  OMP `stable-3_5_0` [3081c9b00d](https://github.com/pkp/omp/commit/3081c9b00d),
  OPS [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd),
  OJS [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48)
  (pkp-lib [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed62));
  on PostgreSQL, default dataset from pkp/datasets 38ab955 (2026-09-30),
  whose `server_settings`, `user_group_settings` and `genre_settings`
  hold the French names before any step. The fault does not depend on
  the database; MySQL not checked.
- Code reads, `main` and 3.5: the French and English `default.po`,
  `admin.po`, `manager.po` and `locale.po` of each app; `Locale::translate()`,
  `LocaleBundle`, `LocaleFile::loadArray()`; `PKPSchemaService`;
  `PKPContextService::add()` and `restoreLocaleDefaults()`;
  `userGroup\Repository::installSettings()` and `installLocale()`;
  `GenreDAO::installDefaults()`; OMP's `Dc11SchemaPublicationFormatAdapter`;
  OMP's `monograph_full.tpl` and `chapter.tpl`, its `submission.po` and
  its default theme's `fr_CA/locale.po`; pkp-lib's
  `PublicationVersionInfo::__toString()` and
  `publication\Repository::getVersionString()` (the version names: a
  text, no code fault), and the 71 `locale/*/submission.po` of pkp-lib
  `main`, of which only `en` has `publication.versionStage.*` and
  `submission.plainLanguageSummary`. For the stage names: OMP's French
  and English `submission.po`, pkp-lib's French `submission.po`,
  `WorkflowStageDAO` and its callers, `UserGroupGridHandler`, and
  ui-library's `useSubmission.js` and
  `useWorkflowNavigationConfigOMP.js`.
  3.4 (OMP [0aec65441f](https://github.com/pkp/omp/commit/0aec65441f),
  OPS [acd8ae704b](https://github.com/pkp/ops/commit/acd8ae704b)): every
  entry of the Cause is empty, the book and chapter pages' included. 3.3 (OMP [8e72fc8836](https://github.com/pkp/omp/commit/8e72fc8836),
  OPS [c5532e2161](https://github.com/pkp/ops/commit/c5532e2161), pkp-lib
  [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe)): the
  entries named under Backport are empty, `LocaleFile::load()` drops
  them, and `PKPLocale::translate()` returns the name.
- Introduced: `git log -L` on each French entry. OMP's
  `rt.metadata.pkp.dctype` has no French since `21fae1d76c`
  (`pkp/pkp-lib#4779`, the move to PO files); OPS's `privacyStatement`
  since French was added to OPS on Weblate,
  [95cec4d325](https://github.com/pkp/ops/commit/95cec4d3258d99cd87761f975f3112c104cb04d8)
  (2020-02-27; absent, then an empty entry from 2023); the author
  guidelines, checklist and site-management entries were created empty
  by the 3.4 locale rearrangement (OMP
  [3bcd14e06c](https://github.com/pkp/omp/commit/3bcd14e06cc22367cecae0210fb6834a79c98991),
  OPS [eb1d961fe7](https://github.com/pkp/ops/commit/eb1d961fe79bbdf2feb2a8035934b1ecb1c6f8e7),
  2023-01-30, Alec Smecher, asmecher), and OJS's French was filled on
  Weblate afterwards. The role and file-type entries are empty on 3.3
  already; not traced further. `workflow.review.externalReview` is empty
  on 3.3 and 3.4 too (OMP `upstream/stable-3_3_0`, `stable-3_4_0`); on
  `main` it was absent from OMP's French until `3bcd14e06c` added it
  empty. The two round labels came with `pkp/pkp-lib#10684` (OMP
  [963af48bd2](https://github.com/pkp/omp/commit/963af48bd269819d9706a95026c38200dd7bf0b1), 2024-12-12)
  and have French in none of OMP's files; 14 of OMP's 34 languages
  translate them.
- Upstream search (pkp-lib, omp, ops; the keys, "missing translation",
  "french", `defaultLocaleKey`, `missingKeyHandler`): nothing on these
  texts. Related, not the same fault: `pkp/pkp-lib#3223` (role names
  saved as names when a translation was missing at install, closed
  2021) and `pkp/pkp-lib#784` (the English fallback plugin). For the
  book pages (2026-10-01; `catalog.published`, `chapter.volume`, "french
  book page", "missing translation press", `versionStage`): nothing;
  `pkp/pkp-lib#10810` is the change that added the version names. For
  the stage names (2026-10-01; `workflow.review.externalReview`,
  `externalReview`, "External Review french", "french review stage"):
  nothing; `pkp/pkp-lib#5335` (closed 2019) met the same printed name
  in OJS 3.1's editorial report, a gap in another app's language file.
- Introduced, book pages: the entries enter today's files empty with
  the 3.4 locale rearrangement (OMP `3bcd14e06c`); `catalog.published`
  and `monograph.publicationFormatDetails` were empty on 3.3 already;
  not traced further.
- Not driven: 3.4 and 3.3 (code); the submission start page, the
  registration and review forms, the masthead and users list (code here,
  walked in the specs named above). On the book pages, the labels the
  default dataset does not show (categories, DOI, ISSNs, the download
  chart, a forthcoming book, a priced format, a file's view page, a
  chapter's versions) are read in the code; spec U69 A15 walked them on
  a press of its own.
