# Pressing "Tab Delimited Content Import Plugin" on a press's Tools page opens a blank page

- **Severity** low
- **Effort** small
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** a commit for `pkp/pkp-lib#1264`, with no PR · [c5a5e1a93](https://github.com/pkp/omp/commit/c5a5e1a93ddaa47c38820acc42df97e3231e0378) · 2016-03-16 · Alec Smecher (asmecher)
- **Upstream** `pkp/pkp-lib#8785` (open; the same blank page, reported on OMP 3.4.0rc1)
- **Tracked in** spec U63 [OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#omp1)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A press's Tools list links "Tab Delimited Content Import Plugin", which
opens a blank page: the server fails. The tool works only from the
server's command line, and the page behind the link was meant to say so
and name the command.

Nothing is lost, since the tool imports nothing through the screens.
But a press manager who presses the link learns nothing about how to
use the tool, and sees no error message. Every press shows the link,
with no setting needed.

## Impact

- **Lost.** No data. The press loses the only on-screen pointer to
  the command-line import.
- **Who.** Users in a manager-level group (the dataset's "Press
  manager" and "Press editor") and the site administrator, the only
  roles that see Tools. Series editors cannot open Tools.
- **Way round.** None on screen. The command's help is only on the
  server (`php tools/importExport.php CSVImportExportPlugin`).

Low: the tool has no web function, so the only cost is a blank page
where its instructions should be.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OMP), press `publicknowledge`.

Steps:

1. Sign in as `dbarnes`.
2. In the side menu, open "Tools". The page "Tools" opens on its
   "Import/Export" tab, listing "Native XML Plugin", "Tab Delimited
   Content Import Plugin", "Users XML Plugin" and "ONIX 3.0 Monograph
   Export Plugin".
3. Press "Tab Delimited Content Import Plugin".

**Expected.** A page headed "Tab Delimited Content Import Plugin", under
the trail "Tools" / "Tab Delimited Content Import Plugin", with the
tool's own message, a paragraph with the command set as code:

```
This plugin currently supports command-line operation only. Execute...
php tools/importExport.php CSVImportExportPlugin
...for more information.
```

**Observed.** The address
`/index.php/publicknowledge/en/management/importexport/plugin/CSVImportExportPlugin`
answers 500 with an empty body, a blank white page. The server log
reads:

```
PHP Fatal error:  Uncaught InvalidArgumentException: No hint path defined for [CSVImportExportPlugin]. in …/lib/pkp/lib/vendor/laravel/framework/src/Illuminate/View/FileViewFinder.php:111
```

On 3.5 the same step logs
`PHP Fatal error:  Uncaught  --> Smarty: Unknown resource type 'plugins-1-plugins-importexport-csv-importexport-csv' <--`.

Pressing "Native XML Plugin" in step 3 instead opens its page as
expected.

## Cause

"Tab Delimited Content Import Plugin" is OMP's `CSVImportExportPlugin`.
Its `display()` (`plugins/importexport/csv/CSVImportExportPlugin.php`,
line 89) renders `$this->getTemplateResource('index.tpl')`, but the
plugin has no `templates/` directory and never had one. A plugin's
template namespace is registered only when that directory exists
(`Plugin::_registerTemplateResource()` checks `getTemplatePath()`).
So the template name cannot be resolved, and the request ends in an
uncaught exception: Laravel's view finder on `main`, Smarty on 3.5 and
older.

c5a5e1a93 ("Add CLI-only warning for CSV plugin", for
`pkp/pkp-lib#1264`, "Some import/export pages don't work in OMP") added
this `display()` and the locale key `plugins.importexport.csv.cliOnly`
with the message above, so that the Tools link would explain that the
tool is command-line only. The template that shows the message was not
committed. The key is in 25 of the plugin's locale files today, but
nothing displays it.

The Tools list links every loaded import/export plugin
(`lib/pkp/templates/management/tools/importexport.tpl`). Only the
Plugins list honours the plugin's `getActions()`, which returns `[]`
("Not available via the web interface", c3c30c530, 2015). So the
Plugins list's row has no "Import/Export Data" while the Tools list
still links the page.

Reach:

- Every role that sees Tools: `PKPToolsHandler`
  admits the manager role and the site administrator, checked in the
  code; `dbarnes` ("Press editor") checked on screen.
- A Series editor (`dbuskins`) at the address gets "The current role
  does not have access to this operation." before the plugin runs:
  checked on screen.
- No other import/export plugin in OJS, OMP or OPS renders a template
  its directory lacks: checked in the code (every
  `getTemplateResource('…')` call under the three apps' `plugins/` and
  `lib/pkp/plugins/`). OJS and OPS do not ship this tool: their Tools
  lists, checked on screen, do not show it.

## Proposed fix

Add the missing template, `plugins/importexport/csv/templates/index.tpl`,
which shows the message c5a5e1a93 wrote. This is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/command-line-tool-link-blank-page/fix.diff),
one new file in OMP:

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

It follows the press's ONIX 3.0 tool page
(`plugins/importexport/onix30/templates/index.tpl`): the backend layout,
the page heading, a content panel. `ImportExportPlugin::display()`
already sets the heading and the "Tools" trail. The message carries its
own `<p>` and `<pre>`, so the template adds only the panel around it.
The web import stays off, as c3c30c530 intended.

Tried on `main`: step 3 shows the Expected page with no server error,
and the neighbouring screens are unchanged (Evidence).

**Alternatives**

- Leave the tool out of the Tools list, for example through a new
  "has a web page" flag on `ImportExportPlugin` that
  `PKPToolsHandler::importexport()` reads. That touches pkp-lib's
  plugin contract for one plugin, and managers lose the only on-screen
  hint that the tool exists.
- Remove `display()`. The base `display()` renders nothing, so the
  link would open an empty page with no error, which is worse.

**What goes with it**

- Nothing is stored, so there is no data repair, and no API or hook
  changes.
- Backport: the file applies as it stands to 3.5 and 3.4, which render
  the same template name through Smarty. On 3.3, drop the `div`: that
  line's ONIX page has no `app__contentPanel`.
- Guard: a Planned item in spec U63 (every link in the Tools list opens
  a page headed with the tool's name).

Small: one new template file in OMP, tried.

## Evidence

- A Playwright script that runs the Steps on an install loaded from
  PKP's default test dataset; it opens Tools on OJS and OPS too and
  stops there, since their lists have no such tool:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/command-line-tool-link-blank-page/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/command-line-tool-link-blank-page/lib.js)),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/command-line-tool-link-blank-page/walk.js`.
  It records the answer's status, size and content type, and the server
  log lines written during step 3.
- The fix, tried 2026-10-01 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/command-line-tool-link-blank-page/fix.diff omp`,
  then walk.js and
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/command-line-tool-link-blank-page/neighbour.js)
  with the same command, then
  `node bin/try-fix.js revert shared/playwright/checks/issues/command-line-tool-link-blank-page/fix.diff omp`.
  neighbour.js gave the same results with the fix in and out: the
  "Tab Delimited Content Import Plugin" row on Settings › Website ›
  "Plugins" has no actions, the "Native XML Plugin" row offers
  "Import/Export Data", and `dbuskins` at the tool's address gets the
  access-denied page.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `omp/main/pgsql` and `omp/stable-3_5_0/pgsql`:
  - main: OMP 3b0ecf794 (lib/pkp 3dc90c81a6).
  - stable-3_5_0: OMP 3081c9b00 (lib/pkp a9c76aed62), the same
    `display()` and `_registerTemplateResource()`.
