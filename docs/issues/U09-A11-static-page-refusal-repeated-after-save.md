# Refused saves reappear as red notices at the next save; book-format metadata windows show no reason before

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS (OPS: the galley window, by code)
  - 3.5: OJS, OMP, OPS (OPS: the galley window, by code)
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** pkp bug 5762 (before GitHub, no PR) · [ece4902464](https://github.com/pkp/pkp-lib/commit/ece4902464726f7e6f438981ec7a3e0f1a5db96a) with [27875999c8](https://github.com/pkp/pkp-lib/commit/27875999c8948ff381eac020f9fd95d89a141b64) · 2011-08-20 · Bruno Beghelli (beghelli)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U09 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a11) · spec U74 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U74-onix-metadata-export.md#a15) · spec U73 [A23](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U73-publication-formats-proof-terms.md#a23), [A24](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U73-publication-formats-proof-terms.md#a24)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence); OMP's book-format windows 2026-10-03, OMP's format "Edit" window 2026-10-04

## Summary

In OMP, a press editor's "OK" in a book format's metadata windows is
refused with no message at all: the window stays open, no field is
marked, and nothing shows at the top right. This happens for a second
"Rest of World?" sales-rights entry, a market "Date" or "Price" holding
only spaces, a publication date shorter than its preselected format, and
a code "Value" of spaces. The editor learns the reason only later, as a
red notice beside the next save's own notice, such as "Market added.".

Windows that do show the reason in place show it a second time. In the
static page window (OJS, OMP) and a book format's "Edit" window (OMP), a
refused "Path" or "URL Path" shows its message under the box. The
corrected save then closes the window and shows the earlier refusal as
a red notice, once per refused save, as if this save had failed. If the
window is closed instead, the notice shows on the next page that loads.

By the code, the galley window (OJS, OPS), the file metadata window and
some plugin settings windows behave like the static page window. All
these windows share one form script, where the fault lies.

## Impact

- **Lost**: nothing is stored wrong, and a refused window stays open.
  In OMP's metadata windows the editor is not told what was refused; if
  they press "Cancel", the window closes without a question and the
  entry is gone.
- **Who**: press editors entering a book format's metadata, each time a
  value is refused; journal and press managers adding static pages, and
  press editors setting a format's "URL Path", each time a path is
  refused (by the code, also editors setting a galley's "URL Path").
- **Way round**: in OMP's metadata windows, guessing from the form which
  value was refused; a corrected value saves. Elsewhere none is needed,
  though a user who believes the late notice may save again or look for
  a fault that is not there.

Low: in every window the task gets done once the value is corrected,
and the open window shows that the refused save did not happen. The
silent refusals in OMP's metadata windows put it near medium; it would
be medium if a window closed on a silent refusal or listed the refused
entry, which was not seen.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS (or OMP), journal (press)
  `publicknowledge`. OPS has no Static Pages plugin, so the steps run on
  OJS or OMP only. Nothing else is needed: step 2 turns on "Static
  Pages Plugin", which the dataset leaves off.
- Steps 9–22 run on OMP only (`main` or `stable-3_5_0`). Steps 9–17
  use submission 4, "How Canadians Communicate: Contexts of Canadian
  Popular Culture", whose one format, "PDF", has no sales rights,
  markets or publication dates in the dataset. Steps 18–22 use
  submission 5, "Bomb Canada and Other Unkind Remarks in the American
  Media", whose one format, "PDF", is kept on the press's site with an
  empty "URL Path" (submission 4's "PDF" is a remote format, whose
  window hides "URL Path").

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

A book format's windows (OMP):

9. As `dbarnes`, open submission 4, "How Canadians
   Communicate…", and go to Publication › "Publication Formats".
10. Press the arrow before "PDF", then "Edit", and open the "Metadata"
    tab.
11. Under "Sales Rights" press "Add Sales Rights", tick "Rest of World?"
    and press "OK". The window closes with "Sales Rights added.".
12. Press "Add Sales Rights" again, tick "Rest of World?" and press "OK".
13. Press "Cancel".
14. Under "Market Territories" press "Add Market". Type one space into
    "Date" and "25" into "Price", and press "OK".
15. Type "20261001" into "Date", replace "Price" with one space, and
    press "OK".
16. Type "25" into "Price" and press "OK".
17. Under "Publication Dates" press "Add publication date", type "2026"
    into "Date" (its "Date Format" is preselected as "YYYYMMDD (H)") and press
    "OK"; then replace it with "20261001" and press "OK".

A book format's "URL Path" (OMP):

18. As `dbarnes`, open submission 5, "Bomb Canada and Other
    Unkind Remarks in the American Media", and go to Publication ›
    "Publication Formats".
19. Press the arrow before "PDF", then "Edit".
20. Type `my pdf` into "URL Path" and press "OK". The window stays open,
    with this message under the box: "This may only contain letters,
    numbers, dashes, underscores and periods."
21. Replace it with `a/b` and press "OK". The same message shows.
22. Replace it with `print-edition` and press "OK".

**Expected**: after step 5 the window closes, "u09ir12 about" is listed,
and nothing shows at the top right. After step 8 the dashboard shows no
notice. At steps 12, 14, 15 and the first "OK" of step 17 the window
stays open and the reason shows at once, as a notice at the top right
(these windows have no message area of their own; that no field is
marked is a separate defect). Step 13 closes the window with no notice,
the reason having shown at step 12. Step 16 shows only "Market added." and the second
"OK" of step 17 only "Publication Date added.". After step 22 the window
closes and nothing shows at the top right (a format's save has no notice
of its own).

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

At steps 12, 14, 15 and the first "OK" of step 17 the window stays open,
nothing is saved, and no message shows, neither in the window nor at the
top right. The box of spaces is emptied (steps 14, 15). Step 13 closes
the window with no notice. Step 16 closes the window and lists the
market, with four notices at the top right:

```
There is already a ROW sales type defined for this publication format.
A date is required and the date value must match the chosen date format.
##grid.catalogEntry.priceRequired##
Market added.
```

The second "OK" of step 17 shows "A date is required and the date value
must match the chosen date format." beside "Publication Date added.".
The raw price code is a missing message key, a separate defect named in
[U17 A6's report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U17-A6-section-or-component-name-of-spaces-raw-code.md).

After step 22 the window closes and "PDF" is saved with the path
`print-edition`. Two red notices stand at the top right, one for each
refused "OK" of steps 20 and 21:

```
This may only contain letters, numbers, dashes, underscores and periods.
This may only contain letters, numbers, dashes, underscores and periods.
```

Control: on a fresh dataset, "PDF" saved with the path `u73m-good` and
no refusal before it shows no notice.

## Cause

`Form::validate()` (`lib/pkp/classes/form/Form.php`, lines 316–329 on
pkp-lib 3dc90c81a6)
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
`DataChangedEvent` and the form is not replaced. The form's
`formSubmitted` event reaches `AjaxModalHandler.formSubmitted()`
(`lib/pkp/js/controllers/modal/AjaxModalHandler.js`, line 101), which
triggers `notifyUser` on the window's parent and closes the window.
That fetch returns the stored refusals with the save's own notice; the
`notifyUser` of line 148 then fetches again and finds nothing. After the
window is closed instead, the next page load fetches because the user
has notifications waiting (`hasSystemNotifications`). `SiteHandler` shows a
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
- OMP's book-format metadata windows (walked):
  `SalesRightsGridHandler::updateRights()`,
  `MarketsGridHandler::updateMarket()`,
  `PublicationDateGridHandler::updateDate()` and
  `IdentificationCodeGridHandler::updateCode()`. Here the late notice is
  the only message. The form builder writes a check's message into a
  field's sub-label only (`FormBuilderVocabulary::_smartyFBVSubLabel()`),
  and these templates draw "Date", "Price" and "Value" without one; the
  "Rest of World?" tick box draws none at all (`form/checkbox.tpl`).
- OMP's format window, for "URL Path" (walked, steps 18–22; the same
  form serves "Add publication format"):
  `PublicationFormatGridHandler::updateFormat()` answers a refusal with
  the redrawn form, and `formatForm.tpl` has no message box. As in the
  static page window, the message under the box shows at once.
- The galley window (code): `ArticleGalleyGridHandler::updateGalley()`
  (OJS) and `PreprintGalleyGridHandler::updateGalley()` (OPS) redraw
  their form, which has no message box. Its "URL Path" refusals (a
  refused character, a number, a path already used) show under the box
  on screen; the late notice was not walked.
- Other windows that redraw a form without a message box (code; whether
  each refusal can be reached from the screen was not checked): the file
  metadata window (`PKPManageFileApiHandler::saveMetadata()`) and the
  settings windows of the Citation Style Language, Announcement Feed,
  PubMed export and Browse block plugins. A developer finds any others
  as handler methods that call `validate()` and answer a refusal with
  `new JSONMessage(true, $form->fetch(…))`, whose template does not
  include `inPlaceNotification.tpl`.
- "Assign Participant" (`StageParticipantGridHandler::saveParticipant()`)
  redraws its form the same way, but today its refusal stores no message
  at all (the report on
  [U35 A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U35-A4-assign-participant-ok-assigns-nobody-no-reason.md)),
  so this fault shows there only once that is repaired.
- `CustomBlockGridHandler::updateCustomBlock()` answers the same way.
  But the browser refuses its only checked field, an empty block name,
  before any save is sent (walked).
- Forms with a message box are not affected (walked: Profile ›
  "Password" with a wrong current password shows the refusal in its box,
  with no notice at the top right).
- Stored data: a refused user's form-error notifications wait until the
  next fetch, show once and are deleted. No repair is needed.

## Proposed fix

When `AjaxFormHandler.handleResponse()` draws the form again, it should
trigger `notifyUser` on the old form's parent, taken before
`replaceWith()`, so that the window's `ModalHandler` and then
`SiteHandler` fetch the stored notification. It skips this when the
redrawn form contains an in-place message box (`.pkp_notification`),
which fetches the notification itself. All the changes are in that one
method, which every form of this kind uses:
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
+				if ($content.find('.pkp_notification').length === 0) {
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
looks only at the redrawn form. It does not ask whether the box is
visible. The box's own handler hides it until it has something to show
(the `NotificationHandler` constructor), and when the box itself would
be out of view it hands the message to the page
(`showNotificationResponseHandler_()`). A `:visible` test would only
pass because jQuery 3 runs the box's ready handler after this check.
The templates carry other `.pkp_notification` elements, for example the
reviewer forms' hidden no-files warning and the file upload container;
none found sits in a form that is redrawn after a refusal without an
in-place box beside it.

Why this fix:

- **It follows existing code.** Publishing `notifyUser` through the
  parent is what `Handler.triggerPublicEvent_()` and
  `NotificationHelper.redirectNotifyUserEvent()` already do.
- **It keeps what ece4902464 was for.** That change made the event fire
  after every answer, refusals included, so that the refusal's
  notification is shown with it.

Tried on `main`, steps 1–22, and the Expected showed: each refusal's
reason appeared at once as a red notice, beside the message under the
box where the window has one, and no good save showed an earlier
refusal ("Add Code" with a "Value" of spaces too). Step 5 saved from
the redrawn window, which shows that the redrawn form's scripts still
run when its HTML is parsed first. Four neighbours behaved the same
with the fix as without it:

- The navigation item window shows its "Path" refusal at once, and only
  "Navigation menu item was successfully added" after the good save.
- Profile › "Password" shows a wrong current password in the form's own
  box, with no notice at the top right.
- A format saved with a good "URL Path" and no refusal before it shows
  no notice.
- "Add publication format" with an empty "Name" is refused in the
  browser with "This field is required.", with no save sent and no
  notice.

**Alternatives**

- Add the message box (`inPlaceNotification.tpl`) to
  `editStaticPageForm.tpl`, as over 40 templates do. This fixes static
  pages only. Each window in the Cause's list needs the same edit, in
  pkp-lib, the three apps and four plugin repositories, and so does
  every new form. It was tried in OMP's sales-rights, market,
  publication-date and code windows, the way their sibling
  representative window has it. The reason showed in the box at the
  window's top. In the long market window the box was scrolled out of
  view, so it passed the reason on as a notice at the top right.
- Answer the refusal with `new JSONMessage(false)`, as the navigation
  item window does. The notice shows at once, but the form is not drawn
  again, so the message under "Path" is lost. It also has to be done
  handler by handler.
- Stop `Form::validate()` from storing the notification on AJAX
  requests. This removes the notice that the `JSONMessage(false)`
  windows and the message-box forms rely on.

**What goes with it**

- The windows in the Cause's list now show their refusal notice at
  once; in OMP's book-format windows that notice is the only message.
  Nothing else changes: no REST API, no plugin hook, and no stored data.
- The U35 A4 report proposes answering the "Assign Participant"
  refusal with `new JSONMessage(false)`. With this fix that change is no
  longer needed for its notice to show. It is still wanted, because it
  keeps the role, person and message the editor chose.
- Backport: `AjaxFormHandler.js` is byte-identical on `main` and in the
  pkp-lib commits the `stable-3_5_0`, `stable-3_4_0` and `stable-3_3_0`
  apps pin, so the diff applies as written.
  Installs that serve the minified bundle (`enable_minified = On`) see
  the change once `js/pkp.min.js` is rebuilt.
- Guard: an e2e scenario in U09 that saves a static page after a refused
  save and finds no notice at the top right (a **Planned** item in the
  spec).

Small: a few lines in one shared pkp-lib file, tried.

## Evidence

- Kept scripts:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-refusal-repeated-after-save/walk.js)
  (steps 1–8, OJS and OMP; OPS has no Static Pages plugin) and
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-refusal-repeated-after-save/neighbour.js)
  (the navigation item window and Profile › "Password", three apps), with
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-refusal-repeated-after-save/lib.js).
  Each script also records every notification request's answer. That
  record shows that at steps 4 and 6 no request is sent. The request
  after step 5 (or after the page load of step 8) returns the
  notification: its title is "Errors occurred processing this form",
  which the red notice does not show, and its text, which the notice
  shows, is the refusal.
  Run: `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/static-page-refusal-repeated-after-save/walk.js`
  on an install freshly reset to the default dataset.
