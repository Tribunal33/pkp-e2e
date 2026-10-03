# Closing a menu item window with nothing typed asks about unsaved changes, and so does leaving the page

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#2813` for `pkp/pkp-lib#2178` · [b7100c2a44](https://github.com/pkp/pkp-lib/commit/b7100c2a44a309a6de465a2a224d5d4900653054) · 2017-06-14 · Dimitris Efstathiou (defstat)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U08 [A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U08-navigation-menus-and-site-chrome.md#a18)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

A manager opens "Add item" or an item's "Edit" on Settings › Website ›
"Navigation", types nothing, and closes the window with its back arrow.
The browser asks "The data on this form has changed. Do you wish to
continue without saving?", though nothing changed. Escape and a click
beside the window close it the same way, so they ask too; the window
has no "Cancel".

While the window is open, it covers the page, so the manager can leave
only through the browser: typing an address, reloading or going back.
Each of these raises the browser's "Leave site?" question.

Answering "OK" closes the window or leaves the page, and nothing stored
is lost. But the manager is asked to confirm losing changes they never
made, every time they look at an item.

## Impact

- **Lost.** No stored data. The cost is one extra answer for each window
  closed, and a warning that no longer tells a real change from none.
- **Who.** Journal, press and server managers, each time they open an
  item window and close it unchanged. The site administrator meets it
  too, on the site's own "Navigation" tab.
- **Way round.** Answer "OK".

Low: a needless question, while every outcome is right.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS, OMP or OPS, context
  `publicknowledge`.

Steps:

1. Sign in as `rvaca` (the journal manager; on OMP the press manager, on
   OPS the preprint server manager).
2. Open Settings › Website, tab "Setup", side tab "Navigation"
   (`/index.php/publicknowledge/en/management/settings/website#setup/navigationMenus`).
3. Under "Navigation Menu Items" press "Add item". Type nothing.
4. Press the back arrow at the window's top ("Close").
5. Answer the box "Cancel", press the back arrow again, and answer "OK".
6. Open the row arrow of "Contact", then "Edit". Type nothing. Press the
   back arrow, and answer the box "OK".
7. Press "Add item" again. Type nothing. Type the address of Settings ›
   "Workflow"
   (`/index.php/publicknowledge/en/management/settings/workflow`) in the
   browser's address bar and press Enter.

**Expected.** Steps 4 and 6 close the window at once, with no question.
Step 7 opens the Workflow settings with no question.

**Observed.** Step 4 opens the browser's box:

```
The data on this form has changed. Do you wish to continue without saving?
```

"Cancel" keeps the window, "OK" closes it (step 5). Step 6 opens the same
box. Step 7 raises the browser's leave question ("Leave site? Changes you
made may not be saved." in Chrome) before the Workflow settings open.

With no window open, the same address opens the Workflow settings with
no question. No request fails and no script error shows in the browser.

## Cause

The window's form handler marks its own form as changed while it opens.
`NavigationMenuItemsFormHandler`
(`lib/pkp/js/controllers/grid/navigationMenus/form/NavigationMenuItemsFormHandler.js`,
lines 40–41 on `main`) sets up the type-dependent boxes by sending the
list a `change` event:

```js
		$('#menuItemType', $formElement).change(this.callbackWrapper(this.setType));
		$('#menuItemType', $formElement).trigger('change');
```

This runs after `this.parent()`, where the base
`$.pkp.controllers.form.FormHandler` has already bound
`$(':input', $form).change(this.callbackWrapper(this.formChange))`.
`FormHandler.formChange()` cannot tell the sent event from a person's
choice. It sets `formChangesTracked` and sends `formChanged`. On
`formChanged`, `SiteHandler.registerUnsavedFormElement_()` adds the form
to the page's list of unsaved forms.

