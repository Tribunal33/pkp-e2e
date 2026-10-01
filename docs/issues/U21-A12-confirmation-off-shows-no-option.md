# After a manager saves "Do not send an email.", the Emails settings show no "Submission Confirmation" option selected

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code; no "Submission Confirmation" setting)
- **Introduced** `pkp/pkp-lib#13238` for `pkp/pkp-lib#13237` · [87999c45b5](https://github.com/pkp/pkp-lib/commit/87999c45b5e0463be98eb72528beaa55f40d25d0) · 2026-08-27 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U21 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#a12)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A journal, press or preprint server manager sets "Submission
Confirmation" (Settings › Workflow › "Emails") to "Do not send an
email." and saves. On every later visit none of its three options is
selected, so the screen gives no sign that confirmations are off. The
setting itself still works: no confirmation goes out, and saving the
screen again keeps it off.

The DOI "Registration Agency" list on a journal or preprint server
shows the same empty box instead of "None" whenever a registration
agency plugin is enabled and no agency is chosen. Saving it from the
empty box keeps "no agency".

## Impact

- **Lost:** nothing is stored wrong; the screens stop showing the
  choice that applies.
- **Who:** managers of every journal, press or server that turned
  confirmations off (they are on by default), each time they open the
  Emails tab; and managers of a journal or server with the Crossref or
  DataCite plugin enabled and no agency chosen. No released version
  has it yet.
- **Way round:** none. Selecting "Do not send an email." or "None"
  again shows it only until the page is reloaded.

Low: both screens mislead while the settings work; it would be medium
if saving either screen as shown changed the setting.

## Steps to reproduce

Preconditions: PKP's default test dataset for `main`, where "Submission
Confirmation" is at its default, "Send an email to all authors.", and
no DOI registration agency is chosen.

Emails (OJS, OMP, OPS):

1. Sign in as `rvaca` (the Journal, Press or Preprint Server manager).
2. Open Settings › Workflow
   (`/index.php/publicknowledge/en/management/settings/workflow`) and
   the "Emails" tab. Under "Submission Confirmation", "Send an email to
   all authors." is selected.
3. Select "Do not send an email." and press "Save". "Saved" shows.
4. Reload the page and open the "Emails" tab again.
5. Press "Save" without choosing anything, reload, and open "Emails".

**Expected:** after steps 4 and 5, "Do not send an email." is
selected under "Submission Confirmation".

**Observed:** after steps 4 and 5, none of "Send an email to all
authors.", "Send an email to the submitting author only." and "Do not
send an email." is selected. The save in step 5 answers "Saved" and
sends `submissionAcknowledgement=` (empty), which keeps the setting
off.

Control: "Send an email to the submitting author only." saved the same
way is selected after the reload.

Registration Agency (OJS, OPS; OMP ships no registration agency
plugin):

1. Sign in as `rvaca`.
2. Open Settings › Website, the "Plugins" tab, and tick "Crossref
   Manager Plugin" under "Generic Plugins". (DOIs are already on in
   the dataset; the list does not depend on them.)
3. Open Settings › Distribution, the "DOIs" tab, and its
   "Registration" side tab.
4. Press "Save" without choosing anything, then reload and open
   "DOIs" › "Registration" again.

**Expected:** "Registration Agency" shows "None" in steps 3 and 4.

**Observed:** in steps 3 and 4 the list shows an empty box; opened, it
offers "None" and "Crossref". The save in step 4 sends
`registrationAgency=` (empty) and succeeds (200); the agency stays
unset.

## Cause

"Do not send an email." is the option whose value is
`Context::SUBMISSION_ACKNOWLEDGEMENT_OFF`, which is `null`. Saving it
stores no `submissionAcknowledgement` row, so `getData()` returns `null`
and `PKPEmailSetupForm::addSubmissionAcknowledgementField()` builds the
radio field with the value `null`: here `null` means "off".

Commit 87999c45b5 changed two lines that turn an unset value into the
field type's empty value:

- `Field::getConfig()` (`lib/pkp/classes/components/forms/Field.php`
  line 127) went from `$this->value ?? $this->default ?? null` to
  `$this->value ?? $this->default ?? $this->getEmptyValue()`.
- `FormComponent::getFieldConfig()` (`FormComponent.php` line 342)
  went from `if (!array_key_exists('value', $config))`, which let a
  `null` value through, to
  `$config['value'] ??= $field->isMultilingual ? [] : $field->getEmptyValue();`,
  which replaces it.

`FieldOptions::getEmptyValue()` returns `''` for a radio, so the page
receives `''`. The radios in ui-library's `FieldOptions.vue` check the
option whose value equals the field's value, and `''` matches none of
`allAuthors`, `submittingAuthor` and `null`. Before the commit the
`null` reached the page, matched the `null` option, and "Do not send an
email." showed selected, as it still does on 3.5.

The commit gave each field an empty value its component can work with
(an array for a list of checkboxes, `false` for a single toggle)
instead of `null`. For a radio it chose `''`, which is wrong only when
one of the options has the value `null`.

Reach:

- The DOI "Registration Agency" list (`PKPDoiRegistrationSettingsForm`,
  a `FieldSelect`) has a "None" option valued
  `Context::SETTING_NO_REGISTRATION_AGENCY`, also `null`, and the form
  passes `null` when no agency is chosen (it maps a stored `''` to
  `null` itself). The page receives `''`, which matches no option
  (checked on screen, OJS and OPS). The list shows only on Settings ›
  Distribution; the DOIs page builds the same form but no template
  there shows it (checked in the code). Saving from the empty box sends
  `''`, which the API turns into `null`; it deletes the stored empty
  value and returns early, so the agency stays unset (checked on
  screen).
