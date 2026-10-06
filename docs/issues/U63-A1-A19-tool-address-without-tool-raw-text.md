# Import/export tool addresses that name no installed tool show raw code text or a server error

- **Severity** low
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code; raw text for both addresses, no server failure)
- **Introduced** the raw text: [d5c00b0344](https://github.com/pkp/pkp-lib/commit/d5c00b03443a90420f4090d715305b39e94035ff), a commit for `pkp/pkp-lib#1289` with no PR · 2016-07-11 · Alec Smecher (asmecher); the server error: `pkp/pkp-lib#8172` for `pkp/pkp-lib#8167` · [68105f8a06](https://github.com/pkp/pkp-lib/commit/68105f8a0681298581403d1e24b7dfaca20b40b5) · 2022-09-02 · Jonas Raoni Soares da Silva (jonasraoni)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U63 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a1), [A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a19)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager who opens the address of an import/export tool the journal,
press or server does not have expects a page saying there is no such
page. This happens, for example, with a bookmarked Crossref page opened
on a press. Instead, the browser shows the "Import/Export" list as one
line of raw code text (the list's data as JSON,
`{"status":true,"content":"…"}`), with no heading and no menu.

With the tool's name left off the end of the address, the server fails:
the page is blank, or shows the error message on a site set to display
errors.

Nothing is lost, and the manager gets back with the browser's Back
button. Only an address that is bookmarked, typed or edited by hand
leads here, except on a journal where a manager has switched "DOAJ
Plugin" off: its export tool's "Import/Export Data" link on the Plugins
list then opens the raw code text.

## Impact

- **Lost.** Nothing, but nothing on the page explains what went wrong.
- **Who.** A manager or site administrator who opens a tool's address
  that is stale (a bookmark from another site, a tool since removed),
  mistyped, or cut short. On a journal, also one who follows the DOAJ
  export tool's link on the Plugins list after switching "DOAJ Plugin"
  off; it is on by default, so this needs a manager's choice.
- **Way round.** The browser's Back button, then the side menu's
  "Tools" on any ordinary page, which lists every tool the site has.

Low: the task is done another way, and the one screen link that leads
here appears only after a manager switches off a plugin that is on by
default. A link from a default install's screens would raise it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), context
  `publicknowledge`.

Steps:

1. Sign in as `dbarnes`.
2. In the side menu, open "Tools". The page "Tools" opens on its
   "Import/Export" tab, listing the tools.
3. Press "Native XML Plugin". Its page opens, headed "Native XML
   Plugin", at
   `/index.php/publicknowledge/en/management/importexport/plugin/NativeImportExportPlugin`.
4. In the address bar, replace `NativeImportExportPlugin` with the name
   of a tool this application does not have, and open the address: on
   OJS and OPS `Onix30ExportPlugin` (a press's ONIX tool), on OMP
   `CrossrefExportPlugin` (a journal's Crossref tool).
5. In the address bar, delete the tool's name, so the address ends in
   `/management/importexport/plugin`, and open it.

**Expected.** Steps 4 and 5 each show the application's "404 Not
Found" page.

**Observed.** Step 4 answers 200 `application/json`, and the browser
shows one line of raw code text, the "Import/Export" list's HTML inside
it, with no heading and no menu:

```
{"status":true,"content":"<div class=\"pkp_page_content pkp_page_importexport_plugins\">\n\t<ul>\n\t\t\t\t<li><a href=\"http:\/\/…\/index.php\/publicknowledge\/en\/management\/importexport\/plugin\/DOAJExportPlugin\">DOAJ Export Plugin<\/a>:&nbsp;Export Journal for DOAJ.<\/li>…
```

Step 5 answers 500, and the server log reads:

```
PHP Fatal error:  Uncaught TypeError: PKP\plugins\PluginRegistry::getPlugin(): Argument #2 ($name) must be of type string, null given, called in …/lib/pkp/pages/management/PKPToolsHandler.php on line 102
```

With `display_errors` off, as on a production server, the body is empty
and the page blank; a development install with it on may print the
fatal error instead.

An unknown address elsewhere under Settings, such as
`/management/settings/nosuchtab`, shows "404 Not Found" as expected.

## Cause

`PKPToolsHandler::importexport()` (`lib/pkp/pages/management/PKPToolsHandler.php`,
lines 99–108) serves two kinds of address. The bare
`…/management/importexport` is the fragment the Tools page loads into
its "Import/Export" tab, answered as JSON by
`fetchJson('management/tools/importexport.tpl')`. An address
`…/importexport/plugin/<name>` opens that tool's page through
`$plugin->display()`. Every other address under `importexport` falls
through to the tab's JSON fragment. This happens when the name is not a
loaded import/export plugin, or when the first segment is not `plugin`.
An address the browser opens as a page and that names nothing should
answer "not found", as `ManagementHandler::settings()` does for an
unknown tab (`throw new NotFoundHttpException()`).

The fall-through dates from 2014 (2df03a7c59, "Move import/export to
tools handler"). It used to `display()` the list as a full page with
header and footer. d5c00b0344 (`pkp/pkp-lib#1289`, "Fix missing tools
landing page") made the list the Tools page's tab and changed that line
to `fetchJson()`. Since then, an address opened in the browser gets the
tab's JSON.

When the address has no name after `plugin`, `array_shift()` gives
`null`. 68105f8a06 (`pkp/pkp-lib#8172`, typing `PluginRegistry`) made
`getPlugin(string $category, string $name)` strict. Since then, that
`null` throws a `TypeError` before the fall-through is reached.

Both count as regressions: before 2016 these addresses showed the tool
list as a full page with heading and menu, and from 2016 to 2022 the
address without a name showed the raw text rather than failing.

Reach:

- Every name that is not a loaded import/export plugin of the context
  gives the raw text, checked on screen on the three apps: another
  application's tool, a tool's name in lower case
  (`…/plugin/nativeimportexportplugin`), any other segment
  (`…/importexport/anything`), and on OPS `UserImportExportPlugin`
  (OPS has no Users XML tool).
- On OJS, with "DOAJ Plugin" switched off, Settings › Website ›
  "Plugins" still offers "DOAJ Export Plugin" with "Import/Export
  Data", and that link opens this raw text. Why the row stays is a
  separate finding; with this fix the link opens "404 Not Found".
- The same handler's `tools()` ends its `switch` in
  `default: assert(false);`. So `…/management/tools/anything` answers
  500 (`Uncaught AssertionError: assert(false)`, line 68) where
  `zend.assertions` is on, checked on screen on the three apps.
- A Section Editor (`dbuskins`) at the step 4 address gets the
  access-denied page before the handler runs, checked on screen.

## Proposed fix

Answer "not found" from `PKPToolsHandler` for every address it does not
serve: a tool name that is missing or not loaded, any segment other than
`plugin`, and an unknown `tools/` path. This is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/tool-address-without-tool-raw-text/fix.diff),
one file in pkp-lib, so it covers all three apps:

```diff
+use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
 …
             case 'resetPermissions':
                 $this->resetPermissions($args, $request);
                 break;
-            default: assert(false);
+            default:
+                throw new NotFoundHttpException();
         }
 …
-        if (array_shift($args) === 'plugin') {
-            $pluginName = array_shift($args);
-            /** @var ImportExportPlugin */
+        $path = array_shift($args);
+        if ($path === 'plugin') {
+            $pluginName = (string) array_shift($args);
+            /** @var ?ImportExportPlugin */
             $plugin = PluginRegistry::getPlugin(IMPORTEXPORT_PLUGIN_CATEGORY, $pluginName);
-            if ($plugin) {
-                return $plugin->display($args, $request);
+            if (!$plugin) {
+                throw new NotFoundHttpException();
             }
+            return $plugin->display($args, $request);
         }
+        if ($path !== null) {
+            throw new NotFoundHttpException();
+        }
```

The fix keeps both jobs of `importexport()`: the bare address still
answers the tab's JSON, and a loaded tool still opens its page. Tried on
`main` on the three apps: steps 4 and 5 show "404 Not Found", and the
Tools page, the tools' own pages and a Section Editor's refusal are
unchanged.

**Alternatives**

- Redirect to the Tools page, as `GatewayHandler::plugin()` redirects
  an unknown gateway to the index. It hides a wrong address without
  saying so, and the other management pages answer "not found".
- Keep the fall-through and `display()` the list as a page, as before
  2016. That needs a second template for a page nobody links to, and a
  wrong address still looks valid.
- Make `PluginRegistry::getPlugin()` accept `null`. That fixes step 5
  only, and turns the crash into the raw text.

**What goes with it**

- Nothing is stored, so there is no data repair. No screen and no
  plugin builds an `importexport` address other than the bare one and
  `plugin/<name>` (searched in pkp-lib and the three apps:
  `ImportExportPlugin::pluginUrl()`, `ExportableUsersGridHandler`, the
  two templates). So only hand-made addresses change. An address ending
  in a slash, `…/importexport/`, still gets the tab's JSON:
  `Core::_getUrlComponents()` trims the trailing slash before splitting
  the path, so no empty segment reaches the handler.
- Left out: the OJS export grids (`ExportPublishedSubmissionsListGridHandler`,
  `PubIdExport…GridHandler` and their OMP and OPS twins) also pass a
  request's `plugin` value to `getPlugin()`. These grids are fetched
  only by a tool's own page, which always sends `plugin=<name>`.
- Backport: on 3.5 the file is the same and the diff applies as it
  stands. 3.4 and 3.3 do the same with
  `$request->getDispatcher()->handle404()`, the not-found call of their
  handlers.
- Guard: an end-to-end check in pkp-e2e that opens both addresses and
  expects 404.

Small: one handler file in pkp-lib, no stored data, no change for any
link the screens build.

## Evidence

- Kept script that takes the Steps in the browser on the three apps,
  on an install loaded from PKP's default test dataset, and opens the
  `/management/settings/nosuchtab` control:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/tool-address-without-tool-raw-text/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/tool-address-without-tool-raw-text/lib.js)),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/tool-address-without-tool-raw-text/walk.js`.
  It records each answer's status and content type, and the server log
  lines written during step 5.
- The fix, tried 2026-10-01 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/tool-address-without-tool-raw-text/fix.diff ojs omp ops`,
  then walk.js and
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/tool-address-without-tool-raw-text/neighbour.js)
  with the same command, then
  `node bin/try-fix.js revert shared/playwright/checks/issues/tool-address-without-tool-raw-text/fix.diff ojs omp ops`.
  Results of neighbour.js with the fix in and out:
  - The Tools page's two tab requests (`…/management/importexport`,
    `…/management/permissions`) answered 200 both times. "Native XML
    Plugin" and "Users XML Plugin" opened both times (OPS has no Users
    XML tool: raw text without the fix, 404 with it).
  - `…/importexport/anything` and `…/plugin/nativeimportexportplugin`
    gave raw text without the fix and 404 with it.
  - `…/management/tools/anything` gave 500 without the fix and 404 with
    it.
  - `dbuskins` at the step 4 address got "The current role does not
    have access to this operation." both times.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`, no
  upgrade needed:
  - main: OJS bade233f73 (lib/pkp 2e377d27fc), OMP 3b0ecf794 and OPS
    c8af945bb7 (lib/pkp 3dc90c81a6).
  - stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00, OPS cf4fce69bd (lib/pkp
    a9c76aed62). Same results as on `main`. `PKPToolsHandler.php` is
    byte-identical to `main`'s.
  - Nothing here depends on the database; MySQL not checked.
