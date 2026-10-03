# "Cancel" on the profile's Password tab does nothing, and turns off the unsaved-change question

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#491` for `pkp/pkp-lib#478` · [90a749ab58](https://github.com/pkp/pkp-lib/commit/90a749ab58dfc4a7d1195b275f641e9b126e6384) · 2015-04-21 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-03); `pkp/pkp-lib#6654` (closed, fixed) removed the same dead "Cancel" from the forced "Change Password" page only
- **Tracked in** spec U03 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U03-user-profile.md#a12)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

On the "Password" tab of their profile, a user who has typed in the
three password boxes and presses "Cancel" under the form expects the
boxes to be emptied. Nothing visible happens: the typed passwords stay
in the boxes.

"Cancel" does turn off one thing: the question "The data on this form
has changed. Do you wish to continue without saving?", which the profile
asks when another tab is pressed while the boxes hold typed passwords.
After "Cancel", the next tab opens without it. The fix hides "Cancel",
as on the other profile tabs.

## Impact

- **Lost**: nothing. A "Save" after "Cancel" would store the passwords
  still in the boxes. Losing the question adds no harm: the next tab
  drops the typed passwords unasked, which is what "Cancel" was pressed
  for. It stays off until a box is changed again and loses focus.
- **Who**: every signed-in user, on Profile › "Password", in every
  journal, press or server and on the site-wide profile.
- **Way round**: clear the boxes by hand, or press another tab of the
  profile, which drops the typed passwords; the Password tab opens empty
  again when pressed.

Low: nothing is lost. It would be medium if users were found to save a
password change after pressing "Cancel", believing it discarded.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS, OMP or OPS `main`. Nothing else is
  needed.

Steps:

1. Sign in as `dbarnes`.
2. Open the profile: the user menu › "Edit Profile"
   (`/index.php/publicknowledge/en/user/profile`). It opens on
   "Identity".
3. Press the "Password" tab. It shows "Current password", "New
   password" ("The password must be at least 6 characters."), "Repeat
   new password", then "Cancel" and "Save".
4. Type "dbarnesdbarnes" in "Current password", and "u03rdNewPass" in
   "New password" and in "Repeat new password".
5. Press "Cancel" under the form.
6. Press the "Contact" tab.

Control:

7. Open the profile again, press "Password" and type the same three
   values.
8. Press the "Contact" tab.

**Expected**: the Password tab has no "Cancel" that does nothing.
Either "Cancel" empties the three boxes at step 5, and step 6 opens
"Contact" with nothing to ask about; or the tab has only "Save", so step
5 cannot be taken, and step 6 asks "The data on this form has changed.
Do you wish to continue without saving?", as step 8 does.

**Observed**: step 5 does nothing. The page sends no request, the
"Password" tab stays open, the three boxes keep what was typed, and no
message shows. Step 6 opens "Contact" at once, with no question. Step 8
asks "The data on this form has changed. Do you wish to continue without
saving?" (answered "Cancel", the Password tab stays open with the three
values).

## Cause

`lib/pkp/templates/user/changePassword.tpl` ends with the default button
bar:

```smarty
{fbvFormButtons submitText="common.save"}
```

`lib/pkp/templates/form/formButtons.tpl` renders a "Cancel" link unless
`hideCancel` is set. With no `cancelAction` or `cancelUrl` the link is a
bare `<a href="#" class="cancelButton">`, and its only behaviour is
`FormHandler.cancelForm()` (`lib/pkp/js/controllers/form/FormHandler.js`):
it calls `unregisterForm()` and triggers `formCanceled`. The listeners
for `formCanceled` are the modals': `AjaxModalHandler`
(`lib/pkp/js/controllers/modal/AjaxModalHandler.js`) and ui-library's
`AjaxModalWrapper.vue`, each of which closes its modal. The Password
form is not in a modal: `profile.tpl` loads it into a tab of
`#profileTabs` (`TabHandler`), where nothing listens, so nothing closes
and nothing resets the boxes.

`unregisterForm()` sets `formChangesTracked` to false, and
`TabHandler.tabsBeforeActivate()` reads that flag before it asks the
unsaved-change question. That is why step 6 opens "Contact" without
asking. Tracking comes back on with a box's `change` event, which fires
when a box whose text was changed loses focus (`FormHandler.formChange()`).

This is a regression. Before pkp-lib 90a749ab58 (`pkp/pkp-lib#478`),
"Change Password" was a page of its own, and its button bar was
`{fbvFormButtons submitText="common.save" cancelUrl=$cancelUrl}`, so
"Cancel" led back to the profile. That change moved the form into a tab
of the profile and dropped `cancelUrl`, while every form it created for
the other tabs got `hideCancel=true`. Pkp-lib 4ababcd4c2 (2020) later
moved the button bar below the privacy paragraph, unchanged.

Reach:

- One template serves OJS, OMP and OPS; no app overrides
  `user/changePassword.tpl` (code). The site-wide profile
  (`/index.php/index/user/profile`) loads the same tab (code).
- The other profile tabs pass `hideCancel=true` (`identityForm.tpl`,
  `contactForm.tpl`, `rolesForm.tpl`, `publicProfileForm.tpl`,
  `notificationSettingsForm.tpl`); "API Key" has no button bar (code, and
  on screen at step 2).
