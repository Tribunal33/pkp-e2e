# Users & Roles › "Notify": no field is marked required, and an empty form asks to email "0 users"

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#6374` and `pkp/ui-library#129` for `pkp/pkp-lib#4017` · [891eba2020](https://github.com/pkp/pkp-lib/commit/891eba202036ec9d41ff8896949330918c0a4565) · 2020-11-25 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U55 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U55-notify-users.md#a2)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

On Settings › Users & Roles › "Notify", "Roles", "Subject" and "Email"
must all be filled in, but none of them carries the required mark.
Pressing "Save" on an empty form opens the "Send Email" window, which
asks to confirm "an email to 0 users". A form with roles ticked but
"Subject" or "Email" left empty is confirmed the same way, with the real
number of recipients. In both cases the manager learns what is missing
only after pressing "Send Email": the window closes and each missing
field shows its message under it.

The cost is a confirmation that leads nowhere: the incomplete send is
refused, and the manager fills in the named fields and tries again.

## Impact

- **Lost**: nothing.
- **Who**: managers of a journal, press or server (and the Site
  Administrator) on the "Notify" tab. The tab shows only once the Site
  Administrator allows that journal, press or server bulk email.
- **Way round**: none needed.

Low: the form misleads, but it ends in a refusal, never in a wrong
send.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS "Journal of Public
  Knowledge", OMP "Public Knowledge Press" or OPS "Public Knowledge
  Preprint Server", all at `publicknowledge`.
- The dataset allows no context bulk email, so the Site Administrator
  turns it on first (steps 1–3).

Steps:

1. Sign in as `admin`.
2. Open Administration › "Site Settings" › "Site Setup" › "Bulk Emails".
3. Tick "Journal of Public Knowledge" ("Public Knowledge Press", "Public
   Knowledge Preprint Server") and press "Save".
4. Sign out, and sign in as `rvaca` (the journal manager).
5. Open Settings › "Users & Roles" › "Notify"
   (`/index.php/publicknowledge/en/management/settings/access#notify`).
6. Read the labels "Roles", "Subject" and "Email".
7. Tick no role and type nothing. Press "Save" under the form.
8. In the window that opens, press "Send Email".

**Expected** "Roles", "Subject" and "Email" carry the red required mark
(*) that required fields carry on the other settings forms. At step 7
no window opens: each of the three fields is named as missing, and
nothing is sent.

**Observed** No label carries the mark. Step 7 opens a window titled "Send Email": "You are about to send
an email to 0 users. Are you sure you want to send this email?", with
"Send Email" and "Cancel". "Send Email" posts the empty form, which the
server refuses:

```
POST /index.php/publicknowledge/api/v1/_email  400
{"body":["You must include an email to be sent."],
 "subject":["You must provide a subject for the email."],
 "userGroupIds":["You must indicate the user roles that should receive this email."]}
```

Only then does the notice "The form was not saved because 3 error(s)
were encountered. Please correct these errors and try again." show at
the top right, with each field's message under it and "Please correct 3
errors." beside "Save".

## Cause

The form means to require the three fields, but uses the wrong key.
`PKPNotifyUsersForm::__construct()` (lib/pkp
`classes/components/forms/context/PKPNotifyUsersForm.php`, lines 73, 78
and 84) passes `'required' => true` to `FieldOptions`, `FieldText` and
`FieldRichTextarea`. `Field::__construct()` copies only keys that are
declared properties (`property_exists()`), and the property is
`isRequired`. So `required` is dropped, `isRequired` stays `false`, and
the page receives three optional fields. That is why no mark is drawn
(`FormFieldLabel` and `FieldOptions` draw it from `isRequired`), and why
the browser's own check, `Form.vue::validateRequired()`, skips them.

The confirmation also comes before any check. ui-library's
`NotifyUsersForm.vue` overrides `nextPage()`, the handler of the form's
submit button, to open the "Send Email" dialog. Only the dialog's
"Send Email" calls `Form.vue::submit()`, the place where every other
form runs `validate()` before it sends. Even with `isRequired` set, the
empty form would still be confirmed first and refused after.

With the wrong key and the dialog-first `nextPage()` together, the
only check is the server's, after "Send Email":
`PKPEmailController::create()` answers 400 for each of `body`, `subject`
and `userGroupIds` that is empty. So a form with roles ticked gets the
window with `nextPage()`'s real sum of those roles' members, and is
refused only for the missing "Subject" or "Email". The dialog's "Send
Email" closes the window as it submits, and `Form.vue::error()` puts
each message under its field.

Reach:

- One shared form: OJS, OMP and OPS build the tab from this lib/pkp
  class and ui-library component, byte-identical in the three, with no
  app override (code; walked on all three).
- No other form passes `'required' =>` to a field: the search covered
  lib/pkp's and the three apps' `classes/` and `plugins/`. The
  `'required'` keys in Crossref's and DataCite's settings are a different
  schema's (code).
- `NotifyUsersForm.vue` is the only component that overrides
  `nextPage()` (code).

## Proposed fix

Name the key correctly in the form, and run the form's own check in
`nextPage()` before the dialog, as `Form.vue::submit()` does
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/notify-required-fields-unchecked/fix.diff)):

