# After a refused "Save" on the Profile page's Contact tab, another tab drops the typed values unasked

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** not traced; present since at least [ea8d4cda2f](https://github.com/pkp/pkp-lib/commit/ea8d4cda2f959149b9f5471f858f4defef931355) (2012-07-24)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U03 [A17](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U03-user-profile.md#a17)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

On the Profile page's "Contact" tab, pressing another tab with unsaved
changes asks "The data on this form has changed. Do you wish to
continue without saving?". After a "Save" the server refuses, for
example with "The selected email address is already in use by another
user.", the question no longer comes. The tab still shows everything
the user typed, but pressing another tab opens it at once and discards
those values.

Nothing saved is lost, but every box changed on the tab (phone,
affiliation, signature, mailing address) has to be typed again.

On "Contact" the refusal a user meets is an address already in use: a
malformed address or an empty required box is stopped in the browser
before anything is sent, and that path keeps the question. The same
code serves every refused save on the Profile page's other tabs, and
every older-style form that the server sends back after a refusal, in a
tab or in a window.

## Impact

- **Lost**: the values typed on the tab. No message says they were
  dropped.
- **Who**: any signed-in user whose Contact save the server refuses,
  most often for an email address another account already uses, and
  who then presses another tab.
- **Way round**: correct the refused box and save again. Or change any
  box after the refusal: that brings the question back.

Low: nothing saved is lost, and the loss is a few boxes to type again.
It would be medium if a long text, such as a signature, were often typed
in the same save that gets refused.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS, OMP or OPS, context
  `publicknowledge`. `dbarnes` has the address `dbarnes@mailinator.com`
  and no phone; `rvaca` has `rvaca@mailinator.com`.

Steps:

1. Sign in as `dbarnes`.
2. Open the Profile page (`/index.php/publicknowledge/en/user/profile`;
   "Edit Profile" in the user menu opens the same page) and press the
   "Contact" tab.
3. In "Email address", replace `dbarnes@mailinator.com` with
   `rvaca@mailinator.com`.
4. In "Phone", type `555 0199`.
5. Press the "Identity" tab. The browser asks "The data on this form
   has changed. Do you wish to continue without saving?". Press
   "Cancel": "Contact" stays open with both typed values.
6. Press "Save". "The selected email address is already in use by
   another user." appears at the top right and as the "Email address"
   box's label; the boxes still show `rvaca@mailinator.com` and
   `555 0199`.
7. Press the "Identity" tab.
8. Press the "Contact" tab.

**Expected**: step 7 asks the same question as step 5, and "Cancel"
keeps "Contact" open with `rvaca@mailinator.com` and `555 0199` in the
boxes.

**Observed**: step 7 asks nothing and "Identity" opens at once. At
step 8 "Email address" reads `dbarnes@mailinator.com` and "Phone" is
empty. The save request answers 200 with the refused form inside; no
request fails and no script error shows in the browser.

## Cause

The Contact tab is a legacy AJAX form
(`lib/pkp/templates/user/contactForm.tpl` attaches
`$.pkp.controllers.form.AjaxFormHandler`). The tab-change question is
`TabHandler.tabsBeforeActivate()` (`lib/pkp/js/controllers/TabHandler.js`,
line 135 on `main`), which asks only when the open tab's form handler
has `formChangesTracked` set. A person's change sets it through
`FormHandler.formChange()`.

`ProfileTabHandler::saveContact()` answers a refused save with the form
drawn again, `new JSONMessage(true, $contactForm->fetch($request))`,
holding the posted values and the error labels.
`AjaxFormHandler.handleResponse()` (`lib/pkp/js/controllers/form/AjaxFormHandler.js`,
lines 138–139) puts that HTML in place of the form with
`this.replaceWith(processedJsonData.content)`. The new markup's script
binds a new `AjaxFormHandler`, which starts with `formChangesTracked`
false. Nothing tells it that what it shows was never saved, so the
values on screen count as unchanged until a box changes again. `FormHandler.submitHandler_()` also clears the old handler's flag
and the page's list of unsaved forms when the form is sent (lines
446–449), but that is not what loses this case: the old handler is
replaced either way.

The tab question has read the handler's own flag since ea8d4cda2f
(2012, "use events for tracking form changes"), which moved the check
from the page's list to `formChangesTracked`; the redraw on refusal is
older.

Reach (read in the code, not walked, unless a bullet says so):

