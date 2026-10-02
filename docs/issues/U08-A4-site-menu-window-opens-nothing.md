# Site Settings › "Navigation": "Add Menu" and a menu's "Edit" open nothing and leave the page dimmed

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** script
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#12178` and `pkp/ui-library#766` for `pkp/pkp-lib#12177` · [e0a5aa2b02](https://github.com/pkp/pkp-lib/commit/e0a5aa2b022516952b6a39c926cfb2d914a86bf2), [eeebc65b](https://github.com/pkp/ui-library/commit/eeebc65bb643a58b385d4507a73e9874527bd948) · 2026-01-22 · Blesilda Biazon (blesildaramirez)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U08 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U08-navigation-menus-and-site-chrome.md#a4)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

On Administration › "Site Settings" › "Site Setup" › "Navigation", the
page's own script fails when the Site Administrator presses "Add Menu",
a menu's title or its "Edit". They expect the menu window that opens on a
journal's Navigation tab. Instead the page dims, no window opens, and
nothing on the page can be pressed until it is reloaded. A journal's own
Navigation tab works; the fault is the site's alone.

A site menu can still be removed, and the site's items added, edited and
removed. But no site menu can be added or renamed, given an area, or
have items put in, taken out or reordered, so the site's pages keep the
menus the installation placed. A site menu removed by mistake cannot be
put back on any screen.

The tab is hidden while the site hosts exactly one journal (press,
server).

## Impact

- **Lost**: no stored data. What is lost is control of the site's
  menus: a site menu cannot be added, renamed, placed in an area, or
  have its items put in, taken out or reordered. The site's items
  themselves can still be changed. The page visibly breaks, with no
  message.
- **Who**: the Site Administrator, when they change the menus of the
  site's own pages (the site's home page, its Login and Register
  pages). That is a rare task.
- **Way round**: none on screen. Off screen, short of editing the
  database, only the installer's default-menus step puts the site's
  "User Navigation Menu" back, and it runs at install and at the next
  upgrade.

Medium: there is no way round, and a site menu removed by mistake cannot
be put back, but the task is rare and the menus already in place keep
working. It would be high if site menus were changed routinely.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS). It holds one
  journal (press, server), `publicknowledge`, and the site's own "User
  Navigation Menu".
- A second journal (press, server), since the dataset holds one and
  the "Navigation" tab is hidden while there is exactly one. Steps 2–3
  create it.

1. Sign in as `admin` (password `admin`).
2. Administration › "Hosted Journals" ("Hosted Presses", "Hosted
   Servers") › "Create Journal" ("Create Press", "Create Server").
3. Fill in "Journal title" `Second Journal u08a`, "Journal initials"
   `u08a`, the principal contact's name and email
   (`u08a@mailinator.com`), "Country" "Canada" and "Path" `u08a`. Tick
   English, both as a language and as the primary one. Tick the box that
   makes the journal appear publicly, then press "Save". The new
   journal's settings wizard opens.
4. Administration › "Site Settings"
   (`/index.php/index/en/admin/settings`) › "Site Setup" › "Navigation".

Adding:

5. Under "Navigation", press "Add Menu".

Editing:

6. Reload the page and go back to "Site Setup" › "Navigation".
7. Press "User Navigation Menu", the title of the site's menu (or its
   row arrow, then "Edit").

**Expected**: each press opens the menu window, as it does on a
journal's Navigation tab. The window ("Add Menu" or "Edit") holds
"Title", "Active Theme Navigation Areas" offering "None", "primary" and
"user", and the "Assigned Menu Items" and "Unassigned Menu Items"
panels. "Save" stores the menu and shows "Navigation menu was
successfully added" ("… updated").

**Observed**: on each press the page dims and no window opens. A press
on "Add item" or anything else on the page does nothing until the page
is reloaded. The browser console shows:

```
TypeError: Cannot convert undefined or null to object
    at Object.keys (<anonymous>)
```

No request leaves the browser for the menu.

Control: on the journal's own tab (`publicknowledge` › Settings ›
Website › "Setup" › "Navigation"), "Add Menu" and "Primary Navigation
Menu" open the window with "None", "primary" and "user".

## Cause

