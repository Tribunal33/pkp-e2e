# A manager's good save in the static page window shows the earlier refusal as a red notice

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS (OPS: other windows only, read in the code)
  - 3.5: OJS, OMP, OPS (OPS: other windows only, read in the code)
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** not traced; present since at least [ece4902464](https://github.com/pkp/pkp-lib/commit/ece4902464726f7e6f438981ec7a3e0f1a5db96a) (2011-08-20)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U09 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a11)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

A manager's "Save" in the static page window is refused because of the
"Path". The reason shows under the box, and nothing shows at the top
right. The manager corrects the path and saves again. The window closes
and the page is listed. But a red notice at the top right now repeats
the earlier refusal ("The path field must contain only alphanumeric
characters plus '.', '/', '-', and '_'."), as if this save had failed.
Each refused save leaves a notice of its own, and all of them show
together at the next save. If the manager closes the window after a
refusal instead, the notice shows on the next page that loads, such as
the Editor Dashboard.

The cause is shared by every window that draws its form again after a
refused save and has no message box of its own. Read
in the code, not tried on screen, these include: the galley window in
OJS and OPS (editors and moderators setting a galley's "URL Path"); OMP's
catalog-entry windows for publication formats, identification codes,
markets, publication dates and sales rights (press editors); and "Assign
Participant" in every workflow stage (editors). Preprint servers have no
static pages, so OPS meets the fault only in those other windows.

## Impact

- **Lost**: nothing; the page is saved as typed. The manager is shown
  an old reason why a save failed, right after a save that worked, or
  later on an unrelated page.
- **Who**: journal and press managers adding or editing static pages,
  each time a save is refused first (a path with a space or another
  refused character, or a path another page already uses). In the other
  windows: journal editors and preprint server moderators in the galley
  window, press editors in the catalog-entry windows, and editors
  assigning participants, in all three apps (OPS through its galley
  window and "Assign Participant").
- **Way round**: none is needed. A manager who believes the notice may
  save again or look for a fault that is not there.

Low: the task gets done and the notice only misleads. It would be medium
if acting on the notice could lose or duplicate work, which was not
seen.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS (or OMP), journal (press)
  `publicknowledge`. OPS has no Static Pages plugin, so the steps run on
  OJS or OMP only. Nothing else is needed: step 2 turns on "Static
  Pages Plugin", which the dataset leaves off.

Steps:

1. Sign in as `dbarnes`.
2. Settings › Website › "Plugins": tick "Static Pages Plugin".
3. Reload the page and open the "Static Pages" tab.

A refusal, then a good save:

4. Press "Add Static Page". Type Path `u09ir12 about` (with a space),
   Title "u09ir12 about" and Content "u09ir12 text", then press "Save".
   The window stays open, with this message under "Path": "The path field
   must contain only alphanumeric characters plus '.', '/', '-', and '_'."
5. Change Path to `u09ir12-about` and press "Save".

A refusal, then the window closed:

6. Press "Add Static Page". Type Path `u09ir12-about` (step 5 used it)
   and Title "u09ir12 second", then press "Save". The window stays open,
   with this message under "Path": "This path already exists for another
   static page."
7. Press the window's back arrow ("Close") and answer "OK" to the
   question.
8. Open "Editor Dashboard" in the left menu.

**Expected**: after step 5 the window closes, "u09ir12 about" is listed,
and nothing shows at the top right. After step 8 the dashboard shows no
notice.

**Observed**: after step 5 the window closes and the list shows "u09ir12
about" with path "u09ir12-about". Then a red notice appears at the top
right:

```
The path field must contain only alphanumeric characters plus '.', '/', '-', and '_'.
```

After step 8, the "Assigned to me" list shows a red notice at the top
right:

```
This path already exists for another static page.
```

Each notice shows once. Settings › Website, opened after step 8, shows
none.

Control: a third page (Path `u09ir12-third`, Title "u09ir12 third"),
saved with no refusal before it, shows no notice.

## Cause

`Form::validate()` (`lib/pkp/classes/form/Form.php`, lines 318–328)
records a refusal in two places. The messages are kept for the form to
be drawn with. They are also stored for the user as a trivial
`NOTIFICATION_TYPE_FORM_ERROR` notification, which stays in the database
until the page next asks for notifications.
`NotificationHandler::fetchNotification()` answers that request with
all of the user's trivial notifications and then deletes them.

`StaticPageGridHandler::updateStaticPage()` (Static Pages plugin) answers
a refusal with `new JSONMessage(true, $staticPageForm->fetch($request))`,
the form drawn again with its messages.

In the browser, `AjaxFormHandler.handleResponse()`
(`lib/pkp/js/controllers/form/AjaxFormHandler.js`) puts that HTML in
place of the form with `this.replaceWith()` (line 139). Then it calls
`this.trigger('notifyUser')` (line 148). `Handler.trigger()` publishes
the event through `this.getHtmlElement().parent()`
(`triggerPublicEvent_()`), and the handler's element is the old form,
which `replaceWith()` has just removed from the page. A removed element
has no parent, so the event reaches neither the window's
`ModalHandler` nor `SiteHandler`. No notification is fetched, and the
form-error notification stays stored.

The next `notifyUser` that reaches `SiteHandler` fetches it, with every
other waiting one. After the good save, the server answers with a
`DataChangedEvent`, the form is not replaced, and the form's
`notifyUser` (line 148) fires from an element still on the page and
bubbles up as intended. After the window is
closed instead, the next page load fetches because the user has
notifications waiting (`hasSystemNotifications`). `SiteHandler` shows a
`notifyFormError` notification as a warning toast, the red notice.

Two kinds of window escape this:

- A form that carries its own message box (an in-place notification,
  `controllers/notification/inPlaceNotification.tpl`, included by over
  40 templates such as `user/changePassword.tpl`) fetches the waiting
  notifications as soon as it is drawn again. The refusal shows inside
  the form. `editStaticPageForm.tpl` has no such box.
- A handler that answers a refusal with `new JSONMessage(false)`, as
  `NavigationMenuItemsGridHandler::updateNavigationMenuItem()` does,
  leaves the form in place. The event then bubbles up and the notice
  shows at once.

Reach:

- The static page window, for both of its "Path" refusals (walked).
- Other handlers that also answer a refusal with the redrawn form, and
  whose template has no message box (code; whether each refusal can be
  reached from the screen was not checked):
  `ArticleGalleyGridHandler::updateGalley()` (OJS),
  `PreprintGalleyGridHandler::updateGalley()` (OPS), OMP's catalog
  entry windows (`IdentificationCodeGridHandler::updateCode()`,
  `MarketsGridHandler::updateMarket()`,
  `PublicationDateGridHandler::updateDate()`,
  `PublicationFormatGridHandler::updateFormat()`,
  `SalesRightsGridHandler::updateRights()`),
  `StageParticipantGridHandler::saveParticipant()` (see the report on
  [U35 A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U35-A4-assign-participant-ok-assigns-nobody-no-reason.md)),
  `PKPManageFileApiHandler::saveMetadata()`, and the settings windows of
  the Citation Style Language, Announcement Feed, PubMed export and
  Browse block plugins.
- `CustomBlockGridHandler::updateCustomBlock()` answers the same way.
  But the browser refuses its only checked field, an empty block name,
  before any save is sent (walked).
- Forms with a message box are not affected (walked: Profile ›
  "Password" with a wrong current password shows the refusal in its box,
  with no notice at the top right).
- Stored data: a refused user's form-error notifications wait until the
  next fetch, show once and are deleted. No repair is needed.

## Proposed fix

When the form is drawn again, send the notification request from the
old form's parent, unless the redrawn form itself holds a visible
message box. All the changes are in `AjaxFormHandler.handleResponse()`,
which every form of this kind uses:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-refusal-repeated-after-save/fix.diff).
Its paths are relative to the app: apply it with `git apply` from the
app's root, or with `git apply -p3` inside pkp-lib.

An excerpt of the diff (the linked file is the one to apply):

```diff
 			} else {
 				// Redisplay the form.
-				this.replaceWith(processedJsonData.content);
+				$parent = this.getHtmlElement().parent();
+				$content = $($.parseHTML(processedJsonData.content, document, true));
+				this.replaceWith($content);
+				redisplayed = true;
+
+				// ... (comment)
+				if ($content.find('.pkp_notification:visible').length === 0) {
+					$parent.trigger('notifyUser');
+				}
 			}
 ...
-		this.trigger('notifyUser');
+		if (!redisplayed) {
+			this.trigger('notifyUser');
+		}
```

The new HTML is parsed first, with its scripts kept, so that the check
looks only at the redrawn form. A message box elsewhere under the same
parent, or a hidden one, does not count.

Why this fix:

- **It is in the right place.** The rule that a save's answer is
  followed by a notification request lives in the shared handler, so
  every window that draws its form again is covered at once, the ones listed
  under Cause included.
- **It follows existing code.** Publishing `notifyUser` through the
  parent is what `Handler.triggerPublicEvent_()` and
  `NotificationHelper.redirectNotifyUserEvent()` already do. Looking for
  a `.pkp_notification` that is not hidden is how `NotificationHelper`
  finds a message box.
- **It keeps what ece4902464 was for.** That change made the event fire
  after every answer, refusals included, so that the refusal's
  notification is shown with it.
- **Forms with a message box keep theirs** (Cause, "Two kinds of window
  escape this").

Tried on `main` on the three apps. After step 4 the red notice "The path
field must contain only alphanumeric characters plus '.', '/', '-', and
'_'." shows at once, beside the message under "Path". After step 6 the
same happens with "This path already exists for another static page.".
Step 5 saves from the redrawn window, so its scripts still run after the
parse. Steps 5 and 8 show no notice, and the control shows none. With and
without the fix, two other windows behave the same:

- The navigation item window shows its "Path" refusal at once, and only
  "Navigation menu item was successfully added" after the good save.
- Profile › "Password" shows a wrong current password in the form's own
  box, with no notice at the top right.

**Alternatives**

- Add the message box (`inPlaceNotification.tpl`) to
  `editStaticPageForm.tpl`, as over 40 templates do. This fixes static pages
  only. Each window in the Cause's list needs the same edit, in pkp-lib,
  the three apps and four plugin repositories, and so does every new
  form.
- Answer the refusal with `new JSONMessage(false)`, as the navigation
  item window does. The notice shows at once, but the form is not drawn
  again, so the message under "Path" is lost. It also has to be done
  handler by handler.
- Stop `Form::validate()` from storing the notification on AJAX
  requests. This removes the notice that the `JSONMessage(false)`
  windows and the message-box forms rely on.

**What goes with it**

- The windows in the Cause's list now show their refusal notice at
  once, beside the messages in the form. Nothing else changes: no REST
  API, no plugin hook, and no stored data.
- The U35 A4 report proposes answering the "Assign Participant"
  refusal with `new JSONMessage(false)`. With this fix that change is no
  longer needed for its notice to show. It is still wanted, because it
  keeps the role, person and message the editor chose.
- Backport: lines 139 and 148 read the same on `stable-3_5_0`,
  `stable-3_4_0` and `stable-3_3_0`, so the diff applies as written.
  Installs that serve the minified bundle (`enable_minified = On`) see
  the change once `js/pkp.min.js` is rebuilt.
- Guard: an e2e scenario in U09 that saves a static page after a refused
  save and finds no notice at the top right (a **Planned** item in the
  spec).

Small: a few lines in one shared file in pkp-lib, tried on the three
apps, and one e2e scenario.

## Evidence

- Kept scripts:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-refusal-repeated-after-save/walk.js)
  (the Steps, OJS and OMP; OPS has no Static Pages plugin) and
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-refusal-repeated-after-save/neighbour.js)
  (the navigation item window and Profile › "Password", three apps), with
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-refusal-repeated-after-save/lib.js).
  Each script also records every notification request's answer. That
  record shows that at steps 4 and 6 no request is sent. The request
  after step 5 (or after the page load of step 8) returns the
  notification: its title is "Errors occurred processing this form",
  which the red notice does not show, and its text, which the notice
  shows, is the refusal.
