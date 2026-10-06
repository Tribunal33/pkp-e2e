# In French (Canada) and every other language without its own labels, article pages show no "Publication Facts" panel

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS (hidden behind [pkp-e2e#211](https://github.com/jardakotesovec/pkp-e2e/issues/211))
  - 3.5: OJS
  - 3.4: none (code; the plugin is not bundled)
  - 3.3: none (code; the plugin is not bundled)
- **Introduced** `pkp/pflPlugin#58` · [fb289dd811](https://github.com/pkp/pflPlugin/commit/fb289dd8114c64931e96abea740bc43f9c0c9882) · 2025-07-07 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** `pkp/pflPlugin#41` (open), asking for English labels where a language has no translation; written before the labels moved to files, when such a page showed the panel with raw keys
- **Tracked in** spec U13 [OJS3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ojs3)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

With "Publication Facts Label plugin" on, an article page read in French
(Canada) shows no Publication Facts panel, and nothing says so. The same
page in English shows it.

It is one problem with two cases. The panel takes its labels from one
file per language and stays empty when the page's language has no file
of its own:

- French (Canada) and Spanish (Mexico): the labels exist under the base
  language ("fr", "es"), and the page does not look there.
- 58 more of the 78 languages OJS ships, German, Dutch and Arabic among
  them: the plugin has no labels at all.

With the proposed fix a reader of the first case sees the panel with the
base language's labels. A reader of the second sees it with English
labels, or still no panel if the team keeps to no English fallback.

## Impact

- **Lost.** The panel that tells readers how the article was reviewed
  and how the journal compares.
- **Who.** Readers of a journal that has the plugin on, on every article
  page read in one of those languages.
- **Way round.** A reader who switches the page to English, or to
  another language with a label file, sees the panel. The journal has
  none short of adding a label file to the plugin's folder.

Medium: an optional panel is missing, silently, from every article page
read in most of the languages a journal can offer, and the reader's only
way round is the English page. It would be high if the plugin were on by
default.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `stable-3_5_0`: journal
  `publicknowledge`, whose languages are English and French (Canada).
  Its published article 1, "Signalling Theory Dividends", is in the
  section "Articles", whose "Will not be peer-reviewed" is unticked. The
  "Publication Facts Label plugin" is off.
- The install can reach `https://pkp.sfu.ca`, where the plugin fetches
  its figures for other journals. On an install that cannot, the panel
  is missing in English too, and that is not this fault: the plugin
  fails at the fetch, and the server log has "Plugin …PflPlugin failed
  to handle the hook Templates::Article::Details" with a cURL error.

Steps:

1. Sign in as `rvaca` (Journal manager).
2. Settings › Website › "Plugins": tick "Enabled" on "Publication Facts
   Label plugin".
3. Sign out.
4. Open article 1's page in English
   (`/index.php/publicknowledge/en/article/view/1`).
5. Press "Publication Facts" at the foot of the side column, which
   expands the box.
6. Open the same page in French (Canada)
   (`/index.php/publicknowledge/fr_CA/article/view/1`).

[On `main` neither page shows the panel until the issue named in the
header's Affects bullet is fixed. With that report's fix applied, the
steps give the same result there.]

**Expected.** Both pages end their side column with a box titled
"Publication Facts". On the French page its rows are labelled from the
French labels the plugin ships: "Relecteurs", "Disponibilité des
données", "Financement externe", "Conflits d'intérêts", "Articles
acceptés", "Jours avant publication".

**Observed.** Steps 4 and 5: the side column ends with the "Publication
Facts" box, under "Section". Expanded, it lists "Peer reviewers", "Data
availability", "External funding", "Competing interests", "Articles
accepted", "Days to publication", "Indexed in", "Editorial team list",
"Society" and "Publisher".

Step 6: the page answers 200 in French. Its side column ends with
"Rubrique Articles", and there is no box under it. The page asks for a
label file that does not exist, and the browser's console carries the
plugin's warning:

```
GET /plugins/generic/pflPlugin/pfl/locale/fr_CA.json  404
PFL: failed to load translations SyntaxError: Failed to execute 'json' on 'Response': Unexpected token '<', "<!doctype "... is not valid JSON
```

## Cause

The panel's labels are one JSON file per language in the plugin's `pfl`
component (`plugins/generic/pflPlugin/pfl/locale/`, from pkp/pfl). There
are 18 files: `en`, `fr`, `es`, `pt`, `pt_BR` and 13 others. Nothing
maps the page's language to a file that exists.

`PflPlugin::displayArticlePfl()` passes the page's language as it is:
`'locale' => Locale::getLocale()` (line 307 on `main`, 309 on
`stable-3_5_0`). `PflPlugin::addPflJsAndCss()` writes the same name into
the page's preload link (line 490, 492 on `stable-3_5_0`).
`templates/pfl.tpl` then fetches `pfl/locale/<that name>.json`.

For `fr_CA` the server answers 404 with its HTML error page, so
`response.json()` throws. The template's `.catch()` only writes "PFL:
failed to load translations" to the console.

The panel draws itself only once its `data` is set: `render()` in
`pfl/js/pfl.js` returns while `_ready` is false. The template sets
`data` after the labels have arrived, so `<publication-facts-label>`
stays empty, with no height.

The plugin's commit "Move translations to the pfl repository (#58)"
brought this in. Until then the plugin built the labels on the server
from its own translation files, and a language without one showed the
panel with a raw key in place of each label. The move made the labels
usable outside OJS and translatable in Weblate. It is a defect and not a
regression because the panel did not work in such a language before
either: its rows could not be read then, and they are not shown now.

Reach:

- Every language without a label file, 60 of the 78 folders in OJS's
  `locale/` (code; `fr_CA` walked).
- Languages with a label file are not affected (English walked, the
  others code).
- The percentages in the panel have the same gap on the server side.
  They are formatted with the plugin's own translation key
  `plugins.generic.pfl.percentage`. The plugin's `locale/` folder has
  the same 18 languages, and three of them (`fi`, `it`, `pt`) lack this
  key. Where the key is missing the panel prints
  `##plugins.generic.pfl.percentage##` in place of each percentage: on a
  Finnish, Italian or Portuguese page today (code), and on a French
  (Canada) page as soon as its labels load (walked).
- The authors' competing-interests statements the plugin adds under
  their names do not depend on the label file (code).
- No other plugin bundled with OJS, OMP or OPS builds a script or JSON
  file's name from the page's language (code).

## Proposed fix

Choose the label file on the server, where the plugin can see which
files exist: the page's language, else its base language, else English.
Format the percentages in the same order, so that they never print a raw
key.

pkp-lib chooses the jQuery Validation and Plupload language files the
same way (`PKPTemplateManager`, its `$localeChecks` loop with
`file_exists()`). It has no English step, since those libraries carry
English built in.

The change goes in pkp/pflPlugin's `PflPlugin.php`, followed by a
submodule bump in OJS
([`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publication-facts-panel-missing-without-label-file/fix.diff)).
The diff's paths are against the OJS root; in a pkp/pflPlugin checkout
it applies with `patch -p4`.

```diff
+    function getLabelLocale(): string
+    {
+        $locale = Locale::getLocale();
+        foreach ([$locale, \Locale::getPrimaryLanguage($locale)] as $localeCheck) {
+            if (file_exists(__DIR__ . "/pfl/locale/{$localeCheck}.json")) return $localeCheck;
+        }
+        return 'en';
+    }
+
+    function formatPercentage($num): string
+    {
+        foreach ([Locale::getLocale(), $this->getLabelLocale(), 'en'] as $locale) {
+            $value = Locale::getBundle($locale)->translateSingular('plugins.generic.pfl.percentage', ['num' => $num]);
+            if ($value !== null) return $value;
+        }
+        return "{$num}%";
+    }
…
-                'locale' =>  Locale::getLocale(),
+                'locale' => $this->getLabelLocale(),
…
-                    'pflAcceptedPercent' => __('plugins.generic.pfl.percentage', ['num' => $acceptanceRate]),
+                    'pflAcceptedPercent' => $this->formatPercentage($acceptanceRate),
…
-            '<link rel="preload" href="'. $pflPath .'locale/'. Locale::getLocale() .'.json" as="fetch" crossorigin="anonymous">'
+            '<link rel="preload" href="'. $pflPath .'locale/'. $this->getLabelLocale() .'.json" as="fetch" crossorigin="anonymous">'
```

`formatPercentage()` asks the bundles directly instead of calling
`__()`, and that is meant. It tries up to three languages, and a miss on
the first is expected: `__()` would run the `Locale::translate` hook and,
in strict mode, log "Missing locale key" for each miss.

Tried on `main`, on top of the fix the `main` panel needs first. The
French (Canada) page loads `fr.json` and shows the box with the labels
the Expected names, and its percentages read "16%", "32%", "11%", "10%"
and "33%". The English page loads `en.json` and reads as before. The
journal's French home page loads none of the plugin's files. Both hold
with the fix in and out.

**Without the English step** (not tried). `pkp/pflPlugin#41` asks for
English labels where a translation is missing, and the discussion there
prefers no English fallback, as OJS has none elsewhere. To keep to that:

- In `getLabelLocale()`, `return 'en';` becomes `return $locale;`.
- In `formatPercentage()`, `'en'` leaves the list and the last line
  becomes `return __('plugins.generic.pfl.percentage', ['num' => $num]);`.

A French (Canada) or Spanish (Mexico) reader then sees the panel with
French or Spanish labels and percentages. In the other 58 languages the
page still asks for a file that is not there and shows no panel, and a
Finnish, Italian or Portuguese page still prints the raw percentage key.

**Alternatives**

- Add `fr_CA.json` and `fr_CA/locale.po` through Weblate. It is right
  for the wording, but it closes one language and leaves the panel
  missing wherever a translation is not there yet.
- Fall back inside `templates/pfl.tpl`: fetch `en.json` when the first
  fetch fails. It costs a failed request on every page view, leaves the
  preload link pointing at a missing file, and does not reach `fr.json`.
- Draw the panel with empty labels. The figures alone tell the reader
  nothing.

**What goes with it**

- A product call on the English step, above.
- An OJS commit on `main` and on `stable-3_5_0` moving
  `plugins/generic/pflPlugin` to the fixed plugin commit.
- Test: an e2e scenario in U13, an article page in French (Canada) with
  the plugin on that shows the "Publication Facts" box with labels and
  no raw key.

A proposal. Small: two helpers and seven changed lines in one plugin
file, and a submodule bump, tried.

## Evidence

- Kept script, which takes the Steps through the screens on an install
  freshly loaded from PKP's default test dataset (pkp/datasets 38ab955,
  the `main` and `stable-3_5_0` PostgreSQL dumps, no upgrade needed):
  [`shared/playwright/checks/issues/publication-facts-panel-missing-without-label-file/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publication-facts-panel-missing-without-label-file/walk.js),
  with its helper in `lib.js` beside it. On 3.5:
  `PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir20-3_5 PROBE_AGENT=ir20 node bin/probe.js ojs shared/playwright/checks/issues/publication-facts-panel-missing-without-label-file/walk.js`.
  On `main`: the same without the first two variables, with
  `PROBE_FEATURE=issues-ir20`.
- What the script records for each page: its language, the panel's
  element with its size and its text (collapsed and expanded), the label
  file the page preloads, every plugin file the browser asked for with
  its status, and the plugin's console lines. After the Steps it reads
  the English page again and the journal's French home page, the fix's
  neighbours.
- The figures for other journals. `PflPlugin::getStatistics()` fetches
  `https://pkp.sfu.ca/ojs/pflStatistics.json` with no error handling,
  and the test install cannot reach it. So the script reads the pages
  through a second PHP server on the same code and database, whose file
  cache holds a `pflStats-<journal id>` entry with the answer pkp.sfu.ca
  gave on 2026-10-01 (`startStatsStandIn()` in
  [`publication-facts-panel-never-shown/lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publication-facts-panel-never-shown/lib.js)).
  What an install without that entry shows (the Preconditions' second
  item) is from that report's 3.5 walk and the code, not from this
  script.
- 3.5 (walked, and read): Observed is this walk. The read:
  `PflPlugin.php`, `templates/pfl.tpl` and the files of `pfl/locale/`,
  the same code and the same 18 files as on `main`.
- `main` (walked on a freshly loaded install for each state of the
  code). As it stands: no panel on either page, and the two "Undefined
  constant" failures of the other report in the server log. With that
  report's `fix.diff`: the same as Observed. With the label change
  alone on top of it: the French box with the raw percentage key five
  times. With `fix-both-for-walk-only.diff`: the result in Proposed fix.
- The fix trial: `fix-both-for-walk-only.diff` is that report's fix and
  this report's `fix.diff` in one file, since `bin/try-fix.js` applies
  one diff at a time.
  `node bin/try-fix.js apply shared/playwright/checks/issues/publication-facts-panel-missing-without-label-file/fix-both-for-walk-only.diff ojs`,
  the walk, then `node bin/try-fix.js revert` with the same diff.
  `fix.diff` applies to the plugin's `stable-3_5_0` file by
  `patch --dry-run`; it was not walked there.
- Tips: OJS `main` bade233f73 (2026-09-30) with pkp-lib 2e377d27fc,
  pflPlugin 622c85dcb1 and its pfl a32ba553f7; OJS `stable-3_5_0`
  92b9a16b48 (2026-09-30) with pkp-lib a9c76aed62, pflPlugin 95f7a35886
  (1.2.1.4) and the same pfl; `stable-3_4_0` 9571d8fde7; `stable-3_3_0`
  9fdb9bcf9a.
- 3.4 and 3.3 (code): `upstream/stable-3_4_0` and `upstream/stable-3_3_0`
  of OJS have no `plugins/generic/pflPlugin` and no such entry in
  `.gitmodules`.
- Introduced: `git blame` on `templates/pfl.tpl` lines 20 to 31 and
  `git log -S"Locale::getLocale()"` on `PflPlugin.php`, both fb289dd811,
  the merge of `pkp/pflPlugin#58` (no linked issue). Its parent's
  `pfl.tpl` set `pfl.data` straight from the page, with a `labels` array
  built by `__()`, and the plugin then had `locale/en` and `locale/es`
  only. The commit is in the plugin's `stable-3_5_0` branch and in its
  tags from `3_5_0-2` on.
- Every instance: the folders of OJS's `locale/` against the files of
  `pfl/locale/`, the same on both lines (`fr_CA` and `es_MX` are the two
  with a base-language file); the plugin's `locale/*/locale.po` for the
  percentage key (15 of 18); `LocaleBundle::translateSingular()` and
  `Locale::translate()`, which gives `##key##` for a key the language
  lacks; `PKPTemplateManager.php` lines 858 to 893; a search of the
  three apps' `plugins/` and `lib/pkp/plugins/` (PHP and templates) for
  the page's language joined to a `.js` or `.json` name, which finds
  this plugin alone.
- Upstream search (2026-10-01), issues and pull requests, open and
  closed, in pkp/pkp-lib, pkp/ojs, pkp/ui-library, pkp/pflPlugin and
  pkp/pfl, for "publication facts label", "pfl" with "locale",
  "translation(s)" and "fr_CA", and "failed to load translations".
  `pkp/pflPlugin#41` is open since 2025-02-04, titled "PFL to appear in
  English if the translation for the selected language is not
  available", with three comments. No issue reports the panel missing.
- Not driven: MySQL (the fault does not depend on the database); any
  language other than the dataset journal's two; the variant without
  the English step.
