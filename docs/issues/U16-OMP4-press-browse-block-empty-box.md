# A press's "Browse" block with nothing to list still shows as an empty box

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** the empty block: not traced; present since at least [ea473e0476](https://github.com/pkp/omp/commit/ea473e0476bf20570dafa6e20dc33fecafbb0eb8) (2015-02-02) · the empty "Series" line: `pkp/omp#1224` for `pkp/pkp-lib#8366` · [8e6416f1c1](https://github.com/pkp/omp/commit/8e6416f1c17552cc9fa18d21bfa7202bcf7078b7) · 2022-10-24 · franz-dev (franz-dev)
- **Upstream** none found (2026-10-02; for the inactive series 2026-10-04)
- **Tracked in** spec U16 [OMP4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U16-categories.md#omp4); spec U68 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U68-catalog-browse.md#a11)
- **Checked** 2026-10-02, each branch's tip; the inactive series 2026-10-04 (the commits in Evidence)
- **Model** claude-opus-5-5

Update 2026-10-04: a press whose every series is inactive shows an empty "Series" line (spec U68 A11); the same fix covers it.

## Summary

When a press manager unticks all three checkboxes in the "Browse
Block" settings ("New releases", "Categories" and "Series"), the block
in the sidebar still shows its "Browse" title with nothing under it, on
every page.

The same happens with "New releases" unticked when the checkboxes left
ticked have nothing to list: "Categories" on a press with no category,
"Series" on a press with no series. While "New releases" is ticked, as
it is by default, the block always holds that link. But on a press
whose series are all inactive, the block still shows the line "Series"
with nothing under it; a press with no series leaves that line out.

## Impact

- **Lost**: nothing; the sidebar shows a block with a title and no
  links, or the label "Series" with no link under it. Screen-reader
  users also meet an empty "Browse" navigation landmark, or an empty
  list under "Series".
- **Who**: visitors of a press whose manager has placed the block in
  the sidebar and then left it nothing to list. The plugin is enabled
  on a new press, but the sidebar starts empty, so the block shows only
  once a manager adds it. The empty "Series" line needs every series
  of the press made inactive.
- **Way round**: the manager takes the block out of the sidebar
  ("Browse Block" under "Sidebar"), or, for the "Series" line, unticks
  "Series" in the block's settings.

Low: an empty block or line on a press that chose this setup, with a
one-setting way round.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`. "Browse Block" is enabled
  there with all three settings ticked; no block is placed in the
  sidebar. The press has five series, all active: "Library &
  Information Studies", "Political Economy", "History", "Education"
  and "Psychology".

All three settings unticked:

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

Every series inactive, on a freshly loaded dataset:

1. Sign in as `rvaca`. Open Settings > Website > "Appearance" > "Setup",
   tick "Browse Block" under "Sidebar" and click "Save".
2. Sign out and open the home page. The block reads "Browse", "New
   Releases", "Categories" with the categories, and "Series" with the
   five series.
3. Sign in as `rvaca`. Open Settings > Press > "Series". On the
   "Library & Information Studies" row, tick "Inactive"; the "Confirm"
   window asks "Are you sure you wish to deactivate this section?";
   click "OK". Do the same on the other four rows.
4. Sign out and open the home page.

**Expected**: the block reads "Browse", "New Releases" and "Categories"
with its categories; no "Series" line, as on a press with no series.

**Observed**: the block still ends with the line "Series", with nothing
under it. A screen reader meets a list item "Series" holding an empty
list.

With one series inactive ("History" alone), the line lists the other
four and leaves "History" out, as intended.

## Cause

OMP's `BrowseBlockPlugin::getContents()`
(`plugins/blocks/browse/BrowseBlockPlugin.php`) never asks whether it
has anything to list. It always assigns `browseNewReleases`. It
assigns `browseSeries` and `browseCategories` only when their
checkboxes are ticked. Then it returns the rendered template in every
case. `templates/block.tpl`
leaves out each part that is off or empty, but prints the title and
the empty `<nav><ul>` around them regardless.

The "Series" line has the same gap: the template tests the list before
leaving out its inactive series. `getContents()`
assigns every series of the press, inactive ones included, and leaves
the inactive ones to the template. `block.tpl` line 48 prints the line
on `{if $browseSeries}`, which tests the whole array, and only inside
the loop (line 53, `{if !$browseSeriesItem->getIsInactive()}`) skips
each inactive series. With every series inactive the array is not
empty, so the line prints over an empty `<ul>`.

That inner test came with `pkp/omp#1224` for `pkp/pkp-lib#8366`
("Hide inactive series in browse block plugin", 2022), which was
reported on 3.3: there the block listed inactive series too. The change
hid them in the loop, without moving the test before it.

Reach:

- The block is the same on every press page with a sidebar.
- The ticked-but-empty cases in the Summary follow from the template
  leaving out each part whose array is empty (code only).
- The inactive-series line: walked on `main` and 3.5. 3.4 has the same
  template and plugin (code). 3.3 has no inner test, so it lists the
  inactive series instead and shows no empty line (code).
- The journal's and the server's block, a separate plugin, has the
  same gap (spec U16 A10, [pkp-e2e#603](https://github.com/jardakotesovec/pkp-e2e/issues/603)).

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
the submission wizard's series list uses (`SubmissionHandler`). With
inactive series left out of the array, the template's `{if
$browseSeries}` test is true only when there is a series to list; its
inner `getIsInactive()` test becomes redundant and can stay.

Tried on `main` (OMP): with the fix in, step 4's sidebar has no "Browse"
block, and with every series inactive the block ends with "Categories"
and its categories, no "Series" line. With all checkboxes ticked, with
"Series" unticked alone, and with "History" alone inactive (the line
lists the other four), the block was the same with the fix in and out.

A proposal; the team decides.

**Alternatives**

- Test the three settings only: covers the reported case but not a
  press with nothing in the ticked lists.
- Refuse to save the settings window with all three unticked: a new
  validation for a state that is harmless once the block hides itself.

**What goes with it**

- The fix for the press's flat category list (spec U16 OMP2,
  [pkp-e2e#605](https://github.com/jardakotesovec/pkp-e2e/issues/605))
  changes the same lines. If both fixes land, the early return should
  test the array of top-level categories that OMP2's fix assigns to
  `browseCategories`, in place of this diff's `$categories`.
- Backport: this diff applies on 3.5 and 3.4. 3.3 needs only the
  empty-block half: its plugin calls `SeriesDAO::getByPressId()` and
  `CategoryDAO::getByContextId()`, already turned into arrays with
  `toArray()`, so the backport is the early return alone. Adding
  `excludeInactive()` there would bring `pkp/pkp-lib#8366`'s hiding of
  inactive series to 3.3, a behaviour change the emptiness test does not
  need (3.3 lists inactive series and has no empty "Series" line).
- Guard: an e2e check that the block is gone with all three checkboxes
  unticked, and that the "Series" line is gone while every series is
  inactive.

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
- Kept script for the "Every series inactive" steps:
  [inactive-series.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/browse-block-sidebar/inactive-series.js)
  (the same lib.js), run with `PROBE_FEATURE=<feature>
  PROBE_AGENT=<agent> node bin/probe.js omp
  shared/playwright/checks/issues/browse-block-sidebar/inactive-series.js`
  on an install reset to the default dataset; `MODE=nb` runs the
  one-series check alone. Its header gives the reset and the 3.5
  commands.
- The fix was tried on `main`: the Steps, then the block with "Series"
  unticked alone, each on a freshly loaded dataset; the second check was
  walked again with the fix out. On 2026-10-04 the same diff was tried
  again: the "Every series inactive" steps, then the one-series check
  with the fix in and out, each on a freshly loaded dataset.
- Walked on PostgreSQL, the default dataset from pkp/datasets e8dafbc
  (2026-10-02), on `main` and `stable-3_5_0`, OMP; the "Every series
  inactive" steps on pkp/datasets 566bb1f (2026-10-03), the same tips.
- Tips: OMP `main` 3b0ecf794 (lib/pkp 3dc90c81a6); OMP `stable-3_5_0`
  9c5e24246 (lib/pkp cf3f984335); OMP `stable-3_4_0` 0aec65441; OMP
  `stable-3_3_0` 8e72fc883.
- Code reads on `main`: OMP `plugins/blocks/browse/BrowseBlockPlugin.php`
  (`getContents()`), `templates/block.tpl`, `BrowseBlockSettingsForm.php`
  and `settings.xml`; `PKP\section\Collector::excludeInactive()`.
- Code reads for the "Series" line: `block.tpl` lines 48 and 53 and
  `getContents()` on `main` and in the 3.5 checkout (the same files);
  `git show upstream/stable-3_4_0:plugins/blocks/browse/templates/block.tpl`
  (the same inner test; 8e6416f1c1 is on the branch) and
  `upstream/stable-3_3_0:` (no inner test: inactive series listed);
  `PKP\section\Collector::excludeInactive()` in `lib/pkp` on `main`,
  3.5 and `origin/stable-3_4_0`.
- Code reads on the other lines: `git show upstream/stable-3_4_0:` and
  `upstream/stable-3_3_0:plugins/blocks/browse/` in the OMP checkout
  (`BrowseBlockPlugin.php`, `BrowseBlockPlugin.inc.php` and
  `templates/block.tpl`: no emptiness test, the title always printed);
  3.5 in its own checkout (the same files as `main`).
- Introduced: the plugin's log in pkp/omp; ea473e0476 ("Improve browse
  block", 2015) added the settings form with the three boxes and the
  template's per-part tests, with no test for the whole block, and no
  later commit added one. The "Series" line: `git blame` on `block.tpl`
  line 53 gives 8e6416f1c1, the only commit of `pkp/omp#1224` (merged
  2022-10-27 by asmecher, for `pkp/pkp-lib#8366`, reported on OMP
  3.3.0-13); line 48's `{if $browseSeries}` predates it (5fa2016776,
  2020, "Fix OMP browse block plugin for ADODB removal").
- Upstream search (2026-10-02), pkp/pkp-lib and pkp/omp: "browse block
  empty", "browse block nothing to show", "browse block settings omp",
  "omp browse block". Read: `pkp/pkp-lib#924` (2015, the empty
  "Categories" line, fixed by `pkp/omp#178`; not the whole block). For
  the inactive series (2026-10-04), pkp/pkp-lib and pkp/omp: "browse
  block inactive series", "inactive series browse", "hide inactive
  series", "browse block series empty", "omp browse block series",
  "excludeInactive". Read: `pkp/pkp-lib#8366` and `pkp/omp#1224` (the
  change that hid inactive series, not this fault), `pkp/omp#855` (an
  open PR on a series overview page, not this fault).
- Default placement: OMP's `plugins/blocks/browse/settings.xml` enables
  the plugin with all three checkboxes ticked on each new press;
  `lib/pkp/schemas/context.json` gives `sidebar` no default and nothing
  writes it when a press is created.
- Code reads on 3.3: `BrowseBlockPlugin.inc.php` `getContents()` (calls
  `SeriesDAO::getByPressId()`, which forwards to `getByContextId()`, no
  inactive filter).
- Not driven: 3.4 and 3.3; a series made inactive from its "Edit"
  window rather than the list's box (the same stored flag).
