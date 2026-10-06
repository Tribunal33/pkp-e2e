# On a press or preprint server in French (Canada), Administration shows a code under "Gestion du site"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP, OPS
  - 3.5: OMP, OPS
  - 3.4: OMP, OPS (code)
  - 3.3: none (code; the page has no such line)
- **Introduced** `pkp/omp#1094` and `pkp/ops#258` for `pkp/pkp-lib#7799` · [c9757a3346](https://github.com/pkp/omp/commit/c9757a33460297a4950b47c53638e07685b4bf6b), [887d433ec0](https://github.com/pkp/ops/commit/887d433ec02298c026e2f69a21e2166eaca8af5b) · 2022-03-31 · Nate Wright (NateWr). The two commits added the line with its English text only; no French (Canada) text was added later
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U61 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U61-system-administration.md#a7)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A Site Administrator who reads Administration in French (Canada) on a
press or a preprint server finds "##admin.siteManagement.description##"
under the "Gestion du site" heading. A journal shows the French line
there: "Ajouter, modifier ou supprimer des revues de ce site et gérer
les paramètres de l'ensemble du site."

The panel's buttons and the other five panels are in French (Canada)
and work.

By the code, the same line is missing in other languages of both apps
too: 13 more of OMP's and 9 more of OPS's, French (France) on a preprint
server among them.

## Impact

- **Lost.** Nothing the administrator does; no data, no action.
- **Who.** Site Administrators of a press or a preprint server who use
  the French (Canada) interface, each time they open Administration.
- **Way round.** Switching the interface to English shows the line;
  there is none while working in French (Canada).

Low: the code replaces a sentence that explains the panel, not a control
or any content; it would rise only if it hid something the administrator
needs in order to act.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main` (or OPS `main`), freshly
  loaded. The site offers English and French (Canada).

Steps:

1. Sign in as `admin`.
2. Open Administration, `/index.php/index/en/admin`.
3. Open the user menu (the "admin" avatar at the top right) and, under
   "Change Language", press "français".
4. On "Administration", read the line under the "Gestion du site"
   heading.

**Expected.** The line reads in French, as a journal's does: "Ajouter,
modifier ou supprimer des presses de ce site et gérer les paramètres de
l'ensemble du site." (on a preprint server, "… des serveurs …").

**Observed.**

```
Gestion du site
##admin.siteManagement.description##
[Presses hébergées] [Paramètres du site]
```

On OPS the first button reads "Serveurs hébergés". The other panels
("Renseignements sur le système", "Fermer les sessions utilisateur",
"Vider les caches", "Vider le journal d'événements des tâches
planifiées", "Travaux") read in French. The same steps on OJS show the
French line.

## Cause

`lib/pkp/templates/admin/index.tpl` prints
`{translate key="admin.siteManagement.description"}` under the panel's
heading. Each app defines that key itself, because the line names the
app's own kind of site (journals, presses, preprint servers). In OMP's
and OPS's `locale/fr_CA/admin.po` the entry is `msgstr ""`.

`LocaleFile::loadArray()` (`lib/pkp/classes/i18n/translation/LocaleFile.php`)
drops an empty text (`includeEmpty => false`), and `Locale::translate()`
(`lib/pkp/classes/i18n/Locale.php`) does not fall back to another
language, so the page prints `##admin.siteManagement.description##`.
That is PKP's stated design: `pkp/pkp-lib#784` points to the "Default
Translation" plugin for an English fallback, which hooks into the
`Locale::translate` hook that `Locale::translate()` calls for a missing
text (line 513).

The line came with the Administration page's panels in `pkp/pkp-lib#7799`
(2022-03-31): pkp-lib's template change in `pkp/pkp-lib#7811`
([1f9608dc70](https://github.com/pkp/pkp-lib/commit/1f9608dc70771ee52dab7898758321546b4117d7))
and the English text in each app. OJS's French (Canada) text was entered
on Weblate on 2022-07-04
([c6da36d2ee](https://github.com/pkp/ojs/commit/c6da36d2ee61e88685c06af00c462b3e5be7a866)).
OMP's and OPS's entries first appear, empty, when the locale files were
rearranged on 2023-01-30, and have stayed empty. OMP's French (Canada)
`admin.po` has had no new text since 2020; its one later Weblate commit
(545b3c23d, 2023-02-17) changed only the file's header.

Reach. In the lists below, "no text" means the `msgid` is there with an
empty `msgstr`, and "no entry" means the `msgid` is not in the file.

- Other admin texts (code): OMP's French (Canada) `admin.po` has no
  text for nine other keys and OPS's for eight, among them the "Bulk
  Emails" and statistics descriptions on Site Settings (spec U60
  [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U60-site-settings.md#a2)).
  They show on other screens and are not covered by this report.
- Other languages (code), the same line on `main`:
  - OMP: no text in Catalan, Greek, French (Canada), Galician, Norwegian
    Bokmål, Russian, Swedish, Turkish and Vietnamese; no entry in
    Persian and Kyrgyz; no `admin.po` in Arabic, Central Kurdish and
    Scottish Gaelic.
  - OPS: no text in Catalan, Spanish, French (Canada), Indonesian and
    Norwegian Bokmål; no entry in French (France), Kyrgyz, Portuguese and
    Turkish; no `admin.po` in Croatian.
  - OJS has the French (Canada) text, but not some other languages'.
- Other callers: the key is read only by `templates/admin/index.tpl`.

## Proposed fix

Enter the missing French (Canada) text for OMP and for OPS on Weblate.
PKP's translations are entered there, and Weblate writes the locale
files. The French (Canada) translators of OMP and OPS can enter it, or a
developer can commit it if the team prefers. The texts, one per app, are
in
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/admin-page-french-site-management-raw-key/fix-omp.diff)
and
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/admin-page-french-site-management-raw-key/fix-ops.diff):

```diff
 msgid "admin.siteManagement.description"
 msgstr ""
+"Ajouter, modifier ou supprimer des presses de ce site et gérer les paramètres "
+"de l'ensemble du site."
```

Each copies OJS's French (Canada) text with the app's own noun, the one
its French (Canada) files already use ("Presses hébergées", "Serveurs
hébergés", "Créer une presse", "Créer un serveur"). The wording is a
proposal for the translators.

Tried on `main`, with the two diffs applied: the walk read the proposed
text on both apps. A second read of every Administration panel in both
languages, and of the French (Canada) hosted presses or servers page,
with the diffs out and in, changed that line alone; OJS read the same
both times.

**Alternatives**

- Commit the diffs to OMP and OPS: the same result at once, but
  Weblate's next sync may conflict with it or empty the entries again.
- Copy OMP's French (France) text ("… des maisons d’édition de ce site
  et gérer les paramètres au niveau du site."): it names a press
  differently from the rest of OMP's French (Canada) interface, and OPS
  has no French (France) text to copy.
- Fall back from a missing text to another language in
  `Locale::translate()`: it would cover every gap of this kind, but PKP
  chose a plugin for that (`pkp/pkp-lib#784`), and it is a product
  decision.

**What goes with it**

- The stable branches: Weblate commits land on `stable-3_5_0` itself
  (the latest Weblate commits there, OMP and OPS, are from September
  2026 and are not on `main`), so the text is entered for that branch as
  well. On `stable-3_4_0` the latest Weblate commits are from 2025-02-13
  (OMP) and 2024-02-14 (OPS), so 3.4 may need a developer's commit of
  the same text.
- Left out: the other empty French (Canada) admin texts (spec U60 A2
  for those on Site Settings) and the languages listed under Cause.
- The guard: the U61 spec's French reading of Administration, asserting
  that the page shows no `##` code (a Planned item).

Small: one text per app, tried as a diff, with no code change.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/admin-page-french-site-management-raw-key/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/admin-page-french-site-management-raw-key/walk.js)
  takes the Steps on OJS (the journal control), OMP and OPS, reading the
  English page at step 2 and every panel in French at step 4. It changes
  no data. Run it on an install loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/admin-page-french-site-management-raw-key/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). The second read
  of the panels is
  [`neighbour.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/admin-page-french-site-management-raw-key/neighbour.js)
  beside it, run with the diffs out and in.
- Walked on `main` and `stable-3_5_0`, on PostgreSQL, from pkp/datasets
  c657990 (2026-10-01). No request failed and no script error showed.
- Walked as written. After signing in, `admin` lands on
  the context's reader pages, so step 2 opens Administration by its
  address.
- Fix trial: `node bin/try-fix.js apply …/fix-omp.diff omp` and
  `… fix-ops.diff ops`, the kept script and `neighbour.js`, then
  `revert`.
- Tips: OJS `main` b84f8e2e44 (`lib/pkp` ddd8ab243a); OMP `main`
  3b0ecf794c and OPS `main` c8af945bb7 (`lib/pkp` 3dc90c81a6). OJS
  `stable-3_5_0` c346ee00a5 (`lib/pkp` 3bb4450bea); OMP `stable-3_5_0`
  c7b45f88ea and OPS `stable-3_5_0` 8eaf899468 (`lib/pkp` 1fb843f491).
  `stable-3_4_0`: OJS 75cc2d488b, OMP 0aec65441f, OPS acd8ae704b, pkp-lib
  32b0f4b4af. `stable-3_3_0`: OJS ac77c9fb35, OMP 8e72fc8836, OPS
  c5532e2161, pkp-lib f6ab331645.
- Code reads: on each branch, `templates/admin/index.tpl` in pkp-lib and
  `admin.siteManagement.description` in each app's `locale/en` (`en_US`
  on 3.3), `locale/fr_CA` and `locale/fr` (`fr_FR` on 3.4). `main`, 3.5,
  3.4: the template prints the key; OJS's French (Canada) text is there,
  OMP's and OPS's entries are empty. 3.3: the panel is a list of links
  under "Site Management" with no description, and no app defines the
  key. On `main` also `LocaleFile::loadArray()`, `Locale::translate()`,
  and every `locale/*/admin.po` of the three apps for the language counts
  (an empty `msgstr` counted as "no text").
- Introduced: `git log -S'admin.siteManagement.description'` on each
  app's English and French (Canada) locale files and on pkp-lib's
  templates. The English text came in OMP c9757a3346 and OPS 887d433ec0
  (merged in `pkp/omp#1094` and `pkp/ops#258`, 2022-04-05) with pkp-lib
  1f9608dc70 (`pkp/pkp-lib#7811`). The empty French (Canada) entries
  first appear in OMP 3bcd14e06 and OPS eb1d961fe7 (2023-01-30, the
  locale files rearranged).
- Upstream: pkp/pkp-lib, pkp/omp and pkp/ops searched by the key name,
  "Gestion du site", "fr_CA admin", "fr_CA translation" and
  "administration french translation missing". Read: `pkp/pkp-lib#7352`
  (language names in the install list, not this). pkp/ui-library was
  not searched; the text does not live there.
- Not driven: 3.4 and 3.3 (code only); languages other than French
  (Canada) and English (code only); the diffs on 3.5.
- Unverified: whether Weblate already holds a French (Canada) text for
  this key that has not reached the branches.
- Stable branches and Weblate: `git log --grep='Translated using Weblate'`
  on `locale/` of each branch, and `git merge-base --is-ancestor` against
  `main` for the latest ones (OMP b11bbf257 and OPS 58d7ace5cf on
  `stable-3_5_0`, OMP 5d7b75b79 on `stable-3_4_0`: none on `main`).
