# Menu window marks "Subscriptions" and "My Subscriptions" items with no eye, so their notices never show

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#12178` for `pkp/pkp-lib#12177` · [e0a5aa2b02](https://github.com/pkp/pkp-lib/commit/e0a5aa2b022516952b6a39c926cfb2d914a86bf2) · 2026-01-22 · Blesilda Biazon (blesildaramirez)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U08 [OJS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U08-navigation-menus-and-site-chrome.md#ojs1)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

On a journal's Settings › Website › "Setup" › "Navigation", a menu's
"Edit" window marks each item that shows on the site only under a
condition with a crossed-out eye. Pressing the eye opens a "Notice"
that names the condition. "Subscriptions" and "My Subscriptions" carry
no eye, so their notices cannot be opened.

"Subscriptions" shows only while payments are enabled with a currency
and a payment method set. "My Subscriptions" needs that too, and also a
signed-in visitor and a "Publishing Mode" that requires a subscription.
A manager who adds either item to a menu and does not find it in the
journal's header gets no hint in the window. On 3.5 the "Edit" window,
an older one, shows the eye on both items.

## Impact

- **Lost**: no data or work; only the hint that explains a missing
  header link.
- **Who**: journal managers who add a "Subscriptions" or "My
  Subscriptions" item to a menu. Neither item is in a new journal's
  menus.
- **Way round**: none in the window. The settings are on Settings ›
  Distribution: "Payments", and "Publishing Mode" on "Access".

Low: the items show and hide as set; only the explanation is missing.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`; journal `publicknowledge`.
  Its menus hold no "Subscriptions" or "My Subscriptions" item, so the
  steps add one of each. Payments stay off, as in the dataset.

Steps:

1. Sign in as `rvaca` (Journal manager).
2. Open Settings › Website, the "Setup" tab, its side tab "Navigation"
   (`/index.php/publicknowledge/en/management/settings/website#setup/navigationMenus`).
3. Under "Navigation Menu Items" press "Add item". In "Navigation Menu
   Type" choose "Subscriptions"; "Title": `Subscriptions u08q`. Press
   "Save".
4. Press "Add item" again. Choose "My Subscriptions"; "Title": `My
   Subscriptions u08q`. Press "Save".
5. In the "Navigation" table press "Primary Navigation Menu". Its
   "Edit" window opens.
6. In "Unassigned Menu Items" look for an icon beside "Subscriptions
   u08q" and "My Subscriptions u08q".
7. In "Assigned Menu Items" press the crossed-out eye beside
   "Announcements"; read the "Notice"; press "OK".
8. Press "Cancel".

**Expected.** In step 6 both items carry the crossed-out eye, like
"Register", "Login" and the other items of that panel that show only
under a condition. Pressed, it opens:

```
Subscriptions u08q     Notice: This link will only be displayed if payments are enabled
                       under Settings > Distribution > Payments.
My Subscriptions u08q  Notice: This link will only be displayed when a visitor is logged in.
```

**Observed.** In step 6 neither item has any icon; every other item of
"Unassigned Menu Items" except "Search" carries the eye. Step 7 works:

```
Notice: This link will only be displayed if you have enabled announcements under
Settings > Website.
```

## Cause

The "Edit" window of 3.6 reads its items from the navigation menus API.
The ui-library's `MenuTreeItem.vue` shows the eye when an item has a
`conditionalWarning`. The API sets that field in
`NavigationMenuItemResource::getItemConditionalInfo()` (lib/pkp
`classes/navigationMenu/resources/NavigationMenuItemResource.php`, line
95). It copies the field from the item's type, in the list that
`app(PKPNavigationMenuService::class)->getMenuItemTypes()` returns.

`app(PKPNavigationMenuService::class)` asks the container for the
pkp-lib class itself. Nothing binds that class name, so Laravel builds a
new, bare `PKPNavigationMenuService`. Each application registers its own
subclass as the singleton `navigationMenu` (OJS
`classes/core/AppServiceProvider.php`: `new NavigationMenuService()`).
Only that subclass's constructor adds the application's item types,
through the `NavigationMenus::itemTypes` hook.

