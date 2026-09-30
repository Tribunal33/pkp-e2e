# Opening the address of a tool the installation lacks shows the tool list as raw JSON

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** [d5c00b0344](https://github.com/pkp/pkp-lib/commit/d5c00b03443a90420f4090d715305b39e94035ff), committed without a pull request, for `pkp/pkp-lib#1289` · 2016-07-11 · Alec Smecher (asmecher)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U63 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a1)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A manager who opens the address of an import/export tool that the
installation does not have expects a "not found" page. An example is the
address of a journal's Crossref tool, opened on a press, which has no
Crossref tool. Instead the browser shows a bare page of JSON text, with
no heading, no menu and no link back.

The JSON is the list that the Tools page's "Import/Export" tab shows:
each tool's name, its link and its one-line description, and nothing
more. Only users who can open Tools see it (a manager-level role or the
site administrator). Anyone else is refused, as before.

The way back is the browser's back button or "Tools" in the side menu.

## Impact

- **Lost.** Nothing is lost, and the page shows nothing the same user
  cannot already see on Tools.
- **Who.** Managers who reach a tool's address from outside the
  installation's own links. This happens with a bookmark carried over
  from another installation, with a link in documentation or an email
  that names another application's tool, or with a typo in a typed
  address. The tool links on the Tools page lead only to tools the
  installation has. So does "Import/Export Data" on the Plugins list,
  with one exception, OJS's DOAJ tool (see Cause). So the fault is
  rarely met.
- **Way round.** The browser's back button, or "Tools" in the side menu.

Low: only a mistaken address reaches the page, nothing beyond the Tools
list is shown, and every task goes on from the menu. A screen of the
installation that led there in ordinary use would make it medium.

## Steps to reproduce

Preconditions: PKP's default test dataset for `main` (OJS, OMP or OPS),
context `publicknowledge`. Nothing else.

1. Sign in as `rvaca` (the manager).
2. In the side menu, press "Tools". The "Import/Export" tab lists the
   tools the installation has. [OMP: "ONIX 3.0 Monograph Export Plugin",
   "Tab Delimited Content Import Plugin", "Native XML Plugin", "Users XML
   Plugin"; no Crossref tool. OJS and OPS: no ONIX tool.]
3. In the address bar, open the address of a tool this application does
   not have:
   - On OMP, which has no Crossref tool (OJS and OPS have one at this
     address):
     `/index.php/publicknowledge/en/management/importexport/plugin/CrossrefExportPlugin`
   - On OJS and OPS, which have no ONIX tool (OMP has one at this
     address):
     `/index.php/publicknowledge/en/management/importexport/plugin/Onix30ExportPlugin`

**Expected.** The application's "not found" answer (HTTP 404), as for any
other address that names nothing.

**Observed.** HTTP 200 with `Content-Type: application/json`. The browser
shows one line of text, with no heading, no menu and no link. On OMP it
begins as follows, and the other three tools follow in the same shape.
The JSON ends `"elementId":"0","events":[]}`.

```
{"status":true,"content":"<div class=\"pkp_page_content pkp_page_importexport_plugins\">\n\t<ul>\n\t\t\t\t<li><a href=\"http:\/\/…\/index.php\/publicknowledge\/en\/management\/importexport\/plugin\/Onix30ExportPlugin\">ONIX 3.0 Monograph Export Plugin<\/a>:&nbsp;Export monograph m…
```

Control: the address of a tool the installation has
(`…/management/importexport/plugin/NativeImportExportPlugin`) opens the
"Native XML Plugin" page, with its heading and the trail "Tools".

## Cause

`PKPToolsHandler::importexport()`
([lib/pkp/pages/management/PKPToolsHandler.php, lines 92–109](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/pages/management/PKPToolsHandler.php#L92-L109))
serves two things: a tool's page (`importexport/plugin/<name>`) and, with
no arguments, the list that the Tools page's "Import/Export" tab loads
by AJAX. When `PluginRegistry::getPlugin()` finds no import/export plugin
of that name, the method does not stop. It falls through to the tab's
list and returns it as a JSON message, which the browser shows as text:

```php
if (array_shift($args) === 'plugin') {
    $pluginName = array_shift($args);
    $plugin = PluginRegistry::getPlugin(IMPORTEXPORT_PLUGIN_CATEGORY, $pluginName);
    if ($plugin) {
        return $plugin->display($args, $request);
    }
}
$templateMgr->assign('plugins', PluginRegistry::getPlugins(IMPORTEXPORT_PLUGIN_CATEGORY));
return $templateMgr->fetchJson('management/tools/importexport.tpl');
```

The fall-through dates from 2014 (2df03a7c59), when the fallback was a full page
listing the tools, so an unknown name at least landed on a usable list.
d5c00b0344 ("Fix missing tools landing page", `pkp/pkp-lib#1289`) turned
the list into the Tools page's tab, and the fallback became the tab's
JSON fragment.

Reach:

- Every tool name the registry lacks falls through to the same list:
  another application's tool (checked on screen, all three apps) and a
  mistyped or lower-case name such as `nativeimportexportplugin` (code).
- So does every other address under `…/management/importexport/` that
  does not start with `plugin`, such as `…/importexport/anything`
  (checked on screen, all three apps).
- `…/management/importexport/plugin` with no name answers 500: the null
  name reaches `PluginRegistry::getPlugin(string $category, string
  $name)`. Checked on screen, all three apps; the server log reads
  `Uncaught TypeError: PKP\plugins\PluginRegistry::getPlugin(): Argument
  #2 ($name) must be of type string, null given, called in
  …/lib/pkp/pages/management/PKPToolsHandler.php on line 102`.
- The same class's other router, `PKPToolsHandler::tools()`, ends its
  `switch` in `default: assert(false);`. With assertions off, as in
  production, `…/management/tools/<anything unknown>` answers 200 with
  an empty body: a blank page. Checked on screen, all three apps.
- The DOAJ, Crossref and DataCite tools are registered by their generic
  plugins. With that plugin switched off, the tool is unregistered, and
  its address falls through to the same list (code).
- One screen does lead there. With "DOAJ Plugin" off, the Plugins list
  still offers "Import/Export Data" for "DOAJ Export Plugin". That link
  should not be offered, a separate fault: spec U63
  [OJS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#ojs2).
- The bare `…/management/importexport` and `…/management/permissions`
  are the Tools page's tab endpoints and return JSON by design; typing
  them shows JSON as every tab endpoint does. Left as they are (code).

## Proposed fix

Answer 404 in `PKPToolsHandler` for every address that names nothing.
pkp-lib's `ManagementHandler::settings()` ends its own `switch` this
way. Each app's `pages/gateway/GatewayHandler.php` throws the same
exception for an unknown gateway plugin name, in its constructor (its
`plugin()` method still redirects to the gateway index when no plugin is
set). The diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/tools-absent-tool-address-raw-json/fix.diff).

```diff
             case 'resetPermissions':
                 $this->resetPermissions($args, $request);
                 break;
-            default: assert(false);
+            default:
+                throw new \Symfony\Component\HttpKernel\Exception\NotFoundHttpException();
         }
@@
-        if (array_shift($args) === 'plugin') {
-            $pluginName = array_shift($args);
+        $path = (string) array_shift($args);
+        if ($path === 'plugin') {
+            $pluginName = (string) array_shift($args);
             /** @var ImportExportPlugin */
             $plugin = PluginRegistry::getPlugin(IMPORTEXPORT_PLUGIN_CATEGORY, $pluginName);
-            if ($plugin) {
-                return $plugin->display($args, $request);
+            if (!$plugin) {
+                throw new \Symfony\Component\HttpKernel\Exception\NotFoundHttpException();
             }
+            return $plugin->display($args, $request);
         }
+        if ($path !== '') {
+            throw new \Symfony\Component\HttpKernel\Exception\NotFoundHttpException();
+        }
+
+        // The Tools page's "Import/Export" tab loads this list.
         $templateMgr->assign('plugins', PluginRegistry::getPlugins(IMPORTEXPORT_PLUGIN_CATEGORY));
```

It keeps what d5c00b0344 was for: the tab still loads its list from
the bare address. The `(string)` casts also end the 500 for
`…/importexport/plugin` with no name.

Tried on `main` in OJS, OMP and OPS: the Steps' address now answers
"404 Not Found", as do `…/importexport/plugin`, `…/importexport/<other>`
and `…/tools/<unknown>`. The Tools page's "Import/Export" and
"Permissions" tabs, the "Native XML Plugin" page from the Tools list and
from its "Import/Export Data" link on the Plugins list, and a section
editor's refusal ("The current role does not have access to this
operation.") are unchanged, with and without the fix.

**Alternatives**

- Redirect an unknown name to the Tools page: friendlier, but hides a
  broken bookmark and differs from how every other unknown address
  answers.
- Guard only the `plugin/<name>` branch: leaves `…/importexport/<other>`
  on the raw list and `…/tools/<unknown>` on a blank page, the same
  mistake one line away.

**What goes with it**

- No stored data is involved and no link on screen changes. Plugin
  hooks are not touched: a registered tool's address is served as
  before.
- Backport: the method is the same on 3.5 and 3.4, and 3.3 has it in
  `PKPToolsHandler.inc.php`. On 3.4 and 3.3 the page handlers answer an
  unknown address with `$request->getDispatcher()->handle404()`, not the
  exception. There `ManagementHandler::settings()` runs `assert(false);`
  before `handle404()`. So a backport copies only the `handle404()`:
  with assertions on, as on a development install, the `assert` fails
  first.
- Test: an e2e check in U63 that an absent tool's address answers 404.

Small: the change stays inside one pkp-lib class and adds no new
pattern. It changes no link, hook or stored data, and it was tried on
all three apps.

## Evidence

- Kept scripts:
  - [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/tools-absent-tool-address-raw-json/walk.js)
    takes the Steps on a fresh load of the default dataset and records
    each answer's status, content type, heading and text, then the
    control and the `…/tools/<unknown>` read. Run it with
    `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/tools-absent-tool-address-raw-json/walk.js`.
  - [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/tools-absent-tool-address-raw-json/neighbour.js)
    is the neighbour check (both Tools tabs, the Plugins list's
    "Import/Export Data", the section editor's refusal, and the two other
    `importexport` addresses), walked with the fix in and out.
  - The fix was tried with
    [trial.sh](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/tools-absent-tool-address-raw-json/trial.sh)
    (`node bin/try-fix.js apply fix.diff ojs omp ops`, the walk and the
    neighbour check, then the revert).
- Walked on PostgreSQL, on the default dataset from pkp/datasets 38ab955
  (2026-09-30), `main` and `stable-3_5_0`, all three apps. The fault
  involves no query, so it does not depend on the database.
- Tips:
  - `main`: OJS
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    with pkp-lib
    [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12);
    OMP
    [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262)
    and OPS
    [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2)
    with pkp-lib
    [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a638238c2241f5d3086f93865cb943b8)
    (`PKPToolsHandler.php` identical in both).
  - `stable-3_5_0`: OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17),
    OMP
    [3081c9b00d](https://github.com/pkp/omp/commit/3081c9b00ddde6f893df9995d455ed26c3e66eeb),
    OPS
    [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd1b020b73ff061dbde9cea586207994),
    each with pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1).
  - `stable-3_4_0`: OJS
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833),
    OMP
    [0aec65441f](https://github.com/pkp/omp/commit/0aec65441fcd8f283846f9e43a0c4afffa23cece),
    OPS
    [acd8ae704b](https://github.com/pkp/ops/commit/acd8ae704b26a97e5a32147e151ca339699cf96a),
    each with pkp-lib
    [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747).
  - `stable-3_3_0`: OJS
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144),
    OMP
    [8e72fc8836](https://github.com/pkp/omp/commit/8e72fc88363e8fd997f830a75209718d62a8d9a2),
    OPS
    [c5532e2161](https://github.com/pkp/ops/commit/c5532e2161952b912635d2920d6b63f0cffeaf09),
    each with pkp-lib
    [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072).
- Code reads:
  - 3.5: `importexport()` and `tools()` identical to `main`; walked as
    well.
  - 3.4 (code): `pages/management/PKPToolsHandler.php` has the same
    fall-through to `fetchJson('management/tools/importexport.tpl')` and
    the same `default: assert(false);`, and `PluginRegistry::getPlugin()`
    is typed `string $name` as on `main`. Each app's
    `pages/management/index.php` routes `importexport` to it.
  - 3.3 (code): `pages/management/PKPToolsHandler.inc.php` has the same
    fall-through (lines 91–97) and `default: assert(false);` (line 64).
    `PluginRegistry::getPlugin()` is untyped there, so the no-name
    address falls through to the list instead of failing.
- Introduced: `git blame` on the fall-through points at e3f570bc37
  (the PSR-12 reformat, 2021); `git log -G "importexport.tpl|plugins.tpl"`
  on the file finds 2df03a7c59 (2014) and d5c00b0344. The GitHub API
  lists no pull request for d5c00b0344; `pkp/pkp-lib#1289` is "Tools
  link leads to error", opened by stranack.
- Upstream (searched 2026-09-30 in pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library, by the symptom's words and by `PKPToolsHandler`,
  `importexport`, `getPlugin`): nothing about an unknown tool address.
- Not driven: 3.4 and 3.3 (code only), MySQL.
