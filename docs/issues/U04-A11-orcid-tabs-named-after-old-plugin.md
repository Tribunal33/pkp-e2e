# In 32 interface languages, both ORCID settings tabs carry the name of the retired ORCID Profile plugin

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; no built-in ORCID, the ORCID Profile plugin instead)
  - 3.3: none (code; no built-in ORCID, the ORCID Profile plugin instead)
- **Introduced** `pkp/pkp-lib#9818` for `pkp/pkp-lib#9771` · [c79f538c51](https://github.com/pkp/pkp-lib/commit/c79f538c51e8300366732f993edcd84fa18a18ff) · 2024-06-21 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U04 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U04-orcid-integration.md#a11), its tab names
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

A site administrator or manager working in French (Canada), German,
Spanish, Italian, Portuguese (Portugal and Brazil), Russian or one of 25
other languages finds the two ORCID settings tabs named after the ORCID
Profile plugin, as if the settings belonged to a plugin, though the
built-in ORCID feature replaced it in 3.5. The tabs are the site's,
under Administration › Site Settings, and each journal's, press's or
preprint server's, under Settings › Users & Roles. French (Canada) reads
"Plugiciel de profil ORCID", German "ORCID-Plugin", Spanish "Módulo de
perfil ORCID"; English and French (France) read "ORCID". Evidence lists
every language.

The English text changed to "ORCID" when the feature was built in, but
the translations were not marked for review. The fix is a developer's,
not the translators': setting "ORCID" in each affected language's file
in pkp-lib, one pull request on each of `stable-3_5_0` and `main`.

## Impact

- **Lost.** Nothing: a tab label names a plugin where English names the
  feature.
- **Who.** Site administrators and managers using one of the 32
  languages, mostly once, when they set ORCID up; the label stays on the
  tab after that.
- **Way round.** None needed; the tabs work under the wrong name.

Low, as a misleading label; it would be medium if managers went looking
for an ORCID plugin to install or configure because of it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS, OMP or OPS `main` (or
  `stable-3_5_0`): the journal, press or server `publicknowledge` and the
  site, both offering English and French (Canada). ORCID may be on or
  off; the tabs show either way.

1. Sign in as `admin`. Open Administration › "Hosted Journals" ("Hosted
   Presses", "Hosted Servers") › "Create Journal" ("Create Press",
   "Create Server"), fill in a name, initials, contact name and email,
   country and a path, tick English, and press "Save". The site's ORCID
   tab shows only on a site with more than one journal, press or server.
2. Open the menu under the initials at the top right and, under "Change
   Language", choose "français".
3. Open Administration › "Paramètres du site"
   (`/index.php/index/fr_CA/admin/settings`) and its "Réglage du site"
   tab. Read the last side tab's name.
4. Sign in as `rvaca` (the manager). Open Settings › Users & Roles and
   read the tab names. Under "Change Language", choose "français".
5. Open "Paramètres" › "Utilisateurs-trices et rôles"
   (`/index.php/publicknowledge/fr_CA/management/settings/access`) and
   read the tab names.

**Expected.** Both tabs named "ORCID", as in English (step 4) and in
French (France).

**Observed.** Step 3: the side tabs "Paramètres", "Information",
"Langues" … "Statistiques", "Plugiciel de profil ORCID". Step 4
(English): "Users", "Roles", "Site Access Options", "ORCID". Step 5:
"Utilisateurs-trices", "Rôles", "Options d'accès au site", "Plugiciel de
profil ORCID". The ORCID tab's own form is in French ("Activer la
fonctionnalité ORCID", "API ORCID"). No request failed and no script
error showed.

## Cause

Both tabs take their name from `orcid.displayName`
(`templates/admin/settings.tpl`, `templates/management/access.tpl` in
pkp-lib; the key is read nowhere else). c79f538c51 (PR
`pkp/pkp-lib#9818`) moved the ORCID Profile plugin into pkp-lib, renamed
the plugin's `plugins.generic.orcidProfile.displayName` to
`orcid.displayName`, and changed its English text from "ORCID Profile
Plugin" to "ORCID". It carried the other languages' translations of the
old name into the new key without a `#, fuzzy` mark, so Weblate shows
them as done and no translator was asked to review them.

That holds for 31 of the 32 languages, whose text is unchanged since
c79f538c51 (Norwegian Bokmål's and Portuguese's files were only renamed
since, from `nb` and `pt_PT`). French
(Canada) is one of them. Aragonese ("Modulo de perfil ORCID") was
written on Weblate in 2025 (merge de10e93689), after English already
read "ORCID", so translators can re-enter the plugin's name. French
(France) received "Module de profile ORCID" by c79f538c51 too; its
translators changed it to "ORCID" on Weblate (64d438ac4c, merged into
`stable-3_5_0` by 6acb1be2eb and copied to `main` by 63945bbd82,
2026-09-18).

Reach (code, `main` and 3.5, the same values on both):

- pkp-lib has a `user.po` for 58 languages other than English. 39 of
  them translate `orcid.displayName`. Six read "ORCID" (French (France),
  Hebrew, Kyrgyz, Lithuanian, Marathi, Serbian (Latin)). Basque reads
  "ORCID profila" ("ORCID profile"), written on Weblate in 2025 (merge
  26d6b95433) and naming no plugin, so it is left to its translators.
  The other 32 name the plugin (Evidence lists them).
- 19 of the 58 have no text for the key, and 12 more of pkp-lib's
  language folders have no `user.po` at all (Korean, Slovak and Scottish
  Gaelic among them). In all 31, both tabs show
  "##orcid.displayName##": untranslated text, for their translators, not
  this fault.

## Proposed fix

Set `orcid.displayName` to "ORCID" in the 32 languages, in two pkp-lib
pull requests, one on `stable-3_5_0` and one on `main`. The two branches
split at c5a638eaec and each fix lands on both separately (as
`pkp/pkp-lib#12154` did, 62113dbd14 on 3.5 and 7533050f06 on `main`);
Weblate's merges reach `main` only as copies of its own edits. The diff
applies to both as it stands:
[fix-tab-name.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/orcid-french-raw-keys-old-plugin-name/fix-tab-name.diff),
32 one-line changes such as:

```diff
 msgid "orcid.displayName"
-msgstr "Plugiciel de profil ORCID"
+msgstr "ORCID"
```

"ORCID" is a proper name that English, French (France) and five other
languages already use as it stands, so it needs no translation.
Weblate, which works on `stable-3_5_0` only, keeps developers' edits to
its languages' files: 62113dbd14's `#, fuzzy` marks survived the later
Weblate merges, and f1ec3bbe5f rewrote texts in 17 languages. The one
caveat is that translators could enter the old name again, as
Aragonese's did in 2025.

Tried on `main`: with the diff applied, both tabs read "ORCID" in French
(Canada) on all three applications, and the English tabs were unchanged.
The other languages were checked in the patched files only, since the
dataset offers no other language. The trial ran before Basque's line
was taken out of the diff; no walked screen reads it.

**Alternatives**

- Mark the 32 entries `#, fuzzy`, as 62113dbd14 did for keys whose
  English changed: the code base's own pattern for a changed text, and
  it leaves the wording to translators. A fuzzy entry still displays, so
  the plugin's name stays on screen until each language's translators
  act; 62113dbd14's own fuzzy German entries are unreviewed six months
  on. The better choice if the maintainers want translators to own every
  text.
- Correct each language on Weblate: what French (France) did, but it
  waits on 32 translator teams, and reaches `main` only through
  Weblate's copies.

**What goes with it**

- Land each pull request right after a Weblate merge, so no translator's
  unmerged edit to the same entry conflicts with it.
- 3.4 and 3.3 have no built-in ORCID.
- The guard: an e2e check that both ORCID tabs read "ORCID" in French
  (Canada).

Small: one line in each of 32 locale files, as two pull requests, no
code, tried.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/orcid-french-raw-keys-old-plugin-name/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/orcid-french-raw-keys-old-plugin-name/walk.js)
  with its
  [`lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/orcid-french-raw-keys-old-plugin-name/lib.js).
  On an install freshly loaded from the default dataset,
  `MODE=tabs PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/orcid-french-raw-keys-old-plugin-name/walk.js`
  takes these Steps (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5);
  `MODE=nb` instead is the English control.
- Walked on `main` and `stable-3_5_0`, on PostgreSQL, from pkp/datasets
  c312c01 (2026-10-03), inside the script's full walk for the report "In
  French (Canada), the site's ORCID switch and the contributor's ORCID
  iD field show untranslated text keys", which also turns ORCID on
  before step 5; the tabs carry the same name with ORCID off, as the
  trial's `MODE=tabs` walk (ORCID off) showed with the diff in. The same
  names on both lines.
- The 32 languages: Aragonese, Arabic, Azerbaijani, Bulgarian, Catalan,
  Central Kurdish, Czech, Danish, German, Greek, Spanish, Finnish,
  French (Canada), Hungarian, Armenian, Indonesian, Italian, Japanese,
  Georgian, Macedonian, Malay, Norwegian Bokmål, Dutch, Polish,
  Portuguese, Portuguese (Brazil), Russian, Slovenian, Swedish, Turkish,
  Ukrainian and Vietnamese.
- Tips: `main`: OJS ff004d0973 (`lib/pkp` 987776cd04), OMP 3b0ecf794 and
  OPS c8af945bb7 (`lib/pkp` 3dc90c81a6). `stable-3_5_0`: OJS c1cee76b95
  (`lib/pkp` 771474347e), OMP 9c5e24246 and OPS 38b61882d3 (`lib/pkp`
  cf3f984335). `stable-3_4_0`: `lib/pkp` 767353f4fe; `stable-3_3_0`:
  `lib/pkp` ac3fa73402. The 32 files are identical across the `main`
  pkp-lib commits.
- Code reads: `orcid.displayName` in every `locale/*/user.po` of pkp-lib
  on `main` and 3.5, and the language folders without one; its readers
  (`git grep`); `git show c79f538c51` on `locale/en`, `locale/fr_CA` and
  `locale/fr_FR/user.po`; each language's value at c79f538c51 against
  today's, and `git log -S` of the key (Aragonese and Basque not in
  c79f538c51);
  `git merge-base` of `main` and `stable-3_5_0`; the 3.4 ORCID Profile
  plugin's `locale/en/locale.po` ("ORCID Profile Plugin"). 3.4 and 3.3:
  no `classes/orcid` and no ORCID tab in pkp-lib's `origin/stable-3_4_0`
  and `origin/stable-3_3_0`; OJS and OPS ship the ORCID Profile plugin
  there, whose French (Canada) name "Plugiciel de profil ORCID" is right
  for a plugin.
- Upstream: pkp/pkp-lib, pkp/ui-library, pkp/ojs, pkp/omp and pkp/ops,
  none found (2026-10-03).
- Not driven: languages other than French (Canada) and English (code
  only); 3.4 and 3.3 (code only).
