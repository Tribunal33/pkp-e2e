# The help under a series' "Path" shows an address ending in the word "Path", never the series' own

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** not traced to a PR; [cfa9f61ee](https://github.com/pkp/omp/commit/cfa9f61ee1f82eea40c684a996d2045b6b68dc04) · 2012-02-20 · jmacgreg (jmacgreg)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U17 [OMP8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U17-sections.md#omp8)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

A press manager who opens a series' "Edit" window finds a help line
under the "Path" box with a sample address: "The series's URL will be:
…/catalog/series/Path". The press's part of the address is right, but
the last part is always the word "Path", where the series' own path
belongs. For the series "History", whose path is "his", the manager
expects "…/catalog/series/his". The help shows the same sample before
and after the path is changed and saved.

Nothing is lost: the series' page is at its own address, and the box
holds the path.

Every series shows it. The "Add Series" window shows the same sample,
which suits a new series that has no path yet. The help is written when
the window opens, so it does not follow the box while the manager types
either.

## Impact

- **Lost**: the help names an address no series has; what is saved and
  published is right.
- **Who**: a press manager, each time they open a series' "Edit" window.
- **Way round**: put the path from the "Path" box in place of the word
  "Path" at the end of the help's address.

Low: help text that misleads while the outcome is right.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`, freshly loaded. Its series
  "History" has the path "his". Nothing else. The `stable-3_5_0` dataset
  takes the same steps.

1. Sign in as `rvaca` (password `rvacarvaca`), the Press manager.
2. Go to Settings › Press and open the "Series" tab.
3. Open the arrow beside "History" and press "Edit".
4. Read the help under "Path" (the box holds "his").
5. Clear "Path" and type "history".
6. Press "Save".
7. Open the arrow beside "History" again, press "Edit" and read the
   help under "Path" (the box holds "history").

**Expected:** step 4 reads "The series's URL will be:
http://…/index.php/publicknowledge/en/catalog/series/his". At step 5
the help still names that saved address, since the path is not saved
yet. Step 7 reads
"…/catalog/series/history".

**Observed:** steps 4, 5 and 7 all read:

```
The series's URL will be: http://…/index.php/publicknowledge/en/catalog/series/Path
```

"Save" closed the window and kept "history", which step 7's box shows.
The "Add Series" window shows the same sample address.

## Cause

OMP's series window builds the help from a fixed sample address
(`templates/controllers/grid/settings/series/form/seriesForm.tpl`,
line 125):

```smarty
{capture assign="sampleUrl"}{url router=PKP\core\PKPApplication::ROUTE_PAGE page="catalog" op="series" path="Path"}{/capture}
{translate key="grid.series.urlWillBe" sampleUrl=$sampleUrl}
```

The series' own path is already in the template, as `$path`
(`SeriesForm::initData()` sets it from `Section::getPath()`; the box
below prints it with `value=$path`), but the help never uses it.

The help came with 475176d47 ("*6843* further category and series
documentation additions", 2012-02-20). Its message marked the path as a
placeholder, in italics: "…/catalog/series/<em>path</em>". The same day
cfa9f61ee ("*6843* minor documention URL cleanup") moved the address
into the `{url}` call with `path="path"`, which put the word into a
real-looking address.

Later changes kept the sample. 1ddaff42ce (2012) wrote it as "Path" and
added "The 'Path' is a string of characters used to uniquely identify a
series."; 37ae194f7 (`pkp/omp#231` for `pkp/pkp-lib#1212`, 2016) dropped
that sentence when it tidied the strings. 78ed38462e (2024) only spelled
out the router constant.

The help is built on the server when the window opens, so it does not
follow the box while the manager types (step 5); nothing in the window
updates it.

Reach (checked in the code):

- The template is the only use of `grid.series.urlWillBe`; OJS and OPS
  have no series window.
- pkp-lib's category window (`CategoryForm`, shared by the three apps)
  shows a sample ending in "path" in the same way, for new and edited
  categories alike. One `CategoryForm` serves both adding and editing
  (`ManagementHandler` builds it once per settings page), so the server
  cannot put a category's own path into it and the template fix does
  not reach it; it is left out of this report.

## Proposed fix

Build the address from the series' path when it has one, and keep the
sample for a new series, which has none yet:

```diff
--- a/templates/controllers/grid/settings/series/form/seriesForm.tpl
+++ b/templates/controllers/grid/settings/series/form/seriesForm.tpl
@@ -122,7 +122,7 @@
 		{/if}
 
 		{capture assign="instruct"}
-			{capture assign="sampleUrl"}{url router=PKP\core\PKPApplication::ROUTE_PAGE page="catalog" op="series" path="Path"}{/capture}
+			{capture assign="sampleUrl"}{url router=PKP\core\PKPApplication::ROUTE_PAGE page="catalog" op="series" path=$path|default:"Path"}{/capture}
 			{translate key="grid.series.urlWillBe" sampleUrl=$sampleUrl}
 		{/capture}
 		{fbvFormSection title="series.path" required=true for="path"}
```

The diff:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/series-path-help-never-shows-path/fix.diff).
Tried on `main`: step 4 read "…/catalog/series/his", step 5 kept it,
and step 7 read "…/catalog/series/history". The "Add Series" window
still read "…/catalog/series/Path", with the fix in and out. With the
fix in, opening the address in "History"'s help loaded the series' page.

