# On a preprint server shown in French, the "Post" button, the status and the "Date Posted" label show codes

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: OPS (code)
- **Introduced** `pkp/pkp-lib#6438` for `pkp/pkp-lib#5610` · [79dfc15996](https://github.com/pkp/pkp-lib/commit/79dfc15996960f4d959afb843383f3ac736f6974) · 2020-12-06 · Antti-Jussi Nygård (ajnyga)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U49 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U49-publish-schedule-and-versions.md#a10) (the "Date Posted" label), spec U24 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U24-workflow-screen-and-stage-access.md#a11) (a preprint server's codes: the "Preprint" heading, the status line, the "Post" and "Unpost" buttons and the "Production Tasks & Discussions" entry)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On a preprint server shown in French (Canada), a manager who opens a
preprint's "Preprint Entry" page ("Entrée de la prépublication") reads
"##publication.datePublished##" where the English page labels the field
"Date Posted". The page's heading reads "##submission.publication## :
Entrée de la prépublication", its status line "Statut :
##publication.status.unscheduled##", and the "Post" button
"##publication.publish##". OPS 3.2 showed these in French.

The field and the button still work, and the codes' own words
("datePublished", "publish") hint at what they are, but a
French-speaking moderator or manager reads codes in place of the
heading, the status and the "Post" button on every page of a
preprint's publication. The fix
is a translation, which PKP's translators can enter on Weblate with no
code change.

By the code, the same texts show as codes in Catalan, Finnish, French
(France), Norwegian Bokmål, Portuguese, Croatian, Indonesian, Kyrgyz
and Turkish, and some of them in Spanish.

## Impact

- **Lost.** Nothing stored.
- **Who.** Moderators and managers of a preprint server used in French or
  one of the languages above, on every page listed under a preprint in the
  workflow's side menu ("Title & Abstract" to "Preprint Entry"), where
  the heading, the status line and the "Post" or "Unpost" button show;
  the preprint's authors see the status line and, in their side menu,
  "Production Tasks & Discussions" as codes too (code).
- **Way round.** Switch the interface to English. The Custom Locale
  plugin from the Plugin Gallery does not offer these texts (code).

Low: raw translation keys on labels, headings and buttons, with the
posting itself intact; it would rise only if a code hid what a control
does with no way to find out.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OPS `main`: the server
  `publicknowledge`, "Public Knowledge Preprint Server", which offers
  English and French (Canada). Its submission 1, "The influence of
  lactation on the quantity and quality of cashmere production", is in
  Production and not posted.

Steps:

1. Sign in as `dbarnes` (a Preprint Server manager).
2. Open the menu under the initials at the top right and, under
   "Change Language", choose "français".
3. Open submission 1 at
   `/index.php/publicknowledge/fr_CA/dashboard/editorial?workflowSubmissionId=1`.
4. In the workflow's side menu, press "Entrée de la prépublication".
   It is listed under the preprint's group, which itself reads
   "##submission.publication##"; on `main` it sits under that group's
   version entry, which reads
   "##publication.versionStage.unassignedVersion##" (in English
   "Unassigned version" and a date).
5. Read the page's heading, the "Statut" line, the button beside
   "Aperçu", and the label above "La date de publication sera définie
   automatiquement lors de la publication de la prépublication. …".

**Expected.** French texts, as the field's own description and the rest
of the page read: for example "Prépublication : Entrée de la
prépublication", "Statut : Non publié-e", "Publier" and "Date de
publication".

**Observed.**

```
Heading:  ##submission.publication## : Entrée de la prépublication
Status:   Statut : ##publication.status.unscheduled##
Button:   ##publication.publish##
Label:    ##publication.datePublished##
```

The same page in English reads "Preprint: Preprint entry", "Status:
Unposted", "Post" and "Date Posted". On `main` the French page also
shows codes for texts that are new since 3.5 and not yet translated
(its "Placement", "Version and Updates", "Display" and "Access" groups
among them); those are not part of this report.

## Cause

`pkp/pkp-lib#5610` ("OPS: Minimal Wording Changes for Emphasis on
Preprints") reworded 28 texts that OPS shared with OJS and OMP, so that
OPS says "post" and "preprint" where the others say "publish" and
"publication". OPS took its own English copies of the 28 keys in
[f0c4ea2b60](https://github.com/pkp/ops/commit/f0c4ea2b60eb1be87a8bbc4ba14d647a58554c3e)
(2020-11-20). Then
[79dfc15996](https://github.com/pkp/pkp-lib/commit/79dfc15996960f4d959afb843383f3ac736f6974)
(`pkp/pkp-lib#6438`) removed the keys from every pkp-lib
`locale/*/submission.po`, French included (`publication.datePublished`
"Date de publication", `publication.publish` "Publier"). OJS and OMP
hold the keys with their translations. OPS got English only.

Until then OPS read pkp-lib's French: OPS 3.2.1 (to 3.2.1-4) shows
"Date de publication", "Publier" and "Non planifié-e", and OPS shows
codes from 3.3.0-1 on. That is why this is a regression. OPS's French
file had no entry for the keys until the locale files were rearranged
in eb1d961fe7 (2023-01-30), which added them empty, and they have
stayed empty.

An empty text counts as missing: `LocaleFile::loadArray()`
(`lib/pkp/classes/i18n/translation/LocaleFile.php`) drops it
(`includeEmpty => false`). pkp-lib no longer has the key, and
`Locale::translate()` does not fall back to English (PKP's design,
`pkp/pkp-lib#784`), so each one renders as `##key##`.

Reach (code, unless marked on screen):

- The four texts of the Steps (on screen). The label is read by OPS's
  `IssueEntryForm`. The heading comes from `getPublicationTitle()` in
  `lib/ui-library/src/pages/workflow/composables/useWorkflowNavigationConfig/useWorkflowNavigationConfigOPS.js`,
  the status line from `WorkflowPublicationVersionControl.vue`, and the
  "Post" button from `getPrimaryControlsRight()` in
  `workflowConfigEditorialOPS.js`. The first two show on every page of
  a preprint's publication, the author's view included.
- Of the 28 keys, `main`'s English has 27; it dropped
  `publication.required.reviewStage` as unused in 817bbb918e. Of the
  27, 26 have a caller (`publication.version.details` has none), among
  them "Unpost" and "Posted" (`publication.unpublish`,
  `publication.status.published`), the author's "Production Tasks &
  Discussions" (`submission.queries.production`), the "Post" window's
  requirements line (`PublishForm`), the "Unpost" confirmation
  (`useWorkflowActions`), the license and copyright descriptions on
  "Permissions & Disclosure" (`PKPPublicationLicenseForm`), and the
  activity log's posting entries (`publication.event.*`, logged by key
  in `publication\Repository` and translated by
  `EventLogEntry::getTranslatedMessage()` when the log is shown). On
  3.5 all 28 have English and `publication.required.reviewStage` is the
  publishing refusal before Production (`publication\Repository`).
- The "Date Posted" column of the preprints statistics report
  (`PKPStatsPublicationController::_getSubmissionReportColumnNames()`)
  when downloaded in French.
- OPS's other languages, of the 28 texts: Bulgarian, Czech, German,
  Macedonian, Portuguese (Brazil) and Ukrainian have all; Spanish 19;
  Catalan, Finnish, French (France), Norwegian Bokmål and Portuguese
  none; Croatian, Indonesian, Kyrgyz and Turkish have no OPS
  `submission.po`.
- The Custom Locale plugin (release 1.4.0.0, the Plugin Gallery's for
  OPS 3.5) lists a language's texts from the loaded translations
  (`LocaleFileForm::fetch()`), which leave out empty entries, so these
  28 are not offered for editing.

## Proposed fix

Give the 27 entries of OPS's `locale/fr_CA/submission.po` on `main`
that have an English text their French texts
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-french-date-posted-raw-key/fix.diff)),
for example:

```diff
 msgid "publication.datePublished"
-msgstr ""
+msgstr "Date de publication"
...
 msgid "publication.publish"
-msgstr ""
+msgstr "Publier"
...
 msgid "publication.status.unscheduled"
-msgstr ""
+msgstr "Non publié-e"
```

The texts are pkp-lib's French from before the move wherever the
English only swapped "publish" for "post". OPS's French already says
"publier" for posting: the field's description reads "La date de
publication sera définie automatiquement lors de la publication de la
prépublication". Where the English changed its meaning, the text
follows it ("Prépublication" for "Preprint", "Tâches et discussions de
production" for "Production Tasks & Discussions"). The diff also drops
the `#, fuzzy` flag on `submission.queries.production`, since its text
is new; Weblate would otherwise list it as needing editing. The texts
are a proposal for PKP's French translators, who may prefer "diffuser",
which OPS's French uses in a few places ("Diffusé-e"). Entering them on
Weblate has the same effect as the diff.

The 28th French entry on `main`, `publication.required.reviewStage`, is
left empty. Its English was removed as unused in 817bbb918e and nothing
on `main` reads it, so it shows nowhere; deleting it belongs with that
removal, not with this fault.

How this was settled:

- **Where the rule lives.** OPS owns these keys since the move, so
  their translations live in OPS's locale files, as OJS's and OMP's do.
- **Every instance.** Every moved key with an English text on `main`
  is filled for French (Canada). The other languages are left out,
  named under "What goes with it".
- **What it touches.** French readers of OPS's back office and of its
  statistics report; no code, no API, no stored data. A change to the
  file on GitHub reaches the translators' component at Weblate's next
  sync.
- **The guard.** An end-to-end check that opens a preprint's
  publication pages in French and fails on any `##` code.

Tried on `main`: with the diff applied, the walk read "Prépublication :
Entrée de la prépublication", "Statut : Non publié-e", "Publier" and
"Date de publication". The English page and the French field
description read the same with the fix in and out.

**Alternatives**

- Keep the keys in pkp-lib with OPS overriding only the English: the
  same result for French, but it reverses a move OJS and OMP rely on.
- Fall back to English in `Locale::translate()`: PKP chose a plugin for
  that (`pkp/pkp-lib#784`), and a French moderator would still read
  English.

**What goes with it**

- The other languages above, through Weblate. pkp-lib's own texts from
  before the move exist for Catalan, Finnish, French (France),
  Indonesian, Norwegian Bokmål, Portuguese and Spanish and could be
  carried the same way.
- Backport: `stable-3_5_0` needs all 28 filled, `publication.required.reviewStage`
  included ("La soumission doit être à l'étape de production avant de
  pouvoir être publiée."), written against its own file (the diff's
  context differs). 3.4 and 3.3 have the same gap.

Small: texts in one locale file, tried.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/ops-french-date-posted-raw-key/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-french-date-posted-raw-key/walk.js)
  takes the Steps on OPS, then the same page in English. `MODE=nb`
  reads the English page and the French field description, the texts
  the fix must leave alone. It changes nothing in the dataset. Run it
  on an install loaded from the default dataset:
  `node bin/probe.js ops shared/playwright/checks/issues/ops-french-date-posted-raw-key/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Walked on `main` and `stable-3_5_0`, on PostgreSQL, from pkp/datasets
  e8dafbc (2026-10-02). No request failed and no script error showed.
- 3.5 walk: the four codes of Observed; the side menu's group heading
  reads `##submission.publication##` too.
- Tips: OPS `main` c8af945bb7 (`lib/pkp` 3dc90c81a6, `lib/ui-library`
  280f98c570); OPS `stable-3_5_0` 38b61882d3 (`lib/pkp` cf3f984335);
  OPS `stable-3_4_0` acd8ae704b (`lib/pkp` 32b0f4b4af); OPS
  `stable-3_3_0` c5532e2161 (`lib/pkp` f6ab331645).
- Code reads: on each branch, OPS's `locale/en*/` and `locale/fr_CA/`
  files and pkp-lib's `locale/fr_CA/submission.po` and `common.po` for
  the 28 keys. OPS's English has 28 on 3.5, 3.4 and 3.3 and 27 on
  `main`. OPS's French file has all 28 entries on each branch, every
  one empty, and pkp-lib's French has none of the keys.
  `IssueEntryForm` reads `publication.datePublished` on all four
  (`.inc.php` on 3.3), and on 3.3 `LocaleFile::load()` skips an empty
  text the same way. The callers under Cause were read on `main`, and
  the 17 other languages on 3.5 and `main`.
- History: OPS tag 3_2_1-4 has no OPS English entry for these keys and
  pins a pkp-lib whose French has them ("Date de publication",
  "Publier", "Non planifié-e"); the first OPS tag whose pkp-lib lacks
  them is 3_3_0-1 (2020-12-07). In pkp-lib, `git log -S` of the key
  gives the French text in 3ac06f904b (2020-01-31) and its removal in
  79dfc15996 (PR `pkp/pkp-lib#6438`, merged 2020-12-07). In OPS,
  `git log -S` gives the English in f0c4ea2b60 (committed to `main`
  without a PR) and the empty French entry in eb1d961fe7.
- Custom Locale: read in release 1.4.0.0's package
  (`controllers/grid/form/LocaleFileForm.php`,
  `CustomLocalePlugin::getTranslator()`), not installed.
- Upstream: pkp/pkp-lib and pkp/ops searched by the key, "Date
  Posted", "French translation", "fr_CA", "OPS missing translations"
  and `pkp/pkp-lib#5610`. Read: `pkp/pkp-lib#5610` (the wording change;
  nothing on translations).
- Not driven: 3.4 and 3.3; the languages other than French (Canada);
  the texts of Reach other than the four on screen; the author's view;
  the statistics report.
- Unverified: whether PKP's French translators prefer "diffuser" to
  "publier" for OPS.
