# On a preprint server shown in French, the keywords label and the PDF reader's tab show codes

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: OPS (code)
- **Introduced** keywords label: not traced; present since at least [271a2052c4](https://github.com/pkp/ops/commit/271a2052c41e141061defd8db68bec848064c1c7) (2020-03-03), which gave it its English text only. PDF tab: `pkp/ops#132` for `pkp/pkp-lib#6759` · [0cc844c694](https://github.com/pkp/ops/commit/0cc844c694f6aba42adbea6e554952222da8f7b6) · 2021-02-14 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U13 [OPS7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ops7), [OPS8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ops8)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A preprint page shown in French labels its keywords "##preprint.subject##
:" ("##preprint.subject## : employees, survey"), where the English page
reads "Keywords:" and a journal's French page "Mots-clés :". The PDF
reader's browser tab reads "##article.pageTitle##", where the English
tab reads "View of {title}" and a journal's French tab "Vue de {title}".

The keywords and the PDF themselves show as usual, but a French reader
sees codes where the label and the preprint's name should be, on every
preprint with keywords and every PDF. The server cannot change these
texts from its settings.

French (Canada) was walked. By the code, French (France), Spanish,
Catalan, Finnish, Norwegian Bokmål, Portuguese and Turkish show the same
two codes. The fix is a small code change in OPS that puts translations
OPS already has to use. After it, Catalan, Norwegian Bokmål, French
(France) and Portuguese still need a translation of the tab.

## Impact

- **Lost.** Nothing; a bookmark of the PDF tab does not name the
  preprint.
- **Who.** Every reader of a preprint server in one of the languages
  above.
- **Way round.** None on screen. The Custom Locale plugin in the Plugin
  Gallery (3.3 to 3.5) edits translations, but it was not tried here.

Low: a raw translation key on a label and a browser tab, with the
content and the reading itself intact; it would rise only if the code
hid content.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OPS `main`: the server
  `publicknowledge`, "Public Knowledge Preprint Server", which offers
  English and French (Canada). Its published preprint 2, "The Facets Of
  Job Satisfaction: A Nine-Nation Comparative Study Of Construct
  Equivalence", has the keywords "employees" and "survey" and a "PDF"
  galley.
- Not signed in.

Steps:

1. Open the server's home page in French,
   `/index.php/publicknowledge/fr_CA`. (The dataset's pages show no
   language menu, since the "Language" block is not in the sidebar, so a
   reader reaches French by its address.)
2. Under "Dernière(s) prépublication(s)", open "The Facets Of Job
   Satisfaction: A Nine-Nation Comparative Study Of Construct
   Equivalence". (If it is not in that list, open it from "Archives", or
   at `/index.php/publicknowledge/fr_CA/preprint/view/2`.)
3. Read the keywords line under the authors.
4. Press "PDF (anglais)" in the side column.
5. Read the browser tab's title.

**Expected.** Step 3 reads "Mots-clés : employees, survey". Step 5 reads
"Affichage de The Facets Of Job Satisfaction: A Nine-Nation Comparative
Study Of Construct Equivalence", the server's own French text for that
tab.

**Observed.**

```
Step 3: ##preprint.subject## : employees, survey
Step 5: ##article.pageTitle##
```

## Cause

Neither text has a French translation where the page looks for it.