- OMP's book-format windows (steps 9–17):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/catalog-windows-refuse-without-message/walk.js)
  with
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/catalog-windows-refuse-without-message/lib.js)
  takes steps 9–16; `MODE=reach` in front takes step 17 and "Add Code"
  (a "Value" of one space, then a good one: walked, not a step above; it
  behaves like step 14).
  Run: `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js omp shared/playwright/checks/issues/catalog-windows-refuse-without-message/walk.js`.
- OMP's format window (steps 18–22):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/format-url-path-refusal-repeated-after-save/walk.js);
  `MODE=neighbour` in front takes the control (a good path, no refusal
  before it) and "Add publication format" with an empty "Name".
  Run: `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js omp shared/playwright/checks/issues/format-url-path-refusal-repeated-after-save/walk.js`.
  Its record shows no notification request at steps 20 and 21, and the
  request after step 22 returning two "Errors occurred processing this
  form" notifications with the refusal's text.
- Walks, on PostgreSQL:
  - Steps 1–8, 2026-10-02: OJS and OMP on `main` and `stable-3_5_0`,
    the neighbour check on all three apps on `main`, pkp/datasets
    c657990. Tips: `main` OJS 68615b5a32 (pkp-lib 25562b0e1a,
    staticPages 45d02c0), OMP 3b0ecf794 (pkp-lib 3dc90c81a6,
    staticPages 45d02c0), OPS c8af945bb7 (pkp-lib 3dc90c81a6);
    `stable-3_5_0` OJS 3517e640f2 (pkp-lib b1981810da, staticPages
    fb9b499), OMP c7b45f88e (pkp-lib 1fb843f491).
  - Steps 9–17, 2026-10-03: OMP on `main` (steps 9–17) and
    `stable-3_5_0` (steps 9–16; step 17 read in the code, same template
    and handler), pkp/datasets e8dafbc. Tips: `main` OMP 3b0ecf794
    (pkp-lib 3dc90c81a6), `stable-3_5_0` OMP 9c5e24246 (pkp-lib
    cf3f984335).
  - Steps 18–22, 2026-10-04: OMP on `main` and `stable-3_5_0`,
    pkp/datasets 566bb1f. Tips: `main` OMP 3b0ecf794c (pkp-lib
    3dc90c81a6), `stable-3_5_0` OMP 9c5e24246c (pkp-lib cf3f984335).
  - No request failed on the server and no page script failed.
