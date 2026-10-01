# A refused static page "Path" reappears at the top right: after the corrected save, or on the next back-office page

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** `pkp/staticPages`, the first commit with the plugin's code (no PR) · [c4eb40e30d](https://github.com/pkp/staticPages/commit/c4eb40e30d447068335e9adb735d0e1aa0ab13a8) · 2014-09-23 · Alec Smecher (asmecher)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U09 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a11)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

After a refused "Save" in the static page window, the next successful
save shows the old refusal at the top right. The refusal first shows
under "Path" inside the window, which stays open. When the manager
corrects the path and saves, the window closes and the page is listed,
and the same message appears again as a warning at the top right. It is
the only notice, since this window shows no message on a good save.

If the manager closes the window after the refusal instead, the message
appears at the top right of the next back-office page they open:
Settings › Website again, "Submissions" or any other. Every refusal
comes back once, so two refusals before a good save give two notices.

## Impact

- **Lost.** Nothing. The manager is told the save failed and may check
  the list or save again to be sure.
- **Who.** Journal and press managers who add or edit static pages,
  each time a "Path" is refused: a space or another character that is
  not allowed, or a path another static page already uses.
- **Way round.** None needed.

Low rather than medium, because the list beside the notice shows the
page saved.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (the same on `stable-3_5_0`), OJS or
  OMP.
- In the dataset, "Static Pages Plugin" is installed but unticked, so
  steps 3 and 4 turn it on.

Refused, then corrected:

1. Sign in as `rvaca` (the journal or press manager).
2. Open Settings › Website
   (`/index.php/publicknowledge/en/management/settings/website`), tab
   "Plugins".
3. Under "Generic Plugins", tick "Static Pages Plugin". "The plugin
   "Static Pages Plugin" has been enabled." shows at the top right.
4. Reload the page and open the tab "Static Pages".
5. Press "Add Static Page". Type "Path" `u09a11 about` (with a space) and
   "Title" `u09a11 About`, then press "Save".
6. Change "Path" to `u09a11-about` and press "Save".

Refused, then closed:

7. Press "Add Static Page". Type "Path" `u09a11-about` (the path just
   used) and "Title" `u09a11 Again`, then press "Save".
8. Close the window with its back arrow ("Close").
9. Reload Settings › Website.

Two refusals, then another page (after steps 1-4):

10. Press "Add Static Page". Type "Path" `u09a11 one` and "Title"
    `u09a11 More`, then press "Save".
11. Change "Path" to `u09a11 two` and press "Save".
12. Change "Path" to `u09a11-more` and press "Save".
13. Press "Add Static Page". Type "Path" `u09a11-more` and "Title"
    `u09a11 More again`, then press "Save".
14. Close the window with its back arrow.
15. Open "Submissions".

**Expected.** Each refusal (steps 5, 7, 10, 11, 13) shows its message
under "Path" and keeps the window open, with no notice at the top right.
Each good save (steps 6, 12) closes the window and lists the page, with
no notice. Steps 9 and 15 load their page with no notice.

**Observed.** The refusals behave as expected: "The path field must
contain only alphanumeric characters plus '.', '/', '-', and '_'."
(steps 5, 10, 11) or "This path already exists for another static
page." (steps 7, 13) under "Path", and nothing at the top right. Then:

- Step 6: the window closes and the list shows "u09a11 About" at
  "u09a11-about". A notice at the top right reads "The path field must
  contain only alphanumeric characters plus '.', '/', '-', and '_'.".
- Step 9: a notice at the top right reads "This path already exists for
  another static page.".
- Step 12: two notices at the top right, each reading "The path field
  must contain only alphanumeric characters plus '.', '/', '-', and
  '_'.".
- Step 15: the "Submissions" page shows "This path already exists for
  another static page." at the top right.

Each notice comes from the page's request for pending notices. Its
answer holds the refusal stored at the earlier "Save" (step 6 shown;
`1` is the trivial level):

```
GET …/notification/fetchNotification → 200
{"status":true,"content":{"inPlace":{…},"general":{"1":{"318":{"title":"Errors occurred processing this form","text":"The path field must contain only alphanumeric characters plus '.', '/', '-', and '_'.","addclass":"notifyFormError",…}}}}}
```

Setup › "Navigation" › "Add item" works the other way, as the control:
a refused "Path" shows as a notice straight away, and the corrected
"Save" shows only "Navigation menu item was successfully added".

## Cause