- Stacking: the steps refuse once before each save. That several waiting
  notices show together comes from the code (`fetchNotification()`
  returns them all in one answer, and `SiteHandler` shows each) and from
  the spec's first check, which saw two notices at once after two
  refusals.
  Run: `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/static-page-refusal-repeated-after-save/walk.js`
  on an install freshly reset to the default dataset. The fix was tried
  the same way, with the diff applied to the app checkouts.
- Walked on `main` (OJS, OMP; the neighbour check on all three apps)
  and on `stable-3_5_0` (OJS, OMP), on PostgreSQL. Both used pkp/datasets
  c657990 (2026-10-01). The fix was tried on `main` only, with
  `enable_minified = Off`, so the sources were served without a build.
- Tips: `main` OJS 68615b5a32 (pkp-lib 25562b0e1a, staticPages
  45d02c0), OMP 3b0ecf794 (pkp-lib 3dc90c81a6, staticPages 45d02c0), OPS
  c8af945bb7 (pkp-lib 3dc90c81a6); `stable-3_5_0` OJS 3517e640f2
  (pkp-lib b1981810da, staticPages fb9b499), OMP c7b45f88e (pkp-lib
  1fb843f491), OPS 8eaf899468 (pkp-lib 1fb843f491); `stable-3_4_0` OJS
  75cc2d488b, pkp-lib 32b0f4b4af, staticPages 9568981e8c (the app's
  submodule pointer); `stable-3_3_0` OJS ac77c9fb35, pkp-lib f6ab331645,
  staticPages 8c97bd09d4.
