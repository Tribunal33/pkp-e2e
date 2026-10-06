# The Crossref and DataCite pages under Tools open with an empty heading and an unnamed browser tab

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OPS
  - 3.5: OJS, OPS
  - 3.4: OJS, OPS (code)
  - 3.3: none (code; the page has its heading)
- **Introduced** `pkp/ojs#3881` and `pkp/ops#517` for `pkp/pkp-lib#8838` · [509fb7f243](https://github.com/pkp/ojs/commit/509fb7f243b223812e04e34c3b97709b4082f036), [95d5e7e8da](https://github.com/pkp/ops/commit/95d5e7e8dab0f5ee12f2d9d17dfab8c1594e4b6a) · 2023-04-20 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U45 [A20](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#a20)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a journal or preprint server, Tools › "Import/Export" › "Crossref
XML Export Plugin" opens a page whose heading is empty and whose
browser tab reads only the journal's name. The page also lacks the
"Tools" / page name breadcrumb the other tool pages show above their
heading. A journal has a second such page, "DataCite
Export/Registration Plugin".

The page is a signpost that was kept on purpose: its only content is
the notice "DOI management has moved.", whose two links work. So no
task fails, but the page has no name anywhere. That fails WCAG 2.4.2
Page Titled (level A), and the empty level-one heading fails 2.4.6
Headings and Labels (level AA).

Only these two pages are affected: a journal's and a preprint server's
other Import/Export tool pages have their heading, tab title and
breadcrumb. The links are listed with or without a registration agency
chosen. A press has no such tools. The
pages already print a heading and only the name is missing from it, so
the report proposes to name them rather than to remove them.

## Impact

- **Lost.** The page's name. No data is lost and no task fails.
- **Who.** Journal and server managers and the site administrator, the
  only roles that see Tools, when they press one of these links or
  "Import/Export Data" on the plugin's row in the Plugins list. A
  screen reader announces a level-one heading with no name.
- **Way round.** None is needed: the notice links to the DOIs page,
  where DOIs are exported and deposited.

Low: a signpost page nobody needs for a task has no name. An
accessibility audit that counts every page against 2.4.2 would raise it
to medium.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS (journal
  `publicknowledge`) or OPS (server `publicknowledge`).

Steps:

1. Sign in as `dbarnes`.
2. In the side menu, open "Tools". The page opens on its
   "Import/Export" tab.
3. Press "Crossref XML Export Plugin".
4. On a journal, go back to "Tools" and press "DataCite
   Export/Registration Plugin".

**Expected.** A page headed "Crossref XML Export Plugin" (step 4:
"DataCite Export/Registration Plugin"), under the breadcrumb "Tools" /
"Crossref XML Export Plugin", in a browser tab titled "Crossref XML
Export Plugin | Journal of Public Knowledge"; then the notice.

**Observed.** The page
(`/index.php/publicknowledge/en/management/importexport/plugin/CrossrefExportPlugin`,
step 4: `…/DataciteExportPlugin`) shows only the notice "DOI management
has moved. Please see the DOI management and DOI settings pages.". Its
level-one heading is there but empty, there is no breadcrumb, and the
browser tab reads "Journal of Public Knowledge" (on the preprint server
"Public Knowledge Preprint Server").

Pressing "Native XML Plugin" in step 3 instead opens a page headed
"Native XML Plugin", under the breadcrumb "Tools / Native XML Plugin", in a
tab titled "Native XML Plugin | Journal of Public Knowledge".

## Cause

An import/export tool's page gets its name from
`PKP\plugins\ImportExportPlugin::display()`
(`lib/pkp/classes/plugins/ImportExportPlugin.php`, line 101), which
assigns `pageTitle` and `breadcrumbs` to the template. Every other
tool's `display()` in OJS and OPS starts with `parent::display()`. The
backend layout prints `pageTitle` in `<title>` before the context's
name and renders the breadcrumb only when `breadcrumbs` is set.

`APP\plugins\DOIPubIdExportPlugin::display()`
(`classes/plugins/DOIPubIdExportPlugin.php`, on `main` line 37 in OJS
and 38 in OPS), the base of `CrossrefExportPlugin` and
`DataciteExportPlugin`, does not make that call for its index page. It
renders `index.tpl` straight away and calls `parent::display()` only in
the `default` branch.

Three templates print the unassigned variable inside the heading:

```smarty
	<h1 class="app__pageHeading">
		{$pageTitle}
	</h1>
```

- `plugins/generic/crossref/templates/index.tpl` in OJS, which lives in
  the `pkp/crossref-ojs` submodule;
- the same path in OPS, in the `pkp/crossref-ops` submodule;
- `plugins/generic/datacite/templates/index.tpl` in OJS's own tree.

509fb7f243 (OJS) and 95d5e7e8da (OPS) made `display()` what it is, for
`pkp/pkp-lib#8838`, "Fatal error when attempting to access
Crossref/Datacite at Tools". Until then `parent::display()` ran before
the `switch`. The parent, `PubObjectsExportPlugin::display()`, first
calls `ImportExportPlugin::display()` and then, in its own index case,
builds the plugin's settings form. Since the DOI refactor these
plugins' `getSettingsFormClassName()` throws ("DOI settings no longer
managed via plugin settings form."), which was the fatal error.

The two commits moved `parent::display()` into `default` and removed
the DOI prefix check from the index case. The index page no longer
runs the parent, so the settings form is not built there. For the same
reason `ImportExportPlugin::display()` no longer runs there either.

Reach:

- "Crossref XML Export Plugin" on OJS and OPS and "DataCite
  Export/Registration Plugin" on OJS: checked on screen. They are the
  only subclasses of `DOIPubIdExportPlugin` in the three apps (checked
  in the code); OMP has no such class and its Tools list has neither
  link (checked on screen).
- The same page opened through "Import/Export Data" on the plugin's
  row on Settings › Website › "Plugins": checked in the code
  (`ImportExportPlugin::getActions()` links the same address).
- The other tools of OJS and OPS (`NativeImportExportPlugin`,
  `PubMedExportPlugin`, `PKPUserImportExportPlugin`, and
  `DOAJExportPlugin` through `PubObjectsExportPlugin`) call
  `parent::display()` first: checked in the code, "Native XML Plugin"
  on screen. OMP's tools were not read for this.

## Proposed fix

In `DOIPubIdExportPlugin::display()`, call
`ImportExportPlugin::display()` in the index case, before the template
is rendered. This is a proposal:
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doi-agency-tool-page-empty-heading/fix-ojs.diff) and
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doi-agency-tool-page-empty-heading/fix-ops.diff), the same change in each app's class.

