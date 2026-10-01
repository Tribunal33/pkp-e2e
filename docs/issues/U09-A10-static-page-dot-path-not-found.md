# A static page or custom page whose "Path" has a "." in its first two parts answers "404 Not Found"

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP (static pages and custom pages), OPS (custom pages)
  - 3.5: OJS, OMP (static pages and custom pages), OPS (custom pages)
  - 3.4: OJS, OMP (static pages and custom pages), OPS (custom pages) (code)
  - 3.3: OJS, OMP (static pages and custom pages), OPS (custom pages) (code)
- **Introduced** static pages: [6f150db](https://github.com/pkp/staticPages/commit/6f150db08051dd811522c83fd45141dc4622f553)
  in pkp/staticPages · 2014-09-25 · Alec Smecher (asmecher), no PR;
  custom pages: `pkp/pkp-lib#3335` for `pkp/pkp-lib#2899` ·
  [ecb3765224](https://github.com/pkp/pkp-lib/commit/ecb3765224696d73ef695699d995b416bcd2bec2)
  · 2018-01-18 · Dimitris Efstathiou (defstat)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U09 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a10)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A manager adds a static page, or a "Custom Page" item under Settings ›
Website › "Setup" › "Navigation", and gives it a "Path" with a "." in
its first or second part. The parts are what "/" separates, so
"dot.only" and "deep/Mixed_1.x" qualify and "one/two/three.x" does not.
The static page window and the item window both save it, because their
rule for "Path" allows a ".": "The path field must contain only
alphanumeric characters plus '.', '/', '-', and '_'." The page is
listed. But its
address, typed or followed from the list's "Path" link, answers a bare
"404 Not Found" page. A "." in a later part works.

Nobody is told that the path cannot be used: the manager finds out by
opening the page, or when readers report a dead menu link. Saving the
page under a path without a "." in its first two parts makes it
reachable.

Static pages come from the Static Pages plugin, which ships with OJS and
OMP; "Custom Page" items exist in all three apps. The fix touches two
repositories, pkp-lib and the Static Pages plugin.

## Impact

- **Lost**: the page is unreachable under the path chosen for it, and a
  menu link to it leads readers to "404 Not Found".
- **Who**: a manager who picks a path with a "." near its start (a file
  name such as "fees.html", a version such as "policy/v1.2"), and every
  reader who follows its link.
- **Way round**: yes, a new path (see the Summary).

Medium: the page is unreachable under the path its window accepted, and
nobody is told, but only for paths with a "." in their first two
parts, and a new path fixes it. It would rise if such paths were common
in ordinary use; a "." near the start of a page address is unusual.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, context `publicknowledge`. The
  dataset leaves "Static Pages Plugin" off and holds no static page.
- Static pages: OJS or OMP. Custom pages: OJS, OMP or OPS.

Static page:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. Open Settings › Website, tab "Plugins". Under "Generic Plugins",
   tick "Static Pages Plugin".
3. Reload Settings › Website and open the new "Static Pages" tab.
4. Press "Add Static Page". Enter "Path" `dot.only`, English "Title"
   `u09ir8 dot only` and "Content" `u09ir8 text`. Press "Save". The list
   shows the page, its "Path" cell reading `dot.only`.
5. Add a second page the same way with "Path" `deep/Mixed_1.x` and
   "Title" `u09ir8 deep`.
6. Add a third page with "Path" `one/two/three.x` and "Title"
   `u09ir8 third`.
7. In the list, press the "Path" link `dot.only`. It opens in a new
   browser tab.
8. Open `/index.php/publicknowledge/deep/Mixed_1.x` and
   `/index.php/publicknowledge/one/two/three.x`.

Custom page:

9. Open Settings › Website › "Setup" › "Navigation" and press "Add
   item". Choose "Navigation Menu Type" "Custom Page". Enter "Path"
   `nav.dot` and English "Title" `u09ir8 nav dot`. Press "Save".
10. Open `/index.php/publicknowledge/nav.dot`.

**Expected**: each address shows its page in the journal's frame, under
its title ("u09ir8 dot only | Journal of Public Knowledge" in the
browser's tab), with its content.

**Observed**: `dot.only` (step 7), `deep/Mixed_1.x` (step 8) and
`nav.dot` (step 10) each answer status 404 with a page that holds only
the heading "404 Not Found". There is no journal header, no menu and no
link back. The "/en/" form of each address (`/index.php/publicknowledge/en/dot.only`)
answers the same. Nothing is written to the server log.

`one/two/three.x` opens its page, "u09ir8 third | Journal of Public
Knowledge".

## Cause

The router cleans the first two parts of the address before anything
else sees them. `Core::getPage()` and `Core::getOp()`
(`lib/pkp/classes/core/Core.php`) pass the page and the operation
through `cleanFileVar()`, which is `preg_replace('/[^\w\-]/u', '', $var)`.
That is right for the router: `PKPPageRouter::route()` builds the
handler file name `pages/<page>/index.php` from the page. The arguments
after them (`Core::getArgs()`) are left as they are.

Both content lookups rebuild the requested path from these cleaned
values, on the `LoadHandler` hook:
`StaticPagesPlugin::callbackHandleContent()` (pkp/staticPages) and
`PKPNavigationMenuService::_callbackHandleCustomNavigationMenuItems()`
(`lib/pkp/classes/services/PKPNavigationMenuService.php`, line 680 on
main). Each joins `$page`, `$op` (when not `index`) and the raw
arguments with "/" and looks the result up by path. So "dot.only" is
looked up as "dotonly" and "deep/Mixed_1.x" as "deep/Mixed_1x", while
"one/two/three.x" keeps its ".", which sits in an argument.

The forms accept "." anywhere: `StaticPageForm` and
`PKPNavigationMenuItemsForm::validate()` both check the path against
`/^[a-zA-Z0-9\/._-]+$/`. Of those characters, `cleanFileVar()` removes
only ".". The lookup is what is wrong, not the form: the arguments
already reach it uncleaned, and they work.

Static pages got the "." and the path joined from the cleaned parts in
one commit, "Code rearrange; make paths more flexible" (6f150db). Custom
pages followed in two steps. The path pattern with "." came with the
"Custom Page" item type (`pkp/pkp-lib#2178`,
[46c4132edd](https://github.com/pkp/pkp-lib/commit/46c4132edd9f2f80313d74fd82e1cc810167a555)).
The join came when custom pages began to answer at the journal's
address plus their path (`pkp/pkp-lib#2899`).

Reach:

- Static pages on journals and presses: walked.
- "Custom Page" items of a journal, press or preprint server: walked.
- Addresses with the language part ("/en/"): walked.
- The site's own "Custom Page" items (Administration › "Site Settings" ›
  "Site Setup" › "Navigation"): read in the code, not driven. The site
  has no context; the callback passes `Application::SITE_CONTEXT_ID`,
  which is `null` on main, and `NavigationMenuItemDAO::getByPath()`
  matches it as 0 (`COALESCE(context_id, 0) = ?`). The same join serves
  it.
- Static pages turned into "Custom Page" items on upgrade keep their
  paths, so their fault carries over: read in the code, not driven.
- Menu links to a custom page are built from the stored path and point
  to the right address; only the lookup fails: read in the code.
- No other `LoadHandler` callback in the three apps or their bundled
  plugins looks content up by path (`CitationStyleLanguagePlugin` and
  `JatsTemplatePlugin` match fixed page names): read in the code.

Out of scope: a stored path whose first part is a language code
(`en/foo`) is read as the address's language part, before the fix and
after it.

## Proposed fix

Give the router one accessor for the requested path as typed, and let
both lookups use it
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-dot-path-not-found/fix.diff)
for OJS and OMP;
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-dot-path-not-found/fix-ops.diff),
the pkp-lib part alone, for OPS):