- 3.4, by code: pkp-lib `stable-3_4_0` at df13621c2d, OJS 9571d8fde7,
  OMP 0aec65441, OPS acd8ae704b. `importexport()` and `tools()` are the
  same as on `main`, `getPlugin()` takes `string $name`, and each app's
  `pages/management/index.php` routes `importexport` to
  `PKPToolsHandler`.
- 3.3, by code: pkp-lib `stable-3_3_0` at d446601ebe, OJS 9fdb9bcf9a,
  OMP 8e72fc883, OPS c5532e2161. `importexport()` has the same
  fall-through. `getPlugin($category, $name)` is untyped and returns
  `null` for a missing name, so the address of step 5 also gives the
  raw text rather than a server failure.
- Introduced: `git blame` on lines 99–108 leads to e3f570bc37
  (`pkp/pkp-lib#5678`, PSR-12 reformat); `git log -L` on the method
  before it gives 2df03a7c59 and d5c00b0344, for which GitHub lists no
  PR. The template the 2014 code displayed,
  `templates/manager/importexport/plugins.tpl`, included the header and
  footer. `pkp/pkp-lib#8172` was merged 2022-11-09.
- Upstream search 2026-10-01: pkp/pkp-lib by "importexport plugin
  json", "PKPToolsHandler", "getPlugin \"null given\"",
  "\"management/importexport\"", "import export plugin not found 404"
  and "tools importexport raw JSON"; pkp/ojs, pkp/omp and pkp/ops by
  "importexport plugin json"; pkp/ui-library by "importexport tool
  json". The nearest, `pkp/pkp-lib#8838` and `pkp/pkp-lib#8978`, are
  500s on the Crossref and DataCite tools' own pages, a different fault.
- Unverified: with `zend.assertions = -1` (PHP's production default),
  `assert(false)` is compiled out. `…/management/tools/anything` would
  then likely answer an empty 200 page rather than 500 (not driven).
