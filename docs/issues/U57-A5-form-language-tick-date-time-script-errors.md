# A newly ticked "Forms" language's "Date & Time" fields show no choices until a reload, with console errors

- **Severity** low
- **Effort** small
- **Kind** defect
- **Crash** script
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/ui-library#117` and `pkp/pkp-lib#6211` for `pkp/pkp-lib#5540` · [2b4d7bd782](https://github.com/pkp/ui-library/commit/2b4d7bd7821dea838c3f2b6b29d54bd78c2c1fab) and [84c4cc47bf](https://github.com/pkp/pkp-lib/commit/84c4cc47bf04c5f457722592d6316bc871c4bd0a) · 2020-08-26 · Nate Wright (NateWr), from commits by Vitaliy Bezsheiko (Vitaliy-1)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U57 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U57-languages-and-locales.md#a5)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

When a manager ticks a language's "Forms" box under Settings › Website ›
"Setup" › "Languages", the tick saves. But on the "Date & Time" tab that
language's five fields show only their titles, with no format to choose
and no "Custom" box, until the page is reloaded. The page throws five
errors in the browser's console as the language is added. A "Save" on
"Date & Time" before the reload succeeds and throws three more.

The manager cannot set the new language's date and time formats until
they reload the page; after a reload the choices are there.

It happens whenever a language is ticked under "Forms" on that page and
was not a form language when the page was loaded.

## Impact

- **Lost**: nothing. The language and the "Date & Time" form save as
  usual, and dates show as before in every language.
- **Who**: a journal, press or preprint server manager adding a form
  language on Settings › Website, a rare task, usually at set-up, who
  then wants to set that language's date formats at once.
- **Way round**: reload the page.

Low: a field that cannot be used until a reload, on a rare task, with a
reload as the way round and nothing stored wrong; a field that stayed
empty after a reload, or a save that stored wrong formats, would raise
it.

## Steps to reproduce

Preconditions:

- The default dataset, `main` (OJS, OMP or OPS): `publicknowledge` has
  English and French (Canada) ticked under "UI" and "Forms". Nothing
  else is needed.

Steps:

1. Sign in as `rvaca` (the journal's manager), with the browser's
   console open.
2. Open Settings › Website, the "Setup" tab, side tab "Languages".
3. On the "Français (Canada)" row of the "Website Languages" list,
   untick "Forms": "Locale settings saved."
4. Reload the page and open "Setup" › "Languages" again. The page now
   holds English as its only form language.
5. Tick "Forms" on the "Français (Canada)" row again: "Locale settings
   saved."
6. Open "Setup" › "Date & Time" and press its "French" button.
7. Press "Save" on "Date & Time".

**Expected**: no error in the console at any step, and at step 6 the
French fields offer the same kind of choices as the English ones. The
proposed fix delivers the first; the French choices still need a
reload (Proposed fix).

**Observed**: at step 5, five errors in the console, one for each of the
form's five fields ("Date", "Date (Short)", "Time", "Date & Time",
"Date & Time (Short)"):

```
TypeError: Cannot read properties of undefined (reading 'filter')
    at Proxy.isInputSelected (…/js/build.js?v=3.6.0.0:493:34858)
```

At step 6 the five French fields show only their titles: no choices and
no "Custom" box. The English fields show their choices. At step 7 the
save succeeds and three more errors are logged:

```
TypeError: Cannot read properties of undefined (reading 'find')
    at Proxy.fieldChanged (…/js/build.js?v=3.6.0.0:1525:2792)
```

After a reload, the French fields show their choices. Unticking "Forms"
(step 3), and unticking and ticking "UI" on the same row, log no error.

## Cause

`PKPDateTimeForm` (`lib/pkp/classes/components/forms/context/PKPDateTimeForm.php`)
builds its five multilingual radio fields with options keyed by
language (`_setDateOptions()` and the two `array_map()` calls). It does
this for the form languages the journal has when the page loads. It is
the only multilingual options field in pkp-lib and the three apps.

A tick under "Forms" answers with the global event `set-form-languages`
(`LanguageGridHandler::saveLanguageSetting()`), and ui-library's
`src/components/Container/Container.vue` hands the new list to every
form on the page. The "Date & Time" form then draws a field for French,
for which it has no options:

- `FieldOptions.vue` sets `localizedOptions` to `this.options[this.localeKey]`
  (in `data()` and in the `options` watcher), which is `undefined` for
  that language. The template's `v-for` over it draws nothing, so the
  field shows only its title.
- `FieldRadioInput.vue`'s computed `isInputSelected()` calls
  `this.localizedOptions.filter(…)` and is read in `mounted()`: the five
  errors of step 5.
