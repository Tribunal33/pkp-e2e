# After a manager turns off Static Pages, the tab still on screen answers "Add Static Page" with a server error

- **Severity** low
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#10072` (Coding standards) · [657efbae75](https://github.com/pkp/pkp-lib/commit/657efbae75dba6609aba3fd053171d7640745795) · 2024-06-17 · Alec Smecher (asmecher)
- **Upstream** `pkp/pkp-lib#13107` (closed) hit the same server error on OPS through a wrongly named component; its fix corrected that name and left the shared code that causes this report as it is
- **Tracked in** spec U09 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a12)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A manager unticks "Static Pages Plugin" on Settings › Website. The
"Static Pages" tab stays on the open page until it is reloaded. Pressing
its "Add Static Page" opens an empty window with "Error": "An unexpected
error has occurred. Please reload the page and try again.", because the
application fails on the server. Up to 3.4 the same request was answered
"404 Not Found".

Nothing is lost, and reloading the page, as the message asks, removes
the tab. OPS ships no Static Pages plugin, so its managers never see
this tab.

## Impact

- **Lost.** Nothing: the static pages stay stored.
- **Who.** Journal and press managers, in the moments between unticking
  the plugin and the next reload of Settings › Website. Each press
  writes two PHP fatal errors ("Uncaught TypeError", with a stack trace)
  to the server's error log, so whoever runs the server sees fatal
  errors that need no action.
- **Way round.** Reload the page.

Low: the fault is confined to that moment, since no other everyday
screen was found that sends requests to a component that is no longer
served (Cause, "Reach").

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (the same on `stable-3_5_0`), OJS or
  OMP. The walks ran on PostgreSQL; the fault does not depend on the
  database.
- In the dataset, "Static Pages Plugin" is installed but unticked, so
  steps 3 and 4 turn it on.

1. Sign in as `rvaca` (the journal or press manager).
2. Open Settings › Website
   (`/index.php/publicknowledge/en/management/settings/website`), tab
   "Plugins".
3. Under "Generic Plugins", tick "Static Pages Plugin". "The plugin
   "Static Pages Plugin" has been enabled." shows at the top right.
4. Reload the page. A tab "Static Pages" now shows.
5. On "Plugins", untick "Static Pages Plugin". A window "Disable" asks
   "Are you sure you want to disable this plugin?". Press "OK". "The
   plugin "Static Pages Plugin" has been disabled." shows.
6. Without reloading, open the tab "Static Pages", which is still there.
7. Press "Add Static Page".
8. Reload the page.

**Expected.** In step 7 the request is refused as not found, because the
plugin is off. The window "Error" asks the manager to reload the page,
and the server records no error. In step 8 the tab is gone.

**Observed.** In step 7 an empty window "Add Static Page" opens, with
"Error" over it: "An unexpected error has occurred. Please reload the
page and try again." and "OK". The request answers 500 with an empty
body, and the window's fetch library (ofetch, which the ui-library's
`useFetch` uses) sends it once more, since it retries a GET once after
a 500 but not after a 404:

```
GET /index.php/publicknowledge/$$$call$$$/plugins/generic/static-pages/controllers/grid/static-page-grid/add-static-page → 500
```

The server log records, for each of the two requests:

```
PHP Fatal error:  Uncaught TypeError: PKP\core\PKPRouter::_authorizeInitializeAndCallRequest(): Argument #1 ($serviceEndpoint) must be of type callable|array, null given, called in lib/pkp/classes/core/PKPComponentRouter.php on line 262 and defined in lib/pkp/classes/core/PKPRouter.php:301
```

In step 8 the tab is gone.

## Cause

