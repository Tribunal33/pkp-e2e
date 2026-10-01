# A manager working in another language than the journal's primary one saves a custom block as a blank row that cannot be edited, deleted or placed

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/customBlockManager#66` for `pkp/pkp-lib#5619` · [0d29bdac28](https://github.com/pkp/customBlockManager/commit/0d29bdac28eeb4dfbc2b04da8fe1f2e8ce759f0b) · 2020-11-12 · Nate Wright (NateWr)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U09 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a4)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

The "Add Block" window shows one "Block Name" box, the one for the
journal's primary language, and requires it. The block's hidden id,
though, is made from the title in the manager's interface language. A
manager working in French on an English journal who types the title in
that one box expects a block they can find and correct.

Instead the save goes through and the "Custom Blocks" list gains a blank
row. The row has no "Edit" and no "Delete". Under "Sidebar" the block
cannot be placed: ticking it is refused. No screen removes the row; the
other blocks keep working.

## Impact

- **Lost.** Nothing already published. The block's title and content
  are saved but can never be shown, and nothing tells the manager why.
- **Who.** Managers of multilingual journals, presses and servers who
  work in a language other than the primary one, the first time they
  add a block and fill only the box the window shows.
- **Way round.** Add the block again with the interface language's box
  filled too (it opens under the box shown), or from the primary
  language's interface. The blank row stays until it is removed in the
  database.

Medium: adding a block fails silently in an ordinary multilingual setup,
with a way round on screen. It would be higher if the blank entry
blocked the "Sidebar" saves of other blocks; it does not.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), context
  `publicknowledge`. Its languages are English (primary) and French
  (Canada), both offered for the interface and for forms.
- Nothing else. "Custom Block Manager" is off in the dataset; step 3
  turns it on.

The labels are those of the French interface, with the English in
brackets.

1. Sign in as `rvaca` (the journal, press or server manager).
2. Open the user menu (the initials at the top right) › "Changer la
   langue" ["Change Language"] › "français".
3. Open "Paramètres" › "Site Web" ["Settings" › "Website"], the
   "Plugiciels" ["Plugins"] tab, and tick "Gestionnaire de bloc
   personnalisé" ["Custom Block Manager"].
4. On that row's arrow, choose "Gérer les blocs personnalisés" ["Manage
   Custom Blocks"]. The list reads "Aucun bloc personnalisé n'a été
   créé." ["No custom blocks have been created."].
5. Press "Ajouter un bloc" ["Add Block"]. In "Nom du bloc" ["Block
   Name"], the box shown, whose placeholder reads "anglais" ["English"],
   type "Our Partners u09a4". Leave the French box, which opens under it,
   empty. In "Contenu" ["Content"] type "Partner list.", and press
   "Enregistrer" ["Save"].
6. Read the "Blocs personnalisés" ["Custom Blocks"] list.
7. Close the window. On the same "Site Web" page, open the "Apparence"
   ["Appearance"] tab and its "Configuration" ["Setup"] sub-tab. Under
   "Barre latérale" ["Sidebar"] the new block is listed as "(Plugiciel
   de bloc personnalisé)". Tick it and press "Enregistrer".
8. Switch back to English (user menu › "Change Language" › "English"),
   open "Manage Custom Blocks" again, and read the list.

**Expected.** The block gets an id made from the title the manager
typed. Its row shows it and has an arrow with "Edit" and "Delete", and
ticking it under "Sidebar" saves.

**Observed.** The window closes as after any save. The list shows one
row with no text and no arrow, so no "Modifier" ["Edit"] and no
"Supprimer" ["Delete"]. In step 7 the save is refused under the list,
with status 400:

```
Ce n'est pas une chaîne valide.
Cela ne peut contenir que des lettres, des chiffres, des tirets et des traits de soulignement.
```