```diff
+use PKP\plugins\ImportExportPlugin;
 …
             case 'index':
             case '':
+                // The page's heading and breadcrumbs. PubObjectsExportPlugin::display() is
+                // skipped on purpose: its index case builds the retired settings form.
+                ImportExportPlugin::display($args, $request);
                 $templateMgr = TemplateManager::getManager($request);
                 $templateMgr->display($this->getTemplateResource('index.tpl'));
                 break;
```

`ImportExportPlugin::display()` is the one place that assigns
`pageTitle` and `breadcrumbs`, and the other tools reach it through
`parent::display()`. The index case cannot call its direct parent:
that call caused the fatal error 509fb7f243 removed. So the line names
the class two levels up.

It is an instance call to an ancestor's method, so PHP keeps `$this`,
and `getDisplayName()` and `getPluginPath()` are the subclass's.
`$args` has lost its first element by then, and
`ImportExportPlugin::display()` does not read it. The call also
registers the `plugin_url` template function and stores the request,
neither of which the index templates use.

Tried on `main`, OJS and OPS: steps 3 and 4 show the Expected heading,
breadcrumb and tab title, the notice and its two links are unchanged, and
the neighbouring screens behave the same with and without the fix
(Evidence).

**Alternatives**

- Assign `pageTitle` and `breadcrumbs` in the index case itself. It
  works, but copies the lines of `ImportExportPlugin::display()`, and
  the two copies can drift.
- Print the plugin's display name in the three templates (`pkp/ojs`,
  `pkp/crossref-ojs`, `pkp/crossref-ops`). That mends the heading only;
  the tab title and the breadcrumb stay empty.
- Call `parent::display()` first again and make
  `PubObjectsExportPlugin::display()` skip the settings form for these
  plugins. That touches the DOAJ tool's path for no gain.
