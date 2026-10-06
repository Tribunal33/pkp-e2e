# French (Canada) Site Settings: a press's "Information" tab and a press's or preprint server's "Courriels en lot" description show codes

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP (both codes), OPS (the description)
  - 3.5: OMP (both codes), OPS (the description)
  - 3.4: OMP (both codes), OPS (the description) (code)
  - 3.3: OMP (both codes), OPS (the description) (code)
- **Introduced** not traced: no change broke these texts; their French (Canada) translations were never entered. For reference, Site Settings began reading OMP's long-standing `manager.setup.information` as the tab label in [c4985f94ae](https://github.com/pkp/pkp-lib/commit/c4985f94aea6577a1e6c513ad07de2ff839367e0) (`pkp/pkp-lib#4762`, 2019-11-02), and the English description came with [afdb501490](https://github.com/pkp/omp/commit/afdb501490e25725f242b28b456001e12240bf5f) and [01c4365d93](https://github.com/pkp/ops/commit/01c4365d930bd022d690b4a86afc6041edf6203a) (`pkp/pkp-lib#6536`, 2021-01-19) · Nate Wright (NateWr)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U60 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U60-site-settings.md#a2)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A Site Administrator who reads Administration › "Paramètres du site" in
French (Canada) finds two codes where French text belongs:

- on a press, the "Information" side tab is labelled
  "##manager.setup.information##";
- on a press and on a preprint server, the "Courriels en lot" tab shows
  "##admin.settings.enableBulkEmails.description##" instead of its
  description. A journal shows that description in French: what allowing
  bulk email means, a warning about anti-spam laws, and a link to the
  hosted journals.

The "Information" tab shows only on a site hosting two or more presses;
the "Courriels en lot" tab shows on every site. By the code, other
languages lack the same texts, French (France) on a preprint server
among them.

## Impact

- **Lost.** No data or action. The administrator cannot read the tab's
  name, nor the description with its anti-spam warning, before choosing
  which presses or servers may email all their users.
- **Who.** Site Administrators of a press or a preprint server who use
  the French (Canada) interface, each time they open Site Settings.
- **Way round.** Switching the interface to English shows both texts.