- The fix was tried on `main` only, with `enable_minified = Off`, so the
  sources were served without a build, each walk on a freshly loaded
  dataset. An earlier form of the check (`.pkp_notification:visible`)
  was tried on the three apps with steps 1–8 and the neighbour check.
  The diff as linked was tried on OMP with steps 1–22, "Add Code" and
  the neighbour checks. The format window's neighbour check was also
  walked without the fix.
- Code tips not walked, each app with the pkp-lib commit it pins:
  `stable-3_5_0` OPS 8eaf899468 (pkp-lib 1fb843f491); `stable-3_4_0`
  OJS 75cc2d488b (pkp-lib 32b0f4b4af, staticPages 9568981e8c) and OMP
  0aec65441f (pkp-lib df13621c2d); `stable-3_3_0` OJS ac77c9fb35
  (pkp-lib f6ab331645, staticPages 8c97bd09d4) and OMP 8e72fc8836
  (pkp-lib d446601ebe). `AjaxFormHandler.js` is byte-identical in all
  of them, on `main` and on `stable-3_5_0` (OJS's 3.4 tip has since
  moved to d68934d0d1, pinning pkp-lib 767353f4fe, where it is the same
  file too).
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
  checked for `inPlaceNotification.tpl`. On 3.4 and 3.3 OMP's four
  book-format templates and their handlers read the same as on `main`.
  For the format window, on 3.5, 3.4 (OMP 0aec65441f) and 3.3 (OMP
  8e72fc8836):
  `PublicationFormatGridHandler::updateFormat()` returns the redrawn form
  on a refusal, `PublicationFormatForm` checks "URL Path" with the same
  pattern and message, and `formatForm.tpl` has no message box, as on
  `main`.