- Drop the two links and the leftover page. 509fb7f243 is titled
  "Display index page for Tools > Import/Export > any DOI plugin", so
  the page was kept on purpose. The Tools list links every loaded
  import/export plugin, so removing these needs a pkp-lib change, and
  the Plugins rows' "Import/Export Data" link with it. That is a
  product decision; this fix does not stand in its way.

**What goes with it**

- Backport: `display()` is the same on `stable-3_5_0` and
  `stable-3_4_0`, so the `display()` hunk applies there. The import
  hunk does not, except `fix-ops.diff` on OPS `stable-3_5_0`: OJS
  `stable-3_5_0` has `use PKP\submission\PKPSubmission;` after the
  `Galley` import, and both apps' `stable-3_4_0` have
  `use PKP\core\PKPString;` in the block. Add the `use` line by hand
  there.
- Guard: a Planned item in spec U45.

Small: one call and one import in each of two apps' classes.

## Evidence

- A Playwright script that runs the Steps on an install loaded from
  PKP's default test dataset; on OMP it opens Tools and stops, since
  the list has neither tool:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doi-agency-tool-page-empty-heading/walk.js)
  (helpers in [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doi-agency-tool-page-empty-heading/lib.js)), run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/doi-agency-tool-page-empty-heading/walk.js`.
  It records each page's tab title, level-one headings, breadcrumb and
  notice.
- The fix, tried 2026-10-01 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/doi-agency-tool-page-empty-heading/fix-ojs.diff ojs`
  (and `fix-ops.diff ops`), then walk.js and
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doi-agency-tool-page-empty-heading/neighbour.js) with the same command, then
  `revert` for each. neighbour.js gave the same results with the fix
  in and out: "DOI management" opens the page headed "DOIs", "DOI
  settings" opens "Distribution Settings" at `#dois`, "Native XML
  Plugin" keeps its heading, breadcrumb and tab title, and `dbuskins`
  (Section editor, Moderator) at the Crossref tool's address gets "The
  current role does not have access to this operation.".
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30):
  - main: OJS bade233f73, OPS c8af945bb7 (lib/pkp 2e377d27fc); OMP
    3b0ecf794 for the Tools list.
  - stable-3_5_0: OJS 92b9a16b48, OPS cf4fce69bd (lib/pkp a9c76aed62):
    the same result on both, and the same `display()`.
- 3.4, by code: OJS `stable-3_4_0` at 9571d8fde7, OPS at acd8ae704b,
  pkp-lib df13621c2d. `DOIPubIdExportPlugin::display()`, the three
  templates and `ImportExportPlugin::display()` are as on `main`
  (509fb7f243 and 95d5e7e8da are on the branches).
- 3.3, by code: OJS `stable-3_3_0` at 9fdb9bcf9a, OPS at c5532e2161.
  `DOIPubIdExportPlugin.inc.php` calls `parent::display()` before its
  `switch`, so `pageTitle` is assigned. On 3.3 this address is still
  the export screen itself, not the "moved" notice.
- Introduced: `git log -L` on `display()` in each app gives 509fb7f243
  and 95d5e7e8da; GitHub names `pkp/ojs#3881` and `pkp/ops#517` for
  them.
- WCAG: the tab title is the journal's name alone, which does not
  describe the page (2.4.2), and the `h1` has no text (2.4.6). 1.3.1 is
  not claimed: the heading is marked up as a heading. No audit tool was
  run.
- Upstream search 2026-10-01: pkp/pkp-lib by "DOI plugin import export
  page title", "crossref export plugin empty heading", "tools import
  export page title missing breadcrumb", "DOI management has moved" and
  "DOIPubIdExportPlugin display"; pkp/ojs by "crossref export plugin
  page title" and "DOI management has moved"; pkp/ui-library by
  "crossref export plugin". `pkp/pkp-lib#8838` and `pkp/pkp-lib#8978`
  (both closed) are the fatal error the introducing change fixed, not
  this fault.
- Not driven: "Import/Export Data" on the Plugins list rows; 3.4 and
  3.3 on screen.
- Not part of this report, read in the code only: the `default` branch
  passes `$args` on after `array_shift()` has taken its first
  element, so `PubObjectsExportPlugin::display()` never sees the
  operation name. No screen links such an address.
