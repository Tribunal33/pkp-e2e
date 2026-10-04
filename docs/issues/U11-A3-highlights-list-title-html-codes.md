# The Highlights settings list shows a title's bold word as `<b>…</b>` and "&" as `&amp;`

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS (code; only with the `highlights` switch, off unless added to `config.inc.php`)
  - 3.3: none (code; no Highlights)
- **Introduced** `pkp/ui-library#288` and `pkp/pkp-lib#9321` for `pkp/pkp-lib#9262` · [0abe290a00](https://github.com/pkp/ui-library/commit/0abe290a00a12a22927ade7c379fb446af3b9ee8) and [9984fe4470](https://github.com/pkp/pkp-lib/commit/9984fe447071d461189e58904f47308e7b2920c4) · 2023-10-12 · Nate Wright (NateWr); on 3.4 the backport `pkp/ui-library#285` and `pkp/pkp-lib#9270`
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U11 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U11-highlights.md#a3)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

A manager who makes a word of a highlight's "Title" bold expects the
Highlights list to show it bold, as the home page's slide and the
"Delete Highlight" question do. Instead the list prints the title's
codes: "Special issue" with "Special" in bold reads
`<b>Special</b> issue`, and a title typed as "Books & ideas" reads
`Books &amp; ideas`.

Readers are not affected: the slide on the home page shows the title
right. In ordering mode, a screen reader hears the same codes in each
arrow's name ("Increase position of <b>Special</b> issue").

It shows for every title with formatting or with "&", "<" or ">", in a
journal's, press's or server's Highlights list.

## Impact

- **Lost:** nothing. The highlight is saved right, and readers see it
  right on the home page. Only the managers' settings list is harder
  to read.
- **Who:** the managers of a journal's (press's, server's)
  Highlights, whenever a title uses the box's "Formatting" button or
  holds an "&", which is common in titles; managers using a screen
  reader hear the codes in the ordering arrows' names too.
- **Way round:** leave out the formatting and the "&" in the title.

Low: a list for managers shows the title with codes, and what readers
see is right.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (OMP and OPS the same, with
  the press or server in place of the journal). Nothing else: the
  "Formatting" button is on "Title" by default, with no setting.

Steps:

1. Sign in as `rvaca`, the journal's manager.
2. Go to Settings › "Website", the "Setup" tab, then "Highlights"
   (`/index.php/publicknowledge/en/management/settings/website`).
3. Press "Add Highlight".
4. In "Title", type `Special issue u11b`.
5. Select the word "Special". Press the box's "Formatting" button,
   then "Bold" (the menu offers Bold, Italic, Underline, Superscript
   and Subscript).
6. In "URL", type `https://example.org/u11b`. In "Button Label", type
   `Read more`.
7. Press "Save".
8. Press "Add Highlight" again. In "Title", type `Books & ideas u11b`.
   In "URL", type `https://example.org/u11b2`, in "Button Label"
   `Read more`. Press "Save".
9. Press "Order". Each row gets an up and a down arrow, whose names
   are hidden screen-reader text inside the buttons: listen with a
   screen reader, or read the buttons' text in the browser's
   inspector. Press "Cancel".
10. On the first row press "Delete", read the question, and press
    "No".
11. Open the journal's home page and read the two slides.

**Expected:** the rows read "**Special** issue u11b" (the first word
bold) and "Books & ideas u11b". The arrows are named "Increase position
of Special issue u11b" and "Increase position of Books & ideas u11b".

**Observed:** the rows read:

```
<b>Special</b> issue u11b
Books &amp; ideas u11b
```

The arrows are named `Increase position of <b>Special</b> issue u11b`
and `Increase position of Books &amp; ideas u11b` (and "Decrease
position of …" the same way). The titles are stored as HTML, with
"&" stored as `&amp;`: `<b>Special</b> issue u11b` and
`Books &amp; ideas u11b`.

The title shows right in the delete question and on the home page.
The question reads "Are you
sure you want to delete **Special** issue u11b? This action can not be
undone.", and the home page's slides read "**Special** issue u11b" and
"Books & ideas u11b".

## Cause

A highlight's "Title" is formatted text. `HighlightForm` (pkp-lib
`classes/components/forms/highlight/HighlightForm.php`, line 44) makes
it a `FieldRichText`. That box saves HTML: `<b>`, `<i>`, `<u>`,
`<sup>`, `<sub>`, with "&", "<" and ">" written as `&amp;`, `&lt;` and
`&gt;`. Everything that shows the title has to render it as HTML.
Two places on the settings page print it as text instead.

The list's row. `HighlightsListPanel.vue` (ui-library
`src/components/ListPanel/highlights/HighlightsListPanel.vue`, lines
40–42) fills the row's `item-title` slot with
`{{ localize(item.title) }}`. Vue escapes a text interpolation, so the
stored tags and entities show as characters.

