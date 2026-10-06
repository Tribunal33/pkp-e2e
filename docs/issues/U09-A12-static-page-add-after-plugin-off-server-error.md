# Right after "Static Pages Plugin" is unticked, the tab's "Add Static Page" fails on the server

- **Severity** low
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP; OPS (code; no Static Pages plugin, only an address
    no handler serves)
  - 3.5: OJS, OMP; OPS (code, as on main)
  - 3.4: none (code; answers "404 Not Found")
  - 3.3: none (code; answers "404 Not Found")
- **Introduced** `pkp/pkp-lib#10072` · [657efbae75](https://github.com/pkp/pkp-lib/commit/657efbae75dba6609aba3fd053171d7640745795) · 2024-06-17 · Alec Smecher (asmecher)
- **Upstream** none found for this fault (2026-10-01). `pkp/pkp-lib#13107`
  (closed) met the same server error from OPS galleys' "Save Order"; its
  fix (`pkp/ui-library#947`) corrected the address that screen sent, not
  the router
- **Tracked in** spec U09 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a12)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

The application fails on the server when a manager unticks "Static
Pages Plugin" and then, on the same open Settings › Website page, presses
"Add Static Page". The "Static Pages" tab stays until the page is
reloaded. The button opens an empty window. Over it, a window "Error"
says "An unexpected error has occurred. Please reload the page and try
again."

The user sees that same "Error" window with the fix too, and a reload
takes the tab away. The difference is the server's answer: today a PHP
fatal error and status 500, written to the server log; with the fix a
"404 Not Found" and nothing logged. On 3.4, before the change that broke
it, the server answered 404 and the browser showed "Failed Ajax request
or invalid JSON returned." (read in the code, not driven).

The same server error answers every address that the settings pages'
tables and windows load when no code serves it. In normal work only a
page left open while a plugin is turned off leads there; otherwise it
takes an address entered by hand or a screen that sends a wrong address.
The fix is one parameter type in the shared router.

## Impact

- **Lost**: nothing; the plugin is off, so there is nothing to add.
- **Who**: a manager who turns the plugin off and goes on working on the
  same page; anyone who opens such an address by hand or from an old
  bookmark.
- **Way round**: reload the page, as the message says.

Low: the screen is the one a correct answer gives, and only the server's
status and log are wrong. The severity would rise if a screen in a core
task sent an address no code serves.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, context `publicknowledge`, on
  OJS or OMP (OPS ships no Static Pages plugin). The dataset leaves
  "Static Pages Plugin" off and holds no static page.

Steps:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. Open Settings › Website, tab "Plugins".
3. Under "Generic Plugins", tick "Static Pages Plugin".
4. Reload Settings › Website. The tabs now read "Appearance", "Setup",
   "Plugins", "Content", "Static Pages" (on 3.5 there is no "Content"
   tab).
5. Open "Plugins" again and untick "Static Pages Plugin". Answer "OK" to
   "Disable" / "Are you sure you want to disable this plugin?". The
   notice reads "The plugin "Static Pages Plugin" has been disabled.".
6. Without reloading, open the "Static Pages" tab, which is still there.
7. Press "Add Static Page".

**Expected**: the plugin is off, so its window cannot open. The request
answers "404 Not Found", the screen asks for a reload, and nothing is
written to the server log.

**Observed**: an empty "Add Static Page" window opens. Over it, a window
"Error" says "An unexpected error has occurred. Please reload the page
and try again." with "OK". The page sends the window's request twice,
and both answer 500 with an empty body:

```
GET /index.php/publicknowledge/$$$call$$$/plugins/generic/static-pages/controllers/grid/static-page-grid/add-static-page
→ 500
PHP Fatal error:  Uncaught TypeError: PKP\core\PKPRouter::_authorizeInitializeAndCallRequest(): Argument #1 ($serviceEndpoint) must be of type callable|array, null given, called in lib/pkp/classes/core/PKPComponentRouter.php on line 262
```

After a reload the tab is gone; with the plugin ticked again, "Add
Static Page" opens its window.

