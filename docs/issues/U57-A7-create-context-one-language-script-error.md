# On a one-language site, each field filled on "Create Journal" makes the page's script fail

- **Severity** low
- **Effort** small
- **Kind** defect
- **Crash** script
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; the form always asks "Languages")
- **Introduced** `pkp/ui-library#155` for `pkp/pkp-lib#6957` · [5415e0378](https://github.com/pkp/ui-library/commit/5415e0378798dbf4d0903a832330d8c3e3cd2543) · 2021-04-22 · Nate Wright (NateWr), with the pkp-lib PR `pkp/pkp-lib#6980` for the same issue · [e2cf9d261d](https://github.com/pkp/pkp-lib/commit/e2cf9d261d5a59a2523a66c468ea36ff7e83f0d6)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U57 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U57-languages-and-locales.md#a7)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

When the site has one language, the form on Administration › "Hosted
Journals" › "Create Journal" ("Create Press", "Create Server") has no
"Languages" or "Primary locale" field, and each change to one of its fields
(the name, the initials, the contact, the path, the country) makes the
page's script fail.

Nothing shows on screen and "Save" creates the journal; on a site with
two languages the same form does not fail.

## Impact

- **Lost**: nothing. The failing check is the only thing the failing
  code does: it clears a "Primary locale" error, and this form has no
  such field. Nothing else is skipped: a field's own error (a path
  already taken, say) is cleared by other code when the field changes,
  so it still goes once corrected (read in the code).
- **Who**: the Site Administrator, each time they create a journal
  (press, server) on a site with one enabled language.
- **Way round**: none needed.

Low: the failures have no effect on the form or on the journal it
creates.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main` (the site has English, primary,
  and French (Canada) enabled).
- The browser's developer console open.

1. Sign in as `admin`.
2. Administration › "Site Settings" › "Site Setup" › "Languages".
3. Untick "Enable" on the "French (Canada)" row. The "Disable" question
   asks "Are you sure you want to disable this locale? This may affect
   any hosted journals currently using the locale." Press "OK". English
   is now the site's one language.
4. Administration › "Hosted Journals" ("Hosted Presses", "Hosted
   Servers") › "Create Journal" ("Create Press", "Create Server"). The
   form has no "Languages" and no "Primary locale".
5. Type "u57w53 Journal" in "Journal title" ("Press Name", "Server
   title").
6. Type "UJ" in "Journal initials".
7. Type "u57w53 Contact" in "Principal Contact Name" and
   "u57w53@mailinator.com" in "Principal Contact Email".
8. Choose "Canada" under "Country".
9. Type "u57w53" under "Path".
10. Press "Save".

**Expected**: no error in the console at any step; "Save" creates the
journal and opens its "Settings Wizard".

**Observed**: each change in steps 5–9 logs this error in the console:

```
TypeError: Cannot read properties of undefined (reading 'includes')
    at Proxy.submitValues (…/js/build.js?v=3.6.0.0:1524:57684)