Low: codes replace a tab's name and a description, the tab and the
checkboxes under the description work, and the English page shows both
texts.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main` (or OPS `main`), freshly
  loaded. The site offers English and French (Canada).
- A second press (server), because Site Settings shows the "Information"
  tab only on a site hosting two or more. Signed in as `admin`:
  Administration › "Hosted Presses" › "Create Press" (on OPS "Hosted
  Servers" › "Create Server"), Name "u60a Press", Acronym "u60a",
  contact name "u60a Press", contact email `u60a@mailinator.com`,
  Country "Canada", Path `u60a`, English as its language, "Enable this
  press publicly" ticked, "Save".

Steps:

1. Sign in as `admin`.
2. Open Administration › "Site Settings"
   (`/index.php/index/en/admin/settings`).
3. Open the user menu (the "admin" avatar at the top right) and, under
   "Change Language", press "French".
4. On "Paramètres du site", under "Réglage du site", read the side tab
   that reads "Information" in English (the third on `main`, the second
   on 3.5).
5. Press the side tab "Courriels en lot" and read the description above
   the two checkboxes.

**Expected.** At step 4 the tab reads "Information", as on a journal and
a preprint server. At step 5 the description reads in French, as a
journal's does ("Sélectionner les revues devant être autorisées à
envoyer des courriels en lot. …"), naming presses (on OPS, servers)
where the journal's text names journals.

**Observed.** Step 4, OMP `main` (on OPS the tab reads "Information"):

```
Paramètres | ##admin.security## | ##manager.setup.information## | Langues |
Menus de navigation | En vedette | Courriels en lot | Statistiques |
Plugiciel de profil ORCID
```

"##admin.security##" is the "Security" tab, which only `main` has and
which is outside this report (Cause). On 3.5 the list starts
"Paramètres | ##manager.setup.information## | Langues".

Step 5, OMP (OPS the same, with "Public Knowledge Preprint Server" and
"u60a Server"):

```
Courriels en lot
##admin.settings.enableBulkEmails.description##
[ ] Public Knowledge Press
[ ] u60a Press
[Enregistrer]
```

## Cause

`lib/pkp/templates/admin/settings.tpl` labels the side tab with
`{translate key="manager.setup.information"}`, and
`PKPSiteBulkEmailsForm` (`lib/pkp/classes/components/forms/site/PKPSiteBulkEmailsForm.php`)
gives the field the description
`__('admin.settings.enableBulkEmails.description', …)`. Both keys live
in each app's own locale files, not pkp-lib's (the description names the
app's kind of context).

In the French (Canada) files the entries are `msgstr ""`:
`admin.settings.enableBulkEmails.description` in OMP's and OPS's
`locale/fr_CA/admin.po`, and `manager.setup.information` in OMP's
`locale/fr_CA/manager.po` (OPS's reads "Information"). OJS's French
(Canada) `admin.po` has the description, which the fix adapts.

`LocaleFile::loadArray()` (`lib/pkp/classes/i18n/translation/LocaleFile.php`)
drops an empty text (`includeEmpty => false`), and `Locale::translate()`
(`lib/pkp/classes/i18n/Locale.php`) does not fall back to another
language: it calls the `Locale::translate` hook and otherwise prints the
key between `##`. An English fallback is left to a plugin on that hook,
[pkp/defaultTranslation](https://github.com/pkp/defaultTranslation),
which `pkp/pkp-lib#784` ("replace a missing translation with the english
text") added the hook for.

Reach:

- Site Settings' other tabs (on screen): every other side tab label
  reads in French on both apps, and so do the "Paramètres",
  "Information", "Langues", "Menus de navigation" and "En vedette" tabs'
  contents. The "Statistiques" descriptions and the "ORCID" tab's box
  show codes too; pkp-e2e#625 and pkp-e2e#740 cover them. On `main`
  only, the "Security" tab and its form show codes (`admin.security`,
  `admin.settings.security.*`); that tab is in no released version, so
  it is left to the translators.
- Other empty French (Canada) admin texts (code), on other screens and
  not covered here: Administration's "Gestion du site" line
  (pkp-e2e#384), the bulk-email restriction texts on a press's or
  server's settings (`admin.settings.disableBulkEmailRoles.*`, OMP and
  OPS), the context form's `admin.contexts.form.primaryLocaleNotSupported`
  (OMP and OPS) and `admin.contexts.enableContextInstructions` (OPS).
- Other languages (code, `main`), empty or missing:
  - the description: OMP Greek, Persian, Kyrgyz, Vietnamese, and Arabic,
    Central Kurdish and Scottish Gaelic (no `admin.po`); OPS Catalan,
    Spanish, French (France), Kyrgyz, Norwegian Bokmål, Portuguese,
    Turkish, and Croatian (no `admin.po`);
  - "Information": OMP Greek, Italian, Vietnamese, and Arabic, Persian,
    Scottish Gaelic and Kyrgyz (no `manager.po`); OPS Catalan, French
    (France), Norwegian Bokmål, Portuguese, and Croatian, Indonesian,
    Kyrgyz and Turkish (no `manager.po`).
- Other callers: `manager.setup.information` is read only by
  `templates/admin/settings.tpl`, and the description only by
  `PKPSiteBulkEmailsForm`.

## Proposed fix

Enter the three missing French (Canada) texts on Weblate
(translate.pkp.sfu.ca), where PKP's translations are entered; the
texts are in
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-server-french-site-settings-raw-keys/fix-omp.diff)
and
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-server-french-site-settings-raw-keys/fix-ops.diff):

```diff
 msgid "manager.setup.information"
-msgstr ""
+msgstr "Information"
```

and for the description, OJS's French (Canada) text with "revues"
replaced by the app's own noun, as its French (Canada) files already use
it ("Presses hébergées", "Serveurs hébergés"):

```diff
 msgid "admin.settings.enableBulkEmails.description"
 msgstr ""
+"Sélectionner les presses devant être autorisées à envoyer des courriels en "
+"lot. Lorsque cette fonctionnalité est activée, le ou la gestionnaire de la "
+"presse peut envoyer un courriel à tous les utilisateurs et utilisatrices de "
+"sa presse.<br><br>Une utilisation abusive de cette fonctionnalité pourrait "
…
+"configuration dans la liste des <a href=\"{$hostedContextsUrl}\">presses "
+"hébergées</a>."
```

The wording is a proposal for the translators.

