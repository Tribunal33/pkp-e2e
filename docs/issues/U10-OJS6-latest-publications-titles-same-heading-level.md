# On a journal's home page, each "Latest Publications" title is a heading at the section's own level

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: none (no "Latest Publications")
  - 3.4: none (code; no "Latest Publications")
  - 3.3: none (code; no "Latest Publications")
- **Introduced** `pkp/ojs#4875` for `pkp/pkp-lib#9295` · [9486d8e182](https://github.com/pkp/ojs/commit/9486d8e182356a101a018450ea2073c747addbaa) · authored 2025-05-27, merged 2025-06-26 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U10 [OJS6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U10-appearance-and-theming.md#ojs6)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a journal's home page, each article title under "Latest
Publications" is a heading at the same level as "Latest Publications"
itself, rather than one level below it. So a screen reader's list of
headings shows each article as a new part of the page. The current
issue's article titles, by contrast, sit below its "Articles" heading,
as expected.

Every article can still be reached and read; only the outline is wrong.

The list shows by default on a journal with no issue, the continuously
publishing journal it was built for. A journal with issues shows it once
a manager ticks "Include recent most published articles". It lists the
articles published outside a published issue: published with no issue
(the case the Steps take) or into an issue not yet published. The list is on
`main` only, in no release yet.

## Impact

- **Lost**: the outline of the home page for a screen reader user; no
  content.
- **Who**: visitors who move through a page by headings (screen
  readers, heading navigation tools), on the home page of any journal
  that shows "Latest Publications".
- **Way round**: none needed to reach the articles. The outline cannot
  be corrected from the settings.

Low: readers get to every article and only the heading levels mislead.
It would be medium if the wrong levels hid an article from a screen
reader or broke moving through the page with the keyboard.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`, freshly loaded. Its
  journal `publicknowledge` has a current issue, "Vol. 1 No. 2 (2014)",
  and submission 5 "Genetic transformation of forest trees" in
  Production. "Latest Publications" is off, and no article is published
  outside an issue, so the steps turn it on and publish one.

1. Sign in as `dbarnes`.
2. Settings › Website › Appearance › "Theme": under "Journal Content
   Organization", tick "Include recent most published articles" (leave
   "Include the current issue's table of contents" ticked), then "Save".
3. Open submission 5 "Genetic transformation of forest trees", then
   Publication › "Title & Abstract", and press "Schedule For
   Publication".
4. In "Review Publishing Details", set "Publication Stage" to "Version of
   Record" and "Revision Significance" to "Major Revision", choose "Don't
   Assign To An Issue", press "Confirm", then "Publish".
5. Sign out and open the journal's home page
   (`/index.php/publicknowledge`).
6. List the page's headings as a screen reader does (NVDA's Elements
   list, VoiceOver's "Headings" rotor, or the browser's accessibility
   tree).

**Expected**: "Genetic transformation of forest trees" is one level
below "Latest Publications", as the current issue's articles are below
theirs:

```
heading "Journal of Public Knowledge" [level=1]
heading "Latest Publications" [level=2]
  heading "Genetic transformation of forest trees" [level=3]
heading "Current Issue" [level=2]
  heading "Articles" [level=3]
    heading "The Signalling Theory Dividends A Review Of The Literature And Empirical Evidence" [level=4]
    heading "Antimicrobial, heavy metal resistance and plasmid profile of coliforms …" [level=4]
```

**Observed**: the article title is a level-2 heading, a sibling of
"Latest Publications" and "Current Issue":

```
heading "Journal of Public Knowledge" [level=1]
heading "Latest Publications" [level=2]
heading "Genetic transformation of forest trees" [level=2]
heading "Current Issue" [level=2]
  heading "Articles" [level=3]
    heading "The Signalling Theory Dividends A Review Of The Literature And Empirical Evidence" [level=4]
    heading "Antimicrobial, heavy metal resistance and plasmid profile of coliforms …" [level=4]
```

The markup is `<h2 class="highlight_first">Latest Publications</h2>`
followed by `<h2 class="title">` for each article in the list. The
same shows on a journal with no issue, where the list is on by default
(`JournalContentOption::default()`, read in the code, not walked).

## Cause

`templates/frontend/objects/latest_article.tpl` passes a variable that
is never set:

```smarty
{include file="frontend/objects/article_summary.tpl" heading=$articleHeading}
```

Nothing assigns `$articleHeading` in this template or in
`indexJournal.tpl`, which includes it with `heading="h2"`. So
`article_summary.tpl` receives an empty `heading`, and its fallback
(`{if !$heading}{assign var="heading" value="h2"}{/if}`) makes every
title an `h2`, the level of the list's own heading.

The line was copied from `issue_toc.tpl`, which computes
`$articleHeading` one level below its `$heading` before using it. That
block was added for `pkp/pkp-lib#5178` ("Fix heading structure for
current issue on homepage", cd5667f300, 2020) to fix the same fault for
the current issue. `latest_article.tpl` came with the continuous
publication work for `pkp/pkp-lib#9295` and took the include line but
not the block.

Reach (checked in the code on `main`):

- The other lists of article summaries pass a level explicitly or
  compute it: `issue_toc.tpl` (computed), `search.tpl` and
  `catalogCategory.tpl` (`heading="h3"` under an `h2`). Only
  `latest_article.tpl` passes an unset variable.
- OPS's "Latest preprints" (`indexServer.tpl`) passes `heading="h3"`
  under its `h2` and is correct. OMP has no such list.
- Which journals show the list: `JournalContentOption::default()`
  returns only `RECENT_PUBLISHED` for a journal with no issue, and both
  the default theme's option (`DefaultThemePlugin::init()`) and
  `IndexHandler::index()` use it, so such a journal shows the list
  without any setting changed. A journal with issues shows it once the
  option is ticked.

## Proposed fix

Compute the article level in `latest_article.tpl` the way
`issue_toc.tpl` does, from the `heading` its caller passes
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/latest-publications-titles-same-heading-level/fix.diff)):

