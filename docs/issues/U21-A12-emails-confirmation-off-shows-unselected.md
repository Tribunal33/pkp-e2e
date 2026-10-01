# After "Do not send an email." is saved, the Emails settings show no Submission Confirmation option selected

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS (installs upgraded from 3.3 with the acknowledgement email disabled)
  - 3.4: OJS, OMP, OPS (code; the same installs)
  - 3.3: none (code; no "Submission Confirmation" choice)
- **Introduced** on upgraded installs, `pkp/pkp-lib#8407` for `pkp/pkp-lib#5716` · [1a7fbb216f](https://github.com/pkp/pkp-lib/commit/1a7fbb216faff64f262d5ac14f263ea70f7ae6f5) · 2022-11-03 · Nate Wright (NateWr); on every `main` install, `pkp/pkp-lib#13238` for `pkp/pkp-lib#13237` · [87999c45b5](https://github.com/pkp/pkp-lib/commit/87999c45b5e0463be98eb72528beaa55f40d25d0) · 2026-08-27 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U21 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#a12)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A manager picks "Do not send an email." under "Submission Confirmation"
on the workflow settings' Emails screen and saves. When the screen is
opened again, none of the three options is selected. A journal upgraded
from 3.3 with the acknowledgement email disabled opens the same way, and
its "Manage Emails" list still shows the acknowledgement email.

No acknowledgement goes out, and saving the screen again keeps it off.
But the screen no longer says that acknowledgements are off, and an
empty group is not something the screen shows otherwise: a new journal
starts at "Send an email to all authors.".

## Impact

- **Lost**: nothing; the screen only stops showing which option is on.
- **Who**: a manager who has turned submission acknowledgements off,
  and every manager of a journal upgraded from 3.3 with the
  acknowledgement email disabled.
- **Way round**: on 3.4 and 3.5, picking "Do not send an email." and
  saving once shows it selected from then on. On `main` nothing does.

Low: no email goes out wrongly and no setting changes. It would be
medium if the empty group saved a different value when the screen is
saved, which it does not.

## Steps to reproduce

**Saving "Do not send an email." (`main`):**

Preconditions:

- The default dataset, `main` (OJS, OMP or OPS). Nothing else.

Steps:

1. Sign in as `rvaca`.
2. Open Settings › Workflow and press the "Emails" tab
   (`/index.php/publicknowledge/en/management/settings/workflow#emails`).
   Under "New Submission", "Submission Confirmation" shows "Send an email
   to all authors." selected.
3. Select "Do not send an email.". "Notify Primary Contact" and "Notify
   Anyone" fold away.
4. Press the form's "Save". "Saved" shows beside it.
5. Reload the page and press the "Emails" tab again.

**Expected**: "Do not send an email." is selected under "Submission
Confirmation".

**Observed**: none of "Send an email to all authors.", "Send an email to
the submitting author only." and "Do not send an email." is selected.
"Notify Primary Contact" and "Notify Anyone" stay folded away, as they do
while acknowledgements are off.

The same steps with "Send an email to the submitting author only." in
step 3 show that option selected after the reload.

**An install upgraded from 3.3 (`main`, 3.5, 3.4):**

Preconditions:

- The default dataset of the version, with the journal's state after an
  upgrade from 3.3 in which its "Submission Acknowledgement" email was
  disabled. The upgrade stores the setting as an empty string. On an
  install that was not upgraded, this SQL writes exactly that row (press
  and server: `press_settings`/`press_id`, `server_settings`/`server_id`):

  ```sql
  DELETE FROM journal_settings WHERE journal_id = 1 AND setting_name = 'submissionAcknowledgement';
  INSERT INTO journal_settings (journal_id, setting_name, setting_value) VALUES (1, 'submissionAcknowledgement', '');
  ```

Steps:

1. Sign in as `rvaca`.
2. Open Settings › Workflow › "Emails".
3. Press "Manage Emails".

**Expected**: "Do not send an email." is selected, and "Manage Emails"
does not list the acknowledgement email, as on a journal that saved
"Do not send an email." on 3.5.

**Observed**: no option is selected under "Submission Confirmation", and
"Manage Emails" lists "Submission Confirmation" ("Submission
Acknowledgement (Pending Moderation)" on a preprint server). After
"Do not send an email." is picked and saved, the email leaves the list.
On 3.5 the option then shows selected; on `main` it shows unselected,
as in the first group.

## Cause

"Do not send an email." is `Context::SUBMISSION_ACKNOWLEDGEMENT_OFF`,
which is `null`. Saving it through the screen stores no
`submissionAcknowledgement` row, and the setting reads back as `null`.
The radio group in `PKPEmailSetupForm::addSubmissionAcknowledgementField()`
can show that option selected only when the value it receives is
`null`. The ui-library's `FieldOptions.vue` checks a radio when its
`:value` equals the `v-model` value, and `''` matches none of
`'allAuthors'`, `'submittingAuthor'` and `null`. Two code paths hand it
`''`.

**Upgraded installs.** `I5716_EmailTemplateAssignments::moveDisabledEmailTemplateSettings()`,
the 3.4 upgrade step that turned disabled email templates into
settings, writes `setting_value = ''` for a context whose
`SUBMISSION_ACK` template was disabled. `SchemaDAO` reads a string
setting back unchanged, so `getData('submissionAcknowledgement')` is
`''`. The same value misleads `Mail\Repository::isMailableEnabled()`,
which compares it with `null`. It finds `''` is not "off", so "Manage
Emails" lists the acknowledgement email as enabled.
`SendSubmissionAcknowledgement::handle()` tests for an empty value, so
nothing is sent.

**Every `main` install.** With no row stored, `Field::getConfig()`
(line 127) hands the client `$this->value ?? $this->default ??
$this->getEmptyValue()`, and `FieldOptions::getEmptyValue()` answers
`''` for a radio. `FormComponent::getFieldConfig()` (line 342) has a
second fallback, `$config['value'] ??= … getEmptyValue()`, so a `null`
from `getConfig()` would be replaced there too. Both lines came with
87999c45b5, which gave each field type an empty value of the shape its
component works on. Before it the chain ended in `?? null`, and 3.5 and
3.4 still end that way. There, saving "Do not send an email." deletes
an upgraded install's `''` row and the option shows selected from then
on.

Reach:

- The Emails tab and "Manage Emails" of all three apps (walked).
- The DOI settings' "Registration" tab on `main`: "None" is
  `Context::SETTING_NO_REGISTRATION_AGENCY`, also `null`, and the form
  passes `null` when no agency is chosen. The select receives `''`,
  which matches no option (code; not walked, since the select shows only
  once a registration agency plugin is on, and the dataset has none on).
- No other option of a pkp-lib, OJS, OMP or OPS form has the value
  `null` (code: the forms under `classes/components/forms` and the
  apps' plugins).
- Stored data: the `''` rows the 3.4 upgrade wrote stay on every
  upgraded install until a manager saves "Do not send an email." again
  on 3.4 or 3.5.

## Proposed fix

The fix has two parts, one per path, both in pkp-lib
([fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/emails-confirmation-off-shows-unselected/fix-ojs.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/emails-confirmation-off-shows-unselected/fix-omp.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/emails-confirmation-off-shows-unselected/fix-ops.diff);
the same pkp-lib changes, each with its app's `upgrade.xml` line).

1. **The stored value.** The writer of the bad value is the 3.4
   upgrade, so the data is fixed there rather than in each reader.
   `moveDisabledEmailTemplateSettings()` stores "off" as no row. A new
   upgrade migration, `v3_6_0\RemoveEmptySubmissionAcknowledgementSetting`,
   deletes the `''` rows already stored, using `HasContextNameHelper` as
   the other 3.6 migrations do, and each app's `dbscripts/xml/upgrade.xml`
   lists it:

   ```php
   DB::table($this->getContextSettingsTableName())
       ->where('setting_name', 'submissionAcknowledgement')
       ->where('setting_value', '')
       ->delete();
   ```

2. **The empty value on `main`.** A field that offers `null` as an
   option gets `null` as its empty value. `Field` gains a static
   `offersNullOption(array $options)`, which takes the options as an
   argument instead of reading a property `Field` does not declare.
   `FieldOptions` (radios), `FieldSelect` and `FieldRadioInput` call it
   from `getEmptyValue()`. Both fallbacks, `Field::getConfig()` and
   `FormComponent::getFieldConfig()`, go through `getEmptyValue()`, so
   the `null` survives both. Every field without a `null` option keeps
   the value 87999c45b5 gave it.

With both parts in, on all three apps, "Do not send an email." showed
selected after it was saved. On the upgraded state, after the repair
migration ran, it showed selected and "Manage Emails" no longer listed
the email. Every radio group and select on Settings › Workflow,
› Distribution, › Website and the context settings read the same with
the fix in and out.

**Alternatives**

- Normalise `''` to `null` in `PKPEmailSetupForm`, as
  `PKPDoiRegistrationSettingsForm` does for its select: the Emails tab
  would be right, but "Manage Emails" would still list the email,
  because the repository reads the same `''`. Every reader would need
  the same guard.
- Give the option the value `''` and pass `getData() ?? ''`: one file
  covers both paths on this tab, but the form's "off" would then differ
  from `Context::SUBMISSION_ACKNOWLEDGEMENT_OFF`, which the API, the
  repository and the listener use. "Manage Emails" and the DOI select
  would stay wrong.
- Send `null` to every radio again: I found nothing in the ui-library's
  radio handling that needs `''` rather than `null`, beyond matching a
  `null` option. But it would undo a choice 87999c45b5 made for every
  radio to fix two fields, and the select would still need its own
  change.

**What goes with it**

- The unit test `testNullOptionKeepsNullThroughFieldConfig` in
  `FieldConfigTest` (in the diff), through `getFieldConfig()`.
- Backport: 3.5 and 3.4 need part 1 only (the upgrade step's change and
  a repair migration in that line's upgrade), since they do not carry
  87999c45b5.

Medium: two pkp-lib changes and an upgrade migration that each app's
`upgrade.xml` must list.

## Evidence

- The kept scripts:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/emails-confirmation-off-shows-unselected/walk.js)
  takes the first group of Steps, with the "submitting author only"
  control.
  [upgraded.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/emails-confirmation-off-shows-unselected/upgraded.js)
  takes the second, writing the SQL row first; with the fix applied,
  `REPAIR=1` runs the repair migration through `inapp.php` beside it.
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/emails-confirmation-off-shows-unselected/neighbour.js)
  reads every radio group and select on four settings pages. On an
  install freshly loaded from the default dataset:
  `node bin/probe.js all shared/playwright/checks/issues/emails-confirmation-off-shows-unselected/walk.js`
- The fix was tried with the three scripts on OJS, OMP and OPS `main`;
  `neighbour.js` was also run without it. The `upgrade.xml` line was not
  exercised, since no upgrade was run; the migration's `up()` was called
  directly. PHPUnit did not run: `PKPTestCase` points the config at the
  app root's `config.inc.php`, which these checkouts do not have. The
  new test's assertions were run instead through `inapp.php fieldconfig`
  against the patched classes, and passed.
- Walked on OJS, OMP and OPS `main` (both groups) and `stable-3_5_0`
  (both groups; the first shows the expected result there), on
  PostgreSQL. Datasets: pkp/datasets 27f1204 (2026-10-01).
- The SQL precondition copies `I5716_EmailTemplateAssignments::moveDisabledEmailTemplateSettings()`:
  the same table, setting name and empty value. The upgrade from a 3.3
  install was not run.
- Tips: OJS `main` 4408b94def (lib/pkp f5bd392a69), OMP `main` 3b0ecf794
  and OPS `main` c8af945bb7 (lib/pkp 3dc90c81a6); `stable-3_5_0` OJS
  18d097d94e, OMP b24879c3d, OPS 3f0919468c (lib/pkp 1fb843f491);
  `stable-3_4_0` OJS 9571d8fde7, OMP 0aec65441, OPS acd8ae704b (lib/pkp
  df13621c2d); `stable-3_3_0` OJS 9fdb9bcf9a, OMP 8e72fc883, OPS
  c5532e2161 (lib/pkp d446601ebe).
- Code reads:
  - `main`: `Field::getConfig()`, `FieldOptions::getEmptyValue()`,
    `FormComponent::getFieldConfig()`, `PKPEmailSetupForm`, `Context`'s
    constants, `SchemaDAO::_fromRow()` and `DAO::convertFromDB()`,
    `Mail\Repository::isMailableEnabled()`,
    `SendSubmissionAcknowledgement`, `PKPDoiRegistrationSettingsForm`,
    `I5716_EmailTemplateAssignments`, and the ui-library's
    `FieldOptions.vue`, `FieldSelect.vue` and `SelectInput.vue`.
  - 3.5 and 3.4: the same upgrade step writes `''` (from 1a7fbb216f,
    on both branches), and `Field::getConfig()` ends in `?? null`.
  - 3.3: `PKPEmailSetupForm` has no submission acknowledgement choice.
- Upstream searches (2026-10-01): pkp/pkp-lib by "Do not send an email",
  `submissionAcknowledgement` and `getEmptyValue`. `pkp/pkp-lib#9797`
  (closed, 3.4) was the setting failing to stop the email.
  `pkp/pkp-lib#8419` (closed) was the "Manage Emails" list on fresh
  installs, not the upgraded value.
