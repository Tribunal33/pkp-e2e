# A preprint server in French names its Moderator permission level "Éditeur-trice de série" (Series Editor)

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: OPS (code)
- **Introduced** `pkp/ops#6` for `pkp/pkp-lib#5622` · [09189ff724](https://github.com/pkp/ops/commit/09189ff7242ebc86113a179372eaa743dea24053), [559c1e475c](https://github.com/pkp/ops/commit/559c1e475cfd7456f0d2ba0a2752e26818e7897a) · 2020-04-09 · Antti-Jussi Nygård (ajnyga)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U54 [OPS3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#ops3)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

In French (Canada), a preprint server names its Moderator permission
level "Éditeur-trice de série" (Series Editor) wherever the level
shows: the "Niveau d'autorisation" column of Users & Roles › "Rôles",
that list's search filter, the role window's "Niveau d'autorisation"
list, and Statistics › Users. The English pages read "Moderator", and
the server's other French texts call the role "modérateur-trice". The
name was right until 2020, when OPS renamed the role in English and the
French text was never updated.

Every task still works, but a manager who sets up roles in French is
shown a press's title for the Moderator level, and the server cannot
change it from its settings.

The Spanish interface reads "Editor de series" for the same reason.
These are the only two languages affected. The fix is a translation
fix, with no code change.

## Impact

- **Lost.** Nothing; the level's name is wrong.
- **Who.** Every preprint server that offers French (Canada) or Spanish,
  for the managers who use it in that language.
- **Way round.** A manager who switches the interface to English sees
  the right name. In French or Spanish there is none.

Low: a wrong label in two languages. It would rise only if the wrong
name led a manager to build a Moderator-type role on the wrong
permission level. The level list offers no other level that looks like
a moderator's, so that is unlikely.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OPS `main`: the server
  `publicknowledge`, which offers English and French (Canada). `dbarnes`
  is one of its managers; `dbuskins`, `sberardo` and `minoue` hold its
  Moderator role.
- The journal of the OJS dataset and the press of the OMP dataset are
  the controls, through the same steps. There the row to read is the
  fourth, "Rédacteur-trice de rubrique" on the journal and
  "Rédacteur/Rédactrice en chef de la série" on the press.

Steps:

1. Sign in as `dbarnes`.
2. Open the initials menu at the top right, "Change Language", and pick
   "français".
3. Open Settings › Users & Roles
   (`/index.php/publicknowledge/fr_CA/management/settings/access`) and
   the "Rôles" tab. Read the "Niveau d'autorisation" column. The
   Moderator role's row is the second; its name shows as
   "##default.groups.name.sectionEditor##", a separate fault (Evidence).
4. Press "Rechercher" above the list and open the second list of the
   filter, the one starting "Toutes les permissions".
5. On the Moderator row, open the arrow and press "Modifier". Read the
   "Niveau d'autorisation" field, then close the window.
6. Open Statistics › Users
   (`/index.php/publicknowledge/fr_CA/stats/users/users`) and read the
   list under "Utilisateurs-trices enregistrés-es".

**Expected.** The Moderator level reads a French word for moderator,
"Modérateur-trice", the word the server's French texts already use ("Un-e
modérateur-trice évaluera votre soumission"), as the English pages read
"Moderator".

**Observed.**

```
Step 3: ##default.groups.name.sectionEditor## | Éditeur-trice de série
Step 4: Toutes les permissions, Administrateur-trice du serveur, Éditeur-trice de série, Adjoint-e, Auteur-e, Évaluateur-trice
Step 5: Niveau d'autorisation*  Éditeur-trice de série
Step 6: Administrateur-trice du serveur 3, Éditeur-trice de série 3
```

The journal reads its own "Rédacteur-trice de rubrique" and the press
its own "Rédacteur/Rédactrice en chef de la série" in the same places.

## Cause

`Application::getRoleNames()` (`lib/pkp/classes/core/PKPApplication.php`)
maps the sub-editor role to `user.role.subEditor`. pkp-lib has no text
for that key; each application supplies its own in
`locale/<language>/locale.po`. In OPS's French (Canada) file the entry is
"Éditeur-trice de série"
([`locale/fr_CA/locale.po`](https://github.com/pkp/ops/blob/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2/locale/fr_CA/locale.po#L137-L143)),
with the plural "Éditeurs-trices de série", both under a `#, fuzzy`
flag.

The French text was right when it was written. It translates the
English "Series Editor" that OPS used until April 2020
([0c6a3db08b](https://github.com/pkp/ops/commit/0c6a3db08b98072ebecb9a7389d72fc6ccea726d),
Weblate, 2020-02-27). `pkp/ops#6`, the start of the Moderator role
(`pkp/pkp-lib#5622`), renamed the English texts in
[09189ff724](https://github.com/pkp/ops/commit/09189ff7242ebc86113a179372eaa743dea24053):
"Series Editor" became "Moderator", "Server Manager" became "Manager",
and "Series" became "Section". The next commit,
[559c1e475c](https://github.com/pkp/ops/commit/559c1e475cfd7456f0d2ba0a2752e26818e7897a),
marked the French (Canada), Spanish and Portuguese (Brazil) entries
fuzzy for the translators to redo. French (Canada) and Spanish were
never redone.

A fuzzy flag does not keep a text off the screen. `LocaleFile::loadArray()`
(`lib/pkp/classes/i18n/translation/LocaleFile.php`) builds the table
with gettext's `ArrayGenerator`, which skips only empty and disabled
entries. That is how PKP uses the flag: `lib/pkp/tools/markLocaleKeyFuzzy.php`
marks a key when its English changes and leaves the old text in use
until a translator acts. So the fault is the stale text, not the loader.

Reach:

- Screens (walked, `main` and 3.5): the "Rôles" list's level column,
  its search filter, the role window's level list, and Statistics ›
  Users.
- The monthly statistics email's spreadsheet lists users by level. It is
  written in the server's primary language
  (`StatisticsReportMail::handle()` passes `getPrimaryLocale()`), so the
  wrong name shows there only on a server whose primary language is
  French (Canada) or Spanish (code). The `GET /api/v1/stats/users`
  answer carries the name in the request's language (code).
- Spanish (`locale/es/locale.po`): "Editor de series" and "Editores de
  series", flagged by the same commit (code; the dataset offers no
  Spanish).
- The same commit's flags still stand on 22 other French (Canada) and 23
  other Spanish entries, besides the two the fix changes (code). Most
  are the section texts, where French says "série" and Spanish "serie"
  where English now says "Section" (`section.section` "Série",
  `manager.sections.create` "Créer une série"). `user.role.manager`
  reads "Administrateur-trice du serveur" and "Administrador de
  servidores", which still name the manager level.
- Not this fault (code):
  - Portuguese (Brazil) reads "Moderator da Série". It was flagged by the
    same commit and translated again in 2025. It names a moderator, in
    that file's own word for a section ("Série"); the English spelling
    "Moderator" is for its translators.
  - French (France) has a header-only `locale.po`, Catalan and Norwegian
    Bokmål leave the entry empty, and Portuguese has none. Croatian,
    Indonesian and Kyrgyz have no OPS `locale.po` at all. All of these
    print "##user.role.subEditor##": a missing translation, not a stale
    one. The report
    [U13-OPS7-OPS8-ops-french-preprint-raw-keys.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U13-OPS7-OPS8-ops-french-preprint-raw-keys.md)
    notes the same gap for its own keys.
  - OJS and OMP name the level with their own French texts (walked).

## Proposed fix

The French (Canada) and Spanish translators translate the two entries
again on Weblate and clear their fuzzy flags. No developer change is
needed on `main` or 3.5: PKP merges Weblate's OPS translations into
`stable-3_5_0`, and from there into `main`. The result is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-french-moderator-reads-series-editor/fix.diff):

```diff
--- a/locale/fr_CA/locale.po
+++ b/locale/fr_CA/locale.po
-#, fuzzy
 msgid "user.role.subEditor"
-msgstr "Éditeur-trice de série"
-
-#, fuzzy
+msgstr "Modérateur-trice"
+
 msgid "user.role.subEditors"
-msgstr "Éditeurs-trices de série"
+msgstr "Modérateurs-trices"
```

Spanish takes "Moderador/a" and "Moderadores/as" the same way.

How this was settled:

- **How the code base does it.** The French words follow the server's
  own "modérateur-trice" (`emails.po`) and the "-trice" forms of the
  other levels ("Évaluateur-trice"). The Spanish follows pkp-lib's "/a"
  forms ("Autor/a", "Revisor/a").
- **Every instance.** The other flagged entries in Reach are left to
  the translators. The section wording is a choice of French and Spanish
  terms, and the manager level's text still names the right level.
- **What it touches.** Display only: no level name is stored, and the
  stored role names are another set of texts.
- **Backport.** Weblate's last merge into `stable-3_4_0` was in February
  2024, so 3.4 takes the change only as a developer's commit of
  fix.diff. 3.3 would take the same commit with Spanish in
  `locale/es_ES/locale.po`.

Tried on `main`: with the diff applied, steps 3, 4 and 6 read
"Modérateur-trice", and the manager level kept "Administrateur-trice du
serveur". The role window of step 5 is filled by the same
`Application::getRoleNames(true)` as step 4's filter. A neighbour check
of the same screens in English read "Manager" and "Moderator" with the
fix in and out.

**Alternatives**

- Make the loader skip fuzzy entries. PKP's keys are not English text,
  so every flagged entry would show as a "##key##" code, which is worse
  than a stale text.

**What goes with it**

- **Guard.** No unit test fits a translation. Two things would catch it: the U54 spec's French "Roles" tab scenario reading a preprint server's Moderator level (a **Planned** item), or a locale check that flags entries still fuzzy long after their English changed.

Small: two entries in each of two translations, done on Weblate, tried,
with no data to repair.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/ops-french-moderator-reads-series-editor/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-french-moderator-reads-series-editor/walk.js)
  takes the Steps on OPS, with OJS and OMP as controls, on an install
  freshly loaded from the default dataset. It runs from a pkp-e2e
  checkout:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/ops-french-moderator-reads-series-editor/walk.js`,
  where `<feature>` names the prepared dataset install
  (`.reports/<feature>/fleet.json`) and `<agent>` the output folder
  under it. Put `PKP_E2E_LINE=stable-3_5_0` in front for 3.5, and `NB=1`
  to run the neighbour check alone (the same screens in English). The
  script opens Settings › Users & Roles and Statistics › Users by their
  addresses.
- Fix trial: `node bin/try-fix.js apply <fix.diff> ops`, then the walk
  and the neighbour check, then `node bin/try-fix.js revert <fix.diff> ops`.
- Walked on `main` and `stable-3_5_0`, on PostgreSQL, from pkp/datasets
  c657990 (2026-10-01). No request failed and no script error showed. A
  database plays no part (locale files).
- Branch heads walked or read: OPS `main` c8af945bb7, its `lib/pkp`
  3dc90c81a6; OJS `main` b84f8e2e44 (`lib/pkp` ddd8ab243a) and OMP
  `main` 3b0ecf794 (`lib/pkp` 3dc90c81a6), the controls. OPS
  `stable-3_5_0` 8eaf899468, its `lib/pkp` 1fb843f491; OJS c346ee00a5
  and OMP c7b45f88e. OPS `stable-3_4_0` acd8ae704b, `lib/pkp`
  32b0f4b4af. OPS `stable-3_3_0` c5532e2161, `lib/pkp` f6ab331645.
- Code reads: on each branch, OPS's `locale/fr_CA/locale.po` and
  `locale/es/locale.po` (`locale/es_ES` on 3.3): the same fuzzy
  "Éditeur-trice de série" and "Editor de series" on all four, and
  "Moderator" in English. `UserGroupGridCellProvider` reads
  `Application::getRoleNames()` on all four. The loader: `main` and 3.4
  `LocaleFile::loadArray()` (`includeEmpty => false`; the vendored
  `ArrayGenerator` skips empty and disabled entries only); 3.3
  `LocaleFile::load()` keeps every non-empty text, flag or not. The
  Weblate route: `git log --grep='translations/'` on each branch (the
  latest merges are `translations/stable-3_5_0`, September 2026, also
  in `main`; `translations/stable-3_4_0` last on 2024-02-22).
- Introduced: `git log -S'"Moderator"'` on `locale/en_US/locale.po`
  gives 09189ff724. Walking `locale/fr_CA/locale.po` from 2020 gives
  559c1e475c as the commit that put `#, fuzzy` above
  `user.role.subEditor`. Both are in `pkp/ops#6` (merged 2020-04-09),
  which links `pkp/pkp-lib#5622`. The flagged-entry counts take the
  entries 559c1e475c flagged, across all of a language's `.po` files,
  that still carry the flag on `main`, less the two `user.role.subEditor`
  entries.
- Upstream: pkp/pkp-lib, pkp/ops and pkp/ui-library searched for
  "French moderator", "Éditeur-trice de série", "moderator translation",
  "fuzzy", `user.role.subEditor` and "Series Editor moderator". Read:
  `pkp/pkp-lib#5622` (the Moderator role's own issue, open, not about
  the translation) and `pkp/pkp-lib#5610` (OPS wording, where the name
  "Moderator" was first suggested).
- The Moderator row's name, "##default.groups.name.sectionEditor##", is
  the report
  [U57-A8-french-default-texts-stored-as-codes.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U57-A8-french-default-texts-stored-as-codes.md):
  a missing French text saved into the server's data, another cause.
- Not driven: 3.4 and 3.3 (code only); Spanish and the other languages
  (code only; the dataset offers English and French); the statistics
  email.
- Unverified: whether the Custom Locale plugin would replace these
  texts; it was not installed.