The ordering arrows. Line 47 passes the same HTML string as the
`Orderer`'s `item-title`. `Orderer.vue` puts that into its
screen-reader labels (`common.orderUp`, "Increase position of
{$itemTitle}") as text.

The rest of the code treats the title as HTML. The delete question
renders it, because `DialogBody.vue` prints its message through
`v-strip-unsafe-html`. The theme's `highlights.tpl` prints it through
`|strip_unsafe_html`. Both lines of the list came in with the
feature, in the same change that made the title a rich-text box, so
the list has shown codes from the start.

Reach:

- The site's own Highlights list (Administration › Site Settings ›
  Highlights) uses the same component (checked in the code). No
  highlight can be saved there today (spec U11 A5).
- The same mistake prints a publication's formatted title as text in
  two other lists (checked in the code, not walked): the DOIs page's
  rows (`DoiListPanel.vue` `getItemTitleBase()` builds the title from
  `fullTitle`, which pkp-lib's publication map sends as HTML, and
  `DoiListItem.vue` prints it with `{{ item.title }}`), and OMP's
  catalog rows (`CatalogListItem.vue`, `{{ localize(currentPublication.fullTitle) }}`).
- The other list panels with their own row title (announcements,
  institutions, reviewer suggestions, contributors, COUNTER reports)
  print names and titles entered in plain text boxes, where `{{ }}` is
  right (checked in the code).

## Proposed fix

Render the title as HTML in the row, through the directive the rest
of ui-library uses for stored HTML. Give the ordering arrows the title
as plain text.
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/highlights-list-title-html-codes/fix.diff),
one file, the same on `main` and 3.5:

```diff
 				<template #item-title="{item}">
-					{{ localize(item.title) }}
+					<span v-strip-unsafe-html="localize(item.title)"></span>
 				</template>
 				<template #item-actions="{item}">
 					<Orderer
 						v-if="isOrdering"
 						:item-id="item.id"
-						:item-title="localize(item.title)"
+						:item-title="titleAsText(item)"
```

```js
		titleAsText(item) {
			const html = this.localize(item.title) || '';
			return new DOMParser().parseFromString(html, 'text/html').body
				.textContent;
		},
```

`v-strip-unsafe-html` sanitises with DOMPurify before it renders. It is
how the dashboard's title cell (`DashboardCellSubmissionTitle.vue`) and
the dialogs show stored HTML, so the list matches the delete question
and the slide. `DOMParser` gives the text without rendering anything,
which suits a label. `InsertSummaryOfChangesModal.vue`'s
`htmlToPlainText()` does the same job with a detached `div`.

Tried on `main` (OJS, OMP, OPS): the walk showed the Expected. A
neighbour check, the script's `neighbour` mode, showed the fix goes no
further than it should. A title typed with angle brackets ("a <b> c")
stays text in the row ("a <b> c", not bold; `a &lt;b&gt; c` without
the fix), and a plain title reads as before.

