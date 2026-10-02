# With the "Browse" block in a journal's sidebar, every page's breadcrumb gets a grey bar

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OPS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/browse#14` for `pkp/pkp-lib#11443` · [09c47fb8c5](https://github.com/pkp/browse/commit/09c47fb8c58f05c066796e9f4c1ef96228425d69) · 2025-06-02 · Taslan Graham (taslangraham)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U16 [A20](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U16-categories.md#a20)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

While the "Browse" block is in the sidebar of a journal or a preprint
server, the last step of every page's breadcrumb ("About the Journal", a
category's name) gets a grey bar at its left and moves right by about
half a letter, the way the block marks the category being viewed. Its
grey colour stays as it was. Without the block the step has no bar.

No released version has it: it came with a change on `main` and would
ship with the next release. Pages work as before; the breadcrumb only
looks like a selected menu entry.

## Impact

- **Lost**: nothing; the breadcrumb's look changes.
- **Who**: visitors of a journal or preprint server whose manager has
  enabled the "Browse" block and placed it in the sidebar, on every
  page with a breadcrumb. A new journal or server has neither: the
  plugin starts disabled and the sidebar empty. The default theme was
  checked; the rule's `!important` flags win over any theme's own
  breadcrumb styles.
- **Way round**: take the block out of the sidebar.

Low: a visual fault on sites that chose to show the block.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main` (OPS the same, with "About
  the Server"). "Browse Block" is disabled there and no block is placed
  in the sidebar.

1. Signed out, open About > "About the Journal"
   (`/index.php/publicknowledge/en/about`). The breadcrumb reads "Home /
   About the Journal"; "About the Journal" has no bar.
2. Sign in as `rvaca`. Open Settings > Website > "Plugins" and tick
   "Browse Block".
3. Open Settings > Website > "Appearance" > "Setup", tick "Browse Block"
   under "Sidebar" and click "Save".
4. Sign out and open About > "About the Journal" again.
5. In the sidebar's "Browse" block, click "Computer Science".

**Expected**: the breadcrumb's last step is drawn as in step 1, on
"About the Journal" and on the category's page alike. On the category's
page the block marks its own "Computer Science" link.

**Observed**: after step 4 "About the Journal" has a 4 px grey bar at
its left (`border-left: 4px solid rgb(221, 221, 221)`) and is indented
(`padding-left: 6.51px`); its colour is unchanged. After step 5 the
block marks "Computer Science" with the same bar, and the breadcrumb's
"Computer Science" has it too.

## Cause

The block's template in pkp/browse (the plugin OJS and OPS ship as the
`plugins/blocks/browse` submodule) ends with a style sheet for the whole
page (`templates/block.tpl`, lines 49 to 56):

```css
.current {
	padding-left: 0.5em !important;
	border-left: 4px solid #ddd !important;
	color: rgba(0, 0, 0, 0.54) !important;
	cursor: text !important;
}
```

It is meant for the block's own marked link. The same change moved the
mark from `<li class="current">` to `<a class="current">` when it nested
the category lists. The selector names no scope, so it also hits every
other element of the page with the class `current`. The breadcrumb's
last step is one: `<li class="current">` in
`lib/pkp/templates/frontend/components/breadcrumbs.tpl` (the About page)
and in `breadcrumbs_catalog.tpl` (a category's page). The `!important`
flags beat the theme's own breadcrumb rules.

The change came with `pkp/pkp-lib#11443`, which nested sub-categories
under their parents in the block. Before it the marked `<li>` was
styled by the default theme's `.block_browse .current a`, which stays
inside the block. That rule no longer matches once the class sits on
the link, hence the new style sheet.

Reach:

- Every breadcrumb's last step: driven on the About page
  (`breadcrumbs.tpl`) and a category's page (`breadcrumbs_catalog.tpl`);
  by the templates, also `breadcrumbs_announcement.tpl` and OJS's
  `breadcrumbs_issue.tpl` and `breadcrumbs_article.tpl` (code only).
- The "{start}-{end} of {total}" line between "Previous" and "Next",
  `<span class="current">` in
  `lib/pkp/templates/frontend/components/pagination.tpl`, on OJS's issue
  archive and OPS's preprint and section listings when they run to more
  than one page (code only).
- OMP is not touched, since its own browse plugin prints no style sheet.

## Proposed fix

In pkp/browse, scope the rule to the block's marked link
([fix-a20.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/browse-block-sidebar/fix-a20.diff),
written against the OJS and OPS app roots, where the plugin sits):

```diff
--- a/plugins/blocks/browse/templates/block.tpl
+++ b/plugins/blocks/browse/templates/block.tpl
@@ -47,7 +47,7 @@
 </div><!-- .block_browse -->
 
 <style>
-	.current {
+	.block_browse a.current {
 		padding-left: 0.5em !important;
 		border-left: 4px solid #ddd !important;
 		color: rgba(0, 0, 0, 0.54) !important;
```