["This is not a valid string." and "This may only contain letters,
numbers, dashes and underscores."]. After step 8 the row is still blank,
with no arrow.

Control: with the blank entry left unticked, ticking another block
("Plugiciel de fils de nouvelles" ["Web Feed Plugin"]) and saving works,
and the same block added in the English interface gets the id
"our-partners-u09a4" and a row with "Edit" and "Delete".

## Cause

Each custom block has a hidden **id** (its `plugin_name`). The "Custom
Blocks" list shows it, the grid row uses it, and "Sidebar" stores it.
`CustomBlockForm::execute()` in pkp/customBlockManager makes it once, at
the first save, from the "Block Name" in the **interface language**
([`controllers/grid/form/CustomBlockForm.php` lines 99 and 105](https://github.com/pkp/customBlockManager/blob/1f8d452d8c5e67d073a72f61eab39b97838d87b2/controllers/grid/form/CustomBlockForm.php#L99-L105)):

```php
$locale = Locale::getLocale();
// …
$blockName = preg_replace('[^a-z0-9\-\_.]', '', Str::of($this->getData('blockTitle')[$locale])->lower()->kebab());
```

The form requires another box. Its check,
`FormValidator($this, 'blockTitle', 'required', …)`, marks the field
required, and the multilingual text input shows, and marks, the box of
the form's required language, the context's primary language
(`Form::$requiredLocale`; [`lib/pkp/templates/form/textInput.tpl`](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/templates/form/textInput.tpl#L22-L51)).
The other languages' boxes open under it. So `execute()` reads the
empty French title, and the id comes out as an empty string: `blocks` =
`[""]`, and the block's own settings stored under the plugin name `""`.

Two parts of the app refuse the empty id:

- **"Edit" and "Delete".** `CustomBlockGridRow::initialize()` adds them
  only `if (!empty($blockName))`
  ([`controllers/grid/CustomBlockGridRow.php` line 39](https://github.com/pkp/customBlockManager/blob/1f8d452d8c5e67d073a72f61eab39b97838d87b2/controllers/grid/CustomBlockGridRow.php#L39)),
  so the row has no arrow.
- **"Sidebar".** The context schema checks each entry as a `string`
  with `alpha_dash`. Laravel skips those rules on an empty string, but
  the API's `ConvertEmptyStringsToNull` middleware
  ([`classes/core/PKPRoutingProvider.php` line 54](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/classes/core/PKPRoutingProvider.php#L54))
  turns `""` into `null` first, which fails both. The page posts only
  the ticked entries, so the refusal comes only when the blank one is
  ticked.

Until 0d29bdac28 the id had a field of its own, required and checked
against `/^[a-zA-Z0-9_-]+$/`. That change (`pkp/pkp-lib#5619`, a heading
for each block, for accessibility) dropped the field and made the id
from the new multilingual title, reading the interface language's value.

Reach:

- **The site's own blocks.** The same method names the blocks that
  Administration › "Site Settings" offers on a site hosting more than
  one context, with the site's primary language as the required one
  (code).
- **An interface language not offered for forms.** The title then has
  no box in that language at all, so the id is blank even with every
  box filled (code).
- **A second block made the same way** finds `""` already taken and
  gets `uniqid('')`, a generated 13-character id, so it works; only the
  first stays blank (code).
- **No other id** in pkp-lib or the three apps is built from a form's
  interface-language value: a search for `getData('…')[$locale]` and
  `[Locale::getLocale()]` on form data found only this line.

## Proposed fix

In pkp/customBlockManager, make the id from the interface language's
title as today, and fall back on the title in the form's required
(primary) language when that one is empty. Every block that gets a
usable id today keeps the same id:

```diff
-            $locale = Locale::getLocale();
-
             // Add the custom block to the list of the custom block plugins in the
             // custom block manager plugin
             $blocks = $this->customBlockManagerPlugin->getSetting($contextId, 'blocks') ?? [];
 
-            $blockName = preg_replace('[^a-z0-9\-\_.]', '', Str::of($this->getData('blockTitle')[$locale])->lower()->kebab());
+            // Name the block after its title in the interface language, or in the
+            // form's required (primary) language when that one is left empty
+            $blockTitle = (array) $this->getData('blockTitle');
+            $title = (string) ($blockTitle[Locale::getLocale()] ?? '');
+            if (trim($title) === '') {
+                $title = (string) ($blockTitle[$this->getRequiredLocale()] ?? '');
+            }
+
+            $blockName = preg_replace('[^a-z0-9\-\_.]', '', Str::of($title)->lower()->kebab());
```

[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/custom-block-blank-row-other-language/fix.diff)
gives its paths from the app root
(`plugins/generic/customBlockManager/…`); in a pkp/customBlockManager
clone, apply it with `git apply -p4`. It applies to `stable-3_5_0`
(87092d8) with an offset.

- **The pattern.** pkp-lib's other generated key picks its source the
  same way: `emailTemplate\DAO::getUniqueKey()` names a new email
  template from `getLocalizedData('name')`, the current language with a
  fallback on the primary one. `Form::getRequiredLocale()` is the
  language the form's check marks as required.
- **An interface language without a form box** has no key in the
  title, and the `?? ''` sends it to the fallback too.
- **What it does not close.** The required title is enforced only in
  the browser: on the server, `FormValidator`'s default check passes
  for any array, every box empty included. A title that comes out
  empty that way, or one of symbols alone, still gives an empty id;
  the empty-id guard proposed for
  [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U09-A13-custom-block-ampersand-name-stuck.md)
  covers both.

**Tried** on `main` in OJS, OMP and OPS:

- **The steps with the fix.** In the French interface, "Our Partners
  u09a4" typed in the English box only gets the id
  "our-partners-u09a4". Its row has "Modifier" and "Supprimer" (and
  "Edit" and "Delete" in English), and "Barre latérale" places it on
  the home page.
- **The ids that work today.** A block with both boxes filled in the
  French interface ("nos-partenaires-u09a4nb") and a block with the
  English box filled in the English interface
  ("english-block-u09a4nb") got the same ids, rows, "Edit", "Delete",
  "Sidebar" entries and home page blocks with the fix as without it.

**Alternatives**

- **Always the primary language's title.** It is also never empty on
  the screen's path, but a manager working in French who fills both
  boxes would get an id made from the English title instead of today's
  French one, a change nobody asked for.
- **Require the interface language's box instead.** The window shows
  the primary language's box, and requiring another would send every
  manager hunting for the right box.
- **Ids generated apart from the title**, as
  `pkp/customBlockManager#17` asks (PR `pkp/customBlockManager#60`,
  open since 2020). That would end this and the other id faults, but it
  needs a migration of every stored block.

**What goes with it**

- **Rows already stuck: left as they are, with a documented clean-up.**
  A stuck row does no harm beyond clutter: it is never placed, and the
  other blocks' "Sidebar" saves go through. An upgrade step is not
  worth it. A site that wants a row gone runs the clean-up below, tried
  on `main` in the three apps (context 1 in the example). Plugin
  settings are cached, so the site administrator then presses "Delete
  Data Caches" on Administration; the row and the "Sidebar" entry are
  gone.

  ```sql
  -- the context's list of block ids, to be written back without ""
  SELECT setting_value FROM plugin_settings
   WHERE plugin_name = 'customblockmanagerplugin' AND setting_name = 'blocks' AND context_id = 1;
  UPDATE plugin_settings SET setting_value = '[]'
   WHERE plugin_name = 'customblockmanagerplugin' AND setting_name = 'blocks' AND context_id = 1;
  -- the blank block's own settings
  DELETE FROM plugin_settings WHERE plugin_name = '' AND context_id = 1;
  ```

  A delete path in the plugin is not needed: `deleteCustomBlock()`
  already handles an empty id (`array_diff()` drops `""`); only the row
  action is missing. On PostgreSQL, though, that action fails for every
  block, a fault reported separately (U09
  [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a14)).
- **With the fixes for A13 and [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U09-A1-custom-block-listed-by-first-name.md).**
  A13's fix changes the same statement: it gives the pattern its
  delimiters and adds a generated id when the cleaned id is empty. That
  guard alone would turn the blank row into a block with a generated id
  such as "66fb1c2e9a4d1", which works but carries an id the manager
  never typed. This fix picks the title the id is made from; A13's
  cleans it and guards the rest. Together, "Our Partners" typed in the
  French interface gets "our-partners". The two diffs touch
  neighbouring lines, so the second one applied needs its context
  adjusted. A1's fix changes only what the list and "Sidebar" show,
  and applies beside both.
- **A test.** The plugin's `cypress/tests/functional/CustomBlocks.cy.js`
  could add a block in the second language's interface with only the
  primary language's title, then open its "Edit".
- **Older versions.** 3.5 takes the diff as it stands. 3.4 and 3.3 make
  the id with Stringy in the same statement and need the same fallback
  there, with `AppLocale::getLocale()` on 3.3 (read, not tried).

Small: a five-line fallback in one plugin method, a test, and no data
repair.

## Evidence

- **The kept script.**
  [`shared/playwright/checks/issues/custom-block-blank-row-other-language/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/custom-block-blank-row-other-language/walk.js)
  runs on an install freshly loaded from the default dataset
  (pkp/datasets 38ab955, 2026-09-30, `pgsql`):
  `node bin/probe.js all shared/playwright/checks/issues/custom-block-blank-row-other-language/walk.js [neighbour|others]`.
  With no argument it takes the Steps; `neighbour` walks the blocks
  under "The ids that work today"; `others` walks the "Sidebar" control
  and the clean-up.
- **The fix trial.**
  `node bin/try-fix.js apply shared/playwright/checks/issues/custom-block-blank-row-other-language/fix.diff ojs omp ops`,
  then `revert`.
- **What was walked where.** The Steps on `main` and `stable-3_5_0`,
  OJS, OMP and OPS, with the same Observed on each. The fix, the
  "Sidebar" control and the clean-up on `main` only. The databases were
  PostgreSQL; nothing in the fault depends on the database.
- **Branch tips.**
  - `main`: OJS bade233f73, OMP 3b0ecf794c, OPS c8af945bb7. pkp-lib
    2e377d27fc (OJS) and 3dc90c81a6 (OMP, OPS). pkp/customBlockManager
    1f8d452d8c in all three.
  - `stable-3_5_0`: OJS 92b9a16b48, OMP 3081c9b00d, OPS cf4fce69bd.
    pkp-lib a9c76aed62. pkp/customBlockManager 87092d8a46.
  - `stable-3_4_0`: OJS 9571d8fde7, OMP 0aec65441f, OPS acd8ae704b,
    pkp-lib df13621c2d, each pinning pkp/customBlockManager 343f732568.
  - `stable-3_3_0`: OJS 9fdb9bcf9a, OMP 8e72fc8836, OPS c5532e2161,
    pkp-lib d446601ebe, each pinning pkp/customBlockManager 60eb4f04fe.
- **The 3.4 and 3.3 code.** 3.4's `CustomBlockForm.php` (line 108) and
  3.3's `CustomBlockForm.inc.php` (line 92) make the id from
  `getData('blockTitle')[$locale]` with `$locale` the interface
  language, and keep the same required check; both branches'
  `CustomBlockGridRow` gives "Edit" and "Delete" only to a non-empty
  id, and both pkp-lib branches' `textInput.tpl` and `Form` mark the
  primary language's box as the required one.
- **The Introduced trace.** Blame on line 99 gives b4ab69e6
  (`AppLocale` renamed `Locale`, `pkp/pkp-lib#6328`) and on line 105
  d45c192238 (Stringy replaced by `Str`, `pkp/pkp-lib#9719`); both kept
  the language. The interface language was first read in 0d29bdac28,
  which the GitHub API lists under PR `pkp/customBlockManager#66`.
- **The Upstream search**, on 2026-09-30, in pkp/pkp-lib,
  pkp/customBlockManager and pkp/ojs: custom block with language,
  locale, empty, blank, name, "edit delete", "not a valid string"
  sidebar, and `CustomBlockForm`. `pkp/customBlockManager#28` (2017) is
  about the block's content falling back on the primary language, and
  `pkp/pkp-lib#1779` about blocks carried over from OJS 2; neither is
  this fault.
- **Not driven.** The site's own blocks (the dataset hosts one context,
  so Administration › "Site Settings" offers no "Plugins"), an
  interface language not offered for forms, the second blank block,
  3.4 and 3.3.
