# On a one-language site, typing in "Create Journal" makes the page's script fail at every keystroke

- **Severity** low
- **Effort** small
- **Kind** regression
- **Crash** script
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; there the window has "Languages" and "Primary locale" on every site)
- **Introduced** `pkp/ui-library#155` and `pkp/pkp-lib#6980` for `pkp/pkp-lib#6957` · [5415e03787](https://github.com/pkp/ui-library/commit/5415e0378798dbf4d0903a832330d8c3e3cd2543) and [e2cf9d261d](https://github.com/pkp/pkp-lib/commit/e2cf9d261d5a59a2523a66c468ea36ff7e83f0d6) · committed 2021-04-22, both PRs merged 2021-04-26 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U57 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U57-languages-and-locales.md#a7)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

When the site has one language, the window Administration › "Hosted
Journals" › "Create Journal" ("Create Press", "Create Server") has no
"Languages" or "Primary locale" fields, as it should. But each change to
its other fields fails the page's script: one error in the browser's
console for every character typed in the name, the initials, the
contact or the path, and one for choosing the country. Nothing shows on
screen and "Save" creates the journal. On a site with two languages the
same window logs nothing.

The site administrator loses nothing and needs no way round.

## Impact

- **Lost**: nothing. The journal is created with the site's language,
  and the window behaves as it should.
- **Who**: site administrators creating a journal, press or server on a
  site with one language enabled. That is the state a new install
  starts in unless the installer's "Additional locales" are ticked
  (none are by default), so it is usually met when the first journal
  is created.
- **Way round**: none needed; the failure is seen only in the browser's
  developer console.

Low: nothing is lost and the task gets done; the failures are visible
only to someone reading the console. It would be medium if a failure
stopped the window from saving, or from clearing the validation message
under "Primary locale" once the languages are corrected.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS (or OMP, OPS). The site has
  English and French enabled; step 3 leaves English alone.
- The browser's developer console is open: the failure shows only there.

Steps:

1. Sign in as `admin`.
2. Administration › "Site Settings" › "Site Setup" › "Languages".
3. Untick "Enable" on the "Français (Canada)" row, and answer "OK" to
   "Disable" ("Are you sure you want to disable this locale? This may
   affect any hosted journals currently using the locale.").
4. Administration › "Hosted Journals" ("Hosted Presses", "Hosted
   Servers") › "Create Journal" ("Create Press", "Create Server").
5. Type "u57u3 Journal" in the title box, then "U57U3" in the
   initials box, "u57u3 Contact" as the contact name,
   `u57u3@mailinator.com` as the contact email; choose "Canada" as the
   country; type `u57u3` in "Path".
6. Press "Save".

**Expected**: the window has no "Languages" or "Primary locale" fields
(the site has one language), the console stays clean, and "Save"
creates the journal.

**Observed**: the window has no "Languages" or "Primary locale" fields,
as expected. Every character typed at step 5 logs this error in the
console, and so does choosing the country:

```
TypeError: Cannot read properties of undefined (reading 'includes')
    at Proxy.submitValues (…/js/build.js?v=3.6.0.0:…)
```

On OJS that is 13 for the title, 5 for the initials, 13 for the contact
name, 20 for the email, 1 for the country and 5 for the path: 57 in
all. On 3.5 each text box logs one more as the cursor leaves it (63 on
OJS). A value pasted into a box, or put there whole by the browser's
autofill, logs one error (two on 3.5). "Save" answers 200 and opens the
new journal's Settings Wizard (`/index.php/index/admin/wizard/2`).

Control: on a site with French still enabled (step 3 skipped), the
window has "Languages" and "Primary locale", and filling every field,
those two included, logs nothing.

## Cause

ui-library's `AddContextForm.vue`, the form component of the "Create
Journal" window, watches the form's `submitValues` to clear the validation
message under "Primary locale" once the languages are corrected:

```js
submitValues(newVal, oldVal) {
	if (newVal.supportedLocales.includes(newVal.primaryLocale)) {
```

It assumes the form always has a `supportedLocales` field. pkp-lib's
`PKPContextForm` adds "Languages" (`supportedLocales`) and "Primary
locale" only `if (!$context && count($locales) > 1)`, and
`ContextGridHandler::editContext()` passes the site's supported
languages as `$locales`. On a one-language site the field is missing,
`newVal.supportedLocales` is `undefined`, and every recomputation of
`submitValues` throws. A text box updates the form's value at every
keystroke, so that is once per character typed. Vue's error handler
catches and logs it, so nothing breaks on screen and the save is not
affected.

Both lines came with the fix for `pkp/pkp-lib#6957` ("[OMP] Unable to
create press in a certain condition"), by the same author on the same
day. ui-library 5415e03787 ("Fix error with primaryLocale when creating
a new context") added the watcher, so that the validation message under
"Primary locale" clears once the languages are corrected. Eighteen
minutes later, pkp-lib e2cf9d261d ("Don't require context locales when
only one supported") made the form leave out both fields on a
one-language site, and made the contexts API's `add()` (today
`PKPContextController::add()`) fill them in from the site. Each change
is right on its own, but the watcher was not changed to allow for the
missing fields.

Reach:

- The "Edit" window on Hosted Journals uses the plain form
  (`templates/admin/editContext.tpl` renders `add-context-form` only
  while adding), so it does not fail (checked in the code).
- `AddContextForm` is used nowhere else (checked in the code).
- No data is affected: the save and the journal it creates are the same
  with or without the failure (checked on screen).

## Proposed fix

Let the watcher skip the check when the form has no "Languages" field,
in `src/components/Form/context/AddContextForm.vue`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/create-journal-one-language-script-error/fix.diff)):

```diff
 		submitValues(newVal, oldVal) {
 			// When the primaryLocale is not included in the supportedLocales,
 			// an error is set on primaryLocale that can only be resolved
-			// by editing the supportedLocales.
-			if (newVal.supportedLocales.includes(newVal.primaryLocale)) {
+			// by editing the supportedLocales. A site with one language does
+			// not ask for either, so there is no such error to clear.
+			if (newVal.supportedLocales?.includes(newVal.primaryLocale)) {
```

Without the two fields the server never answers with a validation
message under "Primary locale" (it fills both from the site), so there
is nothing to clear. The optional chaining is used as other ui-library
components use it (`FieldRadioInput.vue` reads
`this.$refs.inputRadio?.[0]`).

Tried on `main`, OJS, OMP and OPS: with the fix in, filling the fields
of step 5 logged no error and "Save" created the journal. The watcher
still does its own job, with the fix in and out: on a two-language site,
with English alone under "Languages" and French as "Primary locale",
"Save" shows "The primary locale must be one of the journal's supported
locales." under "Primary locale", and ticking French under "Languages"
clears it.

**Alternatives**:

- Always send "Languages" and "Primary locale" from `PKPContextForm`
  and hide them on a one-language site: a server and template change to
  satisfy one client-side assumption, which the API's own fallback
  already makes unnecessary.
- Wrap the watcher in a check of `this.fields` for `supportedLocales`:
  the same effect in more lines.

**What goes with it**: nothing to repair. A unit test of
`AddContextForm` with no `supportedLocales` field, or the e2e scenario
here (a **Planned** item in the spec), would guard it. The same one-line
change applies to 3.5 and 3.4. 3.3 does not need it: there the window
has "Languages" and "Primary locale" on every site.

Small: one line in one ui-library component, tried, no data or API
change.

## Evidence

- The kept script walks the Steps, then the control and the neighbour:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/create-journal-one-language-script-error/walk.js),
  with its helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/create-journal-one-language-script-error/lib.js).
  On an install freshly loaded from the default dataset, from a pkp-e2e
  checkout (`<feature>` names the set of test installs, `<id>` the
  output folder):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/create-journal-one-language-script-error/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/create-journal-one-language-script-error/fix.diff ojs omp ops`
  (it rebuilds the JavaScript).
- The walks ran in Chromium on PostgreSQL. Datasets: pkp/datasets
  c657990 (2026-10-01). Step 5 was walked twice per version: typed key by
  key, as the Steps say (`main` 57 errors on OJS, one per character plus
  one for the country; 3.5 63, one more per text box on leaving it), and
  with each box filled whole (`main` 6; 3.5 11, two per text box and one
  for the country), which is how the fix was tried. The script types by
  default; `pasted` after its path fills whole.
- Branch tips. `main`: OJS b84f8e2e44, OMP 3b0ecf794, OPS c8af945bb7;
  pkp-lib ddd8ab243a (OJS) and 3dc90c81a6 (OMP, OPS); ui-library
  64d67363 (OJS) and 280f98c5 (OMP, OPS). 3.5: OJS c346ee00a5, OMP
  c7b45f88e, OPS 8eaf899468; pkp-lib 3bb4450bea (OJS) and 1fb843f491
  (OMP, OPS); ui-library d4e01883. 3.4: OJS 75cc2d488b,
  pkp-lib 32b0f4b4af, ui-library ee684b34. 3.3: OJS ac77c9fb35, pkp-lib
  f6ab331645, ui-library 96959f9e.
- Code reads. `main` and 3.5: `AddContextForm.vue`, `Form.vue`
  (`submitValues`), `AddContextContainer.vue`, `PKPContextForm.php`,
  `ContextGridHandler::editContext()`, `templates/admin/editContext.tpl`.
  3.4: `AddContextForm.vue` (the same watcher), `PKPContextForm.php`
  (`if (!$context && count($locales) > 1)`), `editContext.tpl`
  (`add-context-form` while adding). 3.3: `AddContextForm.vue` has the
  watcher too, but `PKPContextForm.inc.php` adds "Languages" and "Primary
  locale" whenever a journal is created (`if (!$context)`), so
  `supportedLocales` is always there.
- Introduced: `git log -L` on the watcher's line gives 5415e03787
  (`pkp/ui-library#155`) and on the form's condition e2cf9d261d
  (`pkp/pkp-lib#6980`), both for `pkp/pkp-lib#6957`, merged 2021-04-26.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library for
  `AddContextForm`, "create journal" with console error, one locale with
  `supportedLocales`, and `primaryLocale`. `pkp/pkp-lib#6957` is the
  issue whose fix brought the fault in; nothing tracks the failure.
- Not driven: 3.4 and 3.3 (code only); Firefox and Safari; MySQL (the
  fault is in the browser).
