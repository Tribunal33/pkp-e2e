# In French (Canada), a preprint server names its Moderator permission level "Éditeur-trice de série" (Series Editor)

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: OPS (code)
- **Introduced** `pkp/ops#6` for `pkp/pkp-lib#5622` · [09189ff724](https://github.com/pkp/ops/commit/09189ff7242ebc86113a179372eaa743dea24053) · 2020-04-08 · Antti-Jussi Nygård (ajnyga)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U54 [OPS3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#ops3)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

In French (Canada) a preprint server's "Rôles" list reads
"Éditeur-trice de série" (Series Editor, a press's level) in the
"Niveau d'autorisation" cell of the Moderator row. The list's level
filter and "Créer un nouveau rôle" offer the same name, and the user
statistics page (Statistiques › "Utilisateurs-trices") uses it as the
label of the row that counts the Moderators. In English all four read
"Moderator".

A manager who creates or reviews roles in French is told the server has
series editors, a role it does not have, while the level itself works as
a Moderator. Switching the interface to English shows the right name;
nothing in French does.

The wrong text is one entry in OPS's French (Canada) translation file,
so a translator can correct it on PKP's Weblate, or a developer in the
`.po` file.

## Impact

- **Lost.** Nothing. The label is wrong; the level behaves as a
  Moderator.
- **Who.** Managers of a preprint server who use it in French (Canada),
  on Users & Roles and on the user statistics page. On a server whose
  primary language is French (Canada), every recipient of the monthly
  statistics email also gets the wrong name, in the user table of its
  attached report.
- **Way round.** Switching the interface to English shows "Moderator";
  nothing in French does.

Low: a misleading label while every task gets done, which is what low
covers; it would be higher only if the name led a manager to give
someone the wrong level, which nothing here shows.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OPS `main` (OJS and OMP `main` are the
  control). Its `publicknowledge` offers English and French (Canada)
  under "UI".

Steps:

1. Sign in as `admin`. Open
   `/index.php/publicknowledge/fr_CA/management/settings/access`, tab
   "Rôles".
2. Read the "Niveau d'autorisation" cell of the second row, the
   Moderator role.
3. Press "Rechercher" and open the permission level list ("Toutes les
   permissions").
4. Press "Créer un nouveau rôle" and open "Niveau d'autorisation". Close
   the window.
5. Open Statistiques › "Utilisateurs-trices"
   (`/index.php/publicknowledge/fr_CA/stats/users/users`).
6. Take steps 1 to 5 at `/en/`.

**Expected.** The French for "Moderator" in steps 2 to 5.

**Observed.** Step 2:

```
Nom du rôle                            Niveau d'autorisation
##default.groups.name.manager##        Administrateur-trice du serveur
##default.groups.name.sectionEditor##  Éditeur-trice de série
Auteur-e                               Auteur-e
Lecteur-trice                          Lecteur-trice
Membre du comité éditorial             Adjoint-e
```

Step 3 offers "Toutes les permissions, Administrateur-trice du serveur,
Éditeur-trice de série, Adjoint-e, Auteur-e, Évaluateur-trice"; step 4
the same levels and "Lecteur-trice"; step 5 lists "Éditeur-trice de
série 3". In step 6 every one of them reads "Moderator". (The role names
printed as codes in the first column are another fault, the server's
empty French role names:
[U57-A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U57-A8-omp-ops-french-texts-internal-names.md).)

A journal's French list reads its own level, "Rédacteur-trice de
rubrique", and a press's "Rédacteur/Rédactrice en chef de la série".

## Cause

OPS's French translation still holds the name the level had before OPS
renamed it. In
[`locale/fr_CA/locale.po`](https://github.com/pkp/ops/blob/c8af945bb7/locale/fr_CA/locale.po#L137-L143)
`user.role.subEditor` reads "Éditeur-trice de série" and
`user.role.subEditors` "Éditeurs-trices de série", both flagged
`#, fuzzy`. `PKPApplication::getRoleNames()` maps `ROLE_ID_SUB_EDITOR`
to `user.role.subEditor`, which OPS's English reads "Moderator".

The French was entered on PKP's Weblate on 2020-02-27
([0c6a3db08b](https://github.com/pkp/ops/commit/0c6a3db08b98072ebecb9a7389d72fc6ccea726d)),
when OPS's English still read "Series Editor", the string OPS had taken
over from OMP. On 2020-04-08 `pkp/ops#6` (for `pkp/pkp-lib#5622`, the
moderator role) renamed the English to "Moderator" and "Moderators" and
left the French as it was. The translation file marks the two entries
fuzzy, gettext's flag for a translation whose source has changed and
needs review. PKP shows a fuzzy entry as it stands:
`LocaleFile::loadArray()` builds the strings with gettext's
`ArrayGenerator`, which drops only empty and obsolete (`#~`) entries.

`user.role.manager`, just above, is fuzzy for the same reason: that
commit renamed its English from "Server Manager" to "Manager". Its
French, "Administrateur-trice du serveur" (server manager), still names
the level rightly, so the fix leaves it, flag included, to the
translators' review.

Reach:

- The level's name on the "Rôles" list, its level filter, the role
  window and Statistiques › "Utilisateurs-trices" (walked).
- The monthly statistics email's attached report
  (`lib/pkp/jobs/notifications/StatisticsReportMail.php`), whose user
  table has one row per level, labelled with the level's name. The
  report is written in the server's primary language
  (`$context->getPrimaryLocale()`), not the recipient's: on a server
  whose primary language is French (Canada) every recipient reads
  "Éditeur-trice de série" there; on any other server no one does (code).
- The plural is used by no OPS screen (code).
- OPS's Spanish has the same stale pair, "Editor de series" and
  "Editores de series", also fuzzy (code). Its default name for the
  Moderator role says series editor too, so Spanish translators should
  change the two together; left out of the fix.
- OPS's French holds 49 fuzzy entries (OMP's 26, OJS's 8). Several are
  the same kind of leftover from OMP's words: "série" where OPS's
  English says "Section", "Commentaires pour le,la rédacteur-trice" for
  "Comments for the Moderator", and "rédacteurs-trices" for "Managers and
  Moderators" in the section form (code). Left out: each needs a French
  translator's reading.

## Proposed fix

A proposal; the team decides. In OPS's `locale/fr_CA/locale.po`, translate the two entries as
"Modérateur-trice" and "Modérateurs-trices" and drop their fuzzy flags
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-moderator-level-series-editor-french/fix.diff)):

```diff
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

"Modérateur-trice" is the word the server's French already uses for the
role (Evidence). It is also the role name that
[U57-A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U57-A8-omp-ops-french-texts-internal-names.md)'s
fix gives the Moderator role, so the level and the role would match. A
French (Canada) translator should confirm it. The file is also written
by PKP's Weblate, so the change can land as a commit to OPS, which
Weblate takes up, or be entered on Weblate, where clearing the flag is
part of the review.

Tried on `main`: with the fix in, steps 2 to 5 read "Modérateur-trice";
the English pages and the other levels did not change.

**Alternatives:**

- Have the loader skip fuzzy entries, as gettext's own tools do: the
  cells would then print "##user.role.subEditor##", since a missing
  French text does not fall back to English. Worse until every fuzzy
  entry is reviewed.
- Leave it to Weblate's review: the entries have carried the flag on
  every version from 3.3 on, so the review has not reached them.

**What goes with it:**

- No data repair: the level name is translated on each request, and no
  setting stores it.
- Backport: the diff applies as it stands to 3.5, 3.4 and 3.3 (checked
  with `patch --dry-run`).
- Guard: a release check that lists each app's `#, fuzzy` entries per
  language (`msgfmt --statistics` counts them), which would fit the PO
  validation `pkp/pkp-lib#7063` proposes.

Small: one translation file, with no code to change and no stored data
to repair.

## Evidence

- Kept script, run on all three apps on an install reset to the default
  dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-moderator-level-series-editor-french/walk.js)
  takes steps 1 to 6:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/ops-moderator-level-series-editor-french/walk.js`,
  walked on `main` and on 3.5. With the fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/ops-moderator-level-series-editor-french/fix.diff ops`,
  the same walk with `PROBE_RUN=fix`, then
  `node bin/try-fix.js revert shared/playwright/checks/issues/ops-moderator-level-series-editor-french/fix.diff ops`.
  Nothing is created or saved; no server error or script error was
  recorded.
- The server's French elsewhere calls the role a moderator:
  `editor.submissions.assignedTo` "Assigné au modérateur"
  (`locale/fr_CA/editor.po`) and "Un-e modérateur-trice" in
  `locale/fr_CA/emails.po`.
- Tips walked: OPS `main` [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb7),
  OMP `main` [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794c)
  (both pkp-lib [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a6)),
  OJS `main` [bade233f73](https://github.com/pkp/ojs/commit/bade233f73)
  (pkp-lib [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc));
  OPS `stable-3_5_0` [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd),
  OMP [3081c9b00d](https://github.com/pkp/omp/commit/3081c9b00d),
  OJS [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48)
  (pkp-lib [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed62));
  on PostgreSQL, default dataset from pkp/datasets 38ab955 (2026-09-30).
- Code reads, `main` and 3.5: OPS's French, English and Spanish
  `locale.po` and the fuzzy entries of each app's French files;
  `PKPApplication::getRoleNames()`; `UserGroupGridCellProvider`,
  `UserGroupGridHandler`, `UserGroupForm`; `PKPStatsHandler::users()`,
  `user\Repository::getRolesOverview()` and `StatisticsReportMail::handle()`
  and `createCsvAttachment()`; OPS's `locale/fr` (French, France), whose
  files hold headers only, so this wrong name is French (Canada)'s alone;
  `LocaleFile::loadArray()` and gettext's `ArrayGenerator`. 3.4 (OPS
  [acd8ae704b](https://github.com/pkp/ops/commit/acd8ae704b), pkp-lib
  [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d)) and 3.3
  (OPS [c5532e2161](https://github.com/pkp/ops/commit/c5532e2161), pkp-lib
  [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe)): the
  same two fuzzy entries; the English reads "Moderator"; the level cell
  prints `getRoleNames()`'s key for the row; 3.4's `LocaleFile` and 3.3's
  `LocaleFile::load()` keep every non-empty entry, fuzzy ones included.
- Introduced: `git log -L` on the French entry: added by `0c6a3db08b`
  (Weblate, 2020-02-27) translating "Series Editor"
  (`0c6a3db08b^:locale/en_US/locale.po`), moved by `c8046900c3` (2021) and
  `eb1d961fe7` (2023, the locale rearrangement) unchanged. The English
  became "Moderator" in `09189ff724`, merged by `pkp/ops#6` (author
  ajnyga, 2020-04-09).
- Upstream search (2026-10-01; pkp-lib and ops: "moderator french",
  "fuzzy"; pkp-lib: "fuzzy translation", "série"): nothing on this.
  Related, not the same fault: `pkp/pkp-lib#7063` (PO file validation,
  open).
- Not driven: 3.4 and 3.3, the monthly statistics email and the Spanish
  interface (code).