- No other field in `lib/pkp` or the three apps' classes and plugins
  has an option valued `null` (checked in the code).

## Proposed fix

A proposal; the team decides. When one of a radio's or a select's
options has the value `null`, use `null` as the field's empty value, so
an unset value selects that option. In `lib/pkp`:

```diff
     public function getEmptyValue()
     {
         if ($this->type === 'radio') {
-            return '';
+            // A radio holds a scalar. When one of its options stands for "not
+            // set" (its value is null), an unset value selects that option.
+            return in_array(null, array_column($this->options, 'value'), true) ? null : '';
         }
```

and the same check in a new `FieldSelect::getEmptyValue()`, falling back
to `parent::getEmptyValue()`. Both `Field::getConfig()` and
`FormComponent::getFieldConfig()` call `getEmptyValue()`, so the one
change covers both lines. The full diff, with two tests added to
`tests/classes/components/forms/FieldConfigTest.php`:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/confirmation-off-shows-no-option/fix.diff).

It follows the commit's own pattern of an empty value per field type,
where `FieldUpload` already returns `null` because a `null` upload
tells the save handler to delete the file. Fields with no `null` option
keep `''`, `[]` or `false`. The value the page sends on save does not
change (`''`, which the API turns back into `null`).

Tried on `main` on the three apps: after saving "Do not send an
email.", the reloaded Emails tab shows it selected, and a second save
keeps the setting off. With and without the fix, "Send an email to the
submitting author only." saved and reloaded shows selected, and
"Editorial statistics" keeps its choice. With the fix, "Registration
Agency" shows "None" on OJS and OPS. The two unit tests were not run:
the test installs have no PHPUnit.

**Alternatives:**

- Give the "off" option, or the constant, the value `''`: fixes this
  one radio but not the DOI list, and the constant is public, so a
  plugin comparing with `Context::SUBMISSION_ACKNOWLEDGEMENT_OFF` would
  break.
- Let `null` through again: both lines would have to go back
  (`?? null` in `Field::getConfig()` and the `array_key_exists` check in
  `FormComponent::getFieldConfig()`), which brings back the `null`
  values that `pkp/pkp-lib#13237` removed for checkbox lists and
  toggles.
- Treat `''` as `null` in ui-library's `FieldOptions.vue` and
  `SelectInput.vue`: the browser would have to guess what the server
  already knows from the options.

**What goes with it:**

- Guard: the two unit tests in the diff, which build an unset radio and
  an unset select that each have a `null` option.

Small: no stored data or API change, and the tests are written.

## Evidence

- Kept scripts, each on a fresh load of the default dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/confirmation-off-shows-no-option/walk.js)
  takes the Emails steps and records each radio's checked state, the
  save request's `submissionAcknowledgement` and the stored setting:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/confirmation-off-shows-no-option/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5; `NEIGHBOUR=1` in
  front chooses "Send an email to the submitting author only." in
  step 3, the control).
  [reach.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/confirmation-off-shows-no-option/reach.js)
  takes the Registration Agency steps and records the list, the save
  request's `registrationAgency`, its answer and the stored setting:
  the same command with `reach.js`.
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/confirmation-off-shows-no-option/fix.diff ojs omp ops`,
  then the two scripts and `walk.js` with `NEIGHBOUR=1`, then
  `node bin/try-fix.js revert shared/playwright/checks/issues/confirmation-off-shows-no-option/fix.diff ojs omp ops`.
- Driven on PostgreSQL, on the default dataset from pkp/datasets 38ab955
  (2026-09-30), on `main` (OJS bade233f73, OMP 3b0ecf794c, OPS
  c8af945bb7; their `lib/pkp` 2e377d27fc, 3dc90c81a6, 3dc90c81a6) and
  `stable-3_5_0` (OJS 92b9a16b48, OMP 3081c9b00d, OPS cf4fce69bd;
  `lib/pkp` a9c76aed62). On 3.5 the three apps show "Do not send an
  email." selected after steps 4 and 5. Nothing here depends on the
  database.
- 3.5 (code): `lib/pkp` a9c76aed62 `Field::getConfig()` ends in
  `?? null` and `FormComponent::getFieldConfig()` keeps the
  `array_key_exists` check; the option and constant are as on `main`.
- 3.4 (code): `lib/pkp` `stable-3_4_0` (df13621c2d) has the same two
  lines as 3.5; `PKPEmailSetupForm` and
  `Context::SUBMISSION_ACKNOWLEDGEMENT_OFF` (`null`) as on `main`;
  `pkp/pkp-lib#13237` is not in its log.
- 3.3 (code): `lib/pkp` `stable-3_3_0` (d446601ebe)
  `PKPEmailSetupForm.inc.php` holds only the signature and the bounce
  address; confirmations were switched by the "Submission
  Acknowledgement" email template.
- Introduced: `git log -L` on `Field.php` line 127; before 87999c45b5
  the line had stood since 798840ae11 (2022-10-21).
- Search for other instances: `'value' => null` and `null` constants
  used as option values across `lib/pkp/classes`, the apps' `classes`
  and `plugins`.
- Not driven: languages other than English; the DOI list with DataCite
  (OJS) instead of Crossref; the DOI list with the fix and a save.
