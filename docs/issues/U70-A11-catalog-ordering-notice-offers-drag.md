# Catalog "Order Features" notice says "Drag-and-drop", but no featured book can be dragged

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/ui-library#88` for `pkp/pkp-lib#5865` · [d0ffc05ab4](https://github.com/pkp/ui-library/commit/d0ffc05ab4ae7f06e8d2ab82f30ffb8a5ea9a7a3) · 2020-05-13 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U70 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U70-catalog-management.md#a11)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a press's Catalog page, once "Order Features" is pressed, the notice
reads "Drag-and-drop or tap the up and down buttons to change the order
of features…", but dragging a row moves nothing: no row has a drag
handle, and only the up and down arrows reorder the featured books.

Until 3.2 the rows could be dragged; a 2020 rework of the list removed
dragging and left the notice's text as it was. The proposed fix rewords
the notice to name only the arrows; it does not bring dragging back.

## Impact

- **Lost**: a moment of the editor's time; nothing is saved wrong.
- **Who**: press managers and editors who order the featured books on
  the Catalog page, for the whole catalog, a category or a series (the
  notice then ends "…in Psychology.").
- **Way round**: the up and down arrows, which the same notice names.

Low: only the wording is wrong; it would be medium if the arrows failed
too.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`. Its two published books,
  5 "Bomb Canada and Other Unkind Remarks in the American Media" (no
  series) and 14 "From Bricks to Brains: The Embodied Cognitive Science
  of LEGO Robots" (series "Psychology"), are featured nowhere, so step 3
  features both.

The whole catalog:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. In the side menu open "Content" › "Catalog"
   (`/index.php/publicknowledge/en/manageCatalog`) [3.5: "Catalog" sits
   directly in the side menu].
3. Press the "Featured" box of "Bomb Canada and Other Unkind Remarks in
   the American Media", then that of "From Bricks to Brains: The
   Embodied Cognitive Science of LEGO Robots".
4. Press "Order Features".
5. Read the notice above the rows.
6. With the mouse, press on the second row's title ("From Bricks to
   Brains: …"), drag it above the first row and let go.
7. Press the second row's up arrow.
8. Press "Cancel".

A series:

9. Press "Filters" and choose "Psychology".
10. On the row of "From Bricks to Brains: …", press the box in the
    column headed "Featured in series" (the first of its two boxes).
11. Press "Order Features" and read the notice.

**Expected.** The notice names only what the page offers, the up and
down buttons; or, if it keeps "Drag-and-drop", step 6 moves "From
Bricks to Brains: …" to the top.

**Observed.**

- Step 5: the notice reads "Drag-and-drop or tap the up and down
  buttons to change the order of features on the homepage." Each row
  shows an up and a down arrow and no drag handle.
- Step 6: nothing follows the mouse, and after letting go the rows
  still read "Bomb Canada and Other Unkind Remarks in the American
  Media", "From Bricks to Brains: …".
- Step 11: "Drag-and-drop or tap the up and down buttons to change the
  order of features in Psychology."

Control: step 7 moves "From Bricks to Brains: …" to the top at once.

## Cause

The notice is OMP's text for `submission.list.orderingFeatures` and
`submission.list.orderingFeaturesSection` in `locale/en/submission.po`,
shown by ui-library's `CatalogListPanel.vue` (`orderingDescription`)
while ordering.

`pkp/ui-library#88` (d0ffc05ab4), the 2020 backend UI refactor whose
message says it "removes support for ordering and selecting items" from
ListPanels, dropped that wrapper from `CatalogListPanel.vue` and added
`.orderer__dragDrop` to the styles hidden while ordering
(`.listPanel--catalog.-isOrdering`). Before it (3.2.1's ui-library,
19c7fea7) the rows sat in a vuedraggable
`<draggable v-model="localItems">`, enabled while ordering, whose new
order was what "Save Order" sent, and the notice was written for that.
Its text was not changed with the refactor, so it has promised a drag
since 3.3.

`CatalogListItem.vue`'s `Orderer` still renders the drag handle, since
`isDraggable` defaults to true; the handle is `aria-hidden="true"` and
the ordering styles hide it, so it reaches neither the screen nor a
screen reader.

Reach:

- The two keys are read only by `CatalogListPanel.vue`; both notices,
  whole catalog and series, were seen on screen.
- The workflow's Contributors list and the settings' Highlights list
  hide the same drag handle while ordering, but show no notice that
  mentions dragging (code).
