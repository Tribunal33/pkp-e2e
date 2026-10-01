# Going back to a Native XML "Import Results" tab imports the file again, duplicating every item

- **Severity** high
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP (code; OPS 3.3 has no Native XML plugin)
- **Introduced** `pkp/pkp-lib#143` for PKP bug 8707 · [748b3723c2](https://github.com/pkp/pkp-lib/commit/748b3723c28e606696911c51f836782f26b30c04) · 2014-04-17 · Bruno Beghelli (beghelli), who opened the PR; the commit is Michael Thessel's (MichaelThessel)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U63 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a7)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On the Native XML Plugin page, a manager imports a file, opens another
tab, and then chooses the "Import Results" tab ("Results" on a press)
again to look at the outcome. Instead of showing it, the plugin runs
the import once more. The tab reads "The import completed successfully"
and lists the new copies under new submission numbers, and the journal,
press or server now holds another copy of every article, monograph or
preprint in the file.

Nothing tells the manager this happened. When the file is a published
issue, the copies are published at once: the issue's public table of
contents lists every article one more time, each copy with its own
article page and PDF. Each further visit to the tab adds another set. Removing the copies is
manual work, one copy at a time.

## Impact

- **Lost.** No content is lost, but the journal's public record is
  wrong: an imported issue's table of contents shows every article
  twice, each copy readable and downloadable. Unpublished copies land in
  the editorial lists as new submissions.
- **Who.** A manager using Tools › "Import/Export" › "Native XML
  Plugin", in any setup, including one moving back issues into the
  journal. Looking back at a result is ordinary on this page: the
  results tabs stay open beside "Import" and the export tabs.
- **Way round.** There is one, but nothing points to it: leave the
  results tab alone once you have left it, or remove it with the
  "Close" link beside its name. Reloading the page is safe: it drops
  the results tabs and imports nothing.

High: looking back at an imported issue's results publishes a second
copy of every article in it on the public issue page, with a success
message and no warning.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main` (OJS, OMP or OPS), freshly
  loaded. Nothing else is needed.

Importing a submission (OJS, OMP, OPS):

1. Sign in as `dbarnes`.
2. Go to Tools › "Import/Export" › "Native XML Plugin".
3. Open the "Export Articles" tab ("Export" on a press, "Export
   Preprints" on a server) and tick submission 4, "Computer Skill
   Requirements for New and Existing Teachers: Implications for Policy
   and Practice" (OMP: 3, "The Political Economy of Workplace Injury in
   Canada"; OPS: 1, "The influence of lactation on the quantity and
   quality of cashmere production").
4. Press "Export Articles" ("Export Submissions", "Export Preprints").
   In the "Export Submissions Results" tab that opens, press "Download
   Exported File" and save the file.
5. Open the "Import" tab, press "Upload File", choose the saved file,
   and press "Import". An "Import Results" tab ("Results" on a press)
   opens and reads "The import completed successfully. The following
   items were imported:", then under "Submission" the line ""21" -
   "Computer Skill Requirements for New and Existing Teachers:
   Implications for Policy and Practice"" (OMP "19", OPS "20"). On OJS
   an "Errors occured:" note follows, saying the article has no issue
   identification; the article is imported all the same, and that note
   is a separate matter.
6. Choose the "Import" tab.
7. Choose the "Import Results" tab ("Results") again.
8. Go to the Dashboard ("Active submissions") and search for "Computer
   Skill Requirements" ("Workplace Injury in Canada", "influence of
   lactation").

**Expected.** Step 7 shows the outcome of step 5 again, with the same
number 21 (OMP 19, OPS 20), and nothing new is imported. Step 8 lists
the original and one copy.

**Observed.** Step 7 reads the success text again with the next number,
and on OJS the same "Errors occured:" note as after step 5:

```
The import completed successfully. The following items were imported:
Submission
"22" - "Computer Skill Requirements for New and Existing Teachers: Implications for Policy and Practice"
```

(OMP "20", OPS "21".) Choosing the tab sent a new request,
`GET …/management/importexport/plugin/NativeImportExportPlugin/import?temporaryFileId=…&csrfToken=…`,
answered 200. Step 8 lists three rows: OJS 4, 21 and 22 (OMP 3, 19 and
20; OPS 1, 20 and 21).

Importing a published issue (OJS):

1. Sign in as `dbarnes` and go to Tools › "Import/Export" › "Native XML
   Plugin".
2. Open the "Export Issues" tab, tick "Vol. 1 No. 2 (2014)" (published,
   with "Signalling Theory Dividends" and "Antimicrobial, heavy metal
   resistance and plasmid profile of coliforms isolated from nosocomial
   infections in a hospital in Isfahan, Iran"), press "Export Issues",
   and in the "Export Issues Results" tab press "Download Exported File".
3. Open the "Import" tab, upload the saved file and press "Import". The
   results list the two articles as "21" and "22", and a warning:
   "Existing issue with id 1 matches the given issue identification …
   This issue will not be modified, but articles will be added."
4. Choose the "Import" tab, then the "Import Results" tab again.
5. Reload the page.
6. Sign out and open Archives, then "Vol. 1 No. 2 (2014)", then each
   article.

**Expected.** Step 4 shows "21" and "22" again. The issue's table of
contents lists each article twice: the original and the copy from
step 3.

**Observed.** Step 4 lists the two articles again as "23" and "24",
with the same warning. The table of contents now lists each article
three times, each entry with its "PDF" link, and the pages of articles
21 to 24 open, each with its "PDF" link. Archives still lists one "Vol. 1 No. 2
(2014)": the issue itself is not duplicated, but each visit adds the
issue's articles again, with their galleys, files and authors (3
galleys, 8 files and 7 author records per visit here), and no user
accounts. The reload in step 5 sent no import request: the page came
back with only its three own tabs.

(The copies of "Signalling Theory Dividends" are titled "The The
Signalling Theory Dividends" and link to the original's address. Both
are separate faults, seen on every import of this file.)

## Cause

The results tab is a remote jQuery UI tab, and choosing it runs the
import again. `ImportExportPlugin::getBounceTab()` answers the "Import"
press with an `addTab` event, and `PKPUserImportExportPlugin`'s
`importBounce` builds the same event in an inline copy of that code.
The new tab's address is the plugin's `import` operation, with the
uploaded file's `temporaryFileId` and the CSRF token.

`TabHandler::addTab()` (`lib/pkp/js/controllers/TabHandler.js`) appends
that address as a tab link and refreshes the tabs. jQuery UI loads a
remote tab's content every time the tab is activated. So each return
sends the same `GET …/import?temporaryFileId=…`, and
`PKPNativeImportExportPlugin::display()` `case 'import'` imports the
file again. The temporary file is kept, so the request always succeeds.

The plugins meant the results to load once. Each import/export page
sets `$('#importExportTabs').tabs('option', 'cache', true)` right after
attaching the `TabHandler`. The line is in the native plugin's
`templates/index.tpl` in all three apps, and was first written in OJS
[caab885923](https://github.com/pkp/ojs/commit/caab885923b1992bc73470e7d85624041efb6189)
on 2014-03-07. That option told jQuery UI 1.8 to load a remote tab only
once. jQuery UI 1.9 deprecated it and 1.10 removed it. pkp-lib moved to
1.10.4 in 748b3723c2 (`pkp/pkp-lib#143`), so the line has done nothing
since, and nothing replaced it. The apps now ship jQuery UI 1.14.1.

Reach of the same cause:
- The Native XML "Import Results" tab, OJS, OMP, OPS: walked (Steps),
  for a submission file and for an OJS issue file.
- The Native XML "Export Submissions Results" tab: going back to it runs
  the export again and writes another export file on the server. Walked
  on the three apps; nothing is duplicated in the journal.
- OJS "Export Issues Results" and OMP's ONIX 3.0 export results: the
  same `getBounceTab()`, so they run the export again too (code).
- The Users XML Plugin's results tab, OJS and OMP: its inline `addTab`
  event points at its `import` operation, so going back runs the users
  import again (code; not walked).
- Other `TabHandler` pages (Tools, the user profile, the issue and
  galley forms) add no tabs and are not affected. Their remote tabs load
  afresh each time by design (Tools walked).

## Proposed fix

A proposal. Make `TabHandler` load a tab added by `addTab` only once, in
`lib/pkp/js/controllers/TabHandler.js`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/returning-to-import-results-imports-again/fix.diff)):

