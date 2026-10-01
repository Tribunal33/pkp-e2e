# A press's or preprint server's French (Canada) guidelines, checklist, privacy statement and role names show internal codes

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OMP, OPS; OJS in other languages (code)
  - 3.5: OMP, OPS
  - 3.4: OMP, OPS (code)
  - 3.3: OMP, OPS (code; the checklist, the privacy statement, OPS's role names)
- **Introduced** not traced; present since at least [95cec4d325](https://github.com/pkp/ops/commit/95cec4d3258d99cd87761f975f3112c104cb04d8) (2020-02-27), which created OPS's French (Canada) default texts file on Weblate with a header only; these entries arrived in it later, empty
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U57 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U57-languages-and-locales.md#a8), spec U07 [OPS3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U07-journal-identity-and-about-pages.md#ops3), [OPS4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U07-journal-identity-and-about-pages.md#ops4), spec U53 [OPS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#ops1)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On a press or preprint server that offers French (Canada), the French
"Submissions" page shows "##default.contextSettings.authorGuidelines##"
and "##default.contextSettings.checklist##" where the author guidelines
and the submission checklist should be. A French author starting "Make
a Submission" is asked to confirm the checklist under that code. A
preprint server's French "Privacy Statement" page is only
"##default.contextSettings.privacyStatement##", and its Moderator and
manager roles are named "##default.groups.name.sectionEditor##" and
"##default.groups.name.manager##" in French: on the "Editorial
Masthead", on Users & Roles › "Roles" and in the users list's "Roles"
column. A journal shows French texts.

The codes are saved into the press's or server's settings when it is
created with French or French is added, so they stay, and no one is
told. "Reload defaults" for French writes the texts' codes again over a
French text the manager typed. A manager can replace each one by typing
a French text or renaming the role.

Every press and server with French (Canada) has them, the default test
dataset's included. The same happens in other languages wherever the
application's own default texts are untranslated, journals included:
the guidelines and checklist of a press in Catalan or Russian, a
preprint server in Catalan, French (France) or Norwegian Bokmål as in
French (Canada), a journal in Greek or Vietnamese (the full list under
Cause).

## Impact

- **Lost.** French readers and authors get no author guidelines,
  checklist or (on a server) privacy statement, only a code. A French
  author must tick "Oui, ma soumission répond à toutes ces exigences."
  to begin a submission without seeing the requirements; ticking it
  lets them go on. The manager is not told.
- **Who.** Readers and authors of every press and preprint server that
  offers French (Canada), whenever they use it in French, and every
  French author who submits there.
- **Way round.** A manager types a French text into each box, or empties
  it so the English text shows, and renames the roles under Users &
  Roles › "Roles". "Reload defaults" puts the codes back.

Medium: public pages and the submission's first screen show a code
instead of their text in one language, silently, but the submission
still goes on and a manager can replace each text on screen. It would
rise if the author could not begin the submission or there were no way
round.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main` or OPS `main`: the press or
  server `publicknowledge`, which offers English (primary) and French
  (Canada) for its pages and its forms. The journal of the OJS dataset is
  the control.

Reading the French pages (not signed in):

1. Open `/index.php/publicknowledge/fr_CA/about/submissions`
   ("Soumissions").
2. On OPS, open `/index.php/publicknowledge/fr_CA/about/privacy`.
3. On OPS, open `/index.php/publicknowledge/fr_CA/about/editorialMasthead`
   ("Entête").

The users list:

4. Sign in as `admin`. Open
   `/index.php/publicknowledge/fr_CA/management/settings/access`, the
   "Utilisateurs" tab, and read the "Rôles" column.

Reloading the French defaults:

5. Open Settings › Workflow › "Submission" › "Author Guidance". Press
   "French" above the form, type "Lignes directrices u57u4 de la
   maison." into "Author Guidelines", and press "Save".
6. Open step 1's page again.
7. Open Settings › Website › "Setup" › "Languages". On the
   "French/français" row, open the arrow, press "Reload defaults", then
   "OK". (Only the Site Administrator's rows carry the arrow.)
8. Open step 1's page again (on OPS, step 2's too).

Making a submission in French:

9. Sign in as the author `aclark` (OMP) or `ccorino` (OPS). Open "Make a
   Submission" in French, `/index.php/publicknowledge/fr_CA/submission`,
   and read "Liste de vérification de la soumission".

A new press or server with French:

10. Sign in as `admin`. Administration › "Hosted Presses" ("Hosted
    Servers") › "Create Press" ("Create Server"): name "u57u4 Press"
    ("u57u4 Server"), acronym "u57u4", contact "u57u4" and
    u57u4@mailinator.com, country Canada, path `u57u4`, English and
    French ticked, English primary. "Save".
11. Open `/index.php/u57u4/fr_CA/about/submissions` (on OPS, also
    `/index.php/u57u4/fr_CA/about/privacy`).
12. On OPS, open `/index.php/u57u4/fr_CA/management/settings/access`,
    the "Rôles" tab.

**Expected.** Every French page shows a text a reader can use: French
where the application has one, as the journal shows ("Les auteur.e.s
sont invité.e.s à soumettre un article à cette revue. …",
"Rédacteur-trice de rubrique"), otherwise the press's or server's
English text, as for any French box left empty. Where no French name
exists, the roles are named in English ("Moderator", "Preprint Server
manager"). Step 6 shows the typed text; after step 7 the French
guidelines are the default again, French or English, never a code.

**Observed.** Steps 1, 8 and 11 (OMP; OPS likewise under "Directives
aux auteurs-es" and "Liste de vérification de la soumission"):

```
Lignes directrices s'adressant aux auteurs
##default.contextSettings.authorGuidelines##
Liste de vérification pour la préparation de la soumission
##default.contextSettings.checklist##
```

- Steps 2, 8 and 11 (OPS): "Déclaration de confidentialité" over
  "##default.contextSettings.privacyStatement##".
- Step 3 (OPS): "Entête", then the heading
  "##default.groups.name.sectionEditor##" over Stephanie Berardo, David
  Buskins and Minoti Inoue.
- Step 4 (OPS): "##default.groups.name.manager##" for `admin`, Ramiro
  Vaca and Daniel Barnes, "##default.groups.name.sectionEditor##" for
  David Buskins and the other Moderators.
- Step 6: the typed text in place of the code; step 8: the code again.
- Step 9: under "Liste de vérification de la soumission *
  Obligatoire", "##default.contextSettings.checklist##", then the box
  "Oui, ma soumission répond à toutes ces exigences."
- Step 12 (OPS): "##default.groups.name.manager##" and
  "##default.groups.name.sectionEditor##" in the role names column.

No request failed and no script error showed. The journal shows French
texts at every step, and the press's and server's English pages show
their English texts.

## Cause

The default texts are translated from the application's locale files
and saved as the context's own data. `PKPSchemaService::getDefault()`
(`lib/pkp/classes/services/PKPSchemaService.php`) translates each
context property's `defaultLocaleKey` with `__()` for each language.
It serves `PKPContextService::add()` (a new context's languages) and
`restoreLocaleDefaults()` (the "Forms" tick and "Reload defaults").
`UserGroup\Repository::installLocale()` names the default roles the same
way, for every language the site has installed.

`Locale::translate()` answers a key that has no text in the language
with `'##' . $key . '##'`, and does not fall back to another language
(PKP's stated design, `pkp/pkp-lib#784`). These writers save that
placeholder, "##default.contextSettings.checklist##" for example, as the
French text or role name. Other installers already guard against it:
`emailTemplate\DAO::installEmailTemplateLocaleData()` and
`editorialTask\Repository` set a missing-key handler that returns `''`
around their `__()` calls, and the 3.5 upgrade
`I10620_EditorialBoardMemberRole` skips a name that comes back as
`##…##`. The context defaults, the role names, the file types
(`GenreDAO::installDefaults()`) and the contributor roles
(`PKPContextService::add()`) do not.

The texts are missing because the keys are the applications' own
(pkp-lib carries none of them) and the French (Canada) files leave them
empty. `LocaleFile` drops an empty `msgstr`. OMP's
`locale/fr_CA/default.po` has `default.contextSettings.authorGuidelines`
and `default.contextSettings.checklist` empty. OPS's has 26 entries
empty. Twenty reach a saved setting: those two, `privacyStatement`,
`forReaders`, `forAuthors`, `forLibrarians`, `openAccessPolicy`, the
name, plural and abbreviation of `manager` and `sectionEditor`, and
seven file types. The other six are harmless: `section.default.policy`
is written only in the primary language, and pkp-lib's French (Canada)
file supplies the five `default.submission.step.*` texts. OJS's file has
them all.

Reach:

- On screen (`main` and 3.5): the French "Submissions" page and "Make a
  Submission" (OMP, OPS), "Privacy Statement" and "Editorial Masthead"
  (OPS), and Users & Roles, both the users list's "Roles" column and
  the "Roles" tab (OPS, the Preprint Server manager and Moderator
  roles).
- Seen only in the database (dataset read): OPS's seven French file type
  names ("##default.genres.researchInstrument##" and others), which the
  French submission wizard lists; OPS's French "For Readers", "For
  Authors", "For Librarians" and open access policy, which no OPS
  screen shows.
- Other languages (code, `main`), the same gap in each application's
  own `default.po`:
  - OMP: guidelines and checklist in Arabic, Catalan, Greek, Scottish
    Gaelic, Galician, Hungarian, Norwegian Bokmål, Russian, Turkish and
    Vietnamese, the guidelines in Swedish.
  - OPS: as French (Canada) in Catalan, French (France) and Norwegian
    Bokmål; guidelines and checklist in Spanish and Portuguese.
  - OJS: guidelines and checklist in 15 languages (Greek and Vietnamese
    among them). In Albanian, Kabyle, Lower and Upper Sorbian and
    Northern Sami also the "For Readers", "For Authors" and "For
    Librarians" texts, the role names and the file types, and in all
    but Northern Sami the privacy statement.
  - Languages with no `default.po` at all store every text as a code:
    OMP Central Kurdish, Persian and Kyrgyz; OPS Croatian, Indonesian,
    Kyrgyz and Turkish; OJS eight languages.
- Not this fault, read at display time from missing keys (like spec U69
  [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a15)):
  OMP's signed-in French "Submissions" page shows
  "##about.onlineSubmissions.submissionActions##" and its "Roles" tab
  "##workflow.review.externalReview##"; the French users list of all
  three applications shows "##invitation.header##",
  "##userAccess.search##" and other pkp-lib keys.

## Proposed fix

1. In pkp-lib, one helper on the locale service,
   `Locale::getIfTranslated($key, $params, $locale)`, that translates
   with the missing-key handler set to return `''` and restores it in a
   `finally` (the pattern of the email and task template installers).
   Every writer of defaults calls it instead of `__()`:
   `PKPSchemaService::getDefault()`,
   `UserGroup\Repository::installLocale()`,
   `GenreDAO::installDefaults()` and the contributor roles in
   `PKPContextService::add()`
   ([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/french-default-texts-stored-as-codes/fix.diff)):

   ```diff
   +    public function getIfTranslated(string $key, array $params = [], ?string $locale = null): string
   +    {
   +        $previous = $this->missingKeyHandler;
   +        $this->missingKeyHandler = fn (string $key): string => '';
   +        try {
   +            return $this->get($key, $params, $locale);
   +        } finally {
   +            $this->missingKeyHandler = $previous;
   +        }
   +    }
   …
   -                    return __($propSchema->defaultLocaleKey, $localeParams, $localeKey);
   +                    return Locale::getIfTranslated($propSchema->defaultLocaleKey, $localeParams, $localeKey);
   ```

   An empty text then shows the primary language's text on public pages
   (`LocalizedData::getBestLocalizedData()` skips empty values). The
   Settings pages show the box as empty, which is the truth. This
   covers every language and every gap at once. A helper rather than
   the handler set inline in each writer: five call sites, and one
   place that cannot leave the handler set when a translation throws.
2. An upgrade migration that repairs saved codes. It scans the context
   settings (`journal_settings`, `press_settings`, `server_settings`)
   for properties with a `defaultLocaleKey`, `user_group_settings`
   (`name`, `abbrev`), `genre_settings` (`name`) and
   `contributor_role_settings` (`name`). A value that is exactly
   `##<its key>##`, or `<p>##<its key>##</p>` after a save in the editor,
   is replaced by the guarded translation: the French text once part 3
   is in, otherwise `''`. It writes `''` rather than deleting the row,
   the same value part 1 saves for a new context, and the page then
   shows the primary language's text. Not tried: a migration of stored
   data.
3. The French (Canada) texts, entered on Weblate, PKP's route for
   translations. OMP's two texts can start from OMP's French (France)
   file, which has both. OPS's twenty have no French source, since OPS's
   French (France) file is as empty. The journal's French texts, with
   "revue" made "serveur", are a starting point for the translators.
   Not tried: translators' wording.

Tried on `main`, part 1 alone. After "Reload defaults" and on the new
press and server, the French pages showed the English guidelines,
checklist and privacy statement, and the French submission's checklist
the English one. The server's "Rôles" tab listed "Preprint Server
manager" and "Moderator". The journal's French pages, the English pages
and the journal's saved French texts and role names were the same with
the fix in and out. Steps 1 to 4 still showed the codes saved before the
fix, which part 2 would repair.

**Alternatives**

- Translations alone (part 3): fixes French for presses and servers
  created afterwards, but every other gap still saves a code, and
  existing ones keep theirs.
- Save the primary language's text in the empty language's box: the
  Settings pages would then present English as the French text, and the
  "1/2 languages completed" count would be wrong. The public pages
  already fall back to the primary language when the box is empty.
- Hide `##…##` values when a page shows them: a filter at every reader
  of the data, leaving the saved data wrong.

**What goes with it**

- Left out of part 1: `PKPInstall` names the Site Administrator role per
  language the same way. That key is pkp-lib's own and translated in
  French.
- Backport: on 3.5 the diff applies as written. 3.4 has the same locale
  service with `setMissingKeyHandler()`; its
  `UserGroup\Repository::installLocale()` uses `setData()`, and the
  same helper goes there. 3.3's `PKPLocale` has no
  `setMissingKeyHandler()`, but its `__()` takes the missing-key handler
  as a fourth argument (`PKPLocale::translate()`, by default
  `addOctothorpes()`). The backport passes a handler that returns `''`
  in `PKPSchemaService::getDefault()`, in `UserGroupDAO::installLocale()`
  (which writes through `updateSetting()`) and in the file types;
  checking the answer for `##…##`, as `I10620_EditorialBoardMemberRole`
  does, works as well.
- The guard: a pkp-lib unit test that `PKPSchemaService::getDefault()`
  answers `''` for a key the language lacks, and an e2e check on a new
  press and server with French that the French "Submissions", "Privacy
  Statement" and masthead pages hold no `##` code (a Planned item in
  spec U57).

Medium: a helper and four call sites in pkp-lib, an upgrade migration to
repair stored data, and translations in two applications.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/french-default-texts-stored-as-codes/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/french-default-texts-stored-as-codes/walk.js)
  with its
  [`lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/french-default-texts-stored-as-codes/lib.js).
  It takes the Steps on all three apps, the journal as the control, and
  reads the English pages as a control that they stay unchanged. It also
  reads the saved French values of each context's three texts and roles.
  Run it on an install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/french-default-texts-stored-as-codes/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). The fix was tried
  with `node bin/try-fix.js apply …/fix.diff ojs omp ops`, the same
  script, then `revert`.
- Walked on `main` and `stable-3_5_0`, on PostgreSQL, from pkp/datasets
  c657990 (2026-10-01). Both lines gave the same codes at every step.
  The database plays no part (locale files and the writers); MySQL not
  checked.
- Tips: `main`: OJS b84f8e2e44 (`lib/pkp` ddd8ab243a), OMP 3b0ecf794c
  and OPS c8af945bb7 (`lib/pkp` 3dc90c81a6). `stable-3_5_0`: OJS
  c346ee00a5 (`lib/pkp` 3bb4450bea), OMP c7b45f88ea and OPS 8eaf899468
  (`lib/pkp` 1fb843f491). `stable-3_4_0`: OMP 0aec65441, OPS
  acd8ae704b, `lib/pkp` 32b0f4b4af. `stable-3_3_0`: OMP 8e72fc883, OPS
  c5532e2161, `lib/pkp` f6ab331645.
- Code reads: `locale/*/default.po` of the three apps on `main` (the
  language gaps under Cause, each key checked as missing or empty
  against `locale/en`), and pkp-lib's `locale/en` (none of these keys).
  3.5: the same `fr_CA/default.po` files as `main`, and the same writers.
  3.4: OMP's guidelines and checklist empty; OPS's guidelines,
  checklist, privacy statement and role names empty;
  `PKPSchemaService::getDefault()` and
  `UserGroup\Repository::installLocale()` translate with `__()`
  unguarded, and `Locale::setMissingKeyHandler()` exists. 3.3: the
  schema has no default guidelines; OMP's privacy statement and four of
  its five checklist items are empty, and OPS's privacy statement,
  checklist items and role names; `PKPSchemaService::getDefault()` and
  `UserGroupDAO::installLocale()` are unguarded, and
  `PKPLocale::translate()` takes a `$missingKeyHandler` argument.
- Introduced: the empty entries were blamed through the 2023
  rearrangement of the locale files (eb1d961fe7 in OPS, 3bcd14e06c in
  OMP, both moves). OPS's `locale/fr_CA/default.po` was added on Weblate
  in 95cec4d325 with a header only, and the entries arrived empty. The
  unguarded `__()` in `getDefault()` dates from the schema service
  (blamed to e3f570bc37, 2021-04-20, itself a move). Not traced further.
- Upstream: pkp/pkp-lib, pkp/ops, pkp/omp and pkp/ui-library searched by
  the key names, "missing translation", "untranslated role names",
  "reload defaults", `getDefault` and `setMissingKeyHandler`. Read:
  `pkp/pkp-lib#3223` (role names in the wrong language on 3.1, not this
  fault), `pkp/pkp-lib#6467` ("Reload defaults" and `$contextPath`, not
  this fault).
- Not driven: 3.4 and 3.3 (code only); languages other than French
  (Canada) (code only); OPS's file type names in the submission wizard
  (database read only); the role code in other lists, such as a
  submission's participants.
- Unverified: parts 2 and 3 of the fix; whether a context whose primary
  language lacks a role's text would then show an empty role name where
  the site has no other language with that text.
