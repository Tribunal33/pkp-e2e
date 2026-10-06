# The DOIs page's "Bulk Actions" menu stays open over the list when an action is confirmed at once

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; no DOIs page)
- **Introduced** `pkp/ui-library#165` for `pkp/pkp-lib#7014` · [6eecffda15](https://github.com/pkp/ui-library/commit/6eecffda159acb76e0278570132cbe6d08e93bc2) · 2021-12-16 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U45 [A22](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#a22)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On the DOIs page a manager chooses an action from "Bulk Actions", such as
"Assign DOIs", and presses the button of the confirmation window as soon
as it opens. The action is done and its notice shows, but the menu is
still open over the first rows of the list. The manager expects it to
have closed, as it has when the confirmation window stays open longer.

The buttons of the covered rows cannot be pressed until the menu is
closed. Pressing any other part of the page, or "Bulk Actions" again,
closes it.

It happens only when two things come together. The mouse button is held
on the menu item for more than a tenth of a second, and the confirmation
window has opened and gone again within 1.1 seconds of the mouse button
going down, the server's answer included. With a mouse that leaves about
half a second to press the window's button. From the keyboard no held
press is needed.

## Impact

- **Lost.** Nothing; the action itself is done. A press meant for a
  covered row's button does nothing. On screen the centre of every
  covered button lay under an empty part of the menu, none under a menu
  action. A press that did land on an action would open that action's
  confirmation window, which only asks: nothing is changed without a
  second press.
- **Who.** A manager or editor who confirms a bulk action by reflex. With
  a mouse that is rare, and on an install whose server takes more than
  about a second to answer it does not happen at all. A keyboard user who
  moves into the menu with Tab and answers the window with Enter is the
  likelier one to meet it (from the code, not walked).
- **Way round.** Press any other part of the page, or "Bulk Actions"
  again. The menu stays open until then.

Low: no press on the stuck menu changes anything without a confirmation,
and the next press elsewhere closes it. A covered button lying under
"Select All", which ticks every row without asking, would be the worst
case, and it still changes no DOI.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (the steps name OJS; square brackets
  give OMP and OPS). DOIs are on with no prefix, and "Assign DOIs" is in
  the menu only once a prefix is set, so step 2 sets one.
- An install that answers quickly: on one where "Assign DOIs" takes
  longer than about a second to answer, the steps show nothing.

Steps:

1. Sign in as `dbarnes`.
2. Settings › Distribution › "DOIs" › "Setup": "DOI Prefix" `10.1234`,
   "Save".
3. Side menu "DOIs". Tick submission 17, "Antimicrobial, heavy metal
   resistance and plasmid profile of coliforms isolated from nosocomial
   infections in a hospital in Isfahan, Iran" [OMP: 5, "Bomb Canada and
   Other Unkind Remarks in the American Media"; OPS: 2, "The Facets Of Job
   Satisfaction: A Nine-Nation Comparative Study Of Construct
   Equivalence"].
4. Press "Bulk Actions".
5. Press "Assign DOIs" in the menu, holding the mouse button down for
   about a fifth of a second before letting go.
6. Click the "Assign DOIs" button of the confirmation window as soon as
   the window opens. The window closes when the server has answered, and
   it must be gone within 1.1 seconds of the mouse button going down in
   step 5.
7. Click the first row's "Show more details about 19" button [OMP: 14],
   which the menu now covers.
8. Click the page's heading.

**Expected.** After step 6 the confirmation window closes, "Items
successfully assigned new DOIs" shows and the menu is closed. Step 7
expands the first row.

**Observed.** After step 6 the confirmation window closes, about half a
second after the mouse button went down in step 5, and the notice shows.
Two and a half seconds later the menu is still open over the list, with
the keyboard focus on its "Assign DOIs" item.

The click of step 7 lands on an empty part of the menu, beside "Select
All": the row does not expand, the menu stays open and the focus moves to
"Bulk Actions". On OJS the menu covers five row controls: the "Show more
details" buttons of four rows and one title link. The centre of each lies
under an empty part of the menu.

After step 8 the menu closes; 1.3 seconds after the click it is gone and
the first row's button can be pressed.

Control: the same steps 3 to 6 on submission 1 [OMP: 14; OPS: 5], with
the confirmation window's button clicked a second and a half after the
window opens, leave the menu closed.

## Cause

"Bulk Actions" is a ui-library `Dropdown`
(`src/components/Dropdown/Dropdown.vue`). A second press on its button
closes it (`toggle()`, line 117). For a chosen item or a press elsewhere
it closes only through `closeOnBlur()` (line 124), which runs when the
button loses the focus. That method checks where the focus is 100 ms
later: outside the component, it closes the menu; inside, it starts an
interval that checks again every 1000 ms and closes the menu at the first
check that finds the focus outside.

A mouse press on a menu item moves the focus from the button to the item
when the mouse button goes down. If the press is still held 100 ms later,
the first check finds the focus inside the menu and the interval starts;
its first check comes 1.1 s after the mouse button went down.

The item's click opens the confirmation dialog (`DoiListPanel.vue`
`openBulkActionDialog()`, line 780, through `openDialog()`), which takes
the focus. The dialog's button sends the request, and the dialog closes
in the request's `complete` (`onBulkActionComplete()`, line 824). On
closing, the dialog (reka-ui `DialogContent`) hands the focus back to the
element that had it before: the menu item.

