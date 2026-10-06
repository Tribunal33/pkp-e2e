# A custom block named with "&", or only in a language other than the manager's, can never be placed or removed

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Crash** script
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code; "&" is not affected there)
  - 3.3: OJS, OMP, OPS (code; "&" is not affected there)
- **Introduced** the name taken from the interface language's box: `pkp/customBlockManager#66` for `pkp/pkp-lib#5619` · [0d29bdac28](https://github.com/pkp/customBlockManager/commit/0d29bdac28eeb4dfbc2b04da8fe1f2e8ce759f0b) · committed 2020-11-12, merged 2020-11-17 · Nate Wright (NateWr). The strip that removes nothing: no PR · [d45c192238](https://github.com/pkp/customBlockManager/commit/d45c192238a8719ff380da703ad45bd5cf601b64) · 2024-02-08 · Alec Smecher (asmecher)
- **Upstream**
  - `pkp/pkp-lib#11863` (open). Its third scenario reports a "." in the name refused under "Sidebar"; it does not cover "Edit" and "Delete" or the language.
  - `pkp/customBlockManager#17` (open). It proposes generated block names, which would cover this too.
- **Tracked in** spec U09 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a4), [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a13)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager who names a custom block "News 2026 & Events" gets it saved
and listed as "news2026&-events". Its row's "Edit" and "Delete" do
nothing, because the window's own script fails as the list loads, and
ticking it under "Sidebar" is refused with "This may only contain
letters, numbers, dashes and underscores.".

A manager working in French who types the block's name only in the
journal's primary language, English, gets a blank row with neither
"Edit" nor "Delete", and ticking the block under "Sidebar" is refused
in the same way.

Either block can never be shown, corrected or deleted from the screens.
The language case needs a journal offering more than one interface
language.

## Impact

- **Lost**: the block the manager made, content included, and its row
  stays in the manager's list. Nothing says why at "Save"; the refusal
  comes only on "Appearance" › "Setup", and for the blank name it points
  at the characters, not at the language.
- **Who**: whoever manages the journal's (press's, server's) settings,
  each time they add a block:
  - `main` and 3.5: a name with "&" or a similar sign (an apostrophe,
    "!", "?", "(", "/") breaks "Edit", "Delete" and "Sidebar"; a "."
    breaks only "Sidebar".
  - 3.4 and 3.3: a "." breaks "Sidebar", and so does a title with no
    Latin letter (Greek, Russian, Arabic), which gets a blank name.
  - Every version: a manager working in a language other than the
    primary one who leaves their own language's "Block Name" box empty
    gets a blank name.
- **Way round**: add the block again, named with letters, digits and
  spaces only, and with the "Block Name" box of the language the
  manager is working in filled (or switch to the primary language
  first). Switching languages afterwards does not rescue the stuck
  block; only an edit of the database removes it.

