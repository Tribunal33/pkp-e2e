# A custom block titled with "&" or an apostrophe can never be placed, edited or deleted

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** script
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#9719` (Remove Stringy dependency). The fault is in its plugin side, commit [d45c192238](https://github.com/pkp/customBlockManager/commit/d45c192238a8719ff380da703ad45bd5cf601b64) in pkp/customBlockManager, which was pushed without a PR · 2024-02-08 · Alec Smecher (asmecher)
- **Upstream** `pkp/pkp-lib#11863` (open) reports the "Sidebar" refusal for a block titled with ".", and not the dead "Edit" and "Delete"
- **Tracked in** spec U09 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a13)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A manager who names a custom block "News 2026 & Events" gets it saved
and listed as "news2026&-events". That row's "Edit" and "Delete" do
nothing, because a script error in the browser leaves them without an
action. Ticking the block under "Sidebar" is refused with "This may only
contain letters, numbers, dashes and underscores.". An apostrophe in the
title does the same. The other blocks in the list keep working.

The block can never be shown, and no screen can remove it: it stays in
the list until someone deletes it in the database. The way round is to
save the block first under a title without the character, then rename
it.

It depends only on the title typed in the manager's interface language
when the block is first saved. A title with "." can be edited and
deleted, but is refused under "Sidebar" in the same way.

## Impact

- **Lost.** Nothing already published is lost. The block's content is
  stranded: it is saved, but can never be placed. The refusal under
  "Sidebar" is about a name the manager never typed, so it does not tell
  them what to change.