A refused legacy form also leaves its refusal behind as a notice.
`Form::validate()` creates a trivial notification of type
`NOTIFICATION_TYPE_FORM_ERROR` for the signed-in user, with the error
messages, whenever the form is invalid
([`Form.php` lines 320-328](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/classes/form/Form.php#L320-L328)).
The notice is stored until a page asks for pending notices
(`NotificationHandler::fetchNotification()`), which shows it and deletes
it. Each refusal stores one.

A window that sends the form back with its errors is meant to collect
that notice at once. pkp-lib's form templates carry an in-place notice
area for this, `controllers/notification/inPlaceNotification.tpl` (for
example
[`navigationMenuItemsForm.tpl` line 26](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/templates/controllers/grid/navigationMenus/form/navigationMenuItemsForm.tpl#L26)).
Its script fetches pending notices as soon as the returned form is drawn
and shows them inside the window.

`StaticPageGridHandler::updateStaticPage()` sends the form back on a
refusal (`new JSONMessage(true, $staticPageForm->fetch($request))`,
[line 202](https://github.com/pkp/staticPages/blob/45d02c085ee125bf390f89e5bff1f0833838a647/controllers/grid/StaticPageGridHandler.php#L202)),
but
[`templates/editStaticPageForm.tpl`](https://github.com/pkp/staticPages/blob/45d02c085ee125bf390f89e5bff1f0833838a647/templates/editStaticPageForm.tpl#L24-L25)
has no such area, and never had one. So nothing collects the notice
while the window is open. `AjaxFormHandler::handleResponse()` does
trigger `notifyUser` after drawing the returned form
([line 148](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/js/controllers/form/AjaxFormHandler.js#L148)),
but from the form element it has just replaced. That element is no
longer on the page, so no handler hears the event.

The notice therefore waits for the page's next fetch:

- A good "Save" closes the window, and
  `AjaxModalHandler::formSubmitted()` triggers `notifyUser` on the page.
- Every back-office page counts the user's pending trivial notifications
  when it is built (`PKPTemplateManager::setupBackendPage()`,
  `hasSystemNotifications`), and `SiteHandler` fetches them on load.
  Reader-facing pages do not.

`SiteHandler::showNotification_()` shows each `notifyFormError` as a
warning at the top right.

Reach:

- **Which refusals count.** The browser checks a form's required fields
  before it sends anything (a required check in the form class gives
  the field the `required` class, which the page's jQuery validation
  enforces), so an empty required field never reaches the server. Only
  a check the browser does not know reaches it and leaves a notice: a
  value's format, or a value already in use.
- **The static page window.** A "Path" with characters that are not
  allowed and a "Path" already in use (both walked). An empty "Path" or
  primary-language "Title" is stopped in the browser (code).
- **Other windows that send the form back without the area** and have
  such a check (code, not walked):
  - OJS's galley window, on a "URL Path" with characters that are not
    allowed (`articleGalleyForm.tpl`, `ArticleGalleyGridHandler::updateGalley()`).
  - OJS's "URN" settings window (`plugins/pubIds/urn/templates/settingsForm.tpl`,
    sent back by `PKPPubIdPlugin::manage()`), on a prefix or suffix
    pattern it refuses.

  The custom block window (`pkp/customBlockManager`) also lacks the
  area, but its one check is a required "Block Name", which the browser
  stops first. The search covered the form templates of OJS, OMP,
  pkp-lib and the bundled plugins that attach a form handler without
  `inPlaceNotification.tpl`. It kept those whose handler sends the form
  back on a refusal. It is not exhaustive.
- **Windows that carry the area**, or that answer a refusal with
  `{"status":false}`, show the refusal at once and not again. The
  Navigation item window was walked.
- **Stored data.** None. A pending notice is deleted the first time it
  is shown.

## Proposed fix

Give the static page window the in-place notice area that pkp-lib's form
templates carry, in `pkp/staticPages`' `templates/editStaticPageForm.tpl`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-refusal-notice-repeated/fix.diff),
paths from the app root):

```diff
 <form class="pkp_form" id="staticPageForm" method="post" action="{$actionUrl}">
 	{csrf}
+	{include file="controllers/notification/inPlaceNotification.tpl" notificationId="staticPageFormNotification"}
 	{if $staticPageId}
```

This is the pattern of pkp-lib's own form templates
(`navigationMenuItemsForm.tpl`, `announcementTypeForm.tpl`) and of the
bundled plugins' settings forms (Google Analytics, Web Feed, PFL, OAI
JATS). The area fetches the refusal's notice when the returned form is
drawn and shows it at the top of the window, above the message under
"Path". The notice is used up there.

It has two side effects, the same as in every window that carries the
area:

- The area also fetches when the window first opens. A notice still
  pending from elsewhere at that moment shows inside the window instead
  of at the top right.
- When the area is scrolled out of view, it passes the notice up to the
  page, which shows it at the top right
  (`NotificationHandler::showNotificationResponseHandler_()`).

**Tried** on `main` in OJS and OMP. With the fix, steps 5 and 7 show
"Errors occurred processing this form" and the refusal at the top of the
window, as well as the message under "Path". Steps 6 and 9 show no
notice. Two checks read the same with and without the fix: a first
"Save" with nothing refused shows no notice, and the Navigation item
window behaves as in Observed.

**Alternatives**

- **Trigger `notifyUser` from the returned form** in pkp-lib's
  `AjaxFormHandler::handleResponse()`. This covers every window in Reach
  at once. But in each such window it would also show the refusal at the
  top right, beside the message under the field, changing forms nobody
  reported. It needs a JavaScript build, and it departs from the in-place
  area the code base uses. Not tried.
- **Not storing the notice in `Form::validate()`.** Forms whose handlers
  answer a refusal with `{"status":false}` and put no message under the
  field rely on it, so this would silence their refusals.

**What goes with it**

- **The other windows in Reach** take the same line, in their own
  repositories.
- **Backport.** The line applies as written to 3.5, and with an offset
  to 3.4 and 3.3, whose templates hold the same `{csrf}` line.
- **A test.** An end-to-end check in the Static Pages plugin's own tests
  (or the e2e scenario for U09): a refused "Path", then a corrected
  "Save", with no notice after it.

Small: one line in one plugin template, and one test.

## Evidence

- **The kept script.**
  [`shared/playwright/checks/issues/static-page-refusal-notice-repeated/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-refusal-notice-repeated/walk.js)
  takes the Steps on an install freshly loaded from the default dataset
  (pkp/datasets 38ab955, 2026-09-30):
  `ONLY=ojs,omp node bin/probe.js all shared/playwright/checks/issues/static-page-refusal-notice-repeated/walk.js [neighbour | more]`.
  With no argument it walks steps 1-9. `more` walks steps 1-4 and 10-15
  on a fresh install. `neighbour` walks the two checks: a first "Save"
  and the Navigation item window.
- **The fix trial.**
  `node bin/try-fix.js apply shared/playwright/checks/issues/static-page-refusal-notice-repeated/fix.diff ojs omp`,
  then `revert`.
- **Walked.** Steps 1-9 on `main` and `stable-3_5_0`, OJS and OMP, on
  PostgreSQL. Steps 10-15 on `main`, OJS and OMP (2026-10-01).
- **Branch tips.**
  - `main`: OJS bade233f73, OMP 3b0ecf794. pkp-lib 2e377d27fc (OJS) and
    3dc90c81a6 (OMP). pkp/staticPages 45d02c085e (both apps).
  - `stable-3_5_0`: OJS 92b9a16b48, OMP 3081c9b00. pkp-lib a9c76aed62.
    pkp/staticPages fb9b499.
  - `stable-3_4_0`: OJS 9571d8fde7, OMP 0aec65441. pkp-lib df13621c2d.
    pkp/staticPages 9568981e8c.
  - `stable-3_3_0`: OJS 9fdb9bcf9a, OMP 8e72fc883. pkp-lib d446601ebe.
    pkp/staticPages 8c97bd09d4.
- **The 3.4 and 3.3 code.** The static page template at the pointers both
  branches record has no in-place notice area. Its grid handler sends the
  form back on a refusal (`new JSONMessage(true, $staticPageForm->fetch($request))`).
  pkp-lib's `Form::validate()` creates the same `FORM_ERROR` trivial
  notification (3.3: `Form.inc.php`), and `NotificationHandler.js` is the
  same, so a refusal waits for the next fetch there too.
- **The introducing commit.** The repository's first commit, 75c5752
  (2014-09-22), holds only the licence. c4eb40e30d added the plugin's
  code, with the template at the root as `editStaticPageForm.tpl`. `git
  log` on the template, and `-S` for `inPlaceNotification`, show the
  area was never in it. The GitHub API lists no PR for c4eb40e30d. The
  stored notice dates from pkp-lib 27875999c8 (2011, "*5762* Create
  notification with form errors"), and the `notifyUser` after a form
  response from ece4902464 (2011, the same issue). That event has come
  from the replaced form element since then; d547b00e0a
  (`pkp/pkp-lib#5865`) only dropped its argument.
- **The Upstream search**, on 2026-09-30.
  - Searched by: form error notification, "Errors occurred processing
    this form", static pages path error, old error after save,
    `NOTIFICATION_TYPE_FORM_ERROR`, `createTrivialNotification`,
    `inPlaceNotification`.
  - Searched in: pkp/pkp-lib, pkp/ojs, pkp/staticPages,
    pkp/customBlockManager and pkp/ui-library.
  - `pkp/pkp-lib#11760` is about the review form's own error display,
    not a repeated notice.
- **Not walked.** The other windows in Reach, MySQL, 3.4 and 3.3. The
  fault does not depend on the database.