- Leaving or reloading the page after the refusal: the new handler
  never sends `formChanged`, so `SiteHandler.pageUnloadHandler_()` has
  no unsaved form and the browser asks nothing.
- The other Profile tabs refused the same way, with the form drawn
  again: Identity, Public ("Homepage URL"), Password and API Key
  (`ProfileTabHandler::saveIdentity()`, `::savePublicProfile()`,
  `::savePassword()`, `::saveAPIProfile()`).
- Every other legacy form, in a tab or a side window, refused by
  drawing the form again: the scan in
  [U08 A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U08-A18-item-window-refused-save-closes-unasked.md)
  counts 47 server responses that send a refused form back
  (`new JSONMessage(true, $form->fetch($request))`) in pkp-lib and the
  three apps. A side window's
  close reads the same flag (`FormHandler.containerCloseHandler()`).
- A successful save also draws the form again on some tabs: Contact on
  `main` and 3.5 (since the invitation API change 011ebb8c2e, 2024),
  API Key (`saveAPIProfile()` answers a success with the form drawn
  again) and Identity (its `refreshForm` event). There an untracked new
  handler is right, since the values are saved. Contact's was checked
  on screen with the fix in and out (Proposed fix).
- A different answer shape, a refusal with `status: false` that keeps
  the form, has its own report with its own fix:
  [U08 A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U08-A18-item-window-refused-save-closes-unasked.md),
  whose reach names the redrawn forms and leaves them to a separate
  change. This report is that change.
- Text typed only into a rich-text box ("Signature", "Mailing Address")
  is never counted as a change at all, refused save or not: another
  fault, [U09 A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U09-A19-static-page-content-change-lost-on-close.md).

## Proposed fix

Make a redrawn form that the server marked in error start as changed,
in pkp-lib's `AjaxFormHandler` constructor
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/contact-refused-save-lost-on-next-tab/fix.diff)).

```diff
 		this.bind('refreshForm', this.refreshFormHandler_);
+
+		// A form the server sent back with a field in error (FBV's
+		// server-side error labels) shows values it refused to save, but
+		// this new handler starts with no changes tracked. Count them as
+		// changed, so leaving the form asks before they are lost.
+		if ($form.find('label.error, span.error').
+				not('.pkp_form_hidden').length) {
+			$form.trigger('formChange');
+		}
 	};
```

The server already marks every refused field the same way:
`FormBuilderVocabulary` gives the field's label the class `error`
(`subLabel.tpl`, `smartyFieldLabel()`) and a section's errors a
`span.error` (`formSection.tpl`), only for fields in the form's
`errorFields`, which `Form::addError()` fills when a check fails. `$form.trigger('formChange')` is how
`ListbuilderHandler` already reports a change the inputs do not see; it
goes through `formChange()`, so the tab question, a side window's close
and the page's leave question all see the form as changed. The
`.pkp_form_hidden` filter skips the one static hidden error label in
the templates (`userGroupForm.tpl`). The fix sits in `AjaxFormHandler`,
not `FormHandler`, because only AJAX forms are drawn again in place; a
full-page form refused by a page load is another flow.

Tried on `main`, OJS, OMP and OPS: with the fix, step 7 asks "The data
on this form has changed. Do you wish to continue without saving?",
"Cancel" keeps `rvaca@mailinator.com` and `555 0199`, and "OK" opens
"Identity". Two checks on what it must leave alone gave the same with
the fix and without it:

- "Contact" opened, nothing changed, then "Identity": no question.
- "Phone" set to `555 0100` and saved (the success also draws the form
  again), then "Identity": no question.

**Alternatives**

- Pass the state with the drawn form, an option such as
  `formChangesTracked: {if $isError}true{/if}` in each template's
  `pkpHandler()` call (`Form::fetch()` assigns `isError`). Explicit,
  but it is one edit per template, and a template missed stays broken.
- Track the form across the redraw in `handleResponse()`. The answer
  does not say whether the redraw is a refusal or a success (Contact's
  success draws the form too), so it would still need the error
  markup.

**What goes with it**

- The forms were not checked one by one. A refusal whose error names a
  field the template does not draw with FBV gets no error label and
  stays as today. A form that calls `addError()` outside a failed save
  would start as changed; the Profile tabs do not (read in the code),
  and a form drawn on first load or after a success carries no error
  label on the Contact tab (seen on screen) and, by the code above, on
  any form whose checks passed.
- With the U08 A18 fix (refusals answered `status: false`), both answer
  shapes of a refused legacy save are covered. The two diffs touch
  different lines and apply together.