On a page request, `PKPTemplateManager::initialize()` builds
`navigationMenu` (line 368, inside the `PKPPageRouter` check of line
282), so the hook is in place and the bare service sees every type. An
API request never builds it. There `getMenuItemTypes()` returns
pkp-lib's types alone, without OJS's `NMI_TYPE_SUBSCRIPTIONS` and
`NMI_TYPE_MY_SUBSCRIPTIONS`, the only application types with a
`conditionalWarning`. Their items get no `conditionalWarning`, and so no
eye.

The API came with the drag-and-drop rewrite of the window. The older
window (`NavigationMenuForm::fetch()`) read the types from
`app()->get('navigationMenu')`, as every other caller does:
`PKPTemplateManager`, `NavigationMenuItemHandler`,
`NavigationMenuForm::initData()`, `PKPNavigationMenuItemsForm` (the "Add
item" window, which offers both types on main) and the grid cell
providers.

Reach:

- The eight `app(PKPNavigationMenuService::class)` calls are all in the
  new API: the three in `NavigationMenuItemResource` and the five in
  `PKPNavigationMenuController` (code).
- The `itemTypes` list those API responses return also lacks each
  application's types: OJS's "Current Issue", "Archives" and the two
  subscription types, OMP's "Catalog", "New Releases", "Series" and
  "Category", OPS's "Archives" (code). The window does not read that
  list (code).
- OMP and OPS show no symptom: none of their own types has a notice. On
  screen, no item of their two installed menus changed its icons with
  the fix.
- Plugins add their types from their own `register()` through the same
  hook, which runs in every request, so their types arrive (code).

## Proposed fix

A proposal: bind the pkp-lib class name to the application's
`navigationMenu` singleton in pkp-lib's `AppServiceProvider::register()`,
as the same method already does for `PKPSchemaService` and `schema`.
Every `app(PKPNavigationMenuService::class)` call, and any class that
asks for the service by type, then gets the application's own service.
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-menu-items-no-eye/fix.diff)
(against the application root, the same for OJS, OMP and OPS):

```diff
--- a/lib/pkp/classes/core/AppServiceProvider.php
+++ b/lib/pkp/classes/core/AppServiceProvider.php
@@ -24,6 +24,7 @@
 use PKP\services\PKPFileService;
+use PKP\services\PKPNavigationMenuService;
 use PKP\services\PKPSchemaService;
@@ -48,6 +49,9 @@
         $this->app->singleton(PKPSchemaService::class, fn ($app) => $app->get('schema'));
 
+        // The application's own navigation menu service, which adds its item types through hooks
+        $this->app->singleton(PKPNavigationMenuService::class, fn ($app) => $app->get('navigationMenu'));
+
```

The binding is resolved lazily, after each application's provider has
registered `navigationMenu`, which builds its service with `new`, so the
two cannot loop. Tried on `main`: with it, the Steps show the eye on
both items and the two notices of Expected. On the dataset's own
"Primary Navigation Menu" and "User Navigation Menu", every item kept
the same icons and icon texts in both panels with the fix and without
it, on OJS, OMP and OPS.

**Alternatives**

- Replace the eight calls with `app()->get('navigationMenu')`, the form
  every older caller uses: the same result in two files, but the next
  caller that asks for the class by name meets the same fault.
- Register the hooks somewhere other than the subclass's constructor:
  a larger change in three applications for the same result.

**What goes with it**