```diff
 // lib/pkp/classes/core/Core.php
+    public static function getPathParts(string $urlInfo, array $userVars = []): array
+    {
+        return static::_getUrlComponents($urlInfo, self::_getOffset($urlInfo, 0), 'path', $userVars);
+    }

 // lib/pkp/classes/core/PKPPageRouter.php
+    public function getRequestedPagePath(PKPRequest $request): string
+    {
+        $parts = $this->_getRequestedUrlParts(Core::getPathParts(...), $request);
+        if (in_array($parts[1] ?? null, ['', 'index'], true)) {
+            unset($parts[1]);
+        }
+        return implode('/', $parts);
+    }

 // PKPNavigationMenuService::_callbackHandleCustomNavigationMenuItems() and
 // StaticPagesPlugin::callbackHandleContent()
-        $path = $page;
-        if ($op !== 'index') {
-            $path .= "/{$op}";
-        }
-        if ($arguments = $request->getRequestedArgs()) {
-            $path .= '/' . implode('/', $arguments);
-        }
+        $path = $request->getRouter()->getRequestedPagePath($request);
```

The cleaning stays on the page and the operation, which name a handler
file. The two lookups read the whole path uncleaned, as they already
read its arguments. That is safe because the path only reaches
`getByPath()`, a query with a bound parameter, never a file name.

The join moves from its two copies into the router, beside
`getRequestedArgs()`. Like that method, it reads the address through
`_getRequestedUrlParts()`, and it keeps the rule that an `index`
operation is left out.