- The save of step 7 answers with the journal's settings, and
  `PKPSchemaService::addMissingMultilingualValues()` (called from
  `PKPContextService::getProperties()`) fills `''` for French, now a
  form language. `Form.vue`'s `success()` writes that into each field's
  value; the change from `undefined` to `''` runs `FieldOptions`'
  `value` and `selectedValue` watchers, which call `DateTimeForm.vue`'s
  `fieldChanged()`. For "Date", "Date (Short)" and "Time" that method
  reads `shortDate.options[localeKey].find(…)` (and `updateFields()`
  reads `field.options[localeKey][0]`): the three errors of step 7. For
  "Date & Time" and "Date & Time (Short)" it returns before that read.

The form was made multilingual for `pkp/pkp-lib#5540` (per-language date
formats, 2020). Its `DateTimeForm.vue` and its options keyed by language
assume that the form's languages stay the same while the page is open,
which the `set-form-languages` event does not guarantee.

Reach:

- Settings › Website on all three apps: the only page holding both the
  language list and the "Date & Time" form (`ManagementHandler::website()`,
  `templates/management/website.tpl`); checked on screen.
- The Settings wizard (`templates/admin/contextSettings.tpl`) has the
  language list and no "Date & Time" form; checked in the code.
- The page's other multilingual fields (texts, rich texts, images) hold
  values, not options, and take the new language without an error;
  checked on screen (no other error at step 5).
- Stored data: after step 7, each field's French value in the page is
  `''`. A second "Save" before a reload stores `''` as the French
  formats, with or without the fix below. The getters
  (`Context::getLocalizedDateFormatLong()` and the others) fall back to
  the `[general]` formats in `config.inc.php` on an empty value, which
  is also what a French format that was never saved gives. So dates show
  the same, and this is acceptable; checked in the code and, for the
  first save, in the database.

## Proposed fix

A proposal, tried on `main` on all three apps
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/form-language-tick-date-time-script-errors/fix.diff)).
It stops the eight errors. It does not give the French fields their
choices: until a reload they still show only their titles. With the fix
in, steps 5 to 7 log no error, the English choices and the stored
formats are as before, and after a reload the French choices are there.

Recommended: let the two components that read options by language
accept a language that has none yet, in ui-library.

In `FieldOptions.vue`, a missing language's options are an empty list.
This is the shared layer, so `FieldRadioInput`, `FieldArchivingPn` and
the checkbox lists are all covered:

```diff
 			localizedOptions: this.isMultilingual
-				? this.options[this.localeKey]
+				? this.options[this.localeKey] || []
 				: this.options,
…
 			this.localizedOptions = this.isMultilingual
-				? newVal[this.localeKey]
+				? newVal[this.localeKey] || []
 				: newVal;
```

In `DateTimeForm.vue`'s `fieldChanged()`, a language without options
stores its value and skips the relabelling, as the method already does
for "Date & Time" and "Date & Time (Short)":

```diff
 			if (
 				!['dateFormatShort', 'dateFormatLong', 'timeFormat'].find(
 					(fieldName) => fieldName === name,
-				)
+				) ||
+				!this.fields.every((field) => field.options[localeKey])
 			) {
 				this.$emit('set', this.id, {fields: newFields});
 				return;
```

With an empty list, `isInputSelected()` is true for the new language.
`mounted()` copies the unset French value into the component's
`inputValue`, which no box shows, and no change is sent to the form.

Alternatives:

- Give the new language its choices at once, in `DateTimeForm.vue`, by
  copying the primary language's options when a language arrives
  without any. "Date", "Date (Short)" and "Time" offer the same formats
  in every language, but "Date & Time" and "Date & Time (Short)" are
  built from the language's own saved formats, which the page does not
  have. Not recommended as part of this fix. It is a possible follow-up
  if the team wants the fields usable before a reload.
- Reload the page, or the form, after a "Forms" tick. A page reload
  loses unsaved text on the other tabs, and reloading one form needs a
  new request the page does not have today.
- Build the options for every language the site has installed, in
  `PKPDateTimeForm`. Same limit as the first alternative for "Date &
  Time" and "Date & Time (Short)", and it enlarges every load of the
  page.
- Guard only `isInputSelected()` in `FieldRadioInput.vue`. This stops
  the five errors but not the three from `DateTimeForm.vue`.

What goes with it:

- `FieldSelect.vue` and `FieldMultiSelect.vue` read
  `this.options[this.localeKey]` the same way. No field of either kind
  is multilingual in pkp-lib or the three apps today, so they are left
  out; the same `|| []` would cover them.
- `DateTimeForm.vue`'s `mounted()` reads `field.options[locale.key]` for
  the form's languages at mount, which always have options; left as is.