The menu window's form reads the context's form languages, and a site
page carries none. The window
(`lib/ui-library/src/managers/NavigationMenuManager/useNavigationMenuManagerForm.js`)
builds its form with `initEmptyForm()` and no `locales`. `useForm.js`
`setLocales()` then falls back to `useApp().getSupportedFormLocales()`,
which returns `pkp.context.supportedFormLocales`, and passes it to
`Object.keys()`. `PKPTemplateManager::display()`
(`lib/pkp/classes/template/PKPTemplateManager.php`), which writes
`pkp.context`, sets `supportedFormLocales` only in its `if ($context)`
branch. On the site's pages the key is undefined, so the window's setup
throws before it mounts. The modal's overlay is already drawn and stays.
That branch has lacked the key since it was added for contexts
(`pkp/pkp-lib#11407`, 86f85a44aa, 2025-05-19); it was harmless until the
menu refactor put the first form that reads it on a site page.

Two more site gaps sit behind that one, both from the refactor, and the
window meets them as soon as it opens:

- `PKPNavigationMenuService::getAllMenuItems(int $contextId)` and
  `getUnassignedItems(int $contextId, …)` take an `int`, but the site's
  id is `PKPApplication::SITE_CONTEXT_ID`, which is `null` on `main`.
  "Add Menu" sends `GET /index.php/index/api/v1/navigationMenus/items`
  (`getAllItems()` → `getAllMenuItems()`), and "Edit" sends
  `GET …/navigationMenus/{id}/items` (`getItems()` →
  `getUnassignedItems()`). Both answer 500. Add's was seen with the
  first part of the fix alone: the window showed an "Error" window,
  "PKP\services\PKPNavigationMenuService::getAllMenuItems(): Argument
  #1 ($contextId) must be of type int, null given". Edit's is read in
  the code. The DAOs these methods call already take `?int`.
- Both windows also send `GET …/navigationMenus/areas`, and
  `PKPNavigationMenuService::getNavigationAreas($context)` returns `[]`
  when `$context` is null. So the site's window would offer "None"
  alone, although the method's docblock says null means the site.
  `ThemePlugin::isActive()` already reads the site's theme when there is
  no context.

The refactor moved the menu window from the legacy
`NavigationMenuForm`, which opened on the site and offered the site
theme's areas, to the Vue window and its API. The legacy class is still
in pkp-lib (`controllers/grid/navigationMenus/form/NavigationMenuForm.php`)
with no caller. The new controller handles the site (`$context?->getId()
?? SITE_CONTEXT_ID`, the grid's `index` API URL), but the site path was
never opened, and the Cypress tests added with it drive a journal
only.

Reach:

- The menus table's "Add Menu", a menu's title link and its "Edit" all
  open this one window (`NavigationMenusGridHandler`,
  `NavigationMenusGridCellProvider`, `NavigationMenusGridRow`). Checked
  on screen, all three apps.
- The items table on the same tab uses the legacy item form and works.
  Checked on screen, all three apps.
- The other ui-library forms that read
  `pkp.context.supportedFormLocales` (task templates, media files, file
  metadata, discussions, citations, reviewer details, contributor
  roles, the workflow's version form, the author's response) open only
  inside a context. Checked in code: none of them is mounted on a site
  page today, but each would fail the same way there.
- The journal's own window is unchanged. Checked on screen with the fix
  in and out.

## Proposed fix

A proposal; the team decides. The fix makes the site's pages and the
menu API serve the site as the code already intends, in pkp-lib alone
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/site-menu-window-opens-nothing/fix.diff)):

1. `PKPTemplateManager::display()`, the site branch of `pkp.context`: write
   `supportedFormLocales` from the site's languages, beside
   `supportedLocales`. The site's own settings forms use the same list
   (`AdminHandler::settings()`, `$site->getSupportedLocaleNames()`).

   ```php
   'supportedFormLocales' => !PKPSessionGuard::isSessionDisable() ? $request->getSite()->getSupportedLocaleNames() : [],
   ```

   `Site::getSupportedLocaleNames()` keeps its first result in a static
   and ignores the format asked for after that. So here it returns the
   names in the format of the `supportedLocales` call just before it
   (`LANGUAGE_LOCALE_ONLY`). The keys, which are what the form uses, are
   the same either way.

2. `PKPNavigationMenuService::getAllMenuItems()` and
   `getUnassignedItems()`: `?int $contextId`, as in
   `NavigationMenuDAO` and `NavigationMenuItemDAO`.
3. `PKPNavigationMenuService::getNavigationAreas()`: drop the
   `if ($context)` guard and let `ThemePlugin::isActive()` pick the
   site's theme, as the legacy form did.

Tried on `main` on all three apps. The window opened on "Add Menu" with
"None", "primary" and "user". "Site menu u08a" saved with "Navigation
menu was successfully added" and showed in the table. "User Navigation
Menu" opened with its items, and nothing failed in the page or on the
server. As a neighbour check, the journal's "Add Menu" and "Primary
Navigation Menu" windows read the same with the fix in and out.