```diff
 	$.pkp.controllers.TabHandler.prototype.tabsBeforeLoad =
 			function(tabsElement, event, ui) {
 
+		// A tab added by an addTab event shows the result of one action (an
+		// import, an export) that its URL runs on the server: load it once,
+		// and keep what it showed when the tab is chosen again.
+		if (ui.tab.data('pkpLoadOnce')) {
+			if (ui.tab.data('pkpLoadRequested')) {
+				return false;
+			}
+			ui.tab.data('pkpLoadRequested', true);
+		}
+
 		// We must unbind global events before the new tab content is loaded.
@@ -293,6 +303,7 @@
 				$liElement = $('<li/>')
+						.data('pkpLoadOnce', true)
 						.append($anchorElement)
 						.append($closeSpanElement);
```

Returning `false` from the `tabsbeforeload` handler is jQuery UI's
documented replacement for the removed `cache` option (the 1.9 upgrade
guide): the request is never sent, and the panel keeps what it showed.
The diff edits `TabHandler::tabsBeforeLoad()`, the event handler added
in 2014 under the same bug 8707. It leaves alone the separate
`beforeLoad:` option of the `tabs({...})` call, which
`pkp/pkp-lib#4375` added in 2019.

The new check comes before `this.unbindPartial(...)`. A visit that
loads nothing therefore leaves the kept panel's handlers bound, so the
"Download Exported File" form in a revisited export results tab still
works (from the code). The flag is set when the request starts, not
when it succeeds. Set on success, a load the manager cut short by
leaving the tab would run the import again on the next visit.