```diff
--- a/lib/pkp/classes/components/forms/context/PKPNotifyUsersForm.php
+++ b/lib/pkp/classes/components/forms/context/PKPNotifyUsersForm.php
-            'required' => true,
+            'isRequired' => true,
```

(the same on "Subject" and "Email"), and in
`lib/ui-library/src/components/Form/context/NotifyUsersForm.vue`:

```diff
 		nextPage: function (pageId) {
+			// Check the required fields before asking to confirm the send,
+			// as Form.submit() does before it sends
+			const errors = this.validate();
+			if (Object.keys(errors).length) {
+				this.$emit('set', this.id, {
+					errors: {
+						...this.errors,
+						...errors,
+					},
+				});
+				return;
+			}
 			let totalUserCount = 0;
```

`isRequired` is the key every other form passes. The ten lines in
`nextPage()` are `submit()`'s validation step, without its `canSubmit`
guard and its `isSaving` handling. Neither is needed here: `FormPage`
already disables the button while `canSubmit` is false or a save is
running, and the check sends no request, so there is no saving state to
show. Tried
on `main` (OJS, OMP, OPS): with the fix in, the three labels carry the
mark and "Copy" does not. "Save" on the empty form opens no window and
sends no request. Each field reads "This field is required.", and
"Please correct 3 errors." shows beside the greyed "Save". A filled-in
form with the manager role ticked ("Journal manager", "Press manager",
"Preprint Server manager") still opens the window ("…to 2 users…": `admin`
and `rvaca`, with `dbarnes` too on OPS), and "Send Email"
still queues the email, which arrives, as without the fix.

**Alternatives**

- Accepting `required` as an alias in `Field::__construct()`: it would
  hide this form's typo and give every field class two names for one
  property.
- Fixing only `nextPage()`: `validate()` finds nothing to check while
  `isRequired` is false.

**What goes with it**

- The empty-field messages become the browser's "This field is
  required.", the wording of every other Vue form, in place of the
  server's specific ones. The server's checks stay for API clients.
- Two other reports touch the same code, and their diffs need merging
  with this one:
  - [Users & Roles › "Notify": the button that emails whole roles reads "Save"](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U55-A1-notify-send-button-reads-save.md)
    declares the form's single `default` page and group in this
    constructor. It adds no second page, so `validateRequired()` still
    sees every field from the one button.
  - [Notify users: the "Send Email" window counts a person once per ticked role and leaves out the copy](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U55-A3-notify-total-counts-person-per-role.md)
    makes `nextPage()` ask the server for the count. The merged
    `nextPage()` checks the fields first, then asks for the count, then
    opens the window.
- Backport: the same change applies to `stable-3_5_0` and
  `stable-3_4_0`. On `stable-3_3_0` the form is
  `PKPNotifyUsersForm.inc.php` (array syntax), and `NotifyUsersForm.vue`
  and `Form.vue::submit()` have the same shape. On 3.4 and 3.3 the
  server's check is `PKPEmailHandler::create()` (`api/v1/_email/PKPEmailHandler.php`,
  `.inc.php` on 3.3), with the same three refusals.
- Guard: an e2e check that "Save" on the empty form opens no window and
  names the three fields (the e2e spec U55, scenario 2).
