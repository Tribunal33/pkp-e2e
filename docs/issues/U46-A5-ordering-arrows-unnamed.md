# In ordering mode, the Galleys, Funders and Data Citations arrows have no name for a screen reader

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OPS (the Galleys list; no Funders or Data Citations tables)
  - 3.4: none (code; galleys are ordered by dragging rows in the older list)
  - 3.3: none (code; the same older list)
- **Introduced** the unnamed buttons: `pkp/ui-library#412` (no linked issue) · [f77229c3bf](https://github.com/pkp/ui-library/commit/f77229c3bf383292c840fe98c77dba66cac6402b) · 2024-09-19 · Jarda Kotěšovec (jardakotesovec); moved unchanged into the shared cell the Funders and Data Citations tables now use: `pkp/ui-library#740` for `pkp/pkp-lib#12027` · [9c2becb7e6](https://github.com/pkp/ui-library/commit/9c2becb7e6f0e658e30aa6502450cb66eec10be4) · 2025-11-17 · the same author
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U46 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U46-galleys.md#a5) · spec U42 [A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U42-citations-and-references.md#a19) · spec U43 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U43-funding.md#a5) (its ordering arrows only)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

In ordering mode each galley row shows an up and a down arrow that carry
no text and no label, so a screen reader announces two unnamed buttons
per row, with nothing to say which galley they move or in which
direction. The Funders table and the Data Citations table of a
submission's publication pages have the same arrows. The Contributors
list's arrows read "Increase position of {name}" and "Decrease position
of {name}".

A screen reader user who orders galleys, funders or data citations
reaches buttons that move the rows but say nothing, so has to guess
which one moves a row up and read the table again after each press.
Nothing is saved wrong.

The arrows appear once "Order" is pressed, for anyone who may edit the
publication. On a press only the Funders and Data Citations tables have
them, since a press has no galleys. A new journal, press or preprint
server has the Funders table on and the Data Citations table off until a
manager enables it. The Funders and Data Citations tables of the
submission wizard's Details step carry the same arrows.

## Impact

- **Lost**: the names of two buttons per row, for anyone using a screen
  reader.
- **Who**: editors and managers (on a preprint server, also the author
  of a not yet posted preprint, and authors in the wizard) who order
  galleys, funders or data citations without seeing the screen.
- **Way round**: the first button of a row moves it up, the second down;
  after a press the table's new order can be read. Nobody is told this.
  A wrong press is undone with the other arrow: the order is stored only
  on "Save Order", and leaving the page without it keeps the old order.

Low: the task gets done. Every row's two arrows sit in the same order,
up then down, and the table can be re-read and corrected before "Save
Order", so a screen reader user can order the rows and check them. A
control without a name fails WCAG 4.1.2 (level A). It would be medium if
the arrows could not be told apart at all, or a wrong press were saved
at once.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS). Funders are
  on in the dataset ("Ask the author for funder metadata during
  submission."); Data Citations are off, so step 2 turns them on.
- A way to read a control's accessible name: a screen reader, or the
  browser's developer tools (Chrome: inspect the control, then Elements ›
  Accessibility › "Computed Properties" › "Name").

Setup:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. Open "Settings" › "Workflow" › "Submission" › "Metadata", tick
   "Enable data citation metadata" and press "Save".

The Galleys list (OJS, OPS; a press has no galleys):

