# A press's "Browse" block title is not a heading, so screen-reader users cannot reach it by heading

- **Severity** low
- **Effort** small
- **Kind** intention gap
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/omp#783` for `pkp/pkp-lib#5176` · [4607f62dd1](https://github.com/pkp/omp/commit/4607f62dd14434f9d1b5a2c6dd418187734f9568) (the heading change for sidebar blocks, which left this block out) · 2020-03-11 · thinkbulecount2
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U16 [OMP3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U16-categories.md#omp3)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On a press, the "Browse" block's title is drawn like a heading, but a
screen reader reads it as plain text, so the block cannot be reached by
heading. A journal's and a preprint server's "Browse" is a heading, as
is the title of every other block in a press's sidebar.

A screen-reader user who jumps from heading to heading never lands on
the block, and has to find its links by reading on or by landmark.

## Impact

- **Lost**: no content; the page's heading structure leaves the block
  out, which fails WCAG 2.1 success criterion 1.3.1 "Info and
  Relationships" (level A) for this title.
- **Who**: screen-reader users on presses whose manager has placed the
  block. "Browse Block" is enabled on a new press, but the sidebar
  starts empty, so a manager has to add the block first.
- **Way round**: reading the page in order, or jumping to the "Browse"
  navigation landmark.

Low: one title in one block, whose links stay reachable another way. A
press bound to meet WCAG level A would rank it higher.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`. "Browse Block" is enabled
  there; no block is placed in the sidebar.

1. Sign in as `rvaca`. Open Settings > Website > "Appearance" > "Setup",
   tick "Browse Block" under "Sidebar" and click "Save".
2. Sign out and open the home page.
3. With a screen reader, list the page's headings (or read the
   browser's accessibility tree for the sidebar).

**Expected**: "Browse" is listed as a level-2 heading, as on a journal.

**Observed**: no heading in the sidebar. The block reads as the text
"Browse", then the navigation "Browse" with "New Releases", the
"Categories" links and the "Series" links. The markup is
`<span class="title">Browse</span>`; on a journal (the same steps,
plus ticking "Browse Block" under Settings > Website > "Plugins"
first) it is `<h2 class="title">Browse</h2>`, a level-2 heading.

## Cause

OMP's own browse block, `plugins/blocks/browse/templates/block.tpl`
line 18, prints its title as `<span class="title">`. The default theme
styles `.pkp_block .title` the same whatever the element, so it looks
like a heading but has no heading role.

`pkp/pkp-lib#5176` ("Sidebar blocks should always have a heading and
section", from an accessibility audit) asked for an `<h2>` title on
"all of our core blocks". `pkp/omp#783` was OMP's sweep for it: it
turned the titles of the "Information", "Language" and "Developed By"
blocks and of the web feed block into `<h2>`, and did not touch the
browse block. The OJS and OPS browse block got
its `<h2>` in pkp/browse (5bb12f7e, same issue, 2020-03-11). The span
dates from 2015 (a1b03f990b).

Reach:

- The block is drawn from one template, the same on every press page
  with a sidebar.
- OMP's "Information" and "Language" block titles are already `<h2>`.
  OMP's theme gives them no `margin-top: 0` (see the fix), so today they
  sit lower than OJS's; the fix's theme line moves them up to match
  (code only).
- No other block in OMP, OJS or OPS still prints its title as a span
  (a search of the three apps' and pkp-lib's block templates for
  `<span class="title">`).
- The issue's second request, wrapping each block in `<section>`, is
  not met by any core block today, OJS's included; this report leaves
  it out.

## Proposed fix

Print the title as the other blocks do
([fix-omp3.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/browse-block-sidebar/fix-omp3.diff),
against the OMP app root):

```diff
--- a/plugins/blocks/browse/templates/block.tpl
+++ b/plugins/blocks/browse/templates/block.tpl
@@ -15,9 +15,9 @@
  *
  *}
 <div class="pkp_block block_browse">
-	<span class="title">
+	<h2 class="title">
 		{translate key="plugins.block.browse"}
-	</span>
+	</h2>
 
 	<nav class="content" role="navigation" aria-label="{translate|escape key="plugins.block.browse"}">
 		<ul>
--- a/plugins/themes/default/styles/sidebar.less
+++ b/plugins/themes/default/styles/sidebar.less
@@ -17,6 +17,7 @@
 	.title {
 		display: block;
 		margin-bottom: @base;
+		margin-top: 0;
 		font-family: @font-heading;
 		font-size: @font-bump;
 		font-weight: @bold;
```

The theme line goes with it. For the same issue OJS's default theme
gave `.pkp_block .title` a `margin-top: 0`
([934532896d](https://github.com/pkp/ojs/commit/934532896dde13eacc15b4b346edcce39d2d7673)),
so that an `<h2>` title sits where the span did. OMP's theme did not
get it; tried without it, the browser's top margin for `<h2>` made the
block 13 px taller. OMP ships no other theme, and the default theme
styles the title by its class, so only themes outside OMP that style
sidebar `h2` elements would draw it differently (not checked).

Tried on `main` (OMP): with the fix in, the sidebar's headings list
"Browse" at level 2, and the block keeps its links, lists and height,
the same as without the fix.

A proposal; the team decides.

**Alternatives**

- `role="heading" aria-level="2"` on the span: the same for a screen
  reader, against the pattern every other block follows.

**What goes with it**

- Backport: the same two lines apply on 3.5, 3.4 and 3.3.
- Guard: an e2e check that a press's "Browse" is a level-2 heading.

Small: one element in one template and one line in the theme.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/browse-block-sidebar/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/browse-block-sidebar/lib.js),
  run with `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js
  all shared/playwright/checks/issues/browse-block-sidebar/walk.js` on an
  install reset to the default dataset (its header gives the reset and
  the 3.5 commands). It records the block's aria snapshot, the title's
  element and the sidebar's headings, with OJS and OPS as the control,
  and also carries the other "Browse" block reports' steps.
- The fix was tried on `main`: the Steps, then the block's links and
  lists and a category page, each on a freshly loaded dataset; the
  second check was walked again with the fix out.
- Walked on PostgreSQL, the default dataset from pkp/datasets e8dafbc
  (2026-10-02), on `main` and `stable-3_5_0`, OMP, with OJS and OPS as
  the control.
- Tips: OMP `main` 3b0ecf794 (lib/pkp 3dc90c81a6), OJS `main` b84f8e2e44
  (plugins/blocks/browse 89a6d31); OMP `stable-3_5_0` 9c5e24246; OMP
  `stable-3_4_0` 0aec65441; OMP `stable-3_3_0` 8e72fc883.
- Code reads on `main`: OMP `plugins/blocks/browse/templates/block.tpl`;
  the block templates of OMP, OJS, OPS and their `lib/pkp` searched for
  `class="title"`; the default theme's `styles/sidebar.less` in OMP and
  OJS (`.pkp_block .title`; `git blame` on OJS's `margin-top: 0`).
- Code reads on the other lines: `git show upstream/stable-3_4_0:` and
  `upstream/stable-3_3_0:plugins/blocks/browse/templates/block.tpl` in
  the OMP checkout (line 18, `<span class="title">`), and the same
  branches' `plugins/themes/default/styles/sidebar.less` (no
  `margin-top: 0`); 3.5 in its own checkout (the same files as `main`).
- Introduced: the span dates from a1b03f990b (2015, `git blame` on
  line 18); `git log --grep=5176` in pkp/omp gives 4607f62dd1 and its
  follow-up 3eed9c2d2, merged as `pkp/omp#783` (2020-03-23).
  `pkp/pkp-lib#5176` was read (closed 2020-05-14).
- Upstream search (2026-10-02), pkp/pkp-lib and pkp/omp: "browse block
  heading", "browse block title h2", "omp browse block"; read
  `pkp/pkp-lib#1071` ("[OMP] multiple accessibility issues", no word on
  this block).
- Default placement: OMP's `plugins/blocks/browse/settings.xml` enables
  the plugin on each new press; `lib/pkp/schemas/context.json` gives
  `sidebar` no default and nothing writes it when a press is created.
- Not driven: a real screen reader (the accessibility tree is what the
  walk read); 3.4 and 3.3.