Medium: a settings task fails and the block is lost, but it can be made
again through the screens and readers never see the stuck one.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`. The dataset has "Custom Block
  Manager" unticked and no custom block; its context's languages are
  English (primary) and French, for the interface and for forms, so
  "Block Name" has an English and a French box.

A name with "&":

1. Sign in as `rvaca` (password `rvacarvaca`), the journal manager
   (press manager, preprint server manager).
2. Open Settings › Website › "Plugins" › "Installed Plugins". Under
   "Generic Plugins", tick "Custom Block Manager".
3. Press the row's arrow, then "Manage Custom Blocks".
4. Press "Add Block". Type "News 2026 & Events" in the English "Block
   Name" box and "Dates" in the English "Content" box, then press
   "Save".
5. Press the new row's arrow, then "Edit".
6. Press "Delete".
7. Close the window and open Settings › Website again. Open
   "Appearance" › "Setup", tick "news2026&-events (Custom Block)" under
   "Sidebar" and press "Save".

A name typed in the primary language only, by a manager working in
French:

8. Press the initials at the top right and, under "Change Language",
   choose "français".
9. Open Paramètres › Site Web › "Plugiciels"; press the arrow of
   "Gestionnaire de bloc personnalisé", then "Gérer les blocs
   personnalisés", then "Ajouter un bloc".
10. Type "Our Partners" in the English "Nom du bloc" box and "Partner
    list" in the English content box, leave the French boxes empty, and
    press "Enregistrer". Close the window.
11. Press the initials and choose "English". Open Settings › Website ›
    "Plugins" › "Manage Custom Blocks" again.
12. Close the window and open Settings › Website again. Open
    "Appearance" › "Setup", tick " (Custom Block)" (the new block's
    entry, with nothing before the brackets) under "Sidebar" and press
    "Save".

**Expected**: step 5 opens the block's window and step 6 asks "Are you
sure you wish to delete this item? This action cannot be undone."; step
7 saves. Step 11 lists the new block by a name, with "Edit" and
"Delete", and step 12 saves.

**Observed**: step 4 lists the block as "news2026&-events". Steps 5 and
6 open nothing. Each time the window loads its list, the browser
console reads:

```
Syntax error, unrecognized expression: #component-plugins-generic-customblockmanager-controllers-grid-customblockgrid-row-news2026&amp;-events-editCustomBlock-button-6abe9ffadd8a2
Syntax error, unrecognized expression: #component-plugins-generic-customblockmanager-controllers-grid-customblockgrid-row-news2026&amp;-events-deleteCustomBlock-button-6abe9ffaddb84
```

Step 7 is refused under "Sidebar" with "This may only contain letters,
numbers, dashes and underscores." (the save answers 400).

Step 11 lists a second row that is blank and has no arrow. Step 12 is
refused with "This is not a valid string." and "This may only contain
letters, numbers, dashes and underscores.".

Control: "Our Partners" and "Événements à venir", typed in the English
interface, are listed as "our-partners" and "événementsà-venir"; "Edit"
opens their windows and "Sidebar" places them.

## Cause

`CustomBlockForm::execute()` (pkp/customBlockManager
`controllers/grid/form/CustomBlockForm.php`, line 105) makes the block's
name when a block is first saved:

```php
$locale = Locale::getLocale();
...
$blockName = preg_replace('[^a-z0-9\-\_.]', '', Str::of($this->getData('blockTitle')[$locale])->lower()->kebab());
```

The name is the block's identifier: the plugin's name in
`plugin_settings`, its entry in the context's `sidebar` setting, and
the grid's row id. So it must be non-empty and hold only letters,
digits, "-" and "_": the `sidebar` setting validates every entry with
`alpha_dash` (pkp-lib `schemas/context.json`, `schemas/site.json`), and
`CustomBlockGridRow::initialize()` adds "Edit" and "Delete" only for a
non-empty name. The statement breaks that rule in two ways:

- It reads the "Block Name" box of the manager's interface language.
  The form checks only the primary language's box: its `required` check
  on `blockTitle` puts a client-side `required` class on that box alone
  (`FormValidator`'s constructor, `textInput.tpl`). So a manager working
  in another language can save a block whose name is empty.
- The strip removes nothing. `preg_replace()` takes the brackets as the
  pattern's delimiters, so the pattern is the literal text
  `^a-z0-9\-\_.` anchored at the start, which never matches, and every
  character of the title is kept.

The kept "&" then reaches the jQuery selector each row control is bound
with: `lib/pkp/templates/linkAction/linkAction.tpl` line 31,
`$('#{$buttonId|escape:jqselector}').pkpHandler(`. The `jqselector`
escape (`PKPTemplateManager::smartyEscape()`) HTML-escapes "&" to
"&amp;" and backslash-escapes only `: . [ ] , = @`. jQuery refuses the
selector, so the links get no handler.

0d29bdac28 replaced the typed identifier (validated as
`^[a-zA-Z0-9_-]+$`) with the multilingual title, making the name from
the interface language's box. It shaped the name with Stringy's
`toLowerCase()->dasherize()->regexReplace(…)`; `regexReplace()` runs
`mb_ereg_replace()`, where a pattern needs no delimiters, so the strip
worked. d45c192238 ("Stop using Stringy") moved the same pattern string
into `preg_replace()`, and also swapped `dasherize()` for Laravel's
`kebab()`, which joins a word that does not open with a letter from a
to z to the one before. So the same title gives different names on 3.4 and on 3.5
onwards ("news-2026--events" against "news2026&-events").

Reach:

- Characters, on `main` and 3.5: any character outside letters,
  digits, "-" and "_" makes the "Sidebar" save refuse the block ("&"
  walked; the others read in the code, not driven; a "." is the case
  `pkp/pkp-lib#11863` reports). "Edit" and "Delete" also die for the
  characters the selector cannot take after that escaping: "&" walked;
  "'", "!", "?", "(", "/" and the like read in the code. A "." is
  escaped, so those links work for it.
- Language: whenever the box of the manager's interface language is
  empty (French and English walked). In a journal whose forms offer
  only the primary language, a manager working in another interface
  language has no box of their own, so every block they add gets an
  empty name (read in the code, not driven).
- The server's own check accepts a title with every box empty
  (`FormValidator::isValid()` checks an array only for `!== []`); no
  screen sends one, since the primary box is checked first in the
  browser (read in the code).
- The site's own blocks (Administration › "Site Settings" ›
  "Plugins"): the same form, with the site's primary language in the
  context's place (read in the code, not driven).
