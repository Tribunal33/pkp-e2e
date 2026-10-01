# A static page has no breadcrumbs and no main heading, unlike a custom page

- **Severity** low
- **Effort** small
- **Kind** intention gap
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** `pkp/pkp-lib#5244` for `pkp/pkp-lib#4273` ·
  [0fafa678a7](https://github.com/pkp/pkp-lib/commit/0fafa678a740f83f9bb4f8744c858489198e8242),
  [e59b23f255](https://github.com/pkp/pkp-lib/commit/e59b23f2559e1bc3a94868bed9fa35d60f4e3822)
  · 2019-10-22, 2019-10-23 · Clinton Graham (ctgraham), Nate Wright
  (NateWr); it gave every core page breadcrumbs and an `<h1>` title, and
  left the Static Pages plugin's page out
- **Upstream** `pkp/pkp-lib#4273` (closed in 2019 with the change above,
  which did not reach the plugin)
- **Tracked in** spec U09 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a3)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

A visitor who opens a page made with the Static Pages plugin expects it
to look like the journal's other pages, a custom page among them:
breadcrumbs "Home / {Title}" and the title as the page's main heading.
Instead the static page has no breadcrumbs, and its title is a
second-level heading. The page has no main heading at all, so screen
readers and outline tools find none.

Every static page shows this, and so does the "Preview" in the window
where a manager edits one. It was seen with the default theme. OPS has
no Static Pages plugin.

## Impact

- **Lost**: no content; the title and text read in full. Visitors miss
  the "Home / …" trail every other page shows, and screen reader users
  who jump to the main heading find none.
- **Who**: every visitor to every static page, on a journal or press
  that has turned the Static Pages plugin on (it is off by default).
- **Way round**: a manager can delete each static page and make it
  again by hand as a "Custom Page" item (Settings › Website › "Setup" ›
  "Navigation"), copying its title and text in every language. Given
  the same "Path", the page keeps its address.

Low: the task is done and only the page's structure is wrong. An
accessibility review that counts a missing main heading as a failure
would raise the severity.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS or OMP `main`, `publicknowledge`.
  Its "Static Pages Plugin" is off; step 2 turns it on.

Steps:

1. Sign in as `dbarnes`.
2. Settings › Website › "Plugins" › "Installed Plugins": tick "Static
   Pages Plugin".
3. Reload Settings › Website and open the "Static Pages" tab. Press "Add
   Static Page", type `u09ir13-about` in "Path", "u09ir13 About us" in
   "Title" and "Welcome to our journal." in "Content", and press "Save".
4. Settings › Website › "Setup" › "Navigation": press "Add item", choose
   "Custom Page" as "Navigation Menu Type", type "u09ir13 Policies" in
   "Title", `u09ir13-policies` in "Path" and "Our policies." in
   "Content", and press "Save".
5. Sign out, and open `/index.php/publicknowledge/u09ir13-about`.
6. Open `/index.php/publicknowledge/u09ir13-policies`.

**Expected**: at step 5, the breadcrumbs "Home / u09ir13 About us" above
the title, and "u09ir13 About us" as the page's main heading, as step 6
shows for the custom page.

**Observed**: step 5 shows the journal's header, "u09ir13 About us",
"Welcome to our journal." and the footer, with no breadcrumbs. The
page's only heading is the title, at the second level; there is no
`<h1>`:

```html
<div class="page">
	<h2>u09ir13 About us</h2>
	<p>Welcome to our journal.</p>
</div>
```

Step 6, the custom page, shows "Home / u09ir13 Policies" and `<h1
class="page_title">u09ir13 Policies</h1>`. The browser tab reads "u09ir13
About us | Journal of Public Knowledge" (on a press, "… | Public
Knowledge Press") in both cases.

## Cause

`StaticPagesHandler::view()` (pkp/staticPages) renders the plugin's own
`templates/content.tpl`. That template includes the header, prints the
title as `<h2>{$title|escape}</h2>` inside `<div class="page">`, and
never includes `frontend/components/breadcrumbs.tpl`. It has done so
since the title was added in 2016
([3b99cd5](https://github.com/pkp/staticPages/commit/3b99cd535ec391f4e1a73e4920783c08b32d6f1e)).

Custom pages started from the same layout. pkp-lib's
`templates/frontend/pages/navigationMenuItemViewContent.tpl` printed an
`<h2>` too, until its review changes for `pkp/pkp-lib#2178` made it
`<h1 class="page_title">`
([84a9fdecef](https://github.com/pkp/pkp-lib/commit/84a9fdecef48e4ef8567485e088a96015daa538c), 2017).

`pkp/pkp-lib#4273`, "[OJS] Missing breadcrumbs in static page", settled
in 2019 that every page of the default theme has breadcrumbs and an
`<h1>` title. Its fix moved each page's `<h1>` out of `breadcrumbs.tpl`
into the page templates (0fafa678a7) and added the breadcrumbs to the
custom page's template (e59b23f255). The plugin's template was left
as it was.

pkp-lib's `templates/frontend/components/header.tpl` (lines 40–47), which
the default theme does not override, prints the context's name as a
hidden `<h1>` on the home page only. So a static page has no `<h1>` from
anywhere.

Reach:

- The edit window's "Preview" goes through the same `view()` and
  template, and shows the same layout (walked, OJS and OMP).
- Any theme that does not override the plugin's `content.tpl` renders
  this template. Only the default theme was walked; other themes were
  not checked.

## Proposed fix

Give `content.tpl` the markup of its core twin,
`navigationMenuItemViewContent.tpl`: the breadcrumbs component with the
page's title, and the title as `<h1 class="page_title">`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-no-breadcrumbs-or-main-heading/fix.diff)):

```diff
 {include file="frontend/components/header.tpl" pageTitleTranslated=$title}
 
+{include file="frontend/components/breadcrumbs.tpl" currentTitle=$title}
+
 <div class="page">
-	<h2>{$title|escape}</h2>
+	<h1 class="page_title">{$title|escape}</h1>
 	{$content}
 </div>
```

A static page and a custom page then render alike, the preview
included. It was tried on OJS and OMP `main`: the static page and its
preview showed "Home / u09ir13 About us" and the title as the page's
only `<h1>`. The custom page, the home page and "About the Journal"
("About the Press") kept their breadcrumbs and headings unchanged.

**Alternatives**:

- Render core's `frontend/pages/navigationMenuItemViewContent.tpl` from
  `StaticPagesHandler::view()` and drop the plugin's template. One
  template for both, but themes that override the plugin's `content.tpl`
  would lose their override.
- Add the breadcrumbs and keep the `<h2>`. The trail returns, but the
  page still has no main heading.

**What goes with it**:

- The plugin's Cypress test looks for `h2:contains("Test Static Page")`:
  `cypress/tests/functional/StaticPages.cy.js` on main, 3.5 and 3.4,
  `cypress/tests/functional/StaticPages.spec.js` on 3.3. It changes to
  the `<h1>` and gains a check of the breadcrumbs, so the test catches
  the layout if it slips back.
- Site CSS that styles a static page's `.page h2` stops matching; the
  default theme styles the new heading like a custom page's.
- No stored data changes. `content.tpl` is the same on 3.5, 3.4 and
  3.3, and `breadcrumbs.tpl` takes `currentTitle` there, so the diff
  applies as written.
- Other pages with no `<h1>` title were seen in the code and are left
  out, as separate pages with their own owners: OJS's "Purchase
  Individual Subscription" page (`purchaseIndividualSubscription.tpl`,
  no breadcrumbs and no `<h1>`) and pkp-lib's `orcidAbout.tpl` (title
  as `<h2>`). Not walked.

Small: two lines in one template of pkp/staticPages and one line of its
test, following the core template.

## Evidence

- The walk script saved in pkp-e2e takes the Steps, then checks nearby
  pages for side effects of the fix (the home page, "About the Journal"
  / "About the Press", and the static page's "Preview" as `dbarnes`),
  with the fix in and out:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-no-breadcrumbs-or-main-heading/walk.js).
  On an install freshly loaded from the default dataset, from a pkp-e2e
  checkout:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/static-page-no-breadcrumbs-or-main-heading/walk.js`
  (`omp` for OMP), with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5.
  The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/static-page-no-breadcrumbs-or-main-heading/fix.diff ojs omp`.
- Walked on PostgreSQL, datasets pkp/datasets c657990 (2026-10-01), on
  main and 3.5, OJS and OMP, with the default theme; 3.5 showed the
  same at every step. 3.4 and 3.3 were read in the code, not driven.
  The fault does not depend on the database.
- Tips: main OJS 68615b5a32 (lib/pkp 25562b0e1a), OMP 3b0ecf794 (lib/pkp
  3dc90c81a6), staticPages 45d02c0 in both; 3.5 OJS 3517e640f2 (lib/pkp
  b1981810da), OMP c7b45f88e (lib/pkp 1fb843f491), staticPages fb9b499
  in both; 3.4 lib/pkp `origin/stable-3_4_0` 32b0f4b4af, staticPages
  9568981 (the pointer of OJS 75cc2d488b and OMP 0aec65441); 3.3 lib/pkp
  `origin/stable-3_3_0` f6ab331645, staticPages 8c97bd0 (OJS ac77c9fb35,
  OMP 8e72fc883).
- Code reads. All four versions: the plugin's `templates/content.tpl`
  (the `<h2>`, no breadcrumbs; the same file at each pointer) and
  pkp-lib's `navigationMenuItemViewContent.tpl` (breadcrumbs and
  `<h1 class="page_title">` on each branch). main and 3.5:
  `StaticPagesHandler::view()`, `StaticPagesPlugin::callbackHandleContent()`
  (the preview), pkp-lib's `header.tpl`, `breadcrumbs.tpl`, and a search
  of the three apps' page templates and plugin templates for pages with
  no breadcrumbs or no `<h1>`. The way round, main (not walked): the
  custom page's path check (`PKPNavigationMenuItemsForm`) refuses only
  another custom page's path, and
  `PKPNavigationMenuService::_callbackHandleCustomNavigationMenuItems()`
  builds the address from the same parts as the plugin, so a custom
  page made with a deleted static page's "Path" answers at its address.
- Introduced: `git blame` on the `<h2>` line gives 543766c (2021, a
  nesting change for `pkp/pkp-lib#6780`); its parent's line comes from
  3b99cd5 (2016). In pkp-lib, `git log -S page_title` on
  `navigationMenuItemViewContent.tpl` gives 84a9fdecef, and `git log`
  gives e59b23f255 for the breadcrumbs; 0fafa678a7 and e59b23f255 were
  merged in PR `pkp/pkp-lib#5244`, with `pkp/ojs#2524` and
  `pkp/omp#726` for the apps' pages.
- `pkp/staticPages#49` (Clinton Graham, under `pkp/pkp-lib#4273`) added
  the breadcrumbs to `content.tpl` and dropped the `<h2>` while the
  breadcrumbs still held the `<h1>`. Its test was failing; its author
  closed it without a comment on 2019-10-10, unmerged, with no review
  turning it down, twelve days before his 0fafa678a7 moved the `<h1>`
  out of the breadcrumbs.
- Upstream search (pkp/pkp-lib, pkp/staticPages, pkp/ojs, pkp/omp,
  pkp/ui-library; issues and PRs, open and closed): "static page
  breadcrumbs", "static page h1", "static page heading", and in
  pkp/staticPages "breadcrumbs", "h1", "heading", "title". Only
  `pkp/pkp-lib#4273` and `pkp/staticPages#49` are about this fault.