Tried on `main` with the two diffs applied: the walk read "Information"
and the French description on both apps. A read of every "Réglage du
site" side tab and its form, in English and in French, with the diffs
in and out, showed that the diffs changed these three texts and nothing
else.

**Alternatives**

- Commit the diffs to OMP and OPS: the same result at once, but
  Weblate's next sync may conflict with it or empty the entries again.
- Fall back from a missing text to English in `Locale::translate()`: it
  would cover every gap of this kind, but PKP chose a plugin for that
  (`pkp/pkp-lib#784`), and it is a product decision.

**What goes with it**

- The stable branches: OMP's and OPS's `stable-3_5_0`, `stable-3_4_0`
  and `stable-3_3_0` hold the same empty entries, so the texts are
  entered for each branch the team still updates.
- Left out: the other languages and the empty French (Canada) texts on
  other screens listed under Cause, and the `main`-only "Security" tab.

Small: three texts, no code change.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/press-server-french-site-settings-raw-keys/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-server-french-site-settings-raw-keys/walk.js)
  creates the second press (journal, server) on screen and takes the
  Steps on OJS (the journal control), OMP and OPS. Run it on an install
  freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/press-server-french-site-settings-raw-keys/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). `NB=1` in front
  runs the neighbour check alone: every "Réglage du site" side tab, its
  form's text and the codes in it, in English and in French.
- Walked on `main` and `stable-3_5_0`, on PostgreSQL, from pkp/datasets
  566bb1f (2026-10-03). No request failed and no script error showed.
- Walked as written. The user menu on Site Settings names the language
  "French"; Administration's own page names it "français".
- Tips: OJS `main` ff004d0973 (`lib/pkp` 987776cd04); OMP `main`
  3b0ecf794c and OPS `main` c8af945bb7 (`lib/pkp` 3dc90c81a6). OJS
  `stable-3_5_0` c1cee76b95 (`lib/pkp` 771474347e); OMP `stable-3_5_0`
  9c5e24246c and OPS `stable-3_5_0` 38b61882d3 (`lib/pkp` cf3f984335).
  `stable-3_4_0`: OMP 0aec65441f, OPS acd8ae704b, pkp-lib 767353f4fe.
  `stable-3_3_0`: OMP 8e72fc8836, OPS c5532e2161, pkp-lib ac3fa73402.
- Code reads: on each branch, pkp-lib's `templates/admin/settings.tpl`
  and `PKPSiteBulkEmailsForm` (`.inc.php` on 3.3), and both keys in OMP's
  and OPS's `locale/en` (`en_US` on 3.3) and `locale/fr_CA`: the same on
  every branch. On 3.3, `LocaleFile::load()` also drops an empty text
  and `PKPLocale::translate()` adds the `##`; on 3.4, `LocaleFile` and
  `Locale::translate()` as on `main`. The other languages: every
  `locale/*/admin.po` and `manager.po` of OMP and OPS on `main`.
- Introduced: `git log -S` on each key in OMP's and OPS's English and
  French (Canada) locale files and in pkp-lib's
  `templates/admin/settings.tpl`. OMP's English `manager.setup.information`
  dates from 2008 (16111b123); c4985f94ae, which changed no locale file,
  first used it on Site Settings. The empty French (Canada) entries on
  `main` date from the locale files' rearrangement (OMP 3bcd14e06, OPS
  eb1d961fe7, 2023-01-30) and were empty on `stable-3_3_0` already.
- Weblate, read 2026-10-04 through its public API
  (`/api/translations/<omp|ops>/<admin|manager>/fr_CA/units/?q=key:=…`):
  OMP's and OPS's French (Canada) units for
  `admin.settings.enableBulkEmails.description`, and OMP's for
  `manager.setup.information`, are empty and not translated; OPS's
  `manager.setup.information` reads "Information". Nothing waits there to
  reach the branches.
- Upstream: pkp/pkp-lib, pkp/omp and pkp/ops searched by both key
  names, "Courriels en lot", "fr_CA translation missing", "site settings
  french untranslated" and "bulk emails description translation". Read:
  `pkp/pkp-lib#8781` (an untranslated text hiding a link on the email
  templates page, not this).
- Not driven: 3.4 and 3.3 (code only); languages other than French
  (Canada) and English (code only); the diffs on 3.5.