- The forced "Change Password" page (`loginChangePassword.tpl`) got
  `hideCancel` for the same symptom in pkp-lib e141d7fb8f
  (`pkp/pkp-lib#6654`), which left the profile tab out (code).

## Proposed fix

Hide "Cancel" on the Password tab
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/password-tab-cancel-does-nothing/fix.diff)):

```diff
--- a/lib/pkp/templates/user/changePassword.tpl
+++ b/lib/pkp/templates/user/changePassword.tpl
@@ -38,6 +38,6 @@
 			{translate key="user.privacyLink" privacyUrl=$privacyUrl}
 		</p>
 
-		{fbvFormButtons submitText="common.save"}
+		{fbvFormButtons hideCancel=true submitText="common.save"}
 	{/fbvFormArea}
 </form>
```

This is the pattern the code base already uses for legacy forms on a
page rather than in a modal: the other profile forms, the forced
"Change Password" form and the password-reset form all pass
`hideCancel=true`. Without "Cancel", nothing switches the unsaved-change
question off any more, so pressing another tab while the boxes hold
typed passwords asks again.

Tried on OJS, OMP and OPS `main`: the Password tab then showed "Save"
alone, and step 6 asked "The data on this form has changed. Do you wish
to continue without saving?". A neighbour check, run with the fix in and
out, gave the same answers both times on all three apps: a wrong current
password still refused ("The current password you entered was
incorrect."), a correct change still saved ("Your changes have been
saved.").

**Alternatives**:

- Restore `cancelUrl` to the profile page. "Cancel" would then reload
  the whole page onto "Identity" to empty three boxes, unlike any other
  tab.
- Make "Cancel" empty the boxes (a reset through `cancelAction`). No
  legacy form on a page does this, so it would be a new pattern for one
  form.
- Give `FormHandler.cancelForm()` a default for forms outside a modal.
  The form cannot tell whether anything above it listens for
  `formCanceled`, and the change would touch every legacy form.

**What goes with it**:

- Every instance: a search of the templates of pkp-lib, OJS, OMP and OPS
  for `fbvFormButtons` without `hideCancel`, `cancelAction` or
  `cancelUrl` finds, outside modals, this form and the two OJS tool
  "Settings" tabs (PubMed and DOAJ) of
  [U63-OJS5-pubmed-doaj-settings-cancel-does-nothing.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U63-OJS5-pubmed-doaj-settings-cancel-does-nothing.md),
  which proposes the same one-word fix in OJS's plugin templates. The
  other hits are forms opened in a modal from a grid, where "Cancel"
  closes the modal (code; not each driven).
- Backport: the changed line is the same on `stable-3_5_0`,
  `stable-3_4_0` and `stable-3_3_0`, and the diff applies there as it
  stands, a line or two off (`patch --dry-run`).
- The guard: a browser test that the Password tab offers only "Save" and
  asks when another tab is pressed while the boxes hold typed passwords
  (a Planned item in spec U03).

Small: one word in one shared template.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/password-tab-cancel-does-nothing/walk.js)
  and
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/password-tab-cancel-does-nothing/lib.js)
  (steps 1 to 8; `neighbour` as argument runs the neighbour check
  instead, walked with the fix in and out), run on an install freshly loaded from PKP's
  default test dataset (pkp/datasets 566bb1f, 2026-10-03, PostgreSQL):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/password-tab-cancel-does-nothing/walk.js`.
  Walked on `main` and on `stable-3_5_0`, OJS, OMP and OPS, with the same
  result on all six. No request failed, no script error was logged and
  the server log stayed empty.
- Branch tips: `main`: OJS ff004d0973 (lib/pkp 987776cd04), OMP
  3b0ecf794c (lib/pkp 3dc90c81a6), OPS c8af945bb7 (lib/pkp 3dc90c81a6).
  `stable-3_5_0`: OJS c1cee76b95 (lib/pkp 771474347e), OMP 9c5e24246c
  and OPS 38b61882d3 (lib/pkp cf3f984335). `stable-3_4_0`: OJS
  d68934d0d1, OMP 0aec65441f, OPS acd8ae704b (lib/pkp 767353f4fe).
  `stable-3_3_0`: OJS ac77c9fb35, OMP 8e72fc8836, OPS c5532e2161 (lib/pkp
  ac3fa73402).
- Code reads: on `main`, the files the Cause names and the template
  search under "Every instance". On `stable-3_5_0`, `changePassword.tpl`
  of each app's lib/pkp (the same button bar) and the sibling profile
  forms (`hideCancel=true`). On `stable-3_4_0` and `stable-3_3_0`,
  lib/pkp's `changePassword.tpl` (the same line), `profile.tpl` (the
  Password tab in `#profileTabs` under `TabHandler`), the five sibling
  forms (`hideCancel=true`), `FormHandler.cancelForm()` (the same body)
  and `TabHandler.js` (the same `formChangesTracked` check).
- Introduced: `git log -S` on the button-bar line finds only
  90a749ab58; `git blame` stops at 4ababcd4c2, which moved the line
  below the privacy paragraph unchanged. The 2015 "Cancel" leading back
  to the profile is read from the code; that version was not run.
- Upstream search (2026-10-03): pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library, for "change password cancel", "profile password
  cancel button", "cancel button does nothing", "changePassword
  hideCancel", "cancelForm formCanceled", "changePassword.tpl".
- A "Save" after "Cancel" was not walked; `cancelForm()` changes no box
  (code).
