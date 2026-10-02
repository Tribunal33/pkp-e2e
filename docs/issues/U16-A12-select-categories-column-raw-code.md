# A screen reader announces the "Select Categories" window's arrow column as "##common.expand##"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (no "Select Categories" window)
  - 3.4: none (code; no "Select Categories" window)
  - 3.3: none (code; no "Select Categories" window)
- **Introduced** `pkp/ui-library#620` with `pkp/pkp-lib#11388` · [e85a63e477](https://github.com/pkp/ui-library/commit/e85a63e4778a25c451d81459ee2bc8ffbf6e335f) · 2025-06-19 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U16 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U16-categories.md#a12)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

The "Select Categories" window lists the categories in a table whose last
column holds the arrows that open and close each row. A screen reader
announces that column's heading as the raw code "##common.expand##"
instead of a word. On screen the heading is empty.

The window opens from every "Categories" field: the dashboard's
"Filters", a submission's publication pages, and the submission wizard's
"For the Editors" step when the journal asks authors for categories.

## Impact

- **Lost**: nothing. A screen reader user hears a code where the
  column's name should be, each time they move into that column.
- **Who**: editors, managers and authors who use a screen reader, on a
  journal, press or preprint server with categories.
- **Way round**: none needed for the heading. (The arrows' own names are
  wrong too, for another reason: the U16 A11 report.)

Low: a raw code in a heading only a screen reader reads. Nothing is lost
and the task gets done.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS). It has
  categories. Nothing else is needed.
- Chrome's accessibility inspector, or a screen reader.

Steps:

1. Sign in as `rvaca` (password `rvacarvaca`), the journal's (press's,
   preprint server's) manager.
2. Open "Submissions" (the dashboard) and press "Filters".
3. Under "Categories", press "Select Categories".
4. In the window's table, inspect the last column's heading (the column
   of arrows), or move into it with a screen reader's table commands.

**Expected.** The heading reads a word, such as "Expand".

**Observed.** The same on the three apps. The table's column headings,
as the accessibility tree names them: "NAME", "##COMMON.EXPAND##". The
upper case comes from the table's style; the text is
`##common.expand##`. Nothing is drawn in that heading on screen.

The arrow column of Settings › "Categories" uses its own text and reads
"Expand or collapse sub-categories".

## Cause

`lib/ui-library/src/components/Form/fields/VocabularyModal/VocabularyModal.vue`,
line 21, writes the arrow column's screen-reader-only heading as
`{{ t('common.expand') }}`. No locale file defines `common.expand`: not
pkp-lib's, not an app's, in any language, English included.

The build collects every key the components use into
`registry/uiLocaleKeysBackend.json`, and the server sends the browser a
text for each. For a key with no text it sends the key itself between
`##`, which is what the heading shows.

The line came with the window itself, in ui-library e85a63e477
("Vocabulary for autosuggest fields"). Its pkp-lib companion,
30a8910240 (`pkp/pkp-lib#11388`), added `list.expand` "Expand" and
`list.collapse` "Collapse" for the window's arrows, so the heading was
most likely meant to use one of those.

Reach: `VocabularyModal.vue` is the only use of `common.expand`
(a search of ui-library's `src`). The window opens from:

- the dashboard's "Filters" window (`PKPSubmissionFilters`; walked,
  three apps);
- the publication pages "Publication Settings" (OJS), "Catalog Entry"
  (OMP) and "Preprint entry" (OPS) (`IssueEntryForm`,
  `CatalogEntryForm`; code);
- the submission wizard's "For the Editors" step ("For Readers" on a
  preprint server; `ForTheEditors`; code), shown when Settings ›
  Workflow › Submission › Metadata has "Yes, add a categories field to
  the submission wizard." (off in the default dataset).

## Proposed fix

Recommended (a proposal; the team decides): use the key pkp-lib added
with the window for its arrows
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/select-categories-column-raw-code/fix.diff),
in `lib/ui-library`):

```diff
 							<span class="sr-only">
-								{{ t('common.expand') }}
+								{{ t('list.expand') }}
 							</span>
```

`TableCellTreeExpand.vue` uses the same two keys for an arrow's name
when its caller passes no labels, as the window does; once the U16 A11
report's fix is in, the heading and the arrows use one wording.

Tried on `main` on the three apps: the heading is now named "Expand",
the "Name" heading is unchanged, and ticking a category and the window's
"Save" still give its chip.

**Alternatives**

- Add `common.expand` to pkp-lib's locale files: a second key for the
  same word.
- `grid.action.expand` "Expand", already translated into 50 languages:
  a key of the older grids, which the newer components do not use.
- The Categories tab's "Expand or collapse sub-categories"
  (`manager.category.toggleSubcategories`): the window is a general
  vocabulary window, so a category-only text does not fit it, though
  today it serves only categories.

**What goes with it**

- `list.expand` exists in English and Hindi so far. The other languages
  get it as Weblate translates it, as for the arrows' own names.
- Guard: an end-to-end check that reads the window's column headings
  (a Planned item in spec U16).

Small: one line in ui-library, no new key.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/category-arrows-keyboard-and-names/walk.js),
  part B (it walks the U16 A11 and A18 reports' steps too). It signs in
  as `rvaca` on PKP's default dataset (pkp/datasets e8dafbc,
  2026-10-02), and reads the headings' names from Chromium's
  accessibility tree (CDP `Accessibility.getPartialAXTree`). Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/category-arrows-keyboard-and-names/walk.js`
  (`nb` as its argument runs the unchanged checks). `PROBE_FEATURE`
  names an install loaded from the default dataset. Put
  `PKP_E2E_LINE=stable-3_5_0` in front for 3.5.
- Fix trial:
  `node bin/try-fix.js apply shared/playwright/checks/issues/select-categories-column-raw-code/fix.diff ojs omp ops`
  (it rebuilds the JavaScript), the walk and `nb`, then `revert` and
  `nb` again. It ran together with the fixes of the U16 A11 and A18
  reports, which touch other files.
- Tips walked, on PostgreSQL:
  - main: OJS b84f8e2e44, OMP 3b0ecf794, OPS c8af945bb7; ui-library
    64d67363 (OJS) and 280f98c5 (OMP, OPS), the same file in both;
    pkp-lib ddd8ab243a (OJS) and 3dc90c81a6 (OMP, OPS).
  - 3.5: OJS 091fb65453, OMP 9c5e24246, OPS 38b61882d3; ui-library
    d4e01883. The Filters field has no "Select Categories" button, and
    the publication page lists the categories as tick boxes
    (`FieldOptions` in OJS's `IssueEntryForm`).
- Code reads:
  - main: `VocabularyModal.vue`; a search for `msgid "common.expand"` in
    pkp-lib's and the three apps' `locale/` (none) and for
    `msgid "list.expand"` (en, hi); the generated
    `registry/uiLocaleKeysBackend.json`, which lists `common.expand`.
  - 3.5, 3.4, 3.3: ui-library `stable-3_5_0` (d4e01883),
    `stable-3_4_0` (ee684b34) and `stable-3_3_0` (96959f9e) have no
    `VocabularyModal` and no `common.expand`.
- Introduced: `git log -S"common.expand"` on the file gives e85a63e477
  alone, the commit that created it.
- Upstream search (2026-10-02), pkp/pkp-lib and pkp/ui-library, issues
  and pull requests, open and closed: `"common.expand"`,
  `VocabularyModal`, "Select Categories accessibility". Nothing found.
- Not driven: a real screen reader; the wizard's "For the Editors" step and the
  publication pages (code only); 3.4 and 3.3.
