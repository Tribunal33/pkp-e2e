# Pressing "Tab Delimited Content Import Plugin" in a press's Tools list opens a blank page

- **Severity** low
- **Effort** small
- **Kind** intention gap
- **Crash** server
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** [c5a5e1a93d](https://github.com/pkp/omp/commit/c5a5e1a93ddaa47c38820acc42df97e3231e0378), committed without a pull request, for `pkp/pkp-lib#1264` · 2016-03-16 · Alec Smecher (asmecher)
- **Upstream** `pkp/pkp-lib#8785` (open)
- **Tracked in** spec U63 [OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#omp1)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A press's Tools › "Import/Export" list shows "Tab Delimited Content
Import Plugin" as a link. When a manager presses it, the server fails and
the browser shows a blank white page.

The tool runs only from the server's command line. The page behind the
link was meant to say so and how to run it. The plugin has that message,
translated, but the page that would show it is missing.

Nothing is lost. PKP's "Learning OMP" guide says the tool is
command-line only, and the command line prints its usage.

## Impact

- **Lost.** No data or work. The manager gets no explanation, and each
  press of the link writes a fatal error to the server log.
- **Who.** Everyone who can open Tools on a press: users in a
  manager-level role (in the default dataset "Press manager" and "Press
  editor") and the site administrator. "Permit changes to Settings" does
  not affect Tools.
- **Way round.** None on screen. PKP's
  [Learning OMP › Tools](https://docs.pkp.sfu.ca/learning-omp/en/tools)
  says "The Tab Delimited Content Import Plugin can only be used with the
  command line". Neither it nor the Administrator's Guide says how to
  run the tool. On the server, `php tools/importExport.php
  CSVImportExportPlugin` prints the usage.

Low: the link leads nowhere, but PKP's documentation already tells a
press the tool is command-line only.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main` (or `stable-3_5_0`), with
  its press `publicknowledge`, "Public Knowledge Press". Nothing else is
  needed.

1. Sign in as `rvaca` (the press manager).
2. In the side menu, click "Tools". The "Import/Export" tab lists "ONIX
   3.0 Monograph Export Plugin", "Tab Delimited Content Import Plugin",
   "Native XML Plugin" and "Users XML Plugin".
3. Click "Tab Delimited Content Import Plugin" ("Import submissions into
   presses from tab delimited data.").

**Expected:** a page headed "Tab Delimited Content Import Plugin" under
the trail "Tools" › "Tab Delimited Content Import Plugin", with the
plugin's own message: "This plugin currently supports command-line
operation only. Execute... `php tools/importExport.php
CSVImportExportPlugin` ...for more information."

**Observed:** a blank white page with no heading and no menu. The page's
request answers 500 with an empty body:

```
GET /index.php/publicknowledge/en/management/importexport/plugin/CSVImportExportPlugin   500
```

The server log on `main`:

```
PHP Fatal error:  Uncaught InvalidArgumentException: No hint path defined for [CSVImportExportPlugin]. in …/lib/pkp/lib/vendor/laravel/framework/src/Illuminate/View/FileViewFinder.php:111
```

and on `stable-3_5_0`:

```
PHP Fatal error:  Uncaught  --> Smarty: Unknown resource type 'plugins-1-plugins-importexport-csv-importexport-csv' <--
```

Control: "Native XML Plugin" in the same list opens its page under
"Tools" › "Native XML Plugin". On Settings › "Website" › "Plugins", the
other import/export tools' rows offer an "Import/Export Data" link to
their page; the "Tab Delimited Content Import Plugin" row offers none,
as intended for a command-line tool.

## Cause

The page the link opens is a template that was never added to the
repository. `CSVImportExportPlugin::display()`
(`plugins/importexport/csv/CSVImportExportPlugin.php`, lines 82–92)
renders `$this->getTemplateResource('index.tpl')` (line 89), but the
plugin has no `templates/` directory, and none has ever been committed.

`Plugin::_registerTemplateResource()` (lib/pkp
`classes/plugins/Plugin.php`, line 417) registers a plugin's template
namespace only when `getTemplatePath()` finds a `templates/` directory.
So the name `CSVImportExportPlugin::index` resolves to nothing, and the
view finder throws. On 3.5 and older it is the Smarty resource
`plugins-1-plugins-importexport-csv-importexport-csv` that is missing.
The exception is not caught, so the request ends in a fatal error with
nothing rendered.

This is an intention gap. `pkp/pkp-lib#1264` asked for the broken
Tools link to this tool to be fixed or removed. Commit c5a5e1a93d closed
it by adding the `display()` override and the locale key
`plugins.importexport.csv.cliOnly` ("a placeholder note for this for
now"), but not the template that shows the note, so the link still ends
on a broken page.

The link comes from lib/pkp `templates/management/tools/importexport.tpl`,
which links every plugin in the `importexport` category. The Plugins list
leaves the link out because `getActions()` (line 71, commit c3c30c5305
of 2015) returns `[]`.

Reach:

- Only this plugin. Every `getTemplateResource('…')` call in the plugins
  of OJS, OMP and OPS `main` and in their lib/pkp was checked against the
  files. Each other call names a template that exists. The calls in
  lib/pkp's shared import/export plugins find theirs in the app plugin's
  own `templates/`, and the calls without `.tpl` name `.blade` views.
  Checked in the code.
- The command-line import itself is a separate matter. On `main`,
  running it on the plugin's `sample.csv` stops with `Call to undefined
  method APP\author\Author::setUserGroupId()` (line 220). That method
  was removed on `main` only (pkp-lib 52d3a0f8e7, "Contributor Roles and
  Type"). This report does not cover it.

## Proposed fix

Add the page the 2016 commit meant to add: a
`plugins/importexport/csv/templates/index.tpl` in OMP that shows the
plugin's heading and its existing `cliOnly` message. The whole diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-tools-csv-import-blank-page/fix.diff):

```smarty
{extends file="layouts/backend.tpl"}

{block name="page"}
	<h1 class="app__pageHeading">
		{$pageTitle|escape}
	</h1>

	<div class="app__contentPanel">
		{translate key="plugins.importexport.csv.cliOnly"}
	</div>
{/block}
```

With the directory in place, `_registerTemplateResource()` registers the
namespace, and `display()` needs no change.

The page has the same layout as the Crossref and DataCite pages in OJS
(`plugins/generic/crossref/templates/index.tpl`: backend layout,
heading, one message), with two differences:

- The title is escaped (`|escape`), as the Native XML and ONIX
  templates beside it do; the Crossref template prints it unescaped.
- The message sits in a plain `app__contentPanel` div, as on the Native
  XML and ONIX pages, not in `<notification type="warning">`. It tells
  the manager how to use the tool rather than warning them, and it
  holds a `<pre>` block.

The `cliOnly` message is already HTML: `<p>This plugin … Execute...
<pre>php tools/importExport.php CSVImportExportPlugin</pre> ...for more
information.</p>`. A `<pre>` inside a `<p>` is invalid nesting, so the
browser closes the paragraph before the `<pre>`. The page still reads as
intended. The fix leaves the message as it is: the markup lives in 25
locale files, which Weblate maintains from the English source.

Tried on `main`: the link then shows Expected (status 200), and the
server logs no error. With and without the fix, `sberardo` (a series
editor) typing the page's address got "The current role does not have
access to this operation.", and the Plugins list row still offered no
"Import/Export Data".

**Alternatives:**

- Show plugins with no web screen as plain text in the Tools list (a
  flag on `ImportExportPlugin`, read by lib/pkp `importexport.tpl`).
  That works for every app, but it adds a new plugin contract for the
  one plugin that needs it, and it hides the usage note the plugin
  already carries.
- Drop the `display()` override. The base
  `ImportExportPlugin::display()` renders nothing, so the link would
  answer 200 with an empty page: the same dead end, without the error.

**What goes with it:**

- A guard: an e2e check that opens every link in Tools › "Import/Export"
  on all three apps and expects a heading, with no server error.
- Backport: the same file applies to `stable-3_5_0` and `stable-3_4_0`
  as written. `stable-3_3_0` has the same `display()`,
  `_registerTemplateResource()`, `layouts/backend.tpl` and the `cliOnly`
  key (in `locale/en_US/locale.po`), so the file fits there too
  (unverified).
- Correcting the message's markup (`<p>…</p><pre>…</pre><p>…</p>`), if
  the team wants it, is a change to the English source only; Weblate
  carries it to the other locales.

Small: one new template file, and its message already exists in every
locale.

## Evidence

- Kept scripts:
  - [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-tools-csv-import-blank-page/walk.js)
    takes the Steps on a fresh load of the default dataset and records
    the page, its status and the server log lines, then the two
    controls. On OJS and OPS it only reads the Tools list. Run it with
    `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/omp-tools-csv-import-blank-page/walk.js`.
  - [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-tools-csv-import-blank-page/neighbour.js)
    is the neighbour check (OMP only), walked with the fix in and out.
  - The fix was tried with
    [trial.sh](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-tools-csv-import-blank-page/trial.sh)
    (`node bin/try-fix.js apply fix.diff omp`, the walk and the neighbour
    check, then the revert).
- Walked on PostgreSQL, on the default dataset from pkp/datasets
  38ab955 (2026-09-30), `main` and `stable-3_5_0`. The fault involves no
  query, so it does not depend on the database.
- Tips: OMP `main`
  [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262)
  with pkp-lib
  [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a638238c2241f5d3086f93865cb943b8);
  OMP `stable-3_5_0`
  [3081c9b00d](https://github.com/pkp/omp/commit/3081c9b00ddde6f893df9995d455ed26c3e66eeb)
  with pkp-lib
  [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1);
  OMP `stable-3_4_0`
  [0aec65441f](https://github.com/pkp/omp/commit/0aec65441fcd8f283846f9e43a0c4afffa23cece)
  with pkp-lib
  [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747);
  OMP `stable-3_3_0`
  [8e72fc8836](https://github.com/pkp/omp/commit/8e72fc88363e8fd997f830a75209718d62a8d9a2)
  with pkp-lib
  [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072).
- Code reads:
  - 3.4 (code): `plugins/importexport/csv/` holds no `templates/`, and
    `display()` renders `getTemplateResource('index.tpl')`. The Tools
    template and `PKPToolsHandler::importexport()` link and dispatch it
    as on `main`, and `Plugin::_registerTemplateResource()` registers
    only an existing `templates/`.
  - 3.3 (code): the same, in `CSVImportExportPlugin.inc.php` (line 203)
    and `Plugin.inc.php` (lines 357–362).
  - Who reaches Tools: `PKPToolsHandler`'s role assignment
    (`ROLE_ID_MANAGER`, `ROLE_ID_SITE_ADMIN` for `tools` and
    `importexport`). `ManagementHandler::authorize()` adds the settings
    policy only for the `settings` operation.
  - The error on 3.5 matches the one quoted in `pkp/pkp-lib#8785`
    (reported on OMP 3.4.0rc1).
- Introduced: `git log -S "index.tpl" --follow` on the plugin file
  finds c5a5e1a93d. `git log --all` over
  `plugins/importexport/csv/**/*.tpl` finds no template ever committed.
  On `pkp/pkp-lib#8785` Alec Smecher calls the web UI "broken … since
  it was written" and left the issue open "for a resolution".
- Upstream (searched 2026-09-30 in pkp/pkp-lib, pkp/omp and
  pkp/ui-library): besides `pkp/pkp-lib#8785` and `pkp/pkp-lib#1264`,
  `pkp/omp#1828` (a CSV tool port to 3.4, open) and `pkp/omp#1631` (a
  command-line name-parsing fix, open) touch the plugin, and neither
  adds the template.
- Documentation (read 2026-09-30):
  [Learning OMP › Tools](https://docs.pkp.sfu.ca/learning-omp/en/tools)
  has the one command-line sentence quoted in Impact. The
  [Administrator's Guide › Data Import and Export](https://docs.pkp.sfu.ca/admin-guide/en/data-import-and-export)
  does not mention the tool. On 3.3 the plugin carried a `README.md`;
  `main` has none.
- The command-line import: run once on `main` against a fresh default
  dataset with the plugin's `sample.csv` (its PDF path pointed at a
  local file), as `admin`. It stopped with the fatal error quoted in
  the Cause. It was not run on 3.5, where `Author::setUserGroupId()`
  still exists.
- Not driven: MySQL.