```diff
+{if !$heading}
+	{assign var="heading" value="h2"}
+{/if}
+{assign var="articleHeading" value="h3"}
+{if $heading == "h3"}
+	{assign var="articleHeading" value="h4"}
+{elseif $heading == "h4"}
+	{assign var="articleHeading" value="h5"}
+{elseif $heading == "h5"}
+	{assign var="articleHeading" value="h6"}
+{/if}
 <div class="sections latest_articles">
     <{$heading} class="highlight_first">
```

Tried on `main`: with the fix in, the Steps show "Genetic
transformation of forest trees" at level 3 under "Latest Publications"
(the Expected outline above), and the page looks identical, since the
default theme styles the title by its `title` class. The current
issue's outline ("Current Issue" 2, "Articles" 3, its titles 4) is the
same with the fix in and out.

The template that prints the list's heading owns the level of the
items under it, so the fix goes there rather than in its caller.

**Alternatives**:

- Pass `heading="h3"` in the include, as OPS's `indexServer.tpl` does.
  One line, but it ignores the template's own `heading` parameter, so a
  caller passing `h3` would get titles at the list's level again.
- Make `article_summary.tpl` default to `h3`. That would change every
  other caller relying on the `h2` default and is not the summary's
  rule to own.

**What goes with it**:

- A theme that styles `.latest_articles h2` would need to follow.
- Optionally, the `@uses $heading` docblock `issue_toc.tpl` carries.
- Test: an e2e check that the home page's "Latest Publications" titles
  are headings one level below the list's heading.

Small: one block in one template, copied from its sibling, and a test.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/latest-publications-titles-same-heading-level/walk.js)
  takes the Steps on OJS and records the home page's heading outline
  (the `h1`–`h6` in the page and the accessibility tree's headings).
  Run with pkp-e2e's tooling on an install freshly loaded from the
  default dataset (`<feature>` names the set of test installs, `<id>`
  the output folder):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/latest-publications-titles-same-heading-level/walk.js`.
  With `MODE=nb` in front, the same script checks the current issue's
  outline on the home page as the dataset leaves it, run with the fix
  in and out.
- Walks: OJS on `main` (with the fix in and out) and on
  `stable-3_5_0`, where the "Theme" tab has no "Journal Content
  Organization" and the home page no "Latest Publications". All on
  PostgreSQL, with datasets from pkp/datasets 566bb1f (2026-10-03).
- Not driven: OMP and OPS (no "Latest Publications"), 3.4 and 3.3, and
  a journal with no issue (the list's default there is read in the
  code). Themes: the default theme and its child themes use this
  template; other themes are not checked (one with its own copy of the
  home page needs its own change).
- The branch tips the walks and code reads used:
  - **`main`:** OJS ff004d0973 (pkp-lib 987776cd04).
  - **`stable-3_5_0`:** OJS c1cee76b95 (pkp-lib 771474347e).
  - **`stable-3_4_0`** (code): OJS d68934d0d1.
  - **`stable-3_3_0`** (code): OJS ac77c9fb35.
- Code reads:
  - `main`: `latest_article.tpl`, `indexJournal.tpl`, `issue_toc.tpl`,
    `article_summary.tpl`, `search.tpl`, `catalogCategory.tpl`,
    `IndexHandler::index()`, `JournalContentOption::default()`, `DefaultThemePlugin::init()`; a search of OJS's and pkp-lib's templates
    for `article_summary.tpl` includes and `$articleHeading`; OPS's
    `indexServer.tpl`; the default theme's `indexJournal.less` and
    `article_summary.less`.
  - 3.5, 3.4 and 3.3: no `latest_article.tpl`, and `indexJournal.tpl`
    has no list of recent articles; its current issue goes through
    `issue_toc.tpl` with the computed levels.
- The trace: `git blame` on the include line of `latest_article.tpl`
  gives 9486d8e182, the commit that created the file, unchanged since
  apart from the paging lines (d6c8937035). `pkp/ojs#4875` was merged
  by hand, so GitHub links no PR to the commit. `git blame` on `issue_toc.tpl`'s level block gives
  cd5667f300 (Nate Wright, 2020-05-14).
- Upstream (searched 2026-10-03, pkp/pkp-lib, pkp/ojs, pkp/ui-library):
  nothing on this fault. `pkp/pkp-lib#12738` (open) is about the
  sidebar's "Latest publications" feed block on 3.5, a different block.