```

Step 10 goes as expected.

The same form opened before step 3, with "Languages" and "Primary
locale" on it, logs nothing while it is filled.

## Cause

The create form's own component, `AddContextForm.vue` in ui-library,
watches the form's values and reads the "Languages" field without
checking that the form has one
([AddContextForm.vue line 18](https://github.com/pkp/ui-library/blob/280f98c5/src/components/Form/context/AddContextForm.vue#L18)):

```js
submitValues(newVal, oldVal) {
    if (newVal.supportedLocales.includes(newVal.primaryLocale)) {
```

`PKPContextForm` adds "Languages" (`supportedLocales`) and "Primary
locale" (`primaryLocale`) only when a context is being created and the
site has more than one language (`if (!$context && count($locales) > 1)`,
[PKPContextForm.php line 101](https://github.com/pkp/pkp-lib/blob/2e377d27fc/classes/components/forms/context/PKPContextForm.php#L101)).
On a one-language site `newVal.supportedLocales` is `undefined`, so the
watcher throws on every change of any field. Vue's error handler
catches it and logs it, which is why nothing shows on screen.
`PKPContextController::add()` sets both values from the site when the form
sends none, so the save is unaffected.

Both pieces came with `pkp/pkp-lib#6957` on the same day. The watcher
clears the "Primary locale" error as soon as the chosen primary language
is ticked under "Languages", where before the error stayed on screen.
The pkp-lib change took both fields off the form when the site has one
language.

Reach:
- The edit form (a journal's row › "Edit"): `templates/admin/editContext.tpl`
  draws both forms and uses `AddContextForm` only when a context is
  being created (`$isAddingNewContext`), drawing the edit form with the
  plain `pkp-form`, which has no such watcher: not affected (code).
- Every other place that reads a form's values in ui-library
  (`Form.vue`, `NotifyUsersForm.vue`, `StartSubmissionForm.vue`,
  `SubmissionWizardPage.vue`) checks the field first or reads none by
  name: not affected (code).

## Proposed fix

Read the field only when the form has it, in the watcher itself
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/create-context-one-language-script-error/fix.diff)):

```diff
--- a/lib/ui-library/src/components/Form/context/AddContextForm.vue
+++ b/lib/ui-library/src/components/Form/context/AddContextForm.vue
@@ -14,8 +14,9 @@
 		submitValues(newVal, oldVal) {
 			// When the primaryLocale is not included in the supportedLocales,
 			// an error is set on primaryLocale that can only be resolved
-			// by editing the supportedLocales.
-			if (newVal.supportedLocales.includes(newVal.primaryLocale)) {
+			// by editing the supportedLocales. The form has no supportedLocales
+			// field when the site has only one language.
+			if (newVal.supportedLocales?.includes(newVal.primaryLocale)) {
 				let errors = {...this.errors};
 				delete errors.primaryLocale;
 				this.$emit('set', this.id, {errors});
```

The optional call is how ui-library already reads a list that may
be missing (`props.filterIds?.includes(…)` in
`FieldAffiliationsRorAutoSuggest.vue`). On the two-language form the
behaviour is unchanged: an empty "Languages" reaches the watcher as `''`,
which has `includes()`, as today.

Tried on `main` in OJS, OMP and OPS: the Steps logged no error, and the
journal was created. The watcher's own job still works, with the fix
and without it. On the two-language site, with English ticked under
"Languages" and French chosen as "Primary locale", "Save" is refused
with "The primary locale must be one of the journal's supported
locales.". Ticking French then clears that error.

**Alternatives**:
- Always send both fields, hidden on a one-language site: a server
  change for a client-side fault, and the API already fills in both
  values.
- Drop the watcher: the two-language form would again keep a "Primary
  locale" error the user has fixed (`pkp/pkp-lib#6957`).

**What goes with it**:
- No stored data to repair; nothing outside the form changes.
- Backport: the same line is in `stable-3_5_0` and `stable-3_4_0`
  (line 30 there), and the diff applies as written; ui-library on
  `stable-3_4_0` already uses `?.` (`SubmissionWizardPage.vue`), so its
  build accepts it.
- Guard: a ui-library test, or the e2e scenario here, that creates a
  journal on a one-language site and expects no console error.

Small: one line and a test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/create-context-one-language-script-error/walk.js)
  (helpers in `lib.js` beside it) first fills the form on the
  two-language site and takes the "Primary locale" refusal of the
  Proposed fix, then takes the Steps, and counts the page's script
  failures (uncaught, and those Vue's error handler logs) after each
  step. Run from pkp-e2e on a freshly loaded default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/create-context-one-language-script-error/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5); the fix was
  walked the same way with `fix.diff` applied and the JavaScript
  rebuilt.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, on PostgreSQL,
  with the datasets from pkp/datasets 38ab955 (2026-09-30).
- Tips: `main` OJS bade233f73 (lib/pkp 2e377d27fc), OMP 3b0ecf794 and
  OPS c8af945bb7 (both lib/pkp 3dc90c81a6), lib/ui-library 280f98c5 in
  all three; `stable-3_5_0` OJS 92b9a16b48, OMP 3081c9b00, OPS
  cf4fce69bd, lib/pkp a9c76aed62, lib/ui-library 1a7a4750;
  `stable-3_4_0` OJS 9571d8fde7, OMP 0aec65441, OPS acd8ae704b, lib/pkp
  df13621c2d, lib/ui-library ee684b34; `stable-3_3_0` OJS 9fdb9bcf9a,
  OMP 8e72fc883, OPS c5532e2161, lib/pkp d446601ebe, lib/ui-library
  96959f9e.
- Code reads: on `main` and 3.5, `PKPContextController::add()`
  (`lib/pkp/api/v1/contexts/PKPContextController.php` line 318, 316 on
  3.5) fills both values when the site has one language; `Form.vue`
  clears a field's error in `fieldChanged()` (`removeError()`), outside
  the watcher. On 3.5, the same watcher (line 18) and the same
  `count($locales) > 1` condition. On 3.4, the same watcher (line 30),
  the same condition (`PKPContextForm.php` line 105), and
  `PKPContextHandler::add()` (the 3.4 name of `PKPContextController`)
  filling both values on a one-language site; ui-library builds with
  `@vue/cli-service` 5 and Babel.
  On 3.3, the watcher is there (a backport, db032798), but
  `PKPContextForm.inc.php` adds both fields whenever a context is being
  created (`if (!$context)`), so the watcher always finds them. The
  apps' own `ContextForm` classes add no language fields (`main`, 3.4).
- Introduced: `git blame` on the watcher's `if` line gives 5415e0378,
  the commit that added the watcher (`pkp/ui-library#155`, merged
  2021-04-26). The condition line blames to e2cf9d261d
  (PR `pkp/pkp-lib#6980` for `pkp/pkp-lib#6957`, merged the same day), which made the fields
  conditional. The issue's last comments say the watcher was meant for
  the stable branches and the field removal for `main`; both went to
  `main`.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library
  searched for the symptom's words ("create journal console error",
  "reading 'includes'") and for `AddContextForm` and
  `supportedLocales includes`. Only `pkp/pkp-lib#6957` (closed), the
  issue whose fix brought this, came up.
- Not walked: 3.4 and 3.3 (read in the code).