- The proposed fix in
  [jardakotesovec/pkp-e2e#4](https://github.com/jardakotesovec/pkp-e2e/issues/4)
  ([report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U66-A2-unsaved-name-kept-after-closing-edit-panel.md))
  changes another line of the same method,
  `field[prop][localeKey] = value`, a few lines above. The two diffs
  apply together, and neither changes what the other does.
- Backport: the diff applies as written on 3.5. On 3.4 and 3.3 the
  `DateTimeForm.vue` hunk needs its context adjusted (no trailing comma
  after the `find()` callback there); the change itself is the same.
- Test: a ui-library unit test that mounts `FieldRadioInput` with a
  `localeKey` absent from `options`.

Small: a few lines in two ui-library files, with a unit test.

## Evidence

- Kept script, steps 1 to 6 on all three apps, on an install reset to
  the default dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/form-language-tick-date-time-script-errors/walk.js),
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/form-language-tick-date-time-script-errors/walk.js`.
  With `save` added after the script's path, it takes steps 1 to 7, reads the stored
  formats before and after the save, reloads and reads the French
  fields, and unticks and ticks "UI" on the French row. Run on `main`
  with and without `fix.diff`, and on 3.5 (steps 1 to 6).
- Tips walked: OJS `main` [bade233f73](https://github.com/pkp/ojs/commit/bade233f73)
  (pkp-lib [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc)),
  OMP `main` [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794c),
  OPS `main` [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb7)
  (both pkp-lib [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a6)),
  all on ui-library [280f98c5](https://github.com/pkp/ui-library/commit/280f98c5);
  OJS `stable-3_5_0` [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48),
  OMP [3081c9b00d](https://github.com/pkp/omp/commit/3081c9b00d),
  OPS [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd)
  (pkp-lib [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed62),
  ui-library [1a7a4750](https://github.com/pkp/ui-library/commit/1a7a4750));
  on PostgreSQL, default dataset from pkp/datasets 38ab955 (2026-09-30).
  The fault is in the browser and does not depend on the database.
- 3.4 and 3.3, code: ui-library `stable-3_4_0`
  [ee684b34](https://github.com/pkp/ui-library/commit/ee684b34) and
  `stable-3_3_0` [96959f9e](https://github.com/pkp/ui-library/commit/96959f9e)
  hold the same `FieldOptions.vue`, `FieldRadioInput.vue`,
  `DateTimeForm.vue` and `Container.vue` lines. pkp-lib `stable-3_4_0`
  [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d) and
  `stable-3_3_0` [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe)
  send `set-form-languages` from `LanguageGridHandler`, build
  `PKPDateTimeForm`'s options by language, and have the "Date & Time"
  tab in `website.tpl` (app tips OJS [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7)
  and [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9a); the
  files are pkp-lib's and ui-library's, shared by OMP and OPS).
- Introduced: `git blame` on `FieldRadioInput.vue`'s `isInputSelected()`
  leads to [ffe9d8a5aa](https://github.com/pkp/ui-library/commit/ffe9d8a5aab143509e00ea414f34051db1b0c4dd)
  (`pkp/ui-library#108` for `pkp/pkp-lib#5849`, 2020-07-10), which made
  it read the options of the field's language. The first form with
  options keyed by language, and `DateTimeForm.vue`'s `fieldChanged()`,
  came with `pkp/pkp-lib#5540`: ui-library
  [2b4d7bd782](https://github.com/pkp/ui-library/commit/2b4d7bd7821dea838c3f2b6b29d54bd78c2c1fab)
  (`pkp/ui-library#117`) and pkp-lib
  [84c4cc47bf](https://github.com/pkp/pkp-lib/commit/84c4cc47bf04c5f457722592d6316bc871c4bd0a)
  (`PKPDateTimeForm.inc.php`, `pkp/pkp-lib#6211`), both merged
  2020-08-26. Before them, no multilingual options field existed for a
  new language to reach.
- Upstream search (2026-10-01): pkp/pkp-lib and pkp/ui-library,
  issues and PRs, open and closed, for `isInputSelected`,
  `FieldRadioInput`, `DateTimeForm`, `set-form-languages`, "date and
  time" with language, and the error text. `pkp/pkp-lib#5849` was the
  same error text on every load of a multilingual radio field, fixed in
  2020. `pkp/pkp-lib#8814` (a second language's "Date & Time" choices
  missing, OPS 3.4 RC1) was closed when the reporter could no longer
  reproduce it, and it did not involve the tick of step 5. Neither is
  this fault.
- Unverified: the second "Save" before a reload (Cause, "Stored data")
  was read in the code, not walked; the Settings wizard was read in the
  code only.