- **Who.** Journal, press and server managers who title a sidebar block
  with "&" or an apostrophe ("Indexing & Abstracting", "Editor's
  Picks"), each time they do.
- **Way round.** Add the block with "and" (or without the apostrophe),
  then use "Edit" to change its "Block Name" to the title wanted. The
  public pages show the new title. The first block stays in the list.

Medium: adding a sidebar block fails for an ordinary but narrow input,
and there is a way round on screen, though it is not obvious. It would
be higher if the block could not be renamed afterwards.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (the same on `stable-3_5_0`). Any
  database will do; the walks ran on PostgreSQL. The steps are the same
  in OJS, OMP and OPS.
- The dataset leaves "Custom Block Manager" unticked and holds no custom
  block, so steps 3 to 8 turn it on and add two blocks: one for
  comparison, and one titled with "&".

1. Sign in as `rvaca` (the journal, press or server manager).
2. Open Settings › Website
   (`/index.php/publicknowledge/en/management/settings/website`), tab
   "Plugins".
3. Under "Installed Plugins", "Generic Plugins", tick "Custom Block
   Manager". "The plugin "Custom Block Manager" has been enabled." shows
   at the top right.
4. Press the arrow on its row, then "Manage Custom Blocks". The window
   "Custom Block Manager" opens, listing no block.
5. Press "Add Block". Type "Block Name" "Partners u09a13" and "Content"
   "Our partners.".
6. Press "Save". The list shows "partners-u09a13".
7. Press "Add Block". Type "Block Name" "News & Events u09a13" and
   "Content" "What's on.".
8. Press "Save". The list also shows "news&-events-u09a13".
9. Press the arrow on the row "news&-events-u09a13", then "Edit".
10. Press "Delete" on the same row.
11. Press the arrow on the row "partners-u09a13", then "Edit".
12. Close the window and reload the page (the "Sidebar" list is read
    when the page loads). Open the tab "Appearance", then "Setup". Under
    "Sidebar", tick "news&-events-u09a13 (Custom Block)" and press
    "Save".

**Expected.** The block's list name holds only letters, digits and
dashes ("news-events-u09a13"). Step 9 opens the block's window with its
"Block Name" and "Content". Step 10 asks "Are you sure you wish to
delete this item? This action cannot be undone.". Step 12 saves, and
the block shows in the sidebar of the public home page.

**Observed.** When the list reloads after step 8, the browser reports
two script errors:

```
Syntax error, unrecognized expression: #component-plugins-generic-customblockmanager-controllers-grid-customblockgrid-row-news&amp;-events-u09a13-editCustomBlock-button-6abd7919b0110
Syntax error, unrecognized expression: #component-plugins-generic-customblockmanager-controllers-grid-customblockgrid-row-news&amp;-events-u09a13-deleteCustomBlock-button-6abd7919b0659
```

In steps 9 and 10 nothing opens and no request is sent. In step 11
"Partners u09a13" opens as usual. In step 12 the save is refused: "The
form was not saved because 1 error(s) were encountered. Please correct
these errors and try again." shows at the top right, and "This may only
contain letters, numbers, dashes and underscores." under "Sidebar". The
request answers:

```
PUT /index.php/publicknowledge/api/v1/contexts/1 → 400
{"sidebar":[["This may only contain letters, numbers, dashes and underscores."]]}
```

The public home page shows no block.

## Cause

Each custom block has a hidden identifier, its **name**, and the
"Custom Block Manager" list shows it. The name is made from the "Block
Name" once, at the first save, and never changes after that. The code
that makes it is `CustomBlockForm::execute()` in pkp/customBlockManager
([`controllers/grid/form/CustomBlockForm.php` line 105](https://github.com/pkp/customBlockManager/blob/1f8d452d8c5e67d073a72f61eab39b97838d87b2/controllers/grid/form/CustomBlockForm.php#L105)):

```php
$blockName = preg_replace('[^a-z0-9\-\_.]', '', Str::of($this->getData('blockTitle')[$locale])->lower()->kebab());
```

The pattern is meant as a character class: remove every character that
is not a lower-case letter, a digit, "-", "_" or ".". But
`preg_replace()` reads the leading "[" and the closing "]" as the
pattern's delimiters. The pattern it actually runs is `^a-z0-9\-\_.`,
which matches only the literal text "a-z0-9-_" plus one character, at
the start of the name. No title matches that, so nothing is removed. The
name keeps "&" in the plugin's `blocks` setting and in the block's
`plugin_settings` rows.

Two parts of the app refuse such a name:

- **The list's "Edit" and "Delete".** The grid row's id holds the name.
  `linkAction.tpl` binds each link with
  `$('#{$buttonId|escape:jqselector}')`
  ([line 31](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/templates/linkAction/linkAction.tpl#L31)).
  The `jqselector` escape in `PKPTemplateManager::smartyEscape()`
  ([line 2440](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/classes/template/PKPTemplateManager.php#L2440))
  HTML-escapes first ("&" becomes "&amp;", "'" becomes "&#039;"). It
  then backslashes only `: . [ ] , = @`. jQuery gets an invalid
  selector and throws, so that row's two links never get their action.
  Each row binds its links in a script of its own, so the other rows
  are not affected.
- **The "Sidebar" save.** The "Sidebar" list posts block names, and the
  context schema checks each one with `alpha_dash`
  ([`schemas/context.json` line 838](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/schemas/context.json#L838)).
  That rule accepts only letters, marks, digits, "-" and "_".

Until d45c192238 ("Stop using Stringy"), the line called Stringy's
`regexReplace()`. It runs the pattern through `mb_ereg_replace()`,
which takes no delimiters, so the character class worked and removed
"&". That commit swapped in `preg_replace()` and kept the pattern
unchanged.

Reach:

- **An apostrophe.** "Editor's Picks u09a13" gets the name
  "editor's-picks-u09a13". It fails in the same way (walked).
- **Other characters.** Every other character outside the class now
  stays in the name too, and "Sidebar" refuses each of them. "Edit" and
  "Delete" also fail wherever the escape leaves the character as
  selector syntax, for example "(", ")" and "!" (code).
- **".".** The class as written keeps "." on every version, 3.4 and 3.3
  included. "3.5 News u09a13" gets the name "3.5-news-u09a13". Its
  "Edit" and "Delete" work, because the escape covers ".", but "Sidebar"
  refuses it (walked).
- **The site's own blocks.** Administration › "Site Settings" offers
  them on a site that hosts more than one context. The same method
  names them, and `schemas/site.json` checks their "Sidebar" with
  `alpha_dash` too (code).
- **Blocks already saved.** Blocks already saved under such a name keep
  it, and no page shows them, because they could never be placed.

## Proposed fix

In pkp/customBlockManager, give the pattern its delimiters and make its
class the rule that "Sidebar" enforces (`alpha_dash`), so that every
generated name can be placed. A name that comes out empty then gets a
generated one, as a name already taken does today:

```diff
-            $blockName = preg_replace('[^a-z0-9\-\_.]', '', Str::of($this->getData('blockTitle')[$locale])->lower()->kebab());
-            if (in_array($blockName, $blocks)) {
+            // The name keeps only what the "Sidebar" setting accepts (alpha_dash):
+            // letters, marks, digits, "-" and "_"
+            $blockName = preg_replace('/[^\pL\pM\pN_-]/u', '', Str::of($this->getData('blockTitle')[$locale])->lower()->kebab());
+            if ($blockName === '' || in_array($blockName, $blocks)) {
                 $blockName = uniqid($blockName);
             }
```

[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/custom-block-ampersand-name-stuck/fix.diff)
gives its paths from the app root
(`plugins/generic/customBlockManager/…`). In a pkp/customBlockManager
clone, apply it with `git apply -p4`. On `stable-3_5_0` (87092d8) the
line is 107, and the diff applies there with an offset.

- **Why this class.** `/[^\pL\pM\pN_-]/u` removes exactly what Laravel's
  `alpha_dash` (`/\A[\pL\pM\pN_-]+\z/u`) refuses. pkp-lib chose that
  rule for "Sidebar" so that block names would pass it
  (`pkp/pkp-lib#6148`, 2020).
- **Names that stay the same.** Ordinary and accented titles get the
  same names as today ("partners-u09a13", "événementsà-venir-u09a13").
- **Why the guard for an empty name.** A title of symbols alone ("& &
  &") now comes out empty. The grid gives no "Edit" or "Delete" to a row
  whose name is empty, so the guard gives it a generated name instead.

**Tried** on `main` in OJS, OMP and OPS:

- **The steps with the fix.** "News & Events u09a13" gets
  "news-events-u09a13". Its "Edit" opens, its "Delete" asks, and
  "Sidebar" places it on the home page.
- **Other titles.** "Partners u09a13" and "Événements à venir u09a13"
  got the same names and behaved the same with and without the fix.
- **A title of symbols alone.** Without the fix, "& & &" was stored as
  "&&&" and stuck in the same way. With the fix, it got a generated name
  whose "Edit" opens.

**Alternatives**

- **`Str::slug()`.** It needs no class written by hand and gives ASCII
  names ("news-events-u09a13"). But new blocks with accented titles
  would get transliterated names ("evenements-a-venir-u09a13") where
  today's names keep the letters. The fix only needs names that
  "Sidebar" accepts, and `alpha_dash` says exactly which those are.
- **The class as first written, with delimiters**
  (`/[^a-z0-9\-\_.]/`), as 3.4 has it. It keeps ".", which "Sidebar"
  refuses. It also strips accented letters from names that work today.
- **A `jqselector` escape that handles "&" and the other CSS
  characters.** "Edit" and "Delete" would then work, even for blocks
  already stuck. But "Sidebar" would still refuse the name, and the
  change reaches every link action in pkp-lib.
- **Names generated apart from the title**, as pkp/customBlockManager#17
  asks (PR pkp/customBlockManager#60, open since 2020). That would also
  end the names made from titles, but it needs a migration of every
  stored block, far beyond this fault.

**What goes with it**

- **Blocks already stuck: a documented clean-up, not a migration.** The
  fix leaves them as they are. They were never shown on a public page,
  so an upgrade step would only rename rows that do nothing. That step
  would have to pick new names and rewrite each block's settings, which
  is a migration for clutter. A site that wants them gone can run the
  clean-up below, which was tried on `main`. Plugin settings are
  cached, so after the database change the site administrator presses
  "Delete Data Caches" on Administration. The block then leaves the
  list and "Sidebar". The example is context 1; the site's own blocks
  were not tried.

  ```sql
  -- the context's list of block names
  SELECT setting_value FROM plugin_settings
   WHERE plugin_name = 'customblockmanagerplugin' AND setting_name = 'blocks' AND context_id = 1;
  -- write it back without the stuck name
  UPDATE plugin_settings SET setting_value = '["partners-u09a13"]'
   WHERE plugin_name = 'customblockmanagerplugin' AND setting_name = 'blocks' AND context_id = 1;
  -- remove the stuck block's own settings
  DELETE FROM plugin_settings WHERE plugin_name = 'news&-events-u09a13' AND context_id = 1;
  ```
- **The same pattern in pkp-lib.** The pkp-lib side of the same change
  (1979b7a55e) left the same undelimited pattern in two calls:
  `DAO::getUniqueKey()`
  ([`classes/emailTemplate/DAO.php` line 439](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/classes/emailTemplate/DAO.php#L439))
  and `FileApiHandler::downloadAllFiles()`
  ([`controllers/api/file/FileApiHandler.php` line 178](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/controllers/api/file/FileApiHandler.php#L178)).
  This fix leaves both out: they live in another repository, and what
  they break on their own screens was not checked. Each takes the same
  delimiter correction in a change of its own.
- **A block with an empty title.** The guard also names a block whose
  "Block Name" is empty in the manager's interface language, which today
  gets an empty name and a blank row. That fault is reported separately.
- **A test.** The plugin's `cypress/tests/functional/CustomBlocks.cy.js`
  could add a block titled with "&" and place it in "Sidebar".
- **Older versions.** 3.4 and 3.3 do not need the fix.

Small: one line and a guard in one plugin method, following the rule
that "Sidebar" already enforces, one test, and a documented clean-up
for blocks already stuck.

## Evidence

- **The kept script.**
  [`shared/playwright/checks/issues/custom-block-ampersand-name-stuck/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/custom-block-ampersand-name-stuck/walk.js)
  runs on an install freshly loaded from the default dataset
  (pkp/datasets 38ab955, 2026-09-30, `pgsql`):
  `node bin/probe.js all shared/playwright/checks/issues/custom-block-ampersand-name-stuck/walk.js [neighbour|others]`.
  - With no argument, it takes the Steps.
  - `neighbour` walks the other titles, with or without the fix.
  - `others` walks "." and the apostrophe, then the clean-up.
- **The fix trial.** The fix was applied with
  `node bin/try-fix.js apply shared/playwright/checks/issues/custom-block-ampersand-name-stuck/fix.diff ojs omp ops`,
  then taken out again with `revert`.
- **What was walked where.** The Steps were walked on `main` and
  `stable-3_5_0` (OJS, OMP, OPS), with the same Observed on each. On
  3.5 they were walked without the comparison block (steps 5, 6 and
  11), which was walked on `main` only, as were the other characters
  and the clean-up.
- **Branch tips.**
  - `main`: OJS bade233f73, OMP 3b0ecf794c, OPS c8af945bb7. pkp-lib
    2e377d27fc (OJS) and 3dc90c81a6 (OMP, OPS). pkp/customBlockManager
    1f8d452d8c in all three.
  - `stable-3_5_0`: OJS 92b9a16b48, OMP 3081c9b00d, OPS cf4fce69bd.
    pkp-lib a9c76aed62. pkp/customBlockManager 87092d8a46.
  - `stable-3_4_0`: OJS 9571d8fde7, OMP 0aec65441, OPS acd8ae704b, each
    pinning pkp/customBlockManager 343f732568.
  - `stable-3_3_0`: OJS 9fdb9bcf9a, OMP 8e72fc883, OPS c5532e2161, each
    pinning pkp/customBlockManager 60eb4f04fe.
- **The 3.4 and 3.3 code.** 3.4's `CustomBlockForm.php` and 3.3's
  `CustomBlockForm.inc.php` call Stringy 3.1's `regexReplace()`. Run
  through PHP's `mb_ereg_replace()`, the pattern strips "&", "'" and
  accented letters, and keeps ".". Both branches' `schemas/context.json`
  check "Sidebar" with `alpha_dash`.
- **The Introduced trace.** Blame on line 105 gives d45c192238. The
  GitHub API lists no PR for it. Its pkp-lib side is 1979b7a55e,
  squashed as ab953c3974.
- **The Upstream search**, on 2026-09-30.
  - Searched by: custom block, ampersand, special characters, name,
    sidebar, "letters, numbers, dashes", `CustomBlockForm`,
    `preg_replace` and `jqselector`.
  - Searched in: pkp/pkp-lib, pkp/customBlockManager, pkp/ojs, pkp/omp
    and pkp/ui-library.
  - What turned up: `pkp/pkp-lib#11863` asks for a warning when the
    block is saved. `pkp/pkp-lib#6148` is covered under Proposed fix.
- **Unrelated failures.** The Plugin Gallery's "fetch-grid" answered 500
  on each load of Settings › Website. That is a known failure of the
  test installs and has nothing to do with this report.
- **Not driven.** The site's own blocks: the dataset hosts one context,
  so Administration › "Site Settings" offers no "Plugins". Nor were
  MySQL, 3.4 or 3.3.
