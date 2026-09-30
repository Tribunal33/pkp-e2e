# Going back to an earlier Native XML "Import Results" tab imports the file again, duplicating submissions and published articles

- **Severity** high
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP (code; OPS has no Native XML Plugin)
- **Introduced** `pkp/pkp-lib#143` (bugzilla 8707, the jQuery UI 1.8.6 → 1.10.4 upgrade) · [748b3723c2](https://github.com/pkp/pkp-lib/commit/748b3723c28e606696911c51f836782f26b30c04) · 2014-04-17 · commit by Michael Thessel (MichaelThessel), PR by Bruno Beghelli (beghelli)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U63 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a7)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A manager imports a file with Tools › "Native XML Plugin" and gets an
"Import Results" tab ("Results" on a press). If they choose another tab
on that page and then that results tab again, the app runs the whole
import once more. The tab reads as before, apart from the new
submission numbers.

Each return adds another copy of every item in the file, and no warning
is shown. Articles that the file marks as published are published
again: a journal's issue table of contents lists each of them once per
copy. No screen deletes the copies.

## Impact

- **Lost:** a correct public record and submission list. Duplicate
  articles appear in the issue's table of contents for readers, and
  duplicate submissions appear on the Dashboard.
- **Who:** a manager who imports content with the Native XML Plugin,
  typically back issues when moving a journal to OJS. Each time they
  choose another tab on the plugin page and then a results tab again,
  the import runs once more. Opening a results tab for the first time
  and switching between the other tabs do not trigger it.
- **Way round:** before it happens, only not choosing a results tab a
  second time, which nothing on screen suggests. Afterwards, each
  published copy can be taken off the table of contents with
  "Unpublish" in its workflow. No screen deletes a complete submission:
  the Dashboard's delete is offered only for incomplete ones. A manager
  can delete the copies only through the REST API
  (`DELETE /api/v1/submissions/{id}`).

High: an ordinary manager action puts duplicate published articles in
front of readers without any warning, and no screen can delete them.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, context `publicknowledge`.
  Nothing else is needed: each group exports the file it then imports.

A published article (OJS):

1. Sign in as `rvaca` (Journal manager).
2. Open "Tools" (`/index.php/publicknowledge/en/management/tools`) and
   choose "Native XML Plugin".
3. Choose the "Export Articles" tab. Tick submission 17, "Antimicrobial,
   heavy metal resistance and plasmid profile of coliforms isolated from
   nosocomial infections in a hospital in Isfahan, Iran" (published in
   Vol. 1 No. 2 (2014)), and press "Export Articles".
4. In the "Export Submissions Results" tab, press "Download Exported
   File" and keep the file.
5. Choose the "Import" tab, press "Upload File" and choose the
   downloaded file.
6. Press "Import". The "Import Results" tab opens.
7. Choose the "Import" tab.
8. Choose the "Import Results" tab again.
9. Open the journal's site, then "Archives" › "Vol. 1 No. 2 (2014)".

Any submission (OJS, OMP, OPS):

- OJS: submission 8, "Traditions and Trends in the Study of the
  Commons"; export tab and button "Export Articles".
- OMP: submission 3, "The Political Economy of Workplace Injury in
  Canada"; export tab "Export", button "Export Submissions"; the
  results tab is "Results".
- OPS: submission 1, "The influence of lactation on the quantity and
  quality of cashmere production"; export tab and button "Export
  Preprints".

1–8. As above, with that submission.
9. Open the Dashboard and choose "Active submissions" in its side menu.
   Look for the title.

**Expected:** step 8 shows the result of step 6 again, unchanged. The
issue's table of contents lists the article twice: the original and the
one copy that step 6 imported. The Dashboard lists the title twice.

**Observed:** step 6 reads:

```
The import completed successfully. The following items were imported:
Submission
"21" - "Antimicrobial, heavy metal resistance and plasmid profile of coliforms isolated from nosocomial infections in a hospital in Isfahan, Iran"
```

Step 8 sends the import request again. The tab reads the same, except
that the number is now "22". Vol. 1 No. 2 (2014) lists the article three
times under "Articles", each with its own "PDF". Submissions 21 and 22
are published in that issue, dated the day of the import.

With submission 8, step 6 reads as follows. The lines after "Errors
occured:" also appear on a single, clean import of an article that is
in no issue. That is a separate finding,
[U63 A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a8),
and it plays no part here.

```
The import completed successfully. The following items were imported:
Submission
"21" - "Traditions and Trends in the Study of the Commons"
Errors occured:

Publication

The issue identification element is missing for the article "Traditions and Trends in the Study of the Commons".
```

After step 8 the tab reads "22", and "Active submissions" lists the
title three times: 8, 21 and 22. On a press the new numbers are 19 and
20, beside submission 3. On a preprint server they are 20 and 21,
beside submission 1.

