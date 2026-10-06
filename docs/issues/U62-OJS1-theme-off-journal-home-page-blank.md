# With its theme switched off, a journal's home page comes up blank for every visitor

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code; no such handler call, but its own unguarded call in the home page template)
- **Introduced** no PR (pushed to `main`), for `pkp/pkp-lib#9295` · [9486d8e182](https://github.com/pkp/ojs/commit/9486d8e182356a101a018450ea2073c747addbaa) · 2025-06-26 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U62 [OJS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U62-plugins-management.md#ojs1)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

After the theme a journal uses is unticked in the Plugins list, the
journal's home page should show its content unstyled, as its other pages
do. Instead the server fails and the page comes up blank, so readers who
arrive at the journal see nothing. On a press and a preprint server the
home page shows unstyled like the rest.

The journal manager is told only that the plugin was disabled, and the
page stays blank until the theme is ticked again. The same blank page
follows when the theme chosen for the journal cannot be loaded, as when
its folder is gone.

## Impact

- **Lost**: the journal's home page, for every visitor, signed in or not.
  The other public pages ("Current", "Archives", "About the Journal", the
  articles) still open, unstyled.
- **Who**: readers of a journal whose theme is switched off (the Plugins
  list allows it) or whose chosen theme cannot be loaded. An upgrade by
  itself does not switch a theme off: it keeps the journal's choice and
  the theme's tick. After an upgrade the theme cannot be loaded only when
  its folder is gone, or when its old code fails while loading, which the
  application logs and skips.
- **Way round**: the journal manager ticks the theme again under "Theme
  Plugins" (or, for a missing theme, installs it or picks another under
  Settings › Website › "Appearance" › "Theme"); the home page then works
  at once.

