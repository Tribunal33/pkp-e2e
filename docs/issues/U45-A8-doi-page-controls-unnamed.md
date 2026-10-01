# On the DOIs page, a screen reader announces the "DOI Statuses" button and every row's tick box without a name

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; no DOIs page)
- **Introduced** the tick boxes: `pkp/ui-library#165` for `pkp/pkp-lib#7014` · [6eecffda15](https://github.com/pkp/ui-library/commit/6eecffda159acb76e0278570132cbe6d08e93bc2) · 2021-12-16 · Erik Hanson (ewhanson); the button: `pkp/ui-library#250` for `pkp/pkp-lib#8309` · [b024f1f053](https://github.com/pkp/ui-library/commit/b024f1f053b732a2d5794571c07859d6fe9355dc) · 2023-01-24 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U45 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#a8)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

The round button beside "Filters" on the DOIs page shows only a "?"
icon, and no row's tick box has a label, so a screen reader announces
"button" and "checkbox" with nothing more.

A manager who cannot see the screen cannot tell that the button opens
the "DOI Statuses" legend, or which item a box ticks, except by reading
on to the item's name, which comes right after its box.

Both controls work from the keyboard, and the other controls of the
page have names. The DOIs page is there once DOIs are turned on for the
journal, press or preprint server.

## Impact

- **Lost.** The names of two controls, for anyone using a screen
  reader. Nothing is saved wrong.
- **Who.** A manager or editor who works the DOIs page without seeing
  it. The empty names were read from the browser's accessibility tree,
  which is what a screen reader is given; no screen reader was run.
- **Way round.** For a tick box, reading one step further reaches the
  item's name. The button has to be pressed to find out what it opens.

Low: two missing labels, the lowest level of the scale, and it leans
that way: the task gets done, and the two labels are added in one
repository (ui-library). A control without a name fails WCAG 4.1.2
(level A). If the team counts that as a screen that misleads its user,
which the scale puts at medium, the tick boxes are the reason, since
they are what a manager selects items with.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for the version (OJS, OMP or OPS). Nothing
  else is needed. DOIs are turned on in the dataset (Settings ›
  Distribution › "DOIs" shows it), so the side menu has "DOIs" and the
  page lists works. The journal's page shows the "Articles" tab only,
  because the dataset assigns no DOIs to issues.
- A way to read a control's accessible name: a screen reader, or the
  browser's developer tools (Chrome: inspect the control, then Elements ›
  Accessibility › "Computed Properties" › "Name").

Steps:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`) and press "DOIs" in
   the side menu (`/index.php/publicknowledge/en/dois`).
2. Move to the round "?" button beside the "Filters" heading and read
   its name.
3. Press Enter on it. The "DOI Statuses" window opens. Close it.
4. Move to the tick box at the start of the first row of the list and
   read its name. Do the same on the other rows.

**Expected.** The button has a name that says what it opens ("DOI
Statuses", the window's title). Each tick box is named after the item it
ticks.

**Observed.** The button's name is empty and so is every tick box's (8
rows on the journal, 7 on the press, 19 on the preprint server). The
browser's accessibility tree for the "Filters" heading and the first row
of the journal:

```
- heading "Filters" [level=3]
- button:
  - img
…
- listitem:
  - checkbox
  - link "Woods — Finocchiaro: Arguments About Arguments"
  - text: 19 Unpublished
  - button "Show more details about 19"
```

Control: in the same list "Bulk Actions" and each row's expand button
are named, as the last line above shows.

## Cause

Both controls are written without any text a name could come from, in
ui-library's DOI list components. A control's accessible name comes from
its text content, its `<label>`, or an `aria-label` / `aria-labelledby`
/ `title` attribute, and neither control has one.

The button, `src/components/ListPanel/doi/DoiListPanel.vue` lines 132 to
137: a `<button class="doiListPanel__statusInfoButton">` whose only
child is `<Icon icon="AnonymousReview" />`, an SVG with no text. It was
added this way with the status legend (`pkp/pkp-lib#8309`), then as
`<icon icon="question-circle" />`.