Tried on `main` in all three apps: with the fix, step 7 showed "21"
(OMP "19", OPS "20") again, sent no request, and step 8 listed two rows.

**Alternatives**
- Run the import on the "Import" press and have the tab only show stored
  results. This removes the side effect from the GET too, but it needs
  somewhere to keep the results and changes `getBounceTab()` for every
  plugin: a larger change for the same outcome on screen.
- Delete the temporary file after the import. A return would then show
  the "upload a file" message instead of the results, and still send a
  request.
- Fix each template's `cache` line instead: seven templates in three
  repos, and every future caller of `addTab` would need it too.

**What goes with it**
- If the manager leaves the results tab while the import is still
  running, jQuery UI cancels the page's wait for it. With the fix, that
  results tab then stays empty when chosen again, instead of importing
  a second time; the import itself finishes on the server.
- Installs that serve minified scripts load each app's built
  `js/pkp.min.js`, so the apps rebuild it with the change.
- The dead `tabs('option', 'cache', true)` lines (native in all three
  apps, users in OJS and OMP, OJS PubMed, OMP ONIX 3.0) can go in the
  same change or later.
- Copies already made cannot be told apart from intended imports, so no
  data repair is proposed.
- The diff applies unchanged to the `TabHandler.js` of `stable-3_5_0`,
  `stable-3_4_0` and `stable-3_3_0`.
- Guard: an e2e scenario that imports a file, opens the "Import" tab,
  goes back to the results tab, and checks that the number and the
  submission count are unchanged (a **Planned** item in spec U63).
  pkp-lib has no JavaScript unit tests for `TabHandler`.

Small: about ten lines in one pkp-lib file, following jQuery UI's own
pattern.

## Evidence