- Once the eye shows, "My Subscriptions" reads OJS's own English text
  (OJS `locale/en/manager.po`), which names only the sign-in, not the
  payments and "Publishing Mode" conditions that pkp-lib's text for the
  same key names. Its wording is left to the report on the notices'
  wording ([pkp-e2e#637](https://github.com/jardakotesovec/pkp-e2e/issues/637)).
- The guard: an e2e check that adds a "Subscriptions" item on a journal
  and finds the eye and its notice in the "Edit" window (a Planned item
  in the U08 spec).

Small: a single line in one pkp-lib file, tried, plus the e2e check.

## Evidence


- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-menu-items-no-eye/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-menu-items-no-eye/lib.js)
  (which reuses the menu window helpers of
  `menu-notices-wrong-settings-places/lib.js`). It takes the Steps as
  `rvaca` on an install freshly loaded from the default dataset
  (pkp/datasets e8dafbc, 2026-10-02, PostgreSQL), on OJS `main` and
  `stable-3_5_0`. From a pkp-e2e checkout:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/subscription-menu-items-no-eye/walk.js`.
  With `neighbour` as the argument (and `all` for the apps) it reads
  every item's icons in both panels of the two installed menus' windows
  and changes nothing; it ran with the fix applied (`node bin/try-fix.js
  apply <fix.diff> ojs omp ops`) and without. No request failed and no page script
  failed.
- Tips: `main` OJS b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
  64d67363), OMP 3b0ecf794c and OPS c8af945bb7 (lib/pkp 3dc90c81a6,
  lib/ui-library 280f98c5); `stable-3_5_0` OJS 091fb65453 (lib/pkp
  cf3f984335); `stable-3_4_0` OJS c1827e3527, lib/pkp 9e41f10273;
  `stable-3_3_0` OJS ac77c9fb35, lib/pkp ac3fa73402.
- Code reads: `main` lib/pkp `NavigationMenuItemResource.php` (lines
  52–110), `PKPNavigationMenuController.php` (lines 110–270),
  `PKPNavigationMenuService::getMenuItemTypes()`,
  `getAssignedItemsTree()`, `getUnassignedItems()` and
  `getAllMenuItems()`, `classes/core/AppServiceProvider.php`; ui-library
  `NavigationMenuEditor/MenuTreeItem.vue` and a search of
  `src/components/NavigationMenuEditor/` for `itemTypes`; each
  application's `classes/services/NavigationMenuService.php` and
  `classes/core/AppServiceProvider.php`; a search of lib/pkp and the
  three applications' `plugins/` for `NavigationMenus::itemTypes`. 3.5:
  lib/pkp `NavigationMenuForm.php` (line 99) and
  `navigationMenuForm.tpl`, which read the types from
  `app()->get('navigationMenu')`. 3.4: lib/pkp `NavigationMenuForm.php`
  and `navigationMenuForm.tpl`, OJS `NavigationMenuService.php` and
  `OJSServiceProvider.php`, which read them from
  `Services::get('navigationMenu')`, OJS's own service; 3.3 the same
  files under their `.inc.php` names.
- `main` lib/pkp `PKPTemplateManager::initialize()` (lines 282 and
  368), `NavigationMenuItemHandler.php` (line 73),
  `NavigationMenuForm::initData()` (line 99); OJS
  `NavigationMenuService::getDisplayStatusCallback()` and
  `OJSPaymentManager::isConfigured()` for the two items' conditions.
- Introduced: `git blame` on `NavigationMenuItemResource.php` line 95
  and `PKPNavigationMenuController.php` line 115 gives e0a5aa2b02, the
  commit that created both files; the GitHub API's `commits/<sha>/pulls`
  gives `pkp/pkp-lib#12178`, authored by blesildaramirez.
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/ui-library searched for the
  symptom's words (navigation menu, subscriptions, eye, conditional
  warning) and for `NavigationMenuItemResource`,
  `PKPNavigationMenuService` and `pkp/pkp-lib#12177`. The nearest,
  `pkp/pkp-lib#12295` (follow-up enhancements to the new window), is
  about dragging, not the icons.
- Not driven: 3.4 and 3.3 (code); OMP and OPS have neither type. The
  journal's public header was not read in this walk: that the two items hide
  while their conditions are unmet and show once they are met is
  `NavigationMenuService::getDisplayStatusCallback()` (OJS, code), and
  was seen on screen on 2026-09-23 (the U08 spec's
  [note m](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U08-navigation-menus-and-site-chrome.md#fn-m)).
  Unverified: the notices' texts in languages other than English.