## Cause

The results tab is loaded from a URL that runs the import. "Import"
posts the form to `importBounce` (`PKPNativeImportExportPlugin::display()`,
line 170). The JSON response to that POST holds no result. Through
`ImportExportPlugin::getBounceTab()`, it only asks the page to add a
tab at `…/plugin/NativeImportExportPlugin/import?temporaryFileId=…&csrfToken=…`.
`TabHandler::addTab()` adds that tab as a remote jQuery UI tab. Loading
it runs `case 'import':` (line 201), which imports the file.

jQuery UI 1.10 and later loads a remote tab again every time it is
chosen. `TabHandler::tabsBeforeLoad()` (`lib/pkp/js/controllers/TabHandler.js`,
line 236) lets every load through, so every visit imports again. The
template asks for the content to be kept:
`plugins/importexport/native/templates/index.tpl` line 21 sets
`$('#importExportTabs').tabs('option', 'cache', true)`. jQuery UI 1.10
removed that option, so the line does nothing. The
`ui.ajaxSettings.cache = false` in `tabsBeforeLoad()` (line 246) is a
different setting: jQuery's HTTP cache-buster, which adds a timestamp
to the URL.

The import does not check whether the items are already there. For each
publication, the shared `NativeXmlPKPPublicationFilter::populateObject()`
copies `status` and `date_published` from the file. OJS
`NativeXmlPublicationFilter::parseIssueIdentification()` attaches the
publication to the existing issue that matches `<issue_identification>`.
So every rerun of a file of published articles publishes the articles
again in the same issue.

Reach:

- Journals: published copies in the issue's table of contents (on
  screen).
- Presses and preprint servers: the same filter marks the copies of a
  published monograph or preprint as published (code).
- Users XML Plugin {OJS OMP}: its "Results" tab is added the same way.
  `PKPUserImportExportPlugin` calls `setEvent('addTab')` itself at line
  127, and loading the tab runs `import` at line 133. Choosing the tab
  again repeats the users import. Accounts that already exist are
  skipped, and roles they already hold are not added again (code).
- Export results tabs ("Export Submissions Results", "Export Issues
  Results" {OJS}, the ONIX 3.0 export {OMP}): choosing one again runs
  the export again and writes another file. Nothing is duplicated
  (code).

## Proposed fix

Proposed: a tab that `addTab` creates loads once. Later visits keep the
content it already has, which is how jQuery UI's 1.9 upgrade guide
replaces `cache`. The change is in one shared place, and it covers every
source of `addTab`:

- `ImportExportPlugin::getBounceTab()`: the Native XML import and export
  results in all three apps, and the ONIX 3.0 export {OMP};
- the Users XML plugin's own `setEvent('addTab', …)` {OJS OMP};
- `AddTabAction`, which nothing in the three apps calls.

All of these load the result of an action, so none of them needs a
fresh load on each visit.

```diff
 	$.pkp.controllers.TabHandler.prototype.tabsLoad =
 			function(tabsElement, event, ui) {
+
+		// A tab added by addTab now holds its result: see tabsBeforeLoad.
+		if (ui.tab.data('pkpLoadOnce')) {
+			ui.tab.data('pkpLoaded', true);
+		}
 		return true;
 	};
 …
 	$.pkp.controllers.TabHandler.prototype.tabsBeforeLoad =
 			function(tabsElement, event, ui) {
 
+		if (ui.tab.data('pkpLoaded')) {
+			return false;
+		}
+
 …
 				$liElement = $('<li/>')
+						.data('pkpLoadOnce', true)
 						.append($anchorElement)
```

- **How it works:** returning `false` from `tabsbeforeload` cancels
  jQuery UI's request, and the panel keeps what it showed.
- **Where the guard goes:** it must come before the existing
  `this.unbindPartial(…)`. Otherwise choosing the tab again would unbind
  the handlers inside the content that is being kept.
- **Failed loads:** a load that failed does not set the flag, so
  choosing the tab again retries.
- **"Import" pressed again:** unchanged. It is a new action and adds a
  new tab.

The full diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/import-results-tab-imports-again/fix.diff).
It was tried on `main` in OJS, OMP and OPS with the "Any submission"
steps. Step 8 sent no request and showed the first number again, and
the Dashboard listed the title twice. Two checks that the fix reaches
no further gave the same result with and without it:

- two presses of "Import" still imported twice, into two results tabs;
- "Permissions" on the Tools page, an ordinary remote tab, still
  reloaded when chosen again.

**Alternatives**

- Honour the templates' `cache` option in `TabHandler` instead of
  marking `addTab` tabs. This misses every `addTab` user whose template
  lacks the line: the ONIX 3.0 export's and any third-party plugin
  built on `getBounceTab()`.