From then on, `FormHandler.containerCloseHandler()` confirms every close
with `form.dataHasChanged`. Every way of closing reaches it: the side
window's close callback (`AjaxModalWrapper.vue`) sends `containerClose`
to the form for the back arrow, Escape and a click beside the window
(`SideModal.vue`, `handleClose()`). While the window is open,
`SiteHandler.pageUnloadHandler_()` answers `beforeunload` with the same
text. Closing with "OK" sends `unregisterAllForms`, which is why the
page is left quietly once the window is closed.

The form has asked on an untouched close since the item window was built
in `pkp/pkp-lib#2813`. Its first handler sent `change` to a box of the
form from the constructor so that the box's handler would run once, and
the boxes changed over the pull request while the trigger stayed (see
Evidence). Today's line only wants the type's boxes shown when the
window opens, so that an item's "Edit" opens with its type's fields.

Reach:

- The site administrator's own "Navigation" tab (Administration › "Site
  Settings", shown once a site holds more than one context) opens the
  same window and handler. Checked in the code.
- The menu window ("Add Menu", a menu's "Edit") is a Vue form on `main`
  and asks only after a change. On 3.5 and older it is the legacy
  `NavigationMenuFormHandler`, which sends no `change` while it opens.
  Checked in the code.
- The same mistake elsewhere, read in the code and not walked:
  "Assign Participant" may ask on an untouched close too. Its user
  search filter starts `AddParticipantFormHandler`, whose
  `addUserGroupId()` sets the hidden `userGroupId` and sends it
  `change`. The selector is page-wide (`$('input[name=\'userGroupId\']')`),
  so it also reaches the hidden `userGroupId` inside the window's own
  `#addParticipantForm`. This fix leaves it out. No other script in
  pkp-lib's `js/` or the apps' `js/` folders sends `change` from a form
  handler's constructor.

## Proposed fix

Call the type handler directly instead of sending a `change` event. This
is a proposal:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/item-window-asks-with-nothing-typed/fix.diff),
one line in pkp-lib that covers the three apps.

```diff
 		$('#menuItemType', $formElement).change(this.callbackWrapper(this.setType));
-		$('#menuItemType', $formElement).trigger('change');
+		// Set up the chosen type's fields directly: a triggered `change` would
+		// reach FormHandler.formChange() and mark the untouched form as changed.
+		this.setType();
```

A direct call runs the same code at the same moment. `setType()` needs
only what is ready by then: the form's elements, its two page-wide
lookups (`$('#' + itemType)` and the type's label) and
`this.itemTypeDescriptions_`, set just before. Only the change tracking
no longer hears it.

Tried on `main`, OJS, OMP and OPS. With the fix, steps 4 and 6 close the
window at once with no box, and step 7 opens the Workflow settings with
no question. As a check on what the fix must leave alone, a title typed
in "Add item" still brings the box on the back arrow. "Contact"'s "Edit"
still opens with its "Query Parameters" box shown, so the type handler
ran. Choosing another type there still raises the leave question when
the page is left.

**Alternatives**

- Make `FormHandler.formChange()` ignore events with no
  `originalEvent`. Scripts report real changes that way: hidden fields
  set by script and sent `change` (`AddParticipantFormHandler`'s
  `userIdSelected`, set when a user is picked), and the listbuilders'
  own `formChange` event (`ListbuilderHandler.js`), which also reaches
  `formChange()`. Those would be silenced.
- Reset `formChangesTracked` and send `unregisterChangedForm` after the
  trigger. That undoes the mark instead of not making it, and would also
  hide a change made before the handler starts.

**What goes with it**

- `js/pkp.min.js` is committed in the OJS, OMP and OPS repos. Installs
  that set `enable_minified = On` serve it, so each app needs it rebuilt
  after the pkp-lib change.
- The diff's paths start at the app root (`a/lib/pkp/js/…`): in a
  pkp-lib clone it applies with `git apply -p3`.
- Backport: the two lines read the same on `stable-3_5_0`,
  `stable-3_4_0` and `stable-3_3_0`, so the diff applies there as it
  stands (only its line numbers differ).
- Guard: a Planned item in spec U08 that opens "Add item" and an item's
  "Edit", closes each untouched, and expects no question.

Small: one line in one pkp-lib script, tried on all three apps.

## Evidence

- A Playwright script that runs the Steps on installs loaded from PKP's
  default test dataset, all three apps in one run:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/item-window-asks-with-nothing-typed/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/item-window-asks-with-nothing-typed/lib.js)),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/item-window-asks-with-nothing-typed/walk.js`.
  It records each browser box with its words and the answer given, and
  whether the window closed. It was also run with four seconds before
  each action (`PACE_MS=4000`), with the same result. `nb` as the
  argument runs only the checks on what the fix must leave alone (the
  last paragraph of the fix's trial above).
- Step 7 is a typed address because the open window covers the side
  menu. Reloading and going back were not walked; the browser sends
  `beforeunload` for them as for a typed address. Escape and a click
  beside the window were not walked; they reach the same close callback
  (Cause).
- The fix, tried 2026-10-03 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/item-window-asks-with-nothing-typed/fix.diff ojs omp ops`,
  then walk.js and walk.js `nb`, then `revert` and walk.js `nb` again,
  which showed the same as with the fix. The installs ran with
  `enable_minified = Off`, so they served the unbuilt script; the
  rebuilt `pkp.min.js` was not tried.
