# Native XML, ONIX and PubMed exports leave out submissions ticked on other pages of the list

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP (code; OPS 3.3 has no Native XML tool)
- **Introduced** `pkp/ui-library#88` and `pkp/ojs#2746` for `pkp/pkp-lib#5865` · [d0ffc05ab4](https://github.com/pkp/ui-library/commit/d0ffc05ab4ae7f06e8d2ab82f30ffb8a5ea9a7a3), [8420969872](https://github.com/pkp/ojs/commit/842096987251d154cc6d3c0f7c3f010e091f8aef) · 2020-05-13 · Nate Wright (NateWr)
- **Upstream** `pkp/pkp-lib#11716` (open), covering only "Select All" never turning into "Select None", reported on OMP 3.4
- **Tracked in** spec U63 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a11)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

The export tools (Native XML, and ONIX 3.0 on a press and PubMed on a
journal) list the submissions 100 to a page. A manager who ticks
submissions on more than one page and then exports gets a file holding
only the ticks on the page shown at that moment. The other ticks are
left out. The page says the export completed, and nothing on it counts
the ticked submissions.

On a list of one page, "Select All" ticks every line and then turns into
"Select None", which unticks them. Past one page, "Select All" ticks
only the 100 lines shown and its label never changes, so a second press
does not untick them. Pressed on page 2, it also clears the ticks made
on page 1.

The way round is one export per page, or narrowing the list with the
search box or "Filters" until it fits on one page.

## Impact

- **Lost**: submissions the manager ticked are missing from the exported
  file, with no warning. A file meant to move or back up content is
  incomplete, and the gap shows only when someone counts.
- **Who**: managers and editors who export from Tools › Import/Export on
  any journal, press or preprint server with more than 100 submissions,
  each time they tick on more than one page.
- **Way round**: export one page at a time, or narrow the list to one
  page first. To clear page 1's ticks at once, reload the page; the
  button does not do it.

Medium: the file silently lacks submissions the manager ticked, but each
page exports correctly on its own, so there is a way round on screen.

## Steps to reproduce

Preconditions:

- The default dataset, `main` (OJS: 20 submissions; OMP: 18; OPS: 19).
- More than 100 submissions in `publicknowledge`, made with the same tool:
  1. Sign in as `dbarnes`; Tools › Import/Export › "Native XML Plugin".
  2. "Export Articles" tab ("Export" on a press, "Export Preprints" on a
     preprint server): "Select All", then "Export Articles" ("Export
     Submissions", "Export Preprints"), then "Download Exported File".
     The results tab lists warnings about skipped files. They do not
     matter here.
  3. Reload the tool's page. On "Import", upload the downloaded file and
     press "Import". Do this five times, reloading the page before each
     import. Each import adds a copy of every submission. Afterwards the
     list holds 120 submissions on OJS, 108 on OMP and 114 on OPS.

Steps, as `dbarnes`:

"Select All":

1. Tools › Import/Export › "Native XML Plugin", "Export Articles". The
   list shows 100 lines, with "Previous 1 2 Next" under it.
2. Press "Select All".
3. Press the same button again.

Ticks on two pages:

4. Reload the page and open "Export Articles". Tick the very first line
   of page 1. It is the dataset's own newest submission: OJS submission
   20 and OMP submission 18, "Transformative Impact of AI Tools on
   Modern Education: Opportunities, Challenges, and Future Directions";
   OPS submission 19, "Finocchiaro: Arguments About Arguments". Its five
   imported copies come after all of the dataset's own submissions; its
   "View" link opens the original's ID.
5. Press "2" under the list. Tick the first line on page 2.
6. Press "Export Articles" ("Export Submissions", "Export Preprints"),
   then "Download Exported File".

**Expected**: after step 2 the lines are ticked and the button reads
"Select None"; step 3 unticks them. The file from step 6 holds both
ticked submissions.

**Observed**: step 2 ticks the 100 lines of page 1 and the button still
reads "Select All". Step 3 leaves all 100 ticked. Step 6 shows "The
export completed successfully. Download the exported file from the
button below.", but the file holds one submission, the one ticked on
page 2. On OJS:

```xml
<article xmlns="http://pkp.sfu.ca" … stage="production" …>
  <id type="internal" advice="ignore">120</id>
```

Submission 20, ticked on page 1, is not in the file. OMP and OPS gave
the same result: one `<monograph>` or `<preprint>`, the page 2 one.

Control: on the dataset as it loads (one page), "Select All" ticks
every line and turns into "Select None", which unticks them all.

## Cause

The list loads one page of submissions at a time: `count` is 100 in
`PKPNativeImportExportPlugin::display()`
([PKPNativeImportExportPlugin.php#L132](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/plugins/importexport/native/PKPNativeImportExportPlugin.php#L132)).
The page component that owns the selection, `ImportExportPage.vue`,
treats that one page as the whole list in two places.

1. `toggleSelectAll()`
   ([ImportExportPage.vue#L26-L36](https://github.com/pkp/ui-library/blob/280f98c5703024a8de7694642dfa860eaa293e1a/src/components/Container/ImportExportPage.vue#L26-L36))
   sets `selectedSubmissions` to the ids of `components.submissions.items`,
   which holds the loaded page only. It chooses between selecting and
   clearing by comparing the selection with `itemsMax`, the number of
   submissions across all pages. The page's 100 ids never reach
   `itemsMax`, so the button never clears, and each press replaces
   the selection with the page shown. The templates pick the label with
   the same comparison
   (`selectedSubmissions.length >= components.submissions.itemsMax`).
2. `submit()` (same file,
   [L18-L20](https://github.com/pkp/ui-library/blob/280f98c5703024a8de7694642dfa860eaa293e1a/src/components/Container/ImportExportPage.vue#L18-L20))
   triggers the form's `AjaxFormHandler` (attached in `index.tpl` L66),
   which sends the form's fields as a background POST
   (`$.post(action, $form.serialize())`). The only fields are the
   checkboxes the list renders (`name="selectedSubmissions[]"`,
   [index.tpl#L80-L85](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/plugins/importexport/native/templates/index.tpl#L80-L85)).
   `selectedSubmissions` still holds the ids ticked on other pages, but
   those have no checkbox, so they are never sent. The server exports
   exactly the ids it receives.

Reach:

- Going back to page 1 shows its ticks still ticked, because the
  checkboxes are bound to `selectedSubmissions`. The screen suggests
  they will be exported (code).
- A tick hidden by a search is dropped the same way: tick a line,
  search for another title, tick that line and export. The file holds
  only the second submission, on all three apps on main (on screen).
- The ONIX 3.0 tool (OMP) and the PubMed tool (OJS) use the same item
  slot, button condition and `ImportExportPage`, with `count` 100 (code).
- "Export Issues" (OJS) uses a legacy grid, not this list, and is not
  affected (code).

## Proposed fix

We propose three changes that together keep the selection across pages
and get all of it to the export. They are in the
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/export-list-selection-stops-at-page/fix-ojs.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/export-list-selection-stops-at-page/fix-omp.diff)
and
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/export-list-selection-stops-at-page/fix-ops.diff).
Each holds the shared ui-library and pkp-lib parts and that app's
templates.

1. **`ImportExportPage.vue` posts the whole selection.** `submit()`
   appends a hidden `selectedSubmissions[]` field for each selected id
   that has no checkbox on the page shown. It removes the ones a
   previous submit added, then submits as today. This works because
   both form handlers send the form's fields as they are at submit time:
   `AjaxFormHandler` serializes them, and PubMed's plain `FormHandler`
   posts the form. A later move away from those handlers must keep
   posting the whole selection.
2. **"Select All" and "Select None" act on the page shown.** A computed
   `isPageSelected` is true when every line on the page is selected.
   `toggleSelectAll()` then adds the page's ids to the selection, or
   removes them, and leaves the other pages' ids alone. Each template's
   label condition becomes `v-if="isPageSelected"`: two native
   templates, and ONIX 3.0 and PubMed.
3. **The results tab no longer carries the ids in its address.** Native
   XML and ONIX hand the posted ids to `ImportExportPlugin::getBounceTab()`.
   That method builds the results tab's GET address with one
   `selectedSubmissions%5B%5D=<id>` pair per id, about 30 bytes each.
   With the selection now growing across pages, three pages of "Select
   All" (300 ids) would pass Apache's default 8190-byte request line and
   the tab would fail. Today the address never holds more than 100 ids.
   `getBounceTab()` now stores the parameters in the user's session
   under a random id and puts only `bounceId` in the address.
   `ImportExportPlugin::display()`, which every import/export plugin
   calls first, reads them back into the request's variables. So
   `exportSubmissions`, `exportIssues` and `import` keep reading
   `getUserVar()` unchanged:

```diff
--- a/lib/pkp/classes/plugins/ImportExportPlugin.php
+++ b/lib/pkp/classes/plugins/ImportExportPlugin.php
+    public const BOUNCE_SESSION_KEY = 'importExportBounce.';
@@ display()
+        $bounceId = $request->getUserVar('bounceId');
+        $bounceParameters = is_string($bounceId) ? $request->getSession()->get(self::BOUNCE_SESSION_KEY . $bounceId) : null;
+        if (is_array($bounceParameters)) {
+            $request->_requestVars = array_merge($request->getUserVars(), $bounceParameters);
+        }
@@ getBounceTab()
+        $bounceId = bin2hex(random_bytes(8));
+        $request->getSession()->put(self::BOUNCE_SESSION_KEY . $bounceId, $bounceParameterArray);
 ...
-                array_merge($bounceParameterArray, ['csrfToken' => $request->getSession()->token()])
+                ['bounceId' => $bounceId, 'csrfToken' => $request->getSession()->token()]
```

The session follows how the application already keeps per-user state
between requests (`Locale` reads `currentLocale`, `Validation` reads
`signedInAs`). Writing `_requestVars` has a precedent in
`GridHandler`. The id is kept rather than removed after use, because
choosing a results tab again reloads its address and runs the export
again.

Tried on main, all three apps, with all three parts in.

- The Steps above showed the Expected. "Select All" turned into "Select
  None", the second press unticked the page, and the file held both
  ticked submissions. The imports in the preconditions go through the
  same hand-off, and they worked too.
- On a list of more than 300 submissions, "Select All" on pages 1, 2
  and 3 gave a file holding every ticked submission. That was 300 on
  OJS. On OMP and OPS it was 289 and 286, the number of different
  submissions those three pages showed (see Evidence). The results
  tab's address was 217 characters long, and the tab loaded normally.
- A control on the dataset as it loads (one page) gave the same results
  with and without the fix. "Select All" then "Select None" worked, and
  an unticked submission stayed out of the next export. With the fix, a
  tick hidden by a search was kept and exported.
- The ONIX 3.0 and PubMed templates took the same one-line change, but
  those tools were not walked.

**Alternatives**:

- Load the results tab with a POST that carries the ids. The tab is
  loaded by the shared legacy tab handler with a GET, so this changes
  every tab in the application.
- Cap the selection, with a message, at what fits in the address. The
  limit depends on the web server, so any cap is a guess, and it keeps a
  limit the session removes.
- Make "Select All" select every submission across pages, as the
  `itemsMax` comparison suggests was meant. That needs a request per 100
  submissions to collect the ids, and still needs part 3.
- Render the hidden fields in each template from `selectedSubmissions`.
  This avoids jQuery, but repeats the markup in five templates for state
  the page component already owns.
- Raise `count`. This only moves the limit, and makes the list slower.

**What goes with it**:

- No stored data to repair. The session holds one small array per
  export until the session ends.
- A third-party plugin that calls `getBounceTab()` keeps working if it
  calls `parent::display()` before reading its parameters, as every
  PKP import/export plugin does.
- PHP's default `max_input_vars` (1000) still caps the posted
  selection, so a selection of more than 1000 is cut short by PHP. That
  is ten pages of "Select All". A count shown next to the export button
  would make such a cut visible. It is not part of this fix.
- 3.5 takes the diffs as they are (checked with `patch --dry-run`). On
  3.4 and 3.3 parts 1 and 2 apply by hand, since the lines differ only
  in formatting. On 3.4, part 3 is written with that branch's
  `Session::setSessionVar()` and `getSessionVar()`. 3.3 needs no part 3:
  its export form posts straight to `exportSubmissions`, which sends the
  file back with no results tab.
- The A12 report (`U63-A12-native-export-nothing-ticked-empty-tab.md`)
  proposes that the server refuse an export with nothing ticked. That
  check reads the bounce request's own POST, which this fix leaves
  unchanged.
- Guard: an end-to-end check of the export list with more than 300
  submissions, ticking across pages. The scripts in Evidence do this.
  `ImportExportPage` has no unit test, and ui-library's Vitest tests
  cover only composables today.

Medium: a few lines each in ui-library and pkp-lib, plus one template
line in each app. The session hand-off is new to the import/export
plugins.

## Evidence

- Scripts, in `shared/playwright/checks/issues/export-list-selection-stops-at-page/`:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/export-list-selection-stops-at-page/walk.js)
  takes the precondition and Steps 1–6.
  [many.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/export-list-selection-stops-at-page/many.js)
  grows the list past 300 by importing the dataset's own export file
  again and again, then exports three pages of "Select All" and records
  the length of the results tab's address.
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/export-list-selection-stops-at-page/neighbour.js)
  is the control: what the fix must not change on a one-page list, plus
  the search case. The helpers are in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/export-list-selection-stops-at-page/lib.js).
  Run from the pkp-e2e repo after resetting the install to the dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/export-list-selection-stops-at-page/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). Fix trial:
  `node bin/try-fix.js apply shared/playwright/checks/issues/export-list-selection-stops-at-page/fix-<app>.diff <app>`,
  then the scripts, then `revert`.
- Walked on PostgreSQL. pkp/datasets 38ab955 (2026-09-30), loaded fresh
  before each walk. No request failed and no script error was logged
  on the unfixed code, on either version. The order of lines on page 2
  varied between runs, because the imported copies share a submission
  date (the export writes `date_submitted` as a date only), so the
  Steps do not name page 2's first line. The list sorts by that date
  with no tie-break, so on a long list the pages can repeat a
  submission and miss another. Pages 1–3 showed 300 lines but only 289
  different submissions on OMP and 286 on OPS. That is a separate fault
  and is not covered here.
- The address limit was not driven. The test installs run PHP's
  built-in server, which has no request-line limit, so a 300-id address
  would not fail there. The 8190 bytes are Apache's default
  `LimitRequestLine`. The trial checked that the reworked tab's address
  stays short.
- Tips, main: OJS bade233f73 (pkp-lib 2e377d27fc, ui-library 280f98c5),
  OMP 3b0ecf794 and OPS c8af945bb7 (both pkp-lib 3dc90c81a6, ui-library
  280f98c5). 3.5 (`stable-3_5_0`): OJS 92b9a16b48, OMP 3081c9b00, OPS
  cf4fce69bd (pkp-lib a9c76aed62, ui-library 1a7a4750).
  `ImportExportPage.vue` on 3.5 is identical to main's.
- 3.4 (code): ui-library `stable-3_4_0` ee684b34 has the same
  `toggleSelectAll()`. pkp-lib df13621c2d has `count` 100 in
  `PKPNativeImportExportPlugin`. The native templates of OJS 9571d8fde7,
  OMP 0aec65441 and OPS acd8ae704b carry the same checkbox and button
  condition, and so does OMP's ONIX 3.0 template.
- 3.3 (code): ui-library `stable-3_3_0` 96959f9e has the same
  `toggleSelectAll()`. OJS 9fdb9bcf9a and OMP 8e72fc883 have `count` 100
  in their own `NativeImportExportPlugin.inc.php` and the same template
  lines. OPS c5532e2161 ships only the Crossref tool under
  `plugins/importexport`.
- Introduced: `git blame` on `toggleSelectAll()` gives d0ffc05ab4 for
  every line but a lint reformat (c2aa1feb, 2023). `git log -S` on the
  template's `toggleSelectAll` gives OJS 8420969872 and OMP 6a4168a7b,
  same date and issue. Before that change, the tool used a
  `PKPSelectSubmissionsListPanel` with `canSelectAll` and `count` 100.
  Whether that older list kept ticks across pages was not read, so Kind
  says defect rather than regression.
- `pkp/pkp-lib#11716` was read with its comments: the reporter traces
  the label to the `itemsMax` comparison on OMP 3.4 with hundreds of
  monographs. It does not mention that ticks on other pages are left
  out, and no PR is linked. Searched 2026-10-01 in pkp/pkp-lib, pkp/ojs
  and pkp/ui-library.
- Not walked: the ONIX 3.0 and PubMed exports (code only); MySQL (the
  fault is in the browser and does not depend on the database).
