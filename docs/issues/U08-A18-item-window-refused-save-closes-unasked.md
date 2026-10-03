# After a refused "Save" in a menu item window, closing it or leaving the page drops the typed entries without asking

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** [fa58d3dc19](https://github.com/pkp/pkp-lib/commit/fa58d3dc190cbfa85efe073d66d0c739a259e401) for pkp's old tracker's bug 6725, no pull request · 2011-12-06 · Jason Nugent (jnugent)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U08 [A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U08-navigation-menus-and-site-chrome.md#a18); spec U39 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U39-submission-and-publisher-libraries.md#a11)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

A manager fills in "Add item" on Settings › Website › "Navigation" and
presses "Save". The save is refused (here, a "Path" with a space): the
window stays open with the entries, and a notice at the top right says
why. If the manager then presses the window's back arrow, the window
closes at once and the entries are gone. Before that "Save", the same
back arrow asked "The data on this form has changed. Do you wish to
continue without saving?". Leaving the page after the refusal does not
ask either.

Nothing stored is lost, but the manager types the title, path or address
again. Every reason for a refusal does it: a missing type, an address
that is not a full web address, or a path that holds characters other
than letters, digits, ".", "/", "-" and "_", or that another item
already uses.

The libraries' "Add a file" window does the same. Pressing "OK" with no
file chosen is refused with the notice "A library file is required.
Please ensure that you have chosen and uploaded a file." The window's
close button then drops the typed name and type without asking.

## Impact

- **Lost.** The entries typed into the window since it opened. No
  message says they were dropped.
- **Who.** A journal, press or server manager whose item "Save" is
  refused, and who then closes the window or leaves the page instead of
  correcting the entry. The site administrator meets it too, on the
  site's own "Navigation" tab. In the libraries' "Add a file", whoever
  presses "OK" with no file chosen: in a submission's Library every
  workflow participant, the Author included; in the Publisher Library
  the manager-level roles and the site administrator.
- **Way round.** Correct the box the notice names and save again.
  Changing any box after the refusal also brings the question back.

Low: a few boxes to type again, after the manager chose to close.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS, OMP or OPS, context
  `publicknowledge`.

Closing the window:

1. Sign in as `rvaca` (the journal manager; on OMP the press manager, on
   OPS the preprint server manager).
2. Open Settings › Website, tab "Setup", side tab "Navigation"
   (`/index.php/publicknowledge/en/management/settings/website#setup/navigationMenus`).
3. Under "Navigation Menu Items" press "Add item". Type "u08m page" in
   "Title", choose "Custom Page" in "Navigation Menu Type", and type
   "my page" in "Path".
4. Press "Save".
5. Press the back arrow at the window's top ("Close").
6. Look at "Navigation Menu Items".

Leaving the page:

7. Press "Add item" again and fill it in as in step 3. Press "Save".
8. Type the address of Settings › "Workflow"
   (`/index.php/publicknowledge/en/management/settings/workflow`) in the
   browser's address bar and press Enter.

In a library's "Add a file" window:

9. Sign in as `dbarnes` (the editor: a manager-level role, so he reaches
   the Publisher Library and every submission's "Library"). Open
   Settings › Workflow
   (`/index.php/publicknowledge/en/management/settings/workflow`), tab
   "Publisher Library" ("Press Library" on OMP, "Preprint Server
   Library" on OPS).
10. Press "Add a file". Type "u39b guide" in "Name" and choose "Other"
    in "Type". Choose no file.
11. Press "OK".
12. Press the back arrow at the window's top ("Close"), and look at the
    list under "Other".

The same happens in a submission's Library: open submission 1, press
"Library" in the workflow header, and take steps 10–12 there.

13. Open the library tab of step 9 again and take steps 10–11. Then type
    the dashboard's address
    (`/index.php/publicknowledge/en/dashboard/editorial`) in the
    browser's address bar and press Enter.

**Expected.** Step 4 is refused: the window stays open with the entries,
and the notice "The path field must contain only alphanumeric characters
plus '.', '/', '-', and '_'." shows at the top right. Step 5 opens the
browser's box "The data on this form has changed. Do you wish to
continue without saving?", as the same back arrow does before any
"Save". Step 8 raises the browser's leave question. Step 11 is refused
with the notice "A library file is required. Please ensure that you have
chosen and uploaded a file." at the top right, step 12 asks the same
question as step 5, and step 13 raises the leave question.

**Observed.** Step 4 is as expected. Step 5 closes the window at once,
with no box. Step 6 lists no "u08m page": the entries are gone. Step 8
opens the Workflow settings with no question. Step 11 is as expected.
Step 12 closes the window at once, and "Other" lists no "u39b guide".
Step 13 opens the dashboard with no question.

Control: after the refused "Save", changing "Title" to "u08m page 2" and
then pressing the back arrow opens the box again. No request fails and
no script error shows in the browser.

## Cause

`$.pkp.controllers.form.FormHandler.prototype.submitHandler_()`
(`lib/pkp/js/controllers/form/FormHandler.js`, lines 446–449 on `main`)
treats the form as saved as soon as it is sent:

```js
		this.trigger('unregisterChangedForm');

		if (this.callerSubmitHandler_ !== null) {
			this.formChangesTracked = false;
```

`unregisterChangedForm` takes the form off `SiteHandler`'s list of
unsaved forms, which `SiteHandler.pageUnloadHandler_()` reads for the
browser's leave question. `formChangesTracked` is what
`FormHandler.containerCloseHandler()` reads before it confirms a close
with `form.dataHasChanged`; the window's close button reaches it through
ui-library `src/components/Modal/AjaxModalWrapper.vue` on `main` and 3.5
(its `registerCloseCallback` triggers `containerClose` on the form) and
through `ModalHandler.js` on 3.4 and 3.3. Nothing sets either back when
the answer is a refusal.

For an AJAX form the answer arrives in
`$.pkp.controllers.form.AjaxFormHandler.prototype.handleResponse()`
(`lib/pkp/js/controllers/form/AjaxFormHandler.js`). When the save is
refused with `status: false`, its `else` branch only re-enables the
buttons. `NavigationMenuItemsGridHandler::updateNavigationMenuItem()`
answers every refused item with `new JSONMessage(false)` (the reasons
reach the notice because `Form::validate()`, for a signed-in user,
creates one `NOTIFICATION_TYPE_FORM_ERROR` notification holding all the
form's errors), so the
window keeps the entries, while both checks now say there is nothing to
lose. The next `change` on a box calls `FormHandler.formChange()`, which
sets the flag and registers the form again; that is the control.

Sending the form has cleared the unsaved list since the feature came in
(fa58d3dc19, "Add general "don't leave page without saving" form
feature", 2011). ea8d4cda2f (2012) moved it to events and added the
`formChangesTracked = false` line the close check reads.

Reach (read in the code, not walked, unless a bullet says so):

- Other forms refused with a bare `new JSONMessage(false)` after a failed
  `validate()`, 21 places besides the item window. In pkp-lib:
  `AnnouncementTypeGridHandler::updateAnnouncementType()`,
  `GenreGridHandler::updateGenre()` (component types),
  `ReviewFormGridHandler::updateReviewForm()`,
  `ReviewFormElementsGridHandler::updateReviewFormElement()`,
  `UserGridHandler::updateUser()` and `::updateUserRoles()`,
  `LibraryFileGridHandler::saveFile()` and `::updateFile()`,
  `StageParticipantGridHandler::sendNotification()`,
  `FileInformationCenterHandler::saveNote()`,
  `SubmissionInformationCenterHandler::saveNote()`, and the file pickers
  `ManageCopyeditFilesGridHandler`, `ManageFinalDraftFilesGridHandler`,
  `ManageProofFilesGridHandler` and `ManageReviewFilesGridHandler`. In
  OJS: `SectionGridHandler::updateSection()`,
  `IssueGalleyGridHandler::update()`,
  `SubscriptionTypesGridHandler::updateSubscriptionType()`. In OMP:
  `SeriesGridHandler::updateSeries()`, `ChapterGridHandler::updateChapter()`.
  In OPS: `SectionGridHandler::updateSection()`. Each form's script
  handler was not checked; wherever it is `AjaxFormHandler` or a
  subclass (`FileUploadFormHandler` and `StageParticipantNotifyHandler`
  hand the answer to it), the fix covers it.
- `LibraryFileGridHandler::saveFile()`, which both library grids
  inherit: `LibraryFileAdminGridHandler` with the settings
  `NewLibraryFileForm` and
  `templates/controllers/grid/settings/library/form/newFileForm.tpl`,
  and `SubmissionDocumentsFilesGridHandler` with the submissionDocuments
  `NewLibraryFileForm` and
  `templates/controllers/grid/files/submissionDocuments/form/newFileForm.tpl`.
  Walked, Steps 9–13.
- Refusals that carry the form drawn again, `new JSONMessage(true,
  $form->fetch($request))` (47 places in the same scan).
  `handleResponse()` replaces the form, and the new form's handler starts
  with nothing tracked, so its close and the page's leave do not ask
  either while the redrawn form holds the entries. Left out of this fix.
- `status: false` answers that carry content. `Handler.handleJson()`
  shows the content in an alert and returns `false`, so
  `handleResponse()` takes the same `else` branch and the fix covers
  them: answers that are not a failed validation, such as
  `UserGridHandler`'s `grid.user.cannotAdminister` or
  `common.uploadFailed`; `UserGridHandler::sendEmail()`'s refusal,
  `new JSONMessage(false, __('validator.filled'))`; and
  `ProfileTabHandler::saveRoles()`'s, `new JSONMessage(false,
  $rolesForm->fetch($request))`, which alerts the form's raw HTML
  (`rolesForm.tpl` attaches `AjaxFormHandler`). With the fix they also
  mark the form changed, which is right, since nothing was saved.
  `UserGridHandler::disableUser()` answers a refusal with
  `new JSONMessage(false, $userForm->display($request))`, but
  `Form::display()` prints the form and returns nothing, so the answer
  is the form's HTML ahead of the JSON. It is not JSON, never reaches
  `handleResponse()`, and the fix does not touch it.
  A failed CSRF check is part of `validate()` (`FormValidatorCSRF`), so
  it is a refusal like the others. An answer that is not JSON never
  reaches `handleResponse()`, and the fix does not touch it.
- The menu window ("Add Menu", a menu's "Edit") is out of reach on
  `main`: `navigationMenuForm.tpl` still attaches `AjaxFormHandler`, but
  `NavigationMenusGridHandler` offers only `fetchGrid`, `fetchRow` and
  `deleteNavigationMenu`, and "Add Menu" opens the Vue
  `NavigationMenuManagerFormModal`. On 3.5 and older the legacy menu
  window answers a refusal with a bare `new JSONMessage(false)` too
  (`NavigationMenusGridHandler::updateNavigationMenu()`), so it has the
  same fault there and the fix covers it.

## Proposed fix

Track the form again when its save is refused. This is a proposal:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/item-window-refused-save-closes-unasked/fix.diff),
one line in pkp-lib that covers the three apps.

```diff
 		} else {
 			// data was false -- assume errors, re-enable form controls.
 			this.enableFormControls();
+			// The save was refused, so what the form holds is still unsaved.
+			// submitHandler_() stopped tracking it when the form was sent:
+			// track it again, so closing or leaving asks first.
+			this.formChange();
 		}
```

`formChange()` is the method a person's change already goes through: it
sets `formChangesTracked` and sends `formChanged`, so the close check and
the page's list agree again. The fix goes where the answer is known:
`submitHandler_()` has to clear the list before the form is sent,
because a non-AJAX form leaves the page right then.

Tried on `main`, OJS, OMP and OPS. With the fix, step 5 opens the box
"The data on this form has changed. Do you wish to continue without
saving?" and step 8 raises the leave question. As a check on what the
fix must leave alone, an accepted "Save" ("u08m ok", path "u08m-ok")
still closes the window with "Navigation menu item was successfully
added", and the page is then left with no question, as without the fix.
In the libraries' "Add a file", step 12 asks with the fix in both
libraries, and so does leaving the page after the refused "OK". An "OK"
with a file uploaded still closes the window and lists the file, and
the page is left with no question, with the fix and without it.

**Alternatives**

- Clear the list in `handleResponse()` on success instead of in
  `submitHandler_()`. That is the cleaner rule for AJAX forms, but it
  moves code every form subclass relies on, and the non-AJAX path still
  needs the early clear.
- Answer refusals by drawing the form again in
  `NavigationMenuItemsGridHandler`. That fixes this one window, and the
  redrawn form would still start untracked.

**What goes with it**

- The refusals that draw the form again (`new JSONMessage(true,
  $form->fetch($request))`) stay as they are. Covering them needs the
  new form's handler to start as changed. One way is an option passed
  with the drawn form; it is a separate change.
- `js/pkp.min.js` is committed in the OJS, OMP and OPS repos. Installs
  that set `enable_minified = On` serve it, so each app needs it rebuilt
  after the pkp-lib change.
- The diff's paths start at the app root (`a/lib/pkp/js/…`): in a
  pkp-lib clone it applies with `git apply -p3`.
- Backport: `handleResponse()`'s `else` branch and `submitHandler_()`
  read the same on `stable-3_5_0`, `stable-3_4_0` and `stable-3_3_0`, so
  the diff applies there as it stands.
- Guard: a Planned item in spec U08 (its scenario 5 already marks A18)
  that presses the back arrow after a refused "Save" and expects the
  box, and one in spec U39 (Rule 3b) for the libraries' "Add a file".

Small: one line in one pkp-lib script, tried on all three apps.

## Evidence

- A Playwright script that runs the Steps on installs loaded from PKP's
  default test dataset, all three apps in one run:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/item-window-refused-save-closes-unasked/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/item-window-asks-with-nothing-typed/lib.js)),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/item-window-refused-save-closes-unasked/walk.js`.
  It records each save's answer (`{"status":false,"content":""}` for the
  refusals), the notices, each browser box with its words, and whether
  the window closed. `PACE_MS=4000` in front waits four seconds before
  each action, so the back arrow comes more than five seconds after the
  refusal; the result was the same with and without it. `nb` as the
  argument runs only the accepted-save check of the fix's trial.
- The libraries' Steps 9–13 are walked by
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/library-add-file-refused-closes-unasked/walk.js)
  (helpers in its `lib.js`), run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/library-add-file-refused-closes-unasked/walk.js`;
  `nb` as the argument runs only the fix trial's neighbour (an "OK" with
  a file uploaded). It records each save's answer, how long the
  refusal's notice stays on screen, each browser box and whether the
  window closed. Walked 2026-10-03 on the `main` tips OJS ff004d0973
  (lib/pkp 987776cd04), OMP 3b0ecf794c and OPS c8af945bb7 (lib/pkp
  3dc90c81a6), and on `stable-3_5_0` OJS c1cee76b95 (lib/pkp
  771474347e), OMP 9c5e24246c and OPS 38b61882d3 (lib/pkp cf3f984335):
  the same result on the six.
- Step 8 is a typed address because the open window covers the side
  menu; a reload or the browser's back button leave the page the same
  way. Chrome's leave question has fixed words that the page cannot set;
  the script records that it came, not its text.
- The fix, tried 2026-10-03 twice, with
  `node bin/try-fix.js apply shared/playwright/checks/issues/item-window-refused-save-closes-unasked/fix.diff ojs omp ops`,
  then walk.js and walk.js `nb`, then `revert` and walk.js `nb` again,
  which showed the same as with the fix: with the item window's walk.js
  on the `main` tips below (OJS b84f8e2e44), and with the libraries'
  walk.js on OJS ff004d0973 (OMP and OPS on the same tips). The installs ran with
  `enable_minified = Off`, so they served the unbuilt script; the
  rebuilt `pkp.min.js` was not tried.
- Walked 2026-10-03 on PostgreSQL (the fault is in the browser's script;
  the database plays no part), each install freshly loaded from
  pkp/datasets
  [e8dafbc](https://github.com/pkp/datasets/commit/e8dafbcf0a61c21a3653dd24d9a1282f36762d12) (2026-10-02):
  - main: OJS b84f8e2e44 (lib/pkp ddd8ab243a), OMP 3b0ecf794c (lib/pkp
    3dc90c81a6), OPS c8af945bb7 (lib/pkp 3dc90c81a6). `FormHandler.js`,
    `AjaxFormHandler.js` and `SiteHandler.js` are the same in the three.
  - stable-3_5_0: OJS 091fb65453, OMP 9c5e24246c, OPS 38b61882d3
    (lib/pkp cf3f984335 in each). Same result on the three apps.
- 3.4, by code: OJS `stable-3_4_0` at c1827e3527, OMP at 0aec65441f, OPS
  at acd8ae704b, pkp-lib `stable-3_4_0` at 767353f4fe (the files read
  are unchanged since 9e41f10273, the tip at the first read).
  `LibraryFileGridHandler::saveFile()` answers a refusal with
  `new JSONMessage(false)`, and both `newFileForm.tpl` attach
  `FileUploadFormHandler`, which hands the answer to `AjaxFormHandler`. `submitHandler_()`
  (lines 444–447), `handleResponse()`'s `else` branch (lines 142–143) and
  `containerCloseHandler()` read as on `main`, and
  `NavigationMenuItemsGridHandler::updateNavigationMenuItem()` answers a
  refusal with `new JSONMessage(false)`.
- 3.3, by code: OJS `stable-3_3_0` at ac77c9fb35, OMP at 8e72fc8836, OPS
  at c5532e2161, pkp-lib `stable-3_3_0` at ac3fa73402. The same as 3.4
  (`NavigationMenuItemsGridHandler.inc.php`,
  `LibraryFileGridHandler.inc.php`).
- Introduced: `git blame` on lines 446 and 449 gives ea8d4cda2f; its
  parent already called `unregisterUnsavedFormElement()` in
  `submitHandler_()`, and `git log -S unregisterUnsavedFormElement` gives
  fa58d3dc19.
- The reach scan: every `if ($form->validate()) { … }` with its `else`
  block (braces matched) in the `controllers/`, `pages/` and `plugins/`
  PHP of pkp-lib, OJS, OMP and OPS on `main`, sorted by the refusal's
  answer. Nine blocks answer in other ways (a redirect, an early return)
  and are not counted.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library
  searched 2026-10-03 for the box's words, "continue without saving",
  "unsaved changes lost after validation error", `formChangesTracked`,
  `unregisterChangedForm` and `containerCloseHandler`. `pkp/pkp-lib#4352`, `#7869` and `#8059`
  concern other forms' questions; none is about a refused save. For the
  library window, pkp/pkp-lib, pkp/ojs and pkp/ui-library were searched
  2026-10-03 for "library file required uploaded", "library file"
  upload form closes, `libraryFiles.fileRequired` and
  `LibraryFileGridHandler saveFile`: nothing on this fault.
- Unverified on screen: that a form redrawn by a `new JSONMessage(true,
  $form->fetch($request))` refusal closes without asking, and that
  `UserGridHandler::disableUser()`'s refusal never reaches
  `handleResponse()` (both read in the code).
