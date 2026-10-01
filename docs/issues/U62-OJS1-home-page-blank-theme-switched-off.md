# A journal's home page comes up blank for every visitor once its theme plugin is switched off

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: OJS, OMP (code; sites fail today: the home page template makes the same call, and the `pkp/pkp-lib#11396` fix reached 3.4 and later only)
- **Introduced** `pkp/ojs` commit for `pkp/pkp-lib#9295` (no PR found) · [9486d8e182](https://github.com/pkp/ojs/commit/9486d8e182356a101a018450ea2073c747addbaa) · 2025-05-27 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-01); `pkp/pkp-lib#11396` (closed, fixed) was the same blank home page in the home page template, and that fix does not cover the PHP call that fails now
- **Tracked in** spec U62 [OJS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U62-plugins-management.md#ojs1)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

After the theme a journal uses is unticked, the journal's home page
should show its content unstyled, as its other pages do. Instead the
server fails and the page comes up blank, so readers who arrive at the
journal see nothing.

The journal manager is told only that the plugin "has been disabled",
and nothing warns that the home page is down.

## Impact

- **Lost**: the journal's home page, until a manager notices. The
  other public pages still work.
- **Who**: readers of a journal whose manager unticked the theme in use
  under "Theme Plugins". That is not ordinary use, but the Plugins list
  lets a manager untick the theme in use with the same "Disable" window
  as any other plugin.
- **Way round**: a journal manager ticks the theme again in Settings ›
  Website › "Plugins", and the home page comes back.

Medium: the journal's front page fails outright for everyone, but only
in a rarely met state, and a manager can undo it on screen. It would be
high if journals met it in ordinary use, since nothing tells the
manager the home page is down.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`. The journal `publicknowledge`
  uses "Default Theme".

Steps:

1. Sign in as `rvaca` (Journal manager).
2. Open Settings › Website and the "Plugins" tab
   (`/index.php/publicknowledge/en/management/settings/website`).
3. Under "Theme Plugins", untick "Default Theme".
4. In the "Disable" window ("Are you sure you want to disable this
   plugin?") press "OK". The notice reads "The plugin "Default Theme"
   has been disabled."
5. Open the journal's home page, `/index.php/publicknowledge`, signed in
   or in a private window.
6. Open "About the Journal", `/index.php/publicknowledge/about`.

**Expected:** step 5 shows the home page without styling: the journal's
name, the menus and "Current Issue" with "Vol. 1 No. 2 (2014)" and its
articles, as step 6 shows "About the Journal" without styling.

**Observed:** step 5 answers HTTP 500 with an empty page, signed in and
as a visitor. The server log:

```
PHP Fatal error:  Uncaught Error: Call to a member function getOption() on null in …/pages/index/IndexHandler.php:71
GET /index.php/publicknowledge/en - Uncaught Error: Call to a member function getOption() on null in …/pages/index/IndexHandler.php:71
```

Step 6 shows "About the Journal" unstyled, with no error. The same steps
on OMP and OPS `main` (Public Knowledge Press, Public Knowledge Preprint
Server) show the home page unstyled.

## Cause

`APP\pages\index\IndexHandler::index()` (OJS, `pages/index/IndexHandler.php`,
lines 70–71) reads the home page's content layout from the active theme:

```php
$activeTheme = $templateMgr->getTemplateVars('activeTheme');
$journalContentOptions = $activeTheme->getOption('journalContentOrganization');
```

`activeTheme` is assigned in `PKPTemplateManager::initialize()`, which
looks for the journal's `themePluginPath` among the loaded theme plugins
and assigns `null` when none matches. A disabled theme is not loaded,
so `activeTheme` is `null` and line 71 throws. Nothing on the way stops a
manager from disabling the theme in use (`PluginGridHandler::disable()`
does not check it).

`pkp/pkp-lib#11396` already set the rule that the active theme may be
missing: it guarded every `$activeTheme->getOption()` in the frontend
templates with `$activeTheme &&` (OJS 5134be4e9c on `main`, backported
to 3.4 and 3.5). Commit 9486d8e182 (`pkp/pkp-lib#9295`, the journal
content organization options) added the first read of the theme in PHP
on the home page path without that guard, on 2025-05-27, the day the
`#11396` guard landed.
73be178a59 (`pkp/ojs#5117`, for `pkp/pkp-lib#11844`, a theme without the
option) added the `is_array()` fallback to the default options, but
kept the unguarded call.

Reach:

- The other readers of the `activeTheme` template variable on `main`
  (checked in the code, all three apps): the frontend templates all
  test `$activeTheme &&` first.
- A theme whose plugin folder is missing (a third-party theme not
  reinstalled after an upgrade) is not registered either, so the home
  page fails the same way (code only; the case `#11396` reported).
- Saving Settings › Website › "Appearance" › "Theme" in the same state
  fails too, from another call: `PKPContextController::editTheme()`
  (pkp-lib, line 505) and `PKPSiteController::editTheme()` (line 214)
  look the theme up among the enabled themes and call
  `validateOptions()` on the result with no `null` check
  (`getTheme()` checks). On OJS `main` "Save" there answered 500,
  `{"error":"Call to a member function validateOptions() on null"}`,
  with the notice "An unexpected error has occurred. Please reload the
  page and try again."; the journal's theme setting stayed
  "default". That needs its own fix in pkp-lib (refuse the save with a
  message), so it is not part of this report.
- OMP and OPS: their `IndexHandler` does not read the theme (checked in
  the code and on screen).
- The site's home page (no journal in the address) does not take this
  branch (checked in the code).

## Proposed fix

Treat a missing theme like a theme without the option, so the
`is_array()` fallback that is already there picks the default layout.
The diff is [fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/home-page-blank-theme-switched-off/fix.diff):

```diff
             $activeTheme = $templateMgr->getTemplateVars('activeTheme');
-            $journalContentOptions = $activeTheme->getOption('journalContentOrganization');
+            $journalContentOptions = $activeTheme?->getOption('journalContentOrganization');
             if (!is_array($journalContentOptions)) {
                 $journalContentOptions = JournalContentOption::default($journal);
             }
```

It follows the `pkp/pkp-lib#11396` pattern (check for a theme before
reading an option), and keeps the theme's choice when there is a theme.
It also covers a theme whose plugin folder is missing. With the
fix in, step 5 showed the home page unstyled with "Current Issue" and
"Vol. 1 No. 2 (2014)", and with "Default Theme" ticked again the home
page was styled and its text identical to the page before step 3.

**Alternatives:**

- Refuse to disable the theme in use on the Plugins list. That is the
  product question in spec U62 A8, and it would not cover a theme whose
  files are missing, so the home page still needs the guard.
- Make `PKPTemplateManager` fall back to the default theme when the
  active one is missing. A wider change to theme loading, for a fault
  in one handler.

**What goes with it:**

- No stored data to repair, and no change for an API client or plugin.
- Nothing to backport to 3.5 or 3.4. 3.3 would need the `#11396`
  template guard, if 3.3 is still patched.
- A test: a unit test of `IndexHandler::index()` with no active theme,
  or an e2e case beside spec U62 Rule 12 that disables the theme and
  opens the home page.

Small: one line in one file, following a guard the templates already
use, tried as written.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/home-page-blank-theme-switched-off/walk.js),
  run on an install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/home-page-blank-theme-switched-off/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It takes steps 1–6,
  then ticks "Default Theme" again and reopens the home page as a
  visitor, to show the fix leaves the themed page unchanged, recording each page's status, style
  sheets, text and server log lines.
- Walked on `main` (OJS, OMP, OPS) without and with the fix (OJS), and
  on `stable-3_5_0` (OJS, OMP, OPS), on PostgreSQL. 3.5: every home page
  answered 200 unstyled with the theme off; OJS showed "Vol. 1 No. 2
  (2014)".
- Branch tips: OJS `main` bade233f73 (pkp-lib 2e377d27fc), OMP `main`
  3b0ecf794, OPS `main` c8af945bb7 (pkp-lib 3dc90c81a6); OJS 3.5
  92b9a16b48 (pkp-lib a9c76aed62), OMP 3.5 3081c9b00, OPS 3.5
  cf4fce69bd; OJS 3.4 9571d8fde7 (pkp-lib df13621c2d); OJS 3.3
  9fdb9bcf9a (pkp-lib d446601ebe), OMP 3.3 8e72fc883.
- Code reads: 3.5 and 3.4 `templates/frontend/pages/indexJournal.tpl`
  (guarded since the `#11396` backports 626b134b01 on 3.5 and
  bbc18b80b5 on 3.4) and `pages/index/IndexHandler.php`. 3.3
  `templates/frontend/pages/indexJournal.tpl` lines 25 and 32 (OJS) and
  OMP's `templates/frontend/pages/index.tpl` line 25 call
  `$activeTheme->getOption()` unguarded, and 3.3's
  `PKPTemplateManager.inc.php` assigns `null` when no loaded theme
  matches; `#11396` is not on `stable-3_3_0`. OPS 3.3's home page
  template does not read the theme.
- Introduced: `git blame` on line 71 gives 73be178a59 (`pkp/ojs#5117`),
  which only moved the call out of the `in_array()` tests; the call
  itself, unguarded, came with 9486d8e182, which the GitHub API links to
  no pull request (it sits on `main`'s first-parent line).
  `pkp/pkp-lib#12006` (closed as not planned) shows the same error on
  3.4.0-9, before the `#11396` fix reached 3.4.
- The theme save:
  [theme-save.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/home-page-blank-theme-switched-off/theme-save.js),
  walked on OJS `main` only; OMP and OPS share the pkp-lib code.
- Unverified: the missing-plugin case (a theme folder removed) was read
  in the code, not walked. 3.3 and 3.4 were not walked.