The mark stays on the link, as `pkp/pkp-lib#11443` wants, so the links
nested under a marked category are not marked too. The scope holds in
every theme because the plugin's own wrapper,
`<div class="pkp_block block_browse">` (`block.tpl` line 32), carries
the class.

Tried on `main` (OJS, OPS): with the fix in, the breadcrumb of the About
page and of the category page has no bar and no indent, as before the
block was placed. The block's own mark on "Computer Science" was the
same with the fix in and out.

The change goes to pkp/browse: a pull request on `main`, then a
submodule bump in pkp/ojs and pkp/ops. A proposal; the team decides.

**Alternatives**

- Put `current` back on the `<li>` and drop the style sheet, so the
  theme's `.block_browse .current a` applies again. That rule reaches
  every link under the marked `<li>`, so on a parent's page all its
  sub-categories would look marked.
- Move the rule into the default theme's `sidebar.less` as
  `.block_browse a.current`. Other themes would then lose the mark the
  plugin now draws for them.

**What goes with it**

- The default theme's `.block_browse .current a` (OJS and OPS
  `plugins/themes/default/styles/sidebar.less`, lines 82 to 87) matches
  nothing on `main` once the block marks the link. The fix leaves it,
  since 3.5 and older blocks still mark the `<li>`; dropping it from the
  `main` themes of pkp/ojs and pkp/ops is a separate clean-up.
- Backport: none needed; pkp/browse `stable-3_5_0` does not contain
  `pkp/browse#14`. If that change is backported, this fix goes with it.
- Guard: an e2e check that the breadcrumb's last step has no left
  border while the block is placed.

Small: one selector in one template.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/browse-block-sidebar/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/browse-block-sidebar/lib.js),
  run with `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js
  all shared/playwright/checks/issues/browse-block-sidebar/walk.js` on an
  install reset to the default dataset (its header gives the reset and
  the 3.5 commands). It reads the breadcrumb's computed `border-left`,
  `padding-left` and `color`, and also carries the other "Browse" block
  reports' steps.
- The fix was tried on `main` with the fix applied to both apps: the
  Steps, then the block's mark on a category page with the breadcrumb,
  each on a freshly loaded dataset; the second check was walked again
  with the fix out.
- Walked on PostgreSQL, the default dataset from pkp/datasets e8dafbc
  (2026-10-02), on `main` and `stable-3_5_0`, OJS, OMP and OPS. On 3.5
  the breadcrumb kept no bar with the block placed (OJS, OMP, OPS), and
  the block printed no style sheet.
- Default placement: `lib/pkp/schemas/context.json` gives `sidebar` no
  default, and nothing writes it when a context is created; OJS and OPS
  `plugins/blocks/browse` ship no per-context settings file, so the
  plugin starts disabled.
- Tips: OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a, plugins/blocks/browse
  89a6d31), OPS `main` c8af945bb7 (lib/pkp 3dc90c81a6, plugins/blocks/browse
  89a6d31), OMP `main` 3b0ecf794 (lib/pkp 3dc90c81a6); OJS `stable-3_5_0`
  091fb65453 (lib/pkp cf3f984335, plugins/blocks/browse 45ec0ae), OPS
  `stable-3_5_0` 38b61882d3 (plugins/blocks/browse 45ec0ae), OMP
  `stable-3_5_0` 9c5e24246; OJS `stable-3_4_0` 75cc2d488b and OPS
  acd8ae704b (plugins/blocks/browse 28a92ae); OJS `stable-3_3_0`
  ac77c9fb35 and OPS c5532e2161 (plugins/blocks/browse 7e2c7f6).
- Code reads on `main`: `lib/pkp/templates/frontend/components/`
  `breadcrumbs_announcement.tpl` and `pagination.tpl` (included by OJS
  `issueArchive.tpl`, OPS `preprints.tpl` and `sections.tpl`; a
  category page prints its page links through `{page_links}`, with no
  `current` class); OJS `templates/frontend/components/breadcrumbs_issue.tpl`
  and `breadcrumbs_article.tpl`; the default theme's
  `styles/sidebar.less`.
- Code reads on the other lines: the pkp/browse commit each app branch
  records (`git ls-tree upstream/<branch> plugins/blocks/browse`), its
  `templates/block.tpl` read with `git show` in the plugin's checkout:
  3.5 (45ec0ae), 3.4 (28a92ae) and 3.3 (7e2c7f6) mark `<li class="…
  current">` and print no style sheet.
- Introduced: `git blame` on the style sheet's lines gives 09c47fb8c5,
  the commit of `pkp/browse#14` (merged 2025-06-05).
- Upstream search (2026-10-02), pkp/pkp-lib, pkp/browse, pkp/ojs and
  pkp/ops: "breadcrumb current border", "breadcrumb grey bar", "browse
  current", "browse block categories", "nested categories browse";
  `pkp/pkp-lib#11443` was read (the nesting it asked for, no word on the
  style).
- Not driven: the paged listings; themes other than the default one;
  3.4 and 3.3.