Medium: the journal's home page fails outright for everyone, but only
while its theme is switched off or cannot be loaded, and the manager can
undo that on screen.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (`publicknowledge`, "Journal of
  Public Knowledge", which uses "Default Theme").

Steps:

1. Sign in as `rvaca` (Journal manager).
2. Open Settings › Website and its "Plugins" tab
   (`/index.php/publicknowledge/management/settings/website`).
3. Under "Theme Plugins", untick the "Enabled" box of "Default Theme".
4. In the window "Are you sure you want to disable this plugin?", press
   "OK". The notice reads "The plugin "Default Theme" has been disabled."
5. Open the journal's home page, `/index.php/publicknowledge`.

**Expected**: the home page shows unstyled, as the other pages do: the
journal's name, the menu, and under "Current Issue" "Vol. 1 No. 2
(2014)" with its articles.

**Observed**: the page is blank. The request answers 500 with an empty
body, and the server log reads:

```
PHP Fatal error:  Uncaught Error: Call to a member function getOption() on null in pages/index/IndexHandler.php:71
[500]: GET /index.php/publicknowledge/en - Uncaught Error: Call to a member function getOption() on null in pages/index/IndexHandler.php:71
```

"About the Journal" (`/index.php/publicknowledge/about`) shows unstyled
with no error, and the same steps on OMP and OPS `main` leave their home
pages unstyled and working.

## Cause

`PKPTemplateManager::initialize()` assigns `activeTheme` from the theme
plugins that are loaded, and only enabled themes are loaded. A theme whose
code fails while loading is logged and skipped
(`PluginRegistry::instantiatePlugin()` and `register()`). When the
context's `themePluginPath` names a theme that is switched off, not
installed or skipped, `activeTheme` is `null`. That is a supported state: for
`pkp/pkp-lib#11396` ("PHP fatal error after upgrade when the current
theme plugin is missing") the frontend templates were made to check
`{if $activeTheme && …}`, with the stated rule that the site keeps
working, unstyled, until a theme is chosen
([5134be4e9c](https://github.com/pkp/ojs/commit/5134be4e9cb4da046b090b4b9f64f1a768e7c7b7),
2025-05-27).

OJS `IndexHandler::index()` (`pages/index/IndexHandler.php`, line 71)
breaks that rule:

```php
$activeTheme = $templateMgr->getTemplateVars('activeTheme');
$journalContentOptions = $activeTheme->getOption('journalContentOrganization');
```

The call came in
[9486d8e182](https://github.com/pkp/ojs/commit/9486d8e182356a101a018450ea2073c747addbaa),
which added the journal's home page content options (latest
publications, categories, the issue's contents) for continuous
publication, `pkp/pkp-lib#9295`. It reached `main` a month after the
template guard. A later fix for
themes that lack the option, `pkp/pkp-lib#11844`
([73be178a59](https://github.com/pkp/ojs/commit/73be178a59bdce2b1e381a7249a4b3528bbe153a)),
added the fallback to `JournalContentOption::default()` for a non-array
value but kept the call on the theme itself, so it still fails when
there is no theme.

Reach:

- A chosen theme that is not installed: `activeTheme` is `null` the same
  way (checked in the code, `PKPTemplateManager::initialize()`; not
  walked, since that means removing a plugin folder).
- The other readers of `activeTheme`: every frontend template in OJS, OMP
  and OPS checks it first, and OMP's and OPS's index handlers do not read
  it (checked in the code). The context and site API controllers look
  the theme up themselves and check their own copy for `null` (checked
  in the code).
- The site's own home page (no journal in the address) skips this
  branch (checked in the code).

## Proposed fix

Read the option through the null-safe operator, so a journal without a
loaded theme takes the default content options that the next line
already provides for a theme without the option
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/theme-off-journal-home-page-blank/fix.diff)):

```diff
--- a/pages/index/IndexHandler.php
+++ b/pages/index/IndexHandler.php
@@ -68,7 +68,7 @@
 
         if ($journal) {
             $activeTheme = $templateMgr->getTemplateVars('activeTheme');
-            $journalContentOptions = $activeTheme->getOption('journalContentOrganization');
+            $journalContentOptions = $activeTheme?->getOption('journalContentOrganization');
             if (!is_array($journalContentOptions)) {
                 $journalContentOptions = JournalContentOption::default($journal);
             }
```

This is the guard the templates already use (`$activeTheme && …`), at
the one PHP reader that lacks it; it keeps what `pkp/pkp-lib#9295` and
`pkp/pkp-lib#11844` built (the theme's choice when there is a theme, the
default otherwise). Tried on `main`: with the fix, step 5 shows the home
page unstyled with "Current Issue", "Vol. 1 No. 2 (2014)" and its
articles, and no error. With the theme left on, the home page read the
same with the fix in and out (style sheets, headings, articles).

**Alternatives**:

- Refuse to switch off the theme in use (spec question U62 A8): a product
  decision, and it leaves the missing-theme case failing.
- Fall back to "Default Theme" when the chosen one is unavailable (raised
  in `pkp/pkp-lib#9794`): a behaviour change that `pkp/pkp-lib#11396`
  chose against.
- Move the option to `ThemePlugin` (suggested in `pkp/pkp-lib#11844`):
  helps other themes, not a journal without one.

**What goes with it**: nothing stored is wrong, so no repair. No backport:
3.5 and 3.4 do not have the call. A regression test: a journal's home
page with its theme unticked answers 200 and shows its current issue.

Small: one operator in one handler, following the templates' pattern,
and a regression test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/theme-off-journal-home-page-blank/walk.js),
  takes the Steps on an install reset to the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/theme-off-journal-home-page-blank/walk.js`
  (add `neighbour` for the control run with the theme left on). To try
  the fix: `node bin/try-fix.js apply shared/playwright/checks/issues/theme-off-journal-home-page-blank/fix.diff ojs`.
- Walked on `main` (OJS, OMP, OPS) and `stable-3_5_0` (OJS, OMP, OPS),
  each on PostgreSQL, loaded from pkp/datasets c657990 (2026-10-01). OJS
  `stable-3_5_0`'s `IndexHandler` has no theme read.
- Tips: OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
  64d67363), OMP `main` 3b0ecf794, OPS `main` c8af945bb7 (lib/pkp
  3dc90c81a6 for both); OJS `stable-3_5_0` 091fb65453, OMP 9c5e24246,
  OPS 38b61882d3 (lib/pkp cf3f984335); OJS `stable-3_4_0` 75cc2d488b
  (lib/pkp 32b0f4b4af); OJS `stable-3_3_0` ac77c9fb35 (lib/pkp
  f6ab331645).
- 3.4 (code): `pages/index/IndexHandler.php` reads no theme option, and
  `templates/frontend/pages/indexJournal.tpl` carries the
  `pkp/pkp-lib#11396` guard (bbc18b80b5).
- 3.3 (code): `pages/index/IndexHandler.inc.php` reads no theme option,
  so this fault is absent. But `templates/frontend/pages/indexJournal.tpl`
  calls `$activeTheme->getOption('useHomepageImageAsHeader')` without a
  check (the `pkp/pkp-lib#11396` guard was not backported to 3.3), so the
  journal home page with no loaded theme very likely fails there too, for
  that older reason. Not walked; unverified.
- Introduced: `git blame` on line 71 gives 73be178a59 (`pkp/ojs#5117`,
  for `pkp/pkp-lib#11844`), which only moved the call into a variable;
  9486d8e182 wrote it.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library for the
  symptom ("theme disabled home page", "getOption() on null", "disable
  active theme") and the code (`activeTheme`, `journalContentOrganization`).
  `pkp/pkp-lib#11396` (closed 2025-05-27) is the same blank page from the
  home page template when the chosen theme is missing, fixed in the
  templates only; `pkp/pkp-lib#12006` (closed) the same error message
  from a template after a 3.4 upgrade with an outdated theme;
  `pkp/pkp-lib#11844` (closed) a theme without the option. None covers a
  missing or disabled theme in `IndexHandler`.
- Upgrade (code): `Installer::addPluginVersions()` only records plugin
  versions, so an upgrade leaves the theme's tick and the journal's
  `themePluginPath` as they were. Since `pkp/pkp-lib#10514`,
  `PluginRegistry::instantiatePlugin()` and `register()` log and skip a
  plugin that throws.
- Unverified: whether third-party themes at their 3.5 versions throw
  while loading on `main`, which would make this page fail after an
  ordinary upgrade until the theme is updated (no such theme was
  installed or read).
- MySQL not checked (the fault does not touch the database).