- On `main` 26 other languages translate the two keys with the same
  promise, French (France, `fr`) among them: "Glissez-déposez ou cliquez
  sur les boutons haut et bas…". French (Canada, `fr_CA`), `ckb`, `el`
  and `vi` leave them empty, on `main` and 3.5; in French (Canada) the
  notice shows as a code, which the report on OMP's French (Canada)
  codes covers (pkp-e2e#291).
- The ui-library story `CatalogListPanel.stories.js` mocks the two keys
  with the same English text.
- OMP's `catalog.manage.homepageDescription`, `categoryDescription` and
  `seriesDescription` also say "drag and drop to order", but no code
  reads them (code).

## Proposed fix

Recommended (a proposal; the team decides): change the English text of
the two keys to name only the arrows, in OMP's `locale/en/submission.po`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/catalog-ordering-notice-drag/fix.diff)):

```diff
 msgid "submission.list.orderingFeatures"
 msgstr ""
-"Drag-and-drop or tap the up and down buttons to change the order of features "
-"on the homepage."
+"Use the up and down buttons to change the order of features on the homepage."
 
 msgid "submission.list.orderingFeaturesSection"
 msgstr ""
-"Drag-and-drop or tap the up and down buttons to change the order of features "
-"in {$title}."
+"Use the up and down buttons to change the order of features in {$title}."
```

Tried on `main`: the notice now reads "Use the up and down buttons to
change the order of features on the homepage." and "…in Psychology.",
with nothing else on the page changed. With the fix in and out alike,
the arrows still move a book, "Save Order" saves the order, and it holds
after a reload.

**Alternatives**

- Restore dragging, wrapping the rows in `VueDraggable` as
  `FieldOptions.vue` does: the list also holds the hidden rows that are
  not featured, so the drag would need its own handling of them. It
  reverses a choice the refactor made on purpose, and the arrows stay
  needed for keyboard users anyway. Medium at least, for no new ability.
- Remove the notice: it is the only place that says which list is being
  ordered ("…in Psychology."), so it should stay.

**What goes with it**

- The fix changes English only. The 26 translations that make the same
  promise are left to their translators on PKP's Weblate; until then an
  editor working in French (France), for one, still reads
  "Glissez-déposez…".
- Not in the fix: `:is-draggable="false"` on `CatalogListItem.vue`'s
  `Orderer` would drop the dead handle and its CSS rule, a cleanup the
  Contributors and Highlights lists would want too; the handle reaches
  no user today.
- The ui-library story's mock text can follow in the same change; the
  three unused `catalog.manage.*Description` keys can be removed
  separately.
- Backport: the same two strings sit in `locale/en/submission.po` on
  3.5 and 3.4, and in `locale/en_US/submission.po` on 3.3.
- Guard: an end-to-end check that presses "Order Features" and reads
  the notice.

Small: two strings in one English locale file.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/catalog-ordering-notice-drag/walk.js).
  It takes the Steps as `dbarnes` on PKP's default dataset (pkp/datasets
  566bb1f, 2026-10-03). The drag is a mouse press on the title, fifteen
  small moves up and a release. It records the notice and the row order
  after each step. Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/catalog-ordering-notice-drag/walk.js`.
- The fix was tried on `main` by applying fix.diff to a fresh dataset
  install and walking the script, then checking the arrows, "Save
  Order", a reload and the series notice with the fix in and out.
- Tips walked:
  - main: OMP 3b0ecf794c, ui-library 280f98c5.
  - 3.5: OMP 9c5e24246c, ui-library d4e01883.
- Code reads:
  - main and 3.5: the files the Cause names; the locale counts from
    `locale/*/submission.po`.
  - Introduced: d0ffc05ab4's diff removes `<draggable>` from
    `CatalogListPanel.vue` and adds `.orderer__dragDrop` to the hidden
    styles; the parent commit still has the `<draggable>` list, as does
    3.2.1's ui-library pointer (19c7fea7, not an ancestor of d0ffc05ab4's
    change). The PR was merged on 2020-06-10. The strings' blame lands on
    OMP's 2019 conversion of the locales to PO (21fae1d76) and a 2023
    rearrangement of the locale files (3bcd14e06), unchanged in
    wording.
  - 3.4 (OMP 0aec65441f, ui-library ee684b34) and 3.3 (OMP 8e72fc8836,
    ui-library 96959f9e): d0ffc05ab4 is on both ui-library branches,
    `CatalogListPanel.vue` hides `.orderer__dragDrop` and has no
    `<draggable>`, and both strings read the same (`locale/en/` on 3.4,
    `locale/en_US/` on 3.3).
- Tracker searches (pkp/pkp-lib, pkp/omp, pkp/ui-library; "drag",
  "order features", `orderingFeatures`, `CatalogListPanel`): no issue
  about this notice.
- Not driven: dragging on a touch screen; 3.4, 3.3 and 3.2 (the 3.2
  drag is read in the code only).