So when the dialog has opened and closed between two checks of the
interval, every check finds the focus inside the menu, and the menu stays
open until the focus leaves it. When a check falls while the dialog is
open, the focus is in the dialog and the menu closes at that check. A
press shorter than 100 ms never starts the interval: the first check
finds the focus in the dialog and closes the menu.

`DoiListPanel` is the one caller that puts dialog-opening items into a
`Dropdown`, and it leaves the closing of the menu to those checks.

Reach:

- All six actions of the menu ("Export DOIs", "Mark DOIs Registered",
  "Mark DOIs Unregistered", "Mark DOIs Needs Sync", "Assign DOIs",
  "Deposit DOIs") open their dialog through `openBulkActionDialog()`.
  The walk drove "Assign DOIs" and its confirm button. The other five
  actions and a journal's "Issues" tab (the same component) were read in
  the code, not driven.
- The dialog's "Cancel" closes it at once, with no request to wait for,
  and returns the focus the same way (code read).
- Keyboard: Tab from "Bulk Actions" into the menu takes the focus off
  the button, the first check finds it inside the menu, and the interval
  runs from then on. Enter on an item and Enter in the dialog, whose
  button holds the focus, then leave the menu open whenever no check
  falls while the dialog is open. A dialog open for half a second is
  missed by about half of the checks (code read, not walked).
- The same holds for a mouse user after "Select All", which keeps the
  menu open on purpose with the interval running: the next action leaves
  the menu open or not by where the checks fall, whatever the length of
  the press (code read, not walked).
- A press on an item of the stuck menu runs that item (code read):
  "Select All" and "Expand all" act at once, and each of the six actions
  opens its confirmation dialog.
- The other callers of `Dropdown` hold links (the user menu
  `TopNavActions.vue`, the context switcher in lib/pkp
  `templates/layouts/backend.tpl`), a state switch
  (`FileAttacherFileStage.vue`) or a form (`WorkflowPaymentDropdown.vue`,
  `WorkflowPublicationRelationDropdownOPS.vue`). None opens a dialog from
  an item (code read).
- 3.4 has the same `closeOnBlur()`, and its dialog mixin
  (`src/mixins/dialog.js`) refocuses the element that opened the dialog
  when the dialog is destroyed (code read).

## Proposed fix

Close the menu when one of its items opens a dialog. `Dropdown` gets a
`close()` method that closes it, stops the interval and puts the focus on
its button; `openBulkActionDialog()` calls it while the menu is open.

```diff
 		openBulkActionDialog(title, message, callback) {
+			// Close the menu when the action came from it: the dialog would
+			// return the focus to the menu item and keep the menu open.
+			if (this.$refs.bulkActions?.isOpen) {
+				this.$refs.bulkActions.close();
+			}
 			this.openDialog({
```

with `ref="bulkActions"` on the panel's `<Dropdown>`, and in
`Dropdown.vue` (where `closeOnBlur()` now keeps its interval in
`this.focusInterval` instead of a local variable):

```diff
+		close() {
+			this.isOpen = false;
+			window.clearInterval(this.focusInterval);
+			this.$refs.button.$el.focus();
+		},
```

The diff, against the app root:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/bulk-actions-menu-stays-open/fix.diff).

Three choices in it:

- **Focus on the button.** Once the menu is closed its item is out of the
  DOM, so the dialog has nothing to return the focus to and it falls to
  `body`. That is what today's slow path does, and a keyboard user loses
  their place. With the focus put on "Bulk Actions" before the dialog
  opens, the dialog returns it there. `preserveFocus()` already focuses
  the button the same way.
- **The interval is stopped.** Left running, it would never end while the
  focus rests on the button, which is inside the component.
- **Only while the menu is open.** `openBulkActionDialog()` has seven
  callers: the six menu actions and `openBulkDepositAll()`, the "Deposit
  all" button outside the menu. `openBulkDeposit()` is also called from a
  row's "Deposit DOI(s)". For those two the menu is closed and the focus
  must stay where it is.

"Select All" and "Expand all" do not pass through
`openBulkActionDialog()`, so they keep the menu open as today. The newer
menus (`DropdownActions`, the "More Actions" menus) close when an item is
chosen.

Tried on `main` on the three apps. With the fix in, the menu was closed
after step 6, the focus was on "Bulk Actions" once the dialog had gone,
and step 7 expanded the first row. Four things behaved the same with the
fix in and out:

- "Select All" kept the menu open, with its count ("Take action on 8
  selected item(s).").
- A press elsewhere, and a second press on "Bulk Actions", closed it.
- The user menu stayed open while Tab moved the focus into it.
- A preprint's "Relations" menu stayed open through a press on a radio
  button and on the DOI box of its form.

**Alternatives:**

- A `close()` that only sets `isOpen`, leaving the focus and the
  interval alone. Tried too: the menu closes, the focus ends on `body`,
  and the interval ends at its next check because the focus is outside.
  It is three lines fewer and loses the keyboard user's place.
- Close `Dropdown` from its own `focusout` event whenever the focus moves
  to an element outside it. It would cover every caller with no change to
  the panel. Tried first and dropped: the bulk menu closed as wanted, but
  the check on the preprint's "Relations" menu then failed, a press
  inside its form timing out; which press was not recorded. A guess at
  the reason, not confirmed: that menu sits inside the workflow window,
  where a press on a form label may move the focus out of the menu for a
  moment.
- Replace `closeOnBlur()`'s timers with an outside-press and Escape
  handler, or move "Bulk Actions" to `DropdownActions`. Either removes
  the timing for good. The first changes every caller; the second needs
  items that keep the menu open ("Select All").

**What goes with it:**

- No stored data is involved, and no API or hook changes. `close()` is a
  new public method on `Dropdown`.
- Backport: the diff applies to `stable-3_5_0` as written (`patch
  --dry-run`); it was not walked there. 3.4 needs the same edits in its
  own syntax.
- Test: a Cypress step in the apps' `Doi.cy.js`, or the e2e scenario in
  the pkp-e2e U45 spec: after a bulk action confirmed at once, the menu's
  items are gone and the focus is on "Bulk Actions".

Small: about twenty lines in two ui-library components, with no caller
outside the DOIs panel changed.

## Evidence

- Kept script, which takes the Steps through the screens (the press of
  step 5 held 200 ms, the confirmation window's button clicked at once),
  lists the row controls the stuck menu covers, then takes the control
  and two checks of what a fix must leave alone ("Select All" keeping the
  menu open, the button closing it):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/bulk-actions-menu-stays-open/walk.js)
  (helpers in `lib.js` beside it). Run it on an install loaded from the
  default dataset with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/bulk-actions-menu-stays-open/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- The other `Dropdown` menus (the user menu on each app, the "Relations"
  form menu on OPS preprint 1):
  [neighbours.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/bulk-actions-menu-stays-open/neighbours.js),
  run the same way.
- The fix: `node bin/try-fix.js apply …/fix.diff ojs omp ops`, both
  scripts, then `node bin/try-fix.js revert …/fix.diff ojs omp ops`.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), in a 1280 by 900 browser window.
  - main: OJS [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287),
    OMP [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262),
    OPS [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2),
    each with ui-library
    [280f98c570](https://github.com/pkp/ui-library/commit/280f98c5703024a8de7694642dfa860eaa293e1a).
    The confirmation window was gone 513 to 558 ms after the mouse
    button went down in step 5; in the control, 1.9 to 2.1 s after it.
    The covered row controls were listed on OJS only. The fix was walked
    on the three apps: window gone after 540 to 581 ms.
  - stable-3_5_0: OJS [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17),
    OMP [3081c9b00d](https://github.com/pkp/omp/commit/3081c9b00ddde6f893df9995d455ed26c3e66eeb),
    OPS [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd1b020b73ff061dbde9cea586207994),
    each with ui-library
    [1a7a47504c](https://github.com/pkp/ui-library/commit/1a7a47504c4f8b78f423cdfd16c55c0fcf01caca).
    The same Steps, the same result on the three apps (window gone 522 to
    551 ms after the press); `closeOnBlur()` and the panel's
    `openBulkActionDialog()` read the same there.
- Code reads, not walked:
  - 3.4: ui-library `stable-3_4_0`
    [ee684b341b](https://github.com/pkp/ui-library/commit/ee684b341bacfcdd330b95073394a1fbf34a1f4f):
    `Dropdown.vue` `closeOnBlur()` is the same; `DoiListPanel.vue` has the
    same menu and `openBulkActionDialog()`; `mixins/dialog.js`
    `openDialog()` keeps `document.activeElement` and focuses it again
    from `Dialog.vue`'s `destroyed()`.
  - 3.3: ui-library `stable-3_3_0`
    [96959f9ed4](https://github.com/pkp/ui-library/commit/96959f9ed4e7357c0eede0179add0e9728e1f708)
    has no `ListPanel/doi`.
- Introduced: 6eecffda15 added `DoiListPanel.vue` with its actions in a
  `<dropdown>`, each opening a dialog. `closeOnBlur()` with its timers is
  older (3706dabce, 2019-06-26, `pkp/ui-library#35` for
  `pkp/pkp-lib#2072`), and dialogs already refocused their opener then
  (`mixins/modal.js` at 6eecffda15), so the fault was there from the
  panel's first version.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library for the
  menu staying open, the dropdown not closing, bulk actions and
  `closeOnBlur`; `pkp/pkp-lib#13415`'s list of DOI problems does not
  name it.
- Unverified: the timings between those walked (the confirmation
  window gone between 0.6 and 1.9 s after the mouse button went down);
  the keyboard path, the other five actions and "Cancel", which are code
  reads; where a covered control lies under the menu on OMP, OPS, another
  window size or a list with other rows; how long an ordinary mouse
  click is held, since the walk's press is a scripted one of 200 ms.
