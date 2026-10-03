# On a preprint server's French (Canada) pages, screen readers hear the "Developed By" heading as a text key

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: OPS (code)
- **Introduced** not traced; present since at least [1eced2b852](https://github.com/pkp/ops/commit/1eced2b85295af427ba27a66238d35a2b04c34ff) (2020-03-23), which added the heading with an English text and no French (Canada) one (`pkp/pkp-lib#5176`)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U08 [OPS3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U08-navigation-menus-and-site-chrome.md#ops3)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

A visitor who uses a screen reader on a preprint server's pages in
French (Canada) hears the "Developed By" block's heading as
"##plugins.block.developedBy.blockTitle##" instead of "Développé par".
The heading is hidden on screen, so sighted visitors see nothing wrong.
A journal's and a press's French pages read "Développé par".

Nothing is lost: the block's link, "Open Preprint Systems", reads and
works as in English.

The block is off until a manager turns it on and places it in the
sidebar; on a server that does, every public page in French (Canada)
reads the key. The same heading also has no text in 10 more of a
preprint server's languages, and in 3 each on a journal and a press;
those are outside this report's fix.

## Impact

- **Lost.** No data and no task. Screen-reader users lose the block's
  name, so the link reads without saying what it is.
- **Who.** Screen-reader users who move through a page by its headings,
  on servers whose managers have placed the block.
- **Way round.** The visitor can read the pages in English. The manager
  can take the block out of the sidebar.

Low: a label shows as an untranslated key in one language, and every
page works.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OPS `main`: the server
  `publicknowledge`, "Public Knowledge Preprint Server", which offers
  English and French (Canada). The "Developed By" Block plugin is off and
  the sidebar holds no block. Nothing else is created.

Steps:

1. Sign in as `dbarnes` (a Preprint Server manager).
2. Open Settings › Website › "Plugins" and tick "\"Developed By\" Block"
   under "Block Plugins".
3. Open Settings › Website › "Appearance" › "Setup", tick "\"Developed
   By\" Block" under "Sidebar" and press "Save".
4. Open the server's home page in French,
   `/index.php/publicknowledge/fr_CA`.
5. In the sidebar, find the block holding the link "Open Preprint
   Systems" and read its heading as a screen reader announces it. The
   heading is hidden on screen; the browser's accessibility tree or the
   page source shows it.

**Expected.** The heading reads "Développé par".

**Observed.** The sidebar's accessibility tree reads:

```
- heading "##plugins.block.developedBy.blockTitle##" [level=2]
- link "Open Preprint Systems":
  - /url: https://pkp.sfu.ca/ops/
```

The markup is `<h2 class="pkp_screen_reader">##plugins.block.developedBy.blockTitle##</h2>`.

The same steps on the OJS and OMP datasets read `heading "Développé par"`
over "Open Journal Systems" and "Open Monograph Press".

## Cause

OPS's French (Canada) file for the plugin,
`plugins/blocks/developedBy/locale/fr_CA/locale.po`, holds no text for
`plugins.block.developedBy.blockTitle`: the entry is `msgstr ""`. The
key is the plugin's own, defined in its `locale/en/locale.po`, so no
other French file stands in for it.

`LocaleFile::loadArray()` (`lib/pkp/classes/i18n/translation/LocaleFile.php`,
line 66, `'includeEmpty' => false`) drops the empty text.
`Locale::translate()` (`lib/pkp/classes/i18n/Locale.php`, from line 504)
then finds none and calls the `Locale::translate` hook (line 512). With
no plugin answering, it returns `##key##` (line 525). Core has no
fallback to another language; a plugin can supply English through that
hook, as the "Default Translation" plugin that `pkp/pkp-lib#784` points
to does.

The heading came with the accessibility work of `pkp/pkp-lib#5176` (OJS
PR `pkp/ojs#2677`), which added the `<h2>` with an English text. OPS
took it by merge
[1eced2b852](https://github.com/pkp/ops/commit/1eced2b85295af427ba27a66238d35a2b04c34ff)
on 2020-03-23. OJS's and OMP's French (Canada) files received
"Développé par" from Weblate in June 2020
([7a7e0661e1](https://github.com/pkp/ojs/commit/7a7e0661e11e5ced99627b864fdbcb41316760c4),
[2ec0c6777](https://github.com/pkp/omp/commit/2ec0c67779a7d09f60d4d0d1d5f55454ee8b98c9)).
OPS's file, created when the plugin came to OPS
([398f5ec4be](https://github.com/pkp/ops/commit/398f5ec4be8753ce23814b71d903067dabea5b3e),
2020-03-03), never did. Its empty entry appeared when the locale files
were rearranged on 2023-01-30
([eb1d961fe7](https://github.com/pkp/ops/commit/eb1d961fe79bbdf2feb2a8035934b1ecb1c6f8e7)),
and the file has not changed since.

Reach:

- The text has one reader, the heading in
  `plugins/blocks/developedBy/templates/block.tpl` (line 12). The file's
  other two texts, the plugin's name and description on the "Plugins"
  tab, are translated.
- OPS's other French (Canada) block plugin files (`browse`,
  `languageToggle`) hold every text.
- Other languages (read in the locale files on `main`; a language counts
  when the entry is empty or absent). OPS ships the plugin in 28
  languages. Besides French (Canada), 10 lack the text: ca, fa, hr, hu,
  id, nb_NO, pl, ru, sl and sv. OJS lacks it in dsb, hsb and zh_Hans,
  and OMP in el, fa and vi. French (France), `fr`, has "Développé par"
  in all three apps.
- Not this fault: OPS's default theme French (Canada) file has seven
  empty texts of its own (read in the code, not walked).

## Proposed fix

A proposal. No program code is at fault, so the fix is one French
(Canada) text, "Développé par", the text OJS's and OMP's French (Canada)
files already hold.

Recommended: a French (Canada) translator, or a developer with a
Weblate account, enters it on PKP's Weblate (translate.pkp.sfu.ca). The
file is the `blocks-developedby` component of Weblate's `ops` project.
Weblate's texts for that project reach OPS in two moves:

- A developer merges Weblate's `translations/stable-3_5_0` branch into
  OPS's `stable-3_5_0`, most recently on 2026-09-23. That merge still
  holds the entry empty.
- Each such merge is copied onto `main` as one commit with the same
  title and date (the 2026-09-23 one as
  [8d7eef85b7](https://github.com/pkp/ops/commit/8d7eef85b76cbc94328e7e0ccfce9604095ac1f4)),
  so the text reaches `main` with the next copy.

Whether Weblate already holds a text entered after 2026-09-23 could not
be read here, because translate.pkp.sfu.ca answers scripts with a bot
check. Whoever enters it looks there first. The tried diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-french-developed-by-heading-raw-key/fix.diff):

```diff
 msgid "plugins.block.developedBy.blockTitle"
-msgstr ""
+msgstr "Développé par"
```

Tried on `main`, with the diff applied: the walk read `heading
"Développé par"` over "Open Preprint Systems". The English page read
`heading "Developed By"` with the diff in and out.

**Alternatives**

- A developer commits the diff to `main` (and `stable-3_5_0`): the text
  shows at once instead of with the next merge and copy, but a commit
  beside Weblate may conflict with Weblate's next merge into that
  branch.
- Fall back from a missing text to English in core
  `Locale::translate()`: it would cover every gap of this kind, but PKP
  left that to plugins through the hook (`pkp/pkp-lib#784`), and it is a
  product decision.

**What goes with it**

- Older versions: `stable-3_4_0` and `stable-3_3_0` hold the same empty
  entry. OPS's last Weblate merge into `stable-3_4_0` is from
  2024-02-22, and the Weblate repository's `stable-3_4_0` branch holds
  the entry empty, so a 3.4 backport needs a developer's commit.
- Left out: the other languages named under Cause, which their
  translators may complete in the same component.
- The guard: the U08 spec's French reading of the "Developed By" block
  on a preprint server, asserting the heading "Développé par" (a
  Planned item).

Small: one text in one locale file, entered once on Weblate, with no
change to program code.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/ops-french-developed-by-heading-raw-key/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-french-developed-by-heading-raw-key/walk.js)
  takes the Steps on OJS and OMP (the controls) and OPS, and records the
  block's accessibility tree, its heading's markup and every `##` key in
  the sidebar. Run it on an install freshly loaded from the default
  dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/ops-french-developed-by-heading-raw-key/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). `NB=1` in front
  takes step 4 in English instead, the check that the diff changes
  nothing else.
- Walked on `main` and `stable-3_5_0`, on PostgreSQL, from pkp/datasets
  e8dafbc (2026-10-02). The two lines read the same: the key on OPS,
  "Développé par" on OJS and OMP. No request failed and no script error
  showed. The database plays no part (locale files); MySQL not checked.
- Differences from the Steps: the script opens Settings › Website by its
  address, and reads the heading from the page's accessibility tree
  rather than with a screen reader.
- Fix trial: `node bin/try-fix.js apply …/fix.diff ops`, the kept script
  on OPS in French, then with `NB=1` with the diff in and out, then
  `revert`.
- Tips: `main`: OJS b84f8e2e44 (`lib/pkp` ddd8ab243a, `lib/ui-library`
  64d67363), OMP 3b0ecf794c and OPS c8af945bb7 (`lib/pkp` 3dc90c81a6,
  `lib/ui-library` 280f98c5). `stable-3_5_0`: OJS 091fb65453, OMP
  9c5e24246c, OPS 38b61882d3 (`lib/pkp` cf3f984335, `lib/ui-library`
  d4e01883). `stable-3_4_0`: OJS c1827e3527, OMP 0aec65441f, OPS
  acd8ae704b, pkp-lib 9e41f10273. `stable-3_3_0`: OJS ac77c9fb35, OMP
  8e72fc8836, OPS c5532e2161, pkp-lib ac3fa73402.
- Code reads: `plugins.block.developedBy.blockTitle` in each app's
  `plugins/blocks/developedBy/locale/fr_CA/locale.po` and
  `templates/block.tpl` on `main`, 3.5, 3.4 and 3.3 (OJS and OMP hold
  "Développé par", OPS an empty text, on every line); the plugin's
  `settings.xml` (`enabled` false) and the context schema's `sidebar`
  (no default); `LocaleFile::loadArray()` and `Locale::translate()` on
  `main` and 3.4, and `LocaleFile::load()` and `PKPLocale::translate()`
  on 3.3 (each drops an empty text and prints `##key##` when no hook
  answers); the key's readers in OPS's `plugins`, `templates`, `classes`
  and `lib/pkp`; every `plugins/blocks/developedBy/locale/*/locale.po` of
  the three apps on `main` for the language counts; `msgfmt
  --statistics` on every OPS `plugins/*/*/locale/fr_CA/locale.po`.
- How Weblate reaches OPS: the "Merge remote-tracking branch
  'translations/stable-3_5_0' into stable-3_5_0" merges on
  `stable-3_5_0`'s first-parent line since 2025-03-14, each matched by a
  single-parent commit of the same title and date on `main`, but for the
  2025-03-26 merge, whose one Arabic text reached `main` as its own
  commit (the
  2026-09-23 merge
  [934933ae0f](https://github.com/pkp/ops/commit/934933ae0f844db627d34feb802f6cfd34957ef8)
  and its copy 8d7eef85b7, an ancestor of `main`'s tip); the French
  (Canada) Weblate text of 2025-06-17
  ([6e6b848e97](https://github.com/pkp/ops/commit/6e6b848e9725494bab7e8a0b7392d6751797c2f3),
  `locale/fr_CA/author.po`), merged into 3.5 by
  [4ed5bf2621](https://github.com/pkp/ops/commit/4ed5bf26211edb4e74457e631f8865e158dc441d)
  and on `main` through its copy
  [f31596402e](https://github.com/pkp/ops/commit/f31596402e3726686fc80985970b1c40ecda2496)
  (same file, same change); `git log --merges --grep=translations` on
  `stable-3_4_0`; the Weblate repository `pkp-translations/ops` on
  GitHub, whose `stable-3_4_0` branch (last commit 2024-02-16) holds the
  entry empty; translate.pkp.sfu.ca's component page and API, which
  answered a bot check.
- Introduced: `git log -S'developedBy.blockTitle'` on each app's
  `plugins/blocks/developedBy` (OJS's original commit
  [28d65a0a59](https://github.com/pkp/ojs/commit/28d65a0a59ac6dd9394497c1a54db2dd1f3e3417),
  2020-03-11); `git log` and `git blame` on OPS's French (Canada) file.
- Upstream: pkp/pkp-lib, pkp/ops and pkp/ui-library searched on
  2026-10-03 by "Developed By" block, `developedBy blockTitle`,
  `developedBy`, "Développé par", "fr_CA translation missing" and "OPS
  French missing translation": nothing on this fault.
- Not driven: 3.4 and 3.3 (code only); languages other than French
  (Canada) and English (locale files only); the default theme's French
  (Canada) texts (code only); the diff on 3.5.
- Unverified: whether Weblate holds a French (Canada) text for this key
  entered after its 2026-09-23 merge; whether Weblate still takes texts
  for 3.4.