3. Open submission 1 from "Submissions" ("Signalling Theory Dividends"
   on OJS, "The influence of lactation on the quantity and quality of
   cashmere production" on OPS;
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=1`).
   The workflow opens on the latest version.
4. In the side menu under "Publication" ("Preprint" on OPS), choose
   "Galleys".
5. Press "Order".
6. Read the names of the two arrows on the row ("PDF Version 2" on OJS,
   "PDF" on OPS).

The Funders table (on OMP, submission 4, "How Canadians Communicate:
Contexts of Canadian Popular Culture"; submission 1 on OJS and OPS):

7. In the side menu choose "Funding". Press "Add Funder", type
   "u46w3 Funder A" in the Funder box, choose the typed text from the
   list under it, and press "Save".
8. Add "u46w3 Funder & Trust B" the same way.
9. Press "Order" and read the names of each row's arrows.

The Data Citations table (same submissions):

10. In the side menu choose "Data". Press "Add Data Citation", type
    "u46w3 Dataset A" as the Title, choose "Supporting data without
    specifying whether they were generated or analyzed (supporting)." as
    the Relationship type, and press "Save".
11. Add "u46w3 Dataset B" the same way.
12. Press "Order" and read the names of each row's arrows.

The control:

13. In the side menu choose "Contributors", press "Order", and read the
    names of the first row's arrows.

**Expected.** Each arrow is a button whose name says what it does and to
which row, as the Contributors list's do: "Increase position of u46w3
Funder A" and "Decrease position of u46w3 Funder A".

**Observed.** The same on the three apps, wherever the list exists:

- Step 6: the row's two arrows are buttons with an empty name. Each
  holds only the arrow's picture:
  ```html
  <button class="inline-flex items-center justify-center rounded text-primary hover:bg-primary hover:text-on-dark"><span class="inline-block align-middle rtl:scale-x-[-1] h-6 w-6"><svg viewBox="0 0 24 24" …>…</svg></span></button>
  ```
- Steps 9 and 12: four buttons, two per row, each with an empty name.
- Step 13 (the control): "Increase position of Alan Mwandenga Version 2"
  and "Decrease position of Alan Mwandenga Version 2" on OJS, "… of Bart
  Beaty" on OMP, "… of Carlo Corino" on OPS.

## Cause

The three lists draw their arrows with one shared ui-library component,
`lib/ui-library/src/components/Table/TableCellOrder.vue`: two `<button>`s
holding only an `Icon` (`ChevronUp`, `ChevronDown`), with no text, no
`aria-label` and no prop through which a caller could pass the row's
name. The SVG has no title, so the accessible name is empty.

The buttons were first written that way in `TableRowSortControls.vue`
for the rebuilt Galleys list (f77229c3bf). 9c2becb7e6 moved them,
unchanged, into the shared `TableCellOrder` beside the new `useOrdering`
composable, and the Data
Citations table (`pkp/pkp-lib#6278`) and the Funders table
(`pkp/pkp-lib#12392`) then reused it. The older `Orderer.vue`, which the
Contributors list still uses, has always carried a hidden text per
button: `t('common.orderUp', {itemTitle})`, "Increase position of
{$itemTitle}".

Reach (every user of `TableCellOrder`):

- `GalleyManagerCellActions.vue`: the publication's Galleys page (walked,
  OJS and OPS).
- `FunderManagerCellActions.vue`: the publication's Funding page (walked,
  three apps) and the wizard's Details step "Funders" section (code).
- `DataCitationManagerCellActions.vue`: the publication's Data page
  (walked, three apps) and the wizard's Details step data citations
  section (code).
- The `useOrdering.mdx` documentation example.

Every other ordering control in ui-library (`Orderer.vue`: Contributors,
Highlights, the catalog, a form's option lists) has its names.

## Proposed fix

Recommended (a proposal; the team decides): give `TableCellOrder` a
required `itemTitle` prop and a hidden text per button built from the
existing keys, as `Orderer.vue` does, and pass each row's name from the
three callers
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ordering-arrows-unnamed/fix.diff),
in `lib/ui-library`; an excerpt of `TableCellOrder.vue`):

```diff
 				<Icon class="h-6 w-6" icon="ChevronUp"></Icon>
+				<span class="sr-only">
+					{{ t('common.orderUp', {itemTitle}) }}
+				</span>
…
 				<Icon class="h-6 w-6" icon="ChevronDown"></Icon>
+				<span class="sr-only">
+					{{ t('common.orderDown', {itemTitle}) }}
+				</span>
…
+import {useLocalize} from '@/composables/useLocalize';
+
+defineProps({
+	itemTitle: {type: String, required: true},
+});
…
+const {t} = useLocalize();
```

