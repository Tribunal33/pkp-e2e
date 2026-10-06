# After a manager ticks a language under "Forms", "Date & Time" shows no choices for it

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Crash** script
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#6211` for `pkp/pkp-lib#5540` · [84c4cc47bf](https://github.com/pkp/pkp-lib/commit/84c4cc47bf04c5f457722592d6316bc871c4bd0a) · 2020-08-05 · Vitaliy Bezsheiko (Vitaliy-1), in a PR by Nate Wright (NateWr)
- **Upstream** `pkp/pkp-lib#8814` (closed without a fix): the same empty boxes, reported on OPS 3.4 with no steps that add a language, and closed as not reproduced
- **Tracked in** spec U57 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U57-languages-and-locales.md#a5)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager ticks "Forms" for a language on Settings › Website that the
page was loaded without (one the journal is just adding as a form
language). The tick saves, but when the page passes the new language on
to its other forms, the page's script fails five times ("Cannot read
properties of undefined (reading 'filter')"). "Setup" › "Date & Time" on
the same page then has, for each of its five settings ("Date", "Date
(Short)", "Time", "Date & Time", "Date & Time (Short)"), an empty box
for the new language: no formats to choose, not even "Custom".

Nothing is stored wrong, and after a reload of the page the boxes offer
the formats. A tick of a language that was already a form language when
the page loaded does not fail, nor does a tick under "UI" or
"Submissions", which changes no form language.

## Impact

- **Lost**: the chance to set the new language's date and time formats
  on that page; the empty boxes do not say why. Pressing "Save" on
  "Date & Time" while they are empty stores nothing for the new
  language and leaves the other languages' formats as they were.
- **Who**: journal, press and preprint server managers who add a form
  language on Settings › Website and then go on to "Date & Time" without
  leaving the page. Adding a language is rare, so few meet it.
- **Way round**: reload the page; "Date & Time" then offers the formats
  in the new language.

Low: nothing is stored wrong and a reload gets the task done; the
failures themselves show only in the browser's console. It would be
medium if "Save" with the empty boxes stored a wrong or empty format, or
if the boxes stayed empty after a reload.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS (or OMP, OPS), journal
  `publicknowledge`. It has English and French ticked under "UI",
  "Forms" and "Submissions"; steps 3 and 4 make French a language the
  page loads without, as on a journal that has not added it yet.
- The browser's developer console is open: the failures show only there.

Steps:

1. Sign in as `rvaca` (Journal manager; Press manager, Preprint Server
   manager).
2. Settings › Website › "Setup" › "Languages".
3. Under "Website Languages", untick "Forms" on the "Français (Canada)"
   row. The notice says "Locale settings saved."
4. Reload the page, and open "Setup" › "Languages" again.
5. Tick "Forms" on the "Français (Canada)" row. The notice says "Locale
   settings saved."
6. Without reloading, open "Setup" › "Date & Time" and press "French"
   at the top of the form.

**Expected**: the tick saves, the console stays clean, and "Date & Time"
shows the French formats beside the English ones: "octobre 1, 2026",
"octobre 1 2026", "1 octobre 2026", "2026 octobre 1" and "Custom" under
"Date", and so on for the other four.

**Observed**: the tick saves, and the console logs five times

```
TypeError: Cannot read properties of undefined (reading 'filter')
    at Proxy.isInputSelected (…/js/build.js?v=3.6.0.0:…)
```

At step 6 the form has a "French" button, and each of "Date", "Date
(Short)", "Time", "Date & Time" and "Date & Time (Short)" has an empty
box headed "French" beside the English choices: no choice, no "Custom".

Control: reloading the page after step 6 and opening "Date & Time" shows
the French choices ("octobre 1, 2026" and the rest). Unticking and
ticking French "Forms" again on that reloaded page logs nothing.

## Cause

pkp-lib's `PKPDateTimeForm` sends its five fields (multilingual
`FieldRadioInput`s) with a list of choices per language, and builds that
list only for the languages it is given. Both places that build choices
loop over `$this->locales`: `_setDateOptions()` for "Date", "Date
(Short)" and "Time", and the `$localizedOptions` map for the two "Date &
Time" fields. `ManagementHandler::website()` fills `$this->locales` with
the journal's form languages at the moment the page loads
(`getSupportedFormLocales()`). The values come from
`Context::getDateTimeFormats()`, which also covers only the form
languages. So a page loaded with English as the only form language holds
choices for English alone.

