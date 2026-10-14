# Refused saves reappear as red notices at the next save; book-format metadata windows show no reason before

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** pkp bug 5762 (before GitHub, no PR) · [ece4902464](https://github.com/pkp/pkp-lib/commit/ece4902464726f7e6f438981ec7a3e0f1a5db96a) with [27875999c8](https://github.com/pkp/pkp-lib/commit/27875999c8948ff381eac020f9fd95d89a141b64) · 2011-08-20 · Bruno Beghelli (beghelli)
- **Upstream** none found (2026-10-12)
- **Tracked in** spec U09 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a11) · spec U74 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U74-onix-metadata-export.md#a15) · spec U73 [A23](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U73-publication-formats-proof-terms.md#a23), [A24](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U73-publication-formats-proof-terms.md#a24) · spec U46 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U46-galleys.md#a8)
- **Checked** 2026-10-12, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

Update 2026-10-12: the fault also shows in a galley's window on OJS and
OPS (steps 23–30, on `main` and 3.5), and the fix covers it, tried on
both apps. The Cause now says which code asks for the late notice on
`main` and 3.5, where it differs from 3.4 and 3.3. On `main` the file
metadata window is no longer affected.

## Summary

In OMP, a press editor's "OK" in a book format's metadata windows is
refused with no message at all: the window stays open, no field is
marked, and nothing shows at the top right. This happens for a second
"Rest of World?" sales-rights entry, a market "Date" or "Price" holding
only spaces, a publication date with fewer characters than its date
format asks for (a year alone under year-month-day), and a code "Value"
of spaces. The editor learns the reason only later: the next save that
goes through shows its own notice, such as "Market added.", and beside
it a red notice with the reason for the earlier refusal.

Windows that do show the reason in place show it a second time. In the
static page window (OJS, OMP), a galley's window (OJS, OPS) and a book
format's "Edit" window (OMP), a refused "Path" or "URL Path" shows its
message under the box. The corrected save then closes the window and
shows the earlier refusal as a red notice, once per refused save, as if
this save had failed. If the window is closed instead, the notice shows
on the next page that loads.

Both faults have one cause and one fix, in the form script all these
windows share: a refusal's notice is held back until the next save or
page load. With the fix each reason shows when the save is refused. The
silent refusal is OMP's alone, on every version (seen on `main` and
3.5, read in the code of 3.4 and 3.3).

Read in the code and not tried: the settings windows of the Citation
Style Language, Announcement Feed, PubMed export and Browse block
plugins behave like the static page window, and so does the file
metadata window in 3.5 and older.

## Impact

- **Lost**: nothing is stored wrong, and a refused window stays open.
  In OMP's metadata windows the editor is not told what was refused; if
  they press "Cancel", the window closes without asking and what they
  typed, which was never stored, is gone.
- **Who**: press editors entering a book format's metadata, each time a
  value is refused; journal and press managers adding static pages, and
  editors setting the "URL Path" of a galley (OJS, OPS) or a book
  format (OMP), each time a path is refused.
- **Way round**: in OMP's metadata windows, guessing from the form which
  value was refused; a corrected value saves. Reloading the page shows
  the waiting reason as a red notice, but closes the window. Elsewhere
  none is needed, though a user who believes the late notice may save
  again or look for a fault that is not there.

Low: nothing is lost, and the task gets done once the value is
corrected. The silent refusals in OMP's metadata windows put it near
medium. It would be medium if a window closed on a silent refusal, or
if the list behind it showed the refused entry as saved; neither was
seen.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (or `stable-3_5_0`), OJS (or
  OMP), journal (press)
  `publicknowledge`. OPS has no Static Pages plugin, so steps 1–8 run
  on OJS or OMP only. Nothing else is needed: step 2 turns on "Static
  Pages Plugin", which the dataset leaves off.
- Steps 9–22 run on OMP only (`main` or `stable-3_5_0`). Steps 9–17
  use submission 4, "How Canadians Communicate: Contexts of Canadian
  Popular Culture", whose one format, "PDF", has no sales rights,
  markets or publication dates in the dataset. Steps 18–22 use
  submission 5, "Bomb Canada and Other Unkind Remarks in the American
  Media", whose one format, "PDF", is kept on the press's site with an
  empty "URL Path" (submission 4's "PDF" is a remote format, whose
  window hides "URL Path").