The fix goes in the writer of `pkp.context`, not in its readers, so that
every Vue form opened on a site page gets the site's languages.

**Alternatives**:

- Default `setLocales()` in `useForm.js` to `{}` when the key is
  missing. That is a reader-side guard: it stops the crash, but a site
  form then has no languages, and the 500 and the empty area list stay.
- Pass `locales` from `useNavigationMenuManagerForm.js` only. That is a
  workaround for one window, and it leaves the server side unfixed.
- Cast `(int)` in the controller. That would turn the site's `null` into
  `0` and work through `COALESCE(context_id, 0)`, but it goes against
  the `?int` the DAOs use for the site.

**What goes with it**:

- No stored data is wrong, so no repair is needed.
- No backport: 3.5 and older keep the legacy form.
- Optional: a fallback in `useForm.js` `setLocales()` (`{}` when the key
  is missing), as a guard beside the writer-side fix, not instead of
  it. The menu window has no multilingual field, so it does not need
  the site's languages.
- Optional: delete the unused legacy
  `controllers/grid/navigationMenus/form/NavigationMenuForm.php`.
- A test: a site-level case in the Cypress navigation menu test that
  `pkp/pkp-lib#12178` added (create a second context, then "Add Menu"
  and "Edit" on Site Settings › "Navigation"), or the matching e2e
  scenario here.

Small: about ten lines in two pkp-lib files, following the site branch's
and the DAOs' own patterns, and a test.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/site-menu-window-opens-nothing/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/site-menu-window-opens-nothing/lib.js).
  It takes Steps 1–7 on each app and reads each press: whether the
  window opened, what covers the page, whether "Add item" still takes a
  press, and the script errors. With `neighbour` as its argument it
  opens the journal's own window instead. Run from a pkp-e2e checkout on
  a freshly loaded dataset install:
  `node bin/probe.js all shared/playwright/checks/issues/site-menu-window-opens-nothing/walk.js`.
- The fix trial: `node bin/try-fix.js apply …/fix.diff ojs omp ops`, the
  dataset reloaded, the walk and the neighbour check, then `revert`.
- Tips: `main`: OJS b84f8e2e44 (pkp-lib ddd8ab243a, ui-library
  64d67363), OMP 3b0ecf794c and OPS c8af945bb7 (pkp-lib 3dc90c81a6,
  ui-library 280f98c5). `stable-3_5_0`: OJS 091fb65453, OMP 9c5e24246c,
  OPS 38b61882d3 (pkp-lib cf3f984335). `stable-3_4_0`: pkp-lib
  9e41f10273; OJS c1827e3527, OMP 0aec65441, OPS acd8ae704b.
  `stable-3_3_0`: pkp-lib ac3fa73402; OJS ac77c9fb35, OMP 8e72fc883,
  OPS c5532e2161 (the form is pkp-lib's in all three). Dataset: pkp/datasets e8dafbc (2026-10-02),
  PostgreSQL.
- 3.5, walked on all three apps: "Add Menu" and "User Navigation Menu"
  open the legacy `NavigationMenuForm` with "None", "primary" and
  "user"; "Site menu u08a" saved with "Navigation menu was successfully
  added". The code read matches: the grid opens an `AjaxModal` on
  `addNavigationMenu`/`editNavigationMenu`, and the form loads the
  active theme's areas whatever the context.
- 3.4 and 3.3, by code: `lib/pkp` `stable-3_4_0`
  `controllers/grid/navigationMenus/NavigationMenusGridHandler.php` and
  `form/NavigationMenuForm.php`, and `stable-3_3_0` `….inc.php`, have
  the same `AjaxModal` and legacy form, with no Vue window. Not walked
  (not asked for).
- Introduced: `git blame` on `getNavigationAreas()`, `getAllMenuItems()`
  and `getUnassignedItems()` gives e0a5aa2b02. `git log` on
  `useNavigationMenuManagerForm.js` gives eeebc65b as its first commit.
  `git blame` on the `supportedFormLocales` line of
  `PKPTemplateManager::display()` gives 86f85a44aa.
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/ui-library searched for "site
  navigation menu", "Add Menu", `supportedFormLocales`,
  `getNavigationAreas`, `getAllMenuItems`, `NavigationMenuManager`.
- Way round, by code and not run: `Installer::installDefaultNavigationMenus()`
  runs from `dbscripts/xml/install.xml` and, ungated, from
  `upgrade.xml`. Through `NavigationMenuDAO::installSettings()` it
  creates the site's "User Navigation Menu" when no site menu holds the
  "user" area.
- Unverified: MySQL not checked (the fault is in PHP types and the
  page's script, not in a query).