- Kept scripts that run the Steps in the browser on an install loaded
  from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/returning-to-import-results-imports-again/walk.js)
  ("Importing a submission", three apps) and
  [issue.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/returning-to-import-results-imports-again/issue.js)
  ("Importing a published issue", OJS), with helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/returning-to-import-results-imports-again/lib.js)
  and
  [the A9 report's lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unknown-section-import-broken-submission/lib.js).
  Run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/returning-to-import-results-imports-again/walk.js`
  (`ojs …/issue.js` for the second). walk.js counts the submissions
  holding the title in the database after steps 5, 7 and 8 (1, 2, 3, 3
  without the fix; 1, 2, 2, 2 with it). issue.js counts the issues, the
  issue's published articles, galleys, files, authors and users after
  steps 3, 4 and 5 (published articles in the issue 2, 4, 6, 6; issues
  2 throughout; users 39 throughout).
- The fix, tried 2026-10-01 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/returning-to-import-results-imports-again/fix.diff ojs omp ops`,
  then walk.js and
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/returning-to-import-results-imports-again/neighbour.js)
  with the same command, then
  `node bin/try-fix.js revert shared/playwright/checks/issues/returning-to-import-results-imports-again/fix.diff ojs omp ops`.
  neighbour.js ran with the fix in and out. On the Tools page,
  "Permissions", "Import/Export" and "Permissions" each sent their
  request both times. A second "Import" press added a second results
  tab and one more copy both times. Going back to "Export Submissions
  Results" sent the export request again without the fix, and nothing
  with it. issue.js was walked without the fix only.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`, no
  upgrade needed:
  - main: OJS bade233f73 (lib/pkp 2e377d27fc), OMP 3b0ecf794 and OPS
    c8af945bb7 (lib/pkp 3dc90c81a6). Step 8's searches listed exactly
    the three rows in Observed.
  - stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00, OPS cf4fce69bd (lib/pkp
    a9c76aed62), "Importing a submission" only. The numbers were the
    same as on `main`. On OMP, step 8's search also listed submission
    11, "Dreamwork", which matches the phrase elsewhere in its metadata.
  - `TabHandler.js` and the templates' `cache` line are the same on both
    lines; both ship jQuery UI 1.14.1. No request failed and no script
    error was logged. MySQL not checked; nothing here depends on the
    database.
- 3.4, by code: pkp-lib `stable-3_4_0` at df13621c2d, OJS 9571d8fde7,
  OMP 0aec65441, OPS acd8ae704b. `TabHandler::tabsBeforeLoad()` and
  `addTab()` are the same as on `main`. `PKPNativeImportExportPlugin`
  answers `importBounce` with `getBounceTab()` and imports on `import`.
  The three native templates carry the `cache` line. jQuery UI is 1.13.3
  (composer `jquery/ui`), which has no `cache` option.
- 3.3, by code: pkp-lib `stable-3_3_0` at d446601ebe, OJS 9fdb9bcf9a,
  OMP 8e72fc883, OPS c5532e2161. The OJS and OMP
  `NativeImportExportPlugin::display()` raise `addTab` on `importBounce`
  with the `import` address. `TabHandler.js` is the same, and jQuery UI
  is 1.13.3. OPS `stable-3_3_0` ships only the Crossref plugin under
  `plugins/importexport`.
- The "Close" link: `TabHandler::addTab()` gives each added tab a
  "Close" link beside its name. Its click handler removes the tab and
  its panel, and moves to the previous tab only when the closed tab is
  the open one; jQuery UI opens a tab only from its name link, so
  closing a tab that is not open does not load it (from the code, not
  walked).
- Introduced: `git blame` on the `cache` line leads to OJS caab885923
  (Jason Nugent, 2014-03-07). It was written when pkp-lib served jQuery
  UI 1.8.x (`CDN_JQUERY_UI_VERSION` 1.8.6, the local copy from 2010),
  where the option worked. 748b3723c2 (written by Michael Thessel,
  2014-04-17) replaced the local copy with 1.10.4, and ae3a41dc42
  (2014-06-27) moved the CDN copy to 1.10.4. Both came in through
  `pkp/pkp-lib#143` ("Rebased jquery update commits"), opened and
  merged by Bruno Beghelli on 2014-08-18, for bug 8707 in PKP's old
  tracker. The header's Kind is "defect", not "regression", because no
  release came out between the template line and the upgrade: released
  versions never loaded these tabs only once.
- Upstream: nothing matched in pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops or
  pkp/ui-library, searched on 2026-10-01 by the symptom's words, by
  `importBounce`, `getBounceTab`, `addTab` and the tabs' `cache`. Read and
  not the same fault: `pkp/pkp-lib#4375` (2019, `ajaxOptions` replaced
  by `beforeLoad`; the upgrade-guide entry it links also covers
  `cache`, which it left as it was), `pkp/pkp-lib#199` (2014, `addTab`
  rewritten for the new jQuery UI, without loading added tabs once),
  `pkp/pkp-lib#5994` (a blank results tab during a long import),
  `pkp/pkp-lib#6226` (CSRF checks on the bounce requests),
  `pkp/pkp-lib#13412` (roles duplicated when a users file is imported
  again on purpose).
- Unverified: the Users XML Plugin's results tab and the ONIX 3.0 and
  issue export tabs were read in the code, not walked. Not checked:
  whether the published copies also reach the journal's OAI-PMH feed,
  DOI deposits or search index.