- 3.4 and 3.3 still use Stringy, so "&" is stripped there, but "." is
  kept and the "Sidebar" save refuses it. Their strip also removes
  accented and non-Latin letters, so a title with no Latin letter gets
  an empty name, as in the language case (read in the code).

## Proposed fix

Make the name from the primary language's title, the box the form
checks, keep only the characters the `sidebar` setting accepts, and
fall back to a fixed word when nothing is left
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/custom-block-stuck-with-unusable-name/fix.diff);
its paths are relative to the app, `plugins/generic/customBlockManager/…`,
so a PR on pkp/customBlockManager applies it with `git apply -p4`):

```diff
-            $locale = Locale::getLocale();
-
             // Add the custom block to the list of the custom block plugins in the
             // custom block manager plugin
             $blocks = $this->customBlockManagerPlugin->getSetting($contextId, 'blocks') ?? [];
 
-            $blockName = preg_replace('[^a-z0-9\-\_.]', '', Str::of($this->getData('blockTitle')[$locale])->lower()->kebab());
+            $request = PKPApplication::get()->getRequest();
+            $context = $request->getContext();
+            $primaryLocale = $context ? $context->getPrimaryLocale() : $request->getSite()->getPrimaryLocale();
+            $blockTitle = (string) ($this->getData('blockTitle')[$primaryLocale] ?? '');
+            $blockName = trim(preg_replace('/[^\pL\pM\pN_-]/u', '', Str::of($blockTitle)->lower()->kebab()), '-');
+            if ($blockName === '') {
+                $blockName = 'custom-block';
+            }
             if (in_array($blockName, $blocks)) {
```

The character class is the one Laravel's `alpha_dash` accepts, so the
name always passes the `sidebar` check, and names that work today
("our-partners", "événementsà-venir") come out the same. The primary
language follows the plugin's own `CustomBlockPlugin::getContents()`,
which falls back to the context's primary language. The fallback word
also covers a title whose every box is empty, which only a request
bypassing the browser's check could send. The existing `uniqid()` step
still separates two blocks of the same name.

Tried on `main` on the three apps: with the fix, "News 2026 & Events"
became "news2026-events", whose "Edit" opened the block's window,
"Delete" asked, and "Sidebar" saved; the block saved in the French
interface became "our-partners", listed with its arrow and placed
without a refusal; no script error. A check on two ordinary names,
with the fix in and out, gave "Our Partners" and "Événements à venir"
the same names both times, both editable, placed and shown on the home
page.

**Alternatives**

- Keep the interface language and fall back to the primary one when its
  box is empty. It fixes the empty name, but the name then depends on
  who made the block.
- Refuse such titles at "Save", as `pkp/pkp-lib#11863` expects. A
  manager would have to rewrite a reasonable title ("News & Events")
  for an identifier they never need to see.
- A generated name (`uniqid()`), as `pkp/customBlockManager#17`
  proposes. It also ends clashes with other plugins' names
  (`pkp/pkp-lib#6637`). But the list and "Sidebar" show the name, not
  the title (the companion report
  [U09-A1-custom-block-listed-by-made-up-name.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U09-A1-custom-block-listed-by-made-up-name.md)),
  so a generated name fits only once that is fixed. The block's element
  id on the public pages, which a journal's stylesheet targets, would
  then be opaque too (`'customblock-' . preg_replace('/\W+/', '-', $name)`
  in `getContents()`).
- The ASCII class the code first meant (`[^a-z0-9_-]`). It would strip
  accented letters from names that work today.

**What goes with it**

- Every instance: a search of pkp-lib, the three apps and their plugins
  for `preg_*` patterns delimited by brackets, and for an identifier
  built from `getData(...)[$locale]`, finds only this statement.
- Stored data: the fix changes only new names, so blocks already saved
  with a blank name or a refused character stay stuck. An upgrade step
  in the plugin could rename every name that fails `alpha_dash`, or is
  empty, by the new rule, moving its `plugin_settings` rows and its
  `blocks` entry. Removing only the refused characters keeps the
  public element id ("news2026&-events" and "news2026-events" both give
  `customblock-news2026-events`), so stylesheets keep working. Names
  made on 3.4 or earlier have the older shape and need only the same
  check, not a reshape (not written, not tried).