- Code reads. On every line: `AjaxFormHandler.handleResponse()` (the
  redraw at line 139, `notifyUser` at line 148), `Handler.trigger()` /
  `triggerPublicEvent_()` (publishing through `parent()`), and
  `Form::validate()` (the form-error notification; `Form.inc.php` on 3.4
  and 3.3). Also, from the
  Static Pages plugin at each line's pinned commit,
  `StaticPageGridHandler::updateStaticPage()` (the redrawn form on a
  refusal) and `editStaticPageForm.tpl` (no message box). The reach list comes from a
  search of pkp-lib and the three apps, plugins included, for handler
  methods that call `validate()` and return
  `new JSONMessage(true, $form->fetch(…))`, with each form's template
  checked for `inPlaceNotification.tpl`.
- Introduced: `git blame` on line 148 gives d547b00e0a (2020,
  `pkp/pkp-lib#5865`), which only dropped the event's argument. Before
  it, ece4902464 ("*5762* Trigger notify user event always on form
  submit response handler", 2011-08-20, bruno.beghelli) moved the
  trigger from the success branch to after the redraw. 27875999c8 added
  the form-error notification to `Form::validate()` on the same day.
  `Handler` already published events through `parent()` then, so the
  refusal's event has been lost since that change. There is no PR (the
  Bugzilla era), so "not traced".
- Upstream, searched 2026-10-02 in pkp/pkp-lib, pkp/ojs, pkp/omp,
  pkp/staticPages and pkp/ui-library, for "form error notification
  after save", "Errors occurred processing this form",
  `NOTIFICATION_TYPE_FORM_ERROR`, "path field must contain",
  `AjaxFormHandler`, `inPlaceNotification` and `notifyUser`. Read and
  not the same fault: `pkp/pkp-lib#11760` (reviewer form errors shown
  only as a passing notice), `pkp/pkp-lib#9759` / `pkp/pkp-lib#9760`
  (the file upload wizard's refusal) and `pkp/pkp-lib#3870`.
- Not driven: every reach-list window other than the static page
  window, OPS's included.