The tick box, `src/components/ListPanel/doi/DoiListItem.vue` lines 7 to
18: the `<input type="checkbox">` sits in a `<label
class="doiListItem__selectWrapper">` that holds nothing but the box. The
item's name (`item.title`: for a work its authors and title, "Woods —
Finocchiaro: Arguments About Arguments", from `getItemTitleBase()`) is
rendered outside that label, as a link in `.listPanel__itemIdentity`. It has been so since the DOIs page was
written (`pkp/pkp-lib#7014`).

Reach:

- `DoiListPanel.vue` and `DoiListItem.vue` render every list of the DOIs
  page: the journal's "Articles" tab, the press's and the preprint
  server's lists (walked), and the journal's "Issues" tab (code).
- One more tick box of the same shape, not on the DOIs page: the status
  box of each row in `src/managers/ReviewerRecommendationManager/ReviewerRecommendationManager.vue`
  (line 35, `main` only) sits in an empty `<label>` (code, not walked).
  A scan of ui-library's `.vue` templates for a button holding only an
  icon, or a tick box alone in its label, found one more button, in
  `MultilingualProgress.vue`, which is sound: it is `aria-hidden` and a
  `-screenReader` span beside it carries its text.

## Proposed fix

Recommended: give each control a visually hidden name, the way the
row's own expand button has one
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doi-page-controls-unnamed/fix.diff)):

```diff
--- a/lib/ui-library/src/components/ListPanel/doi/DoiListItem.vue
+++ b/lib/ui-library/src/components/ListPanel/doi/DoiListItem.vue
@@ -15,6 +15,7 @@
 						@click="toggleSelected"
 					/>
 				</div>
+				<span class="-screenReader">{{ item.title }}</span>
 			</label>
 
 			<!-- Item overview -->
--- a/lib/ui-library/src/components/ListPanel/doi/DoiListPanel.vue
+++ b/lib/ui-library/src/components/ListPanel/doi/DoiListPanel.vue
@@ -134,6 +134,9 @@
 								@click="openStatusInfoModal"
 							>
 								<Icon icon="AnonymousReview" class="mt-1 h-4 w-4" />
+								<span class="-screenReader">
+									{{ t('manager.dois.help.statuses.title') }}
+								</span>
 							</button>
 						</template>
 					</PkpHeader>
```

The fix sits in the two templates that own the controls, so every list
of the DOIs page is covered. It follows the pattern the code base uses
for an icon-only control: a `<span class="-screenReader">` inside it
(`Expander.vue`, `Orderer.vue`, the download button of
`SelectSubmissionFileListItem.vue`). The button's name is the title of
the window it opens, a locale key the page already loads for that
window, so no new string is needed. The box's name is `item.title`, the
text the row shows as its link: a work's authors and title, or the
issue's name on the journal's "Issues" tab.

Tried on `main` on the three apps. The button is named "DOI Statuses"
and every tick box carries its item's link text (8 of 8, 7 of 7, 19 of
19).
Neighbour check, the same with and without the fix: Enter on the button
opens "DOI Statuses"; a press on the first box ticks it and "Bulk
Actions" reads "Take action on 1 selected item(s)."; the item's link
stays outside the label; the expand button's name is unchanged; the
page's screenshot is identical byte for byte.

**Alternatives**

- `aria-labelledby` on the box, pointing at an id on the item's link:
  it names the box without adding hidden text. With the span, the
  accessibility tree holds the authors and title once more as text
  between the box and the link. Not tried; it needs an id per row and
  is not how the neighbouring controls are named.
- `aria-label` on the button and the box: not tried. The list
  components name their icon-only controls with `-screenReader` text
  (the three named above), so the fix does the same.