**Alternatives:**

- Make "Title" a plain text box. That drops the formatting the
  feature offers, and the slide shows formatting today, so the
  stored titles would need changing.
- Strip the tags on the server for the list. The list and the edit
  form share one record, so the form would lose the formatting.

**What goes with it:**

- No data repair: the stored titles are right.
- 3.4's older copy of the file has the same two lines
  (`v-slot:item-title`, `:itemTitle`), so a backport makes the same
  change by hand.
- A guard: the U11 e2e scenario that adds a formatted title can
  assert the row's bold word.
- The DOIs and catalog rows under Cause are different components and
  need separate fixes.

Small: two lines and a short method in one ui-library component,
following the pattern ui-library already uses for stored HTML, and
tried.

## Evidence

- The walk script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/highlights-list-title-html-codes/walk.js)
  takes the Steps as `rvaca`. With the argument `neighbour` it adds the
  title typed with angle brackets and a plain title instead, then
  reloads and reads the rows and the arrows' names. Run it with
  `node bin/probe.js all shared/playwright/checks/issues/highlights-list-title-html-codes/walk.js [neighbour]`.
- Walks: OJS, OMP and OPS on `main` and on `stable-3_5_0` showed the
  Observed, the same on each. On `main` with the fix applied they
  showed the Expected, and the neighbour check ran with the fix in and
  out. Databases: PostgreSQL. No request failed and the browser
  reported no script error.
- 3.4 (code): ui-library `stable-3_4_0` has the same two lines in
  `HighlightsListPanel.vue`, and pkp-lib's `HighlightForm` has the
  same `FieldRichText` title. pkp-lib's `ManagementHandler::website()`
  offers the tab only when `config.inc.php` has `highlights = On` in
  its `[features]` section, which the config template does not list
  (`pkp/pkp-lib#9426`). Only OJS mounts `api/v1/highlights`. Per
  `pkp/pkp-lib#9262`, 3.4 has no Highlights for OMP or OPS.
- 3.3 (code): no Highlights in pkp-lib, ui-library or the apps.
- Not driven: 3.4 and 3.3; the site's Highlights list (spec U11 A5
  blocks saving there); the DOIs and OMP catalog rows named under
  Cause (code only); italic, underline, superscript and subscript
  (they reach the list the same way as bold, by the code); MySQL (the
  fault is in the browser, not the database).
- The trace: `git blame` on ui-library's line 41 gives 0abe290a00, the
  commit that added the list panel. Lines 40 and 47 blame to
  c2aa1feb74, a lint pass that changed the slot syntax (line 40,
  `v-slot:item-title` to `#item-title`) and renamed the `Orderer` prop
  (line 47, `:itemTitle` to `:item-title`); both lines came in with
  0abe290a00. pkp-lib 9984fe4470 added
  `HighlightForm` with the `FieldRichText` title. Both are for
  `pkp/pkp-lib#9262`.
- The branch tips the walks and code reads used:
  - **`main`:** OJS ff004d0973 (pkp-lib 987776cd04, ui-library
    64d67363), OMP 3b0ecf794c and OPS c8af945bb7 (pkp-lib 3dc90c81a6,
    ui-library 280f98c5).
  - **`stable-3_5_0`:** OJS c1cee76b95 (pkp-lib 771474347e, ui-library
    d4e01883), OMP 9c5e24246c, OPS 38b61882d3 (pkp-lib cf3f984335,
    ui-library d4e01883).
  - **`stable-3_4_0`** (code): OJS d68934d0d1, OMP 0aec65441,
    OPS acd8ae704b, pkp-lib 767353f4fe, ui-library ee684b34.
  - **`stable-3_3_0`** (code): OJS ac77c9fb35, OMP 8e72fc883,
    OPS c5532e2161, pkp-lib ac3fa73402, ui-library 96959f9e.
- The default dataset loaded: pkp/datasets 1a5552c (2026-10-04).