## Cause

`PKPComponentRouter::route()` finds the handler for a table's or a
window's request through `getRpcServiceEndpoint()`, which returns `null` when no
code serves the address. Here that is because
`StaticPagesPlugin::register()` adds its `LoadComponentHandler` callback
only while the plugin is enabled, so once it is off the grid's address
names a component nobody answers. `route()` passes the `null` on to
`PKPRouter::_authorizeInitializeAndCallRequest()`.

That method opens with the guard written for exactly this case ("a
component has been named that does not exist and that no plugin has
registered"): `if (!is_callable($serviceEndpoint))` it throws
`NotFoundHttpException`, a 404. The guard never runs, because the
parameter is declared `callable|array $serviceEndpoint`
(`lib/pkp/classes/core/PKPRouter.php` line 301). PHP throws a
`TypeError` at the call instead, and the exception handler answers 500.

The declaration came with `pkp/pkp-lib#10072` ("Coding standards"),
which typed the routers' methods: `&$serviceEndpoint` became `callable
$serviceEndpoint`, while the same change typed `getRpcServiceEndpoint()`
as returning `callable|array|null`. A later typing pass
([0cf9a95d17](https://github.com/pkp/pkp-lib/commit/0cf9a95d1700b0ee6baae6a8cb5cf24857228a31),
`pkp/pkp-lib#10823`) widened it to `callable|array`, still without
`null`. On 3.4 and 3.3 the parameter is untyped, the guard runs and
`Dispatcher::handle404()` answers "404 Not Found".

Reach:

- Every table or window address no code serves, in the three apps: a
  plugin's grid after the plugin is off, a mistyped or outdated address.
  Walked on OJS and OMP: the Static Pages grid's "Add Static Page", and
  an address entered by hand that names no component.
- Read in the code, not driven: the Static Pages grid's other operations
  from the open tab; OPS, which runs the same router; and the Custom
  Block Manager's grid when that plugin is off. That grid's window opens
  from the plugin's row on "Plugins". Unticking redraws the row without
  that link, so no page left open was found that leads there.
- A screen that sends a wrong address meets it too: OPS galleys' "Save
  Order" did until `pkp/pkp-lib#13107` was fixed in July 2026.
- Not affected, walked: an address naming a real component and an
  operation it lacks. The endpoint is then an array, which passes the
  type, and the guard answers 404.
- Not affected, read in the code: `PKPPageRouter::route()`, the method's
  other caller, throws `NotFoundHttpException` itself before calling it,
  so pages answer 404.

## Proposed fix

Let the parameter take `null`, so the guard written for this case runs
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-add-after-plugin-off-server-error/fix.diff)):

```diff
-     * @param array{0:PKPHandler,1:string} $serviceEndpoint
+     * @param callable|array{0:PKPHandler,1:string}|null $serviceEndpoint Null when no handler serves the address (answered with a 404)
      * @param bool $validate whether or not to execute the validation step.
      */
-    public function _authorizeInitializeAndCallRequest(callable|array $serviceEndpoint, PKPRequest $request, array $args, bool $validate = true): void
+    public function _authorizeInitializeAndCallRequest(callable|array|null $serviceEndpoint, PKPRequest $request, array $args, bool $validate = true): void
```

The rule lives in the shared base router, which already holds the
guard, and `getRpcServiceEndpoint()` already declares that it returns
`null`; the parameter now matches it and stays typed, which keeps what
the typing change was for. Tried on `main`, OJS and OMP: "Add Static
Page" on the stale tab answers 404, the server log stays empty, and the
screen shows the same "Error" window. With the plugin on, the window
still opens; the Plugins list still loads; and a real grid's missing
operation still answers 404.

**Alternatives**:

- Throw `NotFoundHttpException` in `PKPComponentRouter::route()` when the
  endpoint is `null`, as `PKPPageRouter::route()` does. Equally right,
  but it leaves the base router's guard unreachable for the case it was
  written for.