Tried on `main`, OJS, OMP (fix.diff) and OPS (fix-ops.diff): every
address in the Steps opens its page. "ab.out", which no page holds,
still opens "About the Journal" (the router's cleaned "about"), as it
does without the fix. "about/editorialMasthead" still opens, and
"no.such/page" still answers 404.

**Alternatives**:

- Refuse "." in the first two parts of a path, in both forms. It would
  leave pages already saved with such paths unreachable, and it would
  need a new message for a rule nobody can guess.
- Stop cleaning "." in `Core::getPage()`/`getOp()`. That would let "."
  and ".." reach the handler file name the router builds, so no.

**What goes with it**:

- The `LoadHandler` hook and its arguments do not change, so plugins
  that read `$page` and `$op` are unaffected.
- One behavior ends: today an address with a "." in its first two parts
  also reaches a page stored without it (`info.x` opens a page at
  `infox`; read in the code). No screen builds such addresses.
- No stored data changes. Pages already saved with such a path start to
  answer.
- Two repositories: pkp-lib and pkp/staticPages. The plugin needs the
  pkp-lib release that has the accessor.
- A unit test in `lib/pkp/tests/classes/core/PKPPageRouterTest.php` for
  `getRequestedPagePath()`: `dot.only`, `en/deep/Mixed_1.x` and
  `foo/index/bar` (giving `foo/bar`); and a Planned e2e guard in spec
  U09.
- Backport:
  - 3.5: the diffs apply, the `PKPNavigationMenuService` hunk at an
    offset (the join is at line 649 there).
  - 3.4: the URL readers take `($urlInfo, $isPathInfo, $userVars)` and
    the address has no language part, so there is no `_getOffset()`.
    The accessor's body becomes
    `Core::_getUrlComponents($urlInfo, $isPathInfo, 0, 'path', $userVars)`,
    and the router passes its callbacks as arrays
    (`[Core::class, 'getArgs']`).
  - 3.3: the files are `.inc.php`, and `_getUrlComponents()` still has
    the `disable_path_info` branch. In that mode it reads `page`, `op`
    and `path` from the query string, and asking it for `path` returns
    only the arguments. So the 3.3 accessor must join the `page`, `op`
    and `path` variables itself in that mode.

Medium: a new router accessor and two lookups changed, in two
repositories, with a unit test.

## Evidence

- The kept script walks the Steps and the neighbour checks (`ab.out`,
  the "/en/" form, `about/editorialMasthead`, `no.such/page`), which ran
  with the fix in and out:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-dot-path-not-found/walk.js).
  On an install freshly loaded from the default dataset, from a pkp-e2e
  checkout:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/static-page-dot-path-not-found/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/static-page-dot-path-not-found/fix.diff ojs omp`,
  and `fix-ops.diff ops` on its own.
- Walked on PostgreSQL, datasets pkp/datasets c657990 (2026-10-01), on
  main and 3.5, OJS, OMP and OPS; 3.5 showed the same answers at every
  step. 3.4 and 3.3 were read in the code, not driven. The fault does
  not depend on the database; MySQL not checked.
- Tips: main OJS 68615b5a32 (lib/pkp 25562b0e1a, staticPages 45d02c0),
  OMP 3b0ecf794 (lib/pkp 3dc90c81a6, staticPages 45d02c0), OPS
  c8af945bb7 (lib/pkp 3dc90c81a6); 3.5 OJS 3517e640f2 (lib/pkp
  b1981810da), OMP c7b45f88e and OPS 8eaf899468 (lib/pkp 1fb843f491),
  staticPages fb9b499 in OJS and OMP; 3.4 lib/pkp `origin/stable-3_4_0`
  32b0f4b4af, staticPages 9568981 (the pointer of OJS 75cc2d488b and
  OMP 0aec65441); 3.3 lib/pkp `origin/stable-3_3_0` f6ab331645,
  staticPages 8c97bd0 (OJS ac77c9fb35, OMP 8e72fc883).
- Code reads. main and 3.5: `Core::getPage()`, `getOp()`, `getArgs()`,
  `cleanFileVar()`, `PKPPageRouter::route()`, the two callbacks, the two
  forms' path checks, `NavigationMenuItemDAO::getByPath()`, and a search
  of the three apps and their plugins for `LoadHandler` callbacks. 3.4
  and 3.3: `getPage()` and `getOp()` return `Core::cleanFileVar(...)`,
  with the same `cleanFileVar()`; `_callbackHandleCustomNavigationMenuItems()`
  joins the parts the same way; `PKPNavigationMenuItemsForm` checks the
  same pattern; `Core::_getUrlComponents()` and
  `PKPPageRouter::_getRequestedUrlParts()` for the backport. The
  staticPages files at the pointers above (read from
  raw.githubusercontent.com): `callbackHandleContent()` joins the same
  way and `StaticPageForm` checks the same pattern.
- Introduced: `git blame` on the join in `StaticPagesPlugin.php` gives
  1226ae26 (the PSR-12 reformat); `git log -S` on the join and on the
  form's pattern gives 6f150db for both, which replaced
  `FormValidatorAlphaNum` with the pattern. `cleanFileVar()` already
  removed "." then (lib/pkp at 9c1793f47e). In pkp-lib, `git log -S`
  gives ecb3765224 (PR `pkp/pkp-lib#3335`) for the custom pages' join
  and 46c4132edd for their form's pattern.
- Upstream search (pkp/pkp-lib, pkp/staticPages, pkp/ojs, pkp/omp; issues
  and PRs, open and closed): by "static page path dot", "custom page path
  period", "static page 404", "custom page 404 path", "navigation menu
  item path not found", and by `cleanFileVar`,
  `_callbackHandleCustomNavigationMenuItems`, `callbackHandleContent`.
  None was about this fault.