- A name such as "Select {title}" for the box: clearer still, but needs
  a new locale key in pkp-lib, loaded on the DOIs page of each app.

**What goes with it**

- Backport: the diff applies as written to `stable-3_5_0` (dry run on
  that branch's two files). `stable-3_4_0` needs the same two spans in
  its Vue 2 templates, with `__()` for `t()`.
- No stored data is involved, and nothing that reads the list changes:
  the box keeps its `name`, `value` and classes.
- The reviewer recommendations' status box (Reach) is left out. It is
  another screen and needs its own check on screen first.
- Guard: an e2e scenario on the DOIs page that finds the button by role
  and the name "DOI Statuses", and a row's tick box by role and the
  item's link text (a Planned item in spec U45).

Small: two added lines of template in two files of ui-library, following
an existing pattern, with no new locale key.

This is a proposal; the team decides.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doi-page-controls-unnamed/walk.js).
  It takes the Steps as `dbarnes` on PKP's default dataset
  (pkp/datasets 38ab955, 2026-09-30) and reads each name twice: from
  Chromium's accessibility tree (CDP `Accessibility.getPartialAXTree`,
  what DevTools shows) and by a role-and-name query. Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/doi-page-controls-unnamed/walk.js`
  on a dataset fleet, with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5.
- Fix trial:
  `node bin/try-fix.js apply shared/playwright/checks/issues/doi-page-controls-unnamed/fix.diff ojs omp ops`,
  the same walk, then `revert`.
- Tips walked, on PostgreSQL (the fault does not depend on the
  database):
  - main: OJS bade233f73, OMP 3b0ecf794c, OPS c8af945bb7; pkp-lib
    2e377d27fc (OJS) and 3dc90c81a6 (OMP, OPS); ui-library 280f98c570.
  - 3.5: OJS 92b9a16b48, OMP 3081c9b00d, OPS cf4fce69bd; pkp-lib
    a9c76aed62; ui-library 1a7a47504c.
- Code reads:
  - main and 3.5: `DoiListPanel.vue` lines 132 to 137 and
    `DoiListItem.vue` lines 7 to 18, identical on both branches;
    `getItemTitleBase()` in `DoiListPanel.vue` for what `item.title`
    holds.
  - 3.4: ui-library `stable-3_4_0` (ee684b341b), the same button
    (`<icon icon="question-circle" />` alone) and the same label around
    the box alone.
  - 3.3: ui-library `stable-3_3_0` (96959f9ed4) has no
    `src/components/ListPanel/doi/`; DOIs are set up in the DOI plugin's
    settings form there.
- Introduced: `git blame` on `DoiListItem.vue` lines 7 to 12 gives
  6eecffda15 (the file's first commit; the Vue 3 migration later changed
  only the box's `v-model`), and on `DoiListPanel.vue` lines 132 to 137
  gives b024f1f053 (later commits changed the click handler and the
  icon, never the missing text). `pkp/ui-library#165` is the pull
  request of the DOI refactor; GitHub lists no pull request for
  6eecffda15 itself, and #165 reads closed, not merged, so the commit
  reached the branch another way.
- Upstream search (2026-10-01), pkp/pkp-lib, pkp/ui-library and pkp/ojs,
  issues and pull requests, open and closed: "DOI screen reader", "DOI
  accessibility checkbox", "DOI aria-label", "DOI management
  accessibility", "DOI statuses button label", "DOI accessible name",
  "A11Y DOI", "A11Y unlabeled", "button without accessible name",
  `DoiListItem`, `statusInfoButton`. The open "[A11Y]" issues found are
  about the reader pages and the editorial header, none about the DOIs
  page.
- Not driven: a screen reader or voice control; the journal's "Issues"
  tab (the default dataset does not show it); 3.4; the reviewer
  recommendations list.
- Unverified: how a given screen reader words the two controls ("button"
  and "checkbox, not checked" are the roles and states the tree
  carries).
