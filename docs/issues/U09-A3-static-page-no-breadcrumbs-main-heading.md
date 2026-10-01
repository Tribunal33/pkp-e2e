# A static page has no breadcrumbs and no main heading, unlike the site's other pages

- **Severity** low
- **Effort** small
- **Kind** intention gap
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** the gap opened with `pkp/pkp-lib#5244` for `pkp/pkp-lib#4273` · [e59b23f255](https://github.com/pkp/pkp-lib/commit/e59b23f2559e1bc3a94868bed9fa35d60f4e3822) · 2019-10-23 · Nate Wright (NateWr), which gave the core pages and custom pages breadcrumbs and an `<h1>` and left the Static Pages plugin's page out
- **Upstream** `pkp/pkp-lib#4273` (closed as completed; its fix did not reach the Static Pages plugin)
- **Tracked in** spec U09 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a3)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A visitor expects a static page to look like the journal's other pages,
a custom page among them: breadcrumbs "Home / {Title}" and the title as
the page's main heading. Instead a static page has no breadcrumbs, and
its title is a second-level heading, so the page has no main heading for
screen readers and outline tools. The manager's "Preview" of the page
shows the same layout.

The page's title and text all show, and the browser tab reads "{Title} |
{journal name}". A manager can avoid it only by re-creating each page as
a "Custom Page" under "Navigation", copying its title and text by hand.

It shows with the default theme, and with any theme that does not supply
its own static page template. OPS is not affected: it has no Static
Pages plugin.

## Impact

- **Lost**: no content. The page loses the "Home" link above its title
  and its main heading, which a screen reader user jumps to first. No
  message tells the manager.
- **Who**: every visitor of every static page, and the manager in
  "Preview", on a journal or press with the Static Pages plugin on.
- **Way round**: re-create the page as a "Custom Page" (Settings ›
  Website › "Setup" › "Navigation" › "Add item"), which has both,
  copying the title and content of each language by hand. It can keep
  the address: at a path both hold, the custom page opens, and the
  static page can then be deleted. The contact tags such as
  `{$contactName}` work there too.

Low: the page reads and works, and only its layout and heading order
differ. WCAG 2.x does not require a first-level heading (axe lists
"page-has-heading-one" as a best practice, not a failure), so no
standard the apps claim is broken.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS or OMP (on OMP read "press"
  for "journal"); the context `publicknowledge` has English and French,
  so its addresses carry `/en/`.
- The "Static Pages Plugin" is off in the dataset; step 2 turns it on.

1. Sign in as `rvaca` (Journal Manager on OJS, Press Manager on OMP).
2. Settings › Website › "Plugins": tick "Static Pages Plugin".
3. Reload the page and open the tab "Static Pages".
4. Press "Add Static Page". Type "about-us" in "Path", "About us" in
   "Title" and "Welcome to our journal." in "Content".
5. Press "Preview": a new browser tab shows the page. Close it.
6. Press "Save".
7. Control: Settings › Website › "Setup" › "Navigation": "Add item",
   Title "Our policies", Navigation Menu Type "Custom Page", Path
   "our-policies", Content "Our policies."; "Save". The item needs no
   place in a menu: its address opens either way.
8. Sign out and open `/index.php/publicknowledge/en/about-us`.
9. Open `/index.php/publicknowledge/en/our-policies`.
10. Open "About the Journal" (`/index.php/publicknowledge/en/about`).

**Expected**: the static page of step 8, and its preview in step 5,
look like the pages of steps 9 and 10: the breadcrumbs "Home / About us"
above the title, and "About us" as the page's main heading (`<h1>`).

**Observed**: steps 5 and 8 show the journal's header, "About us",
"Welcome to our journal." and the footer, with no breadcrumbs. Read from
the page:

```
breadcrumbs:          none
main column headings: h2 "About us"
h1 on the page:       none
tab title:            About us | Journal of Public Knowledge
```

The custom page of step 9 has the breadcrumbs "Home / Our policies" and
"Our policies" as `<h1 class="page_title">`; "About the Journal" has
"Home / About the Journal" and an `<h1>`.