It keeps what 475176d47 added the help for: telling the manager where
the series will be found. The text and its translations do not change.

This is a proposal; the team decides.

**Alternatives**:

- Update the help in the browser as the manager types: it would also
  cover new series and step 5, but no server-built settings window (the
  Smarty forms) does that today, so it would be a new pattern for one
  help line.
- Reword the help to say that "Path" stands for the box's content, as
  the static pages plugin does ("where %PATH% is the path entered
  above"): it fixes the wording but still leaves an edited series
  without its own address.

**What goes with it**:

- A refused "Save" does not redraw the window
  (`SeriesGridHandler::updateSeries()` answers `JSONMessage(false)`), so
  the help keeps the address it showed when the window opened.
- No data repair; no API or plugin hook is involved.
- Backport: the diff applies to `stable-3_5_0` as written. On
  `stable-3_4_0` (`PKPApplication::ROUTE_PAGE`) and `stable-3_3_0`
  (`$smarty.const.ROUTE_PAGE`) the line spells the router differently,
  so only the `path=` change carries over.
- Test: an e2e check in spec U17 (a **Planned** item) can read the help
  on an edited series.

Small: one attribute in one template, with no data repair.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/series-path-help-never-shows-path/walk.js)
  takes the Steps and records the "Path" box and its help at steps 4, 5
  and 7, and the answer to "Save".
  - **Run:** on an install freshly loaded from the default dataset,
    `PROBE_FEATURE=<fleet> PROBE_AGENT=<name> node bin/probe.js omp shared/playwright/checks/issues/series-path-help-never-shows-path/walk.js`.
    `<fleet>` names the pkp-e2e install to drive and `<name>` the folder
    its records go to.
  - **Neighbour check:** `WALK=neighbour` in front reads the help in the
    "Add Series" window, then the help in "History"'s "Edit" window, and
    opens the address it gives. Nothing is saved.
- Walks: OMP on `main` and `stable-3_5_0`, on PostgreSQL; datasets from
  pkp/datasets c657990 (2026-10-01). No request failed on the server and
  no page script failed. OJS and OPS have no series window.
- The fix was tried with `node bin/try-fix.js apply shared/playwright/checks/issues/series-path-help-never-shows-path/fix.diff omp`,
  the walk and the neighbour check each on a freshly loaded dataset, the
  neighbour check also without the fix; then reverted.
- Not driven: 3.4 and 3.3. MySQL not checked (the fault does not depend
  on the database).
- Tips:
  - **`main`:** OMP 3b0ecf794.
  - **`stable-3_5_0`:** OMP 9c5e24246.
  - **`stable-3_4_0`:** OMP 0aec65441.
  - **`stable-3_3_0`:** OMP 8e72fc883.
- Code reads:
  - `main` and 3.5: `seriesForm.tpl` (the help and the "Path" box),
    `SeriesForm::initData()` and `fetch()`, `grid.series.urlWillBe` in
    `locale/en/manager.po`, `SeriesGridHandler::updateSeries()`; pkp-lib
    `CategoryForm` (the category path's help) and the static pages
    plugin's `editStaticPageForm.tpl` for the other samples.
  - 3.4 (`seriesForm.tpl` line 110, `SeriesForm.php` `initData()`) and
    3.3 (line 100, `SeriesForm.inc.php` `initData()`): the same fixed
    sample, and the form's data holds the series' path in both.
- The trace: `git blame` on the line gives 78ed38462e (2024, "Reduce
  Smarty warnings", the router constant only); at its parent,
  1ddaff42ce (2012, PKP bug 7523, "Path" for "path"). `git log -S
  urlWillBe` and `-S 'path="path"'` lead to 475176d47 (the help and
  `grid.series.urlWillBe`, the placeholder in italics) and cfa9f61ee
  (the `path="path"` address), both PKP bug 6843 of 2012-02-20, from
  before pkp moved to GitHub pull requests. `git log -S` on the "uniquely
  identify a series" sentence gives 37ae194f7 for its removal.
- Upstream searches (2026-10-02, pkp/pkp-lib, pkp/omp, pkp/ui-library):
  "series path URL will be", "URL will be", "series form path",
  `urlWillBe`, `seriesForm path help`; no match.