- Steps 23–30 run on OJS or OPS (`main` or `stable-3_5_0`); a press
  has no galleys. On OJS they use submission 1, "Signalling Theory
  Dividends", whose newest version is unpublished and has one galley,
  "PDF Version 2", with the "URL Path" `pdf`. On OPS they use preprint
  1, "The influence of lactation on the quantity and quality of
  cashmere production", which is not posted and has one galley, "PDF",
  with an empty "URL Path".

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
   Communicate…"
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=4`),
   and go to Publication › "Publication Formats".
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
    Unkind Remarks in the American Media", by its address
    (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=5`;
    no editor is assigned to it, so "Assigned to me" does not list it),
    and go to Publication › "Publication Formats".
19. Press the arrow before "PDF", then "Edit".
20. Type `my pdf` into "URL Path" and press "OK". The window stays open,
    with this message under the box: "This may only contain letters,
    numbers, dashes, underscores and periods."
21. Replace it with `a/b` and press "OK". The same message shows.
22. Replace it with `print-edition` and press "OK".

A galley's "URL Path" (OJS, OPS):

23. As `dbarnes`, open submission 1
    (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=1`)
    and go to Publication › "Galleys" (OJS on `main`: under "Version of
    Record 1.1"; OPS: Preprint › "Galleys").
24. Press "…" ("More Actions") in the row "PDF Version 2" (OPS: "PDF"),
    then "Edit".
25. Type `123` into "URL Path" and press "Save". The window stays open,
    with this message under the box: "The URL path can not be a number."
26. Replace it with `my galley` and press "Save". The message under the
    box now reads "This may only contain letters, numbers, dashes,
    underscores and periods."
27. Replace it with `u46rf7-pdf` and press "Save".
28. Press "…" and "Edit" again, type `123` into "URL Path" and press
    "Save". The message of step 25 shows.
29. Press "Cancel".
30. Reload the page.

**Expected**: after step 5 the window closes, "u09ir12 about" is listed,
and nothing shows at the top right. After step 8 the dashboard shows no
notice. At steps 12, 14, 15 and the first "OK" of step 17 the window
stays open and the reason shows at once, as a notice at the top right
(these windows have no message area of their own; marking the refused
field is left out of this report's fix, as the Proposed fix says). Step
13 closes the window with no notice,
the reason having shown at step 12. Step 16 shows only "Market added." and the second
"OK" of step 17 only "Publication Date added.". After step 22 the window
closes and nothing shows at the top right (a format's save has no notice
of its own). The same holds after step 27: the window closes and no
notice shows, since a galley's save has none of its own. Steps 29 and
30 show no notice either.

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

After step 27 the window closes and the galley is saved with the path
`u46rf7-pdf`. Two red notices stand at the top right, one for each
refused "Save" of steps 25 and 26:

```
The URL path can not be a number.
This may only contain letters, numbers, dashes, underscores and periods.
```

Step 29 closes the window with no notice. After step 30 the page shows
"The URL path can not be a number." as a red notice. A second reload
shows none.

Control: on a fresh dataset, the galley saved with the path
`u46rf7-ctl` and no refusal before it shows no notice.

## Cause

`Form::validate()` (`lib/pkp/classes/form/Form.php`, lines 316–329 on
pkp-lib 58c7f454ff)
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
has no parent, so the event reaches no other handler, `SiteHandler` on
`body` included. No notification is fetched, and the form-error
notification stays stored.

The next `notifyUser` that reaches `SiteHandler` fetches it, with every
other waiting one. After the good save, the server answers with a
`DataChangedEvent` and the form is not replaced. Which code then asks
for the notifications depends on the version:

- On `main` and 3.5, ui-library's `AjaxModalWrapper.vue` draws the
  window. The legacy modal's own element, the `<div class="pkp_modal
  pkpModalWrapper">` that `ModalRequest.activate()` creates
  (`lib/pkp/js/classes/linkAction/ModalRequest.js`, lines 95–98), is
  never put on the page: `ModalHandler.modalOpen()` only triggers
  `pkpModalOpen`. So the `notifyUser` that
  `AjaxModalHandler.formSubmitted()` triggers on that element's parent
  (`AjaxModalHandler.js`, line 101) goes nowhere too. The fetch comes
  from the form's `dataChanged` event, which the wrapper's
  `passToHandlerElement()` receives. In a window a grid opened, it
  hands the event to the modal handler, which publishes it over its
  event bridge (`Handler.triggerPublicEvent_()`) to the link action
  that opened the window, and `LinkActionHandler.dataChangedHandler_()`
  (line 257) triggers `notifyUser` from the grid. In a window a Vue
  page opened (the galley's), there is no modal handler, and
  `passToHandlerElement()` triggers `notifyUser` on `body` itself.
- On 3.4 and 3.3 (code), `modalOpen()` appends the modal's element to
  `body` and the form sits inside it. The link action's `notifyUser`
  and that of `AjaxModalHandler.formSubmitted()` both reach
  `SiteHandler`.

That fetch returns the stored refusals with the save's own notice; the
`notifyUser` of line 148, sent from a form that is still on the page,
then fetches again and finds nothing. After the
window is closed instead, the next page load fetches because the user
has notifications waiting (`hasSystemNotifications`). `SiteHandler` shows a
`notifyFormError` notification as a warning toast, the red notice.

Two kinds of window escape this:

- A form that carries its own message box (an in-place notification,
  `controllers/notification/inPlaceNotification.tpl`, included by over
  40 templates such as `user/changePassword.tpl`) fetches the waiting
  notifications as soon as it is drawn again. `editStaticPageForm.tpl`
  has no such box.
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
  the redrawn form, and `formatForm.tpl` has no message box.
- The galley window, for "URL Path" (walked, steps 23–30; "Add galley"
  walked too): `ArticleGalleyGridHandler::updateGalley()` (OJS) and
  `PreprintGalleyGridHandler::updateGalley()` (OPS) answer a refusal
  with the redrawn form, and `articleGalleyForm.tpl` /
  `preprintGalleyForm.tpl` has no message box. On `main` and 3.5 the
  Vue "Galleys" page opens this window (`openLegacyModal()`); on 3.4
  and 3.3 the galley grid opens it as an `AjaxModal`, as the static
  page grid does (code).
- Other windows that redraw a form without a message box (code; whether
  each refusal can be reached from the screen was not checked): the
  settings windows of the Citation Style Language, Announcement Feed,
  PubMed export and Browse block plugins, and on 3.5 and older the file
  metadata window (`PKPManageFileApiHandler::saveMetadata()`). On `main`
  the file metadata window is a Vue form, which triggers `notifyUser`
  itself when a save is refused (`useFileMetadataForm.js`, ui-library
  881503b4 for `pkp/pkp-lib#12584`). A developer
  finds any others as handler methods that call `validate()` and answer
  a refusal with `new JSONMessage(true, $form->fetch(…))`, whose
  template does not include `inPlaceNotification.tpl`.
- "Assign Participant" (`StageParticipantGridHandler::saveParticipant()`)
  redraws its form the same way, but today its refusal stores no message
  at all (the report on
  [U35 A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U35-A4-assign-participant-ok-assigns-nobody-no-reason.md)),
  so this fault shows there only once that is repaired.
- `CustomBlockGridHandler::updateCustomBlock()` answers the same way.
  But the browser refuses its only checked field, an empty block name,
  before any save is sent (walked).
- Forms with a message box are not affected (walked: Profile ›
  "Password", among the fix's neighbours).
- Stored data: none to repair. A waiting notification is deleted when
  it is shown.

## Proposed fix

When `AjaxFormHandler.handleResponse()` draws the form again, it should
trigger `notifyUser` on the old form's parent, taken before
`replaceWith()`, so that `SiteHandler` fetches the stored notification.
It skips this when the
redrawn form contains an in-place message box (`.pkp_notification`),
which fetches the notification itself. All the changes are in that one
method, which every form of this kind uses:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-refusal-repeated-after-save/fix.diff).
Its paths are relative to the app: apply it with `git apply` from the
app's root, or with `git apply -p3` inside pkp-lib.

The path the event takes differs by version:

- On `main` and 3.5 the form's parent is on the page, inside the window
  `AjaxModalWrapper.vue` draws, and no handler that takes `notifyUser`
  stands between it and `body`. The event bubbles straight to
  `SiteHandler`, in a window a grid opened as in one a Vue page opened
  (tried on `main`).
- On 3.4 and 3.3 the form sits inside the modal handler's element.
  `ModalHandler.redirectNotifyUserEventHandler_()` gets the event
  first; `NotificationHelper.redirectNotifyUserEvent()` finds no
  message box to give it to and passes it on to `SiteHandler` (line
  174). This path is read in the code, not tried.

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
looks only at the redrawn form. The check does not test `:visible`. The
box's handler hides the box until it has a message, and it starts only
after this check has run, so a `:visible` test would find the box by an
accident of timing. A box scrolled out of view hands its message to the
page itself (`showNotificationResponseHandler_()`).

The skip rests on three things, each true of today's templates:

- **The box asks for the form's refusal.** An in-place box included
  with `requestOptions` fetches only what they name. Two includes pass
  them: `authorDashboard/reviewRoundInfo.tpl`, which is no form, and
  OMP's `publicationMetadataFormFields.tpl`, whose options name the
  trivial level, the form-error notification's.
- **The box sits inside the form.** `find()` looks below the answer's
  top-level nodes, not at them. Every include of
  `inPlaceNotification.tpl` in a form's template stands inside its
  `<form>`. Adding `.filter('.pkp_notification')` beside `find()` would
  drop this assumption (not tried).
- **No other `.pkp_notification` misleads it.** The templates carry
  such elements that are not in-place boxes, for example the reviewer
  forms' hidden no-files warning and the file upload container. Every
  one found is either outside any form a refusal redraws, or in a form
  that has an in-place box too.

The fix does not mark the refused field. In OMP's four book-format
windows the reason then shows at once, but at the top right only.
Marking "Date", "Price", "Value" and the tick box needs a message place
in each of those templates, a separate change this report does not
propose and no other report covers.

Why this fix:

- **It follows existing code.** Publishing `notifyUser` through the
  parent is what `Handler.triggerPublicEvent_()` and
  `NotificationHelper.redirectNotifyUserEvent()` already do.
- **It keeps what ece4902464 was for.** That change made the event fire
  after every answer, refusals included, so that the refusal's
  notification is shown with it.

Tried on `main`, steps 1–30, and the Expected showed: each refusal's
reason appeared at once as a red notice, beside the message under the
box where the window has one, and no good save showed an earlier
refusal ("Add Code" with a "Value" of spaces and "Add galley" with a
"URL Path" of `123` too). No notice waited for the reload of step 30.
Step 5 saved from the redrawn window, which shows that the redrawn
form's scripts still run when its HTML is parsed first. Six neighbours
behaved the same with the fix as without it:

- The navigation item window shows its "Path" refusal at once, and only
  "Navigation menu item was successfully added" after the good save.
- Profile › "Password" shows a wrong current password in the form's own
  box, with no notice at the top right.
- A format saved with a good "URL Path" and no refusal before it shows
  no notice.
- "Add publication format" with an empty "Name" is refused in the
  browser with "This field is required.", with no save sent and no
  notice.
- A galley saved with a good "URL Path" and no refusal before it shows
  no notice.
- "Add galley" with an empty "Galley Label" is refused in the browser
  with "This field is required.", with no save sent and no notice.

**Alternatives**

- Add the message box (`inPlaceNotification.tpl`) to
  `editStaticPageForm.tpl`, as over 40 templates do. This fixes static
  pages only. Each window in the Cause's list needs the same edit, in
  pkp-lib, the three apps and four plugin repositories, and so does
  every new form. It was tried in OMP's sales-rights, market,
  publication-date and code windows, as `representativeForm.tpl`, the
  "Representatives" window of the same tab, includes it. The reason
  showed in the box at the
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

- Nothing else changes: no REST API, no plugin hook, and no stored data.
- The U35 A4 report proposes answering the "Assign Participant"
  refusal with `new JSONMessage(false)`. With this fix that change is no
  longer needed for its notice to show. It is still wanted, because it
  keeps the role, person and message the editor chose.
- Backport: `AjaxFormHandler.js` is byte-identical on `main` and in the
  pkp-lib commits the `stable-3_5_0`, `stable-3_4_0` and `stable-3_3_0`
  apps pin, so the diff applies as written. On 3.5 the event takes the
  path tried on `main`: the modal, link action and form scripts are the
  same files, and the wrapper relays the same events. On 3.4 and 3.3 it
  passes through `ModalHandler` first, a path read and not tried, so
  one try there should come before a backport below 3.5.
  Installs that serve the minified bundle (`enable_minified = On`) see
  the change once `js/pkp.min.js` is rebuilt.
- Guard: an e2e scenario in U09 that saves a static page after a refused
  save and finds no notice at the top right, and one in U46 that saves
  a galley after two refused "URL Path" values and finds none either
  (a **Planned** item in each spec).

Small: a few lines in one shared pkp-lib file, tried.

## Evidence

- Kept scripts. Each takes its steps on an install freshly reset to the
  default dataset and records every notification request's answer.
  They run in pkp-e2e's harness as
  `PROBE_FEATURE=<the dataset install's feature name> PROBE_AGENT=<any short id> node bin/probe.js <app|all> <script>`:
  - Steps 1–8 (OJS, OMP):
    [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-refusal-repeated-after-save/walk.js)
    with
    [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-refusal-repeated-after-save/lib.js).
    Its record shows that at steps 4 and 6 no request is sent. The
    request after step 5 (or after the page load of step 8) returns
    the notification: its title is "Errors occurred processing this
    form", which the red notice does not show, and its text, which the
    notice shows, is the refusal.
  - Steps 9–17 (OMP):
    [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/catalog-windows-refuse-without-message/walk.js)
    with
    [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/catalog-windows-refuse-without-message/lib.js)
    takes steps 9–16; `MODE=reach` in front takes step 17 and "Add
    Code" (a "Value" of one space, then a good one: walked, not a step
    above; it behaves like step 14).
  - Steps 18–22 (OMP):
    [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/format-url-path-refusal-repeated-after-save/walk.js);
    `MODE=neighbour` in front takes its two neighbour checks. Its
    record shows no notification request at steps 20 and 21, and the
    request after step 22 returning two "Errors occurred processing
    this form" notifications with the refusal's text.
  - Steps 23–30 (OJS, OPS):
    [galley.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-refusal-repeated-after-save/galley.js);
    `MODE=nb` in front takes its two neighbour checks. `MODE=reach`
    takes "Add galley" with "Galley Label" `u46rf7 new` and "URL Path"
    `123`, then `u46rf7-new` (walked, not a step above: the refusal
    shows under the box, and the good "Save" opens the upload window
    with the red notice "The URL path can not be a number." over it).
    Its record shows no notification request at steps 25, 26, 28 and
    29. The first request after step 27 returns two "Errors occurred
    processing this form" notifications, and the request of step 30's
    page load returns one.
  - The navigation item window and Profile › "Password" (three apps):
    [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-refusal-repeated-after-save/neighbour.js).
- Walks, 2026-10-12, on PostgreSQL, pkp/datasets fac2371 (2026-10-11):
  - Steps 1–8 on OJS and OMP, steps 9–22 on OMP ("Add Code" too) and
    steps 23–30 on OJS and OPS, each on `main` and `stable-3_5_0`,
    with the same results on the two branches. "Add galley" on OJS and
    OPS `main`.
  - Tips, `main`: OJS d0b69b108d (pkp-lib 1ec9023e8a, staticPages
    45d02c085e), OMP eb4c30aa3c (pkp-lib 58c7f454ff, staticPages
    45d02c085e), OPS 8d04ca333c (pkp-lib 58c7f454ff), each with
    ui-library 38814ea159.
  - Tips, `stable-3_5_0`: OJS c90dfdb577 (pkp-lib f4f8fcdbc0,
    staticPages fb9b499e6f), OMP 486cbf9eb0 (pkp-lib 8094f06bf5,
    staticPages fb9b499e6f), OPS 399c4ebca3 (pkp-lib 8094f06bf5), each
    with ui-library 2576e00afd.
  - Where the walks differ from the text: every workflow was opened by
    its address, submission 4's too. On 3.5 the "Galleys" link sits
    right under "Publication" (no version entries).
  - No request of a walked window failed on the server. One page
    script failed, once, on OJS 3.5 with the static page window open:
    "Cannot read properties of undefined (reading 'serialize')", the
    fault of
    U09 A20 ([pkp-e2e#376](https://github.com/jardakotesovec/pkp-e2e/issues/376)).
    The steps went on unchanged.
- The fix was tried on `main` only, with `enable_minified = Off`, so the
  sources were served without a build, each walk on a freshly loaded
  dataset:
  - 2026-10-12, on OJS (steps 1–8 and 23–30) and OPS (steps 23–30),
    with "Add galley" and the neighbour checks (`MODE=nb` and
    neighbour.js) on both apps. The neighbour checks were also walked
    without the fix, with the same results.
  - 2026-10-03 and 2026-10-04, on OMP with steps 1–22, "Add Code" and
    the neighbour checks; the format window's neighbour check also
    without the fix. Not repeated on 2026-10-12: neither the diff nor
    `AjaxFormHandler.js` has changed since.
- Branch tips read and not walked, each app with the pkp-lib commit it
  pins: `stable-3_4_0` OJS daf0ca971d (pkp-lib 55c8e406b3, staticPages
  9568981e8c), OMP 0aec65441f (pkp-lib df13621c2d) and OPS acd8ae704b
  (pkp-lib df13621c2d); `stable-3_3_0` OJS d7d9dd14ec (pkp-lib
  5e84acd11b, staticPages 8c97bd09d4), OMP 8e72fc8836 (pkp-lib
  d446601ebe) and OPS c5532e2161 (pkp-lib d446601ebe).
- Code reads. Everything the Cause and its Reach name was read on all
  four branches, in the Static Pages plugin at each branch's pinned
  commit too. The names that differ on old branches: `Form.inc.php` on
  3.4 and 3.3, and on 3.3 OPS's galley classes and files are
  `ArticleGalley…`. The reach list comes from a search of pkp-lib and
  the three apps, plugins included, for handler methods that call
  `validate()` and return `new JSONMessage(true, $form->fetch(…))`,
  with each form's template checked for `inPlaceNotification.tpl`.
- Which code sends the late request rests on the code alone. The
  walks' records show the requests (two after each good save, the first
  one carrying the refusals), not what triggered them. Read for it:
  `ModalRequest.activate()`, `ModalHandler.modalOpen()`,
  `AjaxModalHandler.formSubmitted()`,
  `LinkActionHandler.dataChangedHandler_()` and
  `Handler.triggerPublicEvent_()`, with `AjaxModalWrapper.vue`
  (`passToHandlerElement()`) and `useGalleyManagerActions.js`. The four
  modal and link action files are identical on the `main` and 3.5
  pins; `Handler.js` differs there only in its TinyMCE toolbar code.
  On the 3.4 and 3.3 pins `modalOpen()` holds
  `$body.append($handledElement)`, `formSubmitted()` triggers at line
  97, and `ArticleGalleyGridRow` opens "Edit" as an `AjaxModal`.
- The fix's skip condition. 59 templates include
  `inPlaceNotification.tpl`; the two that pass `requestOptions` and the
  place of each include in its `<form>` were read on `main`.
  `NotificationHandler`'s constructor hides its box, and jQuery 3.7.1's
  `ready()` runs through a Deferred, so the redrawn box's handler
  starts after `handleResponse()` returns. The other
  `.pkp_notification` elements come from a search of the three apps'
  templates and plugins (among them `reviewer/review/step3.tpl`'s
  message box, `authorReadReview.tpl`, `install/install.tpl`, the DOAJ
  plugin's `index.tpl` and OMP's `management/context.tpl`).
- A reload showing the waiting reason in OMP's metadata windows (the
  Impact's way round): seen when U74 A15 was first probed (2026-09-28,
  two runs; the spec's note on that entry). Not walked again; the page
  load that fetches it is the one steps 8 and 30 show.
- Introduced: `git blame` on line 148 gives d547b00e0a (2020,
  `pkp/pkp-lib#5865`), which only dropped the event's argument. Before
  it, ece4902464 ("*5762* Trigger notify user event always on form
  submit response handler", 2011-08-20, bruno.beghelli) moved the
  trigger from the success branch to after the redraw. 27875999c8 added
  the form-error notification to `Form::validate()` on the same day.
  `Handler` already published events through `parent()` then (line
  501), so the refusal's notice has been held back since that pair of
  commits, both for pkp bug 5762. There is no PR (the Bugzilla era).
- Upstream, searched in pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/staticPages
  and pkp/ui-library. Read and not the same
  fault: `pkp/pkp-lib#11760` (reviewer form errors shown only as a
  passing notice), `pkp/pkp-lib#9759` / `pkp/pkp-lib#9760` (the file
  upload wizard's refusal), `pkp/pkp-lib#3870` and `pkp/pkp-lib#2163`
  (the JS handlers' event routing, a design note).
- Driven by nobody: "Assign Participant", the plugin settings windows
  in the Reach list, and the file metadata window (on 3.5 its template
  still starts `AjaxFormHandler`).
- Not driven by this report's scripts, but by an earlier check
  ([i09.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/U46/I09/i09.js),
  2026-10-09, `main`, a scratch journal and server), with the same late
  notice: in the galley window, the header "Close" after a refusal, the
  third refusal (a path another galley of the version has) and roles
  other than `dbarnes`.