A "Forms" tick posts `saveLanguageSetting`, and
`LanguageGridHandler::saveLanguageSetting()` answers with the global
event `set-form-languages` and the journal's form languages, now with
French. (It sends the event after a "UI" or "Submissions" tick too, but
those leave the form languages unchanged, so no form gains a language.)
ui-library's `Container.vue` passes the list to every form on the page,
which then draws each multilingual field in French too. For the date form's fields
`FieldOptions` reads `this.options['fr_CA']`, which does not exist:
`localizedOptions` is `undefined`, and `FieldRadioInput`'s computed
`isInputSelected` (`this.localizedOptions.filter(…)`) throws once per
field, five times. Vue's error handler catches and logs it, and the
French part of each field is drawn without choices.

The rule broken: a form on a page that takes new form languages without
a reload must be able to draw its fields in any of them. Text fields can
(an empty value is fine); a field whose choices are sent per language
cannot, unless the choices for every language the page may add are sent
with it. The fault came with the form itself (84c4cc47bf, "Date & time
formats form", `pkp/pkp-lib#5540`), which keyed the choices to the form
languages of the moment; the event (2018, `pkp/pkp-lib#3594`) is older.

Reach:

- The date form's five fields are the only multilingual choice fields
  in pkp-lib, the three apps and their bundled plugins, and the date
  form is on Settings › Website only (checked in the code). The
  journal's Settings Wizard (Administration › "Hosted Journals" › a
  journal's arrow › "Settings wizard" › "Setup" › "Languages") sends the
  same event on the same tick, but has no date form, so nothing there
  fails (checked in the code: `templates/admin/contextSettings.tpl`).
- ui-library's `DateTimeForm.vue` turns each choice's format into a
  sample date ("F j, Y" into "October 1, 2026") once, when the form
  loads, and only for the languages that are form languages at that
  moment (`this.availableLocales`). Choices for a language that becomes
  a form language later, even if the server sent them with the page,
  would keep the raw format strings (seen with the pkp-lib part of the
  fix alone).
- No stored data is affected: "Save" on "Date & Time" sends no French
  value while the French boxes are empty (checked in the code).

## Proposed fix

Send the choices and values for every language a "Forms" tick can add,
which are the site's languages (the rows of "Website Languages",
`ManageLanguageGridHandler::loadData()`), and have the client format the
sample dates for all of them
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/forms-language-tick-date-time-script-error/fix.diff)):

- `PKPDateTimeForm`: an `$optionLocales` list, the form languages plus
  `Application::get()->getRequest()->getSite()->getSupportedLocales()`
  (the way `PKPThemeForm` and `OrcidSettingsForm` read the site), used
  by `_setDateOptions()`, the `$localizedOptions` map and the five
  values.
- `Context::getDateTimeFormats($format, ?array $locales = null)`: the
  languages to fill with the configured default, the form languages
  when null, so the new language starts on the default as it does after
  a reload.
- ui-library `DateTimeForm.vue` `mounted()`: format the labels of
  `Object.keys(field.options)` instead of `this.availableLocales`.

```diff
-        foreach ($this->locales as $localeValue) {
-            $locale = $localeValue['key'];
+        foreach ($this->optionLocales as $locale) {
```

The form still shows and saves only the form languages: `Form.vue`
draws and sends a language only when it is in `supportedFormLocales`,
so the extra choices stay unused until a tick adds the language.

The form reads the site's languages itself rather than being given them
by `ManagementHandler::website()`: the form is the part that knows its
choices are per language, and its constructor keeps the signature that
any other caller (a plugin building the same form) relies on.

Tried on `main`, OJS, OMP and OPS: with the fix in, step 5 logged
nothing and step 6 showed the French choices ("octobre 1, 2026" and the
rest, the default chosen), as after a reload. Two checks that the fix
reaches no further gave the same result with the fix in and out: with
French not a form language, "Date & Time" had no "French" button and its
"Save" sent English alone; and on a page loaded with French, unticking
and ticking it again logged nothing.

**Alternatives**:

- Guard `FieldOptions` and `FieldRadioInput` against a missing
  language (`?? []`): the failures stop, but the French boxes stay
  empty until a reload.
- Fall back in the client to the primary language's choices: the two
  "Date & Time" fields' choices are built from each language's own date
  and time formats, so French would be offered English combinations.
- Reload the page after a "Forms" tick: simple, but it throws away
  unsaved changes in the page's other forms.