## Cause

The Static Pages plugin draws its page with its own template,
`plugins/generic/staticPages/templates/content.tpl`, which
`StaticPagesHandler::view()` displays for the public page and for the
preview alike:

```smarty
<div class="page">
	<h2>{$title|escape}</h2>
	{$content}
</div>
```

It includes no `frontend/components/breadcrumbs.tpl` and prints the title
in an `<h2>`. The header gives a page an `<h1>` only on the homepage
(`frontend/components/header.tpl` adds a screen-reader `<h1>` when the
requested page is "index"), so a static page has none.

`pkp/pkp-lib#4273`, titled "Missing breadcrumbs in static page", set the
rule for the default theme: every page has breadcrumbs and an `<h1>`
title (NateWr's comment of 2019-10-07), each page template carrying both
(his comment of 2019-10-21). Its fix, e59b23f255, changed the core page
templates and the custom page's
`lib/pkp/templates/frontend/pages/navigationMenuItemViewContent.tpl`. The
plugin lives in its own repository, pkp/staticPages, and was left out.
Its change for the issue, `pkp/staticPages#49`, removed the `<h2>` and
relied on the `<h1>` that `breadcrumbs.tpl` then carried; its test
failed, and its author closed it on 2019-10-10 without a comment. No
reason against it was given; #4273 then moved the `<h1>` out of the
breadcrumbs, which made that approach obsolete.

In 2021, `pkp/pkp-lib#6780` described the layout for static pages and
custom pages as breadcrumbs, then `<h1>`, then the content, all inside
`<div class="page">` (NateWr's comment of 2021-02-23). Its commit for
the plugin, 543766c, only moved the `<h2>` inside `<div class="page">`:
the heading stayed an `<h2>` and no breadcrumbs were added.

The reach:

- The public page and the "Preview" tab: walked.
- The French address (`/fr_CA/…`): walked, the same layout.
- Themes: the plugin's template applies unless a theme overrides it.
  The default theme (the only one shipped with OJS and OMP) does not.
  Read on GitHub: the Bootstrap 3 theme (NateWr/bootstrap3) does not
  either; Health Sciences and Classic override it with an `<h1>`, and
  Pragma and Immersion with their own `<h2>` layout, so the fix does not
  change those four.
- OJS's manual payment page
  (`plugins/paymethod/manual/templates/paymentForm.tpl`, read in the
  code) has an `<h1>` but no breadcrumbs, while OMP's has both; a
  separate page, left out here.

## Proposed fix

In pkp/staticPages, give `templates/content.tpl` the breadcrumbs and an
`<h1>`:

```diff
 <div class="page">
-	<h2>{$title|escape}</h2>
+	{include file="frontend/components/breadcrumbs.tpl" currentTitle=$title}
+	<h1 class="page_title">{$title|escape}</h1>
 	{$content}
 </div>
```

The breadcrumbs go inside `<div class="page">`, as in `about.tpl`,
`contact.tpl` and the other core pages and as the `pkp/pkp-lib#6780`
comment lays out. The custom page's template differs here: it puts the
breadcrumbs before `<div class="page">`. The core pages' placement is
the documented one, and the default theme styles the breadcrumbs the
same in either place. The `page_title` class is the custom page's.
`breadcrumbs.tpl` escapes `currentTitle` itself, so the title is passed
raw, as the custom page passes it.

The same change updates the plugin's Cypress test
(`cypress/tests/functional/StaticPages.cy.js`): its one check for
`h2:contains("Test Static Page")` becomes two, one for the breadcrumb
and one for the `<h1>`.
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-no-breadcrumbs-main-heading/fix.diff)
holds both, with paths from the OJS or OMP root
(`plugins/generic/staticPages/…`); in the pkp/staticPages repository the
paths start at `templates/` and `cypress/` (`git apply -p4`).

Tried on `main` (OJS, OMP): steps 5 and 8 show "Home / About us" and
"About us" as the page's only `<h1>`. A second walk added a static page
whose "Content" was "Write to {$contactName}.", opened it at its English
and French addresses, then opened a custom page and "About the Journal".
With the fix in and out, only the static page changed: it gained the
breadcrumbs ("Home / …", "Accueil / …" in French) and the `<h1>`. Its
tab title and its text ("Write to Ramiro Vaca.") were the same either
way, and so were the other two pages.

**Alternatives**:

- Have `StaticPagesHandler::view()` display the core
  `frontend/pages/navigationMenuItemViewContent.tpl`, which takes the
  same `title` and `content`: one template fewer, but every theme that
  overrides the plugin's `content.tpl` would lose its layout.
- Put the breadcrumbs and `<h1>` in `header.tpl` for every page:
  `pkp/pkp-lib#4273` ruled this out (comment of 2019-10-21), since each
  page template is the unit a child theme overrides.

**What goes with it**:

- OJS and OMP take it by moving their `plugins/generic/staticPages`
  submodule pointer.
- The page's markup changes: a journal's own stylesheet aimed at the
  static page's `h2` no longer matches it.
- No stored data to repair.
- Backport: `content.tpl` is the same on 3.5, 3.4 and 3.3, and
  `breadcrumbs.tpl` takes `currentTitle` on all three, so the change
  applies as it stands.
- Guard: the plugin's Cypress test, changed above.

Small: two lines in one plugin template, following the core pages, and
two lines of its test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-no-breadcrumbs-main-heading/walk.js),
  run on an install reset to PKP's default test dataset (pkp/datasets
  38ab955, 2026-09-30, PostgreSQL) with
  `ONLY=ojs,omp node bin/probe.js all shared/playwright/checks/issues/static-page-no-breadcrumbs-main-heading/walk.js`
  (`neighbour` as its argument takes the second walk). It reads the
  breadcrumbs (`nav.cmp_breadcrumbs`), the main column's headings and
  every `<h1>` of the page.