- Backport: `stable-3_5_0` has the same statement (lines 99 and 107);
  the diff applies with a line offset (not tried there). On 3.4 and
  3.3 the primary-language part applies as written; the Stringy chain
  there would keep its shape and only need the "." dropped from its
  class and `\pL` letters kept, so that new names keep the 3.4 shape.
- Guard: the plugin's Cypress test (`cypress/tests/functional/CustomBlocks.cy.js`)
  adding a block named with "&" and one saved in another interface
  language, then editing and placing each; and the e2e scenario in spec
  U09 (a **Planned** item).

Medium: the fix is one statement in one file, but blocks already stuck
on existing installations need an upgrade step to be freed.

## Evidence

- The kept script walks the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/custom-block-stuck-with-unusable-name/walk.js),
  with its helpers in `lib.js` beside it;
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/custom-block-stuck-with-unusable-name/neighbour.js)
  walks the two ordinary names, with the fix in and out. On an install
  freshly loaded from the default dataset, from a pkp-e2e checkout
  (`<feature>` names the set of test installs, `<id>` the output
  folder):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/custom-block-stuck-with-unusable-name/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/custom-block-stuck-with-unusable-name/fix.diff ojs omp ops`.
- Walked on OJS, OMP and OPS, `main` and `stable-3_5_0`, on PostgreSQL
  (nothing here depends on the database). Datasets: pkp/datasets
  c657990 (2026-10-01).
- Not driven: the site's blocks (the dataset has one context, so
  Administration › "Site Settings" has no "Plugins" tab); characters
  other than "&"; a journal whose forms offer one language; the upgrade
  step; the fix on 3.5.
- Code reads. `main` and 3.5: `CustomBlockForm::execute()` as quoted
  and its `FormValidator` on `blockTitle`, `FormValidator` (the
  constructor's client-side class, `isValid()`), `textInput.tpl`,
  `CustomBlockGridRow::initialize()`, `gridRow.tpl` and
  `linkAction.tpl`, `PKPTemplateManager::smartyEscape()`,
  `CustomBlockPlugin::getContents()`, and the `sidebar` entries of
  `schemas/context.json` and `schemas/site.json`. 3.4 (plugin
  343f732568) and 3.3 (60eb4f04fe), read with `git show` in the
  plugin's clone: the name from `Locale::getLocale()` /
  `AppLocale::getLocale()` and Stringy's
  `toLowerCase()->dasherize()->regexReplace('[^a-z0-9\-\_.]', '')`;
  `schemas/context.json` on `origin/stable-3_4_0` and
  `origin/stable-3_3_0` validates `sidebar` entries with `alpha_dash`.
  Stringy's `regexReplace()` calls `mb_ereg_replace()` (Stringy
  `src/Stringy.php`, `eregReplace()`).
- Introduced: `git log -L` on the statement gives 0d29bdac28 (the
  name made from the interface language's title, shaped with Stringy),
  then d45c192238 (Laravel's `kebab()` and the same pattern in
  `preg_replace()`; in the tags from `3_5_0rc2` on).
- Upstream search (pkp/pkp-lib, pkp/customBlockManager, pkp/ojs):
  "custom block" name, custom block special characters, `CustomBlockForm`.
  Read and not the same fault: `pkp/pkp-lib#6637` (a block named like
  another plugin shares its settings), `pkp/pkp-lib#6148` (closed; the
  " (Custom Block)" label once sent as the value),
  `pkp/customBlockManager#60` (open PR, migrating old block names).
- Tips: OJS `main` 68615b5a32 with lib/pkp 25562b0e1a; OMP `main`
  3b0ecf794c and OPS `main` c8af945bb7, both with lib/pkp 3dc90c81a6;
  customBlockManager 1f8d452d8c in all three. `stable-3_5_0` OJS
  3517e640f2 with lib/pkp b1981810da; OMP c7b45f88ea and OPS
  8eaf899468 with lib/pkp 1fb843f491; customBlockManager 87092d8a46.
  `stable-3_4_0`: OJS 75cc2d488b, OMP 0aec65441f, OPS acd8ae704b,
  lib/pkp 32b0f4b4af, customBlockManager 343f732568. `stable-3_3_0`:
  OJS ac77c9fb35, OMP 8e72fc8836, OPS c5532e2161, lib/pkp f6ab331645,
  customBlockManager 60eb4f04fe.