- Walked 2026-10-03 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [e8dafbc](https://github.com/pkp/datasets/commit/e8dafbcf0a61c21a3653dd24d9a1282f36762d12) (2026-10-02):
  - main: OJS b84f8e2e44 (lib/pkp ddd8ab243a), OMP 3b0ecf794c (lib/pkp
    3dc90c81a6), OPS c8af945bb7 (lib/pkp 3dc90c81a6). The handler,
    `FormHandler.js` and `SiteHandler.js` are the same in the three.
  - stable-3_5_0: OJS 091fb65453, OMP 9c5e24246c, OPS 38b61882d3
    (lib/pkp cf3f984335 in each). Same result on the three apps; the
    trigger is line 38 there.
- 3.4, by code: OJS `stable-3_4_0` at c1827e3527, OMP at 0aec65441f, OPS
  at acd8ae704b, pkp-lib `stable-3_4_0` at 9e41f10273. The same trigger
  at line 38 after `this.parent()`, the same `formChange()`,
  `containerCloseHandler()` and `SiteHandler` registration.
- 3.3, by code: OJS `stable-3_3_0` at ac77c9fb35, OMP at 8e72fc8836, OPS
  at c5532e2161, pkp-lib `stable-3_3_0` at ac3fa73402. The same as 3.4.
- Introduced, every commit in `pkp/pkp-lib#2813` (`commits/<sha>/pulls`)
  that sent `change` from the handler's constructor after `this.parent()`:
  - b7100c2a44 (2017-06-14, defstat): `$("#navigationMenuId").trigger("change")`,
    the form's menu list. The first that made the form ask; it already
    had `containerCloseHandler()`. Removed in 897b1f3658 (2017-07-06).
  - f9645b3886 (2017-07-29, defstat): `$('#useCustomUrl').trigger("change")`,
    a checkbox of the form. From here on the form asked without a break.
  - 6c10dafac7 (2017-08-03, defstat): `$('#type').trigger("change")`,
    the type list; today's line descends from it. 84a9fdecef (2017-09-28)
    removed the `#useCustomUrl` trigger.
  - 7f8282b139 (2017-09-28, Nate Wright): renamed `#type` to
    `#menuItemType`; `git blame` on line 41 gives this commit.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library
  searched 2026-10-03 for the box's words, "continue without saving",
  "navigation menu item unsaved changes", `NavigationMenuItemsFormHandler`,
  `formChangesTracked`, `containerCloseHandler` and `menuItemType`. Only
  `pkp/pkp-lib#12826` names the file, in a list of grid code to remove;
  `pkp/pkp-lib#4352`, `#7869` and `#8059` concern other forms' questions.
- Not walked: the site administrator's "Navigation" tab. Unverified:
  whether "Assign Participant" asks on an untouched close.