- `js/pkp.min.js` is committed in the OJS, OMP and OPS repos and served
  when `enable_minified = On`, so each app needs it rebuilt after the
  pkp-lib change.
- The diff's paths start at the app root (`a/lib/pkp/js/…`): in a
  pkp-lib clone it applies with `git apply -p3`.
- Backport: `AjaxFormHandler.js` is the same file on `stable-3_5_0`,
  `stable-3_4_0` and `stable-3_3_0`, so the diff applies as it stands.
- Guard: a Planned item in spec U03 (its scenario 3 already marks A17):
  after the refused save, pressing another tab asks the question and
  "Cancel" keeps the typed values.

Small: a few lines in one pkp-lib script that cover the three apps,
following an existing pattern, tried on all three. It is a proposal;
the team decides.

## Evidence

- A Playwright script that runs the Steps on installs loaded from PKP's
  default test dataset, all three apps in one run:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/contact-refused-save-lost-on-next-tab/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/contact-refused-save-lost-on-next-tab/lib.js)),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/contact-refused-save-lost-on-next-tab/walk.js`.
  It records each browser box with its words and the answer given, which
  tab is selected after each press, and the boxes' values. The neighbour
  check is
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/contact-refused-save-lost-on-next-tab/neighbour.js),
  run the same way.
- The fix was tried on installs with `enable_minified = Off`, so they
  served the unbuilt script; the rebuilt `pkp.min.js` was not tried.
- Walked 2026-10-03 on PostgreSQL (the fault is in the browser's
  script; the database plays no part), each install freshly loaded from
  pkp/datasets
  [566bb1f](https://github.com/pkp/datasets/commit/566bb1fb7af773fe500f7630170f7cd872fba88d) (2026-10-03):
  - main: OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794c and OPS
    c8af945bb7 (lib/pkp 3dc90c81a6). `AjaxFormHandler.js`,
    `FormHandler.js`, `TabHandler.js` and `ProfileTabHandler.php` are
    the same in the three.
  - stable-3_5_0: OJS c1cee76b95 (lib/pkp 771474347e), OMP 9c5e24246c
    and OPS 38b61882d3 (lib/pkp cf3f984335). Same result on the three
    apps; `AjaxFormHandler.js`, `TabHandler.js` and
    `ProfileTabHandler.php` are the same files as on `main`.
- 3.4, by code: OJS `stable-3_4_0` at d68934d0d1, OMP at 0aec65441f,
  OPS at acd8ae704b, pkp-lib `stable-3_4_0` at 767353f4fe.
  `ProfileTabHandler::saveContact()` answers a refusal with
  `new JSONMessage(true, $contactForm->fetch($request))` (a success with
  a bare `new JSONMessage(true)`), `ContactForm` refuses an address in
  use (`user.register.form.emailExists`), `contactForm.tpl` attaches
  `AjaxFormHandler`, `subLabel.tpl` marks the field `error`, and
  `AjaxFormHandler.js` and `TabHandler.js` are the same files as on
  `main`.
- 3.3, by code: OJS `stable-3_3_0` at ac77c9fb35, OMP at 8e72fc8836,
  OPS at c5532e2161, pkp-lib `stable-3_3_0` at ac3fa73402. The same as
  3.4 (`ProfileTabHandler.inc.php`, `ContactForm.inc.php`).
- Introduced: `git blame` on `TabHandler.js` lines 135–136 gives
  2512498d66 (2020, `pkp/pkp-lib#6057`), which only wrapped the check
  in a `hasHandler()` guard; before it, ea8d4cda2f is where the tab
  check started reading `handler.formChangesTracked`. ea8d4cda2f left
  `AjaxFormHandler.js` alone, and that file already redrew the form
  with `$form.replaceWith(jsonData.content)`. Before it the check read the
  page's list, which `submitHandler_()` also cleared on send; whether
  the question ever survived a refusal was not traced further.
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/ui-library searched 2026-10-03
  for the box's words, "continue without saving", unsaved changes after
  a validation error or failed save, the profile contact email in use,
  `formChangesTracked`, `dataHasChanged` and `AjaxFormHandler` unsaved.
  `pkp/pkp-lib#4352` (the Profile tab question repeating on "Cancel",
  closed 2019) and `pkp/pkp-lib#7869` (a side window closing on save)
  concern other faults.
- Unverified on screen: the page-leave question after a refusal, the
  other Profile tabs' refusals, and the other redrawn forms (all read in
  the code).
