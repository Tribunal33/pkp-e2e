# A press's "Browse" block with nothing to list still shows as an empty box

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** not traced; present since at least [ea473e0476](https://github.com/pkp/omp/commit/ea473e0476bf20570dafa6e20dc33fecafbb0eb8) (2015-02-02)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U16 [OMP4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U16-categories.md#omp4)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

When a press manager unticks all three checkboxes in the "Browse
Block" settings ("New releases", "Categories" and "Series"), the block
in the sidebar still shows its "Browse" title with nothing under it, on
every page.

The same happens with "New releases" unticked when the checkboxes left
ticked have nothing to list: "Categories" on a press with no category,
"Series" on a press with no active series. While "New releases" is
ticked, as it is by default, the block always holds that link.

## Impact

- **Lost**: nothing; the sidebar shows a block with a title and no
  links. Screen-reader users also meet an empty "Browse" navigation
  landmark.
- **Who**: visitors of a press whose manager has placed the block in
  the sidebar and then left it nothing to list. The plugin is enabled
  on a new press, but the sidebar starts empty, so the block shows only
  once a manager adds it.
- **Way round**: the manager takes the block out of the sidebar
  ("Browse Block" under "Sidebar").

Low: an empty block on a press that chose this setup, with a one-setting
way round.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`. "Browse Block" is enabled
  there with all three settings ticked; no block is placed in the
  sidebar.

1. Sign in as `rvaca`. Open Settings > Website > "Appearance" > "Setup",
   tick "Browse Block" under "Sidebar" and click "Save".
2. Open Settings > Website > "Plugins". On the "Browse Block" row,
   press the arrow, then "Settings". The window's group "Browse
   Possibilities" holds "New releases", "Categories" and "Series", all
   ticked.
3. Untick all three and click "Save".
4. Sign out and open the home page.

**Expected**: no "Browse" block in the sidebar, since it has nothing to
list.

**Observed**: the sidebar holds the block, 90 px tall, with the title
"Browse" and nothing under it. For a screen reader the page has a
navigation landmark "Browse" holding an empty list.

## Cause

OMP's `BrowseBlockPlugin::getContents()`
(`plugins/blocks/browse/BrowseBlockPlugin.php`) never asks whether it
has anything to list. It always assigns `browseNewReleases`. It
assigns `browseSeries` and `browseCategories` only when their
checkboxes are ticked. Then it returns the rendered template in every
case. `templates/block.tpl`
leaves out each part that is off or empty, but prints the title and
the empty `<nav><ul>` around them regardless.

Reach:

- The block is the same on every press page with a sidebar.
- The ticked-but-empty cases in the Summary follow from the template
  leaving out each part whose array is empty (code only).
- A second instance of the same gap: when every series is inactive,
  `block.tpl` still prints the "Series" line over an empty list,
  because it skips inactive series inside the loop but tests the whole
  array before it (code only).
- The journal's and the server's block, a separate plugin, has the
  same gap (spec U16 A10, reported separately).

## Proposed fix

Collect what the block would list, leave out inactive series in the
query rather than in the loop, and draw no block when nothing is left
([fix-omp4.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/browse-block-sidebar/fix-omp4.diff),
against the OMP app root):

```diff
--- a/plugins/blocks/browse/BrowseBlockPlugin.php
+++ b/plugins/blocks/browse/BrowseBlockPlugin.php
@@ -114,24 +114,33 @@
         $browseNewReleases = $this->getSetting($press->getId(), 'browseNewReleases');
         $templateMgr->assign('browseNewReleases', $browseNewReleases);
 
+        $series = [];
         $seriesDisplay = $this->getSetting($press->getId(), 'browseSeries');
         if ($seriesDisplay) {
-            // Provide a list of series to browse
+            // Provide a list of the active series to browse
             $series = Repo::section()
                 ->getCollector()
                 ->filterByContextIds([$press->getId()])
-                ->getMany();
-            $templateMgr->assign('browseSeries', $series->toArray());
+                ->excludeInactive()
+                ->getMany()
+                ->toArray();
+            $templateMgr->assign('browseSeries', $series);
         }
 
+        $categories = [];
         $categoriesDisplay = $this->getSetting($press->getId(), 'browseCategories');
         if ($categoriesDisplay) {
             // Provide a list of categories to browse
-            $categories = Repo::category()->getCollector()
+            $categories = iterator_to_array(Repo::category()->getCollector()
                 ->filterByContextIds([$press->getId()])
-                ->getMany();
+                ->getMany());
 
-            $templateMgr->assign('browseCategories', iterator_to_array($categories));
+            $templateMgr->assign('browseCategories', $categories);
+        }
+
+        // Nothing to browse: draw no block
+        if (!$browseNewReleases && empty($series) && empty($categories)) {
+            return '';
         }
 
         // If we're currently viewing a series or catalog, detect it
```

A block plugin that returns an empty string is left out of the
sidebar; the journal's browse block already does that when there is no
context. `excludeInactive()` is the section collector's own filter, which
the submission wizard's series list uses (`SubmissionHandler`); the template's
`getIsInactive()` test can stay.

Tried on `main` (OMP): with the fix in, step 4's sidebar has no "Browse"
block. With all checkboxes ticked, and with "Series" unticked alone,
the block was the same with the fix in and out.

A proposal; the team decides.

**Alternatives**

- Test the three settings only: covers the reported case but not a
  press with nothing in the ticked lists.
- Refuse to save the settings window with all three unticked: a new
  validation for a state that is harmless once the block hides itself.

**What goes with it**

- The fix for the press's flat category list (spec U16 OMP2, reported
  separately) changes the same lines. If both land, the emptiness test
  reads OMP2's list of top-level categories.
- Backport: this diff applies on 3.5 and 3.4. On 3.3,
  `SeriesDAO::getByContextId()` cannot leave out inactive series (its
  `$submittableOnly` argument is not used in the query), so the
  backport drops them in PHP (`getIsInactive()`) before the empty test.
- Guard: an e2e check that the block is gone with all three checkboxes
  unticked.

Small: one method, a few lines, following the collector's own filter.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/browse-block-sidebar/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/browse-block-sidebar/lib.js),
  run with `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js
  all shared/playwright/checks/issues/browse-block-sidebar/walk.js` on an
  install reset to the default dataset (its header gives the reset and
  the 3.5 commands). It reads the block's markup, text and aria
  snapshot, and also carries the other "Browse" block reports' steps.
- The fix was tried on `main`: the Steps, then the block with "Series"
  unticked alone, each on a freshly loaded dataset; the second check was
  walked again with the fix out.
- Walked on PostgreSQL, the default dataset from pkp/datasets e8dafbc
  (2026-10-02), on `main` and `stable-3_5_0`, OMP.
- Tips: OMP `main` 3b0ecf794 (lib/pkp 3dc90c81a6); OMP `stable-3_5_0`
  9c5e24246 (lib/pkp cf3f984335); OMP `stable-3_4_0` 0aec65441; OMP
  `stable-3_3_0` 8e72fc883.
- Code reads on `main`: OMP `plugins/blocks/browse/BrowseBlockPlugin.php`
  (`getContents()`), `templates/block.tpl`, `BrowseBlockSettingsForm.php`
  and `settings.xml`; `PKP\section\Collector::excludeInactive()`.
- Code reads on the other lines: `git show upstream/stable-3_4_0:` and
  `upstream/stable-3_3_0:plugins/blocks/browse/` in the OMP checkout
  (`BrowseBlockPlugin.php`, `BrowseBlockPlugin.inc.php` and
  `templates/block.tpl`: no emptiness test, the title always printed);
  3.5 in its own checkout (the same files as `main`).
- Introduced: the plugin's log in pkp/omp; ea473e0476 ("Improve browse
  block", 2015) added the settings form with the three boxes and the
  template's per-part tests, with no test for the whole block, and no
  later commit added one.
- Upstream search (2026-10-02), pkp/pkp-lib and pkp/omp: "browse block
  empty", "browse block nothing to show", "browse block settings omp",
  "omp browse block". Read: `pkp/pkp-lib#924` (2015, the empty
  "Categories" line, fixed by `pkp/omp#178`; not the whole block).
- Default placement: OMP's `plugins/blocks/browse/settings.xml` enables
  the plugin with all three checkboxes ticked on each new press;
  `lib/pkp/schemas/context.json` gives `sidebar` no default and nothing
  writes it when a press is created.
- Code reads on 3.3: `SeriesDAO::getByContextId()` (no inactive filter).
- Not driven: the inactive-series case; 3.4 and 3.3.