- 3.4, by code: OMP `stable-3_4_0` at 0aec65441f, pkp-lib df13621c2d.
  `CSVImportExportPlugin::display()` renders `index.tpl` (line 89), the
  plugin has no `templates/` directory, `_registerTemplateResource()` is
  as on 3.5, and `importexport.tpl` links every plugin. The error in
  `pkp/pkp-lib#8785` was reported on OMP 3.4.0rc1.
- 3.3, by code: OMP `stable-3_3_0` at 8e72fc8836, pkp-lib d446601ebe.
  `CSVImportExportPlugin.inc.php` renders `index.tpl` (line 203) with no
  `templates/` directory, `_registerTemplateResource()` has the same
  check, `importexport.tpl` links every plugin, and the `cliOnly` key is
  in `locale/en_US/locale.po`.
- Introduced: `git blame` on `display()` gives 01088072a8 (2021, PSR-12
  reformat). `git log -S "index.tpl"` on the plugin gives c5a5e1a93,
  which added `display()` and the `cliOnly` key. `git log --all` finds
  no `.tpl` file under `plugins/importexport/csv` in any commit. GitHub
  lists no PR for c5a5e1a93.
- Upstream search 2026-10-01: pkp/pkp-lib by "Tab Delimited" and "csv
  import plugin 500"; pkp/omp by "CSVImportExportPlugin", "Tab
  Delimited" and "csv import plugin blank". `pkp/pkp-lib#8785` is this
  fault (same step, the 3.4 Smarty error). A maintainer comment there
  calls it longstanding and leaves it open "for a resolution -- but not
  for 3.4.0-0". The open OMP PRs `pkp/omp#1631` and `pkp/omp#1828`
  rework the CSV import; their file lists add no template. Not
  searched: pkp/pkp-lib by "CSVImportExportPlugin", and pkp/ui-library.
- Not part of this report: the command-line import of the plugin's
  `sample.csv` on OMP `main` is a separate open lead. This code read
  did not reach that part of the class.