- No stored data, REST API contract or plugin hook changes.

Medium, because the fix spans two repos (pkp-lib and ui-library), though
each change is a few lines.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/notify-required-fields-unchecked/walk.js),
  using the page objects in
  [NotifyUsersPages.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/pages/NotifyUsersPages.js).
  It takes the Steps on OJS, OMP and OPS on an install loaded from PKP's
  default test dataset, run from the pkp-e2e repo:
  `node bin/probe.js all shared/playwright/checks/issues/notify-required-fields-unchecked/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). With the argument
  `nb` it checks only what the fix must leave alone: a filled-in form
  still confirms and sends, and "Copy" stays unmarked.
- Fix trial: `node bin/try-fix.js apply …/fix.diff ojs omp ops` (which
  rebuilds ui-library), the walk and the `nb` run, then `revert`. With
  the fix out, the `nb` run read the same apart from the marks.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, each on an
  install freshly loaded from pkp/datasets 1a5552c (2026-10-04),
  PostgreSQL. The fault is in the form's configuration and the browser,
  independent of the database. No request failed on the server and no
  page script failed on any walk.
- Branch tips:
  - main: OJS ff004d0973, pkp-lib 987776cd04, ui-library 64d67363; OMP
    3b0ecf794c and OPS c8af945bb7, pkp-lib 3dc90c81a6, ui-library
    280f98c5.
  - stable-3_5_0: OJS c1cee76b95, pkp-lib 771474347e; OMP 9c5e24246c
    and OPS 38b61882d3, pkp-lib cf3f984335; ui-library d4e01883.
  - stable-3_4_0: OJS d68934d0d1, OMP 0aec65441f, OPS acd8ae704b;
    pkp-lib 767353f4fe, ui-library ee684b34.
  - stable-3_3_0: OJS ac77c9fb35, OMP 8e72fc8836, OPS c5532e2161;
    pkp-lib ac3fa73402, ui-library 96959f9e.
- Code reads:
  - main and 3.5: `PKPNotifyUsersForm::__construct()` (the three
    `'required' => true`), `Field::__construct()` and `$isRequired`,
    `FormFieldLabel.vue` and `FieldOptions.vue` (the mark),
    `NotifyUsersForm.vue::nextPage()`, `Form.vue::nextPage()`,
    `submit()` and `validateRequired()`, and
    `PKPEmailController::create()` (the 400). Search for
    `'required' =>` across lib/pkp's and each app's `classes/` and
    `plugins/`, and for `nextPage` overrides in ui-library's `src/`.
    `Form.vue::error()` and `FormPage.vue` (where the messages show,
    and the button's `disabled` binding).
  - 3.4 and 3.3 (pkp-lib's and ui-library's `stable-3_4_0` and
    `stable-3_3_0`, shared by the three apps): `PKPNotifyUsersForm.php`
    (3.4) and `PKPNotifyUsersForm.inc.php` (3.3), `Field` (3.3:
    `Field.inc.php`), `NotifyUsersForm.vue`, `Form.vue`, and
    `PKPEmailHandler::create()`.
- Introduced: `git log --follow` and `git blame` on the three lines
  reach 891eba2020, the commit that created the form; later commits
  only reformatted it (PSR-12, e3f570bc37). `nextPage()`'s dialog dates
  from ui-library eda42e5626, of the same feature. GitHub's
  `commits/<sha>/pulls` names `pkp/pkp-lib#6374` and
  `pkp/ui-library#129`.
- Upstream: pkp/pkp-lib, pkp/ui-library, pkp/ojs, pkp/omp and pkp/ops
  searched for the notify tab and required fields, an empty bulk email,
  "Send Email" with "0 users", and `PKPNotifyUsersForm` /
  `NotifyUsersForm`. `pkp/pkp-lib#12548` and `pkp/pkp-lib#13184` are
  about the window's count for ticked roles, not the missing check.
- A partly filled form (roles ticked, "Subject" or "Email" empty) was
  read in the code, not walked: it takes the same `nextPage()` and
  `create()` path as the empty form that was walked, with `nextPage()`
  summing the ticked roles' counts.
- Not driven: the Site Administrator's and the editor's own view of the
  tab (the same form), and 3.4 and 3.3, read in the code only.