- Remove the "Static Pages" tab, or reload Settings › Website, when the
  plugin is unticked. That is a product change for one screen, and
  addresses entered by hand or outdated would still fail.

**What goes with it**:

- A unit test in `lib/pkp/tests/classes/core/PKPComponentRouterTest.php`:
  `route()` for a component that does not exist expects
  `NotFoundHttpException` (the request is the one
  `testSupportsWithPathinfoAndComponentFileDoesNotExist()` already
  builds), and a Planned e2e guard in spec U09 for the stale tab.
- No stored data, REST API or plugin hook changes: only answers that
  were 500 become 404.
- Backport: 3.5 has the same line. The diff needs its context adjusted
  there, because one blank docblock line differs.

Small: one declaration in the shared router, and a unit test.

## Evidence

- The kept script walks the Steps, then the controls (the plugin ticked
  again, an address entered by hand naming no component):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-add-after-plugin-off-server-error/walk.js);
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-add-after-plugin-off-server-error/neighbour.js)
  walks what the fix must leave alone (the Plugins list, a real grid's
  missing operation), with the fix in and out. On an install freshly
  loaded from the default dataset, from a pkp-e2e checkout:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> ONLY=ojs,omp node bin/probe.js all shared/playwright/checks/issues/static-page-add-after-plugin-off-server-error/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/static-page-add-after-plugin-off-server-error/fix.diff ojs omp`.
- Walked on PostgreSQL, datasets pkp/datasets c657990 (2026-10-01), on
  main and 3.5, OJS and OMP; 3.5 showed the same 500s and log lines (line
  265 there). The fault does not depend on the database. OPS ships no
  Static Pages plugin and was not driven; its router is the same code.
  The fix was tried on main only; its trial stands after the revision,
  which changed only the docblock comment.
- Tips: main OJS 68615b5a32 (lib/pkp 25562b0e1a, staticPages 45d02c0),
  OMP 3b0ecf794 (lib/pkp 3dc90c81a6, staticPages 45d02c0); 3.5 OJS
  3517e640f2 (lib/pkp b1981810da), OMP c7b45f88e (lib/pkp 1fb843f491),
  staticPages fb9b499 in both; 3.4 lib/pkp `origin/stable-3_4_0`
  32b0f4b4af; 3.3 lib/pkp `origin/stable-3_3_0` f6ab331645.
- Code reads. main and 3.5: the methods the Cause names; a search for
  `LoadComponentHandler` in the three apps' plugins (Static Pages and
  Custom Block Manager only) and for callers of
  `_authorizeInitializeAndCallRequest()` (the two routers only). 3.4
  (`git show origin/stable-3_4_0:` in lib/pkp) and 3.3
  (`origin/stable-3_3_0`): the parameter is an untyped reference, the
  guard calls `Dispatcher::handle404()`, which sends the 404 header and
  `fatalError('404 Not Found')`; neither branch holds 657efbae75. On
  3.4 the window's content loads through `$.fn.pkpAjaxHtml()`
  (`js/lib/jquery/plugins/jquery.pkp.js`), whose error callback shows
  the browser alert "Failed Ajax request or invalid JSON returned.".
- Introduced: `git blame` on line 301 gives 0cf9a95d17 (`callable` to
  `callable|array`); `git log -G` on the signature gives 657efbae75 as
  the change from the untyped `&$serviceEndpoint` to `callable`, merged
  as PR `pkp/pkp-lib#10072` (no linked issue). The guard's `throw`
  (95705937711, replacing `handle404()`) is not the cause: it is never
  reached with `null`.
- Upstream search (pkp/pkp-lib, pkp/ojs, pkp/staticPages; issues and
  PRs): `pkp/pkp-lib#13107` logged the same `TypeError`. Its fix, under
  `pkp/pkp-lib#13039` (`pkp/ui-library#947`, `#948`), made OPS's galley
  manager send OPS's own grid address instead of OJS's
  `grid.articleGalleys.ArticleGalleyGridHandler`; the router was not
  changed, and this fix does not undo that one.