- The check without `:visible`: `NotificationHandler`'s constructor hides
  its box and `showNotificationResponseHandler_()` (lines 127–131) hands
  an out-of-view message to the parent; jQuery 3.7.1's `ready()` runs
  through a Deferred, so the redrawn box's handler starts after
  `handleResponse()` returns. The other `.pkp_notification` elements come
  from a search of the three apps' templates and plugins (among them
  `reviewer/review/step3.tpl`'s message box, `authorReadReview.tpl`,
  `install/install.tpl`, the DOAJ plugin's `index.tpl` and OMP's
  `management/context.tpl`); none is in content a form redraws after a
  refusal without an in-place box.
- Introduced: `git blame` on line 148 gives d547b00e0a (2020,
  `pkp/pkp-lib#5865`), which only dropped the event's argument. Before
  it, ece4902464 ("*5762* Trigger notify user event always on form
  submit response handler", 2011-08-20, bruno.beghelli) moved the
  trigger from the success branch to after the redraw. 27875999c8 added
  the form-error notification to `Form::validate()` on the same day.
  `Handler` already published events through `parent()` then (line
  501), so the refusal's notice has been held back since that pair of
  commits, both for pkp bug 5762. There is no PR (the Bugzilla era).
- Upstream, searched 2026-10-02 and 2026-10-04 in pkp/pkp-lib, pkp/ojs,
  pkp/omp, pkp/staticPages and pkp/ui-library. Read and not the same
  fault: `pkp/pkp-lib#11760` (reviewer form errors shown only as a
  passing notice), `pkp/pkp-lib#9759` / `pkp/pkp-lib#9760` (the file
  upload wizard's refusal), `pkp/pkp-lib#3870` and `pkp/pkp-lib#2163`
  (the JS handlers' event routing, a design note).
- Not driven: the galley windows (OJS, OPS), so OPS is in Affects by
  the code only; "Assign Participant", the file metadata window and the
  plugin settings windows in the Reach list.