The keywords label in
[`templates/frontend/objects/preprint_details.tpl`](https://github.com/pkp/ops/blob/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2/templates/frontend/objects/preprint_details.tpl#L210)
is `{translate key="preprint.subject"}`, a key only OPS defines. In
`locale/fr_CA/locale.po` its entry is `msgstr ""`, never translated.
pkp-lib already owns the same string, `common.keywords` "Keywords",
translated "Mots-clés" in French and in every language OPS ships. The
same template labels the abstract with pkp-lib's `common.abstract`, and
OMP's book page labels its keywords with `common.keywords`.

The PDF reader's `<title>` comes from the pdf.js viewer plugin, which
OJS and OPS share (`plugins/generic/pdfJsViewer/templates/display.tpl`).
It reads `{translate key="article.pageTitle" title=…}`. In
[0cc844c694](https://github.com/pkp/ops/commit/0cc844c694f6aba42adbea6e554952222da8f7b6)
("replace Article with Preprint"), OPS renamed this key to
`preprint.pageTitle` in its locale files, but the shared template kept
reading `article.pageTitle`, and nothing reads `preprint.pageTitle`.
Translators then filled the renamed key on Weblate: French (Canada)
"Affichage de {$title}" since
[0fffdc6b25](https://github.com/pkp/ops/commit/0fffdc6b252432d82f0a772cc70f1994ccb58b83)
(2022-02-23), and likewise Spanish, Finnish and Turkish. Those texts
never reach the reader.

The rename also removed the English text: on `stable-3_4_0` the tab
shows the code in every language, English included.
[308788e682](https://github.com/pkp/ops/commit/308788e68251b94b42bb583ee5585e825b8c13a9)
(2025-05-07) re-added `article.pageTitle` on `main`, in English only.

`Locale::translate()` (`lib/pkp/classes/i18n/Locale.php`) does not fall
back to another language: a key with no text in the visitor's language
renders as `##key##`. That is PKP's stated design (`pkp/pkp-lib#784`
points to the "Default Translation" plugin for an English fallback).

Reach, among OPS's 17 languages besides English (code):

- Keywords label: the code shows in Catalan, Spanish, Finnish, French
  (France), French (Canada), Norwegian Bokmål, Portuguese and Turkish.
  Bulgarian, Czech, German, Macedonian, Portuguese (Brazil) and
  Ukrainian have the text.
- PDF tab: the same eight languages show the code. In Spanish, Finnish,
  French (Canada) and Turkish the text sits under `preprint.pageTitle`.
  Catalan and Norwegian Bokmål have that key empty, and French (France)
  and Portuguese have neither key. The other six have the text.
- Croatian, Indonesian and Kyrgyz have no OPS `locale.po` at all, so
  every key that file holds elsewhere shows as a code there, these two
  included.
- Other callers: `preprint.subject` is read only by
  `preprint_details.tpl`, and `article.pageTitle` only by the viewer
  template. Of the 11 keys 0cc844c694 renamed, `article.pageTitle` is
  the only one still read under its old name.
- The preprint lists (on screen): "Archives" and the home page show the
  keywords with no label, so they read correctly in French.

## Proposed fix

Two changes in OPS
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-french-preprint-raw-keys/fix.diff)):

1. Label the keywords with pkp-lib's `common.keywords`:

   ```diff
   -{capture assign=translatedKeywords}{translate key="preprint.subject"}{/capture}
   +{capture assign=translatedKeywords}{translate key="common.keywords"}{/capture}
   ```

2. Undo the tab key's rename in each `locale/*/locale.po`, keeping each
   language's text:
   - In Catalan, Spanish, Finnish, French (Canada), Norwegian Bokmål and
     Turkish, `msgid "preprint.pageTitle"` becomes
     `msgid "article.pageTitle"`.
   - In English, Bulgarian, Czech, German, Macedonian, Portuguese
     (Brazil) and Ukrainian, which already have `article.pageTitle`, the
     unused `preprint.pageTitle` entry is dropped.

How this was settled:

- **Where the rule lives.** The viewer plugin is shared with OJS, so
  `article.pageTitle` is the name it relies on. The mismatch was made in
  OPS's locale files, and the fix goes there.
- **How the code base does it.** 0cc844c694 renamed keys across all
  locale files in one commit; this does the same in reverse for the one
  key the shared template still reads. For the label, OPS's own abstract
  label and OMP's keywords label already use pkp-lib keys.
- **Every instance.** Of the renamed keys, only this one is still read
  under its old name. `preprint.subject` has one reader.
- **What the rename was for.** It replaced "article" with "preprint" in
  OPS's own code and text. Key names never show to a reader, and nothing
  reads `preprint.pageTitle`, so nothing it achieved is lost.
- **What it touches.** Readers see the text each language already has.
  Where both entries exist, the one readers see today is kept;
  Portuguese (Brazil) keeps "Ver de {$title}" over the unused
  "Visualização do {$title}". Weblate drops the unused key from OPS's
  component at its next sync.
- **The guard.** The U13 spec's French-page scenario, extended to a
  preprint page and its PDF reader, would fail on any `##` code there.

Tried on `main`: with the diff applied, the walk read "Mots-clés :
employees, survey" and "Affichage de The Facets Of Job Satisfaction: …".
A neighbour check of preprints 2 and 3, the "Archives" list and the PDF
reader, in English and French, changed only the French keywords label
and the French tab.

**Alternatives**

- Make the viewer read `preprint.pageTitle` on OPS: a change to the
  plugin shared with OJS, with an app-specific key and a submodule bump
  in each app, for the same result.
- Copy the texts into `article.pageTitle` and keep `preprint.pageTitle`:
  the same result for readers, but translators keep translating a key
  nothing reads.
- Add OJS's "Vue de {$title}" by hand: it ignores the French text OPS's
  translators already chose, and fixes French alone.
- Translate `preprint.subject` instead of switching keys: it fixes the
  label in French only.
- Fall back to English in `Locale::translate()`: PKP chose a plugin for
  that (`pkp/pkp-lib#784`), and a French reader would still get English.

**What goes with it**

- Keep `preprint.subject` in the locale files: a theme that overrides
  `preprint_details.tpl` may read it.
- Translations of the tab for Catalan, Norwegian Bokmål, French (France)
  and Portuguese, through Weblate.
- Backport: `stable-3_5_0` takes the diff as written. On
  `stable-3_4_0`, English has only `preprint.pageTitle`, so the rename
  there restores the English tab too. `stable-3_3_0` predates the
  rename, and its French `article.pageTitle` is empty; it needs the
  template line and the French text "Affichage de {$title}".

Small: one template line and a key renamed back in OPS's locale files,
tried, with no data to repair.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/ops-french-preprint-raw-keys/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-french-preprint-raw-keys/walk.js)
  takes the Steps on OPS, then the English control, and the journal
  control on OJS ("The Signalling Theory Dividends", submission 1). Run
  it on an install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> ONLY=ojs,ops node bin/probe.js all shared/playwright/checks/issues/ops-french-preprint-raw-keys/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). The neighbour
  check is
  [`neighbour.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-french-preprint-raw-keys/neighbour.js)
  beside it, run with the fix out and in.
- Walked on `main` and `stable-3_5_0`, on PostgreSQL, from pkp/datasets
  38ab955 (2026-09-30). No request failed and no script error showed. A
  database plays no part (locale files and a template).
- Tips: OPS `main` c8af945bb7, its `lib/pkp` 3dc90c81a6, pdfJsViewer
  e69bf97; OJS `main` bade233f73 (the control). OPS `stable-3_5_0`
  cf4fce69bd, its `lib/pkp` a9c76aed62; OJS `stable-3_5_0` 92b9a16b48.
  OPS `stable-3_4_0` acd8ae704b, `lib/pkp` df13621c2d. OPS
  `stable-3_3_0` c5532e2161, `lib/pkp` d446601ebe.
- Code reads: on each branch, `templates/frontend/objects/preprint_details.tpl`
  (the label reads `preprint.subject` on all four), the pinned
  pdfJsViewer's `templates/display.tpl` (`article.pageTitle` on all
  four), OPS's `locale/*/locale.po`, and pkp-lib's
  `locale/fr_CA/common.po` (`common.keywords` "Mots-clés" on all four).
  3.4: `preprint.subject` empty in French; only `preprint.pageTitle`
  in every OPS locale file, English included. 3.3: `article.pageTitle`
  and `preprint.subject` both empty in French.
- Empty texts: on `main` and 3.4, `LocaleFile::loadArray()`
  (`lib/pkp/classes/i18n/translation/LocaleFile.php`) drops an empty
  `msgstr` (`includeEmpty => false`), so it counts as missing. On 3.3,
  `LocaleFile::load()` skips an empty text the same way.
- Introduced, keywords label: `git log -S'"preprint.subject"'` on
  `locale/en_US` and `locale/fr_CA`. The English text came in
  271a2052c4 (2020-03-03, "Correct missing locale key"). The French
  entry first appears, empty, when the locale files were rearranged in
  eb1d961fe7 (2023-01-30), and has stayed empty.
- Introduced, PDF tab: 0cc844c694 (committed by ajnyga, merged in
  `pkp/ops#132` by asmecher, 2021-03-13) renames
  `msgid "article.pageTitle"` to `msgid "preprint.pageTitle"`. It is on
  `stable-3_4_0` and `main`, not on `stable-3_3_0`.
- Upstream: pkp/pkp-lib and pkp/ops searched by the key names and by
  "missing translation", "fallback", "French keywords". Read:
  `pkp/pkp-lib#6188` (English tab, fixed in 3.2.1), `pkp/pkp-lib#6193`
  (shared key, closed as outdated), `pkp/pkp-lib#784` (English fallback
  through the "Default Translation" plugin).
- Not driven: 3.4 and 3.3 (code only); the languages other than French
  (Canada) (code only); OMP (no preprint page; its own French gaps on
  the book page are recorded in the U69 spec).
- Unverified: whether the Custom Locale or Default Translation plugins
  would replace these two codes; neither was installed.