**What goes with it**: no data repair. A unit test of
`PKPDateTimeForm`'s config for a site language that is not a form
language, or the e2e scenario here (a **Planned** item in the spec),
would guard it. The diff applies to 3.5 as it stands. 3.4 and 3.3 have
the same three places, so a backport makes equivalent edits, not the
same diff: in `DateTimeForm.vue` the label loop formats with moment
instead of luxon, and on 3.3 the PHP files are `.inc.php` and the form
reads the site through the global `\Application::get()` (as its
`PKPThemeForm.inc.php` does) instead of `APP\core\Application`.

Medium: two repos (pkp-lib and ui-library), three small edits following
patterns the code already has, tried; no API or data change.

## Evidence

- The kept script walks the Steps, then the control and the neighbour:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/forms-language-tick-date-time-script-error/walk.js),
  with its helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/forms-language-tick-date-time-script-error/lib.js).
  On an install freshly loaded from the default dataset, from a pkp-e2e
  checkout (`<feature>` names the set of test installs, `<id>` the
  output folder):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/forms-language-tick-date-time-script-error/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5; `neighbour` after
  the script's path walks the neighbour alone. The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/forms-language-tick-date-time-script-error/fix.diff ojs omp ops`
  (it rebuilds the JavaScript). A first trial with the pkp-lib half
  alone stopped the failures but showed the French choices as raw
  format strings, which is why the ui-library edit is part of the fix.
- The walks ran in Chromium on PostgreSQL. Datasets: pkp/datasets
  c657990 (2026-10-01). 3.5 showed the same five failures and empty
  boxes on the three apps.
- Branch tips. `main`: OJS b84f8e2e44, OMP 3b0ecf794, OPS c8af945bb7;
  pkp-lib ddd8ab243a (OJS) and 3dc90c81a6 (OMP, OPS); ui-library
  64d67363 (OJS) and 280f98c5 (OMP, OPS). 3.5: OJS c346ee00a5, OMP
  c7b45f88e, OPS 8eaf899468; pkp-lib 3bb4450bea (OJS) and 1fb843f491
  (OMP, OPS); ui-library d4e01883. 3.4: pkp-lib 32b0f4b4af, ui-library
  ee684b34. 3.3: pkp-lib f6ab331645, ui-library 96959f9e.
- Code reads. `main`: `PKPDateTimeForm.php`, `Context.php`
  (`getDateTimeFormats()`, `getLocalized*Format*()`),
  `ManagementHandler.php` (`website()`, `getSupportedFormLocales()`),
  `LanguageGridHandler::saveLanguageSetting()`,
  `ManageLanguageGridHandler::loadData()`, `FormComponent.php`
  (`supportedFormLocales`), and every pkp-lib form for multilingual
  `FieldOptions`, `FieldRadioInput` and `FieldSelect`; in ui-library
  `Container.vue`, `Form.vue` (`submitValues`), `FieldOptions.vue`,
  `FieldRadioInput.vue`, `DateTimeForm.vue`. 3.5: the same files, the
  same code. 3.4 and 3.3 (the pkp-lib and ui-library branches, which
  the three apps share): `PKPDateTimeForm` (`_setDateOptions()` over
  `$this->locales`), `getDateTimeFormats()` (form languages only),
  `LanguageGridHandler` (sends `set-form-languages`), `Container.vue`,
  `FieldOptions.vue` and `FieldRadioInput.vue` (the same
  `isInputSelected`), `DateTimeForm.vue` (the same label loop).
- Introduced: `git log` on `_setDateOptions()` gives 84c4cc47bf, the
  commit that created the form; `pkp/pkp-lib#6211` merged it on
  2020-08-26.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library for
  `isInputSelected`, `PKPDateTimeForm`, `FieldRadioInput` with
  `localizedOptions`, `set-form-languages`, and date and time formats
  with a new language. `pkp/pkp-lib#8814` ("Multi-locale date and time
  options not displayed", OPS 3.4 RC1) shows the same empty French boxes;
  it was closed when the reporter could no longer reproduce it, with no
  steps that add a language. That it is this fault is unverified.
  `pkp/pkp-lib#5849` (2020) was an earlier failure in
  `isInputSelected`, fixed by the per-language choices this report
  starts from.
- Not driven: 3.4 and 3.3 (code only); Firefox and Safari; MySQL (the
  fault is in the browser and in what the server sends, not in a
  query).
