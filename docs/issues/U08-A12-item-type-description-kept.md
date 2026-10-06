# In the menu item window, a chosen type's description replaces the "Navigation Menu Type" heading and stays after "Choose a type..."

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** by two pkp-lib changes:
  - the heading replaced: `pkp/pkp-lib#2813` for `pkp/pkp-lib#2178` · [3f081e4221](https://github.com/pkp/pkp-lib/commit/3f081e4221eacd949be3c56ed3190f30335bb09c) · 2017-09-29 · Dimitris Efstathiou (defstat)
  - the text kept after "Choose a type...": [fd217a29a0](https://github.com/pkp/pkp-lib/commit/fd217a29a044aee74b265f517901fb7204fa8376) for `pkp/pkp-lib#3288` · 2018-01-18 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U08 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U08-navigation-menus-and-site-chrome.md#a12)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

In the "Add item" or "Edit" window of Settings › Website › "Navigation",
choosing a type in "Navigation Menu Type" shows that type's description
twice. It appears in the line under the list, as expected, and also in
place of the heading "Navigation Menu Type" above the list. An item's
"Edit" window opens with the heading already replaced.

Setting the list back to "Choose a type..." changes neither text. The
heading should read "Navigation Menu Type" again, and the line "Select a
Navigation Menu Type or Custom to make your own". Instead both go on
describing the type chosen before.

The name a screen reader gives the list is built from both texts, so
once a type is chosen the list is named by the description twice, never
"Navigation Menu Type". Nothing
is saved wrong: the list shows the chosen type, and "Save" with "Choose
a type..." is refused.

## Impact

- **Lost.** The list's name, on screen and for a screen reader, whenever
  a type is chosen; and the right guidance under the list after "Choose
  a type...".
- **Who.** Journal, press and server managers adding or editing a menu
  item, every time a type is chosen.
- **Way round.** The list itself shows the chosen type. Closing "Add
  item" and opening it again brings back the heading and the first
  guidance line.

Low: the list's name and its guidance read wrong while every outcome is
right. It would be medium if the team rates a form control whose
accessible name is lost (WCAG 4.1.2 Name, Role, Value) at that level.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS, OMP or OPS, context
  `publicknowledge`.

Steps:

1. Sign in as `rvaca` (the journal manager; on OMP the press manager, on
   OPS the preprint server manager).
2. Open Settings › Website, tab "Setup", side tab "Navigation"
   (`/index.php/publicknowledge/en/management/settings/website#setup/navigationMenus`).
3. Under "Navigation Menu Items" press "Add item". The "Add item" window
   opens. Above the list is the heading "Navigation Menu Type", the list
   shows "Choose a type...", and the line under it reads "Select a
   Navigation Menu Type or Custom to make your own" with a red "*".
4. In "Navigation Menu Type" choose "Announcements".
5. In "Navigation Menu Type" choose "Choose a type..." again.

**Expected.** After step 4 the heading still reads "Navigation Menu
Type", and the line under the list reads "Link to the page displaying
your announcements.". After step 5 the line reads "Select a Navigation
Menu Type or Custom to make your own" again, as in step 3.

**Observed.** After step 4 the heading and the line both read the
description, and the red "*" is gone:

```
Link to the page displaying your announcements.
[Announcements ▾]
Link to the page displaying your announcements.
```

After step 5 only the list changes:

```
Link to the page displaying your announcements.
[Choose a type... ▾]
Link to the page displaying your announcements.
```

The list's accessible name is built from both texts. After step 5 it
is "Link to the page displaying your announcements. Link to the page
displaying your announcements.", where the labels of step 3 give
"Navigation Menu Type Select a Navigation Menu Type or Custom to make
your own*". Choosing a type sends no request, and no script error shows
in the browser.

## Cause

`NavigationMenuItemsFormHandler.prototype.setType()`
(`lib/pkp/js/controllers/grid/navigationMenus/form/NavigationMenuItemsFormHandler.js`,
lines 114–132 on `main`) runs on every change of the list and once when
the window opens. It does two things wrong:

```js
		var itemType = $('#menuItemType', this.getHtmlElement()).val(),
				$descriptionEl = $('#menuItemTypeSection [for="menuItemType"]');
		…
		if (typeof this.itemTypeDescriptions_[itemType] !== 'undefined') {
			$descriptionEl.text(this.itemTypeDescriptions_[itemType]);
		}
```

First, the selector matches two labels, not one. In
`navigationMenuItemsForm.tpl` the section is
`{fbvFormSection id="menuItemTypeSection" title="…navigationMenuItemType" for="menuItemType"}`,
so its heading renders as `<label for="menuItemType">Navigation Menu
Type</label>`. The select's own label, the line under the list,
renders as a second `<label class="sub_label" for="menuItemType">`
inside the select's wrapper, ending in `<span class="req">*</span>`.
`.text()` overwrites both labels and drops that span. Both labels
belong to the list, so the browser builds the list's accessible name
from the two texts. When `setType()` was written in `pkp/pkp-lib#2178`,
the section's `for` was `area_name`. A later commit in the same pull
request, 3f081e4221, changed it to `menuItemType`, and from then on the
heading matched too.

Second, the line is written only when the chosen value has a
description, and nothing restores the original text.
`PKPNavigationMenuItemsForm::fetch()` builds the descriptions from
`getMenuItemTypes()` alone, while the titles start with
`0 => __('grid.navigationMenus.navigationMenu.selectType')`. That
"Choose a type..." entry, value `0`, was added by fd217a29a0
(`pkp/pkp-lib#3288`, so that "Custom Page" is no longer the default),
with no description, and `setType()` was not changed then. So choosing
it leaves whatever text the last type wrote. Before that commit every
option had a description, and the list could not go back to "no type".

Reach:

- An item's "Edit" window: `setType()` runs when the window opens.
  Checked on screen ("Contact", three apps).
- The same mistake elsewhere: no other script in pkp-lib's `js/`, or in
  the OJS, OMP or OPS `js/` folders, writes into a `[for=…]` label. OMP's
  "Series" and "Category" types use the same handler. Checked in the code.
- The menu window ("Add Menu", a menu's "Edit") is a Vue component on
  `main` and does not use this handler.

## Proposed fix

Write only into the select's own label, keep its "*" after a
description, and put its original text back when the chosen value has
no description. This is a proposal:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/item-type-description-kept/fix.diff),
one file in pkp-lib that covers the three apps.

```diff
+		// The list's own message, shown again whenever no type is chosen, and
+		// its "required" mark, kept after a type's description
+		$typeMessage = this.getTypeMessageElement_();
+		this.typeMessage_ = $typeMessage.html();
+		this.requiredMark_ = $typeMessage.children('.req').prop('outerHTML') || '';
…
 		var itemType = $('#menuItemType', this.getHtmlElement()).val(),
-				$descriptionEl = $('#menuItemTypeSection [for="menuItemType"]');
+				$descriptionEl = this.getTypeMessageElement_();
…
 		if (typeof this.itemTypeDescriptions_[itemType] !== 'undefined') {
-			$descriptionEl.text(this.itemTypeDescriptions_[itemType]);
+			$descriptionEl.text(this.itemTypeDescriptions_[itemType])
+					.append(this.requiredMark_);
+		} else {
+			$descriptionEl.html(/** @type {string} */ (this.typeMessage_));
 		}
 	};
+
+	prototype.getTypeMessageElement_ = function() {
+		return $('#menuItemType', this.getHtmlElement()).parent()
+				.find('label[for="menuItemType"]');
+	};
```

The message and its mark are read from the window before the first
`setType()`, so they carry the template's own translated text. The new
lookup is scoped to the form, as the handler's other lookups are; the
old one searched the whole page. The heading keeps "Navigation Menu
Type", so the list's accessible name starts with it again.

Tried on `main`, OJS, OMP and OPS. With the fix, step 4 keeps the heading
"Navigation Menu Type" and shows "Link to the page displaying your
announcements.*" under the list. Step 5 brings back "Select a Navigation
Menu Type or Custom to make your own*", and the list's accessible name
is "Navigation Menu Type Select a Navigation Menu Type or Custom to make
your own*". As a check on the path the fix must leave alone, an item's
"Edit" ("Contact") opens headed "Navigation Menu Type" with its own
description and "*" under the list. Choosing "Remote URL" there still
shows the "URL" box, and the list is named "Navigation Menu Type Link to
any URL on another site, like https://pkp.sfu.ca.*".

**Alternatives**

- Give "Choose a type..." a description in
  `PKPNavigationMenuItemsForm::fetch()` (`0 =>
  __('manager.navigationMenus.form.navigationMenuItemTypeMessage')`), as
  the titles already have an entry for it. That fixes step 5 without the
  stored message, but the selector still needs its fix in the script,
  so the rule would live half in PHP and half in JavaScript.
- Drop `for="menuItemType"` from the section in the template. That frees
  the heading, but the heading then no longer names the list, and the
  line still keeps its text after "Choose a type...".
- Rewrite the item window in Vue, as the menu window was
  (`pkp/pkp-lib#12177`) and as `pkp/pkp-lib#12826` plans for grid code.
  That is a larger change, and no planned work covers this window yet.

**What goes with it**

- `js/pkp.min.js` is committed in the OJS, OMP and OPS repos. Installs
  that set `enable_minified = On` serve it, so each app needs it rebuilt
  after the pkp-lib change, as the apps' regular "Update pkp.min.js"
  commits do.
- The diff's paths start at the app root (`a/lib/pkp/js/…`): in a
  pkp-lib clone it applies with `git apply -p3`.
- Backport: the diff applies as it stands to `stable-3_5_0`,
  `stable-3_4_0` and `stable-3_3_0`, where `setType()` and the template
  read the same (dry run).
- Guard: a Planned item in spec U08 (its scenario 5 already marks A12)
  that reads the heading, the line and the list's accessible name after
  a type is chosen and after "Choose a type...".

Small: a few lines in one pkp-lib script, tried on all three apps, with
no stored data involved.

## Evidence

- A Playwright script that runs the Steps on installs loaded from PKP's
  default test dataset, all three apps in one run:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/item-type-description-kept/walk.js),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/item-type-description-kept/walk.js`.
  At each step it records every label of the "Navigation Menu Type"
  section, the section's text and the chosen option, and at the end the
  window's accessibility tree. `neighbour` as the script's argument runs
  the check on the "Edit" window alone: `rvaca` opens "Contact"'s "Edit",
  then chooses "Remote URL".
- The accessible names quoted in Observed are Chromium's, read from
  Playwright's accessibility snapshot of the window. A screen reader was
  not run.
- The fix, tried 2026-10-03 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/item-type-description-kept/fix.diff ojs omp ops`,
  then walk.js and walk.js `neighbour`, then `revert` and walk.js
  `neighbour` again. The installs ran with `enable_minified = Off`, so
  they served the unbuilt script.
- `lib/pkp/tools/buildjs.sh -n`, run once on a copy of the OJS `main`
  scripts with and without the fix (jslint4java and the app's Closure
  compiler): the Closure check reports nothing either way. jslint reports
  the same 124 warnings either way, among them the existing `typeof` line
  of `setType()`, so on `main` the script stops before minifying with or
  without the fix. The rebuilt `pkp.min.js` was not tried.
- Walked 2026-10-03 on PostgreSQL (the fault is in the browser's script;
  the database plays no part), each install freshly loaded from
  pkp/datasets
  [e8dafbc](https://github.com/pkp/datasets/commit/e8dafbcf0a61c21a3653dd24d9a1282f36762d12) (2026-10-02):
  - main: OJS b84f8e2e44 (lib/pkp ddd8ab243a), OMP 3b0ecf794c (lib/pkp
    3dc90c81a6), OPS c8af945bb7 (lib/pkp 3dc90c81a6). The handler file
    is the same in the three.
  - stable-3_5_0: OJS 091fb65453, OMP 9c5e24246c, OPS 38b61882d3
    (lib/pkp cf3f984335 in each). Same result on the three apps.
    `setType()` and the template read as on `main` (the file lacks only
    `main`'s query-parameter lines).
- 3.4, by code: OJS `stable-3_4_0` at c1827e3527, OMP at 0aec65441f, OPS
  at acd8ae704b, pkp-lib `stable-3_4_0` at 9e41f10273. The same
  `setType()`, the same section `for="menuItemType"` in
  `navigationMenuItemsForm.tpl`, the same `0 =>` "Choose a type..." entry
  in `PKPNavigationMenuItemsForm::fetch()`, and the same `formSection.tpl`
  and `select.tpl` label markup.
- 3.3, by code: OJS `stable-3_3_0` at ac77c9fb35, OMP at 8e72fc8836, OPS
  at c5532e2161, pkp-lib `stable-3_3_0` at ac3fa73402. The same
  `setType()`, template and form-builder label markup;
  `controllers/grid/navigationMenus/form/PKPNavigationMenuItemsForm.inc.php`
  has the same `array(0 => …selectType)` at line 79.
- Introduced: `git blame -w` on `setType()` gives 7f8282b139 (Nate
  Wright, 2017-09-28) for the selector and the `if`, in
  `pkp/pkp-lib#2813` (defstat). Plain `git blame` gives e9baf48a4e
  ("pkp/pkp-lib#2178 Test Fixes") for the selector line, which only
  re-indented it. `git log -S'for="menuItemType"'` on the template gives
  3f081e4221 in the same pull request. `git log -S'selectType'` on the
  form gives fd217a29a0, a direct commit with no pull request
  (`commits/<sha>/pulls` is empty).
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library
  searched 2026-10-03 for "navigation menu type description", "Choose a
  type", "navigation menu item type label", "Navigation Menu Type",
  `NavigationMenuItemsFormHandler` and `setType`. Only
  `pkp/pkp-lib#12826` names the file, in a list of grid code to remove.