- The fix was tried with `node bin/try-fix.js apply` on the OJS and OMP
  `main` checkouts, then reverted.
- Walked on `main` and `stable-3_5_0`, OJS and OMP, with the same
  result. Tips: `main` OJS bade233f73, OMP 3b0ecf794c, pkp-lib
  2e377d27fc (OJS) and 3dc90c81a6 (OMP; the templates read are
  identical), staticPages 45d02c0; `stable-3_5_0` OJS 92b9a16b48, OMP
  3081c9b00d, pkp-lib a9c76aed62, staticPages fb9b499.
- 3.4 and 3.3 read in the code: pkp/staticPages 9568981 (the
  `stable-3_4_0` pointer of OJS 9571d8fde7 and OMP 0aec65441) and
  8c97bd0 (`stable-3_3_0`, OJS 9fdb9bcf9a, OMP 8e72fc883); pkp-lib
  `stable-3_4_0` df13621c2d and `stable-3_3_0` d446601ebe, whose
  custom page template has the breadcrumbs and `<h1 class="page_title">`.
  OPS has no Static Pages submodule on any of the four lines.
- Introduced: `git blame` on the `<h2>` line gives 543766c (2021-02-24,
  the move inside `<div class="page">`), whose parent leads to 3b99cd5
  ("Add title to static pages template", 2016-01-15), from before the
  breadcrumb rule. e59b23f255 was merged in `pkp/pkp-lib#5244`
  (`master`; `pkp/pkp-lib#5214` on `stable-3_1_2`). No later
  staticPages commit names `pkp/pkp-lib#4273`.
- Themes read on GitHub on 2026-09-30, each default branch:
  `templates/plugins/generic/staticPages/templates/content.tpl` in
  pkp/healthSciences, pkp/classic, pkp/pragma and pkp/immersion; none
  in NateWr/bootstrap3. Not walked.
- Upstream: pkp/pkp-lib, pkp/staticPages, pkp/ojs and pkp/omp searched
  by the symptom (static page, breadcrumbs, h1, heading, title) and by
  `content.tpl` (2026-09-30).