The callers pass `galley.label`, `dataCitation.title` and
`localize(funder.name)` (the Funders caller takes `localize` from
`useLocalize()` beside `t`), the text each row shows; the
`useOrdering.mdx` example passes `item.title`. The keys are in pkp-lib's
`common.po` in most languages; six (dsb, hsb, lol, se, sk, tl) lack them,
as they do for the Contributors list today. They already reach every
backend page through `registry/uiLocaleKeysBackend.json`, which the
JavaScript build writes from the `t()` calls and which lists them now
for `Orderer.vue`, so no key is added. The hidden text uses Tailwind's
`sr-only`, as `TableCellTreeExpand.vue` beside it does; `Orderer.vue`'s
`-screenReader` is the older LESS class with the same effect.

Tried on `main` on the three apps: every arrow now has its name
("Increase position of PDF Version 2", "Decrease position of u46w3
Funder & Trust B", "Increase position of u46w3 Dataset A"), and the "&"
is not escaped twice. With the fix in and out alike, the arrows still move rows, leaving
without "Save Order" keeps the earlier order, the rows' "More Actions"
keep their name, and the Contributors arrows keep theirs.

**Alternatives**

- A fixed `aria-label` ("Move up", "Move down") without the row's name:
  shorter, but a screen reader user moving through the buttons alone
  would not hear which row each one moves, which the Contributors list
  tells them.
- Pass a whole label from each caller: three callers would build the
  same string; the component owning the wording keeps them alike.

**What goes with it**

- `itemTitle` is required, so a future caller that forgets it gets
  Vue's missing-prop warning in development.
- 3.5 carries the same `TableCellOrder.vue` and `GalleyManagerCellActions.vue`
  (only the Galleys list uses it there), so the change applies there as
  written, without the Funders and Data Citations parts.
- Guard: an end-to-end check that presses "Order" and reads the arrows'
  names (a Planned item in specs U46, U42 and U43).

Small: five files in ui-library, following `Orderer.vue`: the shared
component, one line in each of the three callers (and the Funders
caller's `localize`), and the `useOrdering.mdx` example; no data or API
change.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ordering-arrows-unnamed/walk.js).
  It takes the Steps as `dbarnes` on PKP's default dataset (pkp/datasets
  e8dafbc, 2026-10-02) and reads each button's name from Chromium's
  accessibility tree (CDP `Accessibility.getPartialAXTree`). The Funder
  box's registry search (api.ror.org) is answered with an empty list, so
  the box offers only the typed name, as when the registry knows no such
  funder. No screen reader was run. Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/ordering-arrows-unnamed/walk.js`.
  The neighbour check, run with the argument `nb` right after the Steps,
  checks what the fix must leave alone.
- Tips walked, on PostgreSQL (the fault does not depend on the database):
  - main: OJS b84f8e2e44, OMP 3b0ecf794, OPS c8af945bb7; ui-library
    64d67363 (OJS) and 280f98c5 (OMP, OPS); fix.diff's four `.vue` files
    are identical in both.
  - 3.5: OJS 091fb65453, OMP 9c5e24246, OPS 38b61882d3; ui-library
    d4e01883.
- Code reads:
  - main: blame on `TableCellOrder.vue` lands on 9c2becb7e6, a move; at
    its parent the buttons are `GalleyManager/TableRowSortControls.vue`'s
    from f77229c3bf, unnamed from the first version.
  - 3.5: `TableCellOrder.vue` and `GalleyManagerCellActions.vue` are
    identical on 3.5 and main (the backport of 9c2becb7e6 is 3f8c45c6);
    the Funders and Data Citations files do not exist there.
  - 3.4 (ee684b34), 3.3 (96959f9e): the galley lists are pkp-lib's
    `ArticleGalleyGridHandler` with `OrderGridItemsFeature` (jQuery UI
    sortable).
- `pkp/pkp-lib#12664` (open) is about ordering the Components list from
  the keyboard, another list and another fault.
- Fix trial: `node bin/try-fix.js apply shared/playwright/checks/issues/ordering-arrows-unnamed/fix.diff ojs omp ops`
  (rebuilds ui-library), a fresh dataset, the script, then the neighbour
  check; the neighbour check again after `revert`.
- Unverified: the arrows were pressed with the mouse; that Enter and
  Space press them was not walked (they are plain `<button>`s).
- Not driven: a real screen reader; the wizard's Funders and Data
  Citations sections (code only); 3.4 and 3.3.