A disabled plugin serves none of its components.
`StaticPagesPlugin::register()` adds its `LoadComponentHandler` hook
only while the plugin is enabled
([`StaticPagesPlugin.php` line 85](https://github.com/pkp/staticPages/blob/45d02c085ee125bf390f89e5bff1f0833838a647/StaticPagesPlugin.php#L85)).
That is intended. The tab on screen was built when the page loaded, and
it still sends requests to the grid component that is no longer served.

For such a request, `PKPComponentRouter::getRpcServiceEndpoint()` finds
no handler and returns `null`
([`PKPComponentRouter.php` line 209](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/classes/core/PKPComponentRouter.php#L209),
"Request to non-existent handler"). `route()` passes that `null` on to
`PKPRouter::_authorizeInitializeAndCallRequest()`
([line 262](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/classes/core/PKPComponentRouter.php#L262)).
That method was written for this case: its first check reads "It's
conceivable that a call has gotten this far without actually being
callable, e.g. a component has been named that does not exist and that
no plugin has registered", and throws `NotFoundHttpException`, which the
application answers with "404 Not Found"
([`PKPRouter.php` lines 305-310](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/classes/core/PKPRouter.php#L305-L310)).
But its parameter is typed `callable|array`
([line 301](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/classes/core/PKPRouter.php#L301)),
so PHP refuses the `null` with a `TypeError` before the check runs, and
the request ends in a fatal error.

657efbae75 ("Coding standards", `pkp/pkp-lib#10072`) added the types.
It made `getRpcServiceEndpoint()` return `callable|array|null` and typed
the receiving parameter `callable`. Before it the parameter was untyped
and the check answered 404; 3.4 and 3.3 still do, through
`Dispatcher::handle404()`. 0cf9a95d17 (`pkp/pkp-lib#10823`) later
widened the parameter to `callable|array`, which `null` still does not
pass. Blame on line 301 gives 0cf9a95d17; `git log -S` gives 657efbae75.

Reach:

- **Any request naming a component that does not exist** answers 500
  instead of 404, in all three apps.
- **Components served only while a plugin is on.** Among the plugins
  bundled with OJS, OMP and OPS, only two serve components through
  `LoadComponentHandler`, both only while enabled: Static Pages (this
  report, and also its tab's "Edit" and "Delete" on a listed page) and
  Custom Block Manager. Custom Block Manager's grid opens in a window
  from its own row on the "Plugins" tab and covers the tab while it is
  open, so the manager closes it before unticking; unticking then redraws
  the row without the window's link. It fails the same
  way only when the window is left open in a second browser tab, or by a
  second manager, while the plugin is unticked. No other everyday screen
  was found that sends such a request. The search covered every
  `LoadComponentHandler` hook and every `plugins.*` component address in
  the three apps' `plugins/` and `lib/pkp/plugins/`; plugins installed
  from the gallery were not searched.
- **Pages are not affected.** `PKPPageRouter::route()` throws
  `NotFoundHttpException` itself before it calls the method
  ([`PKPPageRouter.php` line 237](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/classes/core/PKPPageRouter.php#L237)),
  so an unknown page address answers 404.

## Proposed fix

Let the method's own check see the `null`, by adding `null` to the
parameter's type in pkp-lib's `PKPRouter::_authorizeInitializeAndCallRequest()`:

```diff
-     * @param array{0:PKPHandler,1:string} $serviceEndpoint
+     * @param array{0:PKPHandler,1:string}|null $serviceEndpoint null when nothing serves
+     *  the request (a component no plugin has registered): answered 404 below
      * @param bool $validate whether or not to execute the validation step.
      */
-    public function _authorizeInitializeAndCallRequest(callable|array $serviceEndpoint, PKPRequest $request, array $args, bool $validate = true): void
+    public function _authorizeInitializeAndCallRequest(callable|array|null $serviceEndpoint, PKPRequest $request, array $args, bool $validate = true): void
```

[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-pages-disabled-tab-add-server-error/fix.diff)
gives its path from the app root (`lib/pkp/…`); in a pkp-lib clone,
apply it with `git apply -p3`.

The types the coding-standards change added stay, and the parameter now
accepts what `getRpcServiceEndpoint()` declares it returns. No class in
the three apps overrides the method.

**Tried** on `main` in OJS and OMP. With the fix, step 7 sends one
request, which answers "404 Not Found". The window shows the same
"Error" asking to reload, and the server log stays empty. Two controls
read the same with and without the fix: with the plugin ticked, "Add
Static Page" answers 200 and opens its form, and an unknown page address
answers 404.

**Alternatives**

- **A guard in `PKPComponentRouter::route()`** that throws
  `NotFoundHttpException` when the endpoint is `null`, as
  `PKPPageRouter::route()` does. It works equally well, but leaves the
  method's own check for this case unreachable for `null`, so the rule
  would live in two places.
- **Reloading Settings › Website whenever a plugin is ticked or
  unticked.** The tab would never be left behind. But every tick and
  untick on the "Plugins" tab would then cost a page reload, and the
  server error would stay for every other request naming a missing
  component.

**What goes with it**

- **A test.** In pkp-lib's `tests/classes/core/PKPComponentRouterTest.php`,
  route a request to a component that does not exist and expect
  `NotFoundHttpException`.
- **The empty operation.** A component address with no operation throws
  a plain `Exception` ("An operation was not specified!") in
  `getRpcServiceEndpoint()` and also answers 500. No screen sends such a
  request, so the fix leaves it out.
- **3.5.** The same one-word change applies. The diff needs a hand edit
  there, because the docblock on `stable-3_5_0` lacks the blank line
  before `@param`.

Small: one type in one shared method, restoring the check the method
already has, and one unit test.

## Evidence

- **The kept script.**
  [`shared/playwright/checks/issues/static-pages-disabled-tab-add-server-error/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-pages-disabled-tab-add-server-error/walk.js)
  takes the Steps on an install freshly loaded from the default dataset
  (pkp/datasets 38ab955, 2026-09-30):
  `ONLY=ojs,omp node bin/probe.js all shared/playwright/checks/issues/static-pages-disabled-tab-add-server-error/walk.js [neighbour]`;
  `neighbour` walks the two controls instead.
- **The fix trial.**
  `node bin/try-fix.js apply shared/playwright/checks/issues/static-pages-disabled-tab-add-server-error/fix.diff ojs omp`,
  then `revert`.
- **On 3.5** the log line names `PKPComponentRouter.php` line 265.
- **Branch tips.**
  - `main`: OJS bade233f73, OMP 3b0ecf794. pkp-lib 2e377d27fc (OJS) and
    3dc90c81a6 (OMP). pkp/staticPages 45d02c085e.
  - `stable-3_5_0`: OJS 92b9a16b48, OMP 3081c9b00. pkp-lib a9c76aed62.
    pkp/staticPages fb9b499.
  - `stable-3_4_0`: OJS 9571d8fde7, OMP 0aec65441. pkp-lib df13621c2d.
  - `stable-3_3_0`: OJS 9fdb9bcf9a, OMP 8e72fc883. pkp-lib d446601ebe.
- **The 3.4 and 3.3 code.** `PKPRouter::_authorizeInitializeAndCallRequest()`
  takes `&$serviceEndpoint` untyped, and a non-callable endpoint calls
  `Dispatcher::handle404()`, which sends "HTTP/1.0 404 Not Found", then
  `fatalError('404 Not Found')` logs that line and exits.
  `PKPComponentRouter::route()` passes the `null` through, as on `main`.
  The Static Pages plugin at the pointers both branches record
  (9568981e8c on 3.4, 8c97bd09d4 on 3.3) registers its grid only while
  enabled, so the tab is left behind there too, but its request answers
  404.
- **The retry.** ofetch's default `retry` is 1 for methods without a
  body, on its default retry statuses, which include 500 and not 404
  (read in OJS `main`'s built `js/build.js`).
- **The Upstream search**, on 2026-09-30.
  - Searched by: static pages, disable, "Add Static Page", "unexpected
    error", component 404, `_authorizeInitializeAndCallRequest`,
    `serviceEndpoint` "null given", "must be of type callable",
    `getRpcServiceEndpoint`, `PKPComponentRouter`.
  - Searched in: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/staticPages and
    pkp/ui-library.
- **Not walked.** The stale tab's "Edit" and "Delete", the Custom Block
  Manager window in a second browser tab, OPS, MySQL, 3.4 and 3.3.