- Run the import in `importBounce` and let the tab only show a stored
  result, so the import no longer happens on a GET. This changes every
  import/export plugin and needs somewhere to keep the result.

**What goes with it**

- Remove the dead `tabs('option', 'cache', true)` line from the seven
  templates that carry it, in four plugins:
  - Native XML: OJS, OMP and OPS;
  - Users XML: OJS and OMP;
  - PubMed: OJS;
  - ONIX 3.0: OMP.
- Rebuild the minified bundle (`js/pkp.min.js`) as usual.
- No stored data changes. Copies already imported stay.
- The same diff applies to 3.5, 3.4 and 3.3, which have the same
  `tabsBeforeLoad()`, `tabsLoad()` and `addTab()`.
- The guard is an e2e test. It imports a file, chooses the Import tab
  and then the results tab again, and asserts that no second import
  request is sent and that the submission count grew by one.

Small: about ten lines in one shared JavaScript handler, following
jQuery UI's own replacement for `cache`.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/import-results-tab-imports-again/walk.js).
  It takes the "Any submission" steps on the three apps, and the
  "A published article" steps on OJS when `PUBLISHED=1` is set. It
  counts the import requests the browser sends at each step and reads
  the copies from the database. Command:
  `node bin/probe.js all shared/playwright/checks/issues/import-results-tab-imports-again/walk.js`.
- The walks:
  - main and 3.5 with OJS, OMP and OPS ("Any submission"), and main OJS
    ("A published article");
  - on PostgreSQL, on PKP's default datasets from pkp/datasets 38ab955
    (2026-09-30);
  - the fault does not depend on the database.
- Branch tips:
  - main: OJS bade233f73 (pkp-lib 2e377d27fc); OMP 3b0ecf794 and OPS
    c8af945bb7 (pkp-lib 3dc90c81a6, with an identical `TabHandler.js`);
    ui-library 280f98c5.
  - stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00, OPS cf4fce69bd (pkp-lib
    a9c76aed62).
  - stable-3_4_0: OJS 9571d8fde7, OMP 0aec65441, OPS acd8ae704b (pkp-lib
    df13621c2d).
  - stable-3_3_0: OJS 9fdb9bcf9a, OMP 8e72fc883, OPS c5532e2161 (pkp-lib
    d446601ebe).
- Code reads:
  - jQuery UI 1.14.1 `tabs.js` `load()` / `_ajaxSettings()`: a
    `beforeLoad` that returns false cancels the request and leaves the
    panel as it was.
  - 3.4 and 3.3 ship jQuery UI 1.13.3. In 3.3, OJS and OMP
    `NativeImportExportPlugin.inc.php` add the tab through `addTab`
    (`importBounce`), and OPS 3.3 has only the Crossref import/export
    plugin.
  - Deleting: ui-library `useDashboardBulkDelete.js` `canBeDeleted()`
    offers the Dashboard's delete only for submissions with
    `submissionProgress` set. `PKPSubmissionController::delete()`
    (`DELETE /api/v1/submissions/{id}`, managers among its roles)
    deletes any submission, published or not. "Unpublish" is in the
    OJS workflow's publication actions for a published publication.
- Introduced: `git log -S"'cache', true"` on the Native XML template
  gives [caab885923](https://github.com/pkp/ojs/commit/caab885923b1992bc73470e7d85624041efb6189)
  (Jason Nugent, 2014-03-07). That was written while pkp-lib shipped
  jQuery UI 1.8.6, which kept a loaded tab (`$.data(a, "cache.tabs")`).
  748b3723c2 replaced 1.8.6 with 1.10.4. Its follow-up
  [8fb7bcc0ac](https://github.com/pkp/pkp-lib/commit/8fb7bcc0ac4fdcf69d2260df98b0b3adf9cfa934)
  ported the tab events but not the caching. Both landed in 2014, before
  the first 3.x release, so no release loaded the tab once.
- Upstream search (2026-09-30), in pkp/pkp-lib, pkp/ojs, pkp/omp,
  pkp/ops and pkp/ui-library, issues and PRs: "import results tab
  duplicate", "native import twice", "import duplicate submissions",
  "TabHandler cache", "getBounceTab", "import results". Related but not
  the same fault:
  - `pkp/pkp-lib#4375`: replaced the removed `ajaxOptions`, not
    `cache`;
  - `pkp/pkp-lib#13412`: users import roles duplicated on re-import, a
    filter fault;
  - `pkp/pkp-lib#5994`: a blank results tab while an import runs.
- Not driven: the published copies on a press or a preprint server,
  and the Users XML "Results" tab chosen again (both read in the code
  only).
